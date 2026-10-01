import { itemDef } from '@/game/data/items'
import { SPECIES } from '@/game/data/species'
import { qualityMult } from '@/game/sim/inventory'
/**
 * Pure helpers for the inventory screen (UI-03): category filter, sorting and item parameters.
 * No Vue/DOM — unit-tested with vitest.
 */
import type { ItemCategory } from '@/game/data/items'
import type { ItemStack } from '@/game/sim/types'

export type ItemFilter = 'all' | ItemCategory
export type ItemSort = 'name' | 'weight' | 'value' | 'quality' | 'freshness'

export const FILTERS: { id: ItemFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'tool', label: 'Tools' },
  { id: 'food', label: 'Food' },
  { id: 'herb', label: 'Herbs' },
  { id: 'medical', label: 'Medical' },
  { id: 'resource', label: 'Resources' },
  { id: 'ammo', label: 'Ammo' },
  { id: 'misc', label: 'Other' },
]

export const SORTS: { id: ItemSort; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'weight', label: 'Weight' },
  { id: 'value', label: 'Value' },
  { id: 'quality', label: 'Quality' },
  { id: 'freshness', label: 'Freshness' },
]

const weight = (s: ItemStack) => itemDef(s.id).weight * s.qty
const value = (s: ItemStack) => itemDef(s.id).price * s.qty * qualityMult(s)
/** Freshness as fraction of shelf life (non-food last). */
const freshness = (s: ItemStack) => {
  const f = itemDef(s.id).food
  return f && s.fresh !== undefined ? s.fresh / f.spoilH : Infinity
}

/** Filtered and sorted copy; ties broken by name (stable, locale-aware). */
export function viewItems(items: readonly ItemStack[], filter: ItemFilter, sort: ItemSort): ItemStack[] {
  const byName = (a: ItemStack, b: ItemStack) => itemDef(a.id).name.localeCompare(itemDef(b.id).name, 'en')
  const key: Record<ItemSort, (a: ItemStack, b: ItemStack) => number> = {
    name: () => 0,
    weight: (a, b) => weight(b) - weight(a),
    value: (a, b) => value(b) - value(a),
    quality: (a, b) => (b.q ?? -1) - (a.q ?? -1),
    freshness: (a, b) => freshness(a) - freshness(b),
  }
  return items
    .filter((s) => filter === 'all' || itemDef(s.id).category === filter)
    .sort((a, b) => key[sort](a, b) || byName(a, b))
}

export interface ItemParam {
  label: string
  value: string
}

const QUALITY = ['poor', 'average', 'good', 'exceptional']
const DMG = { cut: 'cut', pierce: 'pierce', blunt: 'blunt' } as const

/** Human-readable parameters of a stack (weapon/armour/food/durability…). */
export function itemParams(s: ItemStack): ItemParam[] {
  const d = itemDef(s.id)
  const out: ItemParam[] = [
    { label: 'Weight', value: `${(d.weight * s.qty).toFixed(2)} kg${s.qty > 1 ? ` (${d.weight} kg each)` : ''}` },
    { label: 'Value', value: `${Math.round(d.price * qualityMult(s))} c each` },
  ]
  if (s.q !== undefined) out.push({ label: 'Quality', value: QUALITY[s.q] ?? String(s.q) })
  if (d.weapon) {
    const w = d.weapon
    out.push({ label: 'Damage', value: `${Math.round(w.damage * qualityMult(s))} (${DMG[w.dmgType]})` })
    if (w.kind === 'melee') out.push({ label: 'Reach', value: `${w.reach} m` }, { label: 'Speed', value: `${w.cooldown} s/swing` })
    else out.push({ label: 'Ammo', value: w.ammo ?? '—' })
  }
  if (d.armor) {
    const r = d.armor.resist
    out.push({ label: 'Protection', value: `cut ${Math.round(r.cut * 100)}%, pierce ${Math.round(r.pierce * 100)}%, blunt ${Math.round(r.blunt * 100)}%` })
  }
  if (d.food) {
    out.push({ label: 'Nutrition', value: String(d.food.nutrition) })
    if (s.fresh !== undefined) out.push({ label: 'Freshness', value: `${Math.round(s.fresh)} / ${d.food.spoilH} h` })
    if (s.sp) out.push({ label: 'Species', value: (SPECIES as Record<string, { name: string }>)[s.sp]?.name ?? s.sp })
    if (d.food.raw) out.push({ label: 'Note', value: 'raw — better cooked' })
  }
  if (d.durability && s.dur !== undefined) out.push({ label: 'Durability', value: `${Math.round((s.dur / d.durability) * 100)}%` })
  if (d.waterCapacity) out.push({ label: 'Water', value: `${s.water ?? 0} / ${d.waterCapacity}` })
  return out
}
