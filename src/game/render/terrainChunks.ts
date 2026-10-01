/**
 * Terrain chunk meshes with distance LOD (2/4/8/16 m), skirts against LOD cracks, vertex colours
 * by biome with grass colour patches and road tint. Inland water meshes per chunk; ocean plane.
 * Rebuilds chunks on terrain edits. Build cost is budgeted per frame (streaming).
 * @domain render
 * @subdomain terrain
 */
import * as THREE from 'three'
import type { Terrain } from '../world/terrain'
import type { QualitySettings } from './quality'
import type { VisualFlags } from './visualFlags'
import { Noise2D } from '../core/noise'
import { perf } from '../diag/perf'
import { idx } from '../world/grid'
import { Biome, CHUNK_M, SEA_LEVEL } from '../world/types'
import { createTerrainMaterial, type TerrainShading } from './terrainMaterial'

const STEPS = [2, 4, 8, 16] as const
/** Normals come from a central difference of this step (m), independent of the LOD. */
const NORMAL_STEP = 2

const C = (hex: number) => new THREE.Color(hex)
const BIOME_COL: Record<number, THREE.Color> = {
  [Biome.Ocean]: C(0x8a7f5c),
  [Biome.Beach]: C(0xd8c68e),
  [Biome.Meadow]: C(0x6f9b3c),
  [Biome.Steppe]: C(0x9da252),
  [Biome.Swamp]: C(0x4f5a2c),
  [Biome.ForestDeciduous]: C(0x547a2e),
  [Biome.ForestMixed]: C(0x4c6e2c),
  [Biome.ForestConifer]: C(0x3f5a2a),
  [Biome.Mountain]: C(0x7d7a73),
  [Biome.Snow]: C(0xeef2f5),
  [Biome.Water]: C(0x6b5f45),
}
const ROCK = C(0x77736b)
const ROAD = C(0x8c7453)
const DRY = C(0xb3a55a)
const DARK = C(0x3d5e25)
const SNOWC = C(0xf0f4f8)

interface ChunkEntry {
  key: string
  cx: number
  cz: number
  lod: number
  mesh: THREE.Mesh
  water?: THREE.Mesh
  version: number
}

export class TerrainChunks {
  group = new THREE.Group()
  private chunks = new Map<string, ChunkEntry>()
  private mat: THREE.MeshLambertMaterial
  /** Shader path (render--002 step 3): season/snow as uniforms, smooth normals, ground detail. Null = legacy baked path. */
  private shading: TerrainShading | null = null
  private smooth = false
  private wantDetail = false
  private hasDetail = false
  waterMat: THREE.MeshLambertMaterial
  ocean: THREE.Mesh
  private patch: Noise2D
  private dirty = new Set<string>()
  /** Season tint 0 = summer green, 1 = autumn/winter faded (snow handled separately). */
  seasonTint = 0
  snowCover = 0
  private builtTint = -1
  private terrain: Terrain
  private lods: { maxDist: number; step: number }[]
  private viewDist: number
  private lastX = -1e9
  private lastZ = -1e9
  private pending = 1

  constructor(terrain: Terrain, q: QualitySettings, flags?: Pick<VisualFlags, 'detail' | 'smooth' | 'tintUniforms'>) {
    this.terrain = terrain
    this.lods = q.lods.map((d, i) => ({ maxDist: d, step: STEPS[i]! }))
    this.viewDist = q.viewDist
    if (flags && (flags.tintUniforms || flags.smooth || flags.detail)) {
      // Detail texture only where there is headroom (medium/high: the profiles with shadows, D-PERF-2).
      this.smooth = flags.smooth
      this.wantDetail = flags.detail
      this.hasDetail = flags.detail && q.shadows
      const m = createTerrainMaterial({ smooth: flags.smooth, detail: this.hasDetail })
      this.mat = m.material
      this.shading = m.shading
    } else {
      this.mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
    }
    this.waterMat = new THREE.MeshLambertMaterial({ color: 0x3f7392, transparent: true, opacity: 0.78, depthWrite: false })
    this.patch = new Noise2D(terrain.world.seed ^ 0x77aa)
    const og = new THREE.PlaneGeometry(6000, 6000, 1, 1)
    og.rotateX(-Math.PI / 2)
    this.ocean = new THREE.Mesh(og, this.waterMat)
    this.ocean.position.y = SEA_LEVEL
    this.ocean.renderOrder = 1
    this.group.add(this.ocean)
  }

