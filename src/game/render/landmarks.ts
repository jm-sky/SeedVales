/**
 * Landmarks (WORLD-11): stone circles, house/estate ruins, shipwrecks, boat wrecks from `landmarks.glb`
 * (procedural boxes if it fails to load). A landmark's pieces are merged into one geometry per material
 * when the player comes within range and released again when they leave (≤ a few draw calls each).
 * @domain render
 * @subdomain landmarks
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import type { GenLandmark } from '../world/types'
import { perf } from '../diag/perf'
import { layout } from '../world/landmarkLayout'
import { LANDMARK_NODES } from './assetNames'
import { loadGltf, mergeTemplate, packNode, part } from './assets'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

type Item = { obj: THREE.Object3D; matrix: THREE.Matrix4 }

/** Landmarks within this distance of the player are built; beyond SHOW + HYSTERESIS they are dropped. */
export const LANDMARK_SHOW_M = 420
const HYSTERESIS_M = 60
const BUILD_PER_FRAME = 1

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0)

/** Procedural stand-ins with the same footprint as the glTF pieces (used when the GLB is missing). */
function fallbackNodes(): Record<string, THREE.Object3D> {
  const stone = 0x8a8680
  const wood = 0x5a4028
  const mk = (geo: THREE.BufferGeometry, color: number) => part(geo, color).obj
  const out: Record<string, THREE.Object3D> = {}
  for (const n of LANDMARK_NODES.walls) out[n] = mk(box(3, n.endsWith('Half') ? 1.5 : 2.6, 0.4), stone)
  out[LANDMARK_NODES.arch] = mk(box(3.6, 3.2, 0.4), stone)
  for (const n of LANDMARK_NODES.columns) out[n] = mk(new THREE.CylinderGeometry(0.35, 0.4, n.endsWith('Short') ? 1.4 : 3, 7).translate(0, n.endsWith('Short') ? 0.7 : 1.5, 0), stone)
  out[LANDMARK_NODES.floor] = mk(box(3, 0.15, 3), 0x77736b)
  out[LANDMARK_NODES.bricks] = mk(box(2.4, 0.6, 1.8), stone)
  LANDMARK_NODES.stones.forEach((n, i) => (out[n] = mk(new THREE.DodecahedronGeometry(0.9, 0).scale(1, 1.4 + i * 0.35, 1).translate(0, 1 + i * 0.3, 0), 0x6d6a66)))
  out[LANDMARK_NODES.ship] = mk(box(5, 3, 14), wood)
  out[LANDMARK_NODES.boat] = mk(box(1.8, 0.7, 4), wood)
  return out
}

interface Built {
  group: THREE.Group
  meshes: THREE.Mesh[]
}

export class Landmarks {
  group = new THREE.Group()
  private gltf: GLTF | null = null
  private fallback = fallbackNodes()
  private built = new Map<string, Built>()
  private sim: Sim
  loaded = false

  constructor(sim: Sim) {
    this.sim = sim
  }

  async load() {
    try {
      this.gltf = await loadGltf('landmarks.glb')
      this.loaded = true
    } catch (e) {
      console.warn('Landmark assets failed, using procedural fallback', e)
    }
  }

  private node(name: string): THREE.Object3D {
    return (this.gltf && packNode(this.gltf, name)) || this.fallback[name]!
  }

  private build(l: GenLandmark): Built {
    const terrain = this.sim.terrain
    const items: Item[] = []
    const c = Math.cos(l.rot)
    const s = Math.sin(l.rot)
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    for (const slot of layout(l)) {
      const wx = l.x + slot.x * c + slot.z * s
      const wz = l.z - slot.x * s + slot.z * c
      const y = terrain.heightAt(wx, wz) - (slot.sink ?? 0)
      e.set(slot.pitch ?? 0, l.rot + slot.ry, slot.roll ?? 0, 'YXZ')
      q.setFromEuler(e)
      const k = slot.s ?? 1
      items.push({ obj: this.node(slot.name), matrix: new THREE.Matrix4().compose(new THREE.Vector3(wx, y, wz), q, new THREE.Vector3(k, k, k)) })
    }
    const group = new THREE.Group()
    const meshes: THREE.Mesh[] = []
    for (const p of mergeTemplate(items)) {
      const m = new THREE.Mesh(p.geometry, p.material)
      m.castShadow = true
      m.receiveShadow = true
      group.add(m)
      meshes.push(m)
    }
    this.group.add(group)
    return { group, meshes }
  }

  update(px: number, pz: number) {
    let budget = BUILD_PER_FRAME
    for (const l of this.sim.world.landmarks) {
      const d = Math.hypot(l.x - px, l.z - pz)
      const b = this.built.get(l.id)
      if (b && d > LANDMARK_SHOW_M + HYSTERESIS_M) {
        this.group.remove(b.group)
        for (const m of b.meshes) m.geometry.dispose()
        this.built.delete(l.id)
      } else if (!b && d < LANDMARK_SHOW_M && budget > 0) {
        budget--
        const t0 = performance.now()
        this.built.set(l.id, this.build(l))
        perf.record('render.landmarkBuild', performance.now() - t0)
      }
    }
    perf.gauge('render.landmarksBuilt', this.built.size)
  }

  /** Releases built geometry (called with the renderer). */
  dispose() {
    for (const b of this.built.values()) for (const m of b.meshes) m.geometry.dispose()
    this.built.clear()
    this.group.clear()
  }
}
