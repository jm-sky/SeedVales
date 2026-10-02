/**
 * Water surface material (render--007 step 4, RENDER-05; replaces the flat blue Lambert): one material for
 * rivers, lakes and the sea on every profile. Per-vertex depth (`aDepth` = water surface − terrain, written at
 * mesh build) drives the shallow → deep colour and the soft shore fade; analytic travelling waves (no texture,
 * continuous across chunks in world XZ) perturb the normal for a Fresnel reflection of the shared atmosphere
 * sky colours and a sun glint (off on low). Transparent, no depth write, drawn before particles.
 * @domain render
 * @subdomain water
 */
import * as THREE from 'three'

/** Updated by the renderer each frame (atmosphere + render clock). */
export const waterUniforms = {
  uWTime: { value: 0 },
  uSkyZen: { value: new THREE.Color(0x6f9fd8) },
  uSkyHor: { value: new THREE.Color(0xc4d8ea) },
  uSunDirW: { value: new THREE.Vector3(0.3, 0.8, 0.3).normalize() },
  uSunCol: { value: new THREE.Color(0xffffff) },
}

const SHALLOW = new THREE.Color(0x6f6a4e)
const DEEP = new THREE.Color(0x1b4a58)

export interface WaterMaterial {
  material: THREE.MeshLambertMaterial
  /** 1 = glint + fine ripples (medium/high), 0 = low. */
  detail: { value: number }
}

export function createWaterMaterial(detail: boolean): WaterMaterial {
  const d = { value: detail ? 1 : 0 }
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, depthWrite: false })
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, waterUniforms, { uWDetail: d, uShallow: { value: SHALLOW }, uDeep: { value: DEEP } })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aDepth;\nvarying float vWDepth;\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWDepth = aDepth;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uWTime;
uniform vec3 uSkyZen;
uniform vec3 uSkyHor;
uniform vec3 uSunDirW;
uniform vec3 uSunCol;
uniform float uWDetail;
uniform vec3 uShallow;
uniform vec3 uDeep;
varying float vWDepth;
varying vec3 vWPos;
// Sum of travelling directional waves → surface gradient → normal (world space).
vec3 svWaterNormal(vec2 p, float t) {
  vec2 g = vec2(0.0);
  // Incommensurate directions/frequencies so no regular stripe pattern appears.
  vec2 d1 = vec2(0.8, 0.6); g += d1 * cos(dot(p, d1) * 0.73 + t * 1.1) * 0.024;
  vec2 d2 = vec2(-0.5, 0.86); g += d2 * cos(dot(p, d2) * 1.37 + t * 1.6 + sin(p.x * 0.11) * 2.0) * 0.022;
  vec2 d3 = vec2(0.31, -0.95); g += d3 * cos(dot(p, d3) * 2.71 + t * 2.3 + sin(p.y * 0.17) * 2.0) * 0.018;
  vec2 d4 = vec2(-0.93, -0.37); g += d4 * cos(dot(p, d4) * 4.93 + t * 3.0) * 0.014 * uWDetail;
  vec2 d5 = vec2(0.6, -0.8); g += d5 * cos(dot(p, d5) * 7.9 + t * 3.7 + sin(p.x * 0.37 + p.y * 0.29) * 3.0) * 0.01 * uWDetail;
  return normalize(vec3(-g.x, 1.0, -g.y));
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float svDeep = smoothstep(0.15, 3.0, vWDepth);
diffuseColor.rgb = mix(uShallow, uDeep, svDeep);
diffuseColor.a = smoothstep(0.0, 0.45, vWDepth) * mix(0.6, 0.92, svDeep);`)
      .replace('#include <opaque_fragment>', `{
  vec3 N = svWaterNormal(vWPos.xz, uWTime);
  vec3 V = normalize(cameraPosition - vWPos);
  // Fresnel capped at 0.6: from the low third-person camera most water is seen at grazing angles, and a full
  // mirror of the pale horizon turned rivers silver-grey (first A/B).
  float fres = 0.02 + 0.58 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(uSkyHor, uSkyZen, clamp(R.y * 3.0 + 0.2, 0.0, 1.0));
  outgoingLight = mix(outgoingLight, sky, fres);
  outgoingLight += uSunCol * pow(max(dot(R, uSunDirW), 0.0), 220.0) * 1.6 * uWDetail;
  diffuseColor.a = max(diffuseColor.a, fres * smoothstep(0.0, 0.3, vWDepth));
}
#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => 'water'
  return { material, detail: d }
}
