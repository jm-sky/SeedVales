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
})
