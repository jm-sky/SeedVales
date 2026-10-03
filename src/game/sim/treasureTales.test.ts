import { describe, expect, it } from 'vitest'
import { testSim } from './testWorld'
import { askAboutTales, compassWord } from './treasureTales'

describe('treasure tales (P-06)', () => {
  it('compass words', () => {
    expect(compassWord(0, 0, 0, -10)).toBe('north')
    expect(compassWord(0, 0, 10, 0)).toBe('east')
    expect(compassWord(0, 0, 0, 10)).toBe('south')
    expect(compassWord(0, 0, -10, 10)).toBe('south-west')
  })

  it('names a landmark with buried loot once, then moves on; refuses disliked askers', () => {
    const sim = testSim()
    const npc = sim.npcsOf(0)[0]!
    npc.opinion = 20
    const first = askAboutTales(sim, npc)
    expect(first).toMatch(/buried at/)
    expect(askAboutTales(sim, npc)).not.toBe(first)
    expect(sim.state.px.talesTold!.length).toBeGreaterThan(0)
    npc.opinion = -50
    expect(askAboutTales(sim, npc)).toMatch(/nothing to tell/)
  })
})
