/**
 * Interaction targets & options (shared by desktop E-key, mobile button and UI menus).
 * Options needing a capability auto-equip the right tool from inventory (vision §27).
 * @domain interaction
 */
import type { Capability } from '../data/items'
import type { Sim } from './sim'
import type { Animal, Building, Human, ItemStack } from './types'
import { COMBAT, ROCK } from '../config/calibration'
import { angleDiff } from '../core/math'
import { INN_BED_PRICE, INN_MEALS } from '../data/innMeals'
import { itemDef } from '../data/items'
import { SPECIES } from '../data/species'
import { isTree } from '../world/nodes'
import { consume, dropItem, fillTrough, nodeAvailable } from './actions'
import { cartDef, cartLoad, isHeavy, loadHeavy, parkCart, pushParked, stowCart, unloadInto, unloadToBuilding } from './cart'
import { isDown } from './combat'
import { roastBatch, roastCapacity, roastSeconds } from './cooking'
import { maxEdge, serviceBlade, sharpenServicePrice } from './edge'
import { logMoney, logProduce } from './eventLog'
import { addFuelFromPack, canLightTorch, dismantleHearth, douseFire, extinguishGroundTorch, lightFire, lightGroundTorch, restoreTorchDur } from './fire'
import { mealIngredients, mealNutrition, mealRefusal, payLodging } from './inns'
import { addItem, countItem, equipToMain, findTool, fitQty, removeStack } from './inventory'
import { acceptOffice, cycleTaxRate, mayorStatus } from './mayor'
import { askToJoin, dismissCompanion } from './npc/companions'
import { sleepComfort, startActivity } from './player'
import { questEvent } from './questHooks'
import { acceptQuest } from './quests'
import { addRep, addStat, depositGoodwill, settlementAt, takeGoodwill } from './reputation'
import { hourOf, isNight } from './time'
import { heal } from './vitals'

export type TargetRef =
  | { type: 'node'; id: string }
  | { type: 'building'; id: string }
  | { type: 'npc'; id: number }
  | { type: 'animal'; id: number }
  | { type: 'corpse'; id: number }
  | { type: 'ground'; id: number }
  | { type: 'site'; id: string }
  | { type: 'den'; id: string }
  | { type: 'water'; x: number; z: number }
  | { type: 'cart'; id: number }

export type UiPanel = 'trade' | 'storage' | 'craft' | 'quests' | 'dialog' | 'orders' | 'gift' | 'hire'

export interface InteractOption {
  id: string
  label: string
  enabled: boolean
  reason?: string
  /** Opens a UI panel instead of running immediately. */
  panel?: UiPanel
}

export interface Target {
  ref: TargetRef
  label: string
  x: number
  z: number
  dist: number
}

const BUILDING_NAMES: Partial<Record<Building['kind'], string>> = {
  house: 'House', well: 'Well', campfire: 'Campfire', noticeboard: 'Notice board', warehouse: 'Settlement warehouse',
  market: 'Market stall', inn: 'Inn', field: 'Field', pen: 'Pen', anvil: 'Anvil', woodpile: 'Woodpile',
  dryrack: 'Drying rack', herbgarden: 'Herb garden', torchpost: 'Torch post', trough: 'Trough', palisade: 'Palisade',
  shed: 'Shed', bridge: 'Bridge', spit: 'Spit',
}
export const buildingName = (b: Building) => BUILDING_NAMES[b.kind] ?? b.kind

const NODE_NAMES: Record<string, string> = {
  tree_broad: 'Broadleaf tree', tree_pine: 'Pine', tree_dead: 'Dead tree', tree_apple: 'Apple tree', bush: 'Bush',
  bush_berry: 'Berry bush', rock: 'Rock', stone: 'Stone', herb: 'Herb', mushroom: 'Mushroom', reed: 'Reed',
}

/** Stable identity of a target (for Tab cycling / pinning, UI-06). */
export const targetKey = (r: TargetRef): string => ('id' in r ? `${r.type}:${r.id}` : r.type)

/** Next target after `current` in the sorted candidate list (wraps around; first when none). */
export function nextTarget(list: Target[], current: string | null): Target | null {
  if (!list.length) return null
  const i = current ? list.findIndex((t) => targetKey(t.ref) === current) : -1
  return list[(i + 1) % list.length]!
}

/** Finds the best interaction target in front of the player (within ~3 m, facing cone). */
export function findTarget(sim: Sim, facing: number, maxDist = 3.2): Target | null {
  const cands = findTargets(sim, facing, maxDist)
  if (cands[0]) return cands[0]
  return waterTarget(sim, facing)
}

