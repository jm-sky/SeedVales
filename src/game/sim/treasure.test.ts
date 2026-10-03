import { describe, expect, it } from 'vitest'
import { Rng } from '../core/rng'
import { roundTrip } from '../save/snapshot'
import { dig } from './actions'
import { addItem, countItem, newStack } from './inventory'
import { testSim } from './testWorld'
import { sellToNpc } from './trade'
import { bellyLoot, rollTreasure, treasureSpots } from './treasure'
import { totalMoney } from './treasury'

const VALUABLES = ['gold_ring', 'ruby', 'emerald', 'diamond', 'obsidian_dagger', 'damascus_dagger']
const valuables = (sim: ReturnType<typeof testSim>) => VALUABLES.reduce((a, id) => a + countItem(sim.player.inv, id), 0)

function atSpot(sim: ReturnType<typeof testSim>, i = 0) {
  const s = treasureSpots(sim.world)[i]!
  sim.player.x = s.x
  sim.player.z = s.z
  addItem(sim.player.inv, newStack('shovel'))
  return s
}

describe('LOOT-01 treasure', () => {
  it('LOOT-01: spots are deterministic, inside their landmark and exist for every landmark', () => {
    const a = treasureSpots(testSim(1337).world)
    const b = treasureSpots(testSim(1337).world)
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThanOrEqual(testSim().world.landmarks.length)
    for (const s of a) {
      const l = testSim().world.landmarks.find((x) => s.id.startsWith(`${x.id}#`))!
      expect(Math.hypot(s.x - l.x, s.z - l.z)).toBeLessThanOrEqual(l.radius)
    }
  })

  it('LOOT-01: digging on a spot pays its content once; a second dig finds nothing; the taken list survives save/load', () => {
    const sim = testSim()
    const s = atSpot(sim)
    const money0 = sim.player.money
    const r = dig(sim, sim.player, s.x, s.z)
    expect(r.msg).toMatch(/strikes something buried/)
    expect(sim.player.money > money0 || valuables(sim) > 0).toBe(true)
    expect(sim.state.px.lootTaken).toEqual([s.id])
    const after = { money: sim.player.money, v: valuables(sim) }
    expect(dig(sim, sim.player, s.x, s.z).msg).not.toMatch(/buried/)
    expect(valuables(sim)).toBe(after.v)
    expect(roundTrip(sim).px.lootTaken).toEqual([s.id])
  })

  it('LOOT-01: NPC digging never touches treasure', () => {
    const sim = testSim()
    const s = treasureSpots(sim.world)[0]!
    const npc = sim.state.npcs[0]!
    addItem(npc.inv, newStack('shovel'))
    dig(sim, npc, s.x, s.z)
    expect(sim.state.px.lootTaken ?? []).toEqual([])
  })

  it('LOOT-01: contents depend on richness (no diamonds from poor sites) and are weighted', () => {
    const poor = new Set<string>()
    for (let i = 0; i < 400; i++) {
      const c = rollTreasure(new Rng(i), 0)
      if ('stack' in c) poor.add(c.stack.id)
    }
    expect(poor.has('diamond')).toBe(false)
    expect(poor.has('gold_ring')).toBe(true)
    const rich = new Set<string>()
    for (let i = 0; i < 800; i++) {
      const c = rollTreasure(new Rng(i), 2)
      if ('stack' in c) rich.add(c.stack.id)
    }
    expect(rich.has('damascus_dagger')).toBe(true)
  })

  it('LOOT-01: belly finds are rare, deterministic per corpse and only for large predators', () => {
    const sim = testSim()
    let hits = 0
    for (let id = 1; id <= 2000; id++) {
      const c = { id, species: 'wolf' } as never
      const before = valuables(sim)
      const m = bellyLoot(sim, sim.player, c)
      if (m) {
        hits++
        expect(bellyLoot(sim, sim.player, c)).toBe(m) // same corpse, same answer
      }
      void before
    }
    expect(hits).toBeGreaterThan(30)
    expect(hits).toBeLessThan(160)
    expect(bellyLoot(sim, sim.player, { id: 1, species: 'deer' } as never)).toBeNull()
  })

  it('TRADE-02 / LOOT-01: a trader pays for a gem within its cash; money is conserved; a poor NPC refuses', () => {
    const sim = testSim()
    addItem(sim.player.inv, newStack('diamond'))
    const trader = sim.state.npcs.find((n) => n.profession === 'trader') ?? sim.state.npcs[0]!
    const poor = sim.state.npcs.find((n) => n !== trader)!
    poor.money = 3
    const stack = sim.player.inv.items.find((s) => s.id === 'diamond')!
    expect(sellToNpc(sim, poor, stack).ok).toBe(false)
    trader.money = 1000
    const total = totalMoney(sim)
    expect(sellToNpc(sim, trader, stack).ok).toBe(true)
    expect(totalMoney(sim)).toBe(total)
    expect(countItem(sim.player.inv, 'diamond')).toBe(0)
  })
})
