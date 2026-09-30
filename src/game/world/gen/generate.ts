/**
 * World generation orchestrator (deterministic for seed + GEN_VERSION).
 * Stages are timed via diag (world.gen.*).
 * @domain world
 * @subdomain world-gen
 */
import type { GenRoad, GenSettlement, GenStructure, WorldData } from '../types'
import { perf } from '../../diag/perf'
import { sampleGrid } from '../grid'
import { CELL_M, GEN_VERSION, GRID_N, WORLD_SIZE_M } from '../types'
import { classifyBiomes } from './biomes'
import { planCentres } from './centres'
import { placeDens, placeDeposits } from './features'
import { generateBaseFields } from './heightfield'
import { generateHydrology } from './hydrology'
import { carveRoad, smoothPath } from './roads'
import { flattenStructures, layoutSettlement, scoreSites } from './settlements'

const t = <T>(name: string, fn: () => T) => perf.measure(`world.gen.${name}`, fn)

export function generateWorld(seed: number): WorldData {
  const t0 = performance.now()
  const n = GRID_N
  const base = t('height', () => generateBaseFields(seed))
  const { height, moisture, mountain } = base
  const hydro = t('hydro', () => generateHydrology(height))
  perf.gauge('world.gen.riverCells', hydro.riverCells)
  perf.gauge('world.gen.lakeCells', hydro.lakeCells)
  let biome = t('biome', () => classifyBiomes(seed, height, moisture, mountain, hydro.waterKind))
  const flat = new Uint8Array(n * n)
  const road = new Uint8Array(n * n)
  const grid = { height, waterKind: hydro.waterKind, water: hydro.water, biome, mountain }

  // --- Settlement centres + road routes ---
  const { centres, roadsRaw } = t('centres', () => planCentres(grid, t('sites', () => scoreSites(grid)), seed))

  // --- Roads carve (before layouts so structures avoid them) ---
  const roads: GenRoad[] = []
  t('roads', () => {
    for (const r of roadsRaw) {
      const pts = smoothPath(r.cells)
      roads.push(carveRoad({ ...grid, flat, road }, { id: roads.length, from: r.from, to: r.to, points: pts }))
    }
  })

  // --- Layouts ---
  const settlements: GenSettlement[] = []
  const structures: GenStructure[] = []
  t('layout', () => {
    centres.forEach((c, i) => {
      const { settlement, structures: st } = layoutSettlement(i, c.size, c.x, c.z, seed, grid, roads.map((r) => r.points))
      settlements.push(settlement)
      structures.push(...st)
    })
    flattenStructures(height, flat, hydro.waterKind, structures)
    for (const s of settlements) s.y = sampleGrid(height, s.x, s.z)
  })
  t('banks', () => enforceBanks(height, hydro.water, hydro.waterKind))
  // Bridges as structures (rendering + collision walkway).
  for (const r of roads) {
    r.crossings.forEach((c, i) => {
      if (c.kind === 'bridge') {
        structures.push({ id: `bridge-${r.id}-${i}`, kind: 'bridge', x: c.x, z: c.z, rot: c.rot, hw: 2, hd: c.span / 2, settlementId: -1 })
      }
    })
  }
  // Re-classify biomes after carving (roads/settlement pads).
  biome = t('biome2', () => classifyBiomes(seed, height, moisture, mountain, hydro.waterKind))
  const dens = t('dens', () => placeDens(seed, { height, biome, mountain }, settlements, 0))
  const deposits = t('deposits', () => placeDeposits(seed, { height, biome, mountain }))
  const homeS = settlements[0]!
  return {
    version: GEN_VERSION,
    seed,
    size: WORLD_SIZE_M,
    cell: CELL_M,
    n,
    height,
    water: hydro.water,
    waterKind: hydro.waterKind,
    biome,
    flat,
    road,
    moisture,
    settlements,
    structures,
    roads,
    dens,
    deposits,
    homeSettlement: 0,
    spawn: { x: homeS.x + 4, z: homeS.z + 12 },
    genMs: performance.now() - t0,
  }
}

/** Land cells next to rivers/lakes must stay above the water surface (after roads/pads flattening). */
function enforceBanks(height: Float32Array, water: Float32Array, waterKind: Uint8Array) {
  const n = GRID_N
  for (let j = 1; j < n - 1; j++) {
    for (let i = 1; i < n - 1; i++) {
      const k = j * n + i
      if (waterKind[k]) continue
      let s = -Infinity
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const kk = (j + dj) * n + i + di
        if (waterKind[kk] && water[kk]! > s) s = water[kk]!
      }
      if (s > -Infinity && height[k]! < s + 0.3) height[k] = s + 0.3
    }
  }
}
