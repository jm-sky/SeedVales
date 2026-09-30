import { describe, expect, it } from 'vitest'
import { DAY_MARCH_M } from '../../config/calibration'
import { perf } from '../../diag/perf'
import { Biome } from '../types'
import { generateWorld } from './generate'

const SEED = 1337

describe('world generation', () => {
  const w = generateWorld(SEED)

  it('is deterministic for the same seed', () => {
    const w2 = generateWorld(SEED)
    let diff = 0
    for (let i = 0; i < w.height.length; i += 97) diff += Math.abs(w.height[i]! - w2.height[i]!)
    expect(diff).toBe(0)
    expect(JSON.stringify(w2.settlements)).toBe(JSON.stringify(w.settlements))
    expect(JSON.stringify(w2.roads.map((r) => r.length))).toBe(JSON.stringify(w.roads.map((r) => r.length)))
  })

  it('has ≥3 settlements linked by roads, nearest ≈ one day march by route', () => {
    const counts: Record<number, number> = {}
    for (const b of w.biome) counts[b] = (counts[b] ?? 0) + 1
    console.log(perf.report().gauges, 'genMs', w.genMs.toFixed(0), 'settlements', w.settlements.map((s) => `${s.name}:${s.size}:${s.households.length}`),
      'roads', w.roads.map((r) => `${r.from}->${r.to} ${r.length.toFixed(0)}m cross=${r.crossings.map((c) => c.kind).join(',')}`),
      'biomes', counts, 'dens', w.dens.length, 'deposits', w.deposits.length, 'structures', w.structures.length)
    expect(w.settlements.length).toBeGreaterThanOrEqual(3)
    expect(w.roads.length).toBeGreaterThanOrEqual(2)
    const r0 = w.roads[0]!
    expect(r0.length).toBeGreaterThan(DAY_MARCH_M * 0.8)
    expect(r0.length).toBeLessThan(DAY_MARCH_M * 1.3)
  })

  it('structures are not placed in or right next to water (no flooded villages)', () => {
    const n = w.n
    let wet = 0
    for (const st of w.structures) {
      if (st.kind === 'bridge' || st.kind === 'torchpost') continue
      const i = Math.round(st.x / w.cell)
      const j = Math.round(st.z / w.cell)
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (w.waterKind[(j + dj) * n + i + di]) wet++
      // Terrain at the structure is above any nearby water surface.
      const h = w.height[j * n + i]!
      const s = w.water[j * n + i]!
      expect(s === -Infinity || h > s).toBe(true)
    }
    expect(wet).toBe(0)
  })

  it('contains varied biomes and water', () => {
    const present = new Set(w.biome)
    for (const b of [Biome.Ocean, Biome.Meadow, Biome.Mountain, Biome.Water]) expect(present.has(b)).toBe(true)
    expect(present.has(Biome.ForestConifer) || present.has(Biome.ForestMixed) || present.has(Biome.ForestDeciduous)).toBe(true)
  })
})
