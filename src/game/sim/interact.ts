/**
 * Interaction targets & options (shared by desktop E-key, mobile button and UI menus).
 * Options needing a capability auto-equip the right tool from inventory (vision §27).
 * @domain interaction
 */
import type { Capability } from '../data/items'
import type { Sim } from './sim'
import type { Animal, Building, Human } from './types'
import { COMBAT, ROCK } from '../config/calibration'
import { angleDiff } from '../core/math'
import { itemDef } from '../data/items'
import { SPECIES } from '../data/species'
import { isTree } from '../world/nodes'
import { consume, dropItem, fillTrough, nodeAvailable } from './actions'
import { isDown } from './combat'
import { addItem, countItem, equipToMain, findTool, fitQty, removeStack } from './inventory'
import { sleepComfort, startActivity } from './player'
import { acceptQuest } from './quests'
import { addRep, addStat } from './reputation'
import { hourOf, isNight } from './time'
import { payToTreasury } from './treasury'
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

export type UiPanel = 'trade' | 'storage' | 'craft' | 'quests' | 'dialog' | 'orders'

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
  house: 'Dom', well: 'Studnia', campfire: 'Ognisko', noticeboard: 'Tablica ogłoszeń', warehouse: 'Magazyn osady',
  market: 'Stragan', inn: 'Gospoda', field: 'Pole', pen: 'Zagroda', anvil: 'Kowadło', woodpile: 'Stos drewna',
  dryrack: 'Suszarnia', herbgarden: 'Ogródek ziołowy', torchpost: 'Pochodnia', trough: 'Koryto', palisade: 'Palisada',
  shed: 'Szopa', bridge: 'Most',
}
export const buildingName = (b: Building) => BUILDING_NAMES[b.kind] ?? b.kind

const NODE_NAMES: Record<string, string> = {
  tree_broad: 'Drzewo liściaste', tree_pine: 'Sosna', tree_dead: 'Martwe drzewo', tree_apple: 'Jabłoń', bush: 'Krzew',
  bush_berry: 'Krzew jagodowy', rock: 'Skała', stone: 'Kamień', herb: 'Zioło', mushroom: 'Grzyb', reed: 'Trzcina',
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
    if (d - extra <= maxDist) cands.push({ ref, label, x, z, dist: score(x, z) - extra })
  }
  for (const a of sim.actors.query(p.x, p.z, maxDist + 1)) {
    if (a === p) continue
    if (a.kind === 'npc') push({ type: 'npc', id: a.id }, (a as Human).name, a.x, a.z)
    else if (a.kind === 'animal' && SPECIES[(a as Animal).species].temperament === 'domestic') push({ type: 'animal', id: a.id }, SPECIES[(a as Animal).species].name, a.x, a.z)
  }
  for (const c of sim.corpsesNear(p.x, p.z, 7.1)) if (Math.abs(c.x - p.x) < 5 && Math.abs(c.z - p.z) < 5) push({ type: 'corpse', id: c.id }, `Zwłoki: ${SPECIES[c.species].name}`, c.x, c.z, 0.5)
  for (const g of sim.groundNear(p.x, p.z, 5.7)) if (Math.abs(g.x - p.x) < 4 && Math.abs(g.z - p.z) < 4) push({ type: 'ground', id: g.id }, itemDef(g.stack.id).name, g.x, g.z, 0.3)
  for (const s of sim.state.sites) push({ type: 'site', id: s.id }, 'Plac budowy', s.x, s.z, 1)
  for (const d of sim.state.dens) if (d.alive) push({ type: 'den', id: d.id }, `Legowisko (${SPECIES[d.species === 'deer' ? 'deer' : d.species].name})`, d.x, d.z, 1.5)
  for (const b of sim.buildingsNear(p.x, p.z, maxDist + 6)) {
    if (b.kind === 'bridge' || b.kind === 'palisade') continue
    const extra = Math.min(b.hw, b.hd) + (b.kind === 'field' || b.kind === 'pen' ? Math.max(b.hw, b.hd) * 0.6 : 0.5)
    push({ type: 'building', id: b.id }, buildingName(b), b.x, b.z, extra)
  }
  for (const n of sim.nodes.query(p.x, p.z, maxDist + 1)) {
    if (n.kind === 'reed') continue
    if (isTree(n.kind) ? sim.state.nodes[n.id]?.kind === 'felled' : !nodeAvailable(sim, n)) continue
    const label = n.kind === 'herb' ? `Zioło: ${itemDef(n.herb ?? 'mint').name}` : NODE_NAMES[n.kind]!
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
    return { ref: { type: 'water', x: fx, z: fz }, label: sim.terrain.isSeaAt(fx, fz) ? 'Morze' : 'Woda', x: fx, z: fz, dist: 1 }
  }
  return null
}

