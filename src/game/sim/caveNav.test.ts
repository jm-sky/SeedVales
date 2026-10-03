/**
 * WORLD-05 step 5/7: cave dwellers stay in their cave and move through it; a hired companion follows the player
 * in and out through the mouth (spine waypoints, no teleport, no oscillation).
 */
import { describe, expect, it } from 'vitest'
import { spinePoints } from '../world/caveShape'
import { caveOf, layersApart } from './caveSpace'
import { steerTo } from './movement'
import { testSim } from './testWorld'

const SEEDS = [1337, 42]

type TestSim = ReturnType<typeof testSim>

function placeInCave(sim: TestSim, a: { x: number; y: number; z: number }, ci: number, s: number) {
  const q = spinePoints(sim.world.caves[ci]!)[s]!
  a.x = q.x
  a.z = q.z
  a.y = sim.terrain.caves.grid(ci).floorAt(q.x, q.z)
}

describe('cave dwellers', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: every cave has a resident that wanders but never leaves`, () => {
      const sim = testSim(seed)
      sim.world.caves.forEach((c, ci) => {
        const dwellers = sim.state.animals.filter((a) => a.cave === ci + 1)
        expect(dwellers.length, c.id).toBeGreaterThan(0)
        const g = sim.terrain.caves.grid(ci)
        for (const d of dwellers) {
          expect(g.flagAt(d.x, d.z), 'spawns on an open cell').toBeGreaterThan(0)
          expect(d.y).toBeCloseTo(g.floorAt(d.x, d.z), 1)
        }
      })
    })

    it(`seed ${seed}: a dweller told to go to the surface stays inside, and the player above is on another layer`, () => {
      const sim = testSim(seed)
      const ci = 0
      const cave = sim.world.caves[ci]!
      const d = sim.state.animals.find((a) => a.cave === ci + 1)!
      const g = sim.terrain.caves.grid(ci)
      const out = { x: cave.x - Math.sin(cave.yaw) * 12, z: cave.z - Math.cos(cave.yaw) * 12 }
      const ai = d.ai as typeof d.ai & { stuckT: number }
      for (let n = 0; n < 1500; n++) steerTo(sim, d, out.x, out.z, 3, 0.1, 1, true, 0.3, 0)
      expect(ai.stuckT).toBeGreaterThanOrEqual(0)
      expect(caveOf(sim, d)).toBe(ci + 1)
      expect(g.flagAt(d.x, d.z)).toBeGreaterThan(0)
      sim.player.x = d.x
      sim.player.z = d.z
      expect(layersApart(sim, sim.player, d), 'player on the roof').toBe(true)
    })

    it(`seed ${seed}: a dweller walks the whole spine to the player in the chamber and back`, () => {
      const sim = testSim(seed)
      const ci = 0
      const d = sim.state.animals.find((a) => a.cave === ci + 1)!
      const pts = spinePoints(sim.world.caves[ci]!)
      const g = sim.terrain.caves.grid(ci)
      placeInCave(sim, d, ci, 1)
      const last = pts[pts.length - 1]!
      let steps = 0
      while (Math.hypot(d.x - last.x, d.z - last.z) > 1.5 && steps++ < 2000) steerTo(sim, d, last.x, last.z, 3, 0.1, 1, true, 0.3)
      expect(Math.hypot(d.x - last.x, d.z - last.z), 'reached the chamber').toBeLessThanOrEqual(1.6)
      expect(caveOf(sim, d)).toBe(ci + 1)
      expect(d.y).toBeCloseTo(g.floorAt(d.x, d.z), 2)
    })
  }
})

describe('cave dwellers in the running sim', () => {
  it('after 5 simulated minutes the residents are still in their caves, on open floor', () => {
    const sim = testSim(1337)
    const cave = sim.world.caves[0]!
    sim.player.x = cave.x - Math.sin(cave.yaw) * 30
    sim.player.z = cave.z - Math.cos(cave.yaw) * 30
    sim.player.y = sim.terrain.heightAt(sim.player.x, sim.player.z)
    for (let n = 0; n < 3000; n++) sim.step(0.1)
    for (const a of sim.state.animals.filter((x) => x.cave)) {
      const g = sim.terrain.caves.grid(a.cave! - 1)
      expect(g.flagAt(a.x, a.z), `${a.species} #${a.id} in cave ${a.cave}`).toBeGreaterThan(0)
      expect(a.y).toBeCloseTo(g.floorAt(a.x, a.z), 1)
    }
  }, 60_000)
})

describe('companions underground', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: a companion follows the player in through the mouth and out again`, () => {
      const sim = testSim(seed)
      const ci = 0
      const cave = sim.world.caves[ci]!
      const pts = spinePoints(cave)
      const g = sim.terrain.caves.grid(ci)
      const npc = sim.state.npcs[0]!
      npc.companion = { hiredDay: 0, days: 5, task: 'guard', risk: 'low', wage: 0 } as never
      const dx = Math.sin(cave.yaw)
      const dz = Math.cos(cave.yaw)
      npc.x = cave.x - dx * 14
      npc.z = cave.z - dz * 14
      npc.y = sim.terrain.heightAt(npc.x, npc.z)
      // Player in the last chamber.
      const last = pts[pts.length - 1]!
      sim.state.px.cave = ci + 1
      sim.player.x = last.x
      sim.player.z = last.z
      sim.player.y = g.floorAt(last.x, last.z)
      const ai = npc.ai as typeof npc.ai & { stuckT: number }
      let maxStep = 0
      let steps = 0
      let px = npc.x
      let pz = npc.z
      while (steps++ < 4000 && !(caveOf(sim, npc) === ci + 1 && Math.hypot(npc.x - last.x, npc.z - last.z) < 2.5)) {
        steerTo(sim, npc, last.x, last.z, 3.5, 0.1, 1.8, true, 0.35, ci + 1)
        maxStep = Math.max(maxStep, Math.hypot(npc.x - px, npc.z - pz))
        px = npc.x
        pz = npc.z
      }
      expect(caveOf(sim, npc), 'followed inside').toBe(ci + 1)
      expect(Math.hypot(npc.x - last.x, npc.z - last.z)).toBeLessThan(2.6)
      expect(maxStep, 'no teleport').toBeLessThan(3.5 * 0.1 + 0.05)
      expect(ai.stuckT).toBeLessThan(8)
      // The player walks out; the companion follows to the surface.
      const outside = { x: cave.x - dx * 8, z: cave.z - dz * 8 }
      sim.state.px.cave = 0
      sim.player.x = outside.x
      sim.player.z = outside.z
      sim.player.y = sim.terrain.heightAt(outside.x, outside.z)
      steps = 0
      while (steps++ < 4000 && !(caveOf(sim, npc) === 0 && Math.hypot(npc.x - outside.x, npc.z - outside.z) < 2)) {
        steerTo(sim, npc, outside.x, outside.z, 3.5, 0.1, 1.8, true, 0.35, 0)
      }
      expect(caveOf(sim, npc), 'followed out').toBe(0)
      expect(npc.y).toBeCloseTo(sim.terrain.heightAt(npc.x, npc.z), 1)
    }, 60_000)
  }
})
