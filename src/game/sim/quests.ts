/**
 * Simulation-driven quests: neglected buildings → rat nests → guard asks for help; wolves near
 * settlement → hunter/guard asks. Quests expire when NPCs solve the problem.
 * @domain quests
 */
import type { Sim } from './sim'
import type { Quest } from './types'
import { logEvent } from './eventLog'
import { isKnownSettlement } from './navigation'
import { animalsNear, countByDen, nestTag } from './queries'
import { questEvent } from './questHooks'
import { addRep, settlementAt } from './reputation'
import { payFromTreasury } from './treasury'
import { hp } from './vitals'

/** A resolved/expired problem is not re-posted for the same building/settlement within a day (no spam when populations fluctuate). */
const QUEST_REPOST_S = 86400
/** Finished (done/expired) quests kept as history, besides those still inside the repost cooldown (P-03). */
export const QUEST_HISTORY_MAX = 20

/** Stable key of a recurring problem: `rats:<buildingId>` / `wolves:<settlementId>`. */
export const questKey = (q: Quest) => (q.kind === 'rats' ? `rats:${q.buildingId}` : `wolves:${q.settlementId}`)

export interface QuestObjective {
  id: 'kills' | 'repair' | 'left'
  label: string
  done: boolean
  current?: number
  needed?: number
}

/** Explicit objectives of a board quest, derived from quest fields and sim state (never from text). */
export function questObjectives(sim: Sim, q: Quest): QuestObjective[] {
  const kills: QuestObjective = {
    id: 'kills',
    label: `${q.kind === 'rats' ? 'Rats you killed' : 'Wolves killed'}: ${Math.min(q.kills, q.killsNeeded)}/${q.killsNeeded}`,
    done: q.kills >= q.killsNeeded,
    current: Math.min(q.kills, q.killsNeeded),
    needed: q.killsNeeded,
  }
  if (q.kind !== 'rats') return [kills]
  const b = sim.building(q.buildingId)
  const done = !!b && !b.ratNest
  const out: QuestObjective[] = [kills, { id: 'repair', label: `Repair the ${b?.kind === 'warehouse' ? 'warehouse' : 'building'}: ${done ? 'done' : 'pending'}`, done }]
  // Rats of the nest that are still alive (they may have fled): tells the player why the quest is still open (review 016 #1).
  if (b && q.kills < q.killsNeeded) {
    const left = nestRatsLeft(sim, b.id)
    if (left > 0) out.push({ id: 'left', label: `Rats of the nest left: ${left}`, done: false, current: left })
  }
  return out
}

/** Living rats tagged to a nest, wherever they roam. */
const nestRatsLeft = (sim: Sim, buildingId: string) => countByDen(sim).get(nestTag(buildingId)) ?? 0

/** Reward line: a promise ("up to") until completion, then what the treasury actually paid. */
export function questRewardText(q: Quest): string {
  if (q.status === 'done' && q.paid !== undefined) return `paid ${q.paid} c${q.paid < q.reward ? ` of ${q.reward} c (the treasury ran short)` : ''}`
  return `up to ${q.reward} c, paid by the settlement treasury`
}

export function questSystem(sim: Sim) {
  const s = sim.state
  // Rats: guard notices nests with visible rats.
  const perNest = countByDen(sim)
  // Latest quest per recurring-problem key (one pass; the bounded history keeps this small).
  const latest = new Map<string, Quest>()
  for (const q of s.quests) latest.set(questKey(q), q)
  const blocks = (q: Quest | undefined) => !!q && (q.status === 'available' || q.status === 'active' || s.time.cal - q.createdAt < QUEST_REPOST_S)
  for (const b of s.buildings) {
    if (!b.ratNest) continue
    const rats = perNest.get(nestTag(b.id)) ?? 0
    if (!blocks(latest.get(`rats:${b.id}`)) && rats >= 3) {
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
      latest.set(questKey(q), q)
      sim.message(`On the notice board: ${q.title}`, 'quest')
      logEvent('quest', { id: q.id, kind: q.kind, status: 'available' }, undefined, q.settlementId)
    }
  }
  // Wolves threatening a settlement.
  for (const sett of sim.world.settlements) {
    const wolves = animalsNear(sim, sett.x, sett.z, sett.radius + 350, 'wolf')
    if (!blocks(latest.get(`wolves:${sett.id}`)) && wolves.length >= 2) {
      const giver = sim.npcsOf(sett.id).find((n) => n.profession === 'hunter') ?? sim.npcsOf(sett.id).find((n) => n.profession === 'guard')
      if (!giver) continue
      const wq: Quest = {
        id: `q-wolves-${sett.id}-${Math.floor(s.time.cal)}`,
        kind: 'wolves',
        title: `Wolves near ${sett.name}`,
        desc: `${giver.name}: "A wolf pack is prowling around the pens. Kill them before they take the herds."`,
        settlementId: sett.id,
        giverId: giver.id,
        status: 'available',
        reward: 60,
        createdAt: s.time.cal,
        killsNeeded: Math.min(3, wolves.length),
        kills: 0,
      }
      s.quests.push(wq)
      latest.set(questKey(wq), wq)
      sim.message(`New notice: Wolves near ${sett.name}`, 'quest')
      logEvent('quest', { id: wq.id, kind: 'wolves', status: 'available' }, undefined, sett.id)
    }
  }
  // Resolution / expiry.
  for (const q of s.quests) {
    if (q.status !== 'available' && q.status !== 'active') continue
    if (q.kind === 'rats') {
      const b = sim.building(q.buildingId)
      // Rats of this nest wherever they roam/fled, plus untagged strays right at the building (old saves).
      // Rats of another nest passing by do not keep the quest open.
      const strays = b ? animalsNear(sim, b.x, b.z, 20, 'rat').filter((a) => !a.denId).length : 0
      const ratsLeft = b ? (perNest.get(nestTag(b.id)) ?? 0) + strays : 0
      // Nest gone and the player killed what was asked: done. Rats that fled and are still alive become strays
      // (they no longer belong to the nest, so they cannot block the quest or its repost; review 016 #1).
      if (b && !b.ratNest && q.status === 'active' && q.kills >= q.killsNeeded && ratsLeft > 0) {
        const tag = nestTag(b.id)
        for (const a of s.animals) if (a.denId === tag) a.denId = undefined
        completeQuest(sim, q)
      } else if (b && !b.ratNest && ratsLeft === 0) {
        if (q.status === 'active' && q.kills > 0) completeQuest(sim, q)
        else {
          q.status = 'expired'
          logEvent('quest', { id: q.id, kind: q.kind, status: 'expired' }, undefined, q.settlementId)
          sim.message(`${q.title}: the villagers dealt with the problem themselves.`, 'quest')
        }
      }
    }
    if (q.kind === 'wolves' && q.kills >= q.killsNeeded && q.status === 'active') completeQuest(sim, q)
    if (q.kind === 'wolves' && q.status === 'available' && s.time.cal - q.createdAt > 5 * 86400) {
      q.status = 'expired'
      logEvent('quest', { id: q.id, kind: q.kind, status: 'expired' }, undefined, q.settlementId)
    }
  }
  pruneQuestHistory(sim)
}

