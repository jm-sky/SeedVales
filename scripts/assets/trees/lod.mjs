/**
 * Leaf-card processing for the tree pipeline: visibility culling (LOD0), card merging (LOD1), AO and wind weights.
 * Pure geometry on plain-array meshes, deterministic (seeded).
 */
import { area, components, rng, subMesh, triCount } from './mesh.mjs'
import { makeCamera, rasterize } from './raster.mjs'

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const len = (a) => Math.hypot(a[0], a[1], a[2])
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const normalize = (a) => scale(a, 1 / (len(a) || 1))
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

const vpos = (m, v) => [m.pos[v * 3], m.pos[v * 3 + 1], m.pos[v * 3 + 2]]

/** Visible pixels per leaf card summed over many views (36 directions on a sphere cap, 256 px, alpha tested). */
export function cardVisibility(leaf, comp, barkPart, leafTex, radius, centerY) {
  const vis = new Float64Array(comp.count)
  const parts = [
    { mesh: leaf, tex: leafTex, cutoff: 0.5, ids: comp.tri },
  ]
  if (barkPart) parts.push(barkPart)
  for (const elev of [0, 35, 70]) {
    for (let az = 0; az < 360; az += 30) {
      const e = (elev * Math.PI) / 180
      const a = (az * Math.PI) / 180
      const fwd = [-Math.sin(a) * Math.cos(e), -Math.sin(e), -Math.cos(a) * Math.cos(e)]
      const cam = makeCamera(fwd, radius, radius, 0, centerY)
      const buf = rasterize(parts, cam, 256, 256)
      for (let i = 0; i < buf.id.length; i++) if (buf.id[i] >= 0) vis[buf.id[i]]++
    }
  }
  return vis
}

/** Keep cards ordered by visibility: drop invisible ones, then the least visible until `maxTris` fits. */
export function cullCards(leaf, comp, vis, maxTris, minVisible) {
  const triOf = Array.from({ length: comp.count }, () => [])
  comp.tri.forEach((c, t) => triOf[c].push(t))
  const order = [...triOf.keys()].sort((a, b) => vis[b] - vis[a])
  const keep = []
  let tris = 0
  const dropped = { invisible: 0, budget: 0 }
  for (const c of order) {
    if (vis[c] < minVisible) {
      dropped.invisible++
      continue
    }
    if (tris + triOf[c].length > maxTris) {
      dropped.budget++
      continue
    }
    keep.push(...triOf[c])
    tris += triOf[c].length
  }
  keep.sort((a, b) => a - b)
  return { mesh: subMesh(leaf, keep), dropped }
}

/** Per-card statistics for merging. */
function cardStats(leaf, comp) {
  const cards = Array.from({ length: comp.count }, () => ({ area: 0, c: [0, 0, 0], n: [0, 0, 0], dPdu: [0, 0, 0], dPdv: [0, 0, 0], ao: 0, tris: 0 }))
  for (let t = 0; t < triCount(leaf); t++) {
    const card = cards[comp.tri[t]]
    const [a, b, c] = [0, 1, 2].map((k) => leaf.idx[t * 3 + k])
    const pa = vpos(leaf, a), pb = vpos(leaf, b), pc = vpos(leaf, c)
    const ar = area(leaf, t)
    const e1 = sub(pb, pa), e2 = sub(pc, pa)
    const du1 = leaf.uv[b * 2] - leaf.uv[a * 2], dv1 = leaf.uv[b * 2 + 1] - leaf.uv[a * 2 + 1]
    const du2 = leaf.uv[c * 2] - leaf.uv[a * 2], dv2 = leaf.uv[c * 2 + 1] - leaf.uv[a * 2 + 1]
    const det = du1 * dv2 - du2 * dv1
    if (Math.abs(det) > 1e-12) {
      for (let k = 0; k < 3; k++) {
        card.dPdu[k] += ((e1[k] * dv2 - e2[k] * dv1) / det) * ar
        card.dPdv[k] += ((e2[k] * du1 - e1[k] * du2) / det) * ar
      }
    }
    for (let k = 0; k < 3; k++) {
      card.c[k] += ((pa[k] + pb[k] + pc[k]) / 3) * ar
      card.n[k] += (leaf.nrm[a * 3 + k] + leaf.nrm[b * 3 + k] + leaf.nrm[c * 3 + k]) * ar
    }
    card.ao += ((leaf.ao[a] + leaf.ao[b] + leaf.ao[c]) / 3) * ar
    card.area += ar
    card.tris++
  }
  for (const card of cards) {
    card.c = scale(card.c, 1 / card.area)
    card.ao /= card.area
    card.n = normalize(card.n)
    card.dPdu = scale(card.dPdu, 1 / card.area)
    card.dPdv = scale(card.dPdv, 1 / card.area)
  }
  return cards
}

