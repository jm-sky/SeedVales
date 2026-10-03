/**
 * Review 021 (quests--003 W1/W2): regression tests for the triaged findings (#2 quest goods not on sale, #3 G02 return needs the
 * share, #4 creatures retired, #5 small beer exists, #7 one fell counter, #8 dead sow, #13 save round trip, #14 felled boundary
 * tree skipped, #19 den timer, #21 time-left text).
 */
import { describe, expect, it } from 'vitest'
import { fellTree } from './actions'
import { addItem, countItem, newStack } from './inventory'
import { ctxOf, neighbourId, resolveAnchor } from './questCore'
import { timeLeftText } from './questDialog'
import { questDef } from './questEngine'
import { castAnimal, castHuman, choose, houseOfNpc, setDayHour, setHour, stateOf, tickQuests } from './questTestKit'
import { Sim } from './sim'
import { playerFarAway, testSim } from './testWorld'
import { tradeStock } from './trade'

function offer(id: string) {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  sim.state.px.visited = [neighbourId(sim)]
  tickQuests(sim, 31)
  expect(stateOf(sim, id)?.status, id).toBe('offered')
  return sim
}

describe('review 021', () => {
  it('#2 quest-only goods are not shop stock (Sophie\'s prepaid order, Ralph\'s share)', () => {
    const sim = offer('q06')
    const sophie = castHuman(sim, 'q06', 'sophie')
    expect(tradeStock(sim, sophie).some((e) => e.stack.id === 'axe_head' || e.stack.id === 'iron_wedge')).toBe(false)
    const g = offer('g02')
    expect(tradeStock(g, castHuman(g, 'g02', 'ralph')).some((e) => e.stack.id === 'plowshare')).toBe(false)
  })

  it('#3 G02: the "returned" report needs the share in the pack', () => {
    const sim = offer('g02')
    choose(sim, 'g02', 'be_open', 'talk')
    stateOf(sim, 'g02')!.flags.outcome = 'returned'
    expect(() => choose(sim, 'g02', 'be_close', 'returned')).toThrow(/disabled/)
  })

  it('#4 G07 "drive" moves the wolf\'s home far away; Q02 endings retire the sow', () => {
    const q = questDef(testSim(), 'g07')!
    expect(q.rules.find((r) => r.id === 'driveDay2')!.effects.some((e) => e.k === 'drive')).toBe(true)
    const sim = offer('q02')
    choose(sim, 'q02', 'ed_open', 'help')
    const sow = castAnimal(sim, 'q02', 'sow')
    const home0 = { x: sow.homeX, z: sow.homeZ }
    sim.state.time.cal += 340 * 3600
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q02')).toMatchObject({ status: 'done', ending: 'settled' })
    expect(Math.hypot(sow.homeX - home0.x, sow.homeZ - home0.z)).toBeGreaterThan(200)
    expect(sow.leash).toBeUndefined()
  })

  it('#5 G08 starts with small beer in Tom\'s store (the "quiet" ending can pay it)', () => {
    const sim = offer('g08')
    const tom = castHuman(sim, 'g08', 'tom')
    expect(countItem(houseOfNpc(sim, tom).inv!, 'small_beer')).toBeGreaterThanOrEqual(1)
  })

  it('#7/#14 G05: felling the oak at any hour ends it; a felled candidate is never the boundary tree', () => {
    const sim = offer('g05')
    choose(sim, 'g05', 'mi_open', 'walk')
    const a = resolveAnchor(ctxOf(sim, questDef(sim, 'g05')!, stateOf(sim, 'g05')!), { k: 'boundary' })!
    const n = sim.nodes.byId(a.id!)!
    addItem(sim.player.inv, newStack('axe'))
    setHour(sim, 5)
    sim.player.x = n.x + 2
    sim.player.z = n.z
    sim.actors.update(sim.player)
    fellTree(sim, sim.player, n)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'g05')).toMatchObject({ status: 'done', ending: 'felled_at_night' })
    // A second world: the best tree is already felled before the quest is offered.
    const s2 = testSim()
    playerFarAway(s2)
    setDayHour(s2, 5, 10)
    s2.state.px.visited = [neighbourId(s2)]
    tickQuests(s2, 31)
    const a2 = resolveAnchor(ctxOf(s2, questDef(s2, 'g05')!, stateOf(s2, 'g05')!), { k: 'boundary' })!
    expect(s2.state.nodes[a2.id!]?.kind).not.toBe('felled')
  })

  it('#8 Q02: a dead sow does not stall the quest — the hollow can still be found and reported', () => {
    const sim = offer('q02')
    choose(sim, 'q02', 'ed_open', 'help')
    const fl = stateOf(sim, 'q02')!.flags
    fl.tracksRead = true
    const sow = castAnimal(sim, 'q02', 'sow')
    sow.vitals.dead = true
    const den = resolveAnchor(ctxOf(sim, questDef(sim, 'q02')!, stateOf(sim, 'q02')!), { k: 'roadSide', frac: 0.7, off: 18 })!
    sim.player.x = den.x + 10
    sim.player.z = den.z
    sim.actors.update(sim.player)
    tickQuests(sim, 12)
    expect(fl.hollowFound).toBe(true)
  })

  it('#13/#19 a mid-quest save of the creature den, a quest contract and tagged items survives a JSON round trip; the den timer is finite', () => {
    const sim = offer('q02')
    choose(sim, 'q02', 'ed_open', 'help')
    const den = sim.state.dens.find((d) => d.id === 'qden:q02')!
    expect(Number.isFinite(den.nextSpawn)).toBe(true)
    const copy = JSON.parse(JSON.stringify(sim.state))
    const loaded = new Sim(sim.world, copy)
    expect(loaded.state.animals.filter((a) => a.denId === 'qden:q02' && a.leash === 14).length).toBe(6)
    loaded.step(0.1)
    tickQuests(loaded, 3)
    expect(loaded.state.authoredQuests.q02!.status).toBe('active')
  })

  it('#21 the deadline text never reads "24 h"', () => {
    const sim = offer('g04')
    const def = questDef(sim, 'g04')!
    const st = stateOf(sim, 'g04')!
    st.status = 'active'
    st.startedAt = sim.state.time.cal - 0.5 * 3600
    const t = timeLeftText(def, st, ctxOf(sim, def, st))
    expect(t).toBe('Time left: 2 days.')
    expect(t).not.toMatch(/ 24 h/)
  })
})
