/**
 * Foraging knowledge (P-02): poisonous herbs are learned by use. After the player has been poisoned by one, or
 * once their medicine skill is high enough to tell them apart, the herb is a "known toxic" plant: it is labelled
 * in the pack and the player refuses to eat it by mistake. Saved as `px.knownToxic` (optional list of item ids).
 * @domain sim
 */
import type { Sim } from './sim'
import { itemDef } from '../data/items'

/** Medicine skill at which poisonous herbs are recognised on sight. */
export const TOXIC_SIGHT_SKILL = 30

/** Is this item a plant the player knows to be poisonous? */
export function knownToxic(sim: Sim, id: string): boolean {
  const poison = itemDef(id).herb?.poison
  if (!poison) return false
  return sim.player.skills.medicine >= TOXIC_SIGHT_SKILL || (sim.state.px.knownToxic ?? []).includes(id)
}

/** Records a poisonous plant after the player was hurt by it; returns true when it was new. */
export function learnToxic(sim: Sim, id: string): boolean {
  const list = (sim.state.px.knownToxic ??= [])
  if (list.includes(id)) return false
  list.push(id)
  return true
}
