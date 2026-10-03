/**
 * QUEST-03 — Q08 "The Long Way to Water": route, trial dig, trough (build + three fills) and the rota (quests--003 W2).
 */
import { describe, expect, it } from 'vitest'
import { ctxOf, neighbourId, resolveAnchor } from './questCore'
import { questDef, questEvent } from './questEngine'
import { castHuman, choose, hoursLater, setDayHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  sim.state.px.visited = [neighbourId(sim)]
  tickQuests(sim, 31)
  expect(stateOf(sim, 'q08')?.status).toBe('offered')
  return sim
}

const anchor = (sim: Sim, a: Parameters<typeof resolveAnchor>[1]) => resolveAnchor(ctxOf(sim, questDef(sim, 'q08')!, stateOf(sim, 'q08')!), a)!
const pen = { k: 'building', slot: 'elspeth', kind: 'pen' } as const

function walked(sim: Sim) {
  choose(sim, 'q08', 'el_open', 'walk')
  const at = anchor(sim, pen)
  sim.player.x = at.x
  sim.player.z = at.z
  sim.actors.update(sim.player)
  tickQuests(sim, 5)
  expect(stateOf(sim, 'q08')!.flags.routeWalked).toBe(true)
}

describe('QUEST-03 Q08 The Long Way to Water', () => {
  it('Q08 trough: build it near the pen and fill it three times; Elspeth gives wool, the V treasury pays 15 (conserved)', () => {
    const sim = offered()
    walked(sim)
    // The trial dig in the low field is counted.
    const field = anchor(sim, { k: 'building', slot: 'margaret', kind: 'field' })
    questEvent(sim, { k: 'dig', x: field.x, z: field.z })
    expect(stateOf(sim, 'q08')!.counters.digs).toBe(1)
    expect(topicNode(sim, 'q08', castHuman(sim, 'q08', 'elspeth').id)).toBe('el_plan')
    choose(sim, 'q08', 'el_plan', 'trough')
    const at = anchor(sim, pen)
    sim.state.buildings.push({ id: 'q08-trough', kind: 'trough', x: at.x + 6, z: at.z, rot: 0, hw: 1, hd: 0.5, settlementId: -1, durability: 100, owner: 'player' } as never)
    sim.rebuildBuildingIndex()
    questEvent(sim, { k: 'built', buildingId: 'q08-trough', kind: 'trough' })
    questEvent(sim, { k: 'fill', buildingId: 'q08-trough', amount: 4 })
    questEvent(sim, { k: 'fill', buildingId: 'q08-trough', amount: 4 })
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q08')?.status).toBe('active')
    const money0 = totalMoney(sim)
    questEvent(sim, { k: 'fill', buildingId: 'q08-trough', amount: 4 })
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q08')).toMatchObject({ status: 'done', ending: 'trough' })
    expect(totalMoney(sim)).toBe(money0)
  })

  it('Q08 rota: three days after the choice it pays 10 c; a far-away trough does not count', () => {
    const sim = offered()
    walked(sim)
    choose(sim, 'q08', 'el_plan', 'rota')
    hoursLater(sim, 50)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q08')?.status).toBe('active')
    hoursLater(sim, 23)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q08')).toMatchObject({ status: 'done', ending: 'rota' })

    const s2 = offered()
    walked(s2)
    choose(s2, 'q08', 'el_plan', 'trough')
    const at = anchor(s2, pen)
    s2.state.buildings.push({ id: 'far-trough', kind: 'trough', x: at.x + 500, z: at.z, rot: 0, hw: 1, hd: 0.5, settlementId: -1, durability: 100, owner: 'player' } as never)
    s2.rebuildBuildingIndex()
    questEvent(s2, { k: 'built', buildingId: 'far-trough', kind: 'trough' })
    expect(stateOf(s2, 'q08')!.counters.troughs ?? 0).toBe(0)
  })
})
