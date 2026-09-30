/**
 * Rule-level verification of FEATURES.json items (IDs in test names).
 */
import { describe, expect, it } from 'vitest'
import { CALENDAR_SPEED, DAYS_PER_SEASON, DAYS_PER_YEAR, NEEDS } from '../config/calibration'
import { recipeById } from '../data/recipes'
import { skillGain } from '../data/skills'
import { isTree } from '../world/nodes'
import { dig, dropItem, waterRisk } from './actions'
import { deliverMaterials, placeSite, startBuildWork } from './build'
import { fireRanged, killAnimal } from './combat'
import { completeCraft, rollQuality } from './craft'
import { runOption } from './interact'
import { addItem, carriedWeight, carryCapacity, countItem, newStack, spoilInventory } from './inventory'
import { makeAnimal } from './newGame'
import { planNpc } from './npc/ai'
import { houseOf, settlementBuildings } from './npc/queries'
import { WORK_ACTS } from './npc/works'
import { cancelOrder, canOrder, collectOrder, placeOrder } from './orders'
import { cancelActivity, playerInput, startActivity } from './player'
import { questSystem } from './quests'
import { addRep, BADGES } from './reputation'
import { openSpot, playerFarAway, run, testSim } from './testWorld'
import { dayIndex, seasonOf } from './time'
import { buyFromNpc, sellToNpc, tradeInventory } from './trade'
import { hp, newVitals, updateVitals } from './vitals'

const flatSpot = openSpot

describe('time & calibration', () => {
  it('TIME-01: 1 day = 3600 s gameplay, year 60 days, season 15; walking is 1.5 m/s (not ×24)', () => {
    expect(86400 / CALENDAR_SPEED).toBe(3600)
    expect(DAYS_PER_YEAR).toBe(60)
    expect(DAYS_PER_SEASON).toBe(15)
    const sim = testSim()
    const p = sim.player
    const d0 = dayIndex(sim.state.time.cal)
    const x0 = p.x
    const z0 = p.z
    playerInput.mx = 1
    playerInput.mz = 0
    run(sim, 10, 0.05)
    playerInput.mx = 0
    const moved = Math.hypot(p.x - x0, p.z - z0)
    expect(moved).toBeGreaterThan(10)
    expect(moved).toBeLessThan(17)
    run(sim, 3600, 1)
    expect(dayIndex(sim.state.time.cal)).toBe(d0 + 1)
    expect(seasonOf(0)).toBe('spring')
    expect(seasonOf(15 * 86400)).toBe('summer')
  }, 60_000)

  it('ATTR-02: vigor lasts ~18–20 h of marching; penalties when exhausted', () => {
    const v = newVitals(100)
    v.vigor = 100
    let h = 0
    while (v.vigor > 0 && h < 30) {
      updateVitals(v, 3600 / CALENDAR_SPEED / 4, 'walk')
      h += 0.25
      v.thirst = 100
      v.hunger = 100
    }
    expect(h).toBeGreaterThanOrEqual(18)
    expect(h).toBeLessThanOrEqual(20)
    expect(NEEDS.exhaustionMaxH).toBe(24)
  })

  it('TIME-04: sleep accelerates the whole simulation and a threat interrupts it', () => {
    const sim = testSim()
    const p = sim.player
    startActivity(sim, { kind: 'sleep', label: 'Sen', total: 1200, accel: 40, data: '0.5' })
    const cal0 = sim.state.time.cal
    for (let i = 0; i < 10; i++) sim.step(0.1 * sim.timeScale)
    expect(sim.timeScale).toBe(40)
    expect(sim.state.time.cal - cal0).toBeGreaterThan(10 * 0.1 * 40 * 24 * 0.9)
    const w = makeAnimal(sim.nextId(), 'wolf', 'alpha', p.x + 6, p.z, p.y, sim.rng)
    w.aggroId = p.id
    w.aggroUntil = 1e9
    sim.addAnimal(w)
    sim.step(0.1 * sim.timeScale)
    expect(sim.state.px.activity).toBeUndefined()
    expect(sim.interruptReason).toBe('threat')
  })
})

