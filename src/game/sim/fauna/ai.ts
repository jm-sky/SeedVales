/**
 * Animal behaviour: graze/wander around home, drink at shallow banks, rest, flee threats
 * (sneak lowers detection), predators hunt prey and scavenge dropped meat/carrion, aggressive/rabid
 * attack, rain → shelter under forest, domestic animals stay by pens/owners, sheep follow shepherd.
 * @domain fauna
 */
import type { Sim } from '../sim'
import type { Animal } from '../types'
import { CALENDAR_SPEED, HUNT } from '../../config/calibration'
import { itemDef } from '../../data/items'
import { SPECIES, VARIANT_MULT } from '../../data/species'
import { perf } from '../../diag/perf'
import { isDown, isProtected, killAnimal, meleeAttack } from '../combat'
import { steerTo } from '../movement'
import { nearestNaturalWater } from '../npc/queries'
import { hourOf, isNight } from '../time'
import { hp } from '../vitals'
import { isBadWeather } from '../weather'

type Target = { x: number; z: number }

function pickWander(sim: Sim, a: Animal, r: number): Target {
  for (let t = 0; t < 6; t++) {
    const ang = sim.rng.range(0, Math.PI * 2)
    const d = sim.rng.range(r * 0.2, r)
    const x = a.homeX + Math.cos(ang) * d
    const z = a.homeZ + Math.sin(ang) * d
    if (sim.terrain.waterDepthAt(x, z) < 0.3 && sim.terrain.inBounds(x, z)) return { x, z }
  }
  return { x: a.homeX, z: a.homeZ }
}

/** Detection distance of a human by this animal (sneak skill + night reduce it). */
function detectRange(sim: Sim, a: Animal, targetIsPlayer: boolean): number {
  const sp = SPECIES[a.species]
  let r = sp.perception
  if (targetIsPlayer && sim.state.px.sneaking) r *= 1 - Math.min(0.75, 0.4 + sim.player.skills.sneak / 200)
  if (isNight(sim.state.time.cal)) r *= 0.7
  if (sim.weather.fog > 0.5) r *= 0.75
  return r
}

