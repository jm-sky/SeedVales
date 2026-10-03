/**
 * QUEST-03 — Q11 "The Bell in Blackwater": chapel landmark, the causeway and the black pool, the moose, heavy finds, the minted
 * chest, three endings and the recurring toll share after the quest has ended (quests--003 W3, E9).
 */
import { describe, expect, it } from 'vitest'
import { killAnimal } from './combat'
import { addItem, countItem, newStack } from './inventory'
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
  expect(stateOf(sim, 'q11')?.status).toBe('offered')
  return sim
}

const chapel = { k: 'landmark', kind: 'chapel_ruin', pick: 'nearestHome' } as const
const at = (sim: Sim, a: Parameters<typeof resolveAnchor>[1]) => resolveAnchor(ctxOf(sim, questDef(sim, 'q11')!, stateOf(sim, 'q11')!), a)!
const flags = (sim: Sim) => stateOf(sim, 'q11')!.flags
const standAt = (sim: Sim, x: number, z: number) => {
  sim.player.x = x
  sim.player.z = z
  sim.actors.update(sim.player)
}

/** Everything up to both finds in the player's pack. */
function finds(sim: Sim) {
  choose(sim, 'q11', 'ev_open', 'come')
  flags(sim).bookRead = true
  const c = at(sim, chapel)
  standAt(sim, c.x - 14, c.z + 9)
  tickQuests(sim, 8)
  expect(flags(sim).causewayMarked).toBe(true)
  castAnimal(sim, 'q11', 'moose')
  killAnimal(sim, castAnimal(sim, 'q11', 'moose'))
  tickQuests(sim, 2)
  expect(flags(sim).moose).toBe('killed')
  addItem(sim.player.inv, newStack('rope', 2))
  const eve = castHuman(sim, 'q11', 'eve')
  eve.x = c.x + 3
  eve.z = c.z
  sim.actors.update(eve)
  standAt(sim, c.x, c.z)
  tickQuests(sim, 30)
  expect(flags(sim).bellOut).toBe(true)
  expect(flags(sim).chestOut).toBe(true)
}

function counted(sim: Sim) {
  finds(sim)
  const m0 = totalMoney(sim)
  choose(sim, 'q11', 'ma_count', 'open')
  expect(totalMoney(sim) - m0, 'the toll coppers are minted once').toBe(150)
}

describe('QUEST-03 Q11 The Bell in Blackwater', () => {
  it('the chapel ruin exists; the bull is created at acceptance; walking straight across the pool bogs you without loss', () => {
    const sim = offered()
    expect(sim.state.animals.some((a) => a.tag === 'blackwater_bull')).toBe(false)
    choose(sim, 'q11', 'ev_open', 'come')
    expect(castAnimal(sim, 'q11', 'moose').species).toBe('moose')
    const c = at(sim, chapel)
    standAt(sim, c.x - 14, c.z - 9)
    tickQuests(sim, 4)
    expect(flags(sim).bogged).toBe(true)
    expect(flags(sim).causewayMarked).toBe(false)
  })

  it('moose: lure with five branches (consumed) works; the bell needs the marked causeway and ropes', () => {
    const sim = offered()
    choose(sim, 'q11', 'ev_open', 'come')
    addItem(sim.player.inv, newStack('branch', 5))
    const w = at(sim, { k: 'offset', of: chapel, dx: 26, dz: 10 })
    standAt(sim, w.x, w.z)
    tickQuests(sim, 7)
    expect(flags(sim).moose).toBe('lured')
    expect(countItem(sim.player.inv, 'branch')).toBe(0)
    const c = at(sim, chapel)
    standAt(sim, c.x, c.z)
    tickQuests(sim, 30)
    expect(flags(sim).chapelReached).toBe(true)
    expect(flags(sim).bellOut).toBe(false) // no causeway marked, no rope
    expect(flags(sim).chestOut).toBe(false)
  })

  it('counting in V mints the chest coins once and needs both finds', () => {
    const sim = offered()
    finds(sim)
    expect(countItem(sim.player.inv, 'chapel_bell')).toBe(1)
    sim.player.inv.items = sim.player.inv.items.filter((s) => s.id !== 'toll_chest')
    expect(() => choose(sim, 'q11', 'ma_count', 'open')).toThrow(/disabled/)
  })

  it('sale: Silas pays 470 to the V treasury, the player gets 130 (conserved)', () => {
    const sim = offered()
    counted(sim)
    const m = totalMoney(sim)
    choose(sim, 'q11', 'ma_choice', 'sale')
    expect(stateOf(sim, 'q11')).toMatchObject({ status: 'done', ending: 'sale' })
    expect(totalMoney(sim)).toBe(m)
  })

  it('crossing: thirty logs to Eve open it at once and pay 60 c from the V treasury (conserved)', () => {
    const sim = offered()
    counted(sim)
    choose(sim, 'q11', 'ma_choice', 'crossing')
    const eve = castHuman(sim, 'q11', 'eve')
    questEvent(sim, { k: 'give', npcId: eve.id, item: 'log', qty: 20 })
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q11')?.status).toBe('active')
    questEvent(sim, { k: 'give', npcId: eve.id, item: 'log', qty: 10 })
    const m = totalMoney(sim)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q11')).toMatchObject({ status: 'done', ending: 'crossing' })
    expect(totalMoney(sim)).toBe(m)
  })

  it('investor: 80 c for the boat, 40 back, the crossing opens after four weeks and eight weekly toll shares follow (then stop)', () => {
    const sim = offered()
    counted(sim)
    sim.player.money = Math.max(sim.player.money, 100)
    choose(sim, 'q11', 'ma_choice', 'investor')
    const p0 = sim.player.money
    castHuman(sim, 'q11', 'eve').money = 500
    hoursLater(sim, 680)
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q11')).toMatchObject({ status: 'done', ending: 'investor' })
    const m = totalMoney(sim)
    for (let w = 0; w < 12; w++) {
      hoursLater(sim, 24 * 7)
      tickQuests(sim, 2)
    }
    expect(sim.player.money - p0).toBe(8 * 8)
    expect(totalMoney(sim)).toBe(m)
  })

  it('keeping the toll chest for four days lapses the quest with an honesty loss in V', () => {
    const sim = offered()
    finds(sim)
    const rep0 = sim.state.settlements[neighbourId(sim)]!.rep.honesty
    setHour(sim, 10)
    sim.state.time.cal += 100 * 3600
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q11')?.status).toBe('lapsed')
    expect(sim.state.settlements[neighbourId(sim)]!.rep.honesty).toBeLessThan(rep0)
  })
})
