/**
 * Precipitation (render--001 step 2, WEATHER-01): rain as short streaks, snow as slow tumbling flakes. Stateless
 * GPU particles — one instanced camera-facing quad per drop; the vertex shader derives the position from render
 * seconds and a per-instance seed, wrapped in a box around the camera (world-stable: the drops do not follow the
 * camera). The CPU only sets uniforms per frame (no loop over particles). Sheltered player (under a roof): no
 * precipitation inside a small radius around the player, decided by one footprint test.
 * @domain render
 * @subdomain effects
 */
import * as THREE from 'three'
import type { Building, WeatherState } from '../sim/types'
import type { QualityProfile } from './quality'
import { windUniforms } from './wind'

export type PrecipKind = 'rain' | 'snow'

/** Drops at intensity 1 per profile and kind (plan: low 400–800 / medium 1000–1600 / high ≤ 2500). */
export const PRECIP_CAP: Record<QualityProfile, number> = { low: 700, medium: 1500, high: 2500 }

/** Radius (m) around the player cleared of precipitation while sheltered. */
export const SHELTER_RADIUS = 7

/** Structure kinds with a roof (a player inside the footprint is sheltered). */
const ROOFED: ReadonlySet<string> = new Set(['house', 'inn', 'market', 'shed', 'warehouse'])

/** Pure: instances drawn for a weather state (0 when it is not precipitating). */
export function precipCount(w: Pick<WeatherState, 'kind' | 'intensity'>, profile: QualityProfile): number {
  if (w.kind !== 'rain' && w.kind !== 'storm' && w.kind !== 'snow') return 0
  const k = Math.max(0.35, Math.min(1, w.intensity)) * (w.kind === 'storm' ? 1.3 : 1)
  return Math.min(PRECIP_CAP[profile], Math.round(PRECIP_CAP[profile] * k))
}

/** Pure: is (x, z) inside the footprint of a roofed building? */
export function isSheltered(x: number, z: number, buildings: readonly Pick<Building, 'kind' | 'x' | 'z' | 'rot' | 'hw' | 'hd' | 'field'>[]): boolean {
  for (const b of buildings) {
    if (b.field || !ROOFED.has(b.kind)) continue
    const dx = x - b.x
    const dz = z - b.z
    const c = Math.cos(b.rot)
    const s = Math.sin(b.rot)
    // Inverse of the render-side placement (wx = x·c + z·s, wz = −x·s + z·c).
    const lx = dx * c - dz * s
    const lz = dx * s + dz * c
    if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd) return true
  }
  return false
}

const BOX = 44
const HEIGHT = 26

export const precipUniforms = {
  uPrecipTime: { value: 0 },
  uPrecipCam: { value: new THREE.Vector3() },
  uPrecipPlayer: { value: new THREE.Vector3() },
  /** x = shelter strength 0..1 (smoothed), y = snow 1 / rain 0, z = slant from wind. */
  uPrecipMode: { value: new THREE.Vector3(0, 0, 0) },
  uPrecipTint: { value: new THREE.Color(0x9aaabb) },
}

const VERT_HEAD = `#include <common>
uniform float uPrecipTime;
uniform vec3 uPrecipCam;
uniform vec3 uPrecipPlayer;
uniform vec3 uPrecipMode;
uniform vec3 uWind;
attribute vec3 aSeed;
varying float vPrecipA;
varying vec2 vPrecipUv;`

