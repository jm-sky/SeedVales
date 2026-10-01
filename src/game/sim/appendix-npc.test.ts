/**
 * VISION-APPENDIX trade, gifts and companions (wave 3, plan npc--001): TRADE-02, SOC-01, COMP-01/02/03.
 */
import { describe, expect, it } from 'vitest'
import type { Sim } from './sim'
import type { Human } from './types'
import { COMPANION } from '../config/calibration'
import { PROFESSIONS } from '../data/professions'
import { migrate } from '../save/migrate'
import { roundTrip } from '../save/snapshot'
import { giftGain, giveGift, wantedItem } from './gifts'
import { targetOptions } from './interact'
import { addItem, newStack } from './inventory'
import { askToJoin, companionDist, companionSystem, dailyWage, hireCompanion, hireRefusal, joinChance } from './npc/companions'
import { run, testSim } from './testWorld'
import { buyFromNpc, tradeStock } from './trade'
import { SAVE_VERSION } from './types'

const totalMoney = (sim: Sim) => sim.player.money + sim.state.npcs.reduce((s, n) => s + n.money, 0) + sim.state.settlements.reduce((s, x) => s + x.treasury, 0)

function nearHome(sim: Sim): void {
  const s = sim.world.settlements[sim.world.homeSettlement]!
  const p = sim.player
  p.x = s.x + 10
  p.z = s.z + 10
  p.y = sim.terrain.heightAt(p.x, p.z)
  sim.actors.update(p)
}

function npcWhere(sim: Sim, pred: (n: Human) => boolean): Human {
  const n = sim.state.npcs.find((x) => !x.vitals.dead && pred(x))
  if (!n) throw new Error('npc not found')
  return n
}

/** Puts an NPC next to the player (calm, fed) so it acts in the near LOD. */
function besidePlayer(sim: Sim, n: Human) {
  n.x = sim.player.x + 2
  n.z = sim.player.z
  n.y = sim.terrain.heightAt(n.x, n.z)
  n.vitals.hunger = n.vitals.thirst = 95
  n.vitals.vigor = 95
  sim.actors.update(n)
}

describe('npc--001: trade with any NPC (TRADE-02)', () => {
  it('TRADE-02: every adult offers a surplus and keeps its work kit and food reserve', () => {
    const sim = testSim()
    const adults = sim.state.npcs.filter((n) => n.age === 'adult')
    const withStock = adults.filter((n) => tradeStock(sim, n).length > 0)
    expect(withStock.length / adults.length).toBeGreaterThan(0.9)
    const farmer = npcWhere(sim, (n) => n.profession === 'farmer')
    const stock = tradeStock(sim, farmer)
    // The farmer's own shovel is the work kit — never for sale.
    expect(stock.some((e) => e.stack.id === 'shovel')).toBe(false)
    // Food reserve: 3 portions per household member stay home.
    const hh = sim.state.households[farmer.householdId]!
    const foodLeft = [...farmer.inv.items, ...sim.building(hh.houseId)!.inv!.items].filter((s) => s.fresh !== undefined).reduce((a, s) => a + s.qty, 0)
    const foodSold = stock.filter((e) => e.stack.fresh !== undefined).reduce((a, e) => a + e.max, 0)
    expect(foodLeft - foodSold).toBe(Math.min(foodLeft, hh.memberIds.length * 3))
  })

  it('TRADE-02: buying from a non-trader moves the coins 1:1 and respects the kept quantity', () => {
    const sim = testSim()
    const farmer = npcWhere(sim, (n) => n.profession === 'farmer')
    const before = totalMoney(sim)
    const e = tradeStock(sim, farmer).find((x) => x.stack.id === 'grain')!
    expect(buyFromNpc(sim, farmer, e.stack, e.max + 5).ok).toBe(true)
    expect(totalMoney(sim)).toBe(before)
    expect(tradeStock(sim, farmer).some((x) => x.stack.id === 'grain')).toBe(false)
  })

  it('TRADE-02: talking, trading, gifts and hiring are offered for every adult NPC', () => {
    const sim = testSim()
    const n = npcWhere(sim, (x) => x.age === 'adult' && x.profession === 'woodcutter')
    const ids = targetOptions(sim, { type: 'npc', id: n.id }).map((o) => o.id)
    expect(ids).toEqual(expect.arrayContaining(['talk', 'trade', 'gift', 'hire', 'ask_join']))
  })
})

