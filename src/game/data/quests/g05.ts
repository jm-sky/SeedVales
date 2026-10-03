/**
 * G05 — Disputed Oak (docs/design/quests/grok-quest-05-disputed-oak.md). Giver: Miles, the woodcutter of {H}.
 * A big old oak stands on the boundary between {H} and {V}. Read the bark, the crooked stone and the tree's age, hear
 * Elspeth and Cedric, then bring the case to a reeve: the oak stands (shared), is Miles's, or is {V}'s. Felling it yourself
 * ends in disgrace. Evidence is four flags (notches, stone, witness, age); any two open the verdict.
 * @domain quests
 */
import type { Cond, QuestDef } from './types'
import { flag, flagNot, message, opinion, opt, say, set, stage, stageIs } from './dsl'

const oak = { k: 'boundary' } as const
const stone = { k: 'offset', of: oak, dx: 9, dz: 4 } as const

const EVIDENCE = ['notches', 'stone', 'witness', 'age']
/** At least two of the four evidence flags. */
const twoEvidence: Cond = {
  k: 'any',
  of: EVIDENCE.flatMap((a, i) => EVIDENCE.slice(i + 1).map((b): Cond => ({ k: 'all', of: [flag(a), flag(b)] }))),
}

const verdictLines = [
  say('margaret', 'Two villages and one tree. Tell me what you found and what you\'d have me write.', { k: 'alive', slot: 'margaret' }),
  say('ralph', 'Two villages and one tree. Tell me what you found and what you\'d have me write.', { k: 'alive', slot: 'ralph' }, { k: 'not', of: { k: 'alive', slot: 'margaret' } }),
]
const verdictOptions = [
  opt('shared', 'The oak stands. {H} takes the dead limbs from it, and {V} lets {miles} fell two good trees in the {V} wood instead.', [{ k: 'choose', flag: 'deal', value: 'shared' }, { k: 'end', ending: 'shared' }], { needs: [flag('cedricShared')], reason: 'Hear what {cedric} would accept first.' }),
  opt('for_h', 'The old notches are {H}\'s. The oak is {H}\'s — {miles} may fell it.', [{ k: 'choose', flag: 'deal', value: 'for_h' }, { k: 'end', ending: 'for_h' }]),
  opt('for_v', 'It\'s been {V}\'s pigs under it for three generations. The oak is {V}\'s.', [{ k: 'choose', flag: 'deal', value: 'for_v' }, { k: 'end', ending: 'for_v' }]),
  opt('wait', 'No verdict today.', []),
]

