/** TRACE-01 (render side, render--001 step 8): decals follow the traces in range; blood and ash look different. */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { testSim } from '../sim/testWorld'
import { DECAL_RANGE, decalTexture, TraceDecals } from './decals'

describe('render: trace decals (TRACE-01)', () => {
  it('decal counts follow traces in range (spatial query), faded traces vanish', () => {
    const sim = testSim()
    const p = sim.player
    sim.addTrace({ id: sim.nextId(), x: p.x + 2, z: p.z, intensity: 0.8, at: 0 })
    sim.addTrace({ id: sim.nextId(), x: p.x - 3, z: p.z + 1, intensity: 0.5, at: 0 })
    sim.addTrace({ id: sim.nextId(), x: p.x, z: p.z + 4, kind: 'ash', intensity: 1, at: 0 })
    sim.addTrace({ id: sim.nextId(), x: p.x + DECAL_RANGE + 30, z: p.z, intensity: 1, at: 0 }) // out of range
    const faded = { id: sim.nextId(), x: p.x + 1, z: p.z + 1, intensity: 0.01, at: 0 }
    sim.addTrace(faded)
    const d = new TraceDecals(sim)
    d.update(0, p.x, p.z, true)
    expect(d.counts).toEqual({ blood: 2, ash: 1 })
  })

  it('blood and ash textures differ in tint', () => {
    const avg = (t: THREE.DataTexture) => {
      const a = t.image.data as Uint8Array
      let r = 0
      let g = 0
      let n = 0
      for (let i = 0; i < a.length; i += 4) if (a[i + 3]! > 128) { r += a[i]!; g += a[i + 1]!; n++ }
      return { r: r / n, g: g / n }
    }
    const blood = avg(decalTexture('blood'))
    const ash = avg(decalTexture('ash'))
    expect(blood.r - blood.g).toBeGreaterThan(40) // red
    expect(Math.abs(ash.r - ash.g)).toBeLessThan(15) // grey
  })
})
