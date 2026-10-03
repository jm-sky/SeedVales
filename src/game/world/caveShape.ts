/**
 * Cave geometry (WORLD-05), pure and deterministic. A `GenCave` is only a spine (entrance + tunnel/chamber
 * points); this module derives the walkable volume on a 1 m grid: which cells are open, the floor and the
 * ceiling height per grid vertex, and which cells are open to the sky (the cutting at the entrance, where the
 * terrain mesh gets a hole). Shared by the generator (validation), the sim (grounding/collision) and the
 * renderer (mesh), so what you see is what you walk on.
 * @domain world
 * @subdomain caves
 */
import type { GenCave } from './types'
import { CAVE } from '../config/calibration'
import { Noise2D } from '../core/noise'
import { hashString } from '../core/rng'

export const CELL_CLOSED = 0
/** Open cell under rock: floor + ceiling. */
export const CELL_UNDER = 1
/** Open cell without a roof (too little rock above): the terrain mesh is cut out here. */
export const CELL_SKY = 2

export type SurfaceFn = (x: number, z: number) => number

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export interface SpinePoint {
  x: number
  z: number
  r: number
  /** Arc length from the entrance (m). */
  s: number
}

export function spinePoints(cave: GenCave): SpinePoint[] {
  const out: SpinePoint[] = []
  let s = 0
  for (let i = 0; i + 2 < cave.spine.length; i += 3) {
    const x = cave.spine[i]!
    const z = cave.spine[i + 1]!
    if (out.length) {
      const p = out[out.length - 1]!
      s += Math.hypot(x - p.x, z - p.z)
    }
    out.push({ x, z, r: cave.spine[i + 2]!, s })
  }
  return out
}

/** Floor height of the spine at arc length `s` (before noise): descends from the entrance, then levels out. */
export const spineFloor = (y0: number, s: number) => y0 - Math.min(CAVE.rampSlope * s, CAVE.maxDepth)

/** Ceiling clearance for a local spine radius: tunnel height up to chamber height. */
export const clearanceFor = (r: number) => CAVE.tunnelHeight + (CAVE.chamberHeight - CAVE.tunnelHeight) * clamp01((r - CAVE.tunnelRadius) / (CAVE.chamberRadius[0] - CAVE.tunnelRadius))

export class CaveGrid {
  /** World position of the grid origin (even metres, aligned with the 2 m terrain quads). */
  readonly ox: number
  readonly oz: number
  /** Cells per side. */
  readonly nx: number
  readonly nz: number
  /** Per cell: {@link CELL_CLOSED} | {@link CELL_UNDER} | {@link CELL_SKY}. */
  readonly flag: Uint8Array
  /** Per grid vertex ((nx+1) × (nz+1)): floor height (valid next to any open cell). */
  readonly floor: Float32Array
  /** Per grid vertex: ceiling height of roofed cells (valid next to an {@link CELL_UNDER} cell). */
  readonly ceil: Float32Array
  /** Number of open cells (stats/tests). */
  open = 0

  constructor(ox: number, oz: number, nx: number, nz: number) {
    this.ox = ox
    this.oz = oz
    this.nx = nx
    this.nz = nz
    this.flag = new Uint8Array(nx * nz)
    this.floor = new Float32Array((nx + 1) * (nz + 1))
    this.ceil = new Float32Array((nx + 1) * (nz + 1))
  }

  contains(x: number, z: number) {
    return x >= this.ox && z >= this.oz && x < this.ox + this.nx && z < this.oz + this.nz
  }

  flagAt(x: number, z: number): number {
    const i = Math.floor(x - this.ox)
    const j = Math.floor(z - this.oz)
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return CELL_CLOSED
    return this.flag[j * this.nx + i]!
  }

  private bilinear(a: Float32Array, x: number, z: number): number {
    const fx = Math.min(Math.max(x - this.ox, 0), this.nx - 1e-6)
    const fz = Math.min(Math.max(z - this.oz, 0), this.nz - 1e-6)
    const i = Math.floor(fx)
    const j = Math.floor(fz)
    const tx = fx - i
    const tz = fz - j
    const w = this.nx + 1
    return (a[j * w + i]! * (1 - tx) + a[j * w + i + 1]! * tx) * (1 - tz) + (a[(j + 1) * w + i]! * (1 - tx) + a[(j + 1) * w + i + 1]! * tx) * tz
  }

  /** Floor height at a point inside an open cell. */
  floorAt(x: number, z: number): number {
    return this.bilinear(this.floor, x, z)
  }

  /** Ceiling height at a point inside a roofed cell; +Infinity for sky cells. */
  ceilAt(x: number, z: number): number {
    return this.flagAt(x, z) === CELL_SKY ? Infinity : this.bilinear(this.ceil, x, z)
  }
}

