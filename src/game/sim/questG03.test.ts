/**
 * QUEST-03 — G03 "Night Torches": one test per ending, headless through the engine (quests--001 step 5).
 */
import { describe, expect, it } from 'vitest'
import { castHuman, choose, heldActors, hoursLater, say, setDayHour, setHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { testSim } from './testWorld'
import { totalMoney } from './treasury'

function offered() {
  const sim = testSim()
  setDayHour(sim, 3, 12)
  tickQuests(sim, 31)
  expect(stateOf(sim, 'g03')?.status).toBe('offered')
  return sim
}

/** The torch post nearest to the hunter's house (the one that goes dark). */
function darkPost(sim: ReturnType<typeof testSim>) {
  const st = stateOf(sim, 'g03')!
  const hazel = castHuman(sim, 'g03', 'hazel')
  const house = sim.building(sim.state.households[hazel.householdId]!.houseId)!
  const posts = sim.settlementBuildings(0, 'torchpost')
  const post = [...posts].sort((a, b) => Math.hypot(a.x - house.x, a.z - house.z) - Math.hypot(b.x - house.x, b.z - house.z))[0]!
  expect(st.status).not.toBeUndefined()
  return post
}

/** Watches the dark post at night until Hazel shows up; stage 2 with Hazel held at the post. */
function nightWatch(sim: ReturnType<typeof testSim>, mode: 'watch' | 'alone') {
  const mark = castHuman(sim, 'g03', 'mark')
  expect(topicNode(sim, 'g03', mark.id)).toBe('m_open')
  choose(sim, 'g03', 'm_open', mode)
  expect(stateOf(sim, 'g03')).toMatchObject({ status: 'active', stage: 1 })
  const post = darkPost(sim)
  setHour(sim, 1)
  sim.player.x = post.x + 3
  sim.player.z = post.z
  sim.actors.update(sim.player)
  if (mode === 'alone') {
    // Alone, hiding: without sneaking nothing happens.
    sim.state.px.sneaking = false
    tickQuests(sim, 50)
    expect(stateOf(sim, 'g03')!.stage).toBe(1)
    sim.state.px.sneaking = true
  }
  tickQuests(sim, 30)
  expect(stateOf(sim, 'g03')!.stage).toBe(1) // 40 s of watching are needed
  tickQuests(sim, 15)
  expect(stateOf(sim, 'g03')!.stage).toBe(2)
  const hazel = castHuman(sim, 'g03', 'hazel')
  expect(hazel.questHold?.q).toBe('g03')
  expect(Math.hypot(hazel.x - post.x, hazel.z - post.z)).toBeLessThan(3) // Hazel is at the post
  expect(post.lit).toBe(false)
  expect(topicNode(sim, 'g03', hazel.id)).toBe('h_confront')
  return { mark, hazel, post }
}

describe('QUEST-03 G03 Night Torches', () => {
  it('QUEST-03 G03: is offered only in the first ten days and needs torch posts', () => {
    const sim = testSim()
    setDayHour(sim, 11, 12)
    tickQuests(sim, 31)
    expect(stateOf(sim, 'g03')).toBeUndefined()
    setDayHour(sim, 4, 12)
    tickQuests(sim, 31)
    expect(stateOf(sim, 'g03')?.status).toBe('offered')
  })

  it('QUEST-03 G03: a dark night — the post by the hunter\'s house is snuffed once a night while unresolved; the guard relights it', () => {
    const sim = offered()
    const post = darkPost(sim)
    post.lit = true
    setHour(sim, 23.5)
    tickQuests(sim)
    expect(post.lit).toBe(false)
    expect(stateOf(sim, 'g03')!.flags.lastSnuff).toBeGreaterThan(0)
    post.lit = true // lit again; the same night it is not snuffed a second time
    tickQuests(sim)
    expect(post.lit).toBe(true)
  })

  it('QUEST-03 G03 E1: keep watch, Hazel tells Mark together — 15 c from the treasury, money constant', () => {
    const sim = offered()
    const { mark, hazel } = nightWatch(sim, 'watch')
    const money = totalMoney(sim)
    const treasury = sim.state.settlements[0]!.treasury
    const p0 = sim.player.money
    const o = { hazel: hazel.opinion, martha: castHuman(sim, 'g03', 'martha').opinion, mark: mark.opinion }
    choose(sim, 'g03', 'h_confront', 'path_together')
    expect(hazel.questHold).toBeUndefined()
    expect(stateOf(sim, 'g03')!.stage).toBe(3)
    expect(topicNode(sim, 'g03', mark.id)).toBe('m_close')
    choose(sim, 'g03', 'm_close', 'close_together')
    expect(stateOf(sim, 'g03')).toMatchObject({ status: 'done', ending: 'together', choice: 'together' })
    expect(sim.player.money).toBe(p0 + 15)
    expect(sim.state.settlements[0]!.treasury).toBe(treasury - 15)
    expect(totalMoney(sim)).toBe(money)
    expect(hazel.opinion).toBe(o.hazel + 20)
    expect(castHuman(sim, 'g03', 'martha').opinion).toBe(o.martha + 15)
    expect(mark.opinion).toBe(o.mark + 20)
    expect(heldActors(sim, 'g03')).toBe(0)
  })

  it('QUEST-03 G03 E2: hiding alone (sneaking), then showing Hazel the tracks at dusk with Mark', () => {
    const sim = offered()
    const { mark, hazel, post } = nightWatch(sim, 'alone')
    choose(sim, 'g03', 'h_confront', 'path_show')
    expect(hazel.questHold).toBeUndefined()
    expect(stateOf(sim, 'g03')!.stage).toBe(2)
    expect(hazel.opinion).toBeGreaterThanOrEqual(10)
    // By day nothing holds Hazel; at dusk she waits at the post.
    setHour(sim, 12)
    tickQuests(sim)
    expect(hazel.questHold).toBeUndefined()
    setHour(sim, 17.5)
    tickQuests(sim)
    expect(hazel.questHold?.q).toBe('g03')
    // Mark's dusk scene needs Hazel and Mark within 15 m of each other.
    mark.x = post.x + 30
    mark.z = post.z
    hazel.x = post.x
    hazel.z = post.z
    sim.actors.update(mark)
    sim.actors.update(hazel)
    expect(topicNode(sim, 'g03', mark.id)).not.toBe('m_dusk')
    mark.x = post.x + 6
    sim.actors.update(mark)
    expect(topicNode(sim, 'g03', mark.id)).toBe('m_dusk')
    const money = totalMoney(sim)
    choose(sim, 'g03', 'm_dusk', 'let_sink')
    expect(stateOf(sim, 'g03')!.stage).toBe(3)
    choose(sim, 'g03', 'm_close', 'close_show')
    expect(stateOf(sim, 'g03')).toMatchObject({ status: 'done', ending: 'show' })
    expect(totalMoney(sim)).toBe(money)
    expect(heldActors(sim, 'g03')).toBe(0)
  })

  it('QUEST-03 G03 E3: morning after a dark night — Martha, then Hazel is told on: she is cross with you, 15 c', () => {
    const sim = offered()
    const mark = castHuman(sim, 'g03', 'mark')
    choose(sim, 'g03', 'm_open', 'morning')
    const martha = castHuman(sim, 'g03', 'martha')
    // Before any dark night Martha has nothing to show.
    expect(topicNode(sim, 'g03', martha.id)).toBeUndefined()
    darkPost(sim).lit = true
    setHour(sim, 23.5)
    tickQuests(sim)
    expect(topicNode(sim, 'g03', martha.id)).toBe('ma_morning')
    choose(sim, 'g03', 'ma_morning', 'talk_gently')
    const hazel = castHuman(sim, 'g03', 'hazel')
    expect(stateOf(sim, 'g03')!.stage).toBe(2)
    expect(hazel.questHold?.q).toBe('g03')
    const money = totalMoney(sim)
    const op = hazel.opinion
    choose(sim, 'g03', 'h_confront', 'path_tell')
    expect(hazel.opinion).toBe(op - 20)
    choose(sim, 'g03', 'm_close', 'close_tell')
    expect(stateOf(sim, 'g03')).toMatchObject({ status: 'done', ending: 'tell' })
    expect(totalMoney(sim)).toBe(money)
    expect(heldActors(sim, 'g03')).toBe(0)
    expect(mark.opinion).toBeGreaterThan(0)
  })

  it('QUEST-03 G03: refusing keeps the quest open; after ten nights Mark solves it himself — no reward, no held actor', () => {
    const sim = offered()
    choose(sim, 'g03', 'm_open', 'refuse')
    expect(stateOf(sim, 'g03')!.status).toBe('refused')
    const mark = castHuman(sim, 'g03', 'mark')
    expect(topicNode(sim, 'g03', mark.id)).toBe('m_open') // the topic comes back
    // The snuffing goes on while refused.
    const post = darkPost(sim)
    post.lit = true
    setHour(sim, 23.5)
    tickQuests(sim)
    expect(post.lit).toBe(false)
    const money = totalMoney(sim)
    hoursLater(sim, 241)
    tickQuests(sim)
    expect(stateOf(sim, 'g03')).toMatchObject({ status: 'done', ending: 'markSolved' })
    expect(totalMoney(sim)).toBe(money)
    expect(say(sim, 'g03', 'm_wait').lines.length).toBeGreaterThan(0)
    expect(heldActors(sim, 'g03')).toBe(0)
  })

  it('QUEST-03 G03: a drained treasury pays only what it has (partial payout, never negative)', () => {
    const sim = offered()
    const { mark } = nightWatch(sim, 'watch')
    sim.state.settlements[0]!.treasury = 6
    const money = totalMoney(sim)
    choose(sim, 'g03', 'h_confront', 'path_tell')
    choose(sim, 'g03', 'm_close', 'close_tell')
    expect(sim.state.settlements[0]!.treasury).toBe(0)
    expect(totalMoney(sim)).toBe(money)
    expect(mark).toBeDefined()
  })
})
