import type { ResNode } from '../world/nodes'
import type { Sim } from './sim'
import type { Building, Corpse, DenState, GroundItem, Human, ItemStack } from './types'
import { ROCK, SPOILED_FRAC } from '../config/calibration'
import { itemDef } from '../data/items'
import { skillGain } from '../data/skills'
import { SPECIES, VARIANT_MULT } from '../data/species'
import { isTree } from '../world/nodes'
import { Biome } from '../world/types'
import { logConsume, logMint, logProduce } from './eventLog'
import { torchBurnH } from './fire'
import { addItem, consumeItem, countItem, findTool, fitQty, newStack, removeStack, wearTool } from './inventory'
/**
 * Shared world-changing actions used by the player and NPCs (same rules for everyone).
 * Each returns an ActionResult; callers decide UI feedback.
 * @domain sim
 * @subdomain actions
 */
import { knownToxic, learnToxic } from './knowledge'
import { questEvent } from './questHooks'
import { seasonOf } from './time'
import { bellyLoot, digTreasure, registerGiveStack } from './treasure'
import { drink, eat, heal, makeIll } from './vitals'

export interface ActionResult {
  ok: boolean
  msg: string
}

const ok = (msg: string): ActionResult => ({ ok: true, msg })
const fail = (msg: string): ActionResult => ({ ok: false, msg })

export function train(h: Human, skill: keyof Human['skills'], difficulty = 0.5, amount = 1) {
  h.skills[skill] = Math.min(100, h.skills[skill] + skillGain(h.skills[skill], difficulty, amount))
}

/** Gives items to actor; drops overflow on the ground next to them. */
registerGiveStack((sim, h, s, source) => giveOrDrop(sim, h, s, source))

export function giveOrDrop(sim: Sim, h: Human, stack: ItemStack, source?: string) {
  if (source) logProduce(stack.id, stack.qty, source, h)
  const fit = fitQty(h, stack)
  if (fit > 0) addItem(h.inv, { ...stack, qty: fit })
  if (fit < stack.qty) dropItem(sim, h.x + Math.cos(h.rot) * 0.8, h.z + Math.sin(h.rot) * 0.8, { ...stack, qty: stack.qty - fit }, false, h === sim.player ? (sim.state.px.cave ?? 0) : 0)
  return fit
}

/**
 * Fills a trough: straight from a well within 12 m (well = water source), else by pouring a
 * carried bucket (the bucket is emptied). Shared by player and NPCs.
 */
export function fillTrough(sim: Sim, h: Human, trough: Building): ActionResult {
  const bucket = h.inv.items.find((s) => s.id === 'bucket')
  if (!bucket) return fail('You need a bucket.')
  const well = sim.buildingsNear(trough.x, trough.z, 12).find((w) => w.kind === 'well')
  if (well) {
    trough.water = TROUGH_CAPACITY
    if (h === sim.player) questEvent(sim, { k: 'fill', buildingId: trough.id, amount: TROUGH_CAPACITY })
    return ok('You filled the trough straight from the well.')
  }
  if ((bucket.water ?? 0) <= 0) return fail('The bucket is empty — fetch some water.')
  const poured = bucket.water ?? 0
  trough.water = Math.min(TROUGH_CAPACITY, (trough.water ?? 0) + poured)
  bucket.water = 0
  if (h === sim.player) questEvent(sim, { k: 'fill', buildingId: trough.id, amount: poured })
  return ok('You poured water into the trough.')
}

export const TROUGH_CAPACITY = 12

/** Drops a stack; `cave` (index + 1) puts it on that cave's floor instead of the surface. */
export function dropItem(sim: Sim, x: number, z: number, stack: ItemStack, lit = false, cave = 0) {
  sim.addGround({ id: sim.nextId(), x, z, stack, droppedAt: sim.state.time.cal, lit, burnH: stack.id === 'torch' ? torchBurnH(stack) : undefined, ...(cave > 0 ? { cave } : {}) })
}

