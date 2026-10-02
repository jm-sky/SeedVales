#!/usr/bin/env node
/**
 * Visual A/B (render--002): the same frames for several visual-flag variants, plus one side-by-side
 * montage per frame (test-results/ab/ab-<frame>.png). Starts its own Vite server unless SV_URL is set.
 * Seed: SV_SEED=<n> (default 1337; other seeds write to test-results/ab-<n>).
 * Usage: node scripts/e2e/ab.mjs [quality] '<label>={"tone":"none"}' '<label>={"tone":"agx","sky":"dome"}' …
 */
import fs from 'node:fs'
import path from 'node:path'
import { startServer } from './server.mjs'

const args = process.argv.slice(2)
const quality = ['high', 'low', 'medium'].includes(args[0]) ? args.shift() : 'medium'
const variants = (args.length ? args : ['current={}']).map((a) => {
  const i = a.indexOf('=')
  return { label: a.slice(0, i), flags: JSON.parse(a.slice(i + 1)) }
})
const server = process.env.SV_URL ? null : await startServer()
if (server) process.env.SV_URL = server.url
const { BASE, launch, sv } = await import('./lib.mjs')
const SEED = process.env.SV_SEED ?? '1337'
const OUT = path.resolve(import.meta.dirname, SEED === '1337' ? '../../test-results/ab' : `../../test-results/ab-${SEED}`)
fs.mkdirSync(OUT, { recursive: true })

