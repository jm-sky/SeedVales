/**
 * Combat shared by player, NPCs and animals: melee cones, projectiles, body-part damage with
 * layered armour, knock-out protection (player), downed state (NPC), death → corpse (animals).
 * @domain combat
 */
import type { DamageType, WeaponStats } from '../data/items'
import type { Sim } from './sim'
import type { Actor, Animal, ArmorKey, BodyPart, Human, Projectile } from './types'
import { COMBAT, DECISION, STAMINA } from '../config/calibration'
import { angleDiff } from '../core/math'
import { itemDef } from '../data/items'
import { SPECIES, VARIANT_MULT } from '../data/species'
import { perf } from '../diag/perf'
import { train } from './actions'
import { alertAround } from './alerts'
import { projectileGround } from './caveSpace'
import { logEvent, logging, logProduce } from './eventLog'
import { fleeHome } from './fauna/perception'
import { resolveDefence } from './guard'
import { consumeItem, qualityMult, wearTool } from './inventory'
import { companionsOnKill } from './npc/companions'
import { questOnKill } from './quests'
import { addRep, addStat, settlementAt } from './reputation'
import { bleedAt } from './traces'
import { applyPartDamage, heal, hp, makeIll, penalty } from './vitals'

const FISTS: WeaponStats = { kind: 'melee', reach: 0.7, damage: 4, dmgType: 'blunt', cooldown: 0.7, sharpness: 0, stamina: 6 }

const PART_TABLE: [BodyPart, number][] = [['torso', 38], ['gut', 14], ['head', 10], ['larm', 10], ['rarm', 10], ['lleg', 9], ['rleg', 9]]
const PART_ARMOR: Record<BodyPart, string[]> = {
  head: ['head'],
  torso: ['torso', 'shoulders'],
  gut: ['torso'],
  larm: ['forearms', 'hands', 'shoulders'],
  rarm: ['forearms', 'hands', 'shoulders'],
  lleg: ['legs', 'boots'],
  rleg: ['legs', 'boots'],
}

export const isHuman = (a: Actor): a is Human => a.kind !== 'animal'

export function weaponOf(a: Actor): WeaponStats {
  if (a.kind === 'animal') {
    const sp = SPECIES[a.species]
    const vm = VARIANT_MULT[a.variant]
    return { kind: 'melee', reach: sp.attackRange, damage: sp.damage * vm.dmg, dmgType: sp.dmgType, cooldown: sp.attackCooldown, sharpness: 0.5, stamina: 5 }
  }
  const m = a.eq.main
  return (m && itemDef(m.id).weapon) || FISTS
}

export function isProtected(sim: Sim, a: Actor) {
  return !!a.vitals.ko && a.vitals.ko.protectUntil > sim.state.time.play
}

/** Best guess of what killed an NPC (for the event log): needs first, then illness, bleeding, otherwise injury. */
function deathCause(h: Human): string {
  const v = h.vitals
  if (v.hunger <= 0) return 'hunger'
  if (v.thirst <= 0) return 'thirst'
  if (v.illness) return `illness:${v.illness.kind}`
  return v.bleeding > 0 ? 'bleeding' : 'injury'
}

/** NPC death (HP ≤ COMBAT.npcDeathHp from any cause: hits, bleeding, starvation). */
export function killNpc(sim: Sim, h: Human) {
  if (h.vitals.dead) return
  h.vitals.dead = true
  if (logging()) logEvent('death', { cause: deathCause(h), goal: h.ai.goal ?? undefined, profession: h.profession, x: Math.round(h.x), z: Math.round(h.z) }, h.id, h.settlementId)
  sim.emit({ type: 'death', id: h.id })
  sim.message(`${h.name} is dead.`, 'bad')
}

export function isDown(sim: Sim, a: Actor) {
  return !!a.vitals.dead || (!!a.vitals.ko && a.vitals.ko.until > sim.state.time.play)
}

function armorResist(h: Human, part: BodyPart, type: DamageType): number {
  let pass = 1
  for (const slot of PART_ARMOR[part]) {
    for (const layer of ['under', 'outer']) {
      const s = h.eq.armor[`${slot}_${layer}` as ArmorKey]
      if (!s || (s.dur ?? 1) <= 0) continue
      const r = itemDef(s.id).armor!.resist[type] * qualityMult(s)
      pass *= 1 - Math.min(0.9, r)
      wearTool(s, 0.3)
    }
  }
  return 1 - pass
}

