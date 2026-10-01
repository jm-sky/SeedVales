#!/usr/bin/env node
/**
 * Builds extra character outfit variants into public/assets/characters/ from the full
 * "Modular Character Outfits - Fantasy [Source]" pack (_temp/extracted/, CC0). Node only (D-REN-8).
 * Same recipe as the Peasant/Ranger outfits: base-colour map only, 512 px, simplify, join parts per
 * material, meshopt. All outfits share one 65-bone UBC skeleton (one skin), so parts can be dropped
 * or recombined freely and every variant plays the shared anims.glb clips.
 *
 * A variant = { name, source outfit, parts to drop }. Adding a cheap variant is one line in VARIANTS
 * (e.g. Knight with helmet, Ranger without hood, Wizard) — see docs/plans/render--005.
 *
 * Usage: node scripts/assets/build-characters.mjs [variantName…]   (no manifest.json write: owned by the other build scripts)
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, flatten, join, meshopt, prune, resample, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, '_temp/extracted/Modular Character Outfits - Fantasy[Source]/Exports/glTF (Godot-Unreal)/Outfits')
const OUT = path.join(ROOT, 'public/assets/characters')

await MeshoptSimplifier.ready
await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': (await import('meshoptimizer')).MeshoptDecoder,
})

/** `drop` = node-name suffixes removed from the outfit (the head comes from Male_Head/Female_Head at runtime). */
const VARIANTS = [
  ...['Male', 'Female'].map((sex) => ({ name: `${sex}_Knight`, source: `${sex}_Knight`, drop: ['Head_Armet', 'Head_Horns'], ratio: 0.35 })),
]

/** Drop normal/roughness/ORM maps (low-poly style, 3–4× less texture memory). */
const baseColorOnly = () => (doc) => {
  for (const m of doc.getRoot().listMaterials()) {
    m.setNormalTexture(null)
    m.setMetallicRoughnessTexture(null)
    m.setOcclusionTexture(null)
    m.setMetallicFactor(0)
    m.setRoughnessFactor(1)
  }
}

const dropParts = (suffixes) => (doc) => {
  for (const n of doc.getRoot().listNodes()) {
    if (n.getMesh() && suffixes.some((s) => n.getName().endsWith(s))) {
      n.getMesh().dispose()
      n.dispose()
    }
  }
}

const only = process.argv.slice(2)
for (const v of VARIANTS) {
  if (only.length && !only.includes(v.name)) continue
  const doc = await io.read(path.join(SRC, `${v.source}.gltf`))
  await doc.transform(
    dropParts(v.drop),
    prune(), dedup(), resample(), baseColorOnly(),
    weld(), simplify({ simplifier: MeshoptSimplifier, ratio: v.ratio, error: 0.004 }),
    textureCompress({ encoder: sharp, targetFormat: 'png', resize: [512, 512] }),
    flatten(), join({ keepNamed: false }), prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  )
  const dst = path.join(OUT, `${v.name}.glb`)
  await io.write(dst, doc)
  console.log(`${path.relative(ROOT, dst)}  ${Math.round(fs.statSync(dst).size / 1024)} KB`)
}
