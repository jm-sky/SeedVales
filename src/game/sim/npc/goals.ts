/**
 * Utility scoring of NPC goals: need strength × personality vs duty strength vs context
 * (time, weather, threats) vs cost (distance, fatigue, tools). Highest feasible plan wins.
 * @domain npc
 * @subdomain ai
 */
import type { Sim } from '../sim'
import type { AiStep, Human } from '../types'
import { COMPANION, RUN_SPEED_MPS } from '../../config/calibration'
import { SPECIES } from '../../data/species'
import { countItem, findFood } from '../inventory'
import { settlementAt } from '../reputation'
import { hourOf, isNight } from '../time'
import { isBadWeather } from '../weather'
import { companionDist } from './companions'
import { deliverSurplus, dutyPlan } from './duties'
import { doorOf, houseOf, settlementBuildings, threatNear, waterSources } from './queries'
import { householdFoodCount } from './works'

export interface GoalOption {
  id: string
  score: number
  plan: () => { label: string; steps: AiStep[] } | null
}

const need = (v: number) => (v < 70 ? ((70 - v) / 70) ** 1.4 : 0)
const go = (x: number, z: number, range = 1.5, run = false): AiStep => ({ op: 'goto', x, z, range, run })
const work = (act: string, dur: number, label: string, ref?: string, anim?: string): AiStep => ({ op: 'work', act, dur, label, ref, anim })