const FRAMES = [
  ['settlement-noon', (sv) => { const s = sv.game.sim.world.settlements[0]; sv.teleport(s.x - 18, s.z + 26); sv.face(s.x, s.z); sv.setHour(12); sv.game.renderer.rig.distance = 10; sv.game.renderer.rig.pitch = 0.35 }],
  ['settlement-dusk', (sv) => { sv.setHour(19.2) }],
  ['settlement-night', (sv) => { sv.setHour(22.5); for (const b of sv.game.sim.state.buildings) if (b.kind === 'torchpost' || b.kind === 'campfire') b.lit = true }],
  ['winter-snow', (sv) => {
    const sim = sv.game.sim
    const cal = sim.state.time.cal
    // Day 48 of the year = winter (season = 15 days).
    sim.state.time.cal = Math.floor(cal / (60 * 86400)) * 60 * 86400 + 48 * 86400 + 12 * 3600
    Object.assign(sim.state.weather, { kind: 'snow', intensity: 0.5, temp: -6, wetness: 0.5, fog: 0.05, until: sim.state.time.cal + 30 * 86400 })
    const s = sim.world.settlements[0]
    sv.teleport(s.x - 18, s.z + 26)
    sv.face(s.x, s.z)
  }],
  // WEATHER-02: wet ground in rain vs the same view dry (summer, overcast).
  ...[['summer-dry', 'overcast', 0], ['rain-wet', 'rain', 1]].map(([name, kind, wet]) => [name, new Function('sv', `
    const sim = sv.game.sim
    const cal = sim.state.time.cal
    // Summer (day 20) so snow cover can never win; the calendar may have been left in winter by an earlier frame.
    sim.state.time.cal = Math.floor(cal / (60 * 86400)) * 60 * 86400 + 20 * 86400 + 13 * 3600
    Object.assign(sim.state.weather, { kind: '${kind}', intensity: 0.7, wetness: ${wet}, fog: 0.15, temp: 14, until: sim.state.time.cal + 86400 })
    const s = sim.world.settlements[0]
    sv.teleport(s.x - 18, s.z + 26)
    sv.face(s.x, s.z)
    sv.game.renderer.rig.distance = 10
    sv.game.renderer.rig.pitch = 0.35
  `)]),
  ['overcast', (sv) => { sv.setHour(13); Object.assign(sv.game.sim.state.weather, { kind: 'overcast', fog: 0.15, until: sv.game.sim.state.time.cal + 86400 }) }],
  ['meadow-hills', (sv) => {
    const sim = sv.game.sim
    Object.assign(sim.state.weather, { kind: 'clear', fog: 0.05, until: sim.state.time.cal + 86400 })
    sv.setHour(10)
    const s = sim.world.settlements[1]
    sv.teleport(s.x + 260, s.z + 140)
    sv.face(s.x, s.z)
    sv.game.renderer.rig.distance = 14
    sv.game.renderer.rig.pitch = 0.3
  }],
  ['mountain-river', (sv) => {
    const sim = sv.game.sim
    sv.setHour(15)
    for (let i = 0; i < 20000; i++) {
      const x = 500 + ((i * 97) % 7000)
      const z = 500 + ((i * 131) % 7000)
      if (sim.world.waterKind[Math.round(z / 8) * sim.world.n + Math.round(x / 8)] === 1 && sim.terrain.heightAt(x, z) > 30) {
        sv.teleport(x + 12, z + 12)
        break
      }
    }
    sv.game.renderer.rig.distance = 12
    sv.game.renderer.rig.pitch = 0.45
  }],
  // Season fade (autumn tint 0.6) and a summer reference, same meadow view, clear weather.
  // Grass at normal camera height over a meadow (render--007 step 2), summer noon.
  ['meadow-grass', (sv) => {
    const sim = sv.game.sim
    const cal = sim.state.time.cal
    sim.state.time.cal = Math.floor(cal / (60 * 86400)) * 60 * 86400 + 20 * 86400 + 11 * 3600
    Object.assign(sim.state.weather, { kind: 'clear', intensity: 0, temp: 14, wetness: 0.1, fog: 0.05, until: sim.state.time.cal + 30 * 86400 })
    const s = sim.world.settlements[1]
    sv.teleport(s.x + 260, s.z + 140)
    sv.face(s.x, s.z)
    sv.game.renderer.rig.distance = 6
    sv.game.renderer.rig.pitch = 0.18
  }],
  ...[['summer-meadow', 20], ['autumn-meadow', 35]].map(([name, day]) => [name, new Function('sv', `
    const sim = sv.game.sim
    const cal = sim.state.time.cal
    sim.state.time.cal = Math.floor(cal / (60 * 86400)) * 60 * 86400 + ${day} * 86400 + 11 * 3600
    Object.assign(sim.state.weather, { kind: 'clear', intensity: 0, temp: 14, wetness: 0.1, fog: 0.05, until: sim.state.time.cal + 30 * 86400 })
    const s = sim.world.settlements[1]
    sv.teleport(s.x + 260, s.z + 140)
    sv.face(s.x, s.z)
    sv.game.renderer.rig.distance = 14
    sv.game.renderer.rig.pitch = 0.3
  `)]),
  // render--007 step 0/3c: trees at 40–300 m — standing in open meadow ~70 m from a forest, facing it.
  ['forest-edge', (sv) => {
    const sim = sv.game.sim
    const t = sim.terrain
    const cal = sim.state.time.cal
    sim.state.time.cal = Math.floor(cal / (60 * 86400)) * 60 * 86400 + 20 * 86400 + 10 * 3600
    Object.assign(sim.state.weather, { kind: 'clear', intensity: 0, temp: 16, wetness: 0.1, fog: 0.05, until: sim.state.time.cal + 30 * 86400 })
    const s = sim.world.settlements[0]
    const forest = (b) => b >= 5 && b <= 7
    for (let r = 150; r < 3000; r += 30) for (let a = 0; a < 6.28; a += 0.2) {
      const x = s.x + Math.cos(a) * r
      const z = s.z + Math.sin(a) * r
      if (t.biomeAt(x, z) !== 2 || t.roadAt(x, z) !== 0 || t.waterDepthAt(x, z) > 0) continue
      for (let b = 0; b < 6.28; b += 0.4) {
        const at = (k) => t.biomeAt(x + Math.cos(b) * k, z + Math.sin(b) * k)
        if (at(25) === 2 && at(50) === 2 && forest(at(80)) && forest(at(130)) && forest(at(200))) {
          sv.teleport(x, z)
          sv.face(x + Math.cos(b) * 100, z + Math.sin(b) * 100)
          sv.game.renderer.rig.distance = 9
          sv.game.renderer.rig.pitch = 0.05
          return
        }
      }
    }
  }],
  // render--001 1b: particle fire close up at night — the settlement hearth from ~5 m, the player holding a lit torch.
  ['fire-close-night', (sv) => {
    const sim = sv.game.sim
    const s = sim.world.settlements[0]
    sv.setHour(22.5)
    const h = sim.buildingsNear(s.x, s.z, 80).find((b) => b.kind === 'campfire')
    if (!h) return
    h.lit = true
    h.fuel = Math.max(h.fuel ?? 0, 30)
    sim.player.eq.off = { id: 'torch', qty: 1 }
    sv.approach(h.x, h.z, 4.5)
    // Turn so the hearth sits beside the player instead of behind them.
    const p = sim.player
    sv.face(h.x + (h.z - p.z) * 0.6, h.z - (h.x - p.x) * 0.6)
    sv.game.renderer.rig.distance = 5
    sv.game.renderer.rig.pitch = 0.18
  }],
  // render--001 step 8 (TRACE-01): a blood trail and a fresh ash patch next to the player, daylight.
  ['traces', (sv) => {
    const sim = sv.game.sim
    const s = sim.world.settlements[0]
    sv.setHour(12)
    const o = sv.openSpot(40)
    sv.teleport(o.x, o.z)
    sv.face(o.x, o.z + 10)
    for (let i = 0; i < 7; i++) sim.addTrace({ id: sim.nextId(), x: o.x - 1.5 + Math.sin(i * 0.9) * 0.6, z: o.z + 2 + i * 0.9, intensity: 1 - i * 0.1, at: sim.state.time.cal })
    sim.addTrace({ id: sim.nextId(), x: o.x + 2, z: o.z + 4, kind: 'ash', intensity: 1, at: sim.state.time.cal })
    void s
    sv.game.renderer.rig.distance = 6
    sv.game.renderer.rig.pitch = 0.45
  }],
  // world--002 relief A/B: the other frames sit where the hilliness field is ~0 (settlement surroundings),
  // so this one searches for the lowland meadow spot with the largest height range within 150 m.
  ['rolling-hills', (sv) => {
    const sim = sv.game.sim
    const t = sim.terrain
    const cal = sim.state.time.cal
    sim.state.time.cal = Math.floor(cal / (60 * 86400)) * 60 * 86400 + 20 * 86400 + 9 * 3600
    Object.assign(sim.state.weather, { kind: 'clear', intensity: 0, temp: 16, wetness: 0.1, fog: 0.05, until: sim.state.time.cal + 30 * 86400 })
    let best = null
    for (let i = 0; i < 3000; i++) {
      const x = 600 + ((i * 397) % 6800)
      const z = 600 + ((i * 631) % 6800)
      const h = t.heightAt(x, z)
      if (t.biomeAt(x, z) !== 2 || h < 2 || h > 45 || t.waterDepthAt(x, z) > 0) continue
      let lo = h
      let hi = h
      // No mountain foot in reach (relief is zero on mountains; their slopes would win the search).
      for (let a = 0; a < 6.28; a += 0.8) for (const r of [60, 150, 400]) {
        const y = t.heightAt(x + Math.cos(a) * r, z + Math.sin(a) * r)
        if (r < 400) { lo = Math.min(lo, y); hi = Math.max(hi, y) } else hi = y > 50 ? Infinity : hi
      }
      if (hi < Infinity && (!best || hi - lo > best.d)) best = { x, z, d: hi - lo }
    }
    // No lowland meadow on this seed (review 011 #1): leave the camera where it is, like lake-shore / river-bank.
    if (!best) {
      console.warn('rolling-hills: no meadow candidate on this seed, frame left at the previous spot')
      return
    }
    sv.teleport(best.x, best.z)
    sv.face(best.x + 100, best.z + 40)
    sv.game.renderer.rig.distance = 12
    sv.game.renderer.rig.pitch = 0.2
  }],
  // Water at 5–60 m with afternoon sun: lake (waterKind 2) and river (1) banks, camera facing the water.
  ...[['lake-shore', 2], ['river-bank', 1]].map(([name, kind]) => [name, new Function('sv', `
    const sim = sv.game.sim
    const t = sim.terrain
    const w = sim.world
    const cal = sim.state.time.cal
    sim.state.time.cal = Math.floor(cal / (60 * 86400)) * 60 * 86400 + 20 * 86400 + 16 * 3600
    Object.assign(sim.state.weather, { kind: 'clear', intensity: 0, temp: 16, wetness: 0.1, fog: 0.05, until: sim.state.time.cal + 30 * 86400 })
    for (let i = 0; i < 40000; i++) {
      const x = 400 + ((i * 89) % 7400)
      const z = 400 + ((i * 151) % 7400)
      if (w.waterKind[Math.round(z / 8) * w.n + Math.round(x / 8)] !== ${kind} || t.waterDepthAt(x, z) < 0.6 || t.heightAt(x, z) > 40) continue
      for (let b = 0; b < 6.28; b += 0.5) {
        const sx = x + Math.cos(b) * 16
        const sz = z + Math.sin(b) * 16
        if (t.waterDepthAt(sx, sz) === 0 && t.waterDepthAt(x + Math.cos(b) * 10, z + Math.sin(b) * 10) === 0 && t.slopeAt(sx, sz) < 0.25) {
          sv.teleport(sx, sz)
          sv.face(x - Math.cos(b) * 20, z - Math.sin(b) * 20)
          sv.game.renderer.rig.distance = 9
          sv.game.renderer.rig.pitch = 0.3
          return
        }
      }
    }
  `)]),
]

