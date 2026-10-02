/**
 * Tight outlines for LOD1 leaf cards: a convex polygon (n vertices) that encloses every opaque texel of an atlas region.
 * Convex hull of the opaque texels, then greedy edge removal (neighbouring edges are extended to meet) that adds the least
 * area at each step. Result in region-local UV (0..1, v up like the atlas rows), counter-clockwise.
 */
const cross2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

function convexHull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const lower = []
  for (const q of p) {
    while (lower.length >= 2 && cross2(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper = []
  for (const q of p.slice().reverse()) {
    while (upper.length >= 2 && cross2(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

export function polygonArea(poly) {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a / 2
}

/** Intersection of line (a,b) with line (c,d); null when parallel. */
function lineHit(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]]
  const s = [d[0] - c[0], d[1] - c[1]]
  const den = r[0] * s[1] - r[1] * s[0]
  if (Math.abs(den) < 1e-12) return null
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den
  return [a[0] + r[0] * t, a[1] + r[1] * t]
}

/** Drop vertices until `n` remain: replace edge i by the meeting point of its neighbours, cheapest added area first. */
function reduceHull(poly, n) {
  poly = poly.slice()
  while (poly.length > n) {
    let best = null
    const m = poly.length
    for (let i = 0; i < m; i++) {
      const a = poly[(i - 1 + m) % m]
      const b = poly[i]
      const c = poly[(i + 1) % m]
      const d = poly[(i + 2) % m]
      const hit = lineHit(a, b, d, c)
      if (!hit) continue
      // the new vertex must lie beyond edge b-c (outside), otherwise the polygon would shrink
      if (cross2(b, c, hit) >= 0) continue
      const added = Math.abs(polygonArea([b, hit, c]))
      if (!best || added < best.added) best = { i, hit, added }
    }
    if (!best) {
      // no extension available (near-parallel neighbours): just drop the vertex that removes the least area
      let bi = 0
      let ba = Infinity
      for (let i = 0; i < m; i++) {
        const ar = Math.abs(polygonArea([poly[(i - 1 + m) % m], poly[i], poly[(i + 1) % m]]))
        if (ar < ba) {
          ba = ar
          bi = i
        }
      }
      poly.splice(bi, 1)
      continue
    }
    const { i, hit } = best
    const j = (i + 1) % m
    poly[i] = hit
    poly.splice(j, 1)
  }
  return poly
}

/**
 * @param tex atlas texture { data, w, h } (RGBA); @param region {x,y,w,h} in texels; @param n vertex count
 * @returns { poly: [[u,v]...] in region-local 0..1 (CCW, v up as in the atlas), opaque: fraction of the region that is opaque,
 *            polyArea: fraction of the region the polygon covers, coverage: opaque / polyArea }
 */
export function regionOutline(tex, region, n, cutoff = 0.5) {
  const pts = []
  let opaque = 0
  for (let y = 0; y < region.h; y++) {
    for (let x = 0; x < region.w; x++) {
      if (tex.data[((region.y + y) * tex.w + region.x + x) * 4 + 3] / 255 < cutoff) continue
      opaque++
      // texel corners (conservative); atlas v is stored top-down in the raw buffer, uv.v measures from the top as well
      pts.push([x / region.w, y / region.h], [(x + 1) / region.w, y / region.h], [x / region.w, (y + 1) / region.h], [(x + 1) / region.w, (y + 1) / region.h])
    }
  }
  const hull = convexHull(pts)
  const poly = reduceHull(hull, n)
  const polyArea = polygonArea(poly)
  const op = opaque / (region.w * region.h)
  return { poly, hullN: hull.length, opaque: op, polyArea, coverage: op / polyArea }
}

/** Opaque lobes (4-connected components of the alpha mask on a coarse grid, small specks dropped) as lists of texel-corner points. */
function opaqueLobes(tex, region, cutoff = 0.5, coarse = 4, minShare = 0.004) {
  const gw = Math.floor(region.w / coarse)
  const gh = Math.floor(region.h / coarse)
  const mask = new Uint8Array(gw * gh)
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let on = 0
      for (let y = 0; y < coarse && !on; y++) for (let x = 0; x < coarse; x++) if (tex.data[((region.y + gy * coarse + y) * tex.w + region.x + gx * coarse + x) * 4 + 3] / 255 >= cutoff) on = 1
      mask[gy * gw + gx] = on
    }
  }
  const lab = new Int32Array(gw * gh).fill(-1)
  const lobes = []
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || lab[s] >= 0) continue
    const id = lobes.length
    const cells = []
    const stack = [s]
    lab[s] = id
    while (stack.length) {
      const c = stack.pop()
      cells.push(c)
      const x = c % gw
      const y = (c - x) / gw
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx
        const yy = y + dy
        if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue
        const o = yy * gw + xx
        if (mask[o] && lab[o] < 0) {
          lab[o] = id
          stack.push(o)
        }
      }
    }
    lobes.push(cells)
  }
  const total = mask.reduce((a, b) => a + b, 0)
  return lobes
    .filter((c) => c.length / total >= minShare)
    .map((cells) => {
      const pts = []
      let cx = 0
      let cy = 0
      for (const c of cells) {
        const x = c % gw
        const y = (c - x) / gw
        cx += (x + 0.5) / gw
        cy += (y + 0.5) / gh
        pts.push([x / gw, y / gh], [(x + 1) / gw, y / gh], [x / gw, (y + 1) / gh], [(x + 1) / gw, (y + 1) / gh])
      }
      return { pts, c: [cx / cells.length, cy / cells.length], cells: cells.length }
    })
}

