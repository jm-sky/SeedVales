/**
 * Orders at a blacksmith: only recipes the smith has materials for; the materials are reserved
 * from the household store when ordering (50% deposit), the smith forges after readyAt, the player
 * collects paying the rest or cancels (deposit refunded, materials back to the store).
 * Quality from blacksmith skill (rolled at forging).
 * @domain crafting
 * @subdomain orders
 */
import type { Sim } from './sim'
import type { Human, Inventory, Order } from './types'
import { itemDef } from '../data/items'
import { recipeById } from '../data/recipes'
import { rollQuality } from './craft'
import { addItem, fitQty, hasItems, newStack, removeItem } from './inventory'
import { houseOf } from './npc/queries'

export const orderPrice = (recipeId: string) => {
  const r = recipeById(recipeId)
  return r ? Math.round(itemDef(r.output.item).price * 1.1) : 0
}

/** Can the smith take this order now (materials in the household store)? */
export function canOrder(sim: Sim, smith: Human, recipeId: string): boolean {
  const r = recipeById(recipeId)
  const store = houseOf(sim, smith)?.inv
  return !!r && !!store && !smith.vitals.dead && hasItems(store, r.inputs)
}

export function placeOrder(sim: Sim, smith: Human, recipeId: string): string {
  const r = recipeById(recipeId)
  if (!r) return ''
  if (!canOrder(sim, smith, recipeId)) return `${smith.name} doesn't have the materials for this order right now.`
  const price = orderPrice(recipeId)
  const dep = Math.ceil(price / 2)
  if (sim.player.money < dep) return 'Not enough coins for the deposit.'
  sim.player.money -= dep
  smith.money += dep
  const store = houseOf(sim, smith)!.inv!
  const reserved = r.inputs.flatMap((inp) => removeItem(store, inp.item, inp.qty))
  const id = r.output.item
  sim.state.px.orders.push({ id: `ord-${sim.nextId()}`, npcId: smith.id, recipeId: r.id, itemId: id, paid: dep, price, readyAt: sim.state.time.cal + 10 * 3600, status: 'waiting', reserved })
  return `Ordered: ${itemDef(id).name}. Ready in about 10 hours.`
}

/**
 * Smith forges a due order from its store. Returns false when materials are missing
 * (the order stays 'waiting'; nothing is created).
 */
export function forgeOrder(sim: Sim, smith: Human, store: Inventory, o: Order): boolean {
  const r = recipeById(o.recipeId)
  if (!r) return false
  if (o.reserved) o.reserved = undefined // materials were set aside when ordering
  else {
    // Orders from before reservation (old saves): consume from the store now.
    if (!hasItems(store, r.inputs)) return false
    for (const inp of r.inputs) removeItem(store, inp.item, inp.qty)
  }
  o.item = newStack(r.output.item, 1, { q: rollQuality(sim, smith.skills.blacksmith) })
  o.status = 'ready'
  return true
}

export function collectOrder(sim: Sim, orderId: string): string {
  const o = sim.state.px.orders.find((x) => x.id === orderId)
  if (!o || o.status !== 'ready' || !o.item) return 'The order isn\'t ready yet.'
  const rest = o.price - o.paid
  if (sim.player.money < rest) return 'Not enough coins to pay the balance.'
  const smith = sim.human(o.npcId)
  if (!smith) return 'The blacksmith is gone — there is no one to pay.'
  if (fitQty(sim.player, o.item) < o.item.qty) return 'You can\'t carry that — make room in your inventory.'
  sim.player.money -= rest
  smith.money += rest
  const item = o.item
  // Collected orders leave the list (no unbounded growth).
  sim.state.px.orders.splice(sim.state.px.orders.indexOf(o), 1)
  addItem(sim.player.inv, item)
  return `Collected: ${itemDef(item.id).name} (quality: ${['poor', 'average', 'good', 'exceptional'][item.q ?? 1]}).`
}

/** Cancels an order: deposit back from the smith's purse, materials/forged item back to the store. */
export function cancelOrder(sim: Sim, orderId: string): string {
  const o = sim.state.px.orders.find((x) => x.id === orderId)
  if (!o) return ''
  const smith = sim.human(o.npcId)
  const store = smith ? houseOf(sim, smith)?.inv : undefined
  if (store) {
    for (const s of o.reserved ?? []) addItem(store, s)
    if (o.item) addItem(store, o.item)
  }
  const refund = smith ? Math.min(o.paid, smith.money) : 0
  if (smith) smith.money -= refund
  sim.player.money += refund
  sim.state.px.orders.splice(sim.state.px.orders.indexOf(o), 1)
  return refund < o.paid ? `Order cancelled — only ${refund} of ${o.paid} c refunded.` : `Order cancelled, deposit of ${refund} c refunded.`
}