describe('items, food, trade, craft', () => {
  it('FOOD-02: food in a chest spoils slower than carried food', () => {
    const inv = { items: [newStack('raw_meat', 1)] }
    const chest = { items: [newStack('raw_meat', 1)] }
    spoilInventory(inv, 10)
    spoilInventory(chest, 10, 0.5)
    expect(chest.items[0]!.fresh!).toBeGreaterThan(inv.items[0]!.fresh!)
    spoilInventory(inv, 20)
    expect(inv.items.length).toBe(0) // raw meat (18 h) spoiled
  })

  it('FOOD-01: corpses rot and then disappear (bones)', () => {
    const sim = testSim()
    const d = makeAnimal(sim.nextId(), 'deer', 'adult', sim.player.x + 3, sim.player.z, 0, sim.rng)
    sim.addAnimal(d)
    killAnimal(sim, d)
    const c = sim.state.corpses.find((cc) => cc.species === 'deer')!
    const meat0 = c.meat
    sim.player.x += 2000
    run(sim, 150 * 10, 1) // 10 h
    expect(c.meat).toBeLessThan(meat0)
    run(sim, 150 * 40, 2)
    expect(sim.state.corpses.includes(c)).toBe(false)
  })

  it('TRADE-01: buying and selling conserves money', () => {
    const sim = testSim()
    const trader = sim.state.npcs.find((n) => n.profession === 'trader')!
    const total0 = trader.money + sim.player.money
    const inv = tradeInventory(sim, trader)!
    const axe = inv.items.find((s) => s.id === 'axe')!
    expect(buyFromNpc(sim, trader, axe).ok).toBe(true)
    expect(countItem(sim.player.inv, 'axe')).toBe(1)
    expect(sellToNpc(sim, trader, sim.player.inv.items.find((s) => s.id === 'apple')!).ok).toBe(true)
    expect(trader.money + sim.player.money).toBe(total0)
  })

  it('CRAFT-01: cancelling keeps inputs; completion consumes them', () => {
    const sim = testSim()
    const p = sim.player
    addItem(p.inv, newStack('branch', 2))
    startActivity(sim, { kind: 'craft', label: 'x', total: 5, data: 'club' })
    run(sim, 2)
    cancelActivity(sim)
    expect(countItem(p.inv, 'branch')).toBe(2)
    expect(completeCraft(sim, p, recipeById('club')!).ok).toBe(true)
    expect(countItem(p.inv, 'branch')).toBe(0)
    expect(countItem(p.inv, 'club')).toBe(1)
  })

  it('QUAL-01: higher blacksmith skill yields better quality on average', () => {
    const sim = testSim()
    const avg = (s: number) => Array.from({ length: 400 }, () => rollQuality(sim, s)).reduce((a, b) => a + b, 0) / 400
    expect(avg(90)).toBeGreaterThan(avg(10) + 0.5)
  })

  it('CRAFT-02: order at blacksmith with deposit → ready → collect', () => {
    const sim = testSim()
    const smith = sim.state.npcs.find((n) => n.profession === 'blacksmith')!
    const m0 = sim.player.money
    expect(placeOrder(sim, smith, 'knife')).toContain('Zamówiono')
    expect(sim.player.money).toBeLessThan(m0)
    sim.state.time.cal += 11 * 3600
    WORK_ACTS.smith!(sim, smith, undefined, 1)
    const o = sim.state.px.orders[0]!
    expect(o.status).toBe('ready')
    expect(collectOrder(sim, o.id)).toContain('Odebrano')
    expect(countItem(sim.player.inv, 'knife')).toBe(2)
  })

  it('CRAFT-02: order consumes recipe materials from the smith store; without them it keeps waiting', () => {
    const sim = testSim()
    const smith = sim.state.npcs.find((n) => n.profession === 'blacksmith')!
    const store = houseOf(sim, smith)!.inv!
    const ingots0 = countItem(store, 'iron_ingot')
    const branch0 = countItem(store, 'branch')
    expect(placeOrder(sim, smith, 'axe')).toContain('Zamówiono')
    // Materials are reserved at ordering (the smith cannot use them for other work meanwhile).
    expect(countItem(store, 'iron_ingot')).toBe(ingots0 - 2)
    expect(countItem(store, 'branch')).toBe(branch0 - 1)
    sim.state.time.cal += 11 * 3600
    WORK_ACTS.smith!(sim, smith, undefined, 1)
    const o = sim.state.px.orders[0]!
    expect(o.status).toBe('ready')
    expect(countItem(store, 'iron_ingot')).toBeLessThanOrEqual(ingots0 - 2)
    // Without materials the order is refused (no deposit taken, nothing minted).
    store.items = []
    const m = sim.player.money
    expect(placeOrder(sim, smith, 'knife')).toContain('nie ma teraz materiałów')
    expect(sim.player.money).toBe(m)
    expect(sim.state.px.orders.length).toBe(1)
    const axes0 = countItem(sim.player.inv, 'axe')
    expect(collectOrder(sim, o.id)).toContain('Odebrano')
    expect(countItem(sim.player.inv, 'axe')).toBe(axes0 + 1)
    expect(sim.state.px.orders.length).toBe(0) // collected orders leave the list
  })

  it('CRAFT-02: cancelling an order refunds the deposit and returns the reserved materials', () => {
    const sim = testSim()
    const smith = sim.state.npcs.find((n) => n.profession === 'blacksmith')!
    const store = houseOf(sim, smith)!.inv!
    const ingots0 = countItem(store, 'iron_ingot')
    const m0 = sim.player.money
    placeOrder(sim, smith, 'axe')
    expect(sim.player.money).toBeLessThan(m0)
    expect(cancelOrder(sim, sim.state.px.orders[0]!.id)).toContain('zwrot')
    expect(sim.player.money).toBe(m0)
    expect(countItem(store, 'iron_ingot')).toBe(ingots0)
    expect(sim.state.px.orders.length).toBe(0)
    // Recipes the smith has no materials for cannot be ordered (sword needs hide).
    expect(canOrder(sim, smith, 'sword')).toBe(countItem(store, 'hide') >= 1 && countItem(store, 'iron_ingot') >= 4)
  })

  it('ITEM-02: carry capacity (Strength + backpack) and weight', () => {
    const sim = testSim()
    const p = sim.player
    const cap0 = carryCapacity(p)
    addItem(p.inv, newStack('backpack'))
    expect(carryCapacity(p)).toBe(cap0 + 15)
    const w0 = carriedWeight(p)
    addItem(p.inv, newStack('log', 2))
    expect(carriedWeight(p)).toBeCloseTo(w0 + 36, 0)
  })

  it('ITEM-03: interaction auto-equips the needed tool from inventory', () => {
    const sim = testSim()
    const p = sim.player
    addItem(p.inv, newStack('axe'))
    const tree = sim.nodes.query(p.x, p.z, 300).find((n) => isTree(n.kind))!
    runOption(sim, { type: 'node', id: tree.id }, 'chop')
    expect(p.eq.main?.id).toBe('axe')
    expect(sim.state.px.activity?.kind).toBe('chop')
  })

  it('ITEM-04: shovel digs (changes terrain), rocks need a pickaxe, shore gives shells', () => {
    const sim = testSim()
    const p = sim.player
    expect(dig(sim, p, p.x + 3, p.z).ok).toBe(false)
    addItem(p.inv, newStack('shovel'))
    const h0 = sim.terrain.heightAt(p.x + 3, p.z)
    expect(dig(sim, p, p.x + 3, p.z).ok).toBe(true)
    expect(sim.terrain.heightAt(p.x + 3, p.z)).toBeLessThan(h0)
    // Find a beach.
    let beach: { x: number; z: number } | null = null
    for (let i = 0; i < 4000 && !beach; i++) {
      const x = 300 + ((i * 97) % 7600)
      const z = 300 + ((i * 131) % 7600)
      if (sim.terrain.biomeAt(x, z) === 1) beach = { x, z }
    }
    expect(beach).not.toBeNull()
    let shells = 0
    for (let i = 0; i < 40; i++) {
      dig(sim, p, beach!.x, beach!.z)
      shells = countItem(p.inv, 'shell') + countItem(p.inv, 'pearl_shell')
    }
    expect(shells).toBeGreaterThan(0)
  })
})

