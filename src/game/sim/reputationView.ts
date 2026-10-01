/**
 * Read-only helpers for displaying location and reputation.
 * @domain social
 */
import type { Sim } from './sim'
import { settlementAt } from './reputation'

export function reputationLabel(sim: Sim): string {
  const p = sim.player
  const sid = settlementAt(sim, p.x, p.z, 60)
  if (sid !== null) return sim.world.settlements[sid]!.name
  let best = ''
  let bd = Infinity
  for (const s of sim.world.settlements) {
    const d = Math.hypot(s.x - p.x, s.z - p.z)
    if (d < bd) {
      bd = d
      best = s.name
    }
  }
  return `${(bd / 1000).toFixed(1)} km to ${best}`
}
