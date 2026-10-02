/**
 * Settlement centres and road routes: home (SM) → neighbour (MD) ≈ one day's march by route,
 * → LG further on. Retries alternative home sites until the chain is complete and in band.
 * @domain world
 * @subdomain world-gen
 */
import type { SettlementSize } from '../types'
import type { RoadGrid } from './roads'
import type { scoreSites } from './settlements'
import { DAY_MARCH_M } from '../../config/calibration'
import { polylineLength } from '../../core/math'
import { perf } from '../../diag/perf'
import { WORLD_SIZE_M } from '../types'
import { findRoadPath, smoothPath } from './roads'

/** Home → nearest neighbour route length band (× DAY_MARCH_M), vision §4.2 „~1 day's walk”. */
export const ROUTE_BAND: [number, number] = [0.8, 1.3]
/** LG leg: target × DAY_MARCH_M and band (× target). */
export const LG_TARGET = 1.25
export const LG_BAND: [number, number] = [0.7, 1.3]
const HOME_ATTEMPTS = 5

type Site = ReturnType<typeof scoreSites>[number]
export interface Centre { x: number; z: number; size: SettlementSize }
export interface RawRoad { from: number; to: number; cells: number[] }
interface Plan { centres: Centre[]; roadsRaw: RawRoad[]; misses: number }

export function planCentres(grid: RoadGrid, sites: Site[], seed: number): { centres: Centre[]; roadsRaw: RawRoad[] } {
  if (!sites.length) throw new Error('No settlement sites for seed ' + seed)
  const centerBias = (s: Site) => s.score - Math.hypot(s.x - WORLD_SIZE_M * 0.45, s.z - WORLD_SIZE_M * 0.55) / 400
  const homes = [...sites].sort((a, b) => centerBias(b) - centerBias(a))
  let best: Plan | null = null
  // Alternative homes must be distinct places, not neighbouring cells of the same valley.
  const tried: Site[] = []
  for (const home of homes) {
    if (tried.length >= HOME_ATTEMPTS) break
    if (tried.some((o) => Math.hypot(o.x - home.x, o.z - home.z) < 600)) continue
    tried.push(home)
    const plan = planFrom(grid, sites, home)
    const complete = plan.centres.length >= 3 && plan.roadsRaw.length >= 2
    const score = (p: Plan) => (p.centres.length >= 3 && p.roadsRaw.length >= 2 ? 0 : 10) + p.misses
    if (!best || score(plan) < score(best)) best = plan
    if (complete && plan.misses === 0) break
    perf.count('world.gen.homeRetry')
  }
  if (!best || best.centres.length < 3 || best.roadsRaw.length < 2) throw new Error(`World seed ${seed}: could not place 3 road-linked settlements`)
  if (best.misses) perf.count('world.gen.routeBandMiss', best.misses)
  return best
}

function planFrom(grid: RoadGrid, sites: Site[], home: Site): Plan {
  const plan: Plan = { centres: [{ x: home.x, z: home.z, size: 'SM' }], roadsRaw: [], misses: 0 }
  const r1 = pickNext(grid, sites, plan, home, null, 'MD', DAY_MARCH_M, ROUTE_BAND)
  if (!r1) return plan
  plan.roadsRaw.push({ from: 0, to: 1, cells: r1 })
  const second = plan.centres[1]!
  const r2 = pickNext(grid, sites, plan, second, home, 'LG', DAY_MARCH_M * LG_TARGET, LG_BAND)
  if (r2) plan.roadsRaw.push({ from: 1, to: 2, cells: r2 })
  return plan
}

/**
 * Next settlement along a road: route length (smoothed polyline, as built) must fall in
 * band×target; closest to target wins. No candidate in band → closest one, counted as a miss.
 */
function pickNext(grid: RoadGrid, sites: Site[], plan: Plan, from: { x: number; z: number }, awayFrom: { x: number; z: number } | null, size: SettlementSize, target: number, band: [number, number]): number[] | null {
  let best: { site: Site; cells: number[]; err: number; inBand: boolean } | null = null
  const tried = new Set<Site>()
  // Pass 2 widens the straight-line window when pass 1 found nothing in band.
  for (const [lo, hi] of [[0.45, 1.05], [0.3, 1.3]] as const) {
    const cands = sites
      .filter((s) => {
        if (tried.has(s)) return false
        const d = Math.hypot(s.x - from.x, s.z - from.z)
        if (d < target * lo || d > target * hi) return false
        if (awayFrom && Math.hypot(s.x - awayFrom.x, s.z - awayFrom.z) < DAY_MARCH_M * 1.05) return false
        return plan.centres.every((c) => Math.hypot(c.x - s.x, c.z - s.z) > 1500)
      })
      .sort((a, b) => b.score - a.score)
    // Spatially diverse shortlist (top sites tend to cluster in one valley).
    const shortlist: Site[] = []
    for (const c of cands) {
      if (shortlist.length >= 12) break
      if (shortlist.every((o) => Math.hypot(o.x - c.x, o.z - c.z) > 350)) shortlist.push(c)
    }
    for (const c of shortlist) {
      tried.add(c)
      const cells = perf.measure('world.gen.astar', () => findRoadPath(grid, from.x, from.z, c.x, c.z))
      if (!cells) continue
      const len = polylineLength(smoothPath(cells))
      const inBand = len >= target * band[0] && len <= target * band[1]
      const err = Math.abs(len - target)
      if (!best || (inBand && !best.inBand) || (inBand === best.inBand && err < best.err)) best = { site: c, cells, err, inBand }
      if (inBand && err < target * 0.1) break
    }
    if (best?.inBand) break
  }
  if (!best) return null
  if (!best.inBand) plan.misses++
  plan.centres.push({ x: best.site.x, z: best.site.z, size })
  return best.cells
}
