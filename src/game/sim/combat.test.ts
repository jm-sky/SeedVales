import { describe, expect, it } from 'vitest'
import { HUNT } from '../config/calibration'
import { meleeAttack } from './combat'
import { updateAnimal } from './fauna/ai'
import { makeAnimal } from './newGame'
import { playerFarAway, run, testSim } from './testWorld'
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

  it('FAUNA-02: predator chase is bounded — gives up after the limit and cools down', () => {
    const sim = testSim()
    playerFarAway(sim)
    const x = sim.player.x
    const z = sim.player.z
    sim.player.x += 1500
    sim.actors.update(sim.player)
    sim.state.weather.kind = 'clear'
    sim.state.time.cal = Math.floor(sim.state.time.cal / 86400) * 86400 + 20 * 3600
    const w = makeAnimal(sim.nextId(), 'wolf', 'adult', x, z, sim.terrain.heightAt(x, z), sim.rng)
    const deer = makeAnimal(sim.nextId(), 'deer', 'adult', x + 12, z, sim.terrain.heightAt(x, z), sim.rng)
    sim.addAnimal(w)
    sim.addAnimal(deer)
    w.hungerH = 20
    w.thirstH = 0
    let hunted = false
    let t = 0
    // The deer always stays ahead (never caught): the chase must end by itself.
    for (; t < HUNT.chaseMaxS + 30; t += 0.1) {
      sim.state.time.play += 0.1
      deer.x = w.x + 8
      deer.z = w.z
      sim.actors.update(deer)
      updateAnimal(sim, w, 0.1, true)
      if (w.ai.goal === 'hunt') hunted = true
      else if (hunted) break
    }
    expect(hunted).toBe(true)
    expect(w.ai.goal).not.toBe('hunt')
    expect(t).toBeLessThanOrEqual(HUNT.chaseMaxS + 1)
    expect(w.ai.cooldowns.hunt ?? 0).toBeGreaterThan(sim.state.time.play)
  })
})
