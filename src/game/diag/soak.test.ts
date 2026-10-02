/** verify--001: CI-sized soak — 2 game days, NPC-life invariants hold (nobody starves, everyone eats/drinks/sleeps/works, nobody stuck). */
import { describe, expect, it } from 'vitest'
import { run, testSim } from '../sim/testWorld'
import { DAY_S, SoakRecorder } from './soak'

describe('diag: soak (verify--001)', () => {
  it('2 days: no invariant violations', () => {
    const sim = testSim(1337)
    const s0 = sim.world.settlements[0]!
    sim.player.x = s0.x + 4
    sim.player.z = s0.z + 4
    const rec = new SoakRecorder(sim, 1337)
    for (let t = 0; t < 2 * DAY_S; t += 10) {
      run(sim, 10, 0.5)
      rec.sample(t + 10)
    }
    const rep = rec.finish()
    expect(rep.violations).toEqual([])
    expect(rep.rows).toHaveLength(2)
  }, 60_000)
})
