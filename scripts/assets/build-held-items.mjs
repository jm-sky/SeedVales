#!/usr/bin/env node
/**
 * Builds the profession "held items" kits (research 005 P3, plan render--006) into
 * public/assets/parked/props_held.glb + public/assets/parked/attachments.json.
 *
 * Provenance / licence:
 *  - axe, sword, shield, pouch, bottle, bag: Fantasy Props MegaKit [Standard] by Quaternius, CC0 1.0
 *    (_temp/extracted/Fantasy_Props_MegaKitStandard/License_Standard.txt), glTF versions only.
 *  - hammer, staff, quiver + arrows, bow: hand-modelled primitives generated below (boxes/tubes; the pack has no
 *    hammer, quiver, bow or staff). No AI generators (D-REN-8). Public domain / CC0 as well.
 *
 * Inputs:
 *  - scripts/assets/held-items-layout.json: written by the Blender MCP session (rest-pose world matrices, Y-up, of each
 *    kit frame and of every piece in it). Blender is dev-only (D-REN-8); no .blend is committed.
 *  - public/assets/characters/{Male,Female}_Peasant.glb: only the skeleton (bone rest transforms).
 * Output:
 *  - props_held.glb: one identity wrapper node `Kit_<Profession>` per kit (+ a `_mesh` child), ONE mesh with ONE primitive per
 *    kit, one shared material with vertex colours and no texture (the trim-sheet textures of the pack are sampled per triangle
 *    and baked into COLOR_0), flat shaded, meshopt. ≤ 1.5 k tris, ≤ 100 KB per kit (D-REN-11 "held items").
 *  - attachments.json: { profession id -> { node, bone, position, quaternion, scale, notes, female? } } = the transform of the kit
 *    node in the BONE's local space (glTF/three node space). The kit vertices are authored in the kit frame (see notes per kit).
 *
 * Usage:
 *   node scripts/assets/build-held-items.mjs --pieces <out.glb>   piece library in native frames (for the Blender placement)
 *   node scripts/assets/build-held-items.mjs                      kits + attachments from held-items-layout.json
 */
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, simplify, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '../..')
const PROPS = path.join(ROOT, '_temp/extracted/Fantasy_Props_MegaKitStandard/Exports/glTF')
const OUT_DIR = path.join(ROOT, 'public/assets/parked')
const LAYOUT = path.join(import.meta.dirname, 'held-items-layout.json')
await MeshoptEncoder.ready
await MeshoptDecoder.ready
await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

/** Kit definitions: which pieces, the bone, notes. Placement numbers come from the Blender layout file. */
export const KITS = {
  woodcutter: { node: 'Kit_Woodcutter', bone: 'hand_r', notes: 'felling axe held in the right fist, head up/forward; kit frame = grip' },
  blacksmith: { node: 'Kit_Blacksmith', bone: 'hand_r', notes: 'smith hammer held in the right fist; kit frame = grip' },
  shepherd: { node: 'Kit_Shepherd', bone: 'hand_r', notes: 'staff (1.6 m) held in the right fist, rope grip band; kit frame = grip' },
  guard: { node: 'Kit_Guard', bone: 'spine_01', notes: 'sword at the left hip (hilt up) + round shield on the back, dome backwards; kit frame = model axes at the bone head' },
  hunter: { node: 'Kit_Hunter', bone: 'spine_03', notes: 'quiver with arrows + bow slung on the back; kit frame = model axes at the bone head' },
  herbalist: { node: 'Kit_Herbalist', bone: 'spine_01', notes: 'belt pouch (front right) + bottle (front left); kit frame = model axes at the bone head' },
  trader: { node: 'Kit_Trader', bone: 'spine_01', notes: 'sack backpack + belt pouch (front, left of centre); kit frame = model axes at the bone head' },
}

/** Pack pieces: file + simplify ratio (tris budget per kit ≤ 1.5 k). */
const PACK = {
  axe: ['Axe_Bronze', 1],
  sword: ['Sword_Bronze', 0.4],
  shield: ['Shield_Wooden', 0.45],
  pouch: ['Pouch_Large', 0.5],
  bottle: ['Bottle_1', 0.7],
  bag: ['Bag', 0.5],
}

