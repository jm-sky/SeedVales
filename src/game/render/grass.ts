/**
 * Grass (render--007 step 2, RENDER-06): two instanced rings around the player. LOD0 = curved 3-segment
 * blade clumps (12 triangles), LOD1 = crossed alpha-tested quads with a generated blade texture. Placement
 * comes from data masks per 16 m tile (`grassPlacement.ts`), tiles are cached and generated within a
 * per-frame budget; the rings fade by shader (scale, no popping line), sway with the shared wind, follow
 * the season (dry tint, sparser) and vanish under snow. No per-blade CPU work per frame.
 * @domain render
 * @subdomain grass
 */
import * as THREE from 'three'
import type { Sim } from '../sim/sim'
import { perf } from '../diag/perf'
import { CHUNK_M } from '../world/types'
import { FADE_FAR, FADE_NEAR, type Footprint, GRASS_RINGS, maxInstances, TILE_M, tileInstances } from './grassPlacement'
import { type QualityProfile } from './quality'
import { applyWind } from './wind'

const GRASS_BUDGET_MS = 2.5
const BLADE_H = 0.4
const DRY = new THREE.Color(0xb8a45a)

/** Curved blade clump: 4 blades × 3 triangles, base → tip colour gradient, normals up (lit like the ground). */
export function bladeClumpGeometry(): THREE.BufferGeometry {
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const base = new THREE.Color(0x4a7f2a)
  const tip = new THREE.Color(0xa8d65a)
  // 7 blades in a ~0.2 m radius, golden-angle spread so no two lean the same way.
  const blades: number[][] = []
  for (let i = 0; i < 7; i++) blades.push([Math.cos(i * 2.4) * 0.05 * (i % 4), Math.sin(i * 2.4) * 0.05 * (i % 4), i * 2.4, 0.08 + 0.03 * (i % 3), 0.7 + 0.1 * ((i * 5) % 4)])
  for (const [ox, oz, yaw, lean, hs] of blades) {
    const dx = Math.cos(yaw!)
    const dz = Math.sin(yaw!)
    const h = BLADE_H * hs!
    const v0 = pos.length / 3
    // Rows at t = 0, 0.55 (two verts each) and the tip; the blade bends along (−dz, dx).
    const rows: [number, number][] = [[0, 0.07], [0.55, 0.05]]
    for (const [t, w] of rows) {
      const bend = lean! * t * t
      const cx = ox! + -dz * bend
      const cz = oz! + dx * bend
      for (const sgn of [-1, 1]) {
        pos.push(cx + dx * w * sgn, h * t, cz + dz * w * sgn)
        const c = base.clone().lerp(tip, t)
        col.push(c.r, c.g, c.b)
      }
    }
    pos.push(ox! + -dz * lean!, h, oz! + dx * lean!)
    col.push(tip.r, tip.g, tip.b)
    idx.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2, v0 + 2, v0 + 3, v0 + 4)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3))
  g.setIndex(idx)
  return g
}

/** Two crossed quads (1 m wide, 0.6 m tall) for the far ring; uv for the blade texture. */
export function crossQuadGeometry(): THREE.BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const base = new THREE.Color(0x4f8a2e)
  const tip = new THREE.Color(0xa0cf55)
  for (let q = 0; q < 2; q++) {
    const a = q * Math.PI * 0.5 + 0.3
    const dx = Math.cos(a) * 0.5
    const dz = Math.sin(a) * 0.5
    const v0 = pos.length / 3
    for (const [t, u] of [[0, 0], [0, 1], [1, 0], [1, 1]] as [number, number][]) {
      pos.push(dx * 1.2 * (u * 2 - 1), t * 0.55, dz * 1.2 * (u * 2 - 1))
      uv.push(u, t)
      const c = base.clone().lerp(tip, t)
      col.push(c.r, c.g, c.b)
    }
    idx.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3))
  g.setIndex(idx)
  return g
}

/** Alpha mask of a tuft of blades, generated (no asset): N×N RGBA, alpha = inside a blade. */
export function bladeTextureData(n = 64): Uint8Array {
  const data = new Uint8Array(n * n * 4)
  const blades = [[0.18, 0.5, 0.18], [0.34, 0.8, -0.1], [0.5, 1, 0.12], [0.66, 0.75, -0.16], [0.82, 0.55, 0.2]]
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n
      const v = (y + 0.5) / n
      let a = 0
      for (const [bx, h, lean] of blades as number[][]) {
        if (v >= h!) continue
        const cx = bx! + lean! * v * v
        const hw = 0.075 * (1 - v / h!) + 0.006
        if (Math.abs(u - cx) < hw) a = 255
      }
      const k = (y * n + x) * 4
      data[k] = data[k + 1] = data[k + 2] = 255
      data[k + 3] = a
    }
  }
  return data
}

interface Uniforms {
  uGrassCenter: { value: THREE.Vector2 }
  uGrassFade: { value: THREE.Vector4 } // x,y = fade-in start/end (0 = none), z,w = fade-out start/end
  uGrassSeason: { value: number }
  uGrassSnow: { value: number }
  uGrassDry: { value: THREE.Color }
}

