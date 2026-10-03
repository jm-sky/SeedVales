/**
 * Block and parry (combat--002, D-COMBAT-2): player guard state (transient, per Sim, never saved) and the defence
 * resolver `meleeAttack` calls after a successful hit roll and before `applyDamage`.
 * @domain sim
 */
import type { DefenceStats } from '../data/items'
import type { Sim } from './sim'
import type { Actor, Animal, Human } from './types'
import { DEFENCE } from '../config/calibration'
import { angleDiff } from '../core/math'
import { itemDef } from '../data/items'
import { perf } from '../diag/perf'
import { isDown } from './combat'
import { wearTool } from './inventory'

export interface GuardState {
  held: boolean
  /** Gameplay time the current guard press began (parry window origin). */
  startedAt: number
  brokenUntil: number
}

const states = new WeakMap<Sim, GuardState>()

export function guardOf(sim: Sim): GuardState {
  let g = states.get(sim)
  if (!g) states.set(sim, (g = { held: false, startedAt: -1e9, brokenUntil: 0 }))
  return g
}

/** Applies the held intent; only a released → pressed transition starts a parry window. */
export function setGuard(sim: Sim, want: boolean) {
  const g = guardOf(sim)
  if (want && !g.held) g.startedAt = sim.state.time.play
  g.held = want
}

export interface ResolvedDefence extends DefenceStats {
  /** The stack that wears when it takes a hit (shield or weapon); undefined for fists. */
  item?: { dur?: number }
  source: 'shield' | 'weapon' | 'unarmed'
}

/** The defender's active defence: a held shield, else the wielded melee weapon (1H/2H), else fists; none with a bow. */
export function defenceOf(h: Human): ResolvedDefence | null {
  const off = h.eq.off
  const shield = off ? itemDef(off.id).defence : undefined
  if (off && shield && (off.dur === undefined || off.dur > 0)) return { ...shield, item: off, source: 'shield' }
  const main = h.eq.main
  if (!main) return { ...DEFENCE.unarmed, source: 'unarmed' }
  const w = itemDef(main.id).weapon
  if (!w || w.kind !== 'melee') return null
  if (main.dur !== undefined && main.dur <= 0) return null
  return { ...(w.twoHanded ? DEFENCE.twoHanded : DEFENCE.oneHanded), item: main, source: 'weapon' }
}

export type DefenceOutcome = { kind: 'none'; damage: number } | { kind: 'block'; damage: number } | { kind: 'parry'; damage: 0 } | { kind: 'break'; damage: number }

const isHeavy = (a: Actor) => a.kind === 'animal' && DEFENCE.heavyAnimals.includes((a as Animal).species)

/** Resolves the player's guard against one connecting melee hit of `raw` damage (does not touch armour or body parts). */
export function resolveDefence(sim: Sim, defender: Actor, attacker: Actor, raw: number): DefenceOutcome {
  const none: DefenceOutcome = { kind: 'none', damage: raw }
  if (defender.kind !== 'player') return none
  const h = defender as Human
  const g = guardOf(sim)
  const now = sim.state.time.play
  if (!g.held || !h.combat || isDown(sim, h) || now < g.brokenUntil) return none
  const def = defenceOf(h)
  if (!def) return none
  const away = Math.abs(angleDiff(h.rot, Math.atan2(attacker.x - h.x, attacker.z - h.z)))
  if (away > (def.arcDeg * Math.PI) / 360) {
    perf.count('combat.blockRearBypass')
    return none
  }
  const heavy = isHeavy(attacker)
  const species = attacker.kind === 'animal' ? (attacker as Animal).species : ''
  const parryable = def.canParry && (!heavy || (def.source === 'shield' && DEFENCE.shieldParriesHeavy.includes(species)))
  const parry = parryable && now - g.startedAt <= def.parryWindowS
  const cost = raw * DEFENCE.staminaPerDamage * def.efficiency * (parry ? DEFENCE.parryCostMul : 1)
  perf.gauge('combat.lastDefenceCost', cost)
  if (h.vitals.stamina < cost) {
    h.vitals.stamina = 0
    g.brokenUntil = now + DEFENCE.guardBreakS
    perf.count('combat.guardBreaks')
    return { kind: 'break', damage: raw }
  }
  h.vitals.stamina -= cost
  if (def.item) wearTool(def.item as never, DEFENCE.wearPerBlock)
  if (parry) {
    attacker.attackReadyAt = Math.max(attacker.attackReadyAt, now) + DEFENCE.parryAttackerDelayS
    perf.count('combat.parries')
    return { kind: 'parry', damage: 0 }
  }
  perf.count('combat.blocks')
  perf.count('combat.blockedDamage', Math.round(raw * def.reduction))
  return { kind: 'block', damage: raw * (1 - def.reduction) }
}