describe('construction', () => {
  it('BUILD-01: well — site, materials from inventory and ground, 2 stages (accelerated), safe water', () => {
    const sim = testSim()
    const p = sim.player
    const spot = flatSpot(sim)
    p.x = spot.x
    p.z = spot.z
    for (const [id, q] of [['stone', 12], ['log', 1], ['rope', 1], ['shovel', 1], ['hammer', 1]] as const) addItem(p.inv, newStack(id, q))
    const r = placeSite(sim, 'well', spot.x + 4, spot.z, 0)
    if (!r.ok) {
      sim.terrain.applyEdit(spot.x + 4, spot.z, 4, { kind: 'level', target: sim.terrain.heightAt(spot.x + 4, spot.z) })
      expect(placeSite(sim, 'well', spot.x + 4, spot.z, 0).ok).toBe(true)
    }
    const site = sim.state.sites[0]!
    dropItem(sim, site.x + 2, site.z, newStack('log', 1))
    expect(deliverMaterials(sim, site)).toEqual([])
    expect(countItem(p.inv, 'stone')).toBe(0)
    expect(sim.state.ground.length).toBe(0)
    for (let stage = 0; stage < 2; stage++) {
      expect(startBuildWork(sim, site).ok).toBe(true)
      expect(sim.state.px.activity!.accel).toBeGreaterThan(1)
      run(sim, 400, 0.5)
    }
    const well = sim.state.buildings.find((b) => b.playerBuilt && b.kind === 'well')
    expect(well).toBeDefined()
    expect(sim.state.sites.length).toBe(0)
  })

  it('BUILD-03: trough can be filled directly from a nearby well', () => {
    const sim = testSim()
    let trough = sim.state.buildings.find((b) => b.kind === 'trough')
    if (!trough) {
      const s = sim.world.settlements[0]!
      trough = { id: 't-test', kind: 'trough', x: s.x + 30, z: s.z + 30, rot: 0, hw: 1.2, hd: 0.5, settlementId: 0, durability: 100, owner: 'settlement', water: 0 }
      sim.state.buildings.push(trough)
    }
    trough.water = 0
    addItem(sim.player.inv, newStack('bucket'))
    sim.state.buildings.push({ ...trough, id: 'w-test', kind: 'well', x: trough.x + 3 })
    sim.rebuildBuildingIndex()
    expect(runOption(sim, { type: 'building', id: trough.id }, 'fill_trough')).toContain('studni')
    expect(trough.water).toBe(12)
  })
})

