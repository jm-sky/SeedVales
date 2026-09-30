/**
 * IndexedDB storage: `worlds` (deterministic generation cache, shared across playthroughs,
 * keyed by seed+GEN_VERSION) and `saves` (mutable per-playthrough state, versioned).
 * @domain save
 */
import type { GameState } from '../sim/types'
import type { WorldData } from '../world/types'
import { TREASURY_START } from '../config/calibration'
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
  /** Generator version the save belongs to (absent in saves before SAVE_VERSION 2). */
  genVersion?: number
}

export interface SaveRecord {
  meta: SaveMeta
  json: string
}

/** Load/save failure with a player-facing message (never silently replaced by a new game). */
export class SaveError extends Error {
  override name = 'SaveError'
}

/** Unique slot id for a new playthrough (a new game never overwrites an existing save). */
export const newSlotId = (seed: number, now = Date.now()) => `slot-${seed}-${now.toString(36)}`

export async function writeSave(slot: string, state: GameState): Promise<SaveMeta> {
  const t0 = performance.now()
  const json = JSON.stringify(state)
  const meta: SaveMeta = { slot, seed: state.seed, savedAt: Date.now(), cal: state.time.cal, bytes: json.length, genVersion: state.genVersion }
  await tx('saves', 'readwrite', (s) => s.put({ meta, json } satisfies SaveRecord, slot))
  perf.record('save.write', performance.now() - t0)
  perf.gauge('save.bytes', json.length)
  return meta
}

/** Reads and migrates a save. Missing or corrupt slot → SaveError (UI shows it). */
export async function readSave(slot: string): Promise<GameState> {
  const t0 = performance.now()
  const rec = await tx<SaveRecord | undefined>('saves', 'readonly', (s) => s.get(slot))
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

export async function listSaves(): Promise<SaveMeta[]> {
  const all = await tx<SaveRecord[]>('saves', 'readonly', (s) => s.getAll())
  return all.map((r) => r.meta).sort((a, b) => b.savedAt - a.savedAt)
}

export async function deleteSave(slot: string) {
  await tx('saves', 'readwrite', (s) => s.delete(slot))
}

/**
 * The save only stores changes against the generated world; it is valid only for the exact
 * generator version it was created with. Mismatch → explicit rejection (no silent mount).
 */
export function checkWorldCompat(st: GameState, world: Pick<WorldData, 'version' | 'seed'>): void {
  if (st.seed !== world.seed) throw new SaveError(`Zapis dotyczy innego świata (seed ${st.seed}, wczytany ${world.seed}).`)
  if (st.genVersion !== world.version) {
    throw new SaveError(`Zapis powstał dla innej wersji generatora świata (v${st.genVersion}, gra: v${world.version}). Świata nie da się wiernie odtworzyć — zapis odrzucony.`)
  }
}

type Migration = (st: GameState) => void

/** Save format migrations: MIGRATIONS[n] upgrades saveVersion n → n+1. */
const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: orders buffer the forged item (materials consumed at forging); caravan uses h.trip.
  1: (st) => {
    for (const o of st.px.orders ?? []) if (o.status === 'ready' && !o.item) o.status = 'waiting'
    for (const n of st.npcs) delete n.ai.cooldowns.caravan_back
  },
  // v2 → v3: settlement treasuries (fixed start amounts by position in the chain: SM, MD, LG).
  2: (st) => {
    const start = [TREASURY_START.SM, TREASURY_START.MD, TREASURY_START.LG]
    st.settlements.forEach((s, i) => (s.treasury ??= start[i] ?? TREASURY_START.SM))
  },
}

export function migrate(st: GameState): GameState {
  if (st.saveVersion > SAVE_VERSION) throw new SaveError('Zapis pochodzi z nowszej wersji gry.')
  for (let v = st.saveVersion; v < SAVE_VERSION; v++) {
    const m = MIGRATIONS[v]
    if (!m) throw new SaveError(`Nieobsługiwana wersja zapisu (v${st.saveVersion}).`)
    m(st)
  }
  st.saveVersion = SAVE_VERSION
  return st
}
