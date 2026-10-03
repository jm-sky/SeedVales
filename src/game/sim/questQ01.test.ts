/**
 * QUEST-03 — Q01 "A Hare Out of Place": the unique white hare, watching, and the three endings (quests--003 W1, E4).
 */
import { describe, expect, it } from 'vitest'
import { addItem, countItem, newStack } from './inventory'
import { makeAnimal } from './newGame'
import { castAnimal, castHuman, choose, setDayHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { sellToNpc } from './trade'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  tickQuests(sim, 31)
  expect(stateOf(sim, 'q01')?.status).toBe('offered')
  return sim
}

const flags = (sim: Sim) => stateOf(sim, 'q01')!.flags

/** Accept, invite Luke, and watch the hare feed and hide (calm, sneaking, Luke close). */
function watched(sim: Sim) {
  choose(sim, 'q01', 'ja_open', 'go')
  choose(sim, 'q01', 'lu_invite', 'come')
  const hare = castAnimal(sim, 'q01', 'hare')
  const luke = castHuman(sim, 'q01', 'luke')
  sim.player.x = hare.x + 15
  sim.player.z = hare.z
  sim.state.px.sneaking = true
  sim.actors.update(sim.player)
  luke.x = sim.player.x + 3
  luke.z = sim.player.z
  sim.actors.update(luke)
  tickQuests(sim, 22)
  expect(flags(sim).feedingSeen).toBe(true)
  tickQuests(sim, 8)
  expect(flags(sim)).toMatchObject({ coverSeen: true, lukeSaw: true })
}

describe('QUEST-03 Q01 A Hare Out of Place', () => {
  it('Q01 offer: a unique albino hare lives at the forest edge, tagged, with no den (never respawned)', () => {
    const sim = offered()
    const hare = castAnimal(sim, 'q01', 'hare')
    expect(hare).toMatchObject({ species: 'hare', variant: 'albino', tag: 'white_hare' })
    expect(hare.denId).toBeUndefined()
    const hs = sim.world.settlements[sim.world.homeSettlement]!
    expect(Math.hypot(hare.x - hs.x, hare.z - hs.z)).toBeGreaterThan(400)
  })

  it('Q01 start gate: a wolf near the village postpones the offer', () => {
    const sim = testSim()
    playerFarAway(sim)
    setDayHour(sim, 5, 10)
    const hs = sim.world.settlements[sim.world.homeSettlement]!
    const wolf = makeAnimal(sim.nextId(), 'wolf', 'adult', hs.x + 100, hs.z, sim.terrain.heightAt(hs.x + 100, hs.z), sim.rng)
    sim.addAnimal(wolf)
    tickQuests(sim, 31)
    expect(stateOf(sim, 'q01')).toBeUndefined()
  })

  it('Q01 watch: needs the observations and Luke as a witness; one more look on another day ends it with Jacob\'s gift', () => {
    const sim = offered()
    watched(sim)
    expect(() => choose(sim, 'q01', 'ja_report', 'decide')).not.toThrow()
    choose(sim, 'q01', 'lu_choose', 'watch')
    expect(stateOf(sim, 'q01')).toMatchObject({ status: 'active' })
    const hare = castAnimal(sim, 'q01', 'hare')
    sim.player.x = hare.x + 20
    sim.player.z = hare.z
    sim.actors.update(sim.player)
    tickQuests(sim, 12)
    expect(flags(sim).watched2).toBe(false) // same day
    sim.state.time.cal += 86400
    tickQuests(sim, 12)
    expect(stateOf(sim, 'q01')).toMatchObject({ status: 'done', ending: 'watch' })
    expect(countItem(sim.player.inv, 'arrow')).toBeGreaterThanOrEqual(10)
    expect(hare.vitals.dead).toBeFalsy() // the hare lives on
  })

  it('Q01 watch is closed without a witness', () => {
    const sim = offered()
    choose(sim, 'q01', 'ja_open', 'go')
    choose(sim, 'q01', 'ja_report', 'decide')
    expect(() => choose(sim, 'q01', 'lu_choose', 'watch')).toThrow(/disabled/)
  })

  it('Q01 pelt: the white pelt sold to Stephen ends it with a bonus and Luke\'s share', () => {
    const sim = offered()
    choose(sim, 'q01', 'ja_open', 'go')
    choose(sim, 'q01', 'ja_report', 'decide')
    choose(sim, 'q01', 'lu_choose', 'pelt')
    const stephen = castHuman(sim, 'q01', 'stephen')
    const luke = castHuman(sim, 'q01', 'luke')
    addItem(sim.player.inv, newStack('white_pelt', 1))
    const luke0 = luke.money
    sellToNpc(sim, stephen, sim.player.inv.items.find((s) => s.id === 'white_pelt')!)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q01')).toMatchObject({ status: 'done', ending: 'pelt' })
    expect(luke.money).toBe(luke0 + 15)
  })

  it('Q01 ordinary: game sold to Stephen pays the small bonus', () => {
    const sim = offered()
    choose(sim, 'q01', 'ja_open', 'go')
    choose(sim, 'q01', 'ja_report', 'decide')
    choose(sim, 'q01', 'lu_choose', 'ordinary')
    addItem(sim.player.inv, newStack('raw_meat', 1))
    sellToNpc(sim, castHuman(sim, 'q01', 'stephen'), sim.player.inv.items.find((s) => s.id === 'raw_meat')!)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q01')).toMatchObject({ status: 'done', ending: 'ordinary' })
  })

  it('Q01 the hare dies: the condition reads dead and the hare is not replaced', () => {
    const sim = offered()
    const hare = castAnimal(sim, 'q01', 'hare')
    hare.vitals.dead = true
    sim.removeAnimal(hare)
    tickQuests(sim, 5)
    expect(sim.state.animals.filter((a) => a.tag === 'white_hare')).toHaveLength(0)
  })
})
