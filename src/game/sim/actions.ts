/**
 * Shared world-changing actions used by the player and NPCs (same rules for everyone).
 * Each returns an ActionResult; callers decide UI feedback.
 * @domain sim
 * @subdomain actions
 */
import type { ResNode } from '../world/nodes'
import type { Sim } from './sim'
import type { Building, Corpse, DenState, GroundItem, Human, ItemStack } from './types'
import { ROCK } from '../config/calibration'
import { itemDef } from '../data/items'
import { skillGain } from '../data/skills'
import { SPECIES, VARIANT_MULT } from '../data/species'
import { isTree } from '../world/nodes'
import { Biome } from '../world/types'
import { addItem, countItem, findTool, fitQty, newStack, removeItem, removeStack, wearTool } from './inventory'
import { seasonOf } from './time'
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
export function giveOrDrop(sim: Sim, h: Human, stack: ItemStack) {
  const fit = fitQty(h, stack)
  if (fit > 0) addItem(h.inv, { ...stack, qty: fit })
  if (fit < stack.qty) dropItem(sim, h.x + Math.cos(h.rot) * 0.8, h.z + Math.sin(h.rot) * 0.8, { ...stack, qty: stack.qty - fit })
  return fit
}

/**
 * Fills a trough: straight from a well within 12 m (well = water source), else by pouring a
 * carried bucket (the bucket is emptied). Shared by player and NPCs.
 */
export function fillTrough(sim: Sim, h: Human, trough: Building): ActionResult {
  const bucket = h.inv.items.find((s) => s.id === 'bucket')
  if (!bucket) return fail('Potrzebne wiadro.')
  const well = sim.buildingsNear(trough.x, trough.z, 12).find((w) => w.kind === 'well')
  if (well) {
    trough.water = TROUGH_CAPACITY
    return ok('Napełniono koryto prosto ze studni.')
  }
  if ((bucket.water ?? 0) <= 0) return fail('Wiadro jest puste — nabierz wody.')
  trough.water = Math.min(TROUGH_CAPACITY, (trough.water ?? 0) + (bucket.water ?? 0))
  bucket.water = 0
  return ok('Wlano wodę do koryta.')
}

export const TROUGH_CAPACITY = 12

export function dropItem(sim: Sim, x: number, z: number, stack: ItemStack, lit = false) {
  sim.addGround({ id: sim.nextId(), x, z, stack, droppedAt: sim.state.time.cal, lit })
}

export function nodeAvailable(sim: Sim, n: ResNode): boolean {
  const st = sim.state.nodes[n.id]
  if (!st) return true
  if (st.kind === 'felled' || st.kind === 'depleted') return false
  return st.kind === 'harvested' && (st.left ?? 0) > 0
}

export function fellTree(sim: Sim, h: Human, n: ResNode, efficiency = 1): ActionResult {
  if (!isTree(n.kind) || sim.state.nodes[n.id]?.kind === 'felled') return fail('Drzewo już ścięte.')
  const tool = findTool(h, 'chop')
  if (!tool) return fail('Potrzebujesz siekiery.')
  sim.state.nodes[n.id] = { kind: 'felled', at: sim.state.time.cal }
  const logs = n.kind === 'tree_dead' ? 1 : Math.max(1, Math.round(n.scale / 9))
  giveOrDrop(sim, h, newStack('log', Math.max(1, Math.round(logs * efficiency))))
  giveOrDrop(sim, h, newStack('branch', Math.round((3 + n.scale / 5) * efficiency)))
  if (n.kind === 'tree_apple') giveOrDrop(sim, h, newStack('apple', 3))
  wearTool(tool, 2)
  train(h, 'woodcutting', 0.5, 3)
  sim.markNodeChunk(n.id)
  sim.emit({ type: 'sound', kind: 'treefall', x: n.x, z: n.z })
  return ok(`Ścięto drzewo: +${logs} belki, gałęzie.`)
}

/** Strikes a rock can take before it is gone (RES-02/RES-07). */
export const rockPieces = (n: ResNode) => Math.round(4 + n.scale * 2)
export const isBoulder = (n: ResNode) => n.kind === 'rock' && n.scale >= ROCK.boulderScale

/**
 * One pickaxe strike. Smaller rocks give stones directly; boulders (RES-07) split off a heavy chunk that
 * lands next to the rock and is broken into stones separately (`breakChunk`).
 */
