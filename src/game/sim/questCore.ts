/**
 * Authored quest engine core: cast resolution, anchors, condition evaluation and effect application
 * (docs/design/quests-engine.md §2–§4, §7). Tick, offer and event hook: `questEngine.ts`; dialog and journal:
 * `questDialog.ts`. Every money/item flow is a transfer from a named source, partial when short; `consume` is
 * the only sink (D-ECON-1, D-ECON-3).
 * @domain quests
 */
import type { Anchor, CastSpec, Cond, Effect, FlagValue, QuestDef, QuestPlace, SlotId, Source } from '../data/quests/types'
import type { Sim } from './sim'
import type { Actor, Animal, AuthoredQuestState, Building, Human, Inventory } from './types'
import { START_CALENDAR_S } from '../config/calibration'
import { Rng } from '../core/rng'
import { itemDef } from '../data/items'
import { AUTHORED_QUESTS } from '../data/quests'
import { giveOrDrop } from './actions'
import { logConsume, logMint, logProduce } from './eventLog'
import { addItem, consumeItem, countItem, findFood, newStack, removeItem } from './inventory'
import { makeHuman } from './newGame'
import { addPriceMod } from './priceMods'
import { holdUntil } from './questHold'
import { addRep } from './reputation'
import { dayIndex, hourOf, isNight } from './time'

export interface QuestCtx {
  sim: Sim
  def: QuestDef
  st: AuthoredQuestState
  /** Read paths (UI, journal, markers) never write the saved anchor cache (review 014 #11). */
  readOnly?: boolean
}

export const ctxOf = (sim: Sim, def: QuestDef, st: AuthoredQuestState): QuestCtx => ({ sim, def, st })
/** Context for read paths: anchors resolved here live in a transient cache, never in the saved state. */
export const readCtxOf = (sim: Sim, def: QuestDef, st: AuthoredQuestState): QuestCtx => ({ sim, def, st, readOnly: true })

export const homeId = (sim: Sim) => sim.world.homeSettlement

/** The nearest settlement other than home (the quests' {V}); -1 when the world has only one. */
export function neighbourId(sim: Sim): number {
  const home = sim.world.settlements[homeId(sim)]!
  let best = -1
  let bd = Infinity
  for (const s of sim.world.settlements) {
    if (s.id === home.id) continue
    const d = Math.hypot(s.x - home.x, s.z - home.z)
    if (d < bd) {
      bd = d
      best = s.id
    }
  }
  return best
}

export const placeId = (sim: Sim, place: QuestPlace | undefined): number => (place === 'V' ? neighbourId(sim) : homeId(sim))
/** Game day since the start (1 = the first day). */
export const gameDay = (sim: Sim) => dayIndex(sim.state.time.cal) - dayIndex(START_CALENDAR_S) + 1
export const firstName = (h: { name: string }) => h.name.split(' ')[0] ?? h.name

/**
 * Text placeholders of a quest (review 016 #2): `{slot}` = generated first name of the cast NPC, `{slot:he}` /
 * `{slot:him}` / `{slot:his}` / `{slot:himself}` (capitalised: `{slot:He}`) = pronouns from the NPC's sex, `{H}` / `{V}` =
 * home and nearest other settlement. An empty optional slot uses `fallbackName` and `fallbackMale`.
 */
