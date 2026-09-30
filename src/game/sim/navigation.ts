/**
 * Navigation aids (UI-04): a player-set map waypoint, quest goals, visited settlements and the bearing
 * shown by the minimap arrow. Pure sim state/logic — the map and minimap only read it.
 * @domain ui
 * @subdomain navigation
 */
import type { Sim } from './sim'
import type { Quest } from './types'
import { angleDiff } from '../core/math'

export interface NavGoal {
  x: number
  z: number
  label: string
  kind: 'waypoint' | 'quest'
}

/** Distance (m) from a settlement's edge within which it counts as visited. */
const DISCOVER_M = 60

export function setWaypoint(sim: Sim, x: number, z: number, label = 'Znacznik'): string {
  const size = sim.world.size
  sim.state.px.waypoint = { x: Math.max(0, Math.min(size, x)), z: Math.max(0, Math.min(size, z)), label }
  return `Wyznaczono cel: ${label}`
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
  for (const q of sim.state.quests) if (q.status === 'active') return questGoal(sim, q)
  return null
}

/** Distance and angle of the goal relative to the view direction (0 = straight ahead, + = right). */
export function bearing(from: { x: number; z: number }, to: { x: number; z: number }, yaw: number): { dist: number; rel: number } {
  const dx = to.x - from.x
  const dz = to.z - from.z
  return { dist: Math.hypot(dx, dz), rel: angleDiff(yaw, Math.atan2(dx, dz)) }
}

export const isVisited = (sim: Sim, settlementId: number) => !!sim.state.px.visited?.includes(settlementId)

/** Marks settlements the player has reached; a reached waypoint is cleared (system, low cadence). */
export function navigationSystem(sim: Sim) {
  const p = sim.player
  const px = sim.state.px
  for (const s of sim.world.settlements) {
    if (px.visited?.includes(s.id)) continue
    if (Math.hypot(s.x - p.x, s.z - p.z) < s.radius + DISCOVER_M) (px.visited ??= []).push(s.id)
  }
  if (px.waypoint && Math.hypot(px.waypoint.x - p.x, px.waypoint.z - p.z) < 12) {
    sim.message(`Dotarłeś do celu: ${px.waypoint.label}.`)
    px.waypoint = undefined
  }
}
