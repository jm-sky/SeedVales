/**
 * Navigation aids (UI-04): a player-set map waypoint, quest goals, visited settlements and the bearing
 * shown by the minimap arrow. Pure sim state/logic — the map and minimap only read it.
 * @domain ui
 * @subdomain navigation
 */
import type { Sim } from './sim'
import type { Quest } from './types'
import { FOG } from '../config/calibration'
import { angleDiff } from '../core/math'

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
