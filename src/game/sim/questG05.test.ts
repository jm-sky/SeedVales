/**
 * QUEST-03 — G05 "Disputed Oak": boundary tree anchor, evidence (two of four), reeve verdicts, felling it yourself (quests--003 W2).
 */
import { describe, expect, it } from 'vitest'
import { fellTree } from './actions'
import { addItem, countItem, newStack } from './inventory'
import { ctxOf, neighbourId, resolveAnchor } from './questCore'
import { questDef } from './questEngine'
import { castHuman, choose, itemTotal, setDayHour, setHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered(seed?: number) {
  const sim = testSim(seed)
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  sim.state.px.visited = [neighbourId(sim)]
  tickQuests(sim, 31)
  expect(stateOf(sim, 'g05')?.status).toBe('offered')
  return sim
}

const oakAnchor = (sim: Sim) => resolveAnchor(ctxOf(sim, questDef(sim, 'g05')!, stateOf(sim, 'g05')!), { k: 'boundary' })!
const flags = (sim: Sim) => stateOf(sim, 'g05')!.flags

function accepted(sim: Sim) {
  choose(sim, 'g05', 'mi_open', 'walk')
  expect(stateOf(sim, 'g05')?.status).toBe('active')
}

const evidence = (sim: Sim, ...names: string[]) => {
  for (const n of names) flags(sim)[n] = true
  tickQuests(sim, 2)
}

describe('QUEST-03 G05 Disputed Oak', () => {
  it('the boundary anchor is a real broadleaf tree between the two settlements and stays the same', () => {
    const sim = offered()
    accepted(sim)
    const a = oakAnchor(sim)
    expect(a.id).toBeTruthy()
    const n = sim.nodes.byId(a.id!)!
    expect(n.kind).toBe('tree_broad')
    expect(Math.hypot(n.x - a.x, n.z - a.z)).toBeLessThan(1)
    expect(oakAnchor(sim).id).toBe(a.id)
    // Roughly between the settlements (not at either end).
    const h = sim.world.settlements[sim.world.homeSettlement]!
    const v = sim.world.settlements[neighbourId(sim)]!
    const d = Math.hypot(h.x - v.x, h.z - v.z)
    expect(Math.hypot(n.x - h.x, n.z - h.z)).toBeGreaterThan(d * 0.2)
    expect(Math.hypot(n.x - v.x, n.z - v.z)).toBeGreaterThan(d * 0.2)
  })

  it('evidence: reading the bark counts; two findings move the quest to the verdict and open the reeve topic', () => {
    const sim = offered()
    accepted(sim)
    const reeve = castHuman(sim, 'g05', 'margaret')
    expect(topicNode(sim, 'g05', reeve.id)).toBeUndefined()
    const a = oakAnchor(sim)
    sim.player.x = a.x + 1
    sim.player.z = a.z
    sim.actors.update(sim.player)
    tickQuests(sim, 6)
    expect(flags(sim).notches).toBe(true)
    expect(stateOf(sim, 'g05')!.stage).toBe(1)
    expect(topicNode(sim, 'g05', reeve.id)).toBeUndefined() // one finding is not enough
    choose(sim, 'g05', 'el_witness', 'ok')
    tickQuests(sim, 2)
    expect(flags(sim).witness).toBe(true)
    expect(stateOf(sim, 'g05')!.stage).toBe(2)
    expect(topicNode(sim, 'g05', reeve.id)).toBe('reeve')
  })

  it('Cedric\'s compromise needs two findings; the shared verdict needs it and pays 12 + 12 (conserved), the oak stands', () => {
    const sim = offered()
    accepted(sim)
    expect(() => choose(sim, 'g05', 'ce_talk', 'deal')).toThrow(/disabled/)
    evidence(sim, 'notches', 'stone')
    expect(() => choose(sim, 'g05', 'reeve', 'shared')).toThrow(/disabled/)
    choose(sim, 'g05', 'ce_talk', 'deal')
    const money0 = totalMoney(sim)
    choose(sim, 'g05', 'reeve', 'shared')
    expect(stateOf(sim, 'g05')).toMatchObject({ status: 'done', ending: 'shared' })
    expect(totalMoney(sim)).toBe(money0)
    const a = oakAnchor(sim)
    expect(sim.state.nodes[a.id!]).toBeUndefined()
    expect(flags(sim).fellingRights).toBe(true)
  })

  it('for_h: Miles fells the oak (4 logs into his store, once), the H treasury pays 15; for_v: the oak stands and V pays 15', () => {
    const sim = offered()
    accepted(sim)
    evidence(sim, 'notches', 'witness')
    const a = oakAnchor(sim)
    const miles = castHuman(sim, 'g05', 'miles')
    const logs0 = itemTotal(sim, 'log')
    const store = () => countItem(sim.state.buildings.find((b) => b.id === sim.state.households[miles.householdId]!.houseId)?.inv ?? { items: [] }, 'log')
    const store0 = store()
    const money0 = totalMoney(sim)
    choose(sim, 'g05', 'reeve', 'for_h')
    expect(stateOf(sim, 'g05')).toMatchObject({ status: 'done', ending: 'for_h' })
    expect(sim.state.nodes[a.id!]?.kind).toBe('felled')
    expect(itemTotal(sim, 'log') - logs0).toBe(4)
    expect(store() - store0, 'logs land in Miles\'s household store').toBe(4)
    expect(totalMoney(sim)).toBe(money0)

    const s2 = offered()
    accepted(s2)
    evidence(s2, 'stone', 'age')
    const m2 = totalMoney(s2)
    choose(s2, 'g05', 'reeve', 'for_v')
    expect(stateOf(s2, 'g05')).toMatchObject({ status: 'done', ending: 'for_v' })
    expect(s2.state.nodes[oakAnchor(s2).id!]).toBeUndefined()
    expect(totalMoney(s2)).toBe(m2)
  })

  it('felling the oak yourself — at night or in daylight — ends the quest in disgrace with a log price rise in both villages', () => {
    for (const hour of [23, 12]) {
      const sim = offered()
      accepted(sim)
      setHour(sim, hour)
      const a = oakAnchor(sim)
      const n = sim.nodes.byId(a.id!)!
      addItem(sim.player.inv, newStack('axe'))
      sim.player.x = n.x + 2
      sim.player.z = n.z
      sim.actors.update(sim.player)
      const logs = countItem(sim.player.inv, 'log')
      expect(fellTree(sim, sim.player, n).ok).toBe(true)
      tickQuests(sim, 2)
      expect(stateOf(sim, 'g05')).toMatchObject({ status: 'done', ending: 'felled_at_night' })
      expect(countItem(sim.player.inv, 'log')).toBeGreaterThan(logs)
      expect(sim.state.priceMods?.some((m) => m.item === 'log' && m.why.startsWith('g05:'))).toBe(true)
      expect(sim.state.nodes[a.id!]?.kind).toBe('felled')
    }
  })

  it('the quest lapses when nobody takes it up', () => {
    const sim = offered()
    sim.state.time.cal += 130 * 3600
    tickQuests(sim, 3)
    expect(stateOf(sim, 'g05')?.status).toBe('lapsed')
  })
})
