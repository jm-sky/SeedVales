/**
 * Static collision: trees/rocks (circles), buildings (oriented boxes), slope limits, bridges.
 * @domain sim
 * @subdomain collision
 */
import type { ResNode } from '../world/nodes'
import type { BoxSolid } from './landmarkSolids'
import type { Sim } from './sim'
import { perf } from '../diag/perf'
import { isTree } from '../world/nodes'

export const NO_COLLIDE = new Set(['bridge', 'campfire', 'field', 'herbgarden', 'pen'])
const scratch: ResNode[] = []

/** Ground height including bridge decks. */
export function groundHeight(sim: Sim, x: number, z: number): number {
  let h = sim.terrain.heightAt(x, z)
  for (const b of sim.bridges) {
    const lx = x - b.x
    const lz = z - b.z
    const c = Math.cos(b.rot)
    const s = Math.sin(b.rot)
    // Bridge local axes: along = (sin rot, cos rot).
    const along = lx * s + lz * c
    const across = lx * c - lz * s
    if (Math.abs(along) <= b.hd && Math.abs(across) <= b.hw + 0.3) h = Math.max(h, b.deck ?? h)
  }
  return h
}

export function pushOutOfBox(b: BoxSolid, x: number, z: number, r: number): [number, number] | null {
  const c = Math.cos(b.rot)
  const s = Math.sin(b.rot)
  const lx = x - b.x
  const lz = z - b.z
  // Local coords: x' along building width (rot applied like three.js rotation.y).
  const px = lx * c - lz * s
  const pz = lx * s + lz * c
  const hw = b.hw + r
  const hd = b.hd + r
  if (Math.abs(px) >= hw || Math.abs(pz) >= hd) return null
  const ox = hw - Math.abs(px)
  const oz = hd - Math.abs(pz)
  let nx = px
  let nz = pz
  if (ox < oz) nx = Math.sign(px || 1) * hw
  else nz = Math.sign(pz || 1) * hd
  return [b.x + nx * c + nz * s, b.z - nx * s + nz * c]
}

/**
 * Moves an actor with collision. `full` = check trees/rocks/buildings (near LOD).
 * Returns true if movement was (at least partially) possible.
 */
export function moveWithCollision(
  sim: Sim,
  a: { x: number; z: number; y: number },
  dx: number,
  dz: number,
  radius: number,
  full: boolean,
  avoidDeepWater = false,
): boolean {
  let nx = a.x + dx
  let nz = a.z + dz
  const size = sim.world.size
  nx = Math.min(size - 20, Math.max(20, nx))
  nz = Math.min(size - 20, Math.max(20, nz))
  if (full) {
    perf.count('collision.checks')
    const t = sim.terrain
    // Slope limit: block steep climbs (> ~50°) — peaks inaccessible.
    const h0 = t.heightAt(a.x, a.z)
    const h1 = t.heightAt(nx, nz)
    const len = Math.hypot(nx - a.x, nz - a.z)
    if (len > 1e-4 && (h1 - h0) / len > 1.2) return false
    if (avoidDeepWater && t.waterDepthAt(nx, nz) > 0.9 && t.waterDepthAt(nx, nz) > t.waterDepthAt(a.x, a.z)) return false
    scratch.length = 0
    sim.nodes.query(nx, nz, radius + 3, scratch)
    for (const n of scratch) {
      if (n.radius <= 0) continue
      if (isTree(n.kind) && sim.state.nodes[n.id]?.kind === 'felled') continue
      if (n.kind === 'rock' && sim.state.nodes[n.id]?.kind === 'depleted') continue
      const ddx = nx - n.x
      const ddz = nz - n.z
      const d = Math.hypot(ddx, ddz)
      const min = n.radius + radius
      if (d < min && d > 1e-4) {
        nx = n.x + (ddx / d) * min
        nz = n.z + (ddz / d) * min
      }
    }
    for (const b of sim.buildingsNear(nx, nz, 16)) {
      if (NO_COLLIDE.has(b.kind)) continue
      const p = pushOutOfBox(b, nx, nz, radius)
      if (p) {
        nx = p[0]
        nz = p[1]
      }
    }
    const lm = sim.landmarkSolids.at(nx, nz)
    if (lm) {
      for (const ci of lm.circles) {
        const ddx = nx - ci.x
        const ddz = nz - ci.z
        const d = Math.hypot(ddx, ddz)
        const min = ci.r + radius
        if (d < min) {
          // Dead centre (spawned inside): push along +x so the actor is never stuck on the spot.
          nx = ci.x + (d > 1e-4 ? ddx / d : 1) * min
          nz = ci.z + (d > 1e-4 ? ddz / d : 0) * min
        }
      }
      for (const b of lm.boxes) {
        const p = pushOutOfBox(b, nx, nz, radius)
        if (p) {
          nx = p[0]
          nz = p[1]
        }
      }
    }
    for (const s of sim.state.sites) {
      if (Math.hypot(s.x - nx, s.z - nz) < 0.6 + radius && s.stage > 0) {
        const d = Math.hypot(nx - s.x, nz - s.z) || 1
        nx = s.x + ((nx - s.x) / d) * (0.6 + radius)
        nz = s.z + ((nz - s.z) / d) * (0.6 + radius)
      }
    }
  }
  const moved = Math.hypot(nx - a.x, nz - a.z) > 1e-4
  a.x = nx
  a.z = nz
  a.y = groundHeight(sim, nx, nz)
  return moved
}
