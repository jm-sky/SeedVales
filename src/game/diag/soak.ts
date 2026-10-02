/**
 * Soak verification (verify--001): samples the simulation every few gameplay seconds and checks NPC-life
 * invariants — alive, eating/drinking/sleeping, not stuck — plus, from the sim event log / conservation ledger
 * (step 1): conservation of every item and of money, economy health, hearths lit by day, output-based
 * "working" per profession, tick time and heap growth. Thresholds live in `SOAK_LIMITS` with their reasons.
 * @domain diag
 */
import type { EventLog } from '../sim/eventLog'
import type { Sim } from '../sim/sim'
import type { Human } from '../sim/types'
import { itemDef } from '../data/items'
import { ledgerBalance, logEvent, moneyBalance, settlementStock } from '../sim/eventLog'
import { isSettlementHearth } from '../sim/fire'
import { qualityMult } from '../sim/inventory'
import { houseOf } from '../sim/npc/queries'
import { SMITH_STOCK_CAP, smithStock } from '../sim/npc/works'
import { isNight } from '../sim/time'
import { buyPrice, sellPrice, tradeInventory } from '../sim/trade'
import { perf } from './perf'

/** Gameplay seconds per game day (REAL_SECONDS_PER_DAY). */
export const DAY_S = 3600

/** Goals during which standing still is normal. */
const STATIONARY_OK = new Set(['drink', 'eat', 'fight', 'help', 'idle', 'repair', 'shelter', 'sleep', 'social', 'surplus', 'tend_fire', 'wait', 'work'])
/** Stationary this long (gameplay s) while walking somewhere (`goto` step) = stuck. */
export const STUCK_S = 90

/**
 * Invariant thresholds (verify--001 step 3). Never loosen one to hide a violation (CLAUDE.md); a change needs
 * the reason in docs/plans/verify--001 "Progress".
 */
export const SOAK_LIMITS = {
  /** Item/money balance tolerance: quantities and coins are integers, freshness is not counted, so exactly 0. */
  conservationTolerance: 0,
  /** A treasury above this multiple of its starting value is a runaway (taxes recirculate, nothing mints). */
  treasuryMaxMult: 10,
  /** A treasury that starts > 0 and sits at 0 this many day-closes in a row is a drain. */
  treasuryDrainDays: 3,
  /** Share of day-time samples a settlement hearth must be lit (survival--001, guard duty). */
  hearthLitMin: 0.9,
  /** D-PERF budget for `sim.tick` (docs/state/PERF.md): p95 over the whole run, ms. */
  tickP95Ms: 4,
  /** Heap growth over the run (MB, Node `heapUsed`, measured after day 1 so the log ring is already full); calibrated, see plan. */
  heapGrowthMB: 40,
  /** Share of days a profession must produce output (world-wide per profession). */
  workDayShare: 0.8,
  /** Goods every settlement warehouse must not run out of for this many day-closes in a row. */
  essentialZeroDays: 2,
} as const

/** Warehouse goods: food (bread, grain) and fuel (log, branch — the hearths burn them). */
/**
 * Professions whose cycle is longer than a day: output is required at least once in every window of this many days
 * (trader: a caravan round trip is ~2.5-4 game days on the 3.6-4.3 km roads, departures only on even days; small
 * settlements have no caravan at all, so the profession-wide count is carried by the MD/LG traders).
 */
export const PROFESSION_CYCLE_DAYS: Record<string, number> = { trader: 6 }

export const ESSENTIAL_GOODS: Record<string, string[]> = { food: ['bread', 'grain'], fuel: ['log', 'branch'] }

/**
 * What counts as a profession's output on a day: produced items (by ledger source) or work acts (item ''). Defined
 * before looking at results; see the plan "Progress" for the reasoning per profession.
 */