describe('npc--001: gifts and preferences (SOC-01)', () => {
  it('SOC-01: a gift raises opinion with diminishing returns the same day', () => {
    const sim = testSim()
    const n = npcWhere(sim, (x) => x.profession === 'farmer')
    addItem(sim.player.inv, newStack('cloth', 6))
    const g1 = giftGain(sim, n, sim.player.inv.items.find((s) => s.id === 'cloth')!, 2)
    const o0 = n.opinion
    giveGift(sim, n, sim.player.inv.items.find((s) => s.id === 'cloth')!, 2)
    expect(n.opinion - o0).toBeCloseTo(g1)
    const g2 = giftGain(sim, n, sim.player.inv.items.find((s) => s.id === 'cloth')!, 2)
    expect(g2).toBeLessThan(g1 * 0.6)
    // Next day: full effect again.
    sim.state.time.cal += 86400
    expect(giftGain(sim, n, sim.player.inv.items.find((s) => s.id === 'cloth')!, 2)).toBeCloseTo(g1)
  })

  it('SOC-01: the wanted item is revealed, counts double and the wish moves on once fulfilled', () => {
    const sim = testSim()
    const guard = npcWhere(sim, (x) => x.profession === 'guard')
    const want = wantedItem(guard)!
    expect(want).toBeTruthy()
    addItem(sim.player.inv, newStack(want))
    const s = sim.player.inv.items.find((x) => x.id === want)!
    const other = npcWhere(sim, (x) => x.profession === 'farmer')
    other.big5.a = guard.big5.a
    expect(giftGain(sim, guard, s, 1)).toBeGreaterThan(giftGain(sim, other, s, 1) * 1.3)
    giveGift(sim, guard, s, 1)
    expect(wantedItem(guard)).not.toBe(want)
  })
})

