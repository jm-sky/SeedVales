#!/usr/bin/env node
/**
 * Offline tree asset build (render--007 step 3; contract: docs/design/render-tree-assets-contract.md).
 *   node scripts/assets/build-trees.mjs [--only=Pine_A,Dead_A] [--sheet] [--out=public/assets]
 *
 * Source: Quaternius Stylized Nature MegaKit (CC0) in _temp/extracted/. Pure Node (glTF Transform, meshoptimizer, sharp,
 * a tiny software rasteriser) — Blender is only used afterwards for the verification sheets (blender-tree-sheet.py).
 * Output (public/assets/): trees.glb (variant root > LOD0 / LOD1), trees-impostors.png, trees-impostors.json.
 *
 * Per variant: scale to a real height, recentre the trunk on the origin, remap leaf cards into one shared atlas,
 * LOD0 = invisible/least visible leaf cards culled + bark simplified to the 3 k budget, LOD1 = bark simplified harder
 * + leaf cards merged into fewer larger quads (card scale tuned by silhouette IoU against LOD0), impostors = 8 views
 * rasterised from LOD0 (unlit albedo x soft AO, alpha = coverage).
 */
import { Document, NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { quantize, reorder } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { buildTextures, REGIONS, remapLeafUv } from './trees/atlas.mjs'
import { applyCrownAo, cardVisibility, crownAo, cullCards, leafOverdraw, mergeCards, windBark } from './trees/lod.mjs'
import { bounds, components, loadSource, simplifyMesh, transformInPlace, triCount } from './trees/mesh.mjs'
import { regionCuts } from './trees/outline.mjs'
import { bleed, impostorCamera, makeCamera, rasterize, resolve as resolveBuf } from './trees/raster.mjs'

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready])

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SRC = `${ROOT}/_temp/extracted/Stylized_Nature_MegaKitStandard`
const args = process.argv.slice(2)
const flag = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const OUT = resolve(ROOT, flag('out') ?? 'public/assets')
const ONLY = flag('only')?.split(',')

/** Budgets (D-REN-11 / contract): LOD0 <= 3000 (dead 2000), LOD1 <= 800. */
const BUDGET = { lod0: 3000, lod0Dead: 2000, lod1: 800, lod1Tight: 1000, lod1Pine: 450 }
/** LOD1 leaf cards: `tight` (cut to the card texture outline, round 2) or `merged` (full-rectangle quads, session 12) */
const LOD1_MODE = flag('lod1') ?? 'tight'
/** minimum silhouette IoU (LOD0 vs LOD1, 8 views) a tight LOD1 candidate must reach to be eligible */
const MIN_IOU = 0.86
const CELL = 256
const VIEWS = 8
const SS = 4

const VARIANTS = [
  { name: 'Broadleaf_A', kind: 'tree_broad', src: 'CommonTree_1', height: 11, leaf: 'broad', leafCap: 1500, bark1: 220 },
  { name: 'Broadleaf_B', kind: 'tree_broad', src: 'CommonTree_3', height: 13.5, leaf: 'broad', leafCap: 1500, bark1: 220 },
  { name: 'Broadleaf_C', kind: 'tree_broad', src: 'CommonTree_4', height: 12, leaf: 'broad', leafCap: 1300, bark1: 240 },
  { name: 'Apple_A', kind: 'tree_apple', src: 'CommonTree_5', height: 5.2, leaf: 'apple', leafCap: 1300, bark1: 200 },
  { name: 'Pine_A', kind: 'tree_pine', src: 'Pine_1', height: 14, leaf: 'pine', leafCap: 1200, bark1: 200, bark1Tight: 110, width: 0.62 },
  { name: 'Pine_B', kind: 'tree_pine', src: 'Pine_4', height: 18, leaf: 'pine', leafCap: 1200, bark1: 200, bark1Tight: 110, width: 0.6 },
  { name: 'Dead_A', kind: 'tree_dead', src: 'DeadTree_2', height: 9.5, leaf: null, leafCap: 0, bark1: 760 },
]

const f1 = (v) => +v.toFixed(3)
const log = (...a) => console.log(...a)

