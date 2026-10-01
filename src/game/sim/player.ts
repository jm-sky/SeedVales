/**
 * Player controller inside the simulation: intent → movement (walk/run/sneak/swim), activities
 * with progress (interruptible), KO/protection, bow draw, autopilot on roads, strength training.
 * @domain player
 */
import type { Sim } from './sim'
import type { Human, PlayerActivity } from './types'
import { ACCEL, COMBAT, RUN_SPEED_MPS, SNEAK_SPEED_MPS, SWIM_DEPTH_M, SWIM_SPEED_MPS, WALK_SPEED_MPS } from '../config/calibration'
import { itemDef } from '../data/items'
import { SPECIES } from '../data/species'
import { cartBlocked, cartDef } from './cart'
import { moveWithCollision } from './collision'
import { fireRanged, isProtected, weaponOf } from './combat'
import { carriedWeight, carryCapacity } from './inventory'
import { ACTIVITY_DONE } from './playerActivities'
import { type Exertion, hp, penalty, updateVitals } from './vitals'

export interface PlayerInput {
  /** World-space desired direction (not normalised → magnitude 0..1 for analog). */
  mx: number
  mz: number
  run: boolean
  /** Camera yaw/pitch for aiming. */
  yaw: number
  pitch: number
  /** Primary held (bow draw). */
  drawing: boolean
}

export const playerInput: PlayerInput = { mx: 0, mz: 0, run: false, yaw: 0, pitch: 0, drawing: false }

export function armorSpeedPenalty(h: Human): number {
  let p = 0
  for (const s of Object.values(h.eq.armor)) if (s) p += itemDef(s.id).armor!.speedPenalty
  return p
}

export function startActivity(sim: Sim, a: Omit<PlayerActivity, 'elapsed'>) {
  sim.state.px.activity = { ...a, elapsed: 0 }
}

export function cancelActivity(sim: Sim, reason?: string) {
  const act = sim.state.px.activity
  if (!act) return
  // Partial construction progress is kept on the site (resources stay consistent).
  if (act.kind === 'build') ACTIVITY_DONE.build_partial?.(sim, act)
  sim.state.px.activity = undefined
  if (reason) sim.message(reason)
}

/** 'attack' = an animal is attacking the player; 'near' = predator close by; null = safe. */
function threatToPlayer(sim: Sim): 'attack' | 'near' | null {
  const p = sim.player
  let near = false
  for (const a of sim.actors.query(p.x, p.z, 35)) {
    if (a.kind !== 'animal') continue
    if (a.aggroId === p.id && (a.aggroUntil ?? 0) > sim.state.time.play) return 'attack'
    if (SPECIES[a.species].temperament === 'predator' && Math.hypot(a.x - p.x, a.z - p.z) < 25) near = true
  }
  return near ? 'near' : null
}

export function sleepComfort(sim: Sim, inBed: number | null): number {
  if (inBed !== null) return inBed
  const p = sim.player
  const has = (id: string) => p.inv.items.some((s) => s.id === id)
  const fire = sim.buildingsNear(p.x, p.z, 6).some((b) => b.kind === 'campfire' && b.lit)
  const rain = sim.weather.kind === 'rain' || sim.weather.kind === 'storm' || sim.weather.kind === 'snow'
  const surv = p.skills.survival / 500
  let c = has('blanket') ? (rain ? 0.08 : 0.2) : 0.05
  if (has('tent')) c = 0.3 + surv
  if (has('tent') && fire && has('furs')) c = 0.55 + surv
  else if (has('tent') && fire) c = 0.45 + surv
  if (sim.weather.temp < 0 && !fire) c *= 0.6
  return Math.min(0.7, c)
}

