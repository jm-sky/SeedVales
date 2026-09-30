/**
 * Orders at a blacksmith: pay 50% deposit, NPC crafts during work (smith act marks ready),
 * collect paying the rest. Quality from blacksmith skill.
 * @domain crafting
 * @subdomain orders
 */
import type { Sim } from './sim'
import type { Human } from './types'
import { itemDef } from '../data/items'
import { recipeById } from '../data/recipes'
import { rollQuality } from './craft'
import { addItem, newStack } from './inventory'

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

export function collectOrder(sim: Sim, orderId: string): string {
  const o = sim.state.px.orders.find((x) => x.id === orderId)
  if (!o || o.status !== 'ready') return 'Zamówienie niegotowe.'
  const rest = o.price - o.paid
  if (sim.player.money < rest) return 'Za mało pieniędzy na dopłatę.'
  const smith = sim.human(o.npcId)
  sim.player.money -= rest
  if (smith) smith.money += rest
  o.paid = o.price
  o.status = 'collected'
  const q = rollQuality(sim, smith?.skills.blacksmith ?? 30)
  addItem(sim.player.inv, newStack(o.recipe, 1, { q }))
  return `Odebrano: ${itemDef(o.recipe).name} (jakość: ${['niska', 'średnia', 'wysoka', 'wyjątkowa'][q]}).`
}
