#!/usr/bin/env node
/**
 * Browser render benchmark (PERF-02). Headless Chromium = SwiftShader (software GPU): comparable within
 * one environment are the pure JS phases — `render.prep` (render.cpu without draw submission, the gate
 * metric of D-PERF-2), terrain/vegetation/chunk work — and renderer.info counts (draw calls, triangles,
 * shader programs, lights). `render.draw`, RAF pacing, GPU time and FPS are NOT representative here.
 * Starts its own Vite server (no HMR) unless SV_URL is set.
 * Each scene starts from the same calendar time and clear weather; a scene whose locator finds no
 * place fails the run. Results are compared with `scripts/bench/render-baseline-<quality>.json`
 * (gate: `render.prep` p95 ≤ +10%; +10…+20% or < 20 samples = inconclusive, repeat; > +20% = regression).
 * A baseline is valid only on the machine it was taken on (D-PERF-2: comparable within one environment);
 * on another machine the verdict is `n/a` — measure a reference commit there and pass it with
 * `--baseline=<file>` (e.g. a run of the older commit with `--update-baseline` in a worktree).
 * Usage: pnpm bench:render [low|medium|high] [--update-baseline] [--baseline=<file>]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { startServer } from '../e2e/server.mjs'

const args = process.argv.slice(2)
const quality = args.find((a) => !a.startsWith('--')) ?? 'medium'
const updateBaseline = args.includes('--update-baseline')
const baselineArg = args.find((a) => a.startsWith('--baseline='))?.slice('--baseline='.length)
const BASELINE = baselineArg ? path.resolve(baselineArg) : path.resolve(import.meta.dirname, `render-baseline-${quality}.json`)
/** Machine fingerprint: CPU model × logical cores (render baselines are per machine). */
const MACHINE = `${os.cpus()[0]?.model.trim() ?? 'unknown'} ×${os.cpus().length}`
const server = process.env.SV_URL ? null : await startServer()
if (server) process.env.SV_URL = server.url
const { launch, newGame, shot, sv } = await import('../e2e/lib.mjs')

const OUT = path.resolve(import.meta.dirname, '../../test-results/bench')
fs.mkdirSync(OUT, { recursive: true })
const { browser, context, page, logs } = await launch()
// SV_VISUAL='{"grass":false}' overrides render flags (localStorage `sv-visual`) for A/B gate runs; the tag goes into the output file name.
const visualTag = (process.env.SV_GPU ? '-gpu' : '') + (process.env.SV_VISUAL ? `-${process.env.SV_VISUAL_TAG ?? 'visual'}` : '')
if (process.env.SV_VISUAL) await context.addInitScript((v) => localStorage.setItem('sv-visual', v), process.env.SV_VISUAL)
await newGame(page, '1337', quality)

