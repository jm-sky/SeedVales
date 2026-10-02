/**
 * verify--001: CI-sized soak — 2 game days, NPC-life invariants hold (nobody starves, everyone eats/drinks/sleeps, nobody stuck)
 * plus the ledger/economy/fire/perf invariants (conservation of every item and of money, hearths lit, tick p95 recorded; judged by `pnpm soak`).
 */
import { describe, expect, it } from 'vitest'
import { run, testSim } from '../sim/testWorld'
import { DAY_S, SOAK_LIMITS, SoakRecorder } from './soak'

describe('diag: soak (verify--001)', () => {
  it('2 days: no invariant violations', () => {
    const sim = testSim(1337)
    const s0 = sim.world.settlements[0]!
    sim.player.x = s0.x + 4
    sim.player.z = s0.z + 4
    // Tick time is measured but not judged here: vitest workers share the CPU; `pnpm soak` and `bench:sim` judge it (D-VERIFY-1).
    const rec = new SoakRecorder(sim, 1337, { timing: false })
    for (let t = 0; t < 2 * DAY_S; t += 10) {
      run(sim, 10, 0.5)
      rec.sample(t + 10)
    }
    const rep = rec.finish()
    expect(rep.violations).toEqual([])
    expect(rep.rows).toHaveLength(2)
    expect(rep.residuals).toEqual({})
    expect(rep.money.now).toBe(rep.money.start + rep.money.minted)
    expect(rep.tick.samples).toBeGreaterThan(0)
    expect(Object.values(rep.hearthShare).every((x) => x >= SOAK_LIMITS.hearthLitMin)).toBe(true)
    expect(rep.rows.every((r) => Object.values(r.output).some((n) => n > 0))).toBe(true)
  }, 60_000)
})
