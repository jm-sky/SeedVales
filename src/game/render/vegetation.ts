/**
 * Vegetation & resource nodes: near ring uses Quaternius models (InstancedMesh per model/material). Trees
 * beyond the profile's `treeModel` ring are impostors baked from the same models (`treeImpostors.ts`, one
 * draw call), cross-faded by dither; procedural cone/blob impostors remain only until the atlas is baked and
 * for rocks. Rebuilt after the player moved REBUILD_M or nodes changed (felled/harvested).
 
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
import { NATURE_MODEL } from './assetNames'
import { loadGltf, mergeTemplate, part, type TemplatePart } from './assets'
import { bakeImpostors, createImpostorMesh, type ImpostorAtlas, TREE_FADE_M, type TreeBand, treeDepthMaterial, treeFadeUniforms, type TreeWind, withTreeFade, withTreeFadeOut } from './treeImpostors'
import { ASSET_TREE_WIND, loadTreeAssets, TREE_VARIANTS, type TreeAssets } from './treeModels'

/** Per-frame budget of a vegetation rebuild job (ms); terrain chunk builds have their own 5 ms. */
const VEG_BUDGET_MS = 2.5
/** Rebuild after moving this far (m); the model/impostor sets overlap by this margin, the shader fades exactly. */
const REBUILD_M = 12
const TREE_KINDS = ['tree_broad', 'tree_apple', 'tree_pine', 'tree_dead']
/** Width of the dithered LOD0 → LOD1 band (m). */
const LOD_FADE_M = 6


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
  private treeM: number
  private lod0M: number
  /** Model ring of the one-LOD kit trees (fallback when trees.glb is missing): ≈ vegNear × 0.6 = 27 / 48 / 72 m. */
  private kitM: number
  private cell: number
  private assets: TreeAssets | null = null
  private atlas: ImpostorAtlas | null = null
  private imp: { mesh: THREE.InstancedMesh; imp: THREE.InstancedBufferAttribute } | null = null
  private lastX = Number.NaN
  private lastZ = Number.NaN

  constructor(sim: Sim, q: QualitySettings) {
    this.sim = sim
    this.nearM = q.vegNear
    this.farM = q.vegFar
    this.treeM = q.treeModel
    this.lod0M = q.treeLod0
    this.kitM = q.vegNear * 0.6
    this.cell = q.impostorCell
    // Procedural near fallback until assets are ready.
    for (const [k, v] of Object.entries(this.far)) this.near.set(`${k}#0`, v)
  }

  async load(opts: { treeAssets?: boolean } = {}) {
    try {
      const g = await loadGltf('nature.glb')
      for (const [kind, def] of Object.entries(NATURE_MODEL)) {
        def.models.forEach((name, i) => {
          const obj = g.scene.getObjectByName(name)
          if (obj) this.near.set(`${kind}#${i}`, mergeTemplate([{ obj, matrix: new THREE.Matrix4() }]))
        })
      }
      this.loaded = true
    } catch (e) {
      console.warn('nature.glb failed; procedural vegetation', e)
    }
    if (opts.treeAssets !== false) try {
      this.useTreeAssets(await loadTreeAssets())
    } catch (e) {
      console.warn('trees.glb / impostor atlas failed; kit trees with a runtime-baked atlas', e)
    }
    this.dirty = true
  }

  /** Offline LOD0/LOD1 trees + their atlas (contract render-tree-assets-contract.md); replaces the kit trees. */
  useTreeAssets(a: TreeAssets) {
    this.assets = a
    this.atlas = a.atlas
    const cache = new Map<string, THREE.Material>()
    for (const [key, parts] of a.templates) {
      const band = key.endsWith('#0') ? 'lod0' : 'lod1'
      this.near.set(`tree:${key}`, parts.map((p) => {
        const ck = `${p.material.uuid}:${band}`
        let m = cache.get(ck)
        if (!m) cache.set(ck, (m = withTreeFade(p.material, band, ASSET_TREE_WIND, true)))
        return { geometry: p.geometry, material: m }
      }))
    }
  }

  /** Whether the offline LOD0/LOD1 tree assets are in use (tests, diagnostics). */
  get treeAssetsActive() {
    return this.assets !== null
  }

  setQuality(q: QualitySettings) {
    this.nearM = q.vegNear
    this.farM = q.vegFar
    this.treeM = q.treeModel
    this.lod0M = q.treeLod0
    this.kitM = q.vegNear * 0.6
    this.cell = q.impostorCell
    this.markDirty()
  }

  /** Whether trees beyond the model ring are baked impostors (tests, diagnostics). */
  get impostorsActive() {
    return this.atlas !== null
  }

  private depthMats = new Map<THREE.Material, THREE.MeshDepthMaterial>()
  private depthFor(m: THREE.Material, wind?: TreeWind, band?: TreeBand): THREE.MeshDepthMaterial {
    let d = this.depthMats.get(m)
    if (!d) this.depthMats.set(m, (d = treeDepthMaterial(m, wind, band)))
    return d
  }

  /** Impostor instances of the last commit (tests, diagnostics). */
  impostorInstances = 0

  /** Keys of the instance sets currently visible, e.g. `near:tree_pine#0`, `far:rock` (tests). */
  visibleSets(): string[] {
    return [...this.pool].filter(([, ms]) => ms.some((m) => m.visible)).map(([k]) => k)
  }

  /**
   * Bakes the tree impostor atlas from the loaded models (needs the GL renderer; once after `load`) and
   * switches the tree models to the dithered fade-out materials.
   */
  bakeImpostors(renderer: THREE.WebGLRenderer) {
    if (!this.loaded || this.atlas) return
    const trees = new Map<string, TemplatePart[]>()
    for (const [key, parts] of this.near) if (TREE_KINDS.includes(key.split('#')[0]!)) trees.set(key, parts)
    perf.measure('render.impostorBake', () => (this.atlas = bakeImpostors(renderer, trees, this.cell)))
    const fade = new Map<THREE.Material, THREE.Material>()
    for (const [key, parts] of trees) {
      this.near.set(key, parts.map((p) => {
        let m = fade.get(p.material)
        if (!m) fade.set(p.material, (m = withTreeFadeOut(p.material)))
        return { geometry: p.geometry, material: m }
      }))
    }
    // Pooled meshes still hold the old materials.
    for (const [key, meshes] of this.pool) if (key.startsWith('near:tree_')) for (const im of meshes) { this.group.remove(im); im.dispose() }
    for (const key of [...this.pool.keys()]) if (key.startsWith('near:tree_')) this.pool.delete(key)
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
    treeFadeUniforms.uTreeCenter.value.set(px, pz)
    const ring = this.assets ? this.treeM : this.kitM
    treeFadeUniforms.uTreeRing.value.set(ring - TREE_FADE_M, ring)
    treeFadeUniforms.uTreeLod.value.set(this.lod0M - LOD_FADE_M, this.lod0M)
    const ck = `${Math.floor(px / (CHUNK_M / 2))},${Math.floor(pz / (CHUNK_M / 2))}`
    if (ck !== this.lastChunk || this.dirty || !(Math.hypot(px - this.lastX, pz - this.lastZ) < REBUILD_M)) {
      this.lastChunk = ck
      this.lastX = px
      this.lastZ = pz
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
    const atlas = this.atlas
    const assets = this.assets
    const M = REBUILD_M + 2
    // Kit trees: one model up to kitM (with an atlas: dithered into impostors; without: procedural cones beyond).
    const treeNear = atlas ? this.kitM + M : this.nearM * 0.6
    const impFrom = (assets ? this.treeM : this.kitM) - TREE_FADE_M - M
    const imps: number[] = [] // [x, y, z, rot, scale, row]*
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
          if (tree && assets) {
            // Offline trees: LOD0 → LOD1 → impostor bands, overlapping by the rebuild margin (the shader fades exactly).
            const vars = TREE_VARIANTS[n.kind]!
            const v = vars[n.variant % vars.length]!
            const s = n.scale / assets.maxY.get(v)!
            if (d < this.lod0M + M) push(`near:tree:${v}#0`, n.x, n.y, n.z, n.rot, s)
            if (d > this.lod0M - LOD_FADE_M - M && d < this.treeM + M) push(`near:tree:${v}#1`, n.x, n.y, n.z, n.rot, s)
            if (d > impFrom) imps.push(n.x, n.y, n.z, n.rot, s, assets.atlas.rows.get(v)!)
            count++
            continue
          }
          if (!tree && (n.kind === 'herb' || n.kind === 'mushroom' || n.kind === 'stone') && st) continue
          if (n.kind === 'rock' && st?.kind === 'depleted') continue
          if (winter && n.kind === 'herb') continue
          const def = NATURE_MODEL[n.kind]!
          // A mined rock shrinks with the pieces taken (RES-07).
          const sc = n.kind === 'rock' && st?.kind === 'harvested' ? n.scale * (0.45 + 0.55 * (st.left ?? 0) / rockPieces(n)) : n.scale
          const nearR = tree ? treeNear : n.kind === 'rock' ? this.nearM : this.nearM * 1.4
          const vi = n.variant % def.models.length
          const key = this.near.has(`${n.kind}#${vi}`) ? `${n.kind}#${vi}` : `${n.kind}#0`
          const row = tree && atlas ? atlas.rows.get(key) : undefined
          if (row !== undefined && d > impFrom) {
            imps.push(n.x, n.y - 0.1, n.z, n.rot, n.scale / def.baseH, row)
            count++
          }
          if (d < nearR) {
            push(`near:${key}`, n.x, n.y - (tree ? 0.1 : 0.05), n.z, n.rot, tree ? n.scale / def.baseH : sc)
            count++
          } else if (row === undefined && (tree || n.kind === 'rock')) {
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
    const impBuf = new Float32Array((imps.length / 6) * 16)
    const impRows = new Float32Array((imps.length / 6) * 2)
    q.identity()
    for (let i = 0; i < imps.length / 6; i++) {
      const o = i * 6
      p.set(imps[o]!, imps[o + 1]!, imps[o + 2]!)
      sc.setScalar(imps[o + 4]!)
      m.compose(p, q, sc).toArray(impBuf, i * 16)
      impRows[i * 2] = imps[o + 5]!
      impRows[i * 2 + 1] = imps[o + 3]!
      if ((i & 1023) === 1023) yield
    }
    this.commit(staged, count)
    this.commitImpostors(impBuf, impRows)
  }

  /** Swaps the impostor instances in (grows the single impostor mesh when needed). */
  private commitImpostors(buf: Float32Array, rows: Float32Array) {
    if (!this.atlas) return
    const n = buf.length / 16
    if (!this.imp || this.imp.mesh.instanceMatrix.count < n) {
      if (this.imp) { this.group.remove(this.imp.mesh); this.imp.mesh.dispose() }
      this.imp = createImpostorMesh(this.atlas, Math.ceil(n * 1.3) + 64)
      this.group.add(this.imp.mesh)
    }
    const { mesh, imp } = this.imp
    ;(mesh.instanceMatrix.array as Float32Array).set(buf)
    ;(imp.array as Float32Array).set(rows)
    mesh.count = n
    mesh.visible = n > 0
    mesh.instanceMatrix.needsUpdate = true
    imp.needsUpdate = true
    this.impostorInstances = n
    perf.gauge('render.impostorInstances', n)
  }

  /** Swaps the staged instance matrices into the pooled meshes in one go. */
  private commit(staged: Map<string, Float32Array>, count: number) {
    const used = new Set<string>()
    let drawCalls = 0
    for (const [key, buf] of staged) {
      const cut = key.indexOf(':')
      const kind = key.slice(0, cut)
      const id = key.slice(cut + 1)
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
          im.castShadow = kind === 'near' && !(id.startsWith('tree:') && id.endsWith('#1'))
          if (this.atlas && id.startsWith('tree_')) im.customDepthMaterial = this.depthFor(pt.material)
          if (id.startsWith('tree:')) im.customDepthMaterial = this.depthFor(pt.material, ASSET_TREE_WIND, id.endsWith('#0') ? 'lod0' : 'lod1')
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