const only = process.env.SV_FRAMES?.split(',')
if (only) FRAMES.splice(0, FRAMES.length, ...FRAMES.filter(([n]) => only.includes(n)))
const { browser, page, logs } = await launch()
const shots = {}
for (const v of variants) {
  await page.goto(BASE)
  await page.evaluate(({ q, f }) => {
    localStorage.setItem('sv-quality', q)
    localStorage.setItem('sv-visual', JSON.stringify(f))
  }, { q: quality, f: v.flags })
  await page.goto(BASE)
  await page.fill('[data-testid=seed-input]', SEED)
  await page.click('[data-testid=new-game]')
  await page.waitForSelector('[data-testid=status-bars]', { timeout: 120_000 })
  await page.waitForFunction(() => !!window.__sv, null, { timeout: 30_000 })
  await sv(page, () => window.__sv.pause(true))
  for (const [name, setup] of FRAMES) {
    await sv(page, (src) => new Function('sv', `(${src})(sv)`)(window.__sv), setup.toString())
    await page.waitForTimeout(Number(process.env.SV_AB_WAIT ?? 4500)) // SV_AB_WAIT: longer for far first frames on software rendering
    const file = path.join(OUT, `ab-${v.label}-${name}.png`)
    await page.screenshot({ path: file })
    ;(shots[name] ??= []).push({ label: v.label, file })
  }
}
// Montage: one row per frame, variants side by side (rendered by the browser — no image tools needed).
await page.setViewportSize({ width: 640 * variants.length, height: 380 })
for (const [name, list] of Object.entries(shots)) {
  const cells = list.map((s) => `<figure><img src="data:image/png;base64,${fs.readFileSync(s.file).toString('base64')}"><figcaption>${s.label}</figcaption></figure>`).join('')
  await page.setContent(`<link rel="icon" href="data:,"><style>body{margin:0;display:flex;background:#111}figure{margin:0;position:relative}img{width:640px;height:360px;display:block}figcaption{position:absolute;top:4px;left:6px;color:#fff;font:bold 16px sans-serif;text-shadow:0 0 3px #000}</style>${cells}`)
  await page.screenshot({ path: path.join(OUT, `ab-${name}.png`), clip: { x: 0, y: 0, width: 640 * list.length, height: 360 } })
}
await browser.close()
await server?.close()
const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]') || l.startsWith('[http'))
console.log(`ab: ${variants.length} variants × ${FRAMES.length} frames → ${OUT} · console errors: ${errors.length}`)
for (const e of errors.slice(0, 5)) console.log(e)
