/**
 * Deterministic per-chunk resource nodes (trees, bushes, rocks, herbs…). Generated lazily and cached
 * (bounded LRU). Mutations (felled/harvested) live in GameState.nodes keyed by node id.
 * @domain world
 * @subdomain vegetation
 */
import type { Terrain } from './terrain'
import { hash01, hashInts } from '../core/rng'
import { perf } from '../diag/perf'
import { Biome, CHUNK_M } from './types'

export type NodeKind =
  | 'tree_broad'
  | 'tree_pine'
  | 'tree_dead'
  | 'tree_apple'
  | 'bush'
  | 'bush_berry'
  | 'rock'
  | 'stone'
  | 'herb'
  | 'mushroom'
  | 'reed'

export const HERB_IDS = ['mint', 'chamomile', 'yarrow', 'arnica', 'hemlock', 'nightshade'] as const
const HERB_WEIGHTS = [30, 30, 14, 4, 12, 3]

export interface ResNode {
  id: string
  kind: NodeKind
  x: number
  z: number
  y: number
  rot: number
  /** Visual scale; for trees = height (m). */
  scale: number
  variant: number
  /** Collision radius (0 = walk-through). */
  radius: number
  herb?: (typeof HERB_IDS)[number]
}

const SPACING = 4.5
const PER_SIDE = Math.floor(CHUNK_M / SPACING)

type Table = [NodeKind, number][]
const TABLE: Record<number, Table> = {
  [Biome.ForestDeciduous]: [['tree_broad', 0.3], ['tree_pine', 0.03], ['bush', 0.04], ['bush_berry', 0.02], ['mushroom', 0.015], ['herb', 0.008], ['stone', 0.006], ['tree_dead', 0.006]],
  [Biome.ForestMixed]: [['tree_broad', 0.16], ['tree_pine', 0.16], ['bush', 0.03], ['bush_berry', 0.02], ['mushroom', 0.02], ['herb', 0.006], ['stone', 0.006], ['rock', 0.003]],
  [Biome.ForestConifer]: [['tree_pine', 0.34], ['tree_dead', 0.01], ['bush', 0.02], ['bush_berry', 0.015], ['mushroom', 0.02], ['stone', 0.008], ['rock', 0.005]],
  [Biome.Meadow]: [['tree_broad', 0.01], ['tree_apple', 0.002], ['bush', 0.012], ['bush_berry', 0.006], ['herb', 0.02], ['stone', 0.006], ['rock', 0.002]],
  [Biome.Steppe]: [['tree_broad', 0.002], ['bush', 0.015], ['herb', 0.008], ['stone', 0.01], ['rock', 0.005]],
  [Biome.Swamp]: [['tree_dead', 0.05], ['reed', 0.25], ['bush', 0.02], ['herb', 0.01], ['mushroom', 0.01]],
  [Biome.Mountain]: [['rock', 0.05], ['stone', 0.03], ['tree_pine', 0.03], ['herb', 0.004]],
  [Biome.Snow]: [['rock', 0.04]],
  [Biome.Beach]: [['stone', 0.01], ['reed', 0.03]],
}

export class NodeCache {
  private cache = new Map<string, ResNode[]>()
  private maxChunks = 400
  private terrain: Terrain
  constructor(terrain: Terrain) {
    this.terrain = terrain
  }

  getChunk(cx: number, cz: number): ResNode[] {
    const key = `${cx},${cz}`
    const hit = this.cache.get(key)
    if (hit) {
      this.cache.delete(key)
      this.cache.set(key, hit)
      return hit
    }
    const nodes = perf.measure('world.nodes.gen', () => this.generate(cx, cz))
    perf.count('world.nodes.chunksGenerated')
    this.cache.set(key, nodes)
    if (this.cache.size > this.maxChunks) this.cache.delete(this.cache.keys().next().value!)
    return nodes
  }

  /** Whether a chunk's nodes are already generated (render prefetch, review 009 F-01). */
  has(cx: number, cz: number): boolean {
    return this.cache.has(`${cx},${cz}`)
  }

