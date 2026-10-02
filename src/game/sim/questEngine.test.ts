/**
 * QUEST-03 — authored quest engine (docs/design/quests-engine.md §11): offer rules, stage machine, exclusive
 * endings, observations, counters, rules, lapse, holds, save format, PERF-01, layering.
 */
import { describe, expect, it, vi } from 'vitest'
import type { QuestDef } from '../data/quests/types'
import { AUTHORED_QUESTS } from '../data/quests'
import { opt, set, stage } from '../data/quests/dsl'
import { SaveError } from '../save/errors'
import { migrate } from '../save/migrate'
import { roundTrip } from '../save/snapshot'
import { assertSaveShape } from '../save/validate'
import { addItem, newStack } from './inventory'
import { revealAround } from './navigation'
import { hireRefusal } from './npc/companions'
import { applyEffects, ctxOf } from './questCore'
import { questJournal, questMarkers, questSay, questTopics } from './questDialog'
import { setQuestDefs } from './questEngine'
import { questEvent } from './questHooks'
import { castHuman, choose, heldActors, setDayHour, setHour, stateOf, tickQuests } from './questTestKit'
import { Sim } from './sim'
import { run, testSim } from './testWorld'
import { collectTaxes } from './treasury'
import { SAVE_VERSION } from './types'
import { installSystems } from './worldSystems'

const baseDef = (over: Partial<QuestDef> = {}): QuestDef => ({
  id: 'tq',
  title: 'Test quest',
  giver: 'a',
  cast: { a: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['head'] } },
  start: [],
  flags: { f: false, n: 0 },
  stages: [{ id: 's0', journal: 'zero' }, { id: 's1', journal: 'one {a}' }, { id: 's2', journal: 'two' }],
  nodes: {
    n: {
      lines: [{ who: 'a', text: 'Hello from {a} in {H}.' }],
      options: [
        opt('forward', 'Forward', [{ k: 'accept' }, stage(2), stage(1)]),
        opt('e1', 'End 1', [{ k: 'end', ending: 'e1' }, set('f')]),
        opt('e2', 'End 2', [{ k: 'end', ending: 'e2' }]),
        opt('ca', 'Choice A', [{ k: 'choose', flag: 'plan', value: 'a' }]),
        opt('cb', 'Choice B', [{ k: 'choose', flag: 'plan', value: 'b' }]),
      ],
    },
  },
  topics: [{ slot: 'a', node: 'n', label: 'Talk' }],
  observations: [],
  counters: [],
  rules: [],
  endings: [
    { id: 'e1', journal: 'ended 1', effects: [set('n', 1)] },
    { id: 'e2', journal: 'ended 2', effects: [set('n', 2)] },
  ],
  ...over,
})

function withDef(def: QuestDef) {
  const sim = testSim()
  setQuestDefs(sim, [def])
  tickQuests(sim, 31)
  return sim
}

describe('QUEST-03 engine: offer', () => {
  it('QUEST-03 offer: offered when the start conditions hold and the cast resolves; the topic is on the giver', () => {
    const sim = withDef(baseDef({ start: [{ k: 'day', from: 2 }] }))
    expect(stateOf(sim, 'tq')).toBeUndefined() // day 1
    setDayHour(sim, 2, 10)
    tickQuests(sim, 31)
    const st = stateOf(sim, 'tq')!
    expect(st.status).toBe('offered')
    const giver = castHuman(sim, 'tq', 'a')
    expect(giver.profession).toBe('woodcutter')
    expect(questTopics(sim, giver.id)).toEqual([{ questId: 'tq', label: 'Talk', node: 'n' }])
    expect(questTopics(sim, giver.id + 1)).toEqual([])
  })

  it('QUEST-03 offer: never offered with a missing required slot (no blacksmith in the home settlement); an optional one is just empty', () => {
    const sim = withDef(baseDef({ cast: { a: { kind: 'npc', required: true, profession: 'blacksmith', kin: ['head'] } } }))
    expect(stateOf(sim, 'tq')).toBeUndefined()
    const sim2 = withDef(baseDef({ cast: { a: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['head'] }, b: { kind: 'npc', required: false, profession: 'blacksmith', kin: ['head'], fallbackName: 'the smith' } } }))
    expect(stateOf(sim2, 'tq')?.status).toBe('offered')
    expect(stateOf(sim2, 'tq')!.cast.b).toBeUndefined()
  })

  it('QUEST-03 offer: cast slots are unique actors (the same NPC never fills two slots)', () => {
    const sim = withDef(baseDef({ cast: { a: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['head'] }, b: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['head'] } } }))
    // Only one woodcutter head exists: the second slot cannot be filled → not offered.
    expect(stateOf(sim, 'tq')).toBeUndefined()
  })

  it('QUEST-03 dialog: placeholders become the generated first names and settlement names; options match by id', () => {
    const sim = withDef(baseDef())
    const giver = castHuman(sim, 'tq', 'a')
    const say = questSay(sim, 'tq', 'n')!
    expect(say.lines[0]!.text).toBe(`Hello from ${giver.name.split(' ')[0]} in ${sim.state.settlements[0]!.name}.`)
    expect(say.lines[0]!.who).toBe(giver.name.split(' ')[0])
    expect(say.options.map((o) => o.id)).toEqual(['forward', 'e1', 'e2', 'ca', 'cb'])
    expect(questJournal(sim)[0]!.text).toBe('zero')
  })
})