/** Apply damage; handles KO/death/aggro. Returns true if target died. */
export function applyDamage(sim: Sim, target: Actor, raw: number, type: DamageType, attacker?: Actor): boolean {
  if (target.vitals.dead) return false
  if (target.kind === 'player' && isProtected(sim, target)) return false
  const part = sim.rng.weighted(PART_TABLE, (e) => e[1])[0]
  let dmg = raw
  if (isHuman(target)) dmg *= 1 - armorResist(target, part, type)
  applyPartDamage(target.vitals, part, dmg, type !== 'blunt')
  sim.emit({ type: 'hit', x: target.x, y: target.y + 1, z: target.z, targetId: target.id, dmg })
  alertAround(sim, target.x, target.z, DECISION.alertHitM)
  bleedAt(sim, target.x, target.z, dmg)
  // Rabies spreads by bites (vision §17.1).
  if (attacker?.kind === 'animal' && (attacker as Animal).rabid && type !== 'blunt') {
    if (target.kind === 'animal' && sim.rng.chance(0.2)) (target as Animal).rabid = true
    else if (target.kind !== 'animal' && sim.rng.chance(0.12)) {
      makeIll(target.vitals, 'rabies', 60)
      if (target.kind === 'player') sim.message('Bitten by a rabid animal… You need a herbalist!', 'bad')
    }
  }
  const h = hp(target.vitals)
  // Reactions.
  if (target.kind === 'animal' && attacker) onAnimalHurt(sim, target as Animal, attacker)
  if (target.kind === 'npc' && attacker) {
    target.callForHelpAt = sim.state.time.play
    if (attacker.kind === 'player') target.opinion = Math.max(-100, target.opinion - 30)
  }
  if (h > 0) return false
  if (target.kind === 'player') {
    if (!target.vitals.ko || target.vitals.ko.protectUntil < sim.state.time.play) {
      const now = sim.state.time.play
      target.vitals.ko = { until: now + COMBAT.koStandUpS, protectUntil: now + COMBAT.koProtectionS }
      heal(target.vitals, target.vitals.maxHp * 0.2 - h)
      target.vitals.convalescenceH = 12
      target.vitals.bleeding = 0
      sim.message('You lose consciousness… Enemies lose interest in you (120 s of protection).', 'bad')
      sim.interruptReason = 'ko'
    }
    return false
  }
  if (target.kind === 'npc') {
    if (h <= COMBAT.npcDeathHp) {
      killNpc(sim, target)
      if (attacker?.kind === 'player') addRep(sim, target.settlementId, { honesty: -40, helpfulness: -20 }, 'Murdered a villager')
      return true
    }
    if (!target.vitals.ko || target.vitals.ko.until < sim.state.time.play) {
      target.vitals.ko = { until: sim.state.time.play + 60, protectUntil: sim.state.time.play + 60 }
      target.callForHelpAt = sim.state.time.play
      alertAround(sim, target.x, target.z, DECISION.alertHelpM)
      sim.message(`${target.name} falls wounded and calls for help!`, 'bad')
    }
    return false
  }
  killAnimal(sim, target as Animal, attacker)
  return true
}

function onAnimalHurt(sim: Sim, a: Animal, attacker: Actor) {
  const sp = SPECIES[a.species]
  a.ai.decideAt = 0 // critical event: react on the next update
  if (sp.temperament === 'domestic' && a.species !== 'dog' && a.householdId !== undefined) {
    fleeHome(sim, a, attacker)
    return
  }
  if (sp.temperament === 'prey' || sp.temperament === 'domestic' || sp.temperament === 'vermin') {
    if (sp.temperament === 'vermin' || sp.damage === 0 || hp(a.vitals) < a.vitals.maxHp * 0.5 || sim.rng.chance(0.7)) {
      a.fleeFrom = { x: attacker.x, z: attacker.z, until: sim.state.time.play + 20 }
      return
    }
  }
  a.aggroId = attacker.id
  a.aggroUntil = sim.state.time.play + 40
  // Pack members join.
  if (a.denId) {
    for (const o of sim.actors.query(a.x, a.z, 40)) {
      if (o.kind === 'animal' && o.denId === a.denId && o !== a) {
        o.aggroId = attacker.id
        o.aggroUntil = sim.state.time.play + 30
      }
    }
  }
}

