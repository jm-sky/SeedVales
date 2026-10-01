/**
 * Survival follow-up (plan survival--001): waterskin recipes, campfire fuel, stone hearth, standing torch.
 */
import { describe, expect, it } from 'vitest'
import type { Sim } from './sim'
import type { Building } from './types'
import { FIRE, TORCH } from '../config/calibration'
import { itemDef } from '../data/items'
import { blueprintById, recipeById } from '../data/recipes'
import { roundTrip } from '../save/snapshot'
import { applyBuildProgress, placeSite } from './build'
import { completeCraft } from './craft'
import { fireNear } from './fauna/perception'
import { addFuelFromPack, burnGroundTorch, dismantleHearth, fireLevel, lightFire, npcFeedFire, plantTorch, torchBurnH } from './fire'
import { runOption, targetOptions } from './interact'
import { addItem, countItem, newStack } from './inventory'
import { feedFirePlan } from './npc/duties'
import { settlementBuildings } from './npc/queries'
import { playerFarAway, run, testSim } from './testWorld'
import { bleedAt, smellTrace, traceSystem } from './traces'

/** Builds a player campfire/hearth by the real build path (materials in the pack, one work call). */
function build(sim: Sim, bpId: string): Building {
  const p = sim.player
  const bp = blueprintById(bpId)!
  for (const m of bp.materials) addItem(p.inv, newStack(m.item, m.qty))
  const x = p.x + 5
  const z = p.z + 5
  const r = placeSite(sim, bpId, x, z, 0)
  expect(r.ok, r.msg).toBe(true)
  const site = sim.state.sites[sim.state.sites.length - 1]!
  addItem(p.inv, newStack('flint', 1))
  for (const m of bp.materials) site.delivered[m.item] = m.qty
  for (const m of bp.materials) addItem(p.inv, newStack(m.item, 0)) // no-op, keeps the pack tidy
  p.inv.items = p.inv.items.filter((i) => i.qty > 0 && !(bp.materials.some((m) => m.item === i.id)))
  applyBuildProgress(sim, site.id, 1e6)
  return sim.state.buildings[sim.state.buildings.length - 1]!
}

const H = 150 // gameplay seconds per calendar hour (24x)

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

