/**
 * QUEST-03 — Q02 "The Hollow Below the Road": a den group (sow + five young), tracks/hollow/farrow observations, the clear /
 * reroute / watch endings and the settled-by-{V} fallback (quests--003 W2).
 */
import { describe, expect, it } from 'vitest'
import { burnDen } from './actions'
import { killAnimal } from './combat'
import { addItem, newStack } from './inventory'
import { ctxOf, neighbourId, resolveAnchor } from './questCore'
import { questDef, questEvent } from './questEngine'
import { castAnimal, castHuman, choose, hoursLater, setDayHour, setHour, stateOf, tickQuests } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  sim.state.px.visited = [neighbourId(sim)]
  tickQuests(sim, 31)
  expect(stateOf(sim, 'q02')?.status).toBe('offered')
  return sim
}

const at = (sim: Sim, a: Parameters<typeof resolveAnchor>[1]) => resolveAnchor(ctxOf(sim, questDef(sim, 'q02')!, stateOf(sim, 'q02')!), a)!
const bend = { k: 'roadSide', frac: 0.7, off: 2 } as const
const den = { k: 'roadSide', frac: 0.7, off: 18 } as const
const flags = (sim: Sim) => stateOf(sim, 'q02')!.flags

function standAt(sim: Sim, x: number, z: number) {
  sim.player.x = x
  sim.player.z = z
  sim.actors.update(sim.player)
}

function accepted(sim: Sim) {
  choose(sim, 'q02', 'ed_open', 'help')
  expect(stateOf(sim, 'q02')?.status).toBe('active')
}

/** Tracks read, hollow found, farrow counted — through the real observations. */
function scouted(sim: Sim) {
  const b = at(sim, bend)
  standAt(sim, b.x, b.z)
  setHour(sim, 6)
  tickQuests(sim, 6)
  expect(flags(sim).tracksRead).toBe(true)
  const d = at(sim, den)
  standAt(sim, d.x + 20, d.z)
  tickQuests(sim, 5)
  expect(flags(sim).hollowFound).toBe(true)
  standAt(sim, d.x + 16, d.z)
  tickQuests(sim, 10)
  expect(flags(sim).farrowCounted).toBe(true)
}

function reported(sim: Sim) {
  scouted(sim)
  choose(sim, 'q02', 'br_report', 'report')
  expect(stateOf(sim, 'q02')!.stage).toBe(3)
}

