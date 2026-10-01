#!/usr/bin/env node
/**
 * Builds public/assets/landmarks.glb (world--001 step 1, D-REN-10) from poly.pizza downloads in _temp/:
 *   Modular Ruins Pack (Quaternius, CC0)  → Ruin_* pieces       (stylised, matches the Medieval Village kit)
 *   Rocks (Quaternius, CC0)               → Stone_1..5          (standing stones of the stone circle)
 *   Ship Wreck (Kenney, CC0)              → Wreck_Ship
 *   Sail Boat (Quaternius, CC0)           → Wreck_Boat          (hull only; the sail is dropped)
 * Each kept node gets its origin at the XZ centre / base (y=0) and a uniform scale baked into the vertices
 * (render/assets.ts mergeTemplate discards node transforms). Node names are listed in render/assetNames.ts.
 * Texture class: ≤ 512 px (D-REN-10 landmark class, see docs/assets/README.md "Budgets").
 *
 * Usage: node scripts/assets/build-landmarks.mjs
 */
import { Document, getBounds, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, mergeDocuments, meshopt, prune, textureCompress, unpartition } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, '_temp')
const DST = path.join(ROOT, 'public/assets/landmarks.glb')
await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

/** source file → { source node: [output name, uniform scale, y offset (m, after scale)] } */
const PIECES = {
  'Modular Ruins Pack by Quaternius - F2LAK03B0r.glb': {
    Wall_Broken: ['Ruin_Wall_Broken', 1.5],
    Wall_Hole: ['Ruin_Wall_Hole', 1.5],
    Wall_Half: ['Ruin_Wall_Half', 1.5],
    Wall_Overgrown: ['Ruin_Wall_Overgrown', 1.5],
    Wall_Double_Broken: ['Ruin_Wall_Double_Broken', 1.5],
    Wall_ArchRound_Broken: ['Ruin_Arch_Broken', 0.9],
    Column_Round: ['Ruin_Column', 0.75],
    Column_Round_Short: ['Ruin_Column_Short', 0.75],
    Floor_Standard_Half: ['Ruin_Floor', 1.5],
    Bricks: ['Ruin_Bricks', 1.5],
  },
  'Rocks by Quaternius - gYhoEOKItJ.glb': {
    Rock_4: ['Stone_1', 1.6],
    Rock_1: ['Stone_2', 1.8],
    Rock_2: ['Stone_3', 1.6],
    Rock_3: ['Stone_4', 1.8],
    Rock_5: ['Stone_5', 1.5],
  },
  'Ship Wreck by Kenney - 4qia78IBmZ.glb': { ship_wreck_8angles: ['Wreck_Ship', 0.2] },
  'Sail Boat by Quaternius - BgSZXwmm7k.glb': { Boat: ['Wreck_Boat', 5] },
}

// Empty document; every source is merged in, wanted nodes are re-created under one scene, the rest is dropped.
const clean = new Document()
const scene = clean.createScene('landmarks')
for (const [file, nodes] of Object.entries(PIECES)) {
  const src = await io.read(path.join(SRC, file))
  mergeDocuments(clean, src)
  // After merge the source nodes live in `clean` (as separate nodes); find by name, keep the wanted ones.
  for (const n of clean.getRoot().listNodes()) {
    const spec = nodes[n.getName()]
    if (!spec || !n.getMesh()) continue
    const [name, scale] = spec
    const mesh = n.getMesh()
    // Bake world transform (parent chain × scale) into the positions; recentre XZ, base at y=0.
    const wm = n.getWorldMatrix()
    const bounds = getBounds(n)
    const cx = (bounds.min[0] + bounds.max[0]) / 2
    const cz = (bounds.min[2] + bounds.max[2]) / 2
    const by = bounds.min[1]
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      const v = [0, 0, 0]
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v)
        const x = wm[0] * v[0] + wm[4] * v[1] + wm[8] * v[2] + wm[12]
        const y = wm[1] * v[0] + wm[5] * v[1] + wm[9] * v[2] + wm[13]
        const z = wm[2] * v[0] + wm[6] * v[1] + wm[10] * v[2] + wm[14]
        pos.setElement(i, [(x - cx) * scale, (y - by) * scale, (z - cz) * scale])
      }
    }
    // Identity wrapper above the mesh node: quantisation (meshopt) puts its dequantisation scale on the mesh
    // node, and render/assets.ts mergeTemplate drops the transform of the node it looks up by name.
    const keep = clean.createNode(name)
    keep.addChild(clean.createNode(`${name}_mesh`).setMesh(mesh))
    scene.addChild(keep)
    nodes[n.getName()] = null // consumed
  }
}
// Remove the unused source nodes/scenes.
const kept = new Set()
scene.traverse((n) => kept.add(n))
for (const n of clean.getRoot().listNodes()) if (!kept.has(n)) n.dispose()
for (const s of clean.getRoot().listScenes()) if (s !== scene) s.dispose()

await clean.transform(
  unpartition(),
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [512, 512] }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
)
await io.write(DST, clean)
const kb = Math.round(fs.statSync(DST).size / 1024)
const names = scene.listChildren().map((n) => n.getName())
console.log(`${path.relative(ROOT, DST)}  ${kb} KB  nodes: ${names.join(', ')}`)
const left = Object.values(PIECES).flatMap((p) => Object.entries(p).filter(([, v]) => v).map(([k]) => k))
if (left.length) { console.error('missing source nodes:', left.join(', ')); process.exit(1) }

const manifestPath = path.join(ROOT, 'public/assets/manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
manifest.files = manifest.files.filter((f) => f.dst !== 'public/assets/landmarks.glb').concat({ src: '_temp/*.glb (poly.pizza: Quaternius ruins/rocks/sail boat, Kenney ship wreck)', dst: 'public/assets/landmarks.glb', kb, tex: 512 })
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1))
