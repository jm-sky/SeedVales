import { afterEach, describe, expect, it } from 'vitest'
import { controlPrefs, guardPress, guardRelease, input } from './controls'

describe('guard hold vs toggle (P-17)', () => {
  afterEach(() => {
    controlPrefs.guardToggle = false
    input.secondary = false
  })

  it('hold: down guards, up releases', () => {
    guardPress()
    expect(input.secondary).toBe(true)
    guardRelease()
    expect(input.secondary).toBe(false)
  })

  it('toggle: press flips, release does nothing', () => {
    controlPrefs.guardToggle = true
    guardPress()
    guardRelease()
    expect(input.secondary).toBe(true)
    guardPress()
    expect(input.secondary).toBe(false)
  })
})
