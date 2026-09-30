/**
 * Snapshot: GameState plus transient simulation structures (terrain edits, rng) as a detached
 * copy for saving — the live state is not mutated. Deliberately not saved (D-SAVE-3): arrows in
 * flight, system interval accumulators, camera, open UI panel/toast, diagnostics.
 * @domain save
 */
import type { Sim } from '../sim/sim'
import type { GameState } from '../sim/types'

export function snapshot(sim: Sim): GameState {
  return { ...sim.state, terrainEdits: sim.terrain.edits.toJSON(), rng: sim.rng.state }
}

/** Deep clone via JSON (what goes to disk) — used by tests to simulate reload. */
export function roundTrip(sim: Sim): GameState {
  return JSON.parse(JSON.stringify(snapshot(sim))) as GameState
}
