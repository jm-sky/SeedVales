import type { ActionResult } from '../actions'
import type { Sim } from '../sim'
import type { CompanionRisk, CompanionTask, Human, ItemStack } from '../types'
import { COMPANION, RUN_SPEED_MPS, WALK_SPEED_MPS } from '../../config/calibration'
import { itemDef } from '../../data/items'
import { caveOf } from '../caveSpace'
import { isDown } from '../combat'
import { logMoney } from '../eventLog'
import { addItem, findFood, removeStack, wearBetterArmor, wieldBest } from '../inventory'
import { steerTo } from '../movement'
import { activeHold } from '../questHold'
import { dayIndex } from '../time'
import { penalty } from '../vitals'
/**
 * Companions (COMP-01/02/03): hiring for days at a wage with a task and risk level, free joining
 * (chance from reputation, opinion, personality and situation), following the player, contract expiry,
 * slowly growing opinion from travelling and fighting together, using gear received from the player.
 * Money moves 1:1 player → NPC (no mint, D-ECON-1).
 * @domain npc
 * @subdomain companions
 */
import { companionBanter } from './companionBanter'
import { houseOf } from './queries'

const DAY_S = 86400
const HOUR_S = 3600

export const TASK_NAMES: Record<CompanionTask, string> = { escort: 'Escort', guard: 'Protection' }
export const RISK_NAMES: Record<CompanionRisk, string> = { low: 'Low risk', medium: 'Some risk', high: 'Dangerous' }

/** Derived list of living companions, cached per sim (PERF-01): rebuilt on hire/join/dismiss and by `companionSystem`. */
const companionCache = new WeakMap<Sim, Human[]>()

export function companionsOf(sim: Sim): Human[] {
  let list = companionCache.get(sim)
  if (!list || list.some((n) => n.vitals.dead || !n.companion)) {
    list = sim.state.npcs.filter((n) => n.companion && !n.vitals.dead)
    companionCache.set(sim, list)
  }
  return list
}

const invalidateCompanions = (sim: Sim) => companionCache.delete(sim)

/** Daily wage in copper for a task and risk level. */
export function dailyWage(npc: Human, task: CompanionTask, risk: CompanionRisk): number {
  const skill = Math.max(npc.skills.melee, npc.skills.ranged)
  return Math.round((COMPANION.wageBase + skill * COMPANION.wagePerSkill) * COMPANION.riskMul[risk] * COMPANION.taskMul[task])
}

export const hirePrice = (npc: Human, task: CompanionTask, risk: CompanionRisk, days: number) => dailyWage(npc, task, risk) * days

/** Why the NPC will not go with the player (common to hiring and joining), or null. */
function unavailable(sim: Sim, npc: Human): string | null {
  if (npc.vitals.dead || isDown(sim, npc)) return `${npc.name} is in no state to travel.`
  if (npc.companion) return `${npc.name} is already travelling with you.`
  if (npc.questOwner || activeHold(npc, sim.state.time.cal)) return `${npc.name} has business of their own.`
  if (npc.age === 'child') return 'A child cannot go with you.'
  if (npc.age === 'elder') return `${npc.name} is too old for the road.`
  if (npc.trip) return `${npc.name} is away with the caravan.`
  if (companionsOf(sim).length >= COMPANION.maxCompanions) return 'You cannot lead more companions.'
  return null
}

/** Reason the NPC refuses a contract, or null when it agrees. */
export function hireRefusal(sim: Sim, npc: Human, task: CompanionTask, risk: CompanionRisk): string | null {
  const u = unavailable(sim, npc)
  if (u) return u
  if (npc.opinion < -20) return `${npc.name} won't work for you.`
  if (npc.profession === 'guard' && npc.opinion < 40) return `${npc.name} can't leave the watch.`
  // Nervous people need trust before a dangerous job; agreeable ones less.
  const fear = (risk === 'high' ? 0.45 : risk === 'medium' ? 0.15 : -1) + (task === 'guard' ? 0.1 : 0) + npc.big5.n * 0.5 - npc.opinion / 100
  if (fear > 0.55) return `${npc.name}: "Too dangerous for me."`
  return null
}

/** Authored-quest contract (Q06): no money changes hands here — the quest owns the pay. Returns a refusal text or null. */
export function questCompanion(sim: Sim, npc: Human, mode: 'hire' | 'free', task: CompanionTask, days: number): string | null {
  const no = unavailable(sim, npc)
  if (no) return no
  const cal = sim.state.time.cal
  npc.companion = { kind: mode === 'hire' ? 'hired' : 'free', task, risk: 'low', since: cal, ...(mode === 'hire' ? { until: cal + days * DAY_S } : {}), paid: 0, bondAt: cal }
  packProvisions(sim, npc, mode === 'hire' ? days : COMPANION.freeProvisionDays)
  startFollowing(sim, npc)
  sim.message(`${npc.name} joins you${mode === 'hire' ? ` for ${days} ${days === 1 ? 'day' : 'days'}` : ''}.`, 'good')
  return null
}