export function questPlaceholders(c: QuestCtx): Record<string, string> {
  const m: Record<string, string> = { H: c.sim.state.settlements[homeId(c.sim)]?.name ?? 'the village' }
  const home = c.sim.world.settlements[homeId(c.sim)]!
  let best: { name: string; d: number } | undefined
  for (const s of c.sim.world.settlements) {
    if (s.id === home.id) continue
    const d = Math.hypot(s.x - home.x, s.z - home.z)
    if (!best || d < best.d) best = { name: c.sim.state.settlements[s.id]?.name ?? s.name, d }
  }
  m.V = best?.name ?? 'the next village'
  for (const [slot, spec] of Object.entries(c.def.cast)) {
    const h = humanOf(c, slot)
    m[slot] = h ? firstName(h) : (spec.fallbackName ?? 'someone')
    const male = h ? h.male : (spec.fallbackMale ?? false)
    const pr = male ? { he: 'he', him: 'him', his: 'his', himself: 'himself' } : { he: 'she', him: 'her', his: 'her', himself: 'herself' }
    for (const [k, v] of Object.entries(pr)) {
      m[`${slot}:${k}`] = v
      m[`${slot}:${k[0]!.toUpperCase()}${k.slice(1)}`] = v[0]!.toUpperCase() + v.slice(1)
    }
  }
  return m
}

export const fillQuestText = (text: string, ph: Record<string, string>) =>
  text.replace(/\{(\w+)(?::(\w+))?\}/g, (all, k: string, p?: string) => ph[p ? `${k}:${p}` : k] ?? all)

export function newQuestState(def: QuestDef, now: number): AuthoredQuestState {
  return { status: 'offered', stage: 0, flags: { ...def.flags }, settled: false, offeredAt: now, cast: {}, anchors: {}, obs: {}, counters: {}, seen: {}, fired: {} }
}

export function actorOf(c: QuestCtx, slot: SlotId): Actor | undefined {
  const id = c.st.cast[slot]
  return id === undefined || id < 0 ? undefined : c.sim.actor(id)
}

export function humanOf(c: QuestCtx, slot: SlotId): Human | undefined {
  const a = actorOf(c, slot)
  return a && a.kind !== 'animal' ? (a as Human) : undefined
}

const alive = (a: Actor | undefined): a is Actor => !!a && !a.vitals.dead

// ---------------------------------------------------------------- cast

const pickKin = (list: Human[], kin: CastSpec['kin']): Human | undefined => {
  if (!kin) return list[0]
  for (const k of kin) {
    const h = list.find((n) => n.kin === k)
    if (h) return h
  }
  return undefined
}

/** Resolves the NPC slots from the home settlement's households (≤ 40 NPCs, no world scan). True when every required one exists. */
export function resolveNpcSlots(sim: Sim, def: QuestDef, st: AuthoredQuestState): boolean {
  const used = new Set(Object.values(st.cast))
  let ok = true
  for (const [slot, spec] of Object.entries(def.cast)) {
    if (spec.kind !== 'npc' || st.cast[slot] !== undefined) continue
    const list = sim.npcsOf(placeId(sim, spec.place)).filter((n) => {
      if (n.vitals.dead || n.questOwner || n.companion || used.has(n.id) || n.householdId < 0) return false
      if (spec.profession && sim.state.households[n.householdId]?.profession !== spec.profession) return false
      return !spec.age || n.age === spec.age
    })
    const h = pickKin(list, spec.kin)
    if (h) {
      st.cast[slot] = h.id
      used.add(h.id)
    } else if (spec.required) ok = false
  }
  return ok
}

/** Resolves animal slots (after the NPC slots they depend on). Spawn slots are created by their `spawn` effect. */
export function resolveAnimalSlots(sim: Sim, def: QuestDef, st: AuthoredQuestState): boolean {
  let ok = true
  for (const [slot, spec] of Object.entries(def.cast)) {
    if (spec.kind !== 'animal' || st.cast[slot] !== undefined) continue
    const owner = spec.ofSlot ? sim.human(st.cast[spec.ofSlot]) : undefined
    const mine = owner ? sim.state.animals.filter((a) => a.householdId === owner.householdId && a.species === spec.species && !a.vitals.dead) : []
    const a = mine.find((x) => x.variant === spec.preferVariant) ?? mine[0]
    if (a) st.cast[slot] = a.id
    else if (spec.required) ok = false
  }
  return ok
}

// ---------------------------------------------------------------- anchors

