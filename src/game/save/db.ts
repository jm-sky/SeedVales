/**
 * IndexedDB storage: `worlds` (deterministic generation cache, shared across playthroughs,
 * keyed by seed+GEN_VERSION), `saves` (mutable per-playthrough state, versioned) and `meta`
 * (small save descriptors for the menu list — no need to load whole saves).
 * @domain save
 */
import type { GameState } from '../sim/types'
import type { WorldData } from '../world/types'
import { perf } from '../diag/perf'
import { GEN_VERSION } from '../world/types'
import { SaveError } from './errors'
import { migrate } from './migrate'

export { SaveError } from './errors'
export { checkWorldCompat, migrate } from './migrate'

const DB_NAME = 'seedvales'
const DB_VERSION = 2

/** One shared connection per page (reopened if the browser closes it). */
let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds')
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves')
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta')
        // DB v1 → v2: backfill descriptors from existing saves.
        const t = req.transaction!
        const cur = t.objectStore('saves').openCursor()
        cur.onsuccess = () => {
          const c = cur.result
          if (!c) return
          const rec = c.value as SaveRecord
          let genVersion = 0 // unknown → treated as incompatible
          try {
            genVersion = (JSON.parse(rec.json) as GameState).genVersion ?? 0
          } catch {
            /* corrupt save: stays flagged */
          }
          t.objectStore('meta').put({ ...rec.meta, genVersion }, c.key)
          c.continue()
        }
      }
    }
    req.onsuccess = () => {
      const db = req.result
      db.onclose = () => (dbPromise = null)
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

async function tx<T>(stores: string | string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(stores, mode)
    const r = fn(t)
    t.oncomplete = () => resolve(r ? r.result : (undefined as T))
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

export const worldKey = (seed: number) => `${seed}:v${GEN_VERSION}`

export async function loadWorldCache(seed: number): Promise<WorldData | null> {
  const t0 = performance.now()
  try {
    const w = (await tx<WorldData | undefined>('worlds', 'readonly', (t) => t.objectStore('worlds').get(worldKey(seed)))) ?? null
    perf.record('save.worldCacheRead', performance.now() - t0)
    return w && w.version === GEN_VERSION ? w : null
  } catch {
    return null
  }
}

export async function storeWorldCache(w: WorldData): Promise<void> {
  const t0 = performance.now()
  await tx('worlds', 'readwrite', (t) => t.objectStore('worlds').put({ ...w, genMs: 0 }, worldKey(w.seed)))
  perf.record('save.worldCacheWrite', performance.now() - t0)
}

export interface SaveMeta {
  slot: string
  seed: number
  savedAt: number
  cal: number
  bytes: number
  /** Generator version the save belongs to (0 = unknown, backfilled from a pre-v2 save). */
  genVersion?: number
  /** Player-given name (named saves, UI-05). */
  name?: string
  /** Where the player was (nearest settlement), for the save list. */
  place?: string
}

export interface SaveInfo {
  name?: string
  place?: string
}

export interface SaveRecord {
  meta: SaveMeta
  json: string
}

/** Unique slot id for a new playthrough (a new game never overwrites an existing save). */
export const newSlotId = (seed: number, now = Date.now()) => `slot-${seed}-${now.toString(36)}`

export async function writeSave(slot: string, state: GameState, info: SaveInfo = {}): Promise<SaveMeta> {
  const t0 = performance.now()
  const json = JSON.stringify(state)
  const name = info.name?.trim().slice(0, 40) || undefined
  const meta: SaveMeta = { slot, seed: state.seed, savedAt: Date.now(), cal: state.time.cal, bytes: json.length, genVersion: state.genVersion, name, place: info.place }
  try {
    await tx(['saves', 'meta'], 'readwrite', (t) => {
      t.objectStore('saves').put({ meta, json } satisfies SaveRecord, slot)
      t.objectStore('meta').put(meta, slot)
    })
  } catch (e) {
    const name = (e as DOMException | null)?.name
    if (name === 'QuotaExceededError') throw new SaveError('Brak miejsca w pamięci przeglądarki — gra NIE została zapisana. Usuń stare zapisy i spróbuj ponownie.')
    throw new SaveError(`Zapis nie powiódł się (${name ?? String(e)}).`)
  }
  perf.record('save.write', performance.now() - t0)
  perf.gauge('save.bytes', json.length)
  return meta
}

/** Reads and migrates a save. Missing or corrupt slot → SaveError (UI shows it). */
export async function readSave(slot: string): Promise<GameState> {
  const t0 = performance.now()
  const rec = await tx<SaveRecord | undefined>('saves', 'readonly', (t) => t.objectStore('saves').get(slot))
  if (!rec) throw new SaveError(`Nie znaleziono zapisu „${slot}”.`)
  let raw: GameState
  try {
    raw = JSON.parse(rec.json) as GameState
  } catch {
    throw new SaveError('Zapis jest uszkodzony (nieczytelne dane).')
  }
  if (!raw || typeof raw !== 'object' || typeof raw.saveVersion !== 'number' || !raw.player) throw new SaveError('Zapis jest uszkodzony (brak wymaganych pól).')
  const st = migrate(raw)
  perf.record('save.read', performance.now() - t0)
  return st
}

export async function readSaveMeta(slot: string): Promise<SaveMeta | undefined> {
  return tx<SaveMeta | undefined>('meta', 'readonly', (t) => t.objectStore('meta').get(slot))
}

export async function listSaves(): Promise<SaveMeta[]> {
  const all = await tx<SaveMeta[]>('meta', 'readonly', (t) => t.objectStore('meta').getAll())
  return all.sort((a, b) => b.savedAt - a.savedAt)
}

export async function deleteSave(slot: string) {
  await tx(['saves', 'meta'], 'readwrite', (t) => {
    t.objectStore('saves').delete(slot)
    t.objectStore('meta').delete(slot)
  })
}