/** Half-angle of the interaction cone (review 016 #11) and the edge distance below which a target counts from any side. */
const TARGET_CONE_RAD = (80 * Math.PI) / 180
const TARGET_TOUCH_M = 0.6

/** All interactive objects in range, best first (distance + angle from facing). */
export function findTargets(sim: Sim, facing: number, maxDist = 3.2): Target[] {
  const p = sim.player
  const cands: Target[] = []
  const score = (x: number, z: number) => {
    const d = Math.hypot(x - p.x, z - p.z)
    const ang = Math.abs(angleDiff(facing, Math.atan2(x - p.x, z - p.z)))
    return d + ang * 1.2
  }
  const push = (ref: TargetRef, label: string, x: number, z: number, extra = 0) => {
    const d = Math.hypot(x - p.x, z - p.z)
    // Only what is in front of the player (facing cone); something touching the player counts from any side.
    if (d - extra > TARGET_TOUCH_M && Math.abs(angleDiff(facing, Math.atan2(x - p.x, z - p.z))) > TARGET_CONE_RAD) return
    if (d - extra <= maxDist) cands.push({ ref, label, x, z, dist: score(x, z) - extra })
  }
  for (const a of sim.actors.query(p.x, p.z, maxDist + 1)) {
    if (a === p) continue
    if (a.kind === 'npc') push({ type: 'npc', id: a.id }, `${(a as Human).name}${sim.state.settlements[(a as Human).settlementId]?.headmanId === a.id ? ' (headman)' : ''}`, a.x, a.z)
    else if (a.kind === 'animal' && SPECIES[(a as Animal).species].temperament === 'domestic') push({ type: 'animal', id: a.id }, SPECIES[(a as Animal).species].name, a.x, a.z)
  }
  for (const c of sim.corpsesNear(p.x, p.z, 7.1)) if (Math.abs(c.x - p.x) < 5 && Math.abs(c.z - p.z) < 5) push({ type: 'corpse', id: c.id }, `Carcass: ${SPECIES[c.species].name}`, c.x, c.z, 0.5)
  for (const g of sim.groundNear(p.x, p.z, 5.7)) if (Math.abs(g.x - p.x) < 4 && Math.abs(g.z - p.z) < 4) push({ type: 'ground', id: g.id }, itemDef(g.stack.id).name, g.x, g.z, 0.3)
  for (const c of sim.state.carts) push({ type: 'cart', id: c.id }, itemDef(c.item).name, c.x, c.z, 0.6)
  for (const s of sim.state.sites) push({ type: 'site', id: s.id }, 'Building site', s.x, s.z, 1)
  for (const d of sim.state.dens) if (d.alive) push({ type: 'den', id: d.id }, `Den (${SPECIES[d.species === 'deer' ? 'deer' : d.species].name})`, d.x, d.z, 1.5)
  for (const b of sim.buildingsNear(p.x, p.z, maxDist + 6)) {
    if (b.kind === 'bridge' || b.kind === 'palisade') continue
    const extra = Math.min(b.hw, b.hd) + (b.kind === 'field' || b.kind === 'pen' ? Math.max(b.hw, b.hd) * 0.6 : 0.5)
    push({ type: 'building', id: b.id }, buildingName(b), b.x, b.z, extra)
  }
  for (const n of sim.nodes.query(p.x, p.z, maxDist + 1)) {
    if (n.kind === 'reed') continue
    if (isTree(n.kind) ? sim.state.nodes[n.id]?.kind === 'felled' : !nodeAvailable(sim, n)) continue
    const label = n.kind === 'herb' ? `Herb: ${itemDef(n.herb ?? 'mint').name}` : NODE_NAMES[n.kind]!
    push({ type: 'node', id: n.id }, label, n.x, n.z, n.radius)
  }
  cands.sort((a, b) => a.dist - b.dist)
  return cands
}

export function waterTarget(sim: Sim, facing: number): Target | null {
  const p = sim.player
  const fx = p.x + Math.sin(facing) * 1.5
  const fz = p.z + Math.cos(facing) * 1.5
  if (sim.terrain.waterDepthAt(fx, fz) > 0.05 || sim.terrain.waterDepthAt(p.x, p.z) > 0.05) {
    return { ref: { type: 'water', x: fx, z: fz }, label: sim.terrain.isSeaAt(fx, fz) ? 'Sea' : 'Water', x: fx, z: fz, dist: 1 }
  }
  return null
}

