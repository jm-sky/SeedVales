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
import { FADE_FAR, FADE_NEAR, type Footprint, GRASS_RINGS, grassTint, hash01, maxInstances, TILE_M, tileInstances } from './grassPlacement'
import { flowerType, GROUND_PATCH_GLSL, groundPatch } from './groundPatch'
import { type QualityProfile } from './quality'
import { applyWind } from './wind'

const GRASS_BUDGET_MS = 2.5
/** While tiles are still being built, upload the ring buffer at most every N frames. */
const COMMIT_EVERY_FRAMES = 20
/** Full-growth blade height (m); the seasonal growth uniform scales it (user, 2026-10-02: thinner and longer). */
const BLADE_H = 0.62
const BLADES_PER_CLUMP = 16
const FLOWERS_PER_CLUMP = 3
const DRY = new THREE.Color(0xb8a45a)
const LOD1_H = 0.8
/** Blade-ring tiles whose centre is closer than this use the curved clump; the rest single-triangle blades. */
const FINE_M = 20

/**
 * Clump: 16 thin curved blades (3 triangles each, base → tip colour gradient) + 3 flower heads (two crossed
 * quads among the blade tips, no stem — not visible at camera height) marked by `aFlower` = 11..13; the shader shows a head only inside a flower patch in the
 * flower season. Normals point up (lit like the ground). More blades per instance is cheaper than more
 * instances: no extra matrices to build or upload. `coarse` = the same blades as single triangles and
 * one quad per flower head (≈ 40 % of the triangles) for the outer part of the blade ring.
 */
export function bladeClumpGeometry(coarse = false): THREE.BufferGeometry {
  const pos: number[] = []
  const col: number[] = []
  const flw: number[] = []
  const idx: number[] = []
  const base = new THREE.Color(0x3e6a28)
  const tip = new THREE.Color(0x96bc50)
  const crn: number[] = []
  const vert = (x: number, y: number, z: number, c: THREE.Color, f = 0, cx = 0, cy = 0) => {
    pos.push(x, y, z)
    col.push(c.r, c.g, c.b)
    flw.push(f)
    crn.push(cx, cy)
    return pos.length / 3 - 1
  }
  for (let i = 0; i < BLADES_PER_CLUMP; i++) {
    // Golden-angle spread in a ~0.2 m radius; heights 0.55–1.05 of BLADE_H so the clump edge is ragged.
    const r = 0.04 + 0.26 * Math.sqrt((i + 0.5) / BLADES_PER_CLUMP)
    const ox = Math.cos(i * 2.4) * r
    const oz = Math.sin(i * 2.4) * r
    const yaw = i * 2.4 + 0.9
    const dx = Math.cos(yaw)
    const dz = Math.sin(yaw)
    const hs = 0.55 + 0.5 * (((i * 7) % 11) / 10)
    const h = BLADE_H * hs
    const lean = (0.1 + 0.05 * (i % 3)) * hs
    // Outward lean: blades bend away from the clump centre plus a little sideways.
    const ux = ox / r
    const uz = oz / r
    const v0 = pos.length / 3
    if (coarse) {
      for (const sgn of [-1, 1]) vert(ox + dx * 0.022 * sgn, 0, oz + dz * 0.022 * sgn, base)
      vert(ox + ux * lean, h, oz + uz * lean, tip)
      idx.push(v0, v0 + 1, v0 + 2)
      continue
    }
    for (const [t, w] of [[0, 0.022], [0.5, 0.014]] as [number, number][]) {
      const bend = lean * t * t
      const c = base.clone().lerp(tip, t)
      for (const sgn of [-1, 1]) vert(ox + ux * bend + dx * w * sgn, h * t, oz + uz * bend + dz * w * sgn, c)
    }
    vert(ox + ux * lean - dz * 0.02, h, oz + uz * lean + dx * 0.02, tip)
    idx.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2, v0 + 2, v0 + 3, v0 + 4)
  }
  const white = new THREE.Color(1, 1, 1)
  for (let k = 0; k < FLOWERS_PER_CLUMP; k++) {
    const a = k * 2.1 + 0.4
    const fx = Math.cos(a) * 0.12
    const fz = Math.sin(a) * 0.12
    const fh = BLADE_H * (0.7 + 0.12 * k)
    // One camera-facing quad per head (all four corners at the head centre, spread by `aCorner` in the
    // shader); the 5-petal shape is cut in the fragment shader — no texture.
    const v0 = vert(fx, fh, fz, white, k + 11, -1, -1)
    vert(fx, fh, fz, white, k + 11, 1, -1)
    vert(fx, fh, fz, white, k + 11, -1, 1)
    vert(fx, fh, fz, white, k + 11, 1, 1)
    idx.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setAttribute('aFlower', new THREE.Float32BufferAttribute(flw, 1))
  g.setAttribute('aCorner', new THREE.Float32BufferAttribute(crn, 2))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3))
  g.setIndex(idx)
  return g
}

