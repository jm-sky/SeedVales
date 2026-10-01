/** RENDER-06: grass placement comes from data masks, is deterministic and capped per quality profile. */
import { describe, expect, it } from 'vitest'
import { testSim } from '../sim/testWorld'
import { Biome } from '../world/types'
import { CLUMP_DENSITY, GRASS_RINGS, grassDensity, hash01, maxInstances, TILE_M, tileInstances } from './grassPlacement'

describe('grass placement', () => {
  it('density: meadow grows, road/water/rock/beach/footprints/steep ground do not', () => {
    expect(grassDensity(Biome.Meadow, 0, 0, false, false)).toBe(1)
    expect(grassDensity(Biome.Meadow, 1, 0, false, false)).toBe(0) // road
    expect(grassDensity(Biome.Meadow, 0, 0, true, false)).toBe(0) // water
    expect(grassDensity(Biome.Meadow, 0, 0, false, true)).toBe(0) // under a building
    expect(grassDensity(Biome.Meadow, 0, 1.0, false, false)).toBe(0) // cliff
    expect(grassDensity(Biome.Beach, 0, 0, false, false)).toBe(0)
    expect(grassDensity(Biome.Snow, 0, 0, false, false)).toBe(0)
    expect(grassDensity(Biome.ForestConifer, 0, 0, false, false)).toBeLessThan(grassDensity(Biome.Steppe, 0, 0, false, false))
  })

  it('hash is deterministic and spread over [0,1)', () => {
    expect(hash01(3, 4, 5)).toBe(hash01(3, 4, 5))
    let mean = 0
    for (let i = 0; i < 2000; i++) mean += hash01(i, i * 7, 1) / 2000
    expect(mean).toBeGreaterThan(0.45)
    expect(mean).toBeLessThan(0.55)
  })

  it('caps: a full tile stays under the per-tile bound and each ring under maxInstances', () => {
    for (const lod of [0, 1] as const) {
      const perTile = Math.ceil(TILE_M * TILE_M * CLUMP_DENSITY[lod]) + TILE_M * 2
      const n = Math.round(TILE_M * Math.sqrt(CLUMP_DENSITY[lod]))
      expect(n * n).toBeLessThanOrEqual(perTile)
    }
    for (const q of ['low', 'medium', 'high'] as const) {
      const { near, far, k } = GRASS_RINGS[q]
      expect(maxInstances(0, near, 0, k)).toBeLessThan(q === 'high' ? 24500 : q === 'medium' ? 11500 : 4300)
      expect(maxInstances(1, far, Math.max(0, near - 12), k)).toBeLessThan(q === 'high' ? 78000 : q === 'medium' ? 44000 : 9500)
    }
  })

  it('tiles on the real world: deterministic, only on grassy ground, none under buildings', () => {
    const sim = testSim()
    const t = sim.terrain
    const s = sim.world.settlements[0]!
    const foot = sim.buildingsNear(s.x, s.z, 80).map((b) => ({ x: b.x, z: b.z, r: Math.hypot(b.hw, b.hd) * 0.9 + 1.2 }))
    expect(foot.length).toBeGreaterThan(3)
    let total = 0
    for (let tz = Math.floor((s.z - 48) / TILE_M); tz <= Math.floor((s.z + 48) / TILE_M); tz++) {
      for (let tx = Math.floor((s.x - 48) / TILE_M); tx <= Math.floor((s.x + 48) / TILE_M); tx++) {
        const a = tileInstances(t, foot, tx, tz, 0)
        expect(tileInstances(t, foot, tx, tz, 0)).toEqual(a)
        for (let i = 0; i < a.length; i += 5) {
          total++
          const x = a[i]!
          const z = a[i + 2]!
          expect(t.waterDepthAt(x, z)).toBeLessThan(0.1)
          expect(t.roadAt(x, z)).toBeLessThan(0.45)
          for (const f of foot) expect(Math.hypot(f.x - x, f.z - z)).toBeGreaterThan(f.r - 0.01)
          expect(Math.abs(a[i + 1]! - (t.heightAt(x, z) - 0.02))).toBeLessThan(1e-6)
        }
      }
    }
    expect(total).toBeGreaterThan(200) // the village is not bald
  })
})
