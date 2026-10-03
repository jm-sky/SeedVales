/**
 * Inventory operations shared by player, NPCs, containers. Weight-limited carrying.
 * @domain items
 */
import type { Capability } from '../data/items'
import type { Human, Inventory, ItemStack } from './types'
import { ITEM_BATCH } from '../config/calibration'
import { itemDef, MATERIAL_MULT, QUALITY_MULT, QUALITY_NAMES } from '../data/items'
import { SPECIES } from '../data/species'
import { edgeFactor } from './edge'
import { logConsume } from './eventLog'

export function newStack(id: string, qty = 1, extra: Partial<ItemStack> = {}): ItemStack {
  const d = itemDef(id)
  const s: ItemStack = { id, qty }
  if (d.durability) s.dur = d.durability
  if (d.food) s.fresh = d.food.spoilH
  if (d.waterCapacity) s.water = d.waterCapacity
  return { ...s, ...extra }
}

/** The single stack-compatibility rule: same identity and equivalent condition (freshness within a batch tolerance, equal durability). */
export const canMerge = (a: ItemStack, b: ItemStack) =>
  a.id === b.id &&
  !!itemDef(a.id).stack &&
  (a.q ?? -1) === (b.q ?? -1) &&
  (a.m ?? -1) === (b.m ?? -1) &&
  a.sp === b.sp &&
  a.tag === b.tag &&
  (a.dur === undefined || b.dur === undefined || Math.abs(a.dur - b.dur) <= ITEM_BATCH.durTol) &&
  (a.fresh === undefined || b.fresh === undefined || Math.abs(a.fresh - b.fresh) <= ITEM_BATCH.freshTolH) &&
  (a.water ?? -1) === (b.water ?? -1)

/** Key of stacks that look identical in a list (same id, quality, material, durability, freshness hour, water). */
export const stackLookKey = (s: ItemStack) =>
  [s.id, s.q ?? '', s.m ?? '', s.sp ?? '', s.tag ?? '', s.dur === undefined ? '' : Math.round(s.dur), s.fresh === undefined ? '' : Math.round(s.fresh), s.water ?? '', s.edge === undefined ? '' : Math.round(s.edge * 20)].join('|')

/** Merges rows whose stacks look identical (review 016 #15): the first row stays the actor, `qty` is summed. */
export function groupIdentical<T>(rows: T[], stackOf: (r: T) => ItemStack): { row: T; qty: number }[] {
  const out: { row: T; qty: number; key: string }[] = []
  for (const row of rows) {
    const s = stackOf(row)
    const key = stackLookKey(s)
    const ex = out.find((o) => o.key === key)
    if (ex) ex.qty += s.qty
    else out.push({ row, qty: s.qty, key })
  }
  return out.map(({ row, qty }) => ({ row, qty }))
}

