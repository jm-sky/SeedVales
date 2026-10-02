/**
 * Settlement site selection and procedural layout (plaza, households, profession structures).
 * @domain world
 * @subdomain settlements
 */
import type { GenHousehold, GenSettlement, GenStructure, ProfessionId, SettlementSize, StructureKind } from '../types'
import { distToSegment } from '../../core/math'
import { Rng } from '../../core/rng'
import { perf } from '../../diag/perf'
import { idx, nearestCell, sampleGrid } from '../grid'
import { Biome, CELL_M, GRID_N, SEA_LEVEL, WORLD_SIZE_M } from '../types'

const NAMES = [
  'Oakwold', 'Alderford', 'Stonebrook', 'Heatherby', 'Lindham', 'Highmoor', 'Birchwick', 'Larchmere',
  'Hazelhurst', 'Maplewick', 'Pinecombe', 'Beechholt', 'Willowdene', 'Ashby Vale', 'Hollowgate', 'Wrenfield',
]

export const HOUSEHOLDS_BY_SIZE: Record<SettlementSize, ProfessionId[]> = {
  SM: ['farmer', 'woodcutter', 'hunter', 'guard', 'herbalist', 'shepherd', 'trader'],
  MD: ['farmer', 'farmer', 'woodcutter', 'hunter', 'guard', 'herbalist', 'shepherd', 'trader', 'blacksmith'],
  LG: [
    'farmer', 'farmer', 'farmer', 'woodcutter', 'woodcutter', 'hunter', 'guard', 'guard', 'herbalist',
    'shepherd', 'trader', 'trader', 'blacksmith',
  ],
}

export interface SiteGrid {
  height: Float32Array
  waterKind: Uint8Array
  biome: Uint8Array
  mountain: Float32Array
}

/** Scores candidate sites on a coarse lattice. Higher is better; -Infinity = invalid. */
export function scoreSites(g: SiteGrid): { x: number; z: number; score: number }[] {
  const out: { x: number; z: number; score: number }[] = []
  const step = 64
  for (let z = 400; z < WORLD_SIZE_M - 400; z += step) {
    for (let x = 400; x < WORLD_SIZE_M - 400; x += step) {
      const h = sampleGrid(g.height, x, z)
      if (h < 3 || h > 55) continue
      // Flatness within 70 m; no water inside the settlement area.
      let maxDiff = 0
      let blocked = false
      {
        const [ci0, cj0] = nearestCell(x, z)
        if (g.waterKind[idx(ci0, cj0)]) continue
      }
      for (let a = 0; a < 16; a++) {
        for (const r of [12, 30, 50, 70, 90]) {
          const px = x + Math.cos(a * 0.3927) * r
          const pz = z + Math.sin(a * 0.3927) * r
          const [ci, cj] = nearestCell(px, pz)
          const k = idx(ci, cj)
          if (g.waterKind[k] || g.height[k]! < SEA_LEVEL + 1) blocked = true
          const b = g.biome[k]
          if (b === Biome.Mountain || b === Biome.Snow || b === Biome.Swamp) blocked = true
          maxDiff = Math.max(maxDiff, Math.abs(g.height[k]! - h))
        }
      }
      if (blocked || maxDiff > 9) continue
      // Near water (river/lake within 250 m) is attractive.
      let waterNear = 0
      for (let a = 0; a < 12 && !waterNear; a++) {
        for (const r of [120, 180, 250]) {
          const [ci, cj] = nearestCell(x + Math.cos(a * 0.52) * r, z + Math.sin(a * 0.52) * r)
          if (g.waterKind[idx(ci, cj)] === 1 || g.waterKind[idx(ci, cj)] === 2) {
            waterNear = 1
            break
          }
        }
      }
      const [ci, cj] = nearestCell(x, z)
      const mnt = g.mountain[idx(ci, cj)]!
      out.push({ x, z, score: 10 - maxDiff + waterNear * 6 + mnt * 3 })
    }
  }
  return out
}

interface Rect {
  x: number
  z: number
  r: number
}