export const PROFESSION_OUTPUT: Record<string, (item: string, source: string) => boolean> = {
  farmer: (_i, src) => src === 'harvest' || src === 'tend_field' || src === 'water_field',
  woodcutter: (_i, src) => src === 'fell_tree',
  hunter: (_i, src) => src === 'butcher' || src === 'drying' || src === 'fletch',
  shepherd: (_i, src) => src === 'shear' || src === 'herd' || src === 'fill_trough',
  herbalist: (i, src) => src === 'herb_garden' || (src === 'gather' && !!itemDef(i).herb),
  blacksmith: (_i, src) => src === 'forge_stock' || src === 'forge_order' || src === 'smelt',
  trader: (_i, src) => src === 'caravan_trade' || src === 'sale',
  guard: (_i, src) => src === 'light_torch' || src === 'douse_torch' || src === 'feed_fire' || src === 'look',
}

interface NpcTrack {
  x: number
  z: number
  still: number
  hunger: number
  thirst: number
  vigor: number
  dead: boolean
  /** Per day flags: ate / drank / slept, work samples, total samples. */
  day: number
  ate: boolean
  drank: boolean
  slept: boolean
  work: number
  samples: number
  stuckFlagged: boolean
}

export interface DayRow {
  day: number
  alive: number
  deaths: number
  /** Share of adult non-companion NPCs that ate / drank / slept during the day. */
  ate: number
  drank: number
  slept: number
  /** Work-goal samples per profession (share of samples). */
  workShare: Record<string, number>
  minHunger: number
  minThirst: number
  treasury: number
  /** Output units per profession (PROFESSION_OUTPUT). */
  output: Record<string, number>
  /** Lowest share of day-time samples a settlement hearth was lit during the day (1 when no day samples). */
  hearthLit: number
  /** Heap in use at the end of the day (MB; 0 when unavailable). */
  heapMB: number
}

export interface Violation {
  invariant: string
  day: number
  detail: string
}

export interface SoakReport {
  seed: number
  days: number
  rows: DayRow[]
  violations: Violation[]
  /** Non-violating notes (combat deaths). */
  info: string[]
  /** Ledger residuals (item → produced - consumed - Δstock) at the end; empty when balanced. */
  residuals: Record<string, number>
  /** Money: start, end, minted. */
  money: { start: number; now: number; minted: number }
  /** Whole-run `sim.tick` timing (ms). */
  tick: { samples: number; median: number; p95: number; p99: number; max: number }
  /** Per settlement: share of day-time samples the hearth was lit. */
  hearthShare: Record<string, number>
  /** Heap growth after day 1 (MB). */
  heapGrowthMB: number
  /** Share of days with output > 0 per profession (PROFESSION_OUTPUT). */
  workDays: Record<string, number>
  /** Event log entries kept / dropped by ring wrap. */
  log: { size: number; dropped: number }
}

const isLiving = (h: Human) => !h.vitals.dead && h.age !== 'child' && !h.companion

export class SoakRecorder {
  private tracks = new Map<number, NpcTrack>()
  private rows: DayRow[] = []
  readonly violations: Violation[] = []
  private deaths: { text: string; needs: boolean }[] = []
  /** Deaths in fights/injury: reported, not a violation (the world is not calm: wolves exist). */
  readonly info: string[] = []
  private day = 0
  private dayStartDead = 0
  private workByProf = new Map<string, { work: number; n: number }>()
  private minHunger = 100
  private minThirst = 100
  private lastT = 0
  private seenDead = new Set<number>()

  private sim: Sim
  private seed: number
  private log: EventLog
  /** Per settlement: day-time hearth samples (lit / total), whole run and current day. */
  private hearth = new Map<number, { lit: number; n: number; dayLit: number; dayN: number }>()
  private conservationFlagged = new Set<string>()
  /** Treasury per settlement: start value, consecutive day-closes at 0. */
  private treasury0: number[]
  private zeroDays: number[]
  /** Essential goods: `<settlement>:<group>` → consecutive day-closes at zero. */
  private essentialZero = new Map<string, number>()
  private heapDay1 = 0
  private heapPeak = 0

