#!/usr/bin/env node
/**
 * Builds the armour modules worn on top of the base outfit (render--011) from the "Modular Character Outfits -
 * Fantasy [Source]" pack (_temp/extracted/, CC0): one pack per sex, public/assets/characters/eq/<Sex>.glb, with one
 * named wrapper node `EQ_<Module>` per module. Same recipe as build-characters.mjs (base colour only, 512 px,
 * simplify, join parts per material, meshopt) but every module keeps its own node(s) so the runtime can rebind it to any
 * outfit skeleton by bone name (all parts share the 65-bone UBC skeleton). No animations.
 *
 * A module = its own list of source parts per sex (the pack's part names differ between the sexes).
 * Usage: node scripts/assets/build-equipment-modules.mjs [Module…]
 */
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, flatten, join, mergeDocuments, meshopt, prune, resample, simplify, textureCompress, unpartition, weld } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '../..')
const PARTS = path.join(ROOT, '_temp/extracted/Modular Character Outfits - Fantasy[Source]/Exports/glTF (Godot-Unreal)/Outfits')
const OUT = path.join(ROOT, 'public/assets/characters/eq')
/** Blender-authored modules (scripts/assets/blender-dress-modules.py, blender-equipment-modules.py): `<Module>_<Sex>.raw.glb`. */
const RAW = path.join(ROOT, 'assets-src/characters/eq')

/** Simplify ratio per module (defaults 0.35): equipment is added on top of a ~10 k-triangle outfit, so keep it small. */
const RATIO = { IronHelm: 0.35, PlateCuirass: 0.2, Pauldrons: 0.3, LeatherBoots: 0.09, PeasantSkirt: 1 }

/**
 * Metres each module is pushed out along its vertex normals: the pieces were authored to sit on the matching Knight/Ranger
 * body, but here they go over another outfit's clothes (a farmer's tunic is thicker), where they would sink in and vanish.
 */
const INFLATE = { IronHelm: 0.012, PlateCuirass: 0.05, Pauldrons: 0.025, LeatherBoots: 0.015, PeasantSkirt: 0.012 }

/**
 * Module → per sex: the source *outfit* file and the mesh nodes to keep, or `['raw']` for a Blender-authored
 * `assets-src/characters/eq/<Module>_<Sex>.raw.glb` that is kept whole (a sex without an entry has no such module).
 * The parts come out of the full outfit files (as in
 * build-characters.mjs), whose rest pose matches the outfits we rebind to; the separate "Modular Parts" exports do not.
 */
const MODULES = {
  IronHelm: { Male: ['Male_Knight', ['Male_Knight_Head_Armet']], Female: ['Female_Knight', ['Female_Knight_Head_Armet']] },
  PlateCuirass: { Male: ['Male_Knight', ['Male_Knight_Body_Armor']], Female: ['Female_Knight', ['Female_Knight_Body_Armor']] },
  Pauldrons: { Male: ['Male_Knight', ['Male_Knight_Acc_Pauldron_Round']], Female: ['Female_Knight', ['Female_Knight_Acc_Pauldrons_Round']] },
  LeatherBoots: { Male: ['Male_Ranger', ['Male_Ranger_Feet_Boots']], Female: ['Female_Ranger', ['Female_Ranger_Feet']] },
  PeasantSkirt: { Female: ['raw'] },
}

await MeshoptSimplifier.ready
await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': (await import('meshoptimizer')).MeshoptDecoder,
})

const baseColorOnly = () => (doc) => {
  for (const m of doc.getRoot().listMaterials()) {
    m.setNormalTexture(null)
    m.setMetallicRoughnessTexture(null)
    m.setOcclusionTexture(null)
    m.setMetallicFactor(0)
    m.setRoughnessFactor(1)
  }
}
const keepParts = (names) => (doc) => {
  for (const n of doc.getRoot().listNodes()) {
    if (n.getMesh() && !names.includes(n.getName())) {
      n.getMesh().dispose()
      n.dispose()
    }
  }
}
const dropAnimations = () => (doc) => {
  for (const a of doc.getRoot().listAnimations()) a.dispose()
}

/** Every mesh node of a module doc is renamed `EQ_<Module>` (`_n` suffix when a module keeps several nodes). */
const inflate = (metres) => (doc) => {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      const nor = prim.getAttribute('NORMAL')
      if (!pos || !nor) continue
      const p = [0, 0, 0]
      const n = [0, 0, 0]
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, p)
        nor.getElement(i, n)
        pos.setElement(i, [p[0] + n[0] * metres, p[1] + n[1] * metres, p[2] + n[2] * metres])
      }
    }
  }
}

const nameNodes = (name) => (doc) => {
  const nodes = doc.getRoot().listNodes().filter((n) => n.getMesh())
  nodes.forEach((n, i) => n.setName(nodes.length > 1 ? `EQ_${name}_${i}` : `EQ_${name}`))
}

const only = process.argv.slice(2)
fs.mkdirSync(OUT, { recursive: true })
for (const sex of ['Male', 'Female']) {
  const pack = new Document()
  for (const [name, bySex] of Object.entries(MODULES)) {
    if (only.length && !only.includes(name)) continue
    if (!bySex[sex]) continue
    const [outfit, keep] = bySex[sex]
    const isRaw = outfit === 'raw'
    const doc = await io.read(isRaw ? path.join(RAW, `${name}_${sex}.raw.glb`) : path.join(PARTS, `${outfit}.gltf`))
    await doc.transform(
      isRaw ? () => undefined : keepParts(keep), dropAnimations(), prune(), dedup(), resample(), baseColorOnly(),
      weld(), ...(RATIO[name] === 1 ? [] : [simplify({ simplifier: MeshoptSimplifier, ratio: RATIO[name] ?? 0.35, error: 0.03 })]),
      textureCompress({ encoder: sharp, targetFormat: 'png', resize: [512, 512] }),
      flatten(), join({ keepNamed: false }), prune(), inflate(INFLATE[name] ?? 0), nameNodes(name),
    )
    mergeDocuments(pack, doc)
  }
  // One scene holding every module node (mergeDocuments adds one scene per source).
  const root = pack.getRoot()
  const scenes = root.listScenes()
  const keep = scenes[0]
  for (const sc of scenes.slice(1)) {
    for (const n of sc.listChildren()) keep.addChild(n)
    sc.dispose()
  }
  await pack.transform(dedup(), prune(), unpartition(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  const dst = path.join(OUT, `${sex}.glb`)
  await io.write(dst, pack)
  const nodes = root.listNodes().filter((n) => n.getMesh()).map((n) => n.getName())
  const tris = root.listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0)
  console.log(`${path.relative(ROOT, dst)}  ${Math.round(fs.statSync(dst).size / 1024)} KB  ${Math.round(tris)} tris  nodes: ${nodes.join(', ')}  skins: ${root.listSkins().length}  textures: ${root.listTextures().length}`)
}
