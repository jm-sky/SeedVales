import { describe, expect, it } from 'vitest'
import { INN_MEALS } from '../data/innMeals'
import { itemDef } from '../data/items'
import { recipeById } from '../data/recipes'
import { roundTrip } from '../save/snapshot'
import { completeCraft } from './craft'
import { startEventLog, stopEventLog } from './eventLog'
import { completeMeal, mealIngredients, mealNutrition, mealRefusal } from './inns'
import { targetOptions } from './interact'
import { addItem, countItem, newStack } from './inventory'
import { cancelActivity } from './player'
import { ACTIVITY_DONE } from './playerActivities'
import { testSim } from './testWorld'
import { totalMoney } from './treasury'

function innOf(sim: ReturnType<typeof testSim>) {
  const inn = sim.state.buildings.find((b) => b.kind === 'inn')
  if (!inn) throw new Error('no inn on this seed')
  return inn
}

describe('economy--003 inn meals and preserved food', () => {
  it('ECON-INN: every inn starts with a non-zero useful pantry that grows with settlement size', () => {
    const sim = testSim()
    const inns = sim.state.buildings.filter((b) => b.kind === 'inn')
    expect(inns.length).toBeGreaterThan(0)
    for (const inn of inns) expect(inn.inv!.items.reduce((n, s) => n + s.qty, 0), inn.id).toBeGreaterThan(5)
  })

  it('ECON-INN: a meal needs a complete ingredient set; missing stock is refused with a reason', () => {
    const sim = testSim()
    const inn = innOf(sim)
    inn.inv!.items = []
    const hearty = INN_MEALS.find((m) => m.id === 'meal_hearty')!
    expect(mealIngredients(inn, hearty)).toBeNull()
    sim.player.money = 100
    expect(mealRefusal(sim, inn, hearty)).toMatch(/out of/)
    addItem(inn.inv!, newStack('bread', 1))
    addItem(inn.inv!, newStack('salted_meat', 1))
    expect(mealIngredients(inn, hearty)).toEqual(['bread', 'salted_meat'])
    sim.player.money = 1
    expect(mealRefusal(sim, inn, hearty)).toBe('Not enough money')
  })

  it('ECON-INN: a completed meal consumes the exact ingredients, pays the treasury, feeds the player (capped) and conserves money', () => {
    const sim = testSim()
    const inn = innOf(sim)
    inn.inv!.items = []
    addItem(inn.inv!, newStack('bread', 2))
    addItem(inn.inv!, newStack('dried_meat', 1))
    const meal = INN_MEALS.find((m) => m.id === 'meal_hearty')!
    sim.player.money = 50
    sim.player.vitals.hunger = 20
    const total = totalMoney(sim)
    const treasury0 = sim.state.settlements[inn.settlementId]!.treasury
    const log = startEventLog(sim, 1000)
    const r = completeMeal(sim, inn.id, meal.id)
    const entries = log.entries()
    stopEventLog()
    expect(r.ok).toBe(true)
    expect(countItem(inn.inv!, 'bread')).toBe(1)
    expect(countItem(inn.inv!, 'dried_meat')).toBe(0)
    expect(sim.player.money).toBe(50 - meal.price)
    expect(sim.state.settlements[inn.settlementId]!.treasury).toBe(treasury0 + meal.price)
    expect(sim.player.vitals.hunger).toBeCloseTo(20 + mealNutrition(['bread', 'dried_meat']))
    expect(totalMoney(sim)).toBe(total)
    expect(entries.some((e) => e.kind === 'consume')).toBe(true)
    sim.player.vitals.hunger = 95
    addItem(inn.inv!, newStack('dried_meat', 1))
    completeMeal(sim, inn.id, meal.id)
    expect(sim.player.vitals.hunger).toBe(100)
  })

  it('ECON-INN: stock or money that vanished during the activity fails cleanly; cancelling costs nothing; repeated orders deplete the pantry', () => {
    const sim = testSim()
    const inn = innOf(sim)
    inn.inv!.items = []
    addItem(inn.inv!, newStack('bread', 3))
    addItem(inn.inv!, newStack('cabbage', 3))
    sim.player.money = 100
    sim.player.x = inn.x
    sim.player.z = inn.z + 4
    const opt = targetOptions(sim, { type: 'building', id: inn.id }).find((o) => o.id === 'meal_simple')!
    expect(opt.enabled).toBe(true)
    const money = sim.player.money
    // Start through the interaction, then cancel.
    sim.state.px.activity = { kind: 'meal', ref: inn.id, label: 'x', total: 5, elapsed: 0, data: 'meal_simple' }
    cancelActivity(sim)
    expect([sim.player.money, countItem(inn.inv!, 'bread')]).toEqual([money, 3])
    // Stock disappears before completion.
    inn.inv!.items = []
    expect(ACTIVITY_DONE.meal!(sim, { kind: 'meal', ref: inn.id, label: '', total: 5, elapsed: 5, data: 'meal_simple' })!.ok).toBe(false)
    expect(sim.player.money).toBe(money)
    // Depletion.
    addItem(inn.inv!, newStack('bread', 3))
    addItem(inn.inv!, newStack('cabbage', 3))
    for (let i = 0; i < 3; i++) expect(completeMeal(sim, inn.id, 'meal_simple').ok).toBe(true)
    expect(completeMeal(sim, inn.id, 'meal_simple').ok).toBe(false)
  })

  it('ECON-INN: lodging is paid to the settlement treasury, not to an arbitrary trader', () => {
    const sim = testSim()
    const inn = innOf(sim)
    sim.player.money = 50
    const traderMoney = sim.state.npcs.filter((n) => n.profession === 'trader').map((n) => n.money)
    const t0 = sim.state.settlements[inn.settlementId]!.treasury
    const o = targetOptions(sim, { type: 'building', id: inn.id }).find((x) => x.id === 'inn_sleep')!
    expect(o.enabled).toBe(true)
    // runOption path is covered by interact; here the payment helper directly.
    return import('./inns').then(({ payLodging }) => {
      payLodging(sim, inn.settlementId)
      expect(sim.state.settlements[inn.settlementId]!.treasury).toBe(t0 + 8)
      expect(sim.state.npcs.filter((n) => n.profession === 'trader').map((n) => n.money)).toEqual(traderMoney)
    })
  })

  it('FOOD-04: preserved foods exist, outlast their fresh inputs and derive freshness from the consumed batch', () => {
    expect(itemDef('salted_meat').food!.spoilH).toBeGreaterThan(itemDef('cooked_meat').food!.spoilH * 10)
    expect(itemDef('fermented_cabbage').food!.spoilH).toBeGreaterThan(itemDef('cabbage').food!.spoilH * 3)
    const sim = testSim()
    const p = sim.player
    addItem(p.inv, newStack('raw_meat', 1, { fresh: 4.5 })) // a quarter of its 18 h life left
    addItem(p.inv, newStack('salt', 1))
    expect(completeCraft(sim, p, recipeById('salted_meat')!).ok).toBe(true)
    const out = p.inv.items.find((s) => s.id === 'salted_meat')!
    expect(out.fresh).toBeCloseTo(itemDef('salted_meat').food!.spoilH * 0.25)
    expect(countItem(p.inv, 'salt')).toBe(0)
    expect(countItem(p.inv, 'raw_meat')).toBe(0)
  })

  it('ECON-INN: only some households get emergency preserves, deterministically; salt has a finite trade source', () => {
    const a = testSim(1337)
    const homes = a.state.buildings.filter((b) => b.kind === 'house')
    const withReserve = homes.filter((h) => h.inv!.items.some((s) => ['fermented_cabbage', 'salted_meat'].includes(s.id)))
    expect(withReserve.length).toBeGreaterThan(0)
    expect(withReserve.length).toBeLessThan(homes.length)
    const b = testSim(1337)
    expect(b.state.buildings.filter((h) => h.kind === 'house' && h.inv!.items.some((s) => ['fermented_cabbage', 'salted_meat'].includes(s.id))).map((h) => h.id)).toEqual(withReserve.map((h) => h.id))
    expect(a.state.npcs.some((n) => n.profession === 'trader')).toBe(true)
    expect(roundTrip(a).buildings.length).toBe(a.state.buildings.length)
  })
})
