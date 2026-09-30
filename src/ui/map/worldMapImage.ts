import { Biome } from '@/game/world/types'
/**
 * World map raster (biomes shaded by height + roads), drawn once per world at 1 px per terrain cell and
 * shared by the map panel and the minimap (UI-04). Reads generated world data only.
 * @domain ui
 * @subdomain map
 */
import type { WorldData } from '@/game/world/types'

const COLORS: Record<number, [number, number, number]> = {
  [Biome.Ocean]: [40, 70, 110], [Biome.Beach]: [210, 195, 140], [Biome.Meadow]: [110, 150, 60], [Biome.Steppe]: [170, 160, 90],
  [Biome.Swamp]: [80, 90, 50], [Biome.ForestDeciduous]: [70, 115, 45], [Biome.ForestMixed]: [60, 100, 45], [Biome.ForestConifer]: [45, 80, 45],
  [Biome.Mountain]: [120, 115, 110], [Biome.Snow]: [235, 240, 245], [Biome.Water]: [60, 110, 160],
}

const cache = new WeakMap<WorldData, HTMLCanvasElement>()

/** Canvas of (n−1)² px covering the whole world (px = x / size × width). */
export function worldMapImage(w: WorldData): HTMLCanvasElement {
  const hit = cache.get(w)
  if (hit) return hit
  const S = w.n - 1
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(S, S)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const k = y * w.n + x
      const col = COLORS[w.biome[k]!] ?? [0, 0, 0]
      const shade = Math.max(0.6, Math.min(1.2, 0.85 + w.height[k]! / 400))
      const o = (y * S + x) * 4
      img.data[o] = col[0] * shade
      img.data[o + 1] = col[1] * shade
      img.data[o + 2] = col[2] * shade
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const sc = S / w.size
  ctx.strokeStyle = '#8b6a3e'
  ctx.lineWidth = 1.5
  for (const r of w.roads) {
    ctx.beginPath()
    r.points.forEach((p, i) => (i ? ctx.lineTo(p.x * sc, p.z * sc) : ctx.moveTo(p.x * sc, p.z * sc)))
    ctx.stroke()
  }
  cache.set(w, c)
  return c
}

/** Arrow (triangle) pointing along `ang` (0 = +z = down on the map, same convention as actor rot). */
export function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, size: number, fill: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-ang)
  ctx.beginPath()
  ctx.moveTo(0, size)
  ctx.lineTo(size * 0.6, -size * 0.6)
  ctx.lineTo(0, -size * 0.25)
  ctx.lineTo(-size * 0.6, -size * 0.6)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}