/** k-means (k-means++ seeding, seeded RNG) on card centroids lifted along their normals, area-weighted. */
function kmeans(cards, k, lift, seed) {
  const rnd = rng(seed)
  const feat = cards.map((c) => [c.c[0] + c.n[0] * lift, c.c[1] + c.n[1] * lift, c.c[2] + c.n[2] * lift])
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  const centers = [feat[Math.floor(rnd() * feat.length)]]
  while (centers.length < k) {
    const dist = feat.map((f, i) => Math.min(...centers.map((c) => d2(f, c))) * cards[i].area)
    let r = rnd() * dist.reduce((a, b) => a + b, 0)
    let pick = 0
    for (; pick < dist.length - 1; pick++) {
      r -= dist[pick]
      if (r <= 0) break
    }
    centers.push(feat[pick])
  }
  let assign = new Int32Array(cards.length)
  for (let it = 0; it < 25; it++) {
    for (let i = 0; i < feat.length; i++) {
      let best = 0
      let bd = Infinity
      for (let j = 0; j < centers.length; j++) {
        const d = d2(feat[i], centers[j])
        if (d < bd) {
          bd = d
          best = j
        }
      }
      assign[i] = best
    }
    const sum = centers.map(() => [0, 0, 0, 0])
    for (let i = 0; i < feat.length; i++) {
      const s = sum[assign[i]]
      for (let q = 0; q < 3; q++) s[q] += feat[i][q] * cards[i].area
      s[3] += cards[i].area
    }
    sum.forEach((s, j) => {
      if (s[3] > 0) centers[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]
    })
  }
  return assign
}

/**
 * LOD1 leaves: merge cards into `k` larger quads. Each quad keeps the group's mean orientation, UV axes and
 * (area-weighted) vertex normal; its area is `kappa` times the summed card area (cards overlap, so < 1).
 * `uvFull` = the atlas rectangle [u0, v0, u1, v1] that one card maps to in full.
 * `cutSet` (from `regionCuts`) turns the quads into tight cards: each group takes one convex cut polygon of the card texture
 * (fan-triangulated) instead of the whole rectangle, and kappa then preserves the *opaque* area (kappa x summed opaque card area).
 */