// ---------- tiny geometry kit: triangle soups { pos: number[], col: number[] } (flat shaded, per-triangle colour) ----------
const srgb2lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const hex = (h) => [srgb2lin(((h >> 16) & 255) / 255), srgb2lin(((h >> 8) & 255) / 255), srgb2lin((h & 255) / 255)]
const soup = () => ({ pos: [], col: [] })
function tri(s, a, b, c, col) {
  s.pos.push(...a, ...b, ...c)
  s.col.push(...col, ...col, ...col)
}
function quad(s, a, b, c, d, col) {
  tri(s, a, b, c, col)
  tri(s, a, c, d, col)
}
function box(s, [x0, y0, z0], [x1, y1, z1], col) {
  const p = (x, y, z) => [x, y, z]
  const v = [p(x0, y0, z0), p(x1, y0, z0), p(x1, y1, z0), p(x0, y1, z0), p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)]
  quad(s, v[0], v[3], v[2], v[1], col)
  quad(s, v[4], v[5], v[6], v[7], col)
  quad(s, v[0], v[1], v[5], v[4], col)
  quad(s, v[3], v[7], v[6], v[2], col)
  quad(s, v[0], v[4], v[7], v[3], col)
  quad(s, v[1], v[2], v[6], v[5], col)
}
/** Tapered prism along +Y from y0 (radius r0) to y1 (radius r1), centred on (cx, cz). Optional caps. */
function prism(s, y0, y1, r0, r1, sides, col, { cx = 0, cz = 0, capTop = true, capBottom = true, topCol = col } = {}) {
  const ring = (y, r) => Array.from({ length: sides }, (_, i) => [cx + Math.cos((i / sides) * Math.PI * 2) * r, y, cz + Math.sin((i / sides) * Math.PI * 2) * r])
  const a = ring(y0, r0)
  const b = ring(y1, r1)
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides
    quad(s, a[i], a[j], b[j], b[i], col)
  }
  if (capTop) for (let i = 0; i < sides; i++) tri(s, [cx, y1, cz], b[(i + 1) % sides], b[i], topCol)
  if (capBottom) for (let i = 0; i < sides; i++) tri(s, [cx, y0, cz], a[i], a[(i + 1) % sides], col)
}
/** Tube along a polyline in 3D (constant radius), `sides` per ring, open ends capped. */
function tube(s, pts, r, sides, col) {
  const rings = pts.map((p, k) => {
    const prev = pts[Math.max(0, k - 1)]
    const next = pts[Math.min(pts.length - 1, k + 1)]
    const t = [next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]]
    const tl = Math.hypot(...t)
    t[0] /= tl; t[1] /= tl; t[2] /= tl
    // any normal not parallel to t: use Z unless t is mostly Z
    const ref = Math.abs(t[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]
    const n1 = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]]
    const l1 = Math.hypot(...n1)
    n1[0] /= l1; n1[1] /= l1; n1[2] /= l1
    const n2 = [t[1] * n1[2] - t[2] * n1[1], t[2] * n1[0] - t[0] * n1[2], t[0] * n1[1] - t[1] * n1[0]]
    return Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2
      const c = Math.cos(a) * r
      const sn = Math.sin(a) * r
      return [p[0] + n1[0] * c + n2[0] * sn, p[1] + n1[1] * c + n2[1] * sn, p[2] + n1[2] * c + n2[2] * sn]
    })
  })
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides
      quad(s, rings[k][i], rings[k + 1][i], rings[k + 1][j], rings[k][j], col)
    }
  }
  for (const [k, flip] of [[0, true], [rings.length - 1, false]]) {
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides
      if (flip) tri(s, pts[k], rings[k][j], rings[k][i], col)
      else tri(s, pts[k], rings[k][i], rings[k][j], col)
    }
  }
}

const WOOD = hex(0x7a5230)
const WOOD_DARK = hex(0x4e3320)
const IRON = hex(0x5d6066)
const IRON_DARK = hex(0x3b3d42)
const LEATHER = hex(0x6b4426)
const ROPE = hex(0xb39b6a)
const STRING = hex(0xd8cfae)
const SHAFT = hex(0xb08a55)
const FEATHER = hex(0xd9d2bd)

