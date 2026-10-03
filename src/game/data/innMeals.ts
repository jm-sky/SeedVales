/**
 * Inn meals (economy--003): service recipes over the inn's real pantry. Each slot lists alternatives; the meal's
 * nutrition is the sum of the consumed items' own `FoodStats.nutrition` (no hidden multiplier).
 * @domain economy
 */
export interface InnMeal {
  id: string
  name: string
  /** One alternative list per ingredient slot (the first available in the inn's stock is used). */
  slots: readonly (readonly string[])[]
  price: number
  /** Gameplay seconds of eating. */
  eatS: number
}

export const INN_MEALS: readonly InnMeal[] = [
  { id: 'meal_simple', name: 'Simple meal', slots: [['bread', 'salted_meat'], ['cabbage', 'carrot', 'fermented_cabbage']], price: 6, eatS: 5 },
  { id: 'meal_hearty', name: 'Hearty meal', slots: [['bread', 'fermented_cabbage'], ['dried_meat', 'salted_meat']], price: 12, eatS: 6 },
  { id: 'meal_good', name: 'Good meal', slots: [['bread', 'fermented_cabbage'], ['dried_meat', 'salted_meat', 'cooked_meat'], ['cabbage', 'carrot', 'fermented_cabbage']], price: 20, eatS: 8 },
]

/** Lodging price (copper) — paid to the settlement treasury like meals. */
export const INN_BED_PRICE = 8

/** Starting pantry of an inn by settlement size (finite; no refill in this slice). */
export const INN_PANTRY: Record<'SM' | 'MD' | 'LG', readonly (readonly [string, number])[]> = {
  SM: [['bread', 4], ['dried_meat', 3], ['cabbage', 3], ['salt', 1]],
  MD: [['bread', 10], ['dried_meat', 6], ['cabbage', 6], ['fermented_cabbage', 4], ['salted_meat', 3], ['carrot', 4], ['salt', 3]],
  LG: [['bread', 18], ['dried_meat', 10], ['cabbage', 10], ['fermented_cabbage', 8], ['salted_meat', 6], ['carrot', 6], ['cooked_meat', 4], ['salt', 5]],
}

/** Emergency preserves some households keep (deterministic by seed + household id; ~half of the homes). */
export const HOUSEHOLD_RESERVE_SHARE = 0.5
export const HOUSEHOLD_RESERVES: Record<string, readonly (readonly [string, number])[]> = {
  hunter: [['dried_meat', 3], ['salted_meat', 2]],
  woodcutter: [['dried_meat', 3]],
  guard: [['dried_meat', 2], ['salted_meat', 2]],
  farmer: [['fermented_cabbage', 3], ['cabbage', 2]],
  trader: [['dried_meat', 2], ['salted_meat', 1], ['fermented_cabbage', 2]],
  herbalist: [['fermented_cabbage', 2]],
  blacksmith: [['dried_meat', 2]],
  shepherd: [['salted_meat', 2], ['dried_meat', 1]],
}