export function killAnimal(sim: Sim, a: Animal, killer?: Actor) {
  a.vitals.dead = true
  const sp = SPECIES[a.species]
  // Rats vanish (bones not tracked); everything else leaves a corpse.
  if (a.species !== 'rat') {
    sim.addCorpse({
      id: sim.nextId(), species: a.species, variant: a.variant, x: a.x, z: a.z, rot: a.rot,
      diedAt: sim.state.time.cal, butchered: false, meat: Math.round(sp.corpse.meat * VARIANT_MULT[a.variant].size),
    })
  }
  sim.emit({ type: 'death', id: a.id })
  sim.removeAnimal(a)
  if (sp.dangerous && killer && (killer.kind === 'player' || (killer as Human).companion)) companionsOnKill(sim, a.x, a.z)
  if (killer?.kind === 'player') {
    addStat(sim, 'kills')
    if (a.species === 'rat') addStat(sim, 'ratsKilled')
    if (sp.dangerous) {
      addStat(sim, 'dangerousKilled')
      const sid = settlementAt(sim, a.x, a.z, 1500)
      if (sid !== null) addRep(sim, sid, { courage: a.variant === 'alpha' || a.variant === 'strong' ? 4 : 2, renown: 1 }, `Killed: ${sp.name}`)
    }
    if (a.householdId !== undefined) {
      const hh = sim.state.households[a.householdId]
      if (hh) addRep(sim, hh.settlementId, { honesty: -10 }, 'Killed someone else\'s animal')
    }
    questOnKill(sim, a.species, a.x, a.z, a.denId)
  }
}

/** Melee swing. coneDeg widens for mobile auto-aim. Returns target hit (if any). */
export function meleeAttack(sim: Sim, a: Actor, coneDeg = 70, preferId?: number): Actor | null {
  const now = sim.state.time.play
  if (now < a.attackReadyAt || isDown(sim, a)) return null
  const w = weaponOf(a)
  if (w.kind !== 'melee') return null
  if (a.vitals.stamina < w.stamina * 0.5) return null
  a.vitals.stamina = Math.max(0, a.vitals.stamina - (w.stamina || STAMINA.meleeSwing))
  a.attackReadyAt = now + w.cooldown
  a.action = { kind: 'swing', at: now }
  sim.emit({ type: 'swing', id: a.id })
  const reach = w.reach + 0.8
  let best: Actor | null = null
  let bestScore = Infinity
  for (const t of sim.actors.query(a.x, a.z, reach + 1.5)) {
    if (t === a || t.vitals.dead) continue
    if (a.kind === 'animal' && t.kind === 'animal' && (t as Animal).species === a.species) continue
    const d = Math.hypot(t.x - a.x, t.z - a.z)
    const tr = t.kind === 'animal' ? SPECIES[(t as Animal).species].length * 0.4 : 0.4
    if (d > reach + tr) continue
    const ang = d < 0.9 ? 0 : Math.abs(angleDiff(a.rot, Math.atan2(t.x - a.x, t.z - a.z)))
    if (ang > (coneDeg * Math.PI) / 360) continue
    // Target priority: explicit target > attackers of this actor > wild animals > domestic animals/people.
    let pri = t.id === preferId ? -5 : 0
    if (t.kind === 'animal' && (t as Animal).aggroId === a.id) pri -= 3
    if (a.kind === 'player') {
      if (t.kind === 'npc') pri += 4
      else if (t.kind === 'animal' && SPECIES[(t as Animal).species].temperament === 'domestic') pri += 2.5
    }
    const score = d + ang * 2 + pri
    if (score < bestScore) {
      bestScore = score
      best = t
    }
  }
  perf.count('combat.swings')
  if (!best) {
    perf.count('combat.noTarget')
    return null
  }
  const skill = isHuman(a) ? a.skills.melee : 50
  const agi = isHuman(a) ? a.attrs.agi : 5
  const tAgi = isHuman(best) ? best.attrs.agi : 5
  const hitChance = Math.min(0.95, Math.max(0.25, 0.6 + skill * 0.004 + (agi - tAgi) * 0.03))
  perf.gauge('combat.lastHitChance', hitChance * 100)
  if (!sim.rng.chance(hitChance)) {
    perf.count('combat.misses')
    return best
  }
  perf.count('combat.hits')
  let dmg = w.damage * (0.6 + (skill / 100) * 0.8) * penalty(a.vitals) * (0.6 + (a.vitals.stamina / 100) * 0.4)
  if (isHuman(a)) {
    dmg *= 0.8 + a.attrs.str * 0.04
    if (a.eq.main) {
      dmg *= qualityMult(a.eq.main)
      wearTool(a.eq.main, 0.5)
    }
    train(a, 'melee', 0.5)
  }
  // Active defence (player guard) resolves after the attack connected and before body damage (D-COMBAT-2).
  const defence = resolveDefence(sim, best, a, dmg)
  if (defence.kind === 'parry') {
    sim.message(`You parry ${a.kind === 'npc' ? (a as Human).name : 'the attack'}!`, 'good')
    return best
  }
  if (defence.kind === 'block') sim.message('You block the blow.', 'info')
  else if (defence.kind === 'break') sim.message('Your guard breaks!', 'bad')
  if (defence.damage > 0) applyDamage(sim, best, defence.damage, w.dmgType, a)
  return best
}

