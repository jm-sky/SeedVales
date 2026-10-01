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

/** Colours the tint fades towards (linear, like the vertex colours). */
const DRY = new THREE.Color(0xb3a55a)
const SNOW = new THREE.Color(0xf0f4f8)

export interface TerrainShading {
  /** 0 = summer, up to ~0.8 = faded autumn/winter grass. */
  season: { value: number }
  /** 0..1 snow cover. */
  snow: { value: number }
}

/** Small tiling value-noise texture (R fine grain, G coarse blotches), generated once — no asset needed. */
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
  const shading: TerrainShading = { season: { value: 0 }, snow: { value: 0 } }
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: !opts.smooth })
  const detail = opts.detail ? detailTexture() : null
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uSeason = shading.season
    sh.uniforms.uSnow = shading.snow
    sh.uniforms.uDry = { value: DRY }
    sh.uniforms.uSnowC = { value: SNOW }
    if (detail) sh.uniforms.uDetail = { value: detail }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aTint;\nvarying vec2 vTint;\nvarying vec2 vGroundXZ;\nvarying float vViewDist;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;\nvGroundXZ = position.xz;\nvViewDist = length((modelViewMatrix * vec4(position, 1.0)).xyz);')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uSeason;\nuniform float uSnow;\nuniform vec3 uDry;\nuniform vec3 uSnowC;\nvarying vec2 vTint;\nvarying vec2 vGroundXZ;\nvarying float vViewDist;${detail ? '\nuniform sampler2D uDetail;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, uDry, uSeason * 0.45 * vTint.x);
diffuseColor.rgb = mix(diffuseColor.rgb, uSnowC, uSnow * 0.85 * vTint.y);${detail ? `
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