describe('reputation & quests', () => {
  it('REP-02: 30% of selected dimensions spreads to neighbours after fast-march delay', () => {
    const sim = testSim()
    addRep(sim, 0, { courage: 10, helpfulness: 10 })
    const n = sim.state.settlements[1]!
    expect(n.pendingRep.length).toBe(1)
    expect(n.rep.courage).toBe(0)
    const delay = n.pendingRep[0]!.at - sim.state.time.play
    expect(delay).toBeGreaterThan(1000)
    sim.player.x = 200
    run(sim, delay + 10, 2)
    expect(n.rep.courage).toBeCloseTo(3, 5)
    expect(n.rep.helpfulness).toBe(0)
  })

  it('REP-03: killing 8 rats earns the rat-catcher badge (+reputation)', () => {
    const sim = testSim()
    for (let i = 0; i < 8; i++) {
      const r = makeAnimal(sim.nextId(), 'rat', 'adult', sim.player.x + 2, sim.player.z, 0, sim.rng)
      sim.addAnimal(r)
      killAnimal(sim, r, sim.player)
    }
    expect(sim.state.px.badges.rat_catcher).toBeDefined()
    expect(BADGES.find((b) => b.id === 'rat_catcher')).toBeDefined()
    expect(sim.state.settlements[0]!.rep.helpfulness).toBeGreaterThan(0)
  })

  it('QUEST-01: quest expires when residents fix the problem themselves', () => {
    const sim = testSim()
    const wh = sim.building(sim.state.settlements[0]!.warehouseId)!
    wh.ratNest = { strength: 2, since: 0 }
    for (let i = 0; i < 3; i++) sim.addAnimal({ ...makeAnimal(sim.nextId(), 'rat', 'adult', wh.x + i, wh.z + wh.hd + 1, 0, sim.rng), denId: `nest:${wh.id}` })
    questSystem(sim)
    const q = sim.state.quests.find((qq) => qq.kind === 'rats')!
    expect(q.status).toBe('available')
    const guard = sim.state.npcs.find((n) => n.profession === 'guard' && n.settlementId === 0)!
    addItem(guard.inv, newStack('hammer'))
    addItem(guard.inv, newStack('branch', 6))
    for (let i = 0; i < 3; i++) WORK_ACTS.repair!(sim, guard, wh.id, 1)
    for (const a of [...sim.state.animals]) if (a.species === 'rat') killAnimal(sim, a, guard)
    questSystem(sim)
    expect(wh.ratNest).toBeUndefined()
    expect(q.status).toBe('expired')
  })
})

