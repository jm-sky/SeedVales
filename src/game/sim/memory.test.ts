import { describe, expect, it } from 'vitest'
import { npcRemarks } from './memory'
import { addStat } from './reputation'
import { testSim } from './testWorld'

describe('P-09 NPC memory of deeds', () => {
  it('SOC-01: a stranger says nothing; deeds produce remarks (thief, beast slayer, mayor, finished quest), at most two', () => {
    const sim = testSim()
    const npc = sim.state.npcs.find((n) => n.profession === 'guard')!
    expect(npcRemarks(sim, npc)).toEqual([])
    addStat(sim, 'caughtStealing', 1)
    expect(npcRemarks(sim, npc).some((r) => /stealing/.test(r))).toBe(true)
    addStat(sim, 'dangerousKilled', 3)
    expect(npcRemarks(sim, npc, 5).some((r) => /beasts/.test(r))).toBe(true)
    sim.state.settlements[npc.settlementId]!.playerMayor = true
    const r = npcRemarks(sim, npc)
    expect(r).toHaveLength(2)
    expect(r[0]).toBe('Good day, mayor.')
  })

  it('SOC-01: a finished quest the NPC took part in is remembered by that NPC only', () => {
    const sim = testSim()
    sim.state.authoredQuests.g03 = { status: 'done', stage: 3, flags: {}, settled: true, offeredAt: 0, startedAt: 1, endedAt: 2, cast: { mark: sim.state.npcs[0]!.id }, anchors: {}, obs: {}, counters: {}, seen: {}, fired: {} }
    expect(npcRemarks(sim, sim.state.npcs[0]!).some((x) => /won't forget/.test(x))).toBe(true)
    expect(npcRemarks(sim, sim.state.npcs[1]!).some((x) => /won't forget/.test(x))).toBe(false)
  })
})
