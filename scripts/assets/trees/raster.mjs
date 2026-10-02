/**
 * Tiny orthographic software rasteriser for the offline tree bake (Node, deterministic, no GPU/Blender).
 * Double-sided, z-buffered, alpha-tested textures, per-vertex AO multiplier. Used for: impostor atlas,
 * card visibility (id buffer), LOD silhouette metrics and contact sheets.
 */

/** Camera looking along `fwd`; image x = right, image y = up. Window = [cx±halfW] × [cy±halfH] in (right, up) coordinates. */
export function makeCamera(fwd, halfW, halfH, cx = 0, cy = 0) {
  const f = norm(fwd)
  let right = cross(f, [0, 1, 0])
  if (Math.hypot(...right) < 1e-6) right = [1, 0, 0] // looking straight down/up
  right = norm(right)
  const up = cross(right, f)
  return { fwd: f, right, up, halfW, halfH, cx, cy }
}

/** Impostor camera k (azimuth k·45°, elevation 0): camera at (sin a, 0, cos a)·D looking at the trunk axis — contract. */
export function impostorCamera(k, halfW, minY, maxY) {
  const a = (k * Math.PI) / 4
  return makeCamera([-Math.sin(a), 0, -Math.cos(a)], halfW, (maxY - minY) / 2, 0, (maxY + minY) / 2)
}

const norm = (v) => {
  const l = Math.hypot(...v)
  return v.map((x) => x / l)
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

export function makeTexture(data, w, h, wrap = 'clamp') {
  return { data, w, h, wrap }
}

function sample(tex, u, v, out) {
  let x = u * tex.w - 0.5
  let y = v * tex.h - 0.5
  const x0 = Math.floor(x), y0 = Math.floor(y)
  const fx = x - x0, fy = y - y0
  const px = (xi, yi) => {
    if (tex.wrap === 'repeat') {
      xi = ((xi % tex.w) + tex.w) % tex.w
      yi = ((yi % tex.h) + tex.h) % tex.h
    } else {
      xi = Math.min(tex.w - 1, Math.max(0, xi))
      yi = Math.min(tex.h - 1, Math.max(0, yi))
    }
    return (yi * tex.w + xi) * 4
  }
  const i00 = px(x0, y0), i01 = px(x0, y0 + 1), i10 = px(x0 + 1, y0), i11 = px(x0 + 1, y0 + 1)
  const d = tex.data
  const w00 = (1 - fx) * (1 - fy), w01 = (1 - fx) * fy, w10 = fx * (1 - fy), w11 = fx * fy
  // alpha-weighted colour so bled/transparent texels do not tint the edge
  const a00 = d[i00 + 3], a01 = d[i01 + 3], a10 = d[i10 + 3], a11 = d[i11 + 3]
  const a = (a00 * w00 + a10 * w10 + a01 * w01 + a11 * w11) / 255
  for (let c = 0; c < 3; c++) out[c] = (d[i00 + c] * w00 + d[i10 + c] * w10 + d[i01 + c] * w01 + d[i11 + c] * w11) / 255
  out[3] = a
}

/**
 * parts: [{ mesh, tex|null, cutoff (0 = none), color:[r,g,b] fallback 0..1, ids: Int32Array per triangle | null, shade: fn(lightless) }]
 * returns { W, H, depth, id, rgb } (rgb 0..1 sRGB values, id = -1 where empty).
 */
export function rasterize(parts, cam, W, H) {
  const depth = new Float32Array(W * H).fill(Infinity)
  const id = new Int32Array(W * H).fill(-1)
  const rgb = new Float32Array(W * H * 3)
  const t = [0, 0, 0, 0]
  const sx = W / (2 * cam.halfW)
  const sy = H / (2 * cam.halfH)
  for (const part of parts) {
    const m = part.mesh
    const nV = m.pos.length / 3
    const X = new Float32Array(nV), Y = new Float32Array(nV), Z = new Float32Array(nV)
    for (let v = 0; v < nV; v++) {
      const px = m.pos[v * 3], py = m.pos[v * 3 + 1], pz = m.pos[v * 3 + 2]
      X[v] = (px * cam.right[0] + py * cam.right[1] + pz * cam.right[2] - cam.cx + cam.halfW) * sx
      Y[v] = (cam.cy + cam.halfH - (px * cam.up[0] + py * cam.up[1] + pz * cam.up[2])) * sy
      Z[v] = px * cam.fwd[0] + py * cam.fwd[1] + pz * cam.fwd[2]
    }
    const nTri = m.idx.length / 3
    for (let ti = 0; ti < nTri; ti++) {
      const a = m.idx[ti * 3], b = m.idx[ti * 3 + 1], c = m.idx[ti * 3 + 2]
      const x0 = X[a], x1 = X[b], x2 = X[c], y0 = Y[a], y1 = Y[b], y2 = Y[c]
      const den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
      if (Math.abs(den) < 1e-9) continue
      const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2))), minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)))
      const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2))), minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)))
      const triId = part.ids ? part.ids[ti] : -1
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const qx = px + 0.5, qy = py + 0.5
          const l0 = ((y1 - y2) * (qx - x2) + (x2 - x1) * (qy - y2)) / den
          const l1 = ((y2 - y0) * (qx - x2) + (x0 - x2) * (qy - y2)) / den
          const l2 = 1 - l0 - l1
          if (l0 < 0 || l1 < 0 || l2 < 0) continue
          const z = l0 * Z[a] + l1 * Z[b] + l2 * Z[c]
          const o = py * W + px
          if (z >= depth[o]) continue
          let bl, g, r
          const ao = l0 * m.ao[a] + l1 * m.ao[b] + l2 * m.ao[c]
          if (part.tex) {
            const u = l0 * m.uv[a * 2] + l1 * m.uv[b * 2] + l2 * m.uv[c * 2]
            const v = l0 * m.uv[a * 2 + 1] + l1 * m.uv[b * 2 + 1] + l2 * m.uv[c * 2 + 1]
            sample(part.tex, u, v, t)
            if (part.cutoff > 0 && t[3] < part.cutoff) continue
            r = t[0]; g = t[1]; bl = t[2]
          } else {
            ;[r, g, bl] = part.color
          }
          depth[o] = z
          id[o] = triId
          rgb[o * 3] = r * ao
          rgb[o * 3 + 1] = g * ao
          rgb[o * 3 + 2] = bl * ao
        }
      }
    }
  }
  return { W, H, depth, id, rgb }
}

