import { describe, expect, it } from 'vitest'
import { npcQuestIcon } from './questDialog'
import { castHuman, choose, stateOf, tickQuests } from './questTestKit'
import { testSim } from './testWorld'

describe('D-USER-1 b: quest icons above NPC heads', () => {
  it('QUEST-03: offer → `!`, accepted → `?`, done → tick for a day, then none', () => {
    const sim = testSim()
    for (const b of sim.state.buildings) if (b.kind === 'house' && sim.state.households[b.householdId ?? -1]?.profession === 'woodcutter') b.durability = 40
    tickQuests(sim, 31)
    const miles = castHuman(sim, 'q03', 'miles')
    const bystander = sim.state.npcs.find((n) => n.id !== miles.id)!
    expect(npcQuestIcon(sim, miles.id)).toBe('offer')
    expect(npcQuestIcon(sim, bystander.id)).toBeNull()
    choose(sim, 'q03', 'm_open', 'show_damage')
    expect(npcQuestIcon(sim, miles.id)).toBe('turnin')
    const st = stateOf(sim, 'q03')!
    st.status = 'done'
    st.ending = 'repair'
    st.endedAt = sim.state.time.cal
    const lucy = castHuman(sim, 'q03', 'lucy')
    expect([npcQuestIcon(sim, miles.id), npcQuestIcon(sim, lucy.id)]).toEqual(['done', 'done'])
    st.endedAt = sim.state.time.cal - 90000
    expect(npcQuestIcon(sim, miles.id)).toBeNull()
  })
})
