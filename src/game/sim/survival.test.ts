/**
 * Survival follow-up (plan survival--001): waterskin recipes, campfire fuel, stone hearth, standing torch.
 */
import { describe, expect, it } from 'vitest'
import { itemDef } from '../data/items'
import { recipeById } from '../data/recipes'
import { completeCraft } from './craft'
import { addItem, countItem, newStack } from './inventory'
import { testSim } from './testWorld'

describe('survival: waterskins (CRAFT-03)', () => {
  it('CRAFT-03: S/M/L waterskins are sewn from hide (and rope) with a sewing kit', () => {
    const cases: [string, Record<string, number>, number][] = [
      ['waterskin_s', { hide: 1 }, 2],
      ['waterskin_m', { hide: 1, rope: 1 }, 4],
      ['waterskin_l', { hide: 2, rope: 1 }, 7],
    ]
    for (const [id, inputs, capacity] of cases) {
      const sim = testSim()
      const p = sim.player
      const r = recipeById(id)!
      expect(r.tool).toBe('sew')
      expect(r.skill).toBe('survival')
      expect(Object.fromEntries(r.inputs.map((i) => [i.item, i.qty]))).toEqual(inputs)
      expect(completeCraft(sim, p, r).ok).toBe(false) // nothing in the pack yet
      addItem(p.inv, newStack('sewing_kit', 1))
      for (const [item, qty] of Object.entries(inputs)) addItem(p.inv, newStack(item, qty))
      const before = countItem(p.inv, id)
      expect(completeCraft(sim, p, r).ok).toBe(true)
      expect(countItem(p.inv, id)).toBe(before + 1)
      expect(itemDef(id).waterCapacity).toBe(capacity)
      for (const item of Object.keys(inputs)) expect(countItem(p.inv, item)).toBe(0)
    }
  })

  it('CRAFT-03: crafting a waterskin never creates value (no circular trade profit, D-ECON-5)', () => {
    for (const id of ['waterskin_s', 'waterskin_m', 'waterskin_l']) {
      const r = recipeById(id)!
      const inputs = r.inputs.reduce((s, i) => s + itemDef(i.item).price * i.qty, 0)
      expect(itemDef(id).price * r.output.qty).toBeLessThanOrEqual(inputs)
    }
  })
})
