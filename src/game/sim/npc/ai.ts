/**
 * NPC AI executor: picks the best goal (utility with hysteresis), runs multi-step plans,
 * applies failure cooldowns so missing resources/unreachable targets never loop forever.
 * @domain npc
 * @subdomain ai
 */
import type { Sim } from '../sim'
import type { Human } from '../types'
import { COMBAT, DECISION, RUN_SPEED_MPS, WALK_SPEED_MPS } from '../../config/calibration'
import { SPECIES } from '../../data/species'
import { perf } from '../../diag/perf'
import { alertAround } from '../alerts'
import { isDown, killNpc, meleeAttack, weaponOf } from '../combat'
import { decisionInterval } from '../fauna/perception'
import { wieldBest } from '../inventory'
import { steerTo } from '../movement'
import { type Exertion, hp, penalty, updateVitals } from '../vitals'
import { goalOptions } from './goals'
import { threatNear } from './queries'
import { WORK_ACTS } from './works'

const REPLAN_S = 12
const FAIL_COOLDOWN_S = 60

export function planNpc(sim: Sim, h: Human, force = false) {
  const now = sim.state.time.play
  const ai = h.ai
  const opts = goalOptions(sim, h)
  // Personality noise: open NPCs vary more.
  for (const o of opts) {
    if ((ai.cooldowns[o.id] ?? 0) > now) o.score = -1
    else o.score += (sim.rng.next() - 0.5) * 0.06 * (0.5 + h.big5.o)
  }
  opts.sort((a, b) => b.score - a.score)
  const inPlan = !!ai.goal && ai.stepIdx < ai.steps.length
  const currentScore = opts.find((o) => o.id === ai.goal)?.score ?? (inPlan ? (ai.goalScore ?? 0) : -1)
  for (const o of opts) {
    if (o.score < 0) break
    // Hysteresis: keep current plan unless new goal is clearly better.
    if (!force && ai.goal && ai.steps.length && ai.stepIdx < ai.steps.length && o.id !== ai.goal && o.score < currentScore + 0.15) return
    if (!force && o.id === ai.goal && ai.steps.length && ai.stepIdx < ai.steps.length) return
    const plan = o.plan()
    perf.count('ai.plans')
    if (!plan) {
      ai.cooldowns[o.id] = now + FAIL_COOLDOWN_S * 0.5
      continue
    }
    ai.goal = o.id
    ai.goalScore = o.score
    ai.label = plan.label
    ai.steps = plan.steps
    ai.stepIdx = 0
    ai.stepT = 0
    ai.replanAt = now + REPLAN_S
    return
  }
}

function failGoal(sim: Sim, h: Human, mult = 1) {
  const ai = h.ai
  const st = ai.steps[ai.stepIdx]
  ai.lastFail = `${ai.goal}#${ai.stepIdx}:${st?.op === 'work' ? st.act : st?.op === 'goto' ? `goto(${st.x.toFixed(0)},${st.z.toFixed(0)})` : '-'}`
  if (ai.goal) ai.cooldowns[ai.goal] = sim.state.time.play + FAIL_COOLDOWN_S * mult
  perf.count('ai.failures')
  ai.goal = null
  ai.steps = []
  ai.stepIdx = 0
  ai.replanAt = 0
}

function fight(sim: Sim, h: Human, dt: number, full: boolean) {
  const t = threatNear(sim, h, 60)
  if (!t) {
    h.ai.goal = null
    h.ai.steps = []
    h.combat = false
    return
  }
  h.combat = true
  const d = Math.hypot(t.x - h.x, t.z - h.z)
  // Close quarters: draw the best melee weapon (e.g. hunter's knife) instead of swinging a bow.
  if (d <= 6) wieldBest(h, 'melee')
  const w = weaponOf(h)
  if (w.kind === 'ranged' && d > 6) {
    h.rot = Math.atan2(t.x - h.x, t.z - h.z)
    if (sim.state.time.play >= h.attackReadyAt) {
      h.attackReadyAt = sim.state.time.play + 1.5
      WORK_ACTS.shoot!(sim, h, String(t.id), 1)
    }
    if (d > 35 && steerTo(sim, h, t.x, t.z, RUN_SPEED_MPS, dt, 30, full) === 'stuck') failGoal(sim, h, 0.25)
    return
  }
  const reach = w.reach + SPECIES[t.species].length * 0.4 + 0.5
  const r = steerTo(sim, h, t.x, t.z, RUN_SPEED_MPS * penalty(h.vitals), dt, reach, full)
  if (r === 'arrived') {
    h.rot = Math.atan2(t.x - h.x, t.z - h.z)
    meleeAttack(sim, h, 90, t.id)
  } else if (r === 'stuck') failGoal(sim, h, 0.25) // unreachable enemy: give up for a while, no endless circling
}

