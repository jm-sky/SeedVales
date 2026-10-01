#!/usr/bin/env node
/**
 * Converts the non-Quaternius-pack animals (rat, hare, boar, bear) from _temp/extracted/Extra_Animals/
 * into public/assets/animals/. Separate from build-assets.mjs so it runs without the big packs.
 *
 * Sources (see docs/assets/README.md): Rat.glb, Hare.glb as downloaded; Boar.glb (from FBX) and
 * Bear.glb normalised in Blender (applied transforms, head towards +Z in glTF, origin at the feet).
 * Boar/Bear are read from *_rigged.glb: rig + procedural clips made by scripts/assets/rig-fauna.py.
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

const RIGGED_CLIPS = { Idle: 'Idle', Walk: 'Walk', Gallop: 'Gallop', Attack: 'Attack', Eating: 'Eating', Death: 'Death' }

/** Source clip name (without the "Armature|" prefix) → runtime name; unlisted clips are dropped. */
const ANIMALS = {
  Rat: { clips: { Rat_Idle: 'Idle', Rat_Walk: 'Walk', Rat_Run: 'Gallop', Rat_Attack: 'Attack', Rat_Death: 'Death' } },
  // The source hare has only idle/walk on an IK-style rig; Gallop and Death are derived below (no Attack: hares only flee).
  Hare: { clips: { Bunny_idle: 'Idle', Bunny_walk: 'Walk' }, post: addHareClips },
  Boar: { file: 'Boar_rigged', clips: RIGGED_CLIPS },
  // The black bear (666 tris, 2048 px palette) replaced the 18.7k-tri sculpt (kept as Bear_sculpt*.glb in _temp).
  Bear: { file: 'Bear_rigged', clips: RIGGED_CLIPS, tex: 256 },
  Moose: { file: 'Moose_rigged', clips: RIGGED_CLIPS, tex: 256 },
  Sheep: { file: 'Sheep_rigged', clips: RIGGED_CLIPS },
  Chicken: { file: 'Chicken_rigged', clips: RIGGED_CLIPS },
}

/** Gallop = the walk cycle at 2x speed; Death = the whole body topples onto its side (RootNode, an ancestor of the skeleton). */
function addHareClips(doc) {
  const root = doc.getRoot()
  const buf = root.listBuffers()[0]
  const walk = root.listAnimations().find((a) => a.getName() === 'Walk')
  const gallop = doc.createAnimation('Gallop')
  const scaled = new Map()
  for (const ch of walk.listChannels()) {
    const s = ch.getSampler()
    if (!scaled.has(s)) {
      const inp = s.getInput()
      const t = doc.createAccessor().setType('SCALAR').setBuffer(buf).setArray(Float32Array.from(inp.getArray(), (v) => v * 0.5))
      scaled.set(s, doc.createAnimationSampler().setInput(t).setOutput(s.getOutput()).setInterpolation(s.getInterpolation()))
    }
    gallop.addSampler(scaled.get(s)).addChannel(doc.createAnimationChannel().setTargetNode(ch.getTargetNode()).setTargetPath(ch.getTargetPath()).setSampler(scaled.get(s)))
  }
  const node = root.listNodes().find((n) => n.getName() === 'RootNode')
  const death = doc.createAnimation('Death')
  const acc = (type, arr) => doc.createAccessor().setType(type).setBuffer(buf).setArray(new Float32Array(arr))
  const time = acc('SCALAR', [0, 0.35, 0.6])
  const k = Math.SQRT1_2
  const add = (path, type, arr) => {
    const smp = doc.createAnimationSampler().setInput(time).setOutput(acc(type, arr)).setInterpolation('LINEAR')
    death.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(smp))
  }
  add('rotation', 'VEC4', [0, 0, 0, 1, 0, 0, 0.5, Math.sqrt(0.75), 0, 0, k, k]) // about Z (the length axis): 0°, 60°, 90°
  add('translation', 'VEC3', [0, 0, 0, 0.2, 0.1, 0, 0.28, 0.15, 0])
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
for (const [name, { file = name, clips = {}, post, tex = 0, ratio = 0, error = 0.01 }] of Object.entries(ANIMALS)) {
  const src = path.join(SRC, `${file}.glb`)
  const dst = path.join(OUT, `${name}.glb`)
  const doc = await io.read(src)
  const ops = [renameClips(clips), ...(post ? [post] : []), dedup(), prune(), resample()]
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