/**
 * Candidate cuts for a multi-lobe region (leaf rosettes): hulls of `window` angularly consecutive lobes (around the region's
 * opaque centroid), each reduced to `n` vertices. Single-lobe regions return the one outline.
 * Every cut: { poly, opaque (opaque share of the region inside it, 0..1 of the region), polyArea, coverage, lobes }.
 */
export function regionCuts(tex, region, n, windows = [3], cutoff = 0.5) {
  const lobes = opaqueLobes(tex, region, cutoff)
  if (lobes.length <= 1) {
    const o = regionOutline(tex, region, n, cutoff)
    return { cuts: [{ poly: o.poly, opaque: o.opaque, polyArea: o.polyArea, coverage: o.coverage, lobes: lobes.length }], regionOpaque: o.opaque, lobes: lobes.length }
  }
  const gcx = lobes.reduce((a, l) => a + l.c[0] * l.cells, 0) / lobes.reduce((a, l) => a + l.cells, 0)
  const gcy = lobes.reduce((a, l) => a + l.c[1] * l.cells, 0) / lobes.reduce((a, l) => a + l.cells, 0)
  lobes.sort((a, b) => Math.atan2(a.c[1] - gcy, a.c[0] - gcx) - Math.atan2(b.c[1] - gcy, b.c[0] - gcx))
  const cellArea = 1 / ((Math.floor(region.w / 4)) * Math.floor(region.h / 4))
  const cuts = []
  for (const w of windows) {
    for (let s = 0; s < lobes.length; s++) {
      const sel = Array.from({ length: Math.min(w, lobes.length) }, (_, i) => lobes[(s + i) % lobes.length])
      const poly = reduceHull(convexHull(sel.flatMap((l) => l.pts)), n)
      const pa = polygonArea(poly)
      const opaque = sel.reduce((a, l) => a + l.cells, 0) * cellArea
      cuts.push({ poly, opaque, polyArea: pa, coverage: opaque / pa, lobes: sel.length })
    }
  }
  return { cuts, regionOpaque: lobes.reduce((a, l) => a + l.cells, 0) * cellArea, lobes: lobes.length }
}
