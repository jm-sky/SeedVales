/**
 * Slow world systems (calendar-driven): weather, crops, spoilage, corpses, building decay,
 * rat nests, den respawns, regrowth. Run at low frequency with accumulated dt.
 * @domain sim
 */
import type { SpeciesId } from '../data/species'
import type { Sim, SimSystem } from './sim'
import type { Building } from './types'
import { CALENDAR_SPEED, FOOD } from '../config/calibration'
import { HOUSEHOLD_PRODUCE } from '../data/itemSources'
import { perf } from '../diag/perf'
import { regrowNodes } from './actions'
import { projectileSystem } from './combat'
import { logConsume, logProduce } from './eventLog'
import { faunaSystem } from './fauna/ai'
import { burnFuel, burnGroundTorch, removeBurntOut } from './fire'
import { addItem, newStack, spoilInventory } from './inventory'
import { navigationSystem } from './navigation'
import { makeAnimal, rollVariant } from './newGame'
import { npcSystem } from './npc/ai'
import { companionSystem, companionTalk } from './npc/companions'
import { playerSystem } from './player'
import { countByDen, nestTag } from './queries'
import { authoredQuestSystem } from './questEngine'
import { questSystem } from './quests'
import { reputationSystem } from './reputation'
import { growthFactor, seasonOf } from './time'
import { traceSystem } from './traces'
import { collectTaxes } from './treasury'
import { isBadWeather, updateWeather } from './weather'

function ecology(sim: Sim, dt: number) {
  const s = sim.state
  const h = (dt * CALENDAR_SPEED) / 3600
  updateWeather(s.weather, s.time.cal, dt * CALENDAR_SPEED, sim.rng)
  const bad = isBadWeather(s.weather)
  const g = growthFactor(s.time.cal)
  const perNest = s.buildings.some((b) => b.ratNest) ? countByDen(sim) : undefined
  const burntOut: Building[] = []
  for (const b of s.buildings) {
    if (b.lit && b.kind === 'campfire' && burnFuel(b, h)) burntOut.push(b)
    if (b.field) {
      b.field.moisture = Math.max(b.field.moisture - 0.02 * h, s.weather.wetness)
      // Natural growth: ~4 days to mature with moisture; tending speeds up.
      b.field.growth = Math.min(1, b.field.growth + (h / 96) * g * (0.3 + b.field.moisture * 0.7))
    }
    if (b.kind !== 'bridge' && b.kind !== 'field') {
      b.durability = Math.max(0, b.durability - h * 0.1 * (bad ? 2.5 : 1))
    }
    // Neglected buildings attract rats.
    if (b.durability < 35 && !b.ratNest && (b.kind === 'warehouse' || b.kind === 'house' || b.kind === 'shed') && sim.rng.chance(0.2 * h)) {
      b.ratNest = { strength: 1, since: s.time.cal }
    }
    if (b.ratNest) {
      b.ratNest.strength = Math.min(4, b.ratNest.strength + h * 0.05)
      const rats = perNest?.get(nestTag(b.id)) ?? 0
      if (rats < 2 + Math.floor(b.ratNest.strength) && sim.rng.chance(0.5 * h + 0.02)) {
        // Rats emerge by the walls (outside the footprint, building-local → world).
        const lx = sim.rng.range(-b.hw, b.hw)
        const lz = b.hd + 1.2
        const x = b.x + lx * Math.cos(b.rot) + lz * Math.sin(b.rot)
        const z = b.z - lx * Math.sin(b.rot) + lz * Math.cos(b.rot)
        const rat = makeAnimal(sim.nextId(), 'rat', 'adult', x, z, sim.terrain.heightAt(x, z), sim.rng)
        rat.denId = nestTag(b.id)
        sim.addAnimal(rat)
      }
      // Rats eat stored food.
      if (b.inv && sim.rng.chance(0.3 * h)) {
        const food = b.inv.items.find((i) => i.fresh !== undefined)
        if (food) {
          logConsume(food.id, Math.min(1, food.qty), 'rats')
          food.qty = Math.max(0, food.qty - 1)
        }
        b.inv.items = b.inv.items.filter((i) => i.qty > 0)
      }
    }
    if (b.kind === 'torchpost' && b.lit && b.durability < 5) b.lit = false
  }
  removeBurntOut(sim, burntOut)
  // Spoilage.
  spoilInventory(s.player.inv, h)
  for (const n of s.npcs) spoilInventory(n.inv, h)
  for (const b of s.buildings) if (b.inv) spoilInventory(b.inv, h, FOOD.chestSpoilFactor)
  for (let i = s.ground.length - 1; i >= 0; i--) {
    const gi = s.ground[i]!
    if (gi.lit && burnGroundTorch(gi, h)) {
      logConsume(gi.stack.id, gi.stack.qty, 'burnt_out')
      sim.removeGround(gi)
      continue
    }
    if (gi.stack.fresh !== undefined) {
      gi.stack.fresh -= h * 1.2
      if (gi.stack.fresh <= 0) {
        logConsume(gi.stack.id, gi.stack.qty, 'spoilage')
        sim.removeGround(gi)
      }
    }
  }
  // Corpses: rot then leave bones (removed after 48 h).
  for (let i = s.corpses.length - 1; i >= 0; i--) {
    const c = s.corpses[i]!
    const age = (s.time.cal - c.diedAt) / 3600
    if (age > FOOD.corpseBonesAfterH) sim.removeCorpse(c)
    else if (age > FOOD.corpseRotH) c.meat = Math.max(0, c.meat - h * 0.2)
  }
}

