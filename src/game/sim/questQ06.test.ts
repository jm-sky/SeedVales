/**
 * QUEST-03 — Q06 "Room for One More": the prepaid order in V, a real companion contract from dialog (hired / free),
 * the solo road with Miles's mark, pickup gating and the three endings (quests--003 W2).
 */
import { describe, expect, it } from 'vitest'
import { countItem } from './inventory'
import { companionsOf } from './npc/companions'
import { ctxOf, neighbourId, resolveAnchor } from './questCore'
import { questDef } from './questEngine'
import { castHuman, choose, houseOfNpc, itemTotal, setDayHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  sim.state.px.visited = [neighbourId(sim)]
  const wedges = itemTotal(sim, 'iron_wedge')
  tickQuests(sim, 31)
  expect(stateOf(sim, 'q06')?.status).toBe('offered')
  expect(itemTotal(sim, 'iron_wedge') - wedges, 'the prepaid order enters Sophie\'s store').toBe(2)
  return sim
}

const flags = (sim: Sim) => stateOf(sim, 'q06')!.flags
const standAt = (sim: Sim, x: number, z: number) => {
  sim.player.x = x
  sim.player.z = z
  sim.actors.update(sim.player)
}
const goHome = (sim: Sim) => {
  const h = resolveAnchor(ctxOf(sim, questDef(sim, 'q06')!, stateOf(sim, 'q06')!), { k: 'house', slot: 'miles' })!
  standAt(sim, h.x + 3, h.z)
}
const goSophie = (sim: Sim) => {
  const s = houseOfNpc(sim, castHuman(sim, 'q06', 'sophie'))
  standAt(sim, s.x + 3, s.z)
}

function accept(sim: Sim, how: 'plan' | 'solo') {
  choose(sim, 'q06', 'mi_open', how)
  expect(stateOf(sim, 'q06')?.status).toBe('active')
}

describe('QUEST-03 Q06 Room for One More', () => {
  it('the order is prepaid by Miles (conserved money) and the cast resolves', () => {
    const sim = testSim()
    playerFarAway(sim)
    setDayHour(sim, 5, 10)
    sim.state.px.visited = [neighbourId(sim)]
    const money0 = totalMoney(sim)
    tickQuests(sim, 31)
    expect(stateOf(sim, 'q06')?.status).toBe('offered')
    expect(totalMoney(sim)).toBe(money0)
    expect(castHuman(sim, 'q06', 'matthew').age).toBe('adult')
  })

  it('paid: hiring from the dialog makes a real 4-day contract without a wage; the player pays 20 c at the end; goods go home', () => {
    const sim = offered()
    accept(sim, 'plan')
    const matthew = castHuman(sim, 'q06', 'matthew')
    expect(topicNode(sim, 'q06', matthew.id)).toBe('ma_terms')
    sim.player.money = Math.max(sim.player.money, 40)
    const money0 = totalMoney(sim)
    const purse0 = matthew.money
    choose(sim, 'q06', 'ma_terms', 'paid')
    expect(flags(sim).deal).toBe('paid')
    expect(matthew.companion).toMatchObject({ kind: 'hired', paid: 0 })
    expect(companionsOf(sim)).toContain(matthew)
    expect(matthew.money).toBe(purse0) // the contract takes no money
    // Pickup: Matthew is with the player at the forge.
    goSophie(sim)
    matthew.x = sim.player.x + 1
    matthew.z = sim.player.z
    sim.actors.update(matthew)
    choose(sim, 'q06', 'so_pickup', 'take')
    expect(countItem(sim.player.inv, 'axe_head')).toBe(1)
    expect(countItem(sim.player.inv, 'iron_wedge')).toBe(2)
    expect(flags(sim).itemCollected).toBe(true)
    // Back at Miles's house.
    const wedges = itemTotal(sim, 'iron_wedge')
    goHome(sim)
    const before = sim.player.money
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q06')).toMatchObject({ status: 'done', ending: 'paid' })
    expect(before - sim.player.money).toBe(20)
    expect(matthew.money - purse0).toBe(20)
    expect(matthew.companion).toBeUndefined()
    expect(countItem(sim.player.inv, 'axe_head')).toBe(0)
    expect(itemTotal(sim, 'iron_wedge')).toBe(wedges) // moved to Miles's store, not lost
    expect(totalMoney(sim)).toBe(money0) // money only moved
  })

  it('free: needs Matthew\'s trust (opinion ≥ 25); a free contract has no end date and no pay', () => {
    const sim = offered()
    accept(sim, 'plan')
    const matthew = castHuman(sim, 'q06', 'matthew')
    matthew.opinion = 10
    expect(() => choose(sim, 'q06', 'ma_terms', 'free')).toThrow(/disabled/)
    matthew.opinion = 30
    const money0 = totalMoney(sim)
    choose(sim, 'q06', 'ma_terms', 'free')
    expect(matthew.companion).toMatchObject({ kind: 'free' })
    expect(matthew.companion?.until).toBeUndefined()
    goSophie(sim)
    matthew.x = sim.player.x + 2
    matthew.z = sim.player.z
    sim.actors.update(matthew)
    choose(sim, 'q06', 'so_pickup', 'take')
    goHome(sim)
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q06')).toMatchObject({ status: 'done', ending: 'free' })
    expect(totalMoney(sim)).toBe(money0)
    expect(matthew.companion).toBeUndefined()
    expect(matthew.opinion).toBeGreaterThan(30)
  })

  it('solo: Miles\'s mark opens the order for the player alone; 5 c at the end (conserved), the mark is handed back', () => {
    const sim = offered()
    accept(sim, 'solo')
    expect(countItem(sim.player.inv, 'miles_mark')).toBe(1)
    goSophie(sim)
    choose(sim, 'q06', 'so_pickup', 'take')
    goHome(sim)
    const money0 = totalMoney(sim)
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q06')).toMatchObject({ status: 'done', ending: 'solo' })
    expect(totalMoney(sim)).toBe(money0)
    expect(countItem(sim.player.inv, 'miles_mark')).toBe(0)
  })

  it('pickup is closed without the mark or Matthew at the forge', () => {
    const sim = offered()
    accept(sim, 'plan')
    goSophie(sim)
    expect(() => choose(sim, 'q06', 'so_pickup', 'take')).toThrow(/disabled/)
    // Matthew far away (contract or not) does not count.
    const matthew = castHuman(sim, 'q06', 'matthew')
    sim.player.money = Math.max(sim.player.money, 40)
    choose(sim, 'q06', 'ma_terms', 'paid')
    matthew.x = sim.player.x + 200
    sim.actors.update(matthew)
    expect(() => choose(sim, 'q06', 'so_pickup', 'take')).toThrow(/disabled/)
  })

  it('a hired contract needs the money for four days; lapsing or dropping the quest dismisses the companion', () => {
    const sim = offered()
    accept(sim, 'plan')
    sim.player.money = 5
    expect(() => choose(sim, 'q06', 'ma_terms', 'paid')).toThrow(/disabled/)
    sim.player.money = 30
    const matthew = castHuman(sim, 'q06', 'matthew')
    choose(sim, 'q06', 'ma_terms', 'paid')
    expect(matthew.companion).toBeTruthy()
    sim.state.time.cal += 510 * 3600
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q06')).toMatchObject({ status: 'done', ending: 'dropped' })
    expect(matthew.companion).toBeUndefined()
  })
})
