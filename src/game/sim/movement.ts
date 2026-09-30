/**
 * Shared AI locomotion: steer towards a point with collision, stuck detection & side-stepping,
 * road routing for long trips (road graph = generated road polylines).
 * @domain sim
 * @subdomain pathfinding
 */
import type { Sim } from './sim'
import type { Actor } from './types'
import { SWIM_DEPTH_M } from '../config/calibration'
import { angleDiff } from '../core/math'
import { perf } from '../diag/perf'
import { moveWithCollision } from './collision'

/**
 * Moves actor towards (tx,tz). Returns 'arrived' | 'moving' | 'stuck'.
 * `full` enables collisions (near LOD). Far actors glide (cheap).
 */
export function steerTo(
  sim: Sim,
  a: Actor & { ai: { stuckT: number } },
  tx: number,
  tz: number,
  speed: number,
  dt: number,
  range: number,
  full: boolean,
  radius = 0.35,
): 'arrived' | 'moving' | 'stuck' {
  const dx = tx - a.x
  const dz = tz - a.z
  const d = Math.hypot(dx, dz)
  if (d <= range) {
    a.moving = 'idle'
    return 'arrived'
  }
  const want = Math.atan2(dx, dz)
  // Turn smoothly (visual), but move along desired direction.
  a.rot += angleDiff(a.rot, want) * Math.min(1, dt * 8)
  const depth = full ? sim.terrain.waterDepthAt(a.x, a.z) : 0
  const sp = depth > SWIM_DEPTH_M ? Math.min(speed, 0.8) : speed
  const step = Math.min(d - range * 0.5, sp * dt)
  const ox = a.x
  const oz = a.z
  let dirx = dx / d
  let dirz = dz / d
  // Stuck: try side-step direction.
  if (a.ai.stuckT > 0.6) {
    const side = Math.floor(a.ai.stuckT / 1.5) % 2 === 0 ? 1 : -1
    const nx = dirx * 0.3 + -dirz * side
    const nz = dirz * 0.3 + dirx * side
    const l = Math.hypot(nx, nz)
    dirx = nx / l
    dirz = nz / l
  }
  moveWithCollision(sim, a, dirx * step, dirz * step, radius, full, a.kind === 'animal')
  if (full) separate(sim, a, radius)
  const moved = Math.hypot(a.x - ox, a.z - oz)
  a.vx = (a.x - ox) / Math.max(dt, 1e-4)
  a.vz = (a.z - oz) / Math.max(dt, 1e-4)
  if (moved < step * 0.3) a.ai.stuckT += dt
  else a.ai.stuckT = Math.max(0, a.ai.stuckT - dt * 0.5)
  sim.actors.update(a)
  perf.count('ai.moves')
  if (a.ai.stuckT > 8) {
    a.ai.stuckT = 0
    return 'stuck'
  }
  a.moving = depth > SWIM_DEPTH_M ? 'swim' : speed > 3 ? 'run' : 'walk'
  return 'moving'
}

/** Nearest point index on a road polyline. */
function nearestRoadIdx(pts: { x: number; z: number }[], x: number, z: number) {
  let bi = 0
  let bd = Infinity
  for (let i = 0; i < pts.length; i++) {
    const d = (pts[i]!.x - x) ** 2 + (pts[i]!.z - z) ** 2
    if (d < bd) {
      bd = d
      bi = i
    }
  }
  return { idx: bi, dist: Math.sqrt(bd) }
}

/**
 * Route along roads between two points when both are near the same road; else straight line.
 * Returns waypoints (excluding start).
 */
export function routeVia(sim: Sim, x0: number, z0: number, x1: number, z1: number): { x: number; z: number }[] {
  if (Math.hypot(x1 - x0, z1 - z0) < 300) return [{ x: x1, z: z1 }]
  for (const r of sim.world.roads) {
    const a = nearestRoadIdx(r.points, x0, z0)
    const b = nearestRoadIdx(r.points, x1, z1)
    if (a.dist < 200 && b.dist < 200 && Math.abs(a.idx - b.idx) > 3) {
      const out: { x: number; z: number }[] = []
      const dir = b.idx > a.idx ? 1 : -1
      for (let i = a.idx; i !== b.idx; i += dir) if (i % 3 === 0) out.push(r.points[i]!)
      out.push(r.points[b.idx]!)
      out.push({ x: x1, z: z1 })
      return out
    }
  }
  return [{ x: x1, z: z1 }]
}

/** Soft separation from nearby actors (near LOD only) so bodies don't overlap. */
function separate(sim: Sim, a: Actor, radius: number) {
  for (const o of sim.actors.query(a.x, a.z, 1.5)) {
    if (o === a || o.vitals.dead) continue
    const dx = a.x - o.x
    const dz = a.z - o.z
    const d = Math.hypot(dx, dz)
    const min = radius + 0.35
    if (d < min && d > 1e-3) {
      a.x += (dx / d) * (min - d) * 0.5
      a.z += (dz / d) * (min - d) * 0.5
    }
  }
}
