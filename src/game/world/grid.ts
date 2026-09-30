/**
 * Grid helpers over the world vertex grid (GRID_N × GRID_N, CELL_M spacing).
 * @domain world
 */
import { CELL_M, GRID_N } from './types'

export const idx = (i: number, j: number) => j * GRID_N + i
export const inGrid = (i: number, j: number) => i >= 0 && j >= 0 && i < GRID_N && j < GRID_N

/** Bilinear sample of a float grid at world position. */
export function sampleGrid(g: Float32Array, x: number, z: number): number {
  const fx = Math.min(Math.max(x / CELL_M, 0), GRID_N - 1.001)
  const fz = Math.min(Math.max(z / CELL_M, 0), GRID_N - 1.001)
  const i = Math.floor(fx)
  const j = Math.floor(fz)
  const tx = fx - i
  const tz = fz - j
  const a = g[j * GRID_N + i]!
  const b = g[j * GRID_N + i + 1]!
  const c = g[(j + 1) * GRID_N + i]!
  const d = g[(j + 1) * GRID_N + i + 1]!
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz
}

export function sampleGridU8(g: Uint8Array, x: number, z: number): number {
  const fx = Math.min(Math.max(x / CELL_M, 0), GRID_N - 1.001)
  const fz = Math.min(Math.max(z / CELL_M, 0), GRID_N - 1.001)
  const i = Math.floor(fx)
  const j = Math.floor(fz)
  const tx = fx - i
  const tz = fz - j
  const a = g[j * GRID_N + i]!
  const b = g[j * GRID_N + i + 1]!
  const c = g[(j + 1) * GRID_N + i]!
  const d = g[(j + 1) * GRID_N + i + 1]!
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz
}

export function nearestCell(x: number, z: number): [number, number] {
  return [
    Math.min(GRID_N - 1, Math.max(0, Math.round(x / CELL_M))),
    Math.min(GRID_N - 1, Math.max(0, Math.round(z / CELL_M))),
  ]
}

/** Binary min-heap keyed by float priority storing int payloads. */
export class MinHeap {
  private keys: Float64Array
  private vals: Int32Array
  size = 0
  constructor(cap: number) {
    this.keys = new Float64Array(cap)
    this.vals = new Int32Array(cap)
  }

  push(key: number, val: number) {
    if (this.size >= this.keys.length) {
      const k = new Float64Array(this.keys.length * 2)
      k.set(this.keys)
      this.keys = k
      const v = new Int32Array(this.vals.length * 2)
      v.set(this.vals)
      this.vals = v
    }
    let i = this.size++
    const keys = this.keys
    const vals = this.vals
    while (i > 0) {
      const p = (i - 1) >> 1
      if (keys[p]! <= key) break
      keys[i] = keys[p]!
      vals[i] = vals[p]!
      i = p
    }
    keys[i] = key
    vals[i] = val
  }

  /** Returns payload; key available via lastKey. */
  lastKey = 0
  pop(): number {
    const keys = this.keys
    const vals = this.vals
    const top = vals[0]!
    this.lastKey = keys[0]!
    const k = keys[--this.size]!
    const v = vals[this.size]!
    let i = 0
    const n = this.size
    for (;;) {
      let c = 2 * i + 1
      if (c >= n) break
      if (c + 1 < n && keys[c + 1]! < keys[c]!) c++
      if (keys[c]! >= k) break
      keys[i] = keys[c]!
      vals[i] = vals[c]!
      i = c
    }
    keys[i] = k
    vals[i] = v
    return top
  }
}
