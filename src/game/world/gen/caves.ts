/**
 * Caves (WORLD-05): small and medium caves cut into mountain slopes. Each is a spine of tunnel/chamber
 * points that starts on a slope and runs uphill into the rock, so the terrain rises above the descending
 * floor. Deterministic for seed + GEN_VERSION; every candidate is validated against the derived geometry
 * (roof cover, length of the open-air cutting, floor never above the surface) before it is accepted.
 * @domain world
 * @subdomain world-gen
 */
import type { CaveSize, GenCave, GenLandmark, GenRoad, GenSettlement } from '../types'
import { CAVE } from '../../config/calibration'
import { distToSegment } from '../../core/math'
import { Rng } from '../../core/rng'
import { buildCaveGrid, CELL_SKY, clearanceFor, spineFloor, spinePoints } from '../caveShape'
import { idx, nearestCell, sampleGrid } from '../grid'
import { Biome, CELL_M, GRID_N, SEA_LEVEL, WORLD_SIZE_M } from '../types'

interface CaveGridData {
  height: Float32Array
  biome: Uint8Array
  waterKind: Uint8Array
}

/** Slope (rise per metre) the entrance needs: steep enough that the rock closes over the tunnel quickly. */
const MIN_SLOPE = 0.4
const MAX_SLOPE = 0.65
const MIN_SETTLEMENT_M = 220
const MIN_ROAD_M = 60
const MIN_CAVE_M = 450
const MIN_LANDMARK_M = 120
/** Wanted caves per class. */
export const CAVE_COUNTS = { small: 4, medium: 2, large: 1 } as const

export const CAVE_NAMES = [
  'Wolfmaw Cave', 'The Hollow Deep', 'Ravenhole', 'Greywater Grotto', 'Bearclaw Cave', 'The Echoing Mouth',
  'Stonethroat', 'Old Marrow Cave', 'The Cold Cellar', 'Hagstone Cave',
]

const nearRoad = (roads: GenRoad[], x: number, z: number, d: number) => {
  for (const r of roads) {
    const p = r.points
    for (let i = 0; i + 1 < p.length; i++) {
      if (distToSegment(x, z, p[i]!.x, p[i]!.z, p[i + 1]!.x, p[i + 1]!.z) < d) return true
    }
  }
  return false
}

/** Uphill direction and slope magnitude of the generated surface at (x, z). */
function gradient(height: Float32Array, x: number, z: number): { dx: number; dz: number; slope: number } {
  const e = 6
  const gx = (sampleGrid(height, x + e, z) - sampleGrid(height, x - e, z)) / (2 * e)
  const gz = (sampleGrid(height, x, z + e) - sampleGrid(height, x, z - e)) / (2 * e)
  const slope = Math.hypot(gx, gz)
  return { dx: gx / (slope || 1), dz: gz / (slope || 1), slope }
}

/** Builds one spine: tunnel(s) with a chamber at the end of each leg. Spacing ~6 m, gentle meander. */
function makeSpine(rng: Rng, x: number, z: number, heading: number, size: CaveSize): number[] {
  const out: number[] = []
  const legs =
    size === 'small' ? [rng.range(18, 26)] :
    size === 'medium' ? [rng.range(14, 20), rng.range(12, 18), rng.range(10, 14)] :
    [rng.range(16, 22), rng.range(14, 20), rng.range(14, 18), rng.range(12, 16), rng.range(10, 14)]
  let cx = x
  let cz = z
  let h = heading
  out.push(cx, cz, CAVE.tunnelRadius)
  legs.forEach((len, li) => {
    const steps = Math.max(2, Math.round(len / 6))
    for (let s = 0; s < steps; s++) {
      h += rng.range(-0.22, 0.22)
      cx += Math.sin(h) * (len / steps)
      cz += Math.cos(h) * (len / steps)
      out.push(cx, cz, CAVE.tunnelRadius * rng.range(0.9, 1.2))
    }
    // Chamber: two wide points a few metres apart.
    const cr = rng.range(CAVE.chamberRadius[0], CAVE.chamberRadius[1])
    h += rng.range(-0.5, 0.5) * Math.min(li + 1, 2)
    for (let k = 0; k < 2; k++) {
      cx += Math.sin(h) * 4.5
      cz += Math.cos(h) * 4.5
      out.push(cx, cz, cr * (k ? 0.9 : 1))
    }
  })
  return out
}

/**
 * True when the cave is valid for the given surface: roofed everywhere beyond the cutting, a short cutting,
 * and no floor above the ground. `margin` lowers the assumed surface (runtime micro-detail can dip below the grid).
 */