  /** Heap in MB after a GC; injected by Node callers (this module has no Node types). */
  private heapProbe?: () => number

  /** Enforce the tick-time budget (off in the vitest variant, D-VERIFY-1). */
  private readonly timing: boolean

  constructor(sim: Sim, seed: number, opts: { heapMB?: () => number; timing?: boolean } = {}) {
    this.sim = sim
    this.timing = opts.timing ?? true
    this.heapProbe = opts.heapMB
    this.seed = seed
    this.dayStartDead = sim.state.npcs.filter((n) => n.vitals.dead).length
    this.log = sim.eventLog ?? sim.enableEventLog()
    this.treasury0 = sim.state.settlements.map((s) => s.treasury)
    this.zeroDays = sim.state.settlements.map(() => 0)
    perf.reset()
  }

  /** Call every `sampleS` gameplay seconds of simulated time. */
  sample(playS: number) {
    const dt = Math.max(0.001, playS - this.lastT)
    this.lastT = playS
    const day = Math.floor((playS - 1e-6) / DAY_S)
    if (day !== this.day) {
      this.closeDay()
      this.day = day
    }
    this.sampleHearths()
    for (const n of this.sim.state.npcs) {
      if (n.vitals.dead && !this.seenDead.has(n.id)) {
        this.seenDead.add(n.id)
        const v = n.vitals
        const parts = Object.entries(v.parts).filter(([, d]) => d > 0).map(([k, d]) => `${k} ${d.toFixed(0)}`).join(', ')
        this.deaths.push({ needs: v.hunger <= 0 || v.thirst <= 0, text: `${n.name} (#${n.id}, ${n.profession ?? 'none'}, ${n.age}) day ${day}: hunger ${v.hunger.toFixed(0)}, thirst ${v.thirst.toFixed(0)}, vigor ${v.vigor.toFixed(0)}, bleeding ${v.bleeding.toFixed(1)}, illness ${v.illness?.kind ?? 'none'}, damage [${parts}], last goal ${n.ai.goal} "${n.ai.label}" at (${n.x.toFixed(0)}, ${n.z.toFixed(0)})` })
      }
      if (!isLiving(n)) continue
      let t = this.tracks.get(n.id)
      if (!t) {
        t = { x: n.x, z: n.z, still: 0, hunger: n.vitals.hunger, thirst: n.vitals.thirst, vigor: n.vitals.vigor, dead: false, day, ate: false, drank: false, slept: false, work: 0, samples: 0, stuckFlagged: false }
        this.tracks.set(n.id, t)
      }
      if (t.day !== day) Object.assign(t, { day, ate: false, drank: false, slept: false, work: 0, samples: 0 })
      const v = n.vitals
      if (v.hunger > t.hunger + 5) t.ate = true
      if (v.thirst > t.thirst + 5) t.drank = true
      if (v.vigor > t.vigor + 10 || n.ai.goal === 'sleep') t.slept = true
      t.hunger = v.hunger
      t.thirst = v.thirst
      t.vigor = v.vigor
      this.minHunger = Math.min(this.minHunger, v.hunger)
      this.minThirst = Math.min(this.minThirst, v.thirst)
      t.samples++
      if (n.ai.goal === 'work') t.work++
      if (n.profession) {
        const w = this.workByProf.get(n.profession) ?? { work: 0, n: 0 }
        w.n++
        if (n.ai.goal === 'work') w.work++
        this.workByProf.set(n.profession, w)
      }
      // Stuck: not moving while a goto step is active.
      const moved = Math.hypot(n.x - t.x, n.z - t.z) > 0.5
      const walking = n.ai.goal !== null && n.ai.steps[n.ai.stepIdx]?.op === 'goto' && !STATIONARY_OK.has(n.ai.goal)
      if (moved || !walking) t.still = 0
      else t.still += dt
      t.x = n.x
      t.z = n.z
      if (t.still >= STUCK_S && !t.stuckFlagged) {
        t.stuckFlagged = true
        logEvent('stuck', { goal: n.ai.goal ?? undefined, label: n.ai.label, x: Math.round(n.x), z: Math.round(n.z), s: Math.round(t.still) }, n.id, n.settlementId)
        this.violations.push({ invariant: 'not-stuck', day, detail: `${n.name} (#${n.id}, ${n.profession ?? 'none'}) stands still ${Math.round(t.still)} s while going somewhere: goal ${n.ai.goal} "${n.ai.label}" at (${n.x.toFixed(0)}, ${n.z.toFixed(0)})` })
      }
      if (t.still === 0) t.stuckFlagged = false
    }
  }