// ---- 1. sources, textures ---------------------------------------------------------------------------------------------
const sources = {}
for (const v of VARIANTS) sources[v.name] = await loadSource(`${SRC}/glTF/${v.src}.gltf`)

const pineU = [1, 0]
for (const v of VARIANTS.filter((x) => x.leaf === 'pine')) {
  const uv = sources[v.name].leaf.uv
  for (let i = 0; i < uv.length; i += 2) {
    pineU[0] = Math.min(pineU[0], uv[i])
    pineU[1] = Math.max(pineU[1], uv[i])
  }
}
log(`pine card UV strip u ${f1(pineU[0])}..${f1(pineU[1])}`)
const tex = await buildTextures(`${SRC}/Textures`, pineU)
const barkTex = tex.bark.tex
const leafTex = tex.leaf.tex
const uvFull = {
  broad: [REGIONS.broad.x / 1024, REGIONS.broad.y / 1024, (REGIONS.broad.x + REGIONS.broad.w) / 1024, (REGIONS.broad.y + REGIONS.broad.h) / 1024],
  apple: [REGIONS.apple.x / 1024, REGIONS.apple.y / 1024, (REGIONS.apple.x + REGIONS.apple.w) / 1024, (REGIONS.apple.y + REGIONS.apple.h) / 1024],
  pine: [REGIONS.pine.x / 1024, REGIONS.pine.y / 1024, (REGIONS.pine.x + REGIONS.pine.w) / 1024, (REGIONS.pine.y + REGIONS.pine.h) / 1024],
}

// ---- 2. per-variant LODs ----------------------------------------------------------------------------------------------
const silhouette = (parts, cam) => {
  const buf = rasterize(parts, cam, CELL, CELL)
  return buf.depth.map((d) => (d === Infinity ? 0 : 1))
}
const iou = (a, b) => {
  let i = 0
  let u = 0
  for (let k = 0; k < a.length; k++) {
    if (a[k] && b[k]) i++
    if (a[k] || b[k]) u++
  }
  return u ? i / u : 1
}
const partsOf = (bark, leaf) => [
  { mesh: bark, tex: barkTex, cutoff: 0, ids: null },
  ...(leaf ? [{ mesh: leaf, tex: leafTex, cutoff: 0.5, ids: null }] : []),
]

