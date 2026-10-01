/**
 * WORLD-11 render layouts: every landmark kind lays out pieces that exist in `landmarks.glb`
 * (names from assetNames.ts), deterministically, with no piece outside the footprint by much.
 */
import { describe, expect, it } from 'vitest'
import type { GenLandmark, LandmarkKind } from '../world/types'
import { layout } from '../world/landmarkLayout'
import { LANDMARK_NODES } from './assetNames'

const KINDS: LandmarkKind[] = ['stone_circle', 'house_ruin', 'estate_ruin', 'shipwreck', 'boat_wreck']
const known = new Set<string>(Object.values(LANDMARK_NODES).flat())
const mk = (kind: LandmarkKind, i: number): GenLandmark => ({ id: `lm-${kind}-${i}`, kind, name: 'x', x: 0, z: 0, rot: 0, radius: 9 })

describe('WORLD-11: landmark layouts', () => {
  for (const kind of KINDS) {
    it(`${kind}: only known piece names, deterministic, bounded`, () => {
      for (let i = 0; i < 6; i++) {
        const a = layout(mk(kind, i))
        expect(a.length).toBeGreaterThan(0)
        expect(JSON.stringify(layout(mk(kind, i)))).toBe(JSON.stringify(a))
        for (const s of a) {
          expect(known.has(s.name), s.name).toBe(true)
          expect(Math.hypot(s.x, s.z)).toBeLessThan(25)
        }
      }
    })
  }
})