export function nodeAvailable(sim: Sim, n: ResNode): boolean {
  const st = sim.state.nodes[n.id]
  if (!st) return true
  if (st.kind === 'felled' || st.kind === 'depleted') return false
  return st.kind === 'harvested' && (st.left ?? 0) > 0
}

export function fellTree(sim: Sim, h: Human, n: ResNode, efficiency = 1): ActionResult {
  if (!isTree(n.kind) || sim.state.nodes[n.id]?.kind === 'felled') return fail('This tree is already felled.')
  const tool = findTool(h, 'chop')
  if (!tool) return fail('You need an axe.')
  sim.state.nodes[n.id] = { kind: 'felled', at: sim.state.time.cal }
  const logs = n.kind === 'tree_dead' ? 1 : Math.max(1, Math.round(n.scale / 9))
  giveOrDrop(sim, h, newStack('log', Math.max(1, Math.round(logs * efficiency))), 'fell_tree')
  giveOrDrop(sim, h, newStack('branch', Math.round((3 + n.scale / 5) * efficiency)), 'fell_tree')
  if (n.kind === 'tree_apple') giveOrDrop(sim, h, newStack('apple', 3), 'fell_tree')
  wearTool(tool, 2)
  train(h, 'woodcutting', 0.5, 3)
  sim.markNodeChunk(n.id)
  sim.emit({ type: 'sound', kind: 'treefall', x: n.x, z: n.z })
  if (h === sim.player) questEvent(sim, { k: 'fell', nodeId: n.id, x: n.x, z: n.z })
  return ok(`You felled the tree: +${logs} ${logs === 1 ? 'log' : 'logs'} and some branches.`)
}

/** Strikes a rock can take before it is gone (RES-02/RES-07). */
export const rockPieces = (n: ResNode) => Math.round(4 + n.scale * 2)
export const isBoulder = (n: ResNode) => n.kind === 'rock' && n.scale >= ROCK.boulderScale

/**
 * One pickaxe strike. Smaller rocks give stones directly; boulders (RES-07) split off a heavy chunk that
 * lands next to the rock and is broken into stones separately (`breakChunk`).
 */
export function mineRock(sim: Sim, h: Human, n: ResNode): ActionResult {
  if (n.kind !== 'rock') return fail('That is not a rock.')
  const tool = findTool(h, 'mine')
  if (!tool) return fail('You need a pickaxe.')
  const st = (sim.state.nodes[n.id] ??= { kind: 'harvested', at: sim.state.time.cal, left: rockPieces(n) })
  if ((st.left ?? 0) <= 0) return fail('This rock is exhausted.')
  st.left = (st.left ?? 1) - 1
  if (st.left <= 0) st.kind = 'depleted'
  let what = '2 stones'
  if (isBoulder(n)) {
    const a = Math.atan2(h.x - n.x, h.z - n.z)
    const r = n.radius + 0.4
    dropItem(sim, n.x + Math.sin(a) * r, n.z + Math.cos(a) * r, newStack('rock_chunk', 1))
    logProduce('rock_chunk', 1, 'mine_rock', h)
    what = 'a rock chunk'
  } else giveOrDrop(sim, h, newStack('stone', 2), 'mine_rock')
  let extra = ''
  for (const d of sim.world.deposits) {
    if (Math.hypot(d.x - n.x, d.z - n.z) < d.radius + 40 && sim.rng.chance(0.35 * d.richness)) {
      const ore = d.ore === 'coal' ? 'coal' : `${d.ore}_ore`
      giveOrDrop(sim, h, newStack(ore, 1), 'mine_rock')
      extra = ` and found ${itemDef(ore).name.toLowerCase()}!`
      break
    }
  }
  wearTool(tool, 2)
  sim.markNodeChunk(n.id)
  return ok(`You mined ${what}${extra || '.'}`)
}

