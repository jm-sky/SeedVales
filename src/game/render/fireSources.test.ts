/** RENDER-03 (render--001 step 1a): fire emitters, light pool per profile, flicker. */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { Building } from '../sim/types'
import { newStack } from '../sim/inventory'
import { testSim } from '../sim/testWorld'
import { Dynamics } from './dynamics'
import { collectFires, type FireEmitter, flicker, LIGHT_POOL, PLANTED_TORCH_H, selectLights } from './fireSources'

function fireAt(sim: ReturnType<typeof testSim>, id: string, dx: number, fuel: number, hearth = false): Building {
  const p = sim.player
  const b: Building = { id, kind: 'campfire', x: p.x + dx, z: p.z + 6, rot: 0, hw: 1, hd: 1, settlementId: -1, durability: 100, owner: 'player', lit: true, fuel, hearth }
  sim.state.buildings.push(b)
  sim.rebuildBuildingIndex()
  return b
}

describe('render: fire sources (RENDER-03)', () => {
  it('pool per profile; the player torch keeps a slot; a dying fire gets a weaker light than a full one', () => {
    expect(LIGHT_POOL).toEqual({ low: 1, medium: 3, high: 4 })
    const sim = testSim()
    const p = sim.player
    fireAt(sim, 'f-full', 3, 40)
    fireAt(sim, 'f-dying', -3, 0.3)
    p.eq.off = { id: 'torch', qty: 1 }
    const fires: FireEmitter[] = []
    const n = collectFires(sim, p.x, p.z, 50, fires)
    const full = fires.slice(0, n).find((e) => e.key === 'b:f-full')!
    const dying = fires.slice(0, n).find((e) => e.key === 'b:f-dying')!
    expect(dying.level).toBeLessThan(full.level)
    // Low (1 light): the player's torch wins even though the campfires are closer to the camera.
    const one = selectLights(fires, n, 1, full.x, full.z)
    expect(fires[one[0]!]!.player).toBe(true)
    // Dynamics: pool size per profile, lights only added/removed on setQuality.
    const d = new Dynamics(sim, 'low')
    expect(d.lightPool).toBe(1)
    d.setQuality('high')
    expect(d.lightPool).toBe(4)
    d.update(0.016, new THREE.Vector3(p.x, p.y + 3, p.z))
    const lights = (d as unknown as { lights: THREE.PointLight[] }).lights
    const at = (b: FireEmitter) => lights.find((l) => Math.abs(l.position.x - b.x) < 0.1 && Math.abs(l.position.z - b.z) < 0.1)!
    expect(at(dying).intensity).toBeLessThan(at(full).intensity)
  })

  it('planted torch flame at its tip, hearth kind, phases differ, flicker bounded', () => {
    const sim = testSim()
    const p = sim.player
    fireAt(sim, 'h1', 4, 40, true)
    sim.addGround({ id: sim.nextId(), x: p.x + 2, z: p.z, stack: newStack('torch'), droppedAt: 0, lit: true, planted: true })
    const fires: FireEmitter[] = []
    const n = collectFires(sim, p.x, p.z, 50, fires)
    const planted = fires.slice(0, n).find((e) => e.kind === 'planted')!
    expect(planted.y).toBeCloseTo(sim.terrain.heightAt(planted.x, planted.z) + PLANTED_TORCH_H, 3)
    const hearth = fires.slice(0, n).find((e) => e.key === 'b:h1')!
    expect(hearth.kind).toBe('hearth')
    expect(hearth.phase).not.toBeCloseTo(planted.phase, 3)
    for (let t = 0; t < 20; t += 0.013) {
      const f = flicker(t, 1.7)
      expect(f).toBeGreaterThanOrEqual(0.85)
      expect(f).toBeLessThanOrEqual(1.15)
    }
  })

  it('PERF-01: emitters come from spatial queries, never a full building/ground scan', () => {
    const sim = testSim()
    const p = sim.player
    fireAt(sim, 'f1', 3, 40)
    const boom = () => {
      throw new Error('full scan')
    }
    for (const list of [sim.state.buildings, sim.state.ground]) {
      Object.defineProperty(list, Symbol.iterator, { value: boom })
      Object.defineProperty(list, 'forEach', { value: boom })
      Object.defineProperty(list, 'filter', { value: boom })
    }
    const fires: FireEmitter[] = []
    expect(collectFires(sim, p.x, p.z, 50, fires)).toBeGreaterThanOrEqual(1)
  })
})
