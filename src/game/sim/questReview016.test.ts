/**
 * Review 016 (app review round 1), batch Q: #1 rats quest completion, #4 Q03 thank-you scene, #5 Q07 journal and
 * accept replies, D-QUEST-2 (Q03 family ending), #17 notice board scope.
 */
import { describe, expect, it } from 'vitest'
import type { Sim } from './sim'
import { AUTHORED_QUESTS } from '../data/quests'
import { repairBuilding } from './actions'
import { addItem, countItem, newStack } from './inventory'
import { makeAnimal } from './newGame'
import { questJournal, questSay } from './questDialog'
import { forceOfferQuest } from './questEngine'
import { acceptQuest, noticeBoard, questObjectives, questSystem } from './quests'
import { castHuman, choose, houseOfNpc, stateOf, tickQuests } from './questTestKit'
import { testSim } from './testWorld'
import { totalMoney } from './treasury'

function nestWithRats(sim: Sim, n: number, farFrom = 0) {
  const wh = sim.building(sim.state.settlements[0]!.warehouseId)!
  wh.ratNest = { strength: 2, since: 0 }
  wh.durability = 20
  for (let i = 0; i < n; i++) {
    const far = i < farFrom ? 200 : 0
    sim.addAnimal({ ...makeAnimal(sim.nextId(), 'rat', 'adult', wh.x + i + far, wh.z + wh.hd + 1 + far, 0, sim.rng), denId: `nest:${wh.id}` })
  }
  return wh
}

describe('review 016 #1: rats board quest', () => {
  it('QUEST-01: completes at kills >= killsNeeded once the nest is gone, even with nest rats still alive; they become strays', () => {
    const sim = testSim()
    const wh = nestWithRats(sim, 6, 3)
    questSystem(sim)
    const q = sim.state.quests.find((qq) => qq.kind === 'rats')!
    expect(acceptQuest(sim, q.id)).toBe('Quest accepted.')
    q.kills = q.killsNeeded
    wh.ratNest = undefined // repaired
    const money = sim.player.money
    questSystem(sim)
    expect(q.status).toBe('done')
    expect(sim.player.money).toBeGreaterThan(money)
    const left = sim.state.animals.filter((a) => a.species === 'rat' && !a.vitals.dead)
    expect(left.length).toBeGreaterThan(0)
    expect(left.every((a) => a.denId === undefined)).toBe(true)
  })

  it('QUEST-01: while nest rats block the quest, the objectives say how many are left', () => {
    const sim = testSim()
    const wh = nestWithRats(sim, 4, 2)
    questSystem(sim)
    const q = sim.state.quests.find((qq) => qq.kind === 'rats')!
    acceptQuest(sim, q.id)
    q.kills = 1
    wh.ratNest = undefined
    questSystem(sim)
    expect(q.status).toBe('active') // 1 of the needed kills only
    const o = questObjectives(sim, q)
    const leftObj = o.find((x) => x.id === 'left')
    expect(leftObj?.label).toMatch(/Rats of the nest left: 4/)
    expect(leftObj?.done).toBe(false)
  })
})

/** Q03 with the wanted plan agreed (or not); the woodcutter house is worn. */
function q03(plan: 'repair' | 'lean_to' | 'prop' | 'unset', stage: number) {
  const sim = testSim()
  const house = sim.state.buildings.find((b) => b.kind === 'house' && sim.state.households[b.householdId ?? -1]?.profession === 'woodcutter')!
  house.durability = 40
  tickQuests(sim, 31)
  const st = stateOf(sim, 'q03')!
  expect(st.status).toBe('offered')
  choose(sim, 'q03', 'm_open', 'show_damage')
  st.flags.beamInspected = true
  st.stage = 2
  if (plan !== 'unset') {
    choose(sim, 'q03', 'm_beam', plan === 'repair' ? 'plan_repair' : plan === 'lean_to' ? 'plan_lean_to' : 'plan_prop')
    st.stage = stage
  }
  return { sim, st, house }
}

describe('review 016 #4: Q03 thank-you scene', () => {
  it('QUEST-03 Q03: without Joan in the cast, her line and the answer to it are skipped and Lucy opens her own scene', () => {
    for (const plan of ['repair', 'lean_to', 'prop'] as const) {
      const { sim, st } = q03(plan, 3)
      delete st.cast.joan
      delete st.cast.matthew
      st.flags.workComplete = true
      const s = questSay(sim, 'q03', 'l_done')!
      const lucy = castHuman(sim, 'q03', 'lucy').name.split(' ')[0]
      expect(s.lines[0]!.who, plan).toBe(lucy)
      expect(s.lines.some((l) => l.text.includes('The roof isn\'t. Mostly.'))).toBe(false)
      const speakers = new Set(s.lines.map((l) => l.who))
      expect(speakers.has('the old woman')).toBe(false)
    }
  })
})

