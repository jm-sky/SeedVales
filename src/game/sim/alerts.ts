/**
 * Critical events force an immediate decision (AI-01): actors near a hit, a shot or a call for help
 * re-evaluate on their next update instead of waiting for their normal decision cadence.
 * @domain sim
 * @subdomain ai
 */
import type { Sim } from './sim'
import { perf } from '../diag/perf'

export function alertAround(sim: Sim, x: number, z: number, r: number) {
  for (const a of sim.actors.query(x, z, r)) {
    if (a.kind === 'player') continue
    a.ai.decideAt = 0
    perf.count('ai.alerts')
  }
}
