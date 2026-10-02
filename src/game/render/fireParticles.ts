/**
 * Particle fire (render--001 step 1b, RENDER-03; user: flame particles, small white sparks rising, red embers
 * low near the centre, counts and strength by source). Stateless GPU particles: one instanced camera-facing quad
 * per particle and layer; the vertex shader derives age, rise, drift, size and colour from render seconds and a
 * per-instance seed. The CPU rewrites the instance data only when the emitter set or a level changes (throttled),
 * never per frame. Additive blending (smoke: normal), no depth write, no bloom needed (D-REN-7).
 * Simplification vs the plan: one generated soft teardrop texture with per-particle rotation/size instead of a
 * 4-frame flipbook.
 * @domain render
 * @subdomain effects
 */
import * as THREE from 'three'
import type { FireEmitter, FireKind } from './fireSources'
import type { QualityProfile } from './quality'

export type FireLayer = 'flames' | 'sparks' | 'embers' | 'smoke'
const LAYERS: FireLayer[] = ['flames', 'sparks', 'embers', 'smoke']

/** Particles per emitter at level 1 (plan table). */
const COUNTS: Record<FireLayer, Record<FireKind, number>> = {
  flames: { campfire: 10, hearth: 12, torchpost: 4, planted: 4, held: 4 },
  sparks: { campfire: 8, hearth: 10, torchpost: 3, planted: 3, held: 3 },
  embers: { campfire: 10, hearth: 14, torchpost: 1, planted: 0, held: 0 },
  smoke: { campfire: 3, hearth: 4, torchpost: 0, planted: 0, held: 0 },
}

/** Particle emitters only within this distance (m); beyond it the flame cone in dynamics.ts stays. */
export const PARTICLE_RANGE: Record<QualityProfile, number> = { low: 45, medium: 70, high: 90 }
/** Total instances per profile (all layers). */
export const PARTICLE_CAP: Record<QualityProfile, number> = { low: 300, medium: 900, high: 1400 }

/** Particles of one layer for one emitter: scaled by level (embers stay — a dying fire reads as coals); low halves, no smoke. */
export function particleCount(layer: FireLayer, kind: FireKind, level: number, profile: QualityProfile): number {
  if (profile === 'low' && layer === 'smoke') return 0
  const base = COUNTS[layer][kind]
  const byLevel = layer === 'embers' ? base * (0.6 + 0.4 * level) : base * (0.25 + 0.75 * level)
  return Math.round(byLevel * (profile === 'low' ? 0.5 : 1))
}

/** Bed radius by kind (flames and embers spread over it). */
const BED: Record<FireKind, number> = { hearth: 0.55, campfire: 0.45, torchpost: 0.08, planted: 0.06, held: 0.05 }

/** Soft teardrop alpha texture (no asset). */
function flameTexture(n = 64): THREE.DataTexture {
  const d = new Uint8Array(n * n * 4)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n - 0.5
      const v = (y + 0.5) / n
      // Wider at the bottom, pointed at the top.
      const w = 0.42 * Math.sqrt(Math.max(0, 1 - v)) * (0.35 + 0.65 * Math.min(1, v * 3))
      const a = Math.max(0, 1 - Math.abs(u) / Math.max(1e-3, w)) * Math.min(1, v * 6) * Math.min(1, (1 - v) * 1.6)
      const k = (y * n + x) * 4
      d[k] = d[k + 1] = d[k + 2] = 255
      d[k + 3] = Math.round(Math.min(1, a * 1.4) * 255)
    }
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat)
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearFilter
  t.needsUpdate = true
  return t
}

/** Round soft dot (sparks, embers, smoke). */
function dotTexture(n = 32): THREE.DataTexture {
  const d = new Uint8Array(n * n * 4)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const r = Math.hypot((x + 0.5) / n - 0.5, (y + 0.5) / n - 0.5) * 2
      const k = (y * n + x) * 4
      d[k] = d[k + 1] = d[k + 2] = 255
      d[k + 3] = Math.round(Math.max(0, 1 - r) ** 1.6 * 255)
    }
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat)
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearFilter
  t.needsUpdate = true
  return t
}