const opt = (id: string, label: string, enabled = true, reason?: string, panel?: UiPanel): InteractOption => ({ id, label, enabled, reason, panel })

function toolOpt(sim: Sim, id: string, label: string, cap: Capability, capName: string): InteractOption {
  return findTool(sim.player, cap) ? opt(id, label) : opt(id, label, false, `Brak: ${capName}`)
}

export function targetOptions(sim: Sim, t: TargetRef): InteractOption[] {
  const p = sim.player
  switch (t.type) {
    case 'animal':
      return [opt('pet', 'Pogłaszcz')]
    case 'building': {
      const b = sim.building(t.id)
      if (!b) return []
      const o: InteractOption[] = []
      const repair = b.durability < 90 ? [toolOpt(sim, 'repair', `Napraw (${Math.round(b.durability)}%, 2 gałęzie)`, 'hammer', 'młotek')] : []
      switch (b.kind) {
        case 'anvil':
        case 'dryrack':
          o.push(opt('craft', b.kind === 'anvil' ? 'Kowadło — wytwarzanie' : 'Suszarnia — wytwarzanie', true, undefined, 'craft'))
          break
        case 'campfire':
          o.push(opt('craft', 'Gotuj / wytwarzaj', true, undefined, 'craft'), opt('rest', 'Odpocznij przy ogniu (przyspiesz)'), opt('camp_sleep', 'Śpij przy ognisku'))
          if (!b.lit) o.unshift(toolOpt(sim, 'light', 'Rozpal', 'fire_start', 'krzesiwo'))
          break
        case 'house':
        case 'shed':
          if (b.owner === 'player') o.push(opt('storage', 'Skrzynia', true, undefined, 'storage'), opt('bed_sleep', 'Śpij we własnym łóżku'))
          else o.push(opt('storage', 'Zajrzyj do skrzyni (cudza!)', true, undefined, 'storage'))
          o.push(...repair)
          break
        case 'inn':
          o.push(opt('inn_sleep', 'Wynajmij nocleg (8 m) i śpij', p.money >= 8, 'Za mało pieniędzy'))
          break
        case 'market': {
          o.push(opt('market', 'Podejdź do handlarza'))
          break
        }
        case 'noticeboard':
          o.push(opt('quests', 'Przeczytaj ogłoszenia', true, undefined, 'quests'))
          break
        case 'torchpost':
          o.push(b.lit ? opt('douse', 'Zgaś pochodnię') : toolOpt(sim, 'light', 'Zapal pochodnię', 'fire_start', 'krzesiwo'))
          break
        case 'trough':
          o.push(opt('fill_trough', `Napełnij koryto (${Math.round(b.water ?? 0)}/12)`, !!p.inv.items.find((s) => s.id === 'bucket'), 'Potrzebne wiadro'))
          break
        case 'warehouse':
          o.push(opt('storage', 'Magazyn osady', true, undefined, 'storage'))
          if (b.ratNest) o.push(opt('inspect_nest', 'Obejrzyj gniazdo szczurów'))
          o.push(...repair)
          break
        case 'well':
          o.push(opt('drink_well', 'Napij się (bezpieczna woda)'), opt('fill_well', 'Napełnij bukłak/wiadro'))
          break
        default:
          o.push(...repair)
      }
      return o
    }
    case 'corpse':
      return [toolOpt(sim, 'butcher', 'Oprawić', 'cut', 'nóż'), toolOpt(sim, 'bury', 'Zakopać', 'dig', 'łopata')]
    case 'den':
      return [opt('burn_den', 'Spal legowisko (5 gałęzi + ogień)', countItem(p.inv, 'branch') >= 5 && !!findTool(p, 'fire_start'), 'Potrzeba 5 gałęzi i krzesiwa/pochodni')]
    case 'ground': {
      const g = sim.state.ground.find((gg) => gg.id === t.id)
      if (g?.stack.id === 'rock_chunk') return [toolOpt(sim, 'break_chunk', 'Rozbij kilofem na kamienie', 'mine', 'kilof'), opt('pickup', 'Podnieś (ciężki)')]
      return [opt('pickup', 'Podnieś')]
    }
    case 'node': {
      const n = sim.nodes.byId(t.id)
      if (!n) return []
      if (isTree(n.kind)) {
        const o = [toolOpt(sim, 'chop', 'Zetnij drzewo', 'chop', 'siekiera')]
        if (n.kind === 'tree_apple') o.unshift(opt('gather', 'Zerwij jabłka'))
        return o
      }
      if (n.kind === 'rock') return [toolOpt(sim, 'mine', 'Wydobądź kamień / rudę', 'mine', 'kilof')]
      if (n.kind === 'stone') return [opt('gather', 'Podnieś kamień')]
      return [opt('gather', n.kind === 'bush' ? 'Nazbieraj gałęzi' : 'Zbierz')]
    }
    case 'npc': {
      const n = sim.human(t.id)
      if (!n) return []
      if (n.vitals.ko && !n.vitals.dead) return [opt('help_npc', 'Opatrz rannego', p.inv.items.some((s) => s.id === 'bandage' || s.id === 'salve'), 'Potrzebny bandaż')]
      const o = [opt('talk', 'Rozmawiaj', true, undefined, 'dialog'), opt('trade', 'Handluj', true, undefined, 'trade')]
      if (n.profession === 'blacksmith') o.push(opt('orders', 'Zamów u kowala', true, undefined, 'orders'))
      if (n.profession === 'herbalist') o.push(opt('heal_service', 'Poproś o leczenie (15 m)', p.money >= 15, 'Za mało pieniędzy'))
      if (n.profession === 'guard' || n.profession === 'hunter') o.push(opt('quests', 'Zadania', true, undefined, 'quests'))
      return o
    }
    case 'site': {
      const s = sim.state.sites.find((ss) => ss.id === t.id)
      return s ? [opt('build', 'Dostarcz materiały i buduj'), opt('cancel_site', 'Rozbierz plac budowy')] : []
    }
    case 'water':
      return [opt('drink', 'Napij się'), opt('fill', 'Napełnij bukłak'), opt('drink_skin', 'Pij z bukłaka')]
  }
}

