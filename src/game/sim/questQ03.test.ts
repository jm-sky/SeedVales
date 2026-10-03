/**
 * QUEST-03 — Q03 "A Roof Before Rain": one test per ending, headless through the engine (quests--001 step 3).
 */
import { describe, expect, it } from 'vitest'
import { repairBuilding } from './actions'
import { placeSite } from './build'
import { applyBuildProgress } from './build'
import { addItem, countItem, newStack } from './inventory'
import { questChoose } from './questDialog'
import { castHuman, choose, heldActors, houseOfNpc, itemTotal, stateOf, tickQuests, topicNode } from './questTestKit'
import { testSim } from './testWorld'
import { totalMoney } from './treasury'

/** A sim where Q03 has been offered: the woodcutter's house is worn down. */
function offered() {
  const sim = testSim()
  const house = sim.state.buildings.find((b) => b.kind === 'house' && sim.state.households[b.householdId ?? -1]?.profession === 'woodcutter')!
  house.durability = 40
  tickQuests(sim, 31)
  expect(stateOf(sim, 'q03')?.status).toBe('offered')
  return { sim, house }
}

/** Accepts, inspects the beam with a torch and settles on a plan (through dialog), returning the household. */
function toDecision(sim: ReturnType<typeof testSim>, plan: 'repair' | 'lean_to' | 'prop', cupboard: boolean) {
  const miles = castHuman(sim, 'q03', 'miles')
  const house = houseOfNpc(sim, miles)
  expect(topicNode(sim, 'q03', miles.id)).toBe('m_open')
  choose(sim, 'q03', 'm_open', 'show_damage')
  expect(stateOf(sim, 'q03')!.stage).toBe(1)
  if (cupboard && sim.state.authoredQuests.q03!.cast.joan !== undefined) {
    choose(sim, 'q03', 'j_room', 'ask_changed')
    expect(stateOf(sim, 'q03')!.flags.cupboardHeard).toBe(true)
  }
  // The beam: a lit torch in the off hand, standing by the house for 6 s.
  const p = sim.player
  p.eq.off = newStack('torch')
  p.x = house.x + house.hw + 2
  p.z = house.z
  sim.actors.update(p)
  tickQuests(sim, 4)
  expect(stateOf(sim, 'q03')!.flags.beamInspected).toBe(false)
  tickQuests(sim, 4)
  expect(stateOf(sim, 'q03')!.flags.beamInspected).toBe(true)
  expect(stateOf(sim, 'q03')!.stage).toBe(2)
  expect(topicNode(sim, 'q03', miles.id)).toBe('m_beam')
  choose(sim, 'q03', 'm_beam', plan === 'repair' ? 'plan_repair' : plan === 'lean_to' ? 'plan_lean_to' : 'plan_prop')
  choose(sim, 'q03', 'l_decide', `say_${plan}`)
  choose(sim, 'q03', `l_${plan}`, 'agree')
  expect(stateOf(sim, 'q03')!.stage).toBe(3)
  return { miles, house }
}

