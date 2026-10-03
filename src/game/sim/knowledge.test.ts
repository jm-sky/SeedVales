import { describe, expect, it } from 'vitest'
import { consume } from './actions'
import { addItem, newStack } from './inventory'
import { knownToxic, TOXIC_SIGHT_SKILL } from './knowledge'
import { testSim } from './testWorld'

describe('foraging knowledge (P-02)', () => {
  it('eating a poisonous herb teaches it; afterwards eating is refused', () => {
    const sim = testSim()
    const p = sim.player
    p.skills.medicine = 0
    addItem(p.inv, newStack('hemlock', 2))
    expect(knownToxic(sim, 'hemlock')).toBe(false)
    const first = consume(sim, p, p.inv.items.find((s) => s.id === 'hemlock')!)
    expect(first.msg).toMatch(/poisonous/)
    expect(sim.state.px.knownToxic).toEqual(['hemlock'])
    const again = consume(sim, p, p.inv.items.find((s) => s.id === 'hemlock')!)
    expect(again.ok).toBe(false)
    expect(p.inv.items.find((s) => s.id === 'hemlock')!.qty).toBe(1)
  })

  it('a skilled healer recognises poisonous herbs, safe ones never count as toxic', () => {
    const sim = testSim()
    sim.player.skills.medicine = TOXIC_SIGHT_SKILL
    expect(knownToxic(sim, 'nightshade')).toBe(true)
    expect(knownToxic(sim, 'mint')).toBe(false)
  })
})
