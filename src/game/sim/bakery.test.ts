import { describe, expect, it } from 'vitest'
/**
 * ECON-01 famine (review 015 row 1d): farmers harvest grain, which is not edible; without baking the grain piled up
 * in the household stores while the settlement starved (seed 3: 45 % of the harvest was grain).
 */
import { ledgerBalance, startEventLog, stopEventLog } from './eventLog'
import { addItem, countItem, newStack } from './inventory'
import { houseOf } from './npc/queries'
import { playerFarAway, run, testSim } from './testWorld'

describe('ECON-01 households bake their grain', () => {
  it('ECON-01 bakery: a farmer household turns harvested grain into bread (3 grain -> 1 bread, ledger balanced)', () => {
    const sim = testSim()
    playerFarAway(sim)
    const farmer = sim.state.npcs.find((n) => n.profession === 'farmer' && n.age === 'adult')!
    const store = houseOf(sim, farmer)!.inv!
    store.items = store.items.filter((s) => s.id !== 'grain' && s.id !== 'bread')
    addItem(store, newStack('grain', 30))
    const log = startEventLog(sim, 100_000)
    try {
      for (let t = 0; t < 1800; t += 10) run(sim, 10, 0.5)
      expect(countItem(store, 'grain')).toBeLessThan(30)
      const baked = log.flows.get('produce:bread:bake') ?? 0
      expect(baked).toBeGreaterThan(0)
      expect(log.flows.get('consume:grain:bake')).toBe(baked * 3)
      for (const row of ledgerBalance(sim, log).filter((r) => r.item === 'grain' || r.item === 'bread')) expect(Math.abs(row.residual), row.item).toBeLessThan(1e-6)
    } finally {
      stopEventLog()
    }
  }, 120_000)
})
