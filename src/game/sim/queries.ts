/**
 * Small shared spatial helpers over the actor index (PERF-01: systems query in range, never scan
 * all animals per building/settlement).
 * @domain sim
 * @subdomain spatial
 */
import type { SpeciesId } from '../data/species'
import type { Sim } from './sim'
import type { Animal } from './types'

/** Living animals of a species within r of (x, z). */
export function animalsNear(sim: Sim, x: number, z: number, r: number, species: SpeciesId): Animal[] {
  const out: Animal[] = []
  for (const a of sim.actors.query(x, z, r)) if (a.kind === 'animal' && (a as Animal).species === species && !a.vitals.dead) out.push(a as Animal)
  return out
}

export const countNear = (sim: Sim, x: number, z: number, r: number, species: SpeciesId) => animalsNear(sim, x, z, r, species).length

/** Tag linking rats to the rat nest of a building (rats roam and flee, but belong to their nest). */
export const nestTag = (buildingId: string) => `nest:${buildingId}`

/** Living animals per den/nest tag — one pass over animals per system run (not per den). */
export function countByDen(sim: Sim): Map<string, number> {
  const m = new Map<string, number>()
  for (const a of sim.state.animals) if (a.denId && !a.vitals.dead) m.set(a.denId, (m.get(a.denId) ?? 0) + 1)
  return m
}