/** Roasting runs with the calendar sped up (like resting) so the player does not wait the full time. */
const ROAST_ACCEL = 5

const opt = (id: string, label: string, enabled = true, reason?: string, panel?: UiPanel): InteractOption => ({ id, label, enabled, reason, panel })

function toolOpt(sim: Sim, id: string, label: string, cap: Capability, capName: string): InteractOption {
  return findTool(sim.player, cap) ? opt(id, label) : opt(id, label, false, `Missing: ${capName}`)
}

export function targetOptions(sim: Sim, t: TargetRef): InteractOption[] {
  const p = sim.player
  switch (t.type) {
    case 'animal':
      return [opt('pet', 'Pet')]
    case 'building': {
      const b = sim.building(t.id)
      if (!b) return []
      const o: InteractOption[] = []
      const repair = b.durability < 90 ? [toolOpt(sim, 'repair', `Repair (${Math.round(b.durability)}%, 2 branches)`, 'hammer', 'hammer')] : []
      switch (b.kind) {
        case 'anvil':
        case 'dryrack':
          o.push(opt('craft', b.kind === 'anvil' ? 'Anvil — crafting' : 'Drying rack — crafting', true, undefined, 'craft'))
          break
        case 'campfire':
          if (b.lit !== false) {
            const cap = roastCapacity(sim, p)
            const n = roastBatch(sim, p)
            o.push(opt('roast', `Roast meat (${n}/${cap} pcs)`, n > 0, cap ? 'No raw meat' : 'Move closer to the fire'))
          }
          o.push(opt('craft', 'Cook / craft', true, undefined, 'craft'), opt('rest', `Rest by the fire (speed up time${b.lit ? `, ${(b.fuel ?? 0).toFixed(1)} h of fuel` : ''})`), opt('camp_sleep', `Sleep by the campfire${b.lit ? ` (${(b.fuel ?? 0).toFixed(1)} h of fuel)` : ''}`))
          o.push(opt('add_fuel', `Add fuel (${(b.fuel ?? 0).toFixed(1)} h left)`, countItem(p.inv, 'branch') + countItem(p.inv, 'log') > 0, 'You have no branches or logs'))
          if (!b.lit) o.unshift(toolOpt(sim, 'light', 'Light', 'fire_start', 'flint and steel'))
          else o.push(opt('douse_fire', 'Put out the fire'))
          if (b.hearth && !b.lit && b.owner === 'player') o.push(opt('dismantle_hearth', 'Dismantle the hearth (get the stones back)'))
          break
        case 'house':
        case 'shed':
          if (b.owner === 'player') o.push(opt('storage', 'Chest', true, undefined, 'storage'), opt('bed_sleep', 'Sleep in your own bed'))
          else o.push(opt('storage', 'Look in the chest (not yours!)', true, undefined, 'storage'))
          o.push(...repair)
          break
        case 'inn':
          o.push(opt('inn_sleep', `Rent a bed (${INN_BED_PRICE}c) and sleep`, p.money >= INN_BED_PRICE, 'Not enough money'))
          for (const m of INN_MEALS) {
            const ids = mealIngredients(b, m)
            const why = mealRefusal(sim, b, m)
            o.push(opt(m.id, ids ? `${m.name} (${m.price}c, +${mealNutrition(ids)} satiety)` : `${m.name} (${m.price}c) — unavailable`, !why, why ?? undefined))
          }
          break
        case 'market': {
          o.push(opt('market', 'Approach the trader'))
          break
        }
        case 'noticeboard':
          o.push(opt('quests', 'Read the notices', true, undefined, 'quests'))
          break
        case 'torchpost':
          o.push(b.lit ? opt('douse', 'Put out the torch') : toolOpt(sim, 'light', 'Light the torch', 'fire_start', 'flint and steel'))
          break
        case 'trough':
          o.push(opt('fill_trough', `Fill the trough (${Math.round(b.water ?? 0)}/12)`, !!p.inv.items.find((s) => s.id === 'bucket'), 'You need a bucket'))
          break
        case 'warehouse':
          o.push(opt('storage', 'Settlement warehouse', true, undefined, 'storage'))
          if (b.ratNest) o.push(opt('inspect_nest', 'Inspect the rat nest'))
          o.push(...repair)
          break
        case 'well':
          o.push(opt('drink_well', 'Drink (safe water)'), opt('fill_well', 'Fill waterskin/bucket'))
          break
        default:
          o.push(...repair)
      }
      // A pushed cart can be emptied straight into the warehouse or your own storage (TRANS-01).
      const cart = sim.state.px.cart
      if (cart && b.inv && (b.kind === 'warehouse' || b.owner === 'player')) {
        o.unshift(opt('unload_cart_here', `Unload the cart here (${Math.round(cartLoad(cart))} kg)`, cart.inv.items.length > 0, 'The cart is empty'))
      }
      return o
    }
    case 'cart': {
      const c = sim.state.carts.find((x) => x.id === t.id)
      if (!c) return []
      const load = `${Math.round(cartLoad(c))}/${cartDef(c).capacity} kg`
      const heavy = p.inv.items.some((s) => isHeavy(s.id))
      return [
        opt('push_cart', `Push (${load})`, !sim.state.px.cart, 'You are already pushing a cart'),
        opt('load_cart', 'Load heavy goods from your pack', heavy, 'No heavy goods in your pack'),
        opt('unload_cart', 'Take the load into your pack', c.inv.items.length > 0, 'The cart is empty'),
        opt('stow_cart', 'Pick up the empty cart', c.inv.items.length === 0, 'Unload it first'),
      ]
    }
    case 'corpse':
      return [toolOpt(sim, 'butcher', 'Butcher', 'cut', 'knife'), toolOpt(sim, 'bury', 'Bury', 'dig', 'shovel')]
    case 'den':
      return [opt('burn_den', 'Burn the den (5 branches + fire)', countItem(p.inv, 'branch') >= 5 && !!findTool(p, 'fire_start'), 'You need 5 branches and flint and steel or a torch')]
    case 'ground': {
      const g = sim.state.ground.find((gg) => gg.id === t.id)
      if (g?.stack.id === 'rock_chunk') return [toolOpt(sim, 'break_chunk', 'Break into stones with a pickaxe', 'mine', 'pickaxe'), opt('pickup', 'Pick up (heavy)')]
      if (g?.planted) {
        return [
          g.lit ? opt('douse_planted', 'Extinguish') : canLightTorch(sim, p, g) ? opt('light_planted', 'Light') : opt('light_planted', 'Light', false, 'You need flint and steel or a fire next to it'),
          opt('pickup', 'Pick up the torch'),
        ]
      }
      return [opt('pickup', 'Pick up')]
    }
    case 'node': {
      const n = sim.nodes.byId(t.id)
      if (!n) return []
      if (isTree(n.kind)) {
        const o = [toolOpt(sim, 'chop', 'Fell the tree', 'chop', 'axe')]
        if (n.kind === 'tree_apple') o.unshift(opt('gather', 'Pick apples'))
        return o
      }
      if (n.kind === 'rock') return [toolOpt(sim, 'mine', 'Mine stone / ore', 'mine', 'pickaxe')]
      if (n.kind === 'stone') return [opt('gather', 'Pick up the stone')]
      return [opt('gather', n.kind === 'bush' ? 'Gather branches' : 'Gather')]
    }
    case 'npc': {
      const n = sim.human(t.id)
      if (!n) return []
      if (n.vitals.ko && !n.vitals.dead) return [opt('help_npc', 'Tend the wounded', p.inv.items.some((s) => s.id === 'bandage' || s.id === 'salve'), 'You need a bandage')]
      const o = [opt('talk', 'Talk', true, undefined, 'dialog'), opt('trade', 'Trade', true, undefined, 'trade'), opt('gift', 'Give a gift', p.inv.items.length > 0, 'You have nothing to give', 'gift')]
      if (n.companion) o.push(opt('dismiss', n.companion.kind === 'hired' ? 'End the contract' : 'Part ways'))
      else if (n.age === 'adult') o.push(opt('hire', 'Hire as a companion', true, undefined, 'hire'), opt('ask_join', 'Ask to come along'))
      const st = sim.state.settlements[n.settlementId]
      if (st && st.headmanId === n.id && !st.playerMayor && n.settlementId === settlementAt(sim, p.x, p.z, 400)) {
        const ms = mayorStatus(sim, st.id)
        o.push(opt('ask_office', 'Ask about leading the settlement', ms.eligible, `Not yet: ${ms.missing.join(', ')}`))
      }
      if (st?.playerMayor && st.deputyId === n.id) o.push(opt('set_tax', `Tax rate: ${st.taxRate ?? 'normal'} (change)`))
      if (n.profession === 'blacksmith') o.push(opt('orders', 'Order from the blacksmith', true, undefined, 'orders'))
      if (n.profession === 'blacksmith') {
        const blade = serviceBlade(p.eq.main)
        const price = blade ? sharpenServicePrice(blade) : 0
        o.push(opt('sharpen_service', price ? `Sharpen your ${itemDef(blade!.id).name.toLowerCase()} (${price}c)` : 'Sharpen your weapon (nothing to do)', price > 0 && p.money >= price, price ? 'Not enough money' : 'The edge is already as sharp as it gets'))
      }
      if (n.profession === 'herbalist') o.push(opt('heal_service', 'Ask for healing (15c)', p.money >= 15, 'Not enough money'))
      if (n.profession === 'guard' || n.profession === 'hunter') o.push(opt('quests', 'Quests', true, undefined, 'quests'))
      return o
    }
    case 'site': {
      const s = sim.state.sites.find((ss) => ss.id === t.id)
      return s ? [opt('build', 'Deliver materials and build'), opt('cancel_site', 'Dismantle the building site')] : []
    }
    case 'water':
      return [opt('drink', 'Drink'), opt('fill', 'Fill waterskin'), opt('drink_skin', 'Drink from waterskin')]
  }
}

