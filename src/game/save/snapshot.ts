/**
 * Snapshot: sync transient simulation structures (terrain edits) into GameState before saving,
 * and restore after loading.
 * @domain save
 */
import type { Sim } from '../sim/sim'
import type { GameState } from '../sim/types'

export function snapshot(sim: Sim): GameState {
  sim.state.terrainEdits = sim.terrain.edits.toJSON()
  sim.state.rng = sim.rng.state
  return sim.state
}

/** Deep clone via JSON (what goes to disk) — used by tests to simulate reload. */
export function roundTrip(sim: Sim): GameState {
  return JSON.parse(JSON.stringify(snapshot(sim))) as GameState
}
