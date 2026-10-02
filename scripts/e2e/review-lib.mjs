/**
 * Shared runtime for the application review scenarios (review--001, skill `app-review`).
 * A scenario is a module with `export default async function (rt)`; the runner (review-run.mjs) supplies `rt`:
 *   rt.start({ seed, quality, mobile }) → session { page, S, snap(name), shotTo(file), logs }
 *   rt.step(name, async () => data | { ok: false, reason })  records an observation; a throw becomes ok:false
 *   rt.note(key, value)                                    free-form top-level observation
 * Scenarios produce EVIDENCE; they never assert gameplay. A step that cannot be performed is recorded as
 * `{ step, ok: false, reason }` and the scenario continues.
 *
 * `installHelpers` defines `window.__rv` in the page: thin wrappers around `window.__sv` and the game's own
 * interaction functions (targetOptions + Game.choose, the same path the UI uses) so that scenario code stays short.
 */
import fs from 'node:fs'
import path from 'node:path'
import { launch, newGame } from './lib.mjs'

export const REVIEW_OUT = path.resolve(import.meta.dirname, '../../test-results/review')

/** Console lines that make the run fail (crashes, errors, failed requests). */
export const isFatalLog = (l) => l.startsWith('[pageerror]') || l.startsWith('[error]') || l.startsWith('[http')

export async function installHelpers(page) {
  await page.evaluate(() => {
    const sv = () => window.__sv
    const game = () => sv().game
    const sim = () => game().sim
    const rv = {}
    window.__rv = rv
    const mod = (p) => import(/* @vite-ignore */ `/src/game/${p}.ts`)
    rv.mod = mod
    rv.hp = (v) => rv._hp(v)
    rv.round = (n, d = 2) => (typeof n === 'number' ? Math.round(n * 10 ** d) / 10 ** d : n)
    rv.needs = () => {
      const v = sim().player.vitals
      return { hunger: rv.round(v.hunger, 1), thirst: rv.round(v.thirst, 1), vigor: rv.round(v.vigor, 1), stamina: rv.round(v.stamina, 1), social: rv.round(v.social, 1) }
    }
    rv.clock = () => {
      const cal = sim().state.time.cal
      const day = Math.floor(cal / 86400)
      const h = (cal % 86400) / 3600
      return { day, hour: rv.round(h, 2), cal }
    }
    rv.npc = (prof, sid = 0) => sim().npcsOf(sid).find((n) => n.profession === prof && !n.vitals.dead)
    rv.bld = (kind, sid = 0) => sim().state.buildings.find((b) => b.kind === kind && b.settlementId === sid)
    /** Nearest building / living NPC of a kind in any settlement (distance from the player). */
    const dist = (o) => Math.hypot(o.x - sim().player.x, o.z - sim().player.z)
    rv.findBld = (kind) => sim().state.buildings.filter((b) => b.kind === kind && !b.playerBuilt).sort((a, b) => dist(a) - dist(b))[0]
    rv.findNpc = (pred) => sim().state.npcs.filter((n) => !n.vitals.dead && !n.companion && !n.trip && pred(n)).sort((a, b) => dist(a) - dist(b))[0]
    rv.pause = (on) => sv().pause(on)
    /** Advance the simulation by gameplay seconds with the game unpaused (restores the pause state). */
    rv.advance = (sec) => {
      const was = sim().paused
      sim().paused = false
      sv().simStep(sec)
      sim().paused = was
    }
    /** Run the current player activity to its end (max `maxS` gameplay seconds). Returns what happened. */
    rv.finish = (maxS = 3000) => {
      const was = sim().paused
      sim().paused = false
      const a0 = sim().state.px.activity
      const t0 = sim().state.time.play
      const c0 = sim().state.time.cal
      let t = 0
      while (sim().state.px.activity && t < maxS) {
        sv().simStep(0.5)
        t += 0.5
      }
      sim().paused = was
      return { activity: a0?.kind ?? null, label: a0?.label, playS: rv.round(sim().state.time.play - t0, 1), calHours: rv.round((sim().state.time.cal - c0) / 3600, 2), stillRunning: !!sim().state.px.activity }
    }
    rv.msgs = (n = 6) => sim().state.messages.slice(-n).map((m) => m.text)
    rv.msgCount = () => sim().state.messages.length
    rv.newMsgs = (from) => sim().state.messages.slice(from).map((m) => m.text)
    /** Options offered for a target ref (id, label, enabled, reason, panel). */
    rv.opts = async (ref) => (await mod('sim/interact')).targetOptions(sim(), ref).map((o) => ({ id: o.id, label: o.label, enabled: o.enabled, reason: o.reason, panel: o.panel }))
    /** Choose an option through Game.choose (same path as the interact menu). Returns toast, new log lines, panel. */
    rv.choose = async (ref, id) => {
      const list = (await mod('sim/interact')).targetOptions(sim(), ref)
      const o = list.find((x) => x.id === id)
      if (!o) return { ok: false, reason: `option "${id}" not offered; offered: ${list.map((x) => x.id).join(', ') || 'none'}` }
      const m0 = rv.msgCount()
      game().toast = ''
      game().choose(o, ref)
      return { ok: o.enabled, label: o.label, reason: o.enabled ? undefined : o.reason, toast: game().toast, log: rv.newMsgs(m0), panel: game().panel, activity: sim().state.px.activity?.kind ?? null }
    }
    rv.stand = (x, z, d = 1.6) => sv().approach(x, z, d)
    rv.coins = () => sim().player.money
    rv.treasury = () => sim().state.settlements.map((s) => s.treasury)
    rv.setInv = (items) => {
      sim().player.inv.items = []
      for (const [id, qty] of items) sv().give(id, qty)
    }
    rv.heal = () => {
      const v = sim().player.vitals
      for (const k of Object.keys(v.parts)) v.parts[k] = 0
      v.bleeding = 0
      v.ko = undefined
      v.stamina = 100
    }
    rv.settle = (id = 0) => sim().world.settlements[id]
    rv.look = (yaw, pitch = 0.25, dist = 9) => {
      const r = game().renderer.rig
      r.yaw = yaw
      r.pitch = pitch
      r.distance = dist
    }
  })
  // hp() needs the vitals module.
  await page.evaluate(async () => {
    const { hp } = await import(/* @vite-ignore */ '/src/game/sim/vitals.ts')
    window.__rv._hp = hp
  })
}