/** Breaks one rock chunk lying on the ground into stones (pickaxe, RES-07). */
export function breakChunk(sim: Sim, h: Human, g: GroundItem): ActionResult {
  if (g.stack.id !== 'rock_chunk') return fail('That is not a rock chunk.')
  const tool = findTool(h, 'mine')
  if (!tool) return fail('You need a pickaxe.')
  g.stack.qty -= 1
  logConsume('rock_chunk', 1, 'break_chunk', h)
  if (g.stack.qty <= 0) sim.removeGround(g)
  giveOrDrop(sim, h, newStack('stone', ROCK.chunkStones), 'break_chunk')
  wearTool(tool, 1)
  return ok(`You broke the chunk: +${ROCK.chunkStones} ${ROCK.chunkStones === 1 ? 'stone' : 'stones'}.`)
}

const REGROW_DAYS: Partial<Record<ResNode['kind'], number>> = { bush_berry: 4, herb: 5, mushroom: 3, tree_apple: 8 }

export function gatherNode(sim: Sim, h: Human, n: ResNode): ActionResult {
  const st = sim.state.nodes[n.id]
  if (st && (st.kind !== 'harvested' || (st.left ?? 0) <= 0)) return fail('There is nothing left here.')
  const season = seasonOf(sim.state.time.cal)
  let item: string
  let qty = 1
  switch (n.kind) {
    case 'bush':
      item = 'branch'
      qty = 2
      break
    case 'bush_berry':
      if (season === 'winter' || season === 'spring') return fail('The bush has no fruit right now.')
      item = 'berries'
      qty = 3 + Math.floor(h.skills.survival / 25)
      break
    case 'herb':
      if (season === 'winter') return fail('The herbs are covered with snow.')
      item = n.herb ?? 'mint'
      qty = 1 + (h.skills.medicine > 30 ? 1 : 0)
      break
    case 'mushroom':
      if (season === 'winter') return fail('There are no mushrooms in winter.')
      item = 'mushroom'
      qty = 2
      break
    case 'stone':
      sim.state.nodes[n.id] = { kind: 'depleted', at: sim.state.time.cal }
      giveOrDrop(sim, h, newStack('stone', 1), 'gather')
      sim.markNodeChunk(n.id)
      return ok('You picked up a stone.')
    case 'tree_apple':
      if (season !== 'summer' && season !== 'autumn') return fail('No apples at this time of year.')
      item = 'apple'
      qty = 4
      break
    default:
      return fail('You cannot gather this.')
  }
  sim.state.nodes[n.id] = { kind: 'harvested', at: sim.state.time.cal, left: 0 }
  giveOrDrop(sim, h, newStack(item, qty), 'gather')
  train(h, n.kind === 'herb' ? 'medicine' : 'survival', 0.3)
  sim.markNodeChunk(n.id)
  return ok(`Gathered: ${itemDef(item).name} ×${qty}`)
}

/** Regrowth check: harvested nodes become available again after REGROW_DAYS. */
export function regrowNodes(sim: Sim) {
  const cal = sim.state.time.cal
  for (const [id, st] of Object.entries(sim.state.nodes)) {
    if (st.kind === 'harvested' && (st.left ?? 0) <= 0) {
      const n = sim.nodes.byId(id)
      const days = n ? REGROW_DAYS[n.kind] : undefined
      if (days && cal - st.at > days * 86400) {
        delete sim.state.nodes[id]
        sim.markNodeChunk(id)
      }
    } else if (st.kind === 'felled' && cal - st.at > 20 * 86400) {
      // Seedling regrows at the stump (tree growth/seeding simplified).
      delete sim.state.nodes[id]
      sim.markNodeChunk(id)
    }
  }
}

