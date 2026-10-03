import { describe, expect, it } from 'vitest'
import { situationOnChange, VOICE_NPC_COOLDOWN_S, VOICE_RANGE_M, VoiceDirector } from './voiceDirector'

describe('audio--001 voice director', () => {
  it('WORLD-10: only one voice at a time, per-NPC cooldown, range gate', () => {
    const d = new VoiceDirector()
    expect(d.canSpeak(1, VOICE_RANGE_M + 1, 0)).toBe(false)
    expect(d.canSpeak(1, 5, 0)).toBe(true)
    d.started(1, 0, 3)
    expect(d.canSpeak(2, 5, 1)).toBe(false) // someone is speaking
    expect(d.canSpeak(2, 5, 3.1)).toBe(true)
    expect(d.canSpeak(1, 5, 4)).toBe(false) // NPC 1 cooldown
    expect(d.canSpeak(1, 5, VOICE_NPC_COOLDOWN_S + 0.1)).toBe(true)
  })

  it('WORLD-10: an urgent line cuts in over a normal one, never over another urgent line', () => {
    const d = new VoiceDirector()
    d.started(1, 0, 5)
    expect(d.canSpeak(2, 5, 1, true)).toBe(true)
    d.started(2, 1, 5, true)
    expect(d.canSpeak(3, 5, 2, true)).toBe(false)
  })

  it('WORLD-10: goal changes map to situations', () => {
    expect(situationOnChange({ goal: 'idle' }, { goal: 'fight' })).toBe('combat_start')
    expect(situationOnChange({ goal: 'fight' }, { goal: 'fight' })).toBeNull()
    expect(situationOnChange({ goal: 'idle' }, { goal: 'flee' })).toBe('danger_alert')
    expect(situationOnChange({ goal: 'idle' }, { goal: 'shelter' })).toBe('weather_shelter')
    expect(situationOnChange({ goal: 'idle' }, { goal: 'idle', callForHelpAt: 5 })).toBe('call_for_help')
    expect(situationOnChange({ goal: 'idle', callForHelpAt: 5 }, { goal: 'idle', callForHelpAt: 5 })).toBeNull()
  })
})
