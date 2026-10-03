import { describe, expect, it } from 'vitest'
import { newStack } from './inventory'
import { isMarketDay, MARKET, marketOpenAt } from './market'
import { testSim } from './testWorld'
import { buyPrice, sellPrice } from './trade'

const at = (day: number, hour: number) => day * 86400 + hour * 3600

describe('market days (P-01)', () => {
  it('opens one day a week, in daytime hours only', () => {
    const d = MARKET.offset
    expect(marketOpenAt(at(d, 12))).toBe(true)
    expect(marketOpenAt(at(d, 6))).toBe(false)
    expect(marketOpenAt(at(d, 19))).toBe(false)
    expect(marketOpenAt(at(d + 1, 12))).toBe(false)
    expect(marketOpenAt(at(d + MARKET.everyDays, 12))).toBe(true)
  })

  it('buying is cheaper, selling pays more, and reselling still never pays', () => {
    const sim = testSim()
    const n = sim.npcsOf(0)[0]!
    const s = newStack('bread', 1)
    sim.state.time.cal = at(MARKET.offset + 1, 12)
    expect(isMarketDay(sim)).toBe(false)
    const buy0 = buyPrice(sim, n, s)
    const sell0 = sellPrice(sim, n, s)
    sim.state.time.cal = at(MARKET.offset, 12)
    expect(isMarketDay(sim)).toBe(true)
    expect(buyPrice(sim, n, s)).toBeLessThanOrEqual(buy0)
    expect(sellPrice(sim, n, s)).toBeGreaterThanOrEqual(sell0)
    expect(sellPrice(sim, n, s)).toBeLessThan(buyPrice(sim, n, s))
  })
})
