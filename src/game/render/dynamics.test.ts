/**
 * Render-side scaling (review 009 F-03, PERF-01): dynamic visuals use spatial queries, so the per-frame
 * cost does not grow with dropped items and corpses elsewhere in the world.
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { newStack } from '../sim/inventory'
import { testSim } from '../sim/testWorld'
import { Dynamics } from './dynamics'

describe('render: dynamics (PERF-01)', () => {
  it('PERF-01: per-frame update never scans the whole ground/corpse lists', () => {
    const sim = testSim()
    const p = sim.player
    for (let i = 0; i < 2000; i++) sim.addGround({ id: sim.nextId(), x: 100 + (i % 50), z: 100 + Math.floor(i / 50), stack: newStack('stone'), droppedAt: 0 })
    sim.addGround({ id: sim.nextId(), x: p.x + 2, z: p.z, stack: newStack('stone'), droppedAt: 0 })
    sim.addGround({ id: sim.nextId(), x: p.x + 3, z: p.z, stack: newStack('torch'), droppedAt: 0, lit: true })
    const d = new Dynamics(sim)
    const boom = () => {
      throw new Error('full scan')
    }
    for (const list of [sim.state.ground, sim.state.corpses]) {
      Object.defineProperty(list, Symbol.iterator, { value: boom })
      Object.defineProperty(list, 'forEach', { value: boom })
      Object.defineProperty(list, 'filter', { value: boom })
    }
    expect(() => d.update(0.016, new THREE.Vector3(p.x, p.y + 3, p.z))).not.toThrow()
    // Nearby items are still drawn and the dropped torch still burns.
    expect((d as unknown as { items: THREE.InstancedMesh }).items.count).toBe(2)
    // Near fires are particle flames now (render--001 step 1b); the cone is only drawn beyond the particle range.
    expect((d as unknown as { particles: { counts: { flames: number } } }).particles.counts.flames).toBeGreaterThanOrEqual(1)
  })
})
