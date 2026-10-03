/**
 * G08 — Well and Rumor (docs/design/quests/grok-quest-08-well-and-rumor.md). Giver: Ralph, the farmer who is reeve.
 * Dialog lines follow the design doc; deviations (no crowd scene, the accusation reaches Margaret as a plain {V} farmer)
 * are listed in the doc's implementation notes.
 * @domain quests
 */
import type { Cond, Effect, QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, set, stage, stageGte } from './dsl'

/** The barrel is known bad and at least one more fact points away from the well. */
const facts2: Cond = { k: 'all', of: [flag('barrelBad'), { k: 'any', of: [flag('whoDrank'), flag('doraSaid'), flag('wellClean')] }] }
const sick = ['wife', 'stephen']
const heal: Effect = { k: 'heal', slots: sick }

export const G08: QuestDef = {
  id: 'g08',
  title: 'Well and Rumor',
  giver: 'ralph',
  cast: {
    ralph: { kind: 'npc', required: true, profession: 'farmer', kin: ['head'] },
    wife: { kind: 'npc', required: true, profession: 'farmer', kin: ['spouse'] },
    stephen: { kind: 'npc', required: true, profession: 'trader', kin: ['head'] },
    tom: { kind: 'npc', required: true, profession: 'shepherd', kin: ['spouse', 'head', 'son'] },
    dora: { kind: 'npc', required: true, profession: 'herbalist', kin: ['head'] },
    margaret: { kind: 'npc', required: false, place: 'V', profession: 'farmer', kin: ['head'], fallbackName: 'the reeve of the next village' },
  },
  start: [{ k: 'day', from: 4 }, alive('tom')],
  onOffer: [{ k: 'ill', slots: sick, severity: 30, hours: 72 }, set('rumourStart', 'today')],
  flags: { result: 'none', rumourStart: 0, accepted: false, whoDrank: false, wellClean: false, barrelBad: false, doraSaid: false, accused: false, apologised: false, tomTold: false, tomWarned: false },
  stages: [
    { id: 'rumour', journal: '{wife} and {stephen} fell sick the same night and {H} is saying the well is poisoned. {ralph} wants the truth before the square decides on a culprit.', anchor: { k: 'actor', slot: 'ralph' } },
    { id: 'facts', journal: 'Find out what made them sick: talk to {stephen} and {dora}, look at the well and at what the two houses shared.', anchor: { k: 'settlement', kind: 'well' } },
    { id: 'square', journal: 'Tell {ralph} what you know — or what the square would like to hear.', anchor: { k: 'actor', slot: 'ralph' } },
  ],
  choiceLabels: { truth: 'You told the square the truth about the beer', quiet: 'You and {tom} told {ralph} quietly', accusation: 'You accused {V} without proof' },
  nodes: {
    ra_open: {
      lines: [
        say('ralph', 'My wife\'s been sick since midnight. So has {stephen}. And half the square has decided the well is poisoned — a carter from {V} watered his oxen there yesterday. (low) I need to know what it really is before somebody says it out loud to the wrong person.'),
        say('player', 'Where do I start?'),
        say('ralph', 'Anywhere but the square.'),
      ],
      options: [
        opt('find_out', 'I\'ll find out.', [{ k: 'accept' }, set('accepted'), stage(1), opinion('ralph', 5)], { next: 'ra_thanks' }),
        opt('carter', 'Maybe it was the carter.', [{ k: 'accept' }, set('accepted'), stage(1)], { next: 'ra_carter' }),
        opt('refuse', 'Not my business.', [{ k: 'refuse' }]),
      ],
    },
    ra_thanks: { lines: [say('ralph', 'Thank you. {stephen} and {dora} first, I think — and look at what the two houses shared.')], options: [] },
    ra_carter: { lines: [say('ralph', 'Maybe. Find out. Don\'t guess.')], options: [] },
    ra_square: {
      lines: [say('ralph', 'Well? What do I tell them?', flagNot('accused', true)), say('ralph', 'You went to {V} and said what? (cold) …Then tell me what you really know.', flag('accused'))],
      options: [
        opt('truth', 'The well is clean. A barrel of {tom}\'s beer went bad because the cask was not scalded. Everyone who is sick drank from it. Say it on the square.', [{ k: 'end', ending: 'truth' }], { needs: [facts2], reason: 'You don\'t know enough yet.', when: [flagNot('accused', true)] }),
        opt('quiet', '{tom} is coming with me to tell you himself. The square only needs to hear that the well is clean and it is dealt with.', [{ k: 'end', ending: 'quiet' }], { needs: [facts2, flag('tomTold')], reason: 'You need {tom}\'s part in it, and {tom:he} must come along.', when: [flagNot('accused', true)] }),
        opt('accusation', 'I told {V}\'s reeve what I thought of the carter.', [{ k: 'end', ending: 'accusation' }], { when: [flag('accused')] }),
      ],
    },
    st_sick: {
      lines: [say('stephen', 'Water? I have drunk from that well every day of my life and never — no. Beer. {tom}\'s small beer, a jug on market day. It tasted… thick. I thought it was the new barley.')],
      options: [opt('thanks', 'Rest. I\'ll look into it.', [set('whoDrank')])],
    },
    do_symptoms: {
      lines: [say('dora', 'Cramps, fever, and they both drank the same thing. A poisoned well makes the whole village sick, not two houses. Look at what they shared.')],
      options: [opt('thanks', 'I\'ll look at what they shared.', [set('doraSaid'), opinion('dora', 3)])],
    },
    to_barrel: {
      lines: [
        say('tom', 'Oh. Oh, no. I was in a hurry — my wife was at the lambing and I just… I didn\'t scald it. (sits down) {ralph}\'s wife. Is she bad?'),
        say('player', 'Dora says she will mend.'),
        say('tom', 'I\'ll pour the lot out. I\'ll go and tell them. I\'ll — what do I do?'),
      ],
      options: [
        opt('come', 'Tell {ralph} yourself. I\'ll come with you.', [set('tomTold'), opinion('tom', 5)]),
        opt('leave', '{ralph} needs to hear this from me, and the square from {ralph}.', [set('tomWarned')]),
      ],
    },
    ma_accuse: {
      lines: [say('margaret', 'You\'ve come to tell me someone from {V} poisoned your well. On what? A carter watering his oxen? (cold) Bring me something better than a rumour, or don\'t bring me anything.')],
      options: [
        opt('accuse', 'We\'ll see what {H} says about it.', [set('accused'), stage(2), message('You have made an accusation you cannot back up.', 'bad')], { when: [{ k: 'not', of: facts2 }] }),
        opt('sorry', 'You\'re right. I\'m sorry — I\'ll find out properly.', []),
      ],
    },
    ma_apology: {
      lines: [say('margaret', 'You brought me the barrel. (a long breath) Then say it plainly: you were wrong about {V}.')],
      options: [opt('apologise', 'I was wrong. The well is clean, and {V} had nothing to do with it.', [set('apologised'), set('accused', false), { k: 'rep', delta: { honesty: -5 }, reason: 'You apologised to {V}', places: ['H', 'V'] }, opinion('margaret', 5)])],
    },
  },
  topics: [
    { slot: 'ralph', node: 'ra_open', label: 'The sick houses', when: [flagNot('accepted', true)] },
    { slot: 'ralph', node: 'ra_square', label: 'What the square hears', when: [flag('accepted'), stageGte(1)] },
    { slot: 'stephen', node: 'st_sick', label: 'The night you fell sick', when: [flag('accepted'), flagNot('whoDrank', true)] },
    { slot: 'dora', node: 'do_symptoms', label: 'The sick houses', when: [flag('accepted'), flagNot('doraSaid', true)] },
    { slot: 'tom', node: 'to_barrel', label: 'The end barrel', when: [flag('barrelBad'), flagNot('tomTold', true), flagNot('tomWarned', true)] },
    { slot: 'margaret', node: 'ma_apology', label: 'The sick houses', when: [flag('accused'), flag('barrelBad'), { k: 'not', of: { k: 'since', hours: 24, from: 'stage' } }, { k: 'visited', place: 'V' }] },
    { slot: 'margaret', node: 'ma_accuse', label: 'The sick houses', when: [flag('accepted'), flagNot('accused', true), flagNot('apologised', true), { k: 'visited', place: 'V' }] },
  ],
  observations: [
    { id: 'well', at: { k: 'settlement', kind: 'well' }, r: 3, dwellS: 4, when: [stageGte(1)], effects: [set('wellClean'), message('Cold, clear, smells of stone. A ladle of it tastes like it always has.')] },
    { id: 'cellar', at: { k: 'house', slot: 'tom' }, r: 4, dwellS: 5, when: [stageGte(1)], effects: [set('barrelBad'), message('The end barrel smells sharp and wrong. At the bottom there is a grey slime. The cask was never scalded.')] },
  ],
  counters: [],
  rules: [
    // Refused or ignored: Dora traces it to the barrel on her own and the rumour dies — no reward.
    { id: 'doraTraces', phase: 'both', when: [{ k: 'since', hours: 48, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'end', ending: 'traced' }] },
    { id: 'doraTracesLate', when: [{ k: 'since', hours: 96, from: 'started' }, { k: 'not', of: { k: 'flag', flag: 'accused', eq: true } }], effects: [{ k: 'end', ending: 'traced' }] },
    { id: 'accusedLingers', when: [flag('accused'), { k: 'since', hours: 72, from: 'stage' }], effects: [{ k: 'end', ending: 'accusation' }] },
  ],
  endings: [
    {
      id: 'truth',
      journal: '{ralph} told the square the well is clean and that a bad barrel of {tom}\'s beer made two houses sick. {tom} poured the rest out in public. {ralph} paid you 25 c from the settlement treasury.',
      effects: [
        { k: 'choose', flag: 'result', value: 'truth' },
        { k: 'pay', from: { treasury: 'home' }, to: 'player', amount: 25 },
        { k: 'rep', delta: { honesty: 10 }, reason: 'You told the square the truth about the beer' },
        opinion('ralph', 20), opinion('tom', -5), opinion('dora', 5), heal,
      ],
    },
    {
      id: 'quiet',
      journal: '{tom} told {ralph} {tom:himself} and {ralph} told the square only that the well is clean and the cause found. You were paid 20 c and {tom} sent a small beer from a good cask.',
      effects: [
        { k: 'choose', flag: 'result', value: 'quiet' },
        { k: 'pay', from: { treasury: 'home' }, to: 'player', amount: 20 },
        { k: 'give', from: { store: 'tom' }, to: 'player', item: 'small_beer', qty: 1 },
        { k: 'rep', delta: { helpfulness: 10 }, reason: 'You kept the peace in the village' },
        opinion('ralph', 15), opinion('tom', 20), heal,
      ],
    },
    {
      id: 'accusation',
      journal: 'You accused {V} without proof. The truth about the barrel came out later anyway, but {V} remembers: traders there ask more of {H} people for a month.',
      effects: [
        { k: 'choose', flag: 'result', value: 'accusation' },
        { k: 'rep', delta: { honesty: -15 }, reason: 'You blamed {V} without proof', places: ['H', 'V'] },
        opinion('margaret', -25), opinion('ralph', -10), heal,
        { k: 'priceMod', place: 'V', item: '*', mult: 1.2, days: 30, why: 'tradeFriction' },
        message('Traders in {V} turn cold towards {H} people.', 'bad'),
      ],
    },
    { id: 'traced', journal: 'Dora traced the sickness to {tom}\'s bad barrel before you did, and the rumour died.', effects: [heal] },
  ],
  lapse: { journal: '{ralph} is gone; the rumour died on its own.', effects: [] },
}
