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
]

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
    await page.waitForTimeout(4500)
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
