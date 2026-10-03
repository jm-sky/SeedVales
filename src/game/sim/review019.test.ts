/**
 * Regression tests for code review 019 (round 3): jump wall climbing, shield with two-handed weapons, findFood,
 * parry window, KO in mid-air, inn spoiled stock, stale sharpen index, dodge in the air.
 */
import { describe, expect, it } from 'vitest'
import { JUMP } from '../config/calibration'
import { INN_MEALS } from '../data/innMeals'
import { requestDodge } from './dodge'
import { defenceOf, guardOf, resolveDefence, setGuard } from './guard'
import { completeMeal, mealIngredients } from './inns'
import { addItem, findFood, newStack } from './inventory'
import { motionOf, repairPlacement, requestJump, stableSupport } from './motion'
import { makeAnimal } from './newGame'
import { playerInput } from './player'
import { ACTIVITY_DONE } from './playerActivities'
import { openSpot, testSim } from './testWorld'

function ready() {
  const sim = testSim()
  const sp = openSpot(sim)
  repairPlacement(sim, sp.x, sp.z)
  sim.player.vitals.stamina = 100
  Object.assign(playerInput, { mx: 0, mz: 0, run: false, facing: undefined, guard: false })
  return sim
}

describe('review 019', () => {
  it('MOVE-01 #1: a thin steep wall is not a stable landing (no averaging away), a flat or gentle spot is', () => {
    const fake = (h: (x: number, z: number) => number) => ({ terrain: { heightAt: h } }) as never
    const wall = fake((_x, z) => (z > 0 ? 2.4 : 0))
    expect(stableSupport(wall, 0, 0.1)).toBe(false)
    expect(stableSupport(wall, 0, 5)).toBe(true)
    expect(stableSupport(wall, 0, -5)).toBe(true)
    expect(stableSupport(fake((_x, z) => z * 0.8), 0, 3)).toBe(true) // a 0.8 slope is walkable
  })

  it('MOVE-01 #1: jump spam against a steep terrace edge gains no more than one lip', () => {
    const sim = ready()
    const p = sim.player
    const t = sim.terrain
    const y0 = t.heightAt(p.x, p.z)
    // A 2.4 m raised plateau starting 1 m ahead (+z): an almost vertical edge.
    t.applyEdit(p.x, p.z + 6, 5, { kind: 'level', target: y0 + 2.4 })
    sim.markTerrain?.(p.x, p.z, 8)
    for (let i = 0; i < 400; i++) {
      Object.assign(playerInput, { mx: 0, mz: 1, run: true })
      if (i % 30 === 0) {
        p.vitals.stamina = 100
        requestJump(sim)
      }
      sim.step(0.02)
    }
    Object.assign(playerInput, { mx: 0, mz: 0, run: false })
    expect(p.y - y0).toBeLessThan(JUMP.vy ** 2 / (2 * JUMP.gravity) + 1.0)
  })

  it('COMBAT-02 #2: a shield is ignored with a two-handed weapon or a bow', () => {
    const sim = ready()
    const p = sim.player
    p.eq.off = { id: 'wooden_shield', qty: 1, dur: 160 }
    p.eq.main = { id: 'long_sword', qty: 1, dur: 200 }
    expect(defenceOf(p)!.source).toBe('weapon')
    p.eq.main = { id: 'short_bow', qty: 1, dur: 100 }
    expect(defenceOf(p)).toBeNull()
    p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    expect(defenceOf(p)!.source).toBe('shield')
  })

  it('FOOD-04 #3: findFood picks fermented cabbage when it is the only food', () => {
    const inv = { items: [newStack('fermented_cabbage', 2)] }
    expect(findFood(inv)?.id).toBe('fermented_cabbage')
  })

  it('COMBAT-02 #4: a suppressed guard that resumes does not open a new parry window; a real release + press does', () => {
    const sim = ready()
    const p = sim.player
    p.combat = true
    p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    p.rot = 0
    const wolf = makeAnimal(sim.nextId(), 'wolf', 'adult', p.x, p.z + 1.2, p.y, sim.rng)
    sim.addAnimal(wolf)
    sim.state.time.play += 50
    setGuard(sim, true) // pressed now
    sim.state.time.play += 5 // window long gone
    setGuard(sim, false, true) // suppressed (dodge/panel/activity) while the button stays down
    setGuard(sim, true, true) // resumes
    expect(resolveDefence(sim, p, wolf, 10).kind).toBe('block')
    setGuard(sim, false, false) // released
    setGuard(sim, true, true) // pressed again
    expect(resolveDefence(sim, p, wolf, 10).kind).toBe('parry')
    expect(guardOf(sim).raw).toBe(true)
  })

  it('MOVE-01 #5: a knock-out in mid-jump ends the arc (no hovering, no resumed arc)', () => {
    const sim = ready()
    const p = sim.player
    const ground = p.y
    requestJump(sim)
    sim.step(0.1)
    expect(motionOf(sim).grounded).toBe(false)
    p.vitals.ko = { until: sim.state.time.play + 5, protectUntil: sim.state.time.play + 100 }
    sim.step(0.05)
    expect(motionOf(sim).grounded).toBe(true)
    expect(p.y).toBeCloseTo(ground, 3)
  })

  it('ECON-INN #7: spoiled stock is never served; preserved alternatives keep meals available when bread is gone', () => {
    const sim = ready()
    const inn = sim.state.buildings.find((b) => b.kind === 'inn')!
    inn.inv!.items = []
    addItem(inn.inv!, newStack('bread', 5, { fresh: 1 })) // spoiled
    addItem(inn.inv!, newStack('cabbage', 3))
    const simple = INN_MEALS.find((m) => m.id === 'meal_simple')!
    expect(mealIngredients(inn, simple)).toBeNull()
    addItem(inn.inv!, newStack('salted_meat', 1))
    expect(mealIngredients(inn, simple)).toEqual(['salted_meat', 'cabbage'])
    sim.player.money = 50
    expect(completeMeal(sim, inn.id, 'meal_simple').ok).toBe(true)
    expect(inn.inv!.items.some((s) => s.id === 'bread' && s.qty === 5)).toBe(true) // the spoiled bread was not used
  })

  it('COMBAT-05 #10: sharpening finds the intended blade after the pack changed', () => {
    const sim = ready()
    const p = sim.player
    addItem(p.inv, newStack('whetstone'))
    addItem(p.inv, { id: 'sword', qty: 1, dur: 200, edge: 0.1 })
    const idx = p.inv.items.findIndex((s) => s.id === 'sword')
    p.inv.items.unshift(newStack('torch', 1)) // the pack shifted: the index now points at something else
    const r = ACTIVITY_DONE.sharpen!(sim, { kind: 'sharpen', label: '', total: 6, elapsed: 6, data: `inv:${idx}:sword` })!
    expect(r.ok).toBe(true)
    expect(p.inv.items.find((s) => s.id === 'sword')!.edge).toBeGreaterThan(0.1)
  })

  it('COMBAT-03 open question: no dodge while airborne', () => {
    const sim = ready()
    sim.player.combat = true
    sim.state.time.play += 50
    requestJump(sim)
    sim.step(0.1)
    expect(requestDodge(sim, 1, 0)).toBe('You are in the air.')
  })
})
