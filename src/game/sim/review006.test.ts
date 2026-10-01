/**
 * Regression tests for review 006 (wave 3: economy--001, npc--001) — one test per fixed finding.
 */
import { describe, expect, it } from 'vitest'
import type { Sim } from './sim'
import type { Human } from './types'
import { COMPANION } from '../config/calibration'
import { itemDef } from '../data/items'
import { perf } from '../diag/perf'
import { migrate } from '../save/migrate'
import { roundTrip } from '../save/snapshot'
import { pushFromPack, unloadToBuilding } from './cart'
import { cookedFreshness } from './cooking'
import { transferToStorage } from './interact'
import { addItem, countItem, findFood, newStack } from './inventory'
import { switchWeapon } from './loadout'
import { updateNpc } from './npc/ai'
import { companionsOf, hireCompanion } from './npc/companions'
import { doorOf, houseOf } from './npc/queries'
import { playerInput } from './player'
import { run, testSim } from './testWorld'
import { buyFromNpc, buyPrice, sellPrice, sellToNpc, tradeStock } from './trade'
import { SAVE_VERSION } from './types'

function npcWhere(sim: Sim, pred: (n: Human) => boolean): Human {
  const n = sim.state.npcs.find((x) => !x.vitals.dead && pred(x))
  if (!n) throw new Error('npc not found')
  return n
}

function place(sim: Sim, a: { x: number; y: number; z: number }, x: number, z: number) {
  a.x = x
  a.z = z
  a.y = sim.terrain.heightAt(x, z)
}

/** Dry, open land `dist` metres from (x, z), away from water. */
function landAt(sim: Sim, x: number, z: number, dist: number): { x: number; z: number } {
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2
    const px = x + Math.sin(a) * dist
    const pz = z + Math.cos(a) * dist
    if (sim.terrain.waterDepthAt(px, pz) > 0 || sim.terrain.heightAt(px, pz) < 2) continue
    if (sim.buildingsNear(px, pz, 6).some((b) => Math.hypot(b.x - px, b.z - pz) < Math.max(b.hw, b.hd) + 1.5)) continue
    return { x: px, z: pz }
  }
  throw new Error('no land found')
}

/** Hires the son of the home settlement next to the player near his house. */
function hireSon(sim: Sim): Human {
  const son = npcWhere(sim, (n) => n.kin === 'son' && n.settlementId === sim.world.homeSettlement)
  const door = doorOf(houseOf(sim, son)!)
  const p = landAt(sim, door.x, door.z, 8)
  place(sim, sim.player, p.x, p.z)
  place(sim, son, p.x + 2, p.z)
  sim.actors.update(sim.player)
  sim.actors.update(son)
  son.big5.n = 0.3
  son.vitals.hunger = son.vitals.thirst = son.vitals.vigor = 95
  sim.player.money = 500
  expect(hireCompanion(sim, son, 'escort', 'low', 3).ok).toBe(true)
  return son
}

/** Moves the player (and the companion beside them) `dist` metres from the companion's home. */
function travelAway(sim: Sim, n: Human, dist: number) {
  const door = doorOf(houseOf(sim, n)!)
  const p = landAt(sim, door.x, door.z, dist)
  place(sim, sim.player, p.x, p.z)
  place(sim, n, p.x + 1.5, p.z)
  sim.actors.update(sim.player)
  sim.actors.update(n)
}

