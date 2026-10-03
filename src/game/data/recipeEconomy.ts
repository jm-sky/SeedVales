/**
 * Recipe economy audit data (review 013 M-10, audit B): economy class per recipe, accepted output/input base-price
 * ratio per class and the explicit, commented exceptions. Checked by `itemAudit.test.ts`; `pnpm audit:recipes`
 * prints the table. Documents the economy — it does not recalibrate prices (deferred to the L3 economy pass).
 * @domain crafting
 */
import { itemDef } from './items'
import { RECIPES } from './recipes'

export type RecipeClass = 'processing' | 'cheap-craft' | 'smithing' | 'leather' | 'construction'

/** Accepted output/input base-price ratio per recipe class (documented, derived from the catalogue as of this audit). */
export const RATIO_BANDS: Record<RecipeClass, [number, number]> = {
  // Cloth, rope, ingots, bandages, food: transformations that may lose a little or gain from labour/cooking.
  processing: [0.5, 3.0],
  // Branch/stone based items: raw material is nearly free, the price is mostly labour.
  // short_bow (branch + rope → 45 c, a skilled craft) is the high end at 3.75.
  'cheap-craft': [0.5, 4.0],
  // Iron goods: input is the expensive ingot; output close to the ingot value, never wildly above.
  smithing: [0.6, 1.5],
  // Hide goods: hides are expensive relative to simple leather items.
  leather: [0.35, 1.3],
  // Carts (wood + iron): assembly loses some value, never gains.
  construction: [0.5, 1.0],
}

export const CLASS_OF: Record<string, RecipeClass> = {
  torch: 'processing', bandage: 'processing', salve: 'processing', herbal_tea: 'processing', dry_meat: 'processing', stew: 'processing',
  bread: 'processing', rope: 'processing', cloth: 'processing', iron_ingot: 'processing',
  club: 'cheap-craft', staff: 'cheap-craft', short_bow: 'cheap-craft', long_bow: 'cheap-craft', arrows: 'cheap-craft', arrows_bodkin: 'cheap-craft', spear: 'cheap-craft',
  bucket: 'cheap-craft', wooden_shield: 'cheap-craft', whetstone: 'cheap-craft',
  sling: 'leather', sling_stones: 'cheap-craft',
  leather_jerkin: 'leather', leather_cap: 'leather', leather_boots: 'leather', leather_gloves: 'leather', furs: 'leather',
  waterskin_s: 'leather', waterskin_m: 'leather', waterskin_l: 'leather',
  knife: 'smithing', dagger: 'smithing', war_hammer: 'smithing', pan: 'smithing', pot: 'smithing', axe: 'smithing', shovel: 'smithing', pickaxe: 'smithing', sword: 'smithing', short_sword: 'smithing',
  hammer: 'smithing', big_axe: 'smithing', iron_helm: 'smithing', chainmail: 'smithing',
  wheelbarrow: 'construction', handcart: 'construction',
}

/**
 * Explicit exceptions (recipe → reason). They are outside their class band on purpose or because the catalogue
 * price is an outlier; fixing prices is the economy calibration pass (later backlog L3), not this audit.
 */
export const EXCEPTIONS: Record<string, string> = {
  knife: 'one iron ingot (30 c) for an 8 c knife: the knife price is the catalogue floor price for a starting tool; ratio 0.26',
  sling: 'hide + rope (25 c) for a 5 c sling: sling price is a cheap-toy outlier; ratio 0.2',
  sling_stones: 'sling stones are free ammunition (price 0, a deliberate sink for 1 stone); ratio 0',
}

const value = (id: string, qty: number) => itemDef(id).price * qty

export const recipeEconomy = () =>
  RECIPES.map((r) => {
    const input = r.inputs.reduce((s, i) => s + value(i.item, i.qty), 0)
    const output = value(r.output.item, r.output.qty)
    return { id: r.id, cls: CLASS_OF[r.id], input, output, ratio: input > 0 ? output / input : Infinity }
  })
