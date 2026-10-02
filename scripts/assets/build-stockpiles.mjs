#!/usr/bin/env node
/**
 * Post-processes public/assets/stockpiles.glb exported by scripts/assets/blender-stockpiles.py (render--009):
 * weld + meshopt, identity wrapper node above each pile mesh (quantisation puts a scale on the mesh node and
 * render/assets.ts mergeTemplate drops the transform of the node it looks up by name), manifest entry.
 * Usage: node scripts/assets/build-stockpiles.mjs   (run after the Blender export; idempotent)
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const DST = path.join(ROOT, 'public/assets/stockpiles.glb')
await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(DST)
const scene = doc.getRoot().listScenes()[0]
for (const n of scene.listChildren()) {
  const mesh = n.getMesh()
  if (!mesh || !n.getName().startsWith('pile_')) continue // already wrapped (idempotent) or not a pile
  n.setMesh(null)
  n.addChild(doc.createNode(`${n.getName()}_mesh`).setMesh(mesh))
}
await doc.transform(dedup(), weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await io.write(DST, doc)
const kb = Math.round(fs.statSync(DST).size / 1024)
console.log(`${path.relative(ROOT, DST)}  ${kb} KB  piles: ${scene.listChildren().length}`)
const manifestPath = path.join(ROOT, 'public/assets/manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
manifest.files = manifest.files.filter((f) => f.dst !== 'public/assets/stockpiles.glb').concat({ src: 'scripts/assets/blender-stockpiles.py (own models, no external source)', dst: 'public/assets/stockpiles.glb', kb, tex: 0 })
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1))
