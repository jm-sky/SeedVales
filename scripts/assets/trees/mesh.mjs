/**
 * Plain-array mesh helpers for the tree pipeline (Node only, no Three.js, no Blender).
 * Mesh = { pos: Float32Array(3n), nrm: Float32Array(3n), uv: Float32Array(2n), ao: Float32Array(n), idx: Uint32Array }
 */
import { NodeIO } from '@gltf-transform/core'
import { MeshoptSimplifier } from 'meshoptimizer'

await MeshoptSimplifier.ready

export const triCount = (m) => m.idx.length / 3

/** Read a Quaternius glTF; split primitives into bark / leaf meshes (AO = source COLOR_0.r). */
export async function loadSource(path) {
  const doc = await new NodeIO().read(path)
  const out = { bark: null, leaf: null }
  for (const prim of doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())) {
    const col = prim.getAttribute('COLOR_0')
    const n = prim.getAttribute('POSITION').getCount()
    const ao = new Float32Array(n)
    for (let i = 0; i < n; i++) ao[i] = col ? 0.45 + 0.55 * col.getArray()[i * col.getElementSize()] : 1
    const mesh = {
      pos: Float32Array.from(prim.getAttribute('POSITION').getArray()),
      nrm: Float32Array.from(prim.getAttribute('NORMAL').getArray()),
      uv: Float32Array.from(prim.getAttribute('TEXCOORD_0').getArray()),
      ao,
      idx: Uint32Array.from(prim.getIndices().getArray()),
    }
    const isBark = /^Bark/.test(prim.getMaterial().getName())
    out[isBark ? 'bark' : 'leaf'] = mesh
  }
  return out
}

export function bounds(m) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < m.pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], m.pos[i + k])
      max[k] = Math.max(max[k], m.pos[i + k])
    }
  }
  return { min, max }
}

/** Uniform scale + translation applied in place (scale first, then offset). */
export function transformInPlace(m, scale, offset = [0, 0, 0], xz = 1) {
  for (let i = 0; i < m.pos.length; i += 3) {
    m.pos[i] = (m.pos[i] * scale + offset[0]) * xz
    m.pos[i + 1] = m.pos[i + 1] * scale + offset[1]
    m.pos[i + 2] = (m.pos[i + 2] * scale + offset[2]) * xz
  }
}

/** New mesh made of the listed triangles only, vertices compacted. */
export function subMesh(m, triIds) {
  const remap = new Map()
  const pos = []
  const nrm = []
  const uv = []
  const ao = []
  const idx = []
  for (const t of triIds) {
    for (let k = 0; k < 3; k++) {
      const v = m.idx[t * 3 + k]
      let nv = remap.get(v)
      if (nv === undefined) {
        nv = remap.size
        remap.set(v, nv)
        pos.push(m.pos[v * 3], m.pos[v * 3 + 1], m.pos[v * 3 + 2])
        nrm.push(m.nrm[v * 3], m.nrm[v * 3 + 1], m.nrm[v * 3 + 2])
        uv.push(m.uv[v * 2], m.uv[v * 2 + 1])
        ao.push(m.ao[v])
      }
      idx.push(nv)
    }
  }
  return { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), uv: Float32Array.from(uv), ao: Float32Array.from(ao), idx: Uint32Array.from(idx) }
}

/** Connected components of triangles (vertices welded by position, 0.1 mm grid). Returns per-triangle component id. */
export function components(m) {
  const key = new Map()
  const weld = new Int32Array(m.pos.length / 3)
  for (let v = 0; v < weld.length; v++) {
    const k = `${Math.round(m.pos[v * 3] * 1e4)},${Math.round(m.pos[v * 3 + 1] * 1e4)},${Math.round(m.pos[v * 3 + 2] * 1e4)}`
    let id = key.get(k)
    if (id === undefined) key.set(k, (id = key.size))
    weld[v] = id
  }
  const parent = Int32Array.from({ length: key.size }, (_, i) => i)
  const find = (a) => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]]
    return a
  }
  const nTri = triCount(m)
  for (let t = 0; t < nTri; t++) {
    const a = find(weld[m.idx[t * 3]])
    for (let k = 1; k < 3; k++) parent[find(weld[m.idx[t * 3 + k]])] = a
  }
  const ids = new Map()
  const tri = new Int32Array(nTri)
  for (let t = 0; t < nTri; t++) {
    const r = find(weld[m.idx[t * 3]])
    let id = ids.get(r)
    if (id === undefined) ids.set(r, (id = ids.size))
    tri[t] = id
  }
  return { tri, count: ids.size }
}

/** Meshopt simplification keeping normals and UVs weighted in; returns a compacted mesh. */
export function simplifyMesh(m, targetTris, { error = 0.05, normalWeight = 0.5, uvWeight = 0.02, flags = ['Permissive'] } = {}) {
  const n = m.pos.length / 3
  const attrs = new Float32Array(n * 5)
  for (let v = 0; v < n; v++) {
    attrs.set(m.nrm.subarray(v * 3, v * 3 + 3), v * 5)
    attrs.set(m.uv.subarray(v * 2, v * 2 + 2), v * 5 + 3)
  }
  const [idx] = MeshoptSimplifier.simplifyWithAttributes(m.idx, m.pos, 3, attrs, 5, [normalWeight, normalWeight, normalWeight, uvWeight, uvWeight], null, targetTris * 3, error, flags)
  const tris = []
  for (let t = 0; t < idx.length / 3; t++) tris.push(t)
  return subMesh({ ...m, idx }, tris)
}

export function area(m, t) {
  const [a, b, c] = [0, 1, 2].map((k) => m.idx[t * 3 + k] * 3)
  const ux = m.pos[b] - m.pos[a], uy = m.pos[b + 1] - m.pos[a + 1], uz = m.pos[b + 2] - m.pos[a + 2]
  const vx = m.pos[c] - m.pos[a], vy = m.pos[c + 1] - m.pos[a + 1], vz = m.pos[c + 2] - m.pos[a + 2]
  return 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)
}

/** Concatenate meshes (same attribute set). */
export function concat(list) {
  const r = { pos: [], nrm: [], uv: [], ao: [], idx: [] }
  let base = 0
  for (const m of list) {
    r.pos.push(...m.pos)
    r.nrm.push(...m.nrm)
    r.uv.push(...m.uv)
    r.ao.push(...m.ao)
    for (const i of m.idx) r.idx.push(i + base)
    base += m.pos.length / 3
  }
  return { pos: Float32Array.from(r.pos), nrm: Float32Array.from(r.nrm), uv: Float32Array.from(r.uv), ao: Float32Array.from(r.ao), idx: Uint32Array.from(r.idx) }
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
