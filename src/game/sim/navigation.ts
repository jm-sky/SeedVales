/**
 * Navigation aids (UI-04): a player-set map waypoint, quest goals, visited settlements and the bearing
 * shown by the minimap arrow. Pure sim state/logic — the map and minimap only read it.
 * @domain ui
 * @subdomain navigation
 */
import type { Sim } from './sim'
import type { Quest } from './types'
import { CALENDAR_SPEED, FOG, NEEDS, WALK_SPEED_MPS } from '../config/calibration'
import { angleDiff } from '../core/math'
import { itemDef } from '../data/items'

export interface NavGoal {
  x: number
  z: number
  label: string
  kind: 'waypoint' | 'quest'
}

/** Distance (m) from a settlement's edge within which it counts as visited. */
const DISCOVER_M = 60

export function setWaypoint(sim: Sim, x: number, z: number, label = 'Marker'): string {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return ''
  const size = sim.world.size
  sim.state.px.waypoint = { x: Math.max(0, Math.min(size, x)), z: Math.max(0, Math.min(size, z)), label }
  return `Waypoint set: ${label}`
}

export const MAX_PINS = 20

/** Drops a note at the player's position (P-08); the label is trimmed, empty → "Note N". */
export function addPin(sim: Sim, label: string): string {
  const px = sim.state.px
  const pins = (px.pins ??= [])
  if (pins.length >= MAX_PINS) return `You can keep at most ${MAX_PINS} map notes.`
  const p = sim.player
  const id = pins.reduce((m, q) => Math.max(m, q.id), 0) + 1
  const text = label.trim().slice(0, 24) || `Note ${id}`
  pins.push({ id, x: p.x, z: p.z, label: text })
  return `Map note added: ${text}`
}

export function removePin(sim: Sim, id: number) {
  const px = sim.state.px
  if (px.pins) px.pins = px.pins.filter((q) => q.id !== id)
}

export function clearWaypoint(sim: Sim) {
  sim.state.px.waypoint = undefined
}

/** Where an active quest leads: the nest building (rats) or the threatened settlement (wolves). */
export function questGoal(sim: Sim, q: Quest): NavGoal | null {
  const b = q.buildingId ? sim.building(q.buildingId) : undefined
  if (b) return { x: b.x, z: b.z, label: q.title, kind: 'quest' }
  const s = sim.world.settlements[q.settlementId]
  return s ? { x: s.x, z: s.z, label: q.title, kind: 'quest' } : null
}

/** Current navigation goal: the player's waypoint, else the first active quest. */
export function navGoal(sim: Sim): NavGoal | null {
  const w = sim.state.px.waypoint
  if (w) return { ...w, kind: 'waypoint' }
  for (const q of sim.state.quests) {
    const g = q.status === 'active' ? questGoal(sim, q) : null
    if (g) return g
  }
  return null
}

/** Distance and angle of the goal relative to the view direction (0 = straight ahead, + = right). */
export function bearing(from: { x: number; z: number }, to: { x: number; z: number }, yaw: number): { dist: number; rel: number } {
  const dx = to.x - from.x
  const dz = to.z - from.z
  return { dist: Math.hypot(dx, dz), rel: angleDiff(yaw, Math.atan2(dx, dz)) }
}

/** Walking detour over the straight line 🟡 (roads and relief); the estimate is a guide, not a promise. */
const JOURNEY_DETOUR = 1.25

export interface JourneyEstimate {
  km: number
  /** Calendar hours on foot at walking speed. */
  hours: number
  /** Hunger and thirst the walk costs (points). */
  hungerCost: number
  thirstCost: number
  /** Hunger points the pack's ready food restores, and drinks in the waterskins. */
  foodPoints: number
  drinks: number
  /** True when the pack covers the walk's hunger and thirst. */
  covered: boolean
}

/** What a trip to `to` costs on foot and what the player carries against it (journey provisions, proposal P-05). */
export function journeyEstimate(sim: Sim, to: { x: number; z: number }): JourneyEstimate {
  const p = sim.player
  const dist = Math.hypot(to.x - p.x, to.z - p.z) * JOURNEY_DETOUR
  const hours = ((dist / WALK_SPEED_MPS) * CALENDAR_SPEED) / 3600
  let foodPoints = 0
  let drinks = 0
  for (const s of p.inv.items) {
    const d = itemDef(s.id)
    if (d.food && d.category === 'food' && !d.food.raw) foodPoints += s.qty * d.food.nutrition
    if (d.waterCapacity) drinks += s.water ?? 0
  }
  const hungerCost = hours * NEEDS.hungerDrainPerH
  const thirstCost = hours * NEEDS.thirstDrainPerH
  // Drinks restore ~30 thirst each (Game.useItem); the player starts with what they have now.
  const covered = p.vitals.hunger + foodPoints > hungerCost + 10 && p.vitals.thirst + drinks * 30 > thirstCost + 10
  return { km: dist / 1000, hours, hungerCost, thirstCost, foodPoints, drinks, covered }
}

