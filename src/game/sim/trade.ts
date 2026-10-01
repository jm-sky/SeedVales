/**
 * Trade (TRADE-02): any NPC sells its surplus — household store and own pack — minus what the household
 * needs (food reserve per member, work kit, wielded/worn gear). Children trade only from their pack; prices depend on base price, quality, NPC agreeableness,
 * individual sympathy, settlement honesty reputation, trade skill and local stock. Money is conserved.
 * @domain economy
 */
import type { ActionResult } from './actions'
import type { Sim } from './sim'
import type { Human, Inventory, ItemStack } from './types'
import { TRADE } from '../config/calibration'
import { itemDef } from '../data/items'
import { PROFESSIONS } from '../data/professions'
import { train } from './actions'
import { addItem, countItem, fitQty, qualityMult, removeStack } from './inventory'
import { household, houseOf } from './npc/queries'

/** Where goods bought from the player go: the household store (children: their own pack). */
export function tradeInventory(sim: Sim, npc: Human): Inventory | undefined {
  return npc.age === 'child' ? npc.inv : (houseOf(sim, npc)?.inv ?? npc.inv)
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
  const store = npc.age === 'child' ? undefined : houseOf(sim, npc)?.inv
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
  return { inv: npc.inv.items.includes(stack) ? npc.inv : houseOf(sim, npc)!.inv!, max: e.max }
}

function mood(sim: Sim, npc: Human): number {
  const rep = sim.state.settlements[npc.settlementId]?.rep
  return npc.opinion * 0.002 + (rep ? (rep.honesty + rep.helpfulness) * 0.0015 : 0) + (npc.big5.a - 0.5) * 0.2
}

/** Price the player pays the NPC for one unit. */
export function buyPrice(sim: Sim, npc: Human, s: ItemStack): number {
  const d = itemDef(s.id)
  const inv = tradeInventory(sim, npc)
  const stock = inv ? countItem(inv, s.id) + (inv === npc.inv ? 0 : countItem(npc.inv, s.id)) : 0
  const scarcity = stock > 10 ? 0.9 : stock <= 1 ? 1.15 : 1
  const m = 1.3 - sim.player.skills.trade * 0.002 - mood(sim, npc)
  return Math.max(1, Math.round(d.price * qualityMult(s) * scarcity * Math.min(1.8, Math.max(0.95, m))))
}

/** Price the NPC pays the player for one unit. */
export function sellPrice(sim: Sim, npc: Human, s: ItemStack): number {
  const d = itemDef(s.id)
  const m = 0.5 + sim.player.skills.trade * 0.002 + mood(sim, npc)
  const spoiled = s.fresh !== undefined && d.food && s.fresh < d.food.spoilH * 0.3 ? 0.4 : 1
  const worn = s.dur !== undefined && d.durability ? 0.4 + 0.6 * (s.dur / d.durability) : 1
  const v = d.price * qualityMult(s) * spoiled * worn * Math.min(0.9, Math.max(0.3, m))
  return d.price > 0 ? Math.max(1, Math.round(v)) : 0
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
  npc.opinion = Math.min(100, npc.opinion + 1)
  train(sim.player, 'trade', 0.3)
  return { ok: true, msg: `Bought: ${itemDef(taken.id).name} ×${q} for ${price} c` }
}

export function sellToNpc(sim: Sim, npc: Human, stack: ItemStack, qty = 1): ActionResult {
  const inv = tradeInventory(sim, npc)
  if (!inv || !sim.player.inv.items.includes(stack)) return { ok: false, msg: 'You don\'t have that.' }
  const q = Math.min(qty, stack.qty)
  const price = sellPrice(sim, npc, stack) * q
  if (npc.money < price) return { ok: false, msg: `${npc.name} doesn't have that much money.` }
  const given = removeStack(sim.player.inv, stack, q)!
  npc.money -= price
  sim.player.money += price
  addItem(inv, given)
  train(sim.player, 'trade', 0.3)
  return { ok: true, msg: `Sold: ${itemDef(given.id).name} ×${q} for ${price} c` }
}
