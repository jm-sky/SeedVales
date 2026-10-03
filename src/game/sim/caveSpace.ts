/**
 * Cave movement context (WORLD-05 v1). The player is either on the surface or in one cave (`px.cave` = index + 1).
 * Surface and cave are separate walkable layers over the same x/z: entering needs a floor within a step of the
 * player's height at a cutting cell (the terrain mesh is cut out there), leaving needs the floor to meet the
 * terrain again at the mouth. NPCs and animals stay on the surface and treat cuttings as solid.
 * @domain sim
 * @subdomain collision
 */
import type { Sim } from './sim'
import type { Animal, Human } from './types'
import { CAVE } from '../config/calibration'
import { CELL_SKY, CELL_UNDER, spinePoints } from '../world/caveShape'

/** Probe offset around the player centre: all four corners must be open inside a cave. */
const PROBE_M = 0.3

export interface CaveStep {
  ok: boolean
  /** Cave context after the step (index + 1, 0 = surface). */
  cave: number
  y: number
}

/**
 * Who may cross a cave mouth (D-CAVE-2): the player and hired companions walk in and out; cave dwellers
 * (animals spawned in a cave) never leave it; everyone else treats cuttings as solid.
 */
export type CaveMover = 'walker' | 'bound' | 'surface'

/** Current cave context of an actor: the player's `px.cave`, otherwise the actor's own `cave` (index + 1, 0 = surface). */
export function caveOf(sim: Sim, a: object): number {
  return a === sim.state.player ? (sim.state.px.cave ?? 0) : ((a as { cave?: number }).cave ?? 0)
}

export function moverOf(sim: Sim, a: object): CaveMover {
  if (a === sim.state.player || (a as Human).companion) return 'walker'
  return (a as Animal).cave ? 'bound' : 'surface'
}

/** Sets an actor's cave context (the player's lives in `px`). */
export function setCave(sim: Sim, a: object, cave: number) {
  if (a === sim.state.player) sim.state.px.cave = cave
  else (a as { cave?: number }).cave = cave || undefined
}

/** True when two actors are on different layers (surface vs cave, or two caves): no sight, aggro or melee between them. */
export function layersApart(sim: Sim, a: object, b: object): boolean {
  return caveOf(sim, a) !== caveOf(sim, b)
}

/** True when a point lies inside a cave volume (between floor and ceiling), not in the open or a cutting. */
export function pointInCave(sim: Sim, x: number, y: number, z: number): boolean {
  const caves = sim.terrain.caves
  if (!caves.count) return false
  const i = caves.indexAt(x, z)
  if (i < 0) return false
  const g = caves.grid(i)
  return g.flagAt(x, z) !== CELL_SKY && y >= g.floorAt(x, z) - 0.5 && y <= g.ceilAt(x, z)
}

/** Whether moving `a` (at height `y`, context `ctx`) to (x, z) is allowed, and the resulting context/height. */
export function caveStep(sim: Sim, mover: CaveMover, ctx: number, y: number, x: number, z: number): CaveStep {
  const caves = sim.terrain.caves
  if (ctx > 0) {
    const g = caves.grid(ctx - 1)
    if (g.flagAt(x, z) !== 0) {
      for (const [dx, dz] of [[PROBE_M, PROBE_M], [-PROBE_M, PROBE_M], [PROBE_M, -PROBE_M], [-PROBE_M, -PROBE_M]] as const) {
        // A closed probe is a wall, except at the mouth where the ground meets the floor again.
        if (g.flagAt(x + dx, z + dz) === 0 && Math.abs(sim.terrain.heightAt(x + dx, z + dz) - y) > CAVE.stepM) return { ok: false, cave: ctx, y }
      }
      const f = g.floorAt(x, z)
      return Math.abs(f - y) <= CAVE.stepM ? { ok: true, cave: ctx, y: f } : { ok: false, cave: ctx, y }
    }
    // Closed cell: only the mouth leads out, where the floor meets the terrain again (cave dwellers stay inside).
    if (mover === 'bound') return { ok: false, cave: ctx, y }
    const ts = sim.terrain.heightAt(x, z)
    return Math.abs(ts - y) <= CAVE.stepM ? { ok: true, cave: 0, y: ts } : { ok: false, cave: ctx, y }
  }
  const ci = caves.skyIndexAt(x, z)
  if (ci < 0) return { ok: true, cave: 0, y: NaN }
  if (mover !== 'walker') return { ok: false, cave: 0, y }
  const f = caves.grid(ci).floorAt(x, z)
  return Math.abs(f - y) <= CAVE.stepM ? { ok: true, cave: ci + 1, y: f } : { ok: false, cave: 0, y }
}

/** Ground height under the player: cave floor inside a cave, terrain otherwise (idle snap, spawns). */
export function playerGroundY(sim: Sim): number {
  const p = sim.state.player
  const c = sim.state.px.cave ?? 0
  if (c > 0) {
    const g = sim.terrain.caves.grid(c - 1)
    if (g.flagAt(p.x, p.z) !== 0) return g.floorAt(p.x, p.z)
  }
  return sim.terrain.heightAt(p.x, p.z)
}