  /** Quality change at runtime: new LOD rings/view distance; chunks rebuild as the update loop revisits them. */
  setQuality(q: QualitySettings) {
    this.lods = q.lods.map((d, i) => ({ maxDist: d, step: STEPS[i]! }))
    this.viewDist = q.viewDist
    this.lastX = -1e9 // re-evaluate the wanted chunks on the next update
    // The detail texture follows the profile (medium/high only): swap the material in place, geometry stays.
    if (this.shading && this.hasDetail !== (this.wantDetail && q.shadows)) {
      this.hasDetail = !this.hasDetail
      const m = createTerrainMaterial({ smooth: this.smooth, detail: this.hasDetail })
      m.shading.season.value = this.shading.season.value
      m.shading.snow.value = this.shading.snow.value
      this.mat.dispose()
      this.mat = m.material
      this.shading = m.shading
      this.chunks.forEach((c) => (c.mesh.material = this.mat))
    }
  }

  /** Whether the ground detail texture is active (tests, diagnostics). */
  get detailActive() {
    return this.hasDetail
  }

  markDirty(key: string) {
    this.dirty.add(key)
    const [cx, cz] = key.split(',').map(Number) as [number, number]
    this.dirty.add(`S${Math.floor(cx / 2)},${Math.floor(cz / 2)}`)
  }

  get chunkCount() {
    return this.chunks.size
  }

  triangles(): number {
    let t = 0
    this.chunks.forEach((c) => (t += (c.mesh.geometry.index?.count ?? 0) / 3))
    return t
  }

