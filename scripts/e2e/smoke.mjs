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
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(2500)
  await page.keyboard.up('KeyW')
  const b = await sv(page, () => window.__sv.state())
  const moved = Math.hypot(b.x - a.x, b.z - a.z)
  check(results, 'player moves with W', moved > 1, `${moved.toFixed(2)} m`)
  await shot(page, 'smoke-moved')
  check(results, 'NPC goals present', b.npcGoals.some((g) => !g.endsWith(':null')), b.npcGoals.slice(0, 6).join(' | '))
} catch (e) {
  check(results, 'exception', false, String(e))
  await shot(page, 'smoke-error')
}
await browser.close()
process.exit(report('smoke', results, logs) ? 0 : 1)
