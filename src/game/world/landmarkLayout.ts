/**
 * Landmark piece layouts (WORLD-11): where each piece of a landmark lies, in landmark-local metres.
 * Pure data shared by the renderer (which builds the meshes) and the simulation (which derives solid
 * colliders from the same slots, so what you see is what blocks you).
 * @domain world
 * @subdomain landmarks
 */
import type { GenLandmark } from './types'
import { hash01, hashString } from '../core/rng'

/** Piece nodes of `landmarks.glb` (WORLD-11): ruins, standing stones, wrecks. Built by `scripts/assets/build-landmarks.mjs`. */
export const LANDMARK_NODES = {
  walls: ['Ruin_Wall_Broken', 'Ruin_Wall_Half', 'Ruin_Wall_Hole', 'Ruin_Wall_Double_Broken', 'Ruin_Wall_Overgrown'],
  arch: 'Ruin_Arch_Broken',
  columns: ['Ruin_Column', 'Ruin_Column_Short'],
  floor: 'Ruin_Floor',
  bricks: 'Ruin_Bricks',
  stones: ['Stone_1', 'Stone_2', 'Stone_3', 'Stone_4', 'Stone_5'],
  ship: 'Wreck_Ship',
  boat: 'Wreck_Boat',
} as const

export interface Slot {
  name: string
  x: number
  z: number
  ry: number
  s?: number
  /** Metres sunk into the ground. */
  sink?: number
  pitch?: number
  roll?: number
}

const pick = <T>(a: readonly T[], h: number): T => a[Math.floor(h * a.length) % a.length]!

