#!/usr/bin/env node
/**
 * Browser render benchmark (Playwright, system Chrome). Headless uses SwiftShader (software GPU):
 * CPU-side timings (render.cpu/draw submit, terrain/vegetation work) and renderer.info counts are
 * meaningful; FPS/GPU time are NOT representative of real hardware.
 * Usage: pnpm dev (port 5199) then pnpm bench:render [quality]
 */
import fs from 'node:fs'
import path from 'node:path'
import { launch, newGame, sv } from '../e2e/lib.mjs'

const quality = process.argv[2] ?? 'medium'
const OUT = path.resolve(import.meta.dirname, '../../test-results/bench')
fs.mkdirSync(OUT, { recursive: true })
const { browser, page } = await launch()
await newGame(page, '1337', quality)

const scenes = [
  ['small-settlement', (s) => { const st = s.world.settlements[0]; return [st.x, st.z + 15] }],
  ['crowded-settlement', (s) => { const st = s.world.settlements[2]; return [st.x, st.z + 15] }],
  ['dense-forest', (s) => { for (let i = 0; i < 20000; i++) { const x = 500 + ((i * 97) % 7000); const z = 500 + ((i * 131) % 7000); if (s.terrain.biomeAt(x, z) === 7) return [x, z] } return [4000, 4000] }],
]
const results = []
for (const [name, where] of scenes) {
  await sv(page, (src) => {
    const f = new Function('return ' + src)()
    const [x, z] = f(window.__sv.game.sim)
    window.__sv.teleport(x, z)
  }, where.toString())
  await page.waitForTimeout(4000) // warm-up: chunk streaming, asset instancing
  await sv(page, () => window.__sv.perf.reset())
  await page.waitForTimeout(6000)
  results.push(await sv(page, (n) => {
    const r = window.__sv.perf.report()
    const pick = (k) => { const t = r.timers.find((x) => x.name === k); return t ? { median: +t.median.toFixed(2), p95: +t.p95.toFixed(2), samples: t.samples } : null }
    return {
      scene: n,
      frame: pick('frame'), renderCpu: pick('render.cpu'), drawSubmit: pick('render.draw'), terrain: pick('render.terrain'), actors: pick('render.actors'), vegetation: pick('render.vegetationRebuild'), chunkBuild: pick('chunks.build'), sim: pick('sim.tick'),
      drawCalls: r.gauges['render.drawCalls'], triangles: r.gauges['render.triangles'], geometries: r.gauges['render.geometries'], textures: r.gauges['render.textures'],
      chunks: r.gauges['chunks.active'], vegInstances: r.gauges['render.vegetationInstances'], mixers: r.gauges['render.activeMixers'],
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null,
    }
  }, name))
}
// Traverse: teleport along the first road in 100 m hops (chunk streaming cost).
await sv(page, () => window.__sv.perf.reset())
for (let i = 0; i < 12; i++) {
  await sv(page, (k) => { const r = window.__sv.game.sim.world.roads[0]; const p = r.points[Math.min(r.points.length - 1, k * 12)]; window.__sv.teleport(p.x, p.z) }, i)
  await page.waitForTimeout(700)
}
results.push(await sv(page, () => {
  const r = window.__sv.perf.report()
  const t = (k) => { const x = r.timers.find((y) => y.name === k); return x ? { median: +x.median.toFixed(2), p95: +x.p95.toFixed(2), max: +x.max.toFixed(2), samples: x.samples } : null }
  return { scene: 'chunk-traverse', frame: t('frame'), chunkBuild: t('chunks.build'), vegetation: t('render.vegetationRebuild'), nodesGen: t('world.nodes.gen'), chunks: r.gauges['chunks.active'], heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null }
}))
await browser.close()

const env = { quality, browser: 'Chrome headless + SwiftShader (software GPU)', date: new Date().toISOString(), note: 'GPU time not measured; FPS not representative' }
fs.writeFileSync(path.join(OUT, `render-${quality}-latest.json`), JSON.stringify({ env, results }, null, 1))
const lines = [`# Benchmark renderingu (${quality}, ${env.browser})`, '', '| Scena | frame CPU med/p95 | render.cpu | draw submit | draw calls | trójkąty | tekstury | chunki | inne |', '|---|---|---|---|---:|---:|---:|---:|---|']
for (const r of results) {
  const f = (t) => (t ? `${t.median}/${t.p95}` : '—')
  lines.push(`| ${r.scene} | ${f(r.frame)} | ${f(r.renderCpu)} | ${f(r.drawSubmit)} | ${r.drawCalls ?? '—'} | ${r.triangles ?? '—'} | ${r.textures ?? '—'} | ${r.chunks ?? '—'} | ${r.chunkBuild ? `chunk build ${f(r.chunkBuild)} max ${r.chunkBuild.max ?? ''}` : ''} ${r.vegetation ? `veg rebuild ${f(r.vegetation)}` : ''} ${r.mixers !== undefined ? `mixers ${r.mixers}` : ''} ${r.heapMB ? `heap ${r.heapMB} MB` : ''} |`)
}
const md = lines.join('\n')
fs.writeFileSync(path.join(OUT, `render-${quality}-latest.md`), md)
console.log(md)
