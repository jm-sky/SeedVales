/**
 * WEATHER-01: precipitation counts follow weather × profile, shelter test is a footprint test, and the per-frame
 * update touches no per-particle data.
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { isSheltered, PRECIP_CAP, precipCount, Precipitation } from './precipitation'

describe('render: precipitation (WEATHER-01)', () => {
  it('counts: none when dry, scaled by intensity and profile, capped', () => {
    expect(precipCount({ kind: 'clear', intensity: 1 }, 'high')).toBe(0)
    expect(precipCount({ kind: 'overcast', intensity: 1 }, 'high')).toBe(0)
    expect(precipCount({ kind: 'rain', intensity: 1 }, 'low')).toBe(PRECIP_CAP.low)
    expect(precipCount({ kind: 'rain', intensity: 0.5 }, 'medium')).toBeLessThan(precipCount({ kind: 'rain', intensity: 1 }, 'medium'))
    expect(precipCount({ kind: 'storm', intensity: 1 }, 'high')).toBe(PRECIP_CAP.high)
    expect(precipCount({ kind: 'snow', intensity: 0.8 }, 'high')).toBeLessThanOrEqual(PRECIP_CAP.high)
  })

  it('shelter: inside a rotated roofed footprint only', () => {
    const house = { kind: 'house' as const, x: 100, z: 100, rot: Math.PI / 2, hw: 5, hd: 2 }
    expect(isSheltered(100, 100, [house])).toBe(true)
    // Rotated 90°: the long axis lies along world Z.
    expect(isSheltered(100, 103.5, [house])).toBe(true)
    expect(isSheltered(103.5, 100, [house])).toBe(false)
    expect(isSheltered(100, 100, [{ ...house, kind: 'well' as const }])).toBe(false)
  })

  it('update: sets instance count and shelter smoothing without touching the seed buffer', () => {
    const p = new Precipitation()
    const seed = p.mesh.geometry.getAttribute('aSeed') as THREE.InstancedBufferAttribute
    const before = seed.version
    const cam = new THREE.Vector3(0, 3, 0)
    p.update(0.016, { kind: 'rain', intensity: 1 }, 'medium', cam, { x: 0, y: 0, z: 0 }, false)
    expect(p.mesh.count).toBe(PRECIP_CAP.medium)
    p.update(0.016, { kind: 'clear', intensity: 0 }, 'medium', cam, { x: 0, y: 0, z: 0 }, false)
    expect(p.mesh.count).toBe(0)
    expect(p.mesh.visible).toBe(false)
    expect(seed.version).toBe(before)
  })
})
