/**
 * Animal dens / herd areas and ore deposits.
 * @domain world
 * @subdomain world-gen
 */
import type { BiomeId, DenSpecies, GenDen, GenDeposit, GenSettlement, OreKind } from '../types'
import { Rng } from '../../core/rng'
import { idx, nearestCell } from '../grid'
import { Biome, WORLD_SIZE_M } from '../types'

interface FeatureGrid {
  height: Float32Array
  biome: Uint8Array
  mountain: Float32Array
}

const DEN_RULES: { species: DenSpecies; count: number; biomes: BiomeId[]; minDist: number; size: [number, number] }[] = [
  { species: 'wolf', count: 5, biomes: [Biome.ForestConifer, Biome.ForestMixed], minDist: 700, size: [3, 4] },
  { species: 'fox', count: 6, biomes: [Biome.ForestMixed, Biome.ForestDeciduous, Biome.Meadow], minDist: 400, size: [1, 2] },
  { species: 'bear', count: 2, biomes: [Biome.ForestConifer, Biome.Mountain], minDist: 1100, size: [1, 1] },
  { species: 'boar', count: 6, biomes: [Biome.ForestDeciduous, Biome.ForestMixed], minDist: 450, size: [2, 4] },
  { species: 'deer', count: 12, biomes: [Biome.ForestDeciduous, Biome.ForestMixed, Biome.Meadow], minDist: 300, size: [3, 5] },
  { species: 'hare', count: 12, biomes: [Biome.Meadow, Biome.Steppe], minDist: 150, size: [2, 3] },
]

export function placeDens(seed: number, g: FeatureGrid, settlements: GenSettlement[], homeId: number): GenDen[] {
  const rng = new Rng(seed ^ 0xde75)
  const dens: GenDen[] = []
  const home = settlements.find((s) => s.id === homeId)!
  for (const rule of DEN_RULES) {
    let placed = 0
    for (let t = 0; t < 4000 && placed < rule.count; t++) {
      // Bias half of the dens towards the home region so early gameplay has wildlife.
      const nearHome = t % 2 === 0
      const x = nearHome ? home.x + rng.range(-1800, 1800) : rng.range(300, WORLD_SIZE_M - 300)
      const z = nearHome ? home.z + rng.range(-1800, 1800) : rng.range(300, WORLD_SIZE_M - 300)
      const [ci, cj] = nearestCell(x, z)
      const b = g.biome[idx(ci, cj)] as BiomeId
      if (!rule.biomes.includes(b)) continue
      if (settlements.some((s) => Math.hypot(s.x - x, s.z - z) < rule.minDist)) continue
      if (dens.some((d) => d.species === rule.species && Math.hypot(d.x - x, d.z - z) < 500)) continue
      dens.push({ id: `den-${rule.species}-${placed}`, species: rule.species, x, z, count: rng.int(rule.size[0], rule.size[1]) })
      placed++
    }
  }
  return dens
}

const ORES: { ore: OreKind; count: number; minMountain: number }[] = [
  { ore: 'coal', count: 8, minMountain: 0.05 },
  { ore: 'iron', count: 7, minMountain: 0.15 },
  { ore: 'copper', count: 5, minMountain: 0.2 },
  { ore: 'gold', count: 2, minMountain: 0.4 },
]

export function placeDeposits(seed: number, g: FeatureGrid): GenDeposit[] {
  const rng = new Rng(seed ^ 0x0e0e)
  const out: GenDeposit[] = []
  for (const rule of ORES) {
    let placed = 0
    for (let t = 0; t < 5000 && placed < rule.count; t++) {
      const x = rng.range(300, WORLD_SIZE_M - 300)
      const z = rng.range(300, WORLD_SIZE_M - 300)
      const [ci, cj] = nearestCell(x, z)
      const k = idx(ci, cj)
      if (g.height[k]! < 15 || g.mountain[k]! < rule.minMountain) continue
      if (g.biome[k] === Biome.Snow || g.biome[k] === Biome.Water) continue
      out.push({ id: `ore-${rule.ore}-${placed}`, ore: rule.ore, x, z, radius: rng.range(20, 60), richness: rng.range(0.3, 1) })
      placed++
    }
  }
  return out
}
