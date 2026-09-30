/**
 * Save/load failure with a player-facing message (never silently replaced by a new game).
 * @domain save
 */
export class SaveError extends Error {
  override name = 'SaveError'
}
