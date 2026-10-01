/**
 * Shadow stabilisation (render--002 step 2, RENDER-04): the shadow camera centre is snapped to whole
 * shadow-map texels in light space, so walking does not make shadow edges shimmer.
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { snapShadowCenter } from './shadowSnap'

const basis = (dir: THREE.Vector3) => {
  const right = new THREE.Vector3(0, 1, 0).cross(dir).normalize()
  const up = dir.clone().cross(right)
  return { right, up }
}

describe('render: shadow texel snapping (RENDER-04)', () => {
  const dir = new THREE.Vector3(0.6, 0.7, 0.3).normalize()
  const texel = 90 / 1024

  it('RENDER-04: the snapped centre lies on the light-space texel grid and moves less than one texel', () => {
    const { right, up } = basis(dir)
    for (const c of [new THREE.Vector3(12.34, 5.6, -78.9), new THREE.Vector3(1000.05, 40.2, 2333.3)]) {
      const s = snapShadowCenter(c, dir, texel, new THREE.Vector3())
      const r = s.dot(right) / texel
      const u = s.dot(up) / texel
      expect(Math.abs(r - Math.round(r))).toBeLessThan(1e-6 * Math.max(1, Math.abs(r)) + 1e-6)
      expect(Math.abs(u - Math.round(u))).toBeLessThan(1e-6 * Math.max(1, Math.abs(u)) + 1e-6)
      // Only the light-plane components change: the depth along the light stays the same.
      expect(s.dot(dir)).toBeCloseTo(c.dot(dir), 6)
      expect(s.distanceTo(c)).toBeLessThan(texel * Math.SQRT2)
    }
  })

  it('RENDER-04: a sub-texel step of the player keeps the shadow camera still', () => {
    const { right } = basis(dir)
    const c = snapShadowCenter(new THREE.Vector3(50, 3, 50), dir, texel, new THREE.Vector3())
    const a = snapShadowCenter(c.clone().addScaledVector(right, texel * 0.2), dir, texel, new THREE.Vector3())
    expect(a.distanceTo(c)).toBeLessThan(1e-6)
  })
})