/**
 * Household self-sufficiency: kitchen garden, hens/cow and baking produce food daily (abstracted),
 * scaled by season. Keeps settlements self-sufficient in food (vision §28 Ekonomia).
 */
function households(sim: Sim, dtPlay: number) {
  const days = (dtPlay * CALENDAR_SPEED) / 86400
  const season = seasonOf(sim.state.time.cal)
  const g = { spring: 0.9, summer: 1.1, autumn: 1, winter: 0.45 }[season]
  const pool = season === 'winter' ? HOUSEHOLD_PRODUCE.winter : HOUSEHOLD_PRODUCE.other
  for (const hh of sim.state.households) {
    const house = sim.building(hh.houseId)
    if (!house?.inv) continue
    const acc = house.foodAcc ?? 0
    let n = acc + hh.memberIds.length * 1.1 * g * days
    while (n >= 1) {
      const food = newStack(sim.rng.pick(pool), 1)
      addItem(house.inv, food)
      logProduce(food.id, 1, 'household_garden')
      n -= 1
    }
    house.foodAcc = n
  }
}

const denSpecies = (d: string, rnd: number): SpeciesId => (d === 'deer' ? (rnd < 0.3 ? 'stag' : 'deer') : (d as SpeciesId))

function dens(sim: Sim) {
  const s = sim.state
  // One pass per run (every 30 s) instead of a scan per den: den animals roam far from the den.
  const perDen = countByDen(sim)
  for (const d of s.dens) {
    if (!d.alive || s.time.cal < d.nextSpawn) continue
    const count = perDen.get(d.id) ?? 0
    if (count < d.maxCount) {
      const x = d.x + sim.rng.range(-10, 10)
      const z = d.z + sim.rng.range(-10, 10)
      const a = makeAnimal(sim.nextId(), denSpecies(d.species, sim.rng.next()), rollVariant(sim.rng), x, z, sim.terrain.heightAt(x, z), sim.rng)
      a.denId = d.id
      sim.addAnimal(a)
    }
    d.nextSpawn = s.time.cal + 86400 * 1.5
  }
}

export function installSystems(sim: Sim) {
  const sys: SimSystem[] = [
    { name: 'player', interval: 0, run: playerSystem },
    { name: 'projectiles', interval: 0, run: projectileSystem },
    { name: 'npc', interval: 0.05, run: npcSystem },
    { name: 'fauna', interval: 0.05, run: (s) => faunaSystem(s) },
    { name: 'ecology', interval: 5, run: ecology },
    { name: 'dens', interval: 30, run: (s) => dens(s) },
    { name: 'households', interval: 20, run: households },
    { name: 'regrow', interval: 60, run: (s) => regrowNodes(s) },
    { name: 'reputation', interval: 5, run: (s) => reputationSystem(s) },
    { name: 'quests', interval: 10, run: (s) => questSystem(s) },
    { name: 'authoredQuests', interval: 1, run: authoredQuestSystem },
    { name: 'taxes', interval: 30, run: (s) => collectTaxes(s) },
    { name: 'traces', interval: 10, run: traceSystem },
    { name: 'navigation', interval: 2, run: navigationSystem },
    { name: 'companions', interval: 2, run: companionSystem },
    { name: 'companionTalk', interval: 10, run: companionTalk },
  ]
  sim.systems = sys
  perf.gauge('sim.systems', sys.length)
}
