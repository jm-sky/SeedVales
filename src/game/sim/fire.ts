/**
 * Fires and torches (plan survival--001): campfire/hearth fuel and burn-out (FIRE-01/02), standing torches (FIRE-03).
 * Burn time is calendar time; the numbers live in `FIRE`/`TORCH` (config/calibration.ts). Burn-down is driven by the
 * slow world system (`ecology`), never per tick.
 * @domain sim
 * @subdomain fire
 */
import type { ActionResult } from './actions'
import type { Sim } from './sim'
import type { Building, GroundItem, Human, Inventory, ItemStack } from './types'
import { FIRE, TORCH } from '../config/calibration'
import { itemDef } from '../data/items'
import { addItem, countItem, findTool, newStack, removeItem, removeStack } from './inventory'
import { addAsh } from './traces'

/** Burn hours of one unit of fuel (0 = not a fuel). */
export function fuelUnitH(item: string): number {
  return item === 'branch' ? FIRE.branchH : item === 'log' ? FIRE.logH : 0
}

/** Flame size 0..1 for rendering (flipbook + light pool, render--001 step 1): 0 when out, shrinks as the fuel burns down. */
export function fireLevel(b: Building): number {
  if (!b.lit || !((b.fuel ?? 0) > 0)) return 0
  return Math.min(1, FIRE.levelMin + (1 - FIRE.levelMin) * ((b.fuel ?? 0) / FIRE.levelFullH))
}

export const isFirePlace = (b: Building) => b.kind === 'campfire'

/** Moves branches (then logs) from `inv` into the fire while they fit under the cap; returns hours added and items used. */
export function feedFire(inv: Inventory, b: Building, maxItems = Infinity): { hours: number; used: number } {
  let hours = 0
  let used = 0
  for (const id of ['branch', 'log']) {
    const unit = fuelUnitH(id)
    const have = countItem(inv, id)
    let n = 0
    while (n < have && used + n < maxItems && (b.fuel ?? 0) + hours + unit <= FIRE.fuelCapH + 1e-9) {
      n++
      hours += unit
    }
    if (n > 0) {
      removeItem(inv, id, n)
      used += n
    }
  }
  b.fuel = (b.fuel ?? 0) + hours
  return { hours, used }
}

/** "Add fuel" from the pack. A fire that is out stays out until it is lit (flint, steel or torch). */
export function addFuelFromPack(p: Human, b: Building): ActionResult {
  if ((b.fuel ?? 0) + FIRE.branchH > FIRE.fuelCapH) return { ok: false, msg: 'The fire is already fully stocked.' }
  const r = feedFire(p.inv, b)
  if (r.used === 0) return { ok: false, msg: 'You have no branches or logs.' }
  return { ok: true, msg: `You add ${r.used} piece${r.used > 1 ? 's' : ''} of fuel (${b.fuel!.toFixed(1)} h of burning).` }
}

/** Lighting needs starter fuel in the fire (3 branches' worth — topped up from the pack). */
export function lightFire(p: Human, b: Building): ActionResult {
  const need = FIRE.starterBranches * FIRE.branchH
  if ((b.fuel ?? 0) < need - 1e-9) feedFire(p.inv, b, Math.ceil((need - (b.fuel ?? 0)) / FIRE.branchH))
  if ((b.fuel ?? 0) < need - 1e-9) return { ok: false, msg: `You need ${FIRE.starterBranches} branches to get the fire going.` }
  b.lit = true
  return { ok: true, msg: 'The fire catches.' }
}

/** Settlement NPCs feed from what they carry and always manage to light it. */
export function npcFeedFire(h: Human, b: Building): boolean {
  const r = feedFire(h.inv, b)
  if (!((b.fuel ?? 0) > 0)) return false
  b.lit = true
  return r.used > 0
}

/**
 * Burns `hours` of fuel; true when a plain campfire has burnt out and must be removed by the caller (a hearth stays,
 * its fire just goes out).
 */
