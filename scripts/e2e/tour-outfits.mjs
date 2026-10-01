#!/usr/bin/env node
/** Close-up shots of profession outfits (render--005 review). */
import { startServer } from './server.mjs'
const server = await startServer()
process.env.SV_URL = server.url
const { launch, newGame, shot, sv } = await import('./lib.mjs')
const { browser, page } = await launch()
await newGame(page, '1337', 'medium')
const profs = ['guard', 'hunter', 'trader', 'blacksmith', 'herbalist', 'farmer']
for (const p of profs) {
  for (const sex of [true, false]) {
    const ok = await sv(page, ([p, sex]) => {
      const s = window.__sv
      const n = s.game.sim.state.npcs.find((x) => x.profession === p && x.age === 'adult' && x.male === sex)
      if (!n) return false
      const st = s.game.sim.world.settlements[n.settlementId]
      s.pause(false); s.setHour(11)
      const px = st.x + 10, pz = st.z + 25
      n.x = px; n.z = pz; n.y = s.game.sim.terrain.heightAt(px, pz); n.vx = -1.4; n.vz = 0; n.rot = Math.PI / 2 + 0.4
      s.teleport(px + 1.6, pz + 1.0); s.game.renderer.rig.yaw = -Math.PI / 2; s.game.renderer.rig.distance = 3.2; s.game.renderer.rig.pitch = 0.1
      s.pause(true)
      return true
    }, [p, sex])
    if (!ok) { console.log('none', p, sex); continue }
    await page.waitForTimeout(1200)
    await shot(page, `outfit-${p}-${sex ? 'm' : 'f'}`)
  }
}
await browser.close()
await server.close?.()
process.exit(0)
