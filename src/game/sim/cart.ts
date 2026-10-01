/**
 * Wheelbarrow and handcart (TRANS-01): pushed with both hands, they carry heavy goods (logs, stone, ore)
 * in their own load instead of the backpack. Pushing is slower, cannot climb steep slopes or cross deep
 * water, and blocks attacking. A cart can be parked in the world and loaded/unloaded there or straight
 * into a building's storage (e.g. the settlement warehouse).
 * @domain items
 * @subdomain transport
 */
import type { Sim } from './sim'
import type { Building, Cart, Human, Inventory, ItemStack } from './types'
import { CART } from '../config/calibration'
import { HEAVY_GOODS, itemDef } from '../data/items'
import { addItem, fitQty, invWeight, removeStack } from './inventory'
import { addRep } from './reputation'

export const cartDef = (c: Cart) => itemDef(c.item).cart!
export const cartLoad = (c: Cart) => invWeight(c.inv)
export const isHeavy = (id: string) => HEAVY_GOODS.has(id)

/** Takes a cart item from the pack and starts pushing it (both hands: weapon and torch go to the pack). */
export function pushFromPack(sim: Sim, h: Human, s: ItemStack): string {
  const px = sim.state.px
  if (px.cart) return 'You are already pushing a cart.'
  if (!itemDef(s.id).cart) return ''
  const moved = removeStack(h.inv, s, 1)
  if (!moved) return ''
  freeHands(h)
  px.cart = { id: sim.nextId(), item: moved.id, x: h.x, z: h.z, rot: h.rot, dur: moved.dur, inv: { items: [] } }
  return `You push the ${itemDef(moved.id).name.toLowerCase()}.`
}

/** Starts pushing a parked cart. */
export function pushParked(sim: Sim, h: Human, cartId: number): string {
  const px = sim.state.px
  if (px.cart) return 'You are already pushing a cart.'
  const i = sim.state.carts.findIndex((c) => c.id === cartId)
  if (i < 0) return ''
  const [c] = sim.state.carts.splice(i, 1)
  freeHands(h)
  px.cart = c
  return `You push the ${itemDef(c!.item).name.toLowerCase()}.`
}

function freeHands(h: Human) {
  if (h.eq.main) addItem(h.inv, h.eq.main)
  if (h.eq.off) addItem(h.inv, h.eq.off)
  h.eq.main = undefined
  h.eq.off = undefined
}

/** Leaves the pushed cart standing in front of the player. */
export function parkCart(sim: Sim, h: Human): string {
  const c = sim.state.px.cart
  if (!c) return 'You are not pushing a cart.'
  c.x = h.x + Math.sin(h.rot) * 1.2
  c.z = h.z + Math.cos(h.rot) * 1.2
  c.rot = h.rot
  sim.state.carts.push(c)
  sim.state.px.cart = undefined
  return `You park the ${itemDef(c.item).name.toLowerCase()}.`
}

/** An empty parked cart can be taken back into the pack (if it fits). */
export function stowCart(sim: Sim, h: Human, cartId: number): string {
  const c = sim.state.carts.find((x) => x.id === cartId)
  if (!c) return ''
  if (c.inv.items.length) return 'Unload the cart first.'
  const stack: ItemStack = { id: c.item, qty: 1, ...(c.dur !== undefined ? { dur: c.dur } : {}) }
  if (fitQty(h, stack) < 1) return 'It is too heavy to carry on top of your load.'
  sim.state.carts.splice(sim.state.carts.indexOf(c), 1)
  addItem(h.inv, stack)
  return `You pick up the ${itemDef(c.item).name.toLowerCase()}.`
}

/** Moves heavy goods from the pack into the cart, up to its capacity. Returns kg moved. */
export function loadHeavy(h: Human, c: Cart): number {
  let room = cartDef(c).capacity - cartLoad(c)
  let moved = 0
  for (const s of [...h.inv.items]) {
    if (!isHeavy(s.id) || room <= 0) continue
    const unit = itemDef(s.id).weight
    const n = Math.min(s.qty, Math.floor(room / unit))
    if (n <= 0) continue
    addItem(c.inv, removeStack(h.inv, s, n)!)
    room -= n * unit
    moved += n * unit
  }
  return moved
}

/** Moves the cart's load into another inventory (all of it, or what the person can carry). */
export function unloadInto(c: Cart, to: Inventory, carrier?: Human): number {
  let moved = 0
  for (const s of [...c.inv.items]) {
    const n = carrier ? fitQty(carrier, s) : s.qty
    if (n <= 0) continue
    addItem(to, removeStack(c.inv, s, n)!)
    moved += n * itemDef(s.id).weight
  }
  return moved
}

/** Unloads the pushed cart into a building's storage; donating to the settlement warehouse earns goodwill. */
export function unloadToBuilding(sim: Sim, c: Cart, b: Building): string {
  if (!b.inv) return ''
  const value = c.inv.items.reduce((v, s) => v + itemDef(s.id).price * s.qty, 0)
  const kg = unloadInto(c, b.inv)
  if (!kg) return 'The cart is empty.'
  if (b.kind === 'warehouse' && value >= 10) addRep(sim, b.settlementId, { helpfulness: Math.min(3, Math.floor(value / 40) + 1) })
  return `Unloaded ${Math.round(kg)} kg.`
}

/** Pushing check for a step: steep rise or deep water stops the cart. */
export function cartBlocked(sim: Sim, x: number, z: number, dx: number, dz: number): string | null {
  const l = Math.hypot(dx, dz)
  if (l < 1e-6) return null
  const ax = x + (dx / l) * 1.2
  const az = z + (dz / l) * 1.2
  if (sim.terrain.waterDepthAt(ax, az) > CART.maxWaterM) return 'The cart cannot go into deep water.'
  const rise = (sim.terrain.heightAt(ax, az) - sim.terrain.heightAt(x, z)) / 1.2
  if (rise > CART.maxRise) return 'Too steep to push the cart up here.'
  return null
}
