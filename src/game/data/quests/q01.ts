/**
 * Q01 — A Hare Out of Place (docs/design/quests/q01-a-hare-out-of-place.md). Giver: Jacob, the hunter.
 * A white hare lives at the forest edge (a unique creature, never respawned); Luke the shepherd's son found it.
 * Three ways to end: the white pelt to Stephen, an ordinary hare, or a few days of watching.
 * @domain quests
 */
import type { Cond, QuestDef } from './types'
import { flag, flagNot, message, opinion, opt, say, set, stage, stageGte, stageIs } from './dsl'

const watchComplete: Cond = { k: 'all', of: [flag('feedingSeen'), flag('coverSeen'), flag('lukeSaw')] }
const setChoice = (value: string) => [{ k: 'choose', flag: 'choice', value } as const]

export const Q01: QuestDef = {
  id: 'q01',
  title: 'A Hare Out of Place',
  giver: 'jacob',
  cast: {
    jacob: { kind: 'npc', required: true, profession: 'hunter', kin: ['head'] },
    luke: { kind: 'npc', required: true, kin: ['son'] },
    stephen: { kind: 'npc', required: true, profession: 'trader', kin: ['head'] },
    hare: { kind: 'creature', required: true, creature: { species: 'hare', variant: 'albino', at: { k: 'wild', bearing: 'forestEdge', m: 450 }, tag: 'white_hare' } },
  },
  start: [{ k: 'day', from: 2 }, { k: 'noThreat', r: 400 }],
  onOffer: [{ k: 'spawn', slot: 'hare' }],
  flags: { reported: false, choice: 'none', accepted: false, invited: false, feedingSeen: false, coverSeen: false, lukeSaw: false, watchDay: 0, watched2: false },
  stages: [
    { id: 'chance', journal: '{luke} saw a white hare beyond the hazels and has told half the village. {jacob} wants you to go with {luke:him} and bring back what you saw.', anchor: { k: 'actor', slot: 'jacob' } },
    { id: 'field', journal: 'Read the ground: watch the hare feed from cover, still and downwind, and see where it hides. Ask {luke} to come along if you want a witness.', anchor: { k: 'actor', slot: 'hare' }, progress: [{ when: [flag('feedingSeen')], text: 'You have seen it feed.' }, { when: [flag('coverSeen')], text: 'You have seen where it goes to ground.' }] },
    { id: 'decide', journal: 'Decide with {luke} what the hare is for: the white pelt for {stephen}, an ordinary hare, or leave it and keep watching.', anchor: { k: 'actor', slot: 'jacob' } },
  ],
  choiceLabels: { pelt: 'The white pelt, one clean shot', ordinary: 'An ordinary hare for the pot', watch: 'Leave it and keep watching' },
  nodes: {
    ja_open: {
      lines: [
        say('jacob', '{luke} saw a white hare beyond the hazels. Since then {luke:he} has sold a hide, bought a new bag, and spent the change.'),
        say('player', 'Has {luke:he} caught it?'),
        say('jacob', '{luke:He}\'s told three people about it. That\'s a different skill. Go with {luke:him}, if you\'ve the day. Bring back what you saw. If you bring back the hare, I want to hear why that one.'),
      ],
      options: [
        opt('go', 'I\'ll go. Where do we start?', [{ k: 'accept' }, set('accepted'), stage(1), opinion('jacob', 5)], { next: 'ja_go' }),
        opt('later', 'Not today.', [{ k: 'refuse' }], { next: 'ja_later' }),
      ],
    },
    ja_go: { lines: [say('jacob', 'Where {luke} saw it. Then you sit still longer than {luke:he} wants to.')], options: [] },
    ja_later: { lines: [say('jacob', 'Then {luke:he} mends the strap and waits. Waiting won\'t kill {luke:him}.')], options: [] },
    ja_report: {
      lines: [say('jacob', 'Well. What did you find?'), say('jacob', 'It feeds, then goes to ground. Same path both ways? Then I could set a snare there with my eyes shut. So could anyone.', flag('feedingSeen'), flag('coverSeen'))],
      options: [opt('decide', 'We have to decide what it is for.', [stage(2)], { next: 'ja_decide' })],
    },
    ja_decide: { lines: [say('jacob', 'What would I do? I\'d fill the rack. But it\'s not my bag that\'s split. And it\'s not my hare {luke} found.')], options: [] },
    lu_invite: {
      lines: [say('luke', 'I\'ve mended the strap. It looks worse, but it holds. By the split hazel — it went under the branches, not over. I cut a mark in the trunk. I saw it once.')],
      options: [opt('come', 'Come with me. Stay downwind and keep your mouth shut.', [set('invited')], { next: 'lu_come' })],
    },
    lu_come: { lines: [say('luke', 'I promise. My boots are louder than yours — {jacob} says so every morning.')], options: [] },
    lu_choose: {
      lines: [say('luke', 'So. What are we doing?')],
      options: [
        opt('pelt', 'The white hide. One clean shot, and we split what {stephen} pays.', setChoice('pelt'), { next: 'lu_pelt' }),
        opt('ordinary', 'An ordinary hare for {stephen} and the rack. You learn to skin one you\'re not afraid to ruin.', setChoice('ordinary'), { next: 'lu_ordinary' }),
        opt('watch', 'We leave it. Watch it a few more days — where it feeds, where it shelters, whether it stays.', [...setChoice('watch'), { k: 'if', when: [watchComplete], then: [set('watchDay', 'today')] }], { needs: [watchComplete], reason: 'You haven\'t watched it feed and hide with {luke} yet.', next: 'lu_watch' }),
      ],
    },
    lu_pelt: { lines: [say('luke', 'All right. If the shot isn\'t there, we walk away. I\'d rather mend this strap a third time than botch it.')], options: [] },
    lu_ordinary: { lines: [say('luke', '…Yes. Honestly, the white one scares me a bit. Imagine cutting the most expensive hide in the wood crooked.')], options: [] },
    lu_watch: { lines: [say('luke', 'No money in that. (pause) Put my name on it, then. Not "the boy who saw it". {luke}.')], options: [] },
    st_hide: {
      lines: [say('stephen', 'The white hare? Yes, I said I\'d buy a hide like that. A clean white hide, no arrow through the middle — yes, and well. A plain hare I\'ll take any week for the pot.')],
      options: [],
    },
  },
  topics: [
    { slot: 'jacob', node: 'ja_open', label: 'The white hare', when: [flagNot('accepted', true)] },
    { slot: 'jacob', node: 'ja_report', label: 'What you found', when: [flag('accepted'), stageIs(1)] },
    { slot: 'luke', node: 'lu_invite', label: 'The white hare', when: [flag('accepted'), flagNot('invited', true)] },
    { slot: 'luke', node: 'lu_choose', label: 'What to do with it', when: [flag('accepted'), stageGte(2), flag('choice', 'none')] },
    { slot: 'stephen', node: 'st_hide', label: 'A white hide', when: [flag('accepted')] },
  ],
  observations: [
    {
      id: 'feeding',
      at: { k: 'actor', slot: 'hare' },
      r: 25,
      dwellS: 20,
      reset: true,
      when: [flag('accepted'), flagNot('feedingSeen', true), { k: 'calm', slot: 'hare', r: 25 }, { k: 'sneaking' }, { k: 'not', of: { k: 'near', slot: 'hare', r: 8 } }],
      effects: [set('feedingSeen'), { k: 'if', when: [flag('invited'), { k: 'near', slot: 'luke', r: 30 }], then: [set('lukeSaw')] }, message('The white hare steps out of the thicket and feeds, pale against the clover.')],
    },
    {
      id: 'cover',
      at: { k: 'actor', slot: 'hare' },
      r: 25,
      dwellS: 6,
      reset: true,
      when: [flag('feedingSeen'), flagNot('coverSeen', true)],
      effects: [set('coverSeen'), { k: 'if', when: [flag('invited'), { k: 'near', slot: 'luke', r: 30 }], then: [set('lukeSaw')] }, message('The hare slips back into the thicket by a low run under the hazel.')],
    },
    {
      id: 'again',
      at: { k: 'actor', slot: 'hare' },
      r: 40,
      dwellS: 10,
      reset: true,
      when: [flag('choice', 'watch'), { k: 'dayAfter', flag: 'watchDay' }, flagNot('watched2', true)],
      effects: [set('watched2'), message('You note down where it came from and where it went. Whether it stays, you cannot yet say.')],
    },
  ],
  counters: [
    { id: 'sPelt', on: 'sell', weight: 'n', match: { slot: 'stephen', item: 'white_pelt' } },
    { id: 'sMeat', on: 'sell', weight: 'n', match: { slot: 'stephen', item: 'raw_meat' } },
  ],
  rules: [
    { id: 'toDecision', when: [stageIs(1), watchComplete, flagNot('reported', true)], effects: [set('reported'), message('You have seen enough to report to {jacob}.', 'info')] },
    { id: 'pelt', when: [flag('choice', 'pelt'), { k: 'counter', id: 'sPelt', gte: 1 }], effects: [{ k: 'end', ending: 'pelt' }] },
    { id: 'ordinary', when: [flag('choice', 'ordinary'), { k: 'counter', id: 'sMeat', gte: 1 }], effects: [{ k: 'end', ending: 'ordinary' }] },
    { id: 'watched', when: [flag('choice', 'watch'), flag('watched2')], effects: [{ k: 'end', ending: 'watch' }] },
    { id: 'faded', when: [{ k: 'since', hours: 240, from: 'started' }], effects: [{ k: 'end', ending: 'faded' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 96, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    {
      id: 'pelt',
      journal: '{stephen} took the white pelt for a good price and you gave {luke} {luke:his} share; {luke} bought the bag. The white hare is gone from the wood.',
      effects: [
        { k: 'pay', from: { purse: 'stephen' }, to: 'player', amount: 20 },
        { k: 'pay', from: 'player', to: { purse: 'luke' }, amount: 15 },
        { k: 'rep', delta: { helpfulness: 5, courage: 2 }, reason: 'A clean shot, and the pelt shared' },
        opinion('jacob', 10), opinion('luke', 20), opinion('stephen', 5),
      ],
    },
    {
      id: 'ordinary',
      journal: 'An ordinary hare went to {stephen} and the rack; {jacob} showed {luke} how to skin it without leaving too much on the edge. The white hare lives on.',
      effects: [{ k: 'pay', from: { purse: 'stephen' }, to: 'player', amount: 6 }, { k: 'rep', delta: { helpfulness: 3 }, reason: 'Supper, and practice' }, opinion('jacob', 10), opinion('luke', 10)],
    },
    {
      id: 'watch',
      journal: 'You wrote down where the hare feeds and hides, and where you do not know yet. {jacob} gave you some arrows and dried meat from his own stock.',
      effects: [
        { k: 'give', from: { store: 'jacob' }, to: 'player', item: 'arrow', qty: 10 },
        { k: 'give', from: { store: 'jacob' }, to: 'player', item: 'dried_meat', qty: 2 },
        { k: 'rep', delta: { helpfulness: 3, renown: 2 }, reason: 'You kept watch on the white hare' },
        opinion('jacob', 15), opinion('luke', 20),
      ],
    },
    { id: 'faded', journal: 'Nothing came of the white hare; {luke} mended the strap a third time.', effects: [opinion('luke', -3)] },
  ],
  lapse: { journal: '{luke} mended the strap and waited.', effects: [] },
}
