/**
 * Baked tree impostors (render--007 step 3c, D-REN-15): at load every tree model is rendered from 8 azimuths
 * into one atlas (row = model, column = view). Beyond the model ring, trees are camera-facing quads that pick
 * the two nearest views for the camera direction relative to the tree's rotation and blend them, lit like the
 * ground (up normal) so they follow the sun and night. Model ↔ impostor transition = an ordered-dither
 * cross-fade over `TREE_FADE_M`, by the distance from the player (both sides use the same uniforms).
 * One draw call for all impostors (row per instance attribute). Replaces the procedural cone/blob impostors.
 * @domain render
 * @subdomain vegetation
 */
import * as THREE from 'three'
import type { TemplatePart } from './assets'

export const IMPOSTOR_VIEWS = 8
/** Width of the dithered model ↔ impostor cross-fade (m). */
export const TREE_FADE_M = 8
const MAX_ROWS = 16

/** Shared by the model fade-out (vegetation materials) and the impostor fade-in. */
export const treeFadeUniforms = {
  uTreeCenter: { value: new THREE.Vector2() },
  /** x = fade start, y = fade end (m from the player). */
  uTreeRing: { value: new THREE.Vector2(40, 48) },
}

const BAYER_GLSL = `
float svBayer4(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  int k = i.x + i.y * 4;
  float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return (m[k] + 0.5) / 16.0;
}`

/** Material clone of a tree model part that dithers out across the fade band (models end where impostors start). */
export function withTreeFadeOut(src: THREE.Material): THREE.Material {
  const m = src.clone()
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, treeFadeUniforms)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uTreeCenter;\nuniform vec2 uTreeRing;\nvarying float vTreeD;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  mat4 tM = modelMatrix;
  #ifdef USE_INSTANCING
  tM = tM * instanceMatrix;
  #endif
  vTreeD = distance((tM * vec4(0.0, 0.0, 0.0, 1.0)).xz, uTreeCenter);
  // Instances in the rebuild margin beyond the ring: collapsed (no rasterisation), not only discarded.
  if (vTreeD > uTreeRing.y + 0.5) transformed = vec3(0.0);
}`)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform vec2 uTreeRing;\nvarying float vTreeD;${BAYER_GLSL}`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (svBayer4(gl_FragCoord.xy) >= 1.0 - smoothstep(uTreeRing.x, uTreeRing.y, vTreeD)) discard;')
  }
  m.customProgramCacheKey = () => 'tree-fade-out'
  return m
}

export interface ImpostorAtlas {
  texture: THREE.Texture
  /** Row index per template key. */
  rows: Map<string, number>
  /** Per row: (half width, min y, max y, 0) in template units. */
  bounds: THREE.Vector4[]
  dispose(): void
}

/**
 * Renders each template from IMPOSTOR_VIEWS azimuths (horizontal, orthographic, fitted to the bounds) into one
 * RGBA atlas. Lighting: mostly ambient with a soft top-front light, so the runtime Lambert (sun + hemisphere)
 * does not light it twice.
 */
export function bakeImpostors(renderer: THREE.WebGLRenderer, templates: Map<string, TemplatePart[]>, cell: number): ImpostorAtlas {
  const keys = [...templates.keys()].slice(0, MAX_ROWS)
  const rt = new THREE.WebGLRenderTarget(cell * IMPOSTOR_VIEWS, cell * keys.length, { depthBuffer: true })
  rt.texture.colorSpace = THREE.SRGBColorSpace
  rt.texture.generateMipmaps = true
  rt.texture.minFilter = THREE.LinearMipmapLinearFilter
  rt.texture.magFilter = THREE.LinearFilter
  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0xffffff, 1.6))
  const sun = new THREE.DirectionalLight(0xffffff, 1.1)
  scene.add(sun, sun.target)
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  const prev = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), auto: renderer.autoClear, shadow: renderer.shadowMap.enabled }
  renderer.setRenderTarget(rt)
  renderer.setClearColor(0x000000, 0)
  renderer.autoClear = false
  renderer.clear()
  const bounds: THREE.Vector4[] = []
  const rows = new Map<string, number>()
  keys.forEach((key, row) => {
    const group = new THREE.Group()
    const box = new THREE.Box3()
    for (const p of templates.get(key)!) {
      group.add(new THREE.Mesh(p.geometry, p.material))
      p.geometry.computeBoundingBox()
      box.union(p.geometry.boundingBox!)
    }
    scene.add(group)
    const hw = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z)) * 1.02
    const b = new THREE.Vector4(hw, box.min.y, box.max.y, 0)
    bounds.push(b)
    rows.set(key, row)
    const d = hw * 4 + 2
    cam.left = -hw
    cam.right = hw
    cam.bottom = b.y
    cam.top = b.z
    cam.near = 0.01
    cam.far = d * 2
    for (let v = 0; v < IMPOSTOR_VIEWS; v++) {
      const a = (v / IMPOSTOR_VIEWS) * Math.PI * 2
      cam.position.set(Math.sin(a) * d, 0, Math.cos(a) * d)
      cam.lookAt(0, 0, 0)
      cam.updateProjectionMatrix()
      sun.position.set(Math.sin(a) * d, d * 1.4, Math.cos(a) * d)
      renderer.setViewport(v * cell, row * cell, cell, cell)
      renderer.render(scene, cam)
    }
    scene.remove(group)
  })
  renderer.setRenderTarget(prev.target)
  renderer.setClearColor(prev.color, prev.alpha)
  renderer.autoClear = prev.auto
  renderer.setViewport(0, 0, renderer.domElement.width / renderer.getPixelRatio(), renderer.domElement.height / renderer.getPixelRatio())
  return { texture: rt.texture, rows, bounds, dispose: () => rt.dispose() }
}

