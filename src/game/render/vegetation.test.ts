/**
 * Vegetation streaming (render--002 step 1, review 009 F-01): the rebuild after crossing a half-chunk is
 * spread over frames within a budget, the previous instances stay visible until the new set is complete,
 * and node chunks around the view ring are prefetched one per frame.
 */
import { describe, expect, it } from 'vitest'
import { testSim } from '../sim/testWorld'
import { CHUNK_M } from '../world/types'
import { QUALITY } from './quality'
import { Vegetation } from './vegetation'

const visibleCounts = (v: Vegetation) => v.meshes.filter((m) => m.visible).map((m) => m.count).join(',')

describe('render: vegetation streaming (PERF-02)', () => {
  it('PERF-02: a rebuild is time-sliced, keeps the old instances until it commits, and ends equal to a full rebuild', () => {
    const sim = testSim()
    const q = QUALITY.medium
    const p = sim.player
    const v = new Vegetation(sim, q)
    v.update(p.x, p.z) // first build: complete at once
    expect(v.instances).toBeGreaterThan(0)
    const before = visibleCounts(v)
    // Cross a half-chunk boundary; budget 0 → one small step per frame.
    const x2 = p.x + CHUNK_M
    v.update(x2, p.z, 0)
    expect(v.rebuilding).toBe(true)
    expect(visibleCounts(v)).toBe(before)
    let frames = 1
    while (v.rebuilding && frames < 5000) {
      v.update(x2, p.z, 0)
      frames++
    }
    expect(v.rebuilding).toBe(false)
    expect(frames).toBeGreaterThan(3)
    // Same result as a fresh synchronous build at the new position.
    const ref = new Vegetation(sim, q)
    ref.update(x2, p.z)
    expect(v.instances).toBe(ref.instances)
  })

  it('PERF-02: node chunks ahead of the view ring are prefetched, at most one per frame', () => {
    const sim = testSim()
    const q = QUALITY.medium
    const p = sim.player
    const v = new Vegetation(sim, q)
    v.update(p.x, p.z)
    const r = q.vegFar + CHUNK_M
    const ring = () => {
      let missing = 0
      for (let cz = Math.floor((p.z - r) / CHUNK_M); cz <= Math.floor((p.z + r) / CHUNK_M); cz++) {
        for (let cx = Math.floor((p.x - r) / CHUNK_M); cx <= Math.floor((p.x + r) / CHUNK_M); cx++) if (!sim.nodes.has(cx, cz)) missing++
      }
      return missing
    }
    const m0 = ring()
    expect(m0).toBeGreaterThan(0)
    v.update(p.x, p.z)
    expect(ring()).toBe(m0 - 1)
    for (let i = 0; i < 400; i++) v.update(p.x, p.z)
    expect(ring()).toBe(0)
  })
})