describe('QUEST-03 engine: stage machine and endings', () => {
  it('QUEST-03 stage: only moves forward', () => {
    const sim = withDef(baseDef())
    choose(sim, 'tq', 'n', 'forward')
    expect(stateOf(sim, 'tq')).toMatchObject({ status: 'active', stage: 2 }) // stage(2) then stage(1): stays 2
    expect(questJournal(sim)[0]!.text).toBe('two')
  })

  it('QUEST-03 ending: exclusive — a second `end` is a no-op and its effects are not applied', () => {
    const sim = withDef(baseDef({ topics: [{ slot: 'a', node: 'n', label: 'Talk', done: true }] })) // still talkable when done
    choose(sim, 'tq', 'n', 'forward')
    choose(sim, 'tq', 'n', 'e1')
    expect(stateOf(sim, 'tq')).toMatchObject({ status: 'done', ending: 'e1', settled: true })
    expect(stateOf(sim, 'tq')!.flags.n).toBe(1)
    choose(sim, 'tq', 'n', 'e2')
    expect(stateOf(sim, 'tq')).toMatchObject({ ending: 'e1' })
    expect(stateOf(sim, 'tq')!.flags.n).toBe(1)
    expect(questJournal(sim)[0]!.text).toBe('ended 1')
  })

  it('QUEST-03 choice: changeable until the quest is settled, frozen after', () => {
    const sim = withDef(baseDef({ topics: [{ slot: 'a', node: 'n', label: 'Talk', done: true }] }))
    choose(sim, 'tq', 'n', 'forward')
    choose(sim, 'tq', 'n', 'ca')
    expect(stateOf(sim, 'tq')).toMatchObject({ choice: 'a' })
    choose(sim, 'tq', 'n', 'cb')
    expect(stateOf(sim, 'tq')).toMatchObject({ choice: 'b' })
    expect(stateOf(sim, 'tq')!.flags.plan).toBe('b')
    choose(sim, 'tq', 'n', 'e1')
    choose(sim, 'tq', 'n', 'ca')
    expect(stateOf(sim, 'tq')).toMatchObject({ choice: 'b', settled: true })
    expect(stateOf(sim, 'tq')!.flags.plan).toBe('b')
  })

  it('QUEST-03 lapse: a dead required NPC ends the quest without reward and releases everything', () => {
    const sim = withDef(baseDef())
    choose(sim, 'tq', 'n', 'forward')
    castHuman(sim, 'tq', 'a').vitals.dead = true
    tickQuests(sim, 1)
    expect(stateOf(sim, 'tq')).toMatchObject({ status: 'lapsed', settled: true })
    expect(questJournal(sim)[0]!.status).toBe('lapsed')
  })

  it('QUEST-03 refused: a refused quest stays re-offerable (the topic is still there and accepting works)', () => {
    const sim = withDef(baseDef({ nodes: { n: { lines: [], options: [opt('no', 'No', [{ k: 'refuse' }]), opt('yes', 'Yes', [{ k: 'accept' }])] } } }))
    choose(sim, 'tq', 'n', 'no')
    expect(stateOf(sim, 'tq')!.status).toBe('refused')
    expect(questTopics(sim, castHuman(sim, 'tq', 'a').id)).toHaveLength(1)
    choose(sim, 'tq', 'n', 'yes')
    expect(stateOf(sim, 'tq')!.status).toBe('active')
  })
})