/** One instanced quad mesh for every impostor; per-instance `aImp` = (row, rotation). */
export function createImpostorMesh(atlas: ImpostorAtlas, cap: number): { mesh: THREE.InstancedMesh; imp: THREE.InstancedBufferAttribute } {
  const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0)
  geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3))
  const imp = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2)
  imp.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('aImp', imp)
  const mat = new THREE.MeshLambertMaterial({ map: atlas.texture, alphaTest: 0.4, side: THREE.DoubleSide })
  const rowsN = atlas.bounds.length
  const bounds = Array.from({ length: MAX_ROWS }, (_, i) => atlas.bounds[i] ?? new THREE.Vector4())
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, treeFadeUniforms, { uImpBounds: { value: bounds } })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform vec2 uTreeCenter;
uniform vec2 uTreeRing;
uniform vec4 uImpBounds[${MAX_ROWS}];
attribute vec2 aImp;
varying vec2 vImpUv;
varying float vImpView;
varying float vImpRow;
varying float vTreeD;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vec3 iO = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
float iS = length(instanceMatrix[0].xyz);
vec4 iB = uImpBounds[int(aImp.x + 0.5)];
vec3 iF = cameraPosition - iO;
iF.y = 0.0;
iF = normalize(iF + vec3(1e-4, 0.0, 0.0));
vec3 iR = vec3(iF.z, 0.0, -iF.x);
vec3 iW = iO + iR * position.x * 2.0 * iB.x * iS + vec3(0.0, mix(iB.y, iB.z, position.y) * iS, 0.0);
float iAz = atan(iF.x, iF.z) - aImp.y;
vImpView = mod(iAz / 6.2831853 * ${IMPOSTOR_VIEWS}.0, ${IMPOSTOR_VIEWS}.0);
vImpUv = vec2(position.x + 0.5, position.y);
vImpRow = aImp.x;
vTreeD = distance(iO.xz, uTreeCenter);
if (vTreeD < uTreeRing.x - 0.5) iW = iO; // inside the model ring (rebuild margin): collapsed`)
      .replace('#include <project_vertex>', 'vec4 mvPosition = viewMatrix * vec4(iW, 1.0);\ngl_Position = projectionMatrix * mvPosition;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec2 uTreeRing;
varying vec2 vImpUv;
varying float vImpView;
varying float vImpRow;
varying float vTreeD;${BAYER_GLSL}`)
      .replace('#include <map_fragment>', `
{
  float v0 = floor(vImpView);
  float t = vImpView - v0;
  vec2 cellUv = vec2(vImpUv.x, clamp(vImpUv.y, 0.002, 0.998));
  vec2 uv0 = vec2((v0 + cellUv.x) / ${IMPOSTOR_VIEWS}.0, (vImpRow + cellUv.y) / ${rowsN}.0);
  vec2 uv1 = vec2((mod(v0 + 1.0, ${IMPOSTOR_VIEWS}.0) + cellUv.x) / ${IMPOSTOR_VIEWS}.0, uv0.y);
  diffuseColor *= mix(texture2D(map, uv0), texture2D(map, uv1), t);
  if (svBayer4(gl_FragCoord.xy) >= smoothstep(uTreeRing.x, uTreeRing.y, vTreeD)) discard;
}`)
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);')
  }
  mat.customProgramCacheKey = () => `tree-impostor:${rowsN}`
  const mesh = new THREE.InstancedMesh(geo, mat, cap)
  mesh.frustumCulled = false
  mesh.count = 0
  mesh.castShadow = false
  mesh.receiveShadow = false
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  return { mesh, imp }
}
