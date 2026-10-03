#!/usr/bin/env node
/** Close-up shots of the player and an NPC wearing armour modules (render--011 review). */
import { startServer } from './server.mjs'
const server = await startServer()
process.env.SV_URL = server.url
const { launch, newGame, shot, sv } = await import('./lib.mjs')
const { browser, page } = await launch()
await newGame(page, '1337', 'medium')
const sets = { none: [], plate: ['torso_outer:plate_cuirass', 'shoulders_outer:pauldrons'], helm: ['head_outer:iron_helm'], full: ['torso_outer:plate_cuirass', 'shoulders_outer:pauldrons', 'head_outer:iron_helm', 'boots_outer:leather_boots'] }
for (const [prof, sex] of [['farmer', false], ['guard', true], ['herbalist', true]]) {
  for (const [name, items] of Object.entries(sets)) {
    const ok = await sv(page, ([prof, sex, items]) => {
      const s = window.__sv
      const n = s.game.sim.state.npcs.find((x) => x.profession === prof && x.age === 'adult' && x.male === sex)
      if (!n) return false
      n.eq.armor = {}
      s.game.sim.player.eq.armor = {}
      for (const it of items) { const [slot, id] = it.split(':'); n.eq.armor[slot] = { id, qty: 1, dur: 300 }; s.game.sim.player.eq.armor[slot] = { id, qty: 1, dur: 300 } }
      const st = s.game.sim.world.settlements[n.settlementId]
      s.pause(false); s.setHour(11)
      const px = st.x + 10, pz = st.z + 25
      n.x = px; n.z = pz; n.y = s.game.sim.terrain.heightAt(px, pz); n.vx = 0; n.vz = 0; n.rot = Math.PI / 2 + 0.4
      s.teleport(px + 1.6, pz + 1.0); s.game.renderer.rig.yaw = -Math.PI / 2; s.game.renderer.rig.distance = 1.9; s.game.renderer.rig.pitch = 0.1
      s.pause(true)
      return true
    }, [prof, sex, items])
    if (!ok) { console.log('none', prof, sex); continue }
    await page.waitForTimeout(1200)
    await shot(page, `eq-${prof}-${sex ? 'm' : 'f'}-${name}`)
  }
}
await browser.close()
await server.close?.()
process.exit(0)
