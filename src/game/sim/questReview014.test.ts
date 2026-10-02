/**
 * QUEST-03 — regressions of code review 014 (docs/reviews/2026-10-02--014-session-13-code-review.md): bounded holds with
 * a critical-need override, G03 always ends, replayed options, companions, Q07 posts, save shape, silent endings,
 * read paths, expired quests.
 */
import { describe, expect, it } from 'vitest'
import type { QuestDef } from '../data/quests/types'
import { AUTHORED_QUESTS } from '../data/quests'
import { G01 } from '../data/quests/g01'
import { G03 } from '../data/quests/g03'
import { SoakRecorder } from '../diag/soak'
import { assertSaveShape } from '../save/validate'
import { countItem } from './inventory'
import { hireRefusal } from './npc/companions'
import { questChoose, questJournal, questMarkers, questSay } from './questDialog'
import { forceOfferQuest, setQuestDefs } from './questEngine'
import { castHuman, choose, heldActors, hoursLater, setDayHour, setHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, run, testSim } from './testWorld'
import { totalMoney } from './treasury'

type TestSim = ReturnType<typeof testSim>

const DAY_S = 3600

function woodcuttersLikeYou(sim: TestSim) {
  for (const n of sim.state.npcs) if (sim.state.households[n.householdId]?.profession === 'woodcutter') n.opinion = 20
}

function darkPost(sim: TestSim) {
  const hazel = castHuman(sim, 'g03', 'hazel')
  const house = sim.building(sim.state.households[hazel.householdId]!.houseId)!
  return [...sim.settlementBuildings(0, 'torchpost')].sort((a, b) => Math.hypot(a.x - house.x, a.z - house.z) - Math.hypot(b.x - house.x, b.z - house.z))[0]!
}

const toPost = (sim: TestSim) => {
  const post = darkPost(sim)
  sim.player.x = post.x + 3
  sim.player.z = post.z
  sim.actors.update(sim.player)
  return post
}

