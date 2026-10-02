#!/usr/bin/env node
/** Smoke: new game loads, HUD visible, player moves with WASD, screenshots of the start. */
import { check, launch, newGame, report, shot, sv } from './lib.mjs'

const { browser, page, logs } = await launch()
const results = []
try {
  const t0 = Date.now()
  await newGame(page)
  check(results, 'new game loads', true, `${((Date.now() - t0) / 1000).toFixed(1)} s`)
  await page.waitForTimeout(3000)
  await shot(page, 'smoke-start')
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
  await shot(page, 'smoke-moved')
  check(results, 'NPC goals present', b.npcGoals.some((g) => !g.endsWith(':null')), b.npcGoals.slice(0, 6).join(' | '))
} catch (e) {
  check(results, 'exception', false, String(e))
  await shot(page, 'smoke-error')
}
await browser.close()
process.exit(report('smoke', results, logs) ? 0 : 1)