export function addItem(inv: Inventory, stack: ItemStack): void {
  if (stack.qty <= 0) return
  const d = itemDef(stack.id)
  if (d.stack) {
    const ex = inv.items.find((s) => canMerge(s, stack))
    if (ex) {
      // One canonical condition per batch, never an average: the older freshness wins (a merge cannot extend shelf life).
      if (ex.fresh !== undefined && stack.fresh !== undefined) ex.fresh = Math.min(ex.fresh, stack.fresh)
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
  // Implicit consumers (NPCs, recipes, cooking) take the batch with the least remaining freshness first; other items newest-first as before.
  const order = inv.items.filter((s) => s.id === id).reverse()
  if (order.some((s) => s.fresh !== undefined)) order.sort((a, b) => (a.fresh ?? Infinity) - (b.fresh ?? Infinity))
  for (const s of order) {
    if (left <= 0) break
    const take = Math.min(s.qty, left)
    out.push({ ...s, qty: take })
    s.qty -= take
    left -= take
    if (s.qty <= 0) inv.items.splice(inv.items.indexOf(s), 1)
  }
  return out
}

/** `removeItem` for items that leave the world (eaten, burnt, used up): logged as a ledger sink. */
export function consumeItem(inv: Inventory, id: string, qty: number, sink: string, actor?: Human): ItemStack[] {
  const out = removeItem(inv, id, qty)
  for (const s of out) logConsume(s.id, s.qty, sink, actor)
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

/** How many units of the stack the human can still carry (NPCs haul up to 1.6× — D-SIM-7 households). */
export function fitQty(h: Human, stack: ItemStack): number {
  const room = carryCapacity(h) * (h.kind === 'npc' ? 1.6 : 1) - carriedWeight(h)
  const unit = stackWeight({ ...stack, qty: 1 })
  return Math.max(0, Math.min(stack.qty, Math.floor(room / Math.max(0.01, unit))))
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

/**
 * NPC weapon choice: wields the best usable weapon of a kind (main hand or pack, by `weaponScore`).
 * Ranged weapons only with matching ammo carried (COMP-03: a better weapon received is actually used).
 */
export function wieldBest(h: Human, kind: 'melee' | 'ranged') {
  const usable = (s: ItemStack | undefined) => {
    const w = s ? itemDef(s.id).weapon : undefined
    return !!w && w.kind === kind && (s!.dur ?? 1) > 0 && (!w.ammo || h.inv.items.some((i) => itemDef(i.id).ammoKind === w.ammo))
  }
  let best = usable(h.eq.main) ? h.eq.main : undefined
  for (const s of h.inv.items) if (usable(s) && (!best || weaponScore(s) > weaponScore(best))) best = s
  if (best && best !== h.eq.main) equipToMain(h, best)
}

/** Weapon value for automatic choice (player fallback and NPCs): damage × quality × wear. */
export function weaponScore(s: ItemStack): number {
  const d = itemDef(s.id)
  if (!d.weapon) return 0
  const wear = s.dur !== undefined && d.durability ? 0.5 + 0.5 * (s.dur / d.durability) : 1
  return d.weapon.damage * qualityMult(s) * wear * edgeFactor(s, d.weapon)
}

/** Armour value for automatic choice: mean resistance × quality. */
export function armorScore(s: ItemStack): number {
  const a = itemDef(s.id).armor
  return a ? ((a.resist.cut + a.resist.pierce + a.resist.blunt) / 3) * qualityMult(s) : 0
}

/** NPC puts on received armour when it is better than what the slot holds (COMP-03). Returns true if worn. */
export function wearBetterArmor(h: Human, stack: ItemStack): boolean {
  const a = itemDef(stack.id).armor
  const i = h.inv.items.indexOf(stack)
  if (!a || i < 0) return false
  const key = `${a.slot}_${a.layer}` as const
  const cur = h.eq.armor[key]
  if (cur && armorScore(cur) >= armorScore(stack)) return false
  h.inv.items.splice(i, 1)
  if (cur) addItem(h.inv, cur)
  h.eq.armor[key] = stack
  return true
}

/** Moves a tool from inventory to main hand (UI convenience, vision §27). Returns the equipped stack. */
export function equipToMain(h: Human, stack: ItemStack): ItemStack {
  if (h.eq.main === stack) return stack
  const i = h.inv.items.indexOf(stack)
  if (i >= 0) {
    h.inv.items.splice(i, 1)
    if (h.eq.main) h.inv.items.push(h.eq.main)
    h.eq.main = stack
    // A two-handed weapon needs the off hand free (a lit torch goes back to the pack).
    if (itemDef(stack.id).weapon?.twoHanded && h.eq.off) {
      addItem(h.inv, h.eq.off)
      h.eq.off = undefined
    }
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
  if (s.sp) label += ` (${(SPECIES as Record<string, { name: string }>)[s.sp]?.name.toLowerCase() ?? s.sp})`
  if (s.q !== undefined && s.q !== 1) label += ` (${QUALITY_NAMES[s.q]})`
  if (s.qty > 1) label += ` ×${s.qty}`
  return label
}

/** Food spoilage for all food in an inventory over calendar hours. */
export function spoilInventory(inv: Inventory, hours: number, factor = 1) {
  for (let i = inv.items.length - 1; i >= 0; i--) {
    const s = inv.items[i]!
    if (s.fresh === undefined) continue
    s.fresh -= hours * factor
    if (s.fresh <= 0) {
      logConsume(s.id, s.qty, 'spoilage')
      inv.items.splice(i, 1)
    }
  }
}

export function findFood(inv: Inventory): ItemStack | undefined {
  let best: ItemStack | undefined
  let bestScore = -Infinity
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