describe('QUEST-03 review 014 #1: holds are bounded and never starve the NPC', () => {
  it('QUEST-03 hold: every hold of the four quests carries an end; legacy holds without one count as expired', () => {
    const sim = testSim()
    woodcuttersLikeYou(sim)
    setDayHour(sim, 3, 17.5)
    playerFarAway(sim)
    tickQuests(sim, 31)
    choose(sim, 'q07', 'l_open', 'accept')
    choose(sim, 'q07', 'm_gate', 'round')
    choose(sim, 'g01', 'mo_open', 'help')
    choose(sim, 'g03', 'm_open', 'watch')
    tickQuests(sim, 1)
    const held = [...sim.state.npcs, ...sim.state.animals].filter((a) => a.questHold)
    expect(held.length).toBeGreaterThanOrEqual(3) // Mark, Piers, Pip
    for (const a of held) expect(a.questHold!.until, `${a.id}`).toBeGreaterThan(sim.state.time.cal)
    // Mark: only until midnight of this dusk.
    const mark = castHuman(sim, 'q07', 'mark')
    expect(mark.questHold!.until! - sim.state.time.cal).toBeLessThanOrEqual(6.5 * 3600)
    // A hold written without an end (an older build) ends at the next decision.
    const other = sim.state.npcs.find((n) => !n.questHold && n.age === 'adult' && n.profession === 'farmer')!
    other.questHold = { q: 'q07', x: other.x, z: other.z }
    run(sim, 2)
    expect(other.questHold).toBeUndefined()
  })

  it('QUEST-03 hold: a critical thirst lifts the hold — Mark drinks the normal way and returns to the spot while the hold is valid', () => {
    const sim = testSim()
    woodcuttersLikeYou(sim)
    setDayHour(sim, 3, 17.5)
    tickQuests(sim, 31)
    choose(sim, 'q07', 'l_open', 'accept')
    choose(sim, 'q07', 'm_gate', 'round')
    tickQuests(sim, 1)
    const mark = castHuman(sim, 'q07', 'mark')
    const spot = { x: mark.questHold!.x, z: mark.questHold!.z }
    sim.player.x = spot.x + 20
    sim.player.z = spot.z
    sim.actors.update(sim.player)
    mark.inv.items = mark.inv.items.filter((s) => !(s.water ?? 0))
    mark.vitals.thirst = 12
    let drank = false
    for (let t = 0; t < 600; t += 1) {
      run(sim, 1, 0.5)
      if (mark.vitals.thirst > 40) drank = true
      if (mark.vitals.thirst < 0.01) throw new Error('Mark dried out while held')
    }
    expect(drank).toBe(true)
    expect(mark.questHold?.q).toBe('q07') // still valid (until midnight)
    expect(Math.hypot(mark.x - spot.x, mark.z - spot.z)).toBeLessThan(6) // and back at the spot
  })

  it('QUEST-03 hold: four game days with an accepted hold path of every quest — nobody starves, the guard resumes duty, soak invariants hold', () => {
    const sim = testSim(1337)
    woodcuttersLikeYou(sim)
    setDayHour(sim, 3, 12)
    const s0 = sim.world.settlements[0]!
    sim.player.x = s0.x + 4
    sim.player.z = s0.z + 4
    sim.actors.update(sim.player)
    tickQuests(sim, 31)
    for (const id of ['q07', 'g01', 'g03']) expect(stateOf(sim, id)?.status, id).toBe('offered')
    choose(sim, 'q07', 'l_open', 'accept')
    choose(sim, 'q07', 'm_gate', 'round')
    choose(sim, 'g01', 'mo_open', 'help')
    choose(sim, 'g03', 'm_open', 'watch')
    const mark = castHuman(sim, 'q07', 'mark')
    const hazel = castHuman(sim, 'g03', 'hazel')
    const piers = sim.state.npcs.find((n) => n.questOwner === 'g01')!
    const rec = new SoakRecorder(sim, 1337, { timing: false })
    const watched = [mark, hazel, piers, castHuman(sim, 'q07', 'lucy')]
    let minThirst = 100
    let minHunger = 100
    let guardWorked = 0
    let hazelHeld = false
    let markHeld = false
    let watchPlaced = false
    const start = sim.state.time.cal
    for (let t = 0; t < 4 * DAY_S; t += 10) {
      run(sim, 10, 0.5)
      rec.sample(t + 10)
      // The night watch of G03 happens once, on the first night: the player stands by the dark post for a minute.
      const hr = (sim.state.time.cal % 86400) / 3600
      if (!watchPlaced && (hr >= 23 || hr < 4)) {
        const post = toPost(sim)
        post.lit = true
        sim.state.px.sneaking = false
        watchPlaced = true
        tickQuests(sim, 0)
      }
      for (const n of watched) {
        minThirst = Math.min(minThirst, n.vitals.thirst)
        minHunger = Math.min(minHunger, n.vitals.hunger)
      }
      if (hazel.questHold) hazelHeld = true
      if (mark.questHold) markHeld = true
      if (sim.state.time.cal - start > 2 * 86400 && mark.ai.goal === 'work') guardWorked++
    }
    const rep = rec.finish()
    expect(rep.violations).toEqual([])
    expect(markHeld).toBe(true) // the hold really happened
    expect(hazelHeld).toBe(true)
    expect(minThirst).toBeGreaterThan(0)
    expect(minHunger).toBeGreaterThan(0)
    expect(mark.vitals.dead).toBeFalsy()
    expect(guardWorked).toBeGreaterThan(0) // guard duty resumes after the hold windows
    expect(mark.questHold?.q).not.toBe('q07')
  }, 180_000)
})

