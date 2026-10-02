/** AI-01 / soak finding (verify--001): an NPC that failed to reach a water point skips it and tries another source. */
import { describe, expect, it } from 'vitest'
import { testSim } from '../testWorld'
import { badWaterKey, waterSources } from './queries'

describe('npc: unreachable water points', () => {
  it('a failed natural water point is skipped for the cooldown, then offered again', () => {
    const sim = testSim(7)
    const h = sim.state.npcs.find((n) => n.id === 20)!
    h.x = 4163
    h.z = 4482
    const first = waterSources(sim, h).find((s) => !s.wellId)
    expect(first).toBeDefined()
    h.ai.cooldowns[badWaterKey(first!.x, first!.z)] = sim.state.time.play + 150
    const next = waterSources(sim, h).find((s) => !s.wellId)
    expect(next && badWaterKey(next.x, next.z) === badWaterKey(first!.x, first!.z)).toBeFalsy()
    sim.state.time.play += 200
    const again = waterSources(sim, h).find((s) => !s.wellId)
    expect(again?.x).toBe(first!.x)
  })
})

describe('npc: hunter leash (soak finding)', () => {
  it('a hunter never plans a chase beyond the leash from the settlement', async () => {
    const { dutyPlan, HUNT_LEASH_M } = await import('./duties')
    const sim = testSim(1337)
    const hunter = sim.state.npcs.find((n) => n.profession === 'hunter')!
    const s = sim.world.settlements[hunter.settlementId]!
    const plan = dutyPlan(sim, hunter)
    const first = plan?.steps[0]
    if (plan?.label.startsWith('Hunting') && first?.op === 'goto') expect(Math.hypot(first.x - s.x, first.z - s.z)).toBeLessThan(s.radius + HUNT_LEASH_M + 1)
    expect(HUNT_LEASH_M).toBeGreaterThan(0)
  })
})