function buildVariant(v) {
  const src = sources[v.name]
  const bark = src.bark
  const leaf = src.leaf
  const srcB = bounds(bark)
  const s = v.height / srcB.max[1]
  // trunk axis = mean xz of the lowest bark vertices
  let cx = 0
  let cz = 0
  let n = 0
  for (let i = 0; i < bark.pos.length; i += 3) {
    if (bark.pos[i + 1] < 0.3) {
      cx += bark.pos[i]
      cz += bark.pos[i + 2]
      n++
    }
  }
  const off = [-(cx / n) * s, 0, -(cz / n) * s]
  for (const m of [bark, leaf].filter(Boolean)) transformInPlace(m, s, off, v.width ?? 1)
  if (leaf) remapLeafUv(leaf.uv, v.leaf, pineU)

  const info = { name: v.name, kind: v.kind, src: v.src, scale: f1(s) }
  // ---- LOD0
  let leaf0 = null
  if (leaf) {
    const comp = components(leaf)
    let rBound = 0
    for (const m of [bark, leaf]) for (let i = 0; i < m.pos.length; i += 3) rBound = Math.max(rBound, Math.hypot(m.pos[i], m.pos[i + 1] - v.height / 2, m.pos[i + 2]))
    rBound *= 1.05
    const vis = cardVisibility(leaf, comp, { mesh: bark, tex: barkTex, cutoff: 0, ids: null }, leafTex, rBound, v.height / 2)
    const cull = cullCards(leaf, comp, vis, v.leafCap, 4)
    leaf0 = cull.mesh
    info.cards = { src: comp.count, kept: components(leaf0).count, dropped: cull.dropped }
    applyCrownAo(leaf0, crownAo(leaf0))
  }
  const leafTris0 = leaf0 ? triCount(leaf0) : 0
  const capTotal = v.leaf ? BUDGET.lod0 : BUDGET.lod0Dead
  const bark0 = simplifyMesh(bark, Math.max(300, capTotal - leafTris0 - 40), { error: 0.1, flags: ['Permissive'] })
  info.lod0 = { bark: triCount(bark0), leaf: leafTris0, tris: triCount(bark0) + leafTris0 }

  const bb = bounds(bark0)
  const lb = leaf0 ? bounds(leaf0) : bb
  const all = { min: bb.min.map((x, i) => Math.min(x, lb.min[i])), max: bb.max.map((x, i) => Math.max(x, lb.max[i])) }
  let rad = 0
  for (const m of [bark0, leaf0].filter(Boolean)) for (let i = 0; i < m.pos.length; i += 3) rad = Math.max(rad, Math.hypot(m.pos[i], m.pos[i + 2]))
  const halfWidth = f1(rad * 1.02)
  const maxY = f1(all.max[1])
  info.bounds = { halfWidth, minY: 0, maxY, min: all.min.map(f1), max: all.max.map(f1) }

  // ---- LOD1
  const tight = LOD1_MODE === 'tight' && v.leaf
  const lodBudget = !tight ? BUDGET.lod1 : v.leaf === 'pine' ? BUDGET.lod1Pine : BUDGET.lod1Tight
  const bark1 = simplifyMesh(bark0, tight ? (v.bark1Tight ?? v.bark1) : v.bark1, { error: 0.1, flags: ['Permissive'] })
  let leaf1 = null
  let kappa = null
  if (leaf0 && tight) {
    const comp0 = components(leaf0)
    const cams = Array.from({ length: VIEWS }, (_, i) => impostorCamera(i, halfWidth, 0, maxY))
    const ref = cams.map((c) => silhouette(partsOf(bark0, leaf0), c))
    const cov = (sil) => sil.reduce((x, y) => x + y, 0)
    const refCov = ref.reduce((x, r) => x + cov(r), 0)
    const evaluate = (cand) => {
      let io = 0
      let c = 0
      cams.forEach((cam, i) => {
        const sil = silhouette(partsOf(bark1, cand), cam)
        io += iou(ref[i], sil)
        c += cov(sil)
      })
      return { iou: io / VIEWS, cov: c / refCov }
    }
    const region = REGIONS[v.leaf]
    const tris1 = triCount(bark1)
    const cands = []
    const windows = v.leaf === 'pine' ? [] : [1, 2, 3, 4]
    for (const w of windows) {
      for (const n of [4, 5, 6, 8]) {
        const cutSet = regionCuts(tex.leaf.tex, region, n, [w])
        const per = cutSet.cuts.reduce((a, c) => a + c.poly.length - 2, 0) / cutSet.cuts.length
        for (const kScale of [1, 0.75, 0.55]) {
          const k = Math.floor(((lodBudget - tris1) / per) * kScale)
          for (let kp = 0.3; kp <= 1.51; kp += 0.15) {
            const cand = mergeCards(leaf0, comp0, k, kp, uvFull[v.leaf], 3, cutSet)
            if (tris1 + triCount(cand) > lodBudget) continue
            applyCrownAo(cand, crownAo(leaf0))
            const e = evaluate(cand)
            const st = leafOverdraw(cand, leafTex, cams)
            cands.push({ ...e, ...st, kp, k, n, w, cand, cov0: cutSet.cuts.reduce((a, c) => a + c.coverage, 0) / cutSet.cuts.length })
          }
        }
      }
    }
    if (v.leaf === 'pine') {
      // the kit's pine cards are already cut to the needle outline (bent, ~22 tris each): simplifying them keeps the droop
      for (const err of [0.2]) {
        for (let target = 200; target <= lodBudget - tris1; target += 20) {
          const cand = simplifyMesh(leaf0, target, { error: err, uvWeight: 0.5, flags: ['Permissive'] })
          if (tris1 + triCount(cand) > lodBudget) continue
          const e = evaluate(cand)
          const st = leafOverdraw(cand, leafTex, cams)
          cands.push({ ...e, ...st, kp: 0, k: 0, n: 0, w: 0, simp: err, cand })
        }
      }
    }
    const ok = cands.filter((c) => c.iou >= MIN_IOU && Math.abs(c.cov - 1) <= 0.08)
    const pool = ok.length ? ok : cands
    const best = v.leaf === 'pine' ? pool.reduce((a, b) => (b.iou > a.iou ? b : a)) : ok.length ? pool.reduce((a, b) => (b.area < a.area ? b : a)) : pool.reduce((a, b) => (b.iou - 0.5 * Math.abs(b.cov - 1) > a.iou - 0.5 * Math.abs(a.cov - 1) ? b : a))
    if (process.env.SV_TREES_DEBUG) for (const c of cands.filter((c) => c.iou >= 0.8).sort((a, b) => a.area - b.area).slice(0, 14)) console.log(`   cand ${c.simp ? `simp${c.simp}` : ''} w${c.w} n${c.n} k${c.k} kp${c.kp.toFixed(2)} tris${c.tris} iou ${c.iou.toFixed(3)} cov ${c.cov.toFixed(2)} area ${c.area.toFixed(1)} opq ${c.opaqueRatio.toFixed(2)} od ${c.overdraw.toFixed(2)}`)
    leaf1 = best.cand
    kappa = best.kp ? f1(best.kp) : null
    info.lod1Iou = f1(best.iou)
    info.lod1How = best.simp ? `simplified(err ${best.simp})` : `tight(w${best.w},n${best.n})`
    info.lod1Coverage = f1(best.cov)
    info.lod1Stats = { cards: best.cards, area: f1(best.area), opaqueRatio: f1(best.opaqueRatio), overdraw: f1(best.overdraw) }
  } else if (leaf0) {
    const comp0 = components(leaf0)
    const k = Math.floor((BUDGET.lod1 - triCount(bark1)) / 2)
    const cams = Array.from({ length: VIEWS }, (_, i) => impostorCamera(i, halfWidth, 0, maxY))
    const ref = cams.map((c) => silhouette(partsOf(bark0, leaf0), c))
    const cov = (sil) => sil.reduce((x, y) => x + y, 0)
    const refCov = ref.reduce((x, r) => x + cov(r), 0)
    const evaluate = (cand) => {
      let io = 0
      let c = 0
      cams.forEach((cam, i) => {
        const sil = silhouette(partsOf(bark1, cand), cam)
        io += iou(ref[i], sil)
        c += cov(sil)
      })
      io /= VIEWS
      return { iou: io, cov: c / refCov, score: io - 0.5 * Math.abs(c / refCov - 1) }
    }
    let best = { score: -1 }
    for (let kp = 0.3; kp <= 1.31; kp += 0.1) {
      const cand = mergeCards(leaf0, comp0, k, kp, uvFull[v.leaf], 3)
      applyCrownAo(cand, crownAo(leaf0))
      const e = evaluate(cand)
      if (e.score > best.score) best = { ...e, kp, cand, how: 'merged' }
    }
    // bent multi-triangle cards (conifers): simplifying the card mesh keeps the droop better than flat merged quads
    const simpTarget = BUDGET.lod1 - triCount(bark1)
    if (simpTarget < triCount(leaf0)) {
      const simp = simplifyMesh(leaf0, simpTarget, { error: 0.2, uvWeight: 0.5, flags: ['Permissive'] })
      const e = evaluate(simp)
      if (e.score > best.score) best = { ...e, kp: null, cand: simp, how: 'simplified' }
    }
    leaf1 = best.cand
    kappa = best.kp ? f1(best.kp) : null
    info.lod1Iou = f1(best.iou)
    info.lod1How = best.how
    info.lod1Coverage = f1(best.cov)
    const st = leafOverdraw(leaf1, leafTex, cams)
    info.lod1Stats = { cards: st.cards, area: f1(st.area), opaqueRatio: f1(st.opaqueRatio), overdraw: f1(st.overdraw) }
  } else {
    const cams = Array.from({ length: VIEWS }, (_, i) => impostorCamera(i, halfWidth, 0, maxY))
    info.lod1Iou = f1(cams.reduce((a, c) => a + iou(silhouette(partsOf(bark0, null), c), silhouette(partsOf(bark1, null), c)), 0) / VIEWS)
  }
  info.lod1 = { bark: triCount(bark1), leaf: leaf1 ? triCount(leaf1) : 0, tris: triCount(bark1) + (leaf1 ? triCount(leaf1) : 0), kappa }

  // wind weights (+ AO in G) as COLOR_0
  const colors = (m, isLeaf) => {
    const c = new Float32Array((m.pos.length / 3) * 3)
    const w = isLeaf ? null : windBark(m, maxY, halfWidth)
    for (let i = 0; i < m.ao.length; i++) {
      c[i * 3] = isLeaf ? 1 : w[i]
      c[i * 3 + 1] = m.ao[i]
      c[i * 3 + 2] = 1
    }
    return c
  }
  return {
    v,
    info,
    halfWidth,
    maxY,
    lods: {
      LOD0: { bark: bark0, leaf: leaf0, barkCol: colors(bark0, false), leafCol: leaf0 && colors(leaf0, true) },
      LOD1: { bark: bark1, leaf: leaf1, barkCol: colors(bark1, false), leafCol: leaf1 && colors(leaf1, true) },
    },
  }
}

