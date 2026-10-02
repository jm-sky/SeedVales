/**
 * SpatialHash structure (review 013 P-04): emptied cells are deleted, queries stay correct.
 */
import { describe, expect, it } from 'vitest'
import { SpatialHash } from './spatial'

const actor = (id: number, x: number, z: number) => ({ id, x, z })

describe('world: SpatialHash (PERF-01, review 013 P-04)', () => {
  it('PERF-01: removing the last entity of a cell deletes the cell', () => {
    const h = new SpatialHash(32)
    const a = actor(1, 5, 5)
    const b = actor(2, 500, 500)
    h.insert(a)
    h.insert(b)
    expect(h.cellCount).toBe(2)
    h.remove(a)
    expect(h.cellCount).toBe(1)
    h.remove(b)
    expect(h.cellCount).toBe(0)
    expect(h.query(5, 5, 50)).toEqual([])
  })

  it('PERF-01: a cross-cell update leaves no empty cell behind (roaming actor)', () => {
    const h = new SpatialHash(32)
    const a = actor(1, 0, 0)
    h.insert(a)
    for (let i = 1; i <= 200; i++) {
      a.x = i * 10
      h.update(a)
      expect(h.cellCount).toBe(1)
    }
    expect(h.query(2000, 0, 5)).toEqual([a])
    expect(h.query(0, 0, 5)).toEqual([])
  })

  it('PERF-01: a cell shared by two entities survives removing one of them', () => {
    const h = new SpatialHash(32)
    const a = actor(1, 1, 1)
    const b = actor(2, 2, 2)
    h.insert(a)
    h.insert(b)
    h.remove(a)
    expect(h.cellCount).toBe(1)
    expect(h.query(2, 2, 5)).toEqual([b])
  })
})