/**
 * P-03: keeps all live quests, the last QUEST_HISTORY_MAX finished ones, and any finished quest still inside
 * the repost cooldown (so the cooldown stays correct). Bounded by max(20, problems resolved per day).
 */
export function pruneQuestHistory(sim: Sim) {
  const s = sim.state
  let finished = 0
  for (const q of s.quests) if (q.status === 'done' || q.status === 'expired') finished++
  if (finished <= QUEST_HISTORY_MAX) return
  let drop = finished - QUEST_HISTORY_MAX
  s.quests = s.quests.filter((q) => {
    if (drop <= 0 || (q.status !== 'done' && q.status !== 'expired')) return true
    if (s.time.cal - q.createdAt < QUEST_REPOST_S) return true
    drop--
    return false
  })
}

/** A board notice can be accepted only in the settlement that posted it (review 016 #17). */
const BOARD_MARGIN_M = 400

export interface NoticeGroup {
  settlementId: number
  name: string
  /** The player is in this settlement: its notices can be accepted. */
  here: boolean
  distanceM: number
  quests: Quest[]
}

/** Board quests grouped by the settlement that posted them: the player's settlement first, then by distance (newest first inside). */
export function noticeBoard(sim: Sim): NoticeGroup[] {
  const p = sim.player
  const here = settlementAt(sim, p.x, p.z, BOARD_MARGIN_M)
  const groups = new Map<number, NoticeGroup>()
  for (const q of [...sim.state.quests].reverse()) {
    // MAP-01: notices of settlements the player has not heard of stay hidden (review 017 #6).
    if (q.settlementId !== here && !isKnownSettlement(sim, q.settlementId)) continue
    let g = groups.get(q.settlementId)
    if (!g) {
      const w = sim.world.settlements[q.settlementId]!
      g = { settlementId: q.settlementId, name: sim.state.settlements[q.settlementId]?.name ?? w.name, here: q.settlementId === here, distanceM: Math.round(Math.hypot(w.x - p.x, w.z - p.z)), quests: [] }
      groups.set(q.settlementId, g)
    }
    g.quests.push(q)
  }
  return [...groups.values()].sort((a, b) => Number(b.here) - Number(a.here) || a.distanceM - b.distanceM)
}

export function acceptQuest(sim: Sim, id: string): string {
  const q = sim.state.quests.find((qq) => qq.id === id)
  if (!q || q.status !== 'available') return 'Quest unavailable.'
  if (settlementAt(sim, sim.player.x, sim.player.z, BOARD_MARGIN_M) !== q.settlementId) return `This notice was posted in ${sim.state.settlements[q.settlementId]?.name ?? 'another settlement'}: go there to accept it.`
  q.status = 'active'
  logEvent('quest', { id: q.id, kind: q.kind, status: 'active' }, undefined, q.settlementId)
  sim.message(`Quest accepted: ${q.title}`, 'quest')
  return 'Quest accepted.'
}

export function completeQuest(sim: Sim, q: Quest) {
  q.status = 'done'
  logEvent('quest', { id: q.id, kind: q.kind, status: 'done' }, undefined, q.settlementId)
  // Reward is paid by the settlement treasury (never minted); a poor settlement pays what it has.
  const paid = payFromTreasury(sim, q.settlementId, sim.player, q.reward)
  q.paid = paid
  if (paid < q.reward) sim.message(`The settlement treasury is empty — you were paid only ${paid} of ${q.reward} c.`, 'bad')
  const giver = sim.human(q.giverId)
  if (giver) giver.opinion = Math.min(100, giver.opinion + 25)
  addRep(sim, q.settlementId, q.kind === 'rats' ? { helpfulness: 12, renown: 5 } : { courage: 10, renown: 8, helpfulness: 5 }, `Completed: ${q.title}. Reward ${paid} c`)
}

/** Called on kills by the player to advance quests. */
export function questOnKill(sim: Sim, species: string, x: number, z: number, denId?: string) {
  questEvent(sim, { k: 'kill', species })
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
