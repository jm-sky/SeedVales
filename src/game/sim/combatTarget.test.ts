import { describe, expect, it } from 'vitest'
import { COMBAT_LOCK } from '../config/calibration'
import { meleeAttack } from './combat'
import { classify, combatCandidates, lockable, lockedMove, lockInvalid, nextCombatTarget, turnToward } from './combatTarget'
import { makeAnimal } from './newGame'
import { playerInput } from './player'
import { openSpot, run, testSim } from './testWorld'

function arena() {
  const sim = testSim()
  const spot = openSpot(sim)
  const p = sim.player
  p.x = spot.x
  p.z = spot.z
  p.y = sim.terrain.heightAt(p.x, p.z)
  sim.actors.update(p)
  const spawn = (species: 'wolf' | 'deer' | 'cow' | 'sheep', dx: number, dz: number) => {
    const a = makeAnimal(sim.nextId(), species, 'adult', p.x + dx, p.z + dz, p.y, sim.rng)
    sim.addAnimal(a)
    return a
  }
  return { sim, p, spawn }
}

describe('combat--001 target lock core', () => {
  it('UI-06: candidates exclude the player, dead, downed and out-of-range actors', () => {
    const { sim, p, spawn } = arena()
    const near = spawn('wolf', 0, 6)
    const dead = spawn('wolf', 2, 5)
    dead.vitals.dead = true
    const far = spawn('wolf', 0, COMBAT_LOCK.rangeM + 8)
    const ids = combatCandidates(sim, p, 0).map((c) => c.actor.id)
    expect(ids).toContain(near.id)
    expect(ids).not.toContain(dead.id)
    expect(ids).not.toContain(far.id)
    expect(ids).not.toContain(p.id)
    expect(lockable(sim, p, near)).toBe(true)
  })

  it('UI-06: an active attacker outranks a closer neutral animal; neutrals never beat threats; stable order', () => {
    const { sim, p, spawn } = arena()
    const cow = spawn('cow', 0, 3)
    const wolf = spawn('wolf', 0, 12)
    expect(classify(sim, p, cow)).toBe('neutral')
    expect(classify(sim, p, wolf)).toBe('dangerous')
    wolf.aggroId = p.id
    wolf.aggroUntil = sim.state.time.play + 100
    expect(classify(sim, p, wolf)).toBe('threat')
    const list = combatCandidates(sim, p, 0)
    expect(list[0]!.actor.id).toBe(wolf.id)
    expect(list.map((c) => c.actor.id)).toEqual(combatCandidates(sim, p, 0).map((c) => c.actor.id))
  })

  it('UI-06: a visible threat beats a slightly closer one behind the camera', () => {
    const { sim, p, spawn } = arena()
    const behind = spawn('wolf', 0, -5)
    const ahead = spawn('wolf', 0, 7)
    const list = combatCandidates(sim, p, 0) // camera yaw 0 looks along +z
    expect(list[0]!.actor.id).toBe(ahead.id)
    expect(list[1]!.actor.id).toBe(behind.id)
  })

  it('UI-06: cycling is deterministic and wraps; an unknown current id restarts at the best', () => {
    const { sim, p, spawn } = arena()
    spawn('wolf', 0, 5)
    spawn('wolf', 3, 8)
    spawn('wolf', -3, 9)
    const list = combatCandidates(sim, p, 0)
    const a = nextCombatTarget(list, null)!
    const b = nextCombatTarget(list, a.actor.id)!
    const c = nextCombatTarget(list, b.actor.id)!
    const d = nextCombatTarget(list, c.actor.id)!
    expect(new Set([a, b, c].map((x) => x.actor.id)).size).toBe(3)
    expect(d.actor.id).toBe(a.actor.id)
    expect(nextCombatTarget(list, 999999)!.actor.id).toBe(a.actor.id)
    expect(nextCombatTarget([], null)).toBeNull()
  })

  it('UI-06: lock validity — dead, downed and far targets end the lock', () => {
    const { sim, p, spawn } = arena()
    const w = spawn('wolf', 0, 5)
    expect(lockInvalid(sim, p, w.id)).toBeNull()
    w.x = p.x
    w.z = p.z + COMBAT_LOCK.dropRangeM + 2
    sim.actors.update(w)
    expect(lockInvalid(sim, p, w.id)).toBe('range')
    w.vitals.dead = true
    expect(lockInvalid(sim, p, w.id)).toBe('gone')
    expect(lockInvalid(sim, p, 123456789)).toBe('gone')
  })

  it('UI-06: target-relative movement — W approaches, D strafes tangentially, magnitude is kept', () => {
    const bearing = 0 // target along +z
    expect(lockedMove(bearing, 0, 1)).toEqual({ mx: 0, mz: 1 })
    const side = lockedMove(bearing, 1, 0)
    expect(side.mx).toBeCloseTo(-1) // same convention as the camera: looking along +z, "right" is −x
    expect(side.mz).toBeCloseTo(0)
    const diag = lockedMove(bearing, 0.5, 0.5)
    expect(Math.hypot(diag.mx, diag.mz)).toBeCloseTo(Math.hypot(0.5, 0.5))
    const rot = lockedMove(Math.PI / 2, 0, 1) // target along +x
    expect(rot.mx).toBeCloseTo(1)
    expect(rot.mz).toBeCloseTo(0, 5)
  })

  it('UI-06: facing intent keeps the player facing the target while strafing; without it the movement direction is used', () => {
    const { sim, p } = arena()
    p.rot = 0
    const x0 = p.x
    Object.assign(playerInput, { mx: 1, mz: 0, run: false, facing: 0 })
    run(sim, 0.3, 0.05)
    expect(p.x).toBeGreaterThan(x0 + 0.1) // moved sideways
    expect(Math.abs(p.rot)).toBeLessThan(0.01) // still facing +z
    Object.assign(playerInput, { mx: 1, mz: 0, run: false, facing: undefined })
    run(sim, 0.3, 0.05)
    expect(p.rot).toBeCloseTo(Math.PI / 2, 1) // old behaviour: face the movement direction
    Object.assign(playerInput, { mx: 0, mz: 0, facing: undefined })
  })

  it('UI-06: shortest-angle turning is capped (soft assist / camera) and never oscillates across ±π', () => {
    const cap = (COMBAT_LOCK.softAssistDeg * Math.PI) / 180
    expect(turnToward(0, 1, cap)).toBeCloseTo(cap)
    expect(turnToward(0, 0.05, cap)).toBeCloseTo(0.05)
    expect(turnToward(Math.PI - 0.05, -Math.PI + 0.05, cap)).toBeCloseTo(Math.PI + 0.05) // across the seam, the short way
  })

  it('UI-06: meleeAttack prefers the preferred id among valid targets but does not bypass range', () => {
    const { sim, p, spawn } = arena()
    p.eq.main = { id: 'axe', qty: 1, dur: 250 }
    p.rot = 0
    const a = spawn('sheep', 0, 1.2)
    const b = spawn('sheep', 0.3, 1.4)
    sim.state.time.play += 10
    expect(meleeAttack(sim, p, 80, b.id)?.id).toBe(b.id)
    sim.state.time.play += 10
    const farOne = spawn('sheep', 0, 12)
    expect(meleeAttack(sim, p, 80, farOne.id)?.id).not.toBe(farOne.id)
    void a
  })

  it('UI-06: the lock is transient — no saved field names a combat target', () => {
    const { sim } = arena()
    expect(JSON.stringify(sim.state)).not.toMatch(/combatTarget/)
  })
})
