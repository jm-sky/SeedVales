/**
 * QUEST-03 — Q05 "The Map That Missed the River": T cast, landmark anchor, dig for the strongbox, the minted contents,
 * three endings, theft (quests--003 W3).
 */
import { describe, expect, it } from 'vitest'
import { countItem } from './inventory'
import { ctxOf, resolveAnchor, townId } from './questCore'
import { questDef, questEvent } from './questEngine'
import { castHuman, choose, itemTotal, setDayHour, stateOf, tickQuests } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  sim.state.px.visited = [townId(sim)]
  tickQuests(sim, 31)
  expect(stateOf(sim, 'q05')?.status).toBe('offered')
  return sim
}

const anchor = (sim: Sim, a: Parameters<typeof resolveAnchor>[1]) => resolveAnchor(ctxOf(sim, questDef(sim, 'q05')!, stateOf(sim, 'q05')!), a)!
const circle = { k: 'landmark', kind: 'stone_circle', pick: 'nearestRoad', road: ['V', 'T'] } as const
const flags = (sim: Sim) => stateOf(sim, 'q05')!.flags
const standAt = (sim: Sim, x: number, z: number) => {
  sim.player.x = x
  sim.player.z = z
  sim.actors.update(sim.player)
}

/** Accepted, circle found, box dug up and carried to Rosalind, box opened: ready to choose. */
function opened(sim: Sim) {
  choose(sim, 'q05', 'ro_open', 'go')
  const c = anchor(sim, circle)
  standAt(sim, c.x - 8, c.z)
  tickQuests(sim, 6)
  expect(flags(sim).circleFound).toBe(true)
  questEvent(sim, { k: 'dig', x: c.x + 6.5, z: c.z })
  tickQuests(sim, 2)
  expect(flags(sim).chestFound).toBe(true)
  expect(countItem(sim.player.inv, 'strongbox_dulcie')).toBe(1)
  const money0 = totalMoney(sim)
  choose(sim, 'q05', 'ro_box', 'open')
  expect(totalMoney(sim) - money0, 'the coins in the box are minted once').toBe(180)
  expect(countItem(sim.player.inv, 'strongbox_dulcie')).toBe(0)
}

describe('QUEST-03 Q05 The Map That Missed the River', () => {
  it('needs {T} visited and a stone circle by the V–T road; the anchor lies within 1.2 km of that road', () => {
    const sim = testSim()
    playerFarAway(sim)
    setDayHour(sim, 5, 10)
    tickQuests(sim, 31)
    expect(stateOf(sim, 'q05')).toBeUndefined() // T not visited
    sim.state.px.visited = [townId(sim)]
    tickQuests(sim, 31)
    expect(stateOf(sim, 'q05')?.status).toBe('offered')
    const c = anchor(sim, circle)
    expect(sim.world.landmarks.some((l) => l.kind === 'stone_circle' && l.x === c.x && l.z === c.z)).toBe(true)
  })

  it('digging the first hollow finds nothing; the east stone gives the box once', () => {
    const sim = offered()
    choose(sim, 'q05', 'ro_open', 'go')
    const c = anchor(sim, circle)
    questEvent(sim, { k: 'dig', x: c.x, z: c.z })
    tickQuests(sim, 2)
    expect(flags(sim).hollowDug).toBe(true)
    expect(flags(sim).chestFound).toBe(false)
    questEvent(sim, { k: 'dig', x: c.x + 6.5, z: c.z })
    questEvent(sim, { k: 'dig', x: c.x + 6.5, z: c.z })
    tickQuests(sim, 2)
    expect(countItem(sim.player.inv, 'strongbox_dulcie')).toBe(1)
  })

  it('family: Rosalind sells an emerald to Silas and pays 190 c; money only moves after the minted 180 (conserved)', () => {
    const sim = offered()
    opened(sim)
    const money0 = totalMoney(sim)
    const player0 = sim.player.money
    choose(sim, 'q05', 'ro_choice', 'family')
    expect(stateOf(sim, 'q05')).toMatchObject({ status: 'done', ending: 'family' })
    expect(totalMoney(sim)).toBe(money0)
    expect(sim.player.money - player0).toBeGreaterThan(0)
    expect(sim.player.money - player0).toBeLessThanOrEqual(190)
  })

  it('keep_gem: one emerald instead of coin', () => {
    const sim = offered()
    opened(sim)
    const gems = itemTotal(sim, 'emerald')
    choose(sim, 'q05', 'ro_choice', 'gem')
    expect(stateOf(sim, 'q05')).toMatchObject({ status: 'done', ending: 'keep_gem' })
    expect(countItem(sim.player.inv, 'emerald')).toBe(1)
    expect(itemTotal(sim, 'emerald')).toBe(gems)
  })

  it('ford: Percy comes along as a companion, walks the dry bed with the player, the bend is named; renown in T and V', () => {
    const sim = offered()
    opened(sim)
    flags(sim).oldBedFound = true
    const percy = castHuman(sim, 'q05', 'percy')
    choose(sim, 'q05', 'ro_choice', 'ford')
    expect(percy.companion).toBeTruthy()
    const bed = anchor(sim, { k: 'offset', of: circle, dx: -22, dz: 6 })
    standAt(sim, bed.x, bed.z)
    percy.x = bed.x + 2
    percy.z = bed.z
    sim.actors.update(percy)
    const money0 = totalMoney(sim)
    tickQuests(sim, 8)
    expect(stateOf(sim, 'q05')).toMatchObject({ status: 'done', ending: 'ford' })
    expect(percy.companion).toBeUndefined()
    expect(totalMoney(sim)).toBe(money0)
    expect(flags(sim).dulciesBend).toBe(true)
  })

  it('keeping the box for three days lapses the quest with an honesty loss in T', () => {
    const sim = offered()
    choose(sim, 'q05', 'ro_open', 'go')
    const c = anchor(sim, circle)
    standAt(sim, c.x - 8, c.z)
    tickQuests(sim, 6)
    questEvent(sim, { k: 'dig', x: c.x + 6.5, z: c.z })
    tickQuests(sim, 2)
    const rep0 = sim.state.settlements[townId(sim)]!.rep.honesty
    sim.state.time.cal += 74 * 3600
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q05')?.status).toBe('lapsed')
    expect(sim.state.settlements[townId(sim)]!.rep.honesty).toBeLessThan(rep0)
  })
})
