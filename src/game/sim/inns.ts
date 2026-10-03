import type { InnMeal } from '../data/innMeals'
import type { Sim } from './sim'
import type { Building } from './types'
import { SPOILED_FRAC } from '../config/calibration'
import { INN_BED_PRICE, INN_MEALS } from '../data/innMeals'
import { itemDef } from '../data/items'
import { logConsume } from './eventLog'
import { removeStack } from './inventory'
/**
 * Inn meal service (economy--003): availability from the inn's real pantry, the completion transaction
 * (re-check, consume, pay the settlement treasury, restore hunger) and the shared lodging payment.
 * @domain economy
 */
import { mealPriceNow } from './market'
import { payToTreasury } from './treasury'

/** Units of an item the inn can serve: spoiled stacks are never served (no illness from the inn, review 019 #7). */
export function servable(inn: Building, id: string): number {
  const spoilH = itemDef(id).food?.spoilH ?? Infinity
  return (inn.inv?.items ?? []).reduce((n, s) => (s.id === id && (s.fresh === undefined || s.fresh > spoilH * SPOILED_FRAC) ? n + s.qty : n), 0)
}

/** Item ids the inn would use for a meal (first available alternative per slot, counting repeats), or null when a slot is missing. */
export function mealIngredients(inn: Building, meal: InnMeal): string[] | null {
  if (!inn.inv) return null
  const used = new Map<string, number>()
  const out: string[] = []
  for (const alts of meal.slots) {
    const pick = alts.find((id) => servable(inn, id) - (used.get(id) ?? 0) > 0)
    if (!pick) return null
    used.set(pick, (used.get(pick) ?? 0) + 1)
    out.push(pick)
  }
  return out
}

/** Nutrition the meal restores with the current stock (sum of the ingredients' food values). */
export const mealNutrition = (ids: readonly string[]) => ids.reduce((n, id) => n + (itemDef(id).food?.nutrition ?? 0), 0)

/** Why a meal cannot be ordered now (null = orderable). */
export function mealRefusal(sim: Sim, inn: Building, meal: InnMeal): string | null {
  if (!mealIngredients(inn, meal)) return 'The inn is out of the ingredients.'
  if (sim.player.money < mealPriceNow(sim, meal.price)) return 'Not enough money'
  return null
}

/** Completion of a meal activity: re-checks stock and money, then consumes, pays and feeds atomically. */
export function completeMeal(sim: Sim, innId: string, mealId: string): { ok: boolean; msg: string } {
  const inn = sim.building(innId)
  const meal = INN_MEALS.find((m) => m.id === mealId)
  if (!inn || !meal) return { ok: false, msg: 'The meal is no longer available.' }
  const refusal = mealRefusal(sim, inn, meal)
  if (refusal) return { ok: false, msg: refusal }
  const ids = mealIngredients(inn, meal)!
  for (const id of ids) {
    // The least fresh servable batch first (D-ITEM-1), never a spoiled one.
    const spoilH = itemDef(id).food?.spoilH ?? Infinity
    const batch = inn.inv!.items.filter((s) => s.id === id && (s.fresh === undefined || s.fresh > spoilH * SPOILED_FRAC)).sort((a, b) => (a.fresh ?? Infinity) - (b.fresh ?? Infinity))[0]!
    const taken = removeStack(inn.inv!, batch, 1)!
    logConsume(taken.id, taken.qty, 'inn_meal')
  }
  const price = mealPriceNow(sim, meal.price)
  payToTreasury(sim, inn.settlementId, sim.player, price)
  const v = sim.player.vitals
  const gain = mealNutrition(ids)
  v.hunger = Math.min(100, v.hunger + gain)
  return { ok: true, msg: `${meal.name}: +${gain} satiety (${price} c).` }
}

/** Lodging is paid to the settlement treasury (no arbitrary "innkeeper" NPC). */
export function payLodging(sim: Sim, settlementId: number): number {
  return payToTreasury(sim, settlementId, sim.player, INN_BED_PRICE)
}