describe('QUEST-03 review 014 #2: G03 always ends', () => {
  function g03Offered() {
    const sim = testSim()
    setDayHour(sim, 3, 12)
    tickQuests(sim, 31)
    expect(stateOf(sim, 'g03')?.status).toBe('offered')
    return sim
  }
  /** Steps the calendar hour by hour (quests only) until the quest is terminal; returns the days after acceptance. */
  function daysToEnd(sim: TestSim, from: number): number {
    for (let h = 0; h < 24 * 20; h++) {
      const st = stateOf(sim, 'g03')!
      if (st.status === 'done' || st.status === 'lapsed') return (st.endedAt! - from) / 86400
      hoursLater(sim, 1)
      tickQuests(sim, 2)
    }
    throw new Error('G03 did not end in 20 days')
  }
  const accepted = (sim: TestSim) => stateOf(sim, 'g03')!.startedAt!

  it('QUEST-03 G03: abandoned at stage 1 (watch, then the player never comes) ends within 12 days', () => {
    const sim = g03Offered()
    choose(sim, 'g03', 'm_open', 'watch')
    expect(daysToEnd(sim, accepted(sim))).toBeLessThanOrEqual(12)
    expect(heldActors(sim)).toBe(0)
  })

  it('QUEST-03 G03: abandoned at stage 2 (Hazel caught at the post at night, the player leaves) — released at dawn, ends within 12 days', () => {
    const sim = g03Offered()
    choose(sim, 'g03', 'm_open', 'watch')
    const t0 = accepted(sim)
    const post = toPost(sim)
    setHour(sim, 1)
    tickQuests(sim, 50)
    const hazel = castHuman(sim, 'g03', 'hazel')
    expect(stateOf(sim, 'g03')!.stage).toBe(2)
    expect(hazel.questHold?.q).toBe('g03')
    expect(Math.hypot(hazel.x - post.x, hazel.z - post.z)).toBeLessThan(3)
    setHour(sim, 6.5)
    run(sim, 2)
    expect(hazel.questHold).toBeUndefined() // the night scene is over
    expect(daysToEnd(sim, t0)).toBeLessThanOrEqual(12)
    expect(stateOf(sim, 'g03')!.ending).toBe('markSolved')
  })

  it('QUEST-03 G03: abandoned after "talk gently" (Hazel held at her door) ends within 12 days', () => {
    const sim = g03Offered()
    choose(sim, 'g03', 'm_open', 'morning')
    const t0 = accepted(sim)
    darkPost(sim).lit = true
    setHour(sim, 23.5)
    tickQuests(sim)
    choose(sim, 'g03', 'ma_morning', 'talk_gently')
    expect(daysToEnd(sim, t0)).toBeLessThanOrEqual(12)
    expect(heldActors(sim, 'g03')).toBe(0)
  })

  it('QUEST-03 G03: a chosen path the player never closes (together / show / tell) ends by itself with that path\'s ending', () => {
    for (const [path, option, ending] of [['together', 'path_together', 'together'], ['show', 'path_show', 'markSolved'], ['tell', 'path_tell', 'tell']] as const) {
      const sim = g03Offered()
      choose(sim, 'g03', 'm_open', 'watch')
      const t0 = accepted(sim)
      toPost(sim)
      setHour(sim, 1)
      tickQuests(sim, 50)
      choose(sim, 'g03', 'h_confront', option)
      const money = totalMoney(sim)
      expect(daysToEnd(sim, t0), path).toBeLessThanOrEqual(12)
      expect(stateOf(sim, 'g03')!.ending, path).toBe(ending)
      expect(totalMoney(sim), path).toBe(money)
    }
  })

  it('QUEST-03 G03: the dusk scene brings Mark to the post — it does not depend on his patrol', () => {
    const sim = g03Offered()
    choose(sim, 'g03', 'm_open', 'watch')
    const post = toPost(sim)
    setHour(sim, 1)
    tickQuests(sim, 50)
    choose(sim, 'g03', 'h_confront', 'path_show')
    const mark = castHuman(sim, 'g03', 'mark')
    const hazel = castHuman(sim, 'g03', 'hazel')
    // Mark is far away, on the other side of the settlement.
    mark.x = post.x + 90
    mark.z = post.z + 20
    sim.actors.update(mark)
    setHour(sim, 16.2)
    sim.player.x = post.x + 4
    sim.player.z = post.z
    sim.actors.update(sim.player)
    tickQuests(sim, 2)
    expect(mark.questHold?.q).toBe('g03')
    expect(hazel.questHold?.q).toBe('g03')
    expect(mark.questHold!.until! - sim.state.time.cal).toBeLessThanOrEqual(6 * 3600) // bounded: until 22:00
    for (let i = 0; i < 400 && topicNode(sim, 'g03', mark.id) !== 'm_dusk'; i++) run(sim, 1, 0.5)
    expect(topicNode(sim, 'g03', mark.id)).toBe('m_dusk')
  })
})

