#!/usr/bin/env node
/**
 * Rebuilds public/assets from the Quaternius packs extracted under _temp/extracted/.
 * The game and its build never read _temp — only the outputs of this script.
 *
 * Conversions: glTF → GLB, texture resize (sharp), tree simplification (meshoptimizer),
 * head extraction from the base character (triangles above the neck), animation subset.
 *
 * Usage: node scripts/assets/build-assets.mjs   (see docs/assets/README.md)
 */
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, mergeDocuments, meshopt, prune, resample, simplify, textureCompress, unpartition, weld } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, '_temp/extracted')
const OUT = path.join(ROOT, 'public/assets')
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
await MeshoptSimplifier.ready
await MeshoptEncoder.ready
io.registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': (await import('meshoptimizer')).MeshoptDecoder })
/** EXT_meshopt_compression (decoded in the browser by three's MeshoptDecoder). */
const compress = () => meshopt({ encoder: MeshoptEncoder, level: 'medium' })

const NATURE = path.join(SRC, 'Stylized_Nature_MegaKitStandard/glTF')
const VILLAGE = path.join(SRC, 'Medieval_Village_MegaKitStandard/Medieval Village MegaKit[Standard]/glTF')
const PROPS = path.join(SRC, 'Fantasy_Props_MegaKitStandard/Exports/glTF')
const ANIMALS = path.join(SRC, 'Ultimate_Animated_Animal_Pack/glTF')
const BASECHAR = path.join(SRC, 'Universal_Base_CharactersStandard/Universal Base Characters[Standard]/Base Characters/Godot - UE')
const OUTFITS = path.join(SRC, 'Outfits/Modular Character Outfits - Fantasy[Source]/Exports/glTF (Godot-Unreal)/Outfits')
const ANIMLIB = path.join(SRC, 'Universal_Animation_LibraryStandard/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb')

const log = []

async function convert(src, dst, { tex = 512, ratio = 0, error = 0.01, transforms = [] } = {}) {
  if (!fs.existsSync(src)) {
    console.warn('missing', src)
    return
  }
  const doc = await io.read(src)
  const ops = [dedup(), prune(), resample()]
  if (ratio > 0) ops.push(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error }))
  if (tex) ops.push(textureCompress({ encoder: sharp, targetFormat: 'png', resize: [tex, tex] }))
  await doc.transform(...ops, ...transforms, compress())
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  await io.write(dst, doc)
  const kb = Math.round(fs.statSync(dst).size / 1024)
  log.push({ src: path.relative(SRC, src), dst: path.relative(ROOT, dst), kb, ratio, tex })
  console.log(`${path.relative(ROOT, dst)}  ${kb} KB`)
}

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

/**
 * Packs several models into one GLB sharing textures. Each model becomes a top-level node named
 * after the source file (lookup key at runtime).
 */
async function pack(dst, dir, entries, { tex = 512 } = {}) {
  const target = new Document()
  target.createBuffer()
  const scene = target.createScene('pack')
  for (const [name, ratio] of entries) {
    const src = `${dir}/${name}.gltf`
    if (!fs.existsSync(src)) {
      console.warn('missing', src)
      continue
    }
    const doc = await io.read(src)
    const ops = [baseColorOnly()]
    if (ratio > 0) ops.push(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.02 }))
    await doc.transform(...ops)
    const map = mergeDocuments(target, doc)
    const root = target.createNode(name)
    for (const sc of doc.getRoot().listScenes()) {
      for (const child of sc.listChildren()) root.addChild(map.get(child))
      map.get(sc)?.dispose()
    }
    scene.addChild(root)
  }
  for (const sc of target.getRoot().listScenes()) if (sc !== scene) sc.dispose()
  await target.transform(unpartition(), dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'png', resize: [tex, tex] }), compress())
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  await io.write(dst, target)
  const kb = Math.round(fs.statSync(dst).size / 1024)
  log.push({ dst: path.relative(ROOT, dst), from: path.relative(SRC, dir), models: entries.map((e) => e[0]), kb, tex })
  console.log(`${path.relative(ROOT, dst)}  ${kb} KB  (${entries.length} models)`)
}

// Nature (trees simplified to ~25–35 % triangles) ---
await pack(`${OUT}/nature.glb`, NATURE, [
  ['CommonTree_1', 0.25], ['CommonTree_3', 0.3], ['Pine_1', 0.3], ['Pine_3', 0.3], ['DeadTree_1', 0.2],
  ['Bush_Common', 0.5], ['Bush_Common_Flowers', 0.5], ['Rock_Medium_1', 0], ['Rock_Medium_2', 0],
  ['Pebble_Round_1', 0], ['Mushroom_Common', 0.5], ['Flower_3_Group', 0.5], ['Plant_1', 0], ['Grass_Common_Tall', 0], ['Fern_1', 0],
])