export function updateAnimal(sim: Sim, a: Animal, dt: number, full: boolean) {
  const sp = SPECIES[a.species]
  const now = sim.state.time.play
  const hDt = (dt * CALENDAR_SPEED) / 3600
  a.thirstH += hDt
  a.hungerH += hDt
  // Stamina regen only (animals share vitals structure).
  a.vitals.stamina = Math.min(100, a.vitals.stamina + dt * 10)
  if (a.vitals.bleeding > 0) {
    a.vitals.parts.torso += a.vitals.bleeding * dt * 0.05
    a.vitals.bleeding = Math.max(0, a.vitals.bleeding - dt * 0.02)
    if (hp(a.vitals) <= 0) {
      killAnimal(sim, a)
      return
    }
  }
  const ai = a.ai
  const speedMul = VARIANT_MULT[a.variant].size > 1 ? 1.05 : 1

  // 1) Fleeing (prey/vermin/domestic hurt).
  if (a.fleeFrom && a.fleeFrom.until > now) {
    const dx = a.x - a.fleeFrom.x
    const dz = a.z - a.fleeFrom.z
    const d = Math.hypot(dx, dz) || 1
    steerTo(sim, a, a.x + (dx / d) * 20, a.z + (dz / d) * 20, sp.run * speedMul, dt, 0.5, full, 0.3)
    a.moving = 'run'
    ai.label = 'Ucieka'
    return
  }
  // 2) Aggro target (attack).
  const aggro = a.aggroUntil && a.aggroUntil > now ? sim.actor(a.aggroId) : undefined
  if (aggro && !isDown(sim, aggro) && !(aggro.kind === 'player' && isProtected(sim, aggro))) {
    const reach = sp.attackRange + 0.5
    ai.label = 'Atakuje'
    if (steerTo(sim, a, aggro.x, aggro.z, sp.run * speedMul, dt, reach, full, 0.3) === 'arrived') {
      a.rot = Math.atan2(aggro.x - a.x, aggro.z - a.z)
      meleeAttack(sim, a, 120, aggro.id)
    }
    a.moving = 'run'
    return
  }
  a.aggroId = undefined

  // 3) Perception of humans (throttled via LOD interval).
  if (sp.temperament !== 'domestic') {
    for (const o of sim.actors.query(a.x, a.z, sp.perception)) {
      if (o.kind === 'animal') {
        const os = SPECIES[(o as Animal).species]
        // Prey flees from predators.
        if ((sp.temperament === 'prey' || sp.temperament === 'vermin') && os.preys?.includes(a.species) && Math.hypot(o.x - a.x, o.z - a.z) < sp.perception * 0.6) {
          a.fleeFrom = { x: o.x, z: o.z, until: now + 12 }
          return
        }
        continue
      }
      if (isDown(sim, o) || (o.kind === 'player' && isProtected(sim, o))) continue
      const d = Math.hypot(o.x - a.x, o.z - a.z)
      if (d > detectRange(sim, a, o.kind === 'player')) continue
      if (sp.temperament === 'prey' || sp.temperament === 'vermin') {
        if (d < sp.perception * (sp.temperament === 'vermin' ? 0.4 : 0.8)) a.fleeFrom = { x: o.x, z: o.z, until: now + 10 }
        return
      }
      // Predators attack people only when hungry, alpha/strong, rabid or very close; aggressive defend territory.
      const bold = a.rabid || a.variant === 'alpha' || a.variant === 'strong' || a.hungerH > 30
      if ((sp.temperament === 'predator' && (bold || d < 8)) || (sp.temperament === 'aggressive' && d < 10) || a.rabid) {
        a.aggroId = o.id
        a.aggroUntil = now + 30
        return
      }
    }
  }
  // Rabid: attack anything nearby.
  if (a.rabid && sim.rng.chance(0.05)) {
    const victim = sim.actors.query(a.x, a.z, 15).find((o) => o !== a && !isDown(sim, o))
    if (victim) {
      a.aggroId = victim.id
      a.aggroUntil = now + 20
    }
  }

  // 4) Plan-level behaviour (re-evaluated when previous target reached or timed out).
  if (ai.goal === 'hunt' && !chaseValid(sim, a)) {
    ai.steps.length = 0
    ai.goal = null
    ai.cooldowns.hunt = now + HUNT.cooldownS
    ai.lastFail = 'hunt:chase'
    perf.count('fauna.huntGiveUp')
  }
  const step = ai.steps[0]
  if (step?.op === 'goto') {
    const r = steerTo(sim, a, step.x, step.z, (step.run ? sp.run : sp.walk) * speedMul, dt, step.range ?? 1, full, 0.3)
    if (r !== 'moving') {
      ai.steps.shift()
      ai.stepT = 0
      if (ai.goal === 'drink' && r === 'arrived') {
        // Domestic animals drink from the trough on arrival (not at planning time).
        const trough = a.householdId !== undefined ? sim.buildingsNear(a.x, a.z, 3).find((b) => b.kind === 'trough' && b.householdId === a.householdId) : undefined
        if (trough) trough.water = Math.max(0, (trough.water ?? 0) - 0.5)
        a.thirstH = 0
      }
      if (ai.goal === 'scavenge' && r === 'arrived') scavenge(sim, a)
      if (ai.goal === 'hunt' && r === 'arrived') {
        const prey = sim.actor(ai.targetId)
        if (prey && !isDown(sim, prey)) {
          a.rot = Math.atan2(prey.x - a.x, prey.z - a.z)
          meleeAttack(sim, a, 140, prey.id)
          // Real contact with the prey: the chase limit restarts (a fight over the prey is not a chase).
          if (Math.hypot(prey.x - a.x, prey.z - a.z) <= sp.attackRange + 0.5) ai.goalAt = sim.state.time.play
          ai.steps.unshift({ op: 'goto', x: prey.x, z: prey.z, range: sp.attackRange, run: true })
        } else a.hungerH = Math.max(0, a.hungerH - 20)
      }
    }
    return
  }
  if (step?.op === 'work') {
    ai.stepT += dt
    a.moving = 'idle'
    if (ai.stepT >= step.dur) {
      if (step.act === 'graze') a.hungerH = Math.max(0, a.hungerH - 3)
      ai.steps.shift()
      ai.stepT = 0
    }
    return
  }
  planAnimal(sim, a)
}

/** A hunt continues only while the prey is alive, perceivable and the chase time limit is not exceeded. */
function chaseValid(sim: Sim, a: Animal): boolean {
  const prey = sim.actor(a.ai.targetId)
  if (!prey || isDown(sim, prey)) return true // kill done: finish the step normally
  if (sim.state.time.play - (a.ai.goalAt ?? 0) > HUNT.chaseMaxS) return false
  return Math.hypot(prey.x - a.x, prey.z - a.z) <= SPECIES[a.species].perception * HUNT.giveUpPerception
}

function scavenge(sim: Sim, a: Animal) {
  const g = sim.groundNear(a.x, a.z, 2).find((gi) => itemDef(gi.stack.id).food)
  if (g) {
    g.stack.qty--
    if (g.stack.qty <= 0) sim.removeGround(g)
    a.hungerH = 0
    return
  }
  const c = sim.corpsesNear(a.x, a.z, 2.5).find((cc) => cc.meat > 0)
  if (c) {
    c.meat--
    a.hungerH = 0
  }
}