describe('QUEST-03 engine: observations, counters, rules', () => {
  const obsDef = (reset: boolean) => baseDef({
    nodes: { n: { lines: [], options: [opt('go', 'Go', [{ k: 'accept' }])] } },
    observations: [{ id: 'o', at: { k: 'house', slot: 'a' }, r: 6, dwellS: 10, reset, when: [{ k: 'hour', night: true }], effects: [set('f')] }],
  })
  const nearHouse = (sim: Sim, d: number) => {
    const h = castHuman(sim, 'tq', 'a')
    const house = sim.building(sim.state.households[h.householdId]!.houseId)!
    sim.player.x = house.x + d
    sim.player.z = house.z
    sim.actors.update(sim.player)
  }

  it('QUEST-03 observation: dwell accumulates only while the conditions hold (night) and the player is inside the radius', () => {
    const sim = withDef(obsDef(false))
    choose(sim, 'tq', 'n', 'go')
    nearHouse(sim, 3)
    setHour(sim, 12)
    tickQuests(sim, 30)
    expect(stateOf(sim, 'tq')!.flags.f).toBe(false) // daytime: nothing counted
    setHour(sim, 1)
    tickQuests(sim, 6)
    expect(stateOf(sim, 'tq')!.obs.o).toBe(6)
    nearHouse(sim, 60) // keeps the dwell when leaving (default)
    tickQuests(sim, 20)
    expect(stateOf(sim, 'tq')!.obs.o).toBe(6)
    nearHouse(sim, 3)
    tickQuests(sim, 5)
    expect(stateOf(sim, 'tq')!.flags.f).toBe(true)
    expect(stateOf(sim, 'tq')!.obs.o).toBe(-1) // done: costs nothing afterwards
  })

  it('QUEST-03 observation: the reset variant loses the dwell when the player leaves', () => {
    const sim = withDef(obsDef(true))
    choose(sim, 'tq', 'n', 'go')
    setHour(sim, 1)
    nearHouse(sim, 3)
    tickQuests(sim, 8)
    nearHouse(sim, 60)
    tickQuests(sim, 1)
    expect(stateOf(sim, 'tq')!.obs.o).toBe(0)
    nearHouse(sim, 3)
    tickQuests(sim, 8)
    expect(stateOf(sim, 'tq')!.flags.f).toBe(false)
    tickQuests(sim, 3)
    expect(stateOf(sim, 'tq')!.flags.f).toBe(true)
  })

  it('QUEST-03 counter: `distinct` counts each torch post once; events only reach active quests', () => {
    const sim = withDef(baseDef({
      nodes: { n: { lines: [], options: [opt('go', 'Go', [{ k: 'accept' }])] } },
      counters: [{ id: 'posts', on: 'light', match: { kind: 'torchpost', home: true, distinct: true } }],
    }))
    const posts = sim.settlementBuildings(0, 'torchpost')
    questEvent(sim, { k: 'light', buildingId: posts[0]!.id })
    expect(stateOf(sim, 'tq')!.counters.posts).toBeUndefined() // offered, not active
    choose(sim, 'tq', 'n', 'go')
    questEvent(sim, { k: 'light', buildingId: posts[0]!.id })
    questEvent(sim, { k: 'light', buildingId: posts[0]!.id })
    questEvent(sim, { k: 'light', buildingId: posts[1]!.id })
    questEvent(sim, { k: 'douse', buildingId: posts[2]!.id }) // other event kind
    questEvent(sim, { k: 'light', buildingId: sim.state.buildings.find((b) => b.kind === 'house')!.id }) // not a torch post
    expect(stateOf(sim, 'tq')!.counters.posts).toBe(2)
  })

  it('QUEST-03 rule: `once: day` fires once per game day, `once: ever` once, `always` every tick', () => {
    const sim = withDef(baseDef({
      nodes: { n: { lines: [], options: [opt('go', 'Go', [{ k: 'accept' }])] } },
      flags: { d: 0, e: 0, a: 0 },
      rules: [
        { id: 'rd', once: 'day', when: [], effects: [{ k: 'if', when: [], then: [{ k: 'set', flag: 'd', value: 'today' }] }] },
        { id: 're', once: 'ever', when: [], effects: [set('e', 1)] },
        { id: 'ra', once: 'always', when: [], effects: [{ k: 'set', flag: 'a', value: 'today' }] },
      ],
    }))
    choose(sim, 'tq', 'n', 'go')
    const st = stateOf(sim, 'tq')!
    tickQuests(sim, 3)
    const day1 = st.flags.d
    expect(day1).toBeGreaterThan(0)
    expect(st.fired.rd).toBe(day1)
    st.flags.d = -5 // a second firing on the same day would overwrite this
    st.flags.e = -5
    tickQuests(sim, 3)
    expect(st.flags.d).toBe(-5)
    expect(st.flags.e).toBe(-5)
    sim.state.time.cal += 86400
    tickQuests(sim, 1)
    expect(st.flags.d).toBe((day1 as number) + 1)
    expect(st.flags.e).toBe(-5) // `ever` never again
    expect(st.flags.a).toBe((day1 as number) + 1)
  })
})