/** True when the NPC could join the player now (the quest checks it before offering the option). */
export const canTravelWithPlayer = (sim: Sim, npc: Human) => !unavailable(sim, npc)

export function hireCompanion(sim: Sim, npc: Human, task: CompanionTask, risk: CompanionRisk, days: number): ActionResult {
  const no = hireRefusal(sim, npc, task, risk)
  if (no) return { ok: false, msg: no }
  const price = hirePrice(npc, task, risk, days)
  const p = sim.player
  if (p.money < price) return { ok: false, msg: 'Not enough coins.' }
  p.money -= price
  npc.money += price
  logMoney('player', `npc:${npc.id}`, price, 'hire_companion', npc.id, npc.settlementId)
  const cal = sim.state.time.cal
  npc.companion = { kind: 'hired', task, risk, since: cal, until: cal + days * DAY_S, paid: price, bondAt: cal }
  packProvisions(sim, npc, days)
  startFollowing(sim, npc)
  sim.message(`${npc.name} joins you for ${days} ${days === 1 ? 'day' : 'days'} (${price} c).`, 'good')
  return { ok: true, msg: `${npc.name} will go with you.` }
}

/** Chance (0..0.95) that the NPC joins for free (COMP-02). */
export function joinChance(sim: Sim, npc: Human): number {
  if (unavailable(sim, npc)) return 0
  const rep = sim.state.settlements[npc.settlementId]?.rep
  const b = npc.big5
  let c = -0.25 + (npc.opinion / 100) * 0.6
  if (rep) c += ((rep.honesty + rep.renown + rep.courage) / 300) * 0.3
  c += (b.o - 0.5) * 0.3 + (b.e - 0.5) * 0.15 - (b.n - 0.5) * 0.2 - (b.c - 0.5) * 0.15
  // Situation: young men without a family of their own are the most willing; a household head with
  // a family or a guard on duty the least; injury or illness keeps people at home.
  if (npc.kin === 'son') c += 0.3
  else if (npc.male && npc.kin !== 'head') c += 0.05
  if (npc.kin === 'head' || npc.kin === 'spouse') c -= 0.15
  if (npc.profession === 'guard') c -= 0.3
  if (npc.vitals.illness || npc.vitals.bleeding > 0) c -= 0.3
  return Math.min(0.95, Math.max(0, c))
}

/** Asks the NPC to come along for free: one answer per NPC per calendar day. */
export function askToJoin(sim: Sim, npc: Human): ActionResult {
  const u = unavailable(sim, npc)
  if (u) return { ok: false, msg: u }
  const today = dayIndex(sim.state.time.cal)
  if (npc.joinAskDay === today) return { ok: false, msg: `${npc.name}: "I told you already — not today."` }
  npc.joinAskDay = today
  if (!sim.rng.chance(joinChance(sim, npc))) return { ok: false, msg: `${npc.name}: "No, I have my own business here."` }
  const cal = sim.state.time.cal
  npc.companion = { kind: 'free', task: 'escort', risk: 'medium', since: cal, paid: 0, bondAt: cal }
  packProvisions(sim, npc, COMPANION.freeProvisionDays)
  startFollowing(sim, npc)
  sim.message(`${npc.name} decides to travel with you.`, 'good')
  return { ok: true, msg: `${npc.name}: "Why not — I'll come along!"` }
}

export function dismissCompanion(sim: Sim, npc: Human, reason = 'You part ways with'): string {
  if (!npc.companion) return ''
  npc.companion = undefined
  invalidateCompanions(sim)
  npc.ai.goal = null
  npc.ai.steps = []
  npc.ai.replanAt = 0
  const msg = `${reason} ${npc.name}; they head home.`
  sim.message(msg)
  return msg
}

function startFollowing(sim: Sim, npc: Human) {
  invalidateCompanions(sim)
  npc.ai.goal = null
  npc.ai.steps = []
  npc.ai.replanAt = 0
  npc.ai.decideAt = 0
}

/**
 * Provisions for the road (D-NPC-6): food for `COMPANION.foodPerDay` meals a day (capped) moves from the
 * household store into the companion's pack, so away from home it eats from the pack instead of walking back.
 */
function packProvisions(sim: Sim, npc: Human, days: number) {
  const store = houseOf(sim, npc)?.inv
  if (!store) return
  let want = Math.min(COMPANION.maxProvisions, Math.ceil(days * COMPANION.foodPerDay)) - npc.inv.items.filter((s) => isMeal(s)).reduce((a, s) => a + s.qty, 0)
  while (want > 0) {
    const s = findFood(store)
    if (!s) break
    const moved = removeStack(store, s, Math.min(want, s.qty))!
    addItem(npc.inv, moved)
    want -= moved.qty
  }
}

const isMeal = (s: ItemStack) => {
  const d = itemDef(s.id)
  return !!d.food && d.category !== 'herb' && !d.food.raw
}

