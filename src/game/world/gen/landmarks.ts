/**
 * Landmarks (WORLD-11): stone circles, house and estate ruins, shipwrecks on the coast, boat wrecks on
 * river/lake banks. Deterministic for seed + GEN_VERSION; placement rules keep them off settlements and roads.
 * @domain world
 * @subdomain world-gen
 */
import type { BiomeId, GenLandmark, GenRoad, GenSettlement, LandmarkKind } from '../types'
import { distToSegment } from '../../core/math'
import { Rng } from '../../core/rng'
import { idx, nearestCell, sampleGrid } from '../grid'
import { Biome, CELL_M, GRID_N, SEA_LEVEL, WORLD_SIZE_M } from '../types'

interface LandmarkGrid {
  height: Float32Array
  biome: Uint8Array
  waterKind: Uint8Array
  water: Float32Array
}

interface Rule {
  kind: LandmarkKind
  count: number
  radius: number
  /** Minimum distance to any settlement centre (m). */
  minSettlement: number
  /** Minimum distance to any road polyline (m). */
  minRoad: number
  /** Largest height difference allowed on the footprint ring (m). */
  maxSlope: number
  biomes: BiomeId[]
}

export const LANDMARK_RULES: Rule[] = [
  { kind: 'stone_circle', count: 5, radius: 9, minSettlement: 350, minRoad: 50, maxSlope: 2.5, biomes: [Biome.Meadow, Biome.Steppe, Biome.Mountain] },
  { kind: 'house_ruin', count: 8, radius: 8, minSettlement: 250, minRoad: 30, maxSlope: 3, biomes: [Biome.Meadow, Biome.Steppe, Biome.ForestDeciduous, Biome.ForestMixed] },
  { kind: 'estate_ruin', count: 3, radius: 22, minSettlement: 600, minRoad: 50, maxSlope: 3.5, biomes: [Biome.Meadow, Biome.Steppe, Biome.ForestDeciduous] },
  { kind: 'shipwreck', count: 4, radius: 12, minSettlement: 300, minRoad: 0, maxSlope: 99, biomes: [Biome.Beach] },
  { kind: 'boat_wreck', count: 5, radius: 5, minSettlement: 200, minRoad: 20, maxSlope: 99, biomes: [Biome.Meadow, Biome.Steppe, Biome.Beach, Biome.Swamp, Biome.ForestDeciduous, Biome.ForestMixed] },
]

/** Same kind keeps this far apart, any two landmarks at least {@link MIN_ANY_M}. */
const MIN_SAME_KIND_M = 800
const MIN_ANY_M = 300

export const LANDMARK_NAMES: Record<LandmarkKind, string[]> = {
  stone_circle: ['The Hollow Stones', 'The Gathering Stones', 'Greyman\'s Ring', 'The Standing Nine', 'The Moonwatch Circle', 'The Whispering Ring'],
  house_ruin: ['Old Harrow\'s Cottage', 'The Burnt Farmstead', 'Miller\'s Rest', 'The Hollow Hearth', 'Thatcher\'s Folly', 'The Empty Croft', 'Widow Marl\'s House', 'The Fallen Barn'],
  estate_ruin: ['Blackwater Manor', 'Highcastle Ruins', 'The Forsaken Hall', 'Ravensgate Estate'],
  shipwreck: ['The Drowned Gull', 'Saltmaiden\'s Grave', 'The Broken Cog', 'Wreck of the Kestrel', 'The Beached Merchant'],
  boat_wreck: ['The Sunken Skiff', 'Ferryman\'s Ruin', 'The Rotted Punt', 'Old Tam\'s Boat', 'The Stranded Dory', 'The Silted Barge'],
}

const nearRoad = (roads: GenRoad[], x: number, z: number, d: number) => {
  for (const r of roads) {
    const p = r.points
    for (let i = 0; i + 1 < p.length; i++) {
      if (distToSegment(x, z, p[i]!.x, p[i]!.z, p[i + 1]!.x, p[i + 1]!.z) < d) return true
    }
  }
  return false
}