// --- Village modular pieces ---
await pack(`${OUT}/village.glb`, VILLAGE, [
  'Wall_Plaster_Straight', 'Wall_Plaster_Door_Round', 'Wall_Plaster_Window_Wide_Round', 'Wall_UnevenBrick_Straight',
  'Wall_UnevenBrick_Door_Flat', 'Wall_UnevenBrick_Window_Wide_Flat', 'Wall_Plaster_WoodGrid', 'Corner_Exterior_Wood', 'Corner_Exterior_Brick',
  'Floor_WoodDark', 'Roof_RoundTiles_4x4', 'Roof_RoundTiles_6x8', 'Roof_RoundTiles_8x10', 'Roof_RoundTiles_6x6', 'Roof_RoundTiles_8x8',
  'Prop_Chimney', 'Prop_Crate', 'Prop_WoodenFence_Single', 'Prop_Wagon', 'Door_1_Round', 'Door_1_Flat', 'Window_Wide_Round1', 'Window_Wide_Flat1',
].map((n) => [n, 0]))

// --- Props ---
await pack(`${OUT}/props.glb`, PROPS, [
  'Anvil', 'Barrel', 'Bench', 'Stall_Empty', 'Stall_Cart_Empty', 'Workbench', 'Chest_Wood', 'Bucket_Wooden_1', 'Torch_Metal',
  'Cauldron', 'FarmCrate_Carrot', 'Crate_Wooden', 'Lantern_Wall', 'Anvil_Log',
].map((n) => [n, 0]), { tex: 256 })

// --- Animals (already low-poly, vertex-coloured) ---
for (const name of ['Deer', 'Stag', 'Wolf', 'Fox', 'Cow', 'Horse', 'Donkey', 'Husky']) {
  await convert(`${ANIMALS}/${name}.gltf`, `${OUT}/animals/${name}.glb`, { tex: 0, ratio: 0 })
}

// --- Characters: outfits (head-less) + extracted heads ---
for (const name of ['Male_Peasant', 'Female_Peasant', 'Male_Ranger', 'Female_Ranger']) {
  await convert(`${OUTFITS}/${name}.gltf`, `${OUT}/characters/${name}.glb`, { tex: 512, ratio: 0.35, error: 0.004, transforms: [baseColorOnly(), prune()] })
}

/** Keep only triangles fully above the neck line from the base body mesh (head + hair + eyes). */
function headOnly(minY) {
  return (doc) => {
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const mat = prim.getMaterial()?.getName() ?? ''
        if (!/Superhero/.test(mat)) continue
        const pos = prim.getAttribute('POSITION')
        const ind = prim.getIndices()
        const out = []
        const a = ind.getArray()
        for (let i = 0; i < a.length; i += 3) {
          const ok = [a[i], a[i + 1], a[i + 2]].every((v) => pos.getElement(v, [])[1] > minY)
          if (ok) out.push(a[i], a[i + 1], a[i + 2])
        }
        ind.setArray(new Uint32Array(out))
      }
    }
  }
}
for (const sex of ['Male', 'Female']) {
  await convert(`${BASECHAR}/Superhero_${sex}_FullBody.gltf`, `${OUT}/characters/${sex}_Head.glb`, {
    tex: 512,
    ratio: 0.5,
    error: 0.003,
    transforms: [headOnly(sex === 'Male' ? 1.5 : 1.44), baseColorOnly(), prune()],
  })
}

// --- Animation subset from UAL1 (meshes stripped) ---
const KEEP = new Set([
  'Crouch_Fwd_Loop', 'Crouch_Idle_Loop', 'Death01', 'Fixing_Kneeling', 'Hit_Chest', 'Idle_Loop', 'Idle_Talking_Loop', 'Idle_Torch_Loop',
  'Interact', 'Jog_Fwd_Loop', 'PickUp_Table', 'Pistol_Aim_Neutral', 'Punch_Jab', 'Push_Loop', 'Roll', 'Sitting_Idle_Loop',
  'Spell_Simple_Shoot', 'Sprint_Loop', 'Swim_Fwd_Loop', 'Swim_Idle_Loop', 'Sword_Attack', 'Walk_Loop',
])
{
  const doc = await io.read(ANIMLIB)
  for (const anim of doc.getRoot().listAnimations()) if (!KEEP.has(anim.getName())) anim.dispose()
  for (const node of doc.getRoot().listNodes()) if (node.getMesh()) node.setMesh(null)
  for (const mesh of doc.getRoot().listMeshes()) mesh.dispose()
  await doc.transform(prune({ keepLeaves: true }), dedup(), resample(), compress())
  const dst = `${OUT}/characters/anims.glb`
  await io.write(dst, doc)
  log.push({ src: 'UAL1_Standard.glb', dst: path.relative(ROOT, dst), kb: Math.round(fs.statSync(dst).size / 1024) })
  console.log('anims', Math.round(fs.statSync(dst).size / 1024), 'KB')
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ generatedBy: 'scripts/assets/build-assets.mjs', files: log }, null, 1))
fs.copyFileSync(path.join(SRC, 'Stylized_Nature_MegaKitStandard/License_Standard.txt'), path.join(OUT, 'LICENSE-Quaternius-CC0.txt'))
