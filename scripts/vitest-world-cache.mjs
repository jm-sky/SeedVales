/**
 * Vitest setup file: exposes the on-disk world cache to `testSim()` (src/ has no Node types, so the file
 * access lives here and reaches the tests through a typed global, `SvWorldCacheHook` in sim/testWorld.ts).
 */
import { readWorldCache, writeWorldCache } from './world-cache.mjs'

globalThis.__svWorldCache = { load: readWorldCache, save: writeWorldCache }
