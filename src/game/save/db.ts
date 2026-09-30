/**
 * IndexedDB storage: `worlds` (deterministic generation cache, shared across playthroughs,
 * keyed by seed+GEN_VERSION) and `saves` (mutable per-playthrough state, versioned).
 * @domain save
 */
import type { GameState } from '../sim/types'
import type { WorldData } from '../world/types'
import { perf } from '../diag/perf'
import { SAVE_VERSION } from '../sim/types'
import { GEN_VERSION } from '../world/types'

const DB_NAME = 'seedvales'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds')
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode)
    const r = fn(t.objectStore(store))
    t.oncomplete = () => {
      db.close()
      resolve(r.result)
    }
    t.onerror = () => {
      db.close()
      reject(t.error)
    }
  })
}

export const worldKey = (seed: number) => `${seed}:v${GEN_VERSION}`

export async function loadWorldCache(seed: number): Promise<WorldData | null> {
  const t0 = performance.now()
  try {
    const w = (await tx<WorldData | undefined>('worlds', 'readonly', (s) => s.get(worldKey(seed)))) ?? null
    perf.record('save.worldCacheRead', performance.now() - t0)
    return w && w.version === GEN_VERSION ? w : null
  } catch {
    return null
  }
}

export async function storeWorldCache(w: WorldData): Promise<void> {
  const t0 = performance.now()
  await tx('worlds', 'readwrite', (s) => s.put(w, worldKey(w.seed)))
  perf.record('save.worldCacheWrite', performance.now() - t0)
}

export interface SaveMeta {
  slot: string
  seed: number
  savedAt: number
  cal: number
  bytes: number
}

export interface SaveRecord {
  meta: SaveMeta
  json: string
}

export async function writeSave(slot: string, state: GameState): Promise<SaveMeta> {
  const t0 = performance.now()
  const json = JSON.stringify(state)
  const meta: SaveMeta = { slot, seed: state.seed, savedAt: Date.now(), cal: state.time.cal, bytes: json.length }
  await tx('saves', 'readwrite', (s) => s.put({ meta, json } satisfies SaveRecord, slot))
  perf.record('save.write', performance.now() - t0)
  perf.gauge('save.bytes', json.length)
  return meta
}

export async function readSave(slot: string): Promise<GameState | null> {
  const t0 = performance.now()
  const rec = await tx<SaveRecord | undefined>('saves', 'readonly', (s) => s.get(slot))
  if (!rec) return null
  const st = migrate(JSON.parse(rec.json) as GameState)
  perf.record('save.read', performance.now() - t0)
  return st
}

export async function listSaves(): Promise<SaveMeta[]> {
  const all = await tx<SaveRecord[]>('saves', 'readonly', (s) => s.getAll())
  return all.map((r) => r.meta).sort((a, b) => b.savedAt - a.savedAt)
}

export async function deleteSave(slot: string) {
  await tx('saves', 'readwrite', (s) => s.delete(slot))
}

/** Save format migrations (SAVE_VERSION). */
export function migrate(st: GameState): GameState {
  if (st.saveVersion > SAVE_VERSION) throw new Error('Zapis z nowszej wersji gry.')
  // v1 is current — future migrations go here.
  st.saveVersion = SAVE_VERSION
  return st
}
