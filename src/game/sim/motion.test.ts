import { describe, expect, it } from 'vitest'
import { JUMP, TRAVERSE } from '../config/calibration'
import { groundHeight } from './collision'
import { motionOf, repairPlacement, requestJump, supportFor } from './motion'
import { playerInput } from './player'
import { openSpot, run, testSim } from './testWorld'

function ready() {
  const sim = testSim()
  const sp = openSpot(sim)
  repairPlacement(sim, sp.x, sp.z)
  sim.player.vitals.stamina = 100
  Object.assign(playerInput, { mx: 0, mz: 0, run: false, facing: undefined, guard: false })
  return sim
}

describe('combat--004 jump', () => {
  it('MOVE-01: a jump rises and lands within the expected gameplay time; height follows the arc', () => {
    const sim = ready()
    const p = sim.player
    const y0 = p.y
    expect(requestJump(sim)).toBe(true)
    let apex = y0
    let t = 0
    for (; t < 2; t += 0.02) {
      sim.step(0.02)
      apex = Math.max(apex, p.y)
      if (motionOf(sim).grounded) break
    }
    expect(motionOf(sim).grounded).toBe(true)
    expect(apex - y0).toBeGreaterThan(0.4)
    expect(apex - y0).toBeLessThan(0.9)
    expect(t).toBeGreaterThan(0.5)
    expect(t).toBeLessThan(1)
    expect(p.y).toBeCloseTo(groundHeight(sim, p.x, p.z), 3)
  })

  it('MOVE-01: costs stamina; no double jump while airborne; refused without stamina or in deep water', () => {
    const sim = ready()
    const s0 = sim.player.vitals.stamina
    expect(requestJump(sim)).toBe(true)
    sim.step(0.05)
    expect(sim.player.vitals.stamina).toBeLessThan(s0)
    expect(motionOf(sim).grounded).toBe(false)
    expect(requestJump(sim)).toBe(false) // airborne
    run(sim, 1.5, 0.05)
    sim.player.vitals.stamina = JUMP.staminaCost - 1
    expect(requestJump(sim)).toBe(false)
  })

  it('MOVE-01: horizontal input continues in the air (a running jump covers more ground than a standing one)', () => {
    const sim = ready()
    const x0 = sim.player.x
    const z0 = sim.player.z
    requestJump(sim)
    Object.assign(playerInput, { mx: 0, mz: 1, run: true })
    for (let i = 0; i < 20; i++) sim.step(0.02)
    expect(Math.hypot(sim.player.x - x0, sim.player.z - z0)).toBeGreaterThan(1)
    expect(motionOf(sim).grounded).toBe(false)
    Object.assign(playerInput, { mx: 0, mz: 0, run: false })
  })

  it('MOVE-01: teleport and placement repair clear a stale arc', () => {
    const sim = ready()
    requestJump(sim)
    sim.step(0.1)
    expect(motionOf(sim).grounded).toBe(false)
    const sp = openSpot(sim, 300)
    repairPlacement(sim, sp.x, sp.z)
    expect(motionOf(sim)).toMatchObject({ grounded: true, vy: 0, jumpRequested: false })
    expect(sim.player.y).toBeCloseTo(groundHeight(sim, sp.x, sp.z), 5)
  })

  it('MOVE-01: motion state is transient — nothing about it is saved', () => {
    const sim = ready()
    requestJump(sim)
    sim.step(0.1)
    expect(JSON.stringify(sim.state)).not.toMatch(/jumpRequested|"vy"/)
  })

  it('MOVE-01: jumping at a sustained too-steep face never climbs it (jump spam gains no height)', () => {
    const sim = ready()
    const t = sim.terrain
    // Find a steep face: gradient well above the walk limit.
    let face: { x: number; z: number; dx: number; dz: number } | null = null
    for (let i = 0; i < 40000 && !face; i++) {
      const x = 200 + ((i * 97) % 7600)
      const z = 200 + ((i * 131) % 7600)
      if (t.waterDepthAt(x, z) > 0) continue
      const g = t.slopeAt(x, z)
      if (g > TRAVERSE.maxUphillRise * 1.6 && g < 6) {
        const gx = (t.heightAt(x + 1, z) - t.heightAt(x - 1, z)) / 2
        const gz = (t.heightAt(x, z + 1) - t.heightAt(x, z - 1)) / 2
        const n = Math.hypot(gx, gz)
        face = { x, z, dx: gx / n, dz: gz / n }
      }
    }
    expect(face, 'no steep face on this seed').not.toBeNull()
    const f = face!
    // Stand 3 m below the face and push uphill while spamming jumps.
    repairPlacement(sim, f.x - f.dx * 3, f.z - f.dz * 3)
    const hStart = sim.player.y
    for (let i = 0; i < 600; i++) {
      Object.assign(playerInput, { mx: f.dx, mz: f.dz, run: true })
      if (i % 40 === 0) {
        sim.player.vitals.stamina = 100
        requestJump(sim)
      }
      sim.step(0.02)
    }
    Object.assign(playerInput, { mx: 0, mz: 0, run: false })
    // The slope here is steeper than ~1.9: the player cannot end up higher than the lip a 0.66 m jump can clear.
    expect(sim.player.y - hStart).toBeLessThan(JUMP.vy ** 2 / (2 * JUMP.gravity) + 1.5)
  })

  it('MOVE-01: a bridge deck is support only when the feet are above it', () => {
    const sim = ready()
    const b = sim.bridges[0]
    if (!b) return
    const terrain = sim.terrain.heightAt(b.x, b.z)
    const deck = groundHeight(sim, b.x, b.z)
    if (deck <= terrain + 0.5) return
    expect(supportFor(sim, b.x, b.z, deck + 0.5)).toBe(deck) // crossing from above
    expect(supportFor(sim, b.x, b.z, terrain)).toBe(terrain) // below the deck: the terrain
  })
})
