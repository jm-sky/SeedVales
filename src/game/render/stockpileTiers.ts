/**
 * Stockpile tiers (render--009): which pile model a stock of goods shows. Pure, read-only on inventories.
 * Thresholds are calibration in one table (the tier is the highest threshold ≤ count; 0 = nothing shown).
 * @domain render
 * @subdomain structures
 */
import type { Inventory } from '../sim/types'
import { itemDef } from '../data/items'

export type PileKind = 'firewood' | 'stone' | 'grain' | 'food'

/** Counts (weighted) at which the model changes; must match the tiers built by scripts/assets/blender-stockpiles.py. */
export const PILE_TIERS: Record<PileKind, readonly number[]> = {
  firewood: [1, 5, 7, 14, 20],
  stone: [1, 6, 15, 30],
  grain: [1, 5, 15, 30],
  food: [1, 8, 20, 40],
}

export const pileNode = (kind: PileKind, tier: number) => `pile_${kind}_${tier}`

/** Highest tier threshold ≤ count, or 0 when below the first. */
export function tierOf(kind: PileKind, count: number): number {
  let t = 0
  for (const th of PILE_TIERS[kind]) if (count >= th) t = th
  return t
}

/** Weighted count of one pile kind in an inventory (a log counts as 4 branches' worth of wood). */
export function pileCount(kind: PileKind, inv: Inventory): number {
  let n = 0
  for (const s of inv.items) {
    switch (kind) {
      case 'firewood':
        n += s.id === 'log' ? s.qty * 4 : s.id === 'branch' ? s.qty : 0
        break
      case 'food':
        n += itemDef(s.id).category === 'food' ? s.qty : 0
        break
      case 'grain':
        n += s.id === 'grain' ? s.qty : 0
        break
      case 'stone':
        n += s.id === 'stone' || s.id === 'rock_chunk' ? s.qty : 0
        break
    }
  }
  return n
}
