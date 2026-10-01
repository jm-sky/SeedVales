/**
 * Shared lightweight diagnostics: timers (whole-run log histograms), gauges and counters.
 * CPU timings (performance.now). GPU time comes from render/gpuTimer when the browser exposes
 * EXT_disjoint_timer_query_webgl2 (recorded as `gpu.frame`); otherwise there is no GPU data.
 * @domain diag
 */

/**
 * Quantiles come from a log-bucket histogram of the whole run (since the last reset), so median/p95/p99,
 * max, mean and overBudget all describe the same window (PERF-02). Bucket width 2% → quantile error ≤ 2%.
 * Percentiles use the nearest-rank convention: pN = the ⌈N/100 · n⌉-th smallest sample (clamped to the
 * observed min/max), so with few samples p95 is not automatically the max. Shares above the frame-pacing
 * thresholds (16.7 / 33.3 / 50 ms) are counted exactly; other thresholds are bucket-approximate.
 */
const FRAME_THRESHOLDS = [16.7, 33.3, 50] as const
const H_MIN = 1e-3
const H_STEP = Math.log(1.02)
const H_BUCKETS = Math.ceil(Math.log(1e5 / H_MIN) / H_STEP) + 1

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

const bucketOf = (v: number) => (v <= H_MIN ? 0 : Math.min(H_BUCKETS - 1, Math.floor(Math.log(v / H_MIN) / H_STEP) + 1))
/** Representative value of a bucket (geometric middle). */
const bucketValue = (i: number) => (i === 0 ? 0 : H_MIN * Math.exp((i - 0.5) * H_STEP))

class Timer {
  hist = new Uint32Array(H_BUCKETS)
  count = 0
  overBudget = 0
  total = 0
  max = 0
  min = Infinity
  /** Exact counts of samples strictly above FRAME_THRESHOLDS. */
  above = new Uint32Array(FRAME_THRESHOLDS.length)
  name: string
  budget?: number
  constructor(name: string, budget?: number) {
    this.name = name
    this.budget = budget
  }

  push(v: number) {
    this.hist[bucketOf(v)]!++
    this.count++
    this.total += v
    if (v > this.max) this.max = v
    if (v < this.min) this.min = v
    for (let i = 0; i < FRAME_THRESHOLDS.length; i++) if (v > FRAME_THRESHOLDS[i]!) this.above[i]!++
    if (this.budget !== undefined && v > this.budget) this.overBudget++
  }

  quantile(p: number): number {
    if (!this.count) return 0
    // Nearest rank (zero-based index ⌈p·n⌉ − 1).
    const target = Math.min(this.count - 1, Math.max(0, Math.ceil(p * this.count) - 1))
    let acc = 0
    for (let i = 0; i < H_BUCKETS; i++) {
      acc += this.hist[i]!
      if (acc > target) return Math.max(this.min, Math.min(this.max, bucketValue(i)))
    }
    return this.max
  }

  /**
   * Share of samples strictly above `ms`: exact for FRAME_THRESHOLDS, otherwise bucket-approximate and
   * conservative (the bucket containing `ms` counts as above).
   */
  shareAbove(ms: number): number {
    if (!this.count) return 0
    const k = FRAME_THRESHOLDS.indexOf(ms as (typeof FRAME_THRESHOLDS)[number])
    if (k >= 0) return this.above[k]! / this.count
    let n = 0
    for (let i = bucketOf(ms); i < H_BUCKETS; i++) n += this.hist[i]!
    return n / this.count
  }

  summary(): MetricSummary {
    return {
      name: this.name,
      samples: this.count,
      median: this.quantile(0.5),
      p95: this.quantile(0.95),
      p99: this.quantile(0.99),
      max: this.max,
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

  /** Share of a timer's samples above `ms` (e.g. RAF intervals over 16.7 / 33.3 / 50 ms). */
  shareAbove(name: string, ms: number): number {
    return this.timers.get(name)?.shareAbove(ms) ?? 0
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
