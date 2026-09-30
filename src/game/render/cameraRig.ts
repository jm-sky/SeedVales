/**
 * Third-person camera: orbit (yaw/pitch) around the player with zoom and terrain collision.
 * @domain render
 * @subdomain camera
 */
import * as THREE from 'three'
import type { Terrain } from '../world/terrain'

export class CameraRig {
  camera: THREE.PerspectiveCamera
  yaw = Math.PI
  pitch = 0.32
  distance = 6
  minDist = 1.8
  maxDist = 16
  private target = new THREE.Vector3()
  private terrain: Terrain

  constructor(terrain: Terrain, aspect: number) {
    this.terrain = terrain
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.2, 2200)
  }

  rotate(dx: number, dy: number) {
    this.yaw -= dx
    this.pitch = Math.min(1.35, Math.max(-0.35, this.pitch + dy))
  }

  zoom(delta: number) {
    this.distance = Math.min(this.maxDist, Math.max(this.minDist, this.distance * (1 + delta)))
  }

  /** Forward direction on ground plane (where W moves). */
  forward(): [number, number] {
    return [Math.sin(this.yaw), Math.cos(this.yaw)]
  }

  update(px: number, py: number, pz: number, dt: number) {
    const tgt = new THREE.Vector3(px, py + 1.6, pz)
    this.target.lerp(tgt, Math.min(1, dt * 12))
    if (this.target.distanceTo(tgt) > 8) this.target.copy(tgt)
    // Camera sits behind the player (opposite of forward).
    const cp = Math.cos(this.pitch)
    let d = this.distance
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp)
    // Terrain collision: shorten if the ray hits the ground.
    for (let s = 0.5; s <= d; s += 0.5) {
      const p = this.target.clone().addScaledVector(dir, s)
      if (p.y < this.terrain.heightAt(p.x, p.z) + 0.3) {
        d = Math.max(this.minDist * 0.6, s - 0.5)
        break
      }
    }
    const pos = this.target.clone().addScaledVector(dir, d)
    const ground = this.terrain.heightAt(pos.x, pos.z) + 0.4
    if (pos.y < ground) pos.y = ground
    this.camera.position.copy(pos)
    this.camera.lookAt(this.target)
  }
}
