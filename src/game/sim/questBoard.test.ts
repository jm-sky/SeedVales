/**
 * Notice-board quests (review 013 M-02, M-03, M-04, P-03): honest text, explicit objectives,
 * actual paid amount, bounded history with indexed recurring problems.
 */
import { describe, expect, it } from 'vitest'
import type { Sim } from './sim'
import { killAnimal } from './combat'
import { makeAnimal } from './newGame'
import { acceptQuest, completeQuest, questObjectives, questRewardText, questSystem } from './quests'
import { testSim } from './testWorld'

const DAY = 86400

function addNestRats(sim: Sim, n = 3) {
  const wh = sim.building(sim.state.settlements[0]!.warehouseId)!
  wh.ratNest = { strength: 2, since: 0 }
  for (let i = 0; i < n; i++) sim.addAnimal({ ...makeAnimal(sim.nextId(), 'rat', 'adult', wh.x + i, wh.z + wh.hd + 1, 0, sim.rng), denId: `nest:${wh.id}` })
  return wh
}

function postWolves(sim: Sim) {
  const sett = sim.world.settlements[0]!
  for (let i = 0; i < 2; i++) sim.addAnimal(makeAnimal(sim.nextId(), 'wolf', 'adult', sett.x + sett.radius + 100 + i, sett.z, 0, sim.rng))
  questSystem(sim)
  return sim.state.quests.find((q) => q.kind === 'wolves')!
}

describe('board quests', () => {
  it('QUEST-01: the wolf quest text requires kills (no "drive off")', () => {
    const sim = testSim()
    const q = postWolves(sim)
    expect(q.desc).not.toMatch(/drive/i)
    expect(q.desc).toMatch(/kill/i)
  })

  it('QUEST-01: a rat quest exposes kills and repair as separate objectives (from fields, not text)', () => {
    const sim = testSim()
    const wh = addNestRats(sim)
    questSystem(sim)
    const q = sim.state.quests.find((qq) => qq.kind === 'rats')!
    acceptQuest(sim, q.id)
    q.kills = q.killsNeeded
    const o = questObjectives(sim, q)
    expect(o.map((x) => x.id)).toEqual(['kills', 'repair'])
    expect(o[0]).toMatchObject({ done: true, current: q.killsNeeded, needed: q.killsNeeded })
    expect(o[1]).toMatchObject({ done: false }) // 3/3 kills but the nest is still there
    expect(o[1]!.label).toMatch(/pending/)
    wh.ratNest = undefined
    const o2 = questObjectives(sim, q)
    expect(o2[1]).toMatchObject({ done: true })
    expect(o2[1]!.label).toMatch(/done/)
  })

  it('QUEST-01: a wolf quest has one kills objective', () => {
    const sim = testSim()
    const q = postWolves(sim)
    q.kills = 1
    expect(questObjectives(sim, q)).toMatchObject([{ id: 'kills', done: false, current: 1, needed: q.killsNeeded }])
  })

  it('QUEST-01: the reward is shown as "up to X c" before acceptance and the amount actually paid after completion', () => {
    const sim = testSim()
    const q = postWolves(sim)
    expect(questRewardText(q)).toMatch(new RegExp(`up to ${q.reward} c.*treasury`))
    acceptQuest(sim, q.id)
    sim.state.settlements[0]!.treasury = 10 // poor settlement
    const before = sim.player.money
    q.kills = q.killsNeeded
    questSystem(sim)
    expect(q.status).toBe('done')
    expect(q.paid).toBe(10)
    expect(sim.player.money - before).toBe(10)
    expect(questRewardText(q)).toMatch(/paid 10 c/)
    expect(questRewardText(q)).not.toMatch(/up to/)
  })

  it('PERF-01 / QUEST-01: many repost cycles keep state.quests bounded and the repost cooldown honoured', () => {
    const sim = testSim()
    const wh = addNestRats(sim)
    const forBuilding = () => sim.state.quests.filter((q) => q.kind === 'rats' && q.buildingId === wh.id)
    let maxLen = 0
    for (let cycle = 0; cycle < 120; cycle++) {
      questSystem(sim)
      const open = forBuilding().filter((q) => q.status === 'available' || q.status === 'active')
      expect(open.length).toBe(1) // exactly one live quest per key
      // The villagers solve it: nest gone, rats gone -> expires.
      wh.ratNest = undefined
      for (const a of [...sim.state.animals]) if (a.species === 'rat') killAnimal(sim, a, sim.player)
      questSystem(sim)
      expect(open[0]!.status).toBe('expired')
      // The nest comes back immediately: the cooldown blocks a repost for a day.
      addNestRats(sim)
      sim.state.time.cal += DAY / 2
      questSystem(sim)
      expect(forBuilding().filter((q) => q.status === 'available').length).toBe(0)
      sim.state.time.cal += DAY
      maxLen = Math.max(maxLen, sim.state.quests.length)
    }
    expect(maxLen).toBeLessThanOrEqual(22)
    expect(sim.state.quests.length).toBeLessThanOrEqual(22)
  })

  it('PERF-01: completeQuest records the paid amount', () => {
    const sim = testSim()
    const q = postWolves(sim)
    completeQuest(sim, q)
    expect(q.paid).toBeDefined()
  })
})