/** Spread of ground height on a ring of `r` metres around (x, z). */
function ringSlope(height: Float32Array, x: number, z: number, r: number): number {
  let lo = sampleGrid(height, x, z)
  let hi = lo
  for (let a = 0; a < 8; a++) {
    const h = sampleGrid(height, x + Math.cos(a * 0.7854) * r, z + Math.sin(a * 0.7854) * r)
    lo = Math.min(lo, h)
    hi = Math.max(hi, h)
  }
  return hi - lo
}

const cellAt = (x: number, z: number) => idx(...nearestCell(x, z))

/** True when any cell within `r` metres (ring sampling) has the given test result. */
function anyAround(x: number, z: number, r: number, test: (k: number) => boolean): boolean {
  for (let a = 0; a < 12; a++) {
    for (const rr of [r * 0.5, r]) {
      const [ci, cj] = nearestCell(x + Math.cos(a * 0.5236) * rr, z + Math.sin(a * 0.5236) * rr)
      if (test(idx(ci, cj))) return true
    }
  }
  return false
}

export function placeLandmarks(seed: number, g: LandmarkGrid, settlements: GenSettlement[], roads: GenRoad[], home: GenSettlement): GenLandmark[] {
  const rng = new Rng(seed ^ 0x1a4d)
  const out: GenLandmark[] = []
  const nameCursor = new Map<LandmarkKind, number>()

  // Coast candidates: beach cells with ocean within ~30 m (scan once, deterministic order).
  const coast: [number, number][] = []
  for (let j = 4; j < GRID_N - 4; j += 2) {
    for (let i = 4; i < GRID_N - 4; i += 2) {
      if (g.biome[idx(i, j)] !== Biome.Beach) continue
      if (g.biome[idx(i + 4, j)] === Biome.Ocean || g.biome[idx(i - 4, j)] === Biome.Ocean || g.biome[idx(i, j + 4)] === Biome.Ocean || g.biome[idx(i, j - 4)] === Biome.Ocean) coast.push([i * CELL_M, j * CELL_M])
    }
  }

  for (const rule of LANDMARK_RULES) {
    let placed = 0
    const tries = rule.kind === 'shipwreck' ? Math.min(coast.length, 800) : 6000
    for (let t = 0; t < tries && placed < rule.count; t++) {
      let x: number
      let z: number
      if (rule.kind === 'shipwreck') {
        const c = coast[rng.int(0, coast.length - 1)]!
        x = c[0]
        z = c[1]
      } else {
        // Half of the attempts around the home settlement so early exploration finds some.
        const near = t % 2 === 0
        x = near ? home.x + rng.range(-2200, 2200) : rng.range(200, WORLD_SIZE_M - 200)
        z = near ? home.z + rng.range(-2200, 2200) : rng.range(200, WORLD_SIZE_M - 200)
        if (x < 200 || z < 200 || x > WORLD_SIZE_M - 200 || z > WORLD_SIZE_M - 200) continue
      }
      const k = cellAt(x, z)
      if (!rule.biomes.includes(g.biome[k] as BiomeId)) continue
      if (g.waterKind[k] || g.height[k]! < SEA_LEVEL + 0.4) continue
      if (rule.kind === 'boat_wreck') {
        // On a bank: river or lake within ~12 m, ground above the water surface.
        if (!anyAround(x, z, 12, (kk) => g.waterKind[kk] !== 0)) continue
      }
      if (rule.maxSlope < 99 && ringSlope(g.height, x, z, rule.radius) > rule.maxSlope) continue
      if (settlements.some((s) => Math.hypot(s.x - x, s.z - z) < rule.minSettlement)) continue
      if (rule.minRoad > 0 && nearRoad(roads, x, z, rule.minRoad)) continue
      if (out.some((l) => Math.hypot(l.x - x, l.z - z) < (l.kind === rule.kind ? MIN_SAME_KIND_M : MIN_ANY_M))) continue
      const i = nameCursor.get(rule.kind) ?? 0
      nameCursor.set(rule.kind, i + 1)
      const pool = LANDMARK_NAMES[rule.kind]
      out.push({
        id: `lm-${rule.kind}-${placed}`,
        kind: rule.kind,
        name: pool[(i + (seed & 7)) % pool.length]!,
        x,
        z,
        rot: rng.range(0, Math.PI * 2),
        radius: rule.radius,
      })
      placed++
    }
  }
  return out
}
