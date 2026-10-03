import { describe, expect, it } from 'vitest'
import { roundTrip } from '../save/snapshot'
import { runOption, targetOptions } from './interact'
import { acceptOffice, cycleTaxRate, headmanOf, mayorDaily, mayorStatus, taxMultiplier } from './mayor'
import { testSim } from './testWorld'
import { collectTaxes } from './treasury'

function ready() {
  const sim = testSim()
  const sid = sim.world.homeSettlement
  const st = sim.state.settlements[sid]!
  return { sim, sid, st }
}
const makeWorthy = (sim: ReturnType<typeof testSim>, sid: number) => {
  const rep = sim.state.settlements[sid]!.rep
  rep.honesty = 50
  rep.helpfulness = 50
  for (const n of sim.npcsOf(sid)) n.opinion = 40
}

describe('SET-05 mayor (minimal slice)', () => {
  it('SET-05: every settlement has a headman resident', () => {
    const sim = testSim()
    for (const st of sim.state.settlements) {
      const h = headmanOf(sim, st.id)
      expect(h, st.name).toBeDefined()
      expect(h!.settlementId).toBe(st.id)
    }
  })

  it('SET-05: the office needs standing; the headman becomes the deputy', () => {
    const { sim, sid, st } = ready()
    const head = headmanOf(sim, sid)!
    expect(mayorStatus(sim, sid).eligible).toBe(false)
    expect(acceptOffice(sim, sid)).toMatch(/Not yet/)
    expect(st.playerMayor).toBeFalsy()
    makeWorthy(sim, sid)
    expect(mayorStatus(sim, sid).eligible).toBe(true)
    acceptOffice(sim, sid)
    expect(st).toMatchObject({ playerMayor: true, deputyId: head.id, taxRate: 'normal' })
    expect(roundTrip(sim).settlements[sid]).toMatchObject({ playerMayor: true, deputyId: head.id })
  })

  it('SET-05: the headman offers the office through the interaction menu only when the player stands in the settlement', () => {
    const { sim, sid } = ready()
    const head = headmanOf(sim, sid)!
    sim.player.x = head.x + 2
    sim.player.z = head.z
    const o = targetOptions(sim, { type: 'npc', id: head.id }).find((x) => x.id === 'ask_office')
    expect(o?.enabled).toBe(false)
    makeWorthy(sim, sid)
    expect(targetOptions(sim, { type: 'npc', id: head.id }).find((x) => x.id === 'ask_office')?.enabled).toBe(true)
    runOption(sim, { type: 'npc', id: head.id }, 'ask_office')
    expect(sim.state.settlements[sid]!.playerMayor).toBe(true)
    // The deputy now offers the tax setting.
    expect(targetOptions(sim, { type: 'npc', id: head.id }).some((x) => x.id === 'set_tax')).toBe(true)
  })

  it('SET-05: the tax rate scales the daily collection; money is conserved', () => {
    const { sim, sid, st } = ready()
    makeWorthy(sim, sid)
    acceptOffice(sim, sid)
    for (const n of sim.npcsOf(sid)) n.money = 220
    const income = (rate: 'low' | 'normal' | 'high') => {
      st.taxRate = rate
      for (const n of sim.npcsOf(sid)) n.money = 220
      const t0 = st.treasury
      st.taxDay = Math.floor(sim.state.time.cal / 86400) - 1
      collectTaxes(sim)
      return st.treasury - t0
    }
    const low = income('low')
    const normal = income('normal')
    const high = income('high')
    expect(low).toBeLessThan(normal)
    expect(normal).toBeLessThan(high)
    expect(taxMultiplier(st)).toBeGreaterThan(1)
    expect(cycleTaxRate(sim, sid)).toMatch(/low/) // high → low
  })

  it('SET-05: falling standing ends the term; the deputy returns as headman', () => {
    const { sim, sid, st } = ready()
    makeWorthy(sim, sid)
    acceptOffice(sim, sid)
    const deputy = st.deputyId
    mayorDaily(sim, st)
    expect(st.playerMayor).toBe(true)
    st.rep.honesty = -20
    mayorDaily(sim, st)
    expect(st.playerMayor).toBe(false)
    expect(st.headmanId).toBe(deputy)
  })

  it('SET-05: only the mayor sets taxes', () => {
    const { sim, sid } = ready()
    expect(cycleTaxRate(sim, sid)).toMatch(/Only the mayor/)
  })
})
