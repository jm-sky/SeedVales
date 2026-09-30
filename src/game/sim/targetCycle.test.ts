/**
 * UI-06: Tab cycles through interactive objects in range, ordered by distance + facing angle.
 */
import { describe, expect, it } from 'vitest'
import type { Target } from './interact'
import { dropItem } from './actions'
import { findTargets, nextTarget, targetKey } from './interact'
import { playerFarAway, testSim } from './testWorld'

const t = (id: number, dist: number): Target => ({ ref: { type: 'npc', id }, label: `n${id}`, x: 0, z: 0, dist })

describe('UI-06 target cycling', () => {
  it('advances through the list and wraps around', () => {
    const list = [t(1, 1), t(2, 2), t(3, 3)]
    expect(nextTarget(list, null)?.label).toBe('n1')
    expect(nextTarget(list, 'npc:1')?.label).toBe('n2')
    expect(nextTarget(list, 'npc:3')?.label).toBe('n1')
    expect(nextTarget(list, 'npc:99')?.label).toBe('n1')
    expect(nextTarget([], null)).toBeNull()
  })

  it('lists every object in reach once, best first, and Tab reaches the farther one', () => {
    const sim = testSim()
    playerFarAway(sim)
    const p = sim.player
    p.rot = 0
    dropItem(sim, p.x, p.z + 2.5, { id: 'stone', qty: 1 })
    dropItem(sim, p.x + 0.2, p.z + 1, { id: 'branch', qty: 1 })
    const list = findTargets(sim, 0).filter((x) => x.ref.type === 'ground')
    expect(list.map((x) => x.label)).toEqual(['Gałąź', 'Kamień'])
    const all = findTargets(sim, 0)
    expect(new Set(all.map((x) => targetKey(x.ref))).size).toBe(all.length)
    const first = all[0]!
    expect(nextTarget(all, targetKey(first.ref))).not.toBe(first)
  })
})