  private closeDay() {
    const living = this.sim.state.npcs.filter(isLiving)
    const share = (f: (t: NpcTrack) => boolean) => {
      const ts = living.map((n) => this.tracks.get(n.id)).filter((t): t is NpcTrack => !!t && t.samples > 0)
      return ts.length ? ts.filter(f).length / ts.length : 1
    }
    const dead = this.sim.state.npcs.filter((n) => n.vitals.dead).length
    const workShare: Record<string, number> = {}
    for (const [p, w] of this.workByProf) workShare[p] = w.n ? w.work / w.n : 0
    const row: DayRow = {
      day: this.day,
      alive: living.length,
      deaths: dead - this.dayStartDead,
      ate: share((t) => t.ate),
      drank: share((t) => t.drank),
      slept: share((t) => t.slept),
      workShare,
      minHunger: this.minHunger,
      minThirst: this.minThirst,
      treasury: this.sim.state.settlements.reduce((a, s) => a + s.treasury, 0),
      output: this.dayOutput(this.day),
      hearthLit: this.dayHearthShare(),
      heapMB: this.heapMB(),
    }
    this.rows.push(row)
    this.dayStartDead = dead
    this.workByProf.clear()
    this.minHunger = 100
    this.minThirst = 100
    this.check(row)
    this.checkConservation(row.day)
    this.checkEconomy(row.day)
  }

  private heapMB(): number {
    const mem = this.heapProbe?.() ?? 0
    this.heapPeak = Math.max(this.heapPeak, mem)
    if (this.rows.length === 0) this.heapDay1 = mem // measured at the close of day 0 (this row is pushed after)
    return mem
  }

  private sampleHearths() {
    if (isNight(this.sim.state.time.cal)) return
    for (const b of this.sim.state.buildings) {
      if (!isSettlementHearth(b)) continue
      let h = this.hearth.get(b.settlementId)
      if (!h) this.hearth.set(b.settlementId, (h = { lit: 0, n: 0, dayLit: 0, dayN: 0 }))
      h.n++
      h.dayN++
      if (b.lit && (b.fuel ?? 0) > 0) {
        h.lit++
        h.dayLit++
      }
    }
  }

  /** Every living smith's store is at the stock cap: forging stops by design (nobody buys the tools). */
  private smithsSaturated(): boolean {
    const smiths = this.sim.state.npcs.filter((n) => n.profession === 'blacksmith' && !n.vitals.dead)
    return smiths.length > 0 && smiths.every((n) => smithStock(houseOf(this.sim, n)?.inv ?? { items: [] }) >= SMITH_STOCK_CAP)
  }

  /** Lowest day-time lit share over settlements for the day just ended; resets the per-day counters. */
  private dayHearthShare(): number {
    let min = 1
    for (const h of this.hearth.values()) {
      if (h.dayN > 0) min = Math.min(min, h.dayLit / h.dayN)
      h.dayLit = 0
      h.dayN = 0
    }
    return min
  }

  private dayOutput(day: number): Record<string, number> {
    const out: Record<string, number> = {}
    for (const [p, pred] of Object.entries(PROFESSION_OUTPUT)) out[p] = this.log.outputPerDay(day, p, pred)
    return out
  }