function planAnimal(sim: Sim, a: Animal) {
  const sp = SPECIES[a.species]
  const ai = a.ai
  const cal = sim.state.time.cal
  const hr = hourOf(cal)
  const go = (t: Target, run = false, range = 1) => ai.steps.push({ op: 'goto', x: t.x, z: t.z, run, range })
  ai.stepT = 0
  // Domestic: follow owner (sheep/dog), stay near pen, drink at trough.
  if (sp.temperament === 'domestic' && a.householdId !== undefined) {
    const hh = sim.state.households[a.householdId]
    const owner = hh ? sim.human(hh.memberIds[0]) : undefined
    const own = sim.householdBuildings(a.householdId)
    const pen = own.find((b) => b.kind === 'pen')
    if (a.thirstH > sp.drinkEveryH) {
      const trough = own.find((b) => b.kind === 'trough' && (b.water ?? 0) > 0)
      if (trough) {
        ai.goal = 'drink'
        go(trough, false, 1.5)
        return
      }
    }
    if (owner && (a.species === 'dog' || (a.species === 'sheep' && owner.ai.label.includes('owce')))) {
      ai.goal = 'follow'
      go({ x: owner.x + sim.rng.range(-5, 5), z: owner.z + sim.rng.range(-5, 5) }, false, 2)
      return
    }
    const base = pen ?? { x: a.homeX, z: a.homeZ, hw: 4 }
    ai.goal = 'graze'
    const r = pen ? Math.max(1, pen.hw - 1) : 6
    go({ x: base.x + sim.rng.range(-r, r), z: base.z + sim.rng.range(-r, r) }, false, 0.8)
    ai.steps.push({ op: 'work', act: 'graze', dur: sim.rng.range(8, 25), label: 'Pasie się' })
    if (a.thirstH > sp.drinkEveryH * 1.5) a.thirstH = 0 // household water abstracted when no trough
    return
  }
  // Wild: rain → shelter near home/forest.
  if (isBadWeather(sim.weather) && sim.rng.chance(0.6)) {
    ai.goal = 'shelter'
    go({ x: a.homeX + sim.rng.range(-10, 10), z: a.homeZ + sim.rng.range(-10, 10) })
    ai.steps.push({ op: 'work', act: 'rest', dur: 40, label: 'Chroni się' })
    return
  }
  // Drink: walk to shallow bank point (never into deep water).
  if (a.thirstH > sp.drinkEveryH) {
    const w = nearestNaturalWater(sim, a.x, a.z, 500)
    if (w) {
      ai.goal = 'drink'
      go(w, false, 1.5)
      ai.steps.push({ op: 'work', act: 'drink', dur: 6, label: 'Pije' })
      return
    }
    a.thirstH = 0
  }
  // Carnivores: scavenge attractive food, then hunt.
  if (sp.diet !== 'grass' && a.hungerH > 10) {
    const lure = sim.groundNear(a.x, a.z, sp.perception * 2.5).find((g) => itemDef(g.stack.id).food)
    const carrion = sim.corpsesNear(a.x, a.z, sp.perception * 3).find((c) => c.meat > 0)
    const t = lure ?? carrion
    if (t) {
      ai.goal = 'scavenge'
      go(t, true, 1.5)
      return
    }
    if (sp.preys && a.hungerH > 16 && (ai.cooldowns.hunt ?? 0) <= sim.state.time.play) {
      const prey = sim.actors.query(a.x, a.z, sp.perception * 1.5).find((o) => o.kind === 'animal' && sp.preys!.includes((o as Animal).species) && !isDown(sim, o))
      if (prey) {
        ai.goal = 'hunt'
        ai.goalAt = sim.state.time.play
        ai.targetId = prey.id
        go(prey, true, sp.attackRange)
        return
      }
    }
  }
  // Rest at night (diurnal) / by day (nocturnal predators).
  const nocturnal = sp.temperament === 'predator' || a.species === 'rat'
  const restTime = nocturnal ? hr > 9 && hr < 17 : isNight(cal)
  if (restTime && sim.rng.chance(0.7)) {
    ai.goal = 'rest'
    go({ x: a.homeX + sim.rng.range(-6, 6), z: a.homeZ + sim.rng.range(-6, 6) })
    ai.steps.push({ op: 'work', act: 'rest', dur: 60 + sim.rng.next() * 60, label: 'Odpoczywa' })
    return
  }
  ai.goal = 'graze'
  const range = a.species === 'rat' ? 14 : sp.temperament === 'predator' ? 160 : 90
  go(pickWander(sim, a, range))
  ai.steps.push({ op: 'work', act: 'graze', dur: sim.rng.range(10, 40), label: 'Żeruje' })
}

export function faunaSystem(sim: Sim) {
  const now = sim.state.time.play
  const p = sim.player
  let near = 0
  for (const a of [...sim.state.animals]) {
    if (now < a.nextUpdate || a.vitals.dead) continue
    const d = Math.hypot(a.x - p.x, a.z - p.z)
    const interval = sim.lodInterval(d)
    const dt = Math.min(now - a.lastUpdate, 30)
    a.lastUpdate = now
    a.nextUpdate = now + interval * (0.9 + ((a.id * 7919) % 100) / 500)
    if (interval <= 0.11) near++
    updateAnimal(sim, a, dt, interval <= 0.11)
  }
  perf.gauge('fauna.near', near)
  perf.gauge('fauna.total', sim.state.animals.length)
}