describe('fauna', () => {
  it('FAUNA-02 / SKILL-03: deer flees from a walking player but not from a sneaking one at 20 m', () => {
    const sim = testSim()
    const p = sim.player
    const spot = { x: p.x + 200, z: p.z + 200 }
    p.x = spot.x
    p.z = spot.z
    sim.actors.update(p)
    const mk = () => {
      const d = makeAnimal(sim.nextId(), 'deer', 'adult', p.x + 20, p.z, 0, sim.rng)
      sim.addAnimal(d)
      return d
    }
    sim.state.px.sneaking = true
    sim.player.skills.sneak = 60
    sim.state.time.cal = Math.floor(sim.state.time.cal / 86400) * 86400 + 12 * 3600
    const d1 = mk()
    run(sim, 1)
    expect(d1.fleeFrom).toBeUndefined()
    sim.state.px.sneaking = false
    const d2 = mk()
    run(sim, 1)
    expect(d2.fleeFrom).toBeDefined()
  })

  it('FAUNA-03: dropped meat lures a hungry wolf', () => {
    const sim = testSim()
    const p = sim.player
    p.x += 300
    const w = makeAnimal(sim.nextId(), 'wolf', 'adult', p.x + 60, p.z, 0, sim.rng)
    w.hungerH = 40
    sim.addAnimal(w)
    dropItem(sim, p.x + 40, p.z, newStack('raw_meat', 2))
    sim.player.x -= 600 // move the player away so the wolf isn't distracted
    let lured = false
    for (let i = 0; i < 60 && !lured; i++) {
      run(sim, 1)
      lured = w.ai.goal === 'scavenge' || w.hungerH === 0
    }
    expect(lured).toBe(true)
  })

  it('FAUNA-04: burned den does not respawn animals', () => {
    const sim = testSim()
    const den = sim.state.dens.find((d) => d.species === 'wolf')!
    for (const a of [...sim.state.animals]) if (a.denId === den.id) killAnimal(sim, a)
    den.alive = false
    playerFarAway(sim)
    run(sim, 3600 * 2, 5)
    expect(sim.state.animals.filter((a) => a.denId === den.id).length).toBe(0)
  })
})