/** Lays out a settlement: plaza, warehouse, households with profession structures. */
export function layoutSettlement(
  id: number,
  size: SettlementSize,
  cx: number,
  cz: number,
  seed: number,
  g: SiteGrid,
  roads: { x: number; z: number }[][],
): { settlement: GenSettlement; structures: GenStructure[] } {
  const rng = new Rng(seed ^ (id * 7919))
  const structures: GenStructure[] = []
  const placed: Rect[] = []
  let sc = 0
  const add = (kind: StructureKind, x: number, z: number, rot: number, hw: number, hd: number, hh?: number) => {
    const s: GenStructure = { id: `s${id}-${kind}-${sc++}`, kind, x, z, rot, hw, hd, settlementId: id, householdIdx: hh }
    structures.push(s)
    placed.push({ x, z, r: Math.hypot(hw, hd) })
    return s
  }
  const free = (x: number, z: number, r: number) => {
    for (const p of placed) if (Math.hypot(p.x - x, p.z - z) < p.r + r + 2) return false
    for (const road of roads) {
      for (let i = 0; i < road.length - 1; i++) {
        const a = road[i]!
        const b = road[i + 1]!
        if (Math.abs(a.x - x) > 200 && Math.abs(a.z - z) > 200) continue
        if (distToSegment(x, z, a.x, a.z, b.x, b.z) < r + 5) return false
      }
    }
    const [ci, cj] = nearestCell(x, z)
    if (ci < 1 || cj < 1 || ci >= GRID_N - 1 || cj >= GRID_N - 1) return false
    const k = idx(ci, cj)
    if (g.waterKind[k] || g.height[k]! < SEA_LEVEL + 0.8) return false
    // Keep structures well away from rivers/lakes (pads must not flood).
    for (let a = 0; a < 8; a++) {
      const [wi, wj] = nearestCell(x + Math.cos(a * 0.785) * (r + 10), z + Math.sin(a * 0.785) * (r + 10))
      if (g.waterKind[idx(wi, wj)]) return false
    }
    const b = g.biome[k]
    if (b === Biome.Mountain || b === Biome.Snow) return false
    return Math.abs(sampleGrid(g.height, x, z) - sampleGrid(g.height, cx, cz)) < 12
  }

  // Plaza.
  add('campfire', cx, cz, 0, 1.2, 1.2)
  const plazaRot = rng.range(0, Math.PI * 2)
  const around = (ang: number, r: number) => ({ x: cx + Math.cos(plazaRot + ang) * r, z: cz + Math.sin(plazaRot + ang) * r })
  const tryAround = (kind: StructureKind, ang: number, r: number, hw: number, hd: number) => {
    for (let t = 0; t < 24; t++) {
      const a = ang + (t % 2 ? 1 : -1) * Math.ceil(t / 2) * 0.35
      const p = around(a, r + Math.floor(t / 8) * 4)
      if (free(p.x, p.z, Math.hypot(hw, hd))) {
        return add(kind, p.x, p.z, Math.atan2(cx - p.x, cz - p.z), hw, hd)
      }
    }
    return null
  }
  tryAround('well', 0.3, 8, 1.1, 1.1)
  tryAround('noticeboard', 2.2, 8, 1, 0.3)
  tryAround('warehouse', 4, 18, 5, 4)
  if (size !== 'SM') tryAround('market', 1.3, 15, 3, 2)
  if (size === 'LG' || size === 'MD') tryAround('inn', 5.2, 22, 6, 5)

  const profs = HOUSEHOLDS_BY_SIZE[size]
  const households: GenHousehold[] = []
  const baseR = size === 'SM' ? 32 : size === 'MD' ? 40 : 48
  profs.forEach((prof, hIdx) => {
    let house: GenStructure | null = null
    for (let t = 0; t < 60 && !house; t++) {
      const ang = (hIdx / profs.length) * Math.PI * 2 + rng.range(-0.25, 0.25) + t * 0.4
      const r = baseR + rng.range(0, 16) + Math.floor(t / 6) * 8
      const p = around(ang, r)
      if (free(p.x, p.z, 6.5)) house = add('house', p.x, p.z, Math.atan2(cx - p.x, cz - p.z), 4, 3, hIdx)
    }
    if (!house) {
      perf.count('world.gen.householdSkipped')
      return
    }
    households.push({ idx: hIdx, profession: prof, houseId: house.id, members: rng.int(2, 4) })
    const hx = house.x
    const hz = house.z
    const outA = Math.atan2(hz - cz, hx - cx)
    const side = (dx: number, dz: number) => ({
      x: hx + Math.cos(outA) * dz - Math.sin(outA) * dx,
      z: hz + Math.sin(outA) * dz + Math.cos(outA) * dx,
    })
    const placeNear = (kind: StructureKind, hw: number, hd: number, cands: [number, number][]) => {
      for (const [dx, dz] of cands) {
        const p = side(dx, dz)
        if (free(p.x, p.z, Math.hypot(hw, hd))) return add(kind, p.x, p.z, house!.rot, hw, hd, hIdx)
      }
      // Fallback: ring search around the house (preferred spots are often taken by field/pen).
      const r0 = 7 + Math.max(hw, hd)
      for (let r = r0; r <= r0 + 30; r += 3) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2
          const p = side(Math.cos(a) * r, Math.sin(a) * r)
          if (free(p.x, p.z, Math.hypot(hw, hd))) return add(kind, p.x, p.z, house!.rot, hw, hd, hIdx)
        }
      }
      perf.count('world.gen.structureMissing')
      return null
    }
    placeNear('well', 0.8, 0.8, [[9, 2], [-9, 2], [9, -5], [-9, -5], [0, 10]])
    switch (prof) {
      case 'blacksmith':
        placeNear('anvil', 1.5, 1.5, [[9, 4], [-9, 4], [0, 10]])
        break
      case 'farmer':
        placeNear('field', 11, 7, [[0, 24], [16, 22], [-16, 22], [0, 34], [22, 12], [-22, 12]])
        placeNear('pen', 4, 4, [[-11, 10], [11, 10], [0, 14]])
        break
      case 'herbalist':
        placeNear('herbgarden', 4, 3, [[0, 12], [11, 9], [-11, 9]])
        break
      case 'hunter':
        placeNear('dryrack', 1.5, 0.6, [[9, 6], [-9, 6], [0, 10]])
        break
      case 'shepherd':
        placeNear('pen', 6, 5, [[0, 16], [13, 11], [-13, 11], [0, 24]])
        placeNear('trough', 1.2, 0.5, [[8, 9], [-8, 9], [0, 10]])
        break
      case 'woodcutter':
        placeNear('woodpile', 2, 1, [[9, 6], [-9, 6], [0, 10]])
        break
      default:
        break
    }
  })
  // Guard torch posts around the perimeter.
  const outer = baseR + 30
  for (let a = 0; a < 6; a++) {
    for (let t = 0; t < 6; t++) {
      const p = around((a / 6) * Math.PI * 2 + t * 0.15, outer + t * 3)
      if (free(p.x, p.z, 0.4)) {
        add('torchpost', p.x, p.z, 0, 0.2, 0.2)
        break
      }
    }
  }
  const radius = Math.max(...placed.map((p) => Math.hypot(p.x - cx, p.z - cz) + p.r))
  return {
    settlement: {
      id,
      name: NAMES[(seed + id * 5) % NAMES.length]!,
      size,
      x: cx,
      z: cz,
      y: 0,
      radius,
      households,
    },
    structures,
  }
}

/** Flattens terrain pads under structures (height = pad centre). Marks flat mask. */
export function flattenStructures(height: Float32Array, flat: Uint8Array, waterKind: Uint8Array, structures: GenStructure[]) {
  const n = GRID_N
  for (const s of structures) {
    if (s.kind === 'torchpost' || s.kind === 'bridge') continue
    const r = Math.hypot(s.hw, s.hd)
    const target = sampleGrid(height, s.x, s.z)
    const R = r + 8
    const i0 = Math.max(0, Math.floor((s.x - R) / CELL_M))
    const i1 = Math.min(n - 1, Math.ceil((s.x + R) / CELL_M))
    const j0 = Math.max(0, Math.floor((s.z - R) / CELL_M))
    const j1 = Math.min(n - 1, Math.ceil((s.z + R) / CELL_M))
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * n + i
        if (waterKind[k]) continue
        const d = Math.hypot(i * CELL_M - s.x, j * CELL_M - s.z)
        const w = d <= r + 2 ? 1 : Math.max(0, 1 - (d - r - 2) / 8)
        height[k] = height[k]! * (1 - w) + target * w
        flat[k] = Math.max(flat[k]!, Math.round(w * 255))
      }
    }
  }
}
