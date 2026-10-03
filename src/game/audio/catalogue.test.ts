import { describe, expect, it } from 'vitest'
import { CATALOGUE, footstepId, pickFile, voiceId } from './catalogue'

/** Files that really exist under public/sounds (keys only; nothing is loaded). */
const ON_DISK = new Set(Object.keys(import.meta.glob('/public/sounds/**/*.{ogg,mp3}')).map((k) => k.replace('/public/sounds/', '')))

describe('audio--001 catalogue', () => {
  it('WORLD-10: every catalogue file exists under public/sounds and ids have at least one file', () => {
    for (const e of Object.values(CATALOGUE)) {
      expect(e.files.length, e.id).toBeGreaterThan(0)
      for (const f of e.files) expect(ON_DISK.has(f), f).toBe(true)
    }
    expect(Object.keys(CATALOGUE).length).toBeGreaterThan(40)
    for (const f of ON_DISK) expect(Object.values(CATALOGUE).some((e) => e.files.includes(f)), `${f} is not in soundFiles.ts (run scripts/assets/sound-catalogue.mjs)`).toBe(true)
  })

  it('WORLD-10: variants group (door-creak has 2 files) and pickFile stays inside the group', () => {
    expect(CATALOGUE['door-creak']!.files.length).toBe(2)
    expect(CATALOGUE['door-creak']!.files).toContain(pickFile('door-creak', () => 0.99))
    expect(pickFile('nonexistent')).toBeNull()
  })

  it('WORLD-10: voice selection falls back role → general, never to the wrong sex, then silence', () => {
    expect(voiceId('guard', 'male', 'greeting')).toBe('guard_male_greeting')
    expect(voiceId('guard', 'male', 'exhausted')).toBe('general_male_exhausted') // no guard clip → general
    expect(voiceId('guard', 'female', 'greeting')).toBe('general_female_greeting') // no female guard → general female
    expect(voiceId(undefined, 'female', 'hungry')).toBeNull() // no general female hungry clip → silence
    expect(voiceId('blacksmith', 'male', 'greeting')).toBe('general_male_greeting')
  })

  it('WORLD-10: footsteps pick the run set when present and fall back to walk', () => {
    expect(footstepId('grass', true)).toBe('footstep-grass-alt-mayra-run')
    expect(footstepId('forest', true)).toBe('footstep-forest-alt-mayra')
    expect(footstepId('stone', false)).toBe('footstep-stone-alt-mayra')
  })
})
