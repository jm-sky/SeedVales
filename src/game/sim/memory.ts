/**
 * What villagers remember about the player (proposal P-09): short remarks derived from existing state only —
 * badges/stats, finished quests the NPC took part in, the mayor's office. Nothing new is saved.
 * @domain npc
 */
import type { Sim } from './sim'
import type { Human } from './types'
import { questDefs } from './questEngine'

/** Up to `max` remarks in a fixed priority order (stable between calls); empty when the NPC has nothing to say. */
export function npcRemarks(sim: Sim, npc: Human, max = 2): string[] {
  const out: string[] = []
  const px = sim.state.px
  const st = sim.state.settlements[npc.settlementId]
  if (st?.playerMayor) out.push('Good day, mayor.')
  for (const def of questDefs(sim)) {
    const q = sim.state.authoredQuests[def.id]
    if (q?.status === 'done' && q.startedAt !== undefined && Object.values(q.cast).includes(npc.id)) {
      out.push(`I won't forget what you did — ${def.title}.`)
      break
    }
  }
  if (px.badges.thief) out.push('I heard you were caught stealing. Don\'t try that here.')
  if (px.badges.beast_slayer) out.push('They say you have killed beasts that troubled us. We are grateful.')
  if (px.badges.rat_catcher && (npc.profession === 'farmer' || npc.profession === 'trader')) out.push('Thank you for dealing with the rats.')
  if ((px.stats.petted ?? 0) >= 5 && npc.profession === 'shepherd') out.push('My animals like you.')
  return out.slice(0, max)
}
