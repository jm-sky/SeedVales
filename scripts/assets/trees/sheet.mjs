/**
 * Node-rasteriser contact sheet: per variant, views 0 / 1 / 2 as LOD0 | LOD1 | impostor cell (unlit albedo x AO),
 * plus the triangle counts. Quick offline check; the Blender sheets (blender-tree-sheet.py) verify the real GLB import.
 */
import sharp from 'sharp'

const BG = [158, 184, 214]

export async function writeContactSheet(built, { partsOf, impostorSheet, cell, rasterize, resolveBuf }, outPath = process.argv.find((a) => a.startsWith('--sheet-out='))?.slice(12) ?? '_temp/trees/sheet.png') {
  const shown = [0, 1, 2]
  const cols = shown.length * 3
  const W = cols * cell
  const H = built.length * cell
  const out = new Uint8ClampedArray(W * H * 3)
  for (let i = 0; i < W * H; i++) out.set(BG, i * 3)
  const put = (img, cx, cy) => {
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        const a = img.data[(y * cell + x) * 4 + 3] / 255
        const o = ((cy * cell + y) * W + cx * cell + x) * 3
        for (let c = 0; c < 3; c++) out[o + c] = img.data[(y * cell + x) * 4 + c] * a + out[o + c] * (1 - a)
      }
    }
  }
  const rows = built.length
  built.forEach((b, row) => {
    shown.forEach((k, ki) => {
      for (const [li, lod] of ['LOD0', 'LOD1'].entries()) {
        const cam = (await_cam(b, k))
        const img = resolveBuf(rasterize(partsOf(b.lods[lod].bark, b.lods[lod].leaf), cam, cell * 2, cell * 2), 2)
        put(img, ki * 3 + li, row)
      }
      const cellImg = { data: new Uint8ClampedArray(cell * cell * 4) }
      const y0 = (rows - 1 - row) * cell
      for (let y = 0; y < cell; y++) cellImg.data.set(impostorSheet.data.subarray(((y0 + y) * impostorSheet.W + k * cell) * 4, ((y0 + y) * impostorSheet.W + (k + 1) * cell) * 4), y * cell * 4)
      put(cellImg, ki * 3 + 2, row)
    })
  })
  await sharp(Buffer.from(out.buffer), { raw: { width: W, height: H, channels: 3 } }).png().toFile(outPath)
  console.log(`contact sheet: ${outPath}`)
}

import { impostorCamera } from './raster.mjs'
function await_cam(b, k) {
  return impostorCamera(k, b.halfWidth, 0, b.maxY)
}