const houseOfSlot = (c: QuestCtx, slot: SlotId): Building | undefined => {
  const h = humanOf(c, slot)
  const hh = h ? c.sim.state.households[h.householdId] : undefined
  return hh ? c.sim.building(hh.houseId) : undefined
}

const nearest = <T extends { x: number; z: number }>(list: readonly T[], x: number, z: number): T | undefined => {
  let best: T | undefined
  let bd = Infinity
  for (const b of list) {
    const d = Math.hypot(b.x - x, b.z - z)
    if (d < bd) {
      bd = d
      best = b
    }
  }
  return best
}

/** A point beside the road that leaves the home settlement, `m` metres beyond its edge. */
function roadPoint(sim: Sim, m: number): { x: number; z: number } | null {
  const home = homeId(sim)
  const hs = sim.world.settlements[home]!
  const road = sim.world.roads.find((r) => r.from === home || r.to === home)
  if (!road) return null
  const pts = road.from === home ? road.points : [...road.points].reverse()
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]!
    if (Math.hypot(p.x - hs.x, p.z - hs.z) < hs.radius + m || sim.terrain.waterDepthAt(p.x, p.z) > 0.3) continue
    const q = pts[i - 1]!
    const len = Math.hypot(p.x - q.x, p.z - q.z) || 1
    const ox = p.x + (-(p.z - q.z) / len) * 6
    const oz = p.z + ((p.x - q.x) / len) * 6
    return sim.terrain.waterDepthAt(ox, oz) < 0.3 ? { x: ox, z: oz } : { x: p.x, z: p.z }
  }
  return null
}

type Resolved = { x: number; z: number; id?: string }
const anchorKeys = new WeakMap<Anchor, string>()
const anchorKey = (a: Anchor): string => {
  let k = anchorKeys.get(a)
  if (k === undefined) anchorKeys.set(a, (k = JSON.stringify(a)))
  return k
}
/** Anchors resolved by read paths (not saved; re-resolved after a load). */
const transientAnchors = new WeakMap<AuthoredQuestState, Record<string, Resolved>>()

/**
 * Resolves an anchor once; the tick caches results in the quest state so evaluation never searches the world again.
 * Read paths (`c.readOnly`) use a transient cache and never write saved state (review 014 #11).
 */
export function resolveAnchor(c: QuestCtx, a: Anchor): Resolved | null {
  if (a.k === 'actor') {
    const t = actorOf(c, a.slot)
    return t ? { x: t.x, z: t.z } : null
  }
  if (a.k === 'saved') return c.st.anchors[`saved:${a.id}`] ?? null
  const key = anchorKey(a)
  const saved = c.st.anchors[key]
  if (saved) return saved
  const seen = transientAnchors.get(c.st)?.[key]
  if (seen) {
    if (!c.readOnly) c.st.anchors[key] = seen // the tick persists what a read path resolved first
    return seen
  }
  let r: { x: number; z: number; id?: string } | null = null
  const sim = c.sim
  if (a.k === 'house') {
    const b = houseOfSlot(c, a.slot)
    if (b) r = { x: b.x, z: b.z, id: b.id }
  } else if (a.k === 'building') {
    const h = humanOf(c, a.slot)
    const house = houseOfSlot(c, a.slot)
    const b = h && house ? nearest(sim.householdBuildings(h.householdId).filter((x) => x.kind === a.kind), house.x, house.z) : undefined
    if (b) r = { x: b.x, z: b.z, id: b.id }
  } else if (a.k === 'torchpost') {
    const house = houseOfSlot(c, a.slot)
    const b = house ? nearest(sim.settlementBuildings(homeId(sim), 'torchpost'), house.x, house.z) : undefined
    if (b) r = { x: b.x, z: b.z, id: b.id }
  } else if (a.k === 'settlement') {
    const hs = sim.world.settlements[homeId(sim)]!
    const b = nearest(sim.settlementBuildings(homeId(sim), a.kind), hs.x, hs.z)
    if (b) r = { x: b.x, z: b.z, id: b.id }
  } else r = roadPoint(sim, a.m)
  if (r) {
    if (c.readOnly) {
      let t = transientAnchors.get(c.st)
      if (!t) transientAnchors.set(c.st, (t = {}))
      t[key] = r
    } else c.st.anchors[key] = r
  }
  return r
}

