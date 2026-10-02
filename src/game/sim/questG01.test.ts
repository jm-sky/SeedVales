/**
 * QUEST-03 — G01 "Lost Lamb": one test per ending, headless through the engine (quests--001 step 6).
 */
import { describe, expect, it } from 'vitest'
import { countItem } from './inventory'
import { castAnimal, castHuman, choose, heldActors, hoursLater, itemTotal, say as sayNode, setHour, stateOf, tickQuests, topicNode } from './questTestKit'
import { playerFarAway, run, testSim } from './testWorld'
import { totalMoney } from './treasury'

const say = (sim: ReturnType<typeof testSim>, node: string) => sayNode(sim, 'g01', node)

function offered() {
  const sim = testSim()
  playerFarAway(sim) // Pip is led away only when the player is not looking
  tickQuests(sim, 31)
  expect(stateOf(sim, 'g01')?.status).toBe('offered')
  return sim
}

/** Piers's camp. */
const camp = (sim: ReturnType<typeof testSim>) => {
  const piers = castHuman(sim, 'g01', 'piers')
  return { x: piers.questHold!.x, z: piers.questHold!.z, piers }
}

function accept(sim: ReturnType<typeof testSim>) {
  const molly = castHuman(sim, 'g01', 'molly')
  expect(topicNode(sim, 'g01', molly.id)).toBe('mo_open')
  choose(sim, 'g01', 'mo_open', 'help')
  choose(sim, 'g01', 'mo_brief', 'no_accusing')
  expect(stateOf(sim, 'g01')).toMatchObject({ status: 'active', stage: 2 })
  return molly
}

/** The player stands next to Piers (the dialog needs him in range). */
const toPiers = (sim: ReturnType<typeof testSim>) => {
  const { x, z } = camp(sim)
  sim.player.x = x + 2
  sim.player.z = z
  sim.actors.update(sim.player)
}

/** Brings Pip to Molly's pen with the player and finishes through Molly's dialog. */
function bringHome(sim: ReturnType<typeof testSim>, answer: string, ending: string) {
  const molly = castHuman(sim, 'g01', 'molly')
  const pip = castAnimal(sim, 'g01', 'pip')
  expect(pip.questFollow).toBe(sim.player.id)
  // Away from Molly Pip does not count as brought home.
  pip.x = molly.x + 40
  pip.z = molly.z
  sim.actors.update(pip)
  expect(topicNode(sim, 'g01', molly.id)).toBe('mo_progress')
  pip.x = molly.x + 2
  pip.z = molly.z
  sim.actors.update(pip)
  expect(topicNode(sim, 'g01', molly.id)).toBe('mo_home')
  choose(sim, 'g01', 'mo_home', answer)
  expect(stateOf(sim, 'g01')).toMatchObject({ status: 'done', ending })
  expect(pip.questFollow).toBeUndefined()
  expect(pip.questHold).toBeUndefined()
}

