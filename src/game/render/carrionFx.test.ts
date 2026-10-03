import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CARRION_MAX_CARCASSES, CarrionFx } from './carrionFx'

describe('render--010 carrion effect', () => {
  it('FOOD-05: carrion particles are capped, range-limited, absent on low and hidden without carcasses', () => {
    const fx = new CarrionFx()
    const spots = Array.from({ length: 12 }, (_, i) => ({ x: i * 2, y: 0, z: 0, id: i + 1 }))
    fx.update(1, spots, 0, 0, 'medium')
    expect(fx.active).toBeLessThanOrEqual(CARRION_MAX_CARCASSES * 11)
    expect(fx.group.children.every((c) => (c as THREE.Points).visible)).toBe(true)
    fx.update(1, spots, 0, 0, 'low')
    expect(fx.active).toBe(0)
    expect(fx.group.children.some((c) => (c as THREE.Points).visible)).toBe(false)
    fx.update(1, [{ x: 500, y: 0, z: 500, id: 99 }], 0, 0, 'high') // far away
    expect(fx.active).toBe(0)
  })
})

describe('render--010 spoiled food over stockpile yards', () => {
  it('FOOD-05: only food at or below the spoiled share counts, and only in inventories that hold some', async () => {
    const { hasSpoiledFood } = await import('./stockpiles')
    expect(hasSpoiledFood(undefined)).toBe(false)
    expect(hasSpoiledFood({ items: [{ id: 'bread', qty: 3, fresh: 90 }] })).toBe(false)
    expect(hasSpoiledFood({ items: [{ id: 'bread', qty: 3, fresh: 90 }, { id: 'raw_meat', qty: 1, fresh: 1 }] })).toBe(true)
    expect(hasSpoiledFood({ items: [{ id: 'stone', qty: 3 }] })).toBe(false)
  })
})
