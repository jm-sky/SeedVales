/**
 * Vegetation & resource nodes: near ring uses Quaternius models (InstancedMesh per model/material),
 * far ring uses cheap procedural impostors (cone/blob trees). Rebuilt when the player's chunk
 * changes or nodes in visible chunks change (felled/harvested), so state edits persist visually.
 * @domain render
 * @subdomain vegetation
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import type { ResNode } from '../world/nodes'
import type { QualitySettings } from './quality'
import { perf } from '../diag/perf'
import { nodeAvailable } from '../sim/actions'
import { seasonOf } from '../sim/time'
import { isTree } from '../world/nodes'
import { CHUNK_M } from '../world/types'
import { loadGltf, mat4, mergeTemplate, part, type TemplatePart } from './assets'


/** Model per node kind + variant (heights normalised to node.scale for trees). */
const MODEL: Record<string, { models: string[]; baseH: number }> = {
  tree_broad: { models: ['CommonTree_1', 'CommonTree_3'], baseH: 8 },
  tree_apple: { models: ['CommonTree_3'], baseH: 9 },
  tree_pine: { models: ['Pine_1', 'Pine_3'], baseH: 7.1 },
  tree_dead: { models: ['DeadTree_1'], baseH: 9.2 },
  bush: { models: ['Fern_1'], baseH: 1.3 },
  bush_berry: { models: ['Bush_Common'], baseH: 1 },
  rock: { models: ['Rock_Medium_1', 'Rock_Medium_2'], baseH: 1 },
  stone: { models: ['Pebble_Round_1'], baseH: 1 },
  herb: { models: ['Flower_3_Group', 'Plant_1'], baseH: 1 },
  mushroom: { models: ['Mushroom_Common'], baseH: 1 },
  reed: { models: ['Grass_Common_Tall'], baseH: 1 },
}

function impostors(): Record<string, TemplatePart[]> {
  const broad = mergeTemplate([
    part(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 5).translate(0, 0.2, 0), 0x5a4028),
    part(new THREE.IcosahedronGeometry(0.33, 0).scale(1, 0.9, 1).translate(0, 0.6, 0), 0x4f7a32),
  ])
  const pine = mergeTemplate([
    part(new THREE.CylinderGeometry(0.02, 0.04, 0.3, 5).translate(0, 0.15, 0), 0x5a4028),
    part(new THREE.ConeGeometry(0.22, 0.8, 6).translate(0, 0.6, 0), 0x2f5a32),
  ])
  const dead = mergeTemplate([part(new THREE.CylinderGeometry(0.02, 0.05, 1, 5).translate(0, 0.5, 0), 0x6a5a48)])
  const rock = mergeTemplate([part(new THREE.DodecahedronGeometry(0.8, 0).translate(0, 0.3, 0), 0x86827a)])
  return { tree_broad: broad, tree_apple: broad, tree_pine: pine, tree_dead: dead, rock }
}

export class Vegetation {
  group = new THREE.Group()
  private near = new Map<string, TemplatePart[]>()
  private far: Record<string, TemplatePart[]> = impostors()
  private meshes: THREE.InstancedMesh[] = []
  private lastChunk = ''
  private dirty = true
  loaded = false
  instances = 0
  private sim: Sim
  private nearM: number
  private farM: number

  constructor(sim: Sim, q: QualitySettings) {
    this.sim = sim
    this.nearM = q.vegNear
    this.farM = q.vegFar
    // Procedural near fallback until assets are ready.
    for (const [k, v] of Object.entries(this.far)) this.near.set(`${k}#0`, v)
  }

  async load() {
    try {
      const g = await loadGltf('nature.glb')
      for (const [kind, def] of Object.entries(MODEL)) {
        def.models.forEach((name, i) => {
          const obj = g.scene.getObjectByName(name)
          if (obj) this.near.set(`${kind}#${i}`, mergeTemplate([{ obj, matrix: new THREE.Matrix4() }]))
        })
      }
      this.loaded = true
    } catch (e) {
      console.warn('nature.glb failed; procedural vegetation', e)
    }
    this.dirty = true
  }