export function burnFuel(b: Building, hours: number): boolean {
  if (!b.lit || b.fuel === undefined) return false
  b.fuel = Math.max(0, b.fuel - hours)
  if (b.fuel > 0) return false
  b.lit = false
  return !b.hearth
}

/** Removes burnt-out campfires and leaves ash where they were. */
export function removeBurntOut(sim: Sim, dead: Building[]) {
  if (!dead.length) return
  for (const b of dead) {
    const i = sim.state.buildings.indexOf(b)
    if (i >= 0) sim.state.buildings.splice(i, 1)
    addAsh(sim, b.x, b.z)
  }
  sim.rebuildBuildingIndex()
}

/** Dismantle a cold hearth: the stones come back (FIRE-02). */
export function dismantleHearth(sim: Sim, p: Human, b: Building): ActionResult {
  if (!b.hearth) return { ok: false, msg: 'Only a stone hearth can be dismantled.' }
  if (b.lit) return { ok: false, msg: 'Put the fire out first — it is still burning.' }
  const i = sim.state.buildings.indexOf(b)
  if (i < 0) return { ok: false, msg: '' }
  sim.state.buildings.splice(i, 1)
  sim.rebuildBuildingIndex()
  addItem(p.inv, newStack('stone', FIRE.hearthStones))
  return { ok: true, msg: `You take the hearth apart and keep ${FIRE.hearthStones} stones.` }
}

// --- Standing torch (FIRE-03) ---

/** Burn hours left on a torch stack (stack.dur is the torch's durability, used as its remaining life). */
export function torchBurnH(s: ItemStack): number {
  const full = itemDef('torch').durability ?? 60
  return ((s.dur ?? full) / full) * TORCH.burnH
}

/** Writes the burn time left on a ground torch back onto the stack when it is picked up. */
export function restoreTorchDur(g: GroundItem, s: ItemStack): void {
  if (g.stack.id !== 'torch' || g.burnH === undefined) return
  const full = itemDef('torch').durability ?? 60
  s.dur = Math.max(1, (g.burnH / TORCH.burnH) * full)
}

/** Plants the held torch (stays lit) or one from the pack (unlit) upright in front of the player. */
export function plantTorch(sim: Sim, p: Human): ActionResult {
  const held = p.eq.off?.id === 'torch'
  let stack: ItemStack | null = null
  if (held) {
    stack = p.eq.off!
    p.eq.off = undefined
  } else {
    const s = p.inv.items.find((i) => i.id === 'torch')
    if (s) stack = removeStack(p.inv, s, 1)
  }
  if (!stack) return { ok: false, msg: 'You don\'t have a torch.' }
  const x = p.x + Math.sin(p.rot) * 1.2
  const z = p.z + Math.cos(p.rot) * 1.2
  sim.addGround({ id: sim.nextId(), x, z, stack, droppedAt: sim.state.time.cal, lit: held, planted: true, burnH: torchBurnH(stack) })
  return { ok: true, msg: held ? 'You plant the burning torch.' : 'You plant the torch — light it to see by it.' }
}

/** A planted torch can be lit with flint/steel or a torch in the pack, or from a lit fire right next to it. */
export function canLightTorch(sim: Sim, p: Human, g: GroundItem): boolean {
  if (findTool(p, 'fire_start')) return true
  return sim.buildingsNear(g.x, g.z, 3).some((b) => b.lit && isFirePlace(b)) || sim.groundNear(g.x, g.z, 2).some((o) => o !== g && o.lit)
}

export function lightGroundTorch(g: GroundItem): boolean {
  if (g.stack.id !== 'torch' || (g.burnH ?? 1) <= 0) return false
  g.lit = true
  return true
}

export function extinguishGroundTorch(g: GroundItem) {
  g.lit = false
}

/** Burns a lit ground torch; true when it is spent (the caller removes it). */
export function burnGroundTorch(g: GroundItem, hours: number): boolean {
  if (!g.lit || g.stack.id !== 'torch') return false
  g.burnH = (g.burnH ?? torchBurnH(g.stack)) - hours
  return g.burnH <= 0
}