describe('npc--001: companions (COMP-01/02/03)', () => {
  it('COMP-01: hiring pays the NPC 1:1, the companion follows and the contract ends after its days', () => {
    const sim = testSim()
    nearHome(sim)
    const n = npcWhere(sim, (x) => x.kin === 'son')
    besidePlayer(sim, n)
    n.big5.n = 0.3
    const before = totalMoney(sim)
    const price = dailyWage(n, 'escort', 'medium') * 2
    const m0 = n.money
    expect(hireCompanion(sim, n, 'escort', 'medium', 2).ok).toBe(true)
    expect(n.money - m0).toBe(price)
    expect(totalMoney(sim)).toBe(before)
    // Walk away 40 m: the companion follows.
    const p = sim.player
    p.x += 40
    p.y = sim.terrain.heightAt(p.x, p.z)
    sim.actors.update(p)
    run(sim, 25)
    expect(companionDist(sim, n)).toBeLessThan(COMPANION.catchUpM)
    // Saved and restored.
    expect(roundTrip(sim).npcs.find((x) => x.id === n.id)!.companion?.kind).toBe('hired')
    // Contract over → back to normal life.
    sim.state.time.cal = n.companion!.until! + 1
    companionSystem(sim)
    expect(n.companion).toBeUndefined()
  })

  it('COMP-01: risk raises the wage and nervous NPCs refuse dangerous work', () => {
    const sim = testSim()
    const n = npcWhere(sim, (x) => x.kin === 'son')
    expect(dailyWage(n, 'escort', 'high')).toBeGreaterThan(dailyWage(n, 'escort', 'low'))
    expect(dailyWage(n, 'guard', 'low')).toBeGreaterThan(dailyWage(n, 'escort', 'low'))
    n.big5.n = 0.9
    n.opinion = 0
    expect(hireRefusal(sim, n, 'escort', 'high')).toMatch(/dangerous/)
    expect(hireRefusal(sim, n, 'escort', 'low')).toBeNull()
    n.opinion = 60
    expect(hireRefusal(sim, n, 'escort', 'high')).toBeNull()
    const kid = npcWhere(sim, (x) => x.age === 'child')
    expect(hireRefusal(sim, kid, 'escort', 'low')).toMatch(/child/)
  })

  it('COMP-02: every settlement has a grown son without a family of his own', () => {
    const sim = testSim()
    for (const s of sim.world.settlements) {
      expect(sim.state.npcs.some((n) => n.settlementId === s.id && n.kin === 'son' && n.male && n.age === 'adult')).toBe(true)
    }
  })

  it('COMP-02: join chance grows with opinion and reputation; sons are more willing than household heads', () => {
    const sim = testSim()
    const son = npcWhere(sim, (x) => x.kin === 'son')
    const chances = [-40, 0, 40, 80].map((o) => {
      son.opinion = o
      return joinChance(sim, son)
    })
    for (let i = 1; i < chances.length; i++) expect(chances[i]!).toBeGreaterThanOrEqual(chances[i - 1]!)
    expect(chances[3]!).toBeGreaterThan(chances[0]!)
    son.opinion = 30
    const c0 = joinChance(sim, son)
    const rep = sim.state.settlements[son.settlementId]!.rep
    rep.renown = rep.courage = rep.honesty = 60
    expect(joinChance(sim, son)).toBeGreaterThan(c0)
    const head = npcWhere(sim, (x) => x.kin === 'head' && x.settlementId === son.settlementId && x.profession !== 'guard')
    head.opinion = son.opinion
    head.big5 = { ...son.big5 }
    expect(joinChance(sim, head)).toBeLessThan(joinChance(sim, son))
  })

  it('COMP-02: asking gives one answer per day; a willing NPC joins for free', () => {
    const sim = testSim()
    const son = npcWhere(sim, (x) => x.kin === 'son')
    son.opinion = 100
    son.big5 = { o: 1, c: 0, e: 1, a: 1, n: 0 }
    const before = sim.player.money
    expect(askToJoin(sim, son).ok).toBe(true)
    expect(son.companion?.kind).toBe('free')
    expect(sim.player.money).toBe(before)
    const other = npcWhere(sim, (x) => x.kin === 'head' && x.profession === 'guard')
    other.opinion = -50
    expect(askToJoin(sim, other).ok).toBe(false)
    other.opinion = 100
    expect(askToJoin(sim, other).msg).toMatch(/not today/)
  })

  it('COMP-03: a companion wields a better weapon and wears armour handed over by the player', () => {
    const sim = testSim()
    nearHome(sim)
    const n = npcWhere(sim, (x) => x.kin === 'son')
    besidePlayer(sim, n)
    hireCompanion(sim, n, 'guard', 'low', 1)
    addItem(sim.player.inv, newStack('sword'))
    addItem(sim.player.inv, newStack('leather_jerkin'))
    giveGift(sim, n, sim.player.inv.items.find((s) => s.id === 'sword')!)
    giveGift(sim, n, sim.player.inv.items.find((s) => s.id === 'leather_jerkin')!)
    expect(n.eq.main?.id).toBe('sword')
    expect(n.eq.armor.torso_outer?.id).toBe('leather_jerkin')
    // A worse weapon does not replace it.
    addItem(sim.player.inv, newStack('club'))
    giveGift(sim, n, sim.player.inv.items.find((s) => s.id === 'club')!)
    expect(n.eq.main?.id).toBe('sword')
  })

  it('COMP-03: an NPC in a fight swaps to its best melee weapon even when one is already in hand', () => {
    const sim = testSim()
    const n = npcWhere(sim, (x) => x.profession === 'woodcutter')
    addItem(n.inv, newStack('long_sword'))
    expect(n.eq.main?.id).toBe(PROFESSIONS.woodcutter.weapon)
    // equipReceived runs on gifts; the fight path uses wieldBest directly.
    const sword = n.inv.items.find((s) => s.id === 'long_sword')!
    addItem(sim.player.inv, newStack('apple'))
    giveGift(sim, n, sim.player.inv.items.find((s) => s.id === 'apple')!)
    expect(n.eq.main).toBe(sword)
  })

  it('SAVE-01: v6 → v7 migration derives household roles for old populations', () => {
    const sim = testSim()
    const st = roundTrip(sim)
    st.saveVersion = 6
    for (const n of st.npcs) delete n.kin
    const m = migrate(st)
    expect(m.saveVersion).toBe(SAVE_VERSION)
    for (const n of m.npcs) expect(n.kin).toBe(n.profession ? 'head' : n.age === 'adult' ? 'spouse' : n.age)
  })
})
