import { describe, expect, it } from 'vitest'
import { perf } from '../diag/perf'
import { countItem } from './inventory'
import { run, testSim } from './testWorld'

describe('economy & long simulation', () => {
  it('3 game days at far LOD stay stable: no NaN, people fed, caravan trades between settlements', () => {
    const sim = testSim()
    // Player far away → everything at far LOD (cheap), like normal play elsewhere.
    sim.player.x = 200
    sim.player.z = 200
    const t0 = performance.now()
    run(sim, 3 * 3600, 1)
    const ms = performance.now() - t0
    const alive = sim.state.npcs.filter((n) => !n.vitals.dead)
    expect(alive.length).toBe(sim.state.npcs.length)
    const starving = sim.state.npcs.filter((n) => n.vitals.hunger <= 0 || n.vitals.thirst <= 0).map((n) => `${n.name}/${n.profession ?? n.age}/s${n.settlementId} h${n.vitals.hunger.toFixed(0)} t${n.vitals.thirst.toFixed(0)} ${n.ai.goal}:${n.ai.label} cd=${JSON.stringify(n.ai.cooldowns)}`)
    console.log('starving', starving)
    for (const n of sim.state.npcs) {
      expect(Number.isFinite(n.x) && Number.isFinite(n.z)).toBe(true)
      expect(n.vitals.hunger).toBeGreaterThan(0)
      expect(n.vitals.thirst).toBeGreaterThan(0)
    }
    const whLogs = sim.state.settlements.map((s) => countItem(sim.building(s.warehouseId)!.inv!, 'log'))
    console.log(perf.report().counters, '3 days sim ms', ms.toFixed(0), 'warehouse logs', whLogs, 'felled', Object.values(sim.state.nodes).filter((n) => n.kind === 'felled').length)
    expect(Object.values(sim.state.nodes).filter((n) => n.kind === 'felled').length).toBeGreaterThan(3)
    expect(perf.report().counters['economy.caravanTrades'] ?? 0).toBeGreaterThan(0)
  }, 120_000)
})
