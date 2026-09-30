/**
 * Asset loading (GLB + meshopt), cached; timings recorded in diag (assets.*).
 * Templates merge model parts per material so repeated objects render as InstancedMesh.
 * @domain render
 * @subdomain assets
 */
import * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { perf } from '../diag/perf'

const BASE = `${import.meta.env.BASE_URL}assets/`
const loader = new GLTFLoader()
loader.setMeshoptDecoder(MeshoptDecoder)
const cache = new Map<string, Promise<GLTF>>()

export function loadGltf(rel: string): Promise<GLTF> {
  let p = cache.get(rel)
  if (!p) {
    const t0 = performance.now()
    p = loader.loadAsync(BASE + rel).then((g) => {
      perf.record('assets.load', performance.now() - t0)
      perf.count('assets.loaded')
      return g
    })
    p.catch(() => perf.count('assets.failed'))
    cache.set(rel, p)
  }
  return p
}

/** Finds a named top-level node in a pack GLB. */
export function packNode(g: GLTF, name: string): THREE.Object3D | undefined {
  return g.scene.getObjectByName(name)
}

export interface TemplatePart {
  geometry: THREE.BufferGeometry
  material: THREE.Material
}

/** Merge meshes of several objects (with extra transforms) into one geometry per material. */
export function mergeTemplate(items: { obj: THREE.Object3D; matrix: THREE.Matrix4 }[]): TemplatePart[] {
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>()
  for (const { obj, matrix } of items) {
    obj.updateWorldMatrix(true, true)
    const rootInv = new THREE.Matrix4().copy(obj.matrixWorld).invert()
    obj.traverse((c) => {
      const m = c as THREE.Mesh
      if (!m.isMesh) return
      const mat = toLambert(Array.isArray(m.material) ? m.material[0]! : m.material)
      const g = m.geometry.clone()
      // Keep only attributes common to merging.
      for (const k of Object.keys(g.attributes)) if (!['color', 'normal', 'position', 'uv'].includes(k)) g.deleteAttribute(k)
      for (const k of Object.keys(g.attributes)) g.setAttribute(k, toFloat32(g.getAttribute(k) as THREE.BufferAttribute))
      if (!g.attributes.normal) g.computeVertexNormals()
      const local = new THREE.Matrix4().multiplyMatrices(rootInv, m.matrixWorld)
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(matrix, local))
      const arr = byMat.get(mat) ?? []
      arr.push(g.index ? g.toNonIndexed() : g)
      byMat.set(mat, arr)
    })
  }
  const out: TemplatePart[] = []
  for (const [material, geos] of byMat) {
    // Align attribute sets (uv/color may be missing on some parts).
    const hasUv = geos.every((g) => g.attributes.uv)
    const hasColor = geos.every((g) => g.attributes.color)
    for (const g of geos) {
      if (!hasUv && g.attributes.uv) g.deleteAttribute('uv')
      if (!hasColor && g.attributes.color) g.deleteAttribute('color')
    }
    const merged = mergeGeometries(geos, false)
    if (merged) {
      merged.computeBoundingSphere()
      out.push({ geometry: merged, material })
    }
  }
  return out
}

/** Simple procedural part helper (for placeholders and procedural structures). */
export function part(geo: THREE.BufferGeometry, color: number, m = new THREE.Matrix4()): { obj: THREE.Object3D; matrix: THREE.Matrix4 } {
  const mesh = new THREE.Mesh(geo, sharedColorMat(color))
  return { obj: mesh, matrix: m }
}

const colorMats = new Map<number, THREE.MeshLambertMaterial>()
export function sharedColorMat(color: number): THREE.MeshLambertMaterial {
  let m = colorMats.get(color)
  if (!m) colorMats.set(color, (m = new THREE.MeshLambertMaterial({ color, flatShading: true })))
  return m
}

export const mat4 = (x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz))

const lambertCache = new Map<THREE.Material, THREE.Material>()
/** Converts glTF PBR materials to cheaper Lambert (baseColor map + alpha test) — low-poly look. */
export function toLambert(src: THREE.Material): THREE.Material {
  if (!(src as THREE.MeshStandardMaterial).isMeshStandardMaterial) return src
  let m = lambertCache.get(src)
  if (!m) {
    const s = src as THREE.MeshStandardMaterial
    m = new THREE.MeshLambertMaterial({
      map: s.map,
      color: s.color,
      alphaTest: s.alphaTest || (s.transparent ? 0.5 : 0),
      side: s.side,
      vertexColors: s.vertexColors,
    })
    lambertCache.set(src, m)
  }
  return m
}

/** De-quantize (meshopt/KHR_mesh_quantization) attributes so geometries can be merged. */
function toFloat32(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): THREE.BufferAttribute {
  if (a instanceof THREE.BufferAttribute && a.array instanceof Float32Array && !a.normalized) return a
  const n = a.count
  const s = a.itemSize
  const out = new Float32Array(n * s)
  for (let i = 0; i < n; i++) {
    out[i * s] = a.getX(i)
    if (s > 1) out[i * s + 1] = a.getY(i)
    if (s > 2) out[i * s + 2] = a.getZ(i)
    if (s > 3) out[i * s + 3] = a.getW(i)
  }
  return new THREE.BufferAttribute(out, s)
}