export function butcher(sim: Sim, h: Human, c: Corpse): ActionResult {
  if (c.butchered) return fail('Already butchered.')
  const tool = findTool(h, 'cut')
  if (!tool) return fail('You need a knife.')
  const sp = SPECIES[c.species]
  const vm = VARIANT_MULT[c.variant].size
  const rotten = sim.state.time.cal - c.diedAt > 6 * 3600
  const meat = Math.min(c.meat, Math.round(sp.corpse.meat * vm))
  const skill = h.skills.survival / 100
  if (meat > 0 && !rotten) giveOrDrop(sim, h, newStack('raw_meat', Math.max(1, Math.round(meat * (0.7 + skill * 0.3))), { sp: c.species }), 'butcher')
  if (sp.corpse.hide && c.variant === 'albino' && c.species === 'hare') giveOrDrop(sim, h, newStack('white_pelt', 1), 'butcher')
  else if (sp.corpse.hide) giveOrDrop(sim, h, newStack('hide', sp.corpse.hide, { q: c.variant === 'albino' ? 3 : undefined }), 'butcher')
  if (sp.corpse.bone) giveOrDrop(sim, h, newStack('bone', sp.corpse.bone), 'butcher')
  if (sp.corpse.antler) giveOrDrop(sim, h, newStack('antler', sp.corpse.antler), 'butcher')
  c.butchered = true
  c.meat = 0
  wearTool(tool, 1)
  train(h, 'survival', 0.5, 2)
  const belly = bellyLoot(sim, h, c)
  return ok(`${rotten ? 'The meat has rotted — only hide and bones are left.' : `You butchered the ${sp.name.toLowerCase()}.`}${belly ? ` ${belly}` : ''}`)
}

export interface DigLoot {
  item: string
  qty: number
}

/** Digging with a shovel: lowers terrain; chance for shells/coins/ore depending on place. */
export function dig(sim: Sim, h: Human, x: number, z: number): ActionResult {
  const tool = findTool(h, 'dig')
  if (!tool) return fail('You need a shovel.')
  const underground = h === sim.player && (sim.state.px.cave ?? 0) > 0
  const b = sim.terrain.biomeAt(x, z)
  if (!underground && (b === Biome.Mountain || b === Biome.Snow)) return fail('Solid rock — you need a pickaxe.')
  if (sim.terrain.waterDepthAt(x, z) > 0.3) return fail('There is water here.')
  // Digging in a cave must not lower the surface above it (only loot under the floor counts).
  if (!underground) {
    sim.terrain.applyEdit(x, z, 1.4, { kind: 'add', amount: -0.35 })
    sim.markTerrain(x, z, 2)
  }
  wearTool(tool, 1)
  train(h, 'construction', 0.2)
  if (h === sim.player) questEvent(sim, { k: 'dig', x, z })
  const buried = digTreasure(sim, h, x, z)
  if (buried) return ok(buried)
  // Loot rolls.
  const r = sim.rng.next()
  const nearSea = sim.terrain.isSeaAt(x + 12, z) || sim.terrain.isSeaAt(x - 12, z) || sim.terrain.isSeaAt(x, z + 12) || sim.terrain.isSeaAt(x, z - 12) || b === Biome.Beach
  const inSettlement = sim.world.settlements.some((s) => Math.hypot(s.x - x, s.z - z) < s.radius + 20)
  if (nearSea && r < 0.3) {
    const pearl = sim.rng.chance(0.08)
    giveOrDrop(sim, h, newStack(pearl ? 'pearl_shell' : 'shell', 1), 'dig')
    return ok(pearl ? 'You dug up a pearl shell!' : 'You dug up a shell.')
  }
  if (inSettlement && r < 0.12) {
    const coins = sim.rng.int(1, 12)
    h.money += coins
    logMint(coins, 'dig_coins', h.kind === 'npc' ? h : undefined)
    return ok(`You found ${coins} ${coins === 1 ? 'copper coin' : 'copper coins'}!`)
  }
  for (const d of sim.world.deposits) {
    if (Math.hypot(d.x - x, d.z - z) < d.radius && r < 0.25 * d.richness) {
      const ore = d.ore === 'coal' ? 'coal' : `${d.ore}_ore`
      giveOrDrop(sim, h, newStack(ore, 1), 'dig')
      return ok(`You struck a deposit: ${itemDef(ore).name}!`)
    }
  }
  return ok('You dug a hole.')
}

