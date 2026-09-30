#!/usr/bin/env node
/** Visual tour: screenshots of representative states for manual review (no assertions except errors). */
import { check, launch, newGame, report, shot, sv } from './lib.mjs'

const results = []
const quality = process.argv[2] ?? 'medium'
const { browser, page, logs } = await launch()
const S = (fn, arg) => sv(page, fn, arg)
try {
  await newGame(page, '1337', quality)
  const stops = [
    ['tour-01-npcs-close', () => { const sv = window.__sv; const n = sv.game.sim.state.npcs.find((x) => x.settlementId === 0 && x.age === 'adult'); sv.approach(n.x, n.z, 3); sv.game.renderer.rig.distance = 4; sv.setHour(11) }],
    ['tour-02-dusk-torches', () => { const sv = window.__sv; const s = sv.game.sim.world.settlements[0]; sv.teleport(s.x + 10, s.z + 25); sv.setHour(20.5); for (const b of sv.game.sim.state.buildings) if (b.kind === 'torchpost' || b.kind === 'campfire') b.lit = true; sv.game.renderer.rig.distance = 9 }],
    ['tour-03-night-player-torch', () => { const sv = window.__sv; sv.setHour(23.5); sv.give('torch', 1); sv.game.toggleTorch() }],
    ['tour-04-rain', () => { const sv = window.__sv; sv.setHour(14); const w = sv.game.sim.state.weather; w.kind = 'rain'; w.intensity = 0.9; w.fog = 0.3; w.until = sv.game.sim.state.time.cal + 86400 }],
    ['tour-05-animals', () => { const sv = window.__sv; const w = sv.game.sim.state.weather; w.kind = 'clear'; w.fog = 0.1; const d = sv.game.sim.state.animals.find((a) => a.species === 'deer'); sv.approach(d.x, d.z, 9) }],
    ['tour-06-town-LG', () => { const sv = window.__sv; const s = sv.game.sim.world.settlements[2]; sv.teleport(s.x - 20, s.z + 30); sv.face(s.x, s.z); sv.game.renderer.rig.distance = 14; sv.game.renderer.rig.pitch = 0.5 }],
    ['tour-07-mountains-river', () => { const sv = window.__sv; const sim = sv.game.sim; let best = null; for (let i = 0; i < 20000 && !best; i++) { const x = 500 + ((i * 97) % 7000); const z = 500 + ((i * 131) % 7000); if (sim.world.waterKind[Math.round(z / 8) * sim.world.n + Math.round(x / 8)] === 1 && sim.terrain.heightAt(x, z) > 30) best = [x + 12, z + 12] } if (best) sv.teleport(best[0], best[1]); sv.game.renderer.rig.distance = 12; sv.game.renderer.rig.pitch = 0.45 }],
    ['tour-08-map', () => { window.__sv.game.togglePanel('map') }],
  ]
  for (const [name, fn] of stops) {
    await S(fn)
    await page.waitForTimeout(5000)
    await shot(page, name)
  }
  check(results, 'tour screenshots', true, `${stops.length} shots`)
} catch (e) {
  check(results, 'exception', false, String(e).slice(0, 300))
  await shot(page, 'tour-error')
}
await browser.close()
process.exit(report('tour', results, logs) ? 0 : 1)
