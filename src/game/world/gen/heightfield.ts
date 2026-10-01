import { smoothstep } from '../../core/math'
/**
 * Base heightfield + moisture: continent in ocean, ridged sharp mountains, rolling lowlands,
 * coastal cliffs and small meadow scarps.
 * @domain world
 * @subdomain world-gen
 */
import { Noise2D } from '../../core/noise'
import { CELL_M, GRID_N, WORLD_SIZE_M } from '../types'

export interface BaseFields {
  height: Float32Array
  moisture: Float32Array
  mountain: Float32Array
}

export function generateBaseFields(seed: number): BaseFields {
  const nBase = new Noise2D(seed ^ 0x1234)
  const nMount = new Noise2D(seed ^ 0x5678)
  const nMask = new Noise2D(seed ^ 0x9abc)
  const nWarp = new Noise2D(seed ^ 0xdef0)
  const nMoist = new Noise2D(seed ^ 0x2468)
  const nScarp = new Noise2D(seed ^ 0x1357)
  const nHill = new Noise2D(seed ^ 0x7a31) // hilliness region (WORLD-12)
  const nRoll = new Noise2D(seed ^ 0x3c5d)
  const nKnoll = new Noise2D(seed ^ 0x6e19)
  const nRidge = new Noise2D(seed ^ 0x4b87)
  const n = GRID_N
  const height = new Float32Array(n * n)
  const moisture = new Float32Array(n * n)
  const mountain = new Float32Array(n * n)

  // Mountain range centre biased to the north (cold) side, per seed.
  const mcx = 0.35 + nMask.get(1.1, 7.3) * 0.25
  const mcz = 0.3 + nMask.get(4.2, 2.9) * 0.1

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = i * CELL_M
      const z = j * CELL_M
      const nx = x / WORLD_SIZE_M
      const nz = z / WORLD_SIZE_M
      const wx = nx + nWarp.fbm(nx * 3, nz * 3, 3) * 0.08
      const wz = nz + nWarp.fbm(nx * 3 + 5, nz * 3 + 5, 3) * 0.08

      // Continent mask: 1 on land, 0 in ocean.
      const d = Math.hypot(wx - 0.5, wz - 0.5) * 2
      const cont = 1 - smoothstep(0.8, 1.02, d)

      // Lowland hills (−2..30 m).
      const hills = 10 + nBase.fbm(wx * 7, wz * 7, 5) * 16 + nBase.fbm(wx * 30, wz * 30, 2) * 2.5

      // Mountains: ridged noise masked by a range region.
      const md = Math.hypot((wx - mcx) * 1.1, (wz - mcz) * 1.8)
      const rangeMask = smoothstep(0.42, 0.08, md + nMask.fbm(wx * 4, wz * 4, 3) * 0.12)
      const ridge = nMount.ridged(wx * 11, wz * 11, 6)
      const mh = Math.pow(ridge, 1.6) * 320 * rangeMask + rangeMask * 25
      mountain[j * n + i] = rangeMask

      // Meadow scarps: 1–2 m steps along noise contours (uskoki).
      const sc = nScarp.fbm(wx * 18, wz * 18, 2)
      const scarp = smoothstep(0.02, 0.06, sc) * 1.6 * smoothstep(0.35, 0.5, nScarp.get(wx * 5, wz * 5) + 0.5)

      // Mid-scale relief (WORLD-12): rolling hills, knolls/hollows and gentle ridges, scaled by a
      // low-frequency hilliness region so flat meadows survive; none on mountains.
      const hilly = smoothstep(0.34, 0.74, 0.5 + nHill.fbm(nx * 3.2, nz * 3.2, 2) * 1.2)
      const calm = 1 - rangeMask
      const rolling = nRoll.fbm(x / 200, z / 200, 2) * 14 // ~100–200 m wavelength, ±~8 m
      const knolls = nKnoll.fbm(x / 64, z / 64, 2) * 3 // ~40–60 m, ±~3 m
      const ridgeT = nRidge.ridged(x / 320, z / 320, 2)
      const ridges = smoothstep(0.5, 0.95, ridgeT) * smoothstep(0.1, 0.5, nHill.get(nx * 6 + 9, nz * 6 + 9) + 0.5) * 6
      const relief = (rolling + knolls * (0.4 + 0.6 * hilly) + ridges) * hilly * calm * 1.15

      let h = hills + mh + scarp + relief
      // Coast: sharper transition where cliff noise is high (4–8 m cliffs), soft beaches elsewhere.
      const cliffy = smoothstep(0.1, 0.4, nWarp.get(wx * 9, wz * 9))
      const edgeA = 0.5 - cliffy * 0.12
      const edgeB = 0.62 - cliffy * 0.2
      const landT = smoothstep(edgeA - 0.28, edgeB, cont)
      h = h * landT + (1 - landT) * -35
      if (cont < 0.02) h = -40
      height[j * n + i] = h

      // Moisture: noise + south is drier (steppe).
      moisture[j * n + i] = Math.min(1, Math.max(0, 0.55 + nMoist.fbm(nx * 5, nz * 5, 4) * 0.55 - (nz - 0.5) * 0.5))
    }
  }
  return { height, moisture, mountain }
}
