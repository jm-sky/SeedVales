#!/usr/bin/env node
/** Smoke: new game loads, HUD visible, player moves with WASD, screenshots of the start. */
import { check, launch, newGame, report, shot, sv } from './lib.mjs'

const { browser, page, logs } = await launch()
const results = []
const soundReqs = []
page.on('request', (r) => {
  if (r.url().includes('/sounds/')) soundReqs.push(Date.now())
})
try {
  const t0 = Date.now()
  await newGame(page)
  check(results, 'new game loads', true, `${((Date.now() - t0) / 1000).toFixed(1)} s`)
  await shot(page, 'smoke-start', 3000)
  // audio--001: no sound file is fetched before the first input (autoplay policy, no wasted bandwidth).
  const early = soundReqs.length
  check(results, 'no sound fetch before the first input', early === 0, `${early} requests`)
  const a = await sv(page, () => window.__sv.state())
  // Hold W until the player has moved > 1 m (max 10 s): a fixed 2.5 s hold depended on the software-rendering
  // frame rate (session 11: 0.78 m right after a reboot; same cause as mobile M1).
  await page.keyboard.down('KeyW')
  let moved = 0
  let b = a
  for (let t = 0; t < 40 && moved <= 1; t++) {
    await page.waitForTimeout(250)
    b = await sv(page, () => window.__sv.state())
    moved = Math.hypot(b.x - a.x, b.z - a.z)
  }
  await page.keyboard.up('KeyW')
  check(results, 'player moves with W', moved > 1, `${moved.toFixed(2)} m`)
  const late = soundReqs.length
  check(results, 'sounds load lazily after input (footsteps)', late > 0, `${late} requests`)
  await shot(page, 'smoke-moved')
  check(results, 'NPC goals present', b.npcGoals.some((g) => !g.endsWith(':null')), b.npcGoals.slice(0, 6).join(' | '))
} catch (e) {
  check(results, 'exception', false, String(e))
  await shot(page, 'smoke-error')
}
await browser.close()
process.exit(report('smoke', results, logs) ? 0 : 1)