  update(px: number, pz: number, budgetMs = 6) {
    this.ocean.position.x = px
    this.ocean.position.z = pz
    if (this.shading) {
      this.shading.season.value = this.seasonTint
      this.shading.snow.value = this.snowCover
    }
    const tintChanged = !this.shading && Math.abs(this.builtTint - (this.seasonTint + this.snowCover * 2)) > 0.15
    if (tintChanged) {
      this.builtTint = this.seasonTint + this.snowCover * 2
      this.chunks.forEach((c) => this.dirty.add(c.key))
    }
    // Steady state: nothing dirty or pending and the player barely moved → the wanted set cannot have
    // changed; skip rebuilding it (no per-frame Map/sort allocation, review 009 F-04).
    if (!this.dirty.size && this.pending === 0 && Math.hypot(px - this.lastX, pz - this.lastZ) < 4) {
      perf.gauge('chunks.pending', 0)
      return
    }
    this.lastX = px
    this.lastZ = pz
    // Far rings use 2×2 "superchunks" (256 m) → ~4× fewer draw calls where detail is low.
    const SC = CHUNK_M * 2
    const psx = Math.floor(px / SC)
    const psz = Math.floor(pz / SC)
    const R = Math.ceil(this.viewDist / SC) + 1
    const want = new Map<string, { cx: number; cz: number; lod: number; d: number; span: number }>()
    const size = this.terrain.world.size
    const lodFor = (d: number) => {
      for (let i = 0; i < this.lods.length; i++) if (d <= this.lods[i]!.maxDist) return i
      return this.lods.length - 1
    }
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const sx = psx + dx
        const sz = psz + dz
        if (sx < 0 || sz < 0 || sx * SC >= size || sz * SC >= size) continue
        const ds = Math.max(0, Math.hypot((sx + 0.5) * SC - px, (sz + 0.5) * SC - pz) - SC * 0.71)
        if (ds > this.viewDist) continue
        if (ds > this.lods[1]!.maxDist) {
          want.set(`S${sx},${sz}`, { cx: sx * 2, cz: sz * 2, lod: Math.max(2, lodFor(ds)), d: ds, span: 2 })
          continue
        }
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const cx = sx * 2 + i
            const cz = sz * 2 + j
            const d = Math.max(0, Math.hypot((cx + 0.5) * CHUNK_M - px, (cz + 0.5) * CHUNK_M - pz) - CHUNK_M * 0.7)
            if (d > this.viewDist) continue
            want.set(`${cx},${cz}`, { cx, cz, lod: lodFor(d), d, span: 1 })
          }
        }
      }
    }
    // Remove chunks out of range.
    for (const [k, c] of this.chunks) {
      if (!want.has(k)) {
        this.disposeChunk(c)
        this.chunks.delete(k)
      }
    }
    // Build nearest first within budget.
    const todo = [...want.entries()]
      .filter(([k, w]) => {
        const c = this.chunks.get(k)
        return !c || c.lod !== w.lod || this.dirty.has(k) || (w.span === 1 && c.version !== (this.terrain.edits.versions.get(k) ?? 0))
      })
      .sort((a, b) => a[1].d - b[1].d)
    const t0 = performance.now()
    let built = 0
    for (const [k, w] of todo) {
      if (built > 0 && performance.now() - t0 > budgetMs) break
      const old = this.chunks.get(k)
      if (old) this.disposeChunk(old)
      const entry = perf.measure('chunks.build', () => this.build(w.cx, w.cz, w.lod, w.span))
      entry.key = k
      this.chunks.set(k, entry)
      this.dirty.delete(k)
      built++
    }
    this.pending = Math.max(0, todo.length - built)
    perf.gauge('chunks.active', this.chunks.size)
    perf.gauge('chunks.pending', this.pending)
  }

  /** Releases every chunk geometry (game stop). */
  dispose() {
    this.chunks.forEach((c) => this.disposeChunk(c))
    this.chunks.clear()
    this.ocean.geometry.dispose()
    this.mat.dispose()
    this.waterMat.dispose()
  }

  private disposeChunk(c: ChunkEntry) {
    this.group.remove(c.mesh)
    c.mesh.geometry.dispose()
    if (c.water) {
      this.group.remove(c.water)
      c.water.geometry.dispose()
    }
  }

  /**
   * Ground colour. With the shader path the season/snow lerps are skipped and `tint` gets the masks instead:
   * x = share of the faded-grass tint that survives the later rock/road/beach blends, y = flat enough for snow.
   */
  private colorAt(x: number, z: number, h: number, slope: number, out: THREE.Color, tint?: { x: number; y: number }) {
    const t = this.terrain
    const b = t.biomeAt(x, z)
    out.copy(BIOME_COL[b] ?? BIOME_COL[Biome.Meadow]!)
    if (b === Biome.Meadow || b === Biome.Steppe || b >= Biome.ForestDeciduous && b <= Biome.ForestConifer) {
      const n = this.patch.fbm(x / 60, z / 60, 3)
      if (n > 0.25) out.lerp(DRY, Math.min(1, (n - 0.25) * 2.5) * 0.6)
      else if (n < -0.25) out.lerp(DARK, Math.min(1, (-n - 0.25) * 2.5) * 0.6)
      if (tint) tint.x = 1
      else if (this.seasonTint > 0) out.lerp(DRY, this.seasonTint * 0.45)
    }
    if (slope > 0.75 && b !== Biome.Snow) {
      const w = Math.min(1, (slope - 0.75) * 2)
      out.lerp(ROCK, w)
      if (tint) tint.x *= 1 - w
    }
    const road = t.roadAt(x, z)
    if (road > 0.15) {
      const w = Math.min(1, road * 1.3)
      out.lerp(ROAD, w)
      if (tint) tint.x *= 1 - w
    }
    if (h < 1.2 && b !== Biome.Water && b !== Biome.Ocean) {
      out.lerp(BIOME_COL[Biome.Beach]!, 0.5)
      if (tint) tint.x *= 0.5
    }
    if (tint) tint.y = slope < 0.9 ? 1 : 0
    else if (this.snowCover > 0 && slope < 0.9) out.lerp(SNOWC, this.snowCover * 0.85)
    const v = (this.patch.get(x * 0.7, z * 0.7) * 0.04)
    out.offsetHSL(0, 0, v)
  }

  private build(cx: number, cz: number, lod: number, span = 1): ChunkEntry {
    const t = this.terrain
    const step = this.lods[lod]!.step
    const n = (CHUNK_M * span) / step + 1
    const x0 = cx * CHUNK_M
    const z0 = cz * CHUNK_M
    const vCount = n * n + 4 * n // + skirts
    const pos = new Float32Array(vCount * 3)
    const col = new Float32Array(vCount * 3)
    const tintA = this.shading ? new Float32Array(vCount * 2) : null
    const nrm = this.smooth ? new Float32Array(vCount * 3) : null
    const tm = { x: 0, y: 0 }
    const heights = new Float32Array(n * n)
    const c = new THREE.Color()
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = x0 + i * step
        const z = z0 + j * step
        heights[j * n + i] = t.heightAt(x, z)
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i
        const x = x0 + i * step
        const z = z0 + j * step
        const h = heights[k]!
        pos[k * 3] = x
        pos[k * 3 + 1] = h
        pos[k * 3 + 2] = z
        const hx = heights[j * n + Math.min(n - 1, i + 1)]! - heights[j * n + Math.max(0, i - 1)]!
        const hz = heights[Math.min(n - 1, j + 1) * n + i]! - heights[Math.max(0, j - 1) * n + i]!
        const slope = Math.hypot(hx, hz) / (2 * step)
        if (tintA) {
          tm.x = 0
          tm.y = 0
        }
        this.colorAt(x, z, h, slope, c, tintA ? tm : undefined)
        if (tintA) {
          tintA[k * 2] = tm.x
          tintA[k * 2 + 1] = tm.y
        }
        if (nrm) {
          // Analytic normal from a fixed 2 m central difference: the same at every LOD, so chunk borders match.
          const g = NORMAL_STEP
          const dhx = (i > 0 && i < n - 1 && step === g ? hx : t.heightAt(x + g, z) - t.heightAt(x - g, z)) / (2 * g)
          const dhz = (j > 0 && j < n - 1 && step === g ? hz : t.heightAt(x, z + g) - t.heightAt(x, z - g)) / (2 * g)
          const il = 1 / Math.hypot(dhx, 1, dhz)
          nrm[k * 3] = -dhx * il
          nrm[k * 3 + 1] = il
          nrm[k * 3 + 2] = -dhz * il
        }
        col[k * 3] = c.r
        col[k * 3 + 1] = c.g
        col[k * 3 + 2] = c.b
      }
    }
    const indices: number[] = []
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i
        const b = a + 1
        const d = a + n
        const e = d + 1
        if ((i + j) % 2 === 0) indices.push(a, d, b, b, d, e)
        else indices.push(a, d, e, a, e, b)
      }
    }
    // Skirts: duplicate edge vertices 4 m lower.
    let sv = n * n
    const edges: number[][] = [
      Array.from({ length: n }, (_, i) => i),
      Array.from({ length: n }, (_, i) => (n - 1) * n + i),
      Array.from({ length: n }, (_, j) => j * n),
      Array.from({ length: n }, (_, j) => j * n + n - 1),
    ]
    for (const edge of edges) {
      const start = sv
      for (const k of edge) {
        pos[sv * 3] = pos[k * 3]!
        pos[sv * 3 + 1] = pos[k * 3 + 1]! - 4
        pos[sv * 3 + 2] = pos[k * 3 + 2]!
        col[sv * 3] = col[k * 3]!
        col[sv * 3 + 1] = col[k * 3 + 1]!
        col[sv * 3 + 2] = col[k * 3 + 2]!
        if (tintA) {
          tintA[sv * 2] = tintA[k * 2]!
          tintA[sv * 2 + 1] = tintA[k * 2 + 1]!
        }
        if (nrm) {
          nrm[sv * 3] = nrm[k * 3]!
          nrm[sv * 3 + 1] = nrm[k * 3 + 1]!
          nrm[sv * 3 + 2] = nrm[k * 3 + 2]!
        }
        sv++
      }
      for (let q = 0; q < n - 1; q++) {
        const a = edge[q]!
        const b = edge[q + 1]!
        const a2 = start + q
        const b2 = start + q + 1
        indices.push(a, a2, b, b, a2, b2, a, b, a2, b, b2, a2)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    if (tintA) g.setAttribute('aTint', new THREE.BufferAttribute(tintA, 2))
    g.setIndex(indices)
    if (nrm) g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
    else g.computeVertexNormals()
    g.computeBoundingSphere()
    const mesh = new THREE.Mesh(g, this.mat)
    mesh.receiveShadow = lod === 0
    mesh.matrixAutoUpdate = false
    this.group.add(mesh)
    const entry: ChunkEntry = { key: `${cx},${cz}`, cx, cz, lod, mesh, version: this.terrain.edits.versions.get(`${cx},${cz}`) ?? 0 }
    const water = this.buildWater(cx, cz, span)
    if (water) {
      this.group.add(water)
      entry.water = water
    }
    return entry
  }

  /** Inland water surface (rivers/lakes) at world-grid resolution. */
  private buildWater(cx: number, cz: number, span = 1): THREE.Mesh | null {
    const w = this.terrain.world
    const cell = w.cell
    const i0 = Math.floor((cx * CHUNK_M) / cell)
    const j0 = Math.floor((cz * CHUNK_M) / cell)
    const cells = (CHUNK_M * span) / cell
    const pos: number[] = []
    const surf = (i: number, j: number) => {
      if (i < 0 || j < 0 || i >= w.n || j >= w.n) return -Infinity
      return w.water[idx(i, j)]!
    }
    for (let j = j0; j < j0 + cells; j++) {
      for (let i = i0; i < i0 + cells; i++) {
        const s = [surf(i, j), surf(i + 1, j), surf(i, j + 1), surf(i + 1, j + 1)]
        const finite = s.filter((v) => v > -Infinity)
        if (!finite.length) continue
        // Extend from neighbours so banks are covered; terrain occludes where higher.
        const fill = Math.max(...finite)
        const h = s.map((v) => (v > -Infinity ? v : fill))
        const x0 = i * cell
        const z0 = j * cell
        pos.push(x0, h[0]!, z0, x0, h[2]!, z0 + cell, x0 + cell, h[1]!, z0)
        pos.push(x0 + cell, h[1]!, z0, x0, h[2]!, z0 + cell, x0 + cell, h[3]!, z0 + cell)
      }
    }
    if (!pos.length) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    const m = new THREE.Mesh(g, this.waterMat)
    m.renderOrder = 1
    m.matrixAutoUpdate = false
    return m
  }
}
