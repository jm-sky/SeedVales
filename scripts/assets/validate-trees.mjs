#!/usr/bin/env node
/** Contract check for public/assets/trees.glb + trees-impostors.{png,json} (docs/design/render-tree-assets-contract.md). */
import { getBounds, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import { readFileSync, statSync } from 'node:fs'
import sharp from 'sharp'

await MeshoptDecoder.ready
const dir = process.argv[2] ?? 'public/assets'
const errs = []
const bad = (m) => errs.push(m)
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).read(`${dir}/trees.glb`)
const root = doc.getRoot()
const meta = JSON.parse(readFileSync(`${dir}/trees-impostors.json`, 'utf8'))
if (root.listMaterials().length !== 2) bad(`materials: ${root.listMaterials().length} (want 2)`)
for (const m of root.listMaterials()) {
  if (m.getAlphaMode() === 'BLEND') bad(`${m.getName()} uses BLEND`)
  if (m.getName() === 'Leaves' && (m.getAlphaMode() !== 'MASK' || m.getAlphaCutoff() !== 0.5 || !m.getDoubleSided())) bad('Leaves must be MASK 0.5 double-sided')
}
for (const t of root.listTextures()) {
  const [w, h] = t.getSize()
  if (Math.max(w, h) > 1024 || (t.getName() === 'bark' && Math.max(w, h) > 512)) bad(`texture ${t.getName()} ${w}x${h} too large`)
}
const tris = (n) => n.getMesh().listPrimitives().reduce((a, p) => a + p.getIndices().getCount() / 3, 0)
const rows = []
for (const n of (doc.getRoot().getDefaultScene() ?? root.listScenes()[0]).listChildren()) {
  const l0 = n.listChildren().find((c) => c.getName() === 'LOD0')
  const l1 = n.listChildren().find((c) => c.getName() === 'LOD1')
  if (!l0 || !l1) { bad(`${n.getName()}: missing LOD0/LOD1`); continue }
  const dead = /^Dead/.test(n.getName())
  const [t0, t1] = [tris(l0), tris(l1)]
  if (t0 > (dead ? 2000 : 3000)) bad(`${n.getName()} LOD0 ${t0} tris over budget`)
  if (t1 > 800) bad(`${n.getName()} LOD1 ${t1} tris over budget`)
  for (const l of [l0, l1]) {
    if (l.getScale().some((v) => v !== 1) || l.getTranslation().some((v) => v !== 0) || l.getSkin()) bad(`${n.getName()}/${l.getName()} has a transform/skin`)
    for (const p of l.getMesh().listPrimitives()) {
      const w = p.getAttribute('COLOR_0')
      if (!w) bad(`${n.getName()} missing COLOR_0 wind`)
    }
  }
  const b0 = getBounds(l0), b1 = getBounds(l1)
  const dB = Math.max(...b0.min.map((v, i) => Math.abs(v - b1.min[i])), ...b0.max.map((v, i) => Math.abs(v - b1.max[i])))
  if (b0.min[1] > 0.05 || b0.min[1] < -0.6) bad(`${n.getName()} base not at y=0 (${b0.min[1]})`)
  const row = meta.rows.find((r) => r.name === n.getName())
  if (!row) bad(`${n.getName()} not in impostor json`)
  else if (Math.abs(row.maxY - b0.max[1]) > 0.01) bad(`${n.getName()} json maxY ${row.maxY} vs ${b0.max[1]}`)
  rows.push(`${n.getName().padEnd(12)} LOD0 ${String(t0).padStart(4)}  LOD1 ${String(t1).padStart(4)}  LOD0-vs-LOD1 bounds delta ${dB.toFixed(2)} m  height ${b0.max[1].toFixed(2)}`)
}
const png = await sharp(`${dir}/trees-impostors.png`).metadata()
if (png.width !== meta.views * meta.cell || png.height !== meta.rows.length * meta.cell || !png.hasAlpha) bad(`impostor png ${png.width}x${png.height}`)
console.log(rows.join('\n'))
for (const f of ['trees.glb', 'trees-impostors.png', 'trees-impostors.json']) console.log(`${f}: ${(statSync(`${dir}/${f}`).size / 1024).toFixed(0)} KB`)
if (errs.length) { console.error(`FAIL\n${errs.join('\n')}`); process.exit(1) }
console.log('OK: trees contract')
