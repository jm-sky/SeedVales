/**
 * Blood traces (TRACE-01, simulation part): hits leave blood on the ground, merged with nearby
 * traces; they fade over calendar time (faster in rain) and lure hungry predators. Rendering
 * (decals) lives in render/. Bounded: at most TRACE.max traces (oldest dropped).
 * @domain sim
 * @subdomain traces
 */
import type { Sim } from './sim'
import type { Trace } from './types'
import { CALENDAR_SPEED, TRACE } from '../config/calibration'
import { perf } from '../diag/perf'

export function bleedAt(sim: Sim, x: number, z: number, dmg: number) {
  if (dmg <= 0) return
  const add = Math.min(1, dmg / TRACE.dmgFull)
  const near = sim.tracesNear(x, z, TRACE.mergeM)[0]
  if (near) {
    near.intensity = Math.min(1, near.intensity + add)
    near.at = sim.state.time.cal
    return
  }
  if (sim.state.traces.length >= TRACE.max) sim.removeTrace(sim.state.traces[0]!)
  sim.addTrace({ id: sim.nextId(), x, z, intensity: add, at: sim.state.time.cal })
  perf.count('traces.added')
}

/** Calendar fading; rain washes blood away faster. */
export function traceSystem(sim: Sim, dt: number) {
  const hours = (dt * CALENDAR_SPEED) / 3600
  const w = sim.weather
  const raining = w.kind === 'rain' || w.kind === 'storm'
  // Any rain washes blood away; heavier rain faster (×rainMul at full intensity).
  const rainMul = raining ? 1 + (TRACE.rainMul - 1) * Math.max(0.5, Math.min(1, w.intensity)) : 1
  const rate = TRACE.decayPerH * rainMul * hours
  const traces = sim.state.traces
  for (let i = traces.length - 1; i >= 0; i--) {
    const t = traces[i]!
    t.intensity -= rate
    if (t.intensity <= 0) sim.removeTrace(t)
  }
  perf.gauge('traces.count', traces.length)
}

/** Strongest trace a predator at (x, z) can smell (range scales with intensity), or null. */
export function smellTrace(sim: Sim, x: number, z: number, skipId?: number): Trace | null {
  let best: Trace | null = null
  let score = 0
  for (const t of sim.tracesNear(x, z, TRACE.smellM)) {
    if (t.id === skipId) continue
    const d = Math.hypot(t.x - x, t.z - z)
    if (d > TRACE.smellM * t.intensity || d < 3) continue
    const s = t.intensity / (1 + d / 20)
    if (s > score) {
      score = s
      best = t
    }
  }
  return best
}
