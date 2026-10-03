/**
 * QUEST-03 — G08 "Well and Rumor": one test per ending, headless through the engine (quests--003 W1).
 */
import { describe, expect, it } from 'vitest'
import { countItem } from './inventory'
import { addPriceMod, priceMult } from './priceMods'
import { castHuman, choose, hoursLater, houseOfNpc, say as sayNode, setDayHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>
const say = (sim: Sim, node: string) => sayNode(sim, 'g08', node)
const flags = (sim: Sim) => stateOf(sim, 'g08')!.flags

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  tickQuests(sim, 31)
  expect(stateOf(sim, 'g08')?.status).toBe('offered')
  return sim
}

const goTo = (sim: Sim, x: number, z: number) => {
  sim.player.x = x
  sim.player.z = z
  sim.actors.update(sim.player)
}

function accept(sim: Sim) {
  const ralph = castHuman(sim, 'g08', 'ralph')
  expect(topicNode(sim, 'g08', ralph.id)).toBe('ra_open')
  choose(sim, 'g08', 'ra_open', 'find_out')
  expect(stateOf(sim, 'g08')).toMatchObject({ status: 'active', stage: 1 })
  return ralph
}

/** Learns the facts: Tom's cellar + Stephen's testimony (two facts → truth/quiet possible). */
function learnFacts(sim: Sim) {
  const tom = castHuman(sim, 'g08', 'tom')
  const house = houseOfNpc(sim, tom)
  goTo(sim, house.x, house.z)
  tickQuests(sim, 6)
  expect(flags(sim).barrelBad).toBe(true)
  choose(sim, 'g08', 'st_sick', 'thanks')
  expect(flags(sim).whoDrank).toBe(true)
}

describe('QUEST-03 G08 Well and Rumor', () => {
  it('G08: on offer the two houses are sick; the quest needs day 4', () => {
    const sim = testSim()
    playerFarAway(sim)
    tickQuests(sim, 31)
    expect(stateOf(sim, 'g08')).toBeUndefined()
    const s2 = offered()
    expect(castHuman(s2, 'g08', 'wife').vitals.illness?.kind).toBe('stomach')
    expect(castHuman(s2, 'g08', 'stephen').vitals.illness?.kind).toBe('stomach')
  })

  it('G08 truth: needs the barrel and one more fact; pays 25 c from the treasury (conserved), honesty +10, heals', () => {
    const sim = offered()
    accept(sim)
    expect(say(sim, 'ra_square').options.find((o) => o.id === 'truth')!.enabled).toBe(false)
    learnFacts(sim)
    const money0 = totalMoney(sim)
    const purse0 = sim.player.money
    const rep0 = sim.state.settlements[sim.world.homeSettlement]!.rep.honesty
    choose(sim, 'g08', 'ra_square', 'truth')
    expect(stateOf(sim, 'g08')).toMatchObject({ status: 'done', ending: 'truth' })
    expect(sim.player.money).toBe(purse0 + 25)
    expect(totalMoney(sim)).toBe(money0)
    expect(sim.state.settlements[sim.world.homeSettlement]!.rep.honesty).toBe(rep0 + 10)
    expect(castHuman(sim, 'g08', 'wife').vitals.illness).toBeUndefined()
  })

  it('G08 quiet: needs Tom to come along; pays 20 c and a small beer from Tom\'s store', () => {
    const sim = offered()
    accept(sim)
    learnFacts(sim)
    expect(say(sim, 'ra_square').options.find((o) => o.id === 'quiet')!.enabled).toBe(false)
    const tom = castHuman(sim, 'g08', 'tom')
    houseOfNpc(sim, tom).inv!.items.push({ id: 'small_beer', qty: 2 })
    expect(topicNode(sim, 'g08', tom.id)).toBe('to_barrel')
    choose(sim, 'g08', 'to_barrel', 'come')
    const purse0 = sim.player.money
    choose(sim, 'g08', 'ra_square', 'quiet')
    expect(stateOf(sim, 'g08')).toMatchObject({ status: 'done', ending: 'quiet' })
    expect(sim.player.money).toBe(purse0 + 20)
    expect(countItem(sim.player.inv, 'small_beer')).toBe(1)
  })

  it('G08 accusation: accusing {V} without facts costs honesty and starts a 30-day price friction in {V}', () => {
    const sim = offered()
    accept(sim)
    sim.state.px.visited = [...(sim.state.px.visited ?? []), 1]
    const margaret = castHuman(sim, 'g08', 'margaret')
    expect(topicNode(sim, 'g08', margaret.id)).toBe('ma_accuse')
    choose(sim, 'g08', 'ma_accuse', 'accuse')
    expect(flags(sim).accused).toBe(true)
    choose(sim, 'g08', 'ra_square', 'accusation')
    expect(stateOf(sim, 'g08')).toMatchObject({ status: 'done', ending: 'accusation' })
    expect(priceMult(sim, margaret.settlementId, 'bread')).toBeCloseTo(1.2)
    hoursLater(sim, 31 * 24)
    expect(priceMult(sim, margaret.settlementId, 'bread')).toBe(1)
  })

  it('G08 apology: bringing the barrel within a day takes back the accusation (honesty −5, no friction)', () => {
    const sim = offered()
    accept(sim)
    sim.state.px.visited = [...(sim.state.px.visited ?? []), 1]
    const margaret = castHuman(sim, 'g08', 'margaret')
    choose(sim, 'g08', 'ma_accuse', 'accuse')
    learnFacts(sim)
    goTo(sim, margaret.x + 1, margaret.z)
    expect(topicNode(sim, 'g08', margaret.id)).toBe('ma_apology')
    choose(sim, 'g08', 'ma_apology', 'apologise')
    expect(flags(sim)).toMatchObject({ accused: false, apologised: true })
    expect(priceMult(sim, margaret.settlementId, 'bread')).toBe(1)
    choose(sim, 'g08', 'ra_square', 'truth')
    expect(stateOf(sim, 'g08')).toMatchObject({ ending: 'truth' })
  })

  it('G08 refusal: nobody accepts → Dora traces it in two days, no reward, everyone healed', () => {
    const sim = offered()
    const ralph = castHuman(sim, 'g08', 'ralph')
    choose(sim, 'g08', 'ra_open', 'refuse')
    expect(topicNode(sim, 'g08', ralph.id)).toBe('ra_open')
    const purse0 = sim.player.money
    hoursLater(sim, 49)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'g08')).toMatchObject({ status: 'done', ending: 'traced' })
    expect(sim.player.money).toBe(purse0)
    expect(castHuman(sim, 'g08', 'stephen').vitals.illness).toBeUndefined()
  })

  it('G08 price mods stay compatible with market-day clamps (sanity: addPriceMod replaced by same why)', () => {
    const sim = testSim()
    addPriceMod(sim, { place: 0, item: '*', mult: 1.2, days: 1, why: 'x' })
    addPriceMod(sim, { place: 0, item: '*', mult: 1.2, days: 1, why: 'x' })
    expect(sim.state.priceMods).toHaveLength(1)
  })
})
