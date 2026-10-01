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
import { hash01, hashString } from '../core/rng'
import { perf } from '../diag/perf'
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

interface Slot {
  name: string
  x: number
  z: number
  ry: number
  s?: number
  /** Metres sunk into the ground. */
  sink?: number
  pitch?: number
  roll?: number
}

const pick = <T>(a: readonly T[], h: number): T => a[Math.floor(h * a.length) % a.length]!

/** Piece placement (landmark-local metres, +Z forward) per kind; deterministic from the landmark id. */
export function layout(l: GenLandmark): Slot[] {
  const seed = hashString(l.id)
  const h = (...v: number[]) => hash01(seed, ...v)
  const out: Slot[] = []
  const N = LANDMARK_NODES
  switch (l.kind) {
    case 'boat_wreck':
      out.push({ name: N.boat, x: 0, z: 0, ry: 0, sink: 0.3, pitch: 0.06, roll: 0.18 })
      break
    case 'estate_ruin':
    case 'house_ruin': {
      const estate = l.kind === 'estate_ruin'
      const nx = estate ? 6 : 3
      const nz = estate ? 4 : 2
      const W = nx * 3
      const D = nz * 3
      const wall = (x: number, z: number, ry: number, i: number) => {
        if (h(i, 11) < (estate ? 0.12 : 0.22)) {
          if (h(i, 12) < 0.6) out.push({ name: N.bricks, x, z, ry: h(i, 13) * 6, sink: 0.05 })
          return
        }
        out.push({ name: pick(N.walls, h(i, 14)), x, z, ry, sink: 0.12 })
      }
      let k = 0
      for (let i = 0; i < nx; i++) {
        const x = -W / 2 + 1.5 + i * 3
        // The estate keeps one arched gateway on the front.
        if (estate && i === Math.floor(nx / 2)) out.push({ name: N.arch, x, z: D / 2, ry: 0, sink: 0.1 })
        else wall(x, D / 2, 0, k++)
        wall(x, -D / 2, Math.PI, k++)
      }
      for (let i = 0; i < nz; i++) {
        const z = -D / 2 + 1.5 + i * 3
        wall(W / 2, z, Math.PI / 2, k++)
        wall(-W / 2, z, -Math.PI / 2, k++)
      }
      if (estate) {
        // Inner dividing wall and corner columns.
        for (let i = 0; i < 3; i++) wall(-W / 2 + 4.5 + i * 3, 0, 0, k++)
        for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) out.push({ name: pick(N.columns, h(k++, 15)), x: (cx * W) / 2, z: (cz * D) / 2, ry: 0, sink: 0.1 })
      }
      // Floor slabs inside, some missing.
      for (let i = 0; i < nx - 1; i++) {
        for (let j = 0; j < nz - 1; j++) {
          if (h(i, j, 16) < 0.55) out.push({ name: N.floor, x: -W / 2 + 3 + i * 3, z: -D / 2 + 3 + j * 3, ry: 0, sink: 0.05 })
        }
      }
      out.push({ name: N.bricks, x: W / 2 - 1.5, z: D / 2 - 1.5, ry: h(17) * 6 })
      break
    }
    case 'shipwreck':
      // Half sunk in the sand, bow up and listing.
      out.push({ name: N.ship, x: 0, z: 0, ry: 0, sink: 1.8, pitch: -0.14, roll: 0.22 })
      break
    case 'stone_circle': {
      const n = 8 + (seed % 3)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + h(i, 1) * 0.12
        const r = l.radius * (0.85 + h(i, 2) * 0.2)
        // One in five has fallen over.
        const fallen = h(i, 3) < 0.2
        out.push({ name: pick(N.stones, h(i, 4)), x: Math.cos(a) * r, z: Math.sin(a) * r, ry: -a + Math.PI / 2 + (h(i, 5) - 0.5) * 0.4, s: 0.9 + h(i, 6) * 0.35, sink: 0.15, roll: fallen ? 1.1 : (h(i, 7) - 0.5) * 0.16 })
      }
      out.push({ name: N.stones[2], x: 0, z: 0, ry: h(9, 9) * 6, s: 1.1, sink: 0.3 })
      break
    }
  }
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
