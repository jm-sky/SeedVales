/**
 * QUEST-03 — Q13 "The Ash House Vault": estate-ruin anchor near T, the stag at the orchard, shoring gate and collapse, the
 * minted vault, hand-over and three endings × shares (quests--003 W3).
 */
import { describe, expect, it } from 'vitest'
import { addItem, countItem, newStack } from './inventory'
import { ctxOf, resolveAnchor, townId } from './questCore'
import { questDef, questEvent } from './questEngine'
import { castAnimal, castHuman, choose, itemTotal, setDayHour, stateOf, tickQuests } from './questTestKit'
import { playerFarAway, testSim } from './testWorld'
import { totalMoney } from './treasury'

type Sim = ReturnType<typeof testSim>

function offered() {
  const sim = testSim()
  playerFarAway(sim)
  setDayHour(sim, 5, 10)
  sim.state.px.visited = [townId(sim)]
  tickQuests(sim, 31)
  expect(stateOf(sim, 'q13')?.status).toBe('offered')
  return sim
}

const at = (sim: Sim, a: Parameters<typeof resolveAnchor>[1]) => resolveAnchor(ctxOf(sim, questDef(sim, 'q13')!, stateOf(sim, 'q13')!), a)!
const ash = { k: 'landmark', kind: 'estate_ruin', pick: 'nearestTown' } as const
const cellar = { k: 'offset', of: ash, dx: 4, dz: -4 } as const
const farWall = { k: 'offset', of: ash, dx: 24, dz: 9 } as const
const flags = (sim: Sim) => stateOf(sim, 'q13')!.flags
const standAt = (sim: Sim, x: number, z: number) => {
  sim.player.x = x
  sim.player.z = z
  sim.actors.update(sim.player)
}

function vaultOpened(sim: Sim) {
  choose(sim, 'q13', 'ir_open', 'come')
  const w = at(sim, farWall)
  standAt(sim, w.x, w.z)
  tickQuests(sim, 5)
  expect(flags(sim).orchard).toBe('around')
  addItem(sim.player.inv, newStack('log', 2))
  addItem(sim.player.inv, newStack('pickaxe'))
  const c = at(sim, cellar)
  standAt(sim, c.x, c.z)
  tickQuests(sim, 14)
  expect(flags(sim).cellarShored).toBe(true)
  expect(countItem(sim.player.inv, 'log')).toBe(0)
  tickQuests(sim, 12)
  expect(flags(sim).vaultOpen).toBe(true)
}

describe('QUEST-03 Q13 The Ash House Vault', () => {
  it('accepting spawns the leashed stag near the ruin; the estate ruin is the one nearest T', () => {
    const sim = offered()
    expect(sim.state.animals.some((a) => a.tag === 'ash_stag')).toBe(false)
    choose(sim, 'q13', 'ir_open', 'come')
    const stag = castAnimal(sim, 'q13', 'stag')
    expect(stag.species).toBe('stag')
    expect(stag.leash).toBe(28)
    const a = at(sim, ash)
    expect(Math.hypot(stag.x - a.x, stag.z - a.z)).toBeLessThan(25)
    const t = sim.world.settlements[townId(sim)]!
    const nearest = sim.world.landmarks.filter((l) => l.kind === 'estate_ruin').sort((p, q) => Math.hypot(p.x - t.x, p.z - t.z) - Math.hypot(q.x - t.x, q.z - t.z))[0]!
    expect(a).toMatchObject({ x: nearest.x, z: nearest.z })
  })

  it('digging in the cellar before shoring hurts the player once; shoring needs two logs', () => {
    const sim = offered()
    choose(sim, 'q13', 'ir_open', 'come')
    const w = at(sim, farWall)
    standAt(sim, w.x, w.z)
    tickQuests(sim, 5)
    const c = at(sim, cellar)
    standAt(sim, c.x, c.z)
    tickQuests(sim, 15)
    expect(flags(sim).cellarShored).toBe(false) // no logs
    const hp0 = sim.player.vitals.parts.torso
    questEvent(sim, { k: 'dig', x: c.x, z: c.z })
    tickQuests(sim, 2)
    expect(flags(sim).collapsed).toBe(true)
    expect(sim.player.vitals.parts.torso).toBeGreaterThan(hp0)
    const hp1 = sim.player.vitals.parts.torso
    questEvent(sim, { k: 'dig', x: c.x, z: c.z })
    tickQuests(sim, 2)
    expect(sim.player.vitals.parts.torso).toBe(hp1) // once
  })

  it('the vault needs the shoring and a pickaxe; opening mints 180 c once and grants the finds', () => {
    const sim = offered()
    const m0 = totalMoney(sim)
    const rubies = itemTotal(sim, 'ruby')
    vaultOpened(sim)
    expect(totalMoney(sim) - m0).toBe(180)
    expect(itemTotal(sim, 'ruby') - rubies).toBe(2)
    expect(countItem(sim.player.inv, 'wage_packet')).toBe(1)
    tickQuests(sim, 30)
    expect(totalMoney(sim) - m0).toBe(180)
  })

  const shares = ['ruby', 'cuirass', 'coin'] as const
  for (const [pick, ending] of [['rebuild', 'rebuild'], ['clear', 'clear_debts'], ['sell', 'sell']] as const) {
    for (const sh of shares) {
      it(`${ending} with share ${sh}: Samuel gets 20 c, money is conserved, the items exist once`, () => {
        const sim = offered()
        vaultOpened(sim)
        const samuel = castHuman(sim, 'q13', 'samuel')
        const purse0 = samuel.money
        choose(sim, 'q13', 'ir_hand', 'hand')
        expect(countItem(sim.player.inv, 'ruby')).toBe(0)
        const money0 = totalMoney(sim)
        const rubies = itemTotal(sim, 'ruby')
        choose(sim, 'q13', 'ir_choice', pick)
        choose(sim, 'q13', 'ir_share', sh)
        tickQuests(sim, 3)
        expect(stateOf(sim, 'q13')).toMatchObject({ status: 'done', ending })
        expect(samuel.money - purse0).toBe(20)
        expect(totalMoney(sim)).toBe(money0)
        expect(itemTotal(sim, 'ruby')).toBe(rubies)
        if (sh === 'ruby') expect(countItem(sim.player.inv, 'ruby')).toBe(1)
        if (sh === 'cuirass') expect(countItem(sim.player.inv, 'studded_leather')).toBe(1)
      })
    }
  }

  it('the hand-over needs everything; keeping the vault for four days lapses the quest with an honesty loss', () => {
    const sim = offered()
    vaultOpened(sim)
    sim.player.inv.items = sim.player.inv.items.filter((s) => s.id !== 'wage_packet')
    expect(() => choose(sim, 'q13', 'ir_hand', 'hand')).toThrow(/disabled/)
    addItem(sim.player.inv, newStack('wage_packet'))
    const rep0 = sim.state.settlements[townId(sim)]!.rep.honesty
    sim.state.time.cal += 100 * 3600
    tickQuests(sim, 3)
    expect(stateOf(sim, 'q13')?.status).toBe('lapsed')
    expect(sim.state.settlements[townId(sim)]!.rep.honesty).toBeLessThan(rep0)
  })
})