export const homePosts = (sim: Sim) => sim.settlementBuildings(homeId(sim), 'torchpost').length

// ---------------------------------------------------------------- conditions

const flagVal = (c: QuestCtx, v: FlagValue): FlagValue => (v === 'today' ? gameDay(c.sim) : v)

function posOf(c: QuestCtx, slot?: SlotId, anchor?: Anchor): { x: number; z: number } | null {
  if (slot) {
    const a = actorOf(c, slot)
    return a ? { x: a.x, z: a.z } : null
  }
  return anchor ? resolveAnchor(c, anchor) : null
}

export function evalCond(c: QuestCtx, k: Cond): boolean {
  const { sim, st } = c
  const p = sim.player
  switch (k.k) {
    case 'alive':
      return alive(actorOf(c, k.slot))
    case 'all':
      return k.of.every((x) => evalCond(c, x))
    case 'any':
      return k.of.some((x) => evalCond(c, x))
    case 'counter':
      return (st.counters[k.id] ?? 0) >= (k.gte === 'homePosts' ? homePosts(sim) : k.gte)
    case 'day': {
      const d = gameDay(sim)
      return (k.from === undefined || d >= k.from) && (k.to === undefined || d <= k.to)
    }
    case 'durability': {
      const b = houseOfSlot(c, k.slot)
      return !!b && (k.lt === undefined || b.durability < k.lt) && (k.gte === undefined || b.durability >= k.gte)
    }
    case 'flag': {
      const v = st.flags[k.flag]
      if (k.eq !== undefined && v !== flagVal(c, k.eq)) return false
      if (k.ne !== undefined && v === flagVal(c, k.ne)) return false
      if (k.gte !== undefined && !(typeof v === 'number' && v >= k.gte)) return false
      if (k.in !== undefined && !(v !== undefined && k.in.includes(v))) return false
      return true
    }
    case 'hasItem': {
      const inv = k.from === 'player' ? p.inv : storeInv(c, k.from.store)
      return !!inv && countItem(inv, k.item) >= k.qty
    }
    case 'hour': {
      const cal = sim.state.time.cal
      if (k.night) return isNight(cal)
      const h = hourOf(cal)
      const from = k.from ?? 0
      const to = k.to ?? 24
      return from <= to ? h >= from && h < to : h >= from || h < to
    }
    case 'litTorch':
      return p.eq.off?.id === 'torch'
    case 'money':
      return p.money >= k.gte
    case 'near': {
      const from = k.of ? posOf(c, k.of) : p
      const to = posOf(c, k.slot, k.anchor)
      return !!from && !!to && Math.hypot(from.x - to.x, from.z - to.z) <= k.r
    }
    case 'not':
      return !evalCond(c, k.of)
    case 'observed':
      return st.obs[k.id] === -1
    case 'opinion': {
      const h = humanOf(c, k.slot)
      return !!h && (k.gte === undefined || h.opinion >= k.gte) && (k.lt === undefined || h.opinion < k.lt)
    }
    case 'posts':
      return homePosts(sim) >= k.gte
    case 'quest': {
      const o = sim.state.authoredQuests[k.id]
      // `started`: the player really took the quest on (an ending of a quest nobody accepted does not count).
      return !!o && k.in.includes(o.status) && (!k.started || o.startedAt !== undefined)
    }
    case 'since': {
      const t = k.from === 'offered' ? st.offeredAt : k.from === 'stage' ? (st.stageAt ?? st.startedAt) : st.startedAt
      return t !== undefined && (sim.state.time.cal - t) / 3600 >= k.hours
    }
    case 'skill':
      return p.skills[k.skill] >= k.gte
    case 'sneaking':
      return sim.state.px.sneaking
    case 'stage':
      return (k.gte === undefined || st.stage >= k.gte) && (k.eq === undefined || st.stage === k.eq) && (k.lt === undefined || st.stage < k.lt)
    case 'visited': {
      const id = placeId(sim, k.place)
      return id >= 0 && !!sim.state.px.visited?.includes(id)
    }
  }
}

