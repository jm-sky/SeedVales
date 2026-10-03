#!/usr/bin/env node
/** Screenshots at a cave mouth, inside the tunnel and in the chamber (world--003 verification). Usage: node scripts/e2e/tour-cave.mjs [caveIndex] */
import { startServer } from './server.mjs'
const server = await startServer()
process.env.SV_URL = server.url
const { launch, newGame, shot, sv } = await import('./lib.mjs')
const { browser, page } = await launch()
await newGame(page, '1337', 'medium')
const idx = Number(process.argv[2] ?? 0)
const info = await sv(page, (i) => {
  const s = window.__sv
  s.setHour(12)
  s.teleportToCave(i)
  const w = s.game.sim.world
  return { caves: w.caves.length, c: w.caves[i] && { x: w.caves[i].x, z: w.caves[i].z, name: w.caves[i].name } }
}, idx)
console.log(JSON.stringify(info))
await page.waitForTimeout(1500)
await shot(page, `cave-0-mouth`)
// walk in: hold forward
await page.keyboard.down('KeyW')
for (let k = 1; k <= 4; k++) {
  await page.waitForTimeout(2500)
  const st = await sv(page, () => { const g = window.__sv.game; return { cave: g.sim.state.px.cave, y: +g.sim.player.y.toFixed(2), x: +g.sim.player.x.toFixed(1), z: +g.sim.player.z.toFixed(1) } })
  console.log(k, JSON.stringify(st))
  await shot(page, `cave-${k}`)
}
await page.keyboard.up('KeyW')
await browser.close()
await server.close?.()
process.exit(0)
