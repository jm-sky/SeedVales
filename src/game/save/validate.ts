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
  for (const k of ['buildings', 'settlements', 'households'] as const) if (!(s[k] as unknown[]).every(obj)) bad(k)
  for (const v of Object.values(s.terrainEdits as Record<string, unknown>)) {
    if (!Array.isArray(v) || v.length !== EDIT_N * EDIT_N || !v.every(num)) bad('terrainEdits')
  }
}
