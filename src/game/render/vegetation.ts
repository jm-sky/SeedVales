/**
 * Vegetation & resource nodes: near ring uses Quaternius models (InstancedMesh per model/material),
 * far ring uses cheap procedural impostors (cone/blob trees). Rebuilt when the player's chunk
 * changes or nodes in visible chunks change (felled/harvested), so state edits persist visually.
 * @domain render
 * @subdomain vegetation
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import type { QualitySettings } from './quality'
import { perf } from '../diag/perf'
import { rockPieces } from '../sim/actions'
import { seasonOf } from '../sim/time'
import { isTree } from '../world/nodes'
import { CHUNK_M } from '../world/types'
import { loadGltf, mergeTemplate, part, type TemplatePart } from './assets'

/** Per-frame budget of a vegetation rebuild job (ms); terrain chunk builds have their own 5 ms. */
const VEG_BUDGET_MS = 2.5

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
  meshes: THREE.InstancedMesh[] = []
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

  setQuality(q: QualitySettings) {
    this.nearM = q.vegNear
    this.farM = q.vegFar
    this.markDirty()
  }

  markDirty() {
    this.dirty = true
  }

  /** True while a time-sliced rebuild is in progress (the previous instances stay visible meanwhile). */
  get rebuilding() {
    return this.job !== null
  }

  /**
   * Rebuilds when the player's half-chunk changes or nodes changed. The first build is synchronous; later
   * ones run as a job spread over frames within `budgetMs` and commit at once (render--002 step 1, review
   * 009 F-01). Idle frames prefetch one missing node chunk around the view ring.
   */
  update(px: number, pz: number, budgetMs = VEG_BUDGET_MS) {
    const ck = `${Math.floor(px / (CHUNK_M / 2))},${Math.floor(pz / (CHUNK_M / 2))}`
    if (ck !== this.lastChunk || this.dirty) {
      this.lastChunk = ck
      this.dirty = false
      this.job = this.rebuildJob(px, pz)
      this.prefetchDone = ''
    }
    if (this.job) {
      const first = this.meshes.length === 0
      const job = this.job
      perf.measure('render.vegetationRebuild', () => {
        const t0 = performance.now()
        // At least one step per frame; the first build (empty world) runs to completion.
        do {
          if (job.next().done) {
            this.job = null
            break
          }
        } while (first || performance.now() - t0 < budgetMs)
      })
      return
    }
    this.prefetch(px, pz, ck)
  }

  /** Generates at most one missing node chunk per frame in the ring just beyond `vegFar`. */
  private prefetch(px: number, pz: number, ck: string) {
    if (this.prefetchDone === ck) return
    const r = this.farM + CHUNK_M
    const nodes = this.sim.nodes
    for (let cz = Math.floor((pz - r) / CHUNK_M); cz <= Math.floor((pz + r) / CHUNK_M); cz++) {
      for (let cx = Math.floor((px - r) / CHUNK_M); cx <= Math.floor((px + r) / CHUNK_M); cx++) {
        if (nodes.has(cx, cz)) continue
        perf.measure('render.vegetationPrefetch', () => nodes.getChunk(cx, cz))
        return
      }
    }
    this.prefetchDone = ck
  }

  /** Pooled InstancedMesh per (set key, template part); grown only when capacity is exceeded. */
  private pool = new Map<string, THREE.InstancedMesh[]>()
  private scratch = { m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }
  private job: Generator<void, void> | null = null
  private prefetchDone = ''

  /** Rebuild as small steps: gather per node chunk, compose matrices in slices, then commit at once. */
  private *rebuildJob(px: number, pz: number): Generator<void, void> {
    const sim = this.sim
    const winter = seasonOf(sim.state.time.cal) === 'winter'
    // Compact instance data: [x, y, z, rot, scale]*.
    const sets = new Map<string, number[]>()
    const push = (key: string, x: number, y: number, z: number, rot: number, sc: number) => {
      let a = sets.get(key)
      if (!a) sets.set(key, (a = []))
      a.push(x, y, z, rot, sc)
    }
    const treeNear = this.nearM * 0.6
    const r = this.farM
    const r2 = r * r
    let count = 0
    for (let cz = Math.floor((pz - r) / CHUNK_M); cz <= Math.floor((pz + r) / CHUNK_M); cz++) {
      for (let cx = Math.floor((px - r) / CHUNK_M); cx <= Math.floor((px + r) / CHUNK_M); cx++) {
        for (const n of sim.nodes.getChunk(cx, cz)) {
          if ((n.x - px) ** 2 + (n.z - pz) ** 2 > r2) continue
          const tree = isTree(n.kind)
          const st = sim.state.nodes[n.id]
          const d = Math.hypot(n.x - px, n.z - pz)
          if (tree && st?.kind === 'felled') {
            if (d < this.nearM * 1.5) push('far:stump', n.x, n.y, n.z, n.rot, 1)
            continue
          }
          if (!tree && (n.kind === 'herb' || n.kind === 'mushroom' || n.kind === 'stone') && st) continue
          if (n.kind === 'rock' && st?.kind === 'depleted') continue
          if (winter && n.kind === 'herb') continue
          const def = MODEL[n.kind]!
          // A mined rock shrinks with the pieces taken (RES-07).
          const sc = n.kind === 'rock' && st?.kind === 'harvested' ? n.scale * (0.45 + 0.55 * (st.left ?? 0) / rockPieces(n)) : n.scale
          const nearR = tree ? treeNear : n.kind === 'rock' ? this.nearM : this.nearM * 1.4
          if (d < nearR) {
            const vi = n.variant % def.models.length
            const key = this.near.has(`${n.kind}#${vi}`) ? `${n.kind}#${vi}` : `${n.kind}#0`
            push(`near:${key}`, n.x, n.y - (tree ? 0.1 : 0.05), n.z, n.rot, tree ? n.scale / def.baseH : sc)
            count++
          } else if (tree || n.kind === 'rock') {
            push(`far:${n.kind}`, n.x, n.y - 0.2, n.z, n.rot, sc)
            count++
          }
        }
        yield
      }
    }
    if (!this.far.stump) this.far.stump = mergeTemplate([part(new THREE.CylinderGeometry(0.3, 0.38, 0.5, 7).translate(0, 0.25, 0), 0x6a4a2e)])
    // Compose matrices into staging buffers (the visible meshes are untouched until the commit).
    const { m, p, q, s: sc, up } = this.scratch
    const staged = new Map<string, Float32Array>()
    for (const [key, data] of sets) {
      const n = data.length / 5
      const buf = new Float32Array(n * 16)
      for (let i = 0; i < n; i++) {
        const o = i * 5
        p.set(data[o]!, data[o + 1]!, data[o + 2]!)
        q.setFromAxisAngle(up, data[o + 3]!)
        sc.setScalar(data[o + 4]!)
        m.compose(p, q, sc)
        m.toArray(buf, i * 16)
        if ((i & 255) === 255) yield
      }
      staged.set(key, buf)
      yield
    }
    this.commit(staged, count)
  }

  /** Swaps the staged instance matrices into the pooled meshes in one go. */
  private commit(staged: Map<string, Float32Array>, count: number) {
    const used = new Set<string>()
    let drawCalls = 0
    for (const [key, buf] of staged) {
      const [kind, id] = key.split(':') as [string, string]
      const parts = kind === 'near' ? this.near.get(id) : this.far[id]
      if (!parts) continue
      const n = buf.length / 16
      let meshes = this.pool.get(key)
      if (!meshes || meshes[0]!.instanceMatrix.count < n) {
        for (const old of meshes ?? []) {
          this.group.remove(old)
          old.dispose()
        }
        const cap = Math.ceil(n * 1.3) + 8
        meshes = parts.map((pt) => {
          const im = new THREE.InstancedMesh(pt.geometry, pt.material, cap)
          im.castShadow = kind === 'near'
          im.frustumCulled = false
          this.group.add(im)
          return im
        })
        this.pool.set(key, meshes)
      }
      for (const im of meshes) {
        ;(im.instanceMatrix.array as Float32Array).set(buf)
        im.count = n
        im.visible = n > 0
        im.instanceMatrix.needsUpdate = true
        drawCalls++
      }
      used.add(key)
    }
    for (const [key, meshes] of this.pool) {
      if (!used.has(key)) for (const im of meshes) im.visible = false
    }
    this.meshes = [...this.pool.values()].flat()
    this.instances = count
    perf.gauge('render.vegetationInstances', count)
    perf.gauge('render.vegetationDrawCalls', drawCalls)
  }
}