  /** produced - consumed - Δstock = 0 per item, and money moved only (plus coins found). First day a residual appears is reported. */
  private checkConservation(day: number) {
    const tol = SOAK_LIMITS.conservationTolerance
    for (const r of ledgerBalance(this.sim, this.log)) {
      if (Math.abs(r.residual) <= tol || this.conservationFlagged.has(r.item)) continue
      this.conservationFlagged.add(r.item)
      const first = this.log.find((e) => (e.kind === 'produce' || e.kind === 'consume') && e.data.item === r.item, 3).map((e) => `#${e.id}`).join(', ')
      this.violations.push({ invariant: 'conservation', day, detail: `${r.item}: produced ${r.produced} - consumed ${r.consumed} - Δstock ${r.stock1 - r.stock0} = ${r.residual} (first ${r.item} events ${first || 'dropped from the ring'})` })
    }
    const m = moneyBalance(this.sim, this.log)
    if (Math.abs(m.residual) > tol && !this.conservationFlagged.has('$money')) {
      this.conservationFlagged.add('$money')
      this.violations.push({ invariant: 'conservation', day, detail: `money: start ${m.start}, now ${m.now}, minted ${m.minted} → residual ${m.residual}` })
    }
  }

  private checkEconomy(day: number) {
    const v = (invariant: string, detail: string) => this.violations.push({ invariant, day, detail })
    const sts = this.sim.state.settlements
    for (const st of sts) {
      const t0 = this.treasury0[st.id]!
      if (st.treasury < 0) v('economy', `${this.sim.world.settlements[st.id]!.name}: negative treasury ${st.treasury}`)
      if (t0 > 0 && st.treasury > t0 * SOAK_LIMITS.treasuryMaxMult) v('economy', `${this.sim.world.settlements[st.id]!.name}: treasury ${st.treasury} > ${SOAK_LIMITS.treasuryMaxMult}x start (${t0}) — runaway`)
      this.zeroDays[st.id] = st.treasury <= 0 ? this.zeroDays[st.id]! + 1 : 0
      if (t0 > 0 && this.zeroDays[st.id] === SOAK_LIMITS.treasuryDrainDays) v('economy', `${this.sim.world.settlements[st.id]!.name}: treasury at 0 for ${SOAK_LIMITS.treasuryDrainDays} days in a row (start ${t0}) — drained`)
      // Essential goods in the settlement's stores.
      for (const [group, ids] of Object.entries(ESSENTIAL_GOODS)) {
        const key = `${st.id}:${group}`
        const have = ids.reduce((a, id) => a + settlementStock(this.sim, st.id, id), 0)
        const z = have > 0 ? 0 : (this.essentialZero.get(key) ?? 0) + 1
        this.essentialZero.set(key, z)
        if (z === SOAK_LIMITS.essentialZeroDays) v('economy', `${this.sim.world.settlements[st.id]!.name}: no ${group} (${ids.join('/')}) in any store for ${z} days in a row`)
      }
    }
    // Prices (dynamic: scarcity, mood, skill) stay inside the formula's envelope and reselling never pays.
    for (const n of this.sim.state.npcs) {
      if (n.profession !== 'trader' || n.vitals.dead) continue
      for (const s of tradeInventory(this.sim, n).items.slice(0, 12)) {
        const base = itemDef(s.id).price
        if (base <= 0) continue
        const buy = buyPrice(this.sim, n, s)
        const sell = sellPrice(this.sim, n, s)
        if (buy < 1 || buy > Math.ceil(base * qualityMult(s) * 1.15 * 1.8) || sell > buy || sell < 0) v('economy', `price of ${s.id} at ${n.name}: buy ${buy}, sell ${sell}, base ${base} out of bounds`)
      }
    }
  }