export const allOf = (c: QuestCtx, conds: Cond[] | undefined) => !conds || conds.every((x) => evalCond(c, x))

// ---------------------------------------------------------------- sources

function storeInv(c: QuestCtx, slot: SlotId): Inventory | undefined {
  return houseOfSlot(c, slot)?.inv
}

function invOf(c: QuestCtx, s: Source): Inventory | undefined {
  if (s === 'player') return c.sim.player.inv
  if ('purse' in s) return humanOf(c, s.purse)?.inv
  if ('store' in s) return storeInv(c, s.store)
  return c.sim.building(c.sim.state.settlements[homeId(c.sim)]?.warehouseId)?.inv
}

/** Money is held by the player, a cast purse or the home treasury. */
function moneyHolder(c: QuestCtx, s: Source): { get: () => number; add: (n: number) => void } | undefined {
  if (s === 'player') return { get: () => c.sim.player.money, add: (n) => (c.sim.player.money += n) }
  if ('purse' in s) {
    const h = humanOf(c, s.purse)
    return h ? { get: () => h.money, add: (n) => (h.money += n) } : undefined
  }
  if ('treasury' in s) {
    const t = c.sim.state.settlements[homeId(c.sim)]
    return t ? { get: () => t.treasury, add: (n) => (t.treasury += n) } : undefined
  }
  return undefined
}

const nameOfSource = (c: QuestCtx, s: Source): string => {
  if (s === 'player') return 'you'
  if ('purse' in s) return humanOf(c, s.purse)?.name ?? 'someone'
  if ('store' in s) return `${humanOf(c, s.store)?.name ?? 'someone'}'s household`
  if ('treasury' in s) return 'the settlement treasury'
  return 'the settlement warehouse'
}

function transferMoney(c: QuestCtx, from: Source, to: Source, amount: number) {
  const a = moneyHolder(c, from)
  const b = moneyHolder(c, to)
  if (!a || !b || amount <= 0) return
  const paid = Math.max(0, Math.min(amount, a.get()))
  if (paid > 0) {
    a.add(-paid)
    b.add(paid)
  }
  if (paid < amount) c.sim.message(`${nameOfSource(c, from)} could pay only ${paid} of ${amount} c.`, 'bad')
  else if (to === 'player') c.sim.message(`You receive ${paid} c from ${nameOfSource(c, from)}.`, 'good')
}

function transferItems(c: QuestCtx, from: Source, to: Source, item: string, qty: number) {
  const a = invOf(c, from)
  const b = invOf(c, to)
  if (!a || !b || qty <= 0) return
  const n = Math.min(qty, countItem(a, item))
  if (n <= 0) return
  for (const s of removeItem(a, item, n)) {
    if (to === 'player') giveOrDrop(c.sim, c.sim.player, s)
    else addItem(b, s)
  }
}

// ---------------------------------------------------------------- holds and followers

function resetAi(a: Actor) {
  a.ai.goal = null
  a.ai.steps = []
  a.ai.stepIdx = 0
  a.ai.stepT = 0
  a.ai.replanAt = 0
  a.ai.decideAt = 0
}

