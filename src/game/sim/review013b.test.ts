/**
 * Regression tests for review 013 batch B (fauna iteration, scheduler counters, blacksmith order pricing).
 */
import { describe, expect, it } from 'vitest'
import type { Sim } from './sim'
import type { Animal } from './types'
import { ORDER, TRADE } from '../config/calibration'
import { Rng } from '../core/rng'
import { itemDef, QUALITY_MULT } from '../data/items'
import { isOrderable, RECIPES } from '../data/recipes'
import { perf } from '../diag/perf'
import { faunaSystem } from './fauna/ai'
import { countItem } from './inventory'
import { makeAnimal } from './newGame'
import { houseOf } from './npc/queries'
import { orderLabour, orderPrice, placeOrder } from './orders'
import { run, testSim } from './testWorld'

let nextTestId = 900000

function spawn(sim: Sim, n: number): Animal[] {
  const rng = new Rng(99)
  const out: Animal[] = []
  for (let i = 0; i < n; i++) {
    const x = sim.player.x + 400 + i * 3
    const z = sim.player.z + 400
    const a = makeAnimal(nextTestId++, 'hare', 'adult', x, z, sim.terrain.heightAt(x, z), rng)
    sim.addAnimal(a)
    out.push(a)
  }
  return out
}

describe('review 013 P-02: fauna iterates without cloning the animal array (PERF-01)', () => {
  it('PERF-01: removals during a pass neither skip nor duplicate animals, and the list is compacted afterwards', () => {
    const sim = testSim()
    const added = spawn(sim, 10)
    const before = sim.state.animals.length
    const seen: number[] = []
    sim.forEachAnimalSafely((a) => {
      seen.push(a.id)
      if (a === added[3]) {
        sim.removeAnimal(added[1]!) // earlier in the list, already visited
        sim.removeAnimal(added[3]!) // the current one
        sim.removeAnimal(added[6]!) // later: must not be visited any more
      }
    })
    const ids = new Set(seen)
    expect(ids.size).toBe(seen.length)
    expect(ids.has(added[6]!.id)).toBe(false)
    for (const i of [0, 1, 2, 3, 4, 5, 7, 8, 9]) expect(ids.has(added[i]!.id)).toBe(true)
    expect(sim.state.animals.length).toBe(before - 3)
    expect(sim.state.animals.includes(added[1]!)).toBe(false)
    expect(sim.actor(added[6]!.id)).toBeUndefined()
  })

  it('PERF-01: an animal added during a pass is not visited in the same pass', () => {
    const sim = testSim()
    const [first] = spawn(sim, 2)
    let extra: Animal | undefined
    const seen = new Set<number>()
    sim.forEachAnimalSafely((a) => {
      seen.add(a.id)
      if (a === first) extra = spawn(sim, 1)[0]
    })
    expect(extra).toBeDefined()
    expect(seen.has(extra!.id)).toBe(false)
    expect(sim.state.animals.includes(extra!)).toBe(true)
  })

  it('PERF-01: faunaSystem survives an animal dying mid-pass and still updates all the others', () => {
    const sim = testSim()
    const added = spawn(sim, 6)
    const victim = added[2]!
    victim.vitals.bleeding = 5
    victim.vitals.parts.torso = 1e6
    sim.state.time.play += 1
    for (const a of sim.state.animals) a.nextUpdate = 0
    faunaSystem(sim)
    expect(sim.state.animals.includes(victim)).toBe(false)
    for (const a of added) if (a !== victim) expect(a.lastUpdate).toBe(sim.state.time.play)
  })
})

describe('review 013 P-01 / audit E: scheduler counters (PERF-01)', () => {
  it('PERF-01: npc/fauna schedulerVisited and updated counters are recorded, updated <= visited', () => {
    const sim = testSim()
    perf.reset()
    run(sim, 20)
    const c = perf.report().counters
    for (const k of ['npc', 'fauna']) {
      const visited = c[`${k}.schedulerVisited`] ?? 0
      const updated = c[`${k}.updated`] ?? 0
      expect(visited, `${k}.schedulerVisited`).toBeGreaterThan(0)
      expect(updated, `${k}.updated`).toBeGreaterThan(0)
      expect(updated).toBeLessThanOrEqual(visited)
    }
  })
})

const inputValue = (r: (typeof RECIPES)[number]) => r.inputs.reduce((n, i) => n + itemDef(i.item).price * i.qty, 0)

describe('review 013 M-09: blacksmith order pricing (CRAFT-02, D-CRAFT-1, D-ECON-5)', () => {
  const orderable = RECIPES.filter(isOrderable)

  it('CRAFT-02: there are orderable recipes and each charges at least the replacement value of its inputs plus labour', () => {
    expect(orderable.length).toBeGreaterThan(5)
    for (const r of orderable) {
      expect(orderLabour(r.id), `${r.id} labour`).toBe(Math.round(r.timeS * ORDER.labourPerS))
      expect(orderLabour(r.id)).toBeGreaterThan(0)
      expect(orderPrice(r.id), `${r.id}: price vs inputs + labour`).toBeGreaterThanOrEqual(inputValue(r) + orderLabour(r.id))
    }
  })

  it('CRAFT-02: the axe/sword/pickaxe examples of the review no longer pay below ingredient cost', () => {
    expect(orderPrice('axe')).toBeGreaterThanOrEqual(61 + orderLabour('axe'))
    expect(orderPrice('sword')).toBeGreaterThanOrEqual(135 + orderLabour('sword'))
    expect(orderPrice('pickaxe')).toBeGreaterThanOrEqual(61 + orderLabour('pickaxe'))
  })

  it('D-ECON-5: an order is never cheaper than the best any NPC pays for the result (any quality), so ordering and reselling gains nothing', () => {
    for (const r of orderable) {
      const base = itemDef(r.output.item).price
      // Best sale: exceptional quality, plenty of stock × best mood, always 1 c below the lowest buy price.
      const bestSale = Math.round(base * QUALITY_MULT[3] * TRADE.plentyScarcity * TRADE.minBuyMul) - 1
      expect(orderPrice(r.id), `${r.id}: order price vs best resale`).toBeGreaterThanOrEqual(bestSale)
    }
  })

  it('D-CRAFT-1: the smith is paid at least what the reserved materials are worth (placed order, real store)', () => {
    const sim = testSim()
    const smith = sim.state.npcs.find((n) => n.profession === 'blacksmith')!
    const store = houseOf(sim, smith)!.inv!
    sim.player.money = 5000
    const ingots0 = countItem(store, 'iron_ingot')
    placeOrder(sim, smith, 'axe')
    const o = sim.state.px.orders[0]!
    const reservedValue = o.reserved!.reduce((n, s) => n + itemDef(s.id).price * s.qty, 0)
    expect(o.price).toBeGreaterThanOrEqual(reservedValue + orderLabour('axe'))
    expect(countItem(store, 'iron_ingot')).toBe(ingots0 - 2)
  })
})
