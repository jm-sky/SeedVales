/**
 * Event hook through which world actions report to authored quests (quests-engine §6). A separate tiny module so
 * actions/cooking/build can call it without importing the engine (no import cycle); the engine registers itself.
 * @domain quests
 */
import type { StructureKind } from '../world/types'
import type { Sim } from './sim'

export type QuestEvent =
  | { k: 'roast'; n: number }
  | { k: 'repair'; buildingId: string; byPlayer: boolean }
  | { k: 'light'; buildingId: string }
  | { k: 'douse'; buildingId: string }
  | { k: 'built'; buildingId: string; kind: StructureKind }
  | { k: 'give'; npcId: number; item: string; qty: number }
  | { k: 'kill'; species: string }

type Handler = (sim: Sim, ev: QuestEvent) => void
let handler: Handler | undefined

export function registerQuestHandler(h: Handler) {
  handler = h
}

/** Reports a player action to the active authored quests (a no-op when there are none). */
export function questEvent(sim: Sim, ev: QuestEvent) {
  if (handler && sim.state.authoredQuests) handler(sim, ev)
}