function setHold(c: QuestCtx, slot: SlotId, e: Extract<Effect, { k: 'hold' }>) {
  const a = actorOf(c, slot)
  if (!a) return
  if (a.kind !== 'animal' && (a as Human).companion) return // a travelling companion is not held (review 014 #5)
  const cal = c.sim.state.time.cal
  const held = a.questHold && (a.questHold.until ?? 0) > cal ? a.questHold : undefined
  if (held && held.q !== c.def.id) return // another quest owns the (still valid) hold
  const pos = e.at ? resolveAnchor(c, e.at) : { x: a.x, z: a.z }
  if (!pos) return
  const snap = !!e.snap
  const same = held && Math.hypot(held.x - pos.x, held.z - pos.z) < 0.5
  a.questHold = { q: c.def.id, x: pos.x, z: pos.z, until: holdUntil(cal, e.hours, e.untilHour) }
  if (!same) resetAi(a)
  if (snap) {
    a.x = pos.x + 1.2
    a.z = pos.z + 1.2
    a.y = c.sim.terrain.heightAt(a.x, a.z)
    c.sim.actors.update(a)
  }
}

function clearHold(c: QuestCtx, slot: SlotId) {
  const a = actorOf(c, slot)
  if (a?.questHold?.q === c.def.id) {
    a.questHold = undefined
    resetAi(a)
  }
}

function spawnVisitor(c: QuestCtx, slot: SlotId) {
  const spec = c.def.cast[slot]?.spawn
  if (!spec || c.st.cast[slot] !== undefined) return
  const at = resolveAnchor(c, spec.at)
  if (!at) return
  const sim = c.sim
  const rng = new Rng(sim.state.seed ^ (c.def.id.charCodeAt(0) * 7919) ^ 0x71517)
  const x = at.x
  const z = at.z
  const rest = spec.name.split(' ').slice(1)
  const h = makeHuman(rng, sim.nextId(), x, z, sim.terrain.heightAt(x, z), spec.male, 'adult', rest.join(' '))
  h.name = spec.name
  h.settlementId = homeId(sim)
  h.householdId = -1
  h.kin = 'visitor'
  h.questOwner = c.def.id
  // A visitor arrives from outside the simulated world: its purse and pack are an explicit external source (ledger).
  h.money = spec.money ?? 0
  if (h.money > 0) logMint(h.money, `quest:${c.def.id}:visitor`, h)
  for (const it of spec.items) {
    addItem(h.inv, newStack(it.item, it.qty))
    logProduce(it.item, it.qty, `quest:${c.def.id}:visitor`, h)
  }
  h.vitals.hunger = 55
  h.vitals.thirst = 70
  sim.addNpc(h)
  c.st.cast[slot] = h.id
  // A visitor stays until the quest ends (at the latest its own timeout); `provisionVisitors` feeds it meanwhile.
  h.questHold = { q: c.def.id, x, z, until: holdUntil(sim.state.time.cal, VISITOR_STAY_H) }
}

/** How long a visitor's hold is valid: longer than any quest timeout using one (G01 48 h). */
const VISITOR_STAY_H = 96

/**
 * Provisions for the visitor's whole stay (review 014 #1): a declared external source — the wanderer carries what it
 * needs from outside the simulated world. Bread is ledger-logged (`logProduce`); water is not a conserved item.
 */
export function provisionVisitors(c: QuestCtx) {
  for (const [slot, spec] of Object.entries(c.def.cast)) {
    if (spec.kind !== 'spawn') continue
    const h = humanOf(c, slot)
    if (!h || h.vitals.dead || h.questOwner !== c.def.id) continue
    if (h.vitals.hunger < 50 && !findFood(h.inv)) {
      addItem(h.inv, newStack('bread', 1))
      logProduce('bread', 1, `quest:${c.def.id}:visitor-provision`, h)
    }
    if (h.vitals.thirst < 50 && !h.inv.items.some((s) => (s.water ?? 0) > 0)) {
      const skin = h.inv.items.find((s) => itemDef(s.id).waterCapacity)
      if (skin) skin.water = itemDef(skin.id).waterCapacity
      else addItem(h.inv, newStack('waterskin_m', 1))
    }
  }
}

