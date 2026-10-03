/**
 * QUEST-03 — G02 "Rusty Debt": the four outcomes, the weld timer and conservation (quests--003 W2).
 */
import { describe, expect, it } from 'vitest'
import { countItem } from './inventory'
import { neighbourId } from './questCore'
import { castHuman, choose, hoursLater, houseOfNpc, setDayHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  tickQuests(sim, 31)
  expect(stateOf(sim, 'g02')).toBeUndefined() // not before visiting V
  sim.state.px.visited = [neighbourId(sim)]
  tickQuests(sim, 31)
  expect(stateOf(sim, 'g02')?.status).toBe('offered')
  return sim
}

const flags = (sim: Sim) => stateOf(sim, 'g02')!.flags
const goTo = (sim: Sim, x: number, z: number) => {
  sim.player.x = x
  sim.player.z = z
  sim.actors.update(sim.player)
}
const ralphStore = (sim: Sim) => houseOfNpc(sim, castHuman(sim, 'g02', 'ralph')).inv!

function accept(sim: Sim) {
  choose(sim, 'g02', 'be_open', 'talk')
  const ralphHouse = houseOfNpc(sim, castHuman(sim, 'g02', 'ralph'))
  goTo(sim, ralphHouse.x, ralphHouse.z)
  tickQuests(sim, 7)
  expect(flags(sim).flawFound).toBe(true)
}

describe('QUEST-03 G02 Rusty Debt', () => {
  it('G02 offer: the flawed share lies in Ralph\'s store', () => {
    const sim = offered()
    expect(ralphStore(sim).items.find((s) => s.id === 'plowshare')?.tag).toBe('flawed')
  })

  it('G02 settled30: needs the price from Sophie; Bernard gets 30 from the treasury and pays the player 8 (conserved)', () => {
    const sim = offered()
    accept(sim)
    expect(() => choose(sim, 'g02', 'ra_field', 'settle')).toThrow(/disabled/)
    choose(sim, 'g02', 'so_price', 'look')
    const money0 = totalMoney(sim)
    choose(sim, 'g02', 'ra_field', 'settle')
    choose(sim, 'g02', 'be_close', 'settled30')
    expect(stateOf(sim, 'g02')).toMatchObject({ status: 'done', ending: 'settled30' })
    expect(totalMoney(sim)).toBe(money0)
  })

  it('G02 mended: carry the share, the weld takes 12 h, Ralph pays 35 and the player is repaid', () => {
    const sim = offered()
    accept(sim)
    choose(sim, 'g02', 'ra_field', 'mend')
    expect(countItem(sim.player.inv, 'plowshare')).toBe(1)
    expect(topicNode(sim, 'g02', castHuman(sim, 'g02', 'bernard').id)).toBe('be_mend')
    choose(sim, 'g02', 'be_mend', 'admit')
    expect(flags(sim).bernardAdmits).toBe(true)
    tickQuests(sim, 2)
    expect(sim.player.inv.items.find((s) => s.id === 'plowshare')?.tag).toBe('flawed') // not yet welded
    hoursLater(sim, 13)
    tickQuests(sim, 2)
    expect(sim.player.inv.items.find((s) => s.id === 'plowshare')?.tag).toBe('mended')
    const money0 = totalMoney(sim)
    choose(sim, 'g02', 'ra_back', 'pay')
    expect(ralphStore(sim).items.find((s) => s.id === 'plowshare')?.tag).toBe('mended')
    choose(sim, 'g02', 'be_close', 'mended')
    expect(stateOf(sim, 'g02')).toMatchObject({ status: 'done', ending: 'mended' })
    expect(totalMoney(sim)).toBe(money0)
  })

  it('G02 returned: the share goes back to Bernard\'s store; pressured: Ralph pays 40', () => {
    const sim = offered()
    accept(sim)
    choose(sim, 'g02', 'ra_field', 'return')
    choose(sim, 'g02', 'be_close', 'returned')
    expect(stateOf(sim, 'g02')).toMatchObject({ ending: 'returned' })
    expect(countItem(houseOfNpc(sim, castHuman(sim, 'g02', 'bernard')).inv!, 'plowshare')).toBe(1)

    const s2 = offered()
    accept(s2)
    const ralph = castHuman(s2, 'g02', 'ralph')
    ralph.money = 20
    const op0 = ralph.opinion
    choose(s2, 'g02', 'ra_field', 'press')
    expect(ralph.money).toBe(15)
    expect(ralph.opinion).toBeLessThan(op0)
    choose(s2, 'g02', 'be_close', 'pressured')
    expect(stateOf(s2, 'g02')).toMatchObject({ ending: 'pressured' })
  })
})
