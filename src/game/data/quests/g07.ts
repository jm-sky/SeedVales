/**
 * G07 — Trail of Greybeard (docs/design/quests/grok-quest-07-trail-of-greybeard.md). Giver: Jacob, the hunter.
 * A unique old wolf (alpha variant, no den, never respawned) circles the village. Two signs, then four ways to end it:
 * kill it (bow or trap), drive it off with fire over two days, or poison it with hemlock bait.
 * @domain quests
 */
import type { Cond, QuestDef } from './types'
import { flag, flagNot, message, opinion, opt, say, sayIf, set, stage, stageGte, stageIs } from './dsl'

const den = { k: 'wild', bearing: 'north', m: 900 } as const
const trail = { k: 'wild', bearing: 'north', m: 350 } as const
const clues2: Cond = { k: 'any', of: [{ k: 'all', of: [flag('cluePost'), flag('cluePrint')] }, { k: 'all', of: [flag('cluePost'), flag('clueDen')] }, { k: 'all', of: [flag('cluePrint'), flag('clueDen')] }] }
const poisonOK: Cond = { k: 'all', of: [{ k: 'quest', id: 'g04', in: ['done'], started: true }, { k: 'opinion', slot: 'dora', gte: 10 }] }
const wolfNear: Cond = { k: 'near', slot: 'greybeard', r: 400 }