const built = []
for (const v of VARIANTS) {
  if (ONLY && !ONLY.includes(v.name)) continue
  const r = buildVariant(v)
  built.push(r)
  const i = r.info
  log(`${v.name.padEnd(12)} ${v.src.padEnd(13)} x${i.scale}  LOD0 ${i.lod0.tris} (bark ${i.lod0.bark} + leaf ${i.lod0.leaf})  LOD1 ${i.lod1.tris} (bark ${i.lod1.bark} + leaf ${i.lod1.leaf}, ${i.lod1How} k=${i.lod1.kappa}, IoU ${i.lod1Iou} cov ${i.lod1Coverage})  cards ${i.cards ? `${i.cards.src}->${i.cards.kept} (drop ${JSON.stringify(i.cards.dropped)})` : '-'}  hw ${r.halfWidth} H ${r.maxY}`)
}

// ---- 3. impostor atlas --------------------------------------------------------------------------------------------------
const rows = built.length
const sheetW = VIEWS * CELL
const sheetH = rows * CELL
const sheet = new Uint8ClampedArray(sheetW * sheetH * 4)
const normalSheet = new Uint8ClampedArray(sheetW * sheetH * 4)
const rowsMeta = []
built.forEach((b, row) => {
  const parts = partsOf(b.lods.LOD0.bark, b.lods.LOD0.leaf)
  for (let k = 0; k < VIEWS; k++) {
    const cam = impostorCamera(k, b.halfWidth, 0, b.maxY)
    const img = bleed(resolveBuf(rasterize(parts, cam, CELL * SS, CELL * SS), SS), 10)
    // GL convention: row 0 at the bottom of the image
    const y0 = (rows - 1 - row) * CELL
    for (let y = 0; y < CELL; y++) sheet.set(img.data.subarray(y * CELL * 4, (y + 1) * CELL * 4), ((y0 + y) * sheetW + k * CELL) * 4)
    // normal atlas (same layout and coverage): view-space normals, renormalised after the supersample average
    const nImg = bleed(resolveBuf(rasterize(parts.map((p) => ({ ...p, normalView: true })), cam, CELL * SS, CELL * SS), SS), 10)
    for (let i = 0; i < nImg.data.length; i += 4) {
      const x = nImg.data[i] / 127.5 - 1, y = nImg.data[i + 1] / 127.5 - 1, z = nImg.data[i + 2] / 127.5 - 1
      const l = Math.hypot(x, y, z)
      if (l > 1e-3) {
        nImg.data[i] = (x / l * 0.5 + 0.5) * 255
        nImg.data[i + 1] = (y / l * 0.5 + 0.5) * 255
        nImg.data[i + 2] = (z / l * 0.5 + 0.5) * 255
      } else {
        nImg.data[i] = 127.5
        nImg.data[i + 1] = 127.5
        nImg.data[i + 2] = 255
      }
    }
    for (let y = 0; y < CELL; y++) normalSheet.set(nImg.data.subarray(y * CELL * 4, (y + 1) * CELL * 4), ((y0 + y) * sheetW + k * CELL) * 4)
  }
  rowsMeta.push({ name: b.v.name, kind: b.v.kind, halfWidth: b.halfWidth, minY: 0, maxY: b.maxY })
})

