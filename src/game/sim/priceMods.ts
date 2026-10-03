/**
 * Settlement price modifiers (quests--003 E6): a quest or event can make goods in one settlement dearer or
 * cheaper for a while ("trade friction" after a false accusation, a grain surplus…). Saved as `state.priceMods`
 * (calendar seconds); applied to the prices the player pays and receives in that settlement.
 * @domain sim
 * @subdomain economy
 */
import type { Sim } from './sim'
import type { PriceMod } from './types'

const DAY_S = 86400

/** Combined multiplier for `item` in `settlementId` right now (1 when no modifier applies). */
export function priceMult(sim: Sim, settlementId: number, item: string): number {
  const mods = sim.state.priceMods
  if (!mods?.length) return 1
  const now = sim.state.time.cal
  let m = 1
  for (const p of mods) if (p.until > now && p.place === settlementId && (p.item === '*' || p.item === item)) m *= p.mult
  return m
}

/** Adds a modifier for `days`; one with the same reason, place and item is replaced (no stacking by repeat). */
export function addPriceMod(sim: Sim, p: Omit<PriceMod, 'until'> & { days: number }) {
  const { days, ...rest } = p
  const mods = (sim.state.priceMods ??= [])
  const i = mods.findIndex((x) => x.why === p.why && x.place === p.place && x.item === p.item)
  const entry: PriceMod = { ...rest, until: sim.state.time.cal + days * DAY_S }
  if (i >= 0) mods[i] = entry
  else mods.push(entry)
}

/** Drops expired modifiers (daily). */
export function prunePriceMods(sim: Sim) {
  const mods = sim.state.priceMods
  if (mods?.length) sim.state.priceMods = mods.filter((p) => p.until > sim.state.time.cal)
}