export function mergeCards(leaf, comp, k, kappa, uvFull, seed = 1, cutSet = null) {
  const cards = cardStats(leaf, comp)
  k = Math.min(k, cards.length)
  let bmin = [Infinity, Infinity, Infinity]
  let bmax = [-Infinity, -Infinity, -Infinity]
  for (const c of cards) for (let i = 0; i < 3; i++) {
    bmin[i] = Math.min(bmin[i], c.c[i])
    bmax[i] = Math.max(bmax[i], c.c[i])
  }
  const lift = 0.12 * len(sub(bmax, bmin)) / Math.cbrt(k) * 3
  const assign = kmeans(cards, k, lift, seed)
  const pos = []
  const nrm = []
  const uv = []
  const ao = []
  const idx = []
  const up = [0, 1, 0]
  const rnd = rng(seed + 101)
  for (let g = 0; g < k; g++) {
    const members = cards.filter((_, i) => assign[i] === g)
    if (!members.length) continue
    let A = 0
    let c = [0, 0, 0]
    let n = [0, 0, 0]
    let du = [0, 0, 0]
    let dv = [0, 0, 0]
    let aoSum = 0
    let lu = 0
    let lv = 0
    for (const m of members) {
      A += m.area
      for (let q = 0; q < 3; q++) {
        c[q] += m.c[q] * m.area
        n[q] += m.n[q] * m.area
        du[q] += m.dPdu[q] * m.area
        dv[q] += m.dPdv[q] * m.area
      }
      aoSum += m.ao * m.area
      lu += len(m.dPdu) * m.area
      lv += len(m.dPdv) * m.area
    }
    c = scale(c, 1 / A)
    n = normalize(n)
    const ao1 = aoSum / A
    lu /= A
    lv /= A
    // card plane normal from the UV axes (sign-agnostic), axes re-orthogonalised against the plane normal
    let pn = cross(du, dv)
    if (len(pn) < 1e-9) pn = n
    pn = normalize(pn)
    let vAxis = normalize(sub(dv, scale(pn, dot(dv, pn))))
    if (len(vAxis) < 1e-6) vAxis = normalize(sub(up, scale(pn, dot(up, pn))))
    let uAxis = normalize(cross(vAxis, pn))
    if (dot(uAxis, du) < 0) uAxis = scale(uAxis, -1)
    // size: aspect from the cards' world size per UV unit, area = kappa * summed card area (card area = lu*lv*uvArea)
    const uvArea = (uvFull[2] - uvFull[0]) * (uvFull[3] - uvFull[1])
    const cardArea = lu * lv * uvArea
    const total = kappa * A
    const cut = cutSet ? cutSet.cuts[Math.floor(rnd() * cutSet.cuts.length)] : null
    // tight cut: scale so the polygon's opaque area = kappa x the group's opaque card area
    const s2 = cut ? (kappa * A * cutSet.regionOpaque) / (cut.opaque * cardArea || 1) : total / (cardArea || 1)
    const sc = Math.sqrt(s2)
    const hw = (lu * (uvFull[2] - uvFull[0]) * sc) / 2
    const hh = (lv * (uvFull[3] - uvFull[1]) * sc) / 2
    const base = pos.length / 3
    const corners = cut
      ? cut.poly.map(([pu, pv]) => [2 * pu - 1, 2 * pv - 1, uvFull[0] + pu * (uvFull[2] - uvFull[0]), uvFull[1] + pv * (uvFull[3] - uvFull[1])])
      : [
          [-1, -1, uvFull[0], uvFull[1]],
          [1, -1, uvFull[2], uvFull[1]],
          [1, 1, uvFull[2], uvFull[3]],
          [-1, 1, uvFull[0], uvFull[3]],
        ]
    // polygon centroid (vertex average is enough) sits on the group centre
    const off = cut ? [corners.reduce((a, q) => a + q[0], 0) / corners.length, corners.reduce((a, q) => a + q[1], 0) / corners.length] : [0, 0]
    for (const [ux0, vy0, u, v] of corners) {
      const ux = ux0 - off[0]
      const vy = vy0 - off[1]
      pos.push(c[0] + uAxis[0] * hw * ux + vAxis[0] * hh * vy, c[1] + uAxis[1] * hw * ux + vAxis[1] * hh * vy, c[2] + uAxis[2] * hw * ux + vAxis[2] * hh * vy)
      nrm.push(...n)
      uv.push(u, v)
      ao.push(ao1)
    }
    for (let q = 1; q < corners.length - 1; q++) idx.push(base, base + q, base + q + 1)
  }
  return { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), uv: Float32Array.from(uv), ao: Float32Array.from(ao), idx: Uint32Array.from(idx) }
}

/** Crown AO: darker towards the crown interior (radial position vs the crown profile at that height) and the crown underside. */
export function crownAo(leaf) {
  const bins = 24
  let minY = Infinity
  let maxY = -Infinity
  for (let v = 0; v < leaf.pos.length / 3; v++) {
    minY = Math.min(minY, leaf.pos[v * 3 + 1])
    maxY = Math.max(maxY, leaf.pos[v * 3 + 1])
  }
  const prof = new Float32Array(bins)
  const binOf = (y) => Math.min(bins - 1, Math.floor(((y - minY) / (maxY - minY || 1)) * bins))
  for (let v = 0; v < leaf.pos.length / 3; v++) {
    const r = Math.hypot(leaf.pos[v * 3], leaf.pos[v * 3 + 2])
    const b = binOf(leaf.pos[v * 3 + 1])
    prof[b] = Math.max(prof[b], r)
  }
  const sm = prof.map((_, i) => Math.max(prof[Math.max(0, i - 1)], prof[i], prof[Math.min(bins - 1, i + 1)]))
  return (x, y, z) => {
    const r = Math.hypot(x, z)
    const q = Math.min(1, r / (sm[binOf(y)] || 1))
    const t = Math.min(1, Math.max(0, (y - minY) / (maxY - minY || 1)))
    const interior = 0.6 + 0.4 * Math.pow(q, 0.8)
    const under = 0.86 + 0.14 * Math.min(1, t * 2.2)
    return interior * under
  }
}

