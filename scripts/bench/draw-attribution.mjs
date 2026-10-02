#!/usr/bin/env node
/**
 * Draw-call attribution (render--003 first item, research 003 §10.1): per scene and quality, draw calls of one
 * frame split by render subsystem (terrain, vegetation, grass, structures, landmarks, actors, …) and by pass
 * (main / shadow). Draw counts do not depend on the GPU, so SwiftShader (default) gives the same numbers.
 * Usage: node scripts/bench/draw-attribution.mjs [low|medium|high ...]   → test-results/bench/draws-<q>.json + table
 */
import fs from 'node:fs'
import path from 'node:path'
import { startServer } from '../e2e/server.mjs'

const qualities = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!qualities.length) qualities.push('medium', 'high')
const server = process.env.SV_URL ? null : await startServer()
if (server) process.env.SV_URL = server.url
const { launch, newGame, sv } = await import('../e2e/lib.mjs')
const OUT = path.resolve(import.meta.dirname, '../../test-results/bench')
fs.mkdirSync(OUT, { recursive: true })

const scenes = [
  ['small-settlement', (sv) => { const st = sv.game.sim.world.settlements[0]; sv.setHour(12); sv.teleport(st.x, st.z + 15) }],
  ['crowded-settlement', (sv) => { const st = sv.game.sim.world.settlements[2]; sv.setHour(12); sv.teleport(st.x, st.z + 15) }],
  ['dense-forest', (sv) => {
    const s = sv.game.sim
    sv.setHour(12)
    for (let i = 0; i < 20000; i++) { const x = 500 + ((i * 97) % 7000); const z = 500 + ((i * 131) % 7000); if (s.terrain.biomeAt(x, z) === 7) { sv.teleport(x, z); return } }
  }],
]

for (const q of qualities) {
  const { browser, page } = await launch()
  await newGame(page, '1337', q)
  const rows = []
  for (const [name, setup] of scenes) {
    await sv(page, (src) => new Function('sv', `(${src})(sv)`)(window.__sv), setup.toString())
    await page.waitForTimeout(2000)
    for (let calm = 0, i = 0; calm < 4 && i < 360; i++) {
      calm = (await sv(page, () => window.__sv.perf.report().gauges['chunks.pending'] ?? 0)) === 0 ? calm + 1 : 0
      await page.waitForTimeout(250)
    }
    await page.waitForTimeout(3000)
    rows.push({ scene: name, ...(await sv(page, () => window.__sv.drawAttribution())) })
  }
  await browser.close()
  fs.writeFileSync(path.join(OUT, `draws-${q}.json`), JSON.stringify(rows, null, 1))
  const tags = [...new Set(rows.flatMap((r) => Object.keys(r.by)))].sort()
  console.log(`\n# ${q}: draw calls main+shadow per subsystem (total = renderer.info.render.calls)`)
  console.log(`| scene | total | ${tags.join(' | ')} |`)
  console.log(`|---|---|${tags.map(() => '---').join('|')}|`)
  for (const r of rows) console.log(`| ${r.scene} | ${r.total} | ${tags.map((t) => (r.by[t] ? `${r.by[t].main}+${r.by[t].shadow}` : '—')).join(' | ')} |`)
}
await server?.close()
