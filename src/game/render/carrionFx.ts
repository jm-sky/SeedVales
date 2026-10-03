/**
 * Carrion effect (render--010): green motes drifting up and a few dark flies circling every rotting carcass near
 * the player. A handful of CPU-animated points (≤ MAX_CARCASSES × POINTS_EACH), none on `low` (the haze overlay
 * stays), none beyond RANGE_M. Cheap enough for the frame loop; no allocations after construction.
 * @domain render
 * @subdomain effects
 */
import * as THREE from 'three'
import type { QualityProfile } from './quality'

export const CARRION_MAX_CARCASSES = 6
const MOTES = 8
const FLIES = 3
const POINTS_EACH = MOTES + FLIES
export const CARRION_RANGE_M: Record<QualityProfile, number> = { low: 0, medium: 45, high: 70 }

export interface CarrionSpot {
  x: number
  y: number
  z: number
  id: number
}

export class CarrionFx {
  group = new THREE.Group()
  private motes: THREE.Points
  private flies: THREE.Points
  private moteGeo = new THREE.BufferGeometry()
  private flyGeo = new THREE.BufferGeometry()
  /** Points drawn this frame (for tests/diagnostics). */
  active = 0

  constructor() {
    this.moteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CARRION_MAX_CARCASSES * MOTES * 3), 3))
    this.flyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CARRION_MAX_CARCASSES * FLIES * 3), 3))
    this.motes = new THREE.Points(this.moteGeo, new THREE.PointsMaterial({ color: 0x7ccf4a, size: 0.16, transparent: true, opacity: 0.75, depthWrite: false, sizeAttenuation: true }))
    this.flies = new THREE.Points(this.flyGeo, new THREE.PointsMaterial({ color: 0x14110e, size: 0.07, sizeAttenuation: true }))
    for (const p of [this.motes, this.flies]) {
      p.frustumCulled = false
      p.visible = false
      this.group.add(p)
    }
  }

  /** `spots` = carrion carcasses (any distance); the nearest ones within range are animated. */
  update(t: number, spots: readonly CarrionSpot[], playerX: number, playerZ: number, profile: QualityProfile) {
    const range = CARRION_RANGE_M[profile]
    const near = range > 0 ? spots.filter((s) => Math.hypot(s.x - playerX, s.z - playerZ) <= range).sort((a, b) => Math.hypot(a.x - playerX, a.z - playerZ) - Math.hypot(b.x - playerX, b.z - playerZ)).slice(0, CARRION_MAX_CARCASSES) : []
    this.active = near.length * POINTS_EACH
    this.motes.visible = this.flies.visible = near.length > 0
    if (!near.length) return
    const mp = this.moteGeo.getAttribute('position') as THREE.BufferAttribute
    const fp = this.flyGeo.getAttribute('position') as THREE.BufferAttribute
    near.forEach((s, ci) => {
      for (let i = 0; i < MOTES; i++) {
        const seed = s.id * 7.13 + i * 1.91
        const age = (t * 0.35 + (i / MOTES)) % 1
        const a = seed + age * 2.2
        mp.setXYZ(ci * MOTES + i, s.x + Math.cos(a) * (0.25 + age * 0.35), s.y + 0.3 + age * 1.5, s.z + Math.sin(a * 1.3) * (0.25 + age * 0.35))
      }
      for (let i = 0; i < FLIES; i++) {
        const a = t * (2.4 + i * 0.7) + s.id + i * 2.1
        fp.setXYZ(ci * FLIES + i, s.x + Math.cos(a) * (0.5 + 0.2 * i), s.y + 0.55 + Math.sin(a * 2.3) * 0.2 + i * 0.15, s.z + Math.sin(a * 1.1) * (0.5 + 0.2 * i))
      }
    })
    mp.needsUpdate = true
    fp.needsUpdate = true
    this.moteGeo.setDrawRange(0, near.length * MOTES)
    this.flyGeo.setDrawRange(0, near.length * FLIES)
  }
}
