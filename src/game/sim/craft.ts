/**
 * Crafting (player & NPC): skill, tool capability, optional station, time. Inputs are consumed only
 * on completion, so interrupting never loses or duplicates resources.
 * @domain crafting
 */
import type { Recipe, StationKind } from '../data/recipes'
import type { ActionResult } from './actions'
import type { Sim } from './sim'
import type { Human } from './types'
import { itemDef } from '../data/items'
import { train } from './actions'
import { giveOrDrop } from './actions'
import { findTool, hasItems, newStack, removeItem, wearTool } from './inventory'

export function nearStation(sim: Sim, h: Human, st: StationKind): boolean {
  return sim.buildingsNear(h.x, h.z, 5).some((b) => {
    if (Math.hypot(b.x - h.x, b.z - h.z) > 4 + Math.max(b.hw, b.hd)) return false
    if (st === 'campfire') return b.kind === 'campfire' && b.lit !== false
    return b.kind === st
  })
}

export function canCraft(sim: Sim, h: Human, r: Recipe): { ok: boolean; reason?: string } {
  if (!hasItems(h.inv, r.inputs)) return { ok: false, reason: 'Brak składników' }
  if (r.tool && !findTool(h, r.tool)) return { ok: false, reason: `Brak narzędzia (${r.tool})` }
  if (r.station && !nearStation(sim, h, r.station)) return { ok: false, reason: `Wymaga: ${STATION_NAMES[r.station]}` }
  if (r.minSkill && h.skills[r.skill] < r.minSkill) return { ok: false, reason: `Za niski skill (${Math.round(h.skills[r.skill])}/${r.minSkill})` }
  return { ok: true }
}

export const STATION_NAMES: Record<StationKind, string> = { campfire: 'ognisko', anvil: 'kowadło', dryrack: 'suszarnia', workbench: 'warsztat' }

/** Duration in gameplay seconds; good skill speeds up (vision §23). */
export const craftTime = (h: Human, r: Recipe) => r.timeS * (1 - Math.min(0.5, h.skills[r.skill] / 200))

export function rollQuality(sim: Sim, skill: number): number {
  const r = sim.rng.next() + skill / 140
  return r > 1.35 ? 3 : r > 0.95 ? 2 : r > 0.35 ? 1 : 0
}

export function completeCraft(sim: Sim, h: Human, r: Recipe): ActionResult {
  const c = canCraft(sim, h, r)
  if (!c.ok) return { ok: false, msg: c.reason! }
  for (const i of r.inputs) removeItem(h.inv, i.item, i.qty)
  if (r.tool) {
    const t = findTool(h, r.tool)
    if (t) wearTool(t, 1)
  }
  const q = r.quality ? rollQuality(sim, h.skills[r.skill]) : undefined
  giveOrDrop(sim, h, newStack(r.output.item, r.output.qty, q !== undefined ? { q } : {}))
  train(h, r.skill, 0.5, 2)
  const qn = q !== undefined ? ` (jakość: ${['niska', 'średnia', 'wysoka', 'wyjątkowa'][q]})` : ''
  return { ok: true, msg: `Wytworzono: ${itemDef(r.output.item).name} ×${r.output.qty}${qn}` }
}
