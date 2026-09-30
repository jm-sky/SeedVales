/**
 * Resource & money conservation (game--002 group B, prompt §8): every flow has a source and a sink.
 */
import { describe, expect, it } from 'vitest'
import { perf } from '../diag/perf'
import { dropItem } from './actions'
import { placeSite } from './build'
import { killAnimal } from './combat'
import { runOption, transferToStorage } from './interact'
import { addItem, carriedWeight, carryCapacity, countItem, equipToMain, newStack } from './inventory'
import { makeAnimal } from './newGame'
import { updateNpc } from './npc/ai'
import { houseOf } from './npc/queries'
import { WORK_ACTS } from './npc/works'
import { collectOrder, placeOrder } from './orders'
import { acceptQuest, completeQuest } from './quests'
import { tryApologize } from './reputation'
import { openSpot, playerFarAway, run, testSim } from './testWorld'
import { buyFromNpc, tradeInventory } from './trade'
import { totalMoney } from './treasury'

describe('conservation of resources and money', () => {
  it('BUILD-03: NPC filling a trough uses its bucket water (no water from nothing)', () => {
    const sim = testSim()
    const trough = sim.state.buildings.find((b) => b.kind === 'trough' && b.householdId !== undefined)!
    const shepherd = sim.state.npcs.find((n) => n.householdId === trough.householdId && n.age === 'adult')!
    for (const w of sim.state.buildings.filter((b) => b.kind === 'well')) w.x += 5000 // no well next to the trough
    sim.rebuildBuildingIndex()
    trough.water = 0
    // Shepherds carry a bucket in their kit (the trough duty needs it).
    const bucket = shepherd.inv.items.find((s) => s.id === 'bucket')!
    expect(bucket).toBeDefined()
    bucket.water = 0
    expect(WORK_ACTS.fill_trough!(sim, shepherd, trough.id, 1)).toBe(false)
    expect(trough.water).toBe(0)
    bucket.water = 5
    expect(WORK_ACTS.fill_trough!(sim, shepherd, trough.id, 1)).toBe(true)
    expect(trough.water).toBe(5)
    expect(bucket.water).toBe(0)
  })

  it('BUILD-03: domestic animals take trough water only when they actually drink (on arrival)', () => {
    const sim = testSim()
    const trough = sim.state.buildings.find((b) => b.kind === 'trough' && b.householdId !== undefined)!
    const sheep = sim.state.animals.find((a) => a.householdId === trough.householdId && a.species !== 'dog')!
    trough.water = 10
    sheep.x = trough.x + 30
    sheep.z = trough.z
    sim.actors.update(sheep)
    sheep.thirstH = 99
    sheep.ai.steps = []
    sim.player.x = sheep.x
    sim.player.z = sheep.z
    sim.actors.update(sim.player)
    run(sim, 0.3)
    expect(sheep.ai.goal).toBe('drink')
    expect(trough.water).toBe(10) // planning alone takes nothing
    sheep.ai.steps = [] // interrupted before arrival
    for (let i = 0; i < 400 && trough.water === 10; i++) {
      sheep.thirstH = 99
      run(sim, 0.1)
    }
    expect(trough.water).toBe(9.5)
  })

  it('FAUNA-02/NPC-04: hunter deposits even a single raw meat; drying with too little meat is not a failure', () => {
    const sim = testSim()
    const hunter = sim.state.npcs.find((n) => n.profession === 'hunter')!
    const store = houseOf(sim, hunter)!.inv!
    store.items = store.items.filter((s) => s.id !== 'raw_meat')
    addItem(hunter.inv, newStack('raw_meat', 1))
    expect(WORK_ACTS.deposit_carry!(sim, hunter, undefined, 1)).toBe(true)
    expect(countItem(hunter.inv, 'raw_meat')).toBe(0)
    expect(countItem(store, 'raw_meat')).toBe(1)
    expect(WORK_ACTS.dry_meat!(sim, hunter, undefined, 1)).toBe(true)
    expect(countItem(store, 'raw_meat')).toBe(1)
  })

  it('ECON-01: money is conserved — inn, quest reward, caravan fees, orders, penance move money, never mint it', () => {
    const sim = testSim()
    const m0 = totalMoney(sim)
    // Inn without an innkeeper → treasury.
    const inn = sim.state.buildings.find((b) => b.kind === 'inn')
    if (inn) {
      const keepers = sim.state.npcs.filter((n) => n.profession === 'trader' && n.settlementId === inn.settlementId)
      for (const n of keepers) n.profession = undefined // no innkeeper for this night
      runOption(sim, { type: 'building', id: inn.id }, 'inn_sleep')
      for (const n of keepers) n.profession = 'trader'
      sim.timeScale = 1
      sim.state.px.activity = undefined
    }
    // Quest reward from the treasury.
    sim.state.quests.push({ id: 'q-test', kind: 'wolves', title: 't', desc: '', settlementId: 0, giverId: sim.state.npcs[0]!.id, status: 'available', reward: 60, createdAt: 0, killsNeeded: 1, kills: 1 })
    acceptQuest(sim, 'q-test')
    const t0 = sim.state.settlements[0]!.treasury
    completeQuest(sim, sim.state.quests.at(-1)!)
    expect(sim.state.settlements[0]!.treasury).toBe(t0 - 60)
    // Order at the smith.
    const smith = sim.state.npcs.find((n) => n.profession === 'blacksmith')!
    placeOrder(sim, smith, 'knife')
    sim.state.time.cal += 11 * 3600
    WORK_ACTS.smith!(sim, smith, undefined, 1)
    collectOrder(sim, sim.state.px.orders[0]!.id)
    // Penance.
    sim.state.px.badges.thief = { at: 0, count: 1 }
    tryApologize(sim, 'thief')
    expect(totalMoney(sim)).toBe(m0)
    // Three days of simulation incl. caravans (departures on even days 07–10) and NPC food purchases.
    playerFarAway(sim)
    perf.reset()
    run(sim, 3 * 3600, 1)
    expect(perf.report().counters['economy.caravanTrades'] ?? 0).toBeGreaterThan(0)
    expect(totalMoney(sim)).toBe(m0)
    // Taxes recirculate purses to treasuries; caravans are paid by their home settlement.
    expect(sim.state.settlements[0]!.treasury).toBeGreaterThan(0)
  }, 60_000)

  it('ITEM-02: pickup, storage and buying respect carry capacity (take what fits, rest stays)', () => {
    const sim = testSim()
    const p = sim.player
    const spot = openSpot(sim)
    p.x = spot.x
    p.z = spot.z
    sim.actors.update(p)
    const room = carryCapacity(p) - carriedWeight(p)
    const logs = Math.ceil(room / 10) + 5 // logs weigh ~10+ kg
    dropItem(sim, p.x, p.z, newStack('log', logs))
    const g = sim.state.ground.at(-1)!
    runOption(sim, { type: 'ground', id: g.id }, 'pickup')
    expect(carriedWeight(p)).toBeLessThanOrEqual(carryCapacity(p) + 1e-6)
    expect(g.stack.qty).toBeGreaterThan(0)
    expect(sim.state.ground).toContain(g)
    // Storage take is limited too.
    const wh = sim.building(sim.state.settlements[0]!.warehouseId)!
    addItem(wh.inv!, newStack('stone', 200))
    transferToStorage(sim, wh, wh.inv!.items.findIndex((s) => s.id === 'stone'), false)
    expect(carriedWeight(p)).toBeLessThanOrEqual(carryCapacity(p) + 1e-6)
    expect(countItem(wh.inv!, 'stone')).toBeGreaterThan(0)
    // Buying something that does not fit is refused (money untouched).
    const trader = sim.state.npcs.find((n) => n.profession === 'trader' && n.settlementId === 0)!
    const inv = tradeInventory(sim, trader)!
    addItem(inv, newStack('log', 3))
    const m = p.money
    expect(buyFromNpc(sim, trader, inv.items.find((s) => s.id === 'log')!, 1).ok).toBe(false)
    expect(p.money).toBe(m)
  })

  it('NPC-02: fighting an unreachable enemy ends with a cooldown instead of endless circling', () => {
    const sim = testSim()
    const guard = sim.state.npcs.find((n) => n.profession === 'guard')!
    sim.player.x = guard.x + 5
    sim.player.z = guard.z
    sim.actors.update(sim.player)
    const w = makeAnimal(sim.nextId(), 'wolf', 'adult', guard.x + 15, guard.z, guard.y, sim.rng)
    sim.addAnimal(w)
    w.aggroId = guard.id
    w.aggroUntil = 1e9
    guard.ai.goal = 'fight'
    guard.ai.replanAt = 1e9
    guard.ai.stuckT = 9 // steering reports 'stuck' on this step
    updateNpc(sim, guard, 0.1, true)
    expect(guard.ai.goal).toBeNull()
    expect(guard.ai.cooldowns.fight ?? 0).toBeGreaterThan(sim.state.time.play)
  })

  it('BUILD-01: cancelling a construction site returns delivered materials to the ground', () => {
    const sim = testSim()
    const spot = openSpot(sim)
    expect(placeSite(sim, 'campfire', spot.x, spot.z, 0).ok).toBe(true)
    const site = sim.state.sites.at(-1)!
    site.delivered = { stone: 4, branch: 2 }
    const g0 = sim.state.ground.length
    runOption(sim, { type: 'site', id: site.id }, 'cancel_site')
    expect(sim.state.sites).not.toContain(site)
    const dropped = sim.state.ground.slice(g0).map((g) => `${g.stack.id}:${g.stack.qty}`).sort()
    expect(dropped).toEqual(['branch:2', 'stone:4'])
  })

  it('ECON-01: treasuries are not drained by caravans over 6 days (home pays its trader, daily tax recirculates)', () => {
    const sim = testSim()
    playerFarAway(sim)
    const t0 = sim.state.settlements.map((s) => s.treasury)
    run(sim, 6 * 3600, 2)
    const t1 = sim.state.settlements.map((s) => s.treasury)
    t1.forEach((t, i) => expect(t, `settlement ${i}`).toBeGreaterThanOrEqual(t0[i]! * 0.8))
  }, 120_000)

  it('NPC-04: a fight ends with a usable weapon — shepherd keeps the staff, hunter shoots again after a knife fight', () => {
    const sim = testSim()
    const shepherd = sim.state.npcs.find((n) => n.profession === 'shepherd' && n.age === 'adult')!
    const main0 = shepherd.eq.main?.id
    shepherd.ai.goal = 'fight'
    shepherd.ai.replanAt = 1e9
    updateNpc(sim, shepherd, 0.1, false) // no threat → fight ends
    expect(shepherd.eq.main?.id).toBe(main0)
    const hunter = sim.state.npcs.find((n) => n.profession === 'hunter' && n.age === 'adult')!
    const knife = hunter.inv.items.find((s) => s.id === 'knife')!
    equipToMain(hunter, knife)
    expect(hunter.eq.main?.id).toBe('knife')
    const deer = makeAnimal(sim.nextId(), 'deer', 'adult', hunter.x + 20, hunter.z, hunter.y, sim.rng)
    sim.addAnimal(deer)
    expect(WORK_ACTS.shoot!(sim, hunter, String(deer.id), 1)).toBe(true)
    expect(hunter.eq.main?.id).toBe('short_bow')
  })

  it('COMBAT-03: a killed rat leaves no (ghost) corpse in state or index', () => {
    const sim = testSim()
    const p = sim.player
    const rat = makeAnimal(sim.nextId(), 'rat', 'adult', p.x + 1, p.z, p.y, sim.rng)
    sim.addAnimal(rat)
    const n0 = sim.state.corpses.length
    killAnimal(sim, rat, p)
    expect(sim.state.corpses.length).toBe(n0)
    expect(sim.corpsesNear(rat.x, rat.z, 3).length).toBe(0)
  })
})
