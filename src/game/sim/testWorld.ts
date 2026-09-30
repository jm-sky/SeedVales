/**
 * Shared test fixture: one generated world per seed (generation is ~2 s), fresh state per call.
 * @domain test
 */
import type { WorldData } from '../world/types'
import { generateWorld } from '../world/gen/generate'
import { createNewGame } from './newGame'
import { Sim } from './sim'
import { installSystems } from './worldSystems'

const worlds = new Map<number, WorldData>()

export function testSim(seed = 1337): Sim {
  let w = worlds.get(seed)
  if (!w) worlds.set(seed, (w = generateWorld(seed)))
  const sim = new Sim(w, createNewGame(w))
  installSystems(sim)
  return sim
}

/** Advance simulation by gameplay seconds in fixed frames. */
export function run(sim: Sim, seconds: number, frame = 0.1) {
  for (let t = 0; t < seconds; t += frame) sim.step(frame * sim.timeScale)
}
