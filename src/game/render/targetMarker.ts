/**
 * Highlight of the current interaction target (UI-06): a flat pulsing ring on the ground.
 * @domain render
 */
import * as THREE from 'three'
import type { Terrain } from '../world/terrain'

export class TargetMarker {
  mesh: THREE.Mesh
  private t = 0
  private terrain: Terrain

  constructor(terrain: Terrain) {
    this.terrain = terrain
    const geo = new THREE.RingGeometry(0.55, 0.7, 32)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.7, depthWrite: false })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.renderOrder = 2
    this.mesh.visible = false
  }

  update(dt: number, at: { x: number; z: number } | null) {
    this.mesh.visible = !!at
    if (!at) return
    this.t += dt
    const s = 1 + Math.sin(this.t * 4) * 0.08
    this.mesh.scale.set(s, 1, s)
    this.mesh.position.set(at.x, this.terrain.heightAt(at.x, at.z) + 0.06, at.z)
  }
}
