/**
 * QUEST-03 — G04 "Root by the Stream": on time / late / failed / advance, the journal timer and the parallel-timer warning
 * (quests--003 W1, E7).
 */
import { describe, expect, it } from 'vitest'
import { addItem, countItem, newStack } from './inventory'
import { questJournal } from './questDialog'
import { castHuman, choose, hoursLater, say as sayNode, setDayHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>
const say = (sim: Sim, node: string) => sayNode(sim, 'g04', node)

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  tickQuests(sim, 31)
  expect(stateOf(sim, 'g04')?.status).toBe('offered')
  return sim
}

const giveHerbs = (sim: Sim, yarrow = 2) => {
  addItem(sim.player.inv, newStack('yarrow', yarrow))
  addItem(sim.player.inv, newStack('mint', 2))
  addItem(sim.player.inv, newStack('chamomile', 1))
}

const journal = (sim: Sim) => questJournal(sim).find((j) => j.id === 'g04')!.text

describe('QUEST-03 G04 Root by the Stream', () => {
  it('G04 on time: herbs are consumed, Dora pays 30 c from her purse (conserved), Toby\'s story is offered after', () => {
    const sim = offered()
    const dora = castHuman(sim, 'g04', 'dora')
    expect(topicNode(sim, 'g04', dora.id)).toBe('do_open')
    choose(sim, 'g04', 'do_open', 'go')
    expect(journal(sim)).toMatch(/Time left: 1 day 24 h|Time left: 2 days|Time left: 1 day \d+ h|Time left: 48 h/)
    expect(say(sim, 'do_deliver').options.find((o) => o.id === 'hand')!.enabled).toBe(false)
    giveHerbs(sim)
    const money0 = totalMoney(sim)
    const purse0 = sim.player.money
    hoursLater(sim, 20)
    choose(sim, 'g04', 'do_deliver', 'hand')
    expect(stateOf(sim, 'g04')).toMatchObject({ status: 'done', ending: 'ontime' })
    expect(sim.player.money).toBe(purse0 + 30)
    expect(totalMoney(sim)).toBe(money0)
    expect(countItem(sim.player.inv, 'yarrow')).toBe(0)
    const toby = stateOf(sim, 'g04')!.cast.toby
    if (toby !== undefined) expect(topicNode(sim, 'g04', toby)).toBe('to_story') // only when Dora's household has a child
  })

  it('G04 advance: 10 c up front, 20 c at delivery', () => {
    const sim = offered()
    const purse0 = sim.player.money
    choose(sim, 'g04', 'do_open', 'advance')
    expect(sim.player.money).toBe(purse0 + 10)
    giveHerbs(sim)
    choose(sim, 'g04', 'do_deliver', 'hand')
    expect(sim.player.money).toBe(purse0 + 30)
  })

  it('G04 late: after 48 h the reward is 15 c', () => {
    const sim = offered()
    choose(sim, 'g04', 'do_open', 'go')
    giveHerbs(sim)
    hoursLater(sim, 50)
    expect(journal(sim)).toMatch(/time is up/i)
    const purse0 = sim.player.money
    choose(sim, 'g04', 'do_deliver', 'hand')
    expect(stateOf(sim, 'g04')).toMatchObject({ ending: 'late' })
    expect(sim.player.money).toBe(purse0 + 15)
  })

  it('G04 failed: giving up after the deadline keeps the herbs and costs Dora\'s trust; five days also end it', () => {
    const sim = offered()
    choose(sim, 'g04', 'do_open', 'go')
    expect(say(sim, 'do_deliver').options.find((o) => o.id === 'give_up')).toBeUndefined()
    hoursLater(sim, 49)
    const dora = castHuman(sim, 'g04', 'dora')
    const op0 = dora.opinion
    choose(sim, 'g04', 'do_deliver', 'give_up')
    expect(stateOf(sim, 'g04')).toMatchObject({ ending: 'failed' })
    expect(dora.opinion).toBeLessThan(op0)

    const s2 = offered()
    choose(s2, 'g04', 'do_open', 'go')
    hoursLater(s2, 121)
    tickQuests(s2, 2)
    expect(stateOf(s2, 'g04')).toMatchObject({ ending: 'failed' })
  })

  it('G04 refusal: the offer lapses after three days', () => {
    const sim = offered()
    choose(sim, 'g04', 'do_open', 'refuse')
    hoursLater(sim, 73)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'g04')?.status).toBe('lapsed')
  })
})
