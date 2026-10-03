import { describe, expect, it } from 'vitest'
/**
 * ECON-01 caravans: a traveling trader lives from provisions packed at departure (like a companion, D-NPC-6),
 * is not pulled home by rain or hunger, and so completes its trips (soak finding, review 013 #1).
 */
import type { Inventory } from './types'
import { startEventLog, stopEventLog } from './eventLog'
import { countItem } from './inventory'
import { houseOf } from './npc/queries'
import { WORK_ACTS } from './npc/works'
import { playerFarAway, run, testSim } from './testWorld'

const FOOD = ['bread', 'dried_meat', 'cooked_meat', 'apple', 'cheese', 'stew']
const foodIn = (inv: Inventory) => FOOD.reduce((n, id) => n + countItem(inv, id), 0)

describe('ECON-01 caravan provisions and trips', () => {
  it('ECON-01 caravan: every MD/LG trader completes >= 2 trades in 10 days, with rain and an empty household store', () => {
    const sim = testSim()
    playerFarAway(sim)
    const traders = sim.state.npcs.filter((n) => n.profession === 'trader' && sim.world.settlements[n.settlementId]!.size !== 'SM')
    expect(traders.length).toBeGreaterThan(0)
    // Worst case seen in the soak: nothing to eat in the trader's own household store.
    for (const t of traders) {
      const inv = houseOf(sim, t)!.inv!
      inv.items = inv.items.filter((s) => !FOOD.includes(s.id))
    }
    const log = startEventLog(sim, 200_000)
    try {
      for (let t = 0; t < 10 * 3600; t += 10) {
        // Rain all the time (ordinary rain, above the shelter threshold).
        sim.weather.kind = 'rain'
        sim.weather.intensity = 0.8
        sim.weather.until = sim.state.time.cal + 6 * 3600
        run(sim, 10, 0.5)
      }
      for (const t of traders) {
        const trades = log.entries().filter((e) => e.kind === 'trade' && e.actorId === t.id && e.data.dir === 'caravan').length
        expect(trades, `${t.name} #${t.id} caravan trades`).toBeGreaterThanOrEqual(2)
        expect(t.vitals.dead).toBeFalsy()
      }
    } finally {
      stopEventLog()
    }
  }, 240_000)

  it('ECON-01 caravan: provisions move from the household store / warehouse into the pack (nothing created)', () => {
    const sim = testSim()
    const t = sim.state.npcs.find((n) => n.profession === 'trader' && sim.world.settlements[n.settlementId]!.size !== 'SM')!
    const store = houseOf(sim, t)!.inv!
    store.items = store.items.filter((s) => !FOOD.includes(s.id))
    const wh = sim.building(sim.state.settlements[t.settlementId]!.warehouseId)!.inv!
    const before = foodIn(store) + foodIn(wh) + foodIn(t.inv)
    expect(foodIn(wh)).toBeGreaterThan(3)
    WORK_ACTS.caravan_depart!(sim, t, undefined, 1)
    expect(foodIn(t.inv)).toBeGreaterThanOrEqual(6)
    expect(foodIn(store) + foodIn(wh) + foodIn(t.inv)).toBe(before)
    expect(t.trip?.phase).toBe('outbound')
  })
})