/** Scene setup runs in the page: (sv) => void. Same seed/time/weather each run. */
const scenes = [
  ['small-settlement', (sv) => { const st = sv.game.sim.world.settlements[0]; sv.setHour(12); sv.teleport(st.x, st.z + 15) }],
  ['crowded-settlement', (sv) => { const st = sv.game.sim.world.settlements[2]; sv.setHour(12); sv.teleport(st.x, st.z + 15) }],
  // render--009 step 3: every stockpile yard of the settlement at its top tier (stock forced), A/B with SV_VISUAL='{"stockpiles":false}'.
  ['full-stockyard', (sv) => {
    const sim = sv.game.sim
    const sid = sim.world.homeSettlement
    for (const b of sim.state.buildings) {
      if (b.settlementId !== sid || !b.inv) continue
      if (b.kind === 'warehouse') b.inv.items = [{ id: 'stone', qty: 40 }, { id: 'grain', qty: 35 }, { id: 'bread', qty: 45 }]
      if (b.kind === 'woodpile') b.inv.items = [{ id: 'log', qty: 10 }, { id: 'branch', qty: 10 }]
    }
    const wh = sim.state.buildings.find((b) => b.kind === 'warehouse' && b.settlementId === sid)
    sv.setHour(12)
    sv.teleport(wh.x, wh.z + 14)
    return true
  }],
  ['dense-forest', (sv) => {
    const s = sv.game.sim
    sv.setHour(12)
    for (let i = 0; i < 20000; i++) { const x = 500 + ((i * 97) % 7000); const z = 500 + ((i * 131) % 7000); if (s.terrain.biomeAt(x, z) === 7) { sv.teleport(x, z); return true } }
    return false
  }],
  // render--007 step 2: open meadow far from settlements (grass cost; no baseline until measured).
  ['meadow', (sv) => {
    const s = sv.game.sim
    const st = s.world.settlements[0]
    sv.setHour(12)
    for (let r = 120; r < 2500; r += 40) for (let a = 0; a < 6.28; a += 0.3) {
      const x = st.x + Math.cos(a) * r; const z = st.z + Math.sin(a) * r
      if (s.terrain.biomeAt(x, z) === 2 && s.terrain.roadAt(x, z) === 0 && s.terrain.slopeAt(x, z) < 0.15 && s.terrain.waterDepthAt(x, z) === 0 && s.terrain.biomeAt(x + 30, z) === 2 && s.terrain.biomeAt(x, z + 30) === 2) { sv.teleport(x, z); return true }
    }
    return false
  }],
  ['night-campfires', (sv) => { const st = sv.game.sim.world.settlements[2]; sv.setHour(22); sv.teleport(st.x, st.z + 10) }],
  ['water-shore', (sv) => {
    const t = sv.game.sim.terrain
    sv.setHour(12)
    for (let i = 0; i < 40000; i++) {
      const x = 400 + ((i * 89) % 7400)
      const z = 400 + ((i * 151) % 7400)
      if (t.waterDepthAt(x, z) > 0.8 && !t.isSeaAt(x, z) && t.waterDepthAt(x + 12, z) === 0) {
        sv.teleport(x + 14, z)
        sv.face(x, z)
        return true
      }
    }
    return false
  }],
  // WORLD-11: the largest landmark (estate ruin, ~28k tris merged) in view; no baseline until measured on the user's machine.
  ['landmark-estate', (sv) => { const l = sv.game.sim.world.landmarks.find((x) => x.kind === 'estate_ruin'); sv.setHour(12); sv.approach(l.x, l.z, 30); return !!l }],
  // WORLD-05: a cave mouth (cutting, banks, rim rocks) and the inside of a tunnel (shell + fill light); no baseline until measured on the user's machine.
  ['cave-mouth', (sv) => { sv.setHour(12); sv.teleportToCave(0, 7); return sv.game.sim.world.caves.length > 0 }],
  ['cave-inside', (sv) => {
    const sim = sv.game.sim
    const c = sim.world.caves[0]
    if (!c) return false
    sv.setHour(12)
    sv.teleportToCave(0, 7)
    const x = c.spine[9]; const z = c.spine[10]
    sim.player.x = x
    sim.player.z = z
    sim.player.y = sim.terrain.caves.grid(0).floorAt(x, z)
    sim.state.px.cave = 1
    return true
  }],
  ['rain', (sv) => {
    const s = sv.game.sim
    const st = s.world.settlements[0]
    sv.setHour(12)
    Object.assign(s.state.weather, { kind: 'rain', intensity: 0.8, until: s.state.time.cal + 30 * 86400, wetness: 0.8 })
    sv.teleport(st.x, st.z + 15)
  }],
  ['snow', (sv) => {
    const s = sv.game.sim
    const st = s.world.settlements[0]
    const cal = s.state.time.cal
    // Day 48 of the year = winter (season = 15 days), same year.
    s.state.time.cal = Math.floor(cal / (60 * 86400)) * 60 * 86400 + 48 * 86400 + 12 * 3600
    Object.assign(s.state.weather, { kind: 'snow', intensity: 0.8, temp: -6, until: s.state.time.cal + 30 * 86400, wetness: 0.5 })
    sv.teleport(st.x, st.z + 15)
  }],
]

const collect = (name) => sv(page, (n) => {
  const r = window.__sv.perf.report()
  const pick = (k) => {
    const t = r.timers.find((x) => x.name === k)
    return t ? { median: +t.median.toFixed(2), p95: +t.p95.toFixed(2), max: +t.max.toFixed(2), samples: t.samples } : null
  }
  return {
    scene: n,
    frame: pick('frame'), raf: pick('raf.interval'), prep: pick('render.prep'), renderCpu: pick('render.cpu'), draw: pick('render.draw'),
    terrain: pick('render.terrain'), actors: pick('render.actors'), vegetation: pick('render.vegetationRebuild'), grass: pick('render.grass'), gpuFrame: pick('gpu.frame'), chunkBuild: pick('chunks.build'), sim: pick('sim.tick'),
    drawCalls: r.gauges['render.drawCalls'], triangles: r.gauges['render.triangles'], programs: r.gauges['render.programs'], lights: r.gauges['render.lights'], activeLights: r.gauges['render.pointLights'],
    geometries: r.gauges['render.geometries'], textures: r.gauges['render.textures'], chunks: r.gauges['chunks.active'],
    gpuTimer: r.gauges['gpu.timerAvailable'] === 1,
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null,
  }
}, name)

