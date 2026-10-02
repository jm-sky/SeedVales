/**
 * Texture build for trees.glb: one bark texture (512 px, tiling, JPEG) and one shared leaf atlas (1024 px, RGBA PNG,
 * straight alpha, colour bled into transparent pixels). Source: Quaternius Stylized Nature MegaKit (CC0).
 */
import sharp from 'sharp'
import { rng } from './mesh.mjs'

export const ATLAS = 1024
/** Atlas regions in pixels. */
export const REGIONS = {
  broad: { x: 0, y: 0, w: 512, h: 512 },
  apple: { x: 0, y: 512, w: 512, h: 512 },
  pine: { x: 512, y: 0, w: 512, h: 1024 },
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

async function loadRaw(path, crop, w, h) {
  let img = sharp(path).ensureAlpha()
  const meta = await img.metadata()
  if (crop) {
    const left = Math.round(crop[0] * meta.width)
    const width = Math.round((crop[1] - crop[0]) * meta.width)
    img = img.extract({ left, top: 0, width, height: meta.height })
  }
  const { data } = await img.resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true })
  return Uint8ClampedArray.from(data)
}

function boxBlurAlpha(rgba, w, h, r) {
  const a = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) a[i] = rgba[i * 4 + 3] / 255
  const tmp = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    let s = 0
    for (let x = -r; x <= r; x++) s += a[y * w + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / (2 * r + 1)
      s += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]
    }
  }
  const out = new Float32Array(w * h)
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / (2 * r + 1)
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
    }
  }
  return out
}

/** Smooth value noise in 0..1 (cheap, low frequency) so the flat card colour gets a gentle tonal variation. */
function valueNoise(w, h, cells, seed) {
  const rnd = rng(seed)
  const g = Array.from({ length: (cells + 1) * (cells + 1) }, () => rnd())
  return (x, y) => {
    const fx = (x / w) * cells
    const fy = (y / h) * cells
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = smooth(0, 1, fx - x0)
    const ty = smooth(0, 1, fy - y0)
    const v = (i, j) => g[Math.min(cells, j) * (cells + 1) + Math.min(cells, i)]
    return (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) + (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty
  }
}

/** Edge darkening + soft tonal noise; alpha untouched. */
function shadeLeaf(rgba, w, h, seed, { edge = 0.24, noise = 0.12 } = {}) {
  const blur = boxBlurAlpha(rgba, w, h, Math.round(w / 64))
  const n1 = valueNoise(w, h, 5, seed)
  const n2 = valueNoise(w, h, 13, seed + 7)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const inner = smooth(0.45, 0.95, blur[i])
      const k = 1 - edge + edge * inner
      const tone = 1 + noise * ((n1(x, y) - 0.5) * 1.4 + (n2(x, y) - 0.5) * 0.6)
      for (let c = 0; c < 3; c++) rgba[i * 4 + c] *= k * tone
    }
  }
}

function tint(rgba, mul) {
  for (let i = 0; i < rgba.length; i += 4) for (let c = 0; c < 3; c++) rgba[i + c] *= mul[c]
}

/** A few red apples on the opaque parts of the apple card (seeded: the atlas is reproducible). */
function addFruit(rgba, w, h, seed, count, radius) {
  const rnd = rng(seed)
  let placed = 0
  for (let tries = 0; tries < 4000 && placed < count; tries++) {
    const cx = Math.floor(radius + rnd() * (w - 2 * radius))
    const cy = Math.floor(radius + rnd() * (h - 2 * radius))
    let ok = true
    for (const [dx, dy] of [[-radius, 0], [radius, 0], [0, -radius], [0, radius]]) if (rgba[((cy + dy) * w + cx + dx) * 4 + 3] < 250) ok = false
    if (!ok) continue
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const d = Math.hypot(x, y)
        if (d > radius) continue
        const i = ((cy + y) * w + cx + x) * 4
        const shade = 1 - 0.35 * (d / radius) + 0.25 * Math.max(0, 1 - Math.hypot(x + radius * 0.35, y + radius * 0.35) / (radius * 0.5))
        rgba[i] = 190 * shade
        rgba[i + 1] = 52 * shade
        rgba[i + 2] = 34 * shade
        rgba[i + 3] = 255
      }
    }
    placed++
  }
}

