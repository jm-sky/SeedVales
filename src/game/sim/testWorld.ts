/**
 * Shared test fixture: one generated world per seed (generation is ~2 s), fresh state per call.
 * @domain test
 */
import type { WorldData } from '../world/types'
import { generateWorld } from '../world/gen/generate'
import { deserializeWorld, serializeWorld } from '../world/serialize'
import { createNewGame } from './newGame'
import { Sim } from './sim'
import { installSystems } from './worldSystems'

export { openSpot } from '../debug/openSpot'

const worlds = new Map<number, WorldData>()

/** On-disk world cache installed by `scripts/vitest-world-cache.mjs` (absent → always generate). */
export interface SvWorldCacheHook {
  load(seed: number): Uint8Array | null
  save(seed: number, bytes: Uint8Array): void
}
const diskCache = (): SvWorldCacheHook | undefined => (globalThis as { __svWorldCache?: SvWorldCacheHook }).__svWorldCache

/** Generated world for a seed: per-file memory cache → on-disk cache (shared across files/runs) → generate. */
export function testWorld(seed = 1337): WorldData {
  let w = worlds.get(seed)
  if (w) return w
  const bytes = diskCache()?.load(seed)
  if (bytes) w = deserializeWorld(bytes)
  else {
    w = generateWorld(seed)
    diskCache()?.save(seed, serializeWorld(w))
  }
  worlds.set(seed, w)
  return w
}

export function testSim(seed = 1337): Sim {
  const w = testWorld(seed)
  const sim = new Sim(w, createNewGame(w))
  installSystems(sim)
  return sim
}

/** Advance simulation by gameplay seconds in fixed frames. */
export function run(sim: Sim, seconds: number, frame = 0.1) {
  for (let t = 0; t < seconds; t += frame) sim.step(frame * sim.timeScale)
}

/** Moves the player to dry land far from all settlements (everything runs at far LOD). */
export function playerFarAway(sim: Sim) {
  const s = sim.world.settlements
  for (let i = 0; i < 5000; i++) {
    const x = 300 + ((i * 131) % 7500)
    const z = 300 + ((i * 197) % 7500)
    if (sim.terrain.waterDepthAt(x, z) > 0 || sim.terrain.heightAt(x, z) < 2) continue
    if (s.some((st) => Math.hypot(st.x - x, st.z - z) < 1500)) continue
    sim.player.x = x
    sim.player.z = z
    sim.player.y = sim.terrain.heightAt(x, z)
    sim.actors.update(sim.player)
    return
  }
}

