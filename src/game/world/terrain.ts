/**
 * Runtime terrain queries: height (base grid + micro-detail + player edits), water, biome, slope.
 * Shared by simulation and rendering (read-only for rendering).
 * @domain world
 * @subdomain terrain
 */
import type { BiomeId, WorldData } from './types'
import { Noise2D } from '../core/noise'
import { idx, nearestCell, sampleGrid, sampleGridU8 } from './grid'
import { CHUNK_M, SEA_LEVEL } from './types'

/** Terrain edit resolution inside a chunk (m). */
export const EDIT_RES_M = 2
export const EDIT_N = CHUNK_M / EDIT_RES_M + 1

export const chunkKey = (cx: number, cz: number) => `${cx},${cz}`

/** Sparse per-chunk height deltas from digging/levelling (mutable, saved). */
export class TerrainEdits {
  chunks = new Map<string, Float32Array>()
  /** Incremented per chunk on change → render rebuild. */
  versions = new Map<string, number>()

  get(cx: number, cz: number) {
    return this.chunks.get(chunkKey(cx, cz))
  }

  ensure(cx: number, cz: number) {
    const k = chunkKey(cx, cz)
    let c = this.chunks.get(k)
    if (!c) {
      c = new Float32Array(EDIT_N * EDIT_N)
      this.chunks.set(k, c)
    }
    return c
  }

  bump(cx: number, cz: number) {
    const k = chunkKey(cx, cz)
    this.versions.set(k, (this.versions.get(k) ?? 0) + 1)
  }

  deltaAt(x: number, z: number): number {
    const cx = Math.floor(x / CHUNK_M)
    const cz = Math.floor(z / CHUNK_M)
    const c = this.chunks.get(chunkKey(cx, cz))
    if (!c) return 0
    const fx = (x - cx * CHUNK_M) / EDIT_RES_M
    const fz = (z - cz * CHUNK_M) / EDIT_RES_M
    const i = Math.min(EDIT_N - 2, Math.floor(fx))
    const j = Math.min(EDIT_N - 2, Math.floor(fz))
    const tx = fx - i
    const tz = fz - j
    const a = c[j * EDIT_N + i]!
    const b = c[j * EDIT_N + i + 1]!
    const d = c[(j + 1) * EDIT_N + i]!
    const e = c[(j + 1) * EDIT_N + i + 1]!
    return (a * (1 - tx) + b * tx) * (1 - tz) + (d * (1 - tx) + e * tx) * tz
  }

  toJSON(): Record<string, number[]> {
    const out: Record<string, number[]> = {}
    this.chunks.forEach((v, k) => (out[k] = Array.from(v, (n) => Math.round(n * 100) / 100)))
    return out
  }

  static fromJSON(o: Record<string, number[]> | undefined) {
    const e = new TerrainEdits()
    if (o) for (const [k, v] of Object.entries(o)) e.chunks.set(k, Float32Array.from(v))
    return e
  }
}

export class Terrain {
  private detail: Noise2D
  world: WorldData
  edits: TerrainEdits
  constructor(world: WorldData, edits: TerrainEdits) {
    this.world = world
    this.edits = edits
    this.detail = new Noise2D(world.seed ^ 0xabcdef)
  }

  /** Height without player edits (used by mesh builder for base + edits). */
  baseHeightAt(x: number, z: number): number {
    const h = sampleGrid(this.world.height, x, z)
    const flat = sampleGridU8(this.world.flat, x, z) / 255
    return h + this.detail.fbm(x / 16, z / 16, 2) * 0.45 * (1 - flat)
  }

  heightAt(x: number, z: number): number {
    return this.baseHeightAt(x, z) + this.edits.deltaAt(x, z)
  }

  /** Water surface at position or -Infinity if none. */
  waterSurfaceAt(x: number, z: number): number {
    const w = this.world
    const fx = x / w.cell
    const fz = z / w.cell
    const i = Math.floor(fx)
    const j = Math.floor(fz)
    let s = -Infinity
    for (let dj = 0; dj <= 1; dj++) {
      for (let di = 0; di <= 1; di++) {
        const ii = i + di
        const jj = j + dj
        if (ii < 0 || jj < 0 || ii >= w.n || jj >= w.n) continue
        const v = w.water[idx(ii, jj)]!
        if (v > s) s = v
      }
    }
    if (sampleGrid(w.height, x, z) < SEA_LEVEL + 0.5) s = Math.max(s, SEA_LEVEL)
    return s
  }

  waterDepthAt(x: number, z: number): number {
    const s = this.waterSurfaceAt(x, z)
    if (s === -Infinity) return 0
    return Math.max(0, s - this.heightAt(x, z))
  }

  /** Water depth over the unedited (generated) terrain — deterministic inputs for resource nodes. */
  baseWaterDepthAt(x: number, z: number): number {
    const s = this.waterSurfaceAt(x, z)
    if (s === -Infinity) return 0
    return Math.max(0, s - this.baseHeightAt(x, z))
  }

  /** True for sea water (non-drinkable). */
  isSeaAt(x: number, z: number): boolean {
    const [i, j] = nearestCell(x, z)
    return !this.world.waterKind[idx(i, j)] && sampleGrid(this.world.height, x, z) < SEA_LEVEL + 0.5
  }

  biomeAt(x: number, z: number): BiomeId {
    const [i, j] = nearestCell(x, z)
    return this.world.biome[idx(i, j)] as BiomeId
  }

  roadAt(x: number, z: number): number {
    return sampleGridU8(this.world.road, x, z) / 255
  }

  /** Slope magnitude (rise/run) using ±1 m finite differences. */
  slopeAt(x: number, z: number): number {
    const dx = this.heightAt(x + 1, z) - this.heightAt(x - 1, z)
    const dz = this.heightAt(x, z + 1) - this.heightAt(x, z - 1)
    return Math.hypot(dx, dz) / 2
  }

  inBounds(x: number, z: number) {
    return x > 16 && z > 16 && x < this.world.size - 16 && z < this.world.size - 16
  }

  /** Apply a circular height change (dig < 0, raise > 0) or level to target height. */
  applyEdit(x: number, z: number, radius: number, op: { kind: 'add'; amount: number } | { kind: 'level'; target: number }) {
    const minCx = Math.floor((x - radius) / CHUNK_M)
    const maxCx = Math.floor((x + radius) / CHUNK_M)
    const minCz = Math.floor((z - radius) / CHUNK_M)
    const maxCz = Math.floor((z + radius) / CHUNK_M)
    for (let cz = minCz; cz <= maxCz; cz++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const c = this.edits.ensure(cx, cz)
        let changed = false
        for (let j = 0; j < EDIT_N; j++) {
          for (let i = 0; i < EDIT_N; i++) {
            const px = cx * CHUNK_M + i * EDIT_RES_M
            const pz = cz * CHUNK_M + j * EDIT_RES_M
            const d = Math.hypot(px - x, pz - z)
            if (d > radius) continue
            const w = 1 - (d / radius) ** 2
            const k = j * EDIT_N + i
            if (op.kind === 'add') c[k] = c[k]! + op.amount * w
            else {
              const cur = this.baseHeightAt(px, pz) + c[k]!
              c[k] = c[k]! + (op.target - cur) * Math.min(1, w * 1.5)
            }
            changed = true
          }
        }
        if (changed) this.edits.bump(cx, cz)
      }
    }
  }
}
