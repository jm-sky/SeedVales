/**
 * Weapon edge (combat--005, D-COMBAT-4): per-instance current sharpness on the stack, a quality/material-bounded
 * maximum, dulling by hits and sharpening. Structural durability (`dur`) is a separate state and is never restored here.
 * @domain sim
 */
import type { WeaponStats } from '../data/items'
import type { ItemStack } from './types'
import { EDGE } from '../config/calibration'
import { itemDef } from '../data/items'
import { qualityMult } from './inventory'

/** The highest edge this concrete weapon can hold: the type's base edge scaled by its quality/material (0 for blunt weapons). */
export function maxEdge(s: ItemStack): number {
  const w = itemDef(s.id).weapon
  if (!w || w.dmgType === 'blunt') return 0
  return Math.min(1, w.sharpness * qualityMult(s))
}

/** Current edge: the stored value, else the maximum (old saves and fresh weapons). */
export const edgeOf = (s: ItemStack): number => Math.min(maxEdge(s), s.edge ?? maxEdge(s))

/** Damage multiplier of the current edge: a blade at or above its type's base edge deals full damage; a dull one loses up to the class penalty. */
export function edgeFactor(s: ItemStack, w: WeaponStats): number {
  if (w.dmgType === 'blunt' || w.sharpness <= 0) return 1
  const penalty = w.dmgType === 'cut' ? EDGE.cutPenalty : EDGE.piercePenalty
  const ratio = Math.min(1, edgeOf(s) / w.sharpness)
  return 1 - penalty * (1 - ratio)
}

/** A hit that connected dulls an edged weapon (blunt weapons do not dull). */
export function dullEdge(s: ItemStack, w: WeaponStats) {
  if (w.dmgType === 'blunt') return
  const loss = w.dmgType === 'cut' ? EDGE.dullPerHit.cut : EDGE.dullPerHit.pierce
  s.edge = Math.max(EDGE.floor, edgeOf(s) - loss)
}

/** Sharpening: raises the edge toward the maximum, never above it, never touching durability. Returns the new edge. */
export function sharpenEdge(s: ItemStack): number {
  const max = maxEdge(s)
  s.edge = Math.min(max, edgeOf(s) + max * EDGE.sharpenGain)
  return s.edge
}

export const needsSharpening = (s: ItemStack) => maxEdge(s) > 0 && edgeOf(s) < maxEdge(s) - 1e-6

/** Blacksmith sharpening service price (copper): scales with the edge that is missing; 0 when nothing to do (proposal P-12). */
export const sharpenServicePrice = (s: ItemStack) => (needsSharpening(s) ? Math.max(2, Math.ceil((maxEdge(s) - edgeOf(s)) * 30)) : 0)

/** The blade the service works on: the wielded melee weapon. */
export const serviceBlade = (main: ItemStack | undefined) => (main && maxEdge(main) > 0 ? main : undefined)