export function goalOptions(sim: Sim, h: Human): GoalOption[] {
  const v = h.vitals
  const b5 = h.big5
  const cal = sim.state.time.cal
  const hr = hourOf(cal)
  const night = isNight(cal)
  const house = houseOf(sim, h)
  const door = house ? doorOf(house) : { x: h.x, z: h.z }
  const opts: GoalOption[] = []
  const isGuard = h.profession === 'guard'
  const homeS = sim.world.settlements[h.settlementId]!
  // Caravan on the road: keeps travelling across the day, sleeps where it is (camp).
  const onTrip = h.profession === 'trader' && Math.hypot(h.x - homeS.x, h.z - homeS.z) > homeS.radius + 200
  // Companion (COMP-01/02): follows the player instead of duties, social life and wandering.
  const comp = h.companion
  // A companion far from home lives from its pack: it never walks back to eat or drink (D-NPC-6).
  const compAway = !!comp && Math.hypot(h.x - door.x, h.z - door.z) > COMPANION.awayM
  const away = onTrip || compAway

  // --- Safety ---
  const threat = threatNear(sim, h, isGuard ? 45 : 22)
  if (threat) {
    const armed = !!h.eq.main && h.age === 'adult'
    // Cornered: a faster attacker already targeting me — running is futile, an armed adult fights back.
    const cornered = armed && threat.aggroId === h.id && SPECIES[threat.species].run > RUN_SPEED_MPS
    const defends = !!comp && (comp.task === 'guard' || comp.risk === 'high' || (comp.risk === 'medium' && armed))
    const brave = isGuard || h.profession === 'hunter' || cornered || defends || (armed && b5.n < 0.35 && b5.a < 0.6)
    if (brave) {
      opts.push({ id: 'fight', score: 0.97, plan: () => ({ label: 'Fighting!', steps: [] }) })
    } else {
      opts.push({
        id: 'flee',
        score: 0.9 + b5.n * 0.1,
        plan: () => {
          const ax = h.x - threat.x
          const az = h.z - threat.z
          const d = Math.hypot(ax, az) || 1
          const away = go(h.x + (ax / d) * 35, h.z + (az / d) * 35, 2, true)
          // Near home: run inside; on the road: just get away and continue.
          const nearHome = Math.hypot(door.x - h.x, door.z - h.z) < 150
          return { label: 'Fleeing!', steps: nearHome ? [away, go(door.x, door.z, 1.5, true), work('shelter', 20, 'Hiding')] : [away, work('rest', 5, 'Catching breath')] }
        },
      })
    }
  }
  // Help downed neighbours (guards always; agreeable armed adults sometimes).
  const downed = sim.actors.query(h.x, h.z, 150).find((o): o is Human => o.kind === 'npc' && o !== h && !!o.vitals.ko && !o.vitals.dead && (o as Human).callForHelpAt !== undefined)
  if (downed && h.age === 'adult') {
    const s = isGuard ? 0.92 : h.profession === 'herbalist' ? 0.85 : 0.35 + b5.a * 0.4
    opts.push({ id: 'help', score: s, plan: () => ({ label: `Helping ${downed.name}`, steps: [go(downed.x, downed.z, 1.2, true), work('help_downed', 5, 'Tending the wounded', String(downed.id), 'kneel')] }) })
  }

  // --- Basic needs ---
  const thirstU = need(v.thirst) * 1.15 + (v.thirst < 15 ? 0.4 : 0)
  if (thirstU > 0.02) {
    opts.push({
      id: 'drink',
      score: thirstU,
      plan: () => {
        if (h.inv.items.some((s) => (s.water ?? 0) > 0)) return { label: 'Drinking from a waterskin', steps: [work('drink_skin', 2, 'Drinking')] }
        const src = waterSources(sim, h)[0]
        if (!src || (compAway && Math.hypot(src.x - h.x, src.z - h.z) > COMPANION.awayDrinkM)) return null
        return src.wellId
          ? { label: 'Going to the well', steps: [go(src.x, src.z, 1.8), work('drink_well', 4, 'Drinking water', src.wellId, 'interact')] }
          : { label: 'Fetching water', steps: [go(src.x, src.z, 1.2), work('drink_water', 4, 'Drinking from the river', `${src.x},${src.z}`, 'kneel')] }
      },
    })
  }
  const hungerU = need(v.hunger) * 1.0 + (v.hunger < 15 ? 0.35 : 0)
  if (hungerU > 0.02) {
    opts.push({
      id: 'eat',
      score: hungerU,
      plan: () => {
        if (findFood(h.inv)) return { label: 'Eating', steps: [work('eat_inv', 4, 'Having a meal', undefined, 'eat')] }
        if (compAway) return null
        if (house && householdFoodCount(sim, h) > 0) return { label: 'Going for a meal', steps: [go(door.x, door.z), work('eat_store', 6, 'Eating at home', house.id, 'eat')] }
        // Buy from a trader/household with food.
        if (h.money >= 6) {
          const seller = sim.npcsOf(h.settlementId).find((o) => (o.profession === 'trader' || o.profession === 'farmer') && o.householdId !== h.householdId && !o.vitals.dead)
          if (seller) {
            const sh = houseOf(sim, seller)
            if (sh?.inv && findFood(sh.inv)) return { label: 'Buying food', steps: [go(seller.x, seller.z, 2), work('buy_food', 5, 'Buying food', String(seller.id))] }
          }
        }
        // Last resort: warehouse of the settlement the NPC is in (home or visited).
        const here = settlementAt(sim, h.x, h.z, 300) ?? h.settlementId
        const wh = sim.building(sim.state.settlements[here]?.warehouseId)
        if (wh?.inv && findFood(wh.inv) && (v.hunger < 35 || b5.a < 0.4)) {
          const wd = doorOf(wh)
          return { label: 'Taking from the warehouse', steps: [go(wd.x, wd.z, 2), work('eat_warehouse', 5, 'Eating from the settlement stores', wh.id, 'eat')] }
        }
        return null
      },
    })
  }
  // Sleep: guards sleep by day (night duty).
  const sleepTime = isGuard ? hr >= 9 && hr < 16 : night || hr >= 22 || hr < 5
  const sleepU = sleepTime ? (v.vigor < 90 ? 0.55 + (1 - v.vigor / 100) * 0.4 : 0.25) : v.vigor < 10 ? 0.85 : 0
  if (comp) {
    const d = companionDist(sim, h)
    if (d > COMPANION.followM) opts.push({ id: 'follow', score: d > COMPANION.catchUpM ? 0.95 : 0.72, plan: () => ({ label: 'Following you', steps: [work('follow', 1e9, 'Following you')] }) })
    opts.push({ id: 'wait', score: 0.12, plan: () => ({ label: 'Waiting for you', steps: [work('rest', 8, 'Waiting')] }) })
  }
  if (sleepU > 0 && house && (!away || v.vigor < (night ? 75 : 12))) {
    opts.push({
      id: 'sleep',
      score: sleepU,
      plan: () => {
        const wake = isGuard ? 16 : 6
        const hrsLeft = ((wake - hr + 24) % 24) || 8
        const dur = Math.min(8, Math.max(1, hrsLeft)) * 150 // calendar h → gameplay s (150 s/h)
        if (away) return { label: 'Camping by the road', steps: [work('camp', dur, 'Camping by the road')] }
        return { label: 'Sleeping', steps: [go(door.x, door.z, 1.2), work('sleep', dur, 'Sleeping', house.id, 'sleep')] }
      },
    })
  }

  // --- Social (extraversion) ---
  if (!onTrip && !comp && ((hr >= 17 && hr < 23) || (v.social < 25 && !night))) {
    const s = 0.2 + b5.e * 0.3 + need(v.social) * 0.4
    const fire = settlementBuildings(sim, h.settlementId, 'campfire')[0]
    const inn = settlementBuildings(sim, h.settlementId, 'inn')[0]
    const spot = inn && b5.e > 0.6 && sim.rng.chance(0.5) ? doorOf(inn) : fire
    if (spot) {
      opts.push({
        id: 'social',
        score: v.social > 90 ? 0.05 : s,
        plan: () => {
          const a = sim.rng.range(0, Math.PI * 2)
          return { label: 'Gathering at the campfire', steps: [go(spot.x + Math.cos(a) * 3.5, spot.z + Math.sin(a) * 3.5, 0.8), work('socialize', 90 + b5.e * 90, 'Talking', undefined, 'talk')] }
        },
      })
    }
  }

  // --- Weather shelter (neuroticism raises it) ---
  if (isBadWeather(sim.weather) && house && !onTrip && !comp) {
    const inside = Math.hypot(h.x - door.x, h.z - door.z) < 3
    if (!inside) {
      const s = 0.4 + b5.n * 0.25 + (sim.weather.kind === 'storm' ? 0.2 : 0) - (isGuard ? 0.25 : 0)
      opts.push({ id: 'shelter', score: s, plan: () => ({ label: 'Sheltering from the rain', steps: [go(door.x, door.z, 1.2, true), work('shelter', 60, 'Waiting it out')] }) })
    }
  }

  // --- Duties (conscientiousness) ---
  const inWork = isGuard || onTrip || (hr >= 6 && hr < 19 && !night)
  if (comp) return opts
  if ((inWork && h.age !== 'child') || (h.age === 'child' && hr >= 9 && hr < 16)) {
    const s = (0.32 + b5.c * 0.3) * (v.vigor > 10 ? 1 : 0.3) * (h.age === 'adult' ? 1 : 0.7)
    opts.push({ id: 'work', score: s, plan: () => dutyPlan(sim, h) })
  }
  // Repair own buildings when worn (conscientious NPCs care more).
  if (house && house.durability < 55 && h.age === 'adult') {
    opts.push({ id: 'repair', score: 0.2 + b5.c * 0.35, plan: () => ({ label: 'Repairing the house', steps: [go(door.x, door.z, 1.5), work('repair', 20, 'Repairing', house.id, 'hammer')] }) })
  }
  // Surplus to warehouse (agreeableness).
  if (house?.inv && h.age === 'adult' && householdFoodCount(sim, h) > 30 + (1 - b5.a) * 20 && countItem(h.inv, 'bread') < 20) {
    opts.push({ id: 'surplus', score: 0.2 + b5.a * 0.2, plan: () => deliverSurplus(sim, h) })
  }
  // Idle wander (openness → wider).
  opts.push({
    id: 'idle',
    score: 0.06,
    plan: () => {
      const r = 6 + b5.o * 20
      const a = sim.rng.range(0, Math.PI * 2)
      return { label: 'Resting', steps: [go(door.x + Math.cos(a) * r, door.z + Math.sin(a) * r, 1), work('rest', 20 + sim.rng.next() * 30, 'Resting')] }
    },
  })
  return opts
}
