/**
 * World cache format (user idea 2026-10-02): the binary form round-trips exactly, and the on-disk cache used by
 * tests/e2e (scripts/world-cache.mjs) always equals a fresh generation — a stale cache can never mask a change.
 * Compared byte-wise (deep `toEqual` on million-element typed arrays took > 60 s on a loaded machine).
 */
import { describe, expect, it } from 'vitest'
import type { SvWorldCacheHook } from '../sim/testWorld'
import { generateWorld } from './gen/generate'
import { deserializeWorld, serializeWorld } from './serialize'

/** Index of the first differing byte, or -1. */
function firstDiff(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length) return Math.min(a.length, b.length)
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return i
  return -1
}

describe('world cache format', () => {
  it('serialize → deserialize gives the same world; the disk cache equals a fresh generation', () => {
    const fresh = generateWorld(1337)
    const bytes = serializeWorld(fresh)
    const back = deserializeWorld(bytes)
    expect(back.settlements).toEqual(fresh.settlements)
    expect(back.height[12345]).toBe(fresh.height[12345])
    expect(firstDiff(serializeWorld(back), bytes)).toBe(-1)
    const cached = (globalThis as { __svWorldCache?: SvWorldCacheHook }).__svWorldCache?.load(1337)
    if (cached) expect(firstDiff(cached, bytes)).toBe(-1)
  })
})
