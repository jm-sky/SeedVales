import { describe, expect, it } from 'vitest'
import { newStack } from './inventory'
import { addPriceMod, priceMult, prunePriceMods } from './priceMods'
import { testSim } from './testWorld'
import { buyPrice, sellPrice } from './trade'

describe('price modifiers (quests--003 E6)', () => {
  it('raise prices in one settlement, expire, and never allow resell profit', () => {
    const sim = testSim()
    const n = sim.npcsOf(0)[0]!
    const s = newStack('bread', 1)
    const base = buyPrice(sim, n, s)
    addPriceMod(sim, { place: n.settlementId, item: '*', mult: 1.2, days: 30, why: 'test' })
    addPriceMod(sim, { place: n.settlementId, item: '*', mult: 1.2, days: 30, why: 'test' }) // replaced, not stacked
    expect(priceMult(sim, n.settlementId, 'bread')).toBeCloseTo(1.2)
    expect(priceMult(sim, n.settlementId + 1, 'bread')).toBe(1)
    expect(buyPrice(sim, n, s)).toBeGreaterThanOrEqual(base)
    expect(sellPrice(sim, n, s)).toBeLessThan(buyPrice(sim, n, s))
    sim.state.time.cal += 31 * 86400
    expect(priceMult(sim, n.settlementId, 'bread')).toBe(1)
    prunePriceMods(sim)
    expect(sim.state.priceMods).toEqual([])
  })
})
