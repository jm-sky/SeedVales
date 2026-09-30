/**
 * UI-04: map waypoint, quest goal, visited settlements and minimap bearing (plan ui--001 step 3).
 */
import { describe, expect, it } from 'vitest'
import { roundTrip } from '../save/snapshot'
import { bearing, clearWaypoint, isVisited, navGoal, navigationSystem, setWaypoint } from './navigation'
import { testSim } from './testWorld'

describe('UI-04 navigation', () => {
  it('bearing is 0 straight ahead, positive to the right, ±π behind', () => {
    const o = { x: 0, z: 0 }
    expect(bearing(o, { x: 0, z: 10 }, 0)).toEqual({ dist: 10, rel: 0 })
    expect(bearing(o, { x: 10, z: 0 }, 0).rel).toBeCloseTo(Math.PI / 2)
    expect(Math.abs(bearing(o, { x: 0, z: -10 }, 0).rel)).toBeCloseTo(Math.PI)
    expect(bearing(o, { x: 10, z: 0 }, Math.PI / 2).rel).toBeCloseTo(0)
  })

  it('waypoint wins over an active quest, is saved, and is cleared when reached', () => {
    const sim = testSim()
    expect(navGoal(sim)).toBeNull()
    sim.state.quests.push({ id: 'q', kind: 'wolves', title: 'Wilki', desc: '', settlementId: 1, giverId: 0, status: 'active', reward: 1, createdAt: 0, killsNeeded: 2, kills: 0 })
    const s1 = sim.world.settlements[1]!
    expect(navGoal(sim)).toMatchObject({ kind: 'quest', x: s1.x, z: s1.z })
    setWaypoint(sim, sim.player.x + 100, sim.player.z, 'Wzgórze')
    expect(navGoal(sim)).toMatchObject({ kind: 'waypoint', label: 'Wzgórze' })
    expect(roundTrip(sim).px.waypoint?.label).toBe('Wzgórze')
    sim.player.x += 95
    navigationSystem(sim)
    expect(sim.state.px.waypoint).toBeUndefined()
    expect(navGoal(sim)?.kind).toBe('quest')
    setWaypoint(sim, -50, 1e6)
    expect(sim.state.px.waypoint).toMatchObject({ x: 0, z: sim.world.size })
    clearWaypoint(sim)
    expect(sim.state.px.waypoint).toBeUndefined()
  })

  it('marks a settlement visited when the player reaches it', () => {
    const sim = testSim()
    const far = sim.world.settlements.find((s) => Math.hypot(s.x - sim.player.x, s.z - sim.player.z) > 1000)!
    navigationSystem(sim)
    expect(isVisited(sim, far.id)).toBe(false)
    expect(sim.state.px.visited?.length).toBeGreaterThan(0) // start settlement
    sim.player.x = far.x
    sim.player.z = far.z
    navigationSystem(sim)
    expect(isVisited(sim, far.id)).toBe(true)
  })
})
