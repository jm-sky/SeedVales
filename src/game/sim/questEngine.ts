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
import { actorOf, allOf, applyEffects, cleanup, ctxOf, evalCond, expireHolds, gameDay, homeId, lapseQuest, newQuestState, provisionVisitors, type QuestCtx, resolveAnchor, resolveAnimalSlots, resolveNpcSlots } from './questCore'
import { registerQuestHandler } from './questHooks'

export { questEvent } from './questHooks'

const OFFER_CHECK_S = 30

interface EngineMemo {
  defs: readonly QuestDef[]
  /** Gameplay seconds since the last offer check. */
  offerAcc: number
  /** Quest id → game day before which a failed cast is not tried again. */
  retryDay: Map<string, number>
  /** Quest id → NPC cast resolved by an earlier offer check (reused while everyone is alive: no re-cast every 30 s). */
  casts: Map<string, Record<string, number>>
}

const memo = new WeakMap<Sim, EngineMemo>()
const memoOf = (sim: Sim): EngineMemo => {
  let m = memo.get(sim)
  if (!m) memo.set(sim, (m = { defs: AUTHORED_QUESTS, offerAcc: OFFER_CHECK_S, retryDay: new Map(), casts: new Map() }))
  return m
}

/** Replaces the quest list of one sim (engine tests with synthetic definitions). */
export function setQuestDefs(sim: Sim, defs: readonly QuestDef[]) {
  memoOf(sim).defs = defs
}

export const questDefs = (sim: Sim): readonly QuestDef[] => memoOf(sim).defs
export const questDef = (sim: Sim, id: string): QuestDef | undefined => memoOf(sim).defs.find((d) => d.id === id)

const live = (st: AuthoredQuestState) => st.status === 'offered' || st.status === 'active' || st.status === 'refused'

/** Start conditions that read no cast member: cheap to decide before any NPC is looked up. */
const CAST_FREE = new Set(['day', 'hour', 'money', 'posts', 'quest'])

/** The offer window of a definition has passed for good (a `day` condition with an upper bound that is behind us). */
const startExpired = (def: QuestDef, day: number) => def.start.some((k) => k.k === 'day' && k.to !== undefined && day > k.to)