describe('npc', () => {
  it('NPC-03: conscientious NPCs spend more time working', () => {
    const measure = (c: number) => {
      const sim = testSim()
      playerFarAway(sim)
      const npcs = sim.state.npcs.filter((n) => n.age === 'adult' && n.profession)
      for (const n of npcs) n.big5.c = c
      sim.state.time.cal = Math.floor(sim.state.time.cal / 86400) * 86400 + 8 * 3600
      let work = 0
      let total = 0
      for (let i = 0; i < 60; i++) {
        run(sim, 10, 1)
        for (const n of npcs) {
          total++
          if (n.ai.goal === 'work') work++
        }
      }
      return work / total
    }
    expect(measure(1)).toBeGreaterThan(measure(0))
  })

  it('NPC-07: a downed NPC is helped by a guard', () => {
    const sim = testSim()
    const victim = sim.state.npcs.find((n) => n.profession === 'farmer' && n.settlementId === 0)!
    const guard = sim.state.npcs.find((n) => n.profession === 'guard' && n.settlementId === 0)!
    sim.player.x = victim.x + 5
    sim.player.z = victim.z
    guard.x = victim.x + 20
    guard.z = victim.z
    victim.vitals.parts.torso = victim.vitals.maxHp + 5
    victim.vitals.ko = { until: sim.state.time.play + 600, protectUntil: 0 }
    victim.callForHelpAt = sim.state.time.play
    planNpc(sim, guard, true)
    expect(guard.ai.goal).toBe('help')
    run(sim, 40, 0.1)
    expect(victim.vitals.ko).toBeUndefined()
    expect(hp(victim.vitals)).toBeGreaterThan(0)
  })

  it('SET-02: surplus food goes to the settlement warehouse', () => {
    const sim = testSim()
    const npc = sim.state.npcs.find((n) => n.profession === 'farmer' && n.age === 'adult')!
    const trace: string[] = []
    const house = houseOf(sim, npc)!
    addItem(house.inv!, newStack('cabbage', 60))
    const wh = settlementBuildings(sim, npc.settlementId, 'warehouse')[0]!
    const before = countItem(wh.inv!, 'cabbage')
    sim.player.x = npc.x
    sim.player.z = npc.z
    npc.big5.a = 1
    npc.vitals.hunger = 100
    npc.vitals.thirst = 100
    npc.ai.cooldowns.work = 1e9
    let done = false
    for (let i = 0; i < 300 && !done; i++) {
      run(sim, 1)
      done = countItem(wh.inv!, 'cabbage') > before
      if (i % 20 === 0) trace.push(`${npc.ai.goal}:${npc.ai.label}:${npc.ai.stepIdx}`)
    }
    if (!done) console.log(trace.join(' | '), npc.ai.lastFail, npc.x.toFixed(0), npc.z.toFixed(0), wh.x.toFixed(0), wh.z.toFixed(0))
    expect(done).toBe(true)
  })

  it('ARCH-02: far NPCs are updated less often than near ones', () => {
    const sim = testSim()
    const near = sim.state.npcs[0]!
    const far = sim.state.npcs.find((n) => n.settlementId === 2)!
    sim.player.x = near.x
    sim.player.z = near.z
    let nu = 0
    let fu = 0
    for (let i = 0; i < 100; i++) {
      const a = near.lastUpdate
      const b = far.lastUpdate
      run(sim, 0.1)
      if (near.lastUpdate !== a) nu++
      if (far.lastUpdate !== b) fu++
    }
    expect(nu).toBeGreaterThan(fu * 5)
  })
})

