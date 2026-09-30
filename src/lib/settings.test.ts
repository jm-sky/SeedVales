/**
 * UI-05: preferences survive reloads, tolerate corrupt/blocked storage, clamp volumes.
 */
import { describe, expect, it } from 'vitest'
import { defaultSettings, loadSettings, saveSettings } from './settings'

function memStore(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init))
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }
}

describe('UI-05 settings', () => {
  it('round-trips quality and volumes', () => {
    const st = memStore()
    saveSettings({ quality: 'high', volume: { master: 0.3, ambient: 0.5, effects: 0 } }, st)
    expect(loadSettings(false, st)).toEqual({ quality: 'high', volume: { master: 0.3, ambient: 0.5, effects: 0 } })
    expect(st.m.get('sv-quality')).toBe('high') // main menu stays in sync
  })

  it('falls back to defaults on corrupt data and clamps values', () => {
    expect(loadSettings(true, memStore({ 'sv-settings': '{oops' }))).toEqual(defaultSettings(true))
    const s = loadSettings(false, memStore({ 'sv-settings': JSON.stringify({ quality: 'ultra', volume: { master: 7, ambient: -1, effects: 'x' } }) }))
    expect(s.quality).toBe('medium')
    expect(s.volume).toEqual({ master: 1, ambient: 0, effects: 1 })
  })

  it('reads the legacy quality key and survives a throwing storage', () => {
    expect(loadSettings(false, memStore({ 'sv-quality': 'low' })).quality).toBe('low')
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadSettings(false, broken)).toEqual(defaultSettings(false))
    expect(() => saveSettings(defaultSettings(), broken)).not.toThrow()
  })
})
