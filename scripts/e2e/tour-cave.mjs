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
await shot(page, 'cave-0-mouth')
// Overview shots of the mouth from the side and from above (camera orbit set directly).
await sv(page, () => {
  const r = window.__sv.game.renderer
  r.rig.yaw0 = r.rig.yaw
  // Debug: light the cave materials so the rock faces are readable in screenshots.
  r.caves.group.traverse((o) => { if (o.material?.emissive) o.material.emissive.setRGB(0.35, 0.3, 0.25) })
})
for (const [name, yawOff, pitch, dist] of [['side', Math.PI / 2, 0.35, 14], ['top', 0, 1.3, 16], ['front-far', 0, 0.3, 14]]) {
  await sv(page, ([yo, pi, di]) => {
    const rig = window.__sv.game.renderer.rig
    const c = window.__sv.game.sim.world.caves[0]
    rig.yaw = rig.yaw0 + yo
    rig.pitch = pi
    rig.distance = di
  }, [yawOff, pitch, dist])
  await page.waitForTimeout(700)
  await shot(page, `cave-0-${name}`)
}
await sv(page, () => { const rig = window.__sv.game.renderer.rig; rig.pitch = 0.32; rig.distance = 6 })
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
