/**
 * World queries used by NPC planning (nearest water, household buildings, threats…).
 * @domain npc
 */
import type { ResNode } from '../../world/nodes'
import type { Sim } from '../sim'
import type { Animal, Building, Human } from '../types'
import { SPECIES } from '../../data/species'
import { isTree } from '../../world/nodes'
import { nodeAvailable, waterRisk } from '../actions'
import { isDown } from '../combat'

export function household(sim: Sim, h: Human) {
  return sim.state.households[h.householdId]
}

export function houseOf(sim: Sim, h: Human): Building | undefined {
  const hh = household(sim, h)
  return hh ? sim.building(hh.houseId) : undefined
}

export function householdBuilding(sim: Sim, h: Human, kind: Building['kind']): Building | undefined {
  return sim.state.buildings.find((b) => b.householdId === h.householdId && b.kind === kind)
}

export function settlementBuildings(sim: Sim, sid: number, kind: Building['kind']): Building[] {
  return sim.state.buildings.filter((b) => b.settlementId === sid && b.kind === kind)
}

/** Door point in front of a building (local +z side). */
export function doorOf(b: Building): { x: number; z: number } {
  return { x: b.x + Math.sin(b.rot) * (b.hd + 1), z: b.z + Math.cos(b.rot) * (b.hd + 1) }
}

export interface WaterSource {
  x: number
  z: number
  safe: boolean
  wellId?: string
  cost: number
}

/** Cached natural water access points per settlement (bank points with shallow water). */
const waterCache = new WeakMap<Sim, Map<string, { x: number; z: number } | null>>()

export function nearestNaturalWater(sim: Sim, x: number, z: number, maxR = 400): { x: number; z: number } | null {
  let cache = waterCache.get(sim)
  if (!cache) waterCache.set(sim, (cache = new Map()))
  const key = `${Math.round(x / 48)},${Math.round(z / 48)}`
  if (cache.has(key)) return cache.get(key)!
  let found: { x: number; z: number } | null = null
  const t = sim.terrain
  for (let r = 8; r <= maxR && !found; r += 8) {
    const n = Math.max(8, Math.floor((r * Math.PI * 2) / 8))
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const px = x + Math.cos(a) * r
      const pz = z + Math.sin(a) * r
      const d = t.waterDepthAt(px, pz)
      if (d > 0.05 && d < 0.6 && !t.isSeaAt(px, pz)) {
        found = { x: px, z: pz }
        break
      }
    }
  }
  cache.set(key, found)
  return found
}

export function waterSources(sim: Sim, h: Human): WaterSource[] {
  const out: WaterSource[] = []
  for (const b of sim.buildingsNear(h.x, h.z, 300)) {
    if (b.kind !== 'well') continue
    out.push({ x: b.x, z: b.z, safe: true, wellId: b.id, cost: Math.hypot(b.x - h.x, b.z - h.z) })
  }
  const nat = nearestNaturalWater(sim, h.x, h.z)
  if (nat) {
    const risk = waterRisk(sim, nat.x, nat.z)
    out.push({ x: nat.x, z: nat.z, safe: false, cost: Math.hypot(nat.x - h.x, nat.z - h.z) + risk * 150 * (0.5 + h.big5.n) })
  }
  return out.sort((a, b) => a.cost - b.cost)
}

/** Hostile animals near (attacking or predators/aggressive species close by). */
export function threatNear(sim: Sim, h: Human, r = 22): Animal | null {
  let best: Animal | null = null
  let bd = Infinity
  for (const a of sim.actors.query(h.x, h.z, r)) {
    if (a.kind !== 'animal' || isDown(sim, a)) continue
    const sp = SPECIES[a.species]
    const hostile = a.aggroId === h.id || a.rabid || (sp.temperament === 'predator' && a.variant !== 'young') || (sp.temperament === 'aggressive' && a.aggroId !== undefined)
    if (!hostile) continue
    const d = Math.hypot(a.x - h.x, a.z - h.z)
    if (d < bd) {
      bd = d
      best = a
    }
  }
  return best
}

export function nearestAvailableNode(
  sim: Sim,
  x: number,
  z: number,
  r: number,
  pred: (n: ResNode) => boolean,
  minDistFromSettlement = 0,
): ResNode | null {
  let best: ResNode | null = null
  let bd = Infinity
  const sets = sim.world.settlements
  for (const n of sim.nodes.query(x, z, r)) {
    if (!pred(n)) continue
    if (isTree(n.kind) ? sim.state.nodes[n.id]?.kind === 'felled' : !nodeAvailable(sim, n)) continue
    if (minDistFromSettlement && sets.some((s) => Math.hypot(s.x - n.x, s.z - n.z) < s.radius + minDistFromSettlement)) continue
    const d = (n.x - x) ** 2 + (n.z - z) ** 2
    if (d < bd) {
      bd = d
      best = n
    }
  }
  return best
}
