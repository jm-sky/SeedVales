/**
 * Uniform spatial hash for dynamic entities (actors). O(1) update, radius queries by cell scan.
 * @domain world
 * @subdomain spatial
 */
import { perf } from '../diag/perf'

export interface Positioned {
  id: number
  x: number
  z: number
}

export class SpatialHash<T extends Positioned> {
  private cells = new Map<number, T[]>()
  private where = new Map<number, number>()
  private cell: number
  constructor(cell = 32) {
    this.cell = cell
  }

  private key(x: number, z: number) {
    return (Math.floor(x / this.cell) + 1024) * 4096 + (Math.floor(z / this.cell) + 1024)
  }

  insert(e: T) {
    const k = this.key(e.x, e.z)
    let arr = this.cells.get(k)
    if (!arr) {
      arr = []
      this.cells.set(k, arr)
    }
    arr.push(e)
    this.where.set(e.id, k)
  }

  remove(e: T) {
    const k = this.where.get(e.id)
    if (k === undefined) return
    const arr = this.cells.get(k)
    if (arr) {
      const i = arr.indexOf(e)
      if (i >= 0) arr.splice(i, 1)
    }
    this.where.delete(e.id)
  }

  update(e: T) {
    const k = this.key(e.x, e.z)
    const old = this.where.get(e.id)
    if (old === k) return
    if (old !== undefined) {
      const arr = this.cells.get(old)
      if (arr) {
        const i = arr.indexOf(e)
        if (i >= 0) arr.splice(i, 1)
      }
    }
    let arr = this.cells.get(k)
    if (!arr) {
      arr = []
      this.cells.set(k, arr)
    }
    arr.push(e)
    this.where.set(e.id, k)
  }

  query(x: number, z: number, r: number, out: T[] = []): T[] {
    perf.count('spatial.queries')
    const c = this.cell
    const i0 = Math.floor((x - r) / c)
    const i1 = Math.floor((x + r) / c)
    const j0 = Math.floor((z - r) / c)
    const j1 = Math.floor((z + r) / c)
    const r2 = r * r
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const arr = this.cells.get((i + 1024) * 4096 + (j + 1024))
        if (!arr) continue
        for (const e of arr) if ((e.x - x) ** 2 + (e.z - z) ** 2 <= r2) out.push(e)
      }
    }
    return out
  }

  clear() {
    this.cells.clear()
    this.where.clear()
  }
}
