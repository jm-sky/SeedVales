import { describe, expect, it } from 'vitest'
import { PROFESSIONS, SURNAMES } from '../data/professions'
import { testSim } from './testWorld'

describe('D-USER-1 names', () => {
  it('NPC-01: every profession has occupational surnames', () => {
    for (const p of Object.keys(PROFESSIONS)) expect(SURNAMES[p as keyof typeof SURNAMES]?.length, p).toBeGreaterThanOrEqual(3)
  })

  it('NPC-01: the home settlement\'s first guard is Mark Hornblower, a man; nobody else carries the name', () => {
    const sim = testSim()
    const home = sim.world.homeSettlement
    const guards = sim.state.npcs.filter((n) => n.settlementId === home && n.profession === 'guard')
    expect(guards.length).toBeGreaterThan(0)
    const mark = guards[0]!
    expect(mark.name).toBe('Mark Hornblower')
    expect(mark.male).toBe(true)
    expect(sim.state.npcs.filter((n) => n.name === 'Mark Hornblower')).toHaveLength(1)
  })
})