/** Ground height for a projectile at (x, y, z): the cave floor while it flies inside a cave, terrain otherwise. */
export function projectileGround(sim: Sim, x: number, z: number, y: number): number {
  const caves = sim.terrain.caves
  if (caves.count) {
    const i = caves.indexAt(x, z)
    if (i >= 0) {
      const g = caves.grid(i)
      const f = g.floorAt(x, z)
      if (y >= f - 0.5 && y <= g.ceilAt(x, z)) return f
    }
  }
  return sim.terrain.heightAt(x, z)
}

/** While the player is in a cave: the floor and ceiling heights at (x, z) when the cell is open, else null (jump landing and head clearance). */
export function caveVolumeAt(sim: Sim, x: number, z: number): { floor: number; ceil: number } | null {
  const c = sim.state?.px?.cave ?? 0
  if (c <= 0) return null
  const g = sim.terrain.caves.grid(c - 1)
  if (g.flagAt(x, z) === 0) return null
  return { floor: g.floorAt(x, z), ceil: g.ceilAt(x, z) }
}

/** Clearance (m) the head needs below a cave ceiling: a jump apex is clamped to it. */
export const HEAD_ROOM_M = 1.9

/** Open cell (roofed) nearest to (x, z) within `r` metres of a cave, or the nearest spine point: wander targets for cave dwellers. */
export function caveSnap(sim: Sim, cave: number, x: number, z: number, r = 8): { x: number; z: number } {
  const c = sim.terrain.caves
  const g = c.grid(cave - 1)
  if (g.flagAt(x, z) === CELL_UNDER) return { x, z }
  let best: { x: number; z: number } | null = null
  let bd = Infinity
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const px = Math.floor(x + dx) + 0.5
      const pz = Math.floor(z + dz) + 0.5
      if (g.flagAt(px, pz) !== CELL_UNDER) continue
      const d = dx * dx + dz * dz
      if (d < bd) {
        bd = d
        best = { x: px, z: pz }
      }
    }
  }
  if (best) return best
  const pts = spinePoints(c.caves[cave - 1]!)
  let bp = pts[0]!
  for (const p of pts) if (Math.hypot(p.x - x, p.z - z) < Math.hypot(bp.x - x, bp.z - z)) bp = p
  return { x: bp.x, z: bp.z }
}

const nearestSpine = (pts: { x: number; z: number }[], x: number, z: number) => {
  let bi = 0
  let bd = Infinity
  for (let i = 0; i < pts.length; i++) {
    const d = (pts[i]!.x - x) ** 2 + (pts[i]!.z - z) ** 2
    if (d < bd) {
      bd = d
      bi = i
    }
  }
  return bi
}

/** True when a body-wide corridor (±0.45 m) along the straight segment stays on open cells of the cave (sampled every 0.75 m). */
function lineOpen(sim: Sim, cave: number, x0: number, z0: number, x1: number, z1: number): boolean {
  const g = sim.terrain.caves.grid(cave - 1)
  const d = Math.hypot(x1 - x0, z1 - z0)
  const n = Math.ceil(d / 0.75)
  const nx = d > 1e-6 ? -(z1 - z0) / d : 0
  const nz = d > 1e-6 ? (x1 - x0) / d : 0
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const x = x0 + (x1 - x0) * t
    const z = z0 + (z1 - z0) * t
    if (g.flagAt(x, z) === 0 || g.flagAt(x + nx * 0.45, z + nz * 0.45) === 0 || g.flagAt(x - nx * 0.45, z - nz * 0.45) === 0) return false
  }
  return true
}

/**
 * Cave navigation (D-CAVE-2): the spine is the waypoint chain. Returns the next waypoint an actor in cave `ctx`
 * (0 = surface) should steer to on its way to (tx, tz) which lies on layer `targetCtx`, or null for "steer
 * straight at the target". Surface walkers heading underground go to the mouth first; cave actors heading out
 * walk the spine back to its start. No oscillation: the nearest spine index only moves towards the goal.
 */
export function caveWaypoint(sim: Sim, ctx: number, ax: number, az: number, tx: number, tz: number, targetCtx: number): { x: number; z: number } | null {
  const caves = sim.terrain.caves
  if (ctx === targetCtx && ctx === 0) return null
  if (ctx === 0) {
    const p = spinePoints(caves.caves[targetCtx - 1]!)[0]
    return p ? { x: p.x, z: p.z } : null
  }
  const pts = spinePoints(caves.caves[ctx - 1]!)
  const i = nearestSpine(pts, ax, az)
  if (ctx === targetCtx) {
    if (lineOpen(sim, ctx, ax, az, tx, tz)) return null
    const j = nearestSpine(pts, tx, tz)
    if (i === j) return null
    const next = pts[i + Math.sign(j - i)]!
    return { x: next.x, z: next.z }
  }
  // Target is on the surface (or another layer): out through the mouth.
  if (i === 0) return null
  const next = pts[i - 1]!
  return { x: next.x, z: next.z }
}
