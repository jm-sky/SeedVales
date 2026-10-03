/**
 * QUEST-03 — Q12 "The Iron Under the Pine": tower landmark beyond T, the bear, the locker, and the unique sword in exactly one
 * place per ending (quests--003 W3).
 */
import { describe, expect, it } from 'vitest'
import { killAnimal } from './combat'
import { addItem, countItem, newStack } from './inventory'
import { ctxOf, resolveAnchor, townId } from './questCore'
import { questDef } from './questEngine'
import { castAnimal, castHuman, choose, hoursLater, itemTotal, setDayHour, setHour, stateOf, tickQuests } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  sim.state.px.visited = [townId(sim)]
  tickQuests(sim, 31)
  if (!stateOf(sim, 'q12')) return null // no tower within reach of the town in this seed
  expect(stateOf(sim, 'q12')?.status).toBe('offered')
  return sim
}

const tower = { k: 'landmark', kind: 'watch_tower_ruin', pick: 'nearestTown' } as const
const at = (sim: Sim, a: Parameters<typeof resolveAnchor>[1]) => resolveAnchor(ctxOf(sim, questDef(sim, 'q12')!, stateOf(sim, 'q12')!), a)!
const flags = (sim: Sim) => stateOf(sim, 'q12')!.flags
const standAt = (sim: Sim, x: number, z: number) => {
  sim.player.x = x
  sim.player.z = z
  sim.actors.update(sim.player)
}

function sword(sim: Sim) {
  choose(sim, 'q12', 'du_open', 'go')
  tickQuests(sim, 2)
  const t = at(sim, tower)
  standAt(sim, t.x, t.z + 10)
  tickQuests(sim, 5)
  expect(flags(sim).towerReached).toBe(true)
  killAnimal(sim, castAnimal(sim, 'q12', 'bear'))
  tickQuests(sim, 2)
  expect(flags(sim).bear).toBe('killed')
  addItem(sim.player.inv, newStack('rope'))
  const mabel = castHuman(sim, 'q12', 'mabel')
  const l = at(sim, { k: 'offset', of: tower, dx: 3, dz: -3 })
  mabel.x = l.x + 2
  mabel.z = l.z
  sim.actors.update(mabel)
  standAt(sim, l.x, l.z)
  tickQuests(sim, 20)
  expect(flags(sim).swordOut).toBe(true)
  expect(countItem(sim.player.inv, 'pinewatch_longsword')).toBe(1)
}

function handed(sim: Sim) {
  sword(sim)
  choose(sim, 'q12', 'du_hand', 'give')
  expect(countItem(sim.player.inv, 'company_badge')).toBe(0)
}

describe('QUEST-03 Q12 The Iron Under the Pine', () => {
  it('needs {T} visited and a tower ruin near the town; accepting creates the leashed bear and the declared armoury stock', () => {
    const sim = offered()
    if (!sim) return
    expect(sim.state.animals.some((a) => a.tag === 'pinewatch_bear')).toBe(false)
    choose(sim, 'q12', 'du_open', 'go')
    tickQuests(sim, 2)
    expect(castAnimal(sim, 'q12', 'bear').species).toBe('bear')
    const wh = sim.building(sim.state.settlements[townId(sim)]!.warehouseId)!.inv!
    expect(countItem(wh, 'chainmail')).toBeGreaterThanOrEqual(1)
    expect(countItem(wh, 'crossbow')).toBeGreaterThanOrEqual(1)
  })

  it('the locker needs the bear dealt with, a rope and Mabel (or melee skill 30); the finds exist once', () => {
    const sim = offered()
    if (!sim) return
    choose(sim, 'q12', 'du_open', 'go')
    const t = at(sim, tower)
    standAt(sim, t.x, t.z + 10)
    tickQuests(sim, 5)
    addItem(sim.player.inv, newStack('rope'))
    const l = at(sim, { k: 'offset', of: tower, dx: 3, dz: -3 })
    standAt(sim, l.x, l.z)
    tickQuests(sim, 20)
    expect(flags(sim).swordOut).toBe(false) // the bear still holds the cellar
    const swords = itemTotal(sim, 'pinewatch_longsword')
    killAnimal(sim, castAnimal(sim, 'q12', 'bear'))
    sim.player.skills.melee = 5
    tickQuests(sim, 20)
    expect(flags(sim).swordOut).toBe(false) // no guide, too weak
    castHuman(sim, 'q12', 'mabel').x = l.x + 1
    castHuman(sim, 'q12', 'mabel').z = l.z
    sim.actors.update(castHuman(sim, 'q12', 'mabel'))
    tickQuests(sim, 20)
    expect(flags(sim).swordOut).toBe(true)
    expect(itemTotal(sim, 'pinewatch_longsword') - swords).toBe(1)
  })

  it('guard: the sword goes to Willa\'s store, an armoury piece and 40 c to the player (conserved)', () => {
    const sim = offered()
    if (!sim) return
    handed(sim)
    const m = totalMoney(sim)
    const swords = itemTotal(sim, 'pinewatch_longsword')
    choose(sim, 'q12', 'wi_choice', 'guard')
    choose(sim, 'q12', 'wi_pick', 'mail')
    expect(stateOf(sim, 'q12')).toMatchObject({ status: 'done', ending: 'guard' })
    expect(countItem(sim.player.inv, 'chainmail')).toBe(1)
    expect(countItem(sim.player.inv, 'pinewatch_longsword')).toBe(0)
    expect(itemTotal(sim, 'pinewatch_longsword')).toBe(swords)
    expect(totalMoney(sim)).toBe(m)
  })

  it('sale: Silas pays 500 to the guard treasury, the player gets 125; the sword leaves the world (conserved money)', () => {
    const sim = offered()
    if (!sim) return
    handed(sim)
    const m = totalMoney(sim)
    choose(sim, 'q12', 'wi_choice', 'sale')
    expect(stateOf(sim, 'q12')).toMatchObject({ status: 'done', ending: 'sale' })
    expect(itemTotal(sim, 'pinewatch_longsword')).toBe(0)
    expect(totalMoney(sim)).toBe(m)
  })

  it('carry: needs Duncan\'s trust, five distinct patrol days within 40 m of Willa on duty, then the player keeps the sword', () => {
    const sim = offered()
    if (!sim) return
    handed(sim)
    castHuman(sim, 'q12', 'duncan').opinion = 10
    expect(() => choose(sim, 'q12', 'wi_choice', 'carry')).toThrow(/disabled/)
    castHuman(sim, 'q12', 'duncan').opinion = 40
    choose(sim, 'q12', 'wi_choice', 'carry')
    const willa = castHuman(sim, 'q12', 'willa')
    standAt(sim, willa.x + 5, willa.z)
    for (let d = 0; d < 5; d++) {
      setHour(sim, 10)
      tickQuests(sim, 3)
      if (d < 4) expect(stateOf(sim, 'q12')?.status).toBe('active')
      hoursLater(sim, 24)
    }
    expect(stateOf(sim, 'q12')).toMatchObject({ status: 'done', ending: 'carry' })
    expect(countItem(sim.player.inv, 'pinewatch_longsword')).toBe(1)
  })
})
