/**
 * Simulation-driven quests: neglected buildings → rat nests → guard asks for help; wolves near
 * settlement → hunter/guard asks. Quests expire when NPCs solve the problem.
 * @domain quests
 */
import type { Sim } from './sim'
import type { Quest } from './types'
import { animalsNear, countByDen, countNear, nestTag } from './queries'
import { addRep } from './reputation'
import { payFromTreasury } from './treasury'
import { hp } from './vitals'

/** A resolved/expired problem is not re-posted for the same building/settlement within a day (no spam when populations fluctuate). */
const QUEST_REPOST_S = 86400

export function questSystem(sim: Sim) {
  const s = sim.state
  // Rats: guard notices nests with visible rats.
  const perNest = countByDen(sim)
  for (const b of s.buildings) {
    if (!b.ratNest) continue
    const rats = perNest.get(nestTag(b.id)) ?? 0
    const existing = s.quests.find((q) => q.kind === 'rats' && q.buildingId === b.id && (q.status === 'available' || q.status === 'active' || s.time.cal - q.createdAt < QUEST_REPOST_S))
    if (!existing && rats >= 3) {
      const guard = sim.npcsOf(b.settlementId).find((n) => n.profession === 'guard' && !n.vitals.dead)
      if (!guard) continue
      const sett = s.settlements[b.settlementId]!
      const q: Quest = {
        id: `q-rats-${b.id}-${Math.floor(s.time.cal)}`,
        kind: 'rats',
        title: `Rats in ${sett.name}`,
        desc: `${guard.name} (guard): "The ${b.kind === 'warehouse' ? 'warehouse' : 'building'} hasn't been repaired in ages — rats have made a nest. Kill them and repair the walls (hammer + branches) before they eat our stores."`,
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
      sim.message(`On the notice board: ${q.title}`, 'quest')
    }
  }
  // Wolves threatening a settlement.
  for (const sett of sim.world.settlements) {
    const wolves = animalsNear(sim, sett.x, sett.z, sett.radius + 350, 'wolf')
    const existing = s.quests.find((q) => q.kind === 'wolves' && q.settlementId === sett.id && (q.status === 'available' || q.status === 'active' || s.time.cal - q.createdAt < QUEST_REPOST_S))
    if (!existing && wolves.length >= 2) {
      const giver = sim.npcsOf(sett.id).find((n) => n.profession === 'hunter') ?? sim.npcsOf(sett.id).find((n) => n.profession === 'guard')
      if (!giver) continue
      s.quests.push({
        id: `q-wolves-${sett.id}-${Math.floor(s.time.cal)}`,
        kind: 'wolves',
        title: `Wolves near ${sett.name}`,
        desc: `${giver.name}: "A wolf pack is prowling around the pens. Drive the wolves off or kill them."`,
        settlementId: sett.id,
        giverId: giver.id,
        status: 'available',
        reward: 60,
        createdAt: s.time.cal,
        killsNeeded: Math.min(3, wolves.length),
        kills: 0,
      })
      sim.message(`New notice: Wolves near ${sett.name}`, 'quest')
    }
  }
  // Resolution / expiry.
  for (const q of s.quests) {
    if (q.status !== 'available' && q.status !== 'active') continue
    if (q.kind === 'rats') {
      const b = sim.building(q.buildingId)
      // Rats of this nest wherever they roam/fled (plus stray rats right at the building).
      const ratsLeft = b ? (perNest.get(nestTag(b.id)) ?? 0) + countNear(sim, b.x, b.z, 20, 'rat') : 0
      if (b && !b.ratNest && ratsLeft === 0) {
        if (q.status === 'active' && q.kills > 0) completeQuest(sim, q)
        else {
          q.status = 'expired'
          sim.message(`${q.title}: the villagers dealt with the problem themselves.`, 'quest')
        }
      }
    }
    if (q.kind === 'wolves' && q.kills >= q.killsNeeded && q.status === 'active') completeQuest(sim, q)
    if (q.kind === 'wolves' && q.status === 'available' && s.time.cal - q.createdAt > 5 * 86400) q.status = 'expired'
  }
}

export function acceptQuest(sim: Sim, id: string): string {
  const q = sim.state.quests.find((qq) => qq.id === id)
  if (!q || q.status !== 'available') return 'Quest unavailable.'
  q.status = 'active'
  sim.message(`Quest accepted: ${q.title}`, 'quest')
  return 'Quest accepted.'
}

export function completeQuest(sim: Sim, q: Quest) {
  q.status = 'done'
  // Reward is paid by the settlement treasury (never minted); a poor settlement pays what it has.
  const paid = payFromTreasury(sim, q.settlementId, sim.player, q.reward)
  if (paid < q.reward) sim.message(`The settlement treasury is empty — you were paid only ${paid} of ${q.reward} c.`, 'bad')
  const giver = sim.human(q.giverId)
  if (giver) giver.opinion = Math.min(100, giver.opinion + 25)
  addRep(sim, q.settlementId, q.kind === 'rats' ? { helpfulness: 12, renown: 5 } : { courage: 10, renown: 8, helpfulness: 5 }, `Completed: ${q.title}. Reward ${paid} c`)
}

/** Called on kills by the player to advance quests. */
export function questOnKill(sim: Sim, species: string, x: number, z: number, denId?: string) {
  for (const q of sim.state.quests) {
    if (q.status !== 'active') continue
    if (q.kind === 'rats' && species === 'rat') {
      const b = sim.building(q.buildingId)
      if (b && (denId === nestTag(b.id) || Math.hypot(b.x - x, b.z - z) < 80)) q.kills++
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
