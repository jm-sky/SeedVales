/** RENDER-03 (render--001 step 1b): particle counts by source and level, caps per profile, range, throttled rewrites. */
import { describe, expect, it } from 'vitest'
import type { FireEmitter } from './fireSources'
import { FireParticles, PARTICLE_CAP, PARTICLE_RANGE, particleCount } from './fireParticles'

const fire = (key: string, x: number, kind: FireEmitter['kind'] = 'campfire', level = 1): FireEmitter => ({ key, x, y: 0, z: 0, kind, level, phase: 0.3 })

describe('render: fire particles (RENDER-03)', () => {
  it('counts scale with kind and level; a dying fire keeps its embers; low halves and has no smoke', () => {
    expect(particleCount('flames', 'hearth', 1, 'medium')).toBeGreaterThan(particleCount('flames', 'campfire', 1, 'medium'))
    expect(particleCount('flames', 'campfire', 1, 'medium')).toBeGreaterThan(particleCount('flames', 'held', 1, 'medium'))
    expect(particleCount('flames', 'campfire', 0.2, 'medium')).toBeLessThan(particleCount('flames', 'campfire', 1, 'medium'))
    expect(particleCount('embers', 'campfire', 0.2, 'medium')).toBeGreaterThanOrEqual(particleCount('embers', 'campfire', 1, 'medium') * 0.6)
    expect(particleCount('embers', 'held', 1, 'high')).toBe(0)
    expect(particleCount('smoke', 'campfire', 1, 'low')).toBe(0)
    expect(particleCount('sparks', 'campfire', 1, 'low')).toBeLessThan(particleCount('sparks', 'campfire', 1, 'medium'))
  })

  it('caps per profile, distance cut-off, no rewrite when nothing changed', () => {
    for (const profile of ['low', 'medium', 'high'] as const) {
      const fp = new FireParticles(profile)
      const many = Array.from({ length: 200 }, (_, i) => fire(`b:${i}`, (i % 20) * 2, 'hearth'))
      fp.update(many, many.length, 0, 0, 1, 0)
      const total = Object.values(fp.counts).reduce((a, b) => a + b, 0)
      expect(total).toBeLessThanOrEqual(PARTICLE_CAP[profile])
      expect(total).toBeGreaterThan(0)
    }
    const fp = new FireParticles('medium')
    const far = [fire('b:far', PARTICLE_RANGE.medium + 5)]
    fp.update(far, 1, 0, 0, 1, 0)
    expect(fp.counts.flames).toBe(0)
    const near = [fire('b:near', 5)]
    fp.update(near, 1, 0, 0, 1, 0)
    const after = fp.rebuilds
    expect(fp.counts.flames).toBeGreaterThan(0)
    fp.update(near, 1, 0, 0, 1, 1)
    fp.update(near, 1, 0, 0, 1, 2)
    expect(fp.rebuilds).toBe(after) // same emitters → instance data untouched
  })
})
