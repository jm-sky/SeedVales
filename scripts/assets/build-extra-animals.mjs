#!/usr/bin/env node
/**
 * Converts the non-Quaternius-pack animals (rat, hare, boar, bear) from _temp/extracted/Extra_Animals/
 * into public/assets/animals/. Separate from build-assets.mjs so it runs without the big packs.
 *
 * Sources (see docs/assets/README.md): Rat.glb, Hare.glb as downloaded; Boar.glb (from FBX) and
 * Bear.glb normalised in Blender (applied transforms, head towards +Z in glTF, origin at the feet).
 * Clips are renamed to the names render/actors.ts plays (Idle/Walk/Gallop/Attack/Death).
 *
 * Usage: node scripts/assets/build-extra-animals.mjs
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, resample, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, '_temp/extracted/Extra_Animals')
const OUT = path.join(ROOT, 'public/assets/animals')
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
await MeshoptSimplifier.ready
await MeshoptEncoder.ready
io.registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

/** Source clip name (without the "Armature|" prefix) → runtime name; unlisted clips are dropped. */
const ANIMALS = {
  Rat: { clips: { Rat_Idle: 'Idle', Rat_Walk: 'Walk', Rat_Run: 'Gallop', Rat_Attack: 'Attack', Rat_Death: 'Death' } },
  Hare: { clips: { Bunny_idle: 'Idle', Bunny_walk: 'Walk' } },
  Boar: {},
  // 18.7k tris + 4096 px texture in the source.
  Bear: { tex: 512, ratio: 0.3, error: 0.01 },
}

const renameClips = (map) => (doc) => {
  for (const anim of doc.getRoot().listAnimations()) {
    const to = map[anim.getName().split('|').pop()]
    if (to) anim.setName(to)
    else anim.dispose()
  }
}

const manifestPath = path.join(ROOT, 'public/assets/manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
for (const [name, { clips = {}, tex = 0, ratio = 0, error = 0.01 }] of Object.entries(ANIMALS)) {
  const src = path.join(SRC, `${name}.glb`)
  const dst = path.join(OUT, `${name}.glb`)
  const doc = await io.read(src)
  const ops = [renameClips(clips), dedup(), prune(), resample()]
  if (ratio > 0) ops.push(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error }))
  if (tex) ops.push(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [tex, tex] }))
  await doc.transform(...ops, meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  await io.write(dst, doc)
  const kb = Math.round(fs.statSync(dst).size / 1024)
  const entry = { src: path.relative(path.join(ROOT, '_temp/extracted'), src).replaceAll('\\', '/'), dst: path.relative(ROOT, dst).replaceAll('\\', '/'), kb, ratio, tex }
  manifest.files = manifest.files.filter((f) => f.dst !== entry.dst).concat(entry)
  console.log(`${entry.dst}  ${kb} KB  clips: ${doc.getRoot().listAnimations().map((a) => a.getName()).join(',') || '-'}`)
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1))