/** Hand-modelled pieces, native frame: Y up, front = +Z, metres. Origin: grip for hand tools, centre otherwise. */
const PROCEDURAL = {
  // smith hammer: handle y -0.16..0.26 (grip at 0), forged head at the top
  hammer() {
    const s = soup()
    prism(s, -0.16, 0.26, 0.017, 0.015, 8, WOOD)
    box(s, [-0.075, 0.2, -0.04], [0.075, 0.29, 0.04], IRON)
    box(s, [-0.083, 0.2, -0.045], [-0.075, 0.29, 0.045], IRON_DARK)
    box(s, [0.075, 0.215, -0.025], [0.1, 0.275, 0.025], IRON_DARK)
    return s
  },
  // shepherd's staff, 1.64 m, grip at the origin (1.0 m above the foot); rope-wrapped grip band and a knob
  staff() {
    const s = soup()
    prism(s, -1.0, 0.56, 0.019, 0.016, 8, WOOD)
    prism(s, -0.1, 0.1, 0.0235, 0.0235, 8, ROPE, { capTop: false, capBottom: false })
    prism(s, 0.54, 0.6, 0.034, 0.034, 8, WOOD_DARK)
    prism(s, 0.6, 0.64, 0.034, 0.016, 8, WOOD_DARK)
    return s
  },
  // quiver: tapered leather tube with arrows sticking out; origin at the quiver's centre, opening up
  quiver() {
    const s = soup()
    prism(s, -0.27, 0.27, 0.045, 0.062, 8, LEATHER, { topCol: hex(0x2a1c10) })
    prism(s, 0.22, 0.28, 0.066, 0.066, 8, WOOD_DARK, { capTop: false, capBottom: false })
    const arrows = [[0, 0, 0.5], [0.022, 0.012, 0.47], [-0.02, 0.01, 0.52], [0.008, -0.022, 0.46], [-0.012, -0.018, 0.49]]
    for (const [x, z, top] of arrows) {
      prism(s, 0.2, top, 0.006, 0.006, 5, SHAFT, { cx: x, cz: z, capBottom: false })
      prism(s, top - 0.09, top, 0.011, 0.011, 4, FEATHER, { cx: x, cz: z, capTop: false, capBottom: false })
    }
    return s
  },
  // short bow, tips at y ±0.55, belly bulging toward +Z, string on the -Z side; origin at the grip
  bow() {
    const s = soup()
    const pts = Array.from({ length: 13 }, (_, i) => {
      const y = -0.55 + (i / 12) * 1.1
      const u = y / 0.55
      return [0, y, 0.11 * (1 - u * u)]
    })
    tube(s, pts, 0.014, 6, WOOD)
    box(s, [-0.0025, -0.545, -0.0025], [0.0025, 0.545, 0.0025], STRING)
    prism(s, -0.07, 0.07, 0.019, 0.019, 6, LEATHER, { cz: 0.11, capTop: false, capBottom: false })
    return s
  },
}

// ---------- 4x4 matrices, column-major (glTF layout), Float64 ----------
function mul(a, b) {
  const o = new Array(16).fill(0)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return o
}
function invAffine(m) {
  // 3x3 part A[r][c] = m[c * 4 + r] (column-major); adjugate / determinant
  const A = (r, c) => m[c * 4 + r]
  const cof = (r, c) => {
    const c1 = (c + 1) % 3, c2 = (c + 2) % 3, r1 = (r + 1) % 3, r2 = (r + 2) % 3
    return A(r1, c1) * A(r2, c2) - A(r1, c2) * A(r2, c1)
  }
  const det = A(0, 0) * cof(0, 0) + A(0, 1) * cof(0, 1) + A(0, 2) * cof(0, 2)
  const R = (r, c) => cof(c, r) / det // inverse = adjugate (transposed cofactors) / det
  const o = new Array(16).fill(0)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[c * 4 + r] = R(r, c)
  for (let r = 0; r < 3; r++) o[12 + r] = -(R(r, 0) * m[12] + R(r, 1) * m[13] + R(r, 2) * m[14])
  o[15] = 1
  return o
}
function decompose(m) {
  const sx = Math.hypot(m[0], m[1], m[2])
  const sy = Math.hypot(m[4], m[5], m[6])
  const sz = Math.hypot(m[8], m[9], m[10])
  const r = [m[0] / sx, m[1] / sx, m[2] / sx, m[4] / sy, m[5] / sy, m[6] / sy, m[8] / sz, m[9] / sz, m[10] / sz]
  const tr = r[0] + r[4] + r[8]
  let q
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2
    q = [(r[5] - r[7]) / s, (r[6] - r[2]) / s, (r[1] - r[3]) / s, s / 4]
  } else if (r[0] > r[4] && r[0] > r[8]) {
    const s = Math.sqrt(1 + r[0] - r[4] - r[8]) * 2
    q = [s / 4, (r[3] + r[1]) / s, (r[6] + r[2]) / s, (r[5] - r[7]) / s]
  } else if (r[4] > r[8]) {
    const s = Math.sqrt(1 + r[4] - r[0] - r[8]) * 2
    q = [(r[3] + r[1]) / s, s / 4, (r[7] + r[5]) / s, (r[6] - r[2]) / s]
  } else {
    const s = Math.sqrt(1 + r[8] - r[0] - r[4]) * 2
    q = [(r[6] + r[2]) / s, (r[7] + r[5]) / s, s / 4, (r[1] - r[3]) / s]
  }
  if (q[3] < 0) q = q.map((v) => -v)
  return { position: [m[12], m[13], m[14]], quaternion: q, scale: [sx, sy, sz] }
}
const round = (v, n = 5) => Math.round(v * 10 ** n) / 10 ** n
const xform = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]

