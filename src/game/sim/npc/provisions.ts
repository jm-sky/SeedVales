/**
 * Caravan provisions (D-NPC-6 applied to traders): food for the road is moved into the pack at departure and at the
 * destination — from the household store, the warehouse or bought from a household — never created. Counted in nutrition points.
 * @domain npc
 * @subdomain duties
 */
import type { Sim } from '../sim'
import type { Human, Inventory } from '../types'
import { CARAVAN_PROVISIONS, CARAVAN_RETURN_NUTRITION } from '../../config/calibration'
import { itemDef } from '../../data/items'
import { logMoney, logTrade, logWork } from '../eventLog'
import { addItem, findFood, removeStack } from '../inventory'
import { houseOf } from './queries'

const storeOf = (sim: Sim, h: Human) => houseOf(sim, h)?.inv
const warehouseOf = (sim: Sim, settlementId: number) => sim.building(sim.state.settlements[settlementId]?.warehouseId)?.inv

/** Nutrition points of the ready-to-eat food in an inventory. */
export function mealValue(inv: Inventory | undefined): number {
  let n = 0
  for (const s of inv?.items ?? []) {
    const d = itemDef(s.id)
    if (d.food && d.category === 'food' && !d.food.raw) n += s.qty * d.food.nutrition
  }
  return n
}

/** Nutrition a caravan has or can still pack at home: the pack, the household store and the home warehouse. */
export function caravanFoodAvailable(sim: Sim, h: Human): number {
  return mealValue(h.inv) + mealValue(storeOf(sim, h)) + mealValue(warehouseOf(sim, h.settlementId))
}

/** Farmer/trader households of the settlement (not the trader's own) that have food to sell. */
const sellersIn = (sim: Sim, h: Human, settlementId: number) =>
  sim.npcsOf(settlementId).filter((o) => (o.profession === 'trader' || o.profession === 'farmer') && o.householdId !== h.householdId && !o.vitals.dead && !!findFood(storeOf(sim, o) ?? { items: [] }))

/** The first household to walk to for provisions and the nutrition the trader can afford from all of them. */
export function provisionSeller(sim: Sim, h: Human, settlementId = h.settlementId): { seller: Human; affordable: number } | undefined {
  const sellers = sellersIn(sim, h, settlementId)
  if (!sellers.length) return undefined
  let budget = h.money
  let affordable = 0
  for (const o of sellers) {
    for (const st of storeOf(sim, o)!.items) {
      const d = itemDef(st.id)
      if (!d.food || d.category !== 'food' || d.food.raw) continue
      const units = Math.min(st.qty, Math.floor(budget / Math.max(1, d.price)))
      budget -= units * d.price
      affordable += units * d.food.nutrition
    }
  }
  return { seller: sellers[0]!, affordable }
}

/** Moves food from `inv` into the pack until `want` nutrition points are added (whole items). Returns what is still missing. */
function takeFood(h: Human, inv: Inventory | undefined, want: number): number {
  while (inv && want > 0) {
    const f = findFood(inv)
    if (!f) break
    addItem(h.inv, removeStack(inv, f, 1)!)
    want -= itemDef(f.id).food!.nutrition
  }
  return want
}

/** Buys food from the settlement's households into the pack (trader's purse → seller, `npc_buys_food`), up to `want` nutrition points. */
export function buyProvisions(sim: Sim, h: Human, want: number, settlementId = h.settlementId) {
  for (const seller of sellersIn(sim, h, settlementId)) {
    const inv = storeOf(sim, seller)!
    while (want > 0) {
      const f = findFood(inv)
      if (!f) break
      const d = itemDef(f.id)
      if (h.money < d.price) return
      h.money -= d.price
      seller.money += d.price
      logMoney(`npc:${h.id}`, `npc:${seller.id}`, d.price, 'npc_buys_food', h.id, h.settlementId)
      logTrade(seller, { dir: 'sell_food_to_npc', item: f.id, qty: 1, price: d.price, buyer: h.id })
      logWork(seller, 'sale')
      addItem(h.inv, removeStack(inv, f, 1)!)
      want -= d.food!.nutrition
    }
    if (want <= 0) return
  }
}

/** Departure: household store first, then the home warehouse, then households (bought), up to `CARAVAN_PROVISIONS`. */
export function packCaravanProvisions(sim: Sim, h: Human) {
  let want = CARAVAN_PROVISIONS - mealValue(h.inv)
  want = takeFood(h, storeOf(sim, h), want)
  want = takeFood(h, warehouseOf(sim, h.settlementId), want)
  // Still short (nothing at home or in the warehouse): buy from the settlement's households, as at the destination.
  if (want > 0) buyProvisions(sim, h, want)
}

/** At the destination: the pack is topped up to `CARAVAN_RETURN_NUTRITION` from the visited warehouse, then from a household there. */
export function stockReturnProvisions(sim: Sim, h: Human, warehouse: { inv?: Inventory; settlementId: number }) {
  let want = CARAVAN_RETURN_NUTRITION - mealValue(h.inv)
  want = takeFood(h, warehouse.inv, want)
  if (want > 0) buyProvisions(sim, h, want, warehouse.settlementId)
}