/** Per layer: life motion and colour in GLSL. In: age 0..1, h (vec3 hashes), aBed (bed radius), aLevel. Out: off (vec3), size, col, alpha. */
const LAYER_GLSL: Record<FireLayer, string> = {
  flames: `
float ang = h.x * 6.2832;
float rad = aBed * sqrt(h.y) * (1.0 - age * 0.7);
off = vec3(cos(ang) * rad, age * (0.8 + 0.8 * aLevel) * (0.7 + 0.6 * h.z) * (aBed > 0.2 ? 1.0 : 0.45), sin(ang) * rad);
size = (aBed > 0.2 ? 0.85 : 0.22) * (0.6 + 0.6 * aLevel) * (1.0 - age * 0.7) * (0.7 + 0.6 * h.z);
col = mix(vec3(1.0, 0.85, 0.35), vec3(1.0, 0.32, 0.05), smoothstep(0.1, 0.8, age));
alpha = smoothstep(0.0, 0.12, age) * (1.0 - smoothstep(0.55, 1.0, age)) * 0.85;`,
  sparks: `
float ang = h.x * 6.2832;
off = vec3(cos(ang) * aBed * h.y + sin(age * 9.0 + h.z * 6.0) * 0.18 * age, age * (1.6 + 1.6 * h.z) * (aBed > 0.2 ? 1.0 : 0.6), sin(ang) * aBed * h.y + cos(age * 7.0 + h.x * 6.0) * 0.18 * age);
size = 0.035 + 0.02 * h.y;
col = mix(vec3(1.0, 1.0, 0.85), vec3(1.0, 0.7, 0.3), age);
alpha = (1.0 - age) * step(0.05, age);`,
  embers: `
float ang = h.x * 6.2832;
off = vec3(cos(ang) * aBed * sqrt(h.y), 0.03 + 0.12 * h.z, sin(ang) * aBed * sqrt(h.y));
size = 0.05 + 0.04 * h.z;
float pulse = 0.55 + 0.45 * sin(uFireTime * (1.2 + h.y * 2.0) + h.x * 6.2832);
col = mix(vec3(1.0, 0.18, 0.02), vec3(1.0, 0.45, 0.08), pulse);
alpha = pulse * (0.5 + 0.5 * aLevel);`,
  smoke: `
off = vec3(sin(age * 2.0 + h.x * 6.0) * 0.35 * age, 0.6 + age * 3.4, cos(age * 1.7 + h.y * 6.0) * 0.35 * age);
size = 0.35 + 1.3 * age;
col = vec3(0.32, 0.31, 0.3);
alpha = 0.22 * smoothstep(0.0, 0.2, age) * (1.0 - smoothstep(0.5, 1.0, age)) * (0.4 + 0.6 * aLevel);`,
}
/** Life speed per layer (lifetimes per second, scaled per particle). */
const RATE: Record<FireLayer, number> = { flames: 1.4, sparks: 0.9, embers: 0.1, smoke: 0.22 }

export const fireUniforms = { uFireTime: { value: 0 } }

function layerMaterial(layer: FireLayer, map: THREE.Texture): THREE.MeshBasicMaterial {
  const smoke = layer === 'smoke'
  const m = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending, fog: true })
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, fireUniforms)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uFireTime;
attribute vec4 aEmit; // xyz = emitter position, w = seed
attribute vec2 aFire; // x = bed radius, y = level
varying vec3 vFireCol;
varying float vFireA;`)
      .replace('#include <project_vertex>', `
