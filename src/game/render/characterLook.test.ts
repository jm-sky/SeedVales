/** CHAR-01: deterministic per-id looks, spread across ids, within the calibrated scale bounds. */
import { describe, expect, it } from 'vitest'
import { CHARACTER_LOOK as L } from '../config/calibration'
import { characterLook } from './characterLook'

describe('render: character looks (CHAR-01)', () => {
  it('same id → same look', () => {
    expect(characterLook(42, 'adult')).toEqual(characterLook(42, 'adult'))
  })
  it('ids spread over hair and cloth variants; scale stays in bounds', () => {
    const hair = new Set<number>()
    const cloth = new Set<number>()
    for (let id = 1; id <= 60; id++) {
      const l = characterLook(id, 'adult')
      hair.add(l.hair)
      cloth.add(l.cloth)
      expect(Math.abs(l.scale[0] - 1)).toBeLessThanOrEqual(L.scaleXZ + 1e-9)
      expect(Math.abs(l.scale[1] - 1)).toBeLessThanOrEqual(L.scaleY + 1e-9)
    }
    expect(hair.size).toBeGreaterThanOrEqual(4)
    expect(cloth.size).toBe(L.cloth.length)
  })
  it('elders are mostly grey', () => {
    let grey = 0
    for (let id = 1; id <= 100; id++) if (characterLook(id, 'elder').hair === L.hair.length - 1) grey++
    expect(grey).toBeGreaterThan(55)
  })
})
