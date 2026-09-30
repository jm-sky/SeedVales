/**
 * More rule-level checks for FEATURES.json (IDs in names).
 */
import { describe, expect, it } from 'vitest'
import { WOOL_REGROW_DAYS } from '../config/calibration'
import { perf } from '../diag/perf'
import { isTree, NodeCache } from '../world/nodes'
import { consume, mineRock } from './actions'
import { placeSite } from './build'
import { applyDamage } from './combat'
import { addItem, countItem, newStack } from './inventory'
import { makeAnimal } from './newGame'
import { houseOf } from './npc/queries'
import { WORK_ACTS } from './npc/works'
import { playerInput, startActivity } from './player'
import { questSystem } from './quests'
import { playerFarAway, run, testSim } from './testWorld'
import { buyPrice, tradeInventory } from './trade'
import { hp } from './vitals'

describe('more features', () => {
  it('WORLD-08: autopilot walks the player along the road (no teleport)', () => {
    const sim = testSim()
    const r = sim.world.roads[0]!
    const p = sim.player
    p.x = r.points[5]!.x
    p.z = r.points[5]!.z
    sim.actors.update(p)
    sim.state.px.autopilot = { roadId: r.id, idx: 6, dir: 1 }
    const x0 = p.x
    const z0 = p.z
    let maxStep = 0
    for (let i = 0; i < 300; i++) {
      const bx = p.x
      const bz = p.z
      run(sim, 0.1, 0.1)
      maxStep = Math.max(maxStep, Math.hypot(p.x - bx, p.z - bz))
    }
    expect(Math.hypot(p.x - x0, p.z - z0)).toBeGreaterThan(20)
    expect(maxStep).toBeLessThan(1.5) // physical movement only
    expect(sim.timeScale).toBe(3)
  })

  it('SET-03: NPC repairs its own worn house', () => {
    const sim = testSim()
    const npc = sim.state.npcs.find((n) => n.profession === 'woodcutter' && n.age === 'adult')!
    const house = houseOf(sim, npc)!
    house.durability = 30
    npc.big5.c = 1
    npc.ai.cooldowns.work = 1e9
    npc.vitals.hunger = npc.vitals.thirst = 100
    sim.player.x = npc.x
    sim.player.z = npc.z
    sim.state.time.cal = Math.floor(sim.state.time.cal / 86400) * 86400 + 10 * 3600
    run(sim, 120, 0.2)
    expect(house.durability).toBeGreaterThan(50)
  })

  it('NPC-04: professions perform their duties (acts executed over a working day)', () => {
    const sim = testSim()
    const s = sim.world.settlements[1]! // MD: has blacksmith, trader, farmers…
    sim.player.x = s.x
    sim.player.z = s.z
    sim.state.time.cal = Math.floor(sim.state.time.cal / 86400) * 86400 + 6 * 3600
    for (const f of sim.state.buildings) if (f.field && f.settlementId === 1) f.field.growth = 0.97
    for (const t of sim.state.buildings) if (t.kind === 'torchpost') t.lit = false
    perf.reset()
    run(sim, 150 * 16, 0.5)
    const c = perf.report().counters
    const acts = Object.keys(c).filter((k) => k.startsWith('ai.act.')).map((k) => k.slice(7))
    for (const a of ['fell', 'harvest_field', 'tend_field', 'smith', 'trade_stand', 'light_torch', 'herd']) expect(acts, `act ${a} in ${acts.join(',')}`).toContain(a)
    console.log('acts', acts.join(','), JSON.stringify(sim.state.npcs.filter((n) => n.settlementId === 1 && (n.profession === 'hunter' || n.profession === 'herbalist')).map((n) => [n.profession, n.ai.goal, n.ai.label, n.ai.lastFail, n.ai.cooldowns])))
    expect(acts.some((a) => a === 'shoot' || a === 'butcher' || a === 'dry_meat' || a === 'fletch')).toBe(true)
    expect(acts.some((a) => a === 'gather' || a === 'herb_garden')).toBe(true)
  }, 60_000)

  it('ATTR-03: carrying heavy loads slowly raises Strength', () => {
    const sim = testSim()
    const p = sim.player
    addItem(p.inv, newStack('log', 2))
    p.strTrain = 3600 * p.attrs.str - 2
    const s0 = p.attrs.str
    playerInput.mx = 1
    run(sim, 5, 0.05)
    playerInput.mx = 0
    expect(p.attrs.str).toBe(s0 + 1)
  })

  it('REP-04: individual sympathy lowers prices', () => {
    const sim = testSim()
    const t = sim.state.npcs.find((n) => n.profession === 'trader')!
    const axe = tradeInventory(sim, t)!.items.find((s) => s.id === 'axe')!
    t.opinion = -80
    const hi = buyPrice(sim, t, axe)
    t.opinion = 80
    const lo = buyPrice(sim, t, axe)
    expect(lo).toBeLessThan(hi)
  })

  it('RES-02: mining a rock needs a pickaxe, yields stone and eventually depletes', () => {
    const sim = testSim()
    const p = sim.player
    let rock = null
    for (let i = 0; i < 400 && !rock; i++) rock = sim.nodes.query(800 + i * 17, 800 + i * 13, 120).find((n) => n.kind === 'rock') ?? null
    expect(rock).not.toBeNull()
    expect(mineRock(sim, p, rock!).ok).toBe(false)
    addItem(p.inv, newStack('pickaxe'))
    let stones = 0
    for (let i = 0; i < 30; i++) if (mineRock(sim, p, rock!).ok) stones++
    expect(stones).toBeGreaterThan(2)
    expect(sim.state.nodes[rock!.id]!.kind).toBe('depleted')
  })

  it('RES-03 / WATER-02: poisonous herb causes poisoning; herbal tea and herbalist help', () => {
    const sim = testSim()
    const p = sim.player
    addItem(p.inv, newStack('hemlock'))
    consume(sim, p, p.inv.items.find((s) => s.id === 'hemlock')!)
    expect(p.vitals.illness?.kind).toBe('poison')
    const sev = p.vitals.illness!.severity
    addItem(p.inv, newStack('herbal_tea'))
    consume(sim, p, p.inv.items.find((s) => s.id === 'herbal_tea')!)
    expect(p.vitals.illness!.severity).toBeLessThan(sev)
  })

  it('ARM-01: armour layers reduce damage by type', () => {
    const sim = testSim()
    const a = sim.state.npcs.find((n) => n.age === 'adult' && n.profession !== 'guard')!
    const b = sim.state.npcs.find((n) => n.age === 'adult' && n.profession !== 'guard' && n !== a)!
    a.eq.armor = {}
    b.eq.armor = { torso_under: newStack('padded_jacket'), torso_outer: newStack('chainmail'), head_outer: newStack('iron_helm'), legs_outer: newStack('leather_trousers'), boots_outer: newStack('leather_boots'), forearms_outer: newStack('bracers'), hands_outer: newStack('leather_gloves'), shoulders_outer: newStack('pauldrons') }
    const h0a = hp(a.vitals)
    const h0b = hp(b.vitals)
    for (let i = 0; i < 20; i++) {
      applyDamage(sim, a, 3, 'cut')
      applyDamage(sim, b, 3, 'cut')
    }
    expect(h0b - hp(b.vitals)).toBeLessThan((h0a - hp(a.vitals)) * 0.6)
  })

  it('BUILD-04: building on the road draws the guard’s complaint (not forbidden)', () => {
    const sim = testSim()
    const r = sim.world.roads[0]!
    const pt = r.points[Math.floor(r.points.length / 2)]!
    sim.terrain.applyEdit(pt.x, pt.z, 5, { kind: 'level', target: sim.terrain.heightAt(pt.x, pt.z) })
    const res = placeSite(sim, 'trough', pt.x, pt.z, 0)
    expect(res.ok).toBe(true)
    expect(sim.state.messages.some((m) => m.text.includes('drodze'))).toBe(true)
  })

  it('FAUNA-02: thirsty wild animals walk to a bank to drink (never into deep water)', () => {
    const sim = testSim()
    playerFarAway(sim)
    const d = sim.state.animals.find((a) => a.species === 'deer')!
    d.thirstH = 50
    d.ai.steps = []
    let drank = false
    for (let i = 0; i < 600 && !drank; i++) {
      run(sim, 1, 1)
      drank = d.thirstH < 1
      expect(sim.terrain.waterDepthAt(d.x, d.z)).toBeLessThan(1.2)
    }
    expect(drank).toBe(true)
  })

  it('FAUNA-05: rabies spreads by bites', () => {
    const sim = testSim()
    const w = makeAnimal(sim.nextId(), 'wolf', 'adult', 0, 0, 0, sim.rng)
    w.rabid = true
    let infected = 0
    for (let i = 0; i < 60; i++) {
      const d = makeAnimal(sim.nextId(), 'deer', 'adult', 0, 0, 0, sim.rng)
      d.vitals.maxHp = 1e6
      applyDamage(sim, d, 1, 'pierce', w)
      if (d.rabid) infected++
    }
    expect(infected).toBeGreaterThan(3)
  })

  it('RES-01: a felled tree regrows after ~20 days', () => {
    const sim = testSim()
    const t = sim.nodes.query(sim.player.x, sim.player.z, 300).find((n) => isTree(n.kind))!
    sim.state.nodes[t.id] = { kind: 'felled', at: sim.state.time.cal - 21 * 86400 }
    playerFarAway(sim)
    run(sim, 70, 1)
    expect(sim.state.nodes[t.id]).toBeUndefined()
  })

  it('ARCH-03: digging next to a river does not change resource placement after cache eviction', () => {
    const sim = testSim()
    const w = sim.world
    // A land point right next to a river/lake (reeds vs trees depend on water depth there).
    let px = 0
    let pz = 0
    for (let k = 0; k < w.waterKind.length; k += 7) {
      if (!w.waterKind[k]) continue
      const x = (k % w.n) * w.cell + 6
      const z = Math.floor(k / w.n) * w.cell
      if (sim.terrain.waterDepthAt(x, z) === 0 && !sim.terrain.isSeaAt(x, z)) {
        px = x
        pz = z
        break
      }
    }
    expect(px).toBeGreaterThan(0)
    const key = (c: NodeCache) => c.query(px, pz, 40).map((n) => `${n.id}:${n.kind}:${n.x.toFixed(2)}:${n.z.toFixed(2)}`).sort().join('|')
    const before = key(new NodeCache(sim.terrain))
    for (let dx = -30; dx <= 30; dx += 6) for (let dz = -30; dz <= 30; dz += 6) sim.terrain.applyEdit(px + dx, pz + dz, 4, { kind: 'add', amount: -1.5 })
    const after = key(new NodeCache(sim.terrain)) // fresh cache = evicted chunk regenerated
    expect(after).toBe(before)
  })

  it('COMBAT-01: an attack interrupts even a short, non-accelerated activity', () => {
    const sim = testSim()
    const p = sim.player
    startActivity(sim, { kind: 'build', label: 'Budowa', total: 30 })
    const w = makeAnimal(sim.nextId(), 'wolf', 'adult', p.x + 4, p.z, p.y, sim.rng)
    sim.addAnimal(w)
    w.aggroId = p.id
    w.aggroUntil = sim.state.time.play + 30
    run(sim, 0.2)
    expect(sim.state.px.activity).toBeUndefined()
  })

  it('NPC-04: shearing takes wool only from sheep whose wool has regrown', () => {
    const sim = testSim()
    const shepherd = sim.state.npcs.find((n) => n.profession === 'shepherd' && n.age === 'adult')!
    const store = houseOf(sim, shepherd)!.inv!
    const sheep = sim.state.animals.filter((a) => a.species === 'sheep' && a.householdId === shepherd.householdId).length
    expect(sheep).toBeGreaterThan(0)
    const w0 = countItem(store, 'wool')
    expect(WORK_ACTS.shear!(sim, shepherd, undefined, 1)).toBe(true)
    expect(countItem(store, 'wool')).toBe(w0 + sheep)
    expect(WORK_ACTS.shear!(sim, shepherd, undefined, 1)).toBe(false)
    expect(countItem(store, 'wool')).toBe(w0 + sheep)
    sim.state.time.cal += (WOOL_REGROW_DAYS + 1) * 86400
    expect(WORK_ACTS.shear!(sim, shepherd, undefined, 1)).toBe(true)
  })

  it('QUEST-01: a resolved rat problem is not re-posted within a day', () => {
    const sim = testSim()
    const wh = sim.building(sim.state.settlements[0]!.warehouseId)!
    wh.ratNest = { strength: 1, since: sim.state.time.cal }
    for (let i = 0; i < 4; i++) sim.addAnimal(makeAnimal(sim.nextId(), 'rat', 'adult', wh.x + i, wh.z + 3, sim.terrain.heightAt(wh.x, wh.z), sim.rng))
    questSystem(sim)
    const n1 = sim.state.quests.filter((q) => q.kind === 'rats' && q.buildingId === wh.id).length
    expect(n1).toBe(1)
    sim.state.quests.at(-1)!.status = 'expired'
    sim.state.time.cal += 3600
    questSystem(sim)
    expect(sim.state.quests.filter((q) => q.kind === 'rats' && q.buildingId === wh.id).length).toBe(1)
    sim.state.time.cal += 86400
    questSystem(sim)
    expect(sim.state.quests.filter((q) => q.kind === 'rats' && q.buildingId === wh.id).length).toBe(2)
  })
})