  private check(r: DayRow) {
    const v = (invariant: string, detail: string) => this.violations.push({ invariant, day: r.day, detail })
    const died = this.deaths.splice(0)
    for (const d of died) {
      if (d.needs) v('alive', `died of hunger/thirst on day ${r.day}: ${d.text}`)
      else this.info.push(`day ${r.day}: ${d.text}`)
    }
    if (r.day >= 1) {
      if (r.ate < 0.8) v('eating', `only ${(r.ate * 100).toFixed(0)} % of NPCs ate on day ${r.day}`)
      if (r.drank < 0.8) v('drinking', `only ${(r.drank * 100).toFixed(0)} % of NPCs drank on day ${r.day}`)
      if (r.slept < 0.8) v('sleeping', `only ${(r.slept * 100).toFixed(0)} % of NPCs slept on day ${r.day}`)
      for (const [p, s] of Object.entries(r.workShare)) if (s === 0) v('working', `profession ${p} never worked on day ${r.day}`)
    }
    if (r.treasury < 0) v('economy', `negative treasury sum ${r.treasury} on day ${r.day}`)
  }

  finish(): SoakReport {
    this.closeDay()
    const v = (invariant: string, detail: string) => this.violations.push({ invariant, day: this.rows.length - 1, detail })
    const residuals: Record<string, number> = {}
    for (const r of ledgerBalance(this.sim, this.log)) if (r.residual !== 0) residuals[r.item] = r.residual
    const m = moneyBalance(this.sim, this.log)
    // Working: output per profession on >= 80 % of days (professions that exist in the world).
    const workDays: Record<string, number> = {}
    const professions = new Set(this.sim.state.npcs.filter((n) => n.profession).map((n) => n.profession!))
    for (const p of professions) {
      const pred = PROFESSION_OUTPUT[p]
      if (!pred) continue
      const days = this.rows.filter((r) => (r.output[p] ?? 0) > 0).length
      workDays[p] = this.rows.length ? days / this.rows.length : 1
      const cycle = PROFESSION_CYCLE_DAYS[p]
      if (cycle) {
        for (let d0 = 0; d0 + cycle <= this.rows.length; d0++) {
          if (!this.rows.slice(d0, d0 + cycle).some((r) => (r.output[p] ?? 0) > 0)) {
            v('working-output', `profession ${p}: no output on days ${d0}-${d0 + cycle - 1} (cycle window ${cycle} days)`)
            break
          }
        }
      } else if (p === 'blacksmith' && this.smithsSaturated()) {
        this.info.push(`blacksmith: output on ${days}/${this.rows.length} days; every smith's store holds ≥ ${SMITH_STOCK_CAP} tools, so forging stops by design (no demand) — exempt from the day share`)
      } else if (this.rows.length >= 3 && workDays[p]! < SOAK_LIMITS.workDayShare) {
        v('working-output', `profession ${p} produced output on only ${days}/${this.rows.length} days (${(workDays[p]! * 100).toFixed(0)} % < ${SOAK_LIMITS.workDayShare * 100} %)`)
      }
    }
    // Fire: each settlement's hearth lit >= 90 % of day-time samples.
    const hearthShare: Record<string, number> = {}
    for (const [sid, h] of this.hearth) {
      const share = h.n ? h.lit / h.n : 1
      hearthShare[this.sim.world.settlements[sid]!.name] = share
      if (share < SOAK_LIMITS.hearthLitMin) v('fire', `${this.sim.world.settlements[sid]!.name}: hearth lit only ${(share * 100).toFixed(0)} % of day-time samples (< ${SOAK_LIMITS.hearthLitMin * 100} %)`)
    }
    // Perf: sim.tick p95 over the whole run, heap growth after day 1.
    const t = perf.report().timers.find((x) => x.name === 'sim.tick')
    const tick = { samples: t?.samples ?? 0, median: t?.median ?? 0, p95: t?.p95 ?? 0, p99: t?.p99 ?? 0, max: t?.max ?? 0 }
    // Wall-clock timing is a verdict only in a dedicated run (`pnpm soak`); inside vitest the workers share the CPU (D-VERIFY-1).
    if (this.timing && tick.p95 > SOAK_LIMITS.tickP95Ms) v('perf', `sim.tick p95 ${tick.p95.toFixed(2)} ms > budget ${SOAK_LIMITS.tickP95Ms} ms`)
    const heapGrowthMB = this.heapDay1 ? this.heapPeak - this.heapDay1 : 0
    if (heapGrowthMB > SOAK_LIMITS.heapGrowthMB) v('perf', `heap grew ${heapGrowthMB.toFixed(0)} MB after day 1 (> ${SOAK_LIMITS.heapGrowthMB} MB)`)
    return {
      seed: this.seed,
      days: this.rows.length,
      rows: this.rows,
      violations: this.violations,
      info: this.info,
      residuals,
      money: { start: m.start, now: m.now, minted: m.minted },
      tick,
      hearthShare,
      heapGrowthMB,
      workDays,
      log: { size: this.log.size, dropped: this.log.dropped },
    }
  }
}

