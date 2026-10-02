/** RENDER-06: meadow patches (flowers, dark splashes) are deterministic, bounded and cover only part of the land. */
import { describe, expect, it } from 'vitest'
import { flowerType, gpHash, groundPatch } from './groundPatch'

describe('ground patches', () => {
  it('hash is integer-exact and spread over [0,1)', () => {
    expect(gpHash(12, 34)).toBe(gpHash(12, 34))
    let mean = 0
    for (let i = 0; i < 4000; i++) mean += gpHash(i % 97, Math.floor(i / 97)) / 4000
    expect(mean).toBeGreaterThan(0.45)
    expect(mean).toBeLessThan(0.55)
  })

  it('flower and dark patches cover a minority of the ground and never overlap fully', () => {
    let flower = 0
    let dark = 0
    const types = new Set<number>()
    const n = 6000
    for (let i = 0; i < n; i++) {
      const x = (i % 80) * 37.3
      const z = Math.floor(i / 80) * 41.9
      const [f, d] = groundPatch(x, z)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f + d).toBeLessThanOrEqual(1.0001)
      if (f > 0.5) flower++
      if (d > 0.5) dark++
      types.add(flowerType(x, z))
    }
    expect(flower / n).toBeGreaterThan(0.03)
    expect(flower / n).toBeLessThan(0.35)
    expect(dark / n).toBeGreaterThan(0.03)
    expect(dark / n).toBeLessThan(0.35)
    expect([...types].sort()).toEqual([0, 1, 2])
  })
})