describe('review 006: companions (COMP-01, PERF-01)', () => {
  it('COMP-01: hiring packs provisions from the household store (store → pack, conserved)', () => {
    const sim = testSim()
    const son = npcWhere(sim, (n) => n.kin === 'son' && n.settlementId === sim.world.homeSettlement)
    const store = houseOf(sim, son)!.inv!
    son.inv.items = son.inv.items.filter((s) => !itemDef(s.id).food)
    const foodOf = (inv: { items: { id: string; qty: number }[] }) => inv.items.filter((s) => itemDef(s.id).food).reduce((a, s) => a + s.qty, 0)
    const before = foodOf(store) + foodOf(son.inv)
    expect(foodOf(store)).toBeGreaterThan(0)
    hireSon(sim)
    expect(findFood(son.inv)).toBeTruthy()
    expect(foodOf(store) + foodOf(son.inv)).toBe(before)
  })

  it('COMP-01: a hungry companion far from home eats from its pack and keeps following (no eat/follow flapping)', () => {
    const sim = testSim()
    const son = hireSon(sim)
    travelAway(sim, son, 480)
    son.vitals.hunger = 30
    const goals: string[] = []
    let maxD = 0
    for (let t = 0; t < 60; t += 0.5) {
      run(sim, 0.5)
      goals.push(son.ai.goal ?? '-')
      maxD = Math.max(maxD, Math.hypot(son.x - sim.player.x, son.z - sim.player.z))
    }
    expect(son.vitals.hunger).toBeGreaterThan(30)
    expect(maxD).toBeLessThan(COMPANION.catchUpM)
  })

  it('COMP-01: a starving companion with nothing to eat away from home stays with the player', () => {
    const sim = testSim()
    const son = hireSon(sim)
    son.inv.items = son.inv.items.filter((s) => !itemDef(s.id).food)
    travelAway(sim, son, 480)
    son.vitals.hunger = 10
    let maxD = 0
    let switches = 0
    let last = son.ai.goal
    for (let t = 0; t < 60; t += 0.5) {
      run(sim, 0.5)
      if (son.ai.goal !== last) switches++
      last = son.ai.goal
      maxD = Math.max(maxD, Math.hypot(son.x - sim.player.x, son.z - sim.player.z))
    }
    expect(maxD).toBeLessThan(COMPANION.catchUpM)
    expect(switches).toBeLessThan(12)
  })

  it('COMP-01 / PERF-01: a following companion plans at the decision cadence, not on every tick', () => {
    const sim = testSim()
    const son = hireSon(sim)
    perf.reset()
    const dt = 0.1
    for (let i = 0; i < 200; i++) {
      sim.state.time.play += dt
      place(sim, sim.player, sim.player.x + 1.5 * dt, sim.player.z)
      sim.actors.update(sim.player)
      updateNpc(sim, son, dt, true)
    }
    // 20 s of following: at most ~1 plan per second.
    expect(perf.report().counters['ai.plans'] ?? 0).toBeLessThanOrEqual(22)
    expect(Math.hypot(son.x - sim.player.x, son.z - sim.player.z)).toBeLessThan(COMPANION.catchUpM)
  })

  it('PERF-01: the companion list is cached, not rebuilt from all NPCs on every call', () => {
    const sim = testSim()
    const son = hireSon(sim)
    expect(companionsOf(sim)).toEqual([son])
    expect(companionsOf(sim)).toBe(companionsOf(sim))
  })

  it('COMP-01: a companion that cannot reach the player gives up for a while and says so', () => {
    const sim = testSim()
    const son = hireSon(sim)
    son.ai.goal = 'follow'
    son.ai.steps = [{ op: 'work', act: 'follow', dur: 1e9, label: 'Following you' }]
    son.ai.stepIdx = 0
    son.ai.stuckT = 99
    // Player stands across deep water: steering gets stuck.
    const p = sim.player
    let found = false
    for (let i = 0; i < 4000 && !found; i++) {
      const x = 200 + ((i * 37) % 7800)
      const z = 200 + ((i * 53) % 7800)
      if (sim.terrain.waterDepthAt(x, z) < 1.5) continue
      place(sim, son, x, z)
      found = true
    }
    expect(found).toBe(true)
    place(sim, p, son.x + 60, son.z)
    sim.actors.update(son)
    sim.actors.update(p)
    for (let i = 0; i < 30; i++) {
      sim.state.time.play += 0.1
      son.ai.stuckT = 99
      updateNpc(sim, son, 0.1, true)
    }
    expect(son.ai.cooldowns.follow ?? 0).toBeGreaterThan(sim.state.time.play)
    expect(sim.state.messages.some((m) => /can't follow you/.test(m.text))).toBe(true)
  })
})

describe('review 006: trade exploits (TRADE-02)', () => {
  it('TRADE-02: selling and buying back the same item does not farm opinion', () => {
    const sim = testSim()
    const n = npcWhere(sim, (x) => x.profession === 'woodcutter')
    n.opinion = 0
    n.money = 1000
    sim.player.money = 1000
    const m0 = sim.player.money
    addItem(sim.player.inv, newStack('branch'))
    for (let i = 0; i < 60; i++) {
      sellToNpc(sim, n, sim.player.inv.items.find((s) => s.id === 'branch')!)
      const e = tradeStock(sim, n).find((x) => x.stack.id === 'branch')
      if (e) buyFromNpc(sim, n, e.stack, 1)
    }
    expect(sim.player.money).toBeLessThanOrEqual(m0)
    expect(n.opinion).toBeLessThan(8)
  })

  it('TRADE-02: the sell price never reaches the buy price of the same item (no arbitrage)', () => {
    const sim = testSim()
    const n = npcWhere(sim, (x) => x.profession === 'farmer')
    n.opinion = 100
    n.big5.a = 0.9
    n.money = 5000
    sim.player.skills.trade = 60
    sim.player.money = 5000
    const store = houseOf(sim, n)!.inv!
    addItem(store, newStack('leather_boots', 12))
    const before = sim.player.money
    for (let i = 0; i < 20; i++) {
      const e = tradeStock(sim, n).find((x) => x.stack.id === 'leather_boots')!
      const s = e.stack
      expect(sellPrice(sim, n, s)).toBeLessThan(buyPrice(sim, n, s))
      buyFromNpc(sim, n, s, 1)
      sellToNpc(sim, n, sim.player.inv.items.find((x) => x.id === 'leather_boots')!, 1)
    }
    expect(sim.player.money).toBeLessThanOrEqual(before)
  })

  it('TRADE-02: an NPC far from home trades only from and into its own pack', () => {
    const sim = testSim()
    const son = hireSon(sim)
    const store = houseOf(sim, son)!.inv!
    travelAway(sim, son, 600)
    const stock = tradeStock(sim, son)
    expect(stock.every((e) => son.inv.items.includes(e.stack))).toBe(true)
    son.money = 100
    addItem(sim.player.inv, newStack('log', 1))
    const logs = countItem(store, 'log')
    sellToNpc(sim, son, sim.player.inv.items.find((s) => s.id === 'log')!)
    expect(countItem(store, 'log')).toBe(logs)
    expect(countItem(son.inv, 'log')).toBeGreaterThan(0)
  })
})

describe('review 006: carts, warehouse, food (TRANS-01, FOOD-03)', () => {
  function warehouse(sim: Sim) {
    const st = sim.state.settlements[sim.world.homeSettlement]!
    return sim.building(st.warehouseId)!
  }

  it('TRANS-01: unloading into the warehouse and taking it back never raises helpfulness', () => {
    const sim = testSim()
    const wh = warehouse(sim)
    const rep = sim.state.settlements[wh.settlementId]!.rep
    rep.helpfulness = 10
    addItem(sim.player.inv, newStack('handcart'))
    place(sim, sim.player, wh.x + 6, wh.z)
    pushFromPack(sim, sim.player, sim.player.inv.items.find((s) => s.id === 'handcart')!)
    const cart = sim.state.px.cart!
    for (let i = 0; i < 10; i++) {
      addItem(cart.inv, newStack('iron_ore', 5))
      unloadToBuilding(sim, cart, wh)
      const idx = wh.inv!.items.findIndex((s) => s.id === 'iron_ore')
      transferToStorage(sim, wh, idx, false)
      sim.player.inv.items = sim.player.inv.items.filter((s) => s.id !== 'iron_ore')
    }
    expect(rep.helpfulness).toBeLessThanOrEqual(10)
  })

  it('TRANS-01: depositing a stack and taking it back never raises helpfulness', () => {
    const sim = testSim()
    const wh = warehouse(sim)
    const rep = sim.state.settlements[wh.settlementId]!.rep
    rep.helpfulness = 20
    for (let i = 0; i < 10; i++) {
      addItem(sim.player.inv, newStack('iron_ore', 3))
      transferToStorage(sim, wh, sim.player.inv.items.findIndex((s) => s.id === 'iron_ore'), true)
      transferToStorage(sim, wh, wh.inv!.items.findIndex((s) => s.id === 'iron_ore'), false)
      sim.player.inv.items = sim.player.inv.items.filter((s) => s.id !== 'iron_ore')
    }
    expect(rep.helpfulness).toBeLessThanOrEqual(20)
  })

  it('TRANS-01: no weapon switch or bow shot while both hands push a cart', () => {
    const sim = testSim()
    const p = sim.player
    addItem(p.inv, newStack('short_bow'))
    addItem(p.inv, newStack('arrow', 10))
    addItem(p.inv, newStack('wheelbarrow'))
    p.eq.main = undefined
    pushFromPack(sim, p, p.inv.items.find((s) => s.id === 'wheelbarrow')!)
    expect(sim.state.px.cart).toBeTruthy()
    switchWeapon(sim, 'ranged')
    expect(p.eq.main).toBeUndefined()
    // Even with a bow somehow in hand, drawing does nothing while pushing.
    p.eq.main = p.inv.items.find((s) => s.id === 'short_bow')!
    p.inv.items = p.inv.items.filter((s) => s !== p.eq.main)
    playerInput.drawing = true
    try {
      run(sim, 2)
    } finally {
      playerInput.drawing = false
    }
    expect(sim.state.px.bowDraw).toBe(0)
  })

  it('FOOD-03: roasting spoiled raw meat gives spoiled cooked meat; fresher meat keeps the 20% floor', () => {
    const rawLife = itemDef('raw_meat').food!.spoilH
    const cookedLife = itemDef('cooked_meat').food!.spoilH
    const spoiled = cookedFreshness(newStack('raw_meat', 1, { fresh: rawLife * 0.02 }))
    expect(spoiled).toBeLessThan(cookedLife * 0.15)
    const ok = cookedFreshness(newStack('raw_meat', 1, { fresh: rawLife * 0.16 }))
    expect(ok).toBeCloseTo(cookedLife * 0.2)
  })
})

describe('review 006: saves (SAVE-01)', () => {
  it('SAVE-01: v5 → v6 migration backfills an empty cart list', () => {
    const sim = testSim()
    const st = roundTrip(sim) as unknown as Record<string, unknown> & { saveVersion: number }
    st.saveVersion = 5
    delete st.carts
    const m = migrate(st as never)
    expect(m.saveVersion).toBe(SAVE_VERSION)
    expect(m.carts).toEqual([])
  })
})
