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
import { caveOf, caveWaypoint } from './caveSpace'
import { moveWithCollision } from './collision'
import { detourPoint } from './detour'

/**
 * Moves actor towards (tx,tz). Returns 'arrived' | 'moving' | 'stuck'.
 * `full` enables collisions (near LOD). Far actors glide (cheap).
 */
export function steerTo(
  sim: Sim,
  a: Actor & { ai: { stuckT: number; avoidSide?: number } },
  tx: number,
  tz: number,
  speed: number,
  dt: number,
  range: number,
  full: boolean,
  radius = 0.35,
  /** Layer the target lies on (cave index + 1, 0 = surface); defaults to the actor's own. */
  targetCave?: number,
): 'arrived' | 'moving' | 'stuck' {
  const ctx = sim.terrain.caves.count ? caveOf(sim, a) : 0
  const tctx = targetCave ?? ctx
  // Underground routing (D-CAVE-2): through the mouth and along the cave spine instead of straight through rock.
  const wp = ctx > 0 || tctx > 0 ? caveWaypoint(sim, ctx, a.x, a.z, tx, tz, tctx) : null
  if (wp) {
    tx = wp.x
    tz = wp.z
  }
  const dx = tx - a.x
  const dz = tz - a.z
  const d = Math.hypot(dx, dz)
  if (!wp && d <= range && ctx === tctx) {
    a.moving = 'idle'
    return 'arrived'
  }
  if (wp && d < 0.3) {
    a.moving = 'walk'
    return 'moving'
  }
  const want = Math.atan2(dx, dz)
  // Turn smoothly (visual), but move along desired direction.
  a.rot += angleDiff(a.rot, want) * Math.min(1, dt * 8)
  const depth = full ? sim.terrain.waterDepthAt(a.x, a.z) : 0
  const sp = depth > SWIM_DEPTH_M ? Math.min(speed, 0.8) : speed
  const step = Math.max(0, wp ? Math.min(d, sp * dt) : Math.min(d - range * 0.5, sp * dt))
  const ox = a.x
  const oz = a.z
  let dirx = dx / d
  let dirz = dz / d
  // Near LOD: go around a building in the way (corner waypoint) instead of pressing into the wall.
  const via = full && ctx === 0 && !wp ? detourPoint(sim, a.x, a.z, tx, tz, radius) : null
  if (via) {
    const vd = Math.hypot(via.x - a.x, via.z - a.z) || 1
    dirx = (via.x - a.x) / vd
    dirz = (via.z - a.z) / vd
    perf.count('ai.detours')
  }
  // Blocked: slide along the obstacle on a consistent side (chosen towards the target around the
  // nearest building), switching sides only if that also fails for long.
  if (a.ai.stuckT > 0.35) {
    if (!a.ai.avoidSide) {
      const b = full ? sim.buildingsNear(a.x, a.z, 10)[0] : undefined
      const cross = b ? dx * (b.z - a.z) - dz * (b.x - a.x) : 1
      a.ai.avoidSide = cross > 0 ? -1 : 1
    }
    const side = a.ai.stuckT > 5 ? -a.ai.avoidSide : a.ai.avoidSide
    const nx = dirx * 0.15 + -dirz * side
    const nz = dirz * 0.15 + dirx * side
    const l = Math.hypot(nx, nz)
    dirx = nx / l
    dirz = nz / l
  } else if (a.ai.stuckT < 0.05) a.ai.avoidSide = undefined
  moveWithCollision(sim, a, dirx * step, dirz * step, radius, full, a.kind === 'animal')
  if (full) separate(sim, a, radius)
  const moved = Math.hypot(a.x - ox, a.z - oz)
  a.vx = (a.x - ox) / Math.max(dt, 1e-4)
  a.vz = (a.z - oz) / Math.max(dt, 1e-4)
  if (moved < step * 0.3) a.ai.stuckT += dt
  // Moving freely counts down the slide mode even without closing in: the sidestep heading is ~perpendicular to the
  // target, so a slide that never ends makes the actor ORBIT the target (the obstacle is long gone, it never arrives;
  // NPC-02 soak: a day-long orbit around the bed / the water point while thirst ran to 0). Direct heading then resumes.
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