/** Fires a projectile along yaw/pitch. drawFrac 0..1 scales speed/damage. */
export function fireRanged(sim: Sim, h: Human, yaw: number, pitch: number, drawFrac: number): boolean {
  const w = weaponOf(h)
  if (w.kind !== 'ranged' || !w.ammo) return false
  const now = sim.state.time.play
  if (now < h.attackReadyAt) return false
  const ammo = h.inv.items.find((s) => itemDef(s.id).ammoKind === w.ammo)
  if (!ammo) {
    if (h.kind === 'player') sim.message('Out of ammunition.', 'bad')
    return false
  }
  const ammoId = ammo.id
  consumeItem(h.inv, ammoId, 1, 'ammo', h)
  h.attackReadyAt = now + w.cooldown
  h.action = { kind: 'shoot', at: now }
  const df = Math.max(0.2, Math.min(1, drawFrac))
  const speed = (w.projSpeed ?? 40) * (0.5 + df * 0.5)
  const skill = h.skills.ranged
  // Aim spread shrinks with skill (vision: skill carries most of the weight).
  const spread = (1 - skill / 120) * 0.06
  const yy = yaw + (sim.rng.next() - 0.5) * spread
  const pp = pitch + (sim.rng.next() - 0.5) * spread
  const p: Projectile = {
    id: sim.nextId(),
    x: h.x + Math.sin(yy) * 0.5,
    y: h.y + 1.5,
    z: h.z + Math.cos(yy) * 0.5,
    vx: Math.sin(yy) * Math.cos(pp) * speed,
    vy: Math.sin(pp) * speed,
    vz: Math.cos(yy) * Math.cos(pp) * speed,
    ownerId: h.id,
    damage: (w.damage + (itemDef(ammoId).damageBonus ?? 0)) * (0.4 + df * 0.6) * (0.7 + skill / 200) * (h.eq.main ? qualityMult(h.eq.main) : 1),
    dmgType: w.dmgType,
    ttl: 5,
    item: ammoId,
  }
  sim.projectiles.push(p)
  if (h.eq.main) wearTool(h.eq.main, 0.3)
  train(h, 'ranged', 0.5)
  sim.emit({ type: 'shot', id: p.id })
  alertAround(sim, h.x, h.z, DECISION.alertShotM)
  return true
}

export function projectileSystem(sim: Sim, dt: number) {
  for (let i = sim.projectiles.length - 1; i >= 0; i--) {
    const p = sim.projectiles[i]!
    const steps = Math.ceil((Math.hypot(p.vx, p.vy, p.vz) * dt) / 0.5)
    let done = false
    for (let s = 0; s < steps && !done; s++) {
      const d = dt / steps
      p.vy -= 9.81 * d
      p.x += p.vx * d
      p.y += p.vy * d
      p.z += p.vz * d
      for (const t of sim.actors.query(p.x, p.z, 2.5)) {
        if (t.id === p.ownerId || t.vitals.dead) continue
        const hgt = t.kind === 'animal' ? SPECIES[(t as Animal).species].height * VARIANT_MULT[(t as Animal).variant].size : 1.8
        const rad = t.kind === 'animal' ? Math.max(0.35, SPECIES[(t as Animal).species].length * 0.35) : 0.4
        if (Math.hypot(t.x - p.x, t.z - p.z) < rad && p.y > t.y - 0.2 && p.y < t.y + hgt + 0.2) {
          applyDamage(sim, t, p.damage, p.dmgType, sim.actor(p.ownerId))
          done = true
          break
        }
      }
      if (!done && p.y < projectileGround(sim, p.x, p.z, p.y)) {
        done = true
        // Arrows can be recovered sometimes.
        if (p.item && p.item !== 'sling_stone' && sim.rng.chance(0.5)) {
          sim.addGround({ id: sim.nextId(), x: p.x, z: p.z, stack: { id: p.item, qty: 1 }, droppedAt: sim.state.time.cal })
          logProduce(p.item, 1, 'arrow_recovered') // the shot logged it as consumed; the recovered one is a source again
        }
      }
    }
    p.ttl -= dt
    if (done || p.ttl <= 0) sim.projectiles.splice(i, 1)
  }
}
