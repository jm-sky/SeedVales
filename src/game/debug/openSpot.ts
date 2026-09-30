/**
 * Open, gently sloped dry spot near a settlement (no buildings within 16 m, a well fits at +4 m x,
 * flat 14 m ahead in +z). Found by search, so tests/e2e do not depend on a particular layout
 * (layouts change with GEN_VERSION).
 * @domain debug
 */
import type { Sim } from '../sim/sim'
import { blueprintById } from '../data/recipes'
import { canPlace } from '../sim/build'

export function openSpot(sim: Sim, minR = 30, settlementId = 0): { x: number; z: number } {
  const s = sim.world.settlements[settlementId]!
  const well = blueprintById('well')!
  const t = sim.terrain
  for (let r = minR; r < minR + 400; r += 6) {
    for (let a = 0; a < Math.PI * 2; a += 0.25) {
      const x = s.x + Math.cos(a) * r
      const z = s.z + Math.sin(a) * r
      if (sim.buildingsNear(x, z, 16).length) continue
      if (!canPlace(sim, well, x + 4, z).ok) continue
      let ok = true
      for (let k = 0; k <= 14 && ok; k += 2) ok = t.waterDepthAt(x, z + k) <= 0 && Math.abs(t.heightAt(x, z + k) - t.heightAt(x, z)) < 0.8
      if (ok) return { x, z }
    }
  }
  throw new Error(`openSpot: no open spot near settlement ${settlementId}`)
}
