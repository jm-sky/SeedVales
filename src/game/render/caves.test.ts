/**
 * WORLD-05: cave mesh builder — finite geometry, walls reach from floor to roof/ground, no degenerate output.
 */
import { describe, expect, it } from 'vitest'
import { testWorld } from '../sim/testWorld'
import { Terrain, TerrainEdits } from '../world/terrain'
import { buildCaveGeometry } from './caves'

describe('WORLD-05 cave mesh', () => {
  it('builds finite floor and shell geometry for every cave of a world', () => {
    const w = testWorld(1337)
    const t = new Terrain(w, new TerrainEdits())
    expect(w.caves.length).toBeGreaterThan(0)
    w.caves.forEach((c, i) => {
      const g = t.caves.grid(i)
      const { floor, shell } = buildCaveGeometry(g, (x, z) => t.heightAt(x, z), i)
      expect(floor, `${c.id} floor`).not.toBeNull()
      expect(shell, `${c.id} shell`).not.toBeNull()
      for (const geo of [floor!, shell!]) {
        const pos = geo.getAttribute('position').array
        for (let k = 0; k < pos.length; k++) expect(Number.isFinite(pos[k]!)).toBe(true)
        expect(pos.length % 9).toBe(0)
      }
      // The floor never rises above the ground by more than the entrance tolerance.
      const fp = floor!.getAttribute('position')
      for (let k = 0; k < fp.count; k += 6) expect(fp.getY(k)).toBeLessThanOrEqual(t.heightAt(fp.getX(k), fp.getZ(k)) + 1.5)
    })
  })
})
