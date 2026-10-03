/**
 * Profession duty planners (data-driven professions → shared step vocabulary).
 * Each returns a multi-step plan or null when the duty cannot be performed now.
 * @domain npc
 * @subdomain duties
 */
import type { Sim } from '../sim'
import type { AiStep, Animal, Human } from '../types'
import { CARAVAN_MIN_NUTRITION, CARAVAN_PROVISIONS, FIRE } from '../../config/calibration'
import { itemDef } from '../../data/items'
import { SPECIES, type SpeciesId } from '../../data/species'
import { isTree } from '../../world/nodes'
import { isSettlementHearth } from '../fire'
import { countItem, findFood } from '../inventory'
import { routeVia } from '../movement'
import { daylight, hourOf, isNight, seasonOf } from '../time'
import { caravanFoodAvailable, provisionSeller } from './provisions'
import { doorOf, household, householdBuilding, houseOf, nearestAvailableNode, settlementBuildings } from './queries'

export type DutyPlan = { label: string; steps: AiStep[] } | null

const go = (x: number, z: number, range = 1.5, extra: Partial<Extract<AiStep, { op: 'goto' }>> = {}): AiStep => ({ op: 'goto', x, z, range, ...extra })
const work = (act: string, dur: number, label: string, ref?: string, anim?: string): AiStep => ({ op: 'work', act, dur, label, ref, anim })

function homeReturn(sim: Sim, h: Human): AiStep[] {
  const house = houseOf(sim, h)
  if (!house) return []
  const d = doorOf(house)
  return [go(d.x, d.z, 1.5), work('deposit_carry', 3, 'Storing the harvest', undefined, 'interact')]
}

function farmer(sim: Sim, h: Human, eff: number): DutyPlan {
  const field = householdBuilding(sim, h, 'field')
  if (!field?.field) return null
  const f = field.field
  if (f.growth >= 1) return { label: 'Harvesting', steps: [go(field.x, field.z, 4), work('harvest_field', 30 / eff, 'Harvesting', field.id, 'kneel'), ...homeReturn(sim, h)] }
  if (seasonOf(sim.state.time.cal) === 'winter') return null
  if (f.moisture < 0.3 && sim.weather.wetness < 0.3 && countItem(h.inv, 'bucket') > 0) {
    const well = householdBuilding(sim, h, 'well') ?? settlementBuildings(sim, h.settlementId, 'well')[0]
    if (well) return { label: 'Watering the field', steps: [go(well.x, well.z, 1.8), work('fill_bucket', 3, 'Drawing water', undefined, 'interact'), go(field.x, field.z, 4), work('water_field', 15, 'Watering the field', field.id, 'interact')] }
  }
  const px = field.x + (sim.rng.next() - 0.5) * field.hw * 1.6
  const pz = field.z + (sim.rng.next() - 0.5) * field.hd * 1.6
  return { label: 'Working the field', steps: [go(px, pz, 1.5), work('tend_field', 50, 'Working the field', field.id, 'kneel')] }
}

function woodcutter(sim: Sim, h: Human, eff: number): DutyPlan {
  const house = houseOf(sim, h)
  if (!house?.inv) return null
  if (countItem(house.inv, 'log') >= 10) return deliverSurplus(sim, h)
  const tree = nearestAvailableNode(sim, house.x, house.z, 320, (n) => isTree(n.kind) && n.kind !== 'tree_apple', 40)
  if (!tree) return null
  const a = Math.atan2(h.x - tree.x, h.z - tree.z)
  return {
    label: 'Felling a tree',
    steps: [go(tree.x + Math.sin(a) * 1.2, tree.z + Math.cos(a) * 1.2, 0.6), work('fell', 30 / eff, 'Felling a tree', tree.id, 'chop'), ...homeReturn(sim, h)],
  }
}

function deliverSurplus(sim: Sim, h: Human): DutyPlan {
  const house = houseOf(sim, h)
  const wh = sim.building(sim.state.settlements[h.settlementId]?.warehouseId)
  if (!house || !wh) return null
  const d = doorOf(house)
  const wd = doorOf(wh)
  return { label: 'Taking surplus to the warehouse', steps: [go(d.x, d.z), work('pickup_surplus', 3, 'Packing surplus', undefined, 'interact'), go(wd.x, wd.z, 2), work('deposit_warehouse', 4, 'Delivering to the warehouse', wh.id, 'interact')] }
}