  markDirty() {
    this.dirty = true
  }

  update(px: number, pz: number) {
    const ck = `${Math.floor(px / (CHUNK_M / 2))},${Math.floor(pz / (CHUNK_M / 2))}`
    if (ck === this.lastChunk && !this.dirty) return
    this.lastChunk = ck
    this.dirty = false
    perf.measure('render.vegetationRebuild', () => this.rebuild(px, pz))
  }

  private rebuild(px: number, pz: number) {
    for (const m of this.meshes) {
      this.group.remove(m)
      m.dispose()
    }
    this.meshes = []
    const sim = this.sim
    const winter = seasonOf(sim.state.time.cal) === 'winter'
    const nearSets = new Map<string, THREE.Matrix4[]>()
    const farSets = new Map<string, THREE.Matrix4[]>()
    const nodes: ResNode[] = []
    sim.nodes.query(px, pz, this.farM, nodes)
    let count = 0
    for (const n of nodes) {
      const tree = isTree(n.kind)
      const st = sim.state.nodes[n.id]
      if (tree && st?.kind === 'felled') {
        // Stump (+ sapling growing after felling).
        continue
      }
      if (!tree && n.kind !== 'reed' && n.kind !== 'bush' && !nodeAvailable(sim, n) && n.kind !== 'bush_berry' && n.kind !== 'herb') continue
      if (!tree && (n.kind === 'herb' || n.kind === 'mushroom') && st) continue
      const d = Math.hypot(n.x - px, n.z - pz)
      const def = MODEL[n.kind]!
      if (d < this.nearM || (!tree && n.kind !== 'rock' && d < this.nearM * 1.4)) {
        const vi = n.variant % def.models.length
        const key = this.near.has(`${n.kind}#${vi}`) ? `${n.kind}#${vi}` : `${n.kind}#0`
        const s = tree ? n.scale / def.baseH : n.scale
        if (winter && n.kind === 'herb') continue
        const arr = nearSets.get(key) ?? []
        arr.push(mat4(n.x, n.y - (tree ? 0.1 : 0.05), n.z, n.rot, s))
        nearSets.set(key, arr)
        count++
      } else if (tree || n.kind === 'rock') {
        const arr = farSets.get(n.kind) ?? []
        const s = tree ? n.scale : n.scale
        arr.push(mat4(n.x, n.y - 0.2, n.z, n.rot, s))
        farSets.set(n.kind, arr)
        count++
      }
    }
    // Stumps for felled trees (near only).
    const stumps: THREE.Matrix4[] = []
    for (const n of nodes) {
      if (isTree(n.kind) && sim.state.nodes[n.id]?.kind === 'felled' && Math.hypot(n.x - px, n.z - pz) < this.nearM * 1.5) stumps.push(mat4(n.x, n.y, n.z, n.rot))
    }
    if (stumps.length) farSets.set('stump', stumps)
    const add = (parts: TemplatePart[] | undefined, mats: THREE.Matrix4[], shadows: boolean) => {
      if (!parts) return
      for (const p of parts) {
        const im = new THREE.InstancedMesh(p.geometry, p.material, mats.length)
        mats.forEach((m, i) => im.setMatrixAt(i, m))
        im.instanceMatrix.needsUpdate = true
        im.computeBoundingSphere()
        im.castShadow = shadows
        this.group.add(im)
        this.meshes.push(im)
      }
    }
    for (const [k, mats] of nearSets) add(this.near.get(k), mats, true)
    if (!this.far.stump) this.far.stump = mergeTemplate([part(new THREE.CylinderGeometry(0.3, 0.38, 0.5, 7).translate(0, 0.25, 0), 0x6a4a2e)])
    for (const [k, mats] of farSets) add(this.far[k], mats, false)
    this.instances = count
    perf.gauge('render.vegetationInstances', count)
    perf.gauge('render.vegetationDrawCalls', this.meshes.length)
  }
}
