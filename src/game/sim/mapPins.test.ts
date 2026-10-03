import { describe, expect, it } from 'vitest'
import { addPin, MAX_PINS, removePin } from './navigation'
import { testSim } from './testWorld'

describe('map pins (P-08)', () => {
  it('drops notes at the player position, numbers empty labels, caps the list', () => {
    const sim = testSim()
    expect(addPin(sim, '  Good spring  ')).toContain('Good spring')
    addPin(sim, '')
    const pins = sim.state.px.pins!
    expect(pins.map((n) => n.label)).toEqual(['Good spring', 'Note 2'])
    expect(pins[0]).toMatchObject({ x: sim.player.x, z: sim.player.z })
    for (let i = 0; i < MAX_PINS; i++) addPin(sim, 'x')
    expect(pins.length).toBe(MAX_PINS)
    removePin(sim, 1)
    expect(sim.state.px.pins!.some((n) => n.id === 1)).toBe(false)
  })
})
