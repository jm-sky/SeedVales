/**
 * WORLD-05: caves — deterministic generation, placement rules and walkable geometry invariants.
 */
import { describe, expect, it } from 'vitest'
import { CAVE } from '../../config/calibration'
import { buildCaveGrid, CELL_UNDER, spinePoints } from '../caveShape'
import { sampleGrid } from '../grid'
import { Biome } from '../types'
import { caveIsValid } from './caves'
import { generateWorld } from './generate'

const SEEDS = [0, 1, 2, 19, 42, 2020, 9999, 88888]

describe('WORLD-05 caves', () => {
  it('is deterministic: same seed → same caves', () => {
    expect(JSON.stringify(generateWorld(1337).caves)).toBe(JSON.stringify(generateWorld(1337).caves))
  })

  let total = 0
  for (const seed of SEEDS) {
    it(`seed ${seed}: rules hold, geometry is roofed beyond a short cutting`, () => {
      const w = generateWorld(seed)
      total += w.caves.length
      expect(new Set(w.caves.map((c) => c.id)).size).toBe(w.caves.length)
      for (const c of w.caves) {
        const k = Math.round(c.z / w.cell) * w.n + Math.round(c.x / w.cell)
        expect(w.biome[k], `${c.id} on a mountain`).toBe(Biome.Mountain)
        expect(w.waterKind[k]).toBe(0)
        for (const s of w.settlements) expect(Math.hypot(s.x - c.x, s.z - c.z)).toBeGreaterThanOrEqual(220)
        expect(c.name).toMatch(/^[A-Za-z' ]+$/)
        expect(caveIsValid(c, w.height)).toBe(true)
        // Floor continuous at the entrance: the first open cells sit within a step of the surface.
        const g = buildCaveGrid(c, (x, z) => sampleGrid(w.height, x, z))
        // Walking in along the spine axis: the first open point has a floor within a step of the ground.
        let mouth = false
        for (let t = 4; t >= 0 && !mouth; t -= 0.25) {
          const bx = c.x - Math.sin(c.yaw) * t
          const bz = c.z - Math.cos(c.yaw) * t
          if (!g.flagAt(bx, bz)) continue
          mouth = true
          expect(Math.abs(g.floorAt(bx, bz) - sampleGrid(w.height, bx, bz)), `${c.id} mouth`).toBeLessThanOrEqual(CAVE.stepM)
        }
        expect(mouth, `${c.id} has a mouth`).toBe(true)
        let under = 0
        for (let i = 0; i < g.flag.length; i++) if (g.flag[i] === CELL_UNDER) under++
        expect(under, `${c.id} has a roofed interior`).toBeGreaterThan(40)
        // Roofed cells keep head-room for the camera.
        for (let j = 0; j < g.nz; j++) {
          for (let i = 0; i < g.nx; i++) {
            if (g.flag[j * g.nx + i] !== CELL_UNDER) continue
            const x = g.ox + i + 0.5
            const z = g.oz + j + 0.5
            expect(g.ceilAt(x, z) - g.floorAt(x, z)).toBeGreaterThan(CAVE.tunnelHeight - 1)
          }
        }
        expect(spinePoints(c).length).toBeGreaterThan(3)
      }
    }, 60_000)
  }

  it('finds caves on most seeds', () => {
    expect(total).toBeGreaterThanOrEqual(SEEDS.length)
  })
})
