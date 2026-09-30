#!/usr/bin/env tsx
/**
 * Headless simulation benchmarks (CPU only — representative for sim cost; NOT for GPU/rendering).
 * Fixed seed, warm-up, fixed duration, per-system timings from shared diag. Writes JSON + Markdown
 * and compares to scripts/bench/baseline.json (regression > 25% on p95 flagged; re-run to confirm).
 * Usage: pnpm bench:sim [--update-baseline]
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Sim } from '../../src/game/sim/sim'
import { perf } from '../../src/game/diag/perf'
import { makeAnimal } from '../../src/game/sim/newGame'
import { playerInput, startActivity } from '../../src/game/sim/player'
import { run, testSim } from '../../src/game/sim/testWorld'
import { heal } from '../../src/game/sim/vitals'
import { Biome } from '../../src/game/world/types'

const SEED = 1337
const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT = path.join(ROOT, 'test-results/bench')
fs.mkdirSync(OUT, { recursive: true })

interface SceneResult {
  scene: string
  params: Record<string, unknown>
  wallMs: number
  stepMs: { median: number; p95: number; p99: number; samples: number; overBudget: number }
  systems: { name: string; median: number; p95: number; samples: number }[]
  load: Record<string, number>
  heapMB?: number
}

function stepStats() {
  const t = perf.report().timers.find((x) => x.name === 'sim.tick')!
  return { median: t.median, p95: t.p95, p99: t.p99, samples: t.samples, overBudget: t.overBudget }
}

function scene(name: string, params: Record<string, unknown>, setup: (sim: Sim) => void, body: (sim: Sim) => void, warm = 5): SceneResult {
  const sim = testSim(SEED)
  setup(sim)
  run(sim, warm, 1 / 60)
  perf.reset()
  perf.detailed.add('sim')
  const t0 = performance.now()
  body(sim)
  const wallMs = performance.now() - t0
  const rep = perf.report()
  const load = {
    npcs: sim.state.npcs.length,
    animals: sim.state.animals.length,
    nearNpc: rep.gauges['npc.near'] ?? 0,
    nearFauna: rep.gauges['fauna.near'] ?? 0,
    spatialQueries: rep.counters['spatial.queries'] ?? 0,
    collisionChecks: rep.counters['collision.checks'] ?? 0,
    aiPlans: rep.counters['ai.plans'] ?? 0,
    aiFailures: rep.counters['ai.failures'] ?? 0,
    chunksGenerated: rep.counters['world.nodes.chunksGenerated'] ?? 0,
  }
  const systems = rep.timers.filter((t) => t.name.startsWith('sim.') && t.name !== 'sim.tick').map((t) => ({ name: t.name, median: t.median, p95: t.p95, samples: t.samples })).sort((a, b) => b.p95 - a.p95)
  perf.detailed.clear()
  return { scene: name, params, wallMs, stepMs: stepStats(), systems, load }
}

const at = (sim: Sim, x: number, z: number) => {
  sim.player.x = x
  sim.player.z = z
  sim.player.y = sim.terrain.heightAt(x, z)
  sim.actors.update(sim.player)
}

const results: SceneResult[] = []
const FRAME = 1 / 60

results.push(scene('small-settlement', { duration_s: 60, frame: '1/60' }, (sim) => at(sim, sim.world.settlements[0]!.x, sim.world.settlements[0]!.z + 10), (sim) => run(sim, 60, FRAME)))

results.push(scene('crowded-settlement', { duration_s: 60, extraAnimals: 60, settlement: 'LG' }, (sim) => {
  const s = sim.world.settlements[2]!
  at(sim, s.x, s.z + 10)
  for (let i = 0; i < 60; i++) {
    const a = makeAnimal(sim.nextId(), i % 3 ? 'chicken' : 'sheep', 'adult', s.x + (i % 10) * 3 - 15, s.z + Math.floor(i / 10) * 3 - 9, s.y, sim.rng)
    sim.addAnimal(a)
  }
}, (sim) => run(sim, 60, FRAME)))

results.push(scene('dense-forest', { duration_s: 60, walking: true }, (sim) => {
  for (let i = 0; i < 20000; i++) {
    const x = 500 + ((i * 97) % 7000)
    const z = 500 + ((i * 131) % 7000)
    if (sim.terrain.biomeAt(x, z) === Biome.ForestConifer) {
      at(sim, x, z)
      break
    }
  }
}, (sim) => {
  playerInput.mx = 1
  run(sim, 60, FRAME)
  playerInput.mx = 0
}))

results.push(scene('combat', { duration_s: 30, wolves: 6 }, (sim) => {
  const s = sim.world.settlements[0]!
  at(sim, s.x + 200, s.z + 200)
  for (let i = 0; i < 6; i++) {
    const w = makeAnimal(sim.nextId(), 'wolf', 'adult', sim.player.x + 8 + i, sim.player.z + 5, 0, sim.rng)
    w.aggroId = sim.player.id
    w.aggroUntil = 1e9
    sim.addAnimal(w)
  }
}, (sim) => {
  for (let t = 0; t < 30; t += 0.5) {
    run(sim, 0.5, FRAME)
    heal(sim.player.vitals, 100)
    sim.player.vitals.ko = undefined
  }
}))

results.push(scene('chunk-traverse', { distance_m: 1200, via: 'road' }, (sim) => {
  const r = sim.world.roads[0]!
  at(sim, r.points[0]!.x, r.points[0]!.z)
}, (sim) => {
  const r = sim.world.roads[0]!
  let idx = 0
  let walked = 0
  while (walked < 1200 && idx < r.points.length - 1) {
    const p = r.points[idx + 1]!
    const d = Math.hypot(p.x - sim.player.x, p.z - sim.player.z)
    if (d < 3) {
      idx++
      continue
    }
    playerInput.mx = (p.x - sim.player.x) / d
    playerInput.mz = (p.z - sim.player.z) / d
    const x0 = sim.player.x
    const z0 = sim.player.z
    run(sim, 1, FRAME)
    walked += Math.hypot(sim.player.x - x0, sim.player.z - z0)
  }
  playerInput.mx = playerInput.mz = 0
}))

results.push(scene('accelerated-sleep', { calendar_h: 8, accel: 40 }, (sim) => at(sim, sim.world.settlements[0]!.x, sim.world.settlements[0]!.z + 10), (sim) => {
  startActivity(sim, { kind: 'sleep', label: 'Sen', total: 8 * 150, accel: 40, data: '0.6' })
  let frames = 0
  while (sim.state.px.activity && frames < 20000) {
    sim.step(FRAME * sim.timeScale)
    frames++
  }
}))

// Long run: memory growth with repeated area visits (far LOD elsewhere).
{
  const sim = testSim(SEED)
  const s0 = sim.world.settlements[0]!
  const s2 = sim.world.settlements[2]!
  global.gc?.()
  const heap0 = process.memoryUsage().heapUsed
  perf.reset()
  const t0 = performance.now()
  for (let day = 0; day < 5; day++) {
    at(sim, day % 2 ? s2.x : s0.x, day % 2 ? s2.z : s0.z)
    run(sim, 3600, 0.5)
  }
  const wallMs = performance.now() - t0
  global.gc?.()
  const heap1 = process.memoryUsage().heapUsed
  results.push({
    scene: 'long-run-5-days', params: { days: 5, revisits: 5, frame: 0.5 }, wallMs, stepMs: stepStats(), systems: [],
    load: { npcs: sim.state.npcs.length, animals: sim.state.animals.length, ground: sim.state.ground.length, corpses: sim.state.corpses.length, nodesState: Object.keys(sim.state.nodes).length, messages: sim.state.messages.length, saveKB: Math.round(JSON.stringify(sim.state).length / 1024) },
    heapMB: (heap1 - heap0) / 1e6,
  })
}

// --- Report ---
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim()
  } catch {
    return 'unknown'
  }
})()
const env = { node: process.version, cpu: os.cpus()[0]?.model, cores: os.cpus().length, platform: `${os.platform()} ${os.release()}`, commit, seed: SEED, date: new Date().toISOString(), diag: 'perf timers on, detailed=sim' }
const report = { env, results }
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
fs.writeFileSync(path.join(OUT, `sim-${stamp}.json`), JSON.stringify(report, null, 1))
fs.writeFileSync(path.join(OUT, 'sim-latest.json'), JSON.stringify(report, null, 1))

const basePath = path.join(import.meta.dirname, 'baseline.json')
const baseline = fs.existsSync(basePath) ? (JSON.parse(fs.readFileSync(basePath, 'utf8')) as typeof report) : null
const lines: string[] = []
lines.push('# Benchmark symulacji (CPU, headless)', '', `Commit ${commit} · ${env.cpu} ×${env.cores} · Node ${env.node} · seed ${SEED}`, '')
lines.push('| Scena | wall ms | tick med | p95 | p99 | >4 ms | obciążenie | najdroższe systemy (p95) | regresja |', '|---|---:|---:|---:|---:|---:|---|---|---|')
for (const r of results) {
  const b = baseline?.results.find((x) => x.scene === r.scene)
  const reg = b && r.stepMs.p95 > b.stepMs.p95 * 1.25 + 0.05 ? `⚠️ p95 ${b.stepMs.p95.toFixed(2)}→${r.stepMs.p95.toFixed(2)}` : b ? 'ok' : '—'
  const top = r.systems.slice(0, 3).map((s) => `${s.name.replace('sim.', '')} ${s.p95.toFixed(2)}`).join(', ')
  const load = Object.entries(r.load).map(([k, v]) => `${k}=${v}`).join(' ')
  lines.push(`| ${r.scene} | ${r.wallMs.toFixed(0)} | ${r.stepMs.median.toFixed(3)} | ${r.stepMs.p95.toFixed(3)} | ${r.stepMs.p99.toFixed(3)} | ${r.stepMs.overBudget} | ${load}${r.heapMB !== undefined ? ` heapΔ=${r.heapMB.toFixed(1)}MB` : ''} | ${top} | ${reg} |`)
}
lines.push('', 'Budżet sim.tick = 4 ms (DECISIONS D-PERF). Regresja = p95 > 1.25× bazy (potwierdzić powtórką).')
const md = lines.join('\n')
fs.writeFileSync(path.join(OUT, 'sim-latest.md'), md)
console.log(md)
if (process.argv.includes('--update-baseline')) {
  fs.writeFileSync(basePath, JSON.stringify(report, null, 1))
  console.log('\nBaseline updated.')
}
