/**
 * Settlement treasury: the payer/payee for flows without a natural counterpart (quest rewards,
 * caravan fees, inn without innkeeper, penance). Money is only moved, never created (D-ECON-1).
 * @domain economy
 */
import type { Sim } from './sim'
import type { Human } from './types'

export function payToTreasury(sim: Sim, sid: number, from: Human, amount: number): number {
  const st = sim.state.settlements[sid]
  const paid = Math.max(0, Math.min(amount, from.money))
  if (!st || paid <= 0) return 0
  from.money -= paid
  st.treasury += paid
  return paid
}

/** Pays up to `amount` from the treasury; returns what was actually paid (treasury may run dry). */
export function payFromTreasury(sim: Sim, sid: number, to: Human, amount: number): number {
  const st = sim.state.settlements[sid]
  const paid = st ? Math.max(0, Math.min(amount, st.treasury)) : 0
  if (paid <= 0) return 0
  st!.treasury -= paid
  to.money += paid
  return paid
}

/** All money in the world: purses (player + NPCs, dead included) + treasuries. Conservation checks. */
export function totalMoney(sim: Sim): number {
  let m = sim.state.player.money
  for (const n of sim.state.npcs) m += n.money
  for (const s of sim.state.settlements) m += s.treasury
  return m
}