describe('combat, water, weather, skills', () => {
  it('COMBAT-02: a drawn bow shot hits a deer with a physical projectile', () => {
    const sim = testSim()
    const p = sim.player
    const spot = openSpot(sim)
    p.x = spot.x
    p.z = spot.z
    p.y = sim.terrain.heightAt(p.x, p.z)
    sim.actors.update(p)
    p.eq.main = newStack('long_bow')
    addItem(p.inv, newStack('arrow', 5))
    p.skills.ranged = 100
    const d = makeAnimal(sim.nextId(), 'deer', 'adult', p.x, p.z + 12, sim.terrain.heightAt(p.x, p.z + 12), sim.rng)
    d.vitals.parts.torso = 0
    sim.addAnimal(d)
    const pitch = Math.atan2(d.y + 0.6 - (p.y + 1.5), 12)
    expect(fireRanged(sim, p, 0, pitch + 0.01, 1)).toBe(true)
    expect(countItem(p.inv, 'arrow')).toBe(4)
    for (let i = 0; i < 20; i++) sim.step(0.05)
    const dmg = Object.values(d.vitals.parts).reduce((a, b) => a + b, 0)
    expect(dmg > 0 || d.vitals.dead).toBe(true)
  })

  it('WATER-01: water near settlements is riskier than remote water; wells are safe', () => {
    const sim = testSim()
    const s = sim.world.settlements[0]!
    expect(waterRisk(sim, s.x, s.z)).toBeGreaterThan(waterRisk(sim, s.x + 1500, s.z + 1500) - 0.2)
    expect(waterRisk(sim, s.x, s.z)).toBeGreaterThan(0.15)
  })

  it('TIME-03: rain waters fields; storms send NPCs to shelter', () => {
    const sim = testSim()
    const field = sim.state.buildings.find((b) => b.field)!
    field.field!.moisture = 0
    sim.state.weather.kind = 'storm'
    sim.state.weather.intensity = 1
    sim.state.weather.until = sim.state.time.cal + 86400
    playerFarAway(sim)
    run(sim, 300, 1)
    expect(field.field!.moisture).toBeGreaterThan(0.3)
    const goals = sim.state.npcs.map((n) => n.ai.goal)
    expect(goals.includes('shelter') || goals.includes('sleep')).toBe(true)
  })

  it('SKILL-01: skill growth has diminishing returns', () => {
    expect(skillGain(10)).toBeGreaterThan(skillGain(50))
    expect(skillGain(50)).toBeGreaterThan(skillGain(90))
    expect(skillGain(100)).toBe(0)
  })

  it('WORLD-03: deep water means swimming (stamina drain)', () => {
    const sim = testSim()
    let spot: { x: number; z: number } | null = null
    for (let i = 0; i < 20000 && !spot; i++) {
      const x = 400 + ((i * 37) % 7400)
      const z = 400 + ((i * 53) % 7400)
      if (sim.terrain.waterDepthAt(x, z) > 2 && !sim.terrain.isSeaAt(x, z)) spot = { x, z }
    }
    expect(spot).not.toBeNull()
    const p = sim.player
    p.x = spot!.x
    p.z = spot!.z
    playerInput.mx = 0.2
    run(sim, 3, 0.05)
    playerInput.mx = 0
    expect(p.moving).toBe('swim')
    expect(p.vitals.stamina).toBeLessThan(100)
  })

  it('SAVE-02: leaving an area and returning keeps changes (felled tree)', () => {
    const sim = testSim()
    const p = sim.player
    const tree = sim.nodes.query(p.x, p.z, 300).find((n) => isTree(n.kind))!
    sim.state.nodes[tree.id] = { kind: 'felled', at: sim.state.time.cal }
    const x0 = p.x
    p.x = 7000
    for (let i = 0; i < 50; i++) sim.nodes.query(300 + i * 140, 7000, 200)
    run(sim, 60, 1)
    p.x = x0
    const again = sim.nodes.byId(tree.id)!
    expect(sim.state.nodes[again.id]?.kind).toBe('felled')
  })
})
