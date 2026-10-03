/**
 * Directional combat dodge (combat--003, D-COMBAT-3): transient per-Sim state (never saved). A short, fixed-direction,
 * collision-aware displacement over gameplay seconds; no invulnerability — it is proactive spacing, because melee
 * damage resolves synchronously at the attack call (Opus decision 1A).
 * @domain sim
 */
import type { Sim } from './sim'
import { DODGE } from '../config/calibration'
import { isDown } from './combat'
import { carriedWeight, carryCapacity } from './inventory'
import { motionOf } from './motion'

export interface DodgeState {
  dirX: number
  dirZ: number
  startedAt: number
  activeUntil: number
  recoveryUntil: number
}

const states = new WeakMap<Sim, DodgeState>()

export function dodgeOf(sim: Sim): DodgeState {
  let d = states.get(sim)
  if (!d) states.set(sim, (d = { dirX: 0, dirZ: 0, startedAt: -1e9, activeUntil: 0, recoveryUntil: 0 }))
  return d
}

export const isDodging = (sim: Sim) => sim.state.time.play < dodgeOf(sim).activeUntil

/** Starts a dodge along (dirX, dirZ) (normalised here); returns null on success or the refusal reason. */
export function requestDodge(sim: Sim, dirX: number, dirZ: number): string | null {
  const p = sim.player
  const px = sim.state.px
  const now = sim.state.time.play
  const d = dodgeOf(sim)
  if (!p.combat) return 'Dodging needs combat mode.'
  if (isDown(sim, p)) return 'You cannot dodge now.'
  if (px.activity) return 'You are busy.'
  if (px.cart) return 'Both hands are on the cart.'
  if (!motionOf(sim).grounded) return 'You are in the air.'
  if (sim.terrain.waterDepthAt(p.x, p.z) > DODGE.maxWaterM) return 'Too deep to dodge.'
  if (carriedWeight(p) > carryCapacity(p)) return 'You are carrying too much to dodge.'
  if (now < d.recoveryUntil) return 'Not yet.'
  if (p.action?.kind === 'swing' && now - p.action.at < DODGE.strikeCommitS) return 'You are mid-swing.'
  if (p.vitals.stamina < DODGE.staminaCost) return 'Too tired to dodge.'
  const len = Math.hypot(dirX, dirZ)
  if (len < 1e-6) return 'No direction.'
  p.vitals.stamina -= DODGE.staminaCost
  px.bowDraw = 0 // cancels the draw without firing (decision 5A)
  px.autopilot = undefined
  d.dirX = dirX / len
  d.dirZ = dirZ / len
  d.startedAt = now
  d.activeUntil = now + DODGE.durationS
  d.recoveryUntil = now + DODGE.recoveryS
  return null
}
