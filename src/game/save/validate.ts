/**
 * Structural validation of a loaded save (review 008 SAVE-07-1): after migration every field the
 * simulation needs must exist with the right type, otherwise the save is rejected as corrupted with a
 * SaveError — never a TypeError deep inside `new Sim`. Checks shapes, not game rules.
 * @domain save
 */
import type { GameState } from '../sim/types'
import { EDIT_N } from '../world/terrain'
import { SaveError } from './errors'

const ARRAYS = ['npcs', 'animals', 'households', 'settlements', 'buildings', 'sites', 'ground', 'corpses', 'traces', 'carts', 'dens', 'quests', 'messages'] as const
const RECORDS = ['weather', 'px', 'nodes', 'terrainEdits', 'authoredQuests'] as const

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function actorOk(a: unknown): boolean {
  return obj(a) && num(a.id) && num(a.x) && num(a.z) && obj(a.vitals) && obj(a.ai)
}

function humanOk(h: unknown): boolean {
  return actorOk(h) && obj((h as Record<string, unknown>).inv) && Array.isArray(((h as Record<string, unknown>).inv as Record<string, unknown>).items)
}

const STATUSES = new Set(['active', 'done', 'lapsed', 'offered', 'refused'])
const isRecord = (v: unknown, each: (x: unknown) => boolean) => obj(v) && Object.values(v).every(each)

/** One authored quest state (review 014 #8): the engine reads every one of these on the first tick. */
function questStateOk(q: unknown): boolean {
  if (!obj(q)) return false
  return (
    typeof q.status === 'string' &&
    STATUSES.has(q.status) &&
    num(q.stage) &&
    typeof q.settled === 'boolean' &&
    num(q.offeredAt) &&
    (q.startedAt === undefined || num(q.startedAt)) &&
    (q.stageAt === undefined || num(q.stageAt)) &&
    isRecord(q.flags, (x) => ['boolean', 'number', 'string'].includes(typeof x)) &&
    isRecord(q.cast, num) &&
    isRecord(q.anchors, (a) => obj(a) && num(a.x) && num(a.z)) &&
    isRecord(q.obs, num) &&
    isRecord(q.counters, num) &&
    isRecord(q.seen, (a) => Array.isArray(a) && a.every((x) => typeof x === 'string')) &&
    isRecord(q.fired, num)
  )
}

/** `questHold`: `{q, x, z, until?}` when present; `questFollow`: an actor id. */
function questFieldsOk(a: unknown): boolean {
  if (!obj(a)) return false
  const h = a.questHold
  if (h !== undefined && !(obj(h) && typeof h.q === 'string' && num(h.x) && num(h.z) && (h.until === undefined || num(h.until)))) return false
  return a.questFollow === undefined || num(a.questFollow)
}

/** Throws SaveError('…corrupted…') naming the first broken field. */
export function assertSaveShape(st: unknown): asserts st is GameState {
  const bad = (what: string): never => {
    throw new SaveError(`The save is corrupted (${what}).`)
  }
  if (!obj(st)) bad('not an object')
  const s = st as Record<string, unknown>
  for (const k of ['saveVersion', 'genVersion', 'seed', 'nextId', 'rng'] as const) if (!num(s[k])) bad(k)
  if (!obj(s.time) || !num(s.time.cal) || !num(s.time.play)) bad('time')
  for (const k of ARRAYS) if (!Array.isArray(s[k])) bad(k)
  for (const k of RECORDS) if (!obj(s[k])) bad(k)
  if (!humanOk(s.player)) bad('player')
  if (!(s.npcs as unknown[]).every(humanOk)) bad('npcs')
  if (!(s.animals as unknown[]).every(actorOk)) bad('animals')
  if (!(s.npcs as unknown[]).every(questFieldsOk) || !(s.animals as unknown[]).every(questFieldsOk)) bad('quest hold')
  if (!Object.values(s.authoredQuests as Record<string, unknown>).every(questStateOk)) bad('authoredQuests')
  for (const k of ['buildings', 'settlements', 'households'] as const) if (!(s[k] as unknown[]).every(obj)) bad(k)
  for (const v of Object.values(s.terrainEdits as Record<string, unknown>)) {
    if (!Array.isArray(v) || v.length !== EDIT_N * EDIT_N || !v.every(num)) bad('terrainEdits')
  }
}