// ---------- pack pieces: simplify, then bake the trim-sheet colour per triangle ----------
const imgCache = new Map()
async function decodeTexture(tex) {
  if (!imgCache.has(tex)) {
    const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    imgCache.set(tex, { data, w: info.width, h: info.height })
  }
  return imgCache.get(tex)
}

async function packPiece(file, ratio) {
  const doc = await io.read(path.join(PROPS, `${file}.gltf`))
  if (ratio < 1) await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.03 }))
  const s = soup()
  const scene = doc.getRoot().listScenes()[0]
  const nodes = []
  scene.traverse((n) => { if (n.getMesh()) nodes.push(n) })
  for (const n of nodes) {
    const m = n.getWorldMatrix()
    for (const prim of n.getMesh().listPrimitives()) {
      const P = prim.getAttribute('POSITION')
      const UV = prim.getAttribute('TEXCOORD_0')
      const C = prim.getAttribute('COLOR_0')
      const mat = prim.getMaterial()
      const baseTex = mat?.getBaseColorTexture()
      const tex = baseTex ? await decodeTexture(baseTex) : null
      const factor = mat?.getBaseColorFactor() ?? [1, 1, 1, 1]
      const idx = prim.getIndices()
      const count = idx ? idx.getCount() : P.getCount()
      const get = (a, i, out) => a.getElement(i, out)
      const tmp = [0, 0, 0]
      const tmp2 = [0, 0]
      const tmp4 = [1, 1, 1, 1]
      for (let t = 0; t < count; t += 3) {
        const ids = [0, 1, 2].map((k) => (idx ? idx.getScalar(t + k) : t + k))
        const pts = ids.map((i) => xform(m, get(P, i, tmp).slice()))
        let col = [1, 1, 1]
        if (tex && UV) {
          let u = 0, v = 0
          for (const i of ids) { get(UV, i, tmp2); u += tmp2[0] / 3; v += tmp2[1] / 3 }
          u -= Math.floor(u); v -= Math.floor(v)
          const px = Math.min(tex.w - 1, Math.floor(u * tex.w))
          const py = Math.min(tex.h - 1, Math.floor(v * tex.h))
          const o = (py * tex.w + px) * 4
          col = [srgb2lin(tex.data[o] / 255), srgb2lin(tex.data[o + 1] / 255), srgb2lin(tex.data[o + 2] / 255)]
        }
        if (C) {
          const vc = [0, 0, 0]
          for (const i of ids) { get(C, i, tmp4); vc[0] += tmp4[0] / 3; vc[1] += tmp4[1] / 3; vc[2] += tmp4[2] / 3 }
          col = col.map((c, k) => c * vc[k])
        }
        col = col.map((c, k) => c * factor[k])
        tri(s, pts[0], pts[1], pts[2], col)
      }
    }
  }
  return s
}

async function loadPieces() {
  const pieces = {}
  for (const [id, [file, ratio]] of Object.entries(PACK)) pieces[id] = await packPiece(file, ratio)
  for (const [id, fn] of Object.entries(PROCEDURAL)) pieces[id] = fn()
  return pieces
}

// ---------- glTF writer ----------
function soupToNode(doc, buffer, name, material, s, matrixFor = null) {
  const n = s.pos.length / 3
  const pos = new Float32Array(s.pos.length)
  const nor = new Float32Array(s.pos.length)
  for (let i = 0; i < n; i += 3) {
    const P = [0, 1, 2].map((k) => {
      const p = [s.pos[(i + k) * 3], s.pos[(i + k) * 3 + 1], s.pos[(i + k) * 3 + 2]]
      return matrixFor ? xform(matrixFor, p) : p
    })
    const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]]
    const e2 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]]
    let nn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const l = Math.hypot(...nn) || 1
    nn = nn.map((v) => v / l)
    for (let k = 0; k < 3; k++) {
      pos.set(P[k].map((v) => round(v, 6)), (i + k) * 3)
      nor.set(nn, (i + k) * 3)
    }
  }
  const col = new Float32Array(s.col)
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buffer))
    .setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(col).setBuffer(buffer))
    .setMaterial(material)
  const wrapper = doc.createNode(name)
  wrapper.addChild(doc.createNode(`${name}_mesh`).setMesh(doc.createMesh(name).addPrimitive(prim)))
  return wrapper
}