export function levelTerrain(sim: Sim, h: Human, x: number, z: number, target: number): ActionResult {
  const tool = findTool(h, 'dig')
  if (!tool) return fail('You need a shovel.')
  sim.terrain.applyEdit(x, z, 3, { kind: 'level', target })
  sim.markTerrain(x, z, 4)
  wearTool(tool, 1)
  train(h, 'construction', 0.3)
  return ok('You levelled the ground.')
}

export function raiseTerrain(sim: Sim, h: Human, x: number, z: number): ActionResult {
  const tool = findTool(h, 'dig')
  if (!tool) return fail('You need a shovel.')
  if (countItem(h.inv, 'stone') < 1) return fail('You need a stone to raise the ground.')
  consumeItem(h.inv, 'stone', 1, 'terraform', h)
  sim.terrain.applyEdit(x, z, 1.6, { kind: 'add', amount: 0.35 })
  sim.markTerrain(x, z, 2)
  return ok('You raised the ground.')
}

export function buryCorpse(sim: Sim, h: Human, c: Corpse): ActionResult {
  const tool = findTool(h, 'dig')
  if (!tool) return fail('You need a shovel.')
  sim.removeCorpse(c)
  wearTool(tool, 1)
  sim.state.px.stats.buried = (sim.state.px.stats.buried ?? 0) + (h.kind === 'player' ? 1 : 0)
  return ok('You buried the body.')
}

/** Water safety 0 (safe) .. 1 (very risky). Wells are safe (vision §17, §24.1). */
export function waterRisk(sim: Sim, x: number, z: number): number {
  let r = 0.04
  for (const s of sim.world.settlements) {
    const d = Math.hypot(s.x - x, s.z - z)
    if (d < s.radius + 200) r += 0.25 * (1 - d / (s.radius + 200))
  }
  const animals = sim.actors.query(x, z, 40).filter((a) => a.kind === 'animal').length
  r += Math.min(0.2, animals * 0.03)
  const b = sim.terrain.biomeAt(x, z)
  if (b === Biome.Swamp) r += 0.3
  if (sim.terrain.heightAt(x, z) > 60) r -= 0.03
  const ci = Math.round(x / sim.world.cell)
  const cj = Math.round(z / sim.world.cell)
  if (sim.world.waterKind[cj * sim.world.n + ci] === 2) r += 0.08
  return Math.max(0, Math.min(1, r))
}

export function drinkFromWater(sim: Sim, h: Human, x: number, z: number, safe = false): ActionResult {
  if (!safe && sim.terrain.isSeaAt(x, z)) return fail('Salt water — not drinkable.')
  drink(h.vitals, 45)
  if (!safe) {
    const risk = waterRisk(sim, x, z)
    if (sim.rng.chance(risk * 0.5)) {
      makeIll(h.vitals, 'stomach', 20 + risk * 40)
      return ok('You drank… the water tasted strange.')
    }
  }
  return ok('You drank some water.')
}

export function fillContainers(h: Human, x: number, z: number, sim: Sim, safe: boolean): ActionResult {
  if (!safe && sim.terrain.isSeaAt(x, z)) return fail('Salt water.')
  let n = 0
  for (const s of h.inv.items) {
    const cap = itemDef(s.id).waterCapacity
    if (cap && (s.water ?? 0) < cap) {
      s.water = cap
      n++
    }
  }
  return n ? ok('You filled your water containers.') : fail('No empty containers.')
}

export function drinkFromContainer(h: Human): ActionResult {
  const s = h.inv.items.find((i) => (i.water ?? 0) > 0)
  if (!s) return fail('Your waterskin is empty.')
  s.water! -= 1
  drink(h.vitals, 30)
  return ok('You take a sip from the waterskin.')
}