describe('survival: campfire fuel (FIRE-01)', () => {
  it('FIRE-01: a campfire costs 3 branches, starts lit on that fuel and is not a hearth', () => {
    expect(blueprintById('campfire')!.materials).toEqual([{ item: 'branch', qty: 3 }])
    const sim = testSim()
    playerFarAway(sim)
    const b = build(sim, 'campfire')
    expect(b.kind).toBe('campfire')
    expect(b.hearth).toBe(false)
    expect(b.lit).toBe(true)
    expect(b.fuel).toBeCloseTo(FIRE.starterBranches * FIRE.branchH)
  })

  it('FIRE-01: a plain campfire burns out in calendar time, is removed and leaves ash that fades (also faster in rain)', () => {
    const sim = testSim()
    playerFarAway(sim)
    const b = build(sim, 'campfire')
    const id = b.id
    run(sim, (b.fuel! - 0.5) * H, 1)
    expect(sim.building(id)?.lit).toBe(true)
    expect(sim.building(id)!.fuel!).toBeLessThan(FIRE.starterBranches * FIRE.branchH)
    run(sim, H, 1)
    expect(sim.building(id)).toBeUndefined()
    const ash = sim.tracesNear(b.x, b.z, 2).filter((t) => t.kind === 'ash')
    expect(ash.length).toBe(1)
    expect(sim.tracesNear(b.x, b.z, 2).filter((t) => t.kind !== 'ash')).toEqual([])
    // Fades over ~12 h in dry weather, but not before 6 h.
    sim.state.weather.kind = 'clear'
    traceSystem(sim, 6 * H)
    expect(ash[0]!.intensity).toBeGreaterThan(0.3)
    traceSystem(sim, 7 * H)
    expect(sim.tracesNear(b.x, b.z, 2).length).toBe(0)
    // Rain clears it much faster.
    const sim2 = testSim()
    sim2.state.weather.kind = 'rain'
    sim2.state.weather.intensity = 1
    sim2.addTrace({ id: sim2.nextId(), x: 1, z: 1, kind: 'ash', intensity: 1, at: 0 })
    traceSystem(sim2, 5 * H)
    expect(sim2.tracesNear(1, 1, 2).length).toBe(0)
  })

  it('FIRE-01: ash does not merge with blood and predators do not smell it', () => {
    const sim = testSim()
    sim.addTrace({ id: sim.nextId(), x: 500, z: 500, kind: 'ash', intensity: 1, at: 0 })
    expect(smellTrace(sim, 505, 500)).toBeNull()
    bleedAt(sim, 500, 500, 10)
    const near = sim.tracesNear(500, 500, 3)
    expect(near.length).toBe(2)
    expect(near.find((t) => t.kind !== 'ash')).toBeDefined()
  })

  it('FIRE-01: fuel is capped; leftover fuel stays in the pack (conservation)', () => {
    const sim = testSim()
    const p = sim.player
    p.inv.items = p.inv.items.filter((i) => i.id !== 'branch' && i.id !== 'log')
    const b = { id: 'x', kind: 'campfire', x: 0, z: 0, rot: 0, hw: 1, hd: 1, settlementId: -1, durability: 100, owner: 'player', lit: true, fuel: 1 } as Building
    addItem(p.inv, newStack('branch', 100))
    const r = addFuelFromPack(p, b)
    expect(r.ok).toBe(true)
    expect(b.fuel!).toBeLessThanOrEqual(FIRE.fuelCapH)
    expect(b.fuel!).toBeGreaterThan(FIRE.fuelCapH - FIRE.branchH)
    const burned = Math.round((b.fuel! - 1) / FIRE.branchH)
    expect(countItem(p.inv, 'branch')).toBe(100 - burned)
    expect(addFuelFromPack(p, b).ok).toBe(false)
  })

  it('FIRE-01: fireLevel rises with fuel, shrinks as it burns and is 0 once out', () => {
    const mk = (fuel: number, lit = true) => ({ lit, fuel }) as Building
    expect(fireLevel(mk(0))).toBe(0)
    expect(fireLevel(mk(5, false))).toBe(0)
    const levels = [0.2, 1, 3, 6, 12, 24].map((f) => fireLevel(mk(f)))
    for (let i = 1; i < levels.length; i++) expect(levels[i]!).toBeGreaterThanOrEqual(levels[i - 1]!)
    expect(levels[0]!).toBeGreaterThanOrEqual(FIRE.levelMin)
    expect(levels[levels.length - 1]!).toBe(1)
  })

  it('FIRE-01: lighting needs starter fuel (3 branches) from the pack', () => {
    const sim = testSim()
    const p = sim.player
    const b = { lit: false, fuel: 0 } as Building
    p.inv.items = p.inv.items.filter((i) => i.id !== 'branch')
    addItem(p.inv, newStack('branch', 2))
    expect(lightFire(p, b).ok).toBe(false)
    expect(b.lit).toBe(false)
    addItem(p.inv, newStack('branch', 5))
    expect(lightFire(p, b).ok).toBe(true)
    expect(b.lit).toBe(true)
    expect(b.fuel).toBeCloseTo(FIRE.starterBranches * FIRE.branchH)
    expect(countItem(p.inv, 'branch')).toBe(7 - FIRE.starterBranches)
  })
})

