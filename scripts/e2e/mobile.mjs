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
  // Hold the stick forward until the character has moved > 1 m (max 10 s): a fixed 2.5 s drag depended on the
  // software-rendering frame rate (session 11: 350–400 ms frames on a loaded machine → 0.56 m, test failed).
  const a = await S(() => window.__sv.state())
  const box = await page.locator('[data-testid=joystick]').boundingBox()
  const jx = box.x + box.width / 2
  const jy = box.y + box.height / 2
  await page.dispatchEvent('[data-testid=joystick]', 'pointerdown', { pointerId: 7, pointerType: 'touch', clientX: jx, clientY: jy, isPrimary: true })
  for (let i = 1; i <= 4; i++) await page.dispatchEvent('[data-testid=joystick]', 'pointermove', { pointerId: 7, pointerType: 'touch', clientX: jx, clientY: jy - 15 * i })
  let moved = 0
  for (let t = 0; t < 40 && moved <= 1; t++) {
    await page.waitForTimeout(250)
    const b = await S(() => window.__sv.state())
    moved = Math.hypot(b.x - a.x, b.z - a.z)
  }
  await page.dispatchEvent('[data-testid=joystick]', 'pointerup', { pointerId: 7, pointerType: 'touch', clientX: jx, clientY: jy - 60 })
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
  const map = !!(await page.$('[data-testid^="autopilot-"]'))
  // Review 016 #13: the map canvas fits inside the viewport; #12: touch targets >= 32 px.
  const mapBox = await page.locator('[data-testid="map-canvas"]').boundingBox()
  const vp = page.viewportSize()
  check(results, 'M4b. mapa mobilna mieści się w ekranie (UI-04)', !!mapBox && mapBox.y + mapBox.height <= vp.height && mapBox.x + mapBox.width <= vp.width, JSON.stringify(mapBox))
  const closeBox = await page.locator('[data-testid="panel-close"]').boundingBox()
  check(results, 'M4c. przycisk zamknięcia ma >= 32 px (UI-04)', !!closeBox && closeBox.width >= 32 && closeBox.height >= 32, JSON.stringify(closeBox))
  await shot(page, 'mob-05-map')
  await tap('panel-close')
  const minimap = !!(await page.$('[data-testid="minimap"]'))
  check(results, 'M4. menu dotykowe: ekwipunek, wytwarzanie, mapa; minimapa w HUD', inv && craft && map && minimap)

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

  // Sneak toggle through the touch button (intent via Game, not direct state mutation).
  const sn0 = await S(() => window.__sv.game.sim.state.px.sneaking)
  await page.tap('[data-testid=touch-sneak]')
  const sn1 = await S(() => window.__sv.game.sim.state.px.sneaking)
  await page.tap('[data-testid=touch-sneak]')
  const sn2 = await S(() => window.__sv.game.sim.state.px.sneaking)
  check(results, 'M6. przycisk Skradanie przełącza tryb', sn1 === !sn0 && sn2 === sn0, `${sn0} → ${sn1} → ${sn2}`)

  // M7. Character screen and weapon switch button (UI-03), next-target button (UI-06).
  await tap('touch-menu-character')
  const charOpen = !!(await page.$('[data-testid="character-overview"]'))
  await shot(page, 'mob-07-character')
  await tap('panel-close')
  await S(() => {
    const sv = window.__sv
    sv.give('short_bow')
    sv.give('sword')
  })
  const w0 = await S(() => window.__sv.game.sim.player.eq.main?.id)
  await tap('touch-weapon')
  const w1 = await S(() => window.__sv.game.sim.player.eq.main?.id)
  await tap('touch-weapon')
  const w2 = await S(() => window.__sv.game.sim.player.eq.main?.id)
  check(results, 'M7. ekran postaci i przycisk Broń (przełącza wręcz/dystans)', charOpen && w1 !== w2 && [w1, w2].includes('short_bow'), { charOpen, w0, w1, w2 })
  await S(() => {
    const sv = window.__sv
    const sim = sv.game.sim
    const p = sim.player
    sv.pause(true)
    p.combat = false // outside combat the button cycles interaction targets (combat--001)
    const yaw = sv.game.renderer.rig.yaw
    p.rot = yaw
    for (const [id, d] of [['stone', 1.2], ['branch', 2.2]]) sim.addGround({ id: sim.nextId(), x: p.x + Math.sin(yaw) * d, z: p.z + Math.cos(yaw) * d, stack: { id, qty: 1 }, droppedAt: sim.state.time.cal, lit: false })
  })
  await page.waitForTimeout(800)
  const tg0 = await S(() => window.__sv.game.target?.label)
  await tap('touch-next-target')
  await page.waitForTimeout(500)
  const tg1 = await S(() => window.__sv.game.target?.label)
  check(results, 'M8. przycisk Cel przełącza cel interakcji', !!tg0 && !!tg1 && tg0 !== tg1, `${tg0} → ${tg1}`)
  // M8b (combat--001): in combat the same button locks the combat target.
  await S(() => {
    const sv = window.__sv
    sv.game.sim.player.combat = true
    sv.spawn('sheep', 0, 4)
  })
  await tap('touch-next-target')
  await page.waitForTimeout(400)
  const mLock = await S(() => window.__sv.game.combatTargetId)
  check(results, 'M8b. w walce przycisk Cel blokuje cel walki', mLock !== null, { mLock })
  await S(() => {
    window.__sv.pause(false)
    window.__sv.game.sim.player.combat = true
  })
  const blockBtn = page.locator('[data-testid="touch-block"]')
  const bb = await blockBtn.boundingBox()
  await page.dispatchEvent('[data-testid="touch-block"]', 'pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: bb.x + 5, clientY: bb.y + 5 })
  await page.waitForTimeout(300)
  await S(() => window.__sv.step(0.3))
  const mHeld = await S(() => window.__sv.guard().held)
  await page.dispatchEvent('[data-testid="touch-block"]', 'pointercancel', { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true })
  await page.waitForTimeout(300)
  await S(() => window.__sv.step(0.3))
  const mFree = await S(() => window.__sv.guard().held)
  check(results, 'M8c. przycisk Block trzyma gardę, pointercancel ją zwalnia', mHeld && !mFree, { mHeld, mFree })
  await S(() => {
    window.__sv.game.sim.player.combat = false
  })
  await S(() => window.__sv.pause(false))
  await shot(page, 'mob-08-target')

  // M9. Settings from the touch menu (UI-05).
  await tap('touch-menu-menu')
  await tap('menu-settings')
  const settings = !!(await page.$('[data-testid="quality-low"]'))
  await shot(page, 'mob-09-settings')
  await tap('panel-close')
  await tap('panel-close')
  check(results, 'M9. ustawienia dostępne z menu dotykowego', settings)
  // M10. FIRE-03: the quick panel is reachable from the touch menu and plants a torch.
  await S(() => {
    const sv = window.__sv
    sv.game.sim.player.eq.off = undefined
    sv.game.sim.player.inv.items = sv.game.sim.player.inv.items.filter((x) => x.id !== 'torch')
    sv.give('torch', 1)
  })
  await tap('touch-menu-quick')
  await tap('quick-plant_torch')
  const planted = await S(() => window.__sv.game.sim.state.ground.some((g) => g.planted && g.stack.id === 'torch'))
  check(results, 'M10. menu dotykowe → szybkie akcje → wbicie pochodni', planted)

  // M11. QUEST-03: an authored quest topic in the dialog and the journal, by touch.
  const minerId = await S(() => {
    const sv = window.__sv
    sv.pause(false)
    window.__qok = sv.forceQuest('q03')
    const sim = sv.game.sim
    const st = sim.state.authoredQuests.q03
    const miles = sim.human(st.cast.miles)
    sim.building(sim.state.households[miles.householdId].houseId).durability = 40
    sv.pause(true)
    sv.approach(miles.x, miles.z, 1.4)
    sv.face(miles.x, miles.z)
    sv.game.pinnedTarget = `npc:${miles.id}`
    return miles.id
  })
  await page.waitForTimeout(1200)
  await tap('touch-interact')
  await tap('opt-talk')
  await tap('quest-topic-q03')
  await tap('quest-opt-show_damage')
  const questActive = await S(() => window.__sv.game.sim.state.authoredQuests.q03.status)
  await tap('panel-close')
  await tap('touch-menu-journal')
  const journalOpen = !!(await page.$('[data-testid="journal-quest-q03"]'))
  await shot(page, 'mob-11-journal')
  await tap('panel-close')
  await S(() => window.__sv.pause(false))
  check(results, 'M11. dotyk: temat zadania w dialogu → przyjęcie → Dziennik (Journal)', minerId > 0 && questActive === 'active' && journalOpen, { questActive, journalOpen })
} catch (e) {
  check(results, 'exception', false, String(e).slice(0, 300))
  await shot(page, 'mob-error')
}
await browser.close()
process.exit(report('mobile', results, logs) ? 0 : 1)
