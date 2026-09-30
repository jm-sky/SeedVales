/**
 * Biome classification from height, slope, moisture, temperature (north = low z = colder).
 * @domain world
 * @subdomain world-gen
 */
import { Noise2D } from '../../core/noise'
import { Biome, CELL_M, GRID_N, SEA_LEVEL, WORLD_SIZE_M } from '../types'

export function classifyBiomes(
  seed: number,
  height: Float32Array,
  moisture: Float32Array,
  mountain: Float32Array,
  waterKind: Uint8Array,
): Uint8Array {
  const n = GRID_N
  const out = new Uint8Array(n * n)
  const nForest = new Noise2D(seed ^ 0x7777)
  const nSwamp = new Noise2D(seed ^ 0x3333)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i
      const h = height[k]!
      if (h < SEA_LEVEL - 0.2) {
        out[k] = Biome.Ocean
        continue
      }
      if (waterKind[k]) {
        out[k] = Biome.Water
        continue
      }
      const hx = height[j * n + Math.min(n - 1, i + 1)]! - height[j * n + Math.max(0, i - 1)]!
      const hz = height[Math.min(n - 1, j + 1) * n + i]! - height[Math.max(0, j - 1) * n + i]!
      const slope = Math.hypot(hx, hz) / (2 * CELL_M)
      const nz = (j * CELL_M) / WORLD_SIZE_M
      const temp = nz - h * 0.0025 // 0 cold .. 1 warm
      const m = moisture[k]!
      if (h < 1.6) {
        out[k] = Biome.Beach
        continue
      }
      if (h > 190 || (h > 130 && temp < 0.15)) {
        out[k] = Biome.Snow
        continue
      }
      if ((mountain[k]! > 0.35 && h > 70) || slope > 0.9) {
        out[k] = Biome.Mountain
        continue
      }
      if (h < 14 && slope < 0.05 && m > 0.7 && nSwamp.fbm(i * 0.02, j * 0.02, 3) > 0.25) {
        out[k] = Biome.Swamp
        continue
      }
      const f = nForest.fbm(i * 0.012, j * 0.012, 4) + (m - 0.5) * 0.6
      if (f > 0.05) {
        out[k] = temp < 0.38 ? Biome.ForestConifer : temp < 0.55 ? Biome.ForestMixed : Biome.ForestDeciduous
        continue
      }
      out[k] = temp > 0.72 && m < 0.35 ? Biome.Steppe : Biome.Meadow
    }
  }
  return out
}
