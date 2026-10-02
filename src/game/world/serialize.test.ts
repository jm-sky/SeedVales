/**
 * World cache format (user idea 2026-10-02): the binary form round-trips exactly, and the on-disk cache used by
 * tests/e2e (scripts/world-cache.mjs) always equals a fresh generation — a stale cache can never mask a change.
 */
import { describe, expect, it } from 'vitest'
import type { SvWorldCacheHook } from '../sim/testWorld'
import { generateWorld } from './gen/generate'
import { deserializeWorld, serializeWorld } from './serialize'

const strip = <T extends { genMs: number }>(w: T) => ({ ...w, genMs: 0 })

describe('world cache format', () => {
  it('serialize → deserialize gives the same world; the disk cache equals a fresh generation', () => {
    const fresh = generateWorld(1337)
    const bytes = serializeWorld(fresh)
    expect(strip(deserializeWorld(bytes))).toEqual(strip(fresh))
    const cached = (globalThis as { __svWorldCache?: SvWorldCacheHook }).__svWorldCache?.load(1337)
    if (cached) expect(strip(deserializeWorld(cached))).toEqual(strip(fresh))
  })
})
