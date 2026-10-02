/**
 * Grass placement (render--007 step 2): where grass grows is decided from DATA — biome, road mask, slope,
 * water, building footprints — never from the final terrain colour. Deterministic per tile (hash of the
 * tile coordinates), so rebuilding a tile gives the same blades. Pure: no three, no GL.
 * @domain render
 * @subdomain grass
 */
import type { QualityProfile } from './quality'
import { Biome } from '../world/types'

export const TILE_M = 16
/** Density grid inside a tile: 2 m cells. */
const CELL_M = 2
const CELLS = TILE_M / CELL_M

/** Blade clumps per m² at full density (LOD0 real clumps / LOD1 crossed-quad clumps). */
export const CLUMP_DENSITY = [3, 2] as const

/** Per-profile rings (m, horizontal from the player). `near` 0 = no blade ring. */
export const GRASS_RINGS: Record<QualityProfile, { near: number; far: number; k: number }> = {
  low: { near: 14, far: 36, k: 0.6 }, // `k` scales the density (low = sparse clump ring, plan budget table)
  medium: { near: 22, far: 70, k: 1 },
  high: { near: 38, far: 95, k: 1 },
}

/** Fade zones (m): LOD0 shrinks over the last FADE_NEAR m of its ring; LOD1 fades in before it and out over FADE_FAR. */
export const FADE_NEAR = 10
export const FADE_FAR = 16

export interface GrassTerrain {
  biomeAt(x: number, z: number): number
  roadAt(x: number, z: number): number
  slopeAt(x: number, z: number): number
  waterDepthAt(x: number, z: number): number
  heightAt(x: number, z: number): number
}

export interface Footprint {
  x: number
  z: number
  r: number
}

const BIOME_DENSITY: Record<number, number> = {
  [Biome.Meadow]: 1,
  [Biome.Steppe]: 0.75,
  [Biome.Swamp]: 0.5,
  [Biome.ForestDeciduous]: 0.55,
  [Biome.ForestMixed]: 0.45,
  [Biome.ForestConifer]: 0.2,
  [Biome.Mountain]: 0.1,
}

/** Keyframes over the year fraction (0 = 1 March, spring start): blade height factor and flower amount. */
const GROWTH_KEYS: [number, number][] = [[0, 0.4], [0.2, 0.8], [0.38, 1], [0.62, 1], [0.75, 0.75], [0.85, 0.45], [1, 0.4]]
const FLOWER_KEYS: [number, number][] = [[0, 0], [0.08, 0.3], [0.18, 1], [0.42, 1], [0.55, 0.35], [0.65, 0], [1, 0]]

function keyed(keys: [number, number][], f: number): number {
  for (let i = 1; i < keys.length; i++) {
    const [b, vb] = keys[i]!
    if (f <= b) {
      const [a, va] = keys[i - 1]!
      return va + (vb - va) * ((f - a) / (b - a))
    }
  }
  return keys[keys.length - 1]![1]
}

/**
 * Seasonal grass look (user, 2026-10-02): short after winter, growing through spring, full in summer, lodged
 * in late autumn; flowers from mid spring to late summer. `yearFrac` = fractional day of the year / days per year.
 */
export function grassSeasonal(yearFrac: number): { growth: number; flowers: number } {
  const f = ((yearFrac % 1) + 1) % 1
  return { growth: keyed(GROWTH_KEYS, f), flowers: keyed(FLOWER_KEYS, f) }
}

/**
 * Blade colour multiplier per biome (user, 2026-10-02: grass should match the ground colour): yellower on the
 * steppe, darker in forests and swamp. Linear RGB, applied as the instance colour.
 */