/** Offers a quest when its start conditions hold and the cast resolves; returns whether it was offered. */
function tryOffer(sim: Sim, def: QuestDef, m: EngineMemo, force = false): boolean {
  const day = gameDay(sim)
  if (!force && (m.retryDay.get(def.id) ?? 0) > day) return false
  if (!force && startExpired(def, day)) return false // never offered again: no cast lookups for the rest of the game
  const st = newQuestState(def, sim.state.time.cal)
  const c = ctxOf(sim, def, st)
  if (!force && !def.start.filter((k) => CAST_FREE.has(k.k)).every((k) => evalCond(c, k))) return false
  const cached = m.casts.get(def.id)
  if (cached && !force && Object.values(cached).every((id) => !!sim.actor(id) && !sim.actor(id)!.vitals.dead)) st.cast = { ...cached }
  else if (!resolveNpcSlots(sim, def, st)) {
    m.retryDay.set(def.id, day + 1)
    return false
  } else m.casts.set(def.id, { ...st.cast })
  if (!force && !allOf(c, def.start)) return false
  if (!resolveAnimalSlots(sim, def, st)) {
    m.retryDay.set(def.id, day + 1)
    return false
  }
  sim.state.authoredQuests[def.id] = st
  applyEffects(c, def.onOffer ?? [])
  const giver = actorOf(c, def.giver)
  sim.message(`${giver && 'name' in giver ? giver.name : 'Someone'} has something on ${giver && 'male' in giver ? (giver.male ? 'his' : 'her') : 'their'} mind.`, 'quest')
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

/** `visit` counters: the player passing within `r` m of a home building counts it once (review 014 #6). */
function tickVisits(c: QuestCtx) {
  const { def, st, sim } = c
  for (const ct of def.counters) {
    const v = ct.visit
    if (!v || !allOf(c, ct.when)) continue
    const p = sim.player
    const seen = (st.seen[ct.id] ??= [])
    for (const b of sim.settlementBuildings(homeId(sim), v.kind)) {
      if ((v.lit && !b.lit) || seen.includes(b.id) || Math.hypot(b.x - p.x, b.z - p.z) > v.r) continue
      seen.push(b.id)
      st.counters[ct.id] = (st.counters[ct.id] ?? 0) + 1
    }
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

/** Rules of a finished quest (`phase: 'done'`): recurring payouts with a cadence and a cap. */
function tickAftermath(c: QuestCtx) {
  const day = gameDay(c.sim)
  for (const r of c.def.rules) {
    if (r.phase !== 'done') continue
    const last = c.st.fired[r.id]
    if (last !== undefined && day - last < (r.everyDays ?? 1)) continue
    const n = c.st.counters[`n:${r.id}`] ?? 0
    if (r.max !== undefined && n >= r.max) continue
    if (!allOf(c, r.when)) continue
    c.st.fired[r.id] = day
    c.st.counters[`n:${r.id}`] = n + 1
    applyEffects(c, r.effects)
  }
}

/** Lapse: a required cast member that is dead (or gone) ends the quest without reward. */
function requiredDead(c: QuestCtx): boolean {
  for (const [slot, spec] of Object.entries(c.def.cast)) {
    if (!spec.required || spec.kind === 'spawn' || spec.kind === 'creature') continue // a creature's death is part of the story (G07 kill, Q01 pelt)
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
  expireHolds(c)
  provisionVisitors(c)
  // Anchors of the current stage are resolved here (and cached in the saved state); read paths only look them up.
  const stageAnchor = def.stages[st.stage]?.anchor
  if (stageAnchor) resolveAnchor(c, stageAnchor)
  if (st.status === 'active') tickVisits(c)
  tickRules(c)
  if (st.status === 'active') tickObservations(c, dt)
}

/** Test/e2e only: (re)offers a quest right now, ignoring its start conditions (the cast must still resolve). */
export function forceOfferQuest(sim: Sim, id: string): boolean {
  const def = questDef(sim, id)
  if (!def) return false
  const old = sim.state.authoredQuests[id]
  if (old) {
    cleanup(ctxOf(sim, def, old))
    delete sim.state.authoredQuests[id]
  }
  return tryOffer(sim, def, memoOf(sim), true)
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
    else if (st.status === 'done' && def.rules.some((r) => r.phase === 'done')) tickAftermath(ctxOf(sim, def, st))
  }
}

// ---------------------------------------------------------------- event hook

function bumpCounters(c: QuestCtx, ev: QuestEvent) {
  const { def, st, sim } = c
  for (const ct of def.counters) {
    if (ct.on !== ev.k) continue
    const m = ct.match
    let bid: string | undefined
    if (ev.k === 'repair' || ev.k === 'light' || ev.k === 'douse' || ev.k === 'built' || ev.k === 'fill') bid = ev.buildingId
    const b = sim.building(bid)
    if (m) {
      if (m.kind && (ev.k === 'built' ? ev.kind : b?.kind) !== m.kind) continue
      if (m.home && b?.settlementId !== homeId(sim)) continue
      if (m.item && 'item' in ev && ev.item !== m.item) continue
      if (m.slot && (ev.k === 'give' || ev.k === 'sell') && st.cast[m.slot] !== ev.npcId) continue
      if (m.species && ev.k === 'kill' && ev.species !== m.species) continue
      if (m.den && !(ev.k === 'burn' && ev.denId === `qden:${def.id}`)) continue
      if (m.byPlayer !== undefined && ev.k === 'repair' && ev.byPlayer !== m.byPlayer) continue
      if (m.near) {
        const at = resolveAnchor(c, m.near.anchor)
        const pos = ev.k === 'dig' || ev.k === 'fell' ? ev : b // a dig or a felled tree is placed by its coordinates, building events by the building
        if (!at || !pos || Math.hypot(pos.x - at.x, pos.z - at.z) > m.near.r) continue
      }
      if (m.distinct && bid) {
        const seen = (st.seen[ct.id] ??= [])
        if (seen.includes(bid)) continue
        if (allOf(c, ct.when)) seen.push(bid)
      }
    }
    if (!allOf(c, ct.when)) continue
    if (m?.save && b) st.anchors[`saved:${m.save}`] = { x: b.x, z: b.z, id: b.id }
    st.counters[ct.id] = (st.counters[ct.id] ?? 0) + (ct.weight === 'n' ? (ev.k === 'roast' ? ev.n : ev.k === 'give' || ev.k === 'sell' ? ev.qty : 1) : 1)
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
