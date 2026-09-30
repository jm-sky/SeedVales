/**
 * Profession duty planners (data-driven professions → shared step vocabulary).
 * Each returns a multi-step plan or null when the duty cannot be performed now.
 * @domain npc
 * @subdomain duties
 */
import type { Sim } from '../sim'
import type { AiStep, Animal, Human } from '../types'
import { itemDef } from '../../data/items'
import { SPECIES } from '../../data/species'
import { isTree } from '../../world/nodes'
import { countItem } from '../inventory'
import { routeVia } from '../movement'
import { daylight, hourOf, isNight, seasonOf } from '../time'
import { doorOf, household, householdBuilding, houseOf, nearestAvailableNode, settlementBuildings } from './queries'

export type DutyPlan = { label: string; steps: AiStep[] } | null

const go = (x: number, z: number, range = 1.5, extra: Partial<Extract<AiStep, { op: 'goto' }>> = {}): AiStep => ({ op: 'goto', x, z, range, ...extra })
const work = (act: string, dur: number, label: string, ref?: string, anim?: string): AiStep => ({ op: 'work', act, dur, label, ref, anim })

function homeReturn(sim: Sim, h: Human): AiStep[] {
  const house = houseOf(sim, h)
  if (!house) return []
  const d = doorOf(house)
  return [go(d.x, d.z, 1.5), work('deposit_carry', 3, 'Odkłada zbiory', undefined, 'interact')]
}

function farmer(sim: Sim, h: Human, eff: number): DutyPlan {
  const field = householdBuilding(sim, h, 'field')
  if (!field?.field) return null
  const f = field.field
  if (f.growth >= 1) return { label: 'Zbiera plony', steps: [go(field.x, field.z, 4), work('harvest_field', 30 / eff, 'Zbiera plony', field.id, 'kneel'), ...homeReturn(sim, h)] }
  if (seasonOf(sim.state.time.cal) === 'winter') return null
  if (f.moisture < 0.3 && sim.weather.wetness < 0.3 && countItem(h.inv, 'bucket') > 0) {
    const well = householdBuilding(sim, h, 'well') ?? settlementBuildings(sim, h.settlementId, 'well')[0]
    if (well) return { label: 'Podlewa pole', steps: [go(well.x, well.z, 1.8), work('fill_bucket', 3, 'Nabiera wodę', undefined, 'interact'), go(field.x, field.z, 4), work('water_field', 15, 'Podlewa pole', field.id, 'interact')] }
  }
  const px = field.x + (sim.rng.next() - 0.5) * field.hw * 1.6
  const pz = field.z + (sim.rng.next() - 0.5) * field.hd * 1.6
  return { label: 'Pracuje w polu', steps: [go(px, pz, 1.5), work('tend_field', 50, 'Pracuje w polu', field.id, 'kneel')] }
}

function woodcutter(sim: Sim, h: Human, eff: number): DutyPlan {
  const house = houseOf(sim, h)
  if (!house?.inv) return null
  if (countItem(house.inv, 'log') >= 10) return deliverSurplus(sim, h)
  const tree = nearestAvailableNode(sim, house.x, house.z, 320, (n) => isTree(n.kind) && n.kind !== 'tree_apple', 40)
  if (!tree) return null
  const a = Math.atan2(h.x - tree.x, h.z - tree.z)
  return {
    label: 'Ścina drzewo',
    steps: [go(tree.x + Math.sin(a) * 1.2, tree.z + Math.cos(a) * 1.2, 0.6), work('fell', 30 / eff, 'Ścina drzewo', tree.id, 'chop'), ...homeReturn(sim, h)],
  }
}

function deliverSurplus(sim: Sim, h: Human): DutyPlan {
  const house = houseOf(sim, h)
  const wh = sim.building(sim.state.settlements[h.settlementId]?.warehouseId)
  if (!house || !wh) return null
  const d = doorOf(house)
  const wd = doorOf(wh)
  return { label: 'Oddaje nadwyżki do magazynu', steps: [go(d.x, d.z), work('pickup_surplus', 3, 'Pakuje nadwyżki', undefined, 'interact'), go(wd.x, wd.z, 2), work('deposit_warehouse', 4, 'Oddaje do magazynu', wh.id, 'interact')] }
}

