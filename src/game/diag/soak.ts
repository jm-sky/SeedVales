/**
 * Soak verification (verify--001): samples the simulation every few gameplay seconds and checks NPC-life
 * invariants — alive, eating/drinking/sleeping, working, not stuck, settlement treasuries sane. Snapshot based
 * (reads sim state only, no hooks in the sim); a sim event log/ledger can be added later (verify--001 step 1).
 * @domain diag
 */
import type { Sim } from '../sim/sim'
import type { Human } from '../sim/types'

/** Gameplay seconds per game day (REAL_SECONDS_PER_DAY). */
export const DAY_S = 3600

/** Goals during which standing still is normal. */
const STATIONARY_OK = new Set(['drink', 'eat', 'fight', 'help', 'idle', 'repair', 'shelter', 'sleep', 'social', 'surplus', 'tend_fire', 'wait', 'work'])
/** Stationary this long (gameplay s) while walking somewhere (`goto` step) = stuck. */
export const STUCK_S = 90

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

  constructor(sim: Sim, seed: number) {
    this.sim = sim
    this.seed = seed
    this.dayStartDead = sim.state.npcs.filter((n) => n.vitals.dead).length
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
    }
    this.rows.push(row)
    this.dayStartDead = dead
    this.workByProf.clear()
    this.minHunger = 100
    this.minThirst = 100
    this.check(row)
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
    return { seed: this.seed, days: this.rows.length, rows: this.rows, violations: this.violations, info: this.info }
  }
}

/** Markdown summary of a report (per-day table + violations). */
export function soakMarkdown(r: SoakReport): string {
  const pct = (x: number) => `${Math.round(x * 100)}%`
  const lines = [`## Seed ${r.seed} — ${r.days} days`, '', '| day | alive | deaths | ate | drank | slept | min hunger | min thirst | treasury |', '|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
  for (const d of r.rows) lines.push(`| ${d.day} | ${d.alive} | ${d.deaths} | ${pct(d.ate)} | ${pct(d.drank)} | ${pct(d.slept)} | ${d.minHunger.toFixed(0)} | ${d.minThirst.toFixed(0)} | ${d.treasury} |`)
  const profs = [...new Set(r.rows.flatMap((d) => Object.keys(d.workShare)))].sort()
  lines.push('', 'Work-goal share per profession (mean over days): ' + profs.map((p) => `${p} ${pct(r.rows.reduce((a, d) => a + (d.workShare[p] ?? 0), 0) / Math.max(1, r.rows.length))}`).join(' · '))
  lines.push('', r.violations.length ? `**${r.violations.length} violation(s):**` : '**No violations.**', '')
  for (const v of r.violations.slice(0, 60)) lines.push(`- \`${v.invariant}\` day ${v.day}: ${v.detail}`)
  if (r.info.length) lines.push('', `Info (${r.info.length}):`, ...r.info.map((i) => `- ${i}`))
  if (r.violations.length > 60) lines.push(`- … ${r.violations.length - 60} more`)
  return lines.join('\n') + '\n'
}