describe('survival: stone hearth (FIRE-02)', () => {
  it('FIRE-02: settlement fires are hearths lit at generation', () => {
    const sim = testSim()
    const fires = sim.state.buildings.filter((b) => b.kind === 'campfire')
    expect(fires.length).toBeGreaterThan(0)
    for (const f of fires) {
      expect(f.hearth).toBe(true)
      expect(f.lit).toBe(true)
      expect(f.fuel).toBeGreaterThan(0)
    }
  })

  it('FIRE-02: a hearth stays when its fire dies, is relit with fuel and is dismantled for its stones', () => {
    const sim = testSim()
    playerFarAway(sim)
    const b = build(sim, 'hearth')
    expect(b.hearth).toBe(true)
    expect(b.lit).toBe(false)
    expect(countItem(sim.player.inv, 'stone')).toBe(0)
    sim.player.inv.items = sim.player.inv.items.filter((i) => i.id !== 'branch')
    addItem(sim.player.inv, newStack('branch', 3))
    expect(lightFire(sim.player, b).ok).toBe(true)
    expect(dismantleHearth(sim, sim.player, b).ok).toBe(false) // still burning
    run(sim, (b.fuel! + 1) * H, 1)
    expect(sim.building(b.id)).toBe(b)
    expect(b.lit).toBe(false)
    expect(sim.tracesNear(b.x, b.z, 2).filter((t) => t.kind === 'ash').length).toBe(0)
    addItem(sim.player.inv, newStack('branch', 3))
    expect(lightFire(sim.player, b).ok).toBe(true)
    b.lit = false
    sim.player.inv.items = sim.player.inv.items.filter((i) => i.id !== 'stone')
    expect(dismantleHearth(sim, sim.player, b).ok).toBe(true)
    expect(sim.building(b.id)).toBeUndefined()
    expect(countItem(sim.player.inv, 'stone')).toBe(FIRE.hearthStones)
  })

  function settlementFire(sim: Sim) {
    const guard = sim.state.npcs.find((n) => n.profession === 'guard')!
    const fire = settlementBuildings(sim, guard.settlementId, 'campfire')[0]!
    const wh = sim.building(sim.state.settlements[guard.settlementId]!.warehouseId)!
    return { guard, fire, wh }
  }

  it('FIRE-02: the guard keeps a stocked settlement fire burning from the warehouse branches', () => {
    const sim = testSim()
    const { guard, fire, wh } = settlementFire(sim)
    sim.player.x = guard.x + 3
    sim.player.z = guard.z
    fire.fuel = 1
    const branches = countItem(wh.inv!, 'branch') + countItem(wh.inv!, 'log')
    guard.vitals.hunger = guard.vitals.thirst = guard.vitals.vigor = 100
    // The woodcutter may restock the warehouse during the run, so watch for the withdrawal (the sink) itself.
    let lowest = branches
    for (let k = 0; k < 20; k++) {
      run(sim, 30, 0.5)
      lowest = Math.min(lowest, countItem(wh.inv!, 'branch') + countItem(wh.inv!, 'log'))
    }
    expect(fire.lit).toBe(true)
    expect(fire.fuel!).toBeGreaterThan(FIRE.tendBelowH * 0.6)
    expect(lowest).toBeLessThan(branches) // the sink
  })

  it('FIRE-02: without a guard another settler tends the fire; an unstocked fire goes out', () => {
    const sim = testSim()
    const { guard, fire, wh } = settlementFire(sim)
    guard.profession = undefined
    guard.age = 'child'
    const others = sim.npcsOf(guard.settlementId).filter((n) => n !== guard && n.age === 'adult' && !n.companion)
    expect(others.length).toBeGreaterThan(0)
    for (const n of others) {
      n.big5.c = 1
      n.vitals.hunger = n.vitals.thirst = n.vitals.vigor = 100
    }
    sim.player.x = fire.x + 5
    sim.player.z = fire.z
    fire.fuel = 1
    run(sim, 900, 0.5)
    expect(fire.fuel!).toBeGreaterThan(FIRE.fallbackBelowH)
    // Nothing in the stores: nobody can feed it, so it dies and stays a cold hearth.
    wh.inv!.items = wh.inv!.items.filter((i) => i.id !== 'branch' && i.id !== 'log')
    for (const n of others) n.inv.items = n.inv.items.filter((i) => i.id !== 'branch' && i.id !== 'log')
    for (const n of others) if (n.profession === 'woodcutter') n.profession = undefined // nobody restocks the stores meanwhile
    fire.fuel = 0.2
    run(sim, 300, 0.5)
    expect(fire.lit).toBe(false)
    expect(sim.building(fire.id)).toBe(fire)
  })

  it('FIRE-02: two NPCs never fetch fuel for the same fire at once (reservation)', () => {
    const sim = testSim()
    const { guard, fire } = settlementFire(sim)
    const other = sim.npcsOf(guard.settlementId).find((n) => n !== guard && n.age === 'adult')!
    fire.fuel = 0.5
    expect(feedFirePlan(sim, guard, FIRE.tendBelowH)).not.toBeNull()
    expect(feedFirePlan(sim, other, FIRE.tendBelowH)).toBeNull()
    expect(feedFirePlan(sim, guard, FIRE.tendBelowH)).not.toBeNull() // the holder keeps it
    sim.state.time.cal += FIRE.tendHoldCalS + 1 // reservation expires
    expect(feedFirePlan(sim, other, FIRE.tendBelowH)).not.toBeNull()
  })
})