describe('QUEST-03 Q02 The Hollow Below the Road', () => {
  it('accepting creates the sow with five young, a burnable den and a leash; an unaccepted quest changes nothing', () => {
    const sim = offered()
    expect(sim.state.animals.some((a) => a.denId === 'qden:q02')).toBe(false)
    accepted(sim)
    const group = sim.state.animals.filter((a) => a.denId === 'qden:q02')
    expect(group.length).toBe(6)
    expect(group.filter((a) => a.variant === 'young').length).toBe(5)
    expect(group.every((a) => a.species === 'boar' && a.leash === 14)).toBe(true)
    const d = sim.state.dens.find((x) => x.id === 'qden:q02')!
    expect(d.alive).toBe(true)
    expect(d.maxCount).toBe(0) // never restocked
    const sow = castAnimal(sim, 'q02', 'sow')
    expect(Math.hypot(sow.x - at(sim, den).x, sow.z - at(sim, den).z)).toBeLessThan(1)
  })

  it('the leashed group stays within reach of its den over ten simulated minutes', () => {
    const sim = offered()
    accepted(sim)
    const d = at(sim, den)
    standAt(sim, d.x + 60, d.z)
    for (let n = 0; n < 6000; n++) sim.step(0.1)
    for (const a of sim.state.animals.filter((x) => x.denId === 'qden:q02' && !x.vitals.dead)) {
      expect(Math.hypot(a.x - d.x, a.z - d.z), `${a.variant} ${a.id}`).toBeLessThan(40)
    }
  }, 60_000)

  it('tracks need first light; the hollow needs a calm sow; a spooked sow does not end the quest', () => {
    const sim = offered()
    accepted(sim)
    const b = at(sim, bend)
    standAt(sim, b.x, b.z)
    setHour(sim, 13)
    tickQuests(sim, 6)
    expect(flags(sim).tracksRead).toBe(false)
    const sow = castAnimal(sim, 'q02', 'sow')
    sow.aggroUntil = sim.state.time.play + 30 // she is already after somebody: not calm
    setHour(sim, 6)
    tickQuests(sim, 6)
    expect(flags(sim).tracksRead).toBe(true)
    const d = at(sim, den)
    standAt(sim, d.x + 20, d.z)
    tickQuests(sim, 6)
    expect(flags(sim).hollowFound).toBe(false)
    expect(flags(sim).spooked).toBe(true)
    expect(stateOf(sim, 'q02')?.status).toBe('active')
    sow.aggroUntil = undefined
    tickQuests(sim, 6)
    expect(flags(sim).hollowFound).toBe(true)
  })

  it('clear by killing the sow: needs the hollow; pays 40 c from the V treasury (conserved)', () => {
    const sim = offered()
    accepted(sim)
    reported(sim)
    const money0 = totalMoney(sim)
    choose(sim, 'q02', 'br_choose', 'clear')
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q02')?.status).toBe('active')
    killAnimal(sim, castAnimal(sim, 'q02', 'sow'))
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q02')).toMatchObject({ status: 'done', ending: 'clear' })
    expect(totalMoney(sim)).toBe(money0)
  })

  it('clear by fire: burning the den drives the sow and her young away (home moved, leash lifted), then the quest ends', () => {
    const sim = offered()
    accepted(sim)
    reported(sim)
    choose(sim, 'q02', 'br_choose', 'clear')
    addItem(sim.player.inv, newStack('branch', 5))
    addItem(sim.player.inv, newStack('torch'))
    const d = sim.state.dens.find((x) => x.id === 'qden:q02')!
    const sow = castAnimal(sim, 'q02', 'sow')
    const home0 = { x: sow.homeX, z: sow.homeZ }
    expect(burnDen(sim, sim.player, d).ok).toBe(true)
    tickQuests(sim, 3)
    expect(d.alive).toBe(false)
    expect(Math.hypot(sow.homeX - home0.x, sow.homeZ - home0.z)).toBeGreaterThan(200)
    expect(sow.leash).toBeUndefined()
    expect(sim.state.animals.filter((a) => a.denId === 'qden:q02').length).toBe(0) // the group left its den
    expect(stateOf(sim, 'q02')).toMatchObject({ status: 'done', ending: 'clear' })
  })

  it('reroute: four logs to Bridget and two days; pays 22 c and two loaves (conserved money)', () => {
    const sim = offered()
    accepted(sim)
    reported(sim)
    choose(sim, 'q02', 'br_choose', 'reroute')
    const bridget = castHuman(sim, 'q02', 'bridget')
    questEvent(sim, { k: 'give', npcId: bridget.id, item: 'log', qty: 2 })
    questEvent(sim, { k: 'give', npcId: bridget.id, item: 'log', qty: 2 })
    hoursLater(sim, 30)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q02')?.status).toBe('active')
    hoursLater(sim, 20)
    const money0 = totalMoney(sim)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q02')).toMatchObject({ status: 'done', ending: 'reroute' })
    expect(totalMoney(sim)).toBe(money0)
  })

  it('reroute needs all four logs', () => {
    const sim = offered()
    accepted(sim)
    reported(sim)
    choose(sim, 'q02', 'br_choose', 'reroute')
    questEvent(sim, { k: 'give', npcId: castHuman(sim, 'q02', 'bridget').id, item: 'log', qty: 3 })
    hoursLater(sim, 60)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q02')?.status).toBe('active')
  })

  it('watch: evening shifts at the bend pay 6 c each on different days; the quest ends after six weeks', () => {
    const sim = offered()
    accepted(sim)
    reported(sim)
    choose(sim, 'q02', 'br_choose', 'watch')
    const b = at(sim, bend)
    standAt(sim, b.x, b.z)
    setHour(sim, 19)
    const money = () => sim.player.money
    const m0 = money()
    tickQuests(sim, 130)
    expect(money() - m0).toBe(6)
    tickQuests(sim, 130)
    expect(money() - m0).toBe(6) // the same evening pays once
    hoursLater(sim, 24)
    setHour(sim, 19)
    tickQuests(sim, 130)
    expect(money() - m0).toBe(12)
    hoursLater(sim, 1010)
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q02')).toMatchObject({ status: 'done', ending: 'watch' })
  })

  it('settled by V: nobody reported for two weeks → the quest closes; ignoring the offer lapses it', () => {
    const sim = offered()
    accepted(sim)
    hoursLater(sim, 340)
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q02')).toMatchObject({ status: 'done', ending: 'settled' })
    const s2 = offered()
    hoursLater(s2, 100)
    tickQuests(s2, 3)
    expect(stateOf(s2, 'q02')?.status).toBe('lapsed')
  })
})
