#!/usr/bin/env node
/**
 * Builds the kept pieces of the Halloween Bits / Signs pack / Ultimate Food Pack (research 006 keep list,
 * render--004 step 3) into assets-src/{graveyard,signs,food}.glb. Nothing is written to public/assets/:
 * no plan consumes these pieces yet (see the plan notes), so they stay as ready-to-ship sources.
 *
 * Sources (CC0, via Poly Pizza; confirmed 2026-10-01): _temp/extracted/{Halloween Bits.undefined-glb,
 * Signs pack-glb, Ultimate Food Pack-glb}. Kay Lousberg, iPoly3D and Quaternius respectively.
 *
 * Per piece: world transform and a uniform scale baked into the vertices (the packs are oversized
 * cartoon proportions, scales bring them to 1 unit = 1 m), a wrapper node with a stable name above the
 * mesh node(s) (meshopt quantisation puts a scale on the mesh node, and render/assets.ts mergeTemplate drops
 * the transform of the node it looks up by name). Origin: 'keep' = as authored (graveyard, signs: on the
 * ground, post at the origin), 'base' = XZ centre and lowest point at y = 0 (food).
 * Materials (metallic 0 / roughness 1): the atlas group (graveyard) is deduped to one material, flat-colour groups go through
 * palette() into one tiny palette texture, then primitives are joined, so each group is 1 material and
 * 1 primitive per piece (D-REN-11). Textures ≤ 512 px.
 *
 * Usage: node scripts/assets/build-pack-pieces.mjs [graveyard|signs|food …]
 */
import { Document, getBounds, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, join, mergeDocuments, meshopt, palette, prune, textureCompress, unpartition } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '../..')
const EXTRACTED = path.join(ROOT, '_temp/extracted')
await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

/** [source file (without .glb), output node name, uniform scale] */
const SIGN_FILES = ['Wooden Sign', ...['3MStJYAez7', 'AsEgIQcQfw', 'EpQJ6RRLKZ', 'GGbYyOmVCh', 'SpRHK36gNl', 'SzDPlKOhrH', 'TzjiI94FC5', 'U8DioeoNvJ', 'ir1ipUXgGE', 'jNdZygn3uR', 'mxyDWLsKer', 'p4TB5SdPsG'].map((h) => `Wooden Sign-${h}`)]
const GROUPS = {
  graveyard: {
    dir: 'Halloween Bits.undefined-glb',
    origin: 'keep',
    palette: false,
    pieces: [
      ['Candle', 'Candle', 0.3], ['Candles', 'Candles', 0.3], ['Candle Melted', 'Candle_Melted', 0.3],
      ['Lantern', 'Lantern', 0.35], ['Hanging Lantern', 'Lantern_Hanging', 0.35], ['Post Lantern', 'Lantern_Post', 0.65],
      ['Grave', 'Grave', 0.5], ['Damaged Grave', 'Grave_Damaged', 0.5], ['Gravestone', 'Gravestone', 0.5],
      ['Grave Marker', 'Grave_Marker_A', 0.7], ['Gravemarker', 'Grave_Marker_B', 0.7],
      ['Crypt', 'Crypt', 0.7], ['Shrine', 'Shrine', 0.6], ['Coffin', 'Coffin', 0.6],
      ['Fence', 'Fence_Stone', 0.5], ['Fence Broken', 'Fence_Stone_Broken', 0.5], ['Fence Gate', 'Fence_Gate', 0.5],
      ['Fence Pillar', 'Fence_Pillar', 0.5], ['Broken Fence Pillar', 'Fence_Pillar_Broken', 0.5],
      ['Iron Fence', 'Fence_Iron', 0.5], ['Damaged Iron fence', 'Fence_Iron_Broken', 0.5],
      ['Bench', 'Bench', 0.9], ['Path', 'Path_Tile', 1], ['Cobblestone tile', 'Cobble_Tile', 1], ['Rocks', 'Path_Rocks', 1],
      ['Arch', 'Arch', 0.65], ['Arch Gate', 'Arch_Gate', 0.65],
      ['Dead tree', 'Dead_Tree', 1], ['Small Dead tree', 'Dead_Tree_Small', 1],
      ['Skull', 'Skull', 0.22], ['Bone', 'Bone', 0.35],
    ],
  },
  signs: {
    dir: 'Signs pack-glb',
    origin: 'keep',
    palette: true,
    pieces: SIGN_FILES.map((f, i) => [f, `Sign_${String(i + 1).padStart(2, '0')}`, 1]),
  },
  food: {
    dir: 'Ultimate Food Pack-glb',
    origin: 'base',
    palette: true,
    pieces: [
      ['Bread', 'Bread', 0.25], ['Egg', 'Egg', 0.12], ['Chicken Leg', 'Chicken_Leg', 0.18], ['Steak', 'Steak', 0.12],
      ['Bacon', 'Bacon', 0.2], ['Carrot', 'Carrot', 0.1], ['Turnip', 'Turnip', 0.1], ['Tomato', 'Tomato', 0.13],
      ['Lettuce', 'Lettuce', 0.15], ['Pumpkin', 'Pumpkin', 0.25], ['Apple Green', 'Apple_Green', 0.1],
      ['Cooking Pot', 'Cooking_Pot', 0.15], ['Frying Pan', 'Frying_Pan', 0.12], ['Spoon', 'Spoon', 0.13],
    ],
  },
}

