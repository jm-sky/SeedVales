/**
 * Player loadout: primary melee and ranged weapon (UI-03) and quick switching between them.
 * Weapons are chosen by item id; the best-durability stack of that id is taken from the inventory.
 * @domain items
 * @subdomain loadout
 */
import type { Sim } from './sim'
import type { ItemStack, WeaponKind } from './types'
import { itemDef } from '../data/items'
import { equipToMain, weaponScore } from './inventory'

export const weaponKindOf = (id: string): WeaponKind | undefined => itemDef(id).weapon?.kind

/** Weapons the player carries or wields, grouped by kind (unique ids). */
export function weaponChoices(sim: Sim): Record<WeaponKind, string[]> {
  const p = sim.player
  const out: Record<WeaponKind, string[]> = { melee: [], ranged: [] }
  for (const s of [p.eq.main, ...p.inv.items]) {
    const k = s ? weaponKindOf(s.id) : undefined
    if (s && k && !out[k].includes(s.id)) out[k].push(s.id)
  }
  return out
}

export function setPrimary(sim: Sim, kind: WeaponKind, id: string | undefined): string {
  if (id && weaponKindOf(id) !== kind) return ''
  const px = sim.state.px
  px.primary = { ...px.primary, [kind]: id }
  return id ? `Primary ${kind === 'melee' ? 'melee' : 'ranged'} weapon: ${itemDef(id).name}` : ''
}

function bestStack(sim: Sim, id: string): ItemStack | undefined {
  let best: ItemStack | undefined
  for (const s of sim.player.inv.items) if (s.id === id && (!best || (s.dur ?? 0) > (best.dur ?? 0))) best = s
  return best
}

/**
 * Switches the main hand to the primary weapon of the other kind (or of `kind`). Falls back to the
 * best carried weapon of that kind when no primary is set or it is not carried.
 */
export function switchWeapon(sim: Sim, kind?: WeaponKind): string {
  const p = sim.player
  const cur = p.eq.main ? weaponKindOf(p.eq.main.id) : undefined
  const want: WeaponKind = kind ?? (cur === 'melee' ? 'ranged' : 'melee')
  const prim = sim.state.px.primary?.[want]
  if (p.eq.main && p.eq.main.id === prim) return ''
  let s = prim ? bestStack(sim, prim) : undefined
  if (!s) {
    for (const it of p.inv.items) {
      if (weaponKindOf(it.id) === want && (!s || weaponScore(it) > weaponScore(s))) s = it
    }
  }
  if (!s) return want === 'melee' ? 'No melee weapon.' : 'No ranged weapon.'
  equipToMain(p, s)
  return `In hand: ${itemDef(s.id).name}`
}
