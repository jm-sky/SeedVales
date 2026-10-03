/**
 * Q08 — The Long Way to Water (docs/design/quests/q08-the-long-way-to-water.md). Giver: Elspeth, the shepherd of {V}.
 * The sheep queue at the square's well. Walk the route, test the ground, then build a trough by the pasture and fill it,
 * or keep a rota at the square well (a new well outside the square is not buildable yet).
 * @domain quests
 */
import type { QuestDef } from './types'
import { flag, flagNot, message, opinion, opt, say, set, stage, stageIs } from './dsl'

const pen = { k: 'building', slot: 'elspeth', kind: 'pen' } as const
const lowField = { k: 'building', slot: 'margaret', kind: 'field' } as const

export const Q08: QuestDef = {
  id: 'q08',
  title: 'The Long Way to Water',
  giver: 'elspeth',
  cast: {
    elspeth: { kind: 'npc', required: true, place: 'V', profession: 'shepherd', kin: ['head', 'spouse'] },
    margaret: { kind: 'npc', required: true, place: 'V', profession: 'farmer', kin: ['head'] },
    bridget: { kind: 'npc', required: true, place: 'V', profession: 'guard', kin: ['head'] },
  },
  start: [{ k: 'visited', place: 'V' }],
  flags: { result: 'none', accepted: false, routeWalked: false, bridgeTold: false, plan: 'none' },
  stages: [
    { id: 'queue', journal: 'The sheep of {V} reach the square\'s well before {elspeth} does. Walk the way to the pasture and see what makes sense; ask {margaret} about her low field, and mind {bridget}\'s road.', anchor: pen, progress: [{ when: [flag('routeWalked')], text: 'You have walked the route.' }, { when: [{ k: 'counter', id: 'digs', gte: 1 }], text: 'You have dug a trial hole in the low field.' }] },
    { id: 'plan', journal: 'Choose with {elspeth}: a trough by the pasture fence (you build it and fill it three times), or a rota at the square well.', anchor: { k: 'actor', slot: 'elspeth' } },
    { id: 'build', journal: 'Build a trough near the pasture pen — not on the road — and carry water into it: one bucket fills a third.', anchor: pen },
  ],
  choiceLabels: { trough: 'A trough by the pasture fence', rota: 'A rota at the square well' },
  nodes: {
    el_open: {
      lines: [
        say('elspeth', 'The sheep get to the well before I do. Then everyone\'s thirsty and nobody\'s happy.'),
        say('player', 'How far\'s the pasture?'),
        say('elspeth', 'Three hundred steps. I\'ve counted. Far enough that a full bucket feels like a punishment by the second trip.'),
        say('margaret', 'A trough by the fence would sort it.'),
        say('elspeth', 'A trough that someone fills. An empty trough\'s just a wooden apology.'),
      ],
      options: [
        opt('walk', 'Let me walk it and see what makes sense.', [{ k: 'accept' }, set('accepted'), opinion('elspeth', 5)], { next: 'el_walk' }),
        opt('later', 'Not now.', [{ k: 'refuse' }], { next: 'el_later' }),
      ],
    },
    el_walk: { lines: [say('elspeth', 'Please. Somebody who isn\'t me or {margaret}.')], options: [] },
    el_later: { lines: [say('elspeth', 'The sheep will keep coming to the square.')], options: [] },
    ma_field: {
      lines: [say('margaret', 'The low field? Rushes grow there in June — {elspeth}\'s grandfather said that means water underneath. Dig two spades and see.')],
      options: [],
    },
    br_road: {
      lines: [say('bridget', 'Don\'t put anything on the road. I don\'t care what — trough, well, stone circle. Off the turning place, where a cart can still swing round. I\'m not choosing your water. I\'m protecting my road.')],
      options: [opt('ok', 'Understood.', [set('bridgeTold')])],
    },
    el_plan: {
      lines: [say('elspeth', 'So. What do we do?')],
      options: [
        opt('trough', 'A trough by the pasture fence. Your household fills it.', [set('plan', 'trough'), { k: 'choose', flag: 'result', value: 'trough' }, stage(2)], { next: 'el_trough' }),
        opt('rota', 'No building. Set times at the square well — animals at dawn and dusk, people the rest of the day.', [set('plan', 'rota'), { k: 'choose', flag: 'result', value: 'rota' }, stage(2)], { next: 'el_rota' }),
      ],
    },
    el_trough: { lines: [say('elspeth', 'Twice a day. (pause) Fine. It\'s still less than walking the flock through the square. Write my name on it, so nobody else thinks it\'s theirs to empty. One bucket fills a third, mind.')], options: [] },
    el_rota: { lines: [say('elspeth', 'Costs no timber. Costs everyone\'s patience, every single day. Give it three days.')], options: [] },
  },
  topics: [
    { slot: 'elspeth', node: 'el_open', label: 'The queue at the well', when: [flagNot('accepted', true)] },
    { slot: 'margaret', node: 'ma_field', label: 'The low field', when: [flag('accepted')] },
    { slot: 'bridget', node: 'br_road', label: 'The road', when: [flag('accepted'), flagNot('bridgeTold', true)] },
    { slot: 'elspeth', node: 'el_plan', label: 'What to do', when: [flag('accepted'), flag('routeWalked'), stageIs(0)] },
  ],
  observations: [
    { id: 'route', at: pen, r: 8, dwellS: 3, when: [flag('accepted'), flagNot('routeWalked', true)], effects: [set('routeWalked'), message('The ground falls toward this corner. A trough here would need less carrying — in summer it\'s all from the well.')] },
  ],
  counters: [
    { id: 'digs', on: 'dig', match: { near: { anchor: lowField, r: 14 } } },
    { id: 'troughs', on: 'built', match: { kind: 'trough', near: { anchor: pen, r: 40 } } },
    { id: 'fills', on: 'fill', match: { kind: 'trough', near: { anchor: pen, r: 40 } } },
  ],
  rules: [
    { id: 'troughDone', when: [flag('plan', 'trough'), { k: 'counter', id: 'troughs', gte: 1 }, { k: 'counter', id: 'fills', gte: 3 }], effects: [{ k: 'end', ending: 'trough' }] },
    { id: 'rotaDone', when: [flag('plan', 'rota'), { k: 'since', hours: 72, from: 'stage' }], effects: [{ k: 'end', ending: 'rota' }] },
    { id: 'dropped', when: [{ k: 'since', hours: 336, from: 'started' }], effects: [{ k: 'end', ending: 'dropped' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 96, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    {
      id: 'trough',
      journal: 'The trough stands by the pasture fence and has been filled. {elspeth} gave you wool and {margaret} paid 15 c from the village treasury.',
      effects: [
        { k: 'give', from: { store: 'elspeth' }, to: 'player', item: 'wool', qty: 3 },
        { k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 15 },
        { k: 'rep', delta: { helpfulness: 6 }, reason: 'A trough for {V}\'s sheep', places: ['V'] },
        opinion('elspeth', 15), opinion('margaret', 10), opinion('bridget', 5),
        message('"Tomorrow I fill it," says {elspeth}. "The day after, you remind me."', 'info'),
      ],
    },
    {
      id: 'rota',
      journal: 'The rota held for three days. {margaret} paid 10 c from the village treasury.',
      effects: [{ k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 10 }, { k: 'rep', delta: { helpfulness: 3 }, reason: 'A rota for {V}\'s well', places: ['V'] }, opinion('elspeth', 5), opinion('bridget', 10)],
    },
    { id: 'dropped', journal: 'Nothing was built; the sheep still queue at the well.', effects: [opinion('elspeth', -3)] },
  ],
  lapse: { journal: 'The sheep went on queuing at the well.', effects: [] },
}