export const G07: QuestDef = {
  id: 'g07',
  title: 'Trail of the Grey Wolf',
  giver: 'jacob',
  cast: {
    jacob: { kind: 'npc', required: true, profession: 'hunter', kin: ['head'] },
    martha: { kind: 'npc', required: true, profession: 'hunter', kin: ['spouse'] },
    mark: { kind: 'npc', required: true, profession: 'guard', kin: ['head'] },
    dora: { kind: 'npc', required: false, profession: 'herbalist', kin: ['head'], fallbackName: 'the herbalist' },
    greybeard: { kind: 'creature', required: true, creature: { species: 'wolf', variant: 'alpha', at: den, tag: 'greybeard' } },
  },
  start: [{ k: 'day', from: 2 }, { k: 'posts', gte: 1 }],
  onOffer: [{ k: 'spawn', slot: 'greybeard' }],
  flags: { toEndPosted: false, result: 'none', accepted: false, cluePost: false, cluePrint: false, clueDen: false, assist: false, assisted: false, driveOK: false, driveDay1: 0, driveDay2: false, poisonAt: 0, poisoned: false },
  stages: [
    { id: 'signs', journal: '{jacob} has spent twelve nights after an old grey wolf with a missing toe that circles the village. Find two signs {jacob} can trust: grey hair on a post ({mark} found it), the print in the mud by the ditch, and — if you are lucky or stupid — the den.', anchor: { k: 'actor', slot: 'jacob' }, progress: [{ when: [flag('cluePost')], text: 'You have the hair on the post.' }, { when: [flag('cluePrint')], text: 'You have seen the four-toed print.' }, { when: [flag('clueDen')], text: 'You have found where he lies up.' }] },
    { id: 'end', journal: 'You have the signs. Decide with {jacob} how it ends: at the den with a bow or a trap, by driving the wolf off with fire for two days, or — if you know the herbs — with a bait.', anchor: den },
  ],
  choiceLabels: { kill: 'The wolf was killed', drive: 'You drove the wolf out of the region', poison: 'You baited the wolf with hemlock' },
  nodes: {
    ja_open: {
      lines: [
        say('jacob', 'Twelve nights. He\'s been within a bowshot of me twice and I never saw more than his back.'),
        say('player', 'The grey wolf?'),
        say('jacob', 'Old, missing a toe on his left forefoot. He killed our dog in autumn. My girl hasn\'t slept right since. (pause) Neither have I.'),
        say('martha', 'Neither have I, and I\'m not the one in the woods.'),
      ],
      options: [
        opt('help', 'I\'ll help. Where do I start?', [{ k: 'accept' }, set('accepted'), stage(0), opinion('jacob', 5)], { next: 'ja_brief' }),
        opt('must', 'Does it have to be killed?', [{ k: 'accept' }, set('accepted'), set('driveOK')], { next: 'ja_must' }),
        opt('later', 'Not now.', [{ k: 'refuse' }], { next: 'ja_later' }),
      ],
    },
    ja_must: { lines: [say('jacob', 'He\'s old and he\'s learned that villages are easy. Either he dies, or he learns they aren\'t. I don\'t much mind which — but he has to stop coming. Find me two signs I can trust.')], options: [] },
    ja_later: { lines: [say('jacob', 'Then I\'ll go out again tonight.')], options: [] },
    ja_brief: { lines: [say('jacob', 'Find me two signs I can trust. {mark} found grey hair on a post. His print\'s in the mud somewhere along the ditch — you\'ll know it, four toes where there should be five. And if you\'re very lucky or very stupid, you\'ll find where he lies up.')], options: [] },
    ja_how: {
      lines: [
        say('jacob', 'You found the toe. (he crouches, touches the print) That\'s him. (silence) I\'ve been looking at that print for twelve nights.'),
        say('player', 'What now?'),
        say('jacob', 'Now we decide. I\'ll come to the den with you at dawn, if you want me. Once. After that I\'ve a household to sleep in.'),
      ],
      options: [
        opt('assist', 'Come with me to the den.', [set('assist'), stage(1)], { next: 'ja_assist' }),
        opt('alone', 'I\'ll go alone.', [stage(1)], { next: 'ja_alone' }),
        opt('drive', 'What if we drive him off — far enough that he doesn\'t come back?', [set('driveOK'), stage(1)], { next: 'ja_drive' }),
        opt('poison', 'Dora knows hemlock. A bait at the den.', [stage(1)], { when: [poisonOK], next: 'ja_poison' }),
      ],
    },
    ja_assist: { lines: [say('jacob', 'Then I shoot once, when he shows himself. After that it is yours.')], options: [] },
    ja_alone: { lines: [say('jacob', 'Alone, then. Keep a torch lit and your back to something solid.')], options: [] },
    ja_drive: { lines: [say('jacob', 'Fire at the den mouth, noise, and then you keep at him — follow him with a lit torch, don\'t let him rest. Two days of it and he\'ll go three valleys over. Maybe. He\'s old; he might not have three valleys in him.')], options: [] },
    ja_poison: { lines: [say('jacob', '…It works. It\'s how my grandfather did it. I don\'t like it. He\'ll die slow, in his hole, and so will anything else that eats the bait. If you do it, don\'t tell me.')], options: [] },
    ja_home: {
      lines: [
        say('jacob', '(looks at the pelt a long time) He was thinner than I thought. — I\'m home tonight.', flag('result', 'kill')),
        say('jacob', 'Gone north? Good. If he\'s alive in spring, he\'s somebody else\'s problem — or nobody\'s.', flag('result', 'drive')),
        say('jacob', 'It\'s done, then. (he doesn\'t ask how)', flag('result', 'poison')),
        sayIf('martha', 'You\'ll be home every night, or I\'ll hide your boots.', flag('result', 'kill')),
      ],
      options: [],
    },
    ma_post: {
      lines: [say('mark', 'Here. Grey hair caught on the splinters, a hand off the ground. He rubbed past the post by the pens. Close enough to smell the sheep — not close enough to the torch.')],
      options: [opt('note', 'Thanks. I\'ll tell {jacob}.', [set('cluePost')])],
    },
  },
  topics: [
    { slot: 'jacob', node: 'ja_open', label: 'The grey wolf', when: [flagNot('accepted', true)] },
    { slot: 'jacob', node: 'ja_how', label: 'How it ends', when: [flag('accepted'), stageIs(0), clues2] },
    { slot: 'mark', node: 'ma_post', label: 'The hair on the post', when: [flag('accepted'), flagNot('cluePost', true)] },
  ],
  observations: [
    { id: 'print', at: trail, r: 8, dwellS: 4, when: [flag('accepted'), flagNot('cluePrint', true)], effects: [set('cluePrint'), message('In the soft mud by the ditch: a big wolf print, splayed and heavy — and on the left forefoot, only four toes. The trail leads north, toward the pines.')] },
    { id: 'den', at: den, r: 14, dwellS: 6, when: [flag('cluePrint'), flagNot('clueDen', true)], effects: [set('clueDen'), message('Under the root-plate of a wind-thrown pine: a hollow lined with grey hair, old bones scattered in front. Nothing else\'s prints but his. He lives alone.')] },
    { id: 'jacobShoots', at: den, r: 60, dwellS: 1, when: [flag('assist'), stageGte(1), flagNot('assisted', true), { k: 'near', slot: 'greybeard', r: 40 }], effects: [set('assisted'), { k: 'hurt', slot: 'greybeard', amount: 25 }, message('An arrow from the dark — {jacob} keeps his promise — and the wolf yelps.')] },
    { id: 'fire', at: den, r: 14, dwellS: 20, when: [flag('driveOK'), stageGte(1), { k: 'litTorch' }, flag('driveDay1', 0)], effects: [set('driveDay1', 'today'), { k: 'scare', slot: 'greybeard', minutes: 20 }, message('You burn the den mouth and shout him out. He goes north at a trot, looking back.')] },
    { id: 'bait', at: den, r: 14, dwellS: 8, when: [stageGte(1), poisonOK, { k: 'hasItem', item: 'hemlock', qty: 2, from: 'player' }, flagNot('poisoned', true)], effects: [{ k: 'consume', from: 'player', item: 'hemlock', qty: 2 }, set('poisoned'), set('poisonAt', 'today'), message('You lay the bait at the den mouth and wash your hands twice.')] },
  ],
  counters: [],
  rules: [
    { id: 'toEnd', when: [stageIs(0), clues2, { k: 'not', of: { k: 'flag', flag: 'toEndPosted', eq: true } }], effects: [set('toEndPosted'), message('You have two signs. Report to {jacob}.', 'info')] },
    { id: 'killed', when: [stageGte(1), { k: 'dead', slot: 'greybeard' }, flag('poisoned', false), flag('driveDay2', false)], effects: [{ k: 'end', ending: 'kill' }] },
    { id: 'driveDay2', when: [flagNot('driveDay1', 0), { k: 'dayAfter', flag: 'driveDay1' }, wolfNear, { k: 'litTorch' }], effects: [set('driveDay2'), { k: 'scare', slot: 'greybeard', minutes: 30 }, { k: 'end', ending: 'drive' }] },
    { id: 'poisonWorks', when: [flag('poisoned'), { k: 'dayAfter', flag: 'poisonAt' }], effects: [{ k: 'slay', slot: 'greybeard' }, { k: 'end', ending: 'poison' }] },
    { id: 'jacobKills', phase: 'both', when: [{ k: 'day', from: 22 }, flag('accepted', false)], effects: [{ k: 'slay', slot: 'greybeard' }, { k: 'lapse' }] },
    { id: 'tooLong', when: [{ k: 'since', hours: 360, from: 'started' }], effects: [{ k: 'end', ending: 'gaveUp' }] },
  ],
  endings: [
    {
      id: 'kill',
      journal: 'The old wolf is dead. {mark} paid you 30 c from the settlement treasury; {jacob} would not have the pelt in the house, so it is yours.',
      effects: [
        { k: 'choose', flag: 'result', value: 'kill' },
        { k: 'pay', from: { treasury: 'home' }, to: 'player', amount: 30 },
        { k: 'rep', delta: { courage: 10 }, reason: 'The wolf that haunted {H} is dead' },
        opinion('jacob', 30), opinion('mark', 10), opinion('martha', 15),
      ],
    },
    {
      id: 'drive',
      journal: 'You kept at the wolf for two days with a lit torch and he left the region. {jacob} paid 20 c from the settlement treasury.',
      effects: [
        { k: 'choose', flag: 'result', value: 'drive' },
        { k: 'pay', from: { treasury: 'home' }, to: 'player', amount: 20 },
        { k: 'rep', delta: { courage: 5, helpfulness: 5 }, reason: 'You drove the wolf away from {H}' },
        opinion('jacob', 20),
      ],
    },
    {
      id: 'poison',
      journal: 'The hemlock bait did its work in a day. {jacob} did not ask how and you were paid 20 c from the settlement treasury.',
      effects: [
        { k: 'choose', flag: 'result', value: 'poison' },
        { k: 'pay', from: { treasury: 'home' }, to: 'player', amount: 20 },
        opinion('jacob', -15),
        message('The smell of hemlock is on your gloves, and {jacob} noticed.', 'info'),
      ],
    },
    { id: 'gaveUp', journal: 'The wolf is still out there; {jacob} went back to his nights in the woods.', effects: [opinion('jacob', -5)] },
  ],
  lapse: { journal: '{jacob} dealt with the old wolf himself.', effects: [] },
}
