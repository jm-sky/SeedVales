/**
 * QUEST-03 — G06 "The Trader's Letter": the four results, the opened seal, the refusal default (quests--003 W2).
 */
import { describe, expect, it } from 'vitest'
import { countItem } from './inventory'
import { priceMult } from './priceMods'
import { neighbourId } from './questCore'
import { castHuman, choose, hoursLater, setDayHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offeredWithOpinion() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  sim.state.px.visited = [neighbourId(sim)]
  for (const n of sim.npcsOf(sim.world.homeSettlement)) n.opinion = 20
  tickQuests(sim, 31)
  expect(stateOf(sim, 'g06')?.status).toBe('offered')
  return sim
}

const tag = (sim: Sim) => sim.player.inv.items.find((s) => s.id === 'letter')?.tag
const grainMult = (sim: Sim) => priceMult(sim, sim.world.homeSettlement, 'grain')

describe('QUEST-03 G06 The Trader\'s Letter', () => {
  it('G06 needs a visit to V and Stephen\'s goodwill', () => {
    const sim = testSim()
    playerFarAway(sim)
    setDayHour(sim, 5, 10)
    tickQuests(sim, 31)
    expect(stateOf(sim, 'g06')).toBeUndefined()
  })

  it('G06 agreed: the letter is read, grain +40 % in both villages, Stephen pays 10 (conserved)', () => {
    const sim = offeredWithOpinion()
    choose(sim, 'g06', 'st_open', 'ask')
    expect(tag(sim)).toBe('sealed')
    choose(sim, 'g06', 'jk_read', 'agree')
    expect(tag(sim)).toBe('read')
    expect(grainMult(sim)).toBeCloseTo(1.4)
    const money0 = totalMoney(sim)
    choose(sim, 'g06', 'st_back', 'agreed')
    expect(stateOf(sim, 'g06')).toMatchObject({ status: 'done', ending: 'agreed' })
    expect(countItem(sim.player.inv, 'letter')).toBe(0)
    expect(totalMoney(sim)).toBe(money0)
  })

  it('G06 capped and refused', () => {
    const s1 = offeredWithOpinion()
    choose(s1, 'g06', 'st_open', 'fine')
    choose(s1, 'g06', 'jk_read', 'cap')
    expect(tag(s1)).toBe('amended')
    expect(grainMult(s1)).toBeCloseTo(1.15)
    choose(s1, 'g06', 'st_back', 'capped')
    expect(stateOf(s1, 'g06')).toMatchObject({ ending: 'capped' })

    const s2 = offeredWithOpinion()
    choose(s2, 'g06', 'st_open', 'fine')
    choose(s2, 'g06', 'jk_read', 'refuse')
    expect(grainMult(s2)).toBe(1)
    choose(s2, 'g06', 'st_back', 'refused')
    expect(stateOf(s2, 'g06')).toMatchObject({ ending: 'refused' })
  })

  it('G06 public: needs the farmers\' word; pays from Stephen and the V treasury', () => {
    const sim = offeredWithOpinion()
    choose(sim, 'g06', 'st_open', 'fine')
    expect(() => choose(sim, 'g06', 'jk_read', 'public')).toThrow(/disabled/)
    const st = stateOf(sim, 'g06')!
    if (st.cast.farmer !== undefined) expect(topicNode(sim, 'g06', st.cast.farmer)).toBe('fa_barn')
    st.flags.farmersHeard = true
    choose(sim, 'g06', 'jk_read', 'public')
    const money0 = totalMoney(sim)
    choose(sim, 'g06', 'st_back', 'public')
    expect(stateOf(sim, 'g06')).toMatchObject({ ending: 'public' })
    expect(totalMoney(sim)).toBe(money0)
  })

  it('G06 opened seal: Jack refuses to talk, Stephen thinks less of the player', () => {
    const sim = offeredWithOpinion()
    choose(sim, 'g06', 'st_open', 'fine')
    const stephen = castHuman(sim, 'g06', 'stephen')
    const op0 = stephen.opinion
    sim.player.inv.items.find((s) => s.id === 'letter')!.tag = 'opened' // Game.breakSeal
    tickQuests(sim, 2)
    expect(stateOf(sim, 'g06')!.flags.playerOpened).toBe(true)
    expect(topicNode(sim, 'g06', castHuman(sim, 'g06', 'jack').id)).toBe('jk_opened')
    choose(sim, 'g06', 'jk_opened', 'sorry')
    choose(sim, 'g06', 'st_back', 'refused')
    expect(stephen.opinion).toBeLessThan(op0)
  })

  it('G06 refusal: the carter delivers and the default outcome (+40 %) applies after a week', () => {
    const sim = offeredWithOpinion()
    choose(sim, 'g06', 'st_open', 'refuse')
    hoursLater(sim, 169)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'g06')?.status).toBe('lapsed')
    expect(grainMult(sim)).toBeCloseTo(1.4)
  })
})
