#!/usr/bin/env node
/**
 * Asset inspection (Node, no Blender — D-REN-8).
 *   node inspect-pack.mjs <file.glb>            bounds (m) and triangles of each top-level node
 *   node inspect-pack.mjs --audit [dir|files…]  one table row per .glb (default: public/assets): size, tris,
 *                                               meshes/prims, materials, textures, animations, skinned; `--md` = markdown
 */
import { getBounds, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

const primTris = (p) => (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3

function listGlb(path) {
  if (statSync(path).isFile()) return [path]
  return readdirSync(path, { withFileTypes: true }).flatMap((e) => {
    const p = join(path, e.name)
    return e.isDirectory() ? listGlb(p) : e.name.endsWith('.glb') ? [p] : []
  })
}

async function audit(file) {
  const doc = await io.read(file)
  const root = doc.getRoot()
  let tris = 0
  let prims = 0
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { prims++; tris += primTris(p) }
  // triangles of what a scene instance draws (mesh reused by several nodes counts per node)
  let sceneTris = 0
  for (const n of (root.getDefaultScene() ?? root.listScenes()[0])?.listChildren() ?? []) {
    n.traverse((c) => c.getMesh()?.listPrimitives().forEach((p) => (sceneTris += primTris(p))))
  }
  const texs = root.listTextures().map((t) => {
    const s = t.getSize()
    return `${s ? s.join('x') : '?'} ${t.getMimeType().replace('image/', '')}`
  })
  const clips = root.listAnimations().map((a) => a.getName())
  const ext = root.listExtensionsUsed().map((e) => e.extensionName.replace('EXT_', '').replace('KHR_', ''))
  return {
    kb: Math.round(statSync(file).size / 1024),
    tris: Math.round(tris),
    sceneTris: Math.round(sceneTris),
    nodes: root.listNodes().length,
    meshes: root.listMeshes().length,
    prims,
    mats: root.listMaterials().length,
    texs,
    clips,
    skins: root.listSkins().length,
    ext,
  }
}

const args = process.argv.slice(2)
if (args[0] === '--audit') {
  const md = args.includes('--md')
  const targets = args.slice(1).filter((a) => !a.startsWith('--'))
  const files = (targets.length ? targets : ['public/assets']).flatMap(listGlb).sort()
  const rows = []
  for (const f of files) rows.push({ f: relative(process.cwd(), f).replaceAll('\\', '/'), ...(await audit(f)) })
  const cols = ['file', 'KB', 'tris (unique)', 'tris (scene)', 'nodes', 'meshes/prims', 'mats', 'textures', 'anims', 'skin']
  const cells = rows.map((r) => [
    r.f, r.kb, r.tris, r.sceneTris, r.nodes, `${r.meshes}/${r.prims}`, r.mats,
    r.texs.length ? [...new Set(r.texs)].join('; ') + (r.texs.length > 1 ? ` (×${r.texs.length})` : '') : '—',
    r.clips.length ? `${r.clips.length}: ${r.clips.slice(0, 6).join(',')}${r.clips.length > 6 ? ',…' : ''}` : '—',
    r.skins ? `yes (${r.skins})` : 'no',
  ])
  if (md) {
    console.log(`| ${cols.join(' | ')} |`)
    console.log(`|${cols.map(() => '---').join('|')}|`)
    for (const c of cells) console.log(`| ${c.join(' | ')} |`)
  } else {
    console.log(cols.join('\t'))
    for (const c of cells) console.log(c.join('\t'))
  }
  const tot = rows.reduce((a, r) => ({ kb: a.kb + r.kb, tris: a.tris + r.tris }), { kb: 0, tris: 0 })
  console.log(`\nTotal: ${rows.length} files, ${(tot.kb / 1024).toFixed(2)} MB, ${tot.tris} unique tris`)
} else {
  const doc = await io.read(args[0])
  for (const n of doc.getRoot().getDefaultScene()?.listChildren() ?? doc.getRoot().listScenes()[0].listChildren()) {
    const b = getBounds(n)
    let tris = 0
    n.traverse((c) => c.getMesh()?.listPrimitives().forEach((p) => (tris += primTris(p))))
    console.log(n.getName().padEnd(34), 'min', b.min.map((v) => v.toFixed(2)).join(','), 'max', b.max.map((v) => v.toFixed(2)).join(','), 'tris', tris)
  }
}
