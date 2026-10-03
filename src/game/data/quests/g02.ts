/**
 * G02 — Rusty Debt (docs/design/quests/grok-quest-02-rusty-debt.md). Giver: Bernard, the blacksmith of {V}.
 * A plowshare with a hidden cold shut, a price dispute between {V}'s smith and {H}'s reeve, four ways to settle it.
 * @domain quests
 */
import type { QuestDef } from './types'
import { flag, flagNot, message, opinion, opt, say, set, stage, stageIs } from './dsl'

const share = (tag?: string) => ({ k: 'hasItem', item: 'plowshare', qty: 1, from: 'player', ...(tag ? { tag } : {}) }) as const
const bernardPays = (amount: number) => ({ k: 'pay', from: { purse: 'bernard' }, to: 'player', amount }) as const

export const G02: QuestDef = {
  id: 'g02',
  title: 'Rusty Debt',
  giver: 'bernard',
  cast: {
    bernard: { kind: 'npc', required: true, place: 'V', profession: 'blacksmith', kin: ['elder', 'head'] },
    sophie: { kind: 'npc', required: false, place: 'V', profession: 'blacksmith', kin: ['child', 'spouse', 'head'], fallbackName: 'the forge hand' },
    ralph: { kind: 'npc', required: true, profession: 'farmer', kin: ['head'] },
  },
  start: [{ k: 'visited', place: 'V' }, { k: 'treasuryGte', gte: 35 }],
  onOffer: [{ k: 'grant', to: { store: 'ralph' }, item: 'plowshare', qty: 1, why: 'bernards-share', tag: 'flawed' }],
  flags: { result: 'none', accepted: false, priceKnown: false, flawFound: false, bernardAdmits: false, outcome: 'none', carrying: false, welded: false },
  stages: [
    { id: 'forge', journal: '{bernard}, the blacksmith of {V}, wants his forty coppers for a plowshare the reeve of {H} says ploughs like a drunk. Talk to {ralph} in {H}.', anchor: { k: 'actor', slot: 'bernard' } },
    { id: 'field', journal: 'Look at the share in {H} and settle it with {ralph}: pay as it is, take it back to be mended, return it, or press him.', anchor: { k: 'actor', slot: 'ralph' } },
    { id: 'weld', journal: '{sophie} is re-welding the heel at the forge — it takes half a day. Then carry the share back to {ralph}.', anchor: { k: 'actor', slot: 'bernard' } },
    { id: 'close', journal: 'Report back to {bernard} at the forge.', anchor: { k: 'actor', slot: 'bernard' } },
  ],
  choiceLabels: { settled30: 'Thirty coppers, the share as it is', mended: 'The share was mended and paid at thirty-five', returned: 'The share went back to the forge', pressured: 'You pressed {ralph} into paying forty' },
  nodes: {
    be_open: {
      lines: [
        say('bernard', 'You\'re from {H}? Good. Then you can carry a message to your village head. I made him a plowshare in spring. Good steel edge, the best I had. Forty coppers, I said, over the anvil, and he nodded. Now he sends word it "ploughs like a drunk" and he\'ll pay thirty-five when he\'s minded to.'),
        say('player', 'What do you want me to do?'),
        say('bernard', 'Get me my forty. Or get me my share back. I\'d rather have the iron than the insult.'),
      ],
      options: [
        opt('talk', 'I\'ll talk to {ralph}.', [{ k: 'accept' }, set('accepted'), stage(1), opinion('bernard', 5)], { next: 'be_go' }),
        opt('good', 'Is the share any good?', [{ k: 'accept' }, set('accepted'), stage(1)], { next: 'be_good' }),
        opt('refuse', 'Not my business.', [{ k: 'refuse' }], { next: 'be_no' }),
      ],
    },
    be_go: { lines: [say('bernard', 'Tell him forty, over the anvil.')], options: [] },
    be_good: { lines: [say('bernard', 'It\'s mine. Of course it\'s good.')], options: [] },
    be_no: { lines: [say('bernard', 'Nobody\'s, apparently.')], options: [] },
    so_price: {
      lines: [say('sophie', 'Thirty. That\'s what a share like that fetches in the town. Forty\'s Father\'s price — he counts the edge as if it were a sword. (pause) And… his last few pieces haven\'t been right. I don\'t know why. If the share\'s bad, I\'d rather you told me than him.')],
      options: [opt('look', 'I\'ll look at it properly before I take sides.', [set('priceKnown'), opinion('sophie', 5)])],
    },
    ra_field: {
      lines: [
        say('ralph', '{bernard} sent you? He\'d send a mule if it could talk. — Look, I\'ve no quarrel with the man. I\'ve thirty-five set aside for him, from the village chest, and it\'s his the day that share ploughs straight.'),
        say('player', 'What\'s wrong with it?'),
        say('ralph', 'Hook it to the ox and see. In the heavy ground by the stream it twists, like it\'s trying to go home.'),
      ],
      options: [
        opt('settle', 'Bernard asked forty; the market price is thirty. Pay him thirty for it as it is, and keep the share.', [{ k: 'pay', from: { treasury: 'home' }, to: { purse: 'bernard' }, amount: 30 }, set('outcome', 'settled30'), stage(3)], { needs: [flag('priceKnown')], reason: 'You don\'t know the market price yet — ask at the forge.', next: 'ra_settle' }),
        opt('mend', 'Let me take it back to {V}. If it comes back mended, you pay the thirty-five.', [{ k: 'give', from: { store: 'ralph' }, to: 'player', item: 'plowshare', qty: 1 }, set('carrying')], { needs: [flag('flawFound')], reason: 'Look at the share first.', next: 'ra_mend' }),
        opt('return', 'Give the share back to {bernard}. No pay, no quarrel.', [{ k: 'give', from: { store: 'ralph' }, to: 'player', item: 'plowshare', qty: 1 }, set('carrying'), set('outcome', 'returned'), stage(3)], { next: 'ra_return' }),
        opt('press', 'Pay him forty or I tell the whole square you sit on a craftsman\'s money.', [{ k: 'pay', from: { treasury: 'home' }, to: { purse: 'bernard' }, amount: 35 }, { k: 'pay', from: { purse: 'ralph' }, to: { purse: 'bernard' }, amount: 5 }, { k: 'rep', delta: { honesty: -8 }, reason: 'You pressed {ralph} into paying' }, opinion('ralph', -20), set('outcome', 'pressured'), stage(3)], { next: 'ra_press' }),
      ],
    },
    ra_settle: { lines: [say('ralph', 'Thirty for a share that twists? …It still turns earth. All right, thirty, and I\'ll hear no more about it.')], options: [] },
    ra_mend: { lines: [say('ralph', 'If it comes back straight, I\'ll pay the thirty-five and I\'ll say thank you. Take the ox-path, it\'s drier.')], options: [] },
    ra_return: { lines: [say('ralph', 'And plough with what, the old wooden one? …Fine. I\'ll buy one in the town next market. Take it.')], options: [] },
    ra_press: { lines: [say('ralph', 'Do that, then. And tell them the share\'s cracked while you\'re at it. (cold) Here is your forty.')], options: [] },
    ra_back: {
      lines: [say('ralph', 'Let me see. (he runs a thumb along the heel) …It holds. Thirty-five, as I said.')],
      options: [opt('pay', 'Here it is, mended.', [{ k: 'give', from: 'player', to: { store: 'ralph' }, item: 'plowshare', qty: 1 }, { k: 'pay', from: { treasury: 'home' }, to: { purse: 'bernard' }, amount: 35 }, set('outcome', 'mended'), opinion('ralph', 15), stage(3)], { next: 'ra_thanks' })],
    },
    ra_thanks: { lines: [say('ralph', 'Thank you. I mean it.')], options: [] },
    be_mend: {
      lines: [say('bernard', '(turns the share in his hands) …That\'s a cold shut.'), say('sophie', 'It is.'), say('bernard', 'I don\'t make cold shuts.')],
      options: [
        opt('admit', 'You made this one. It\'s not the iron.', [set('bernardAdmits'), stage(2)], { needs: [flag('flawFound')], reason: 'You haven\'t seen the flaw yourself.', next: 'be_admit' }),
        opt('just', 'Just mend it, please.', [stage(2)], { next: 'be_just' }),
      ],
    },
    be_admit: { lines: [say('bernard', '(after a long silence) No. It\'s not the iron. Sophie — the heel.')], options: [] },
    be_just: { lines: [say('sophie', 'Half a day. Come back for it.')], options: [] },
    be_close: {
      lines: [say('bernard', 'Well? Is the man paying, or do I stop shoeing {H}\'s horses?')],
      options: [
        opt('settled30', 'Thirty, and he keeps the share as it is.', [{ k: 'end', ending: 'settled30' }], { when: [flag('outcome', 'settled30')], next: 'be_end_settled' }),
        opt('mended', 'Thirty-five, and he says thank you.', [{ k: 'end', ending: 'mended' }], { when: [flag('outcome', 'mended')], next: 'be_end_mended' }),
        opt('returned', 'Here\'s your share. No pay.', [{ k: 'end', ending: 'returned' }], { when: [flag('outcome', 'returned')], next: 'be_end_returned' }),
        opt('pressured', 'He paid forty. He\'s not pleased.', [{ k: 'end', ending: 'pressured' }], { when: [flag('outcome', 'pressured')], next: 'be_end_pressured' }),
      ],
    },
    be_end_settled: { lines: [say('bernard', 'Thirty. For my best edge. (Sophie: "It\'s the market price, Father.") …The market can choke on it. Fine.')], options: [] },
    be_end_mended: { lines: [say('bernard', 'He said thank you? Hm. Then it was worth the walk.')], options: [] },
    be_end_returned: { lines: [say('bernard', 'Iron\'s iron. I\'ll draw it into something.')], options: [] },
    be_end_pressured: { lines: [say('bernard', 'Pleased isn\'t in the price.')], options: [] },
  },
  topics: [
    { slot: 'bernard', node: 'be_open', label: 'The unpaid plowshare', when: [flagNot('accepted', true)] },
    { slot: 'sophie', node: 'so_price', label: 'The price', when: [flag('accepted'), flagNot('priceKnown', true)] },
    { slot: 'ralph', node: 'ra_field', label: 'The plowshare', when: [flag('accepted'), stageIs(1), flag('carrying', false)] },
    { slot: 'ralph', node: 'ra_back', label: 'The mended plowshare', when: [stageIs(2), flag('welded'), share('mended')] },
    { slot: 'bernard', node: 'be_mend', label: 'The share', when: [flag('carrying'), stageIs(1), flag('outcome', 'none'), share('flawed')] },
    { slot: 'bernard', node: 'be_close', label: 'The payment', when: [stageIs(3)] },
  ],
  observations: [
    { id: 'seam', at: { k: 'house', slot: 'ralph' }, r: 6, dwellS: 5, when: [flag('accepted'), flagNot('flawFound', true)], effects: [set('flawFound'), message('Near the heel there\'s a fine dark seam where two layers of iron never truly joined. In soft soil it holds. In clay it flexes — you can see the polish where it\'s been rubbing.')] },
  ],
  counters: [],
  rules: [
    { id: 'weld', when: [stageIs(2), flag('welded', false), { k: 'since', hours: 12, from: 'stage' }], effects: [{ k: 'tag', item: 'plowshare', from: 'player', to: 'mended' }, set('welded'), message('{sophie} has re-welded the heel. The share rings true.', 'info')] },
    { id: 'lostShare', when: [{ k: 'since', hours: 336, from: 'started' }], effects: [{ k: 'end', ending: 'abandoned' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 96, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    { id: 'settled30', journal: '{ralph} paid thirty and keeps the share as it is. {bernard} took it with a sour face; he paid you 8 c.', effects: [{ k: 'choose', flag: 'result', value: 'settled30' }, bernardPays(8), { k: 'rep', delta: { honesty: 5 }, reason: 'A fair price on both sides', places: ['H', 'V'] }, opinion('bernard', 5), opinion('ralph', 10), opinion('sophie', 5)] },
    { id: 'mended', journal: 'The share was mended and {ralph} paid thirty-five and said thank you. {bernard} paid you 12 c, and {sophie} put an edge on your weapon.', effects: [{ k: 'choose', flag: 'result', value: 'mended' }, bernardPays(12), { k: 'repairHeld' }, { k: 'rep', delta: { helpfulness: 8, honesty: 5 }, reason: 'You got the share mended', places: ['H', 'V'] }, opinion('bernard', 15), opinion('ralph', 15), opinion('sophie', 15)] },
    { id: 'returned', journal: 'The share went back to the forge; {ralph} owes nothing. {bernard} paid you 5 c.', effects: [{ k: 'choose', flag: 'result', value: 'returned' }, { k: 'give', from: 'player', to: { store: 'bernard' }, item: 'plowshare', qty: 1 }, bernardPays(5), opinion('bernard', 5), opinion('ralph', -5)] },
    { id: 'pressured', journal: '{ralph} paid forty with cold anger. {bernard} paid you 12 c.', effects: [{ k: 'choose', flag: 'result', value: 'pressured' }, bernardPays(12), { k: 'rep', delta: { courage: 3 }, reason: 'You stood up for {bernard}', places: ['V'] }, opinion('bernard', 15), opinion('sophie', -5)] },
    { id: 'abandoned', journal: 'The dispute dragged on and nobody came for the share.', effects: [opinion('bernard', -5)] },
  ],
  lapse: { journal: 'The smith and the reeve settled it between them.', effects: [] },
}