const FADE_GLSL = `
uniform vec2 uGrassCenter;
uniform vec4 uGrassFade;
uniform float uGrassSeason;
uniform float uGrassSnow;
uniform vec3 uGrassDry;
`
const FADE_VERTEX = `
{
  mat4 gM = modelMatrix;
  #ifdef USE_INSTANCING
  gM = gM * instanceMatrix;
  #endif
  vec3 gO = (gM * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float gd = distance(gO.xz, uGrassCenter);
  float gf = (1.0 - smoothstep(uGrassFade.z, uGrassFade.w, gd)) * smoothstep(uGrassFade.x, uGrassFade.y, gd);
  gf *= 1.0 - smoothstep(0.3, 0.7, uGrassSnow);
  gf *= 1.0 - uGrassSeason * 0.45;
  transformed *= gf;
  float gh = fract(sin(dot(gO.xz, vec2(12.9898, 78.233))) * 43758.5453);
  #ifdef USE_COLOR
  vColor.rgb = mix(vColor.rgb, uGrassDry, uGrassSeason * 1.2) * (0.85 + 0.36 * gh);
  #endif
}`

function makeMaterial(u: Uniforms, opts: { map?: THREE.Texture; heightScale: number; amplitude: number }): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, map: opts.map ?? null, alphaTest: opts.map ? 0.5 : 0 })
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${FADE_GLSL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${FADE_VERTEX}`)
    // Blades are lit like the ground from both sides: no back-face normal flip (it made them black).
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);')
  }
  m.customProgramCacheKey = () => `grass:${opts.map ? 1 : 0}`
  applyWind(m, { amplitude: opts.amplitude, heightScale: opts.heightScale })
  return m
}

interface Ring {
  mesh: THREE.InstancedMesh
  tiles: Map<string, Float32Array> // matrices (16 floats per instance)
  committed: string
  cap: number
}

export class Grass {
  group = new THREE.Group()
  private rings: [Ring | null, Ring | null] = [null, null]
  private u: Uniforms = {
    uGrassCenter: { value: new THREE.Vector2() },
    uGrassFade: { value: new THREE.Vector4() },
    uGrassSeason: { value: 0 },
    uGrassSnow: { value: 0 },
    uGrassDry: { value: DRY },
  }
  private profile: QualityProfile
  private tex: THREE.DataTexture | null = null
  private geo: [THREE.BufferGeometry | null, THREE.BufferGeometry | null] = [null, null]
  private mats: THREE.Material[] = []
  private foot = new Map<string, Footprint[]>()
  private sim: Sim
  instances = 0
  private scratch = { m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }

  constructor(sim: Sim, profile: QualityProfile) {
    this.sim = sim
    this.profile = profile
    this.build()
  }

  private build() {
    for (const r of this.rings) if (r) { this.group.remove(r.mesh); r.mesh.dispose() }
    for (const m of this.mats) m.dispose()
    this.mats = []
    this.rings = [null, null]
    const { near, far, k } = GRASS_RINGS[this.profile]
    this.u.uGrassFade.value.set(-2, -1, near - FADE_NEAR, near)
    const mk = (lod: 0 | 1, outer: number, inner: number, mat: THREE.Material, geo: THREE.BufferGeometry) => {
      const cap = maxInstances(lod, outer, inner, k)
      if (cap <= 0) return null
      const mesh = new THREE.InstancedMesh(geo, mat, cap)
      mesh.frustumCulled = false
      mesh.count = 0
      mesh.castShadow = false
      mesh.receiveShadow = false
      this.group.add(mesh)
      this.mats.push(mat)
      return { mesh, tiles: new Map<string, Float32Array>(), committed: '', cap } as Ring
    }
    if (near > 0) this.rings[0] = mk(0, near, 0, makeMaterial(this.u, { heightScale: BLADE_H, amplitude: 0.22 }), (this.geo[0] ??= bladeClumpGeometry()))
    // LOD1 has its own fade uniform copy (fade in before the near ring ends, out at the far edge).
    const u1: Uniforms = { ...this.u, uGrassFade: { value: new THREE.Vector4(Math.max(0, near - FADE_NEAR - 2), Math.max(1, near), far - FADE_FAR, far) } }
    this.u1 = u1
    this.tex ??= (() => {
      const t = new THREE.DataTexture(bladeTextureData(), 64, 64, THREE.RGBAFormat)
      t.magFilter = THREE.LinearFilter
      t.minFilter = THREE.LinearFilter
      t.needsUpdate = true
      return t
    })()
    this.rings[1] = mk(1, far, Math.max(0, near - FADE_NEAR - 2), makeMaterial(u1, { map: this.tex, heightScale: 0.55, amplitude: 0.3 }), (this.geo[1] ??= crossQuadGeometry()))
  }
  private u1: Uniforms = this.u

  setQuality(profile: QualityProfile) {
    if (profile === this.profile) return
    this.profile = profile
    this.build()
  }

  /** Season tint (0..0.8) and snow cover (0..1), the same values the terrain material uses. */
  setSeason(season: number, snow: number) {
    this.u.uGrassSeason.value = this.u1.uGrassSeason.value = season
    this.u.uGrassSnow.value = this.u1.uGrassSnow.value = snow
  }

  /** Terrain or building edits invalidate the tile caches (placement reads heights and footprints). */
  markDirty(chunk?: { cx: number; cz: number }) {
    this.foot.clear()
    for (const r of this.rings) {
      if (!r) continue
      if (!chunk) { r.tiles.clear(); r.committed = ''; continue }
      for (const k of [...r.tiles.keys()]) {
        const [tx, tz] = k.split(',').map(Number) as [number, number]
        if (Math.floor((tx * TILE_M) / CHUNK_M) === chunk.cx && Math.floor((tz * TILE_M) / CHUNK_M) === chunk.cz) r.tiles.delete(k)
      }
      r.committed = ''
    }
  }

  private footprints(tx: number, tz: number): Footprint[] {
    const key = `${Math.floor(tx / 4)},${Math.floor(tz / 4)}`
    let f = this.foot.get(key)
    if (!f) {
      const cx = (Math.floor(tx / 4) * 4 + 2) * TILE_M
      const cz = (Math.floor(tz / 4) * 4 + 2) * TILE_M
      f = this.sim.buildingsNear(cx, cz, TILE_M * 3.5).map((b) => ({ x: b.x, z: b.z, r: Math.hypot(b.hw, b.hd) * 0.9 + 1.2 }))
      this.foot.set(key, f)
    }
    return f
  }

  update(px: number, pz: number, budgetMs = GRASS_BUDGET_MS) {
    this.u.uGrassCenter.value.set(px, pz)
    this.u1.uGrassCenter.value.set(px, pz)
    const t0 = performance.now()
    const { near, far, k } = GRASS_RINGS[this.profile]
    let total = 0
    for (const lod of [0, 1] as const) {
      const ring = this.rings[lod]
      if (!ring) continue
      const outer = lod === 0 ? near : far
      const inner = lod === 0 ? 0 : Math.max(0, near - FADE_NEAR - 2)
      // Tiles whose square intersects the ring, nearest first.
      const need: { k: string; tx: number; tz: number; d: number }[] = []
      const r = outer + TILE_M
      for (let tz = Math.floor((pz - r) / TILE_M); tz <= Math.floor((pz + r) / TILE_M); tz++) {
        for (let tx = Math.floor((px - r) / TILE_M); tx <= Math.floor((px + r) / TILE_M); tx++) {
          const cx = (tx + 0.5) * TILE_M
          const cz = (tz + 0.5) * TILE_M
          const d = Math.hypot(cx - px, cz - pz)
          if (d - TILE_M * 0.71 > outer || d + TILE_M * 0.71 < inner) continue
          need.push({ k: `${tx},${tz}`, tx, tz, d })
        }
      }
      need.sort((a, b) => a.d - b.d)
      for (const n of need) {
        if (ring.tiles.has(n.k)) continue
        if (performance.now() - t0 > budgetMs) break
        const data = tileInstances(this.sim.terrain, this.footprints(n.tx, n.tz), n.tx, n.tz, lod, k)
        const buf = new Float32Array((data.length / 5) * 16)
        const { m, p, q, s, up } = this.scratch
        for (let i = 0; i < data.length / 5; i++) {
          p.set(data[i * 5]!, data[i * 5 + 1]!, data[i * 5 + 2]!)
          q.setFromAxisAngle(up, data[i * 5 + 3]!)
          s.setScalar(data[i * 5 + 4]!)
          m.compose(p, q, s).toArray(buf, i * 16)
        }
        ring.tiles.set(n.k, buf)
      }
      // Commit when the set of ready tiles changed.
      const ready = need.filter((n) => ring.tiles.has(n.k))
      const sig = ready.map((n) => n.k).join('|')
      if (sig !== ring.committed) {
        const arr = ring.mesh.instanceMatrix.array as Float32Array
        let off = 0
        for (const n of ready) {
          const buf = ring.tiles.get(n.k)!
          if (off + buf.length > arr.length) break // never beyond the buffer (cap is an upper bound anyway)
          arr.set(buf, off)
          off += buf.length
        }
        ring.mesh.count = off / 16
        ring.mesh.instanceMatrix.needsUpdate = true
        ring.committed = sig
      }
      // Evict tiles far outside the ring.
      if (ring.tiles.size > need.length * 2 + 16) {
        const keep = new Set(need.map((n) => n.k))
        for (const k of ring.tiles.keys()) if (!keep.has(k)) ring.tiles.delete(k)
      }
      total += ring.mesh.count
    }
    this.instances = total
    perf.gauge('render.grassInstances', total)
    perf.record('render.grass', performance.now() - t0)
  }

  dispose() {
    this.build()
    for (const g of this.geo) g?.dispose()
    this.tex?.dispose()
  }
}