const HUNTED_GAME: SpeciesId[] = ['deer', 'stag', 'hare']
/** A hunter's game must lie within this distance (m) of the settlement edge — a chase must not take them out of reach of food and water (soak finding, verify--001). */
export const HUNT_LEASH_M = 450
/** A hunter starts a chase only with hunger and thirst at or above this (soak finding: starved far from home, seed 7). */
export const HUNT_MIN_NEED = 50

function hunter(sim: Sim, h: Human): DutyPlan {
  const s = sim.world.settlements[h.settlementId]!
  // Butcher an existing fresh corpse nearby first.
  const corpse = sim.corpsesNear(h.x, h.z, 200).find((c) => !c.butchered && sim.state.time.cal - c.diedAt < 5 * 3600 && SPECIES[c.species].corpse.meat > 0)
  if (corpse) return { label: 'Butchering game', steps: [go(corpse.x, corpse.z, 1.2), work('butcher', 12, 'Butchering game', String(corpse.id), 'kneel'), ...homeReturn(sim, h), work('dry_meat', 8, 'Drying meat')] }
  const house = houseOf(sim, h)
  if (house?.inv && countItem(house.inv, 'raw_meat') >= 2) return { label: 'Drying meat', steps: [work('dry_meat', 10, 'Drying meat', undefined, 'interact')] }
  // Predator control first, then game (only if population is healthy).
  const cands: Animal[] = []
  for (const a of sim.actors.query(s.x, s.z, 1500)) if (a.kind === 'animal' && !a.vitals.dead && a.householdId === undefined) cands.push(a as Animal)
  const wolves = cands.filter((a) => a.species === 'wolf' && Math.hypot(a.x - s.x, a.z - s.z) < s.radius + 400)
  let target: Animal | undefined = wolves[0]
  if (!target) {
    // Bow hunting: non-aggressive game only (a lone archer does not provoke boars — D-SIM-9).
    // Hungry or thirsty: no new chase far from home (the NPC would starve on the way back; it feeds first, fletches meanwhile).
    const fit = h.vitals.hunger >= HUNT_MIN_NEED && h.vitals.thirst >= HUNT_MIN_NEED
    const game = !fit ? [] : cands.filter((a) => HUNTED_GAME.includes(a.species) && a.variant !== 'young' && Math.hypot(a.x - s.x, a.z - s.z) < s.radius + HUNT_LEASH_M)
    const bySp = (sp: string) => cands.filter((a) => a.species === sp).length
    const ok = game.filter((a) => bySp(a.species) >= 3)
    ok.sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))
    target = ok[0]
  }
  if (!target) {
    // No healthy game around: secondary duty — make arrows at home (vision: hunter makes bows/arrows).
    return house ? { label: 'Fletching arrows', steps: [go(doorOf(house).x, doorOf(house).z, 1.5), work('fletch', 40, 'Fletching arrows', undefined, 'kneel')] } : null
  }
  return {
    label: `Hunting: ${SPECIES[target.species].name}`,
    steps: [go(target.x, target.z, 28, { run: false }), work('shoot', 2, 'Shooting', String(target.id), 'bow')],
  }
}

/**
 * "Feeding the fire" (FIRE-02): a settlement hearth below `belowH` of fuel gets firewood from the warehouse. The hearth is
 * reserved for the NPC while they walk, so two NPCs never fetch fuel for the same fire. No firewood in the stores → null
 * (the fire goes out — the intended, visible consequence).
 */
export function feedFirePlan(sim: Sim, h: Human, belowH: number): DutyPlan {
  const cal = sim.state.time.cal
  const fire = settlementBuildings(sim, h.settlementId, 'campfire').find((b) => isSettlementHearth(b) && (b.fuel ?? 0) < belowH && (!b.tender || b.tender.id === h.id || b.tender.until < cal))
  if (!fire) return null
  const carried = countItem(h.inv, 'branch') + countItem(h.inv, 'log')
  const wh = sim.building(sim.state.settlements[h.settlementId]?.warehouseId)
  const stocked = !!wh?.inv && countItem(wh.inv, 'branch') + countItem(wh.inv, 'log') > 0
  if (!carried && !stocked) return null
  fire.tender = { id: h.id, until: cal + FIRE.tendHoldCalS }
  const feed = [go(fire.x, fire.z, 1.6), work('feed_fire', 4, 'Feeding the fire', fire.id, 'interact')]
  if (carried || !wh) return { label: 'Feeding the fire', steps: feed }
  const wd = doorOf(wh)
  return { label: 'Feeding the fire', steps: [go(wd.x, wd.z, 2), work('take_fuel', 3, 'Fetching firewood', wh.id, 'interact'), ...feed] }
}

