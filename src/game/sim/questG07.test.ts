/**
 * QUEST-03 — G07 "Trail of the Grey Wolf": signs, the four ways out, Jacob's own hunt (quests--003 W1).
 */
import { describe, expect, it } from 'vitest'
import { addItem, newStack } from './inventory'
import { ctxOf, resolveAnchor } from './questCore'
import { questDef } from './questEngine'
import { castAnimal, castHuman, choose, setDayHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  tickQuests(sim, 31)
  expect(stateOf(sim, 'g07')?.status).toBe('offered')
  return sim
}

const flags = (sim: Sim) => stateOf(sim, 'g07')!.flags
const goTo = (sim: Sim, x: number, z: number) => {
  sim.player.x = x
  sim.player.z = z
  sim.actors.update(sim.player)
}

/** Accepts, hears Mark, and finds the print: two signs. */
function twoSigns(sim: Sim, open = 'help') {
  choose(sim, 'g07', 'ja_open', open)
  choose(sim, 'g07', 'ma_post', 'note')
  const wolf = castAnimal(sim, 'g07', 'greybeard')
  goTo(sim, wolf.x - 550, wolf.z) // the trail point is 350 m out, the den 900 m: stand on the trail (scan may move both)
  return wolf
}

describe('QUEST-03 G07 Trail of the Grey Wolf', () => {
  it('G07 offer: a unique alpha wolf is tagged and has no den', () => {
    const sim = offered()
    const wolf = castAnimal(sim, 'g07', 'greybeard')
    expect(wolf).toMatchObject({ species: 'wolf', variant: 'alpha', tag: 'greybeard' })
    expect(wolf.denId).toBeUndefined()
  })

  it('G07 kill: two signs, the wolf dies, 30 c from the treasury (conserved), courage up', () => {
    const sim = offered()
    choose(sim, 'g07', 'ja_open', 'help')
    choose(sim, 'g07', 'ma_post', 'note')
    expect(flags(sim).cluePost).toBe(true)
    // The print and den observations: stand at the wolf's own spot for the den, then an observation point for the print is found by the engine.
    const wolf = castAnimal(sim, 'g07', 'greybeard')
    const st = stateOf(sim, 'g07')!
    st.flags.cluePrint = true // the ditch print (observation geometry is covered by the den check below)
    goTo(sim, wolf.homeX, wolf.homeZ)
    tickQuests(sim, 8)
    expect(flags(sim).clueDen).toBe(true)
    expect(topicNode(sim, 'g07', castHuman(sim, 'g07', 'jacob').id)).toBe('ja_how')
    choose(sim, 'g07', 'ja_how', 'alone')
    expect(stateOf(sim, 'g07')).toMatchObject({ status: 'active', stage: 1 })
    const money0 = totalMoney(sim)
    const purse0 = sim.player.money
    // Kill it as the game does.
    wolf.vitals.dead = true
    sim.removeAnimal(wolf)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'g07')).toMatchObject({ status: 'done', ending: 'kill' })
    expect(sim.player.money).toBe(purse0 + 30)
    expect(totalMoney(sim)).toBe(money0)
  })

  it('G07 trail: the print is found 350 m out on the north trail, after accepting', () => {
    const sim = offered()
    choose(sim, 'g07', 'ja_open', 'help')
    const pt = resolveAnchor(ctxOf(sim, questDef(sim, 'g07')!, stateOf(sim, 'g07')!), { k: 'wild', bearing: 'north', m: 350 })!
    const hs = sim.world.settlements[sim.world.homeSettlement]!
    expect(Math.hypot(pt.x - hs.x, pt.z - hs.z)).toBeGreaterThan(300)
    goTo(sim, pt.x, pt.z)
    tickQuests(sim, 6)
    expect(flags(sim).cluePrint).toBe(true)
  })

  it('G07 assist: Jacob\'s arrow hurts the wolf once when the player is at the den', () => {
    const sim = offered()
    const wolf = twoSigns(sim)
    const st = stateOf(sim, 'g07')!
    st.flags.cluePrint = true
    goTo(sim, wolf.homeX, wolf.homeZ)
    tickQuests(sim, 8)
    choose(sim, 'g07', 'ja_how', 'assist')
    const hp0 = wolf.vitals.parts.torso
    tickQuests(sim, 3)
    expect(flags(sim).assisted).toBe(true)
    expect(wolf.vitals.parts.torso).toBeGreaterThan(hp0)
  })

  it('G07 drive: fire at the den, then a second day with a lit torch near him ends it; the wolf lives', () => {
    const sim = offered()
    choose(sim, 'g07', 'ja_open', 'must')
    expect(flags(sim).driveOK).toBe(true)
    choose(sim, 'g07', 'ma_post', 'note')
    const wolf = castAnimal(sim, 'g07', 'greybeard')
    stateOf(sim, 'g07')!.flags.cluePrint = true
    goTo(sim, wolf.homeX, wolf.homeZ)
    tickQuests(sim, 8)
    choose(sim, 'g07', 'ja_how', 'drive')
    sim.player.eq.off = { id: 'torch', qty: 1, dur: 100 }
    tickQuests(sim, 22)
    expect(flags(sim).driveDay1).not.toBe(0)
    expect(stateOf(sim, 'g07')?.status).toBe('active')
    sim.state.time.cal += 86400
    goTo(sim, wolf.x + 20, wolf.z)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'g07')).toMatchObject({ status: 'done', ending: 'drive' })
    expect(wolf.vitals.dead).toBeFalsy()
  })

  it('G07 poison: closed without the herbalist quest; jacobKills ends an ignored offer on day 22', () => {
    const sim = offered()
    choose(sim, 'g07', 'ja_open', 'help')
    choose(sim, 'g07', 'ma_post', 'note')
    const wolf = castAnimal(sim, 'g07', 'greybeard')
    stateOf(sim, 'g07')!.flags.cluePrint = true
    goTo(sim, wolf.homeX, wolf.homeZ)
    tickQuests(sim, 8)
    expect(() => choose(sim, 'g07', 'ja_how', 'poison')).toThrow()
    addItem(sim.player.inv, newStack('hemlock', 2))

    const s2 = offered()
    const w2 = castAnimal(s2, 'g07', 'greybeard')
    setDayHour(s2, 23, 10)
    tickQuests(s2, 2)
    expect(stateOf(s2, 'g07')?.status).toBe('lapsed')
    expect(w2.vitals.dead).toBe(true)
  })
})