describe('QUEST-03 G01 Lost Lamb', () => {
  it('QUEST-03 G01: on offer Piers camps by the road with Pip held beside him; the quest needs day 1–5', () => {
    const sim = testSim()
    playerFarAway(sim)
    sim.state.time.cal += 6 * 86400
    tickQuests(sim, 31)
    expect(stateOf(sim, 'g01')).toBeUndefined() // too late
    const sim2 = offered()
    const { piers, x, z } = camp(sim2)
    expect(piers).toMatchObject({ kin: 'visitor', questOwner: 'g01', householdId: -1, name: 'Piers Walker' })
    expect(piers.profession).toBeUndefined()
    const pip = castAnimal(sim2, 'g01', 'pip')
    expect(pip.species).toBe('sheep')
    expect(pip.questHold).toMatchObject({ q: 'g01', x, z })
    expect(Math.hypot(pip.x - x, pip.z - z)).toBeLessThan(3)
    const hs = sim2.world.settlements[0]!
    expect(Math.hypot(x - hs.x, z - hs.z)).toBeGreaterThan(hs.radius + 100)
  })

  it('QUEST-03 G01 E1: evidence (latch + Mark\'s witness) — Piers gives Pip up; Molly pays 15 c and two fleeces', () => {
    const sim = offered()
    const molly = accept(sim)
    const mark = castHuman(sim, 'g01', 'mark')
    choose(sim, 'g01', 'ma_witness', 'keep_quiet')
    toPiers(sim)
    const { piers } = camp(sim)
    expect(topicNode(sim, 'g01', piers.id)).toBe('pi_ford')
    expect(() => choose(sim, 'g01', 'pi_ford', 'guard')).toThrow(/no option|disabled/) // Mark was not asked
    const money = totalMoney(sim)
    const wool = itemTotal(sim, 'wool')
    const goods = { bread: itemTotal(sim, 'bread'), skin: itemTotal(sim, 'waterskin_m') }
    choose(sim, 'g01', 'pi_ford', 'evidence')
    const pip = castAnimal(sim, 'g01', 'pip')
    expect(pip.questFollow).toBe(sim.player.id)
    expect(pip.questHold).toBeUndefined()
    expect(stateOf(sim, 'g01')!.stage).toBe(3)
    const p0 = sim.player.money
    const m0 = molly.money
    const w0 = countItem(sim.player.inv, 'wool')
    bringHome(sim, 'home_evidence', 'evidence')
    expect(sim.player.money).toBe(p0 + Math.min(15, m0))
    expect(countItem(sim.player.inv, 'wool')).toBe(w0 + 2)
    expect(totalMoney(sim)).toBe(money)
    expect(itemTotal(sim, 'wool')).toBe(wool) // a transfer from Molly's store
    // Piers is gone; his belongings went to the warehouse (nothing vanished).
    expect(sim.human(piers.id)).toBeUndefined()
    expect(itemTotal(sim, 'bread')).toBe(goods.bread)
    expect(itemTotal(sim, 'waterskin_m')).toBe(goods.skin)
    expect(heldActors(sim)).toBe(0)
    expect(mark).toBeDefined()
  })

  it('QUEST-03 G01 E2: Mark walks Piers off (guard) — needs the arrest request and two leads', () => {
    const sim = offered()
    accept(sim)
    toPiers(sim)
    const { piers } = camp(sim)
    expect(say(sim, 'pi_ford').options.map((o) => o.id)).not.toContain('guard') // Mark was not asked, no lead but the latch
    choose(sim, 'g01', 'ma_witness', 'arrest') // Mark's witness is the second lead and he is asked to come
    expect(say(sim, 'pi_ford').options.map((o) => o.id)).toContain('guard')
    const money = totalMoney(sim)
    choose(sim, 'g01', 'pi_ford', 'guard')
    // Piers is still there for the narration node (review 014 #7); he leaves once the player has walked away.
    expect(sim.human(piers.id)).toBeDefined()
    expect(sayNode(sim, 'g01', 'pi_guard').lines).toHaveLength(1)
    tickQuests(sim, 2)
    expect(sim.human(piers.id)).toBeDefined()
    sim.player.x += 30
    sim.actors.update(sim.player)
    tickQuests(sim, 2)
    expect(sim.human(piers.id)).toBeUndefined()
    bringHome(sim, 'home_guard', 'guard')
    expect(totalMoney(sim)).toBe(money)
    expect(heldActors(sim)).toBe(0)
  })

  it('QUEST-03 G01 E3: paying the finder\'s fee — the 10 c goes to Piers\'s purse, then to the treasury when he leaves; Molly refunds', () => {
    const sim = offered()
    const molly = accept(sim)
    toPiers(sim)
    sim.player.money = 50
    molly.money = 40
    const money = totalMoney(sim)
    choose(sim, 'g01', 'pi_ford', 'paid')
    expect(sim.player.money).toBe(40)
    expect(castHuman(sim, 'g01', 'piers').money).toBe(10)
    const p0 = sim.player.money
    bringHome(sim, 'home_paid', 'paid')
    expect(sim.player.money).toBe(p0 + 25) // 15 c + the 10 c fee back
    expect(totalMoney(sim)).toBe(money)
  })

  it('QUEST-03 G01 E3: the fee option is disabled without 10 c', () => {
    const sim = offered()
    accept(sim)
    toPiers(sim)
    sim.player.money = 9
    expect(() => choose(sim, 'g01', 'pi_ford', 'paid')).toThrow(/disabled/)
  })

  it('QUEST-03 G01 E4: taking Pip back at night while sneaking (5 s at the camp)', () => {
    const sim = offered()
    accept(sim)
    const { x, z } = camp(sim)
    setHour(sim, 1)
    sim.player.x = x + 3
    sim.player.z = z
    sim.actors.update(sim.player)
    sim.state.px.sneaking = false
    tickQuests(sim, 10)
    expect(stateOf(sim, 'g01')!.stage).toBe(2)
    sim.state.px.sneaking = true
    tickQuests(sim, 4)
    expect(stateOf(sim, 'g01')!.stage).toBe(2)
    tickQuests(sim, 2)
    expect(stateOf(sim, 'g01')).toMatchObject({ stage: 3 })
    expect(stateOf(sim, 'g01')!.flags.resolved).toBe('taken_back')
    const money = totalMoney(sim)
    bringHome(sim, 'home_taken', 'taken_back')
    expect(totalMoney(sim)).toBe(money)
    expect(heldActors(sim)).toBe(0)
  })

  it('QUEST-03 G01: the pen read depends on Survival — weak read is "a wolf", strong read gives the prints lead', () => {
    const sim = offered()
    accept(sim)
    const molly = castHuman(sim, 'g01', 'molly')
    const pen = sim.householdBuildings(molly.householdId).find((b) => b.kind === 'pen')
    expect(pen).toBeDefined()
    sim.player.x = pen!.x + 1
    sim.player.z = pen!.z + 1
    sim.actors.update(sim.player)
    sim.player.skills.survival = 5
    tickQuests(sim, 6)
    expect(stateOf(sim, 'g01')!.flags).toMatchObject({ misreadWolf: true, prints: false })
    expect(say(sim, 'mo_progress').options.map((o) => o.id)).toContain('say_wolf')
    const sim2 = offered()
    accept(sim2)
    const pen2 = sim2.householdBuildings(castHuman(sim2, 'g01', 'molly').householdId).find((b) => b.kind === 'pen')!
    sim2.player.x = pen2.x + 1
    sim2.player.z = pen2.z + 1
    sim2.actors.update(sim2.player)
    sim2.player.skills.survival = 30
    tickQuests(sim2, 6)
    expect(stateOf(sim2, 'g01')!.flags).toMatchObject({ prints: true, misreadWolf: false })
  })

  it('QUEST-03 G01: if the player never comes, Piers sells Pip after two days — Pip and Piers are gone, Molly −5 when accepted', () => {
    const sim = offered()
    const molly = accept(sim)
    const pip = castAnimal(sim, 'g01', 'pip')
    const op = molly.opinion
    const animals = sim.state.animals.length
    const money = totalMoney(sim)
    hoursLater(sim, 49)
    tickQuests(sim)
    expect(stateOf(sim, 'g01')).toMatchObject({ status: 'done', ending: 'sold' })
    expect(sim.actor(pip.id)).toBeUndefined()
    expect(sim.state.animals.length).toBe(animals - 1)
    expect(molly.opinion).toBe(op - 5)
    expect(totalMoney(sim)).toBe(money)
    expect(heldActors(sim)).toBe(0)
    expect(sim.state.npcs.some((n) => n.questOwner)).toBe(false)
  })

  it('QUEST-03 G01: Pip follows the player (the follow primitive), Piers stays at his camp (the hold primitive)', () => {
    const sim = offered()
    accept(sim)
    toPiers(sim)
    const pip = castAnimal(sim, 'g01', 'pip')
    const { piers, x, z } = camp(sim)
    choose(sim, 'g01', 'pi_ford', 'where')
    sim.player.money = 20
    choose(sim, 'g01', 'pi_ford', 'paid')
    // Pip, 25 m away, catches up with the walking player; Piers does not wander off.
    sim.player.x = x + 30
    sim.player.z = z
    sim.actors.update(sim.player)
    run(sim, 25)
    expect(Math.hypot(pip.x - sim.player.x, pip.z - sim.player.z)).toBeLessThan(6)
    run(sim, 20)
    expect(Math.hypot(piers.x - x, piers.z - z)).toBeLessThan(6)
  })

  it('QUEST-03 G01: Piers survives his two days at the camp from his pack (visitors eat and drink while held)', () => {
    const sim = offered()
    const { piers } = camp(sim)
    // The player stays away: far LOD for the camp.
    for (let h = 0; h < 48; h++) {
      run(sim, 150, 0.5)
      tickQuests(sim, 1)
    }
    expect(piers.vitals.dead).toBeFalsy()
    expect(stateOf(sim, 'g01')?.status === 'done' && stateOf(sim, 'g01')?.ending).toBe('sold')
  })
})

