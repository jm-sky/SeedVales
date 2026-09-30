/**
 * Roasting meat over a campfire (FOOD-03): capacity 1 piece on the bare fire, 2 with a pan/pot, more on
 * a spit built next to the fire. Roasting is production, so its duration is set in calendar time
 * (D-FOOD-3). The product keeps the meat's parameters: animal species and (relative) freshness.
 * @domain food
 * @subdomain cooking
 */
import type { ActionResult } from './actions'
import type { Sim } from './sim'
import type { Human, ItemStack } from './types'
import { CALENDAR_SPEED, ROAST } from '../config/calibration'
import { itemDef } from '../data/items'
import { train } from './actions'
import { giveOrDrop } from './actions'
import { addItem, findTool, newStack } from './inventory'

/** Lit campfire within reach, and whether a spit stands next to it. */
export function roastSpot(sim: Sim, h: Human): { fire: boolean; spit: boolean } {
  const near = sim.buildingsNear(h.x, h.z, 6)
  const fire = near.find((b) => b.kind === 'campfire' && b.lit !== false && Math.hypot(b.x - h.x, b.z - h.z) < 4)
  if (!fire) return { fire: false, spit: false }
  return { fire: true, spit: near.some((b) => b.kind === 'spit' && Math.hypot(b.x - fire.x, b.z - fire.z) < ROAST.spitM) }
}

/** Pieces that can roast at once for this person at this spot. */
export function roastCapacity(sim: Sim, h: Human): number {
  const s = roastSpot(sim, h)
  if (!s.fire) return 0
  return s.spit ? ROAST.spitSlots : findTool(h, 'cook_vessel') ? ROAST.vesselSlots : 1
}

const rawMeat = (h: Human) => h.inv.items.filter((s) => s.id === 'raw_meat')

/** How many pieces a roast would take now (capacity limited by meat carried). */
export function roastBatch(sim: Sim, h: Human): number {
  return Math.min(roastCapacity(sim, h), rawMeat(h).reduce((n, s) => n + s.qty, 0))
}

/** Gameplay seconds of a roast (calendar minutes converted — the batch takes the same time). */
export const roastSeconds = () => (ROAST.calMin * 60) / CALENDAR_SPEED

/** Freshness of the cooked piece: the cooked shelf life scaled by how fresh the raw meat was. */
export function cookedFreshness(raw: ItemStack): number {
  const rawLife = itemDef('raw_meat').food!.spoilH
  const cookedLife = itemDef('cooked_meat').food!.spoilH
  const f = Math.max(ROAST.minFreshFrac, Math.min(1, (raw.fresh ?? rawLife) / rawLife))
  return cookedLife * f
}

/** Completes a roast of up to `n` pieces (least fresh first). Inputs are taken only now (interrupt-safe). */
export function completeRoast(sim: Sim, h: Human, n: number): ActionResult {
  const cap = roastCapacity(sim, h)
  if (!cap) return { ok: false, msg: 'Ognisko zgasło albo jesteś za daleko.' }
  let left = Math.min(n, cap)
  const stacks = rawMeat(h).sort((a, b) => (a.fresh ?? 0) - (b.fresh ?? 0))
  const out: ItemStack[] = []
  for (const s of stacks) {
    while (left > 0 && s.qty > 0) {
      s.qty--
      left--
      out.push(newStack('cooked_meat', 1, { fresh: cookedFreshness(s), ...(s.sp ? { sp: s.sp } : {}) }))
    }
    if (s.qty <= 0) h.inv.items.splice(h.inv.items.indexOf(s), 1)
  }
  if (!out.length) return { ok: false, msg: 'Nie masz surowego mięsa.' }
  const tmp = { items: [] as ItemStack[] }
  for (const s of out) addItem(tmp, s)
  for (const s of tmp.items) giveOrDrop(sim, h, s)
  train(h, 'survival', 0.3, out.length)
  return { ok: true, msg: `Upieczono: ${out.length} × ${itemDef('cooked_meat').name}` }
}