export function mineRock(sim: Sim, h: Human, n: ResNode): ActionResult {
  if (n.kind !== 'rock') return fail('To nie skała.')
  const tool = findTool(h, 'mine')
  if (!tool) return fail('Potrzebujesz kilofa.')
  const st = (sim.state.nodes[n.id] ??= { kind: 'harvested', at: sim.state.time.cal, left: rockPieces(n) })
  if ((st.left ?? 0) <= 0) return fail('Skała wyczerpana.')
  st.left = (st.left ?? 1) - 1
  if (st.left <= 0) st.kind = 'depleted'
  let what = 'kamień'
  if (isBoulder(n)) {
    const a = Math.atan2(h.x - n.x, h.z - n.z)
    const r = n.radius + 0.4
    dropItem(sim, n.x + Math.sin(a) * r, n.z + Math.cos(a) * r, newStack('rock_chunk', 1))
    what = 'odłamek skały'
  } else giveOrDrop(sim, h, newStack('stone', 2))
  let extra = ''
  for (const d of sim.world.deposits) {
    if (Math.hypot(d.x - n.x, d.z - n.z) < d.radius + 40 && sim.rng.chance(0.35 * d.richness)) {
      const ore = d.ore === 'coal' ? 'coal' : `${d.ore}_ore`
      giveOrDrop(sim, h, newStack(ore, 1))
      extra = `, ${itemDef(ore).name}!`
      break
    }
  }
  wearTool(tool, 2)
  sim.markNodeChunk(n.id)
  return ok(`Wydobyto ${what}${extra}`)
}

/** Breaks one rock chunk lying on the ground into stones (pickaxe, RES-07). */
export function breakChunk(sim: Sim, h: Human, g: GroundItem): ActionResult {
  if (g.stack.id !== 'rock_chunk') return fail('To nie odłamek skały.')
  const tool = findTool(h, 'mine')
  if (!tool) return fail('Potrzebujesz kilofa.')
  g.stack.qty -= 1
  if (g.stack.qty <= 0) sim.removeGround(g)
  giveOrDrop(sim, h, newStack('stone', ROCK.chunkStones))
  wearTool(tool, 1)
  return ok(`Rozbito odłamek: +${ROCK.chunkStones} kamienie.`)
}

const REGROW_DAYS: Partial<Record<ResNode['kind'], number>> = { bush_berry: 4, herb: 5, mushroom: 3, tree_apple: 8 }

export function gatherNode(sim: Sim, h: Human, n: ResNode): ActionResult {
  const st = sim.state.nodes[n.id]
  if (st && (st.kind !== 'harvested' || (st.left ?? 0) <= 0)) return fail('Nic tu już nie ma.')
  const season = seasonOf(sim.state.time.cal)
  let item: string
  let qty = 1
  switch (n.kind) {
    case 'bush':
      item = 'branch'
      qty = 2
      break
    case 'bush_berry':
      if (season === 'winter' || season === 'spring') return fail('Krzew nie ma teraz owoców.')
      item = 'berries'
      qty = 3 + Math.floor(h.skills.survival / 25)
      break
    case 'herb':
      if (season === 'winter') return fail('Zioła są przykryte śniegiem.')
      item = n.herb ?? 'mint'
      qty = 1 + (h.skills.medicine > 30 ? 1 : 0)
      break
    case 'mushroom':
      if (season === 'winter') return fail('Zimą nie ma grzybów.')
      item = 'mushroom'
      qty = 2
      break
    case 'stone':
      sim.state.nodes[n.id] = { kind: 'depleted', at: sim.state.time.cal }
      giveOrDrop(sim, h, newStack('stone', 1))
      sim.markNodeChunk(n.id)
      return ok('Podniesiono kamień.')
    case 'tree_apple':
      if (season !== 'summer' && season !== 'autumn') return fail('Brak jabłek o tej porze roku.')
      item = 'apple'
      qty = 4
      break
    default:
      return fail('Nie da się tego zebrać.')
  }
  sim.state.nodes[n.id] = { kind: 'harvested', at: sim.state.time.cal, left: 0 }
  giveOrDrop(sim, h, newStack(item, qty))
  train(h, n.kind === 'herb' ? 'medicine' : 'survival', 0.3)
  sim.markNodeChunk(n.id)
  return ok(`Zebrano: ${itemDef(item).name} ×${qty}`)
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
  if (c.butchered) return fail('Już oprawione.')
  const tool = findTool(h, 'cut')
  if (!tool) return fail('Potrzebujesz noża.')
  const sp = SPECIES[c.species]
  const vm = VARIANT_MULT[c.variant].size
  const rotten = sim.state.time.cal - c.diedAt > 6 * 3600
  const meat = Math.min(c.meat, Math.round(sp.corpse.meat * vm))
  const skill = h.skills.survival / 100
  if (meat > 0 && !rotten) giveOrDrop(sim, h, newStack('raw_meat', Math.max(1, Math.round(meat * (0.7 + skill * 0.3))), { sp: c.species }))
  if (sp.corpse.hide) giveOrDrop(sim, h, newStack('hide', sp.corpse.hide, { q: c.variant === 'albino' ? 3 : undefined }))
  if (sp.corpse.bone) giveOrDrop(sim, h, newStack('bone', sp.corpse.bone))
  if (sp.corpse.antler) giveOrDrop(sim, h, newStack('antler', sp.corpse.antler))
  c.butchered = true
  c.meat = 0
  wearTool(tool, 1)
  train(h, 'survival', 0.5, 2)
  return ok(rotten ? 'Mięso zgniłe — zostały skóra i kości.' : `Oprawiono: ${sp.name}.`)
}