/** Overwrite leaf AO with the crown function evaluated per vertex. */
export function applyCrownAo(leaf, fn) {
  for (let v = 0; v < leaf.ao.length; v++) leaf.ao[v] = fn(leaf.pos[v * 3], leaf.pos[v * 3 + 1], leaf.pos[v * 3 + 2])
}

/** Wind weight (contract: R = 0 at the trunk base, 1 at twig tips / leaf cards). */
export function windBark(m, height, halfWidth) {
  const w = new Float32Array(m.pos.length / 3)
  for (let v = 0; v < w.length; v++) {
    const t = Math.min(1, Math.max(0, m.pos[v * 3 + 1] / height))
    const rr = Math.min(1, Math.hypot(m.pos[v * 3], m.pos[v * 3 + 2]) / halfWidth)
    w[v] = Math.min(1, 0.35 * Math.pow(t, 1.5) + 0.8 * Math.pow(rr, 1.2) * (0.4 + 0.6 * t))
  }
  return w
}

/**
 * Overdraw statistics of a leaf mesh against its alpha texture (cutoff 0.5): card count (connected pieces), total card area (m2),
 * opaque-coverage ratio (opaque area / card area, per-triangle UV sampling) and the mean *projected* card area over `cams`
 * relative to the silhouette of the leaves alone (>= 1; how often a covered pixel is rasterised).
 */
export function leafOverdraw(leaf, tex, cams) {
  let total = 0
  let opaque = 0
  const N = 10
  for (let t = 0; t < triCount(leaf); t++) {
    const ar = area(leaf, t)
    const [a, b, c] = [0, 1, 2].map((k) => leaf.idx[t * 3 + k])
    let on = 0
    let n = 0
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N - i; j++) {
        const l0 = (i + 1 / 3) / (N + 1)
        const l1 = (j + 1 / 3) / (N + 1)
        const l2 = 1 - l0 - l1
        const u = l0 * leaf.uv[a * 2] + l1 * leaf.uv[b * 2] + l2 * leaf.uv[c * 2]
        const v = l0 * leaf.uv[a * 2 + 1] + l1 * leaf.uv[b * 2 + 1] + l2 * leaf.uv[c * 2 + 1]
        const x = Math.min(tex.w - 1, Math.max(0, Math.floor(u * tex.w)))
        const y = Math.min(tex.h - 1, Math.max(0, Math.floor(v * tex.h)))
        if (tex.data[(y * tex.w + x) * 4 + 3] >= 128) on++
        n++
      }
    }
    total += ar
    opaque += ar * (on / n)
  }
  let proj = 0
  let sil = 0
  for (const cam of cams) {
    for (let t = 0; t < triCount(leaf); t++) {
      const [a, b, c] = [0, 1, 2].map((k) => vpos(leaf, leaf.idx[t * 3 + k]))
      proj += 0.5 * Math.abs(dot(cross(sub(b, a), sub(c, a)), cam.fwd))
    }
    const buf = rasterize([{ mesh: leaf, tex, cutoff: 0.5, ids: null }], cam, 128, 128)
    let px = 0
    for (let i = 0; i < buf.depth.length; i++) if (buf.depth[i] !== Infinity) px++
    sil += (px / (128 * 128)) * 4 * cam.halfW * cam.halfH
  }
  return { cards: components(leaf).count, tris: triCount(leaf), area: total, opaqueRatio: opaque / total, overdraw: proj / (sil || 1) }
}
