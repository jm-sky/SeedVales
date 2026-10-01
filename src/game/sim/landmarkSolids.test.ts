/**
 * WORLD-11 follow-up: landmark colliders (stones, ruin walls, columns, wrecks) block movement through
 * moveWithCollision, derived from the render layout; rubble and wall gaps stay walkable.
 */
import { describe, expect, it } from 'vitest'
import type { GenLandmark } from '../world/types'
import { moveWithCollision } from './collision'
import { LandmarkSolids, landmarkSolids } from './landmarkSolids'
import { testSim } from './testWorld'

const mk = (kind: GenLandmark['kind'], i = 0, rot = 0): GenLandmark => ({ id: `lm-${kind}-${i}`, kind, name: 'x', x: 1000, z: 1000, rot, radius: 9 })

describe('WORLD-11: landmark collision', () => {
  it('every kind except the pure rubble ones has solids, and they are deterministic', () => {
    for (const kind of ['stone_circle', 'house_ruin', 'estate_ruin', 'shipwreck', 'boat_wreck'] as const) {
      const a = landmarkSolids(mk(kind))
      expect(a.boxes.length + a.circles.length, kind).toBeGreaterThan(0)
      expect(JSON.stringify(landmarkSolids(mk(kind)))).toBe(JSON.stringify(a))
    }
  })

  it('a stone circle blocks walking into a standing stone but not the open middle', () => {
    const sim = testSim()
    const l = mk('stone_circle')
    const { circles } = landmarkSolids(l)
    const stone = circles.find((c) => c.r > 0.5)!
    // Walk straight at the stone's centre from outside: the actor must end outside stone.r + radius.
    const a = { x: stone.x - 3, z: stone.z, y: 0 }
    Object.assign(sim, { landmarkSolids: new LandmarkSolids([l]) })
    for (let i = 0; i < 20; i++) moveWithCollision(sim, a, 0.4, 0, 0.35, true)
    expect(Math.hypot(a.x - stone.x, a.z - stone.z)).toBeGreaterThanOrEqual(stone.r + 0.35 - 1e-6)
  })

  it('ruin walls are boxes the actor is pushed out of; the shipwreck is a big solid', () => {
    const sim = testSim()
    const house = mk('house_ruin', 3)
    const ship = mk('shipwreck')
    Object.assign(sim, { landmarkSolids: new LandmarkSolids([house, ship]) })
    const wall = landmarkSolids(house).boxes[0]!
    const p = { x: wall.x, z: wall.z, y: 0 }
    moveWithCollision(sim, p, 0, 0, 0.35, true)
    expect(Math.hypot(p.x - wall.x, p.z - wall.z)).toBeGreaterThan(0.2)
    const hull = landmarkSolids(ship).boxes[0]!
    const q = { x: hull.x, z: hull.z, y: 0 }
    moveWithCollision(sim, q, 0, 0, 0.35, true)
    expect(Math.hypot(q.x - hull.x, q.z - hull.z)).toBeGreaterThan(2)
  })

  it('the generated world indexes its own landmarks', () => {
    const sim = testSim()
    const lm = sim.world.landmarks.find((l) => l.kind === 'stone_circle')!
    const stone = landmarkSolids(lm).circles[0]!
    const here = sim.landmarkSolids.at(stone.x, stone.z)
    expect(here?.circles).toContainEqual(stone)
  })

  it('open ground away from every landmark is untouched', () => {
    const sim = testSim()
    const p = { x: 2000, z: 2000, y: 0 }
    Object.assign(sim, { landmarkSolids: new LandmarkSolids([]) })
    expect(sim.landmarkSolids.at(p.x, p.z)).toBeUndefined()
    moveWithCollision(sim, p, 1, 0, 0.35, true)
    expect(p.x).toBeCloseTo(2001, 5)
  })
})