/** Box-downsample a supersampled buffer to straight-alpha RGBA8 (colour averaged over covered samples only). */
export function resolve(buf, ss) {
  const H = buf.H / ss, W = buf.W / ss
  const out = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let b = 0, g = 0, n = 0, r = 0
      for (let j = 0; j < ss; j++) {
        for (let i = 0; i < ss; i++) {
          const o = (y * ss + j) * buf.W + (x * ss + i)
          if (buf.id[o] === -2 || buf.depth[o] === Infinity) continue
          n++
          r += buf.rgb[o * 3]; g += buf.rgb[o * 3 + 1]; b += buf.rgb[o * 3 + 2]
        }
      }
      const o = (y * W + x) * 4
      if (n > 0) {
        out[o] = (r / n) * 255; out[o + 1] = (g / n) * 255; out[o + 2] = (b / n) * 255
        out[o + 3] = (n / (ss * ss)) * 255
      }
    }
  }
  return { W, H, data: out }
}

/** Fill the RGB of (nearly) transparent pixels from covered neighbours so mip/bilinear fringes stay clean. */
export function bleed(img, passes = 8, minAlpha = 8) {
  const { W, H, data } = img
  let have = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) have[i] = data[i * 4 + 3] >= minAlpha ? 1 : 0
  for (let p = 0; p < passes; p++) {
    const next = have.slice()
    const upd = []
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        if (have[i]) continue
        let b = 0, g = 0, n = 0, r = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
            const j = yy * W + xx
            if (!have[j]) continue
            n++; r += data[j * 4]; g += data[j * 4 + 1]; b += data[j * 4 + 2]
          }
        }
        if (n) {
          upd.push(i, r / n, g / n, b / n)
          next[i] = 1
        }
      }
    }
    for (let k = 0; k < upd.length; k += 4) {
      data[upd[k] * 4] = upd[k + 1]; data[upd[k] * 4 + 1] = upd[k + 2]; data[upd[k] * 4 + 2] = upd[k + 3]
    }
    have = next
  }
  return img
}
