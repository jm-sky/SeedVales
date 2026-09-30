/**
 * UI-03: primary melee/ranged weapon choice and quick switching (plan ui--001 step 1).
 */
import { describe, expect, it } from 'vitest'
import type { Sim } from './sim'
import { snapshot } from '../save/snapshot'
import { addItem } from './inventory'
import { setPrimary, switchWeapon, weaponChoices } from './loadout'
import { testSim } from './testWorld'

function armed(): Sim {
  const sim = testSim()
  const p = sim.player
  p.eq.main = undefined
  p.inv.items = p.inv.items.filter((s) => !s.id.includes('bow') && !['axe', 'club', 'dagger', 'knife', 'spear', 'sword'].includes(s.id))
  for (const id of ['club', 'sword', 'short_bow', 'long_bow']) addItem(p.inv, { id, qty: 1, dur: 100 })
  return sim
}

describe('UI-03 loadout', () => {
  it('lists carried weapons grouped by kind', () => {
    const sim = armed()
    const c = weaponChoices(sim)
    expect(c.melee).toEqual(expect.arrayContaining(['club', 'sword']))
    expect(c.ranged).toEqual(expect.arrayContaining(['short_bow', 'long_bow']))
  })

  it('rejects a primary of the wrong kind', () => {
    const sim = armed()
    expect(setPrimary(sim, 'melee', 'short_bow')).toBe('')
    expect(sim.state.px.primary?.melee).toBeUndefined()
  })

  it('switches between the chosen primaries and falls back to the strongest weapon', () => {
    const sim = armed()
    // No primary: melee fallback is the strongest carried melee weapon.
    switchWeapon(sim, 'melee')
    expect(sim.player.eq.main?.id).toBe('sword')
    setPrimary(sim, 'ranged', 'short_bow')
    switchWeapon(sim)
    expect(sim.player.eq.main?.id).toBe('short_bow')
    // Previous weapon went back to the inventory, nothing duplicated or lost.
    expect(sim.player.inv.items.filter((s) => s.id === 'sword')).toHaveLength(1)
    setPrimary(sim, 'melee', 'club')
    switchWeapon(sim)
    expect(sim.player.eq.main?.id).toBe('club')
    expect(sim.player.inv.items.some((s) => s.id === 'short_bow')).toBe(true)
  })

  it('reports a missing weapon kind without changing the hand', () => {
    const sim = armed()
    sim.player.inv.items = sim.player.inv.items.filter((s) => !s.id.includes('bow'))
    switchWeapon(sim, 'melee')
    expect(switchWeapon(sim, 'ranged')).toMatch(/Brak/)
    expect(sim.player.eq.main?.id).toBe('sword')
  })

  it('review 004 #4: a two-handed weapon puts the off-hand torch back in the pack', () => {
    const sim = armed()
    const p = sim.player
    switchWeapon(sim, 'melee')
    p.eq.off = { id: 'torch', qty: 1 }
    switchWeapon(sim, 'ranged')
    expect(p.eq.main?.id).toMatch(/bow/)
    expect(p.eq.off).toBeUndefined()
    expect(p.inv.items.some((s) => s.id === 'torch')).toBe(true)
  })

  it('persists the primary choice in the save snapshot', () => {
    const sim = armed()
    setPrimary(sim, 'ranged', 'long_bow')
    const snap = JSON.parse(JSON.stringify(snapshot(sim)))
    expect(snap.px.primary.ranged).toBe('long_bow')
  })
})
