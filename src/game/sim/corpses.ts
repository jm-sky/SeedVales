/**
 * Corpse phases (render--010): derived from the age only, never saved. Fresh → carrion (rotting: no meat, flies and
 * a green haze in the renderer) → bones → removed by `worldSystems` at `corpseBonesAfterH`.
 * @domain sim
 */
import type { Corpse } from './types'
import { FOOD } from '../config/calibration'

export type CorpsePhase = 'fresh' | 'carrion' | 'bones'

/** Phase of a corpse at calendar time `cal` (seconds). */
export function corpsePhase(c: Pick<Corpse, 'diedAt'>, cal: number): CorpsePhase {
  const h = (cal - c.diedAt) / 3600
  return h < FOOD.corpseRotH ? 'fresh' : h < FOOD.corpseCarrionEndH ? 'carrion' : 'bones'
}
