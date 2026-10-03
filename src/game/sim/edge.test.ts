import { describe, expect, it } from 'vitest'
import type { ItemStack } from './types'
import { EDGE } from '../config/calibration'
import { itemDef } from '../data/items'
import { roundTrip } from '../save/snapshot'
import { dullEdge, edgeFactor, edgeOf, maxEdge, needsSharpening, sharpenEdge } from './edge'
import { transferToStorage } from './interact'
import { addItem, newStack, weaponScore } from './inventory'
import { ACTIVITY_DONE } from './playerActivities'
import { testSim } from './testWorld'

const sword = (extra: Partial<ItemStack> = {}): ItemStack => ({ id: 'sword', qty: 1, dur: 200, ...extra })
const w = itemDef('sword').weapon!

describe('combat--005 sharpness', () => {
  it('COMBAT-05: maximum edge depends on quality/material; same-id swords hold independent state', () => {
    const poor = sword({ q: 0, m: 0 })
    const fine = sword({ q: 3, m: 2 })
    expect(maxEdge(fine)).toBeGreaterThan(maxEdge(poor))
    expect(maxEdge(fine)).toBeLessThanOrEqual(1)
    const a = sword({ edge: 0.3 })
    const b = sword()
    expect(edgeOf(a)).toBeCloseTo(0.3)
    expect(edgeOf(b)).toBeCloseTo(maxEdge(b))
  })

  it('COMBAT-05: hits dull edged weapons (cut more than pierce), never below the floor; blunt ignores sharpness', () => {
    const s = sword()
    const e0 = edgeOf(s)
    dullEdge(s, w)
    expect(edgeOf(s)).toBeLessThan(e0)
    for (let i = 0; i < 500; i++) dullEdge(s, w)
    expect(edgeOf(s)).toBeCloseTo(EDGE.floor)
    const club = { id: 'club', qty: 1, dur: 200 }
    const cw = itemDef('club').weapon!
    dullEdge(club, cw)
    expect(club).not.toHaveProperty('edge')
    expect(edgeFactor(club, cw)).toBe(1)
    expect(maxEdge(club)).toBe(0)
  })

  it('COMBAT-05: damage factor and weapon score are monotonic in the edge; a dull blade stays usable', () => {
    const sharp = sword()
    const dull = sword({ edge: 0.1 })
    expect(edgeFactor(dull, w)).toBeLessThan(edgeFactor(sharp, w))
    expect(edgeFactor(dull, w)).toBeGreaterThanOrEqual(1 - EDGE.cutPenalty)
    expect(weaponScore(dull)).toBeLessThan(weaponScore(sharp))
    expect(weaponScore(dull)).toBeGreaterThan(0)
  })

  it('COMBAT-05: sharpening raises the edge up to the maximum only and does not repair durability', () => {
    const s = sword({ edge: 0.1, dur: 90 })
    const e1 = sharpenEdge(s)
    expect(e1).toBeGreaterThan(0.1)
    for (let i = 0; i < 10; i++) sharpenEdge(s)
    expect(edgeOf(s)).toBeCloseTo(maxEdge(s))
    expect(s.edge).toBeLessThanOrEqual(maxEdge(s) + 1e-9)
    expect(s.dur).toBe(90)
    expect(needsSharpening(s)).toBe(false)
  })

  it('COMBAT-05: the whetstone activity sharpens the named blade, wears the stone, refuses without one', () => {
    const sim = testSim()
    const p = sim.player
    p.eq.main = sword({ edge: 0.1 })
    const done = ACTIVITY_DONE.sharpen!
    expect(done(sim, { kind: 'sharpen', label: '', total: 6, elapsed: 6, data: 'main' })!.ok).toBe(false) // no whetstone
    addItem(p.inv, newStack('whetstone'))
    const stone = p.inv.items.find((s) => s.id === 'whetstone')!
    const dur0 = stone.dur!
    expect(done(sim, { kind: 'sharpen', label: '', total: 6, elapsed: 6, data: 'main' })!.ok).toBe(true)
    expect(edgeOf(p.eq.main)).toBeGreaterThan(0.1)
    expect(stone.dur).toBe(dur0 - 1)
  })

  it('COMBAT-05: a second sword never refreshes the first; storage and save round-trips keep the edge', () => {
    const sim = testSim()
    const p = sim.player
    addItem(p.inv, sword({ edge: 0.2, dur: 50 }))
    addItem(p.inv, sword())
    const swords = p.inv.items.filter((s) => s.id === 'sword')
    expect(swords).toHaveLength(2)
    expect(swords.map((s) => s.edge).filter((e) => e !== undefined)).toEqual([0.2])
    const wh = sim.building(sim.state.settlements[sim.world.homeSettlement]!.warehouseId)!
    const idx = p.inv.items.indexOf(swords[0]!)
    transferToStorage(sim, wh, idx, true)
    const inStore = wh.inv!.items.find((s) => s.id === 'sword' && s.edge === 0.2)
    expect(inStore).toBeDefined()
    const copy = roundTrip(sim)
    const all = [...copy.player.inv.items, ...copy.buildings.flatMap((b) => b.inv?.items ?? [])]
    expect(all.some((s) => s.id === 'sword' && s.edge === 0.2)).toBe(true)
  })
})