/** Executes an option (non-panel). Returns message for UI. */
export function runOption(sim: Sim, t: TargetRef, optionId: string): string {
  const p = sim.player
  const equip = (cap: Capability) => {
    // Working with a tool needs both hands: a pushed cart is parked first.
    if (sim.state.px.cart) parkCart(sim, p)
    const tool = findTool(p, cap)
    if (tool && p.eq.main !== tool && p.eq.off !== tool) equipToMain(p, tool)
    return tool
  }
  const at = (x: number, z: number) => `${x.toFixed(2)},${z.toFixed(2)}`
  switch (optionId) {
    case 'add_fuel': {
      const b = sim.building((t as { id: string }).id)
      return b ? addFuelFromPack(p, b).msg : ''
    }
    case 'ask_join': {
      const n = sim.human((t as { id: number }).id)
      return n ? askToJoin(sim, n).msg : ''
    }
    case 'ask_office': {
      const n = sim.human((t as { id: number }).id)
      return n ? acceptOffice(sim, n.settlementId) : ''
    }
    case 'bed_sleep':
    case 'camp_sleep':
    case 'inn_sleep': {
      if (optionId === 'inn_sleep') payLodging(sim, sim.building((t as { id: string }).id)?.settlementId ?? 0)
      const comfort = optionId === 'inn_sleep' ? 0.85 : optionId === 'bed_sleep' ? 0.8 : sleepComfort(sim, null)
      return startSleep(sim, comfort)
    }
    case 'break_chunk':
      equip('mine')
      startActivity(sim, { kind: 'break_chunk', ref: String((t as { id: number }).id), label: 'Breaking the chunk', total: ROCK.breakS })
      return ''
    case 'burn_den':
      startActivity(sim, { kind: 'burn_den', ref: (t as { id: string }).id, label: 'Setting the den on fire', total: 5 })
      return ''
    case 'bury':
      equip('dig')
      startActivity(sim, { kind: 'bury', ref: String((t as { id: number }).id), label: 'Digging a grave', total: 10 })
      return ''
    case 'butcher':
      equip('cut')
      startActivity(sim, { kind: 'butcher', ref: String((t as { id: number }).id), label: 'Butchering', total: 8 })
      return ''
    case 'cancel_site': {
      const s = sim.state.sites.find((ss) => ss.id === (t as { id: string }).id)
      if (!s) return ''
      for (const [item, qty] of Object.entries(s.delivered)) {
        if (qty > 0) {
          dropItem(sim, s.x, s.z, { id: item, qty })
          logProduce(item, qty, 'site_refund', p)
        }
      }
      sim.state.sites.splice(sim.state.sites.indexOf(s), 1)
      return 'You dismantled the building site (the materials are on the ground).'
    }
    case 'chop':
      equip('chop')
      startActivity(sim, { kind: 'chop', ref: (t as { id: string }).id, label: 'Felling the tree', total: Math.max(6, 18 - p.skills.woodcutting / 8) })
      return ''
    case 'dismantle_hearth': {
      const b = sim.building((t as { id: string }).id)
      return b ? dismantleHearth(sim, p, b).msg : ''
    }
    case 'dismiss': {
      const n = sim.human((t as { id: number }).id)
      return n ? dismissCompanion(sim, n) : ''
    }
    case 'douse': {
      const b = sim.building((t as { id: string }).id)
      if (b) {
        b.lit = false
        questEvent(sim, { k: 'douse', buildingId: b.id })
      }
      return 'Put out.'
    }
    case 'douse_fire': {
      const b = sim.building((t as { id: string }).id)
      if (b) douseFire(b)
      return 'You put the fire out.'
    }
    case 'douse_planted': {
      const g = sim.state.ground.find((gg) => gg.id === (t as { id: number }).id)
      if (g) extinguishGroundTorch(g)
      return 'You put the torch out.'
    }
    case 'drink':
    case 'drink_well':
    case 'fill':
    case 'fill_well': {
      const b = t.type === 'building' ? sim.building(t.id) : undefined
      const x = t.type === 'water' ? t.x : b!.x
      const z = t.type === 'water' ? t.z : b!.z
      startActivity(sim, { kind: optionId.startsWith('drink') ? 'drink' : 'fill', ref: b ? 'well' : undefined, label: optionId.startsWith('drink') ? 'Drinking' : 'Filling', total: 2, data: at(x, z) })
      return ''
    }
    case 'drink_skin': {
      const s = p.inv.items.find((i) => (i.water ?? 0) > 0)
      if (!s) return 'Your waterskin is empty.'
      s.water! -= 1
      p.vitals.thirst = Math.min(100, p.vitals.thirst + 30)
      return 'You take a sip from the waterskin.'
    }
    case 'fill_trough': {
      const b = sim.building((t as { id: string }).id)
      return b ? fillTrough(sim, p, b).msg : ''
    }
    case 'gather':
      startActivity(sim, { kind: 'gather', ref: (t as { id: string }).id, label: 'Gathering', total: 2.5 })
      return ''
    case 'heal_service': {
      const n = sim.human((t as { id: number }).id)
      if (!n || p.money < 15) return ''
      p.money -= 15
      n.money += 15
      logMoney('player', `npc:${n.id}`, 15, 'heal_service')
      heal(p.vitals, 45 + n.skills.medicine * 0.4)
      p.vitals.bleeding = 0
      p.vitals.convalescenceH = Math.max(0, p.vitals.convalescenceH - 8)
      if (p.vitals.illness) p.vitals.illness = undefined
      return `${n.name} dresses your wounds and gives you herbs.`
    }
    case 'help_npc': {
      const n = sim.human((t as { id: number }).id)
      const s = p.inv.items.find((i) => i.id === 'bandage' || i.id === 'salve')
      if (!n || !s) return ''
      consume(sim, p, s, n)
      heal(n.vitals, 20)
      n.vitals.ko = undefined
      n.opinion = Math.min(100, n.opinion + 30)
      addRep(sim, n.settlementId, { helpfulness: 5 }, `You helped the wounded: ${n.name}`)
      return ''
    }
    case 'inspect_nest':
      return 'Rats have nested in the warehouse wall. Kill the rats and repair the building (hammer + branches).'
    case 'light': {
      const b = sim.building((t as { id: string }).id)
      if (!b) return ''
      if (b.kind === 'campfire') return lightFire(p, b).msg
      b.lit = true
      questEvent(sim, { k: 'light', buildingId: b.id })
      return 'Lit.'
    }
    case 'light_planted': {
      const g = sim.state.ground.find((gg) => gg.id === (t as { id: number }).id)
      return g && lightGroundTorch(g) ? 'The torch flares up.' : 'The torch is spent.'
    }
    case 'load_cart': {
      const c = sim.state.carts.find((x) => x.id === (t as { id: number }).id)
      if (!c) return ''
      const kg = loadHeavy(p, c)
      return kg ? `Loaded ${Math.round(kg)} kg into the cart.` : 'The cart is full.'
    }
    case 'market': {
      const b = sim.building((t as { id: string }).id)
      const trader = b ? sim.npcsOf(b.settlementId).find((n) => n.profession === 'trader' && !n.vitals.dead) : undefined
      if (trader && b && Math.hypot(trader.x - b.x, trader.z - b.z) > 60) return `The stall is empty — ${trader.name} is away.`
      return trader ? `Trader: ${trader.name} — go and talk to them (Trade).` : 'The stall is empty.'
    }
    case 'meal_good':
    case 'meal_hearty':
    case 'meal_simple': {
      const inn = sim.building((t as { id: string }).id)
      const meal = INN_MEALS.find((m) => m.id === optionId)
      if (!inn || !meal) return ''
      const why = mealRefusal(sim, inn, meal)
      if (why) return why
      // The transaction happens at completion (cancelling costs nothing).
      startActivity(sim, { kind: 'meal', ref: inn.id, label: `Eating: ${meal.name}`, total: meal.eatS, data: meal.id })
      return ''
    }
    case 'mine':
      equip('mine')
      startActivity(sim, { kind: 'mine', ref: (t as { id: string }).id, label: 'Mining', total: ROCK.strikeS })
      return ''
    case 'pet': {
      addStat(sim, 'petted')
      return 'The animal nuzzles up to you.'
    }
    case 'pickup': {
      const g = sim.state.ground.find((gg) => gg.id === (t as { id: number }).id)
      if (!g) return ''
      const n = fitQty(p, g.stack)
      if (n <= 0) return 'You cannot carry any more.'
      const taken = { ...g.stack, qty: n }
      restoreTorchDur(g, taken)
      addItem(p.inv, taken)
      g.stack.qty -= n
      if (g.stack.qty <= 0) sim.removeGround(g)
      return `Picked up: ${itemDef(g.stack.id).name}${g.stack.qty > 0 ? ` ×${n} (the rest is too heavy)` : ''}`
    }
    case 'push_cart':
      return pushParked(sim, p, (t as { id: number }).id)
    case 'repair':
      equip('hammer')
      startActivity(sim, { kind: 'repair', ref: (t as { id: string }).id, label: 'Repairing', total: 10 })
      return ''
    case 'rest':
      startActivity(sim, { kind: 'rest', label: 'Resting by the fire', total: 150, accel: 20 })
      return 'You rest (time sped up, Esc to stop).'
    case 'roast': {
      const n = roastBatch(sim, p)
      if (!n) return 'You have no raw meat.'
      startActivity(sim, { kind: 'roast', label: `Roasting meat (${n} pcs)`, total: roastSeconds(), accel: ROAST_ACCEL, data: String(n) })
      return ''
    }
    case 'set_tax': {
      const n = sim.human((t as { id: number }).id)
      return n ? cycleTaxRate(sim, n.settlementId) : ''
    }
    case 'sharpen_service': {
      const n = sim.human((t as { id: number }).id)
      const blade = serviceBlade(p.eq.main)
      const price = blade ? sharpenServicePrice(blade) : 0
      if (!n || !blade || price <= 0 || p.money < price) return ''
      p.money -= price
      n.money += price
      logMoney('player', `npc:${n.id}`, price, 'sharpen_service')
      blade.edge = maxEdge(blade) // the smith's edge is the best this blade can hold; durability is not repaired
      return `${n.name} puts a fine edge on your ${itemDef(blade.id).name.toLowerCase()} (${price} c).`
    }
    case 'stow_cart':
      return stowCart(sim, p, (t as { id: number }).id)
    case 'unload_cart': {
      const c = sim.state.carts.find((x) => x.id === (t as { id: number }).id)
      if (!c) return ''
      const kg = unloadInto(c, p.inv, p)
      return kg ? `Took ${Math.round(kg)} kg from the cart.` : 'You cannot carry any more.'
    }
    case 'unload_cart_here': {
      const b = sim.building((t as { id: string }).id)
      const c = sim.state.px.cart
      return b && c ? unloadToBuilding(sim, c, b) : ''
    }
    default:
      return ''
  }
}