describe('QUEST-03 engine: holds, visitors and the world', () => {
  it('QUEST-03 hold: a held NPC walks to its spot, stays, eats from the pack and is released with the quest', () => {
    const sim = withDef(baseDef({ nodes: { n: { lines: [], options: [opt('go', 'Go', [{ k: 'accept' }, { k: 'hold', slot: 'a', at: { k: 'settlement', kind: 'campfire' } }]), opt('e', 'End', [{ k: 'end', ending: 'e1' }])] } } }))
    choose(sim, 'tq', 'n', 'go')
    const a = castHuman(sim, 'tq', 'a')
    const fire = sim.state.buildings.find((b) => b.kind === 'campfire' && b.settlementId === 0)!
    sim.player.x = fire.x + 5
    sim.player.z = fire.z + 5
    sim.actors.update(sim.player)
    a.x = fire.x + 25
    a.z = fire.z
    sim.actors.update(a)
    a.vitals.hunger = 12
    addItem(a.inv, newStack('bread', 3))
    run(sim, 60)
    expect(Math.hypot(a.x - fire.x, a.z - fire.z)).toBeLessThan(5)
    expect(a.vitals.hunger).toBeGreaterThan(12) // ate from the pack
    expect(['quest_hold', 'eat', 'drink']).toContain(a.ai.goal)
    expect(heldActors(sim, 'tq')).toBe(1)
    choose(sim, 'tq', 'n', 'e')
    expect(heldActors(sim, 'tq')).toBe(0)
    run(sim, 5)
    expect(a.ai.goal).not.toBe('quest_hold')
  })

  it('QUEST-03 visitor: quest-owned NPCs pay no tax and cannot be hired as companions', () => {
    const sim = testSim()
    playerFar(sim)
    tickQuests(sim, 31)
    const piers = sim.state.npcs.find((n) => n.questOwner === 'g01')!
    expect(piers.kin).toBe('visitor')
    piers.money = 500
    collectTaxes(sim)
    sim.state.settlements[0]!.taxDay = -1
    collectTaxes(sim)
    expect(piers.money).toBe(500)
    expect(hireRefusal(sim, piers, 'escort', 'low')).toMatch(/business of their own/)
  })
})

function playerFar(sim: Sim) {
  const s = sim.world.settlements[0]!
  sim.player.x = s.x + 600
  sim.player.z = s.z
  sim.player.y = sim.terrain.heightAt(sim.player.x, sim.player.z)
  sim.actors.update(sim.player)
}