export function makeRuntime(name, openSession) {
  const dir = path.join(REVIEW_OUT, name)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const observations = []
  const notes = {}
  const sessions = []
  let index = 0
  const logs = []
  const rt = {
    name,
    dir,
    observations,
    notes,
    logs,
    async start({ seed = '1337', quality = 'low', mobile = false } = {}) {
      const s = await openSession({ seed, quality, mobile })
      sessions.push(s)
      s.snap = async (step) => {
        const file = path.join(dir, `${String(++index).padStart(2, '0')}-${step.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}.png`)
        await s.page.screenshot({ path: file })
        return path.relative(path.resolve(import.meta.dirname, '../..'), file)
      }
      return s
    },
    async step(step, fn) {
      const t0 = Date.now()
      try {
        const r = (await fn()) ?? {}
        observations.push(r.ok === false ? { step, ok: false, reason: r.reason ?? 'not possible', ...r } : { step, ok: true, ...r, ms: Date.now() - t0 })
      } catch (e) {
        observations.push({ step, ok: false, reason: `exception: ${String(e).slice(0, 300)}` })
      }
      return observations.at(-1)
    },
    note(key, value) {
      notes[key] = value
    },
    async close() {
      for (const s of sessions) {
        logs.push(...s.logs)
        await s.browser.close().catch(() => {})
      }
    },
    write(extra = {}) {
      const fatal = logs.filter(isFatalLog)
      const file = path.join(dir, 'observations.json')
      fs.writeFileSync(file, JSON.stringify({ scenario: name, notes, observations, consoleErrors: fatal, consoleWarnings: logs.filter((l) => !isFatalLog(l)), ...extra }, null, 1))
      return { file, fatal, shots: index }
    },
  }
  return rt
}

/** Opens a browser + new game and installs the helpers. */
export async function openSession({ seed, quality, mobile }) {
  const { browser, page, logs } = await launch({ mobile })
  await newGame(page, seed, quality)
  await installHelpers(page)
  return { browser, page, logs, S: (fn, arg) => page.evaluate(fn, arg) }
}