/** Two crossed quads (2.4 m wide, 0.8 m tall at full growth) for the far ring; uv for the blade texture. */
export function crossQuadGeometry(): THREE.BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const base = new THREE.Color(0x477a2c)
  const tip = new THREE.Color(0x8cb54c)
  for (let q = 0; q < 2; q++) {
    const a = q * Math.PI * 0.5 + 0.3
    const dx = Math.cos(a) * 0.5
    const dz = Math.sin(a) * 0.5
    const v0 = pos.length / 3
    for (const [t, u] of [[0, 0], [0, 1], [1, 0], [1, 1]] as [number, number][]) {
      pos.push(dx * 1.2 * (u * 2 - 1), t * LOD1_H, dz * 1.2 * (u * 2 - 1))
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
  g.setAttribute('aFlower', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0), 1))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3))
  g.setIndex(idx)
  return g
}

/**
 * Alpha mask of a tuft of thin blades, generated (no asset): N×N RGBA, alpha = inside a blade. Flower heads
 * are marked with blue = 0 — the shader shows them (in the patch colour) only inside a flower patch.
 */
export function bladeTextureData(n = 64): Uint8Array {
  const data = new Uint8Array(n * n * 4)
  const blades = [[0.1, 0.55, 0.12], [0.2, 0.85, -0.08], [0.3, 0.7, 0.15], [0.4, 1, 0.1], [0.5, 0.78, -0.14], [0.6, 0.95, 0.06], [0.7, 0.66, -0.1], [0.8, 0.88, 0.14], [0.9, 0.6, -0.12]]
  const heads = [[0.26, 0.74], [0.55, 0.86], [0.83, 0.7]]
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n
      const v = (y + 0.5) / n
      let a = 0
      for (const [bx, h, lean] of blades as number[][]) {
        if (v >= h!) continue
        const cx = bx! + lean! * v * v
        const hw = 0.032 * (1 - v / h!) + 0.004
        if (Math.abs(u - cx) < hw) a = 255
      }
      let flower = false
      for (const [hx, hy] of heads as number[][]) if ((u - hx!) ** 2 + ((v - hy!) * 1.6) ** 2 < 0.035 ** 2) flower = true
      const k = (y * n + x) * 4
      data[k] = data[k + 1] = 255
      data[k + 2] = flower ? 0 : 255
      data[k + 3] = flower ? 255 : a
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
  uGrassGrowth: { value: number }
  uFlowers: { value: number }
}