describe('survival: standing torch (FIRE-03)', () => {
  const plant = (sim: Sim, held = false) => {
    const p = sim.player
    p.inv.items = p.inv.items.filter((i) => i.id !== 'torch')
    p.eq.off = undefined
    addItem(p.inv, newStack('torch', 1))
    if (held) {
      p.eq.off = p.inv.items.find((i) => i.id === 'torch')!
      p.inv.items = p.inv.items.filter((i) => i.id !== 'torch')
    }
    expect(plantTorch(sim, p).ok).toBe(true)
    return sim.state.ground.find((g) => g.planted)!
  }

  it('FIRE-03: plant a torch from the pack (unlit) or the hand (lit); light, extinguish and pick it up', () => {
    const sim = testSim()
    playerFarAway(sim)
    const g = plant(sim)
    expect(g.lit).toBeFalsy()
    expect(g.burnH).toBeCloseTo(TORCH.burnH)
    expect(countItem(sim.player.inv, 'torch')).toBe(0)
    expect(runOption(sim, { type: 'ground', id: g.id }, 'light_planted')).toMatch(/flares/)
    expect(g.lit).toBe(true)
    expect(fireNear(sim, g.x, g.z, 5)).toBe(g)
    runOption(sim, { type: 'ground', id: g.id }, 'douse_planted')
    expect(g.lit).toBe(false)
    expect(fireNear(sim, g.x, g.z, 5)).toBeNull()
    runOption(sim, { type: 'ground', id: g.id }, 'pickup')
    expect(sim.state.ground.includes(g)).toBe(false)
    expect(countItem(sim.player.inv, 'torch')).toBe(1)
    const held = plant(sim, true)
    expect(held.lit).toBe(true)
  })

  it('FIRE-03: a torch burns only while lit; extinguishing and relighting keeps the remaining time, pickup keeps it too', () => {
    const sim = testSim()
    playerFarAway(sim)
    const g = plant(sim)
    run(sim, 2 * H, 1)
    expect(g.burnH).toBeCloseTo(TORCH.burnH)
    g.lit = true
    run(sim, 2 * H, 1)
    expect(g.burnH!).toBeCloseTo(TORCH.burnH - 2, 0)
    g.lit = false
    run(sim, 3 * H, 1)
    const left = g.burnH!
    expect(left).toBeGreaterThan(2.5)
    expect(left).toBeLessThan(3.5)
    runOption(sim, { type: 'ground', id: g.id }, 'pickup')
    const t = sim.player.inv.items.find((i) => i.id === 'torch')!
    expect(torchBurnH(t)).toBeCloseTo(left, 0)
  })

  it('FIRE-03: a torch burns out and takes its light and fear effect with it; a thrown torch does too', () => {
    const sim = testSim()
    playerFarAway(sim)
    const g = plant(sim, true)
    const x = g.x
    const z = g.z
    addItem(sim.player.inv, newStack('torch', 1))
    sim.player.eq.off = sim.player.inv.items.find((i) => i.id === 'torch')
    sim.player.inv.items = sim.player.inv.items.filter((i) => i.id !== 'torch')
    const thrown = { ...sim.player.eq.off! }
    sim.player.eq.off = undefined
    sim.addGround({ id: sim.nextId(), x: x + 3, z, stack: thrown, droppedAt: 0, lit: true, burnH: torchBurnH(thrown) })
    expect(fireNear(sim, x, z, 10)).not.toBeNull()
    run(sim, (TORCH.burnH + 0.5) * H, 1)
    expect(sim.state.ground.filter((q) => q.stack.id === 'torch')).toEqual([])
    expect(fireNear(sim, x, z, 10)).toBeNull()
    expect(burnGroundTorch({ lit: false, stack: newStack('torch') } as never, 1)).toBe(false)
  })

  it('FIRE-03: burn time and the planted flag survive a save round trip', () => {
    const sim = testSim()
    playerFarAway(sim)
    const g = plant(sim)
    g.lit = true
    g.burnH = 3.25
    const st = roundTrip(sim)
    const saved = st.ground.find((q) => q.id === g.id)!
    expect(saved.burnH).toBe(3.25)
    expect(saved.planted).toBe(true)
    expect(saved.lit).toBe(true)
  })
})

