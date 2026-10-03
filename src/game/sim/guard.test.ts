import { describe, expect, it } from 'vitest'
import { DEFENCE } from '../config/calibration'
import { meleeAttack } from './combat'
import { defenceOf, guardOf, resolveDefence, setGuard } from './guard'
import { addItem, newStack } from './inventory'
import { makeAnimal } from './newGame'
import { openSpot, testSim } from './testWorld'
import { hp } from './vitals'

function duel(species: 'wolf' | 'boar' | 'bear' = 'wolf', dz = 1.2) {
  const sim = testSim()
  const spot = openSpot(sim)
  const p = sim.player
  p.x = spot.x
  p.z = spot.z
  p.y = sim.terrain.heightAt(p.x, p.z)
  p.rot = 0 // facing +z
  p.combat = true
  p.vitals.stamina = 100
  sim.actors.update(p)
  const a = makeAnimal(sim.nextId(), species, 'adult', p.x, p.z + dz, p.y, sim.rng)
  sim.addAnimal(a)
  sim.state.time.play += 100
  return { sim, p, a }
}
const hold = (sim: ReturnType<typeof testSim>, on = true) => setGuard(sim, on)

describe('combat--002 block and parry', () => {
  it('COMBAT-02: a front hit is blocked — damage reduced by the class value, stamina spent, weapon worn', () => {
    const { sim, p, a } = duel()
    p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    hold(sim)
    sim.state.time.play += 5 // past the parry window: a plain block
    const r = resolveDefence(sim, p, a, 20)
    expect(r.kind).toBe('block')
    expect(r.damage).toBeCloseTo(20 * (1 - DEFENCE.oneHanded.reduction))
    expect(p.vitals.stamina).toBeCloseTo(100 - 20 * DEFENCE.staminaPerDamage * DEFENCE.oneHanded.efficiency)
    expect(p.eq.main.dur).toBe(200 - DEFENCE.wearPerBlock)
  })

  it('COMBAT-02: arc boundary — inside blocks, just outside and behind bypass', () => {
    const { sim, p, a } = duel()
    p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    hold(sim)
    sim.state.time.play += 5
    const half = (DEFENCE.oneHanded.arcDeg * Math.PI) / 360
    for (const [off, kind] of [[half - 0.02, 'block'], [half + 0.02, 'none'], [Math.PI, 'none']] as const) {
      p.rot = off // attacker straight ahead (+z); the defender faces `off` away from it
      p.vitals.stamina = 100
      expect(resolveDefence(sim, p, a, 10).kind, `${off}`).toBe(kind)
    }
  })

  it('COMBAT-02: parry only inside the window of a fresh press; holding on gives a plain block; release + press restarts it', () => {
    const { sim, p, a } = duel()
    p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    hold(sim)
    expect(resolveDefence(sim, p, a, 10).kind).toBe('parry')
    expect(a.attackReadyAt).toBeGreaterThanOrEqual(sim.state.time.play + DEFENCE.parryAttackerDelayS - 1e-6)
    sim.state.time.play += DEFENCE.oneHanded.parryWindowS + 0.01
    hold(sim) // still held: repeated "down" events do not refresh the window
    expect(resolveDefence(sim, p, a, 10).kind).toBe('block')
    hold(sim, false)
    hold(sim)
    expect(resolveDefence(sim, p, a, 10).kind).toBe('parry')
  })

  it('COMBAT-02: a parry cancels all damage — no body damage through meleeAttack', () => {
    const { sim, p, a } = duel()
    p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    a.aggroId = p.id
    a.aggroUntil = 1e9
    hold(sim)
    const hp0 = hp(p.vitals)
    let parried = 0
    for (let i = 0; i < 40 && parried === 0; i++) {
      a.attackReadyAt = 0
      a.rot = Math.atan2(p.x - a.x, p.z - a.z)
      setGuard(sim, false)
      setGuard(sim, true) // a fresh press each time: always inside the window
      meleeAttack(sim, a, 360)
      if (a.attackReadyAt > sim.state.time.play + 0.5) parried++
    }
    expect(parried).toBeGreaterThan(0)
    expect(hp(p.vitals)).toBe(hp0)
  })

  it('COMBAT-02: not enough stamina → guard break: the hit goes through, guard is down for the lockout, then works again', () => {
    const { sim, p, a } = duel()
    p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    hold(sim)
    sim.state.time.play += 5
    p.vitals.stamina = 2
    const r = resolveDefence(sim, p, a, 30)
    expect(r).toMatchObject({ kind: 'break', damage: 30 })
    expect(p.vitals.stamina).toBe(0)
    p.vitals.stamina = 100
    expect(resolveDefence(sim, p, a, 10).kind).toBe('none') // locked out although RMB is still held
    sim.state.time.play += DEFENCE.guardBreakS + 0.1
    expect(resolveDefence(sim, p, a, 10).kind).toBe('block')
  })

  it('COMBAT-02: a shield is clearly the better blocker and can parry; fists block weakly and cannot parry', () => {
    const { sim, p, a } = duel()
    p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    p.eq.off = { id: 'wooden_shield', qty: 1, dur: 160 }
    expect(defenceOf(p)!.source).toBe('shield')
    expect(DEFENCE.shield.reduction).toBeGreaterThan(DEFENCE.oneHanded.reduction)
    expect(DEFENCE.shield.efficiency).toBeLessThan(DEFENCE.oneHanded.efficiency)
    hold(sim)
    sim.state.time.play += 5
    const r = resolveDefence(sim, p, a, 20)
    expect(r.damage).toBeCloseTo(20 * (1 - DEFENCE.shield.reduction))
    expect(p.eq.off.dur).toBe(160 - DEFENCE.wearPerBlock)
    p.eq.off = undefined
    p.eq.main = undefined
    expect(defenceOf(p)!.source).toBe('unarmed')
    hold(sim, false)
    hold(sim)
    expect(resolveDefence(sim, p, a, 10).kind).toBe('block') // inside the window but fists cannot parry
    p.eq.main = { id: 'short_bow', qty: 1, dur: 100 }
    expect(defenceOf(p)).toBeNull()
  })

  it('COMBAT-02: a two-handed weapon has a narrower arc than a one-handed one; a broken weapon gives no guard', () => {
    const { p } = duel()
    p.eq.main = { id: 'long_sword', qty: 1, dur: 200 }
    expect(defenceOf(p)!.arcDeg).toBe(DEFENCE.twoHanded.arcDeg)
    expect(DEFENCE.twoHanded.arcDeg).toBeLessThan(DEFENCE.oneHanded.arcDeg)
    p.eq.main.dur = 0
    expect(defenceOf(p)).toBeNull()
  })

  it('COMBAT-02: heavy animals — a weapon blocks but never parries a bear; a shield may parry a boar but not a bear', () => {
    const bear = duel('bear')
    bear.p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    hold(bear.sim)
    expect(resolveDefence(bear.sim, bear.p, bear.a, 10).kind).toBe('block')
    bear.p.eq.off = { id: 'wooden_shield', qty: 1, dur: 160 }
    hold(bear.sim, false)
    hold(bear.sim)
    expect(resolveDefence(bear.sim, bear.p, bear.a, 10).kind).toBe('block')
    const boar = duel('boar')
    boar.p.eq.off = { id: 'wooden_shield', qty: 1, dur: 160 }
    hold(boar.sim)
    expect(resolveDefence(boar.sim, boar.p, boar.a, 10).kind).toBe('parry')
    boar.p.eq.off = undefined
    boar.p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    hold(boar.sim, false)
    hold(boar.sim)
    expect(resolveDefence(boar.sim, boar.p, boar.a, 10).kind).toBe('block')
  })

  it('COMBAT-02: no guard outside combat mode or while knocked out; guard state is transient (not saved)', () => {
    const { sim, p, a } = duel()
    p.eq.main = { id: 'sword', qty: 1, dur: 200 }
    hold(sim)
    p.combat = false
    expect(resolveDefence(sim, p, a, 10).kind).toBe('none')
    p.combat = true
    p.vitals.ko = { until: sim.state.time.play + 10, protectUntil: sim.state.time.play + 100 }
    expect(resolveDefence(sim, p, a, 10).kind).toBe('none')
    expect(JSON.stringify(sim.state)).not.toMatch(/brokenUntil|startedAt/)
    expect(guardOf(sim).held).toBe(true)
    addItem(p.inv, newStack('wooden_shield'))
  })
})