export function updateNpc(sim: Sim, h: Human, dt: number, full: boolean) {
  if (h.vitals.dead) return
  const now = sim.state.time.play
  const ai = h.ai
  // Downed: lie until someone helps or timer passes with HP recovered.
  if (h.vitals.ko) {
    updateVitals(h.vitals, dt, 'rest', 0.3)
    if (hp(h.vitals) <= COMBAT.npcDeathHp) {
      killNpc(sim, h)
      return
    }
    // Stays down (and ignored by enemies) until HP recovers above 0 — protection must not lapse while downed.
    if (now > h.vitals.ko.until) {
      if (hp(h.vitals) > 0) h.vitals.ko = undefined
      else h.vitals.ko.until = h.vitals.ko.protectUntil = now + 30
    }
    h.moving = 'idle'
    return
  }
  const step = ai.steps[ai.stepIdx]
  let ex: Exertion = 'idle'
  if (step?.op === 'goto') ex = step.run ? 'run' : 'walk'
  else if (step?.op === 'work') ex = step.act === 'sleep' || step.act === 'camp' ? 'sleep' : step.act === 'rest' || step.act === 'socialize' || step.act === 'shelter' ? 'rest' : 'work'
  const pen = updateVitals(h.vitals, dt, ex, step?.op === 'work' && step.act === 'sleep' ? 0.8 : step?.op === 'work' && step.act === 'camp' ? 0.45 : 0.5)
  // Bleeding/illness/starvation can also bring an NPC down (same rules as hits).
  const cur0 = hp(h.vitals)
  if (cur0 <= COMBAT.npcDeathHp) return killNpc(sim, h)
  if (cur0 <= 0) {
    h.vitals.ko = { until: now + 60, protectUntil: now + 60 }
    h.callForHelpAt = now
    alertAround(sim, h.x, h.z, DECISION.alertHelpM)
    return
  }

  // Interrupt sleep/work for threats (checked at update frequency).
  // Threat perception at the decision cadence (AI-01); hits/shots/calls for help force it (alerts).
  if (now >= (ai.decideAt ?? 0)) {
    ai.decideAt = now + decisionInterval(h)
    perf.count('ai.decisions')
    if (ai.goal !== 'fight' && ai.goal !== 'flee' && threatNear(sim, h, h.profession === 'guard' ? 45 : 22)) ai.replanAt = 0
  }
  if (!ai.goal || now >= ai.replanAt || ai.stepIdx >= ai.steps.length) {
    planNpc(sim, h, ai.stepIdx >= ai.steps.length || !ai.goal)
    ai.replanAt = now + REPLAN_S
  }
  if (ai.goal === 'fight') {
    fight(sim, h, dt, full)
    return
  }
  h.combat = false
  const cur = ai.steps[ai.stepIdx]
  if (!cur) {
    h.moving = 'idle'
    return
  }
  if (cur.op === 'goto') {
    const speed = (cur.run ? RUN_SPEED_MPS : WALK_SPEED_MPS * (h.age === 'elder' ? 0.8 : 1)) * pen
    if (ai.stepT === 0) ai.stepLimit = 40 + (Math.hypot(cur.x - h.x, cur.z - h.z) / Math.max(0.5, speed)) * 2.5
    ai.stepT += dt
    const r = steerTo(sim, h, cur.x, cur.z, speed, dt, cur.range ?? 1.5, full)
    if (r === 'arrived') {
      ai.stepIdx++
      ai.stepT = 0
    } else if (r === 'stuck' || ai.stepT > (ai.stepLimit ?? 1e9)) failGoal(sim, h)
    else if (!full && Math.hypot(cur.x - h.x, cur.z - h.z) > 5000) failGoal(sim, h)
    return
  }
  // Work step.
  h.moving = 'idle'
  ai.stepT += dt
  if (cur.anim) h.action = { kind: cur.anim, at: now - ai.stepT }
  // Sleep ends early when rested in the morning.
  if ((cur.act === 'sleep' || cur.act === 'camp') && h.vitals.vigor >= 99 && ai.stepT > 60) ai.stepT = cur.dur
  if (ai.stepT >= cur.dur) {
    const fn = WORK_ACTS[cur.act]
    const ok = fn ? fn(sim, h, cur.ref, h.age === 'adult' ? 1 : 0.3) : false
    perf.count('ai.acts')
    if (ok) perf.count(`ai.act.${cur.act}`)
    h.action = undefined
    if (!ok) {
      failGoal(sim, h, cur.act === 'shoot' ? 0.2 : 1)
      return
    }
    ai.stepIdx++
    ai.stepT = 0
  }
}

export function npcSystem(sim: Sim, _dt: number) {
  const now = sim.state.time.play
  const p = sim.player
  let near = 0
  let far = 0
  for (const h of sim.state.npcs) {
    if (now < h.nextUpdate) continue
    const d = Math.hypot(h.x - p.x, h.z - p.z)
    const interval = sim.lodInterval(d)
    const dt = Math.min(now - h.lastUpdate, 30)
    h.lastUpdate = now
    h.nextUpdate = now + interval * (0.9 + ((h.id * 7919) % 100) / 500)
    const full = interval <= 0.11
    if (full) near++
    else far++
    updateNpc(sim, h, dt, full)
    if (isDown(sim, h)) h.moving = 'idle'
  }
  perf.gauge('npc.near', near)
  perf.gauge('npc.farUpdates', far)
}
