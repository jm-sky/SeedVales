/**
 * Placement ghost of the building panel (review 016 #10): a footprint box + ring drawn without depth test at exactly the
 * spot where "Mark site" will place the site, so the player's body or terrain never hides it.
 * @domain render
 */
import * as THREE from 'three'
import type { Terrain } from '../world/terrain'

export interface GhostSpot {
  x: number
  z: number
  rot: number
  hw: number
  hd: number
  /** Whether the site can be placed here (green) or not (red). */
  ok: boolean
}

const OK = 0x7bd88f
const BAD = 0xe0645c

export class BuildGhost {
  group = new THREE.Group()
  private box: THREE.Mesh
  private edges: THREE.LineSegments
  private mat: THREE.MeshBasicMaterial
  private lineMat: THREE.LineBasicMaterial
  private t = 0
  private terrain: Terrain

  constructor(terrain: Terrain) {
    this.terrain = terrain
    this.mat = new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0.28, depthTest: false, depthWrite: false })
    this.lineMat = new THREE.LineBasicMaterial({ color: OK, transparent: true, opacity: 0.95, depthTest: false })
    const geo = new THREE.BoxGeometry(2, 1, 2)
    geo.translate(0, 0.5, 0)
    this.box = new THREE.Mesh(geo, this.mat)
    this.edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.lineMat)
    this.box.renderOrder = 10
    this.edges.renderOrder = 11
    this.group.add(this.box, this.edges)
    this.group.visible = false
  }

  update(dt: number, spot: GhostSpot | null) {
    this.group.visible = !!spot
    if (!spot) return
    this.t += dt
    const color = spot.ok ? OK : BAD
    this.mat.color.setHex(color)
    this.lineMat.color.setHex(color)
    const pulse = 0.22 + Math.sin(this.t * 4) * 0.06
    this.mat.opacity = pulse
    this.group.position.set(spot.x, this.terrain.heightAt(spot.x, spot.z) + 0.03, spot.z)
    this.group.rotation.y = spot.rot
    this.group.scale.set(Math.max(0.4, spot.hw), 0.5, Math.max(0.4, spot.hd))
  }
}