describe('review 016 #5: Q07 progress and replies', () => {
  it('QUEST-03 Q07: the journal text changes with the stores check, roast and the round', () => {
    const sim = testSim()
    expect(forceOfferQuest(sim, 'q07')).toBe(true)
    choose(sim, 'q07', 'l_open', 'accept')
    const text = () => questJournal(sim).find((j) => j.id === 'q07')!.text
    const t0 = text()
    expect(t0).toMatch(/Still to do: look at the meat/)
    const st = stateOf(sim, 'q07')!
    st.flags.freshnessChecked = true
    const t1 = text()
    expect(t1).not.toBe(t0)
    expect(t1).toMatch(/Done: you looked at the meat/)
    st.counters.pieces = 4
    expect(text()).toMatch(/Done: you have roasted enough meat/)
    st.flags.roundAccepted = true
    st.flags.markCovered = true
    expect(text()).toMatch(/Done: every torch post is lit/)
  })

  it('QUEST-03: every option that accepts an authored quest is answered by an NPC line', () => {
    for (const def of AUTHORED_QUESTS) {
      for (const [nodeId, node] of Object.entries(def.nodes)) {
        for (const o of node.options) {
          if (!o.effects.some((e) => e.k === 'accept')) continue
          expect(o.next, `${def.id}/${nodeId}/${o.id}`).toBeDefined()
          const reply = def.nodes[o.next!]!
          expect(reply.lines.some((l) => l.who !== 'player' && l.who !== 'self'), `${def.id}/${o.next}`).toBe(true)
        }
      }
    }
  })
})

describe('review 016 D-QUEST-2: the family ending never overrides an agreed plan', () => {
  it('QUEST-03 Q03: plan = lean_to or prop → NPC repair to 90 does not end the quest', () => {
    for (const plan of ['lean_to', 'prop'] as const) {
      const { sim, st, house } = q03(plan, 3)
      house.durability = 95
      tickQuests(sim, 3)
      expect(st.status, plan).toBe('active')
    }
  })

  it('QUEST-03 Q03: plan unset → the family ending still applies', () => {
    const { sim, st, house } = q03('unset', 2)
    house.durability = 95
    tickQuests(sim, 3)
    expect(st).toMatchObject({ status: 'done', ending: 'family' })
  })

  it('QUEST-03 Q03: plan = repair and NPC repair to 90 → E1; thanks only when the player took part', () => {
    const { sim, st, house } = q03('repair', 2)
    const money = totalMoney(sim)
    const p0 = sim.player.money
    const branches = countItem(sim.player.inv, 'branch')
    house.durability = 95 // NPC work, the player did nothing
    tickQuests(sim, 3)
    expect(st).toMatchObject({ status: 'done', ending: 'repair' })
    expect(totalMoney(sim)).toBe(money)
    expect(sim.player.money).toBe(p0)
    expect(countItem(sim.player.inv, 'branch')).toBe(branches)
  })

  it('QUEST-03 Q03: plan = repair, the player repaired it (stage 3) → Lucy\'s thanks scene stays', () => {
    const { sim, st, house } = q03('repair', 3)
    const p = sim.player
    addItem(p.inv, newStack('hammer'))
    addItem(p.inv, newStack('branch', 6))
    p.x = house.x + house.hw + 2
    p.z = house.z
    sim.actors.update(p)
    for (let i = 0; i < 3 && house.durability < 90; i++) expect(repairBuilding(sim, p, house).ok).toBe(true)
    tickQuests(sim, 3)
    expect(st.status).toBe('active')
    expect(st.flags.workComplete).toBe(true)
    expect(houseOfNpc(sim, castHuman(sim, 'q03', 'miles'))).toBe(house)
  })
})

describe('review 016 #17: notice board scope', () => {
  it('QUEST-01: notices are grouped by settlement, this settlement first; other settlements\' notices cannot be accepted from here', () => {
    const sim = testSim()
    const here = sim.world.homeSettlement
    const other = sim.world.settlements.find((s) => s.id !== here)!
    const mk = (id: string, sid: number) => ({ id, kind: 'wolves' as const, title: `Wolves ${sid}`, desc: '', settlementId: sid, giverId: sim.state.npcs[0]!.id, status: 'available' as const, reward: 10, createdAt: 0, killsNeeded: 1, kills: 0 })
    sim.state.quests.push(mk('far', other.id), mk('near', here))
    const groups = noticeBoard(sim)
    expect(groups.map((g) => g.settlementId)).toEqual([here, other.id])
    expect(groups[0]).toMatchObject({ here: true })
    expect(groups[1]).toMatchObject({ here: false })
    expect(groups[1]!.distanceM).toBeGreaterThan(500)
    expect(acceptQuest(sim, 'far')).toMatch(new RegExp(`posted in ${sim.state.settlements[other.id]!.name}`))
    expect(sim.state.quests.find((q) => q.id === 'far')!.status).toBe('available')
    expect(acceptQuest(sim, 'near')).toBe('Quest accepted.')
  })
})
