/**
 * Save compatibility: world pairing check (seed + GEN_VERSION) and save-format migrations.
 * @domain save
 */
import type { GameState } from '../sim/types'
import type { WorldData } from '../world/types'
import { SAVE_VERSION } from '../sim/types'
import { SaveError } from './errors'

/**
 * The save only stores changes against the generated world; it is valid only for the exact
 * generator version it was created with. Mismatch → explicit rejection (no silent mount).
 */
export function checkWorldCompat(st: GameState, world: Pick<WorldData, 'version' | 'seed'>): void {
  if (st.seed !== world.seed) throw new SaveError(`The save belongs to a different world (seed ${st.seed}, loaded ${world.seed}).`)
  if (st.genVersion !== world.version) {
    throw new SaveError(`The save was made with a different world generator version (v${st.genVersion}, game: v${world.version}). The world cannot be faithfully recreated — save rejected.`)
  }
}

/**
 * D-SAVE-7: no save compatibility before the first release. A save-format change bumps SAVE_VERSION without a
 * migration; older saves are rejected cleanly (the menu marks them), newer ones come from a newer game.
 */
export function migrate(st: GameState): GameState {
  if (st.saveVersion > SAVE_VERSION) throw new SaveError('The save comes from a newer version of the game.')
  if (st.saveVersion < SAVE_VERSION) {
    throw new SaveError(`The save is outdated or corrupted (format v${st.saveVersion}, game: v${SAVE_VERSION}). Saves from older versions cannot be loaded.`)
  }
  return st
}
