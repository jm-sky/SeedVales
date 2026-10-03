/**
 * Regression tests for app review 016, batch U (UI/economy findings #3, #7, #8, #10, #11, #15).
 */
import { describe, expect, it } from 'vitest'
import { itemDef } from '../data/items'
import { recipeById } from '../data/recipes'
import { findTargets, startSleep, transferToStorage, warehouseTakeCost } from './interact'
import { addItem, groupIdentical, newStack } from './inventory'
import { orderLabour, orderPrice, orderResaleFloor } from './orders'
import { run, testSim } from './testWorld'
import { hourOf, isNight } from './time'

describe('review 016 #3: warehouse quantity and cost visibility', () => {
  it('ECON-04: taking one piece moves one piece and costs only that piece; the toast states the cost', () => {
    const sim = testSim()
    const wh = sim.building(sim.state.settlements[sim.world.homeSettlement]!.warehouseId)!
    const rep = sim.state.settlements[wh.settlementId]!.rep
    rep.helpfulness = 50
    wh.inv!.items = []
    addItem(wh.inv!, newStack('iron_ore', 6))
    const before = sim.player.inv.items.find((s) => s.id === 'iron_ore')?.qty ?? 0
    const cost = warehouseTakeCost(sim, wh, wh.inv!.items[0]!, 1)!
    expect(cost.helpfulness).toBeGreaterThan(0)
    const h0 = rep.helpfulness
    const msg = transferToStorage(sim, wh, 0, false, 1)
    expect(sim.player.inv.items.find((s) => s.id === 'iron_ore')!.qty).toBe(before + 1)
    expect(wh.inv!.items[0]!.qty).toBe(5)
    expect(h0 - rep.helpfulness).toBeCloseTo(cost.helpfulness, 5)
    expect(msg).toContain('Helpfulness')
    expect(warehouseTakeCost(sim, wh, wh.inv!.items[0]!, 5)!.helpfulness).toBeCloseTo(cost.helpfulness * 5, 5)
  })
})

describe('review 016 #7: smith order price vs trader price (kept: M-09 floor wins)', () => {
  it('CRAFT-02: a cheap item (knife) is priced by inputs + labour, not by the low trader price; the order never undercuts the replacement value', () => {
    const r = recipeById('knife')!
    const replacement = r.inputs.reduce((n, i) => n + itemDef(i.item).price * i.qty, 0) + orderLabour('knife')
    // The trader's price for the knife (base price) is far below the cost of its inputs: M-09 and a trader-price cap conflict here.
    expect(itemDef('knife').price).toBeLessThan(replacement)
    expect(orderPrice('knife')).toBe(Math.max(orderResaleFloor('knife'), replacement))
    expect(orderPrice('knife')).toBeGreaterThanOrEqual(replacement)
  })
})

describe('review 016 #11: targets only in the facing cone', () => {
  it('UI-04: a tree behind the player is not offered, the same tree in front is', () => {
    const sim = testSim()
    const p = sim.player
    const tree = sim.nodes.query(p.x, p.z, 400).find((n) => n.kind !== 'herb' && n.kind !== 'reed' && n.radius > 0 && sim.state.nodes[n.id]?.kind !== 'felled')
    expect(tree).toBeTruthy()
    p.x = tree!.x
    p.z = tree!.z - 2.5 - tree!.radius
    const toTree = 0 // tree is at +z of the player
    const front = findTargets(sim, toTree).filter((t) => t.ref.type === 'node' && t.ref.id === tree!.id)
    const behind = findTargets(sim, Math.PI).filter((t) => t.ref.type === 'node' && t.ref.id === tree!.id)
    expect(front.length).toBe(1)
    expect(behind.length).toBe(0)
  })
})

describe('review 016 #15: identical stacks merge in lists', () => {
  it('UI-04: two one-piece flint stacks of the same look become one row with a count; different durability stays apart', () => {
    const a = newStack('flint')
    const b = newStack('flint')
    const c = newStack('flint', 1, { dur: 3 })
    const g = groupIdentical([a, b, c], (s) => s)
    expect(g.length).toBe(2)
    expect(g[0]!.qty).toBe(2)
    expect(g[1]!.qty).toBe(1)
  })
})

describe('review 016 #8: sleep wakes in the morning, never in the dark', () => {
  function sleepFrom(hour: number, vigor: number) {
    const sim = testSim()
    const day = Math.floor(sim.state.time.cal / 86400) + 1
    sim.state.time.cal = day * 86400 + hour * 3600
    sim.player.vitals.vigor = vigor
    startSleep(sim, 0.85)
    for (let i = 0; i < 4000 && sim.state.px.activity?.kind === 'sleep'; i++) run(sim, 1, 0.1)
    return sim
  }

  it('NEEDS-01: a full-vigor sleeper at 21:00 sleeps on until about 06:00-07:00', () => {
    const sim = sleepFrom(21, 99)
    expect(sim.state.px.activity).toBeUndefined()
    const h = hourOf(sim.state.time.cal)
    expect(h).toBeGreaterThanOrEqual(6)
    expect(h).toBeLessThanOrEqual(7.2)
  })

  it('NEEDS-01: sleeping from 22:30 with low vigor also ends at the next morning, in daylight', () => {
    const sim = sleepFrom(22.5, 40)
    const h = hourOf(sim.state.time.cal)
    expect(h).toBeGreaterThanOrEqual(6)
    expect(h).toBeLessThanOrEqual(7.2)
    expect(isNight(sim.state.time.cal)).toBe(false)
  })
})