  /** All nodes within radius (by chunk scan). */
  query(x: number, z: number, r: number, out: ResNode[] = []): ResNode[] {
    const c0x = Math.floor((x - r) / CHUNK_M)
    const c1x = Math.floor((x + r) / CHUNK_M)
    const c0z = Math.floor((z - r) / CHUNK_M)
    const c1z = Math.floor((z + r) / CHUNK_M)
    const r2 = r * r
    for (let cz = c0z; cz <= c1z; cz++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        for (const n of this.getChunk(cx, cz)) if ((n.x - x) ** 2 + (n.z - z) ** 2 <= r2) out.push(n)
      }
    }
    return out
  }

  byId(id: string): ResNode | undefined {
    const [cxs, czs] = id.split(':')[0]!.split(',')
    return this.getChunk(Number(cxs), Number(czs)).find((n) => n.id === id)
  }

  /** Deterministic per seed: uses base (unedited) terrain, so digging never changes placement. */
  private generate(cx: number, cz: number): ResNode[] {
    const t = this.terrain
    const seed = t.world.seed
    const out: ResNode[] = []
    const x0 = cx * CHUNK_M
    const z0 = cz * CHUNK_M
    if (x0 < 0 || z0 < 0 || x0 >= t.world.size || z0 >= t.world.size) return out
    let n = 0
    for (let j = 0; j < PER_SIDE; j++) {
      for (let i = 0; i < PER_SIDE; i++) {
        const h = hashInts(seed, cx, cz, i, j)
        const r1 = (h & 0xffff) / 65536
        const r2 = (h >>> 16) / 65536
        const x = x0 + (i + r1) * SPACING
        const z = z0 + (j + r2) * SPACING
        const biome = t.biomeAt(x, z)
        if (t.world.flat.length && t.roadAt(x, z) > 0.05) continue
        const depth = t.baseWaterDepthAt(x, z)
        const roll = hash01(seed, cx, cz, i, j, 7)
        let kind: NodeKind | null = null
        if (depth > 0 && depth < 0.7 && biome !== Biome.Ocean) {
          if (roll < 0.35) kind = 'reed'
        } else if (depth === 0) {
          // Near-water reeds.
          if (t.baseWaterDepthAt(x + 4, z) > 0.1 || t.baseWaterDepthAt(x - 4, z) > 0.1 || t.baseWaterDepthAt(x, z + 4) > 0.1 || t.baseWaterDepthAt(x, z - 4) > 0.1) {
            if (roll < 0.25 && biome !== Biome.Ocean && !t.isSeaAt(x, z)) kind = 'reed'
          }
          if (!kind) {
            const table = TABLE[biome]
            if (table) {
              // Density modulated by low-frequency noise-ish hash for clearings.
              const clearing = hash01(seed, Math.floor(x / 40), Math.floor(z / 40), 3) < 0.15 ? 0.25 : 1
              let acc = 0
              for (const [k, p] of table) {
                acc += p * (k.startsWith('tree') ? clearing : 1)
                if (roll < acc) {
                  kind = k
                  break
                }
              }
            }
          }
        }
        if (!kind) continue
        // Keep settlements clear of trees/rocks.
        const flat = t.world.flat[Math.round(z / t.world.cell) * t.world.n + Math.round(x / t.world.cell)]!
        if (flat > 60 && kind !== 'herb' && kind !== 'bush_berry') continue
        if (flat > 20 && kind.startsWith('tree')) continue
        const v = hash01(seed, cx, cz, i, j, 11)
        const node: ResNode = {
          id: `${cx},${cz}:${n++}`,
          kind,
          x,
          z,
          y: t.heightAt(x, z),
          rot: v * Math.PI * 2,
          scale: 1,
          variant: Math.floor(v * 5),
          radius: 0,
        }
        switch (kind) {
          case 'bush':
          case 'bush_berry':
            node.scale = 0.8 + v * 0.6
            break
          case 'herb': {
            const w = hash01(seed, cx, cz, i, j, 13) * 93
            let a = 0
            for (let k = 0; k < HERB_IDS.length; k++) {
              a += HERB_WEIGHTS[k]!
              if (w < a) {
                node.herb = HERB_IDS[k]
                break
              }
            }
            node.herb ??= 'mint'
            break
          }
          case 'rock':
            node.scale = 1.2 + v * 1.8
            node.radius = node.scale * 0.8
            break
          case 'tree_apple':
            node.scale = 6 + v * 3
            node.radius = 0.25
            break
          case 'tree_broad':
            node.scale = 12 + v * 10
            node.radius = 0.35
            break
          case 'tree_dead':
            node.scale = 8 + v * 6
            node.radius = 0.3
            break
          case 'tree_pine':
            node.scale = 15 + v * 15
            node.radius = 0.35
            break
          default:
            node.scale = 0.7 + v * 0.6
        }
        out.push(node)
      }
    }
    return out
  }
}

export const isTree = (k: NodeKind) => k === 'tree_broad' || k === 'tree_pine' || k === 'tree_dead' || k === 'tree_apple'
