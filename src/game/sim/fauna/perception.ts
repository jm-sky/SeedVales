/**
 * Animal perception & decisions at a cadence (AI-01): fear of people, fire and pens (FAUNA-07) with
 * protective exceptions (young nearby, own den), prey fleeing predators, domestic animals running to
 * their shepherd or pen when threatened (FAUNA-06). Movement between decisions is continuous.
 * @domain fauna
 */
import type { Sim } from '../sim'
import type { Actor, Animal, Human } from '../types'
import { DECISION, FEAR } from '../../config/calibration'
import { SPECIES } from '../../data/species'
import { isDown, isProtected } from '../combat'
import { isNight } from '../time'
import { hp } from '../vitals'

type P = { x: number; z: number }

/** Gameplay seconds until the next decision of an actor (species + state). */
export function decisionInterval(a: Actor): number {
  const base = DECISION.baseS * (a.kind === 'animal' ? SPECIES[a.species].decisionS ?? 1 : 1)
  const tired = a.vitals.stamina < 25 || (a.kind !== 'animal' && a.vitals.vigor < 15)
  return base * (tired ? DECISION.tiredMul : 1)
}

/** Nearest fire within r: lit campfires/torch posts, lit torches on the ground, people holding a torch. */
export function fireNear(sim: Sim, x: number, z: number, r: number): P | null {
  for (const b of sim.buildingsNear(x, z, r)) if (b.lit && (b.kind === 'campfire' || b.kind === 'torchpost') && Math.hypot(b.x - x, b.z - z) <= r) return b
  for (const g of sim.groundNear(x, z, r)) if (g.lit) return g
  for (const o of sim.actors.query(x, z, r)) if (o.kind !== 'animal' && (o as Human).eq.off?.id === 'torch' && !o.vitals.dead) return o
  return null
}

/** Goals a fear-flee interrupts; they are suppressed for a while so the animal does not walk straight back. */
const FEAR_SUPPRESSED = ['hunt', 'scavenge', 'investigate']

function flee(sim: Sim, a: Animal, from: P, seconds: number) {
  const g = a.ai.goal
  if (g && FEAR_SUPPRESSED.includes(g)) a.ai.cooldowns[g] = Math.max(a.ai.cooldowns[g] ?? 0, sim.state.time.play + FEAR.suppressS)
  a.fleeFrom = { x: from.x, z: from.z, until: sim.state.time.play + seconds }
  a.ai.steps = []
  a.ai.goal = null
}

function attack(sim: Sim, a: Animal, target: Actor, seconds: number) {
  a.aggroId = target.id
  a.aggroUntil = sim.state.time.play + seconds
  a.ai.steps = []
  a.ai.goal = null
}

/** Detection distance of a human by this animal (sneak skill + night + fog reduce it). */
function detectRange(sim: Sim, a: Animal, targetIsPlayer: boolean): number {
  const sp = SPECIES[a.species]
  let r = sp.perception
  if (targetIsPlayer && sim.state.px.sneaking) r *= 1 - Math.min(0.75, 0.4 + sim.player.skills.sneak / 200)
  if (isNight(sim.state.time.cal)) r *= 0.7
  if (sim.weather.fog > 0.5) r *= 0.75
  return r
}

/**
 * Distance within which the animal attacks people instead of fleeing (0 = never): predators and aggressive
 * animals defend their own den and young; prey (deer, fox) only defends its young at close range.
 */
function guardRange(sim: Sim, a: Animal): number {
  const sp = SPECIES[a.species]
  if (a.variant === 'young' || sp.damage <= 0) return 0
  const fighter = sp.temperament === 'predator' || sp.temperament === 'aggressive'
  if (!protective(sim, a, fighter)) return 0
  return fighter ? sp.perception * 0.6 : FEAR.preyDefendM
}

function protective(sim: Sim, a: Animal, den: boolean): boolean {
  if (den && a.denId && !a.denId.startsWith('nest:')) {
    const d = sim.state.dens.find((x) => x.id === a.denId)
    if (d?.alive && Math.hypot(d.x - a.x, d.z - a.z) < FEAR.protectDenM) return true
  }
  return sim.actors.query(a.x, a.z, FEAR.protectYoungM).some((o) => o !== a && o.kind === 'animal' && o.species === a.species && o.variant === 'young' && !o.vitals.dead)
}

