/**
 * Simulation-driven quests: neglected buildings → rat nests → guard asks for help; wolves near
 * settlement → hunter/guard asks. Quests expire when NPCs solve the problem.
 * @domain quests
 */
import type { Sim } from './sim'
import type { Quest } from './types'
import { addRep } from './reputation'
import { payFromTreasury } from './treasury'
import { hp } from './vitals'

/** A resolved/expired problem is not re-posted for the same building/settlement within a day (no spam when populations fluctuate). */
const QUEST_REPOST_S = 86400

export function questSystem(sim: Sim) {
  const s = sim.state
  // Rats: guard notices nests with visible rats.
  for (const b of s.buildings) {
    if (!b.ratNest) continue
    const rats = s.animals.filter((a) => a.species === 'rat' && Math.hypot(a.x - b.x, a.z - b.z) < 40).length
    const existing = s.quests.find((q) => q.kind === 'rats' && q.buildingId === b.id && (q.status === 'available' || q.status === 'active' || s.time.cal - q.createdAt < QUEST_REPOST_S))
    if (!existing && rats >= 3) {
      const guard = s.npcs.find((n) => n.settlementId === b.settlementId && n.profession === 'guard' && !n.vitals.dead)
      if (!guard) continue
      const sett = s.settlements[b.settlementId]!
      const q: Quest = {
        id: `q-rats-${b.id}-${Math.floor(s.time.cal)}`,
        kind: 'rats',
        title: `Szczury w osadzie ${sett.name}`,
        desc: `${guard.name} (strażnik): „${b.kind === 'warehouse' ? 'Magazyn' : 'Budynek'} od dawna nienaprawiany — szczury zrobiły gniazdo. Wybij je i napraw ściany (młotek + gałęzie), zanim zjedzą zapasy.”`,
        settlementId: b.settlementId,
        giverId: guard.id,
        buildingId: b.id,
        status: 'available',
        reward: 30 + rats * 4,
        createdAt: s.time.cal,
        killsNeeded: Math.max(3, rats),
        kills: 0,
      }
      s.quests.push(q)
      sim.message(`Na tablicy ogłoszeń: ${q.title}`, 'quest')
    }
  }
  // Wolves threatening a settlement.
  for (const sett of sim.world.settlements) {
    const wolves = s.animals.filter((a) => a.species === 'wolf' && Math.hypot(a.x - sett.x, a.z - sett.z) < sett.radius + 350)
    const existing = s.quests.find((q) => q.kind === 'wolves' && q.settlementId === sett.id && (q.status === 'available' || q.status === 'active' || s.time.cal - q.createdAt < QUEST_REPOST_S))
    if (!existing && wolves.length >= 2) {
      const giver = s.npcs.find((n) => n.settlementId === sett.id && n.profession === 'hunter') ?? s.npcs.find((n) => n.settlementId === sett.id && n.profession === 'guard')
      if (!giver) continue
      s.quests.push({
        id: `q-wolves-${sett.id}-${Math.floor(s.time.cal)}`,
        kind: 'wolves',
        title: `Wilki pod ${sett.name}`,
        desc: `${giver.name}: „Wataha podchodzi pod zagrody. Przegoń albo ubij wilki.”`,
        settlementId: sett.id,
        giverId: giver.id,
        status: 'available',
        reward: 60,
        createdAt: s.time.cal,
        killsNeeded: Math.min(3, wolves.length),
        kills: 0,
      })
      sim.message(`Nowe ogłoszenie: Wilki pod ${sett.name}`, 'quest')
    }
  }
  // Resolution / expiry.
  for (const q of s.quests) {
    if (q.status !== 'available' && q.status !== 'active') continue
    if (q.kind === 'rats') {
      const b = sim.building(q.buildingId)
      const ratsLeft = s.animals.filter((a) => a.species === 'rat' && b && Math.hypot(a.x - b.x, a.z - b.z) < 60).length
      if (b && !b.ratNest && ratsLeft === 0) {
        if (q.status === 'active' && q.kills > 0) completeQuest(sim, q)
        else {
          q.status = 'expired'
          sim.message(`${q.title}: problem rozwiązali mieszkańcy.`, 'quest')
        }
      }
    }
    if (q.kind === 'wolves' && q.kills >= q.killsNeeded && q.status === 'active') completeQuest(sim, q)
    if (q.kind === 'wolves' && q.status === 'available' && s.time.cal - q.createdAt > 5 * 86400) q.status = 'expired'
  }
}

export function acceptQuest(sim: Sim, id: string): string {
  const q = sim.state.quests.find((qq) => qq.id === id)
  if (!q || q.status !== 'available') return 'Zadanie niedostępne.'
  q.status = 'active'
  sim.message(`Przyjęto zadanie: ${q.title}`, 'quest')
  return 'Przyjęto zadanie.'
}

export function completeQuest(sim: Sim, q: Quest) {
  q.status = 'done'
  // Reward is paid by the settlement treasury (never minted); a poor settlement pays what it has.
  const paid = payFromTreasury(sim, q.settlementId, sim.player, q.reward)
  if (paid < q.reward) sim.message(`Skarbiec osady jest pusty — wypłacono tylko ${paid} z ${q.reward} m.`, 'bad')
  const giver = sim.human(q.giverId)
  if (giver) giver.opinion = Math.min(100, giver.opinion + 25)
  addRep(sim, q.settlementId, q.kind === 'rats' ? { helpfulness: 12, renown: 5 } : { courage: 10, renown: 8, helpfulness: 5 }, `Ukończono: ${q.title}. Nagroda ${paid} m`)
}

/** Called on kills by the player to advance quests. */
export function questOnKill(sim: Sim, species: string, x: number, z: number) {
  for (const q of sim.state.quests) {
    if (q.status !== 'active') continue
    if (q.kind === 'rats' && species === 'rat') {
      const b = sim.building(q.buildingId)
      if (b && Math.hypot(b.x - x, b.z - z) < 80) q.kills++
    }
    if (q.kind === 'wolves' && species === 'wolf') {
      const st = sim.world.settlements[q.settlementId]!
      if (Math.hypot(st.x - x, st.z - z) < st.radius + 900) q.kills++
    }
  }
}

export const questGiverAlive = (sim: Sim, q: Quest) => {
  const g = sim.human(q.giverId)
  return !!g && hp(g.vitals) > 0
}