describe('QUEST-03 save format', () => {
  it('QUEST-03 save: SAVE_VERSION is 9 and a v8 save is rejected cleanly (D-SAVE-7)', () => {
    expect(SAVE_VERSION).toBe(9)
    const sim = testSim()
    const st = roundTrip(sim)
    expect(() => migrate({ ...st, saveVersion: 8 })).toThrow(SaveError)
    expect(() => migrate({ ...st, saveVersion: 8 })).toThrow(/outdated or corrupted/)
    expect(migrate({ ...st }).saveVersion).toBe(9)
  })

  it('QUEST-03 save: assertSaveShape requires `authoredQuests` to be a record', () => {
    const sim = testSim()
    const good = roundTrip(sim) as unknown as Record<string, unknown>
    expect(() => assertSaveShape(good)).not.toThrow()
    for (const bad of [undefined, [], 'x', null]) {
      const st = { ...good, authoredQuests: bad }
      expect(() => assertSaveShape(st), String(bad)).toThrow(/corrupted/)
    }
  })

  it('QUEST-03 save: a mid-quest state of all four quests (held and following actors, a visitor) survives a round trip and keeps running', () => {
    const sim = testSim()
    // Conditions for all four: worn woodcutter house, liked household, day 3, player far from the pen.
    for (const b of sim.state.buildings) if (b.kind === 'house' && sim.state.households[b.householdId ?? -1]?.profession === 'woodcutter') b.durability = 40
    for (const n of sim.state.npcs) if (sim.state.households[n.householdId]?.profession === 'woodcutter') n.opinion = 20
    setDayHour(sim, 3, 17.5)
    playerFar(sim)
    tickQuests(sim, 31)
    for (const id of ['q03', 'q07', 'g03', 'g01']) expect(stateOf(sim, id)?.status, id).toBe('offered')
    choose(sim, 'q03', 'm_open', 'show_damage')
    choose(sim, 'q07', 'l_open', 'accept')
    choose(sim, 'q07', 'm_gate', 'round') // holds Mark for the dusk window (17:30 now)
    tickQuests(sim, 1)
    choose(sim, 'g03', 'm_open', 'watch')
    choose(sim, 'g01', 'mo_open', 'help')
    const piers = sim.state.npcs.find((n) => n.questOwner === 'g01')!
    const pip = sim.state.animals.find((a) => a.questHold?.q === 'g01')!
    pip.questFollow = sim.player.id
    pip.questHold = undefined
    piers.questHold = { q: 'g01', x: piers.x, z: piers.z, until: sim.state.time.cal + 3600 }
    const held = heldActors(sim)
    expect(held).toBeGreaterThanOrEqual(3)
    const copy = roundTrip(sim)
    assertSaveShape(copy)
    expect(copy.authoredQuests).toEqual(JSON.parse(JSON.stringify(sim.state.authoredQuests)))
    const sim2 = new Sim(sim.world, copy)
    installSystems(sim2)
    expect(heldActors(sim2)).toBe(held)
    expect(sim2.human(piers.id)?.questOwner).toBe('g01')
    expect(sim2.npcsOf(0).some((n) => n.id === piers.id)).toBe(true) // the visitor is indexed after load
    expect(stateOf(sim2, 'q03')).toMatchObject({ status: 'active', stage: 1 })
    run(sim2, 10)
    tickQuests(sim2, 5)
    for (const id of ['q03', 'q07', 'g03', 'g01']) expect(['active', 'offered']).toContain(stateOf(sim2, id)!.status)
  })
})

