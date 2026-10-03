/**
 * Fire emitters (render--001 step 1a, RENDER-03): one source of truth for flames, lights and (step 1b)
 * particles. Collected from spatial queries only (PERF-01) — buildings, ground items and actors near a point —
 * with the flame size from the sim (`fireLevel`, D-FIRE-1), a stable per-fire phase (fires do not flicker in
 * sync) and the flame position per kind (campfire/hearth bed, torch-post tip, planted-torch tip, held torch at
 * the hand). Pure: no Three objects; render-only look constants live here, not in config (shared with sim).
 * @domain render
 * @subdomain effects
 */
import type { Sim } from '../sim/sim'
import type { QualityProfile } from './quality'
import { caveOf } from '../sim/caveSpace'
import { fireLevel } from '../sim/fire'

export type FireKind = 'campfire' | 'hearth' | 'torchpost' | 'planted' | 'held'

export interface FireEmitter {
  /** Stable key (`b:<id>`, `g:<id>`, `a:<id>`). */
  key: string
  x: number
  y: number
  z: number
  kind: FireKind
  /** Flame size 0..1 (fireLevel for campfire/hearth; torches do not shrink). */
  level: number
  /** 0..2π, stable per key. */
  phase: number
  /** The player's own torch (keeps a light slot when lit). */
  player?: boolean
}

/** Point lights per profile (D-REN-7), including the player's torch. Changes only on a quality switch. */
export const LIGHT_POOL: Record<QualityProfile, number> = { low: 1, medium: 3, high: 4 }

/** Per-kind look: light intensity and range (at level 1), flame height above the anchor. */
export const FIRE_LOOK: Record<FireKind, { intensity: number; range: number }> = {
  hearth: { intensity: 17, range: 20 },
  campfire: { intensity: 14, range: 18 },
  torchpost: { intensity: 10, range: 14 },
  planted: { intensity: 9, range: 13 },
  held: { intensity: 11, range: 15 },
}

/** Height of a planted torch's head above the ground (matches the upright torch mesh in dynamics.ts). */
export const PLANTED_TORCH_H = 1.25

function phaseOf(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return ((h >>> 0) / 4294967296) * Math.PI * 2
}

/**
 * Fills `out` with the fires within `r` m of (cx, cz) and returns their count (the array is reused between
 * frames: entries beyond the count are stale). Held torches only within `heldR` (actors must be near).
 */
export function collectFires(sim: Sim, cx: number, cz: number, r: number, out: FireEmitter[], heldR = 40): number {
  let n = 0
  // Underground fires light only the cave they are in, surface fires only the surface (point lights ignore rock).
  const layer = sim.state.px.cave ?? 0
  const add = (key: string, x: number, y: number, z: number, kind: FireKind, level: number, player = false, cave = 0) => {
    if (cave !== layer) return
    const e = (out[n++] ??= { key: '', x: 0, y: 0, z: 0, kind: 'campfire', level: 0, phase: 0 })
    if (e.key !== key) e.phase = phaseOf(key)
    e.key = key
    e.x = x
    e.y = y
    e.z = z
    e.kind = kind
    e.level = level
    e.player = player
  }
  const h = (x: number, z: number) => sim.terrain.heightAt(x, z)
  for (const b of sim.buildingsNear(cx, cz, r)) {
    if (b.kind === 'campfire') {
      const level = fireLevel(b)
      if (level > 0) add(`b:${b.id}`, b.x, h(b.x, b.z) + 0.1, b.z, b.hearth ? 'hearth' : 'campfire', level)
    } else if (b.kind === 'torchpost' && b.lit) add(`b:${b.id}`, b.x, h(b.x, b.z) + 2.5, b.z, 'torchpost', 1)
  }
  for (const g of sim.groundNear(cx, cz, r)) {
    if (!g.lit) continue
    const gy = g.cave ? sim.terrain.caves.grid(g.cave - 1).floorAt(g.x, g.z) : h(g.x, g.z)
    add(`g:${g.id}`, g.x, gy + (g.planted ? PLANTED_TORCH_H : 0.1), g.z, g.planted ? 'planted' : 'campfire', g.planted ? 1 : 0.35, false, g.cave ?? 0)
  }
  for (const a of sim.actors.query(cx, cz, Math.min(r, heldR))) {
    if (a.kind === 'animal' || a.vitals.dead) continue
    if (a.eq.off?.id !== 'torch' && a.eq.main?.id !== 'torch') continue
    // Hand offset: left side, chest height, slightly forward (no bone lookup — cheap and stable).
    const s = Math.sin(a.rot)
    const c = Math.cos(a.rot)
    add(`a:${a.id}`, a.x + c * 0.3 + s * 0.25, a.y + 1.45, a.z - s * 0.3 + c * 0.25, 'held', 1, a.kind === 'player', caveOf(sim, a))
  }
  return n
}

/**
 * Picks up to `pool` emitters for the point lights: the player's torch first, then by distance to the camera
 * weighted by level (a dying fire counts as farther). Returns indices into `fires` (length ≤ pool).
 */
export function selectLights(fires: readonly FireEmitter[], n: number, pool: number, camX: number, camZ: number, out: number[] = []): number[] {
  out.length = 0
  if (pool <= 0) return out
  const score = (e: FireEmitter) => (e.player ? -1 : ((e.x - camX) ** 2 + (e.z - camZ) ** 2) / Math.max(0.15, e.level) ** 2)
  for (let i = 0; i < n; i++) {
    const s = score(fires[i]!)
    if (out.length < pool) out.push(i)
    else {
      let worst = 0
      for (let k = 1; k < out.length; k++) if (score(fires[out[k]!]!) > score(fires[out[worst]!]!)) worst = k
      if (s < score(fires[out[worst]!]!)) out[worst] = i
    }
  }
  return out
}

/**
 * Gentle unsteady flame breathing for light intensity: three sines (≈ 1.3, 3.7, 7.9 Hz) with the fire's phase,
 * amplitude ≤ ±15 % (user: no strobing). `t` = render seconds (never the calendar).
 */
export function flicker(t: number, phase: number): number {
  const w = Math.sin(t * 8.17 + phase) * 0.6 + Math.sin(t * 23.2 + phase * 1.7) * 0.3 + Math.sin(t * 49.6 + phase * 2.3) * 0.1
  return 1 + w * 0.15
}