export function playerSystem(sim: Sim, dt: number) {
  const p = sim.player
  const px = sim.state.px
  const now = sim.state.time.play
  const inp = playerInput

  // KO: lie still, then stand up with protection window.
  if (p.vitals.ko && now < p.vitals.ko.until) {
    updateVitals(p.vitals, dt, 'rest', 0.2)
    p.moving = 'idle'
    // Washed ashore if unconscious in deep water.
    if (sim.terrain.waterDepthAt(p.x, p.z) > SWIM_DEPTH_M) {
      const shore = nearestLand(sim, p.x, p.z, 400)
      if (shore) {
        p.x = shore.x
        p.z = shore.z
        p.y = sim.terrain.heightAt(p.x, p.z)
        sim.actors.update(p)
        sim.message('The waves wash you ashore.', 'info')
      }
    }
    return
  }
  if (p.vitals.ko && now > p.vitals.ko.protectUntil) p.vitals.ko = undefined

  // Activity progress.
  const act = px.activity
  const moving = Math.hypot(inp.mx, inp.mz) > 0.1
  if (act && moving && act.kind !== 'autopilot') cancelActivity(sim, 'Activity interrupted.')
  let ex: Exertion = 'idle'
  let comfort = 0.5
  if (px.activity) {
    const a = px.activity
    a.elapsed += dt
    ex = a.kind === 'sleep' ? 'sleep' : a.kind === 'rest' ? 'rest' : 'work'
    if (a.kind === 'sleep') comfort = Number(a.data ?? 0.3)
    // Any activity stops when attacked; long/accelerated ones already when a predator is near.
    const threat = threatToPlayer(sim)
    if (threat === 'attack' || ((a.kind === 'sleep' || a.kind === 'rest' || (a.accel ?? 1) > 1) && threat)) {
      sim.interruptReason = 'threat'
      cancelActivity(sim, 'Danger! You stop what you\'re doing.')
    } else if (a.kind === 'sleep' && p.vitals.vigor >= 99 && a.elapsed > 150) {
      a.elapsed = a.total
    }
    if (px.activity && px.activity.elapsed >= px.activity.total) {
      const done = px.activity
      px.activity = undefined
      const fn = ACTIVITY_DONE[done.kind]
      const r = fn ? fn(sim, done) : null
      if (r) sim.message(r.msg, r.ok ? 'info' : 'bad')
    }
  }

  // Bow draw (hold primary).
  const w = weaponOf(p)
  if (w.kind === 'ranged') {
    if (inp.drawing && now >= p.attackReadyAt && !isProtected(sim, p)) {
      px.bowDraw = Math.min(1, px.bowDraw + dt / (w.drawTime ?? 1))
      p.vitals.stamina = Math.max(0, p.vitals.stamina - dt * 3)
    } else if (!inp.drawing && px.bowDraw > 0) {
      fireRanged(sim, p, inp.yaw, inp.pitch, px.bowDraw)
      px.bowDraw = 0
    }
  } else px.bowDraw = 0

  // Autopilot along road.
  let mx = inp.mx
  let mz = inp.mz
  const ap = px.autopilot
  if (ap && !moving) {
    const road = sim.world.roads[ap.roadId]
    const tgt = road?.points[ap.idx]
    if (!road || !tgt) px.autopilot = undefined
    else {
      const d = Math.hypot(tgt.x - p.x, tgt.z - p.z)
      if (d < 3) {
        ap.idx += ap.dir
        if (ap.idx < 0 || ap.idx >= road.points.length) {
          px.autopilot = undefined
          sim.message('Autopilot: you have reached the end of the road.')
        }
      }
      mx = (tgt.x - p.x) / (d || 1)
      mz = (tgt.z - p.z) / (d || 1)
      if (threatToPlayer(sim)) {
        px.autopilot = undefined
        sim.interruptReason = 'threat'
        sim.message('Autopilot stopped — danger!', 'bad')
      }
    }
  } else if (ap && moving) px.autopilot = undefined

  // Movement.
  const mag = Math.min(1, Math.hypot(mx, mz))
  const depth = sim.terrain.waterDepthAt(p.x, p.z)
  const swimming = depth > SWIM_DEPTH_M
  if (mag > 0.05 && !px.activity) {
    const pen = penalty(p.vitals) * (1 - armorSpeedPenalty(p))
    const overload = carriedWeight(p) > carryCapacity(p) ? 0.5 : 1
    let speed = WALK_SPEED_MPS
    let mode: Human['moving'] = 'walk'
    if (swimming) {
      speed = SWIM_SPEED_MPS
      mode = 'swim'
    } else if (px.sneaking) {
      speed = SNEAK_SPEED_MPS
      mode = 'sneak'
    } else if (inp.run && p.vitals.stamina > 5 && overload === 1 && !px.cart) {
      speed = RUN_SPEED_MPS
      mode = 'run'
    }
    if (sim.terrain.roadAt(p.x, p.z) > 0.4 && mode === 'walk') speed *= 1.1
    if (depth > 0.3 && !swimming) speed *= 0.7
    if (px.cart) speed *= cartDef(px.cart).speed
    const d = speed * pen * overload * mag * dt
    const blocked = px.cart ? cartBlocked(sim, p.x, p.z, mx, mz) : null
    if (blocked) {
      if (Math.floor(now) !== Math.floor(now - dt)) sim.message(blocked, 'bad')
    } else moveWithCollision(sim, p, (mx / mag) * d, (mz / mag) * d, 0.35, true)
    p.rot = Math.atan2(mx, mz)
    p.moving = mode
    ex = mode === 'run' ? 'run' : mode === 'swim' ? 'swim' : 'walk'
    sim.actors.update(p)
  } else {
    p.moving = swimming ? 'swim' : 'idle'
    if (swimming) ex = 'swim'
    p.y = sim.terrain.heightAt(p.x, p.z)
  }
  if (swimming && p.vitals.stamina <= 0) {
    p.vitals.parts.gut += 4 * dt
    if (Math.floor(now) !== Math.floor(now - dt)) sim.message('You are drowning! Swim to shore!', 'bad')
    if (hp(p.vitals) <= 0) {
      p.vitals.ko = { until: now + COMBAT.koStandUpS, protectUntil: now + COMBAT.koProtectionS }
    }
  }
  updateVitals(p.vitals, dt, ex, comfort)

  // Strength slowly grows from carrying heavy loads (vision §9.1).
  const load = carriedWeight(p) / carryCapacity(p)
  if (load > 0.6 && (ex === 'walk' || ex === 'run')) {
    p.strTrain += dt * load
    if (p.strTrain > 3600 * p.attrs.str && p.attrs.str < 10) {
      p.attrs.str++
      p.strTrain = 0
      sim.message('You feel stronger (Strength +1).', 'good')
    }
  }
  // Time acceleration request from activity.
  sim.timeScale = px.activity?.accel ?? (px.autopilot ? ACCEL.roadAutopilot : 1)
}

/** Nearest dry land point (ring search, 4 m steps). */
export function nearestLand(sim: Sim, x: number, z: number, maxR: number): { x: number; z: number } | null {
  for (let r = 4; r <= maxR; r += 4) {
    const n = Math.max(8, Math.floor((r * Math.PI * 2) / 4))
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const px = x + Math.cos(a) * r
      const pz = z + Math.sin(a) * r
      if (sim.terrain.waterDepthAt(px, pz) === 0 && sim.terrain.inBounds(px, pz)) return { x: px, z: pz }
    }
  }
  return null
}