export function caveIsValid(cave: GenCave, height: Float32Array): boolean {
  const lower = (x: number, z: number) => sampleGrid(height, x, z) - CAVE.surfaceMargin
  const pts = spinePoints(cave)
  for (const p of pts) {
    if (p.x < 100 || p.z < 100 || p.x > WORLD_SIZE_M - 100 || p.z > WORLD_SIZE_M - 100) return false
    if (p.s > CAVE.maxCuttingM && lower(p.x, p.z) - spineFloor(cave.y0, p.s) < clearanceFor(p.r) + CAVE.minCover + 0.6) return false
  }
  // A tunnel must not fold back into itself: non-neighbouring spine points keep their distance.
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 3; j < pts.length; j++) {
      if (Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.z - pts[j]!.z) < 0.8 * (pts[i]!.r + pts[j]!.r)) return false
    }
  }
  const g = buildCaveGrid(cave, lower)
  if (g.open < 40) return false
  // The first open point on the approach axis must meet the ground within a step (with some slack), so the player can walk in.
  for (let t = 4; t >= 0; t -= 0.25) {
    const bx = cave.x - Math.sin(cave.yaw) * t
    const bz = cave.z - Math.cos(cave.yaw) * t
    if (!g.flagAt(bx, bz)) continue
    if (Math.abs(g.floorAt(bx, bz) - sampleGrid(height, bx, bz)) > CAVE.stepM * 0.85) return false
    break
  }
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nx; i++) {
      const f = g.flag[j * g.nx + i]!
      if (!f) continue
      const x = g.ox + i + 0.5
      const z = g.oz + j + 0.5
      const floor = g.floorAt(x, z)
      // Floor must not rise above the true surface (it would float over the cutting).
      if (floor > sampleGrid(height, x, z) + 0.5) return false
      // Open sky only near the entrance.
      if (f === CELL_SKY && Math.hypot(x - cave.x, z - cave.z) > CAVE.maxCuttingM + 4) return false
    }
  }
  return true
}

export function placeCaves(seed: number, g: CaveGridData, settlements: GenSettlement[], roads: GenRoad[], landmarks: GenLandmark[], home: GenSettlement): GenCave[] {
  const rng = new Rng(seed ^ 0xca7e5)
  const out: GenCave[] = []
  // Entrance candidates: mountain cells (not snow) on a walkable but steep slope, scanned once in a fixed order.
  const cand: [number, number][] = []
  const step = 4
  for (let j = 8; j < GRID_N - 8; j += step) {
    for (let i = 8; i < GRID_N - 8; i += step) {
      if (g.biome[idx(i, j)] !== Biome.Mountain) continue
      cand.push([i * CELL_M, j * CELL_M])
    }
  }
  if (!cand.length) return out
  const near = cand.filter(([x, z]) => Math.hypot(x - home.x, z - home.z) < 4500)
  const sizes: CaveSize[] = []
  for (let n = 0; n < Math.max(CAVE_COUNTS.small, CAVE_COUNTS.medium, CAVE_COUNTS.large); n++) {
    if (n < CAVE_COUNTS.large) sizes.push('large')
    if (n < CAVE_COUNTS.medium) sizes.push('medium')
    if (n < CAVE_COUNTS.small) sizes.push('small')
  }
  let nameCursor = seed & 7
  for (const size of sizes) {
    for (let t = 0; t < 600; t++) {
      // Every third attempt looks near the home settlement so early exploration finds a cave.
      const pool = t % 3 === 0 && near.length ? near : cand
      const c = pool[rng.int(0, pool.length - 1)]!
      const x = c[0] + rng.range(-16, 16)
      const z = c[1] + rng.range(-16, 16)
      const k = idx(...nearestCell(x, z))
      if (g.waterKind[k] || g.height[k]! < SEA_LEVEL + 12) continue
      if (g.biome[k] !== Biome.Mountain) continue
      const gr = gradient(g.height, x, z)
      if (gr.slope < MIN_SLOPE || gr.slope > MAX_SLOPE) continue
      if (settlements.some((s) => Math.hypot(s.x - x, s.z - z) < MIN_SETTLEMENT_M)) continue
      if (out.some((o) => Math.hypot(o.x - x, o.z - z) < MIN_CAVE_M)) continue
      if (landmarks.some((l) => Math.hypot(l.x - x, l.z - z) < MIN_LANDMARK_M)) continue
      if (nearRoad(roads, x, z, MIN_ROAD_M)) continue
      const heading = Math.atan2(gr.dx, gr.dz)
      const id = `cave-${out.length}`
      for (let tryN = 0; tryN < 4; tryN++) {
        const cave: GenCave = {
          id,
          name: CAVE_NAMES[nameCursor % CAVE_NAMES.length]!,
          size,
          x,
          z,
          yaw: heading,
          // Floor starts level with the ground at the back edge of the mouth, so the player steps straight in.
          y0: Math.round(sampleGrid(g.height, x - gr.dx * CAVE.tunnelRadius, z - gr.dz * CAVE.tunnelRadius) * 100) / 100,
          spine: makeSpine(rng, x, z, heading, size).map((v) => Math.round(v * 100) / 100),
        }
        if (!caveIsValid(cave, g.height)) continue
        out.push(cave)
        nameCursor++
        t = 1e9
        break
      }
    }
  }
  return out
}