function guard(sim: Sim, h: Human): DutyPlan {
  const feed = feedFirePlan(sim, h, FIRE.tendBelowH)
  if (feed) return feed
  const posts = settlementBuildings(sim, h.settlementId, 'torchpost')
  const night = isNight(sim.state.time.cal) || daylight(sim.state.time.cal) < 0.4
  const toLight = posts.find((p) => night && !p.lit)
  if (toLight) return { label: 'Lighting torches', steps: [go(toLight.x, toLight.z, 1.2), work('light_torch', 3, 'Lighting a torch', toLight.id, 'interact')] }
  const toDouse = posts.find((p) => !night && p.lit && daylight(sim.state.time.cal) > 0.8)
  if (toDouse) return { label: 'Putting out torches', steps: [go(toDouse.x, toDouse.z, 1.2), work('douse_torch', 2, 'Putting out a torch', toDouse.id, 'interact')] }
  if (!posts.length) return null
  const a = sim.rng.pick(posts)
  const b = sim.rng.pick(posts)
  return { label: night ? 'Patrolling at night' : 'Patrolling', steps: [go(a.x, a.z, 3), work('look', 6, 'Looking around'), go(b.x, b.z, 3), work('look', 6, 'Looking around')] }
}

function herbalist(sim: Sim, h: Human, eff: number): DutyPlan {
  const garden = householdBuilding(sim, h, 'herbgarden')
  const house = houseOf(sim, h)
  if (garden && house?.inv && countItem(house.inv, 'mint') + countItem(house.inv, 'chamomile') < 8 && sim.rng.chance(0.5)) {
    return { label: 'Tending the herb garden', steps: [go(garden.x, garden.z, 2), work('herb_garden', 40 / eff, 'Tending herbs', garden.id, 'kneel')] }
  }
  const herb = nearestAvailableNode(sim, h.x, h.z, 400, (n) => n.kind === 'herb' && n.herb !== 'hemlock' && n.herb !== 'nightshade', 20)
  if (!herb) return null
  return { label: 'Gathering herbs', steps: [go(herb.x, herb.z, 1), work('gather', 6, 'Gathering herbs', herb.id, 'kneel'), ...homeReturn(sim, h)] }
}

/** Max calendar seconds an expedition may stay outbound before giving up and returning (an LG route of ~4 km takes ~2 days with the night camps). */
const TRIP_MAX_CAL = 3 * 86400

/** Caravans leave on even calendar days between 7:00 and 10:00. */
export function caravanDepartureWindow(cal: number): boolean {
  const hr = hourOf(cal)
  return Math.floor(cal / 86400) % 2 === 0 && hr >= 7 && hr < 10
}

/**
 * Traveling trade between road-connected settlements (MD/LG traders), every 2nd day.
 * Explicit trip phase (h.trip): no trip + away from home → always go home (never outbound loop).
 */
function caravan(sim: Sim, h: Human): DutyPlan {
  const home = sim.world.settlements[h.settlementId]!
  if (home.size === 'SM') return null
  const road = sim.world.roads.find((r) => r.from === home.id || r.to === home.id)
  if (!road) return null
  const other = sim.world.settlements[road.from === home.id ? road.to : road.from]!
  const cal = sim.state.time.cal
  const far = Math.hypot(h.x - home.x, h.z - home.z) > home.radius + 200
  if (h.trip?.phase === 'outbound' && cal - h.trip.since > TRIP_MAX_CAL) h.trip = { phase: 'returning', since: h.trip.since }
  // Out of food and hungry with the destination still far: turn back instead of starving (near it, the destination's stores feed the trader).
  if (h.trip?.phase === 'outbound' && far && !findFood(h.inv) && h.vitals.hunger < 20 && Math.hypot(h.x - other.x, h.z - other.z) > 1000) h.trip = { phase: 'returning', since: h.trip.since }
  // Departure: pack provisions (act starts the trip), then travel — only when there is something to pack (D-NPC-6).
  if (!h.trip && !far && caravanDepartureWindow(cal) && caravanFoodAvailable(sim, h) + (provisionSeller(sim, h)?.affordable ?? 0) >= CARAVAN_MIN_NUTRITION) {
    return caravanOutbound(sim, h, other, true)
  }
  if (h.trip?.phase === 'outbound') return caravanOutbound(sim, h, other, false)
  if (!far) {
    h.trip = undefined
    return null
  }
  const pts = routeVia(sim, h.x, h.z, home.x, home.z)
  return { label: h.trip ? `Returning from ${other.name}` : 'Heading home', steps: pts.map((p) => go(p.x, p.z, 4)) }
}