/** Piece placement (landmark-local metres, +Z forward) per kind; deterministic from the landmark id. */
export function layout(l: GenLandmark): Slot[] {
  const seed = hashString(l.id)
  const h = (...v: number[]) => hash01(seed, ...v)
  const out: Slot[] = []
  const N = LANDMARK_NODES
  switch (l.kind) {
    case 'boat_wreck':
      out.push({ name: N.boat, x: 0, z: 0, ry: 0, sink: 0.3, pitch: 0.06, roll: 0.18 })
      break
    case 'estate_ruin':
    case 'house_ruin': {
      const estate = l.kind === 'estate_ruin'
      const nx = estate ? 6 : 3
      const nz = estate ? 4 : 2
      const W = nx * 3
      const D = nz * 3
      const wall = (x: number, z: number, ry: number, i: number) => {
        if (h(i, 11) < (estate ? 0.12 : 0.22)) {
          if (h(i, 12) < 0.6) out.push({ name: N.bricks, x, z, ry: h(i, 13) * 6, sink: 0.05 })
          return
        }
        out.push({ name: pick(N.walls, h(i, 14)), x, z, ry, sink: 0.12 })
      }
      let k = 0
      for (let i = 0; i < nx; i++) {
        const x = -W / 2 + 1.5 + i * 3
        // The estate keeps one arched gateway on the front.
        if (estate && i === Math.floor(nx / 2)) out.push({ name: N.arch, x, z: D / 2, ry: 0, sink: 0.1 })
        else wall(x, D / 2, 0, k++)
        wall(x, -D / 2, Math.PI, k++)
      }
      for (let i = 0; i < nz; i++) {
        const z = -D / 2 + 1.5 + i * 3
        wall(W / 2, z, Math.PI / 2, k++)
        wall(-W / 2, z, -Math.PI / 2, k++)
      }
      if (estate) {
        // Inner dividing wall and corner columns.
        for (let i = 0; i < 3; i++) wall(-W / 2 + 4.5 + i * 3, 0, 0, k++)
        for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) out.push({ name: pick(N.columns, h(k++, 15)), x: (cx * W) / 2, z: (cz * D) / 2, ry: 0, sink: 0.1 })
      }
      // Floor slabs inside, some missing.
      for (let i = 0; i < nx - 1; i++) {
        for (let j = 0; j < nz - 1; j++) {
          if (h(i, j, 16) < 0.55) out.push({ name: N.floor, x: -W / 2 + 3 + i * 3, z: -D / 2 + 3 + j * 3, ry: 0, sink: 0.05 })
        }
      }
      out.push({ name: N.bricks, x: W / 2 - 1.5, z: D / 2 - 1.5, ry: h(17) * 6 })
      break
    }
    case 'chapel_ruin': {
      // A roofless nave: two long side walls, a gabled front with the arch, a back wall, columns inside and a few floor slabs.
      const L = 4 // wall segments along the nave
      const W = 6
      const D = L * 3
      let k = 0
      const wall = (x: number, z: number, ry: number) => {
        if (h(k, 21) < 0.15) out.push({ name: N.bricks, x, z, ry: h(k, 22) * 6, sink: 0.05 })
        else out.push({ name: pick(N.walls, h(k, 23)), x, z, ry, sink: 0.15 })
        k++
      }
      for (let i = 0; i < L; i++) {
        const z = -D / 2 + 1.5 + i * 3
        wall(W / 2, z, Math.PI / 2)
        wall(-W / 2, z, -Math.PI / 2)
      }
      out.push({ name: N.arch, x: 0, z: D / 2, ry: 0, sink: 0.2 })
      wall(-3, D / 2, 0)
      wall(3, D / 2, 0)
      wall(-1.5, -D / 2, Math.PI)
      wall(1.5, -D / 2, Math.PI)
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) out.push({ name: pick(N.columns, h(k++, 24)), x: cx * (W / 2 - 0.6), z: cz * (D / 4), ry: 0, sink: 0.2 })
      for (let i = 0; i < L - 1; i++) if (h(i, 25) < 0.6) out.push({ name: N.floor, x: 0, z: -D / 2 + 3 + i * 3, ry: 0, sink: 0.2 })
      out.push({ name: N.bricks, x: 0, z: -D / 2 + 2, ry: h(26) * 6 })
      break
    }
    case 'watch_tower_ruin': {
      // A square tower stump: four walls round a floor slab, corner columns, rubble outside.
      const S = 6
      let k = 0
      for (const [x, z, ry] of [[0, S / 2, 0], [0, -S / 2, Math.PI], [S / 2, 0, Math.PI / 2], [-S / 2, 0, -Math.PI / 2]] as const) {
        out.push({ name: pick(N.walls, h(k++, 31)), x, z, ry, sink: 0.2 })
      }
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) out.push({ name: pick(N.columns, h(k++, 32)), x: (cx * S) / 2, z: (cz * S) / 2, ry: 0, sink: 0.15 })
      out.push({ name: N.floor, x: 0, z: 0, ry: h(33) * 6, sink: 0.1 })
      for (let i = 0; i < 3; i++) out.push({ name: N.bricks, x: (h(i, 34) - 0.5) * 12, z: (h(i, 35) - 0.5) * 12, ry: h(i, 36) * 6 })
      break
    }
    case 'shipwreck':
      // Half sunk in the sand, bow up and listing.
      out.push({ name: N.ship, x: 0, z: 0, ry: 0, sink: 1.8, pitch: -0.14, roll: 0.22 })
      break
    case 'stone_circle': {
      const n = 8 + (seed % 3)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + h(i, 1) * 0.12
        const r = l.radius * (0.85 + h(i, 2) * 0.2)
        // One in five has fallen over.
        const fallen = h(i, 3) < 0.2
        out.push({ name: pick(N.stones, h(i, 4)), x: Math.cos(a) * r, z: Math.sin(a) * r, ry: -a + Math.PI / 2 + (h(i, 5) - 0.5) * 0.4, s: 0.9 + h(i, 6) * 0.35, sink: 0.15, roll: fallen ? 1.1 : (h(i, 7) - 0.5) * 0.16 })
      }
      out.push({ name: N.stones[2], x: 0, z: 0, ry: h(9, 9) * 6, s: 1.1, sink: 0.3 })
      break
    }
  }
  return out
}
