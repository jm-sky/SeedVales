/**
 * Landmark collision (WORLD-11 follow-up): standing stones, ruin walls/columns and wrecks block movement.
 * Colliders are derived from the same layout slots the renderer builds its meshes from, so what you see
 * is what blocks you. Rubble (bricks), floor slabs and the broken arch's opening stay walkable.
 * @domain sim
 * @subdomain collision
 */
import type { GenLandmark } from '../world/types'
import { layout, LANDMARK_NODES as N } from '../world/landmarkLayout'

export interface BoxSolid {
  x: number
  z: number
  rot: number
  hw: number
  hd: number
}

export interface CircleSolid {
  x: number
  z: number
  r: number
}

export interface Solids {
  boxes: BoxSolid[]
  circles: CircleSolid[]
}

const CELL_M = 32
const WALL_HALF_THICKNESS = 0.3
const stoneRadius = new Map<string, number>([['Stone_1', 0.6], ['Stone_2', 0.65], ['Stone_3', 0.75], ['Stone_4', 0.7], ['Stone_5', 0.85]])

/** World-space colliders of one landmark (pure; deterministic from the landmark and its layout). */
export function landmarkSolids(l: GenLandmark): Solids {
  const out: Solids = { boxes: [], circles: [] }
  const c = Math.cos(l.rot)
  const s = Math.sin(l.rot)
  for (const slot of layout(l)) {
    const x = l.x + slot.x * c + slot.z * s
    const z = l.z - slot.x * s + slot.z * c
    const rot = l.rot + slot.ry
    const k = slot.s ?? 1
    if ((N.walls as readonly string[]).includes(slot.name)) {
      out.boxes.push({ x, z, rot, hw: slot.name.endsWith('Half') ? 0.75 : 1.45, hd: WALL_HALF_THICKNESS })
    } else if ((N.columns as readonly string[]).includes(slot.name)) {
      out.circles.push({ x, z, r: slot.name.endsWith('Short') ? 0.25 : 0.3 })
    } else if ((N.stones as readonly string[]).includes(slot.name)) {
      out.circles.push({ x, z, r: (stoneRadius.get(slot.name) ?? 0.7) * k })
    } else if (slot.name === N.arch) {
      // Two broken jambs; the opening between them is passable.
      for (const sign of [-1, 1]) out.circles.push({ x: x + sign * 1.6 * Math.cos(rot), z: z - sign * 1.6 * Math.sin(rot), r: 0.35 })
    } else if (slot.name === N.ship) {
      out.boxes.push({ x, z, rot, hw: 2.4, hd: 7 })
    } else if (slot.name === N.boat) {
      out.boxes.push({ x, z, rot, hw: 0.85, hd: 2 })
    }
  }
  return out
}

/** Bucketed index over all landmarks of a world; built once, landmarks are immutable. */
export class LandmarkSolids {
  private cells = new Map<string, Solids>()

  constructor(landmarks: readonly GenLandmark[]) {
    for (const l of landmarks) {
      const s = landmarkSolids(l)
      for (const b of s.boxes) this.add(b.x, b.z, b.hw + b.hd, (cell) => cell.boxes.push(b))
      for (const ci of s.circles) this.add(ci.x, ci.z, ci.r, (cell) => cell.circles.push(ci))
    }
  }

  private add(x: number, z: number, reach: number, push: (cell: Solids) => void) {
    for (let i = Math.floor((x - reach) / CELL_M); i <= Math.floor((x + reach) / CELL_M); i++) {
      for (let j = Math.floor((z - reach) / CELL_M); j <= Math.floor((z + reach) / CELL_M); j++) {
        const k = `${i},${j}`
        let cell = this.cells.get(k)
        if (!cell) this.cells.set(k, (cell = { boxes: [], circles: [] }))
        push(cell)
      }
    }
  }

  /** Solids registered in the cell containing (x, z); empty for almost every position in the world. */
  at(x: number, z: number): Solids | undefined {
    return this.cells.get(`${Math.floor(x / CELL_M)},${Math.floor(z / CELL_M)}`)
  }
}
