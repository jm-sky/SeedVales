/**
 * QUEST-03 — Q09 "Goods on the Ground": barter, commission and list (quests--003 W1).
 */
import { describe, expect, it } from 'vitest'
import { giveGift } from './gifts'
import { countItem } from './inventory'
import { castHuman, choose, hoursLater, houseOfNpc, itemTotal, setDayHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  tickQuests(sim, 31)
  expect(stateOf(sim, 'q09')?.status).toBe('offered')
  return sim
}

function accept(sim: Sim) {
  choose(sim, 'q09', 'st_open', 'find_deal')
  for (const [slot, node] of [['miles', 'mi_needs'], ['ralph', 'ra_needs'], ['molly', 'mo_needs']] as const) {
    expect(topicNode(sim, 'q09', castHuman(sim, 'q09', slot).id)).toBe(node)
    choose(sim, 'q09', node, 'ok')
  }
  choose(sim, 'q09', 'mi_planks', 'take')
  choose(sim, 'q09', 'ra_grain', 'take')
  choose(sim, 'q09', 'mo_wool', 'take')
  expect(countItem(sim.player.inv, 'oak_plank')).toBe(2)
  expect(countItem(sim.player.inv, 'grain')).toBe(2)
  expect(countItem(sim.player.inv, 'wool')).toBe(1)
}

const giveAll = (sim: Sim, items: string[]) => {
  const stephen = castHuman(sim, 'q09', 'stephen')
  for (const id of items) {
    const s = sim.player.inv.items.find((x) => x.id === id)!
    giveGift(sim, stephen, s)
  }
  tickQuests(sim, 2)
}

describe('QUEST-03 Q09 Goods on the Ground', () => {
  it('Q09 offer: Stephen is back with the tools (ledger-logged grant), Miles holds the planks', () => {
    const sim = offered()
    const stephen = castHuman(sim, 'q09', 'stephen')
    expect(countItem(stephen.inv, 'saw')).toBe(1)
    expect(countItem(houseOfNpc(sim, castHuman(sim, 'q09', 'miles')).inv!, 'oak_plank')).toBe(2)
  })

  it('Q09 barter: the deal needs two houses heard; goods to Stephen move the tools out; 10 c at the end (conserved)', () => {
    const sim = offered()
    choose(sim, 'q09', 'st_open', 'find_deal')
    const stephen = castHuman(sim, 'q09', 'stephen')
    expect(topicNode(sim, 'q09', stephen.id)).toBe('st_deal')
    expect(() => choose(sim, 'q09', 'st_deal', 'barter')).toThrow(/disabled/)
    for (const node of ['mi_needs', 'ra_needs', 'mo_needs']) choose(sim, 'q09', node, 'ok')
    choose(sim, 'q09', 'mi_planks', 'take')
    choose(sim, 'q09', 'ra_grain', 'take')
    choose(sim, 'q09', 'mo_wool', 'take')
    choose(sim, 'q09', 'st_deal', 'barter')
    const money0 = totalMoney(sim)
    const purse0 = sim.player.money
    giveAll(sim, ['wool', 'grain', 'oak_plank'])
    expect(stateOf(sim, 'q09')).toMatchObject({ status: 'done', ending: 'barter' })
    expect(countItem(houseOfNpc(sim, castHuman(sim, 'q09', 'molly')).inv!, 'shears')).toBe(1)
    expect(countItem(houseOfNpc(sim, castHuman(sim, 'q09', 'ralph')).inv!, 'sickle')).toBe(1)
    expect(countItem(houseOfNpc(sim, castHuman(sim, 'q09', 'miles')).inv!, 'saw')).toBe(1)
    expect(sim.player.money).toBe(purse0 + 10)
    expect(totalMoney(sim)).toBe(money0)
    expect(itemTotal(sim, 'saw')).toBe(1)
  })

  it('Q09 consign: tools go out at once; after 72 h Stephen settles with the houses from his purse', () => {
    const sim = offered()
    accept(sim)
    choose(sim, 'q09', 'st_deal', 'consign')
    expect(countItem(houseOfNpc(sim, castHuman(sim, 'q09', 'molly')).inv!, 'shears')).toBe(1)
    giveAll(sim, ['wool', 'oak_plank'])
    expect(stateOf(sim, 'q09')?.status).toBe('active')
    const money0 = totalMoney(sim)
    const purse0 = sim.player.money
    hoursLater(sim, 73)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q09')).toMatchObject({ status: 'done', ending: 'consign' })
    expect(sim.player.money).toBe(purse0 + 20)
    expect(totalMoney(sim)).toBe(money0)
  })

  it('Q09 order: after five days Stephen brings extra iron (a logged grant)', () => {
    const sim = offered()
    accept(sim)
    choose(sim, 'q09', 'st_deal', 'order')
    const iron0 = itemTotal(sim, 'iron_ingot')
    hoursLater(sim, 121)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q09')).toMatchObject({ status: 'done', ending: 'order' })
    expect(itemTotal(sim, 'iron_ingot')).toBe(iron0 + 2)
  })

  it('Q09 neglect: an offer nobody accepts lapses after four days', () => {
    const sim = offered()
    hoursLater(sim, 97)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q09')?.status).toBe('lapsed')
  })
})
