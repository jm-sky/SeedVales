/**
 * Cave movement context (WORLD-05 v1). The player is either on the surface or in one cave (`px.cave` = index + 1).
 * Surface and cave are separate walkable layers over the same x/z: entering needs a floor within a step of the
 * player's height at a cutting cell (the terrain mesh is cut out there), leaving needs the floor to meet the
 * terrain again at the mouth. NPCs and animals stay on the surface and treat cuttings as solid.
 * @domain sim
 * @subdomain collision
 */
import type { Sim } from './sim'
import { CAVE } from '../config/calibration'
import { CELL_SKY } from '../world/caveShape'

/** Probe offset around the player centre: all four corners must be open inside a cave. */
const PROBE_M = 0.3

export interface CaveStep {
  ok: boolean
  /** Cave context after the step (index + 1, 0 = surface). */
  cave: number
  y: number
}

/** Current cave context of an actor (only the player can be in a cave in v1). */
export function caveOf(sim: Sim, a: object): number {
  return a === sim.state.player ? (sim.state.px.cave ?? 0) : 0
}

/** True when two actors are on different layers (player in a cave, other on the surface): no sight, aggro or melee between them. */
export function layersApart(sim: Sim, a: object, b: object): boolean {
  if ((sim.state.px.cave ?? 0) === 0) return false
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
export function caveStep(sim: Sim, isPlayer: boolean, ctx: number, y: number, x: number, z: number): CaveStep {
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
    // Closed cell: only the mouth leads out, where the floor meets the terrain again.
    const ts = sim.terrain.heightAt(x, z)
    return Math.abs(ts - y) <= CAVE.stepM ? { ok: true, cave: 0, y: ts } : { ok: false, cave: ctx, y }
  }
  const ci = caves.skyIndexAt(x, z)
  if (ci < 0) return { ok: true, cave: 0, y: NaN }
  if (!isPlayer) return { ok: false, cave: 0, y }
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