export interface DigLoot {
  item: string
  qty: number
}

/** Digging with a shovel: lowers terrain; chance for shells/coins/ore depending on place. */
export function dig(sim: Sim, h: Human, x: number, z: number): ActionResult {
  const tool = findTool(h, 'dig')
  if (!tool) return fail('Potrzebujesz łopaty.')
  const b = sim.terrain.biomeAt(x, z)
  if (b === Biome.Mountain || b === Biome.Snow) return fail('Skała — potrzebny kilof.')
  if (sim.terrain.waterDepthAt(x, z) > 0.3) return fail('Tu jest woda.')
  sim.terrain.applyEdit(x, z, 1.4, { kind: 'add', amount: -0.35 })
  sim.markTerrain(x, z, 2)
  wearTool(tool, 1)
  train(h, 'construction', 0.2)
  // Loot rolls.
  const r = sim.rng.next()
  const nearSea = sim.terrain.isSeaAt(x + 12, z) || sim.terrain.isSeaAt(x - 12, z) || sim.terrain.isSeaAt(x, z + 12) || sim.terrain.isSeaAt(x, z - 12) || b === Biome.Beach
  const inSettlement = sim.world.settlements.some((s) => Math.hypot(s.x - x, s.z - z) < s.radius + 20)
  if (nearSea && r < 0.3) {
    const pearl = sim.rng.chance(0.08)
    giveOrDrop(sim, h, newStack(pearl ? 'pearl_shell' : 'shell', 1))
    return ok(pearl ? 'Wykopano drogocenną muszlę!' : 'Wykopano muszlę.')
  }
  if (inSettlement && r < 0.12) {
    const coins = sim.rng.int(1, 12)
    h.money += coins
    return ok(`Znaleziono ${coins} miedziaków!`)
  }
  for (const d of sim.world.deposits) {
    if (Math.hypot(d.x - x, d.z - z) < d.radius && r < 0.25 * d.richness) {
      const ore = d.ore === 'coal' ? 'coal' : `${d.ore}_ore`
      giveOrDrop(sim, h, newStack(ore, 1))
      return ok(`Trafiono na złoże: ${itemDef(ore).name}!`)
    }
  }
  return ok('Wykopano dołek.')
}

export function levelTerrain(sim: Sim, h: Human, x: number, z: number, target: number): ActionResult {
  const tool = findTool(h, 'dig')
  if (!tool) return fail('Potrzebujesz łopaty.')
  sim.terrain.applyEdit(x, z, 3, { kind: 'level', target })
  sim.markTerrain(x, z, 4)
  wearTool(tool, 1)
  train(h, 'construction', 0.3)
  return ok('Wyrównano teren.')
}

export function raiseTerrain(sim: Sim, h: Human, x: number, z: number): ActionResult {
  const tool = findTool(h, 'dig')
  if (!tool) return fail('Potrzebujesz łopaty.')
  if (countItem(h.inv, 'stone') < 1) return fail('Potrzebujesz kamienia lub ziemi (kamień).')
  removeItem(h.inv, 'stone', 1)
  sim.terrain.applyEdit(x, z, 1.6, { kind: 'add', amount: 0.35 })
  sim.markTerrain(x, z, 2)
  return ok('Usypano wyżej.')
}

export function buryCorpse(sim: Sim, h: Human, c: Corpse): ActionResult {
  const tool = findTool(h, 'dig')
  if (!tool) return fail('Potrzebujesz łopaty.')
  sim.removeCorpse(c)
  wearTool(tool, 1)
  sim.state.px.stats.buried = (sim.state.px.stats.buried ?? 0) + (h.kind === 'player' ? 1 : 0)
  return ok('Zwłoki zakopane.')
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
  if (!safe && sim.terrain.isSeaAt(x, z)) return fail('Słona woda — niepitna.')
  drink(h.vitals, 45)
  if (!safe) {
    const risk = waterRisk(sim, x, z)
    if (sim.rng.chance(risk * 0.5)) {
      makeIll(h.vitals, 'stomach', 20 + risk * 40)
      return ok('Napiłeś się… woda miała dziwny posmak.')
    }
  }
  return ok('Napiłeś się wody.')
}

