/**
 * Generator contracts over a seed corpus (review 013 M-05, M-07; audit C).
 * Worlds come from `testWorld` (shared on-disk world cache; a cold run generates ~2 s per seed).
 *  - M-07: every settlement size the generator can produce has a size contract (required structures,
 *    household counts); `SettlementSize` has exactly SM/MD/LG (no tier without generator + content).
 *  - M-05: the route band stays soft (best candidate is accepted when none is in band) but is a measured
 *    contract: bounded miss rate and miss distance over the corpus.
 */
import { describe, expect, it } from 'vitest'
import type { SettlementSize } from '../types'
import { DAY_MARCH_M, TREASURY_START } from '../../config/calibration'
import { testWorld } from '../../sim/testWorld'
import { LG_BAND, LG_TARGET, ROUTE_BAND } from './centres'
import { HOUSEHOLDS_BY_SIZE } from './settlements'

/** Corpus: seeds 1..24 (the soak/e2e seed 1337 is covered by the other generator tests). */
const CORPUS = Array.from({ length: 24 }, (_, i) => i + 1)

const SIZES: SettlementSize[] = ['SM', 'MD', 'LG']

/** Structures every settlement of a size must have (besides what its households need — see generate.seeds.test.ts). */
const REQUIRED: Record<SettlementSize, { has: string[]; hasNot: string[] }> = {
  SM: { has: ['campfire', 'well', 'noticeboard', 'warehouse'], hasNot: ['inn', 'market'] },
  MD: { has: ['campfire', 'well', 'noticeboard', 'warehouse', 'market', 'inn'], hasNot: [] },
  LG: { has: ['campfire', 'well', 'noticeboard', 'warehouse', 'market', 'inn'], hasNot: [] },
}

/**
 * Route-band contract (M-05). Measured over seeds 1..40 at the time of writing: 0 legs outside the band
 * (home leg 0.876–1.141 of the day march, LG leg 0.742–1.288 of its target), so the limits below leave
 * headroom but would catch a drift: at most 5 % of legs may miss, and a miss may overshoot the band edge
 * by at most 15 % of that edge.
 */
const MAX_MISS_RATE = 0.05
const MAX_MISS_OVERSHOOT = 0.15

describe('world generation contracts (M-07, M-05)', () => {
  it('M-07: SettlementSize tables cover exactly SM/MD/LG', () => {
    expect(Object.keys(HOUSEHOLDS_BY_SIZE).sort()).toEqual([...SIZES].sort())
    expect(Object.keys(TREASURY_START).sort()).toEqual([...SIZES].sort())
    for (const s of SIZES) expect(HOUSEHOLDS_BY_SIZE[s].length).toBeGreaterThan(0)
  })

  it('M-07: every generated settlement meets its size contract (structures, inn/market rules, household count)', () => {
    const problems: string[] = []
    const seenSizes = new Set<string>()
    for (const seed of CORPUS) {
      const w = testWorld(seed)
      for (const s of w.settlements) {
        seenSizes.add(s.size)
        if (!SIZES.includes(s.size)) {
          problems.push(`seed ${seed}: unknown size ${s.size}`)
          continue
        }
        const kinds = new Map<string, number>()
        for (const st of w.structures) if (st.settlementId === s.id) kinds.set(st.kind, (kinds.get(st.kind) ?? 0) + 1)
        for (const k of REQUIRED[s.size].has) if (!kinds.get(k)) problems.push(`seed ${seed} ${s.size}: missing ${k}`)
        for (const k of REQUIRED[s.size].hasNot) if (kinds.get(k)) problems.push(`seed ${seed} ${s.size}: unexpected ${k}`)
        if (s.households.length !== HOUSEHOLDS_BY_SIZE[s.size].length) problems.push(`seed ${seed} ${s.size}: ${s.households.length} households, expected ${HOUSEHOLDS_BY_SIZE[s.size].length}`)
        if (kinds.get('house') !== s.households.length) problems.push(`seed ${seed} ${s.size}: ${kinds.get('house')} houses for ${s.households.length} households`)
      }
    }
    expect(problems).toEqual([])
    expect([...seenSizes].sort()).toEqual([...SIZES].sort())
  }, 600_000)

  it('M-05: route-band misses stay rare and small over the seed corpus (soft band, measured contract)', () => {
    const legs: { seed: number; leg: string; ratio: number; lo: number; hi: number }[] = []
    for (const seed of CORPUS) {
      const w = testWorld(seed)
      const home = w.roads.find((r) => r.from === 0 && r.to === 1)
      const far = w.roads.find((r) => r.from === 1 && r.to === 2)
      expect(home, `seed ${seed} home road`).toBeDefined()
      expect(far, `seed ${seed} second road`).toBeDefined()
      legs.push({ seed, leg: 'home→MD', ratio: home!.length / DAY_MARCH_M, lo: ROUTE_BAND[0], hi: ROUTE_BAND[1] })
      legs.push({ seed, leg: 'MD→LG', ratio: far!.length / (DAY_MARCH_M * LG_TARGET), lo: LG_BAND[0], hi: LG_BAND[1] })
    }
    const misses = legs.filter((l) => l.ratio < l.lo || l.ratio > l.hi)
    const overshoot = (l: (typeof legs)[number]) => (l.ratio < l.lo ? (l.lo - l.ratio) / l.lo : (l.ratio - l.hi) / l.hi)
    expect(misses.length / legs.length, `misses: ${JSON.stringify(misses)}`).toBeLessThanOrEqual(MAX_MISS_RATE)
    for (const m of misses) expect(overshoot(m), `seed ${m.seed} ${m.leg} ratio ${m.ratio.toFixed(3)}`).toBeLessThanOrEqual(MAX_MISS_OVERSHOOT)
  }, 600_000)
})
