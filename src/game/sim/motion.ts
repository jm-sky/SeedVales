/**
 * Player vertical motion (combat--004, D-MOVE-1): transient per-Sim controller state (never saved) and the
 * support-height rule for airborne landing. Horizontal movement stays in `moveWithCollision`.
 * @domain sim
 */
import type { Sim } from './sim'
import { JUMP, SWIM_DEPTH_M, TRAVERSE } from '../config/calibration'
import { caveVolumeAt } from './caveSpace'
import { groundHeight } from './collision'
import { isDown } from './combat'

export interface PlayerMotion {
  grounded: boolean
  /** Vertical speed (m/s, up positive) while airborne. */
  vy: number
  /** One-shot request from input, consumed by `playerSystem`. */
  jumpRequested: boolean
}

const states = new WeakMap<Sim, PlayerMotion>()

export function motionOf(sim: Sim): PlayerMotion {
  let m = states.get(sim)
  if (!m) states.set(sim, (m = { grounded: true, vy: 0, jumpRequested: false }))
  return m
}

/** Exceptional relocation (teleport, KO wash-ashore, load): back on the ground at the support height, no stale arc. */
export function repairPlacement(sim: Sim, x: number, z: number) {
  const p = sim.player
  p.x = x
  p.z = z
  p.y = groundHeight(sim, x, z)
  const m = motionOf(sim)
  m.grounded = true
  m.vy = 0
  m.jumpRequested = false
  sim.actors.update(p)
}

/** One-shot jump request (Space / mobile button). Returns false when a jump is not possible right now. */
export function requestJump(sim: Sim): boolean {
  const m = motionOf(sim)
  const p = sim.player
  const px = sim.state.px
  if (!m.grounded || isDown(sim, p) || px.cart || px.activity) return false
  if (sim.terrain.waterDepthAt(p.x, p.z) > SWIM_DEPTH_M) return false
  if (p.vitals.stamina < JUMP.staminaCost) return false
  m.jumpRequested = true
  return true
}

/** Walk surface under an airborne player: a bridge deck counts only when the feet are above it (crossing from above), else the terrain. */
export function supportFor(sim: Sim, x: number, z: number, feetY: number): number {
  const cave = caveVolumeAt(sim, x, z)
  if (cave) return cave.floor // inside a cave the support is its floor, never the surface above
  const ground = groundHeight(sim, x, z)
  const terrain = sim.terrain.heightAt(x, z)
  return ground > terrain && feetY < ground - 0.3 ? terrain : ground
}

/** Local probe distance (m) of the landing check: short enough that a thin wall is not averaged away (review 019 #1). */
const LANDING_PROBE_M = 0.25

/** True when the ground at (x, z) is stable to stand on: no cardinal neighbour within the probe rises faster than the walk limit. */
export function stableSupport(sim: Sim, x: number, z: number): boolean {
  if (caveVolumeAt(sim, x, z)) return true // cave floors are walkable by construction
  const t = sim.terrain
  const h = t.heightAt(x, z)
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (Math.abs(t.heightAt(x + dx * LANDING_PROBE_M, z + dz * LANDING_PROBE_M) - h) / LANDING_PROBE_M > TRAVERSE.maxUphillRise) return false
  }
  return true
}
