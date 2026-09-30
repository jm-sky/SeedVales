/**
 * Orders at a blacksmith: pay 50% deposit, NPC forges during work consuming the recipe's materials
 * from the household store (no materials → order keeps waiting), collect paying the rest.
 * Quality from blacksmith skill (rolled at forging).
 * @domain crafting
 * @subdomain orders
 */
import type { Sim } from './sim'
import type { Human, Inventory, Order } from './types'
import { itemDef } from '../data/items'
import { recipeById } from '../data/recipes'
import { rollQuality } from './craft'
import { addItem, hasItems, newStack, removeItem } from './inventory'

export const orderPrice = (recipeId: string) => {
  const r = recipeById(recipeId)
  return r ? Math.round(itemDef(r.output.item).price * 1.1) : 0
}

export function placeOrder(sim: Sim, smith: Human, recipeId: string): string {
  const r = recipeById(recipeId)
  if (!r) return ''
  const price = orderPrice(recipeId)
  const dep = Math.ceil(price / 2)
  if (sim.player.money < dep) return 'Za mało na zaliczkę.'
  sim.player.money -= dep
  smith.money += dep
  const id = r.output.item
  sim.state.px.orders.push({ id: `ord-${sim.nextId()}`, npcId: smith.id, recipe: id, paid: dep, price, readyAt: sim.state.time.cal + 10 * 3600, status: 'waiting' })
  return `Zamówiono: ${itemDef(id).name}. Gotowe za ok. 10 godzin.`
}

/**
 * Smith forges a due order from its store. Returns false when materials are missing
 * (the order stays 'waiting'; nothing is created).
 */
export function forgeOrder(sim: Sim, smith: Human, store: Inventory, o: Order): boolean {
  const r = recipeById(o.recipe)
  if (!r || !hasItems(store, r.inputs)) return false
  for (const inp of r.inputs) removeItem(store, inp.item, inp.qty)
  o.item = newStack(r.output.item, 1, { q: rollQuality(sim, smith.skills.blacksmith) })
  o.status = 'ready'
  return true
}

export function collectOrder(sim: Sim, orderId: string): string {
  const o = sim.state.px.orders.find((x) => x.id === orderId)
  if (!o || o.status !== 'ready' || !o.item) return 'Zamówienie niegotowe.'
  const rest = o.price - o.paid
  if (sim.player.money < rest) return 'Za mało pieniędzy na dopłatę.'
  const smith = sim.human(o.npcId)
  sim.player.money -= rest
  if (smith) smith.money += rest
  o.paid = o.price
  o.status = 'collected'
  const item = o.item
  o.item = undefined
  addItem(sim.player.inv, item)
  return `Odebrano: ${itemDef(item.id).name} (jakość: ${['niska', 'średnia', 'wysoka', 'wyjątkowa'][item.q ?? 1]}).`
}
