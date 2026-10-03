/**
 * Local detour around a building footprint: when the straight segment to the target crosses a
 * (collidable) building, steer via the cheapest corner of its inflated box instead of sliding
 * along the wall. Stateless (re-evaluated each near-LOD step); one obstacle at a time.
 * @domain sim
 * @subdomain pathfinding
 */
import type { Sim } from './sim'
import type { Building } from './types'
import { NO_COLLIDE } from './collision'

type P = { x: number; z: number }

const toLocal = (b: Building, x: number, z: number): P => {
  const c = Math.cos(b.rot)
  const s = Math.sin(b.rot)
  const lx = x - b.x
  const lz = z - b.z
  return { x: lx * c - lz * s, z: lx * s + lz * c }
}

const toWorld = (b: Building, px: number, pz: number): P => {
  const c = Math.cos(b.rot)
  const s = Math.sin(b.rot)
  return { x: b.x + px * c + pz * s, z: b.z - px * s + pz * c }
}

/** Entry parameter t∈[0,1] of segment a→b into the building box inflated by m, or null (slab test). */
export function segmentHitsBox(bd: Building, ax: number, az: number, bx: number, bz: number, m: number): number | null {
  const a = toLocal(bd, ax, az)
  const b = toLocal(bd, bx, bz)
  const hw = bd.hw + m
  const hd = bd.hd + m
  let t0 = 0
  let t1 = 1
  for (const [p, d, h] of [[a.x, b.x - a.x, hw], [a.z, b.z - a.z, hd]] as const) {
    if (Math.abs(d) < 1e-9) {
      if (Math.abs(p) >= h) return null
      continue
    }
    let ta = (-h - p) / d
    let tb = (h - p) / d
    if (ta > tb) [ta, tb] = [tb, ta]
    t0 = Math.max(t0, ta)
    t1 = Math.min(t1, tb)
    if (t0 >= t1) return null
  }
  return t0
}

const inside = (b: Building, x: number, z: number, m: number) => {
  const l = toLocal(b, x, z)
  return Math.abs(l.x) < b.hw + m && Math.abs(l.z) < b.hd + m
}

/** Waypoint to steer towards instead of (tx,tz), or null when the way is clear. */
export function detourPoint(sim: Sim, ax: number, az: number, tx: number, tz: number, radius: number): P | null {
  const d = Math.hypot(tx - ax, tz - az)
  if (d < 1) return null
  // Hit margin ≈ collision zone; corners sit well outside it (hysteresis — no flip-flop at a corner).
  const m = radius + 0.05
  let hit: Building | undefined
  let hitT = Infinity
  for (const b of sim.buildingsNear((ax + tx) / 2, (az + tz) / 2, d / 2 + 10)) {
    if (NO_COLLIDE.has(b.kind) || inside(b, tx, tz, m) || inside(b, ax, az, radius - 0.05)) continue
    const t = segmentHitsBox(b, ax, az, tx, tz, m)
    if (t !== null && t < hitT) {
      hitT = t
      hit = b
    }
  }
  if (!hit) return null
  const cm = radius + 0.7
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([sx, sz]) => toWorld(hit, sx! * (hit.hw + cm), sz! * (hit.hd + cm)))
  const blocked = (p: P, q: P) => segmentHitsBox(hit, p.x, p.z, q.x, q.z, m) !== null
  let best: P | null = null
  let bestCost = Infinity
  corners.forEach((c, i) => {
    const da = Math.hypot(c.x - ax, c.z - az)
    if (da < 0.5 || blocked({ x: ax, z: az }, c)) return
    let rest = Math.hypot(tx - c.x, tz - c.z)
    if (blocked(c, { x: tx, z: tz })) {
      // Via one adjacent corner (opposite sides of the box need two turns).
      rest = Infinity
      for (const j of [(i + 1) % 4, (i + 3) % 4]) {
        const c2 = corners[j]!
        rest = Math.min(rest, Math.hypot(c2.x - c.x, c2.z - c.z) + Math.hypot(tx - c2.x, tz - c2.z))
      }
    }
    if (da + rest < bestCost) {
      bestCost = da + rest
      best = c
    }
  })
  return best
}

/** A walled building (footprint at least 2.4 m across, solid) lies on the segment a→b; used to hide labels of NPCs behind or inside walls. */
export function wallBlocksSight(sim: Sim, ax: number, az: number, bx: number, bz: number): boolean {
  const mx = (ax + bx) / 2
  const mz = (az + bz) / 2
  const r = Math.hypot(bx - ax, bz - az) / 2 + 12
  for (const b of sim.buildingsNear(mx, mz, r)) {
    if (NO_COLLIDE.has(b.kind) || Math.min(b.hw, b.hd) < 1.2) continue
    if (segmentHitsBox(b, ax, az, ax, az, -0.1) !== null) continue // the viewer stands inside
    if (segmentHitsBox(b, ax, az, bx, bz, -0.1) !== null) return true
  }
  return false
}