/** Cells per side of the fog-of-war grid. */
export const fogSide = (sim: Sim) => Math.ceil(sim.world.size / FOG.cellM)

export function isExploredCell(sim: Sim, cx: number, cz: number): boolean {
  const n = fogSide(sim)
  if (cx < 0 || cz < 0 || cx >= n || cz >= n) return false
  const i = cz * n + cx
  return ((sim.state.px.explored?.[i >>> 5] ?? 0) & (1 << (i & 31))) !== 0
}

export const isExplored = (sim: Sim, x: number, z: number) => isExploredCell(sim, Math.floor(x / FOG.cellM), Math.floor(z / FOG.cellM))

/** Reveals map cells within FOG.revealM of the player (persistent discovery). Returns cells newly revealed. */
export function revealAround(sim: Sim): number {
  const n = fogSide(sim)
  const px = sim.state.px
  const words = (px.explored ??= new Array(Math.ceil((n * n) / 32)).fill(0))
  const p = sim.player
  const r = FOG.revealM
  let added = 0
  for (let cz = Math.max(0, Math.floor((p.z - r) / FOG.cellM)); cz <= Math.min(n - 1, Math.floor((p.z + r) / FOG.cellM)); cz++) {
    for (let cx = Math.max(0, Math.floor((p.x - r) / FOG.cellM)); cx <= Math.min(n - 1, Math.floor((p.x + r) / FOG.cellM)); cx++) {
      const dx = Math.max(0, Math.abs((cx + 0.5) * FOG.cellM - p.x) - FOG.cellM / 2)
      const dz = Math.max(0, Math.abs((cz + 0.5) * FOG.cellM - p.z) - FOG.cellM / 2)
      if (dx * dx + dz * dz > r * r) continue
      const i = cz * n + cx
      const bit = 1 << (i & 31)
      if (!(words[i >>> 5]! & bit)) {
        words[i >>> 5] = words[i >>> 5]! | bit
        added++
      }
    }
  }
  return added
}

export const isVisited = (sim: Sim, settlementId: number) => !!sim.state.px.visited?.includes(settlementId)

/** MAP-01: the single "known settlement" predicate (explored cell or visited) for map canvas, side list, waypoint and autopilot. */
export function isKnownSettlement(sim: Sim, settlementId: number): boolean {
  const s = sim.world.settlements[settlementId]
  return !!s && (isVisited(sim, settlementId) || isExplored(sim, s.x, s.z))
}

export const knownSettlements = (sim: Sim) => sim.world.settlements.filter((s) => isKnownSettlement(sim, s.id))

const UNKNOWN_PLACE = 'You have not heard of that place yet.'

/** Waypoint on a settlement; refused while the settlement is unknown (MAP-01). */
export function waypointToSettlement(sim: Sim, settlementId: number): string {
  if (!isKnownSettlement(sim, settlementId)) return UNKNOWN_PLACE
  const s = sim.world.settlements[settlementId]!
  return setWaypoint(sim, s.x, s.z, s.name)
}

/** Autopilot along the road towards a known settlement (no teleport). Returns the message to show. */
export function autopilotToSettlement(sim: Sim, settlementId: number): string {
  if (!isKnownSettlement(sim, settlementId)) return UNKNOWN_PLACE
  const p = sim.player
  for (const r of sim.world.roads) {
    if (r.from !== settlementId && r.to !== settlementId) continue
    let bi = -1
    let bd = Infinity
    r.points.forEach((pt, i) => {
      const d = Math.hypot(pt.x - p.x, pt.z - p.z)
      if (d < bd) {
        bd = d
        bi = i
      }
    })
    if (bd > 80) continue
    const dir: 1 | -1 = r.to === settlementId ? 1 : -1
    sim.state.px.autopilot = { roadId: r.id, idx: bi, dir }
    return `Autopilot: road to ${sim.world.settlements[settlementId]!.name} (${Math.round(r.length)} m). Move or press Esc to stop.`
  }
  return 'You must be standing on a road leading to this settlement.'
}

/** Reveals the map around the player, marks settlements reached, clears a reached waypoint (low cadence). */
export function navigationSystem(sim: Sim) {
  const p = sim.player
  const px = sim.state.px
  revealAround(sim)
  for (const s of sim.world.settlements) {
    if (px.visited?.includes(s.id)) continue
    if (Math.hypot(s.x - p.x, s.z - p.z) < s.radius + DISCOVER_M) (px.visited ??= []).push(s.id)
  }
  if (px.waypoint && Math.hypot(px.waypoint.x - p.x, px.waypoint.z - p.z) < 12) {
    sim.message(`You have reached your destination: ${px.waypoint.label}.`)
    px.waypoint = undefined
  }
}
