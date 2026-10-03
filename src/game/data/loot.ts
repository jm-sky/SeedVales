/**
 * Treasure tables (LOOT-01): weighted valuables for buried treasure beside landmarks and, rarely, in the belly of a
 * butchered predator. Contents are rolled from a seed derived from world seed + spot id (never from the sim RNG stream).
 * @domain items
 */

export interface TreasureEntry {
  item: string
  qty: readonly [min: number, max: number]
  weight: number
  /** Minimum site richness (0..2) that can yield it. */
  minRichness: number
  /** Craft quality of the stack (weapons). */
  q?: number
}

export const TREASURE_TABLE: readonly TreasureEntry[] = [
  { item: 'gold_ring', qty: [1, 1], weight: 30, minRichness: 0 },
  { item: 'ruby', qty: [1, 1], weight: 14, minRichness: 0 },
  { item: 'emerald', qty: [1, 1], weight: 12, minRichness: 1 },
  { item: 'diamond', qty: [1, 1], weight: 5, minRichness: 1 },
  { item: 'obsidian_dagger', qty: [1, 1], weight: 6, minRichness: 1, q: 3 },
  { item: 'damascus_dagger', qty: [1, 1], weight: 3, minRichness: 2, q: 3 },
]

/** Copper coins in a purse: the other half of the loot weight. */
export const TREASURE_COINS = { weight: 40, min: 15, max: 90, richnessMul: [1, 1.8, 3] as const }

/** Richness by landmark kind (more elaborate ruins hide more). */
export const LANDMARK_RICHNESS: Record<string, number> = { stone_circle: 1, house_ruin: 0, estate_ruin: 2, shipwreck: 2, boat_wreck: 0 }

/** Chance that a butchered large predator carries a gem or ring in its belly. */
export const BELLY_LOOT_CHANCE = 0.04
export const BELLY_SPECIES: readonly string[] = ['wolf', 'bear', 'boar']

/** Spots per landmark kind (position and contents derive from the seed). */
export const TREASURE_SPOTS_PER_LANDMARK: Record<string, number> = { stone_circle: 1, house_ruin: 1, estate_ruin: 2, shipwreck: 1, boat_wreck: 1 }