describe('QUEST-03 Q03 A Roof Before Rain', () => {
  it('QUEST-03 Q03: is offered only while the woodcutter house is worn (durability < 60)', () => {
    const sim = testSim()
    tickQuests(sim, 31)
    expect(stateOf(sim, 'q03')).toBeUndefined()
    for (const b of sim.state.buildings) if (b.kind === 'house' && sim.state.households[b.householdId ?? -1]?.profession === 'woodcutter') b.durability = 59
    tickQuests(sim, 31)
    expect(stateOf(sim, 'q03')?.status).toBe('offered')
  })

  it('QUEST-03 Q03 E1: replace the beam — loan from the common store, repair, thanks; money constant, 2 logs consumed', () => {
    const { sim } = offered()
    const { miles, house } = toDecision(sim, 'repair', true)
    const st = stateOf(sim, 'q03')!
    // The household has no beams: the common store lends two (Ralph, the reeve).
    const store = house.inv!
    store.items = store.items.filter((s) => s.id !== 'log')
    const wh = sim.building(sim.state.settlements[0]!.warehouseId)!
    const whLogs = countItem(wh.inv!, 'log')
    const ralph = castHuman(sim, 'q03', 'ralph')
    expect(topicNode(sim, 'q03', ralph.id)).toBe('r_store')
    choose(sim, 'q03', 'r_store', 'store_agree')
    expect(st.flags.storeGranted && st.flags.storeDebt).toBe(true)
    expect(countItem(wh.inv!, 'log')).toBe(whLogs - 2)
    expect(countItem(store, 'log')).toBe(2)
    // The work: two repairs with hammer and branches.
    const p = sim.player
    addItem(p.inv, newStack('hammer'))
    addItem(p.inv, newStack('branch', 6))
    expect(repairBuilding(sim, p, house).ok).toBe(true)
    tickQuests(sim)
    expect(st.flags.workComplete).toBe(house.durability >= 90)
    if (house.durability < 90) expect(repairBuilding(sim, p, house).ok).toBe(true)
    tickQuests(sim)
    expect(st.flags.workComplete).toBe(true)
    expect(topicNode(sim, 'q03', castHuman(sim, 'q03', 'lucy').id)).toBe('l_done')
    const money = totalMoney(sim)
    const logs = itemTotal(sim, 'log')
    const bread = itemTotal(sim, 'bread')
    const branches = itemTotal(sim, 'branch')
    const op0 = miles.opinion
    choose(sim, 'q03', 'l_done', 'take_goods_repair')
    expect(st.status).toBe('done')
    expect(st.ending).toBe('repair')
    expect(totalMoney(sim)).toBe(money)
    expect(itemTotal(sim, 'log')).toBe(logs - 2) // only the beams are consumed
    expect(itemTotal(sim, 'bread')).toBe(bread) // Lucy's thanks is a transfer
    expect(itemTotal(sim, 'branch')).toBe(branches)
    expect(miles.opinion).toBe(op0 + 15)
    expect(heldActors(sim, 'q03')).toBe(0)
    // The quest is settled: a replayed thank-you option is refused and pays nothing (review 014 #3).
    const purse = sim.player.money
    expect(questChoose(sim, 'q03', 'l_done', 'take_coin_repair')).toBeNull()
    expect(questChoose(sim, 'q03', 'l_done', 'take_goods_repair')).toBeNull()
    expect(st.ending).toBe('repair')
    expect(itemTotal(sim, 'bread')).toBe(bread)
    expect(sim.player.money).toBe(purse)
  })

  it('QUEST-03 Q03 E1: the coin option pays 10 c from Miles\'s purse (partial when short)', () => {
    const { sim } = offered()
    const { miles, house } = toDecision(sim, 'repair', false)
    // The player takes part (D-QUEST-2: NPC work alone ends the quest without a thanks payment).
    addItem(sim.player.inv, newStack('hammer'))
    addItem(sim.player.inv, newStack('branch', 6))
    for (let i = 0; i < 3 && house.durability < 90; i++) expect(repairBuilding(sim, sim.player, house).ok).toBe(true)
    tickQuests(sim)
    miles.money = 4
    const money = totalMoney(sim)
    const p0 = sim.player.money
    choose(sim, 'q03', 'l_done', 'take_coin_repair')
    expect(sim.player.money).toBe(p0 + 4) // paid only what he had
    expect(totalMoney(sim)).toBe(money)
  })

  it('QUEST-03 Q03 E2: a shed built beside the house becomes the household\'s', () => {
    const { sim } = offered()
    const { miles, house } = toDecision(sim, 'lean_to', true)
    const st = stateOf(sim, 'q03')!
    // A shed far from the house does not count; one within 15 m does.
    const far = placeSite(sim, 'shed', house.x + 80, house.z + 80, 0)
    expect(far.ok).toBe(true)
    const farSite = sim.state.sites[sim.state.sites.length - 1]!
    applyBuildProgress(sim, farSite.id, 1e6)
    applyBuildProgress(sim, farSite.id, 1e6)
    expect(st.counters.leanTo ?? 0).toBe(0)
    let site
    for (const [dx, dz] of [[12, 0], [-12, 0], [0, 12], [0, -12], [10, 10], [-10, 10]] as const) {
      if (placeSite(sim, 'shed', house.x + dx, house.z + dz, 0).ok) {
        site = sim.state.sites[sim.state.sites.length - 1]!
        break
      }
    }
    expect(site).toBeDefined()
    applyBuildProgress(sim, site!.id, 1e6)
    applyBuildProgress(sim, site!.id, 1e6)
    expect(st.counters.leanTo).toBe(1)
    tickQuests(sim)
    expect(st.flags.workComplete).toBe(true)
    const money = totalMoney(sim)
    choose(sim, 'q03', 'l_done', 'take_goods_lean_to')
    expect(st.ending).toBe('lean_to')
    const shed = sim.state.buildings.find((b) => b.playerBuilt && b.kind === 'shed' && Math.hypot(b.x - house.x, b.z - house.z) < 15)!
    expect(shed.owner).toBe(`household:${miles.householdId}`)
    expect(totalMoney(sim)).toBe(money)
  })

  it('QUEST-03 Q03 E3: prop the beam with one log; the house is not repaired', () => {
    const { sim } = offered()
    const { house } = toDecision(sim, 'prop', false)
    const st = stateOf(sim, 'q03')!
    const miles = castHuman(sim, 'q03', 'miles')
    expect(topicNode(sim, 'q03', miles.id)).toBe('m_work')
    // Without a log the option is shown disabled.
    expect(() => choose(sim, 'q03', 'm_work', 'prop_beam')).toThrow(/disabled/)
    addItem(sim.player.inv, newStack('log', 1))
    const logs = itemTotal(sim, 'log')
    choose(sim, 'q03', 'm_work', 'prop_beam')
    expect(itemTotal(sim, 'log')).toBe(logs - 1)
    expect(st.flags.workComplete).toBe(true)
    expect(house.durability).toBeLessThan(60)
    const money = totalMoney(sim)
    choose(sim, 'q03', 'l_done', 'finish_prop')
    expect(st.ending).toBe('prop')
    expect(totalMoney(sim)).toBe(money)
    expect(house.durability).toBeLessThan(60)
  })

  it('QUEST-03 Q03: the family finishes the roof alone → ending "family", no reward', () => {
    const { sim, house } = offered()
    const money = totalMoney(sim)
    house.durability = 95
    tickQuests(sim)
    expect(stateOf(sim, 'q03')).toMatchObject({ status: 'done', ending: 'family' })
    expect(totalMoney(sim)).toBe(money)
  })

  it('QUEST-03 Q03: without the cupboard hint Miles suggests the prop first; the choice can be changed until settled', () => {
    const { sim } = offered()
    toDecision(sim, 'prop', false)
    const st = stateOf(sim, 'q03')!
    expect(st.choice).toBe('prop')
    // The decision can still be changed before the work is done (stage 3 only hides the decision topic).
    const lucy = castHuman(sim, 'q03', 'lucy')
    st.stage = 2
    expect(topicNode(sim, 'q03', lucy.id)).toBe('l_decide')
    choose(sim, 'q03', 'l_decide', 'say_repair')
    expect(st.choice).toBe('repair')
    expect(st.flags.plan).toBe('repair')
  })
})