describe('survival: review 010 triage', () => {
  const nearestWarehouse = (sim: Sim) => sim.state.buildings.find((b) => b.kind === 'warehouse' && b.settlementId === 0)!

  it('FIRE-02: a hearth the player builds beside a settlement is not tended or fed from the warehouse (review 010 #1)', () => {
    const sim = testSim()
    const wh = nearestWarehouse(sim)
    sim.player.x = wh.x + 20
    sim.player.z = wh.z
    const mine = build(sim, 'hearth')
    expect(mine.settlementId).toBe(0)
    const guard = sim.state.npcs.find((n) => n.profession === 'guard' && n.settlementId === 0)!
    for (const f of settlementBuildings(sim, 0, 'campfire')) if (f !== mine) f.fuel = 20 // the settlement's own fire needs nothing
    const stock = countItem(wh.inv!, 'branch') + countItem(wh.inv!, 'log')
    expect(feedFirePlan(sim, guard, FIRE.tendBelowH)).toBeNull()
    run(sim, 300, 0.5)
    expect(mine.lit).toBe(false)
    expect(countItem(wh.inv!, 'branch') + countItem(wh.inv!, 'log')).toBe(stock)
  })

  it('FIRE-02: only the player\'s own hearth can be dismantled for stones, never a settlement hearth (review 010 #2)', () => {
    const sim = testSim()
    const fire = settlementBuildings(sim, 0, 'campfire')[0]!
    fire.lit = false
    fire.fuel = 0
    const opts = targetOptions(sim, { type: 'building', id: fire.id }).map((o) => o.id)
    expect(opts).not.toContain('dismantle_hearth')
    expect(dismantleHearth(sim, sim.player, fire).ok).toBe(false)
    expect(sim.building(fire.id)).toBe(fire)
  })

  it('FIRE-03: picking up a worn torch does not wear the fresh torches in the pack (review 010 #3)', () => {
    const sim = testSim()
    playerFarAway(sim)
    const p = sim.player
    p.inv.items = p.inv.items.filter((i) => i.id !== 'torch')
    p.eq.off = undefined
    addItem(p.inv, newStack('torch', 2))
    expect(plantTorch(sim, p).ok).toBe(true)
    const g = sim.state.ground.find((q) => q.planted)!
    g.burnH = 0.5
    runOption(sim, { type: 'ground', id: g.id }, 'pickup')
    const burns = p.inv.items.filter((i) => i.id === 'torch').map((i) => [torchBurnH(i), i.qty])
    expect(burns).toContainEqual([TORCH.burnH, 1])
    expect(burns.some(([h]) => Math.abs(h! - 0.5) < 0.1)).toBe(true)
  })

  it('FIRE-01: a lit fire can be put out by the player (review 010 #5)', () => {
    const sim = testSim()
    const fire = settlementBuildings(sim, 0, 'campfire')[0]!
    expect(targetOptions(sim, { type: 'building', id: fire.id }).map((o) => o.id)).toContain('douse_fire')
    runOption(sim, { type: 'building', id: fire.id }, 'douse_fire')
    expect(fire.lit).toBe(false)
    expect(fire.fuel!).toBeGreaterThan(0) // the fuel stays; it can be lit again
  })

  it('FIRE-02: feeding a fire someone else just topped up is not a failed job (review 010 #6)', () => {
    const sim = testSim()
    const guard = sim.state.npcs.find((n) => n.profession === 'guard')!
    const fire = settlementBuildings(sim, guard.settlementId, 'campfire')[0]!
    fire.fuel = FIRE.fuelCapH
    fire.lit = true
    addItem(guard.inv, newStack('branch', 3))
    expect(npcFeedFire(guard, fire)).toBe(true)
  })

  it('FIRE-02: settlement hearths stay lit for days from the stores plus the settlers\' own firewood (review 010 #7)', () => {
    const sim = testSim()
    playerFarAway(sim)
    const fires = sim.state.buildings.filter((b) => b.kind === 'campfire' && b.hearth)
    let litSamples = 0
    let samples = 0
    for (let h = 0; h < 72; h += 1) {
      run(sim, H, 5)
      for (const f of fires) {
        samples++
        if (f.lit) litSamples++
      }
    }
    expect(litSamples / samples).toBeGreaterThan(0.6)
  })

  it('FIRE-01: the player is told when a nearby campfire burns out (review 010 #4)', () => {
    const sim = testSim()
    playerFarAway(sim)
    const b = build(sim, 'campfire')
    run(sim, (b.fuel! + 0.5) * H, 1)
    expect(sim.building(b.id)).toBeUndefined()
    expect(sim.state.messages.some((m) => /burnt out/i.test(m.text))).toBe(true)
  })
})