function bake(node, scale, off, done) {
  const m = node.getWorldMatrix()
  for (const prim of node.getMesh().listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    if (!done.has(pos)) {
      done.add(pos)
      const v = [0, 0, 0]
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v)
        pos.setElement(i, [
          (m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] - off[0]) * scale,
          (m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] - off[1]) * scale,
          (m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] - off[2]) * scale,
        ])
      }
    }
    const nor = prim.getAttribute('NORMAL')
    if (nor && !done.has(nor)) {
      done.add(nor)
      const v = [0, 0, 0]
      for (let i = 0; i < nor.getCount(); i++) {
        nor.getElement(i, v)
        const x = m[0] * v[0] + m[4] * v[1] + m[8] * v[2]
        const y = m[1] * v[0] + m[5] * v[1] + m[9] * v[2]
        const z = m[2] * v[0] + m[6] * v[1] + m[10] * v[2]
        const l = Math.hypot(x, y, z) || 1
        nor.setElement(i, [x / l, y / l, z / l])
      }
    }
  }
}

async function build(name, g) {
  const clean = new Document()
  const scene = clean.createScene(name)
  const done = new Set()
  const log = []
  for (const [file, out, scale] of g.pieces) {
    const src = await io.read(path.join(EXTRACTED, g.dir, `${file}.glb`))
    const map = mergeDocuments(clean, src)
    const srcScene = map.get(src.getRoot().listScenes()[0])
    const b = getBounds(srcScene)
    const off = g.origin === 'base' ? [(b.min[0] + b.max[0]) / 2, b.min[1], (b.min[2] + b.max[2]) / 2] : [0, 0, 0]
    const wrapper = clean.createNode(out)
    let i = 0
    const meshNodes = []
    srcScene.traverse((n) => { if (n.getMesh()) meshNodes.push(n) })
    for (const n of meshNodes) {
      bake(n, scale, off, done)
      wrapper.addChild(clean.createNode(`${out}_mesh${i++}`).setMesh(n.getMesh()))
    }
    scene.addChild(wrapper)
    // Drop the merged source scene so that only wrappers stay.
    for (const n of srcScene.listChildren()) n.dispose()
    srcScene.dispose()
    const nb = getBounds(wrapper)
    log.push(`${out}: ${(nb.max[0] - nb.min[0]).toFixed(2)} x ${(nb.max[1] - nb.min[1]).toFixed(2)} x ${(nb.max[2] - nb.min[2]).toFixed(2)} m, y ${nb.min[1].toFixed(2)}..${nb.max[1].toFixed(2)}`)
  }
  const kept = new Set()
  scene.traverse((n) => kept.add(n))
  for (const n of clean.getRoot().listNodes()) if (!kept.has(n)) n.dispose()
  for (const s of clean.getRoot().listScenes()) if (s !== scene) s.dispose()

  await clean.transform(
    unpartition(),
    // Poly Pizza exports carry metallic = 1; the renderer is Lambert-style, so flatten PBR factors before merging.
    (doc) => { for (const m of doc.getRoot().listMaterials()) m.setMetallicFactor(0).setRoughnessFactor(1) },
    dedup(),
    ...(g.palette ? [palette({ blockSize: 4, min: 2 })] : []),
    dedup(), // palette() can leave identical materials behind
    join(),
    prune(),
    textureCompress({ encoder: sharp, resize: [512, 512] }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  )
  const dst = path.join(ROOT, 'assets-src', `${name}.glb`)
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  await io.write(dst, clean)
  const kb = Math.round(fs.statSync(dst).size / 1024)
  console.log(`${path.relative(ROOT, dst)}  ${kb} KB  ${g.pieces.length} pieces\n  ${log.join('\n  ')}`)
}

const wanted = process.argv.slice(2)
for (const [name, g] of Object.entries(GROUPS)) if (!wanted.length || wanted.includes(name)) await build(name, g)