/** Markdown summary of a report (per-day table + invariant numbers + violations). */
export function soakMarkdown(r: SoakReport): string {
  const pct = (x: number) => `${Math.round(x * 100)}%`
  const profs = [...new Set(r.rows.flatMap((d) => Object.keys(d.output)))].sort()
  const lines = [`## Seed ${r.seed} — ${r.days} days`, '', `| day | alive | deaths | ate | drank | slept | treasury | hearth lit | heap MB | ${profs.join(' | ')} |`, `|${'---:|'.repeat(9 + profs.length)}`]
  for (const d of r.rows) lines.push(`| ${d.day} | ${d.alive} | ${d.deaths} | ${pct(d.ate)} | ${pct(d.drank)} | ${pct(d.slept)} | ${d.treasury} | ${pct(d.hearthLit)} | ${d.heapMB.toFixed(0)} | ${profs.map((p) => d.output[p] ?? 0).join(' | ')} |`)
  lines.push('', '(profession columns: output units that day, see PROFESSION_OUTPUT)')
  const wprofs = [...new Set(r.rows.flatMap((d) => Object.keys(d.workShare)))].sort()
  lines.push('', 'Work-goal share per profession (mean over days, info): ' + wprofs.map((p) => `${p} ${pct(r.rows.reduce((a, d) => a + (d.workShare[p] ?? 0), 0) / Math.max(1, r.rows.length))}`).join(' · '))
  lines.push('', 'Days with output per profession: ' + Object.entries(r.workDays).map(([p, x]) => `${p} ${pct(x)}`).join(' · '))
  lines.push('', 'Hearth lit by day per settlement: ' + Object.entries(r.hearthShare).map(([n, x]) => `${n} ${pct(x)}`).join(' · '))
  lines.push('', `Conservation: ${Object.keys(r.residuals).length ? 'residuals ' + JSON.stringify(r.residuals) : 'all items balanced'}; money ${r.money.start} → ${r.money.now} (minted ${r.money.minted}).`)
  lines.push('', `sim.tick: median ${r.tick.median.toFixed(2)} · p95 ${r.tick.p95.toFixed(2)} · p99 ${r.tick.p99.toFixed(2)} · max ${r.tick.max.toFixed(1)} ms (${r.tick.samples} samples); heap growth after day 0: ${r.heapGrowthMB.toFixed(0)} MB; log ${r.log.size} kept / ${r.log.dropped} dropped.`)
  lines.push('', r.violations.length ? `**${r.violations.length} violation(s):**` : '**No violations.**', '')
  for (const v of r.violations.slice(0, 60)) lines.push(`- \`${v.invariant}\` day ${v.day}: ${v.detail}`)
  if (r.violations.length > 60) lines.push(`- … ${r.violations.length - 60} more`)
  if (r.info.length) lines.push('', `Info (${r.info.length}):`, ...r.info.map((i) => `- ${i}`))
  return lines.join('\n') + '\n'
}