const FADE_GLSL = `
uniform vec2 uGrassCenter;
uniform vec4 uGrassFade;
uniform float uGrassSeason;
uniform float uGrassSnow;
uniform vec3 uGrassDry;
uniform float uGrassGrowth;
attribute float aFlower;
attribute vec2 aCorner; // flower-head billboard corner (−1..1); 0 on blades
varying vec2 vPetal;
attribute vec2 aPatch; // per instance: x = flower-patch weight, y = flower species (FLOWER_COLOURS index)
varying float vFlowerK;
varying vec3 vFlowerC;
${GROUND_PATCH_GLSL}
`
// Per instance: ring fade, snow, seasonal height (origin hash), flower heads shown only inside flower patches
// in the flower season (aPatch). Colour variation (biome tint, dark splashes, per-clump hue) is in instanceColor,
// computed once per clump on the CPU — per-vertex patch noise here cost ≈ +2 ms GPU on medium.
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
  gf *= 1.0 - uGrassSeason * 0.2;
  float gh = fract(sin(dot(gO.xz, vec2(12.9898, 78.233))) * 43758.5453);
  float bloom = aPatch.x * uFlowers * 1.1;
  vFlowerK = step(fract(gh * 5.37), bloom);
  vFlowerC = flowerColourOf(aPatch.y);
  if (aFlower > 0.5) gf *= step(fract(gh * 7.31 + mod(aFlower, 10.0) * 0.377), bloom);
  transformed.y *= uGrassGrowth * (0.82 + 0.36 * fract(gh * 3.1));
  vPetal = vec2(9.0);
  if (aFlower > 10.5) {
    // Camera-facing head, 5 cm radius in world units (instance scale divided out).
    vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    transformed += inverse(mat3(gM)) * (camR * aCorner.x + camU * aCorner.y) * 0.05;
    vPetal = aCorner;
  }
  transformed *= gf;
  #ifdef USE_COLOR
  vColor.rgb = aFlower > 10.5 ? vFlowerC : mix(vColor.rgb, uGrassDry, uGrassSeason * 1.2);
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
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);')
      .replace('#include <common>', '#include <common>\nvarying float vFlowerK;\nvarying vec3 vFlowerC;\nvarying vec2 vPetal;')
      // LOD0 flower heads: five rounded petals and a darker golden centre, cut from the billboard quad.
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vPetal.x < 5.0) {
  float pr = length(vPetal);
  float pa = atan(vPetal.y, vPetal.x);
  if (pr > 0.5 + 0.5 * pow(abs(cos(pa * 2.5)), 0.7)) discard;
  diffuseColor.rgb = pr < 0.24 ? vec3(0.85, 0.55, 0.06) : diffuseColor.rgb * (0.82 + 0.3 * (1.0 - pr));
}`)
      // LOD1: texels with blue = 0 are flower heads — patch colour inside a flower patch, cut away elsewhere.
      .replace('#include <map_fragment>', '#include <map_fragment>\n#ifdef USE_MAP\nif (texture2D(map, vMapUv).b < 0.5) { if (vFlowerK < 0.5) discard; diffuseColor.rgb = vFlowerC; }\n#endif')
  }
  m.customProgramCacheKey = () => `grass:${opts.map ? 1 : 0}`
  applyWind(m, { amplitude: opts.amplitude, heightScale: opts.heightScale })
  return m
}

/**
 * Per-clump look, once at tile build: colour = biome tint × dark meadow splash × per-clump brightness/hue jitter
 * (instanceColor); patch = flower-patch weight + species (aPatch). Same patches as the ground under it.
 */
function clumpLook(biome: number, x: number, z: number, col: Float32Array, pat: Float32Array, i: number, patch = groundPatch(x, z)) {
  const [tr, tg, tb] = grassTint(biome)
  const [flower, dark] = patch
  const h = hash01(Math.round(x * 10), Math.round(z * 10), 9)
  const h2 = hash01(Math.round(x * 10), Math.round(z * 10), 10) - 0.5
  const k = (1 - dark * 0.3) * (0.86 + 0.26 * h)
  col[i * 3] = tr * k * (1 + h2 * 0.16)
  col[i * 3 + 1] = tg * k
  col[i * 3 + 2] = tb * k * (1 - h2 * 0.2)
  pat[i * 2] = flower
  pat[i * 2 + 1] = flowerType(x, z)
}

interface RingMesh {
  mesh: THREE.InstancedMesh
  patch: THREE.InstancedBufferAttribute
}

interface Ring {
  /** [0] = main mesh; the blade ring has [1] = coarse mesh for tiles beyond FINE_M (same tile cache). */
  meshes: RingMesh[]
  tiles: Map<string, { m: Float32Array; c: Float32Array; p: Float32Array }> // per instance: matrix (16), colour (3), patch (2)
  committed: string
  /** Frame of the last buffer upload (commit throttle). */
  commitFrame: number
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
    uGrassGrowth: { value: 1 },
    uFlowers: { value: 0 },
  }
  private profile: QualityProfile
  private tex: THREE.DataTexture | null = null
  private geo: (THREE.BufferGeometry | null)[] = [null, null, null]
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
    for (const r of this.rings) for (const { mesh } of r?.meshes ?? []) { this.group.remove(mesh); mesh.dispose() }
    for (const m of this.mats) m.dispose()
    this.mats = []
    this.rings = [null, null]
    const { near, far, k } = GRASS_RINGS[this.profile]
    this.u.uGrassFade.value.set(-2, -1, near - FADE_NEAR, near)
    const mk = (lod: 0 | 1, outer: number, inner: number, mat: THREE.Material, geos: THREE.BufferGeometry[]): Ring | null => {
      const cap = maxInstances(lod, outer, inner, k)
      if (cap <= 0) return null
      this.mats.push(mat)
      return { meshes: geos.map((geo) => this.ringMesh(geo, mat, cap)), tiles: new Map(), committed: '', commitFrame: 0, cap }
    }
    if (near > 0) this.rings[0] = mk(0, near, 0, makeMaterial(this.u, { heightScale: BLADE_H, amplitude: 0.22 }), [(this.geo[0] ??= bladeClumpGeometry()), (this.geo[2] ??= bladeClumpGeometry(true))])
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
    this.rings[1] = mk(1, far, Math.max(0, near - FADE_NEAR - 2), makeMaterial(u1, { map: this.tex, heightScale: LOD1_H, amplitude: 0.3 }), [(this.geo[1] ??= crossQuadGeometry())])
  }

  /** One instanced mesh of a ring: matrix + colour + flower-patch instance attributes, all dynamic. */
  private ringMesh(geo: THREE.BufferGeometry, mat: THREE.Material, cap: number): RingMesh {
    const mesh = new THREE.InstancedMesh(geo, mat, cap)
    mesh.frustumCulled = false
    mesh.count = 0
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    // Per-clump tint (biome, dark splash, jitter) — multiplied into vColor by three.
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3)
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
    const patch = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2)
    patch.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('aPatch', patch)
    mesh.castShadow = false
    mesh.receiveShadow = false
    this.group.add(mesh)
    return { mesh, patch }
  }
  private u1: Uniforms = this.u

  setQuality(profile: QualityProfile) {
    if (profile === this.profile) return
    this.profile = profile
    this.build()
  }

  /**
   * Season tint (0..0.8) and snow cover (0..1), the same values the terrain material uses; blade height factor
   * and flower amount from `grassSeasonal`.
   */
  setSeason(season: number, snow: number, growth = 1, flowers = 0) {
    this.u.uGrassSeason.value = this.u1.uGrassSeason.value = season
    this.u.uGrassSnow.value = this.u1.uGrassSnow.value = snow
    this.u.uGrassGrowth.value = this.u1.uGrassGrowth.value = growth
    this.u.uFlowers.value = this.u1.uFlowers.value = flowers
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

  private frame = 0

  update(px: number, pz: number, budgetMs = GRASS_BUDGET_MS) {
    this.frame++
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
        const col = new Float32Array((data.length / 5) * 3)
        const pat = new Float32Array((data.length / 5) * 2)
        const { m, p, q, s, up } = this.scratch
        let j = 0
        for (let i = 0; i < data.length / 5; i++) {
          p.set(data[i * 5]!, data[i * 5 + 1]!, data[i * 5 + 2]!)
          // Bare-soil patches (same function as the ground tint): clumps survive with probability 1 − soil.
          const patch = groundPatch(p.x, p.z)
          if (patch[2] > 0 && hash01(Math.round(p.x * 10), Math.round(p.z * 10), 11) < patch[2] * 0.95) continue
          q.setFromAxisAngle(up, data[i * 5 + 3]!)
          s.setScalar(data[i * 5 + 4]!)
          m.compose(p, q, s).toArray(buf, j * 16)
          clumpLook(this.sim.terrain.biomeAt(p.x, p.z), p.x, p.z, col, pat, j, patch)
          j++
        }
        ring.tiles.set(n.k, { m: buf.subarray(0, j * 16), c: col.subarray(0, j * 3), p: pat.subarray(0, j * 2) })
      }
      // Commit when the set of ready tiles (or their fine/coarse split) changed.
      const ready = need.filter((n) => ring.tiles.has(n.k))
      const fine = (n: { d: number }) => ring.meshes.length === 1 || n.d < FINE_M
      const sig = ready.map((n) => (fine(n) ? 'f' : 'c') + n.k).join('|')
      // Commits are coalesced: every commit re-uploads the whole instance buffer (up to ~2.5 MB), and while walking
      // a ring gains a tile every few frames (GPU bench: raf p95 10.7 -> 23.6 ms on medium march with a commit per tile).
      const stale = sig !== ring.committed
      const pending = ready.length < need.length
      if (stale && (ring.committed === '' || !pending || this.frame - ring.commitFrame >= COMMIT_EVERY_FRAMES)) {
        ring.meshes.forEach((rm, mi) => {
          const arr = rm.mesh.instanceMatrix.array as Float32Array
          const carr = rm.mesh.instanceColor!.array as Float32Array
          const parr = rm.patch.array as Float32Array
          let off = 0
          for (const n of ready) {
            if (fine(n) !== (mi === 0)) continue
            const t = ring.tiles.get(n.k)!
            if (off + t.m.length > arr.length) break // never beyond the buffer (cap is an upper bound anyway)
            arr.set(t.m, off)
            carr.set(t.c, (off / 16) * 3)
            parr.set(t.p, (off / 16) * 2)
            off += t.m.length
          }
          rm.mesh.count = off / 16
          rm.mesh.instanceMatrix.needsUpdate = true
          rm.mesh.instanceColor!.needsUpdate = true
          rm.patch.needsUpdate = true
        })
        ring.committed = sig
        ring.commitFrame = this.frame
      }
      // Evict tiles far outside the ring.
      if (ring.tiles.size > need.length * 2 + 16) {
        const keep = new Set(need.map((n) => n.k))
        for (const k of ring.tiles.keys()) if (!keep.has(k)) ring.tiles.delete(k)
      }
      for (const rm of ring.meshes) total += rm.mesh.count
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