/** Hours of an evening/night sleep: until the first daylight at or after 06:00 (at most 08:00), never ending in the dark. */
export function hoursUntilMorning(cal: number): number {
  const hr = hourOf(cal)
  for (let off = 0.5; off <= 24; off += 0.25) {
    const w = (hr + off) % 24
    if (w >= 6 && w < 12 && !isNight(cal + off * 3600)) return off
  }
  return 9
}

export function startSleep(sim: Sim, comfort: number): string {
  const hr = hourOf(sim.state.time.cal)
  const nap = Math.max(2, (100 - sim.player.vitals.vigor) / 12)
  // A nap that would end after dusk becomes a night's sleep (review 017 #1-2): nobody wakes up in the dark.
  const hours = isNight(sim.state.time.cal) || hr > 20 || isNight(sim.state.time.cal + nap * 3600) ? hoursUntilMorning(sim.state.time.cal) : nap
  startActivity(sim, { kind: 'sleep', label: `Sleeping (comfort ${Math.round(comfort * 100)}%)`, total: hours * 150, accel: 40, data: String(comfort) })
  return 'You fall asleep… (time sped up, Esc to stop)'
}

/** Taking from someone else's chest: theft detection. */
export function checkTheft(sim: Sim, b: Building): boolean {
  if (b.owner === 'player' || b.owner === 'settlement') return false
  const p = sim.player
  const night = isNight(sim.state.time.cal)
  for (const n of sim.state.npcs) {
    if (n.vitals.dead || isDown(sim, n)) continue
    const d = Math.hypot(n.x - p.x, n.z - p.z)
    let r = 14 + n.attrs.per * 2
    if (sim.state.px.sneaking) r *= 1 - p.skills.sneak / 150
    if (night) r *= 0.5
    if (d < r) {
      addStat(sim, 'caughtStealing')
      addRep(sim, n.settlementId, { honesty: -8 }, `${n.name} caught you stealing!`)
      n.opinion = Math.max(-100, n.opinion - 40)
      return true
    }
  }
  return false
}

