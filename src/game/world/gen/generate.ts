/**
 * World generation orchestrator (deterministic for seed + GEN_VERSION).
 * Stages are timed via diag (world.gen.*).
 * @domain world
 * @subdomain world-gen
 */
import type { GenRoad, GenSettlement, GenStructure, SettlementSize, WorldData } from '../types'
import { DAY_MARCH_M } from '../../config/calibration'
import { perf } from '../../diag/perf'
import { sampleGrid } from '../grid'
import { CELL_M, GEN_VERSION, GRID_N, WORLD_SIZE_M } from '../types'
import { classifyBiomes } from './biomes'
import { placeDens, placeDeposits } from './features'
import { generateBaseFields } from './heightfield'
import { generateHydrology } from './hydrology'
import { carveRoad, findRoadPath, smoothPath } from './roads'
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

  // --- Settlement centres ---
  const sites = t('sites', () => scoreSites(grid))
  if (!sites.length) throw new Error('No settlement sites for seed ' + seed)
  const centerBias = (s: { x: number; z: number; score: number }) =>
    s.score - Math.hypot(s.x - WORLD_SIZE_M * 0.45, s.z - WORLD_SIZE_M * 0.55) / 400
  const home = [...sites].sort((a, b) => centerBias(b) - centerBias(a))[0]!
  const centres: { x: number; z: number; size: SettlementSize }[] = [{ x: home.x, z: home.z, size: 'SM' }]
  const roadsRaw: { from: number; to: number; cells: number[] }[] = []

  const pickNext = (from: { x: number; z: number }, awayFrom: { x: number; z: number } | null, size: SettlementSize, target: number) => {
    const cands = sites
      .filter((s) => {
        const d = Math.hypot(s.x - from.x, s.z - from.z)
        if (d < target * 0.6 || d > target * 1.0) return false
        if (awayFrom && Math.hypot(s.x - awayFrom.x, s.z - awayFrom.z) < DAY_MARCH_M * 1.05) return false
        return centres.every((c) => Math.hypot(c.x - s.x, c.z - s.z) > 1500)
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    let best: { site: (typeof sites)[0]; cells: number[]; err: number } | null = null
    for (const c of cands) {
      const cells = t('astar', () => findRoadPath(grid, from.x, from.z, c.x, c.z))
      if (!cells) continue
      const len = cells.length * CELL_M * 1.1
      const err = Math.abs(len - target)
      if (!best || err < best.err) best = { site: c, cells, err }
    }
    if (!best) return null
    centres.push({ x: best.site.x, z: best.site.z, size })
    return best.cells
  }
  const r1 = pickNext(home, null, 'MD', DAY_MARCH_M)
  if (r1) roadsRaw.push({ from: 0, to: 1, cells: r1 })
  const second = centres[1]
  if (second) {
    const r2 = pickNext(second, home, 'LG', DAY_MARCH_M * 1.25)
    if (r2) roadsRaw.push({ from: 1, to: 2, cells: r2 })
  }

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
