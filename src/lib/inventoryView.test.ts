import { describe, expect, it } from 'vitest'
import { itemDef } from '@/game/data/items'
import { newStack, qualityMult } from '@/game/sim/inventory'
import { itemParams, viewItems } from './inventoryView'

describe('inventory view (UI-03)', () => {
  const items = [newStack('log', 2), newStack('axe'), newStack('bread', 1, { fresh: 5 }), newStack('apple', 3), newStack('knife', 1, { q: 3 }), newStack('sword', 1, { q: 0 })]

  it('UI-03: filters by category', () => {
    const weapons = viewItems(items, 'weapon', 'name')
    expect(weapons.length).toBeGreaterThan(0)
    expect(weapons.every((s) => itemDef(s.id).category === 'weapon')).toBe(true)
    expect(viewItems(items, 'food', 'name').map((s) => s.id).sort()).toEqual(['apple', 'bread'])
    expect(viewItems(items, 'all', 'name').length).toBe(items.length)
  })

  it('UI-03: sorts by weight, value, quality and freshness', () => {
    expect(viewItems(items, 'all', 'weight')[0]!.id).toBe('log')
    const q = viewItems(items, 'all', 'quality').filter((s) => s.q !== undefined)
    expect(q[0]!.id).toBe('knife')
    expect(viewItems(items, 'food', 'freshness')[0]!.id).toBe('bread') // spoils first
    const v = viewItems(items, 'all', 'value').map((s) => itemDef(s.id).price * s.qty * qualityMult(s))
    for (let i = 1; i < v.length; i++) expect(v[i - 1]!).toBeGreaterThanOrEqual(v[i]!)
  })

  it('UI-03: item parameters include damage for weapons and freshness for food', () => {
    const sword = itemParams(newStack('sword'))
    expect(sword.some((p) => p.label === 'Damage')).toBe(true)
    const bread = itemParams(newStack('bread'))
    expect(bread.some((p) => p.label === 'Freshness')).toBe(true)
  })
})
