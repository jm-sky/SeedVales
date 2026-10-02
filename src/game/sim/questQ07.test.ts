/**
 * QUEST-03 — Q07 "Six Bowls, One Pan": one test per ending, headless through the engine (quests--001 step 4).
 */
import { describe, expect, it } from 'vitest'
import { completeRoast } from './cooking'
import { runOption } from './interact'
import { addItem, countItem, newStack } from './inventory'
import { castHuman, choose, heldActors, hoursLater, houseOfNpc, itemTotal, setHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { testSim } from './testWorld'
import { totalMoney } from './treasury'

function offered() {
  const sim = testSim()
  // Start condition: the player has standing with the woodcutter household (opinion ≥ 10).
  for (const n of sim.state.npcs) if (sim.state.households[n.householdId]?.profession === 'woodcutter') n.opinion = 12
  tickQuests(sim, 31)
  expect(stateOf(sim, 'q07')?.status).toBe('offered')
  return sim
}

function accept(sim: ReturnType<typeof testSim>) {
  choose(sim, 'q07', 'l_open', 'accept')
  expect(stateOf(sim, 'q07')!.stage).toBe(1)
  choose(sim, 'q07', 'l_stores', 'examine_meat')
  expect(stateOf(sim, 'q07')!.flags.freshnessChecked).toBe(true)
}

/** Roasts `batches` batches of two pieces at the settlement hearth (pan in the pack). */
function roast(sim: ReturnType<typeof testSim>, batches: number) {
  const p = sim.player
  const fire = sim.state.buildings.find((b) => b.kind === 'campfire' && b.lit && b.settlementId === 0)!
  p.x = fire.x + 2
  p.z = fire.z
  sim.actors.update(p)
  addItem(p.inv, newStack('pan'))
  addItem(p.inv, newStack('raw_meat', 2 * batches))
  for (let i = 0; i < batches; i++) expect(completeRoast(sim, p, 2).ok).toBe(true)
}

/** Lights every torch post of the home settlement at dusk (the player action `light`). */
function lightAllPosts(sim: ReturnType<typeof testSim>) {
  setHour(sim, 17.5)
  for (const b of sim.settlementBuildings(0, 'torchpost')) {
    b.lit = false
    runOption(sim, { type: 'building', id: b.id }, 'light')
  }
}

describe('QUEST-03 Q07 Six Bowls, One Pan', () => {
  it('QUEST-03 Q07: is offered once the household likes the player (opinion ≥ 10)', () => {
    const sim = testSim()
    tickQuests(sim, 31)
    expect(stateOf(sim, 'q07')).toBeUndefined()
    for (const n of sim.state.npcs) if (sim.state.households[n.householdId]?.profession === 'woodcutter') n.opinion = 10
    tickQuests(sim, 31)
    expect(stateOf(sim, 'q07')?.status).toBe('offered')
  })

  it('QUEST-03 Q07 E1: one table — Mark\'s round walked, meal served; meat consumed, money constant, torches for Mark\'s friends', () => {
    const sim = offered()
    accept(sim)
    const mark = castHuman(sim, 'q07', 'mark')
    expect(topicNode(sim, 'q07', mark.id)).toBe('m_gate')
    choose(sim, 'q07', 'm_gate', 'round')
    expect(mark.questHold?.q).toBe('q07')
    expect(topicNode(sim, 'q07', mark.id)).toBe('m_wait')
    // Not all posts lit yet: Mark stays on the settlement fire.
    const posts = sim.settlementBuildings(0, 'torchpost')
    setHour(sim, 17.5)
    posts[0]!.lit = false
    runOption(sim, { type: 'building', id: posts[0]!.id }, 'light')
    runOption(sim, { type: 'building', id: posts[0]!.id }, 'douse')
    runOption(sim, { type: 'building', id: posts[0]!.id }, 'light') // the same post twice counts once
    expect(stateOf(sim, 'q07')!.counters.posts).toBe(1)
    tickQuests(sim)
    expect(stateOf(sim, 'q07')!.flags.markCovered).toBe(false)
    lightAllPosts(sim)
    tickQuests(sim)
    expect(stateOf(sim, 'q07')!.flags.markCovered).toBe(true)
    const lucyHouse = houseOfNpc(sim, castHuman(sim, 'q07', 'lucy'))
    expect(mark.questHold).toMatchObject({ q: 'q07', x: lucyHouse.x, z: lucyHouse.z }) // Mark now waits at the Hewers' table
    roast(sim, 2)
    tickQuests(sim)
    expect(stateOf(sim, 'q07')).toMatchObject({ stage: 2 })
    expect(stateOf(sim, 'q07')!.flags.cooked).toBe(true)
    const lucy = castHuman(sim, 'q07', 'lucy')
    expect(topicNode(sim, 'q07', lucy.id)).toBe('l_meal')
    const money = totalMoney(sim)
    const meat = itemTotal(sim, 'cooked_meat')
    const bread = itemTotal(sim, 'bread')
    choose(sim, 'q07', 'l_meal', 'together')
    lucy.vitals.social = 20
    choose(sim, 'q07', 'l_together', 'serve_together')
    expect(stateOf(sim, 'q07')).toMatchObject({ status: 'done', ending: 'together' })
    expect(lucy.vitals.social).toBe(60)
    expect(itemTotal(sim, 'cooked_meat')).toBe(meat - 4) // the only sink: the meal
    expect(itemTotal(sim, 'bread')).toBe(bread)
    expect(totalMoney(sim)).toBe(money)
    expect(heldActors(sim, 'q07')).toBe(0)
    // Mark lets the player take a torch from his rack — once a day.
    expect(topicNode(sim, 'q07', mark.id)).toBe('m_torches')
    const torches = countItem(sim.player.inv, 'torch')
    choose(sim, 'q07', 'm_torches', 'take_torch')
    expect(countItem(sim.player.inv, 'torch')).toBe(torches + 1)
    expect(topicNode(sim, 'q07', mark.id)).toBeUndefined()
    hoursLater(sim, 24)
    expect(topicNode(sim, 'q07', mark.id)).toBe('m_torches')
  })

  it('QUEST-03 Q07: "one table" needs Mark\'s round, "two sittings" needs two batches', () => {
    const sim = offered()
    accept(sim)
    roast(sim, 1)
    roast(sim, 1) // two batches, 4 pieces
    tickQuests(sim)
    expect(stateOf(sim, 'q07')!.flags.cooked).toBe(true)
    expect(() => choose(sim, 'q07', 'l_meal', 'together')).toThrow(/disabled/)
    choose(sim, 'q07', 'l_meal', 'shifts')
  })

  it('QUEST-03 Q07 E2: two sittings — two batches, a smaller opinion gain', () => {
    const sim = offered()
    accept(sim)
    roast(sim, 2)
    tickQuests(sim)
    const lucy = castHuman(sim, 'q07', 'lucy')
    const op = lucy.opinion
    const money = totalMoney(sim)
    choose(sim, 'q07', 'l_meal', 'shifts')
    choose(sim, 'q07', 'l_shifts', 'serve_shifts')
    expect(stateOf(sim, 'q07')).toMatchObject({ status: 'done', ending: 'shifts', choice: 'shifts' })
    expect(lucy.opinion).toBe(op + 5)
    expect(totalMoney(sim)).toBe(money)
    expect(heldActors(sim, 'q07')).toBe(0)
  })

  it('QUEST-03 Q07 E3: on the doorstep — Mark keeps his post; serving needs 4 roast pieces', () => {
    const sim = offered()
    accept(sim)
    const mark = castHuman(sim, 'q07', 'mark')
    choose(sim, 'q07', 'm_gate', 'by_door')
    expect(mark.questHold).toBeUndefined() // the doorstep option does not hold Mark
    roast(sim, 2)
    tickQuests(sim)
    choose(sim, 'q07', 'l_meal', 'doorstep')
    sim.player.inv.items = sim.player.inv.items.filter((s) => s.id !== 'cooked_meat')
    expect(() => choose(sim, 'q07', 'l_doorstep', 'serve_doorstep')).toThrow(/disabled/)
    addItem(sim.player.inv, newStack('cooked_meat', 4))
    choose(sim, 'q07', 'l_doorstep', 'serve_doorstep')
    expect(stateOf(sim, 'q07')).toMatchObject({ status: 'done', ending: 'doorstep' })
    expect(heldActors(sim, 'q07')).toBe(0)
  })

  it('QUEST-03 Q07: the quest lapses after 4 days and Mark is released (he was never meant to wait forever)', () => {
    const sim = offered()
    accept(sim)
    const mark = castHuman(sim, 'q07', 'mark')
    choose(sim, 'q07', 'm_gate', 'round')
    expect(heldActors(sim, 'q07')).toBe(1)
    hoursLater(sim, 97)
    tickQuests(sim)
    expect(stateOf(sim, 'q07')!.status).toBe('lapsed')
    expect(mark.questHold).toBeUndefined()
  })
})
