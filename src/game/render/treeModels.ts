/**
 * Offline tree assets (render--007 step 3, Blender/Node session 12; contract `docs/design/render-tree-assets-contract.md`):
 * `trees.glb` (per variant LOD0 + LOD1, materials Bark + Leaves) and the baked 8-view impostor atlas
 * (`trees-impostors.png` + `.json`). `COLOR_0` = (wind weight, baked AO, 1) is renamed to `aTreeVC` so three never
 * uses it as a diffuse colour (the bark would turn teal); materials are rebuilt as Lambert like the rest of the scene.
 * @domain render
 * @subdomain vegetation
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ImpostorAtlas } from './treeImpostors'
import { loadGltf, type TemplatePart, toFloat32 } from './assets'

/** Node kind → variants (root node names in `trees.glb`). */
export const TREE_VARIANTS: Record<string, string[]> = {
  tree_broad: ['Broadleaf_A', 'Broadleaf_B', 'Broadleaf_C'],
  tree_apple: ['Apple_A'],
  tree_pine: ['Pine_A', 'Pine_B'],
  tree_dead: ['Dead_A'],
}

/** Wind of the offline assets: baked weight in `aTreeVC.r` (0 at the trunk base, 1 at twig tips), metres. */
export const ASSET_TREE_WIND = { amplitude: 0.35, heightScale: 1, mask: { decl: 'attribute vec3 aTreeVC;', expr: 'aTreeVC.r' } }

export interface TreeAssets {
  /** Template per `${variant}#0` (LOD0) and `${variant}#1` (LOD1). */
  templates: Map<string, TemplatePart[]>
  /** Variant height (m) — instances scale to the node height. */
  maxY: Map<string, number>
  atlas: ImpostorAtlas
}

interface AtlasJson {
  views: number
  cell: number
  rowOrigin: 'bottom' | 'top'
  rows: { name: string; kind: string; halfWidth: number; minY: number; maxY: number }[]
}

/** One merged geometry per material (Bark / Leaves) for a LOD node; keeps position, normal, uv, aTreeVC. */
function lodTemplate(node: THREE.Object3D, mats: Map<string, THREE.Material>): TemplatePart[] {
  node.updateWorldMatrix(true, true)
  const rootInv = new THREE.Matrix4().copy(node.matrixWorld).invert()
  const byMat = new Map<string, THREE.BufferGeometry[]>()
  node.traverse((c) => {
    const mesh = c as THREE.Mesh
    if (!mesh.isMesh) return
    const src = (Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material) as THREE.MeshStandardMaterial
    const g = new THREE.BufferGeometry()
    const pos = toFloat32(mesh.geometry.getAttribute('position') as THREE.BufferAttribute)
    g.setAttribute('position', pos.clone())
    const n = mesh.geometry.getAttribute('normal')
    if (n) g.setAttribute('normal', toFloat32(n as THREE.BufferAttribute).clone())
    const uv = mesh.geometry.getAttribute('uv')
    if (uv) g.setAttribute('uv', toFloat32(uv as THREE.BufferAttribute).clone())
    const col = mesh.geometry.getAttribute('color')
    if (col) {
      const c3 = toFloat32(col as THREE.BufferAttribute)
      const out = new Float32Array(c3.count * 3)
      for (let i = 0; i < c3.count; i++) out.set([c3.getX(i), c3.getY(i), c3.getZ(i)], i * 3)
      g.setAttribute('aTreeVC', new THREE.BufferAttribute(out, 3))
    } else g.setAttribute('aTreeVC', new THREE.BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3))
    if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone())
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld))
    const key = src.name || src.uuid
    if (!mats.has(key)) {
      mats.set(key, new THREE.MeshLambertMaterial({ name: key, map: src.map, alphaTest: src.alphaTest || 0, side: src.side, vertexColors: false }))
    }
    const list = byMat.get(key) ?? []
    list.push(g.index ? g.toNonIndexed() : g)
    byMat.set(key, list)
  })
  const out: TemplatePart[] = []
  for (const [key, geos] of byMat) {
    const merged = mergeGeometries(geos, false)
    if (!merged) continue
    merged.computeBoundingSphere()
    out.push({ geometry: merged, material: mats.get(key)! })
  }
  return out
}

/** Loads trees.glb + the offline impostor atlas; rejects if anything is missing (the caller keeps the kit path). */
export async function loadTreeAssets(opts: { normals?: boolean } = {}): Promise<TreeAssets> {
  const [gltf, json, texture] = await Promise.all([
    loadGltf('trees.glb'),
    fetch(`${import.meta.env.BASE_URL}assets/trees-impostors.json`).then((r) => {
      if (!r.ok) throw new Error(`trees-impostors.json: ${r.status}`)
      return r.json() as Promise<AtlasJson>
    }),
    new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}assets/trees-impostors.png`),
  ])
  texture.colorSpace = THREE.SRGBColorSpace
  // Default flipY: image bottom = v 0, matching rowOrigin "bottom" (row 0 at v 0).
  if (json.rowOrigin !== 'bottom') throw new Error('trees-impostors.json: rowOrigin must be "bottom"')
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  const mats = new Map<string, THREE.Material>()
  const templates = new Map<string, TemplatePart[]>()
  const maxY = new Map<string, number>()
  const rows = new Map<string, number>()
  const bounds: THREE.Vector4[] = []
  json.rows.forEach((r, i) => {
    const root = gltf.scene.getObjectByName(r.name)
    const l0 = root?.getObjectByName('LOD0') ?? root?.children.find((c) => c.name.startsWith('LOD0'))
    const l1 = root?.getObjectByName('LOD1') ?? root?.children.find((c) => c.name.startsWith('LOD1'))
    if (!root || !l0 || !l1) throw new Error(`trees.glb: ${r.name} LOD0/LOD1 missing`)
    templates.set(`${r.name}#0`, lodTemplate(l0, mats))
    templates.set(`${r.name}#1`, lodTemplate(l1, mats))
    maxY.set(r.name, r.maxY)
    rows.set(r.name, i)
    bounds.push(new THREE.Vector4(r.halfWidth, r.minY, r.maxY, 0))
  })
  // Optional normal atlas (data, not colour: linear). Missing → impostors keep the up normal.
  const normal = opts.normals === false ? undefined : await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}assets/trees-impostors-normal.png`).catch(() => undefined)
  if (normal) {
    normal.colorSpace = THREE.NoColorSpace
    normal.generateMipmaps = true
    normal.minFilter = THREE.LinearMipmapLinearFilter
  }
  return { templates, maxY, atlas: { texture, rows, bounds, normal, dispose: () => { texture.dispose(); normal?.dispose() } } }
}