/** Settlement warehouse: taking without standing is theft-like (honesty); depositing helps. */
export function warehouseTake(sim: Sim, b: Building): { allowed: boolean; msg?: string } {
  const rep = sim.state.settlements[b.settlementId]?.rep
  if (rep && rep.helpfulness >= 10) return { allowed: true }
  return { allowed: true, msg: 'You are taking from the common warehouse — the villagers will notice.' }
}

/** Reputation cost of taking `qty` pieces of a stack out of a settlement warehouse (D-ECON-4); null outside warehouses. */
export function warehouseTakeCost(sim: Sim, b: Building, s: ItemStack, qty: number): { helpfulness: number; honesty: number } | null {
  if (b.kind !== 'warehouse') return null
  const rep = sim.state.settlements[b.settlementId]?.rep
  const n = Math.min(qty, s.qty)
  const helpfulness = takeGoodwill(itemDef(s.id).price * n)
  // Without standing a take also looks like theft: Honesty cost scales with the value taken, so "1 × 6" and "all 6" cost the same (review 017 #3).
  return { helpfulness, honesty: rep && rep.helpfulness < 10 ? Math.round(helpfulness * 5) / 10 : 0 }
}

/** Helpfulness gained by depositing `qty` pieces of a stack into a warehouse. */
export function warehouseDepositGain(b: Building, s: ItemStack, qty: number): number {
  return b.kind === 'warehouse' ? depositGoodwill(itemDef(s.id).price * Math.min(qty, s.qty)) : 0
}

