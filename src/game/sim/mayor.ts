/**
 * The player as mayor (SET-05, minimal slice — settlement--001): every settlement has a headman; with enough
 * standing (reputation + residents' opinion) the headman offers the office, becomes the deputy, and the player
 * sets the tax rate. Losing standing loses the office. Wider powers (project queue) wait for SET-04.
 * @domain sim
 */
import type { Sim } from './sim'
import type { Human, SettlementState, TaxRateChoice } from './types'

export const MAYOR = {
  minHonesty: 30,
  minHelpfulness: 30,
  minOpinion: 20,
  /** The office is lost when honesty or helpfulness fall below this, or residents' average opinion turns negative. */
  loseBelow: -5,
  taxMul: { low: 0.5, normal: 1, high: 1.6 } as Record<TaxRateChoice, number>,
  /** Daily opinion cost of high taxes (per resident). */
  highTaxOpinion: 0.4,
} as const

export const TAX_RATES: readonly TaxRateChoice[] = ['low', 'normal', 'high']

/** The settlement's headman: an elder of the village, else the first household head (set at new game). */
export function headmanOf(sim: Sim, sid: number): Human | undefined {
  const id = sim.state.settlements[sid]?.headmanId
  return id === undefined ? undefined : sim.human(id)
}

export const isMayor = (sim: Sim, sid: number) => !!sim.state.settlements[sid]?.playerMayor

/** Mean opinion the settlement's living residents hold of the player. */
export function residentOpinion(sim: Sim, sid: number): number {
  const ns = sim.npcsOf(sid).filter((n) => !n.vitals.dead)
  return ns.length ? ns.reduce((a, n) => a + n.opinion, 0) / ns.length : 0
}

export interface MayorStatus {
  eligible: boolean
  /** What is still missing (player-facing), empty when eligible. */
  missing: string[]
}

export function mayorStatus(sim: Sim, sid: number): MayorStatus {
  const rep = sim.state.settlements[sid]?.rep
  const missing: string[] = []
  if (!rep || rep.honesty < MAYOR.minHonesty) missing.push('more honesty')
  if (!rep || rep.helpfulness < MAYOR.minHelpfulness) missing.push('more helpfulness')
  if (residentOpinion(sim, sid) < MAYOR.minOpinion) missing.push('better standing with the residents')
  return { eligible: missing.length === 0, missing }
}

/** Assigns the headman of every settlement (new game only): the oldest-looking resident. */
export function assignHeadmen(sim: { state: { settlements: SettlementState[]; npcs: Human[] } }) {
  for (const st of sim.state.settlements) {
    const res = sim.state.npcs.filter((n) => n.settlementId === st.id)
    const pick = res.find((n) => n.kin === 'elder') ?? res.find((n) => n.kin === 'head' && n.age !== 'child')
    if (pick) st.headmanId = pick.id
  }
}

/** Keeps the posts filled (review 019 #9): a dead/missing headman or deputy is replaced by an adult resident; old saves get a headman. */
export function ensureOfficeHolders(sim: Sim, st: SettlementState) {
  const alive = (id: number | undefined) => {
    const h = id === undefined ? undefined : sim.human(id)
    return !!h && !h.vitals.dead
  }
  const pick = (exclude?: number) => {
    const res = sim.npcsOf(st.id).filter((n) => !n.vitals.dead && n.age !== 'child' && n.id !== exclude)
    return res.find((n) => n.kin === 'elder') ?? res.find((n) => n.kin === 'head') ?? res[0]
  }
  if (!alive(st.headmanId)) {
    if (st.playerMayor && alive(st.deputyId)) {
      st.headmanId = st.deputyId
      st.deputyId = pick(st.headmanId)?.id
    } else st.headmanId = pick(st.deputyId)?.id
  }
  if (st.playerMayor && !alive(st.deputyId)) st.deputyId = pick(st.headmanId)?.id
}

/** The headman hands over the office; they stay on as the deputy. */
export function acceptOffice(sim: Sim, sid: number): string {
  const st = sim.state.settlements[sid]
  const head = headmanOf(sim, sid)
  if (!st || !head) return 'There is nobody to hand over the office.'
  if (st.playerMayor) return 'You already lead this settlement.'
  const s = mayorStatus(sim, sid)
  if (!s.eligible) return `${head.name}: "Not yet — ${s.missing.join(' and ')}."`
  st.playerMayor = true
  st.deputyId = head.id
  st.taxRate = 'normal'
  head.opinion = Math.min(100, head.opinion + 10)
  sim.message(`You are now the mayor of ${st.name}. ${head.name} stays as your deputy.`, 'info')
  return `${head.name}: "The village chooses you."`
}

/** Mayor power: steps the tax rate low → normal → high → low. */
export function cycleTaxRate(sim: Sim, sid: number): string {
  const st = sim.state.settlements[sid]
  if (!st?.playerMayor) return 'Only the mayor sets taxes.'
  const cur = st.taxRate ?? 'normal'
  const next = TAX_RATES[(TAX_RATES.indexOf(cur) + 1) % TAX_RATES.length]!
  st.taxRate = next
  const effect = next === 'low' ? 'half the income, residents are content' : next === 'high' ? `+${Math.round((MAYOR.taxMul.high - 1) * 100)}% income, residents lose opinion of you every day` : 'normal income'
  const msg = `Taxes in ${st.name}: ${next} (${effect}).`
  sim.message(msg, 'info')
  return msg
}

/** Tax multiplier for a settlement (1 unless a player mayor changed it). */
export const taxMultiplier = (st: SettlementState) => (st.playerMayor ? MAYOR.taxMul[st.taxRate ?? 'normal'] : 1)

/** Daily upkeep of the office: high taxes sour opinions; falling standing ends the term. */
export function mayorDaily(sim: Sim, st: SettlementState) {
  ensureOfficeHolders(sim, st)
  if (!st.playerMayor) return
  if (st.taxRate === 'high') for (const n of sim.npcsOf(st.id)) if (!n.vitals.dead) n.opinion = Math.max(-100, n.opinion - MAYOR.highTaxOpinion)
  if (st.rep.honesty < MAYOR.loseBelow || st.rep.helpfulness < MAYOR.loseBelow || residentOpinion(sim, st.id) < 0) {
    st.playerMayor = false
    st.taxRate = undefined
    if (st.deputyId !== undefined) st.headmanId = st.deputyId
    st.deputyId = undefined
    sim.message(`${st.name} has withdrawn its trust: you are no longer the mayor.`, 'info')
  }
}
