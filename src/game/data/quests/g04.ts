/**
 * G04 — Root by the Stream (docs/design/quests/grok-quest-04-root-by-the-stream.md). Giver: Dora, the herbalist.
 * A 48-hour errand: yarrow ×2, mint ×2, chamomile ×1. Herb nodes are labelled in the world, so the hemlock
 * look-alike is not rolled at gather time (see the design doc's implementation notes).
 * @domain quests
 */
import type { Effect, QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, sayIf, set, stage } from './dsl'

const herbs = (from: 'player'): Effect[] => [
  { k: 'consume', from, item: 'yarrow', qty: 2 },
  { k: 'consume', from, item: 'mint', qty: 2 },
  { k: 'consume', from, item: 'chamomile', qty: 1 },
]
const onTime = { k: 'not', of: { k: 'since', hours: 48, from: 'started' } } as const
const accept: Effect[] = [{ k: 'accept' }, set('accepted'), { k: 'timedWarn' }, stage(1)]

export const G04: QuestDef = {
  id: 'g04',
  title: 'Root by the Stream',
  giver: 'dora',
  deadlineHours: 48,
  cast: {
    dora: { kind: 'npc', required: true, profession: 'herbalist', kin: ['head'] },
    toby: { kind: 'npc', required: false, profession: 'herbalist', kin: ['child'], fallbackName: 'the boy', fallbackMale: true },
  },
  start: [{ k: 'day', from: 3 }, alive('dora')],
  flags: { result: 'none', storyTold: false, accepted: false, advance: 0, askedLook: false, late: false, delivered: false },
  stages: [
    { id: 'shelf', journal: '{dora} cannot leave {toby}, who has a chest fever, and her shelves are empty. She needs yarrow ×2, mint ×2 and chamomile ×1 within two days.', anchor: { k: 'actor', slot: 'dora' } },
    { id: 'gather', journal: 'Bring {dora} yarrow ×2, mint ×2 and chamomile ×1: gather them (yarrow on the marsh banks, mint and chamomile in meadows) or buy them. The herb\'s name shows when you look at it — hemlock is not yarrow.', anchor: { k: 'actor', slot: 'dora' } },
  ],
  choiceLabels: { ontime: 'The brew was ready in time', late: 'You were late, but the herbs still helped', failed: 'You came back without the herbs' },
  nodes: {
    do_open: {
      lines: [
        say('dora', 'You\'ll have to talk from there, he\'s coughing. — I need yarrow, two good handfuls. Mint, two. Chamomile, one. Everything I had went on the cough that went round {H}. I can\'t leave him to go to the marsh.'),
        say('player', 'How long have I got?'),
        say('dora', 'Two days and he\'s over the worst whatever I give him. Before that, the brew makes the difference between a week in bed and a month of coughing.'),
        sayIf('toby', '(from inside) Is that someone? Can they tell me a story?'),
        say('dora', 'They\'re going to the marsh, love. They\'ll tell you one after.'),
      ],
      options: [
        opt('go', 'I\'ll go now.', [...accept, opinion('dora', 5)], { next: 'do_go' }),
        opt('advance', 'Can you spare something up front? I\'ll need food for the road.', [...accept, { k: 'pay', from: { purse: 'dora' }, to: 'player', amount: 10 }, set('advance', 10)], { next: 'do_go' }),
        opt('look', 'What does yarrow look like?', [set('askedLook')], { next: 'do_look' }),
        opt('refuse', 'I can\'t right now.', [{ k: 'refuse' }], { next: 'do_refuse' }),
      ],
    },
    do_look: {
      lines: [say('dora', 'Feathery leaves, like a fern\'s little sister. Flat white flowers. And it smells — crush a leaf, it smells green and bitter. If it smells of mice, drop it and wash your hands. That\'s hemlock.')],
      options: [
        opt('go', 'I\'ll go now.', [...accept, opinion('dora', 5)], { next: 'do_go' }),
        opt('advance', 'Can you spare something up front?', [...accept, { k: 'pay', from: { purse: 'dora' }, to: 'player', amount: 10 }, set('advance', 10)], { next: 'do_go' }),
      ],
    },
    do_go: { lines: [say('dora', 'Yarrow on the marsh banks, mint and chamomile in the meadows — or buy them if you must. Hurry, and mind the hemlock.')], options: [] },
    do_refuse: { lines: [say('dora', 'Then I\'ll ask a neighbour to sit with him while I go myself.')], options: [] },
    do_deliver: {
      lines: [say('dora', 'Show me. (she checks each bundle, smelling the yarrow)', flagNot('late', true))],
      options: [
        opt('hand', 'Here — yarrow, mint and chamomile.', [...herbs('player'), { k: 'if', when: [onTime], then: [{ k: 'end', ending: 'ontime' }], else: [{ k: 'end', ending: 'late' }] }], {
          needs: [{ k: 'hasItem', item: 'yarrow', qty: 2, from: 'player' }, { k: 'hasItem', item: 'mint', qty: 2, from: 'player' }, { k: 'hasItem', item: 'chamomile', qty: 1, from: 'player' }],
          reason: 'You need yarrow ×2, mint ×2 and chamomile ×1.',
          next: 'do_thanks',
        }),
        opt('give_up', 'I couldn\'t get it all.', [{ k: 'end', ending: 'failed' }], { when: [{ k: 'since', hours: 48, from: 'started' }], next: 'do_failed' }),
      ],
    },
    do_thanks: { lines: [say('dora', 'Good. That\'s all of it. (she is already crushing it) Sit with him while it steeps. You promised him a story.')], options: [] },
    do_failed: { lines: [say('dora', 'Keep it. He\'s mending without it. I\'ll stock up when I can walk to the marsh myself.')], options: [] },
    to_story: {
      lines: [say('toby', '(hoarse) Was there a monster at the marsh?')],
      options: [
        opt('heron', 'Only a heron. It looked at me like I owed it money.', [opinion('dora', 5), set('storyTold')], { next: 'to_laugh' }),
        opt('big', 'A big one. With teeth.', [opinion('toby', 10), set('storyTold')], { next: 'to_lie' }),
      ],
    },
    to_laugh: { lines: [say('toby', '(laughs, then coughs)')], options: [] },
    to_lie: { lines: [say('toby', 'You\'re lying. — Tell me anyway.')], options: [] },
  },
  topics: [
    { slot: 'dora', node: 'do_open', label: 'The empty shelf', when: [flagNot('accepted', true)] },
    { slot: 'dora', node: 'do_deliver', label: 'The herbs', when: [flag('accepted')] },
    { slot: 'toby', node: 'to_story', label: 'A story', when: [flag('delivered'), flagNot('storyTold', true)], done: true },
  ],
  observations: [],
  counters: [],
  rules: [
    // Ignored for good: Dora walks to the marsh herself after five days.
    { id: 'tooLong', when: [{ k: 'since', hours: 120, from: 'started' }], effects: [{ k: 'end', ending: 'failed' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 72, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    {
      id: 'ontime',
      journal: 'The brew was ready in time. {dora} paid you from her purse and let you sit with {toby}.',
      effects: [
        set('delivered'),
        { k: 'choose', flag: 'result', value: 'ontime' },
        { k: 'if', when: [flag('advance', 10)], then: [{ k: 'pay', from: { purse: 'dora' }, to: 'player', amount: 20 }], else: [{ k: 'pay', from: { purse: 'dora' }, to: 'player', amount: 30 }] },
        { k: 'rep', delta: { helpfulness: 10 }, reason: 'You brought the herbs in time' },
        opinion('dora', 30), opinion('toby', 10),
        message('{toby} is through the worst. {dora} is already boiling water.', 'info'),
      ],
    },
    {
      id: 'late',
      journal: 'You were late — {toby} was through the worst on his own — but the brew shortens the cough. {dora} paid what she could.',
      effects: [
        set('delivered'),
        { k: 'choose', flag: 'result', value: 'late' },
        { k: 'if', when: [flag('advance', 10)], then: [{ k: 'pay', from: { purse: 'dora' }, to: 'player', amount: 5 }], else: [{ k: 'pay', from: { purse: 'dora' }, to: 'player', amount: 15 }] },
        { k: 'rep', delta: { helpfulness: 5 }, reason: 'You brought the herbs, late' },
        opinion('dora', 10),
      ],
    },
    {
      id: 'failed',
      journal: 'You came back without the herbs. {toby} mended on his own; {dora} kept the advance quiet and did not ask.',
      effects: [{ k: 'choose', flag: 'result', value: 'failed' }, opinion('dora', -10)],
    },
  ],
  lapse: { journal: '{dora} found the herbs herself.', effects: [] },
}