/** Executes an option (non-panel). Returns message for UI. */
export function runOption(sim: Sim, t: TargetRef, optionId: string): string {
  const p = sim.player
  const equip = (cap: Capability) => {
    const tool = findTool(p, cap)
    if (tool && p.eq.main !== tool && p.eq.off !== tool) equipToMain(p, tool)
    return tool
  }
  const at = (x: number, z: number) => `${x.toFixed(2)},${z.toFixed(2)}`
  switch (optionId) {
    case 'bed_sleep':
    case 'camp_sleep':
    case 'inn_sleep': {
      if (optionId === 'inn_sleep') {
        const sid = sim.building((t as { id: string }).id)?.settlementId ?? 0
        const innkeeper = sim.npcsOf(sid).find((n) => n.profession === 'trader' && !n.vitals.dead)
        if (innkeeper) {
          p.money -= 8
          innkeeper.money += 8
        } else payToTreasury(sim, sid, p, 8)
      }
      const comfort = optionId === 'inn_sleep' ? 0.85 : optionId === 'bed_sleep' ? 0.8 : sleepComfort(sim, null)
      return startSleep(sim, comfort)
    }
    case 'break_chunk':
      equip('mine')
      startActivity(sim, { kind: 'break_chunk', ref: String((t as { id: number }).id), label: 'Rozbijanie odłamka', total: ROCK.breakS })
      return ''
    case 'burn_den':
      startActivity(sim, { kind: 'burn_den', ref: (t as { id: string }).id, label: 'Podpalanie legowiska', total: 5 })
      return ''
    case 'bury':
      equip('dig')
      startActivity(sim, { kind: 'bury', ref: String((t as { id: number }).id), label: 'Kopanie grobu', total: 10 })
      return ''
    case 'butcher':
      equip('cut')
      startActivity(sim, { kind: 'butcher', ref: String((t as { id: number }).id), label: 'Oprawianie', total: 8 })
      return ''
    case 'cancel_site': {
      const s = sim.state.sites.find((ss) => ss.id === (t as { id: string }).id)
      if (!s) return ''
      for (const [item, qty] of Object.entries(s.delivered)) if (qty > 0) dropItem(sim, s.x, s.z, { id: item, qty })
      sim.state.sites.splice(sim.state.sites.indexOf(s), 1)
      return 'Rozebrano plac budowy (materiały leżą na ziemi).'
    }
    case 'chop':
      equip('chop')
      startActivity(sim, { kind: 'chop', ref: (t as { id: string }).id, label: 'Ścinanie drzewa', total: Math.max(6, 18 - p.skills.woodcutting / 8) })
      return ''
    case 'douse': {
      const b = sim.building((t as { id: string }).id)
      if (b) b.lit = false
      return 'Zgaszono.'
    }
    case 'drink':
    case 'drink_well':
    case 'fill':
    case 'fill_well': {
      const b = t.type === 'building' ? sim.building(t.id) : undefined
      const x = t.type === 'water' ? t.x : b!.x
      const z = t.type === 'water' ? t.z : b!.z
      startActivity(sim, { kind: optionId.startsWith('drink') ? 'drink' : 'fill', ref: b ? 'well' : undefined, label: optionId.startsWith('drink') ? 'Picie' : 'Napełnianie', total: 2, data: at(x, z) })
      return ''
    }
    case 'drink_skin': {
      const s = p.inv.items.find((i) => (i.water ?? 0) > 0)
      if (!s) return 'Bukłak pusty.'
      s.water! -= 1
      p.vitals.thirst = Math.min(100, p.vitals.thirst + 30)
      return 'Łyk z bukłaka.'
    }
    case 'fill_trough': {
      const b = sim.building((t as { id: string }).id)
      return b ? fillTrough(sim, p, b).msg : ''
    }
    case 'gather':
      startActivity(sim, { kind: 'gather', ref: (t as { id: string }).id, label: 'Zbieranie', total: 2.5 })
      return ''
    case 'heal_service': {
      const n = sim.human((t as { id: number }).id)
      if (!n || p.money < 15) return ''
      p.money -= 15
      n.money += 15
      heal(p.vitals, 45 + n.skills.medicine * 0.4)
      p.vitals.bleeding = 0
      p.vitals.convalescenceH = Math.max(0, p.vitals.convalescenceH - 8)
      if (p.vitals.illness) p.vitals.illness = undefined
      return `${n.name} opatruje rany i podaje zioła.`
    }
    case 'help_npc': {
      const n = sim.human((t as { id: number }).id)
      const s = p.inv.items.find((i) => i.id === 'bandage' || i.id === 'salve')
      if (!n || !s) return ''
      consume(sim, p, s, n)
      heal(n.vitals, 20)
      n.vitals.ko = undefined
      n.opinion = Math.min(100, n.opinion + 30)
      addRep(sim, n.settlementId, { helpfulness: 5 }, `Pomogłeś rannemu: ${n.name}`)
      return ''
    }
    case 'inspect_nest':
      return 'W ścianie magazynu gniazdo szczurów. Wybij szczury i napraw budynek (młotek + gałęzie).'
    case 'light': {
      const b = sim.building((t as { id: string }).id)
      if (b) b.lit = true
      return 'Rozpalono.'
    }
    case 'market': {
      const b = sim.building((t as { id: string }).id)
      const trader = b ? sim.npcsOf(b.settlementId).find((n) => n.profession === 'trader') : undefined
      return trader ? `Handlarz: ${trader.name} — podejdź i porozmawiaj (Handluj).` : 'Stragan pusty.'
    }
    case 'mine':
      equip('mine')
      startActivity(sim, { kind: 'mine', ref: (t as { id: string }).id, label: 'Wydobywanie', total: ROCK.strikeS })
      return ''
    case 'pet': {
      addStat(sim, 'petted')
      return 'Zwierzę łasi się do ciebie.'
    }
    case 'pickup': {
      const g = sim.state.ground.find((gg) => gg.id === (t as { id: number }).id)
      if (!g) return ''
      const n = fitQty(p, g.stack)
      if (n <= 0) return 'Nie uniesiesz więcej.'
      addItem(p.inv, { ...g.stack, qty: n })
      g.stack.qty -= n
      if (g.stack.qty <= 0) sim.removeGround(g)
      return `Podniesiono: ${itemDef(g.stack.id).name}${g.stack.qty > 0 ? ` ×${n} (reszta za ciężka)` : ''}`
    }
    case 'repair':
      equip('hammer')
      startActivity(sim, { kind: 'repair', ref: (t as { id: string }).id, label: 'Naprawa', total: 10 })
      return ''
    case 'rest':
      startActivity(sim, { kind: 'rest', label: 'Odpoczynek przy ogniu', total: 150, accel: 20 })
      return 'Odpoczywasz (czas przyspieszony, Esc przerywa).'
    default:
      return ''
  }
}

