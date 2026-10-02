/**
 * C-07 (review 013): UI mutates sim state only through `Game` methods — panels must not import sim mutators.
 */
import { describe, expect, it } from 'vitest'

const MUTATORS = ['giveGift', 'placeOrder', 'cancelOrder', 'collectOrder', 'buyFromNpc', 'sellToNpc', 'hireCompanion', 'transferToStorage', 'acceptQuest', 'tryApologize', 'cancelActivity', 'completeQuest', 'setWaypoint', 'clearWaypoint', 'consume', 'startActivity', 'runOption', 'questChoose']

describe('UI facade', () => {
  it('C-07: no UI file imports a sim mutator (all go through Game methods)', () => {
    const offenders: string[] = []
    const files = import.meta.glob('../../ui/**/*.{vue,ts}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(files).length).toBeGreaterThan(20)
    for (const [file, src] of Object.entries(files)) {
      for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'@\/game\/sim\/[^']*'/g)) {
        for (const name of m[1]!.split(',').map((x) => x.trim().replace(/^type\s+/, '').replace(/\s+as\s+.*/, ''))) if (MUTATORS.includes(name)) offenders.push(`${file}: ${name}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
