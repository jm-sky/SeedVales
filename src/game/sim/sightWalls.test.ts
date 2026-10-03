import { describe, expect, it } from 'vitest'
import { wallBlocksSight } from './detour'
import { testSim } from './testWorld'

describe('wallBlocksSight (NPC labels behind walls, review 020 #1)', () => {
  const sim = testSim()
  const { x, z } = sim.player
  sim.state.buildings.push({ id: 'sight-house', kind: 'house', x: x + 10, z, rot: 0, hw: 3, hd: 3, settlementId: -1, durability: 100, owner: 'settlement' } as never)
  sim.rebuildBuildingIndex()

  it('blocks a line crossing a house, not one beside it', () => {
    expect(wallBlocksSight(sim, x, z, x + 20, z)).toBe(true)
    expect(wallBlocksSight(sim, x, z + 8, x + 20, z + 8)).toBe(false)
  })

  it('does not block when the viewer stands inside', () => {
    expect(wallBlocksSight(sim, x + 10, z, x + 12, z)).toBe(false)
  })
})