/**
 * Warm-up until terrain streaming is done (chunks.pending = 0 for 1 s) — steady state. Waits up to 90 s of wall
 * time (SwiftShader medium drains a teleport's ~110 chunks in 20–25 s); a scene that never settles is marked
 * `unsettled` in the report instead of silently measuring streaming as steady state (session 8: the old
 * 50-poll cap cut off the slower terrain path mid-stream in dense-forest/rain).
 */
async function settle() {
  await page.waitForTimeout(2000)
  const t0 = Date.now()
  let calm = 0
  while (calm < 4 && Date.now() - t0 < 90_000) {
    const pending = await sv(page, () => window.__sv.perf.report().gauges['chunks.pending'] ?? 0)
    calm = pending === 0 ? calm + 1 : 0
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(1000)
  return calm >= 4
}

/**
 * Measures at least MIN_FRAMES rendered frames (min 6 s, max 60 s). SwiftShader renders medium at ~2 fps,
 * so a fixed 6 s window gave only ~10 samples and p95 = max (session 4).
 */
const MIN_FRAMES = 60
async function measureFrames() {
  const t0 = Date.now()
  await page.waitForTimeout(6000)
  while (Date.now() - t0 < 60000) {
    const n = await sv(page, () => window.__sv.perf.report().timers.find((t) => t.name === 'render.prep')?.samples ?? 0)
    if (n >= MIN_FRAMES) break
    await page.waitForTimeout(1000)
  }
}

/** Same start for every scene (review 009 F-09): initial calendar time, clear weather, camera defaults. */
const initialCal = await sv(page, () => window.__sv.game.sim.state.time.cal)
const resetScene = () => sv(page, (cal) => {
  const s = window.__sv.game.sim
  s.state.time.cal = cal
  Object.assign(s.state.weather, { kind: 'clear', intensity: 0, wetness: 0, fog: 0, until: cal + 30 * 86400 })
  window.__sv.setHour(12)
}, initialCal)

const results = []
const only = process.env.SV_SCENES?.split(',')
for (const [name, setup] of scenes) {
  if (only && !only.includes(name)) continue
  await resetScene()
  const ok = await sv(page, (src) => new Function('sv', `return (${src})(sv)`)(window.__sv), setup.toString())
  if (ok === false) throw new Error(`bench:render — scene "${name}": locator found no place (seed changed?)`)
  const settled = await settle() // warm-up: chunk streaming, asset instancing, shader compilation
  await sv(page, () => window.__sv.perf.reset())
  await measureFrames()
  results.push({ ...(await collect(name)), ...(settled ? {} : { unsettled: true }) })
  await shot(page, `bench-${quality}-${name}`)
}

// March: steady movement along the first road at 10 m/s for 30 s (chunk borders crossed; no teleport).
await resetScene()
await sv(page, () => {
  const s = window.__sv.game.sim
  s.state.weather.kind = 'clear'
  window.__sv.setHour(12)
  const r = s.world.roads[0]
  window.__sv.teleport(r.points[0].x, r.points[0].z)
})
await settle()
await sv(page, () => window.__sv.perf.reset())
await sv(page, () => new Promise((resolve) => {
  const sim = window.__sv.game.sim
  const pts = sim.world.roads[0].points
  let i = 0
  let along = 0
  let last = performance.now()
  const t0 = last
  const tick = (now) => {
    let d = ((now - last) / 1000) * 10
    last = now
    while (d > 0 && i < pts.length - 1) {
      const a = pts[i]
      const b = pts[i + 1]
      const seg = Math.hypot(b.x - a.x, b.z - a.z)
      const left = seg - along
      if (d < left) { along += d; d = 0 } else { d -= left; along = 0; i++ }
    }
    const a = pts[i]
    const b = pts[Math.min(i + 1, pts.length - 1)]
    const seg = Math.hypot(b.x - a.x, b.z - a.z) || 1
    const p = sim.player
    p.x = a.x + ((b.x - a.x) * along) / seg
    p.z = a.z + ((b.z - a.z) * along) / seg
    p.y = sim.terrain.heightAt(p.x, p.z)
    p.rot = Math.atan2(b.x - a.x, b.z - a.z)
    sim.actors.update(p)
    if (now - t0 < 30000 && i < pts.length - 1) requestAnimationFrame(tick)
    else resolve()
  }
  requestAnimationFrame(tick)
}))
results.push(await collect('march-10mps'))

// Teleport hitch test: 12 jumps of ~100 m along the road (loading/respawn case, not normal play).
await sv(page, () => window.__sv.perf.reset())
for (let i = 0; i < 12; i++) {
  await sv(page, (k) => { const r = window.__sv.game.sim.world.roads[0]; const p = r.points[Math.min(r.points.length - 1, k * 12)]; window.__sv.teleport(p.x, p.z) }, i)
  await page.waitForTimeout(700)
}
results.push(await collect('teleport-hitch'))
await browser.close()
await server?.close()

const env = { quality, machine: MACHINE, browser: process.env.SV_GPU ? 'Chrome headless + real GPU (WSL2 d3d12)' : 'Chrome headless + SwiftShader (software GPU)', date: new Date().toISOString(), note: 'gate metric: render.prep p95; render.draw/RAF/GPU/FPS not representative headless' }
const consoleErrors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'))
fs.writeFileSync(path.join(OUT, `render-${quality}${visualTag}-latest.json`), JSON.stringify({ env, results, consoleErrors }, null, 1))

// Baseline comparison (review 009 F-10): gate = render.prep p95; small samples or noise band = inconclusive.
const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null
const sameMachine = !!base && base.machine === MACHINE
const verdict = (r) => {
  const b = base?.scenes?.[r.scene]
  if (b && !sameMachine) return 'n/a (other machine)'
  if (r.unsettled) return 'unsettled (streaming did not finish in 90 s)'
  if (!b || !r.prep) return '—'
  if (r.prep.samples < 20) return `inconclusive (n=${r.prep.samples})`
  const d = (r.prep.p95 - b.prepP95) / Math.max(0.1, b.prepP95)
  const pct = `${d >= 0 ? '+' : ''}${Math.round(d * 100)}%`
  return d <= 0.1 ? `ok ${pct}` : d <= 0.2 ? `inconclusive ${pct} (repeat)` : `⚠️ ${pct} (confirm)`
}
const f = (t) => (t ? `${t.median}/${t.p95}` : '—')
const lines = [
  `# Render benchmark (${quality}, ${env.browser})`, '',
  `Machine: ${MACHINE} · baseline: ${base ? `${path.basename(BASELINE)} (${base.commit}, ${base.date.slice(0, 10)}, ${base.machine ?? 'machine unknown'})` : 'none'} · console errors: ${consoleErrors.length}`,
  ...(base && !sameMachine ? ['', '**Baseline is from another machine — no verdict.** Measure a reference commit on this machine and pass `--baseline=<file>`.'] : []), '',
  '| Scene | frames | render.prep med/p95 | vs baseline | frame CPU | render.cpu | draw (SwiftShader) | terrain | veg rebuild | grass update | GPU frame | chunk build | draw calls | triangles | programs | lights (active) | textures |',
  '|---|---:|---|---|---|---|---|---|---|---|---:|---:|---:|---|---:|',
]
for (const r of results) {
  lines.push(`| ${r.scene} | ${r.prep?.samples ?? 0} | ${f(r.prep)} | ${verdict(r)} | ${f(r.frame)} | ${f(r.renderCpu)} | ${f(r.draw)} | ${f(r.terrain)} | ${f(r.vegetation)}${r.vegetation ? ` (n=${r.vegetation.samples}, max ${r.vegetation.max})` : ''} | ${f(r.grass)} | ${f(r.gpuFrame)} | ${f(r.chunkBuild)} | ${r.drawCalls ?? '—'} | ${r.triangles ?? '—'} | ${r.programs ?? '—'} | ${r.lights ?? '—'} (${r.activeLights ?? '—'}) | ${r.textures ?? '—'} |`)
}
const md = lines.join('\n')
fs.writeFileSync(path.join(OUT, `render-${quality}${visualTag}-latest.md`), md)
console.log(md)
if (updateBaseline) {
  const commit = (await import('node:child_process')).execSync('git rev-parse --short HEAD').toString().trim()
  const scenesOut = Object.fromEntries(results.map((r) => [r.scene, { prepP95: r.prep?.p95 ?? 0, prepMedian: r.prep?.median ?? 0, samples: r.prep?.samples ?? 0, vegP95: r.vegetation?.p95 ?? 0, drawCalls: r.drawCalls, programs: r.programs }]))
  fs.writeFileSync(BASELINE, `${JSON.stringify({ quality, commit, machine: MACHINE, date: env.date, note: 'render.prep p95 per scene; update only after two confirming runs with a recorded reason', scenes: scenesOut }, null, 1)}\n`)
  console.log(`Baseline updated: ${BASELINE}`)
}
if (consoleErrors.length) {
  console.error(`bench:render — ${consoleErrors.length} console error(s):\n${consoleErrors.slice(0, 5).join('\n')}`)
  process.exitCode = 1
}
