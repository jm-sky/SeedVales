import { describe, expect, it } from 'vitest'
import { placeLabel } from './labelPlacement'

describe('MAP-01: map labels stay inside the canvas (review 016 #14)', () => {
  it('flips a label near the right edge to the left of its marker and clamps it inside', () => {
    const size = 512
    const near = placeLabel(500, 100, 60, size)
    expect(near.x + 60).toBeLessThanOrEqual(size)
    expect(near.x).toBeLessThan(500)
    const left = placeLabel(1, 100, 60, size)
    expect(left.x).toBeGreaterThanOrEqual(0)
    const top = placeLabel(200, 3, 40, size)
    expect(top.y).toBeGreaterThanOrEqual(12)
    const bottom = placeLabel(200, 530, 40, size)
    expect(bottom.y).toBeLessThanOrEqual(size)
  })

  it('MAP-01: a label with room stays right of the marker', () => {
    const p = placeLabel(100, 100, 50, 512)
    expect(p.x).toBe(106)
  })
})
