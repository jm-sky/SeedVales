#!/usr/bin/env tsx
/**
 * Soak run (verify--001): N game days headless, NPC-life invariants, report in test-results/soak/.
 * The player idles in the first settlement (near LOD for the settlement, far LOD elsewhere).
 * Usage: pnpm soak [--days=10] [--seeds=1337,7,42]
 */
import fs from 'node:fs'
import path from 'node:path'
import v8 from 'node:v8'
import vm from 'node:vm'
import { DAY_S, soakMarkdown, SoakRecorder } from '../../src/game/diag/soak'
import { run, testSim } from '../../src/game/sim/testWorld'

// A forced GC before each heap reading makes the growth number meaningful.
v8.setFlagsFromString('--expose-gc')
;(globalThis as { gc?: () => void }).gc = vm.runInNewContext('gc') as () => void

const heapMB = () => {
  ;(globalThis as { gc?: () => void }).gc?.()
  return process.memoryUsage().heapUsed / 1048576
}

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d
const days = Number(arg('days', '10'))
const seeds = arg('seeds', '1337').split(',').map(Number)
const SAMPLE_S = 10
const FRAME = 0.5
const OUT = path.resolve(import.meta.dirname, '../../test-results/soak')
fs.mkdirSync(OUT, { recursive: true })

let failed = false
const md: string[] = ['# Soak report', '']
for (const seed of seeds) {
  const sim = testSim(seed)
  const s0 = sim.world.settlements[0]!
  const p = sim.player
  p.x = s0.x + 4
  p.z = s0.z + 4
  p.y = sim.terrain.heightAt(p.x, p.z)
  const rec = new SoakRecorder(sim, seed, { heapMB })
  const t0 = performance.now()
  for (let t = 0; t < days * DAY_S; t += SAMPLE_S) {
    run(sim, SAMPLE_S, FRAME)
    rec.sample(t + SAMPLE_S)
  }
  const rep = rec.finish()
  console.log(`seed ${seed}: ${rep.days} days in ${((performance.now() - t0) / 1000).toFixed(0)} s · violations ${rep.violations.length}`)
  fs.writeFileSync(path.join(OUT, `soak-${seed}.json`), JSON.stringify(rep, null, 1))
  md.push(soakMarkdown(rep))
  if (rep.violations.length) failed = true
}
fs.writeFileSync(path.join(OUT, 'soak-latest.md'), md.join('\n'))
console.log(`report: ${path.join(OUT, 'soak-latest.md')}`)
process.exit(failed ? 1 : 0)
