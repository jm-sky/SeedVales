/**
 * G06 — Trader's Letter (docs/design/quests/grok-quest-06-traders-letter.md). Giver: Stephen, the trader of {H}.
 * A sealed letter to Jack, the trader of {V}: one high grain price for the season. Four results, and a grain price
 * modifier in both villages. The carried letter is a tagged quest item (sealed → read / amended; opened by the player).
 * @domain quests
 */
import type { Effect, QuestDef } from './types'
import { flag, flagNot, opinion, opt, say, sayIf, set, stage, stageIs } from './dsl'

const letter = (tag: string) => ({ k: 'hasItem', item: 'letter', qty: 1, from: 'player', tag }) as const
const grain = (mult: number): Effect[] => [
  { k: 'priceMod', place: 'H', item: 'grain', mult, days: 60, why: 'holdPrice' },
  { k: 'priceMod', place: 'V', item: 'grain', mult, days: 60, why: 'holdPrice' },
]
const giveLetter: Effect = { k: 'grant', to: 'player', item: 'letter', qty: 1, why: 'authored-carried-message', tag: 'sealed' }

export const G06: QuestDef = {
  id: 'g06',
  title: 'The Trader\'s Letter',
  giver: 'stephen',
  cast: {
    stephen: { kind: 'npc', required: true, profession: 'trader', kin: ['head'] },
    jack: { kind: 'npc', required: true, place: 'V', profession: 'trader', kin: ['head'] },
    margaret: { kind: 'npc', required: false, place: 'V', profession: 'farmer', kin: ['head'], fallbackName: 'the reeve of the next village' },
    farmer: { kind: 'npc', required: false, place: 'V', profession: 'farmer', kin: ['spouse', 'child', 'elder'], fallbackName: 'a farmer' },
  },
  start: [{ k: 'visited', place: 'V' }, { k: 'any', of: [{ k: 'opinion', slot: 'stephen', gte: 10 }, { k: 'quest', id: 'q09', in: ['done'], started: true }] }],
  flags: { result: 'none', accepted: false, askedContents: false, farmersHeard: false, letterGiven: false, lostUsed: false, playerOpened: false },
  stages: [
    { id: 'letter', journal: '{stephen} wants a sealed letter carried into {jack}\'s hand in {V}. Ten coppers when you are back and it has been read.', anchor: { k: 'actor', slot: 'stephen' } },
    { id: 'valley', journal: 'Deliver the letter to {jack} in {V}. Breaking the seal is your own business — {jack} will notice.', anchor: { k: 'actor', slot: 'jack' } },
    { id: 'back', journal: 'Take the answer back to {stephen}.', anchor: { k: 'actor', slot: 'stephen' } },
  ],
  choiceLabels: { agreed: 'One high price, held by both traders', capped: 'A capped price and a reserve for the poor', refused: 'You advised {jack} to refuse', public: 'It was settled in the open, with both reeves' },
  nodes: {
    st_open: {
      lines: [
        say('stephen', 'You\'re going to {V}? Take this to {jack}. Into his hand, not his boy\'s. I\'ll pay ten coppers when you\'re back and he\'s read it.'),
        say('player', 'What\'s in it?'),
        say('stephen', 'Business between traders.'),
      ],
      options: [
        opt('fine', 'Fine. Into his hand.', [{ k: 'accept' }, set('accepted'), set('letterGiven'), giveLetter, stage(1)], { next: 'st_go' }),
        opt('ask', 'I\'d like to know what I\'m carrying.', [{ k: 'accept' }, set('accepted'), set('letterGiven'), set('askedContents'), giveLetter, stage(1)], { next: 'st_ask' }),
        opt('refuse', 'I don\'t carry letters I\'m not sure about.', [{ k: 'refuse' }], { next: 'st_carter' }),
      ],
    },
    st_go: { lines: [say('stephen', 'Into his hand. Not a word on the square.')], options: [] },
    st_ask: { lines: [say('stephen', 'Grain. The summer was bad and it\'ll be worse by spring. I\'m proposing that {jack} and I keep one price — a high one — so nobody sells cheap in autumn and runs out in March. It\'s not a crime. You can see why I didn\'t want it read out on the square.')], options: [] },
    st_carter: { lines: [say('stephen', 'Fair. I\'ll send it with the carter.')], options: [] },
    st_lost: {
      lines: [say('stephen', 'You lost it? (sighs) I\'ll write another. Don\'t read this one.')],
      options: [opt('again', 'I\'ll take it.', [giveLetter, set('lostUsed')])],
    },
    fa_barn: {
      lines: [say('farmer', '{jack}\'s buying, but he won\'t say what he\'ll sell for. Same as {stephen}, I hear. Everyone\'s buying and nobody\'s selling. That\'s how you know it\'s going to be a hard winter.')],
      options: [opt('ok', 'I see.', [set('farmersHeard')])],
    },
    jk_read: {
      lines: [
        say('jack', 'From {stephen}? (breaks the seal, reads, reads again) Huh. (looks up) You know what\'s in here?'),
        say('player', 'He told me. One price, high, for the season.', flag('askedContents')),
        say('player', 'No.', flagNot('askedContents', true)),
        say('jack', 'One price for grain, high, for the season, and neither of us undercuts the other. He\'s frightened of the winter. So am I, if I\'m honest. You walk between our villages. You see who\'s got what. What would you do?'),
      ],
      options: [
        opt('agree', 'Agree. If both of you hold your stock, nobody runs out in March.', [set('result', 'agreed'), { k: 'tag', item: 'letter', from: 'player', to: 'read' }, ...grain(1.4), stage(2)], { next: 'jk_agreed' }),
        opt('cap', 'Agree on a price — but cap it, and keep back grain for the poorest households at the old price.', [set('result', 'capped'), { k: 'tag', item: 'letter', from: 'player', to: 'amended' }, ...grain(1.15), stage(2)], { next: 'jk_capped' }),
        opt('refuse', 'Don\'t. People will remember who made bread dear in a bad year.', [set('result', 'refused'), { k: 'tag', item: 'letter', from: 'player', to: 'read' }, stage(2)], { next: 'jk_refused' }),
        opt('public', 'This should be decided in the open, by both reeves, not between two shops.', [set('result', 'public'), { k: 'tag', item: 'letter', from: 'player', to: 'read' }, ...grain(1.15), stage(2)], { needs: [flag('farmersHeard')], reason: 'You have not heard from the farmers here yet.', next: 'jk_public' }),
      ],
    },
    jk_agreed: { lines: [say('jack', 'That\'s what I was hoping someone would say.')], options: [] },
    jk_capped: { lines: [say('jack', 'A cap. And a reserve. (slowly) {stephen} will grumble about the reserve. But he\'ll sign, because he\'ll see I\'ve signed. Write it under his letter — I\'ll add my mark.')], options: [] },
    jk_refused: { lines: [say('jack', '…They will. My mother will, for one. Tell {stephen} no. Politely.')], options: [] },
    jk_public: {
      lines: [say('jack', 'You\'d take it to the reeve? With me, in the open. Fine. If it\'s done, it\'s done properly.'), sayIf('margaret', 'One price for the season. Hold your stock, but no higher than last winter\'s price, and the poor households take first. Then write it, and I\'ll have it read in both villages.')],
      options: [],
    },
    jk_opened: {
      lines: [say('jack', 'The seal\'s broken. You read it. (flat) Then I\'ll not discuss it with you. Tell {stephen} I said no.')],
      options: [opt('sorry', 'I\'m sorry.', [set('playerOpened'), set('result', 'refused'), { k: 'tag', item: 'letter', from: 'player', to: 'read' }, stage(2)])],
    },
    st_back: {
      lines: [say('stephen', 'Well? Did he read it?')],
      options: [
        opt('agreed', 'He agreed.', [{ k: 'end', ending: 'agreed' }], { when: [flag('result', 'agreed')], next: 'st_end_agreed' }),
        opt('capped', 'He agreed — with a cap, and grain kept back for the poor at the old price. His mark\'s under yours.', [{ k: 'end', ending: 'capped' }], { when: [flag('result', 'capped')], next: 'st_end_capped' }),
        opt('refused', 'He said no. Politely.', [{ k: 'end', ending: 'refused' }], { when: [flag('result', 'refused')], next: 'st_end_refused' }),
        opt('public', 'It\'s been read out in both villages. One price, capped, poor households first.', [{ k: 'end', ending: 'public' }], { when: [flag('result', 'public')], next: 'st_end_public' }),
      ],
    },
    st_end_agreed: { lines: [say('stephen', 'Good. (relief, then something less comfortable) Good. Ten coppers, as I said.')], options: [] },
    st_end_capped: { lines: [say('stephen', 'A reserve. Out of my stock. (long pause) …My father ran out of flour the winter I was eight. He\'d sold cheap in autumn. — All right. I\'ll sign. Ten coppers, and two more for walking it back.')], options: [] },
    st_end_refused: { lines: [say('stephen', 'Politely. (dry) That\'s something. Here\'s your ten. You carried it; that was the job.')], options: [] },
    st_end_public: { lines: [say('stephen', 'You took my letter to the reeve? …That\'s not how I\'d have done it. It\'s not wrong, either. I\'ll pay what I promised. Next time I\'ll ask a different courier.')], options: [] },
  },
  topics: [
    { slot: 'stephen', node: 'st_open', label: 'The sealed letter', when: [flagNot('accepted', true)] },
    { slot: 'stephen', node: 'st_lost', label: 'The lost letter', when: [flag('letterGiven'), flag('lostUsed', false), stageIs(1), { k: 'not', of: letter('sealed') }, { k: 'not', of: letter('opened') }] },
    { slot: 'farmer', node: 'fa_barn', label: 'The traders', when: [flag('accepted'), flagNot('farmersHeard', true)] },
    { slot: 'jack', node: 'jk_opened', label: 'The letter', when: [stageIs(1), letter('opened')] },
    { slot: 'jack', node: 'jk_read', label: 'The letter', when: [stageIs(1), letter('sealed')] },
    { slot: 'stephen', node: 'st_back', label: 'The answer', when: [stageIs(2)] },
  ],
  observations: [],
  counters: [],
  rules: [
    { id: 'opened', when: [stageIs(1), letter('opened'), flag('playerOpened', false)], effects: [set('playerOpened')] },
    { id: 'rumour', when: [flag('result', 'agreed'), { k: 'since', hours: 72, from: 'stage' }], effects: [{ k: 'rep', delta: { honesty: -5 }, reason: 'Word got round about the traders\' price', places: ['V'] }] },
    // The player refused: the carter delivers the letter and Jack agrees — the default world outcome.
    { id: 'carter', phase: 'both', when: [flag('accepted', false), { k: 'since', hours: 168, from: 'offered' }], effects: [...grain(1.4), { k: 'lapse' }] },
    { id: 'tooLong', when: [{ k: 'since', hours: 336, from: 'started' }], effects: [{ k: 'end', ending: 'late' }] },
  ],
  endings: [
    { id: 'agreed', journal: '{jack} agreed to hold one high grain price. {stephen} paid you 10 c.', effects: [{ k: 'choose', flag: 'result', value: 'agreed' }, { k: 'consume', from: 'player', item: 'letter', qty: 1 }, { k: 'pay', from: { purse: 'stephen' }, to: 'player', amount: 10 }, opinion('stephen', 15), opinion('jack', 10)] },
    { id: 'capped', journal: '{jack} agreed with a cap and a reserve for the poorest; {stephen} signed. He paid you 12 c.', effects: [{ k: 'choose', flag: 'result', value: 'capped' }, { k: 'consume', from: 'player', item: 'letter', qty: 1 }, { k: 'pay', from: { purse: 'stephen' }, to: 'player', amount: 12 }, { k: 'rep', delta: { helpfulness: 5 }, reason: 'You made the price fairer', places: ['H', 'V'] }, opinion('stephen', 10), opinion('jack', 15)] },
    { id: 'refused', journal: '{jack} said no, politely. {stephen} paid you 10 c for carrying it.', effects: [{ k: 'choose', flag: 'result', value: 'refused' }, { k: 'consume', from: 'player', item: 'letter', qty: 1 }, { k: 'pay', from: { purse: 'stephen' }, to: 'player', amount: 10 }, { k: 'if', when: [flag('playerOpened')], then: [opinion('stephen', -15)], else: [opinion('jack', 10)] }] },
    { id: 'public', journal: 'It was settled in the open with both reeves and read out in both villages. {stephen} paid you 10 c and {V}\'s treasury another 10 c.', effects: [{ k: 'choose', flag: 'result', value: 'public' }, { k: 'consume', from: 'player', item: 'letter', qty: 1 }, { k: 'pay', from: { purse: 'stephen' }, to: 'player', amount: 10 }, { k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 10 }, { k: 'rep', delta: { honesty: 10, renown: 5 }, reason: 'You settled it in the open', places: ['H', 'V'] }, opinion('stephen', -10), opinion('jack', 10), opinion('margaret', 20)] },
    { id: 'late', journal: 'The letter never reached its answer; {stephen} sent it on with the carter.', effects: [{ k: 'consume', from: 'player', item: 'letter', qty: 1 }, opinion('stephen', -5)] },
  ],
  lapse: { journal: 'The carter delivered the letter, and the traders settled it between themselves.', effects: [] },
}
