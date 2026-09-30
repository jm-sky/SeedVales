/**
 * Shared lightweight diagnostics: timers with bounded ring buffers, gauges and counters.
 * CPU timings only (performance.now). GPU time is NOT measured here — see render/gpuTimer.
 * @domain diag
 */

const RING = 512

export interface MetricSummary {
  name: string
  samples: number
  median: number
  p95: number
  p99: number
  max: number
  mean: number
  budget?: number
  overBudget: number
}

class Timer {
  buf = new Float32Array(RING)
  idx = 0
  count = 0
  overBudget = 0
  total = 0
  name: string
  budget?: number
  constructor(name: string, budget?: number) {
    this.name = name
    this.budget = budget
  }

  push(v: number) {
    this.buf[this.idx] = v
    this.idx = (this.idx + 1) % RING
    this.count++
    this.total += v
    if (this.budget !== undefined && v > this.budget) this.overBudget++
  }

  summary(): MetricSummary {
    const n = Math.min(this.count, RING)
    const arr = Array.from(this.buf.subarray(0, n)).sort((a, b) => a - b)
    const q = (p: number) => (n ? arr[Math.min(n - 1, Math.floor(p * n))]! : 0)
    return {
      name: this.name,
      samples: this.count,
      median: q(0.5),
      p95: q(0.95),
      p99: q(0.99),
      max: n ? arr[n - 1]! : 0,
      mean: this.count ? this.total / this.count : 0,
      budget: this.budget,
      overBudget: this.overBudget,
    }
  }
}

class Perf {
  enabled = true
  /** Systems for which detailed (per-subsystem) timing is on. */
  detailed = new Set<string>()
  private timers = new Map<string, Timer>()
  private gauges = new Map<string, number>()
  private counters = new Map<string, number>()
  private open = new Map<string, number>()

  setBudget(name: string, ms: number) {
    this.timer(name).budget = ms
  }

  private timer(name: string) {
    let t = this.timers.get(name)
    if (!t) {
      t = new Timer(name)
      this.timers.set(name, t)
    }
    return t
  }

  begin(name: string) {
    if (this.enabled) this.open.set(name, performance.now())
  }

  end(name: string) {
    if (!this.enabled) return
    const s = this.open.get(name)
    if (s !== undefined) this.timer(name).push(performance.now() - s)
  }

  record(name: string, ms: number) {
    if (this.enabled) this.timer(name).push(ms)
  }

  measure<T>(name: string, fn: () => T): T {
    if (!this.enabled) return fn()
    const s = performance.now()
    try {
      return fn()
    } finally {
      this.timer(name).push(performance.now() - s)
    }
  }

  /** Detailed timing, only when the subsystem prefix is enabled. */
  detail<T>(name: string, fn: () => T): T {
    const prefix = name.split('.')[0]!
    return this.detailed.has(prefix) || this.detailed.has('*') ? this.measure(name, fn) : fn()
  }

  gauge(name: string, value: number) {
    this.gauges.set(name, value)
  }

  count(name: string, n = 1) {
    this.counters.set(name, (this.counters.get(name) ?? 0) + n)
  }

  reset() {
    this.timers.forEach((t, k) => this.timers.set(k, new Timer(k, t.budget)))
    this.counters.clear()
  }

  report() {
    return {
      timers: [...this.timers.values()].map((t) => t.summary()),
      gauges: Object.fromEntries(this.gauges),
      counters: Object.fromEntries(this.counters),
    }
  }
}

export const perf = new Perf()

/** Initial budgets (ms, CPU). Rationale in docs/design/DECISIONS.md (D-PERF). */
perf.setBudget('frame', 33.3)
perf.setBudget('sim.tick', 4)
perf.setBudget('render.cpu', 10)
perf.setBudget('chunks.build', 8)