function newDoc() {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const material = doc.createMaterial('Held_Items').setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(1)
  return { doc, buffer, material, scene: doc.createScene('held') }
}

// ---------- skeleton rest transforms ----------
async function boneWorlds(file) {
  const doc = await io.read(path.join(ROOT, 'public/assets/characters', file))
  const out = {}
  doc.getRoot().listNodes().forEach((n) => { out[n.getName()] = n.getWorldMatrix() })
  return out
}

// ---------- main ----------
const argv = process.argv.slice(2)
const piecesOut = argv[0] === '--pieces' ? argv[1] : null
const pieces = await loadPieces()

if (piecesOut) {
  const { doc, buffer, material, scene } = newDoc()
  for (const [id, s] of Object.entries(pieces)) {
    scene.addChild(soupToNode(doc, buffer, `Piece_${id}`, material, s))
    console.log(id, s.pos.length / 9, 'tris')
  }
  await io.write(piecesOut, doc)
  process.exit(0)
}

const layout = JSON.parse(fs.readFileSync(LAYOUT, 'utf8'))
const male = await boneWorlds('Male_Peasant.glb')
const female = await boneWorlds('Female_Peasant.glb')
const { doc, buffer, material, scene } = newDoc()
const attachments = {}
const report = []
for (const [prof, kit] of Object.entries(KITS)) {
  const lay = layout.kits[prof]
  if (!lay) throw new Error(`layout has no kit ${prof}`)
  const Mk = lay.kit
  const MkInv = invAffine(Mk)
  const all = soup()
  for (const p of lay.pieces) {
    const P = mul(MkInv, p.matrix) // piece placement in the kit frame
    const src = pieces[p.id]
    if (!src) throw new Error(`unknown piece ${p.id}`)
    for (let i = 0; i < src.pos.length; i += 3) all.pos.push(...xform(P, [src.pos[i], src.pos[i + 1], src.pos[i + 2]]))
    all.col.push(...src.col)
  }
  scene.addChild(soupToNode(doc, buffer, kit.node, material, all))
  const T = decompose(mul(invAffine(male[kit.bone]), Mk))
  const entry = { node: kit.node, bone: kit.bone, position: T.position.map((v) => round(v)), quaternion: T.quaternion.map((v) => round(v)), scale: T.scale.map((v) => round(v, 4)), notes: kit.notes }
  // Female rig: same bone names; the offsets are bone-relative, so they carry over. Report how far the bone heads sit apart.
  const bm = male[kit.bone]
  const bf = female[kit.bone]
  const dh = Math.hypot(bm[12] - bf[12], bm[13] - bf[13], bm[14] - bf[14])
  report.push(`${prof}: ${kit.bone} male↔female bone head Δ ${(dh * 100).toFixed(1)} cm, ${all.pos.length / 9} tris`)
  attachments[prof] = entry
}
fs.mkdirSync(OUT_DIR, { recursive: true })
await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
const dst = path.join(OUT_DIR, 'props_held.glb')
await io.write(dst, doc)
fs.writeFileSync(path.join(OUT_DIR, 'attachments.json'), `${JSON.stringify(attachments, null, 2)}\n`)
console.log(`props_held.glb ${Math.round(fs.statSync(dst).size / 1024)} KB`)
console.log(report.join('\n'))

// ---------- self-check: kit vertices through bone world · attachment TRS (independent of the layout maths) ----------
const trsMatrix = ({ position: [px, py, pz], quaternion: [x, y, z, w], scale: [sx, sy, sz] }) => [
  (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
  2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
  2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
  px, py, pz, 1,
]
const check = await io.read(dst)
console.log('rest-pose world bounds of each kit (male rig, glTF Y-up) from attachments.json:')
for (const [prof, a] of Object.entries(attachments)) {
  const node = check.getRoot().listNodes().find((n) => n.getName() === a.node)
  const meshNode = node.listChildren()[0] // meshopt quantisation leaves a scale/offset on this node
  const world = mul(mul(male[a.bone], trsMatrix(a)), meshNode.getMatrix())
  const mn = [Infinity, Infinity, Infinity]
  const mx = [-Infinity, -Infinity, -Infinity]
  for (const prim of meshNode.getMesh().listPrimitives()) {
    const P = prim.getAttribute('POSITION')
    const v = [0, 0, 0]
    for (let i = 0; i < P.getCount(); i++) {
      const p = xform(world, P.getElement(i, v).slice())
      for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]) }
    }
  }
  console.log(`  ${prof}: [${mn.map((v) => v.toFixed(3))}] .. [${mx.map((v) => v.toFixed(3))}]`)
}
