/**
 * On-disk cache of generated worlds for tests, e2e, A/B and benches (user idea 2026-10-02). Not committed:
 * `node_modules/.cache/seedvales/world-<seed>-<key>.bin`, where the key hashes every non-test source the
 * generator can depend on (world/, core/, config/, data/) — a generator change without a GEN_VERSION bump
 * still invalidates it. Writes are atomic (temp file + rename) so parallel vitest workers are safe.
 * Format: `src/game/world/serialize.ts`. A freshness test compares the cache with a fresh generation.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DIR = path.join(ROOT, 'node_modules/.cache/seedvales')
const SOURCES = ['src/game/world', 'src/game/core', 'src/game/config', 'src/game/data']

let memo = null
/** Hash of the generator's inputs (file names + contents, tests excluded). */
export function sourceKey() {
  if (memo) return memo
  const h = crypto.createHash('sha1')
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) {
        h.update(path.relative(ROOT, p))
        h.update(fs.readFileSync(p))
      }
    }
  }
  for (const s of SOURCES) walk(path.join(ROOT, s))
  memo = h.digest('hex').slice(0, 16)
  return memo
}

export const cachePath = (seed) => path.join(DIR, `world-${seed}-${sourceKey()}.bin`)

/** Cached bytes or null. Disabled with SV_WORLD_CACHE=0. */
export function readWorldCache(seed) {
  if (process.env.SV_WORLD_CACHE === '0') return null
  try {
    return new Uint8Array(fs.readFileSync(cachePath(seed)))
  } catch {
    return null
  }
}

export function writeWorldCache(seed, bytes) {
  if (process.env.SV_WORLD_CACHE === '0') return
  fs.mkdirSync(DIR, { recursive: true })
  const tmp = `${cachePath(seed)}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, bytes)
  fs.renameSync(tmp, cachePath(seed))
}
