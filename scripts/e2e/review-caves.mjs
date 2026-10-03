#!/usr/bin/env node
/**
 * Cave visual review (world--003 step 9): the same shots of several caves with the game's real lighting (no debug
 * emissive), for before/after comparison. Picks the first small cave, the large cave, the steepest and the
 * flattest mouth. Shots per cave: approach, front/side/side2/above/from-hill overview around the mouth, threshold
 * from outside, threshold from inside looking out, first tunnel (no torch / torch), chamber (no torch / torch /
 * high camera); draw attribution in the chamber is printed.
 * Usage: node scripts/e2e/review-caves.mjs [seed=1337] [tag=now] → test-results/e2e/cave-review/<tag>/
 */
import fs from 'node:fs'
import path from 'node:path'
import { startServer } from './server.mjs'
const server = await startServer()
process.env.SV_URL = server.url
const { launch, newGame, OUT, sv } = await import('./lib.mjs')
const { browser, page, logs } = await launch()
const seed = process.argv[2] ?? '1337'
const tag = process.argv[3] ?? 'now'
await newGame(page, seed, 'medium')
const dir = path.join(OUT, 'cave-review', tag)
fs.mkdirSync(dir, { recursive: true })
const shot = async (n) => {
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(dir, `${seed}-${n}.png`) })
}
const clearNoon = () => sv(page, () => {
  const s = window.__sv
  s.setHour(12)
  Object.assign(s.game.sim.state.weather, { kind: 'clear', intensity: 0, wetness: 0, fog: 0, until: s.game.sim.state.time.cal + 30 * 86400 })
})

const list = await sv(page, () => {
  const s = window.__sv
  const t = s.game.sim.terrain
  return s.game.sim.world.caves.map((c, i) => {
    const dx = Math.sin(c.yaw) * 6
    const dz = Math.cos(c.yaw) * 6
    const slope = Math.abs(t.heightAt(c.x + dx, c.z + dz) - t.heightAt(c.x - dx, c.z - dz)) / 12
    return { i, name: c.name, size: c.size, slope: +slope.toFixed(2) }
  })
})
console.log(JSON.stringify(list))
const pick = new Set()
const first = (size) => list.find((c) => c.size === size)
if (first('small')) pick.add(first('small').i)
if (first('large')) pick.add(first('large').i)
pick.add([...list].sort((a, b) => b.slope - a.slope)[0].i)
pick.add([...list].sort((a, b) => a.slope - b.slope)[0].i)

/** Camera orbit relative to the yaw the player faced when placed. */
const cam = (yawOff, pitch, dist) => sv(page, ([yo, pi, di]) => {
  const rig = window.__sv.game.renderer.rig
  rig.yaw = rig.yaw0 + yo
  rig.pitch = pi
  rig.distance = di
}, [yawOff, pitch, dist])
/** Player on the cave floor at spine point `k`, facing along the spine (or back toward the mouth). */
const inside = (i, k, back) => sv(page, ([i, k, back]) => {
  const s = window.__sv
  const sim = s.game.sim
  const sp = sim.world.caves[i].spine
  const at = Math.min(sp.length / 3 - 2, k)
  const x = sp[at * 3]
  const z = sp[at * 3 + 1]
  const yaw = Math.atan2(sp[at * 3 + 3] - x, sp[at * 3 + 4] - z) + (back ? Math.PI : 0)
  sim.player.x = x
  sim.player.z = z
  sim.player.y = sim.terrain.caves.grid(i).floorAt(x, z)
  sim.state.px.cave = i + 1
  sim.player.rot = yaw
  const rig = s.game.renderer.rig
  rig.yaw = rig.yaw0 = yaw
  rig.pitch = 0.3
  rig.distance = 6
}, [i, k, back])
const torch = (on) => sv(page, (on) => { window.__sv.game.sim.player.eq.off = on ? { id: 'torch', qty: 1, dur: 60 } : null }, on)
const atMouth = (i, back) => sv(page, ([i, back]) => {
  const s = window.__sv
  s.teleportToCave(i, back)
  const r = s.game.renderer.rig
  r.yaw0 = r.yaw
}, [i, back])

for (const i of pick) {
  const c = list[i]
  const t = `c${i}-${c.size}-sl${c.slope}`
  await torch(false)
  await clearNoon()
  await atMouth(i, 12)
  await page.waitForTimeout(1500)
  await cam(0, 0.12, 6)
  await shot(`${t}-01-approach`)
  await atMouth(i, 3)
  await cam(0, 0.15, 12)
  await shot(`${t}-02-front`)
  await cam(Math.PI / 2, 0.3, 13)
  await shot(`${t}-03-side`)
  await cam(-Math.PI / 2, 0.3, 13)
  await shot(`${t}-04-side2`)
  await cam(0, 1.25, 16)
  await shot(`${t}-05-above`)
  await cam(Math.PI * 0.8, 0.5, 12)
  await shot(`${t}-06-from-hill`)
  await atMouth(i, 1)
  await cam(0, 0.2, 5)
  await shot(`${t}-07-threshold-out`)
  // First spine point under a roof: the threshold seen from inside.
  const roof = await sv(page, (i) => {
    const sim = window.__sv.game.sim
    const g = sim.terrain.caves.grid(i)
    const sp = sim.world.caves[i].spine
    for (let k = 0; k < sp.length / 3; k++) if (g.flagAt(sp[k * 3], sp[k * 3 + 1]) === 1) return k
    return 1
  }, i)
  await inside(i, roof, true)
  await shot(`${t}-08-threshold-in-lookout`)
  await inside(i, roof, false)
  await shot(`${t}-09-first-tunnel`)
  await torch(true)
  await shot(`${t}-10-first-tunnel-torch`)
  const chamber = await sv(page, (i) => {
    const sp = window.__sv.game.sim.world.caves[i].spine
    let b = 0
    for (let k = 0; k < sp.length / 3; k++) if (sp[k * 3 + 2] > sp[b * 3 + 2]) b = k
    return b
  }, i)
  await torch(false)
  await inside(i, Math.max(0, chamber - 1), false)
  await shot(`${t}-11-chamber`)
  await torch(true)
  await shot(`${t}-12-chamber-torch`)
  await cam(0, 0.9, 8)
  await shot(`${t}-13-chamber-torch-high`)
  const att = await sv(page, () => window.__sv.drawAttribution())
  console.log(t, 'chamber draws', JSON.stringify({ total: att.total, triangles: att.triangles, by: att.by }))
}
console.log(`shots in ${dir}; console errors: ${logs.length}`, logs.slice(0, 5))
await browser.close()
await server.close?.()
process.exit(0)
