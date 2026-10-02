/**
 * Settlement treasury: the payer/payee for flows without a natural counterpart (quest rewards,
 * caravan fees, inn without innkeeper, penance). Money is only moved, never created (D-ECON-1).
 * @domain economy
 */
import type { Sim } from './sim'
import type { Human } from './types'
import { TAX } from '../config/calibration'
import { logMoney } from './eventLog'

export function payToTreasury(sim: Sim, sid: number, from: Human, amount: number): number {
  const st = sim.state.settlements[sid]
  const paid = Math.max(0, Math.min(amount, from.money))
  if (!st || paid <= 0) return 0
  from.money -= paid
  st.treasury += paid
  logMoney(from.kind === 'player' ? 'player' : `npc:${from.id}`, `treasury:${sid}`, paid, 'to_treasury', from.id, sid)
  return paid
}

/** Pays up to `amount` from the treasury; returns what was actually paid (treasury may run dry). */
export function payFromTreasury(sim: Sim, sid: number, to: Human, amount: number): number {
  const st = sim.state.settlements[sid]
  const paid = st ? Math.max(0, Math.min(amount, st.treasury)) : 0
  if (paid <= 0) return 0
  st!.treasury -= paid
  to.money += paid
  logMoney(`treasury:${sid}`, to.kind === 'player' ? 'player' : `npc:${to.id}`, paid, 'from_treasury', to.id, sid)
  return paid
}

/** Once per calendar day: each living NPC pays TAX.rate of its purse above TAX.exempt (floor). */
export function collectTaxes(sim: Sim) {
  const day = Math.floor(sim.state.time.cal / 86400)
  for (const st of sim.state.settlements) {
    if (st.taxDay === day) continue
    const first = st.taxDay === undefined
    st.taxDay = day
    if (first) continue // no retroactive tax at game start / after load of an old save
    for (const n of sim.npcsOf(st.id)) {
      if (n.vitals.dead) continue
      payToTreasury(sim, st.id, n, Math.floor(Math.max(0, n.money - TAX.exempt) * TAX.rate))
    }
  }
}

/** All money in the world: purses (player + NPCs, dead included) + treasuries. Conservation checks. */
export function totalMoney(sim: Sim): number {
  let m = sim.state.player.money
  for (const n of sim.state.npcs) m += n.money
  for (const s of sim.state.settlements) m += s.treasury
  return m
}
