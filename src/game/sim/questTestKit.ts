/**
 * Test helpers for authored quests (vitest and the e2e debug API): force start conditions, drive the engine tick
 * and dialog without a renderer. Not used by the game itself.
 * @domain quests
 * @subdomain test
 */
import type { Sim } from './sim'
import type { Animal, AuthoredQuestState, Building, Human, Inventory } from './types'
import { START_CALENDAR_S } from '../config/calibration'
import { humanOf as _humanOf, ctxOf } from './questCore'
import { questChoose, questSay, questTopics } from './questDialog'
import { authoredQuestSystem } from './questEngine'
import { questDef } from './questEngine'

export const stateOf = (sim: Sim, id: string): AuthoredQuestState | undefined => sim.state.authoredQuests[id]

/** Runs the quest system for `seconds` of gameplay time (1 s steps; an offer check happens on the first step). */
export function tickQuests(sim: Sim, seconds = 1) {
  for (let t = 0; t < seconds; t++) authoredQuestSystem(sim, 1)
}

/** Sets the game day (1 = the first day) and hour without advancing the simulation. */
export function setDayHour(sim: Sim, day: number, hour: number) {
  sim.state.time.cal = (day - 1 + Math.floor(START_CALENDAR_S / 86400)) * 86400 + hour * 3600
}

export function setHour(sim: Sim, hour: number) {
  sim.state.time.cal = Math.floor(sim.state.time.cal / 86400) * 86400 + hour * 3600
}

export const hoursLater = (sim: Sim, h: number) => {
  sim.state.time.cal += h * 3600
}

/** The cast NPC of a quest slot (after the quest was offered). */
export function castHuman(sim: Sim, questId: string, slot: string): Human {
  const st = sim.state.authoredQuests[questId]!
  const def = questDef(sim, questId)!
  const h = _humanOf(ctxOf(sim, def, st), slot)
  if (!h) throw new Error(`${questId}: no cast NPC in slot ${slot}`)
  return h
}

export function castAnimal(sim: Sim, questId: string, slot: string): Animal {
  const a = sim.actor(sim.state.authoredQuests[questId]!.cast[slot])
  if (!a || a.kind !== 'animal') throw new Error(`${questId}: no cast animal in slot ${slot}`)
  return a as Animal
}

export const houseOfNpc = (sim: Sim, n: Human): Building => sim.building(sim.state.households[n.householdId]!.houseId)!

export function say(sim: Sim, questId: string, node: string) {
  const s = questSay(sim, questId, node)
  if (!s) throw new Error(`${questId}: no node ${node}`)
  return s
}

/** Picks an option and throws when it is missing or disabled (a test must not silently do nothing). */
export function choose(sim: Sim, questId: string, node: string, option: string) {
  const o = say(sim, questId, node).options.find((x) => x.id === option)
  if (!o) throw new Error(`${questId}/${node}: no option ${option}`)
  if (!o.enabled) throw new Error(`${questId}/${node}/${option}: disabled (${o.reason})`)
  const r = questChoose(sim, questId, node, option)
  if (!r) throw new Error(`${questId}/${node}/${option}: not applied`)
  return r
}

/** Topic node of this quest on this NPC (what the dialog would open). */
export function topicNode(sim: Sim, questId: string, npcId: number): string | undefined {
  return questTopics(sim, npcId).find((t) => t.questId === questId)?.node
}

/** Every item of one kind in the world (players, NPCs, containers, ground, carts). */
export function itemTotal(sim: Sim, id: string): number {
  const inv = (i?: Inventory) => (i ? i.items.filter((s) => s.id === id).reduce((a, s) => a + s.qty, 0) : 0)
  const s = sim.state
  let n = inv(s.player.inv)
  for (const h of s.npcs) n += inv(h.inv)
  for (const b of s.buildings) n += inv(b.inv)
  for (const g of s.ground) if (g.stack.id === id) n += g.stack.qty
  for (const c of s.carts) n += inv(c.inv)
  return n
}

/** Actors still held or led by a quest (all quests, or one). */
export function heldActors(sim: Sim, questId?: string): number {
  const mine = (a: { questHold?: { q: string } }) => !!a.questHold && (!questId || a.questHold.q === questId)
  return sim.state.npcs.filter(mine).length + sim.state.animals.filter((a) => mine(a) || (!questId && a.questFollow !== undefined)).length
}
