/**
 * QUEST-03 — Q04 "The Handle Remembers": test, crack, and the three choices (quests--003 W2).
 */
import { describe, expect, it } from 'vitest'
import { addItem, countItem, newStack } from './inventory'
import { ctxOf, neighbourId, resolveAnchor } from './questCore'
import { questDef } from './questEngine'
import { castHuman, choose, hoursLater, setDayHour, stateOf, tickQuests } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  sim.state.px.visited = [neighbourId(sim)]
  tickQuests(sim, 31)
  expect(stateOf(sim, 'q04')?.status).toBe('offered')
  return sim
}

const flags = (sim: Sim) => stateOf(sim, 'q04')!.flags

/** Accept, hear Bernard, test on cold iron, look at the head: the crack is found and the choice opens. */
function cracked(sim: Sim) {
  choose(sim, 'q04', 'so_open', 'show')
  choose(sim, 'q04', 'be_story', 'ok')
  const at = resolveAnchor(ctxOf(sim, questDef(sim, 'q04')!, stateOf(sim, 'q04')!), { k: 'settlement', kind: 'anvil', place: 'V' })!
  sim.player.x = at.x
  sim.player.z = at.z
  sim.actors.update(sim.player)
  choose(sim, 'q04', 'so_test', 'strike')
  tickQuests(sim, 6)
  expect(flags(sim).crackFound).toBe(true)
  choose(sim, 'q04', 'so_crack', 'ok')
}

describe('QUEST-03 Q04 The Handle Remembers', () => {
  it('Q04 needs a visit to V; reforge needs the crack and coal', () => {
    const sim = offered()
    cracked(sim)
    expect(() => choose(sim, 'q04', 'so_choose', 'reforge')).toThrow(/disabled/)
    addItem(sim.player.inv, newStack('coal', 4))
    choose(sim, 'q04', 'so_choose', 'reforge')
    expect(stateOf(sim, 'q04')).toMatchObject({ stage: 2 })
    expect(countItem(sim.player.inv, 'coal')).toBe(0)
    tickQuests(sim, 2)
    expect(flags(sim).worked).toBe(false)
    hoursLater(sim, 13)
    tickQuests(sim, 2)
    choose(sim, 'q04', 'so_done', 'take')
    expect(stateOf(sim, 'q04')).toMatchObject({ status: 'done', ending: 'forged' })
  })

  it('Q04 new: iron and coal are consumed, a hammer is forged, and Sophie pays the offcuts (conserved money)', () => {
    const sim = offered()
    cracked(sim)
    addItem(sim.player.inv, newStack('coal', 4))
    addItem(sim.player.inv, newStack('iron_ingot', 2))
    choose(sim, 'q04', 'so_choose', 'new')
    hoursLater(sim, 13)
    tickQuests(sim, 2)
    const money0 = totalMoney(sim)
    const hammers = countItem(sim.player.inv, 'hammer')
    choose(sim, 'q04', 'so_done', 'take')
    expect(countItem(sim.player.inv, 'hammer')).toBe(hammers + 1)
    expect(totalMoney(sim)).toBe(money0)
    expect(castHuman(sim, 'q04', 'sophie')).toBeTruthy()
  })

  it('Q04 keepsake: hang it up, no materials, a meal and thanks', () => {
    const sim = offered()
    cracked(sim)
    choose(sim, 'q04', 'so_choose', 'keepsake')
    expect(stateOf(sim, 'q04')).toMatchObject({ status: 'done', ending: 'keepsake' })
  })
})