function caravanOutbound(sim: Sim, h: Human, other: { id: number; name: string }, depart: boolean): DutyPlan {
  const wh = sim.building(sim.state.settlements[other.id]?.warehouseId)
  if (!wh) return null
  const d = doorOf(wh)
  const pts = routeVia(sim, h.x, h.z, d.x, d.z)
  // Departure: top up the provisions from a household that sells food, then pack from the own store and the warehouse.
  const buy = depart && caravanFoodAvailable(sim, h) < CARAVAN_PROVISIONS ? provisionSeller(sim, h)?.seller : undefined
  const pack = depart ? [...(buy ? [go(buy.x, buy.z, 2), work('caravan_buy', 4, 'Buying provisions', String(buy.id), 'interact')] : []), work('caravan_depart', 3, 'Packing provisions', undefined, 'interact')] : []
  return { label: `Caravan to ${other.name}`, steps: [...pack, ...pts.map((p) => go(p.x, p.z, 4)), go(d.x, d.z, 2), work('caravan_trade', 30, 'Trading at the warehouse', wh.id, 'interact')] }
}

function trader(sim: Sim, h: Human): DutyPlan {
  const trip = caravan(sim, h)
  if (trip) return trip
  const market = settlementBuildings(sim, h.settlementId, 'market')[0]
  const spot = market ? doorOf(market) : houseOf(sim, h) ? doorOf(houseOf(sim, h)!) : null
  if (!spot) return null
  return { label: 'Trading', steps: [go(spot.x, spot.z, 1.2), work('trade_stand', 90, 'Trading')] }
}

function blacksmith(sim: Sim, h: Human): DutyPlan {
  const anvil = householdBuilding(sim, h, 'anvil') ?? houseOf(sim, h)
  if (!anvil) return null
  return { label: 'Forging', steps: [go(anvil.x + 1.5, anvil.z, 1.2), work('smith', 40, 'Forging at the anvil', anvil.id, 'hammer')] }
}

function shepherd(sim: Sim, h: Human): DutyPlan {
  const hr = hourOf(sim.state.time.cal)
  const pen = householdBuilding(sim, h, 'pen')
  if (!pen) return null
  const trough = householdBuilding(sim, h, 'trough')
  if (trough && (trough.water ?? 0) < 4) {
    const well = householdBuilding(sim, h, 'well')
    if (well) return { label: 'Filling the trough', steps: [go(well.x, well.z, 1.8), work('fill_bucket', 3, 'Drawing water'), go(trough.x, trough.z, 1.5), work('fill_trough', 4, 'Filling the trough', trough.id, 'interact')] }
  }
  if (hr > 16) return { label: 'Penning the sheep', steps: [go(pen.x, pen.z, 3), work('herd', 20, 'Penning the sheep')] }
  if (sim.rng.chance(0.08)) return { label: 'Shearing sheep', steps: [go(pen.x, pen.z, 3), work('shear', 30, 'Shearing sheep', undefined, 'kneel')] }
  const s = sim.world.settlements[h.settlementId]!
  const ang = Math.atan2(pen.z - s.z, pen.x - s.x) + (sim.rng.next() - 0.5)
  const r = s.radius + 40
  return { label: 'Grazing the sheep', steps: [go(s.x + Math.cos(ang) * r, s.z + Math.sin(ang) * r, 3), work('herd', 120, 'Watching the flock')] }
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
    if (bush) return { label: 'Gathering brushwood', steps: [go(bush.x, bush.z, 1.2), work('gather', 8 / eff, 'Gathering brushwood', bush.id, 'kneel'), ...homeReturn(sim, h)] }
  }
  const berry = nearestAvailableNode(sim, h.x, h.z, 250, (n) => n.kind === 'bush_berry' || n.kind === 'mushroom')
  if (berry && seasonOf(sim.state.time.cal) !== 'winter') {
    return { label: 'Picking berries', steps: [go(berry.x, berry.z, 1.2), work('gather', 8 / eff, 'Picking', berry.id, 'kneel'), ...homeReturn(sim, h)] }
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