/** Derives the grid of a cave. `surfaceAt` is the terrain height the roof cover is measured against. */
export function buildCaveGrid(cave: GenCave, surfaceAt: SurfaceFn): CaveGrid {
  const pts = spinePoints(cave)
  let minX = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxZ = -Infinity
  for (const p of pts) {
    const m = p.r * 1.3 + 2
    minX = Math.min(minX, p.x - m)
    maxX = Math.max(maxX, p.x + m)
    minZ = Math.min(minZ, p.z - m)
    maxZ = Math.max(maxZ, p.z + m)
  }
  // Even origin: grid blocks (2 × 2 cells) line up with the LOD-0 terrain quads.
  const ox = Math.floor(minX / CAVE.block) * CAVE.block
  const oz = Math.floor(minZ / CAVE.block) * CAVE.block
  const nx = Math.ceil((maxX - ox) / CAVE.block) * CAVE.block
  const nz = Math.ceil((maxZ - oz) / CAVE.block) * CAVE.block
  const g = new CaveGrid(ox, oz, nx, nz)
  const noise = new Noise2D(hashString(cave.id) ^ 0x5ca7e)
  const cellFloor = new Float32Array(nx * nz)
  const cellH = new Float32Array(nx * nz)

  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const cx = ox + i + 0.5
      const cz = oz + j + 0.5
      // Nearest spine segment (distance relative to the local radius).
      let best = Infinity
      let bestS = 0
      let bestR = 0
      let bestD = 0
      for (let k = 0; k + 1 < pts.length; k++) {
        const a = pts[k]!
        const b = pts[k + 1]!
        const dx = b.x - a.x
        const dz = b.z - a.z
        const len2 = dx * dx + dz * dz || 1
        const t = clamp01(((cx - a.x) * dx + (cz - a.z) * dz) / len2)
        const d = Math.hypot(cx - (a.x + dx * t), cz - (a.z + dz * t))
        const r = a.r + (b.r - a.r) * t
        if (d - r < best) {
          best = d - r
          bestD = d
          bestR = r
          bestS = a.s + (b.s - a.s) * t
        }
      }
      // Nothing opens behind the entrance: the cutting starts at the spine origin.
      const wobble = 1 + 0.2 * noise.get(cx * 0.3, cz * 0.3)
      if (bestD >= bestR * wobble) continue
      const k = j * nx + i
      cellFloor[k] = spineFloor(cave.y0, bestS) + (bestS < 2 ? 0 : 0.18 * noise.fbm(cx * 0.22 + 40, cz * 0.22, 2))
      cellH[k] = clearanceFor(bestR) + 0.35 * noise.get(cx * 0.4 + 90, cz * 0.4)
      const roofed = surfaceAt(cx, cz) - cellFloor[k]! >= cellH[k]! + CAVE.minCover
      g.flag[k] = roofed ? CELL_UNDER : CELL_SKY
    }
  }
  // Sky cells are cut out of the terrain in whole blocks: every cell of a block that has one becomes sky.
  for (let bj = 0; bj < nz; bj += 2) {
    for (let bi = 0; bi < nx; bi += 2) {
      let sky = false
      let sum = 0
      let cnt = 0
      for (let dj = 0; dj < 2; dj++) {
        for (let di = 0; di < 2; di++) {
          const k = (bj + dj) * nx + bi + di
          if (g.flag[k] === CELL_SKY) sky = true
          if (g.flag[k] !== CELL_CLOSED) {
            sum += cellFloor[k]!
            cnt++
          }
        }
      }
      if (!sky) continue
      for (let dj = 0; dj < 2; dj++) {
        for (let di = 0; di < 2; di++) {
          const k = (bj + dj) * nx + bi + di
          // Cells that were closed take the block's mean floor; open ones keep theirs.
          if (g.flag[k] === CELL_CLOSED) cellFloor[k] = sum / cnt
          g.flag[k] = CELL_SKY
        }
      }
    }
  }
  // A cell that is still open next to a sky block but whose floor was never set can only be sky: set above.
  // Vertex heights: average of the open cells touching the vertex.
  const w = nx + 1
  for (let vj = 0; vj <= nz; vj++) {
    for (let vi = 0; vi <= nx; vi++) {
      let f = 0
      let h = 0
      let n = 0
      let nu = 0
      for (let dj = -1; dj <= 0; dj++) {
        for (let di = -1; di <= 0; di++) {
          const i = vi + di
          const j = vj + dj
          if (i < 0 || j < 0 || i >= nx || j >= nz) continue
          const k = j * nx + i
          if (g.flag[k] === CELL_CLOSED) continue
          f += cellFloor[k]!
          n++
          if (g.flag[k] === CELL_UNDER) {
            h += cellH[k]!
            nu++
          }
        }
      }
      if (n) g.floor[vj * w + vi] = f / n
      if (nu) g.ceil[vj * w + vi] = g.floor[vj * w + vi]! + h / nu
    }
  }
  for (let k = 0; k < g.flag.length; k++) if (g.flag[k] !== CELL_CLOSED) g.open++
  return g
}