/** Rain: fast fall + wind slant, quad stretched along the velocity. Snow: slow fall with sway, round flake. */
const VERT_BODY = `
bool snow = uPrecipMode.y > 0.5;
float speed = snow ? (1.1 + 0.5 * aSeed.z) : (13.0 + 4.0 * aSeed.z);
vec3 vel = vec3(uWind.x * uPrecipMode.z * (snow ? 1.4 : 5.0), -speed, uWind.y * uPrecipMode.z * (snow ? 1.4 : 5.0));
vec3 p0 = vec3(aSeed.x * ${BOX.toFixed(1)}, aSeed.z * ${HEIGHT.toFixed(1)}, aSeed.y * ${BOX.toFixed(1)});
vec3 box = vec3(${BOX.toFixed(1)}, ${HEIGHT.toFixed(1)}, ${BOX.toFixed(1)});
vec3 rel = p0 + vel * uPrecipTime - uPrecipCam;
rel = mod(rel + 0.5 * box, box) - 0.5 * box;
if (snow) rel.xz += vec2(sin(uPrecipTime * 0.9 + aSeed.x * 40.0), cos(uPrecipTime * 0.7 + aSeed.y * 40.0)) * 0.35;
vec3 wp = uPrecipCam + rel;
vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
vec3 axis = snow ? camU : normalize(vel);
float dist = length(wp - cameraPosition);
// Streaks keep ~2 px of width at any distance (sub-pixel lines vanish without MSAA) and lengthen with distance.
float len = snow ? 0.07 : 0.8 + dist * 0.02;
float wid = snow ? 0.07 : max(0.02, dist * 0.003);
vec3 side = snow ? camR : normalize(cross(wp - cameraPosition, axis));
wp += side * position.x * wid + axis * position.y * len;
// Fade at the box edges and very near the camera; clear a column around the player while sheltered.
vec3 e = abs(rel) / (0.5 * box);
float edge = 1.0 - smoothstep(0.75, 1.0, max(max(e.x, e.y), e.z));
float near = smoothstep(0.8, 2.5, dist);
float shelter = 1.0 - uPrecipMode.x * (1.0 - smoothstep(${(SHELTER_RADIUS - 2).toFixed(1)}, ${SHELTER_RADIUS.toFixed(1)}, length(wp.xz - uPrecipPlayer.xz)));
vPrecipA = edge * near * shelter * (snow ? 0.85 : 0.6);
vPrecipUv = position.xy;
vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
gl_Position = projectionMatrix * mvPosition;`

function precipMaterial(): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: true })
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, precipUniforms, { uWind: { value: windUniforms.uWind.value } })
    sh.vertexShader = sh.vertexShader.replace('#include <common>', VERT_HEAD).replace('#include <project_vertex>', VERT_BODY)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uPrecipTint;\nuniform vec3 uPrecipMode;\nvarying float vPrecipA;\nvarying vec2 vPrecipUv;')
      .replace('#include <color_fragment>', `#include <color_fragment>
float shape = uPrecipMode.y > 0.5 ? 1.0 - smoothstep(0.55, 1.0, length(vPrecipUv) * 2.0) : 1.0 - smoothstep(0.3, 1.0, abs(vPrecipUv.x) * 2.0);
diffuseColor.rgb = uPrecipTint;
diffuseColor.a = shape * vPrecipA;`)
  }
  m.customProgramCacheKey = () => 'precip'
  return m
}

export class Precipitation {
  group = new THREE.Group()
  readonly mesh: THREE.InstancedMesh
  private shelter = 0
  private t = 0

  constructor() {
    const cap = PRECIP_CAP.high
    const geo = new THREE.PlaneGeometry(1, 1)
    const seed = new Float32Array(cap * 3)
    for (let i = 0; i < seed.length; i++) seed[i] = Math.random()
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 3))
    this.mesh = new THREE.InstancedMesh(geo, precipMaterial(), cap)
    this.mesh.count = 0
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 4
    this.group.add(this.mesh)
  }

  /** Uniforms and instance count only; `sheltered` comes from one footprint query per frame. */
  update(dt: number, w: Pick<WeatherState, 'kind' | 'intensity'>, profile: QualityProfile, cam: THREE.Vector3, player: { x: number; y: number; z: number }, sheltered: boolean) {
    this.t += dt
    const n = precipCount(w, profile)
    this.mesh.count = n
    this.mesh.visible = n > 0
    if (n === 0) return
    // Smooth the shelter edge so stepping through a door does not pop.
    this.shelter += ((sheltered ? 1 : 0) - this.shelter) * Math.min(1, dt * 4)
    const snow = w.kind === 'snow'
    precipUniforms.uPrecipTime.value = this.t
    precipUniforms.uPrecipCam.value.copy(cam)
    precipUniforms.uPrecipPlayer.value.set(player.x, player.y, player.z)
    precipUniforms.uPrecipMode.value.set(this.shelter, snow ? 1 : 0, Math.min(1.5, windUniforms.uWind.value.z))
    precipUniforms.uPrecipTint.value.set(snow ? 0xffffff : 0x9aaabb)
  }
}
