/**
 * WORLD-04 across seeds (review #6): every seed yields ≥3 settlements, ≥2 roads and a home →
 * neighbour route within ROUTE_BAND × DAY_MARCH_M. Separate file: ~1.5 s generation per seed.
 */
import { describe, expect, it } from 'vitest'
import { DAY_MARCH_M } from '../../config/calibration'
import { ROUTE_BAND } from './centres'
import { generateWorld } from './generate'

const SEEDS = [0, 1, 2, 19, 42, 2020, 9999, 88888]

describe('world generation across seeds', () => {
  for (const seed of SEEDS) {
    it(`WORLD-04: seed ${seed} — 3 settlements, 2 roads, home route ≈ 1 day march`, () => {
      const w = generateWorld(seed)
      expect(w.settlements.length).toBeGreaterThanOrEqual(3)
      expect(w.roads.length).toBeGreaterThanOrEqual(2)
      const r0 = w.roads.find((r) => r.from === 0 && r.to === 1)!
      expect(r0.length / DAY_MARCH_M).toBeGreaterThanOrEqual(ROUTE_BAND[0])
      expect(r0.length / DAY_MARCH_M).toBeLessThanOrEqual(ROUTE_BAND[1])
    }, 20_000)
  }
})
