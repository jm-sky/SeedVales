import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES, VoiceLimiter } from './voices'

describe('VoiceLimiter', () => {
  it('enforces per-kind cooldown and global concurrency', () => {
    const v = new VoiceLimiter(DEFAULT_RULES, 3)
    expect(v.request('owl', 0, 1)).toBe(true)
    expect(v.request('owl', 5, 1)).toBe(false) // cooldown 25 s
    expect(v.request('owl', 26, 1)).toBe(true)
    // Orchestra guard: many different calls at once are capped.
    const kinds = ['howl', 'moo', 'bleat', 'bark', 'gull']
    const ok = kinds.filter((k) => v.request(k, 30, 2)).length
    expect(ok).toBe(3)
    expect(v.activeCount).toBe(3)
    // After they finish, new ones can play.
    expect(v.request('bark', 40, 0.5)).toBe(true)
  })
})
