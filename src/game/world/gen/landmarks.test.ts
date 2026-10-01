/**
 * WORLD-11: landmark generation — deterministic per seed, placement rules respected on several seeds.
 */
import { describe, expect, it } from 'vitest'
import { generateWorld } from './generate'
import { LANDMARK_RULES } from './landmarks'

const SEEDS = [0, 1, 2, 19, 42, 2020, 9999, 88888]

describe('WORLD-11 landmarks', () => {
  it('is deterministic: same seed → same landmarks', () => {
    expect(JSON.stringify(generateWorld(1337).landmarks)).toBe(JSON.stringify(generateWorld(1337).landmarks))
  })

  for (const seed of SEEDS) {
    it(`seed ${seed}: kinds present, rules hold, English unique names`, () => {
      const w = generateWorld(seed)
      const byKind = new Map<string, number>()
      for (const l of w.landmarks) byKind.set(l.kind, (byKind.get(l.kind) ?? 0) + 1)
      // Inland kinds always find room; coastal kinds depend on the map having beaches / rivers.
      for (const k of ['stone_circle', 'house_ruin', 'estate_ruin']) expect(byKind.get(k) ?? 0, `${seed} ${k}`).toBeGreaterThan(0)
      const ids = new Set(w.landmarks.map((l) => l.id))
      expect(ids.size).toBe(w.landmarks.length)
      for (const l of w.landmarks) {
        const rule = LANDMARK_RULES.find((r) => r.kind === l.kind)!
        for (const s of w.settlements) expect(Math.hypot(s.x - l.x, s.z - l.z), `${l.id} vs ${s.name}`).toBeGreaterThanOrEqual(rule.minSettlement)
        if (rule.minRoad) {
          for (const r of w.roads) {
            for (let i = 0; i + 1 < r.points.length; i++) {
              const a = r.points[i]!
              const b = r.points[i + 1]!
              const dx = b.x - a.x
              const dz = b.z - a.z
              const t = Math.max(0, Math.min(1, ((l.x - a.x) * dx + (l.z - a.z) * dz) / (dx * dx + dz * dz || 1)))
              expect(Math.hypot(l.x - (a.x + dx * t), l.z - (a.z + dz * t))).toBeGreaterThanOrEqual(rule.minRoad - 0.01)
            }
          }
        }
        const k = Math.round(l.z / w.cell) * w.n + Math.round(l.x / w.cell)
        expect(w.waterKind[k], `${l.id} not in water`).toBe(0)
        expect(rule.biomes).toContain(w.biome[k])
        // English names only (D-LANG-1): ASCII letters, spaces and apostrophes.
        expect(l.name).toMatch(/^[A-Za-z' ]+$/)
      }
      expect(new Set(w.landmarks.map((l) => l.name)).size).toBe(w.landmarks.length)
    }, 30_000)
  }
})