/** Eat or apply an item (food/herb/medical). Target defaults to self. */
export function consume(sim: Sim, h: Human, stack: ItemStack, target: Human = h): ActionResult {
  const d = itemDef(stack.id)
  if (d.category === 'medical') {
    const mult = 1 + h.skills.medicine / 100
    removeStack(h.inv, stack, 1)
    logConsume(stack.id, 1, 'used', h)
    heal(target.vitals, (d.heal ?? 10) * mult)
    target.vitals.bleeding = 0
    if (stack.id === 'herbal_tea' && target.vitals.illness && target.vitals.illness.kind !== 'rabies') target.vitals.illness.severity *= 0.4
    train(h, 'medicine', 0.4, 2)
    return ok(`Used: ${d.name}.`)
  }
  if (d.herb) {
    if (h === sim.player && knownToxic(sim, stack.id)) return fail(`${d.name} is poisonous — you know better than to eat it.`)
    removeStack(h.inv, stack, 1)
    logConsume(stack.id, 1, 'eaten', h)
    if (d.herb.poison) {
      makeIll(target.vitals, 'poison', d.herb.poison)
      const learned = h === sim.player && learnToxic(sim, stack.id)
      return ok(`${d.name} — poisonous!${learned ? ' You will remember this plant.' : ''}`)
    }
    heal(target.vitals, d.herb.heal * (0.5 + h.skills.medicine / 100))
    if (d.herb.cures && target.vitals.illness) target.vitals.illness.hoursLeft *= 0.6
    train(h, 'medicine', 0.2)
    return ok(`You ate a herb: ${d.name}.`)
  }
  if (d.food) {
    removeStack(h.inv, stack, 1)
    logConsume(stack.id, 1, 'eaten', h)
    eat(target.vitals, d.food.nutrition, d.food.water ?? 0)
    const spoiled = (stack.fresh ?? 999) < d.food.spoilH * SPOILED_FRAC
    const chance = (d.food.illnessChance ?? 0) + (spoiled ? 0.35 : 0)
    if (chance > 0 && sim.rng.chance(chance)) {
      makeIll(target.vitals, 'stomach', 25)
      return ok(`${d.name} — your stomach hurts…`)
    }
    return ok(`You ate: ${d.name}.`)
  }
  return fail('You cannot eat this.')
}

/** Repair: hammer + 2 branches (from actor or household store). Removes rat nests at >60%. */
export function repairBuilding(sim: Sim, h: Human, b: Building, store?: Building): ActionResult {
  if (b.durability >= 98) return fail('It does not need repair.')
  const tool = findTool(h, 'hammer') ?? findTool(h, 'chop')
  if (!tool) return fail('You need a hammer or an axe.')
  const src = countItem(h.inv, 'branch') >= 2 ? h.inv : store?.inv && countItem(store.inv, 'branch') >= 2 ? store.inv : null
  if (!src) return fail('You need 2 branches.')
  consumeItem(src, 'branch', 2, 'repair', h)
  b.durability = Math.min(100, b.durability + 30 + h.skills.construction * 0.2)
  wearTool(tool, 1)
  train(h, 'construction', 0.4, 2)
  questEvent(sim, { k: 'repair', buildingId: b.id, byPlayer: h === sim.player })
  if (b.ratNest && b.durability > 60) {
    b.ratNest = undefined
    return ok('You repaired the building — the rat nest is gone.')
  }
  return ok(`Repaired (${Math.round(b.durability)}%).`)
}

export function burnDen(sim: Sim, h: Human, den: DenState): ActionResult {
  if (!den.alive) return fail('The den is already destroyed.')
  if (!findTool(h, 'fire_start')) return fail('You need flint and steel or a torch.')
  if (countItem(h.inv, 'branch') < 5) return fail('You need 5 branches.')
  consumeItem(h.inv, 'branch', 5, 'burn_den', h)
  den.alive = false
  sim.emit({ type: 'sound', kind: 'fire', x: den.x, z: den.z })
  if (h === sim.player) questEvent(sim, { k: 'burn', denId: den.id })
  return ok('The den burned down.')
}