/** Removes a quest-owned actor; a visitor's belongings go to the home warehouse / treasury (never vanish). */
function despawn(c: QuestCtx, slot: SlotId) {
  const a = actorOf(c, slot)
  if (!a) return
  const sim = c.sim
  if (a.kind === 'animal') sim.removeAnimal(a as Animal)
  else {
    const h = a as Human
    if (h.questOwner !== c.def.id) return
    const wh = sim.building(sim.state.settlements[homeId(sim)]?.warehouseId)
    for (const s of h.inv.items) {
      if (wh?.inv) addItem(wh.inv, s)
      else logConsume(s.id, s.qty, `quest:${c.def.id}:visitor-left`, h)
    }
    h.inv.items = []
    const t = sim.state.settlements[homeId(sim)]
    if (t) t.treasury += h.money
    h.money = 0
    sim.removeNpc(h)
  }
  c.st.cast[slot] = -1
}

/** Clears this quest's holds that ran out (the AI would do it at its next decision; this keeps the state honest). */
export function expireHolds(c: QuestCtx) {
  const cal = c.sim.state.time.cal
  for (const id of Object.values(c.st.cast)) {
    const a = id < 0 ? undefined : c.sim.actor(id)
    if (a?.questHold?.q === c.def.id && (a.questHold.until ?? 0) <= cal) a.questHold = undefined
  }
}

/** Ends every quest-owned primitive: holds, followers and spawned visitors. */
export function cleanup(c: QuestCtx) {
  for (const [slot, id] of Object.entries(c.st.cast)) {
    if (id < 0) continue
    const a = actorOf(c, slot)
    if (!a) continue
    if (a.questHold?.q === c.def.id) {
      a.questHold = undefined
      resetAi(a)
    }
    if (a.kind === 'animal' && (a as Animal).questFollow !== undefined) {
      ;(a as Animal).questFollow = undefined
      resetAi(a)
    }
    if (c.def.cast[slot]?.kind === 'spawn') despawn(c, slot)
  }
}

// ---------------------------------------------------------------- effects

export function applyEffects(c: QuestCtx, effects: Effect[]) {
  for (const e of effects) applyEffect(c, e)
}

