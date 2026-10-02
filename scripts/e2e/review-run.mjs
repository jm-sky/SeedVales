#!/usr/bin/env node
/**
 * Application review runner (review--001, skill `app-review`): starts its own Vite server (free port, no HMR),
 * runs the review scenarios and writes test-results/review/<scenario>/NN-<step>.png + observations.json
 * (+ ui-checks.json for review-ui). Prints one summary line per scenario.
 * Usage: node scripts/e2e/review-run.mjs [start] [economy] [combat] [build] [quests] [ui] [frames]   (default: all)
 * Exit code: non-zero only for crashes or console errors; unperformable steps are recorded, not failed.
 */
import { startServer } from './server.mjs'

const ALL = ['start', 'economy', 'combat', 'build', 'quests', 'ui', 'frames']
const wanted = process.argv.slice(2).map((a) => a.replace(/^review-/, '').replace(/\.mjs$/, ''))
const scenarios = wanted.length ? wanted : ALL
const unknown = scenarios.filter((s) => !ALL.includes(s))
if (unknown.length) {
  console.error(`Unknown scenario(s): ${unknown.join(', ')}. Available: ${ALL.join(', ')}`)
  process.exit(2)
}

const server = await startServer()
process.env.SV_URL = server.url
// lib.mjs reads SV_URL at import time, so everything below is imported after the server is up.
const { makeRuntime, openSession } = await import('./review-lib.mjs')

let exitCode = 0
const shutdown = async (code) => {
  await server.close().catch(() => {})
  process.exit(code)
}
process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))

console.log(`review: server ${server.url}`)
for (const name of scenarios) {
  const t0 = Date.now()
  const rt = makeRuntime(name, openSession)
  let crashed = null
  try {
    const mod = await import(`./review-${name}.mjs`)
    await mod.default(rt)
  } catch (e) {
    crashed = String(e?.stack ?? e).slice(0, 600)
    rt.observations.push({ step: 'scenario', ok: false, reason: `crash: ${crashed}` })
  }
  await rt.close()
  const { fatal, shots } = rt.write(crashed ? { crashed } : {})
  const ok = rt.observations.filter((o) => o.ok).length
  const failed = rt.observations.length - ok
  console.log(`review-${name}: ${shots} screenshots · ${ok} steps ok · ${failed} not possible · console errors ${fatal.length}${crashed ? ' · CRASHED' : ''} · ${((Date.now() - t0) / 1000).toFixed(0)} s → test-results/review/${name}/`)
  for (const l of fatal.slice(0, 5)) console.log(`  ${l}`)
  for (const o of rt.observations.filter((x) => !x.ok)) console.log(`  not possible: ${o.step} — ${String(o.reason).slice(0, 140)}`)
  if (crashed || fatal.length) exitCode = 1
}
await shutdown(exitCode)
