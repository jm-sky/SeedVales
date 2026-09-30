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
