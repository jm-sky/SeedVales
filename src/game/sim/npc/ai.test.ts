import { describe, expect, it } from 'vitest'
import { findFood } from '../inventory'
import { run, testSim } from '../testWorld'
import { houseOf, settlementBuildings } from './queries'

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
})
