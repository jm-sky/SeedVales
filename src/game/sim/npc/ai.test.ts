import { describe, expect, it } from 'vitest'
import { COMBAT } from '../../config/calibration'
import { isDown } from '../combat'
import { findFood } from '../inventory'
import { steerTo } from '../movement'
import { run, testSim } from '../testWorld'
import { hp } from '../vitals'
import { updateNpc } from './ai'
import { doorOf, houseOf, settlementBuildings } from './queries'

describe('NPC AI', () => {
  it('thirsty NPC drinks and returns to duties', () => {
    const sim = testSim()
    const npc = sim.state.npcs.find((n) => n.profession === 'woodcutter')!
    npc.vitals.thirst = 5
    // Move the player next to the NPC so it runs at full LOD.
    sim.player.x = npc.x + 3
    sim.player.z = npc.z
    const goals: string[] = []
    for (let i = 0; i < 600; i++) {
      run(sim, 1)
      if (npc.ai.goal && goals[goals.length - 1] !== npc.ai.goal) goals.push(npc.ai.goal)
      if (npc.vitals.thirst > 50 && goals.includes('work')) break
    }
    expect(goals[0]).toBe('drink')
    expect(npc.vitals.thirst).toBeGreaterThan(40)
    expect(goals).toContain('work')
  })

  it('missing resource does not cause an endless loop (goal gets cooled down)', () => {
    const sim = testSim()
    const npc = sim.state.npcs.find((n) => n.profession === 'farmer')!
    npc.vitals.hunger = 5
    const house = houseOf(sim, npc)!
    house.inv!.items = []
    npc.inv.items = npc.inv.items.filter((s) => !findFood({ items: [s] }))
    npc.money = 0
    const wh = settlementBuildings(sim, npc.settlementId, 'warehouse')[0]!
    wh.inv!.items = []
    let plans = 0
    let prevGoal: string | null = null
    for (let i = 0; i < 200; i++) {
      run(sim, 1)
      if (npc.ai.goal !== prevGoal) plans++
      prevGoal = npc.ai.goal
    }
    // Eat must be on cooldown and the NPC doing something else, not flapping each second.
    expect(npc.ai.cooldowns.eat ?? 0).toBeGreaterThan(0)
    expect(plans).toBeLessThan(60)
  })

  it('woodcutter fells a real tree and stores logs', () => {
    const sim = testSim()
    const npc = sim.state.npcs.find((n) => n.profession === 'woodcutter')!
    const house = houseOf(sim, npc)!
    house.inv!.items = house.inv!.items.filter((s) => s.id !== 'log')
    npc.vitals.thirst = 100
    npc.vitals.hunger = 100
    npc.vitals.vigor = 100
    npc.big5.c = 1
    sim.state.time.cal = 2 * 86400 + 9 * 3600
    const felledBefore = Object.values(sim.state.nodes).filter((n) => n.kind === 'felled').length
    run(sim, 900, 0.25)
    const felled = Object.values(sim.state.nodes).filter((n) => n.kind === 'felled').length
    expect(felled).toBeGreaterThan(felledBefore)
  })

  it('NPC-07: a downed NPC stays protected while HP ≤ 0 and dies below the threshold from bleeding too', () => {
    const sim = testSim()
    const npc = sim.state.npcs.find((n) => n.age === 'adult')!
    npc.vitals.parts.torso = npc.vitals.maxHp + 5 // hp ≈ −5
    npc.vitals.ko = { until: sim.state.time.play + 60, protectUntil: sim.state.time.play + 60 }
    npc.vitals.bleeding = 0
    npc.vitals.hunger = npc.vitals.thirst = 10 // no regen
    sim.state.time.play += 120
    updateNpc(sim, npc, 0.1, false)
    expect(isDown(sim, npc)).toBe(true) // protection did not lapse after the 60 s timer
    expect(npc.vitals.dead).toBeFalsy()
    npc.vitals.parts.torso = npc.vitals.maxHp - COMBAT.npcDeathHp + 1 // below the death threshold without a hit
    updateNpc(sim, npc, 0.1, false)
    expect(npc.vitals.dead).toBe(true)
  })

  it('NPC-07: HP reaching 0 without a hit (bleeding) brings the NPC down', () => {
    const sim = testSim()
    const npc = sim.state.npcs.find((n) => n.age === 'adult')!
    npc.vitals.parts.torso = npc.vitals.maxHp + 1
    expect(hp(npc.vitals)).toBeLessThanOrEqual(0)
    updateNpc(sim, npc, 0.1, false)
    expect(npc.vitals.ko).toBeDefined()
    expect(npc.callForHelpAt).toBe(sim.state.time.play)
  })

  it('NPC-02: an NPC behind its house walks around it to the door (building detour, no stuck)', () => {
    const sim = testSim()
    const npc = sim.state.npcs.find((n) => n.age === 'adult')!
    const house = houseOf(sim, npc)!
    const door = doorOf(house)
    // Bystanders are frozen in this unit test (not updated) — move them out of the way.
    for (const o of sim.actors.query(house.x, house.z, 20)) {
      if (o === npc || o.kind === 'player') continue
      o.x += 60
      sim.actors.update(o)
    }
    // Behind the house: opposite the door side.
    npc.x = house.x - Math.sin(house.rot) * (house.hd + 2)
    npc.z = house.z - Math.cos(house.rot) * (house.hd + 2)
    sim.actors.update(npc)
    let r = 'moving'
    let t = 0
    for (; t < 60 && r === 'moving'; t += 0.1) r = steerTo(sim, npc, door.x, door.z, 1.5, 0.1, 1, true)
    expect(r).toBe('arrived')
    expect(t).toBeLessThan(30)
  })
})
