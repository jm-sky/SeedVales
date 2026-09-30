/**
 * Shared vitals for humans and animals: body-part HP, stamina, vigor, hunger, thirst, social, illness.
 * Long-term needs use calendar hours; stamina uses gameplay seconds.
 * @domain character
 * @subdomain vitals
 */
import type { BodyPart, IllnessKind, Vitals } from './types'
import { CALENDAR_SPEED, COMBAT, NEEDS, STAMINA } from '../config/calibration'
import { BODY_PARTS } from './types'

export type Exertion = 'idle' | 'walk' | 'run' | 'work' | 'sleep' | 'swim' | 'rest'

/** Part weights in HP loss. Head/gut hurt more. */
const PART_W: Record<BodyPart, number> = { head: 1.6, torso: 1, gut: 1.25, larm: 0.6, rarm: 0.6, lleg: 0.7, rleg: 0.7 }

export function newVitals(maxHp: number): Vitals {
  const parts = Object.fromEntries(BODY_PARTS.map((p) => [p, 0])) as Record<BodyPart, number>
  return { parts, maxHp, stamina: STAMINA.max, vigor: 90, hunger: 85, thirst: 85, social: 70, exhaustionH: 0, bleeding: 0, convalescenceH: 0 }
}

export function hp(v: Vitals): number {
  let dmg = 0
  for (const p of BODY_PARTS) dmg += v.parts[p] * PART_W[p]
  return v.maxHp - dmg
}

export function hpFrac(v: Vitals) {
  return Math.max(0, hp(v)) / v.maxHp
}

/** Heals damage spread over parts (most-damaged first). */
export function heal(v: Vitals, amount: number) {
  let left = amount
  for (let guard = 0; guard < 20 && left > 0.01; guard++) {
    let worst: BodyPart | null = null
    for (const p of BODY_PARTS) if (v.parts[p] > 0 && (!worst || v.parts[p] > v.parts[worst])) worst = p
    if (!worst) break
    const h = Math.min(v.parts[worst], left)
    v.parts[worst] -= h
    left -= h
  }
}

export function applyPartDamage(v: Vitals, part: BodyPart, dmg: number, bleeds: boolean) {
  v.parts[part] += dmg
  if (bleeds) v.bleeding = Math.min(5, v.bleeding + dmg * 0.04)
}

/**
 * Advance needs. dtPlay = gameplay seconds. comfort 0..1 for sleep/rest recovery.
 * Returns penalty multiplier 0.4..1 for speed/skills.
 */
export function updateVitals(v: Vitals, dtPlay: number, ex: Exertion, comfort = 0.6): number {
  const h = (dtPlay * CALENDAR_SPEED) / 3600
  // Stamina (gameplay seconds).
  if (ex === 'run') v.stamina -= STAMINA.sprintPerS * dtPlay
  else if (ex === 'swim') v.stamina -= STAMINA.swimPerS * dtPlay
  else v.stamina += STAMINA.regenPerS * dtPlay * (v.vigor > 0 ? 1 : 0.4)
  v.stamina = Math.min(STAMINA.max, Math.max(0, v.stamina))

  v.thirst -= NEEDS.thirstDrainPerH * h * (ex === 'sleep' ? 0.5 : ex === 'run' || ex === 'work' ? 1.3 : 1)
  v.hunger -= NEEDS.hungerDrainPerH * h * (ex === 'sleep' ? 0.5 : ex === 'run' || ex === 'work' ? 1.2 : 1)
  v.social -= NEEDS.socialDrainPerH * h
  if (ex === 'sleep') {
    v.vigor += NEEDS.vigorSleepPerH * h * (0.35 + comfort * 0.65)
    v.exhaustionH = Math.max(0, v.exhaustionH - h * 3)
  } else if (ex === 'rest') {
    v.vigor += NEEDS.vigorRestPerH * h * (0.5 + comfort * 0.5)
  } else {
    const drain = ex === 'walk' || ex === 'swim' ? NEEDS.vigorDrainWalkPerH : ex === 'run' || ex === 'work' ? NEEDS.vigorDrainWorkPerH : NEEDS.vigorDrainIdlePerH
    v.vigor -= drain * h
    if (v.vigor <= 0) v.exhaustionH += h
  }
  v.vigor = Math.min(100, Math.max(0, v.vigor))
  v.thirst = Math.max(0, Math.min(100, v.thirst))
  v.hunger = Math.max(0, Math.min(100, v.hunger))
  v.social = Math.max(0, Math.min(100, v.social))

  // Starvation/dehydration damage only when fully empty.
  if (v.thirst <= 0) v.parts.gut += 2.5 * h
  if (v.hunger <= 0) v.parts.gut += 1 * h
  // Bleeding (gameplay seconds).
  if (v.bleeding > 0) {
    v.parts.torso += v.bleeding * dtPlay * 0.05
    v.bleeding = Math.max(0, v.bleeding - dtPlay * 0.01)
  }
  // Illness progression.
  if (v.illness) {
    const ill = v.illness
    ill.hoursLeft -= h
    if (ill.kind === 'poison' || ill.severity > 50) v.parts.gut += ill.severity * 0.02 * h
    v.thirst -= ill.kind === 'stomach' ? ill.severity * 0.05 * h : 0
    if (ill.hoursLeft <= 0) v.illness = undefined
  }
  // Natural regen when fed/watered and not bleeding (calendar hours).
  if (v.hunger > 20 && v.thirst > 20 && v.bleeding <= 0 && !v.illness) {
    const rate = COMBAT.hpRegenPerH * (ex === 'sleep' ? 2.5 : 1) * (v.convalescenceH > 0 ? 0.5 : 1)
    heal(v, rate * h)
  }
  if (v.convalescenceH > 0) v.convalescenceH = Math.max(0, v.convalescenceH - h)
  return penalty(v)
}

/** Speed/skill multiplier from needs. */
export function penalty(v: Vitals): number {
  let m = 1
  if (v.vigor <= 0) m *= 0.75 - Math.min(0.3, v.exhaustionH / 80)
  else if (v.vigor < NEEDS.penaltyBelow) m *= 0.9
  if (v.hunger < NEEDS.penaltyBelow) m *= 0.9
  if (v.thirst < NEEDS.penaltyBelow) m *= 0.85
  if (v.convalescenceH > 0) m *= 0.85
  if (v.illness) m *= 1 - Math.min(0.3, v.illness.severity / 250)
  const legs = (v.parts.lleg + v.parts.rleg) / (v.maxHp * 0.7)
  m *= 1 - Math.min(0.4, legs)
  return Math.max(0.4, m)
}

export function drink(v: Vitals, amount: number) {
  v.thirst = Math.min(100, v.thirst + amount)
}

export function eat(v: Vitals, nutrition: number, water = 0) {
  v.hunger = Math.min(100, v.hunger + nutrition)
  v.thirst = Math.min(100, v.thirst + water)
}

export function makeIll(v: Vitals, kind: IllnessKind, severity: number) {
  if (v.illness && v.illness.severity >= severity) return
  const hours = kind === 'poison' ? 6 + severity / 5 : kind === 'rabies' ? 96 : 12 + severity / 3
  v.illness = { kind, severity, hoursLeft: hours }
}