/** Gear handed over by the player is put on / wielded when better (COMP-03, shared weapon score). */
export function equipReceived(npc: Human) {
  for (const s of [...npc.inv.items]) if (itemDef(s.id).armor) wearBetterArmor(npc, s)
  const cur = npc.eq.main ? itemDef(npc.eq.main.id).weapon?.kind : undefined
  wieldBest(npc, cur === 'ranged' ? 'ranged' : 'melee')
}

/** Contracts, bonding: expiry and slow opinion growth from travelling together. */
export function companionSystem(sim: Sim) {
  invalidateCompanions(sim)
  const cal = sim.state.time.cal
  const p = sim.player
  for (const n of sim.state.npcs) {
    const c = n.companion
    if (!c) continue
    if (n.vitals.dead) {
      n.companion = undefined
      invalidateCompanions(sim)
      continue
    }
    if (c.until !== undefined && cal >= c.until) {
      dismissCompanion(sim, n, 'The contract ends:')
      continue
    }
    // Starving with an empty pack: the companion ends the journey and goes home to eat (review 006 #1).
    if (n.vitals.hunger < COMPANION.starveLeave && !n.inv.items.some(isMeal)) {
      dismissCompanion(sim, n, 'Starving, you are left by')
      continue
    }
    if (c.kind === 'free' && n.opinion < 0) {
      dismissCompanion(sim, n, 'Fed up, you are left by')
      continue
    }
    if (cal - c.bondAt >= HOUR_S) {
      const hours = Math.floor((cal - c.bondAt) / HOUR_S)
      c.bondAt += hours * HOUR_S
      if (Math.hypot(n.x - p.x, n.z - p.z) <= COMPANION.bondM && n.opinion < COMPANION.bondCap) {
        n.opinion = Math.min(COMPANION.bondCap, n.opinion + hours * COMPANION.bondPerH)
      }
    }
  }
}

/** Banter runs after the contract checks, on the surviving companions. */
export function companionTalk(sim: Sim) {
  companionBanter(sim, companionsOf(sim))
}

/** A fight won together (player or companion killed a dangerous animal nearby) strengthens the bond. */
export function companionsOnKill(sim: Sim, x: number, z: number) {
  for (const n of companionsOf(sim)) {
    if (Math.hypot(n.x - x, n.z - z) <= COMPANION.bondM && n.opinion < 100) n.opinion = Math.min(100, n.opinion + COMPANION.killBond)
  }
}

/** Formation point behind the player for the i-th companion. */
export function followPoint(sim: Sim, npc: Human): { x: number; z: number } {
  const p = sim.player
  // Underground the formation point could lie in rock: stand next to the player instead.
  if ((sim.state.px.cave ?? 0) > 0) return { x: p.x, z: p.z }
  const list = companionsOf(sim)
  const i = Math.max(0, list.indexOf(npc))
  const a = p.rot + Math.PI + (i - (list.length - 1) / 2) * 0.7
  return { x: p.x + Math.sin(a) * 2.5, z: p.z + Math.cos(a) * 2.5 }
}

/** Distance to the player; on a different layer (one underground, the other not) it counts as far however near in x/z. */
export const companionDist = (sim: Sim, npc: Human) => Math.hypot(npc.x - sim.player.x, npc.z - sim.player.z) + (caveOf(sim, npc) !== (sim.state.px.cave ?? 0) ? 40 : 0)

/** Executes the follow goal (direct steering, like fighting): walk, or run to catch up. */
export function follow(sim: Sim, h: Human, dt: number, full: boolean) {
  const t = followPoint(sim, h)
  const d = companionDist(sim, h)
  const run = d > COMPANION.catchUpM || sim.player.moving === 'run'
  const speed = (run ? RUN_SPEED_MPS : WALK_SPEED_MPS * 1.1) * penalty(h.vitals)
  const r = steerTo(sim, h, t.x, t.z, speed, dt, (sim.state.px.cave ?? 0) > 0 ? 1.8 : 0.8, full, 0.35, sim.state.px.cave ?? 0)
  if (r === 'stuck') {
    // Unreachable (deep water, cliff): wait a while instead of pressing into the obstacle every tick.
    const now = sim.state.time.play
    h.ai.cooldowns.follow = now + COMPANION.stuckWaitS
    if ((h.ai.cooldowns.followMsg ?? 0) <= now) {
      h.ai.cooldowns.followMsg = now + COMPANION.stuckMsgS
      sim.message(`${h.name} can't follow you here.`, 'bad')
    }
    h.moving = 'idle'
    h.ai.goal = null
    h.ai.steps = []
    h.ai.replanAt = 0
    return
  }
  if (r === 'arrived' || d < COMPANION.followM * 0.6) {
    h.moving = 'idle'
    h.ai.goal = null
    h.ai.steps = []
    h.ai.replanAt = sim.state.time.play + 1
  }
}