describe('QUEST-03 review 014 #3: replayed and stale options', () => {
  it('QUEST-03 Q07: the torch limit is enforced in the option — a second call the same day gives nothing', () => {
    const sim = testSim()
    woodcuttersLikeYou(sim)
    tickQuests(sim, 31)
    choose(sim, 'q07', 'l_open', 'accept')
    const mark = castHuman(sim, 'q07', 'mark')
    stateOf(sim, 'q07')!.flags.markTorches = true
    stateOf(sim, 'q07')!.flags.cooked = true
    const n = countItem(sim.player.inv, 'torch')
    expect(topicNode(sim, 'q07', mark.id)).toBe('m_torches')
    choose(sim, 'q07', 'm_torches', 'take_torch')
    expect(countItem(sim.player.inv, 'torch')).toBe(n + 1)
    expect(questChoose(sim, 'q07', 'm_torches', 'take_torch')).toBeNull()
    expect(countItem(sim.player.inv, 'torch')).toBe(n + 1)
  })

  it('QUEST-03 engine: a node the current topics cannot reach is refused (stale dialog, scripted call)', () => {
    const sim = testSim()
    tickQuests(sim, 31)
    const q = stateOf(sim, 'q03')
    if (!q) setDayHour(sim, 1, 12) // Q03 starts only when the woodcutter house is worn
    forceOfferQuest(sim, 'q03')
    expect(stateOf(sim, 'q03')!.status).toBe('offered')
    expect(questChoose(sim, 'q03', 'l_done', 'take_coin_repair')).toBeNull() // topic needs `workComplete`
    expect(questChoose(sim, 'q03', 'r_store', 'store_agree')).toBeNull()
    expect(questChoose(sim, 'q03', 'm_open', 'show_damage')).not.toBeNull() // the real topic works
  })
})

describe('QUEST-03 review 014 #5: holds and companions', () => {
  it('QUEST-03 hold: a held NPC cannot be hired, and a companion is never cast or held', () => {
    const sim = testSim()
    woodcuttersLikeYou(sim)
    setDayHour(sim, 3, 17.5)
    tickQuests(sim, 31)
    choose(sim, 'q07', 'l_open', 'accept')
    choose(sim, 'q07', 'm_gate', 'round')
    tickQuests(sim, 1)
    const mark = castHuman(sim, 'q07', 'mark')
    mark.opinion = 60
    expect(mark.questHold).toBeDefined()
    expect(hireRefusal(sim, mark, 'escort', 'low')).toMatch(/business of their own/)
    // A companion already travelling with the player is skipped by the cast resolution.
    const sim2 = testSim()
    woodcuttersLikeYou(sim2)
    const lucy = sim2.state.npcs.find((n) => n.kin === 'spouse' && sim2.state.households[n.householdId]?.profession === 'woodcutter')!
    lucy.companion = { kind: 'hired', task: 'escort', risk: 'low', untilDay: 99 } as never
    tickQuests(sim2, 31)
    expect(stateOf(sim2, 'q07')).toBeUndefined() // the required spouse is not available
    expect(forceOfferQuest(sim2, 'q07')).toBe(false)
  })
})