export function startSleep(sim: Sim, comfort: number): string {
  const hr = hourOf(sim.state.time.cal)
  const hours = isNight(sim.state.time.cal) || hr > 20 ? Math.min(9, ((6 - hr + 24) % 24) || 8) : Math.max(2, (100 - sim.player.vitals.vigor) / 12)
  startActivity(sim, { kind: 'sleep', label: `Sen (komfort ${Math.round(comfort * 100)}%)`, total: hours * 150, accel: 40, data: String(comfort) })
  return 'Zasypiasz… (czas przyspieszony, Esc przerywa)'
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
      addRep(sim, n.settlementId, { honesty: -8 }, `${n.name} przyłapał(a) cię na kradzieży!`)
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
  return { allowed: true, msg: 'Bierzesz ze wspólnego magazynu — mieszkańcy to zauważą.' }
}

export function transferToStorage(sim: Sim, b: Building, stackIdx: number, toStorage: boolean): string {
  const p = sim.player
  if (!b.inv) return ''
  if (toStorage) {
    const s = p.inv.items[stackIdx]
    if (!s) return ''
    const moved = removeStack(p.inv, s)!
    addItem(b.inv, moved)
    if (b.kind === 'warehouse' && itemDef(moved.id).price * moved.qty >= 10) addRep(sim, b.settlementId, { helpfulness: 1 })
    return `Odłożono: ${itemDef(moved.id).name}`
  }
  const s = b.inv.items[stackIdx]
  if (!s) return ''
  const n = fitQty(p, s)
  if (n <= 0) return 'Nie uniesiesz więcej.'
  if (b.owner.startsWith('household') && checkTheft(sim, b)) return 'Przyłapano cię!'
  if (b.kind === 'warehouse') {
    const rep = sim.state.settlements[b.settlementId]!.rep
    if (rep.helpfulness < 10) addRep(sim, b.settlementId, { honesty: -1, helpfulness: -1 })
  }
  const partial = n < s.qty
  const moved = removeStack(b.inv, s, n)!
  addItem(p.inv, moved)
  return `Wzięto: ${itemDef(moved.id).name}${partial ? ` ×${n} (reszta za ciężka)` : ''}`
}

export { acceptQuest, COMBAT }
