/**
 * PERF-02: timer summaries use one window — quantiles, max, mean and overBudget over the whole run.
 */
import { describe, expect, it } from 'vitest'
import { perf } from './perf'

describe('diag perf timers (PERF-02)', () => {
  it('PERF-02: quantiles cover the whole run (not only the last samples) within 2%', () => {
    perf.reset()
    // 900 fast samples, then 100 slow ones: p95 must see the slow tail, median the fast body.
    for (let i = 0; i < 900; i++) perf.record('t.window', 1 + (i % 10) * 0.01)
    for (let i = 0; i < 100; i++) perf.record('t.window', 40)
    // A long fast run afterwards (more than an old 512 ring) must not erase the slow tail.
    for (let i = 0; i < 2000; i++) perf.record('t.window', 1)
    const t = perf.report().timers.find((x) => x.name === 't.window')!
    expect(t.samples).toBe(3000)
    expect(t.p99).toBeGreaterThan(39 * 0.98)
    expect(t.median).toBeGreaterThan(0.98)
    expect(t.median).toBeLessThan(1.1)
    expect(t.max).toBe(40)
    expect(t.mean).toBeCloseTo((900 * 1.045 + 100 * 40 + 2000) / 3000, 2)
  })

  it('PERF-02: share of samples above a threshold (RAF pacing)', () => {
    perf.reset()
    for (let i = 0; i < 90; i++) perf.record('t.raf', 16.6)
    for (let i = 0; i < 10; i++) perf.record('t.raf', 50.5)
    expect(perf.shareAbove('t.raf', 33.3)).toBeCloseTo(0.1)
    expect(perf.shareAbove('t.raf', 17)).toBeCloseTo(0.1)
    expect(perf.shareAbove('t.raf', 10)).toBeCloseTo(1)
  })

  it('PERF-02: percentiles follow the nearest-rank convention, also for small sample counts', () => {
    const q = (vals: number[]) => {
      perf.reset()
      for (const v of vals) perf.record('t.rank', v)
      return perf.report().timers.find((x) => x.name === 't.rank')!
    }
    const one = q([7])
    expect([one.median, one.p95, one.p99, one.max]).toEqual([7, 7, 7, 7])
    const two = q([1, 9])
    expect(two.median).toBeCloseTo(1, 1)
    // 20 samples 1..20: nearest rank p95 = ceil(0.95·20) = 19th value, not the max.
    const twenty = q(Array.from({ length: 20 }, (_, i) => i + 1))
    expect(twenty.median / 10).toBeGreaterThan(0.98)
    expect(twenty.median / 10).toBeLessThan(1.02)
    expect(twenty.p95 / 19).toBeGreaterThan(0.98)
    expect(twenty.p95 / 19).toBeLessThan(1.02)
    const thousand = q(Array.from({ length: 1000 }, (_, i) => i + 1))
    expect(thousand.p99 / 990).toBeGreaterThan(0.98)
    expect(thousand.p99 / 990).toBeLessThan(1.02)
  })

  it('PERF-02: frame-pacing shares are exact at the 16.7 / 33.3 / 50 ms thresholds (same-bucket edge)', () => {
    perf.reset()
    // 33.4 shares the 2% bucket with 33.3 — must still count as above; 33.3 itself is not above.
    for (const v of [33.3, 33.4, 16.7, 16.71, 50, 50.01, 10, 10]) perf.record('t.edge', v)
    expect(perf.shareAbove('t.edge', 33.3)).toBeCloseTo(3 / 8)
    expect(perf.shareAbove('t.edge', 16.7)).toBeCloseTo(5 / 8)
    expect(perf.shareAbove('t.edge', 50)).toBeCloseTo(1 / 8)
  })
})
