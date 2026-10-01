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
 *        node scripts/assets/build-characters.mjs --raw [variantName…]   Blender-authored variants: every
 *            assets-src/characters/<Name>.raw.glb (scripts/assets/blender-character-variants.py) goes through the
 *            same recipe into public/assets/characters/<Name>.glb (ratio per name in RAW_RATIO, default 0.35)
 *        node scripts/assets/build-characters.mjs --tex   colour-variant maps: Textures/<Outfit>/T_<Outfit>_2|3_BaseColor.png
 *            -> public/assets/characters/tex/<Outfit>_2|3.png (512 px, no geometry copy)
 * (no manifest.json write: owned by the other build scripts)
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
const TEX_SRC = path.join(ROOT, '_temp/extracted/Modular Character Outfits - Fantasy[Source]/Textures')
const RAW_SRC = path.join(ROOT, 'assets-src/characters')
const OUT = path.join(ROOT, 'public/assets/characters')
/** Simplify ratio per raw variant when 0.35 busts the class budget (≤ 13 k tris, ≤ 1 MB). */
const RAW_RATIO = {}

await MeshoptSimplifier.ready
await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': (await import('meshoptimizer')).MeshoptDecoder,
})

/** `drop` = node-name suffixes removed from the outfit (the head comes from Male_Head/Female_Head at runtime). */
const VARIANTS = [
  ...['Male', 'Female'].map((sex) => ({ name: `${sex}_Knight`, source: `${sex}_Knight`, drop: ['Head_Armet', 'Head_Horns'], ratio: 0.35 })),
  ...['Male', 'Female'].map((sex) => ({ name: `${sex}_Knight_Helm`, source: `${sex}_Knight`, drop: ['Head_Horns'], ratio: 0.35 })),
  ...['Male', 'Female'].map((sex) => ({ name: `${sex}_Knight_Cloth`, source: `${sex}_Knight_Cloth`, drop: ['Head_Armet', 'Head_Horns'], ratio: 0.35 })),
  ...['Male', 'Female'].map((sex) => ({ name: `${sex}_Ranger_NoHood`, source: `${sex}_Ranger`, drop: ['Head_Hood'], ratio: 0.35 })),
  ...['Male', 'Female'].map((sex) => ({ name: `${sex}_Wizard`, source: `${sex}_Wizard`, drop: [], ratio: 0.5 })),
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

/** Authored sources can carry stray clips; the shared anims.glb is the only animation source. */
const dropAnimations = () => (doc) => {
  for (const a of doc.getRoot().listAnimations()) a.dispose()
}

const args = process.argv.slice(2)
const raw = args.includes('--raw')
const only = args.filter((a) => !a.startsWith('--'))

if (args.includes('--tex')) {
  fs.mkdirSync(path.join(OUT, 'tex'), { recursive: true })
  for (const outfit of ['Knight', 'Noble', 'Peasant', 'Ranger', 'Wizard']) {
    for (const n of [2, 3]) {
      const dst = path.join(OUT, 'tex', `${outfit}_${n}.png`)
      await sharp(path.join(TEX_SRC, outfit, `T_${outfit}_${n}_BaseColor.png`)).resize(512, 512).png({ compressionLevel: 9 }).toFile(dst)
      console.log(`${path.relative(ROOT, dst)}  ${Math.round(fs.statSync(dst).size / 1024)} KB`)
    }
  }
  process.exit(0)
}

const rawVariants = raw && fs.existsSync(RAW_SRC)
  ? fs.readdirSync(RAW_SRC).filter((f) => f.endsWith('.raw.glb')).map((f) => {
    const name = f.slice(0, -'.raw.glb'.length)
    return { name, file: path.join(RAW_SRC, f), drop: [], ratio: RAW_RATIO[name] ?? 0.35 }
  })
  : []

for (const v of raw ? rawVariants : VARIANTS) {
  if (only.length && !only.includes(v.name)) continue
  const doc = await io.read(v.file ?? path.join(SRC, `${v.source}.gltf`))
  await doc.transform(
    dropParts(v.drop), dropAnimations(),
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
