/**
 * Market days (P-01 first slice): every MARKET.everyDays-th day, from MARKET.fromH to MARKET.toH, the settlements'
 * markets are busy — traders sell a bit cheaper, pay a bit more, and the inn serves meals at a discount.
 * Pure calendar rule (no NPC schedule override yet); money still moves only between the usual parties.
 * @domain sim
 */
import type { Sim } from './sim'
import { dayIndex, hourOf } from './time'

export const MARKET = { everyDays: 7, offset: 6, fromH: 8, toH: 18, buyMul: 0.92, sellMul: 1.1, mealMul: 0.8 } as const

/** Is the market open at this calendar time? */
export function marketOpenAt(cal: number): boolean {
  const h = hourOf(cal)
  return dayIndex(cal) % MARKET.everyDays === MARKET.offset && h >= MARKET.fromH && h < MARKET.toH
}

export const isMarketDay = (sim: Sim) => marketOpenAt(sim.state.time.cal)

/** Price of an inn meal today. */
export const mealPriceNow = (sim: Sim, base: number) => (isMarketDay(sim) ? Math.max(1, Math.round(base * MARKET.mealMul)) : base)