describe('QUEST-03 review 014 #6: Q07 round counts posts that already burn', () => {
  it('QUEST-03 Q07: posts lit at dusk (by Mark) count when the player stands by them', () => {
    const sim = testSim()
    woodcuttersLikeYou(sim)
    setDayHour(sim, 3, 17.5)
    tickQuests(sim, 31)
    choose(sim, 'q07', 'l_open', 'accept')
    choose(sim, 'q07', 'm_gate', 'round')
    const posts = sim.settlementBuildings(0, 'torchpost')
    for (const b of posts) b.lit = true
    for (const b of posts) {
      sim.player.x = b.x + 1.5
      sim.player.z = b.z
      sim.actors.update(sim.player)
      tickQuests(sim, 1)
    }
    expect(stateOf(sim, 'q07')!.counters.posts).toBe(posts.length)
    expect(stateOf(sim, 'q07')!.flags.markCovered).toBe(true)
  })

  it('QUEST-03 Q07: Mark waits only the dusk of the promised day; "walk it tonight" re-arms the hold', () => {
    const sim = testSim()
    woodcuttersLikeYou(sim)
    setDayHour(sim, 3, 12)
    tickQuests(sim, 31)
    choose(sim, 'q07', 'l_open', 'accept')
    choose(sim, 'q07', 'm_gate', 'round')
    const mark = castHuman(sim, 'q07', 'mark')
    setHour(sim, 15)
    tickQuests(sim, 1)
    expect(mark.questHold).toBeUndefined()
    setHour(sim, 16.5)
    tickQuests(sim, 1)
    expect(mark.questHold?.q).toBe('q07')
    setDayHour(sim, 4, 17) // the next day: the promise was for yesterday
    tickQuests(sim, 1)
    expect(mark.questHold).toBeUndefined()
    expect(topicNode(sim, 'q07', mark.id)).toBe('m_wait')
    choose(sim, 'q07', 'm_wait', 'round_again')
    tickQuests(sim, 1)
    expect(mark.questHold?.q).toBe('q07')
  })
})

describe('QUEST-03 review 014 #8: save shape', () => {
  it('QUEST-03 save: a malformed authoredQuests entry or hold is rejected cleanly', () => {
    const sim = testSim()
    woodcuttersLikeYou(sim)
    tickQuests(sim, 31)
    const good = JSON.parse(JSON.stringify(sim.state)) as Record<string, unknown>
    expect(() => assertSaveShape(good)).not.toThrow()
    const q = (over: Record<string, unknown>) => ({ ...good, authoredQuests: { q07: { ...(good.authoredQuests as Record<string, Record<string, unknown>>).q07!, ...over } } })
    for (const over of [{ cast: undefined }, { flags: 3 }, { stage: 'x' }, { status: 'weird' }, { anchors: [] }, { counters: { a: 'x' } }, { obs: null }, { seen: { a: [1] } }, { fired: undefined }, { settled: 1 }]) {
      expect(() => assertSaveShape(q(over)), JSON.stringify(over)).toThrow(/corrupted/)
    }
    const npcs = (good.npcs as Record<string, unknown>[]).map((n, i) => (i === 0 ? { ...n, questHold: { q: 7 } } : n))
    expect(() => assertSaveShape({ ...good, npcs })).toThrow(/corrupted/)
    const ok = (good.npcs as Record<string, unknown>[]).map((n, i) => (i === 0 ? { ...n, questHold: { q: 'q07', x: 1, z: 2, until: 9 } } : n))
    expect(() => assertSaveShape({ ...good, npcs: ok })).not.toThrow()
  })
})

