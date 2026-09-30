/**
 * Inventory operations shared by player, NPCs, containers. Weight-limited carrying.
 * @domain items
 */
import type { Capability } from '../data/items'
import type { Human, Inventory, ItemStack } from './types'
import { itemDef, MATERIAL_MULT, QUALITY_MULT } from '../data/items'

export function newStack(id: string, qty = 1, extra: Partial<ItemStack> = {}): ItemStack {
  const d = itemDef(id)
  const s: ItemStack = { id, qty }
  if (d.durability) s.dur = d.durability
  if (d.food) s.fresh = d.food.spoilH
  if (d.waterCapacity) s.water = d.waterCapacity
  return { ...s, ...extra }
}

const canMerge = (a: ItemStack, b: ItemStack) =>
  a.id === b.id && itemDef(a.id).stack && (a.q ?? -1) === (b.q ?? -1) && (a.m ?? -1) === (b.m ?? -1)

export function addItem(inv: Inventory, stack: ItemStack): void {
  if (stack.qty <= 0) return
  const d = itemDef(stack.id)
  if (d.stack) {
    const ex = inv.items.find((s) => canMerge(s, stack))
    if (ex) {
      if (ex.fresh !== undefined && stack.fresh !== undefined) {
        ex.fresh = (ex.fresh * ex.qty + stack.fresh * stack.qty) / (ex.qty + stack.qty)
      }
      if (ex.dur !== undefined && stack.dur !== undefined) ex.dur = Math.min(ex.dur, stack.dur)
      ex.qty += stack.qty
      return
    }
    inv.items.push({ ...stack })
    return
  }
  for (let i = 0; i < stack.qty; i++) inv.items.push({ ...stack, qty: 1 })
}

export function countItem(inv: Inventory, id: string): number {
  let n = 0
  for (const s of inv.items) if (s.id === id) n += s.qty
  return n
}

/** Removes qty; returns removed stacks (preserving freshness/quality). */
export function removeItem(inv: Inventory, id: string, qty: number): ItemStack[] {
  const out: ItemStack[] = []
  let left = qty
  for (let i = inv.items.length - 1; i >= 0 && left > 0; i--) {
    const s = inv.items[i]!
    if (s.id !== id) continue
    const take = Math.min(s.qty, left)
    out.push({ ...s, qty: take })
    s.qty -= take
    left -= take
    if (s.qty <= 0) inv.items.splice(i, 1)
  }
  return out
}

export function removeStack(inv: Inventory, stack: ItemStack, qty = stack.qty): ItemStack | null {
  const i = inv.items.indexOf(stack)
  if (i < 0) return null
  const take = Math.min(qty, stack.qty)
  stack.qty -= take
  if (stack.qty <= 0) inv.items.splice(i, 1)
  return { ...stack, qty: take }
}

export function hasItems(inv: Inventory, req: { item: string; qty: number }[]): boolean {
  return req.every((r) => countItem(inv, r.item) >= r.qty)
}

export function stackWeight(s: ItemStack): number {
  const d = itemDef(s.id)
  const qm = s.q !== undefined ? 2 - QUALITY_MULT[s.q]! : 1
  return d.weight * s.qty * qm
}

export function invWeight(inv: Inventory): number {
  let w = 0
  for (const s of inv.items) w += stackWeight(s)
  return w
}

/** Carried weight including equipped items (worn armour counts ×0.6 per vision §21.3). */
export function carriedWeight(h: Human): number {
  let w = invWeight(h.inv)
  if (h.eq.main) w += stackWeight(h.eq.main)
  if (h.eq.off) w += stackWeight(h.eq.off)
  for (const a of Object.values(h.eq.armor)) if (a) w += stackWeight(a) * 0.6
  return w
}

export function carryCapacity(h: Human): number {
  let bonus = 0
  for (const s of h.inv.items) bonus = Math.max(bonus, itemDef(s.id).carryBonus ?? 0)
  return 20 + h.attrs.str * 3 + bonus
}

/** Finds a stack providing the capability — equipped first, then best-durability in inventory. */
export function findTool(h: Human, cap: Capability): ItemStack | undefined {
  const has = (s?: ItemStack) => s && (itemDef(s.id).caps ?? []).includes(cap) && (s.dur === undefined || s.dur > 0)
  if (has(h.eq.main)) return h.eq.main
  if (has(h.eq.off)) return h.eq.off
  let best: ItemStack | undefined
  for (const s of h.inv.items) if (has(s) && (!best || (s.dur ?? 0) > (best.dur ?? 0))) best = s
  return best
}

export function invHasCap(inv: Inventory, cap: Capability): boolean {
  return inv.items.some((s) => (itemDef(s.id).caps ?? []).includes(cap))
}

/** Moves a tool from inventory to main hand (UI convenience, vision §27). Returns the equipped stack. */
export function equipToMain(h: Human, stack: ItemStack): ItemStack {
  if (h.eq.main === stack) return stack
  const i = h.inv.items.indexOf(stack)
  if (i >= 0) {
    h.inv.items.splice(i, 1)
    if (h.eq.main) h.inv.items.push(h.eq.main)
    h.eq.main = stack
  }
  return stack
}

export function wearTool(s: ItemStack, amount = 1) {
  if (s.dur !== undefined) s.dur = Math.max(0, s.dur - amount)
}

export function qualityMult(s: ItemStack): number {
  return (s.q !== undefined ? QUALITY_MULT[s.q]! : 1) * (s.m !== undefined ? MATERIAL_MULT[s.m]! : 1)
}

export function stackLabel(s: ItemStack): string {
  const d = itemDef(s.id)
  let label = d.name
  if (s.q !== undefined && s.q !== 1) label += ` (${['niska', 'śr.', 'wysoka', 'wyjątkowa'][s.q]})`
  if (s.qty > 1) label += ` ×${s.qty}`
  return label
}

/** Food spoilage for all food in an inventory over calendar hours. */
export function spoilInventory(inv: Inventory, hours: number, factor = 1) {
  for (let i = inv.items.length - 1; i >= 0; i--) {
    const s = inv.items[i]!
    if (s.fresh === undefined) continue
    s.fresh -= hours * factor
    if (s.fresh <= 0) inv.items.splice(i, 1)
  }
}

export function findFood(inv: Inventory): ItemStack | undefined {
  let best: ItemStack | undefined
  let bestScore = -1
  for (const s of inv.items) {
    const d = itemDef(s.id)
    if (!d.food || d.category === 'herb' || d.food.raw) continue
    // Prefer soon-to-spoil nutritious food.
    const score = d.food.nutrition - (s.fresh ?? 0) / 100
    if (score > bestScore) {
      best = s
      bestScore = score
    }
  }
  return best
}