float seed = aEmit.w;
vec3 h = fract(vec3(seed * 13.17, seed * 71.31, seed * 37.73) + vec3(0.11, 0.37, 0.71));
float aBed = aFire.x;
float aLevel = aFire.y;
float age = fract(uFireTime * ${RATE[layer].toFixed(2)} * (0.75 + 0.5 * h.z) + seed);
vec3 off; float size; vec3 col; float alpha;
${LAYER_GLSL[layer]}
vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
${layer === 'flames' ? 'float rot = (h.x - 0.5) * 0.6; vec2 q = vec2(position.x * cos(rot) - position.y * sin(rot), position.x * sin(rot) + position.y * cos(rot));' : 'vec2 q = position.xy;'}
vec3 wp = aEmit.xyz + off + (camR * q.x + camU * q.y) * size;
vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
gl_Position = projectionMatrix * mvPosition;
vFireCol = col;
vFireA = alpha;`)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFireCol;\nvarying float vFireA;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= vFireCol;\ndiffuseColor.a *= vFireA;')
  }
  m.customProgramCacheKey = () => `fire:${layer}`
  return m
}

export class FireParticles {
  group = new THREE.Group()
  private meshes = new Map<FireLayer, { mesh: THREE.InstancedMesh; emit: THREE.InstancedBufferAttribute; fire: THREE.InstancedBufferAttribute }>()
  private profile: QualityProfile
  private sig = ''
  private since = 1
  /** Instances per layer of the last rebuild (tests, gauges). */
  counts: Record<FireLayer, number> = { flames: 0, sparks: 0, embers: 0, smoke: 0 }
  rebuilds = 0

  constructor(profile: QualityProfile) {
    this.profile = profile
    const flame = flameTexture()
    const dot = dotTexture()
    const cap = PARTICLE_CAP.high
    for (const layer of LAYERS) {
      const geo = new THREE.PlaneGeometry(1, 1).translate(0, layer === 'flames' ? 0.4 : 0, 0)
      const emit = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4)
      const fire = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2)
      emit.setUsage(THREE.DynamicDrawUsage)
      fire.setUsage(THREE.DynamicDrawUsage)
      geo.setAttribute('aEmit', emit)
      geo.setAttribute('aFire', fire)
      const mesh = new THREE.InstancedMesh(geo, layerMaterial(layer, layer === 'flames' ? flame : dot), cap)
      mesh.count = 0
      mesh.frustumCulled = false
      mesh.renderOrder = layer === 'smoke' ? 3 : 2
      this.group.add(mesh)
      this.meshes.set(layer, { mesh, emit, fire })
    }
  }

  setQuality(profile: QualityProfile) {
    this.profile = profile
    this.sig = ''
  }

  /** Particle range of the current profile (the flame cone is drawn only beyond it). */
  get range() {
    return PARTICLE_RANGE[this.profile]
  }

  /**
   * Rewrites the instances when the set of emitters in range (or a level, rounded) changed — at most every
   * 0.25 s. Emitters are taken nearest first until the profile cap is reached.
   */
  update(fires: readonly FireEmitter[], n: number, cx: number, cz: number, dt: number, t: number) {
    fireUniforms.uFireTime.value = t
    this.since += dt
    const r2 = this.range ** 2
    const near: FireEmitter[] = []
    for (let i = 0; i < n; i++) {
      const e = fires[i]!
      if ((e.x - cx) ** 2 + (e.z - cz) ** 2 < r2) near.push(e)
    }
    const sig = near.map((e) => `${e.key}:${Math.round(e.level * 10)}:${Math.round(e.x * 4)}:${Math.round(e.z * 4)}`).join('|')
    // Held torches move with the actor: their positions change every frame, so they follow on the throttle.
    if (sig === this.sig || this.since < 0.25) return
    this.sig = sig
    this.since = 0
    this.rebuilds++
    near.sort((a, b) => (a.x - cx) ** 2 + (a.z - cz) ** 2 - ((b.x - cx) ** 2 + (b.z - cz) ** 2))
    const cap = PARTICLE_CAP[this.profile]
    let total = 0
    for (const layer of LAYERS) {
      const { mesh, emit, fire } = this.meshes.get(layer)!
      const ea = emit.array as Float32Array
      const fa = fire.array as Float32Array
      let k = 0
      for (const e of near) {
        const c = particleCount(layer, e.kind, e.level, this.profile)
        for (let j = 0; j < c && total < cap; j++) {
          ea.set([e.x, e.y, e.z, ((j * 0.6180339 + e.phase * 0.159) % 1)], k * 4)
          fa.set([BED[e.kind], e.level], k * 2)
          k++
          total++
        }
      }
      mesh.count = k
      emit.needsUpdate = true
      fire.needsUpdate = true
      this.counts[layer] = k
    }
  }
}