function hunter(sim: Sim, h: Human): DutyPlan {
  const s = sim.world.settlements[h.settlementId]!
  // Butcher an existing fresh corpse nearby first.
  const corpse = sim.state.corpses.find((c) => !c.butchered && Math.hypot(c.x - h.x, c.z - h.z) < 200 && sim.state.time.cal - c.diedAt < 5 * 3600 && SPECIES[c.species].corpse.meat > 0)
  if (corpse) return { label: 'Oprawia zwierzynę', steps: [go(corpse.x, corpse.z, 1.2), work('butcher', 12, 'Oprawia zwierzynę', String(corpse.id), 'kneel'), ...homeReturn(sim, h), work('dry_meat', 8, 'Suszy mięso')] }
  const house = houseOf(sim, h)
  if (house?.inv && countItem(house.inv, 'raw_meat') >= 2) return { label: 'Suszy mięso', steps: [work('dry_meat', 10, 'Suszy mięso', undefined, 'interact')] }
  // Predator control first, then game (only if population is healthy).
  const cands: Animal[] = []
  for (const a of sim.actors.query(s.x, s.z, 750)) if (a.kind === 'animal' && !a.vitals.dead && !a.householdId) cands.push(a as Animal)
  const wolves = cands.filter((a) => a.species === 'wolf' && Math.hypot(a.x - s.x, a.z - s.z) < s.radius + 400)
  let target: Animal | undefined = wolves[0]
  if (!target) {
    const game = cands.filter((a) => (a.species === 'deer' || a.species === 'stag' || a.species === 'boar' || a.species === 'hare') && a.variant !== 'young')
    const bySp = (sp: string) => cands.filter((a) => a.species === sp).length
    const ok = game.filter((a) => bySp(a.species) >= 3)
    ok.sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))
    target = ok[0]
  }
  if (!target) return null
  return {
    label: `Poluje: ${SPECIES[target.species].name}`,
    steps: [go(target.x, target.z, 28, { run: false }), work('shoot', 2, 'Strzela', String(target.id), 'bow')],
  }
}

function guard(sim: Sim, h: Human): DutyPlan {
  const posts = settlementBuildings(sim, h.settlementId, 'torchpost')
  const night = isNight(sim.state.time.cal) || daylight(sim.state.time.cal) < 0.4
  const toLight = posts.find((p) => night && !p.lit)
  if (toLight) return { label: 'Zapala pochodnie', steps: [go(toLight.x, toLight.z, 1.2), work('light_torch', 3, 'Zapala pochodnię', toLight.id, 'interact')] }
  const toDouse = posts.find((p) => !night && p.lit && daylight(sim.state.time.cal) > 0.8)
  if (toDouse) return { label: 'Gasi pochodnie', steps: [go(toDouse.x, toDouse.z, 1.2), work('douse_torch', 2, 'Gasi pochodnię', toDouse.id, 'interact')] }
  if (!posts.length) return null
  const a = sim.rng.pick(posts)
  const b = sim.rng.pick(posts)
  return { label: night ? 'Patroluje nocą' : 'Patroluje', steps: [go(a.x, a.z, 3), work('look', 6, 'Rozgląda się'), go(b.x, b.z, 3), work('look', 6, 'Rozgląda się')] }
}

function herbalist(sim: Sim, h: Human, eff: number): DutyPlan {
  const garden = householdBuilding(sim, h, 'herbgarden')
  const house = houseOf(sim, h)
  if (garden && house?.inv && countItem(house.inv, 'mint') + countItem(house.inv, 'chamomile') < 8 && sim.rng.chance(0.5)) {
    return { label: 'Pielęgnuje ogródek', steps: [go(garden.x, garden.z, 2), work('herb_garden', 40 / eff, 'Pielęgnuje zioła', garden.id, 'kneel')] }
  }
  const herb = nearestAvailableNode(sim, h.x, h.z, 400, (n) => n.kind === 'herb' && n.herb !== 'hemlock' && n.herb !== 'nightshade', 20)
  if (!herb) return null
  return { label: 'Zbiera zioła', steps: [go(herb.x, herb.z, 1), work('gather', 6, 'Zbiera zioła', herb.id, 'kneel'), ...homeReturn(sim, h)] }
}

/** Traveling trade between road-connected settlements (MD/LG traders), every 2nd day. */
function caravan(sim: Sim, h: Human): DutyPlan {
  const home = sim.world.settlements[h.settlementId]!
  if (home.size === 'SM') return null
  const road = sim.world.roads.find((r) => r.from === home.id || r.to === home.id)
  if (!road) return null
  const other = sim.world.settlements[road.from === home.id ? road.to : road.from]!
  const now = sim.state.time.play
  const day = Math.floor(sim.state.time.cal / 86400)
  const hr = hourOf(sim.state.time.cal)
  const far = Math.hypot(h.x - home.x, h.z - home.z) > home.radius + 200
  const returning = (h.ai.cooldowns.caravan_back ?? 0) > now
  const wh = sim.building(sim.state.settlements[other.id]?.warehouseId)
  if (returning) {
    if (!far) {
      h.ai.cooldowns.caravan_back = 0
      return null
    }
    const pts = routeVia(sim, h.x, h.z, home.x, home.z)
    return { label: `Wraca z ${other.name}`, steps: pts.map((p) => go(p.x, p.z, 4)) }
  }
  if (!far && !(day % 2 === 0 && hr >= 7 && hr < 10)) return null
  if (!wh) return null
  const d = doorOf(wh)
  const pts = routeVia(sim, h.x, h.z, d.x, d.z)
  const pack = far ? [] : [work('pack_food', 3, 'Pakuje prowiant', undefined, 'interact')]
  return { label: `Karawana do ${other.name}`, steps: [...pack, ...pts.map((p) => go(p.x, p.z, 4)), go(d.x, d.z, 2), work('caravan_trade', 30, 'Handluje w magazynie', wh.id, 'interact')] }
}