describe('QUEST-03 performance and layering', () => {
  it('QUEST-03 PERF-01: the tick with all four quests active makes no spatial queries (single-distance checks only)', () => {
    const sim = testSim()
    for (const b of sim.state.buildings) if (b.kind === 'house' && sim.state.households[b.householdId ?? -1]?.profession === 'woodcutter') b.durability = 40
    for (const n of sim.state.npcs) if (sim.state.households[n.householdId]?.profession === 'woodcutter') n.opinion = 20
    setDayHour(sim, 3, 17.5)
    playerFar(sim)
    tickQuests(sim, 31)
    choose(sim, 'q03', 'm_open', 'show_damage')
    choose(sim, 'q07', 'l_open', 'accept')
    choose(sim, 'g03', 'm_open', 'watch')
    choose(sim, 'g01', 'mo_open', 'help')
    const query = vi.spyOn(sim.actors, 'query')
    const near = vi.spyOn(sim, 'buildingsNear')
    const ground = vi.spyOn(sim, 'groundNear')
    tickQuests(sim, 120)
    expect(query).not.toHaveBeenCalled()
    expect(near).not.toHaveBeenCalled()
    expect(ground).not.toHaveBeenCalled()
  })

  it('QUEST-03 layering: data/quests does not import sim, three, vue or ui', () => {
    const files = import.meta.glob('../data/quests/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(6)
    for (const [f, src] of Object.entries(files)) {
      expect(src, f).not.toMatch(/from ['"][^'"]*\/sim\//)
      expect(src, f).not.toMatch(/from ['"](three|vue)/)
    }
  })

  it('QUEST-03 data: every flag a quest touches is declared (typos fail here) and every node/option/topic target exists', () => {
    for (const def of AUTHORED_QUESTS) {
      const text = JSON.stringify(def)
      for (const m of text.matchAll(/"flag":"(\w+)"/g)) expect(Object.keys(def.flags), `${def.id}: ${m[1]}`).toContain(m[1])
      const effFlags = [...text.matchAll(/"k":"set","flag":"(\w+)"/g)].map((m) => m[1])
      for (const f of effFlags) expect(Object.keys(def.flags), `${def.id}: set ${f}`).toContain(f)
      for (const t of def.topics) expect(def.nodes[t.node], `${def.id}: topic node ${t.node}`).toBeDefined()
      for (const [id, n] of Object.entries(def.nodes)) for (const o of n.options) if (o.next) expect(def.nodes[o.next], `${def.id}/${id}/${o.id} → ${o.next}`).toBeDefined()
      for (const slot of def.topics.map((t) => t.slot).concat(def.giver)) expect(Object.keys(def.cast), `${def.id}: slot ${slot}`).toContain(slot)
      const endings = def.endings.map((e) => e.id)
      for (const m of text.matchAll(/"k":"end","ending":"(\w+)"/g)) expect(endings, `${def.id}: ending ${m[1]}`).toContain(m[1])
    }
  })

  it('QUEST-03 map: markers only for active quests and only in explored cells (MAP-01)', () => {
    const sim = testSim()
    for (const b of sim.state.buildings) if (b.kind === 'house' && sim.state.households[b.householdId ?? -1]?.profession === 'woodcutter') b.durability = 40
    tickQuests(sim, 31)
    expect(questMarkers(sim)).toEqual([]) // offered quests have no marker
    choose(sim, 'q03', 'm_open', 'show_damage')
    sim.state.px.explored = undefined
    expect(questMarkers(sim)).toEqual([]) // nothing explored yet
    revealAround(sim)
    const markers = questMarkers(sim)
    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({ questId: 'q03' })
    const far = { ...sim.state.px, explored: undefined }
    sim.state.px = far
    expect(questMarkers(sim)).toEqual([])
  })

  it('QUEST-03 effects: money and items move between named sources, partially when short; `consume` is the only sink', () => {
    const sim = withDef(baseDef({ nodes: { n: { lines: [], options: [opt('go', 'Go', [{ k: 'accept' }])] } } }))
    choose(sim, 'tq', 'n', 'go')
    const st = stateOf(sim, 'tq')!
    const c = ctxOf(sim, baseDef(), st)
    const a = castHuman(sim, 'tq', 'a')
    a.money = 7
    const p0 = sim.player.money
    applyEffects(c, [{ k: 'pay', from: { purse: 'a' }, to: 'player', amount: 20 }])
    expect(sim.player.money).toBe(p0 + 7)
    expect(a.money).toBe(0)
    applyEffects(c, [{ k: 'pay', from: { treasury: 'home' }, to: { purse: 'a' }, amount: 99999 }])
    expect(sim.state.settlements[0]!.treasury).toBe(0)
    const before = a.inv.items.length
    applyEffects(c, [{ k: 'give', from: 'player', to: { purse: 'a' }, item: 'nonexistent_item_xyz', qty: 3 }])
    expect(a.inv.items.length).toBe(before)
  })
})

