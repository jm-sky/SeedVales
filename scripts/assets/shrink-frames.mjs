#!/usr/bin/env node
/** Recompresses docs/state/frames/render--011/blend-*.png in place (palette PNG, optional downscale) until each is <= 200 KB. */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const DIR = path.resolve(import.meta.dirname, '../../docs/state/frames/render--011')
const LIMIT = 200 * 1024
for (const f of fs.readdirSync(DIR).filter((n) => /^blend-.*\.png$/.test(n))) {
  const file = path.join(DIR, f)
  const input = fs.readFileSync(file)
  if (input.length <= LIMIT) continue
  const meta = await sharp(input).metadata()
  let width = meta.width
  let out = input
  for (const colours of [128, 64, 48]) {
    out = await sharp(input).resize({ width }).png({ palette: true, colours, dither: 0.5, compressionLevel: 9 }).toBuffer()
    if (out.length <= LIMIT) break
  }
  while (out.length > LIMIT && width > 600) {
    width = Math.round(width * 0.85)
    out = await sharp(input).resize({ width }).png({ palette: true, colours: 64, dither: 0.5, compressionLevel: 9 }).toBuffer()
  }
  fs.writeFileSync(file, out)
  console.log(f, Math.round(input.length / 1024), '->', Math.round(out.length / 1024), 'KB', width, 'px wide')
}
