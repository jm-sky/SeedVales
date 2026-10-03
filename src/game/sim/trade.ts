import type { ActionResult } from './actions'
import type { Sim } from './sim'
import type { Human, Inventory, ItemStack } from './types'
import { TRADE } from '../config/calibration'
import { itemDef } from '../data/items'
import { PROFESSIONS } from '../data/professions'
import { train } from './actions'
import { logMoney, logTrade } from './eventLog'
import { countGoodwill, goodwillToday } from './gifts'
import { addItem, countItem, fitQty, qualityMult, removeStack } from './inventory'
/**
 * Trade (TRADE-02): any NPC sells its surplus — household store and own pack — minus what the household
 * needs (food reserve per member, work kit, wielded/worn gear). Children trade only from their pack; prices depend on base price, quality, NPC agreeableness,
 * individual sympathy, settlement honesty reputation, trade skill and local stock. Money is conserved.
 * @domain economy
 */
import { isMarketDay, MARKET } from './market'
import { doorOf, household, houseOf } from './npc/queries'
import { priceMult } from './priceMods'
import { questEvent } from './questHooks'

/**
 * The household store the NPC trades from, or undefined: children trade from their pack, and so does an NPC
 * away from home (e.g. a companion on the road) — the store is not a remote stash (review 006 #6).
 */
function tradeStore(sim: Sim, npc: Human): Inventory | undefined {
  if (npc.age === 'child') return undefined
  const house = houseOf(sim, npc)
  if (!house?.inv) return undefined
  const door = doorOf(house)
  return Math.hypot(npc.x - door.x, npc.z - door.z) <= TRADE.homeReachM ? house.inv : undefined
}

/** Where goods bought from the player go: the household store when at home, otherwise the NPC's own pack. */
export function tradeInventory(sim: Sim, npc: Human): Inventory {
  return tradeStore(sim, npc) ?? npc.inv
}

export interface StockEntry {
  stack: ItemStack
  /** Units the NPC is willing to sell from this stack. */
  max: number
}

/**
 * What the NPC can sell: own pack first, then the household store. Kept back: the household work kit
 * (profession `kit`), food for `TRADE.foodReservePerMember` meals per member, one waterskin.
 */
export function tradeStock(sim: Sim, npc: Human): StockEntry[] {
  const hh = household(sim, npc)
  const keep = new Map<string, number>()
  for (const k of hh ? PROFESSIONS[hh.profession].kit : []) keep.set(k.item, (keep.get(k.item) ?? 0) + k.qty)
  let food = (hh?.memberIds.length ?? 1) * TRADE.foodReservePerMember
  let skin = 1
  const out: StockEntry[] = []
  const store = tradeStore(sim, npc)
  for (const inv of store && store !== npc.inv ? [npc.inv, store] : [npc.inv]) {
    for (const s of inv.items) {
      const d = itemDef(s.id)
      if (d.price <= 0) continue
      let max = s.qty
      const k = keep.get(s.id) ?? 0
      if (k > 0) {
        const kept = Math.min(k, max)
        keep.set(s.id, k - kept)
        max -= kept
      }
      if (d.food && food > 0) {
        const kept = Math.min(food, max)
        food -= kept
        max -= kept
      }
      if (d.waterCapacity && skin > 0 && max > 0) {
        skin--
        max--
      }
      if (max > 0) out.push({ stack: s, max })
    }
  }
  return out
}

function stockOf(sim: Sim, npc: Human, stack: ItemStack): { inv: Inventory; max: number } | undefined {
  const e = tradeStock(sim, npc).find((x) => x.stack === stack)
  if (!e) return undefined
  return { inv: npc.inv.items.includes(stack) ? npc.inv : tradeStore(sim, npc)!, max: e.max }
}

function mood(sim: Sim, npc: Human): number {
  const rep = sim.state.settlements[npc.settlementId]?.rep
  return npc.opinion * 0.002 + (rep ? (rep.honesty + rep.helpfulness) * 0.0015 : 0) + (npc.big5.a - 0.5) * 0.2
}

/** Price the player pays the NPC for one unit. */
export function buyPrice(sim: Sim, npc: Human, s: ItemStack): number {
  const d = itemDef(s.id)
  const inv = tradeInventory(sim, npc)
  const stock = countItem(inv, s.id) + (inv === npc.inv ? 0 : countItem(npc.inv, s.id))
  const scarcity = stock > 10 ? TRADE.plentyScarcity : stock <= 1 ? 1.15 : 1
  const m = 1.3 - sim.player.skills.trade * 0.002 - mood(sim, npc)
  return Math.max(1, Math.round(d.price * qualityMult(s) * scarcity * Math.min(1.8, Math.max(TRADE.minBuyMul, m)) * marketBuyMul(sim, npc, s.id)))
}

