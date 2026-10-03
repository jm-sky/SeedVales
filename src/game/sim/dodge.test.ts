import { describe, expect, it } from 'vitest'
import { DODGE } from '../config/calibration'
import { dodgeOf, isDodging, requestDodge } from './dodge'
import { addItem, newStack } from './inventory'
import { repairPlacement } from './motion'
import { playerInput } from './player'
import { openSpot, run, testSim } from './testWorld'

function ready() {
  const sim = testSim()
  const sp = openSpot(sim)
  repairPlacement(sim, sp.x, sp.z)
  const p = sim.player
  p.combat = true
  p.vitals.stamina = 100
  p.eq.main = { id: 'sword', qty: 1, dur: 200 }
  Object.assign(playerInput, { mx: 0, mz: 0, run: false, facing: undefined, guard: false })
  sim.state.time.play += 100
  return { sim, p }
}

describe('combat--003 dodge', () => {
  it('COMBAT-03: displaces about DODGE.distanceM along the fixed direction in DODGE.durationS, spends stamina, no teleport', () => {
    const { sim, p } = ready()
    const x0 = p.x
    const z0 = p.z
    expect(requestDodge(sim, 1, 0)).toBeNull()
    expect(p.vitals.stamina).toBeLessThan(100 - DODGE.staminaCost + 5)
    sim.step(0.05)
    expect(Math.hypot(p.x - x0, p.z - z0)).toBeLessThan(DODGE.distanceM / 2) // gradual
    run(sim, DODGE.durationS + 0.2, 0.02)
    const moved = Math.hypot(p.x - x0, p.z - z0)
    expect(moved).toBeGreaterThan(DODGE.distanceM * 0.6)
    expect(moved).toBeLessThan(DODGE.distanceM * 1.15)
    expect(p.x - x0).toBeGreaterThan(Math.abs(p.z - z0)) // along +x
    expect(isDodging(sim)).toBe(false)
  })

  it('COMBAT-03: refusals — recovery, low stamina, outside combat, overload, cart, activity, KO, mid-swing', () => {
    const { sim, p } = ready()
    expect(requestDodge(sim, 0, 1)).toBeNull()
    expect(requestDodge(sim, 0, 1)).toBe('Not yet.') // recovery
    run(sim, DODGE.recoveryS + 0.1, 0.02)
    p.vitals.stamina = DODGE.staminaCost - 1
    expect(requestDodge(sim, 0, 1)).toBe('Too tired to dodge.')
    p.vitals.stamina = 100
    p.combat = false
    expect(requestDodge(sim, 0, 1)).toMatch(/combat mode/)
    p.combat = true
    p.action = { kind: 'swing', at: sim.state.time.play }
    expect(requestDodge(sim, 0, 1)).toBe('You are mid-swing.')
    p.action = { kind: 'swing', at: sim.state.time.play - DODGE.strikeCommitS - 0.01 }
    expect(requestDodge(sim, 0, 1)).toBeNull() // after the committed part of the swing
    run(sim, DODGE.recoveryS + 0.1, 0.02)
    sim.state.px.activity = { kind: 'chop', label: 'x', total: 10, elapsed: 0 }
    expect(requestDodge(sim, 0, 1)).toBe('You are busy.')
    sim.state.px.activity = undefined
    p.vitals.ko = { until: sim.state.time.play + 10, protectUntil: sim.state.time.play + 100 }
    expect(requestDodge(sim, 0, 1)).toBe('You cannot dodge now.')
    p.vitals.ko = undefined
    for (let i = 0; i < 40; i++) addItem(p.inv, newStack('rock_chunk', 5))
    expect(requestDodge(sim, 0, 1)).toBe('You are carrying too much to dodge.')
  })

  it('COMBAT-03: a dodge cancels the guard, a bow draw (without firing) and autopilot; a refused dodge cancels nothing', () => {
    const { sim, p } = ready()
    sim.state.px.bowDraw = 0.7
    sim.state.px.autopilot = { roadId: 0, idx: 0, dir: 1 }
    p.vitals.stamina = 1
    requestDodge(sim, 1, 0)
    expect(sim.state.px.bowDraw).toBe(0.7)
    expect(sim.state.px.autopilot).toBeDefined()
    p.vitals.stamina = 100
    expect(requestDodge(sim, 1, 0)).toBeNull()
    expect(sim.state.px.bowDraw).toBe(0)
    expect(sim.state.px.autopilot).toBeUndefined()
  })

  it('COMBAT-03: the dodge state is transient and keeps its fixed direction', () => {
    const { sim } = ready()
    expect(requestDodge(sim, 1, 0)).toBeNull()
    expect(dodgeOf(sim).dirX).toBeCloseTo(1)
    expect(JSON.stringify(sim.state)).not.toMatch(/recoveryUntil|activeUntil/)
  })
})
