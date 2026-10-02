import { describe, expect, it } from 'vitest'
import { PILE_TIERS, pileCount, tierOf } from './stockpileTiers'

describe('stockpile tiers (render--009)', () => {
  it('picks the highest threshold not above the count', () => {
    expect([0, 1, 4, 5, 6, 7, 13, 14, 19, 20, 99].map((n) => tierOf('firewood', n))).toEqual([0, 1, 1, 5, 5, 7, 7, 14, 14, 20, 20])
    expect(tierOf('stone', 29)).toBe(15)
    expect(tierOf('food', 40)).toBe(40)
  })
  it('thresholds are ascending', () => {
    for (const t of Object.values(PILE_TIERS)) expect([...t].sort((a, b) => a - b)).toEqual([...t])
  })
  it('counts goods per pile kind', () => {
    const inv = { items: [{ id: 'log', qty: 2 }, { id: 'branch', qty: 3 }, { id: 'stone', qty: 4 }, { id: 'rock_chunk', qty: 1 }, { id: 'grain', qty: 7 }, { id: 'bread', qty: 2 }, { id: 'berries', qty: 3 }] } as never
    expect(pileCount('firewood', inv)).toBe(11)
    expect(pileCount('stone', inv)).toBe(5)
    expect(pileCount('grain', inv)).toBe(7)
    expect(pileCount('food', inv)).toBe(5)
  })
})
