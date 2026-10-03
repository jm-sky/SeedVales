import { describe, expect, it } from 'vitest'
import { FOOD } from '../config/calibration'
import { corpsePhase } from './corpses'

const H = 3600

describe('render--010 carrion phase', () => {
  it('FOOD-05: corpse phases follow the age boundaries (fresh → carrion → bones)', () => {
    const c = { diedAt: 1000 }
    expect(corpsePhase(c, 1000)).toBe('fresh')
    expect(corpsePhase(c, 1000 + (FOOD.corpseRotH - 0.01) * H)).toBe('fresh')
    expect(corpsePhase(c, 1000 + FOOD.corpseRotH * H)).toBe('carrion')
    expect(corpsePhase(c, 1000 + (FOOD.corpseCarrionEndH - 0.01) * H)).toBe('carrion')
    expect(corpsePhase(c, 1000 + FOOD.corpseCarrionEndH * H)).toBe('bones')
    expect(FOOD.corpseCarrionEndH).toBeLessThan(FOOD.corpseBonesAfterH)
  })
})