/** Runs one decision; returns true when the animal reacted (flee/attack started this update). */
export function decideAnimal(sim: Sim, a: Animal): boolean {
  const sp = SPECIES[a.species]
  if (sp.temperament === 'domestic') {
    decideDomestic(sim, a)
    return false
  }
  const desperate = sp.temperament === 'predator' && a.hungerH > FEAR.desperateHungerH
  // Fire scares every wild animal (rabid ones excepted).
  if (!a.rabid && a.species !== 'rat') {
    const fire = fireNear(sim, a.x, a.z, FEAR.fireM)
    if (fire) {
      flee(sim, a, fire, 8)
      return true
    }
  }
  const guard = guardRange(sim, a)
  for (const o of sim.actors.query(a.x, a.z, sp.perception)) {
    if (o === a) continue
    const d = Math.hypot(o.x - a.x, o.z - a.z)
    if (o.kind === 'animal') {
      // Prey flees from predators that eat it.
      const os = SPECIES[o.species]
      if ((sp.temperament === 'prey' || sp.temperament === 'vermin') && os.preys?.includes(a.species) && d < sp.perception * 0.6 && !o.vitals.dead) {
        flee(sim, a, o, 12)
        return true
      }
      continue
    }
    if (isDown(sim, o) || (o.kind === 'player' && isProtected(sim, o))) continue
    if (d > detectRange(sim, a, o.kind === 'player')) continue
    if (a.rabid || d < guard) {
      attack(sim, a, o, 30)
      return true
    }
    if (sp.temperament === 'prey' || sp.temperament === 'vermin') {
      if (d < sp.perception * (sp.temperament === 'vermin' ? 0.4 : 0.8)) {
        flee(sim, a, o, 10)
        return true
      }
      continue
    }
    if (sp.temperament === 'predator') {
      const bold = a.variant === 'alpha' || a.variant === 'strong' || a.hungerH > 30
      if (bold || d < 8) {
        attack(sim, a, o, 30)
        return true
      }
      if (d < FEAR.humanM) {
        flee(sim, a, o, 8)
        return true
      }
      continue
    }
    // Aggressive (boar, bear): attack when a person comes very close, otherwise keep away.
    if (d < FEAR.aggressiveAttackM) {
      attack(sim, a, o, 30)
      return true
    }
    if (d < FEAR.humanM) {
      flee(sim, a, o, 8)
      return true
    }
  }
  // Pens: wild animals keep away unless rabid or starving predators.
  if (!a.rabid && !desperate && a.species !== 'rat') {
    const pen = sim.buildingsNear(a.x, a.z, FEAR.penM).find((b) => b.kind === 'pen' && Math.hypot(b.x - a.x, b.z - a.z) < FEAR.penM + Math.max(b.hw, b.hd))
    if (pen) {
      flee(sim, a, pen, 6)
      return true
    }
  }
  // Once per decision (~1 s); was 5 % per 0.1 s update before the decision cadence (AI-01).
  if (a.rabid && sim.rng.chance(0.4)) {
    const victim = sim.actors.query(a.x, a.z, 15).find((o) => o !== a && !isDown(sim, o))
    if (victim) {
      attack(sim, a, victim, 20)
      return true
    }
  }
  return false
}

/** Domestic animals: a predator/hostile nearby → run to the shepherd or the pen (FAUNA-06). */
function decideDomestic(sim: Sim, a: Animal) {
  if (a.ai.goal === 'flee_home' || a.householdId === undefined || a.species === 'dog') return
  const sp = SPECIES[a.species]
  for (const o of sim.actors.query(a.x, a.z, sp.perception)) {
    if (o.kind !== 'animal' || o === a || o.vitals.dead) continue
    const os = SPECIES[o.species]
    if (os.temperament !== 'predator' && os.temperament !== 'aggressive' && !o.rabid && !os.preys?.includes(a.species)) continue
    const d = Math.hypot(o.x - a.x, o.z - a.z)
    if (o.rabid || o.aggroId !== undefined || o.ai.goal === 'hunt' || d < 12) {
      fleeHome(sim, a, o)
      return
    }
  }
}

/** Sets a run-to-safety plan: household shepherd (if out with the flock) or the household pen. */
export function fleeHome(sim: Sim, a: Animal, threat: P) {
  const hh = a.householdId !== undefined ? sim.state.households[a.householdId] : undefined
  let target: P | undefined
  if (hh?.profession === 'shepherd') {
    for (const id of hh.memberIds) {
      const h = sim.human(id)
      if (h && h.age === 'adult' && !isDown(sim, h) && hp(h.vitals) > 0 && Math.hypot(h.x - a.x, h.z - a.z) < 200) {
        target = { x: h.x, z: h.z }
        break
      }
    }
  }
  if (!target && a.householdId !== undefined) {
    const pen = sim.householdBuildings(a.householdId).find((b) => b.kind === 'pen')
    if (pen) target = pen
  }
  if (!target) {
    a.fleeFrom = { x: threat.x, z: threat.z, until: sim.state.time.play + 10 }
    return
  }
  a.fleeFrom = undefined
  a.ai.goal = 'flee_home'
  a.ai.label = 'Ucieka do domu'
  a.ai.steps = [{ op: 'goto', x: target.x, z: target.z, run: true, range: 2.5 }, { op: 'work', act: 'rest', dur: 15, label: 'Chowa się' }]
  a.ai.stepT = 0
}