// ---- 4. trees.glb ---------------------------------------------------------------------------------------------------------
const doc = new Document()
const buffer = doc.createBuffer()
const barkMat = doc
  .createMaterial('Bark')
  .setBaseColorTexture(doc.createTexture('bark').setImage(tex.bark.jpeg).setMimeType('image/jpeg'))
  .setAlphaMode('OPAQUE')
  .setDoubleSided(false)
  .setRoughnessFactor(1)
  .setMetallicFactor(0)
const leafMat = doc
  .createMaterial('Leaves')
  .setBaseColorTexture(doc.createTexture('leaves').setImage(tex.leaf.png).setMimeType('image/png'))
  .setAlphaMode('MASK')
  .setAlphaCutoff(0.5)
  .setDoubleSided(true)
  .setRoughnessFactor(1)
  .setMetallicFactor(0)
const scene = doc.createScene('trees')
doc.getRoot().setDefaultScene(scene)
const prim = (m, col, mat) => {
  const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buffer)
  return doc
    .createPrimitive()
    .setMaterial(mat)
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(m.pos.length / 3 > 65535 ? m.idx : Uint16Array.from(m.idx)).setBuffer(buffer))
    .setAttribute('POSITION', acc('VEC3', m.pos))
    .setAttribute('NORMAL', acc('VEC3', m.nrm))
    .setAttribute('TEXCOORD_0', acc('VEC2', m.uv))
    .setAttribute('COLOR_0', acc('VEC3', col))
}
for (const b of built) {
  const root = doc.createNode(b.v.name).setExtras({ kind: b.v.kind, source: `Quaternius Stylized Nature MegaKit ${b.v.src} (CC0)`, halfWidth: b.halfWidth, minY: 0, maxY: b.maxY })
  for (const [lod, d] of Object.entries(b.lods)) {
    const mesh = doc.createMesh(`${b.v.name}_${lod}`)
    mesh.addPrimitive(prim(d.bark, d.barkCol, barkMat))
    if (d.leaf) mesh.addPrimitive(prim(d.leaf, d.leafCol, leafMat))
    root.addChild(doc.createNode(lod).setMesh(mesh))
  }
  scene.addChild(root)
}
doc.createExtension(KHRMeshQuantization).setRequired(true)
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })
// positions stay float32 (no node scale/translation: LOD0/LOD1 nodes keep an identity transform for the game's template merge)
await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize({ pattern: /^(NORMAL|TEXCOORD_0|COLOR_0)$/, quantizeNormal: 10, quantizeTexcoord: 14, quantizeColor: 8 }))
mkdirSync(OUT, { recursive: true })
const io = new NodeIO().registerExtensions([KHRMeshQuantization, EXTMeshoptCompression]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
await io.write(`${OUT}/trees.glb`, doc)

// ---- 5. impostor files -------------------------------------------------------------------------------------------------------
await sharp(Buffer.from(sheet.buffer), { raw: { width: sheetW, height: sheetH, channels: 4 } }).png({ compressionLevel: 9, effort: 10 }).toFile(`${OUT}/trees-impostors.png`)
await sharp(Buffer.from(normalSheet.buffer), { raw: { width: sheetW, height: sheetH, channels: 4 } }).png({ compressionLevel: 9, effort: 10 }).toFile(`${OUT}/trees-impostors-normal.png`)
writeFileSync(
  `${OUT}/trees-impostors.json`,
  `${JSON.stringify({ views: VIEWS, cell: CELL, rowOrigin: 'bottom', rows: rowsMeta }, null, 2)}\n`,
)
writeFileSync(`${OUT}/trees-build.json`, `${JSON.stringify({ generator: 'scripts/assets/build-trees.mjs', budget: BUDGET, atlas: { leaf: REGIONS }, variants: built.map((b) => b.info) }, null, 2)}\n`)
log(`wrote ${OUT}/trees.glb, trees-impostors.png (${sheetW}x${sheetH}), trees-impostors.json, trees-build.json`)

if (args.includes('--sheet')) {
  const { writeContactSheet } = await import('./trees/sheet.mjs')
  await writeContactSheet(built, { barkTex, leafTex, partsOf, impostorSheet: { data: sheet, W: sheetW, H: sheetH }, cell: CELL, views: VIEWS, makeCamera, rasterize, resolveBuf, bleed })
}
