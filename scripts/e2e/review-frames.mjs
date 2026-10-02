/**
 * review-frames: the `ab.mjs` frame list (frames.mjs) on the `low` and `medium` quality profiles, screenshots only.
 * SV_FRAMES=a,b limits the frames, SV_AB_WAIT=<ms> the wait per frame (default 4500, software rendering).
 */
import { FRAMES } from './frames.mjs'

export default async function (rt) {
  const only = process.env.SV_FRAMES?.split(',')
  const frames = only ? FRAMES.filter(([n]) => only.includes(n)) : FRAMES
  const wait = Number(process.env.SV_AB_WAIT ?? 4500)
  for (const quality of ['low', 'medium']) {
    const s = await rt.start({ quality })
    await s.S(() => window.__sv.pause(true))
    for (const [name, setup] of frames) {
      await rt.step(`${quality}-${name}`, async () => {
        const warnings = []
        const onConsole = (m) => m.type() === 'warning' && m.text().startsWith('rolling-hills') && warnings.push(m.text())
        s.page.on('console', onConsole)
        await s.S((src) => new Function('sv', `(${src})(sv)`)(window.__sv), setup.toString())
        await s.page.waitForTimeout(wait)
        s.page.off('console', onConsole)
        const file = await s.snap(`${quality}-${name}`)
        const cam = await s.S(() => {
          const sv = window.__sv
          const p = sv.game.sim.player
          return { x: Math.round(p.x), z: Math.round(p.z), hour: window.__rv.clock().hour, weather: sv.game.sim.state.weather.kind, distance: sv.game.renderer.rig.distance }
        })
        return { file, ...cam, ...(warnings.length ? { warnings } : {}) }
      })
    }
    await s.browser.close()
  }
}
