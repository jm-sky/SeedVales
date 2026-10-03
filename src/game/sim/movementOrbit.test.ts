/**
 * NPC-02 / soak finding (review 015): a leftover slide mode (`ai.stuckT` > 0.35 with an `avoidSide`) made the actor circle its
 * target forever on open ground (the sidestep heading is ~perpendicular to the target). Hunter Thomas Fowler orbited his bed
 * (300 m radius) and a water point (15 m radius) for a game day and died of thirst.
 */
import { describe, expect, it } from 'vitest'
import { steerTo } from './movement'
import { testSim } from './testWorld'

describe('NPC-02: leftover slide mode does not make an actor orbit its target', () => {
  it('an NPC with a stale stuckT/avoidSide still arrives on open ground', () => {
    const sim = testSim(7)
    const h = sim.state.npcs.find((n) => n.id === 13)!
    // Open flat spot: scan for a start/target pair 120 m apart with dry land along the line.
    const s = sim.world.settlements[0]!
    let pair: { x: number; z: number; tx: number; tz: number } | null = null
    for (let a = 0; a < 16 && !pair; a++) {
      const ang = (a / 16) * Math.PI * 2
      const x = s.x + Math.cos(ang) * (s.radius + 150)
      const z = s.z + Math.sin(ang) * (s.radius + 150)
      const tx = x + Math.cos(ang + 1.2) * 120
      const tz = z + Math.sin(ang + 1.2) * 120
      let dry = true
      for (let i = 0; i <= 24; i++) if (sim.terrain.waterDepthAt(x + ((tx - x) * i) / 24, z + ((tz - z) * i) / 24) > 0) dry = false
      if (dry) pair = { x, z, tx, tz }
    }
    expect(pair).not.toBeNull()
    h.x = pair!.x
    h.z = pair!.z
    sim.actors.update(h)
    h.ai.stuckT = 3.8
    h.ai.avoidSide = 1
    let r: ReturnType<typeof steerTo> = 'moving'
    let t = 0
    for (; t < 400 && r === 'moving'; t += 0.5) r = steerTo(sim, h, pair!.tx, pair!.tz, 1.4, 0.5, 1.2, true)
    expect(r).toBe('arrived')
    expect(t).toBeLessThan(200)
  })
})
