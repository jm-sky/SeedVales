import { MinHeap } from '../grid'
/**
 * Hydrology: priority-flood depression filling, flow accumulation, rivers (source in hills/mountains,
 * mouth in sea or lake), lakes in deep depressions. Carves river beds into the heightfield.
 * Limitation: 8 m grid → narrowest visible stream is ~8 m wide (documented in DECISIONS).
 * @domain world
 * @subdomain hydrology
 */
import { GRID_N, SEA_LEVEL } from '../types'

const DI = [1, -1, 0, 0, 1, 1, -1, -1]
const DJ = [0, 0, 1, -1, 1, -1, 1, -1]

export interface HydroResult {
  water: Float32Array
  waterKind: Uint8Array
  riverCells: number
  lakeCells: number
}

export function generateHydrology(height: Float32Array): HydroResult {
  const n = GRID_N
  const N = n * n
  const filled = new Float32Array(N)
  const done = new Uint8Array(N)
  const heap = new MinHeap(1 << 16)

  // Seeds: border + ocean.
  for (let k = 0; k < N; k++) {
    const i = k % n
    const j = (k / n) | 0
    if (i === 0 || j === 0 || i === n - 1 || j === n - 1 || height[k]! < SEA_LEVEL) {
      filled[k] = height[k]!
      done[k] = 1
      heap.push(height[k]!, k)
    }
  }
  const order = new Int32Array(N)
  let oc = 0
  while (heap.size) {
    const k = heap.pop()
    order[oc++] = k
    const i = k % n
    const j = (k / n) | 0
    for (let d = 0; d < 8; d++) {
      const ii = i + DI[d]!
      const jj = j + DJ[d]!
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue
      const kk = jj * n + ii
      if (done[kk]) continue
      done[kk] = 1
      filled[kk] = Math.max(height[kk]!, filled[k]! + 1e-3)
      heap.push(filled[kk]!, kk)
    }
  }

  // Flow direction: steepest descent on filled surface; accumulate from high to low (reverse pop order).
  const down = new Int32Array(N).fill(-1)
  for (let k = 0; k < N; k++) {
    const i = k % n
    const j = (k / n) | 0
    let best = filled[k]!
    let bk = -1
    for (let d = 0; d < 8; d++) {
      const ii = i + DI[d]!
      const jj = j + DJ[d]!
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue
      const kk = jj * n + ii
      const f = filled[kk]! + (d >= 4 ? 0.0005 : 0)
      if (f < best) {
        best = f
        bk = kk
      }
    }
    down[k] = bk
  }
  const acc = new Float32Array(N).fill(1)
  for (let o = oc - 1; o >= 0; o--) {
    const k = order[o]!
    const d = down[k]!
    if (d >= 0) acc[d]! += acc[k]!
  }

  const water = new Float32Array(N).fill(-Infinity)
  const waterKind = new Uint8Array(N)
  let lakeCells = 0
  // Lakes: deep depressions; shallow pits are simply filled (removes puddles).
  for (let k = 0; k < N; k++) {
    if (height[k]! < SEA_LEVEL) continue
    const depth = filled[k]! - height[k]!
    if (depth > 2.5) {
      water[k] = filled[k]!
      waterKind[k] = 2
      lakeCells++
    } else if (depth > 0) {
      height[k] = filled[k]!
    }
  }

  // Rivers.
  const RIVER_ACC = 2200
  let riverCells = 0
  const surf = new Float32Array(N)
  for (let k = 0; k < N; k++) surf[k] = filled[k]!
  for (let k = 0; k < N; k++) {
    const a = acc[k]!
    if (a < RIVER_ACC || height[k]! < SEA_LEVEL || waterKind[k] === 2) continue
    const w = Math.min(10, 2 + Math.sqrt(a / RIVER_ACC) * 1.6)
    const depth = 0.35 + w * 0.13
    const s = surf[k]! - 0.3
    water[k] = Math.max(water[k]!, s)
    waterKind[k] = 1
    height[k] = Math.min(height[k]!, s - depth)
    riverCells++
    // Banks: neighbours slightly above water; wide rivers widen the bed.
    const i = k % n
    const j = (k / n) | 0
    for (let d = 0; d < 4; d++) {
      const kk = (j + DJ[d]!) * n + (i + DI[d]!)
      if (kk < 0 || kk >= N || waterKind[kk]) continue
      if (w > 6) {
        height[kk] = Math.min(height[kk]!, s - depth * 0.5)
        water[kk] = Math.max(water[kk]!, s)
        waterKind[kk] = 1
      } else {
        height[kk] = Math.min(height[kk]!, s + 0.35)
      }
    }
  }
  return { water, waterKind, riverCells, lakeCells }
}