/** The cheapest this stack could ever be bought for (plenty of stock, best mood and skill). */
const lowestBuyPrice = (sim: Sim, npc: Human, s: ItemStack) => Math.max(1, Math.round(itemDef(s.id).price * qualityMult(s) * TRADE.plentyScarcity * TRADE.minBuyMul * marketBuyMul(sim, npc, s.id)))

/** Market-day factors (P-01): buying is cheaper; the sell bonus stays under the cheapest buy price (no arbitrage). */
const marketBuyMul = (sim: Sim, npc: Human, id: string) => (isMarketDay(sim) ? MARKET.buyMul : 1) * priceMult(sim, npc.settlementId, id)
const marketSellMul = (sim: Sim, npc: Human, id: string) => (isMarketDay(sim) ? MARKET.sellMul : 1) * priceMult(sim, npc.settlementId, id)

/** Price the NPC pays the player for one unit. */
export function sellPrice(sim: Sim, npc: Human, s: ItemStack): number {
  const d = itemDef(s.id)
  const m = 0.5 + sim.player.skills.trade * 0.002 + mood(sim, npc)
  const spoiled = s.fresh !== undefined && d.food && s.fresh < d.food.spoilH * 0.3 ? 0.4 : 1
  const worn = s.dur !== undefined && d.durability ? 0.4 + 0.6 * (s.dur / d.durability) : 1
  const v = d.price * qualityMult(s) * spoiled * worn * Math.min(0.9, Math.max(0.3, m)) * marketSellMul(sim, npc, s.id)
  // Always below the lowest buy price of the same item, so buying and reselling never pays (review 006 #4).
  return d.price > 0 ? Math.max(1, Math.min(Math.round(v), lowestBuyPrice(sim, npc, s) - 1)) : 0
}

export function buyFromNpc(sim: Sim, npc: Human, stack: ItemStack, qty = 1): ActionResult {
  const src = stockOf(sim, npc, stack)
  if (!src) return { ok: false, msg: `${npc.name} won't part with that.` }
  const q = Math.min(qty, src.max)
  const price = buyPrice(sim, npc, stack) * q
  if (sim.player.money < price) return { ok: false, msg: 'Not enough coins.' }
  if (fitQty(sim.player, { ...stack, qty: q }) < q) return { ok: false, msg: 'You can\'t carry that — too heavy.' }
  const taken = removeStack(src.inv, stack, q)!
  sim.player.money -= price
  npc.money += price
  addItem(sim.player.inv, taken)
  logMoney('player', `npc:${npc.id}`, price, 'player_buys', npc.id, npc.settlementId)
  logTrade(npc, { dir: 'sell_to_player', item: taken.id, qty: q, price })
  // Goodwill from a purchase shares the daily favour counter with gifts (diminishing, review 006 #3).
  npc.opinion = Math.min(100, npc.opinion + 1 / (1 + goodwillToday(sim, npc)))
  countGoodwill(sim, npc)
  train(sim.player, 'trade', 0.3)
  return { ok: true, msg: `Bought: ${itemDef(taken.id).name} ×${q} for ${price} c` }
}

export function sellToNpc(sim: Sim, npc: Human, stack: ItemStack, qty = 1): ActionResult {
  const inv = tradeInventory(sim, npc)
  if (!sim.player.inv.items.includes(stack)) return { ok: false, msg: 'You don\'t have that.' }
  const q = Math.min(qty, stack.qty)
  const price = sellPrice(sim, npc, stack) * q
  if (npc.money < price) return { ok: false, msg: `${npc.name} doesn't have that much money.` }
  const given = removeStack(sim.player.inv, stack, q)!
  npc.money -= price
  sim.player.money += price
  addItem(inv, given)
  logMoney(`npc:${npc.id}`, 'player', price, 'player_sells', npc.id, npc.settlementId)
  logTrade(npc, { dir: 'buy_from_player', item: given.id, qty: q, price })
  train(sim.player, 'trade', 0.3)
  questEvent(sim, { k: 'sell', npcId: npc.id, item: given.id, qty: q })
  return { ok: true, msg: `Sold: ${itemDef(given.id).name} ×${q} for ${price} c` }
}
