/**
 * WORLD-05: walking into a cave and back out without teleporting, clipping or falling through; surface
 * actors stay out of cuttings.
 */
import { describe, expect, it } from 'vitest'
import { CAVE } from '../config/calibration'
import { spinePoints } from '../world/caveShape'
import { moveWithCollision } from './collision'
import { Sim } from './sim'
import { testSim } from './testWorld'

const SEEDS = [1337, 42, 2020]

function walk(sim: ReturnType<typeof testSim>, tx: number, tz: number, log: { maxDy: number }) {
  const p = sim.player
  for (let n = 0; n < 400; n++) {
    const d = Math.hypot(tx - p.x, tz - p.z)
    if (d < 0.25) return
    const y0 = p.y
    const k = Math.min(0.3, d)
    moveWithCollision(sim, p, ((tx - p.x) / d) * k, ((tz - p.z) / d) * k, 0.35, true)
    log.maxDy = Math.max(log.maxDy, Math.abs(p.y - y0))
  }
}

describe('WORLD-05 cave traversal', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: walk in to the last chamber and back out`, () => {
      const sim = testSim(seed)
      const cave = sim.world.caves[0]
      if (!cave) return
      const pts = spinePoints(cave)
      const dx = Math.sin(cave.yaw)
      const dz = Math.cos(cave.yaw)
      const p = sim.player
      p.x = cave.x - dx * 4
      p.z = cave.z - dz * 4
      p.y = sim.terrain.heightAt(p.x, p.z)
      const log = { maxDy: 0 }
      for (const q of pts) walk(sim, q.x, q.z, log)
      const last = pts[pts.length - 1]!
      expect(sim.state.px.cave, 'inside the cave').toBe(1)
      expect(Math.hypot(p.x - last.x, p.z - last.z)).toBeLessThan(0.5)
      expect(p.y).toBeCloseTo(sim.terrain.caves.grid(0).floorAt(p.x, p.z), 3)
      // Well below the surface above the chamber.
      expect(sim.terrain.heightAt(p.x, p.z) - p.y).toBeGreaterThan(CAVE.chamberHeight)
      for (const q of [...pts].reverse()) walk(sim, q.x, q.z, log)
      walk(sim, cave.x - dx * 4, cave.z - dz * 4, log)
      expect(sim.state.px.cave ?? 0, 'back on the surface').toBe(0)
      expect(p.y).toBeCloseTo(sim.terrain.heightAt(p.x, p.z), 3)
      expect(log.maxDy, 'no jumps').toBeLessThanOrEqual(CAVE.stepM)
    }, 60_000)

    it(`seed ${seed}: surface walkers cannot enter the cutting; the roof above the cave stays walkable`, () => {
      const sim = testSim(seed)
      const cave = sim.world.caves[0]
      if (!cave) return
      const g = sim.terrain.caves.grid(0)
      // An NPC-like actor (not the player) pushed into the cutting is refused.
      const npc = { x: cave.x - Math.sin(cave.yaw) * 4, z: cave.z - Math.cos(cave.yaw) * 4, y: 0 }
      npc.y = sim.terrain.heightAt(npc.x, npc.z)
      for (let i = 0; i < 60; i++) moveWithCollision(sim, npc, Math.sin(cave.yaw) * 0.3, Math.cos(cave.yaw) * 0.3, 0.35, true)
      expect(sim.terrain.caves.skyAt(npc.x, npc.z)).toBe(false)
      expect(npc.y).toBeCloseTo(sim.terrain.heightAt(npc.x, npc.z), 3)
      // Player on the surface above the last chamber keeps surface grounding (no cave context).
      const pts = spinePoints(cave)
      const last = pts[pts.length - 1]!
      expect(g.flagAt(last.x, last.z)).toBeGreaterThan(0)
      sim.player.x = last.x
      sim.player.z = last.z
      sim.player.y = sim.terrain.heightAt(last.x, last.z)
      moveWithCollision(sim, sim.player, 0.2, 0, 0.35, true)
      expect(sim.state.px.cave ?? 0).toBe(0)
      expect(sim.player.y).toBeCloseTo(sim.terrain.heightAt(sim.player.x, sim.player.z), 3)
    }, 60_000)
  }

  it('a game saved inside a cave reloads inside it, on the floor', () => {
    const sim = testSim(1337)
    const cave = sim.world.caves[0]
    if (!cave) return
    const pts = spinePoints(cave)
    const q = pts[3]!
    const g = sim.terrain.caves.grid(0)
    sim.player.x = q.x
    sim.player.z = q.z
    sim.player.y = g.floorAt(q.x, q.z)
    sim.state.px.cave = 1
    const loaded = new Sim(sim.world, JSON.parse(JSON.stringify(sim.state)))
    expect(loaded.state.px.cave).toBe(1)
    loaded.step(0.1)
    expect(loaded.player.y).toBeCloseTo(g.floorAt(loaded.player.x, loaded.player.z), 3)
    expect(loaded.state.px.cave).toBe(1)
  })
})
