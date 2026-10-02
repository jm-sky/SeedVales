/**
 * Small constructors for quest data files (they return plain data — no logic is stored in the definitions).
 * @domain quests
 */
import type { Cond, DialogLine, DialogOption, Effect, SlotId } from './types'

/** A dialog line; `who` may be a slot, 'player' or 'self' (narration). */
export const say = (who: SlotId | 'player' | 'self', text: string, ...when: Cond[]): DialogLine => (when.length ? { who, text, when } : { who, text })

/** A line of an optional cast member: only shown when the slot exists and is alive. */
export const sayIf = (who: SlotId, text: string, ...when: Cond[]): DialogLine => say(who, text, { k: 'alive', slot: who }, ...when)

export const opt = (id: string, text: string, effects: Effect[] = [], extra: Partial<Omit<DialogOption, 'id' | 'text' | 'effects'>> = {}): DialogOption => ({ id, text, effects, ...extra })

export const flag = (name: string, eq: boolean | number | string = true): Cond => ({ k: 'flag', flag: name, eq })
export const flagNot = (name: string, ne: boolean | number | string): Cond => ({ k: 'flag', flag: name, ne })
export const set = (name: string, value: boolean | number | string = true): Effect => ({ k: 'set', flag: name, value })
export const stage = (to: number): Effect => ({ k: 'stage', to })
export const stageIs = (eq: number): Cond => ({ k: 'stage', eq })
export const stageGte = (gte: number): Cond => ({ k: 'stage', gte })
export const stageLt = (lt: number): Cond => ({ k: 'stage', lt })
export const alive = (slot: SlotId): Cond => ({ k: 'alive', slot })
export const message = (text: string, kind: 'info' | 'good' | 'bad' | 'quest' = 'quest'): Effect => ({ k: 'message', text, kind })
export const opinion = (slot: SlotId, delta: number): Effect => ({ k: 'opinion', slot, delta })