function trader(sim: Sim, h: Human): DutyPlan {
  const trip = caravan(sim, h)
  if (trip) return trip
  const market = settlementBuildings(sim, h.settlementId, 'market')[0]
  const spot = market ? doorOf(market) : houseOf(sim, h) ? doorOf(houseOf(sim, h)!) : null
  if (!spot) return null
  return { label: 'Handluje', steps: [go(spot.x, spot.z, 1.2), work('trade_stand', 90, 'Handluje')] }
}

function blacksmith(sim: Sim, h: Human): DutyPlan {
  const anvil = householdBuilding(sim, h, 'anvil') ?? houseOf(sim, h)
  if (!anvil) return null
  return { label: 'Kuje', steps: [go(anvil.x + 1.5, anvil.z, 1.2), work('smith', 40, 'Kuje przy kowadle', anvil.id, 'hammer')] }
}

function shepherd(sim: Sim, h: Human): DutyPlan {
  const hr = hourOf(sim.state.time.cal)
  const pen = householdBuilding(sim, h, 'pen')
  if (!pen) return null
  const trough = householdBuilding(sim, h, 'trough')
  if (trough && (trough.water ?? 0) < 4) {
    const well = householdBuilding(sim, h, 'well')
    if (well) return { label: 'Napełnia koryto', steps: [go(well.x, well.z, 1.8), work('fill_bucket', 3, 'Nabiera wodę'), go(trough.x, trough.z, 1.5), work('fill_trough', 4, 'Napełnia koryto', trough.id, 'interact')] }
  }
  if (hr > 16) return { label: 'Zagania owce', steps: [go(pen.x, pen.z, 3), work('herd', 20, 'Zagania owce')] }
  if (sim.rng.chance(0.08)) return { label: 'Strzyże owce', steps: [go(pen.x, pen.z, 3), work('shear', 30, 'Strzyże owce', undefined, 'kneel')] }
  const s = sim.world.settlements[h.settlementId]!
  const ang = Math.atan2(pen.z - s.z, pen.x - s.x) + (sim.rng.next() - 0.5)
  const r = s.radius + 40
  return { label: 'Wypasa owce', steps: [go(s.x + Math.cos(ang) * r, s.z + Math.sin(ang) * r, 3), work('herd', 120, 'Pilnuje stada')] }
}

/** Helpers (spouse, child, elder) and fallback chores. */
export function chores(sim: Sim, h: Human, eff: number): DutyPlan {
  const hh = household(sim, h)
  if (hh && (hh.profession === 'farmer' || hh.profession === 'herbalist') && h.age !== 'child') {
    const p = hh.profession === 'farmer' ? farmer(sim, h, eff) : herbalist(sim, h, eff)
    if (p) return p
  }
  const house = houseOf(sim, h)
  if (house?.inv && countItem(house.inv, 'branch') < 15) {
    const bush = nearestAvailableNode(sim, house.x, house.z, 200, (n) => n.kind === 'bush')
    if (bush) return { label: 'Zbiera chrust', steps: [go(bush.x, bush.z, 1.2), work('gather', 8 / eff, 'Zbiera chrust', bush.id, 'kneel'), ...homeReturn(sim, h)] }
  }
  const berry = nearestAvailableNode(sim, h.x, h.z, 250, (n) => n.kind === 'bush_berry' || n.kind === 'mushroom')
  if (berry && seasonOf(sim.state.time.cal) !== 'winter') {
    return { label: 'Zbiera jagody', steps: [go(berry.x, berry.z, 1.2), work('gather', 8 / eff, 'Zbiera', berry.id, 'kneel'), ...homeReturn(sim, h)] }
  }
  return null
}

export function dutyPlan(sim: Sim, h: Human): DutyPlan {
  const eff = h.age === 'adult' ? 1 : 0.3
  if (!h.profession) return chores(sim, h, eff)
  switch (h.profession) {
    case 'blacksmith':
      return blacksmith(sim, h)
    case 'farmer':
      return farmer(sim, h, eff)
    case 'guard':
      return guard(sim, h)
    case 'herbalist':
      return herbalist(sim, h, eff)
    case 'hunter':
      return hunter(sim, h)
    case 'shepherd':
      return shepherd(sim, h)
    case 'trader':
      return trader(sim, h)
    case 'woodcutter':
      return woodcutter(sim, h, eff)
  }
}

export { deliverSurplus }
export const isFood = (id: string) => !!itemDef(id).food
