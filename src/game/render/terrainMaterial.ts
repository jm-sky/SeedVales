/**
 * Terrain material (render--002 step 3): Lambert with the season and snow tint as uniforms — a season or
 * weather change no longer rebuilds chunks — and an optional world-space ground detail texture
 * (medium/high, D-PERF-2). Per-vertex masks (`aTint`: x = grass share that fades in autumn/winter,
 * y = surface flat enough to hold snow) are written at chunk build time; the ground type is never
 * reconstructed from the final colour.
 * @domain render
 * @subdomain terrain
 */
import * as THREE from 'three'
import { GROUND_PATCH_GLSL } from './groundPatch'

/** Colours the tint fades towards (linear, like the vertex colours). */
const DRY = new THREE.Color(0xb3a55a)
const SNOW = new THREE.Color(0xf0f4f8)
/** Bare meadow soil (brown earth with a hint of leaf litter). */
const SOIL = new THREE.Color(0x6e5537)

export interface TerrainShading {
  /** 0 = summer, up to ~0.8 = faded autumn/winter grass. */
  season: { value: number }
  /** 0..1 snow cover. */
  snow: { value: number }
  /** 0..1 flower season (meadow patches, shared with the grass). */
  flowers: { value: number }
  /** 0..1 ground wetness (WEATHER-02, render-derived and smoothed from `weather.wetness`). */
  wet: { value: number }
}

/** Small tiling value-noise texture (R fine grain, G coarse blotches), generated once — no asset needed. */
/** Created once and shared by every terrain material (quality switches swap materials, not the texture). */
let sharedDetail: THREE.DataTexture | null = null

function detailTexture(): THREE.DataTexture {
  const N = 256
  const data = new Uint8Array(N * N * 4)
  let s = 0x9e3779b9
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const lattice = (cells: number) => {
    const g = Float32Array.from({ length: cells * cells }, rnd)
    return (x: number, y: number) => {
      const fx = (x / N) * cells
      const fy = (y / N) * cells
      const i = Math.floor(fx)
      const j = Math.floor(fy)
      const tx = fx - i
      const ty = fy - j
      const sx = tx * tx * (3 - 2 * tx)
      const sy = ty * ty * (3 - 2 * ty)
      const at = (a: number, b: number) => g[((b % cells) * cells + (a % cells)) % (cells * cells)]!
      const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx
      const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx
      return a + (b - a) * sy
    }
  }
  const fine = lattice(64)
  const mid = lattice(16)
  const coarse = lattice(4)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = (y * N + x) * 4
      data[k] = Math.round((fine(x, y) * 0.65 + mid(x, y) * 0.35) * 255)
      data[k + 1] = Math.round(coarse(x, y) * 255)
      data[k + 2] = 0
      data[k + 3] = 255
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.needsUpdate = true
  return t
}

export function createTerrainMaterial(opts: { smooth: boolean; detail: boolean }): { material: THREE.MeshLambertMaterial; shading: TerrainShading } {
  const shading: TerrainShading = { season: { value: 0 }, snow: { value: 0 }, flowers: { value: 0 }, wet: { value: 0 } }
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: !opts.smooth })
  const detail = opts.detail ? (sharedDetail ??= detailTexture()) : null
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uSeason = shading.season
    sh.uniforms.uSnow = shading.snow
    sh.uniforms.uWet = shading.wet
    sh.uniforms.uDry = { value: DRY }
    sh.uniforms.uSnowC = { value: SNOW }
    sh.uniforms.uFlowers = shading.flowers
    sh.uniforms.uSoilC = { value: SOIL }
    if (detail) sh.uniforms.uDetail = { value: detail }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aTint;\nvarying vec2 vTint;\nvarying vec2 vGroundXZ;\nvarying float vViewDist;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;\nvGroundXZ = position.xz;\nvViewDist = length((modelViewMatrix * vec4(position, 1.0)).xyz);')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uSeason;\nuniform float uSnow;\nuniform float uWet;\nuniform vec3 uDry;\nuniform vec3 uSnowC;\nuniform vec3 uSoilC;\nvarying vec2 vTint;\nvarying vec2 vGroundXZ;\nvarying float vViewDist;${detail ? '\nuniform sampler2D uDetail;' : ''}\n${GROUND_PATCH_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, uDry, uSeason * 0.45 * vTint.x);
{
  // Meadow patches on the grass share (the same splashes as the blades above): darker green, and a faint
  // flower tint that carries the flower patches beyond the grass rings.
  vec3 gp = groundPatch(vGroundXZ) * vTint.x;
  diffuseColor.rgb *= 1.0 - gp.y * 0.22;
  // Bare soil between tufts (the grass thins in the same patches); fades under snow like the grass share.
  diffuseColor.rgb = mix(diffuseColor.rgb, uSoilC, gp.z * 0.8 * (1.0 - uSnow));
  vec3 fc = flowerColour(vGroundXZ);
  // Yellow patches tint the ground; white/violet only slightly (a pale wash reads as grey on the ground).
  diffuseColor.rgb = mix(diffuseColor.rgb, fc, gp.x * uFlowers * (fc.b < 0.5 ? 0.18 : 0.06));
}
{
  // WEATHER-02: snow only where the surface faces up (smooth normal; flat shading keeps the baked mask), and wet
  // ground darker and slightly more saturated where it is flat enough to hold water — Lambert only darkens, no gloss.
  float nUp = 1.0;
  #ifndef FLAT_SHADED
  nUp = dot(normalize(vNormal), normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
  #endif
  float snowK = uSnow * 0.85 * vTint.y * smoothstep(0.72, 0.9, nUp);
  diffuseColor.rgb = mix(diffuseColor.rgb, uSnowC, snowK);
  float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 wetC = mix(vec3(lum), diffuseColor.rgb, 1.25) * 0.62;
  diffuseColor.rgb = mix(diffuseColor.rgb, wetC, uWet * (0.4 + 0.6 * vTint.y) * (1.0 - snowK));
}${detail ? `
{
  // Ground detail in world metres: fine grain every ~3 m, blotches every ~40 m; fades out with distance (no moiré).
  float fine = texture2D(uDetail, vGroundXZ / 3.2).r;
  float blot = texture2D(uDetail, vGroundXZ / 41.0).g;
  float fade = 1.0 - smoothstep(25.0, 110.0, vViewDist);
  diffuseColor.rgb *= 1.0 + ((fine - 0.5) * 0.22 * fade + (blot - 0.5) * 0.12);
}` : ''}`)
  }
  material.customProgramCacheKey = () => `terrain:${opts.detail ? 1 : 0}`
  return { material, shading }
}

export function disposeTerrainMaterial(m: THREE.MeshLambertMaterial) {
  m.dispose()
}
