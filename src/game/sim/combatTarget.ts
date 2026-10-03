/**
 * Combat target lock core (combat--001, D-COMBAT-1): candidate eligibility, threat classes, ranking and
 * deterministic cycling. Pure reads over the spatial index (never a full-world scan); lock state itself
 * lives in `Game` (transient, not saved).
 * @domain sim
 */
import type { Sim } from './sim'
import type { Actor, Animal } from './types'
import { COMBAT_LOCK } from '../config/calibration'
import { angleDiff } from '../core/math'
import { SPECIES } from '../data/species'
import { layersApart } from './caveSpace'
import { isDown, isProtected } from './combat'

export type CombatClass = 'threat' | 'dangerous' | 'neutral'

export interface CombatCandidate {
  actor: Actor
  cls: CombatClass
  dist: number
  /** Angle between the camera yaw and the bearing to the actor (rad, 0..π). */
  angle: number
  score: number
}

/** Can this actor be locked at all (alive, standing, not protected, not the player)? */
export function lockable(sim: Sim, player: Actor, a: Actor): boolean {
  return a !== player && !a.vitals.dead && !isDown(sim, a) && !isProtected(sim, a)
}

/** Threat class: animals actively attacking the player or rabid are threats, dangerous/aggressive wild animals next, everything else neutral. */
export function classify(sim: Sim, player: Actor, a: Actor): CombatClass {
  if (a.kind !== 'animal') return 'neutral'
  const an = a as Animal
  const sp = SPECIES[an.species]
  if (an.rabid || (an.aggroId === player.id && (an.aggroUntil ?? 0) > sim.state.time.play)) return 'threat'
  if (sp.dangerous || sp.temperament === 'aggressive' || sp.temperament === 'predator') return 'dangerous'
  return 'neutral'
}

/** Lockable actors around the player, best first; stable by actor id for equal scores. */
export function combatCandidates(sim: Sim, player: Actor, camYaw: number): CombatCandidate[] {
  const out: CombatCandidate[] = []
  const halfCone = (COMBAT_LOCK.coneDeg * Math.PI) / 360
  for (const a of sim.actors.query(player.x, player.z, COMBAT_LOCK.rangeM)) {
    if (!lockable(sim, player, a) || layersApart(sim, player, a)) continue
    const dist = Math.hypot(a.x - player.x, a.z - player.z)
    if (dist > COMBAT_LOCK.rangeM) continue
    const angle = Math.abs(angleDiff(camYaw, Math.atan2(a.x - player.x, a.z - player.z)))
    const cls = classify(sim, player, a)
    // Targets behind the camera rank after every visible one of the same class (a close one behind never beats a visible threat).
    const behind = angle > halfCone ? COMBAT_LOCK.rangeM * 2 : 0
    out.push({ actor: a, cls, dist, angle, score: COMBAT_LOCK.classPenalty[cls] + dist + angle * 4 + behind })
  }
  return out.sort((x, y) => x.score - y.score || x.actor.id - y.actor.id)
}

/** The candidate after `currentId` in rank order (wraps); the best one when nothing is locked or the lock left the list. */
export function nextCombatTarget(list: readonly CombatCandidate[], currentId: number | null): CombatCandidate | null {
  if (!list.length) return null
  const i = currentId === null ? -1 : list.findIndex((c) => c.actor.id === currentId)
  return list[(i + 1) % list.length]!
}

export type LockDrop = 'gone' | 'down' | 'range'

/** Why an existing lock must end now (null = still valid); `look-away` is handled by the caller's timer. */
export function lockInvalid(sim: Sim, player: Actor, id: number): LockDrop | null {
  const a = sim.actor(id)
  if (!a || a.vitals.dead) return 'gone'
  if (isDown(sim, a) || isProtected(sim, a)) return 'down'
  if (Math.hypot(a.x - player.x, a.z - player.z) > COMBAT_LOCK.dropRangeM) return 'range'
  return null
}

/** Rotates `from` toward `to` by at most `maxRad` along the shortest way. */
export function turnToward(from: number, to: number, maxRad: number): number {
  const d = angleDiff(from, to)
  return from + Math.max(-maxRad, Math.min(maxRad, d))
}

/** World-space movement for target-relative controls: `ay` approaches/retreats along the bearing, `ax` strafes (orbits). */
export function lockedMove(bearing: number, ax: number, ay: number): { mx: number; mz: number } {
  const fx = Math.sin(bearing)
  const fz = Math.cos(bearing)
  return { mx: fx * ay - fz * ax, mz: fz * ay + fx * ax }
}