/** Colour into transparent pixels: iterative 3x3 dilation, then the average card colour for whatever is still far away. */
function bleedRegion(rgba, w, h, passes) {
  let have = new Uint8Array(w * h)
  let r0 = 0
  let g0 = 0
  let b0 = 0
  let n0 = 0
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] >= 8) {
      have[i] = 1
      r0 += rgba[i * 4]
      g0 += rgba[i * 4 + 1]
      b0 += rgba[i * 4 + 2]
      n0++
    }
  }
  for (let p = 0; p < passes; p++) {
    const next = have.slice()
    const upd = []
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (have[y * w + x]) continue
        let n = 0
        let r = 0
        let g = 0
        let b = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx
            const yy = y + dy
            if (xx < 0 || yy < 0 || xx >= w || yy >= h || !have[yy * w + xx]) continue
            const j = (yy * w + xx) * 4
            n++
            r += rgba[j]
            g += rgba[j + 1]
            b += rgba[j + 2]
          }
        }
        if (n) {
          upd.push(y * w + x, r / n, g / n, b / n)
          next[y * w + x] = 1
        }
      }
    }
    for (let k = 0; k < upd.length; k += 4) {
      rgba[upd[k] * 4] = upd[k + 1]
      rgba[upd[k] * 4 + 1] = upd[k + 2]
      rgba[upd[k] * 4 + 2] = upd[k + 3]
    }
    have = next
  }
  for (let i = 0; i < w * h; i++) {
    if (!have[i]) {
      rgba[i * 4] = r0 / n0
      rgba[i * 4 + 1] = g0 / n0
      rgba[i * 4 + 2] = b0 / n0
    }
  }
}

function blit(dst, region, src) {
  for (let y = 0; y < region.h; y++) {
    for (let x = 0; x < region.w; x++) {
      const s = (y * region.w + x) * 4
      const d = ((region.y + y) * ATLAS + region.x + x) * 4
      for (let c = 0; c < 4; c++) dst[d + c] = src[s + c]
    }
  }
}

/**
 * @param texDir MegaKit Textures folder
 * @param pineU  [umin, umax] of the pine card UVs actually used (the source card only fills that strip)
 */
export async function buildTextures(texDir, pineU) {
  const barkSharp = sharp(`${texDir}/Bark_NormalTree.png`).removeAlpha().resize(512, 512, { kernel: 'lanczos3' })
  const barkRaw = await barkSharp.clone().ensureAlpha().raw().toBuffer()
  const barkJpeg = await barkSharp.clone().jpeg({ quality: 86, mozjpeg: true }).toBuffer()

  const atlas = new Uint8ClampedArray(ATLAS * ATLAS * 4)
  const R = REGIONS
  const broad = await loadRaw(`${texDir}/Leaves_NormalTree_C.png`, null, R.broad.w, R.broad.h)
  shadeLeaf(broad, R.broad.w, R.broad.h, 11)
  const apple = await loadRaw(`${texDir}/Leaves_NormalTree_C.png`, null, R.apple.w, R.apple.h)
  tint(apple, [1.18, 1.1, 0.72])
  shadeLeaf(apple, R.apple.w, R.apple.h, 23, { noise: 0.14 })
  addFruit(apple, R.apple.w, R.apple.h, 5, 16, 9)
  const pine = await loadRaw(`${texDir}/Leaf_Pine_C.png`, pineU, R.pine.w, R.pine.h)
  shadeLeaf(pine, R.pine.w, R.pine.h, 37, { edge: 0.3, noise: 0.14 })
  for (const [key, img] of [['broad', broad], ['apple', apple], ['pine', pine]]) {
    bleedRegion(img, R[key].w, R[key].h, 24)
    blit(atlas, R[key], img)
  }
  const leafPng = await sharp(Buffer.from(atlas.buffer), { raw: { width: ATLAS, height: ATLAS, channels: 4 } }).png({ compressionLevel: 9, effort: 10 }).toBuffer()
  return {
    bark: { jpeg: barkJpeg, tex: { data: new Uint8ClampedArray(barkRaw), w: 512, h: 512, wrap: 'repeat' } },
    leaf: { png: leafPng, tex: { data: atlas, w: ATLAS, h: ATLAS, wrap: 'clamp' } },
  }
}

/** Remap source card UVs (0..1 of the source texture; pine cropped to pineU) into an atlas region, in place. */
export function remapLeafUv(uv, regionKey, pineU) {
  const r = REGIONS[regionKey]
  for (let i = 0; i < uv.length; i += 2) {
    let u = uv[i]
    const v = uv[i + 1]
    if (regionKey === 'pine') u = (u - pineU[0]) / (pineU[1] - pineU[0])
    uv[i] = (r.x + clamp01(u) * r.w) / ATLAS
    uv[i + 1] = (r.y + clamp01(v) * r.h) / ATLAS
  }
}
