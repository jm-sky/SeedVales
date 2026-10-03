/**
 * Third-person camera: orbit (yaw/pitch) around the player with zoom and terrain collision.
 * @domain render
 * @subdomain camera
 */
import * as THREE from 'three'
import type { CaveGrid } from '../world/caveShape'
import type { Terrain } from '../world/terrain'
import { angleDiff } from '../core/math'

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

  /** Weak yaw assist toward `desired` (shortest way, at most `maxRate` rad/s); pitch is never touched. */
  assistYaw(desired: number, dt: number, maxRate: number) {
    this.yaw += Math.max(-maxRate * dt, Math.min(maxRate * dt, angleDiff(this.yaw, desired)))
  }

  zoom(delta: number) {
    this.distance = Math.min(this.maxDist, Math.max(this.minDist, this.distance * (1 + delta)))
  }

  /** Forward direction on ground plane (where W moves). */
  forward(): [number, number] {
    return [Math.sin(this.yaw), Math.cos(this.yaw)]
  }

  /** True when the camera point is inside rock: below the terrain, or (in a cave) outside the open volume. */
  private blocked(grid: CaveGrid | null, p: THREE.Vector3): boolean {
    if (grid && grid.flagAt(p.x, p.z) !== 0) return p.y < grid.floorAt(p.x, p.z) + 0.25 || p.y > grid.ceilAt(p.x, p.z) - 0.25
    return p.y < this.terrain.heightAt(p.x, p.z) + 0.3
  }

  /** `cave` = index + 1 of the cave the player is in (0 = surface): the camera then collides with the cave instead of the terrain. */
  update(px: number, py: number, pz: number, dt: number, cave = 0) {
    const tgt = new THREE.Vector3(px, py + 1.6, pz)
    this.target.lerp(tgt, Math.min(1, dt * 12))
    if (this.target.distanceTo(tgt) > 8) this.target.copy(tgt)
    // Camera sits behind the player (opposite of forward).
    const cp = Math.cos(this.pitch)
    let d = this.distance
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp)
    // Terrain collision: shorten if the ray hits the ground.
    const grid = cave > 0 ? this.terrain.caves.grid(cave - 1) : null
    for (let s = 0.5; s <= d; s += 0.5) {
      const p = this.target.clone().addScaledVector(dir, s)
      if (this.blocked(grid, p)) {
        d = Math.max(this.minDist * 0.6, s - 0.5)
        break
      }
    }
    const pos = this.target.clone().addScaledVector(dir, d)
    if (grid && grid.flagAt(pos.x, pos.z) !== 0) {
      pos.y = Math.min(grid.ceilAt(pos.x, pos.z) - 0.3, Math.max(grid.floorAt(pos.x, pos.z) + 0.4, pos.y))
    } else {
      const ground = this.terrain.heightAt(pos.x, pos.z) + 0.4
      if (pos.y < ground) pos.y = ground
    }
    this.camera.position.copy(pos)
    this.camera.lookAt(this.target)
  }
}
