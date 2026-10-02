import type { WeatherState } from '../sim/types'
/**
 * Shared wind (render--007 step 1): one uniform block (render seconds + direction/strength from the
 * weather) and one GLSL chunk injected into materials with `onBeforeCompile`, used by grass, tree
 * leaves/branches, reeds and bushes. Sway = f(world position phase, height mask); strength 0 = no
 * displacement. Depth/distance materials get the same deformation so shadows follow.
 * Wind is derived from the weather state (no sim state, nothing to save).
 * @domain render
 * @subdomain wind
 */
import type * as THREE from 'three'

/** Shared by every wind material: x,y = unit direction in world XZ, z = strength 0..1.5. */
export const windUniforms = {
  uWindTime: { value: 0 },
  uWind: { value: { x: 1, y: 0, z: 0 } as { x: number; y: number; z: number } },
}

/** Base strength per weather kind (a calm day still moves the grass a little). */
const BASE: Record<WeatherState['kind'], number> = { clear: 0.3, overcast: 0.45, rain: 0.65, snow: 0.35, storm: 1.2 }

/** Pure: wind strength for a weather state. */
export function windStrength(w: Pick<WeatherState, 'kind' | 'intensity'>): number {
  return BASE[w.kind] * (w.kind === 'clear' || w.kind === 'overcast' ? 1 : 0.7 + 0.3 * Math.min(1, w.intensity))
}

/** Pure: prevailing direction drifts slowly with the calendar (radians; one turn per ~11 days). */
export function windAngle(calS: number): number {
  return (calS / (11 * 86400)) * Math.PI * 2 + Math.sin(calS / 40000) * 0.6
}

export function updateWind(renderS: number, weather: Pick<WeatherState, 'kind' | 'intensity'>, calS: number) {
  const a = windAngle(calS)
  const u = windUniforms.uWind.value
  u.x = Math.cos(a)
  u.y = Math.sin(a)
  u.z = windStrength(weather)
  windUniforms.uWindTime.value = renderS
}

/**
 * Vertex GLSL. `svWindOffset` returns a WORLD-space displacement for a vertex whose height above the
 * base is `h` metres; `mask` (0..1, 0 at the root) comes from the caller. Gusts = two travelling sines
 * along the wind direction + a small per-position flutter; everything is multiplied by uWind.z.
 */
export const WIND_GLSL_DECL = `
uniform float uWindTime;
uniform vec3 uWind;
uniform float uWindAmp;
vec3 svWindOffset(vec3 originWorld, float mask) {
  vec2 d = uWind.xy;
  float along = dot(originWorld.xz, d);
  float gust = sin(along * 0.11 - uWindTime * (0.9 + uWind.z)) * 0.6 + sin(along * 0.37 - uWindTime * 2.1) * 0.4;
  float flutter = sin(uWindTime * 3.1 + originWorld.x * 1.7 + originWorld.z * 2.3) * 0.25;
  float s = (0.55 + 0.45 * gust + flutter * uWind.z) * uWind.z * uWindAmp * mask * mask;
  return vec3(d.x, -0.15 * abs(s), d.y) * s;
}
`

export interface WindOptions {
  /** Max sway at mask = 1, metres (default 0.25). */
  amplitude?: number
  /** Height (metres, local y) at which the mask reaches 1 (default 1). */
  heightScale?: number
  /** Per-vertex mask instead of the height ramp: `{ decl, expr }`, e.g. a baked wind-weight attribute. */
  mask?: { decl: string; expr: string }
}

/** The vertex-shader hook: runs after `begin_vertex`, adds the world offset converted to local space. */
export function windVertexChunk(heightScale: number, maskExpr?: string): string {
  return `
{
  mat4 svM = modelMatrix;
  #ifdef USE_INSTANCING
  svM = svM * instanceMatrix;
  #endif
  vec3 svOrigin = (svM * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float svMask = ${maskExpr ?? `clamp(position.y / ${heightScale.toFixed(3)}, 0.0, 1.0)`};
  transformed += inverse(mat3(svM)) * svWindOffset(svOrigin, svMask);
}`
}

/** Patch a material (colour, depth or distance) so its vertices sway with the shared wind. */
export function applyWind(material: THREE.Material, opts: WindOptions = {}) {
  const amp = opts.amplitude ?? 0.25
  const hs = opts.heightScale ?? 1
  const prev = material.onBeforeCompile
  material.onBeforeCompile = (sh, renderer) => {
    prev?.call(material, sh, renderer)
    sh.uniforms.uWindTime = windUniforms.uWindTime
    sh.uniforms.uWind = windUniforms.uWind
    sh.uniforms.uWindAmp = { value: amp }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${WIND_GLSL_DECL}${opts.mask ? `\n${opts.mask.decl}` : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${windVertexChunk(hs, opts.mask?.expr)}`)
  }
  const prevKey = material.customProgramCacheKey
  material.customProgramCacheKey = () => `${prevKey.call(material)}|wind:${hs}${opts.mask ? `:${opts.mask.expr}` : ''}`
}
