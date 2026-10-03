#!/usr/bin/env node
/**
 * Audits the Blender-authored equipment candidates (assets-src/characters/eq/<Module>_<Sex>.raw.glb, produced by
 * scripts/assets/blender-equipment-modules.py): joint names must be a subset of the game's <Sex>_Peasant skeleton, no
 * animations, texture sizes, triangles raw and after the same simplify step as build-equipment-modules.mjs (to the module
 * budget: torso <= 1500, small pieces <= 600), bounds, materials. Prints a table and writes
 * docs/state/frames/render--011/blend-audit.json. Exit code 1 when a hard check fails (joint names, animations, textures > 512).
 * Usage: node scripts/assets/audit-eq-raw.mjs [Module_Sex ...]
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, flatten, join, prune, simplify, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const DIR = path.join(ROOT, 'assets-src/characters/eq')
const CHARS = path.join(ROOT, 'public/assets/characters')
const REPORT = path.join(ROOT, 'docs/state/frames/render--011/blend-audit.json')

/** Triangle budget after simplification per module (render--012: torso <= 1.5 k, small pieces <= 600). Base outfits are not budgeted here. */
const BUDGET = {
  Bracers: 600, Gloves: 600, LeatherPauldron: 600, LeatherJerkin: 1500, PaddedJacket: 1500, LeatherTrousers: 1500,
}

await MeshoptSimplifier.ready
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

const triangles = (doc) =>
  doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0)

const bounds = (doc) => {
  const mn = [Infinity, Infinity, Infinity]
  const mx = [-Infinity, -Infinity, -Infinity]
  const p = [0, 0, 0]
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, p)
        for (let k = 0; k < 3; k++) {
          mn[k] = Math.min(mn[k], p[k])
          mx[k] = Math.max(mx[k], p[k])
        }
      }
    }
  }
  return [mn, mx].map((v) => v.map((x) => Math.round(x * 1000) / 1000))
}

const jointNames = (doc) => new Set(doc.getRoot().listSkins().flatMap((s) => s.listJoints().map((j) => j.getName())))

const skeletons = {}
for (const sex of ['Male', 'Female']) skeletons[sex] = jointNames(await io.read(path.join(CHARS, `${sex}_Peasant.glb`)))

const only = process.argv.slice(2)
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.raw.glb')).sort()
const rows = []
let failed = false
for (const file of files) {
  const id = file.replace('.raw.glb', '')
  if (only.length && !only.includes(id)) continue
  const [module, sex] = id.split(/_(?=Male$|Female$)/)
  const doc = await io.read(path.join(DIR, file))
  const joints = [...jointNames(doc)]
  const unknown = joints.filter((j) => !skeletons[sex].has(j))
  const skinned = doc.getRoot().listSkins().length > 0
  const textures = doc.getRoot().listTextures().map((t) => t.getSize()?.join('x'))
  const big = doc.getRoot().listTextures().some((t) => Math.max(...(t.getSize() ?? [0])) > 512)
  const raw = Math.round(triangles(doc))
  let simplified = raw
  const budget = BUDGET[module]
  if (budget && raw > budget) {
    await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: budget / raw, error: 0.05 }), flatten(), join({ keepNamed: false }), dedup(), prune())
    simplified = Math.round(triangles(doc))
  }
  const row = {
    id, rawTris: raw, budget: budget ?? null, simplifiedTris: budget ? simplified : null, withinBudget: budget ? simplified <= budget : null,
    bounds: bounds(doc), materials: doc.getRoot().listMaterials().length, textures, animations: doc.getRoot().listAnimations().length,
    joints: joints.length, unknownJoints: unknown, skinned, sizeKB: Math.round(fs.statSync(path.join(DIR, file)).size / 1024),
  }
  if (unknown.length || row.animations || big || !skinned) failed = true
  rows.push(row)
  console.log(`${id.padEnd(26)} raw ${String(raw).padStart(6)}  ${budget ? `-> ${String(simplified).padStart(5)} (budget ${budget})` : '(base outfit, not budgeted)'.padEnd(26)}  mats ${row.materials}  tex ${textures.join(',') || '-'}  joints ${joints.length}${unknown.length ? ` UNKNOWN ${unknown.join(',')}` : ''}  ${row.sizeKB} KB`)
}
fs.mkdirSync(path.dirname(REPORT), { recursive: true })
fs.writeFileSync(REPORT, JSON.stringify(rows, null, 1))
if (failed) {
  console.error('audit FAILED (unknown joints, animations, textures > 512 px or unskinned)')
  process.exit(1)
}
