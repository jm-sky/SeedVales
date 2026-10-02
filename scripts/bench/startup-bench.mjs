#!/usr/bin/env node
/**
 * Startup benchmark (diag--002 step 1, review 009 F-02): a result class of its own, never mixed into the
 * steady-state gate (`bench:render`). Per quality, N fresh browser processes (cold HTTP cache, empty
 * IndexedDB → the world is generated, not read from the cache) each do "New game" and measure:
 *   - wall time from the click to the first HUD frame (status bars in the DOM) and to `window.__sv`
 *   - first-frame / worst-frame `render.cpu` and `render.prep`, chunks built, vegetation rebuild, actor
 *     creation, landmark build (max of the samples recorded during the first seconds)
 *   - world generation / cache time, and the asset download+decode share (resource-timing durations of
 *     model/texture files, summed and as a share of the startup wall time; they overlap, so the sum can exceed it)
 * Headless Chromium = SwiftShader and a shared cloud CPU: numbers are only comparable within one environment;
 * the tool is what matters. Report: test-results/bench/startup-<quality>.json (+ table on stdout).
 * Usage: pnpm bench:startup [low|medium|high ...] [--runs=3] [--settle=4]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { startServer } from '../e2e/server.mjs'

const args = process.argv.slice(2)
const qualities = args.filter((a) => !a.startsWith('--'))
if (!qualities.length) qualities.push('low', 'medium')
const RUNS = Number(args.find((a) => a.startsWith('--runs='))?.slice(7) ?? 3)
const SETTLE_S = Number(args.find((a) => a.startsWith('--settle='))?.slice(9) ?? 4)
// Cold start = the world is generated in the browser: keep the dev-server world cache out (scripts/world-cache-plugin.mjs).
process.env.SV_WORLD_CACHE = '0'
const server = process.env.SV_URL ? null : await startServer()
if (server) process.env.SV_URL = server.url
const { BASE, launch } = await import('../e2e/lib.mjs')
const OUT = path.resolve(import.meta.dirname, '../../test-results/bench')
fs.mkdirSync(OUT, { recursive: true })
const MACHINE = `${os.cpus()[0]?.model.trim() ?? 'unknown'} ×${os.cpus().length}`

const r2 = (v) => (v === null || v === undefined ? null : Math.round(v * 100) / 100)
const median = (a) => {
  const s = a.filter((v) => v !== null && v !== undefined).sort((x, y) => x - y)
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null
}

async function runOnce(quality) {
  const { browser, page, logs } = await launch()
  try {
    await page.goto(BASE)
    await page.evaluate((q) => localStorage.setItem('sv-quality', q), quality)
    await page.goto(BASE)
    await page.fill('[data-testid=seed-input]', '1337')
    const t0 = Date.now()
    await page.click('[data-testid=new-game]')
    await page.waitForSelector('[data-testid=status-bars]', { timeout: 180_000 })
    const hudMs = Date.now() - t0
    await page.waitForFunction(() => !!window.__sv, null, { timeout: 30_000 })
    const apiMs = Date.now() - t0
    // The first seconds after the HUD: first frames, chunk streaming, vegetation, actor creation.
    await page.waitForTimeout(SETTLE_S * 1000)
    const m = await page.evaluate(() => {
      const r = window.__sv.perf.report()
      const t = (k) => {
        const x = r.timers.find((y) => y.name === k)
        return x ? { samples: x.samples, median: x.median, p95: x.p95, max: x.max, total: x.mean * x.samples } : null
      }
      const res = performance.getEntriesByType('resource').filter((e) => /\.(glb|gltf|ktx2|png|jpg|webp|bin)(\?|$)/.test(e.name))
      return {
        timers: Object.fromEntries(['render.cpu', 'render.prep', 'render.draw', 'chunks.build', 'render.vegetationRebuild', 'render.terrain', 'render.actors', 'render.landmarkBuild', 'world.generate', 'save.worldCacheRead', 'save.worldCacheWrite', 'assets.load', 'frame'].map((k) => [k, t(k)])),
        gauges: r.gauges,
        counters: r.counters,
        assets: { files: res.length, sumMs: res.reduce((s, e) => s + e.duration, 0), kb: res.reduce((s, e) => s + (e.encodedBodySize || 0), 0) / 1024 },
        actors: window.__sv.game.sim.state.npcs.length + window.__sv.game.sim.state.animals.length,
      }
    })
    const errs = logs.filter((l) => l.startsWith('[pageerror]') || l.startsWith('[error]'))
    if (errs.length) throw new Error(`console errors during startup: ${errs.slice(0, 3).join(' | ')}`)
    return { hudMs, apiMs, ...m }
  } finally {
    await browser.close()
  }
}

const pickMax = (m, k) => r2(m.timers[k]?.max ?? null)
const summary = {}
for (const q of qualities) {
  const runs = []
  for (let i = 0; i < RUNS; i++) {
    const r = await runOnce(q)
    runs.push(r)
    console.log(`${q} run ${i + 1}/${RUNS}: HUD ${r.hudMs} ms, render.cpu max ${pickMax(r, 'render.cpu')}, chunks ${r.gauges['chunks.active']}`)
  }
  const row = {
    quality: q,
    runs: RUNS,
    hudMs: { median: median(runs.map((r) => r.hudMs)), max: Math.max(...runs.map((r) => r.hudMs)) },
    apiMs: median(runs.map((r) => r.apiMs)),
    renderCpuMax: median(runs.map((r) => pickMax(r, 'render.cpu'))),
    renderPrepMax: median(runs.map((r) => pickMax(r, 'render.prep'))),
    chunkBuild: { samples: median(runs.map((r) => r.timers['chunks.build']?.samples ?? null)), max: median(runs.map((r) => pickMax(r, 'chunks.build'))), totalMs: median(runs.map((r) => r2(r.timers['chunks.build']?.total ?? null))) },
    vegetationRebuildMax: median(runs.map((r) => pickMax(r, 'render.vegetationRebuild'))),
    actorsMax: median(runs.map((r) => pickMax(r, 'render.actors'))),
    landmarkBuild: median(runs.map((r) => pickMax(r, 'render.landmarkBuild'))),
    worldGenerateMs: median(runs.map((r) => pickMax(r, 'world.generate'))),
    worldCacheReadMs: median(runs.map((r) => pickMax(r, 'save.worldCacheRead'))),
    chunksActive: median(runs.map((r) => r.gauges['chunks.active'] ?? null)),
    actors: runs[0].actors,
    assets: { files: median(runs.map((r) => r.assets.files)), kb: r2(median(runs.map((r) => r.assets.kb))), sumMs: r2(median(runs.map((r) => r.assets.sumMs))) },
    assetShareOfHud: r2(median(runs.map((r) => r.assets.sumMs / r.hudMs))),
    all: runs.map((r) => ({ hudMs: r.hudMs, renderCpuMax: pickMax(r, 'render.cpu'), renderPrepMax: pickMax(r, 'render.prep') })),
  }
  summary[q] = row
  fs.writeFileSync(path.join(OUT, `startup-${q}.json`), JSON.stringify({ machine: MACHINE, settleS: SETTLE_S, ...row }, null, 1))
}

console.log(`\n# Startup (cloud/headless, ${MACHINE}; comparable only within this environment)\n`)
console.log('| quality | HUD ms (median / max) | render.cpu max | render.prep max | chunks.build n / max | veg rebuild max | actors max | world gen ms | asset files / KB | asset time ÷ HUD |')
console.log('|---|---|---:|---:|---|---:|---:|---:|---|---:|')
for (const row of Object.values(summary)) {
  console.log(`| ${row.quality} | ${row.hudMs.median} / ${row.hudMs.max} | ${row.renderCpuMax} | ${row.renderPrepMax} | ${row.chunkBuild.samples} / ${row.chunkBuild.max} | ${row.vegetationRebuildMax} | ${row.actorsMax} | ${row.worldGenerateMs} | ${row.assets.files} / ${row.assets.kb} | ${row.assetShareOfHud} |`)
}
if (server) await server.close?.()
process.exit(0)
