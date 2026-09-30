#!/usr/bin/env node
/**
 * Mobile scenario (§9 pt 10): landscape phone viewport with touch. Joystick movement, camera drag,
 * Akcja button on a target, touch menus (inventory/craft/quests/map), attack button, panel close.
 * NOTE: emulated viewport + SwiftShader — does not prove real-phone performance.
 */
import { check, launch, newGame, report, shot, sv } from './lib.mjs'

const results = []
const { browser, page, logs } = await launch({ mobile: true })
const S = (fn, arg) => sv(page, fn, arg)
const tap = async (id, wait = 500) => {
  await page.tap(`[data-testid="${id}"]`, { timeout: 8000 })
  await page.waitForTimeout(wait)
}
/** Drag with touch events via CDP-less pointer emulation (Playwright touchscreen has tap only). */
async function drag(selector, dx, dy, ms = 1500) {
  const box = await page.locator(selector).boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.dispatchEvent(selector, 'pointerdown', { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true })
  const steps = 8
  for (let i = 1; i <= steps; i++) {
    await page.dispatchEvent(selector, 'pointermove', { pointerId: 7, pointerType: 'touch', clientX: x + (dx * i) / steps, clientY: y + (dy * i) / steps })
    await page.waitForTimeout(ms / steps)
  }
  await page.dispatchEvent(selector, 'pointerup', { pointerId: 7, pointerType: 'touch', clientX: x + dx, clientY: y + dy })
}

try {
  await newGame(page, '1337')
  const isTouch = await S(() => window.__sv.game.isTouch)
  check(results, 'M0. wykryto urządzenie dotykowe → kontrolki mobile', isTouch && !!(await page.$('[data-testid=joystick]')))
  await page.waitForTimeout(2000)
  await shot(page, 'mob-01-start')

  // Movement via joystick.
  const a = await S(() => window.__sv.state())
  await drag('[data-testid=joystick]', 0, -60, 2500)
  const b = await S(() => window.__sv.state())
  const moved = Math.hypot(b.x - a.x, b.z - a.z)
  check(results, 'M1. joystick porusza postacią', moved > 1, `${moved.toFixed(2)} m`)

  // Camera drag on the right half.
  const yaw0 = await S(() => window.__sv.game.renderer.rig.yaw)
  await drag('[data-testid=touch-look]', -120, 0, 600)
  const yaw1 = await S(() => window.__sv.game.renderer.rig.yaw)
  check(results, 'M2. przeciąganie obraca kamerę', Math.abs(yaw1 - yaw0) > 0.1, `${yaw0.toFixed(2)} → ${yaw1.toFixed(2)}`)

  // Akcja button on a well (drink).
  await S(() => {
    const sv = window.__sv
    const w = sv.game.sim.state.buildings.find((x) => x.kind === 'well' && x.settlementId === 0)
    sv.setNeeds({ thirst: 30 })
    sv.pause(true)
    sv.approach(w.x, w.z, 1.8)
  })
  await page.waitForTimeout(1200)
  await tap('touch-interact')
  const menuOpen = !!(await page.$('[data-testid="opt-drink_well"]'))
  if (menuOpen) await tap('opt-drink_well')
  await S(() => {
    const sv = window.__sv
    sv.pause(false)
    let t = 0
    while (sv.game.sim.state.px.activity && t < 30) {
      sv.simStep(0.5)
      t += 0.5
    }
  })
  const thirst = await S(() => window.__sv.game.sim.player.vitals.thirst)
  await shot(page, 'mob-02-after-drink')
  check(results, 'M3. przycisk Akcja → menu opcji → picie ze studni', menuOpen && thirst > 60, `thirst=${thirst.toFixed(0)}`)

  // Touch menus.
  await tap('touch-menu-inventory')
  const inv = !!(await page.$('[data-testid=panel]'))
  await shot(page, 'mob-03-inventory')
  await tap('panel-close')
  await tap('touch-menu-craft')
  const craft = !!(await page.$('[data-testid="craft-club"]'))
  await shot(page, 'mob-04-craft')
  await tap('panel-close')
  await tap('touch-menu-map')
  const map = !!(await page.$('[data-testid="autopilot-1"]'))
  await shot(page, 'mob-05-map')
  await tap('panel-close')
  check(results, 'M4. menu dotykowe: ekwipunek, wytwarzanie, mapa', inv && craft && map)

  // Attack button hits an adjacent deer (auto-target cone is wider on touch).
  await S(() => {
    const sv = window.__sv
    const yaw = sv.game.renderer.rig.yaw + 1.2
    const id = sv.spawn('deer', Math.sin(yaw) * 1.5, Math.cos(yaw) * 1.5)
    window.__deer = id
    sv.pause(true)
  })
  const hp0 = await S(() => { const d = window.__sv.game.sim.actor(window.__deer); return Object.values(d.vitals.parts).reduce((x, y) => x + y, 0) })
  for (let i = 0; i < 6; i++) {
    await S(() => window.__sv.game.sim.player.attackReadyAt = 0)
    await page.dispatchEvent('[data-testid=touch-attack]', 'pointerdown', { pointerId: 9, pointerType: 'touch' })
    await page.dispatchEvent('[data-testid=touch-attack]', 'pointerup', { pointerId: 9, pointerType: 'touch' })
    await page.waitForTimeout(150)
  }
  const hp1 = await S(() => { const d = window.__sv.game.sim.actor(window.__deer); return d ? Object.values(d.vitals.parts).reduce((x, y) => x + y, 0) : 999 })
  check(results, 'M5. przycisk Atak z auto-celowaniem (sarna z boku)', hp1 > hp0, `${hp0.toFixed(1)} → ${hp1.toFixed(1)}`)
  await S(() => window.__sv.pause(false))
  await shot(page, 'mob-06-combat')
} catch (e) {
  check(results, 'exception', false, String(e).slice(0, 300))
  await shot(page, 'mob-error')
}
await browser.close()
process.exit(report('mobile', results, logs) ? 0 : 1)
