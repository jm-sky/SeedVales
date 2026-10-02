/**
 * Authored-quest AI primitives (quests-engine §7): *hold* keeps an NPC at a spot (safety, eating and drinking from
 * the pack — no duties, no household life) and animals at a spot or following an actor (*follow*). A hold is a leash,
 * not a cage (review 014 #1): it always has an end (`until`), and a critical need (thirst, hunger, vigor) lifts it
 * for as long as the NPC needs to eat, drink or sleep the normal way.
 * @domain quests
 * @subdomain ai
 */
import type { GoalOption } from './npc/goals'
import type { Sim } from './sim'
import type { Animal, Human, QuestHold } from './types'
import { SPECIES } from '../data/species'
import { findFood } from './inventory'
import { steerTo } from './movement'

const need = (v: number) => (v < 70 ? ((70 - v) / 70) ** 1.4 : 0)

/** A hold without an explicit length lasts this many calendar hours. */
export const HOLD_DEFAULT_H = 3
/** Below these levels a held NPC leaves the spot to eat, drink or sleep (D-NPC-6) and returns afterwards. */
export const HOLD_CRITICAL = { thirst: 30, hunger: 25, vigor: 10 } as const

/** Calendar s at which a hold ends: the next `untilHour` o'clock (0..24), else `hours` from now. */
export function holdUntil(cal: number, hours?: number, untilHour?: number): number {
  if (untilHour === undefined) return cal + (hours ?? HOLD_DEFAULT_H) * 3600
  const t = Math.floor(cal / 86400) * 86400 + untilHour * 3600
  return t > cal ? t : t + 86400
}

/** The actor's hold while it is still valid; an expired (or open-ended legacy) hold is cleared. */
export function activeHold(a: { questHold?: QuestHold }, cal: number): QuestHold | undefined {
  const h = a.questHold
  if (!h) return undefined
  if ((h.until ?? 0) > cal) return h
  a.questHold = undefined
  return undefined
}

export const criticalNeed = (h: Human) => h.vitals.thirst < HOLD_CRITICAL.thirst || h.vitals.hunger < HOLD_CRITICAL.hunger || h.vitals.vigor < HOLD_CRITICAL.vigor

const LEASH_KEEP = new Set(['drink', 'eat', 'fight', 'flee', 'sleep'])

/** Critical need: the normal need options (home, well, store, bed) stay; duties and social life do not; the spot is the fallback. */
export function leashOptions(hold: QuestHold, opts: GoalOption[]): GoalOption[] {
  const out = opts.filter((o) => LEASH_KEEP.has(o.id))
  out.push(holdSpot(hold))
  return out
}

const holdSpot = (hold: QuestHold): GoalOption => ({
  id: 'quest_hold',
  score: 0.3,
  plan: () => ({ label: 'Waiting', steps: [{ op: 'goto', x: hold.x, z: hold.z, range: 2 }, { op: 'work', act: 'rest', dur: 20, label: 'Waiting' }] }),
})

/**
 * Goal options of a held NPC: the safety options already collected in `opts` (fight/flee), eating and drinking
 * from the pack, and `quest_hold` (walk to the spot, wait).
 */
export function holdOptions(h: Human, hold: QuestHold, opts: GoalOption[]): GoalOption[] {
  const v = h.vitals
  const thirst = need(v.thirst) * 1.15 + (v.thirst < 15 ? 0.4 : 0)
  if (thirst > 0.02 && h.inv.items.some((s) => (s.water ?? 0) > 0)) {
    opts.push({ id: 'drink', score: thirst, plan: () => ({ label: 'Drinking from a waterskin', steps: [{ op: 'work', act: 'drink_skin', dur: 2, label: 'Drinking' }] }) })
  }
  const hunger = need(v.hunger) + (v.hunger < 15 ? 0.35 : 0)
  if (hunger > 0.02 && findFood(h.inv)) {
    opts.push({ id: 'eat', score: hunger, plan: () => ({ label: 'Eating', steps: [{ op: 'work', act: 'eat_inv', dur: 4, label: 'Having a meal', anim: 'eat' }] }) })
  }
  opts.push(holdSpot(hold))
  return opts
}

/**
 * Animal under quest control: follows its target (≤ 2.2 m, runs when far) or stays at the hold spot (≤ 3 m).
 * Returns true when the quest drives the animal this tick.
 */
export function animalQuestMotion(sim: Sim, a: Animal, dt: number, full: boolean): boolean {
  let tx: number
  let tz: number
  let range: number
  if (a.questFollow !== undefined) {
    const t = sim.actor(a.questFollow)
    if (!t) {
      a.questFollow = undefined
      return false
    }
    tx = t.x
    tz = t.z
    range = 2.2
  } else if (activeHold(a, sim.state.time.cal)) {
    tx = a.questHold!.x
    tz = a.questHold!.z
    range = 3
  } else return false
  const sp = SPECIES[a.species]
  const ai = a.ai
  ai.goal = 'quest'
  ai.steps.length = 0
  ai.label = a.questFollow !== undefined ? 'Following' : 'Waiting'
  const d = Math.hypot(tx - a.x, tz - a.z)
  if (d <= range) {
    a.moving = 'idle'
    return true
  }
  steerTo(sim, a, tx, tz, d > 12 ? sp.run : sp.walk, dt, range, full, 0.3)
  return true
}
