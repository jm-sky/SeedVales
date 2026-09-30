import { describe, expect, it } from 'vitest'
import { meleeAttack } from './combat'
import { makeAnimal } from './newGame'
import { run, testSim } from './testWorld'
import { hp } from './vitals'

describe('combat', () => {
  it('player kills an attacking wolf with an axe in melee', () => {
    const sim = testSim()
    const p = sim.player
    p.eq.main = { id: 'axe', qty: 1, dur: 250 }
    const w = makeAnimal(sim.nextId(), 'wolf', 'adult', p.x, p.z + 3, p.y, sim.rng)
    sim.addAnimal(w)
    w.aggroId = p.id
    w.aggroUntil = 1e9
    let swings = 0
    for (let i = 0; i < 400 && !w.vitals.dead; i++) {
      run(sim, 0.1)
      p.rot = Math.atan2(w.x - p.x, w.z - p.z)
      if (meleeAttack(sim, p, 80) !== null) swings++
    }
    expect(swings).toBeGreaterThan(0)
    expect(w.vitals.dead).toBe(true)
    expect(sim.state.corpses.some((c) => c.species === 'wolf')).toBe(true)
    expect(hp(p.vitals)).toBeLessThan(p.vitals.maxHp)
  })

  it('knocked-out player is protected for 120 s and stands up after ~3 s', () => {
    const sim = testSim()
    const p = sim.player
    p.vitals.parts.torso = 500
    const w = makeAnimal(sim.nextId(), 'wolf', 'alpha', p.x, p.z + 1, p.y, sim.rng)
    sim.addAnimal(w)
    w.aggroId = p.id
    w.aggroUntil = 1e9
    run(sim, 3)
    expect(p.vitals.ko).toBeDefined()
    const hpAt = hp(p.vitals)
    run(sim, 60)
    expect(hp(p.vitals)).toBeGreaterThanOrEqual(hpAt - 0.01)
    expect(p.vitals.ko!.until).toBeLessThan(sim.state.time.play)
  })
})
