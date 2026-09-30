/**
 * Road pathfinding (A* on the world grid with slope/water/biome costs), smoothing and terrain flattening.
 * Travel distance is measured along the resulting road polyline.
 * @domain world
 * @subdomain roads
 */
import type { GenRoad } from '../types'
import { polylineLength } from '../../core/math'
import { idx, MinHeap, nearestCell } from '../grid'
import { Biome, CELL_M, GRID_N, SEA_LEVEL } from '../types'

const DI = [1, -1, 0, 0, 1, 1, -1, -1]
const DJ = [0, 0, 1, -1, 1, -1, 1, -1]
const DL = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2]

export interface RoadGrid {
  height: Float32Array
  waterKind: Uint8Array
  water: Float32Array
  biome: Uint8Array
}

/** A* between two world points. Returns cell path or null. */
export function findRoadPath(g: RoadGrid, ax: number, az: number, bx: number, bz: number, maxExpand = 900_000) {
  const n = GRID_N
  const N = n * n
  const [si, sj] = nearestCell(ax, az)
  const [ti, tj] = nearestCell(bx, bz)
  const start = idx(si, sj)
  const goal = idx(ti, tj)
  const gs = new Float32Array(N).fill(Infinity)
  const from = new Int32Array(N).fill(-1)
  const closed = new Uint8Array(N)
  const heap = new MinHeap(1 << 16)
  gs[start] = 0
  heap.push(0, start)
  let expanded = 0
  while (heap.size) {
    const k = heap.pop()
    if (k === goal) break
    if (closed[k]) continue
    closed[k] = 1
    if (++expanded > maxExpand) return null
    const i = k % n
    const j = (k / n) | 0
    const hk = g.height[k]!
    for (let d = 0; d < 8; d++) {
      const ii = i + DI[d]!
      const jj = j + DJ[d]!
      if (ii < 1 || jj < 1 || ii >= n - 1 || jj >= n - 1) continue
      const kk = jj * n + ii
      if (closed[kk]) continue
      const h = g.height[kk]!
      if (h < SEA_LEVEL + 0.3 && !g.waterKind[kk]) continue
      if (g.waterKind[kk] === 2) continue
      const len = DL[d]! * CELL_M
      const slope = Math.abs(h - hk) / len
      if (slope > 0.4) continue
      let c = len * (1 + (slope * 9) ** 2)
      if (g.waterKind[kk] === 1) c += 220 // crossing: ford or bridge
      const b = g.biome[kk]
      if (b === Biome.Swamp) c *= 2.2
      else if (b === Biome.ForestConifer || b === Biome.ForestMixed || b === Biome.ForestDeciduous) c *= 1.15
      else if (b === Biome.Mountain) c *= 2.5
      const ng = gs[k]! + c
      if (ng < gs[kk]!) {
        gs[kk] = ng
        from[kk] = k
        const hx = (ti - ii) * CELL_M
        const hz = (tj - jj) * CELL_M
        heap.push(ng + Math.hypot(hx, hz), kk)
      }
    }
  }
  if (from[goal] === -1) return null
  const cells: number[] = []
  for (let k = goal; k !== -1; k = from[k]!) cells.push(k)
  cells.reverse()
  return cells
}

/** Converts a cell path to a smoothed polyline (Chaikin ×2 after decimation). */
export function smoothPath(cells: number[]): { x: number; z: number }[] {
  const n = GRID_N
  let pts = cells
    .filter((_, i) => i % 3 === 0 || i === cells.length - 1)
    .map((k) => ({ x: (k % n) * CELL_M, z: ((k / n) | 0) * CELL_M }))
  for (let it = 0; it < 2; it++) {
    const out = [pts[0]!]
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!
      const b = pts[i + 1]!
      out.push({ x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 })
      out.push({ x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 })
    }
    out.push(pts[pts.length - 1]!)
    pts = out
  }
  return pts
}

/** Flattens terrain along a road and marks road/flat masks. Detects water crossings. */
export function carveRoad(
  g: RoadGrid & { flat: Uint8Array; road: Uint8Array },
  road: Omit<GenRoad, 'crossings' | 'length'>,
): GenRoad {
  const n = GRID_N
  const pts = road.points
  // Resample every 4 m.
  const samples: { x: number; z: number; h: number }[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const l = Math.hypot(b.x - a.x, b.z - a.z)
    const steps = Math.max(1, Math.ceil(l / 4))
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      samples.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, h: 0 })
    }
  }
  const hAt = (x: number, z: number) => {
    const [i, j] = nearestCell(x, z)
    return g.height[idx(i, j)]!
  }
  for (const s of samples) s.h = hAt(s.x, s.z)
  // Moving-average target height (≈ 48 m window) → gentle grade.
  const W = 6
  const target = samples.map((_, i) => {
    let sum = 0
    let c = 0
    for (let k = Math.max(0, i - W); k <= Math.min(samples.length - 1, i + W); k++) {
      sum += samples[k]!.h
      c++
    }
    return sum / c
  })
  const crossings: GenRoad['crossings'] = []
  let inWater = false
  let wStart = 0
  for (let si = 0; si < samples.length; si++) {
    const s = samples[si]!
    const [ci, cj] = nearestCell(s.x, s.z)
    const wk = g.waterKind[idx(ci, cj)]
    if (wk && !inWater) {
      inWater = true
      wStart = si
    } else if (!wk && inWater) {
      inWater = false
      const a = samples[Math.max(0, wStart - 2)]!
      const b = samples[Math.min(samples.length - 1, si + 1)]!
      const mid = samples[((wStart + si) / 2) | 0]!
      const [mi, mj] = nearestCell(mid.x, mid.z)
      const depth = g.water[idx(mi, mj)]! - g.height[idx(mi, mj)]!
      const span = Math.hypot(b.x - a.x, b.z - a.z)
      crossings.push({
        x: (a.x + b.x) / 2,
        z: (a.z + b.z) / 2,
        kind: depth > 0.7 || span > 14 ? 'bridge' : 'ford',
        rot: Math.atan2(b.x - a.x, b.z - a.z),
        span: span + 4,
      })
    }
    if (wk) continue
    const th = target[si]!
    // Flatten a ±1 cell corridor.
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const ii = ci + di
        const jj = cj + dj
        if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue
        const k = jj * n + ii
        if (g.waterKind[k]) continue
        const d = Math.hypot(ii * CELL_M - s.x, jj * CELL_M - s.z)
        const w = d < 5 ? 1 : Math.max(0, 1 - (d - 5) / 8)
        if (w <= 0) continue
        g.height[k] = g.height[k]! * (1 - w * 0.85) + th * w * 0.85
        g.flat[k] = Math.max(g.flat[k]!, Math.round(255 * w))
        if (d < 6) g.road[k] = Math.max(g.road[k]!, Math.round(255 * (1 - d / 6)))
      }
    }
  }
  return { ...road, length: polylineLength(pts), crossings }
}