const fmt1 = (n: number) => (Math.round(n * 10) / 10).toString()

/** Moves `qty` pieces (default the whole stack) between the backpack and a storage building. */
export function transferToStorage(sim: Sim, b: Building, stackIdx: number, toStorage: boolean, qty = Infinity): string {
  const p = sim.player
  if (!b.inv) return ''
  if (toStorage) {
    const s = p.inv.items[stackIdx]
    if (!s) return ''
    const moved = removeStack(p.inv, s, Math.max(1, qty))!
    addItem(b.inv, moved)
    const gain = b.kind === 'warehouse' ? depositGoodwill(itemDef(moved.id).price * moved.qty) : 0
    if (gain > 0) addRep(sim, b.settlementId, { helpfulness: gain })
    const stored = `Stored: ${itemDef(moved.id).name}${moved.qty > 1 ? ` ×${moved.qty}` : ''}${gain > 0 ? ` (Helpfulness +${fmt1(gain)})` : ''}`
    sim.message(stored, 'info')
    return stored
  }
  const s = b.inv.items[stackIdx]
  if (!s) return ''
  const n = Math.min(fitQty(p, s), Math.max(1, qty))
  if (n <= 0) return 'You cannot carry any more.'
  if (b.owner.startsWith('household') && checkTheft(sim, b)) return 'You were caught!'
  let costTxt = ''
  if (b.kind === 'warehouse') {
    // Taking back costs what depositing gave (no deposit/take loop, review 006 #5); without standing it also looks like theft.
    const cost = warehouseTakeCost(sim, b, s, n)!
    addRep(sim, b.settlementId, { helpfulness: -cost.helpfulness, ...(cost.honesty ? { honesty: -cost.honesty } : {}) })
    const parts = [cost.helpfulness > 0 ? `Helpfulness −${fmt1(cost.helpfulness)}` : '', cost.honesty > 0 ? `Honesty −${fmt1(cost.honesty)}` : ''].filter(Boolean)
    costTxt = parts.length ? ` (${parts.join(', ')})` : ''
  }
  const partial = n < Math.min(qty, s.qty)
  const moved = removeStack(b.inv, s, n)!
  addItem(p.inv, moved)
  const taken = `Taken: ${itemDef(moved.id).name}${moved.qty > 1 ? ` ×${moved.qty}` : ''}${partial ? ' (the rest is too heavy)' : ''}${costTxt}`
  sim.message(taken, 'info')
  return taken
}

export { acceptQuest, COMBAT }
