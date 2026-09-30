/**
 * WORLD-04 across seeds (review #6): every seed yields ≥3 settlements, ≥2 roads and a home →
 * neighbour route within ROUTE_BAND × DAY_MARCH_M. Separate file: ~1.5 s generation per seed.
 */
import { describe, expect, it } from 'vitest'
import { DAY_MARCH_M } from '../../config/calibration'
import { ROUTE_BAND } from './centres'
import { generateWorld } from './generate'
import { HOUSEHOLDS_BY_SIZE } from './settlements'

const SEEDS = [0, 1, 2, 19, 42, 2020, 9999, 88888]

/** Structures each household profession needs to do its duty (besides house + well). */
const NEEDS: Record<string, string[]> = { blacksmith: ['anvil'], farmer: ['field', 'pen'], herbalist: ['herbgarden'], hunter: ['dryrack'], shepherd: ['pen', 'trough'], woodcutter: ['woodpile'] }

describe('world generation across seeds', () => {
  for (const seed of SEEDS) {
    it(`WORLD-04: seed ${seed} — 3 settlements, 2 roads, home route ≈ 1 day march, complete households`, () => {
      const w = generateWorld(seed)
      expect(w.settlements.length).toBeGreaterThanOrEqual(3)
      expect(w.roads.length).toBeGreaterThanOrEqual(2)
      const r0 = w.roads.find((r) => r.from === 0 && r.to === 1)!
      expect(r0.length / DAY_MARCH_M).toBeGreaterThanOrEqual(ROUTE_BAND[0])
      expect(r0.length / DAY_MARCH_M).toBeLessThanOrEqual(ROUTE_BAND[1])
      // SET-01: no household silently skipped; each has its house, well and duty structures.
      const missing: string[] = []
      for (const s of w.settlements) {
        expect(s.households.length, `${s.size} households`).toBe(HOUSEHOLDS_BY_SIZE[s.size].length)
        for (const h of s.households) {
          const kinds = new Set(w.structures.filter((st) => st.settlementId === s.id && st.householdIdx === h.idx).map((st) => st.kind as string))
          for (const k of ['house', 'well', ...(NEEDS[h.profession] ?? [])]) if (!kinds.has(k)) missing.push(`${s.size}:${h.profession}:${k}`)
        }
      }
      expect(missing).toEqual([])
    }, 20_000)
  }
})