const BIOME_TINT: Record<number, [number, number, number]> = {
  [Biome.Meadow]: [1, 1, 1],
  [Biome.Steppe]: [1.3, 1.1, 0.72],
  [Biome.Swamp]: [0.82, 0.88, 0.7],
  [Biome.ForestDeciduous]: [0.85, 0.92, 0.8],
  [Biome.ForestMixed]: [0.8, 0.88, 0.78],
  [Biome.ForestConifer]: [0.78, 0.85, 0.75],
  [Biome.Mountain]: [1.05, 1, 0.85],
}
const NO_TINT: [number, number, number] = [1, 1, 1]

export function grassTint(biome: number): [number, number, number] {
  return BIOME_TINT[biome] ?? NO_TINT
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** 0..1 grass density from data masks (season/snow are shader uniforms, not part of placement). */
export function grassDensity(biome: number, road: number, slope: number, wet: boolean, onFootprint: boolean): number {
  if (wet || onFootprint) return 0
  const b = BIOME_DENSITY[biome] ?? 0
  if (b === 0) return 0
  return b * (1 - smooth(0.05, 0.4, road)) * (1 - smooth(0.35, 0.8, slope))
}

/** Integer hash → [0,1). */
export function hash01(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Upper bound of instances in a ring of radius `r` at the given LOD (cap for buffers; tiles overshoot by one tile). */
export function maxInstances(lod: 0 | 1, outer: number, inner: number, k = 1): number {
  if (outer <= 0) return 0 // ring disabled on this profile
  const o = outer + TILE_M * 0.75
  const i = Math.max(0, inner - TILE_M * 0.75)
  return Math.ceil(Math.PI * (o * o - i * i) * CLUMP_DENSITY[lod] * k)
}

/**
 * Instances of one tile: [x, y, z, rot, scale]* (LOD1 clumps are bigger). Candidates sit on a jittered
 * grid; each survives with probability = the data density of its 2 m cell.
 */
export function tileInstances(t: GrassTerrain, foot: Footprint[], tx: number, tz: number, lod: 0 | 1, k = 1): number[] {
  const x0 = tx * TILE_M
  const z0 = tz * TILE_M
  const dens = new Float32Array(CELLS * CELLS)
  let any = false
  for (let j = 0; j < CELLS; j++) {
    for (let i = 0; i < CELLS; i++) {
      const cx = x0 + (i + 0.5) * CELL_M
      const cz = z0 + (j + 0.5) * CELL_M
      let on = false
      for (const f of foot) if ((f.x - cx) ** 2 + (f.z - cz) ** 2 < (f.r + CELL_M * 0.7) ** 2) { on = true; break }
      const biome = t.biomeAt(cx, cz)
      const d = BIOME_DENSITY[biome] ? grassDensity(biome, t.roadAt(cx, cz), t.slopeAt(cx, cz), t.waterDepthAt(cx, cz) > 0.05, on) : 0
      dens[j * CELLS + i] = d
      if (d > 0) any = true
    }
  }
  const out: number[] = []
  if (!any) return out
  const n = Math.round(TILE_M * Math.sqrt(CLUMP_DENSITY[lod]))
  const step = TILE_M / n
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const px = x0 + (i + hash01(tx * 977 + i, tz * 613 + j, 1 + lod * 7)) * step
      const pz = z0 + (j + hash01(tx * 977 + i, tz * 613 + j, 2 + lod * 7)) * step
      const d = dens[Math.min(CELLS - 1, Math.floor((pz - z0) / CELL_M)) * CELLS + Math.min(CELLS - 1, Math.floor((px - x0) / CELL_M))]!
      if (d <= 0 || hash01(tx * 977 + i, tz * 613 + j, 3 + lod * 7) > d * k) continue
      const rot = hash01(tx * 977 + i, tz * 613 + j, 4) * Math.PI * 2
      const sc = (0.75 + hash01(tx * 977 + i, tz * 613 + j, 5) * 0.6) * (lod === 1 ? 1.15 : 1)
      out.push(px, t.heightAt(px, pz) - 0.02, pz, rot, sc)
    }
  }
  return out
}
