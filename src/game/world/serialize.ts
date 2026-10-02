/**
 * Binary form of a generated world (tests / dev-server cache, user idea 2026-10-02): a JSON header with
 * every non-array field plus offsets, followed by the typed-array buffers. Pure (no fs/network) — the
 * callers decide where the bytes live. `genMs` is not stored (0 after reading, like the IndexedDB cache).
 * @domain world
 */
import type { WorldData } from './types'

const MAGIC = 0x31575653 // 'SVW1' little-endian
type ArrayKind = 'f32' | 'u8'

interface Header {
  meta: Record<string, unknown>
  arrays: { key: string; kind: ArrayKind; offset: number; length: number }[]
}

const ARRAY_KEYS = ['height', 'water', 'waterKind', 'biome', 'flat', 'road', 'moisture'] as const

export function serializeWorld(w: WorldData): Uint8Array {
  const meta: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(w)) if (!(ARRAY_KEYS as readonly string[]).includes(k) && k !== 'genMs') meta[k] = v
  const header: Header = { meta, arrays: [] }
  let offset = 0
  for (const key of ARRAY_KEYS) {
    const a = w[key]
    const kind: ArrayKind = a instanceof Float32Array ? 'f32' : 'u8'
    header.arrays.push({ key, kind, offset, length: a.length })
    offset += a.byteLength
    offset = (offset + 3) & ~3
  }
  const json = new TextEncoder().encode(JSON.stringify(header))
  const start = (8 + json.length + 3) & ~3
  const out = new Uint8Array(start + offset)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, MAGIC, true)
  dv.setUint32(4, json.length, true)
  out.set(json, 8)
  for (const d of header.arrays) {
    const a = w[d.key as (typeof ARRAY_KEYS)[number]]
    out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), start + d.offset)
  }
  return out
}

export function deserializeWorld(bytes: Uint8Array): WorldData {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (dv.getUint32(0, true) !== MAGIC) throw new Error('not a serialized world')
  const len = dv.getUint32(4, true)
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + len))) as Header
  const start = (8 + len + 3) & ~3
  const w: Record<string, unknown> = { ...header.meta, genMs: 0 }
  for (const d of header.arrays) {
    // Copy into fresh, aligned buffers (the input may be a view into a larger buffer).
    const src = bytes.subarray(start + d.offset, start + d.offset + d.length * (d.kind === 'f32' ? 4 : 1))
    w[d.key] = d.kind === 'f32' ? new Float32Array(src.slice().buffer) : src.slice()
  }
  return w as unknown as WorldData
}
