/**
 * Authored quest engine: the 1 s tick (offer check every 30 s, rules, observations, lapse) and the event hook
 * (docs/design/quests-engine.md §6, §8). PERF-01: the tick touches only offered/active quests — the offer check
 * reads the home settlement's NPCs, never a world scan.
 * @domain quests
 */
import type { QuestDef } from '../data/quests/types'
import type { QuestEvent } from './questHooks'
import type { Sim } from './sim'
import type { AuthoredQuestState } from './types'
import { AUTHORED_QUESTS } from '../data/quests'
import { actorOf, allOf, applyEffects, ctxOf, gameDay, homeId, lapseQuest, newQuestState, type QuestCtx, resolveAnchor, resolveAnimalSlots, resolveNpcSlots } from './questCore'
import { registerQuestHandler } from './questHooks'

export { questEvent } from './questHooks'

const OFFER_CHECK_S = 30

interface EngineMemo {
  defs: readonly QuestDef[]
  /** Gameplay seconds since the last offer check. */
  offerAcc: number
  /** Quest id → game day before which a failed cast is not tried again. */
  retryDay: Map<string, number>
}

const memo = new WeakMap<Sim, EngineMemo>()
const memoOf = (sim: Sim): EngineMemo => {
  let m = memo.get(sim)
  if (!m) memo.set(sim, (m = { defs: AUTHORED_QUESTS, offerAcc: OFFER_CHECK_S, retryDay: new Map() }))
  return m
}

/** Replaces the quest list of one sim (engine tests with synthetic definitions). */
export function setQuestDefs(sim: Sim, defs: readonly QuestDef[]) {
  memoOf(sim).defs = defs
}

export const questDefs = (sim: Sim): readonly QuestDef[] => memoOf(sim).defs
export const questDef = (sim: Sim, id: string): QuestDef | undefined => memoOf(sim).defs.find((d) => d.id === id)

const live = (st: AuthoredQuestState) => st.status === 'offered' || st.status === 'active' || st.status === 'refused'

/** Offers a quest when its start conditions hold and the cast resolves; returns whether it was offered. */
function tryOffer(sim: Sim, def: QuestDef, m: EngineMemo): boolean {
  const day = gameDay(sim)
  if ((m.retryDay.get(def.id) ?? 0) > day) return false
  const st = newQuestState(def, sim.state.time.cal)
  const c = ctxOf(sim, def, st)
  if (!resolveNpcSlots(sim, def, st)) {
    m.retryDay.set(def.id, day + 1)
    return false
  }
  if (!allOf(c, def.start)) return false
  if (!resolveAnimalSlots(sim, def, st)) {
    m.retryDay.set(def.id, day + 1)
    return false
  }
  sim.state.authoredQuests[def.id] = st
  applyEffects(c, def.onOffer ?? [])
  const giver = actorOf(c, def.giver)
  sim.message(`${giver && 'name' in giver ? giver.name : 'Someone'} has something on their mind.`, 'quest')
  return true
}

function tickObservations(c: QuestCtx, dt: number) {
  const { def, st, sim } = c
  for (const ob of def.observations) {
    if (st.obs[ob.id] === -1) continue
    if (!allOf(c, ob.when)) continue
    const at = resolveAnchor(c, ob.at)
    if (!at) continue
    const p = sim.player
    if (Math.hypot(p.x - at.x, p.z - at.z) > ob.r) {
      if (ob.reset) st.obs[ob.id] = 0
      continue
    }
    const t = (st.obs[ob.id] ?? 0) + dt
    if (t < ob.dwellS) {
      st.obs[ob.id] = t
      continue
    }
    st.obs[ob.id] = -1
    applyEffects(c, ob.effects)
  }
}

function tickRules(c: QuestCtx) {
  const { def, st, sim } = c
  const phase = st.status === 'active' ? 'active' : 'offered'
  const day = gameDay(sim)
  for (const r of def.rules) {
    const when = r.phase ?? 'active'
    if (when !== 'both' && when !== phase) continue
    const once = r.once ?? 'ever'
    const last = st.fired[r.id]
    if (once === 'ever' && last !== undefined) continue
    if (once === 'day' && last === day) continue
    if (!allOf(c, r.when)) continue
    if (once !== 'always') st.fired[r.id] = day
    applyEffects(c, r.effects)
    if (!live(st)) return
  }
}

/** Lapse: a required cast member that is dead (or gone) ends the quest without reward. */
function requiredDead(c: QuestCtx): boolean {
  for (const [slot, spec] of Object.entries(c.def.cast)) {
    if (!spec.required || spec.kind === 'spawn') continue
    const id = c.st.cast[slot]
    if (id === undefined || id < 0) continue
    const a = c.sim.actor(id)
    if (!a || a.vitals.dead) return true
  }
  return false
}

export function tickQuest(sim: Sim, def: QuestDef, st: AuthoredQuestState, dt: number) {
  const c = ctxOf(sim, def, st)
  if (requiredDead(c)) {
    lapseQuest(c)
    return
  }
  tickRules(c)
  if (st.status === 'active') tickObservations(c, dt)
}

/** The system: offers quests and ticks the offered/active ones. */
export function authoredQuestSystem(sim: Sim, dt: number) {
  const m = memoOf(sim)
  m.offerAcc += dt
  const check = m.offerAcc >= OFFER_CHECK_S
  if (check) m.offerAcc = 0
  for (const def of m.defs) {
    const st = sim.state.authoredQuests[def.id]
    if (!st) {
      if (check) tryOffer(sim, def, m)
      continue
    }
    if (live(st)) tickQuest(sim, def, st, dt)
  }
}

// ---------------------------------------------------------------- event hook

function bumpCounters(c: QuestCtx, ev: QuestEvent) {
  const { def, st, sim } = c
  for (const ct of def.counters) {
    if (ct.on !== ev.k) continue
    const m = ct.match
    let bid: string | undefined
    if (ev.k === 'repair' || ev.k === 'light' || ev.k === 'douse' || ev.k === 'built') bid = ev.buildingId
    const b = sim.building(bid)
    if (m) {
      if (m.kind && (ev.k === 'built' ? ev.kind : b?.kind) !== m.kind) continue
      if (m.home && b?.settlementId !== homeId(sim)) continue
      if (m.item && 'item' in ev && ev.item !== m.item) continue
      if (m.slot && ev.k === 'give' && st.cast[m.slot] !== ev.npcId) continue
      if (m.species && ev.k === 'kill' && ev.species !== m.species) continue
      if (m.near) {
        const at = resolveAnchor(c, m.near.anchor)
        if (!at || !b || Math.hypot(b.x - at.x, b.z - at.z) > m.near.r) continue
      }
      if (m.distinct && bid) {
        const seen = (st.seen[ct.id] ??= [])
        if (seen.includes(bid)) continue
        if (allOf(c, ct.when)) seen.push(bid)
      }
    }
    if (!allOf(c, ct.when)) continue
    if (m?.save && b) st.anchors[`saved:${m.save}`] = { x: b.x, z: b.z, id: b.id }
    st.counters[ct.id] = (st.counters[ct.id] ?? 0) + (ct.weight === 'n' && ev.k === 'roast' ? ev.n : 1)
  }
}

/** Called from existing actions: bumps the counters of the active quests only. */
export function handleQuestEvent(sim: Sim, ev: QuestEvent) {
  for (const def of memoOf(sim).defs) {
    const st = sim.state.authoredQuests[def.id]
    if (st?.status === 'active') bumpCounters(ctxOf(sim, def, st), ev)
  }
}

registerQuestHandler(handleQuestEvent)
