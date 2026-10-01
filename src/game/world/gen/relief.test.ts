/**
 * WORLD-12: mid-scale terrain relief (40–250 m hills/hollows) keeps lowlands walkable and keeps flat meadows.
 * Slopes are measured on the 8 m base heightfield (central differences); lowland = land away from coast and mountain mask.
 */
import { describe, expect, it } from 'vitest'
import { CELL_M, GEN_VERSION, GRID_N } from '../types'
import { generateBaseFields } from './heightfield'

const SEEDS = [1337, 42, 777]
const SLOPE_LIMIT = 1.2 // sim/collision.ts: climbs steeper than this are blocked
const BIN_EDGES = [0.02, 0.05, 0.1, 0.2, 0.4]

function lowlandSlopes(seed: number) {
  const { height, mountain } = generateBaseFields(seed)
  const n = GRID_N
  const out: number[] = []
  for (let j = 4; j < n - 4; j += 2) {
    for (let i = 4; i < n - 4; i += 2) {
      const k = j * n + i
      if (height[k]! < 4) continue
      let skip = false // keep away from the sea/coast and the mountain foot
      for (let dj = -4; dj <= 4 && !skip; dj += 4) for (let di = -4; di <= 4; di += 4) {
        const k2 = (j + dj) * n + i + di
        if (height[k2]! < 1.5 || mountain[k2]! > 0.01) { skip = true; break }
      }
      if (skip) continue
      const dx = (height[k + 1]! - height[k - 1]!) / (2 * CELL_M)
      const dz = (height[k + n]! - height[k - n]!) / (2 * CELL_M)
      out.push(Math.hypot(dx, dz))
    }
  }
  return out.sort((a, b) => a - b)
}

/** Mid-scale relief: height minus the ±112 m box mean, sampled on lowland cells (rms over 9×9 blocks). */
function reliefRms(seed: number) {
  const { height, mountain } = generateBaseFields(seed)
  const n = GRID_N
  const R = 14
  const out: number[] = []
  for (let j = R + 2; j < n - R - 2; j += 16) {
    for (let i = R + 2; i < n - R - 2; i += 16) {
      let sum = 0
      let cnt = 0
      let bad = false
      for (let dj = -R; dj <= R && !bad; dj += 2) for (let di = -R; di <= R; di += 2) {
        const k = (j + dj) * n + i + di
        if (height[k]! < 2 || mountain[k]! > 0.01) { bad = true; break }
        sum += height[k]!
        cnt++
      }
      if (bad) continue
      // detrend the big hills: compare with the ring mean at ±R instead of the box (rough, but scale-selective)
      const c = height[j * n + i]!
      out.push(Math.abs(c - sum / cnt))
    }
  }
  return out.sort((a, b) => a - b)
}

describe('WORLD-12 terrain relief', () => {
  it('GEN_VERSION is at least 9 (relief changed the heightfield)', () => {
    expect(GEN_VERSION).toBeGreaterThanOrEqual(9)
  })
  for (const seed of SEEDS) {
    it(`seed ${seed}: lowland stays walkable, flat meadows and real relief both exist`, () => {
      const s = lowlandSlopes(seed)
      expect(s.length).toBeGreaterThan(2000)
      const q = (p: number) => s[Math.min(s.length - 1, Math.floor(s.length * p))]!
      const flat = s.filter((v) => v < BIN_EDGES[1]!).length / s.length
      const lively = s.filter((v) => v > BIN_EDGES[2]!).length / s.length
      console.log(`seed ${seed} slope p50 ${q(0.5).toFixed(3)} p95 ${q(0.95).toFixed(3)} p99 ${q(0.99).toFixed(3)} max ${q(1).toFixed(3)} flat<5% ${(flat * 100).toFixed(0)}% >10% ${(lively * 100).toFixed(1)}%`)
      const r = reliefRms(seed)
      const rq = (p: number) => r[Math.min(r.length - 1, Math.floor(r.length * p))]!
      console.log(`seed ${seed} relief |h-mean112| p10 ${rq(0.1).toFixed(2)} p50 ${rq(0.5).toFixed(2)} p90 ${rq(0.9).toFixed(2)} n ${r.length}`)
      expect(q(0.99)).toBeLessThan(SLOPE_LIMIT * 0.5)
      expect(flat).toBeGreaterThan(0.2) // meadows stay flat somewhere
      expect(lively).toBeGreaterThan(0.3) // …and slopes of >10% are common in rolling country
      expect(rq(0.1)).toBeLessThan(0.7) // flat regions exist (low hilliness)
      expect(rq(0.5)).toBeGreaterThan(1.05) // typical lowland has visible relief
      expect(rq(0.9)).toBeGreaterThan(3.2) // rolling regions have clearly visible hills
    }, 30_000)
  }
})
