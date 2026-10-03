import { describe, expect, it } from 'vitest'
import type { CompanionContract } from '../types'
import { testSim } from '../testWorld'
import { banterLine, CHAT_COOLDOWN_S, companionBanter } from './companionBanter'

describe('companion banter (P-11)', () => {
  it('speaks about hunger, then waits out the cooldown', () => {
    const sim = testSim()
    sim.state.time.cal = 12 * 3600 // noon, nothing else to remark on
    const n = sim.npcsOf(0)[0]!
    n.vitals.hunger = 10
    const c: CompanionContract = { kind: 'free', task: 'escort', risk: 'low', since: 0, paid: 0, bondAt: 0 }
    n.companion = c
    expect(banterLine(sim, n)).toMatch(/stomach/)
    const before = sim.state.messages?.length ?? 0
    companionBanter(sim, [n])
    expect(c.chatAt).toBe(sim.state.time.cal)
    companionBanter(sim, [n]) // inside the cooldown: silent
    expect((sim.state.messages?.length ?? 0) - before).toBeLessThanOrEqual(1)
    sim.state.time.cal += CHAT_COOLDOWN_S + 1
    companionBanter(sim, [n])
    expect(c.chatAt).toBe(sim.state.time.cal)
  })
})