function applyEffect(c: QuestCtx, e: Effect) {
  const { sim, st, def } = c
  switch (e.k) {
    case 'accept':
      if (st.status === 'offered' || st.status === 'refused') {
        st.status = 'active'
        st.startedAt = sim.state.time.cal
        sim.message(`Quest started: ${def.title}`, 'quest')
      }
      break
    case 'choose':
      if (st.settled) break
      st.flags[e.flag] = e.value
      st.choice = e.value
      break
    case 'consume': {
      const inv = invOf(c, e.from)
      if (inv) consumeItem(inv, e.item, e.qty, `quest:${c.def.id}`)
      break
    }
    case 'despawn':
      despawn(c, e.slot)
      break
    case 'end':
      endQuest(c, e.ending)
      break
    case 'follow': {
      const a = actorOf(c, e.slot)
      const target = e.target === 'player' ? sim.player : actorOf(c, e.target)
      if (a?.kind === 'animal' && target) {
        ;(a as Animal).questFollow = target.id
        resetAi(a)
      }
      break
    }
    case 'give':
      transferItems(c, e.from, e.to, e.item, e.qty)
      break
    case 'grant': {
      const inv = e.to === 'player' ? sim.player.inv : invOf(c, e.to)
      if (!inv) break
      addItem(inv, newStack(e.item, e.qty))
      logProduce(e.item, e.qty, `quest:${def.id}:${e.why}`)
      break
    }
    case 'heal':
      for (const slot of e.slots) {
        const h = humanOf(c, slot)
        if (h?.vitals.illness && h.vitals.illness.kind !== 'rabies') h.vitals.illness = undefined
      }
      break
    case 'hold':
      setHold(c, e.slot, e)
      break
    case 'if':
      applyEffects(c, allOf(c, e.when) ? e.then : (e.else ?? []))
      break
    case 'ill':
      for (const slot of e.slots) {
        const h = humanOf(c, slot)
        if (h && !h.vitals.dead) h.vitals.illness = { kind: 'stomach', severity: e.severity, hoursLeft: e.hours }
      }
      break
    case 'lapse':
      lapseQuest(c)
      break
    case 'message':
      sim.message(fillQuestText(e.text, questPlaceholders(c)), e.kind ?? 'quest')
      break
    case 'need':
      for (const s of e.slots) {
        const h = humanOf(c, s)
        if (h && !h.vitals.dead) h.vitals.social = Math.min(100, h.vitals.social + e.social)
      }
      break
    case 'opinion': {
      const h = humanOf(c, e.slot)
      if (h) h.opinion = Math.max(-100, Math.min(100, h.opinion + e.delta))
      break
    }
    case 'owner': {
      const pos = resolveAnchor(c, e.anchor)
      const b = sim.building(pos?.id)
      const h = humanOf(c, e.to)
      if (b && h && h.householdId >= 0) {
        b.owner = `household:${h.householdId}`
        b.householdId = h.householdId
        sim.rebuildBuildingIndex()
      }
      break
    }
    case 'pay':
      transferMoney(c, e.from, e.to, e.amount)
      break
    case 'priceMod': {
      const id = placeId(sim, e.place)
      if (id >= 0) addPriceMod(sim, { place: id, item: e.item, mult: e.mult, days: e.days, why: `${def.id}:${e.why}` })
      break
    }
    case 'refuse':
      if (st.status === 'offered') st.status = 'refused'
      break
    case 'release':
      clearHold(c, e.slot)
      break
    case 'rep':
      for (const pl of e.places ?? ['H']) {
        const id = placeId(sim, pl)
        if (id >= 0) addRep(sim, id, e.delta, pl === (e.places ?? ['H'])[0] ? e.reason : undefined)
      }
      break
    case 'set':
      st.flags[e.flag] = flagVal(c, e.value)
      break
    case 'spawn':
      spawnVisitor(c, e.slot)
      break
    case 'stage':
      if (e.to > st.stage) {
        st.stage = e.to
        st.stageAt = sim.state.time.cal
      }
      break
    case 'timedWarn': {
      const others = AUTHORED_QUESTS.filter((d) => d.id !== def.id && d.deadlineHours !== undefined && sim.state.authoredQuests[d.id]?.status === 'active')
      if (others.length) sim.message(`You already have a deadline running: ${others.map((d) => d.title).join(', ')}.`, 'bad')
      break
    }
    case 'torch': {
      const pos = resolveAnchor(c, e.anchor)
      const b = sim.building(pos?.id)
      if (b) b.lit = e.lit
      break
    }
    case 'unfollow': {
      const a = actorOf(c, e.slot)
      if (a?.kind === 'animal') {
        ;(a as Animal).questFollow = undefined
        resetAi(a)
      }
      break
    }
  }
}

/** Exclusive ending: applies its effects once, settles the quest and releases every quest-owned primitive. */
export function endQuest(c: QuestCtx, endingId: string) {
  const { st, def, sim } = c
  const ending = def.endings.find((x) => x.id === endingId)
  if (!ending || st.settled || st.status === 'done' || st.status === 'lapsed') return
  st.settled = true
  st.ending = endingId
  applyEffects(c, ending.effects)
  st.status = 'done'
  st.endedAt = sim.state.time.cal
  st.stage = Math.max(st.stage, def.stages.length - 1)
  // A quest nobody accepted ends silently (review 014 #10).
  if (st.startedAt !== undefined) sim.message(`Quest completed: ${def.title}`, 'quest')
  cleanup(c)
}

export function lapseQuest(c: QuestCtx) {
  const { st, def, sim } = c
  if (st.status === 'done' || st.status === 'lapsed') return
  st.settled = true
  st.status = 'lapsed'
  st.endedAt = sim.state.time.cal
  if (def.lapse) applyEffects(c, def.lapse.effects)
  if (st.startedAt !== undefined) sim.message(`Quest lapsed: ${def.title}`, 'quest')
  cleanup(c)
}