export const G05: QuestDef = {
  id: 'g05',
  title: 'Disputed Oak',
  giver: 'miles',
  cast: {
    miles: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['head'] },
    margaret: { kind: 'npc', required: true, place: 'V', profession: 'farmer', kin: ['head'] },
    cedric: { kind: 'npc', required: true, place: 'V', profession: 'farmer', kin: ['head', 'spouse', 'son', 'child'] },
    elspeth: { kind: 'npc', required: true, place: 'V', profession: 'shepherd', kin: ['head', 'spouse'] },
    ralph: { kind: 'npc', required: false, profession: 'farmer', kin: ['head'], fallbackName: 'the reeve' },
  },
  start: [{ k: 'visited', place: 'V' }],
  flags: { result: 'none', deal: 'none', accepted: false, notches: false, stone: false, witness: false, age: false, cedricHeard: false, cedricShared: false, fellingRights: false, cedricPigsThin: false },
  stages: [
    { id: 'tree', journal: '{miles} wants to fell the old oak on the boundary ditch between {H} and {V}; {cedric} of {V} says it is his village\'s. Walk the boundary and see what is actually there.', anchor: { k: 'actor', slot: 'miles' } },
    { id: 'evidence', journal: 'Find out whose tree it is: read the bark, look at the boundary stone beside the oak, judge the tree\'s age, and hear {elspeth} and {cedric}. Any two findings are enough for a reeve to listen.', anchor: oak, progress: [{ when: [flag('notches')], text: 'You read the notches in the bark.' }, { when: [flag('stone')], text: 'You examined the boundary stone.' }, { when: [flag('age')], text: 'You judged the age of the oak.' }, { when: [flag('witness')], text: '{elspeth} told you what she remembers.' }] },
    { id: 'verdict', journal: 'You know enough. Bring the case to {margaret} of {V} or {ralph} of {H}: share the oak, give it to {H}, or give it to {V}. Do not fell it yourself.', anchor: { k: 'actor', slot: 'margaret' } },
  ],
  choiceLabels: { shared: 'The oak stands; both villages share it', for_h: 'The oak is {H}\'s', for_v: 'The oak is {V}\'s' },
  nodes: {
    mi_open: {
      lines: [
        say('miles', 'There\'s an oak on the boundary ditch — the big one. Half of it\'s dead. Two beams in it as straight as you\'ll ever see, and {cedric} from {V} says if I touch it he\'ll set the dogs on me.'),
        say('player', 'Whose tree is it?'),
        say('miles', 'Ours. My father cut the boundary marks in it himself. — Or so he said. He said a lot of things. Will you walk the ditch and see what\'s actually there? I\'d rather have a fair answer than a fight with a man whose pigs I can hear from my house.'),
      ],
      options: [
        opt('walk', 'I\'ll walk the boundary.', [{ k: 'accept' }, set('accepted'), opinion('miles', 5), stage(1)], { next: 'mi_walk' }),
        opt('why', 'Why not just fell another tree?', [], { next: 'mi_why' }),
        opt('later', 'Not my quarrel.', [{ k: 'refuse' }], { next: 'mi_later' }),
      ],
    },
    mi_why: {
      lines: [say('miles', 'Because there isn\'t another like it this side of {V}. That\'s the trouble.')],
      options: [opt('walk', 'All right. I\'ll walk the boundary.', [{ k: 'accept' }, set('accepted'), opinion('miles', 5), stage(1)], { next: 'mi_walk' })],
    },
    mi_walk: { lines: [say('miles', 'Good. Look at the bark and the stone in the ditch, and ask {elspeth} what she remembers — her sheep are there more than anyone. And mind {cedric}\'s dogs.')], options: [] },
    mi_later: { lines: [say('miles', 'Then I\'ll keep my axe in the shed. For now.')], options: [] },
    el_witness: {
      lines: [
        say('elspeth', 'My sheep stop at that oak. Always have — there\'s shade and the ditch is shallow there. When I was little, my father said the oak was "between." Not ours, not theirs. Between.'),
        say('player', 'Did anyone use it?'),
        say('elspeth', '{cedric}\'s pigs, every autumn, for the acorns. And {H} folk took deadwood from the far side. Nobody minded till somebody wanted the whole tree.'),
      ],
      options: [opt('ok', 'Thank you. That helps.', [set('witness'), opinion('elspeth', 5)])],
    },
    ce_talk: {
      lines: [
        say('cedric', 'Come to measure my oak for a coffin, have you?'),
        say('player', 'I\'ve come to hear your side.'),
        say('cedric', 'My side is that my pigs have eaten under that tree since my grandfather\'s day. A fat pig in winter is worth more than two planks in some woodcutter\'s roof. And the scratches in the bark are ours.'),
        say('player', 'The older notches are {H}\'s.'),
        say('cedric', 'Older isn\'t truer. — (grudging) …The stone\'s crooked, everyone knows that.'),
      ],
      options: [
        opt('deal', 'It looks like the tree belonged to nobody and got used by everyone. What would you accept?', [set('cedricHeard'), set('cedricShared'), opinion('cedric', 3)], { needs: [twoEvidence], reason: 'Find two pieces of evidence first.', next: 'ce_shared' }),
        opt('own', 'You can\'t own a boundary.', [set('cedricHeard')], { next: 'ce_own' }),
      ],
    },
    ce_shared: { lines: [say('cedric', 'Leave it standing. Let him take the dead limbs. And let him have timber from somewhere else on our side — I don\'t care where, as long as it\'s not my oak.')], options: [] },
    ce_own: { lines: [say('cedric', 'Watch me.')], options: [] },
    reeve: { lines: verdictLines, options: verdictOptions },
  },
  topics: [
    { slot: 'miles', node: 'mi_open', label: 'The oak on the boundary', when: [flagNot('accepted', true)] },
    { slot: 'elspeth', node: 'el_witness', label: 'The oak on the ditch', when: [flag('accepted'), flagNot('witness', true)] },
    { slot: 'cedric', node: 'ce_talk', label: 'The oak', when: [flag('accepted'), flagNot('cedricShared', true)] },
    { slot: 'margaret', node: 'reeve', label: 'The disputed oak', when: [flag('accepted'), twoEvidence] },
    { slot: 'ralph', node: 'reeve', label: 'The disputed oak', when: [flag('accepted'), twoEvidence] },
  ],
  observations: [
    { id: 'bark', at: oak, r: 6, dwellS: 4, when: [flag('accepted'), flagNot('notches', true)], effects: [set('notches'), message('Deep old notches, three in a row — the {H} boundary mark. Above them, newer scratches in a different hand. Both villages have claimed this tree.')] },
    { id: 'stone', at: stone, r: 5, dwellS: 4, when: [flag('accepted'), flagNot('stone', true)], effects: [set('stone'), message('A half-buried stone with a carved line. It points along the ditch — but the stone itself leans. It proves there is a boundary here. It does not prove which side the oak is on.')] },
    { id: 'age', at: oak, r: 8, dwellS: 5, when: [flag('accepted'), flagNot('age', true), { k: 'any', of: [{ k: 'skill', skill: 'survival', gte: 10 }, { k: 'skill', skill: 'woodcutting', gte: 10 }] }], effects: [set('age'), message('By the girth, the oak was a big tree before either village drew a line. It was a landmark first and a boundary second.')] },
  ],
  counters: [
    { id: 'fellNight', on: 'fell', match: { near: { anchor: oak, r: 3 } }, when: [{ k: 'hour', night: true }] },
    { id: 'fellDay', on: 'fell', match: { near: { anchor: oak, r: 3 } }, when: [{ k: 'hour', from: 6, to: 20 }] },
  ],
  rules: [
    { id: 'enough', when: [stageIs(1), twoEvidence], effects: [stage(2), message('That is enough to put the case to a reeve.', 'quest')] },
    { id: 'feltNight', when: [{ k: 'any', of: [{ k: 'counter', id: 'fellNight', gte: 1 }, { k: 'counter', id: 'fellDay', gte: 1 }] }], effects: [{ k: 'choose', flag: 'deal', value: 'felled_at_night' }, { k: 'end', ending: 'felled_at_night' }] },
    { id: 'dropped', when: [{ k: 'since', hours: 504, from: 'started' }], effects: [{ k: 'end', ending: 'dropped' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 120, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    {
      id: 'shared',
      journal: 'The oak stands. {H} takes its dead limbs and {miles} may fell two trees in the {V} wood. Both treasuries paid you 12 c.',
      effects: [
        { k: 'pay', from: { treasury: 'home' }, to: 'player', amount: 12 },
        { k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 12 },
        { k: 'rep', delta: { helpfulness: 8 }, reason: 'A shared oak', places: ['H', 'V'] },
        opinion('miles', 15), opinion('cedric', 15), opinion('elspeth', 5),
        set('fellingRights'),
        message('"Two trees from their wood," says {miles}. "Not as good as the oak — but I\'ll take good and peaceful."', 'info'),
      ],
    },
    {
      id: 'for_h',
      journal: 'The oak is {H}\'s. {miles} felled it; the {H} treasury paid you 15 c.',
      effects: [
        { k: 'fell', anchor: oak, logs: { to: 'miles', qty: 4 } },
        { k: 'pay', from: { treasury: 'home' }, to: 'player', amount: 15 },
        { k: 'rep', delta: { honesty: 5 }, reason: 'A fair verdict for {H}', places: ['H'] },
        { k: 'rep', delta: { honesty: -5 }, reason: 'A verdict against {V}', places: ['V'] },
        opinion('miles', 25), opinion('cedric', -25),
        set('cedricPigsThin'),
        message('"I\'ll send him a ham, after," says {miles}. "It\'s not his fault his pigs like acorns."', 'info'),
      ],
    },
    {
      id: 'for_v',
      journal: 'The oak is {V}\'s and stays standing; the {V} treasury paid you 15 c.',
      effects: [
        { k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 15 },
        { k: 'rep', delta: { honesty: 5 }, reason: 'A fair verdict for {V}', places: ['V'] },
        opinion('cedric', 25), opinion('miles', -10),
        message('"A fair answer is what I asked for," says {miles}. "I didn\'t say I\'d like it."', 'info'),
      ],
    },
    {
      id: 'felled_at_night',
      journal: 'The oak is gone, and it was you who felled it. Both villages know. Nobody pays you for that.',
      effects: [
        { k: 'rep', delta: { honesty: -20 }, reason: 'Felled the disputed oak', places: ['H', 'V'] },
        opinion('cedric', -40), opinion('miles', -10), opinion('margaret', -20),
        { k: 'priceMod', place: 'H', item: 'log', mult: 1.1, days: 90, why: 'oak' },
        { k: 'priceMod', place: 'V', item: 'log', mult: 1.1, days: 90, why: 'oak' },
        message('Wood trade between {H} and {V} cools for a season.', 'bad'),
      ],
    },
    { id: 'dropped', journal: 'The oak still stands on the ditch and the quarrel goes on.', effects: [opinion('miles', -3)] },
  ],
  lapse: { journal: 'Nobody took up the quarrel over the oak.', effects: [] },
}
