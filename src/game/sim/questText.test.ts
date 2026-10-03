/**
 * QUEST-03 — authored quest text uses cast placeholders and sex-resolved pronouns (review 016 #2).
 */
import { describe, expect, it } from 'vitest'
import { AUTHORED_QUESTS } from '../data/quests'
import { ctxOf, fillQuestText, questPlaceholders } from './questCore'
import { questJournal, questSay } from './questDialog'
import { forceOfferQuest, questDef } from './questEngine'
import { castHuman } from './questTestKit'
import { testSim } from './testWorld'

/** Names the design docs give the cast; the generated world has different people. Piers is a spawned fixed name (allowed). */
const DESIGN_NAMES = ['Lucy', 'Miles', 'Joan', 'Matthew', 'Ralph', 'Mark', 'Hazel', 'Martha', 'Molly', 'Tom', 'Luke', 'Jacob', 'Edmund', 'Edith', 'Hornblower', 'Hewers', 'Sawyers']

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) for (const x of v) strings(x, out)
  else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x, out)
  return out
}

describe('QUEST-03 quest text', () => {
  it('QUEST-03 text: no design-doc name outside a {placeholder}, and every token names a cast slot', () => {
    const name = new RegExp(`\\b(${DESIGN_NAMES.join('|')})\\b`)
    for (const def of AUTHORED_QUESTS) {
      const slots = new Set(['H', 'T', 'V', ...Object.keys(def.cast)])
      for (const s of strings({ ...def, cast: undefined })) {
        const bare = s.replace(/\{[^}]*\}/g, '')
        expect(bare.match(name)?.[0], `${def.id}: "${s}"`).toBeUndefined()
        for (const m of s.matchAll(/\{(\w+)(?::(\w+))?\}/g)) {
          expect(slots.has(m[1]!), `${def.id}: unknown slot in "${s}"`).toBe(true)
          if (m[2]) expect(['he', 'him', 'his', 'himself', 'He', 'Him', 'His', 'Himself']).toContain(m[2])
        }
      }
    }
  })

  it('QUEST-03 text: pronoun tokens follow the cast NPC sex (and capitalise)', () => {
    const sim = testSim()
    expect(forceOfferQuest(sim, 'q03')).toBe(true)
    const def = questDef(sim, 'q03')!
    const c = ctxOf(sim, def, sim.state.authoredQuests.q03!)
    const m = castHuman(sim, 'q03', 'miles')
    m.male = true
    expect(fillQuestText('{miles:He} said {miles:his} piece to {miles:him}.', questPlaceholders(c))).toBe('He said his piece to him.')
    m.male = false
    expect(fillQuestText('{miles:He} said {miles:his} piece to {miles:him}.', questPlaceholders(c))).toBe('She said her piece to her.')
  })

  it('QUEST-03 text: every node, option and journal text of every offered quest resolves without a leftover token', () => {
    const sim = testSim()
    for (const def of AUTHORED_QUESTS) {
      expect(forceOfferQuest(sim, def.id), def.id).toBe(true)
      for (const id of Object.keys(def.nodes)) {
        const s = questSay(sim, def.id, id)!
        for (const t of [...s.lines.map((l) => l.text), ...s.options.map((o) => o.text)]) expect(t, `${def.id}/${id}`).not.toMatch(/[{}]/)
      }
      for (const j of questJournal(sim)) expect(j.text).not.toMatch(/[{}]/)
    }
  })
})