export function fillContainers(h: Human, x: number, z: number, sim: Sim, safe: boolean): ActionResult {
  if (!safe && sim.terrain.isSeaAt(x, z)) return fail('Słona woda.')
  let n = 0
  for (const s of h.inv.items) {
    const cap = itemDef(s.id).waterCapacity
    if (cap && (s.water ?? 0) < cap) {
      s.water = cap
      n++
    }
  }
  return n ? ok('Napełniono pojemniki na wodę.') : fail('Brak pustych pojemników.')
}

export function drinkFromContainer(h: Human): ActionResult {
  const s = h.inv.items.find((i) => (i.water ?? 0) > 0)
  if (!s) return fail('Brak wody w bukłaku.')
  s.water! -= 1
  drink(h.vitals, 30)
  return ok('Łyk z bukłaka.')
}

/** Eat or apply an item (food/herb/medical). Target defaults to self. */
export function consume(sim: Sim, h: Human, stack: ItemStack, target: Human = h): ActionResult {
  const d = itemDef(stack.id)
  if (d.category === 'medical') {
    const mult = 1 + h.skills.medicine / 100
    removeStack(h.inv, stack, 1)
    heal(target.vitals, (d.heal ?? 10) * mult)
    target.vitals.bleeding = 0
    if (stack.id === 'herbal_tea' && target.vitals.illness && target.vitals.illness.kind !== 'rabies') target.vitals.illness.severity *= 0.4
    train(h, 'medicine', 0.4, 2)
    return ok(`Użyto: ${d.name}.`)
  }
  if (d.herb) {
    removeStack(h.inv, stack, 1)
    if (d.herb.poison) {
      makeIll(target.vitals, 'poison', d.herb.poison)
      return ok(`${d.name} — trujące!`)
    }
    heal(target.vitals, d.herb.heal * (0.5 + h.skills.medicine / 100))
    if (d.herb.cures && target.vitals.illness) target.vitals.illness.hoursLeft *= 0.6
    train(h, 'medicine', 0.2)
    return ok(`Zjedzono zioło: ${d.name}.`)
  }
  if (d.food) {
    removeStack(h.inv, stack, 1)
    eat(target.vitals, d.food.nutrition, d.food.water ?? 0)
    const spoiled = (stack.fresh ?? 999) < d.food.spoilH * 0.15
    const chance = (d.food.illnessChance ?? 0) + (spoiled ? 0.35 : 0)
    if (chance > 0 && sim.rng.chance(chance)) {
      makeIll(target.vitals, 'stomach', 25)
      return ok(`${d.name} — boli brzuch…`)
    }
    return ok(`Zjedzono: ${d.name}.`)
  }
  return fail('Tego nie da się zjeść.')
}

/** Repair: hammer + 2 branches (from actor or household store). Removes rat nests at >60%. */
export function repairBuilding(_sim: Sim, h: Human, b: Building, store?: Building): ActionResult {
  if (b.durability >= 98) return fail('Nie wymaga naprawy.')
  const tool = findTool(h, 'hammer') ?? findTool(h, 'chop')
  if (!tool) return fail('Potrzebujesz młotka lub siekiery.')
  const src = countItem(h.inv, 'branch') >= 2 ? h.inv : store?.inv && countItem(store.inv, 'branch') >= 2 ? store.inv : null
  if (!src) return fail('Potrzebujesz 2 gałęzi.')
  removeItem(src, 'branch', 2)
  b.durability = Math.min(100, b.durability + 30 + h.skills.construction * 0.2)
  wearTool(tool, 1)
  train(h, 'construction', 0.4, 2)
  if (b.ratNest && b.durability > 60) {
    b.ratNest = undefined
    return ok('Naprawiono budynek — gniazdo szczurów zlikwidowane.')
  }
  return ok(`Naprawiono (${Math.round(b.durability)}%).`)
}

export function burnDen(sim: Sim, h: Human, den: DenState): ActionResult {
  if (!den.alive) return fail('Legowisko już zniszczone.')
  if (!findTool(h, 'fire_start')) return fail('Potrzebujesz krzesiwa lub pochodni.')
  if (countItem(h.inv, 'branch') < 5) return fail('Potrzebujesz 5 gałęzi.')
  removeItem(h.inv, 'branch', 5)
  den.alive = false
  sim.emit({ type: 'sound', kind: 'fire', x: den.x, z: den.z })
  return ok('Legowisko spłonęło.')
}