describe('QUEST-03 review 014 #9: Q03 text matches the repayment', () => {
  it('QUEST-03 Q03: the repair ending says the store was repaid, not that it is still owed', () => {
    const q03 = AUTHORED_QUESTS.find((d: QuestDef) => d.id === 'q03')!
    const text = JSON.stringify(q03.nodes) + q03.endings.map((e) => e.journal).join(' ')
    expect(text).not.toMatch(/still owe the store|owes the common store|come back before the first snow/)
    expect(q03.endings.find((e) => e.id === 'repair')!.journal).toMatch(/repaid the common store/)
  })
})

describe('QUEST-03 review 014 #10: quests nobody accepted end silently', () => {
  it('QUEST-03 Q03: the family finishing the roof before the player accepted posts no message, makes no journal entry and does not unlock Q07', () => {
    const sim = testSim()
    for (const b of sim.state.buildings) if (b.kind === 'house' && sim.state.households[b.householdId ?? -1]?.profession === 'woodcutter') b.durability = 40
    tickQuests(sim, 31)
    expect(stateOf(sim, 'q03')?.status).toBe('offered')
    for (const b of sim.state.buildings) if (b.kind === 'house' && sim.state.households[b.householdId ?? -1]?.profession === 'woodcutter') b.durability = 95
    const before = sim.state.messages.length
    tickQuests(sim, 2)
    expect(stateOf(sim, 'q03')).toMatchObject({ status: 'done', ending: 'family' })
    expect(sim.state.messages.slice(before).filter((m) => /Quest (completed|lapsed)/.test(m.text))).toEqual([])
    expect(questJournal(sim).map((e) => e.id)).not.toContain('q03')
    tickQuests(sim, 31)
    expect(stateOf(sim, 'q07')).toBeUndefined() // not "Q03 done" for Q07: nobody accepted it
  })
})

describe('QUEST-03 review 014 #11: read paths do not write saved state', () => {
  it('QUEST-03 anchors: markers, dialog and journal leave `anchors` untouched; the tick fills the current stage\'s anchor', () => {
    const sim = testSim()
    setDayHour(sim, 3, 12)
    tickQuests(sim, 31)
    choose(sim, 'g03', 'm_open', 'watch') // stage 1: the marker is the dark torch post
    const st = stateOf(sim, 'g03')!
    st.anchors = {}
    const mark = castHuman(sim, 'g03', 'mark')
    const markers = questMarkers(sim)
    questSay(sim, 'g03', 'm_wait')
    questJournal(sim)
    topicNode(sim, 'g03', mark.id)
    expect(markers).toBeDefined()
    expect(st.anchors).toEqual({})
    tickQuests(sim, 1)
    expect(Object.keys(st.anchors).length).toBeGreaterThan(0)
  })
})

describe('QUEST-03 review 014 #13: expired quests are not cast again', () => {
  it('QUEST-03 offer: after the offer window (G01 day 5, G03 day 10) no NPC lookups happen for them', () => {
    const sim = testSim()
    setQuestDefs(sim, [G01, G03])
    setDayHour(sim, 12, 12)
    let lookups = 0
    const orig = sim.npcsOf.bind(sim)
    sim.npcsOf = ((id: number) => {
      lookups++
      return orig(id)
    }) as typeof sim.npcsOf
    tickQuests(sim, 31 * 10)
    expect(lookups).toBe(0)
    expect(stateOf(sim, 'g01')).toBeUndefined()
  })

  it('QUEST-03 offer: a never-offered quest reuses its cast between checks (no re-resolution every 30 s)', () => {
    const sim = testSim()
    setQuestDefs(sim, [{ ...G03, start: [{ k: 'day', from: 3, to: 10 }, { k: 'opinion', slot: 'hazel', gte: 99 }] } as QuestDef])
    setDayHour(sim, 4, 12)
    tickQuests(sim, 31)
    let lookups = 0
    const orig = sim.npcsOf.bind(sim)
    sim.npcsOf = ((id: number) => {
      lookups++
      return orig(id)
    }) as typeof sim.npcsOf
    tickQuests(sim, 31 * 10)
    expect(lookups).toBe(0)
  })
})
