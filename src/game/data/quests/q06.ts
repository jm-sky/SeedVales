/**
 * Q06 — Room for One More (docs/design/quests/q06-room-for-one-more.md). Giver: Miles, the woodcutter of {H}.
 * Miles's new axe head and two wedges wait, prepaid, at Sophie's forge in {V}. {matthew}, his grown son, wants to go along:
 * hired for four days (the player pays 20 c at the end), free (he comes because he wants to), or the player fetches it alone
 * with Miles's mark. The quest owns the money: the companion contract itself carries no wage.
 * @domain quests
 */
import type { QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, sayIf, set, stage, stageIs } from './dsl'

const milesHouse = { k: 'house', slot: 'miles' } as const
const haveGoods = [{ k: 'hasItem', item: 'axe_head', qty: 1, from: 'player' }, { k: 'hasItem', item: 'iron_wedge', qty: 2, from: 'player' }] as const
const backHome = { k: 'near', anchor: milesHouse, r: 25 } as const
const deliver = [
  { k: 'give', from: 'player', to: { store: 'miles' }, item: 'axe_head', qty: 1 },
  { k: 'give', from: 'player', to: { store: 'miles' }, item: 'iron_wedge', qty: 2 },
] as const

export const Q06: QuestDef = {
  id: 'q06',
  title: 'Room for One More',
  giver: 'miles',
  cast: {
    miles: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['head'] },
    matthew: { kind: 'npc', required: false, profession: 'woodcutter', kin: ['son', 'child'], age: 'adult', fallbackName: 'the son', fallbackMale: true },
    lucy: { kind: 'npc', required: false, profession: 'woodcutter', kin: ['spouse'], fallbackName: 'his wife' },
    sophie: { kind: 'npc', required: true, place: 'V', profession: 'blacksmith', kin: ['child', 'head'], age: 'adult' },
  },
  start: [{ k: 'visited', place: 'V' }, { k: 'day', from: 3 }],
  // The order is ready and prepaid when the quest is offered (Miles pays what his purse allows; goods crafted before the quest).
  onOffer: [
    { k: 'grant', to: { store: 'sophie' }, item: 'axe_head', qty: 1, why: 'goods crafted by Sophie before the quest' },
    { k: 'grant', to: { store: 'sophie' }, item: 'iron_wedge', qty: 2, why: 'goods crafted by Sophie before the quest' },
    { k: 'pay', from: { purse: 'miles' }, to: { purse: 'sophie' }, amount: 24 },
  ],
  flags: { deal: 'none', accepted: false, familyAgreed: false, hatchetGiven: false, campReady: false, campSeen: false, bendSeen: false, itemCollected: false },
  stages: [
    { id: 'table', journal: '{miles}\'s new axe head and two wedges wait at {sophie}\'s forge in {V}, paid in advance. {matthew} wants to go along; settle how, or fetch them yourself.', anchor: { k: 'actor', slot: 'miles' } },
    { id: 'road', journal: 'Take the road to {V} and collect the order from {sophie}. She hands it only to {miles}\'s household or whoever carries his mark.', anchor: { k: 'actor', slot: 'sophie' } },
    { id: 'return', journal: 'Bring the axe head and the two wedges back to {miles}\'s house in {H}.', anchor: milesHouse },
  ],
  choiceLabels: { paid: 'A paid road, four days', free: 'A someday that he means', solo: 'Alone on the road' },
  nodes: {
    mi_open: {
      lines: [
        sayIf('matthew', '{sophie} sent word — the axe head\'s ready. I could go tomorrow.'),
        sayIf('lucy', 'You could go after the turnips are up.'),
        say('miles', 'And after somebody tells me what the road\'s like this week.'),
        say('player', 'I\'m going that way. {matthew:he} could come with me.', { k: 'alive', slot: 'matthew' }),
        sayIf('matthew', 'As what — hired hand, or son-on-an-errand?'),
      ],
      options: [
        opt('plan', 'Let\'s settle it properly before we go: how long, what for, and what if it goes wrong.', [{ k: 'accept' }, set('accepted'), stage(1), opinion('miles', 3)], { when: [alive('matthew')], next: 'mi_plan' }),
        opt('solo', 'I\'ll fetch it on my own.', [{ k: 'accept' }, set('accepted'), { k: 'choose', flag: 'deal', value: 'solo' }, { k: 'grant', to: 'player', item: 'miles_mark', qty: 1, why: 'the woodcutter household token for the order' }, stage(1)], { next: 'mi_solo' }),
        opt('later', 'Not now.', [{ k: 'refuse' }], { next: 'mi_later' }),
      ],
    },
    mi_plan: { lines: [sayIf('matthew', 'Good. Then I can say yes like I mean it.')], options: [] },
    mi_solo: { lines: [say('miles', 'That\'s a plan too. Take my mark — without it, or one of us, {sophie} won\'t hand the iron over.')], options: [] },
    mi_later: { lines: [say('miles', 'The axe head will keep. My old one won\'t, for long.')], options: [] },
    lu_aside: {
      lines: [
        say('lucy', 'If he goes, I lose two mornings in the field. Maybe three.'),
        say('player', 'What would make it all right?'),
        say('lucy', 'A day when he\'s back. Someone to carry water while he\'s gone. And nobody coming home telling me he\'s a different man because he walked to {V}.'),
      ],
      options: [
        opt('water', 'I\'ll bring water for the house before we leave.', [set('familyAgreed'), opinion('lucy', 5)], { next: 'lu_water' }),
        opt('choice', 'He\'s a grown man. It\'s his choice.', [], { next: 'lu_choice' }),
      ],
    },
    lu_water: { lines: [say('lucy', 'Then I\'ve no argument left except that I\'ll miss him, and that\'s not an argument.')], options: [] },
    lu_choice: { lines: [say('lucy', 'It is. And it\'s my turnips. Both things are true.')], options: [] },
    mi_hatchet: {
      lines: [
        say('miles', 'Don\'t call him brave because he said yes. He hasn\'t walked it yet.'),
        say('player', 'What worries you?'),
        say('miles', 'The lower bend — the business with the sow. And him trying to carry both wedges and the head at once because he thinks it\'s manly.'),
        say('miles', 'Hm. Take my old hatchet, then, {matthew}. Not the good one.'),
      ],
      options: [opt('ok', 'I\'ll watch for both.', [set('hatchetGiven'), { k: 'grant', to: { purse: 'matthew' }, item: 'small_axe', qty: 1, why: 'the old hatchet lent to the son' }, opinion('miles', 2)])],
    },
    ma_terms: {
      lines: [sayIf('matthew', 'So — how are we doing this?')],
      options: [
        opt('paid', 'Four days, there and back, one pickup. I pay you a day\'s wage — five coppers a day. If there\'s trouble on the road, we turn back.', [{ k: 'choose', flag: 'deal', value: 'paid' }, { k: 'companion', slot: 'matthew', mode: 'hire', days: 4, task: 'escort' }, { k: 'if', when: [flagNot('familyAgreed', true)], then: [opinion('lucy', -5)] }, stage(1)], { needs: [{ k: 'canTravel', slot: 'matthew' }, { k: 'money', gte: 20 }], reason: '{matthew} cannot come right now, or you do not have 20 c for four days.', next: 'ma_paid' }),
        opt('free', 'Come because you want to. No pay — but no orders either.', [{ k: 'choose', flag: 'deal', value: 'free' }, { k: 'companion', slot: 'matthew', mode: 'free', days: 0, task: 'escort' }, { k: 'if', when: [flagNot('familyAgreed', true)], then: [opinion('lucy', -5)] }, stage(1)], { needs: [{ k: 'canTravel', slot: 'matthew' }, { k: 'opinion', slot: 'matthew', gte: 25 }], reason: '{matthew} must trust you more first.', next: 'ma_free' }),
        opt('solo', 'On second thought, I\'ll fetch it on my own.', [{ k: 'choose', flag: 'deal', value: 'solo' }, { k: 'grant', to: 'player', item: 'miles_mark', qty: 1, why: 'the woodcutter household token for the order' }, stage(1)], { next: 'ma_solo' }),
      ],
    },
    ma_paid: { lines: [say('matthew', 'Twenty coppers. (pause) That\'s more than I\'ve ever held at once. And if there\'s trouble, we turn back. Good. I\'d not believe you if you said it\'d be safe.')], options: [] },
    ma_free: { lines: [say('matthew', '(thinks) …Yes. If I\'m paid, it\'s your trip. If I\'m not, it\'s mine as well. I\'d like it to be mine as well.')], options: [] },
    ma_solo: { lines: [say('matthew', 'I got the turnips to lift anyway. Next time, though.')], options: [] },
    ma_camp: {
      lines: [
        say('matthew', 'Everything\'s further than it looks from home.'),
        say('player', 'Disappointed?'),
        say('matthew', 'No. I thought I would be. — Can I ask you something? What\'s the town like?'),
      ],
      options: [
        opt('been', 'Bigger. Louder. The bread\'s worse and the beer\'s better.', [set('campSeen'), opinion('matthew', 4)]),
        opt('notyet', 'I haven\'t been. Someday.', [set('campSeen'), opinion('matthew', 4)]),
      ],
    },
    so_pickup: {
      lines: [
        say('sophie', '{miles}\'s order. Head and two wedges. Who\'s taking it?'),
        sayIf('matthew', 'Me. {matthew}, his son.', { k: 'companion', slot: 'matthew' }),
        say('sophie', 'The wedges are heavier than they look.'),
      ],
      options: [
        opt('take', 'I\'ll take it.', [{ k: 'give', from: { store: 'sophie' }, to: 'player', item: 'axe_head', qty: 1 }, { k: 'give', from: { store: 'sophie' }, to: 'player', item: 'iron_wedge', qty: 2 }, set('itemCollected'), stage(2), opinion('sophie', 3)], {
          needs: [{ k: 'any', of: [{ k: 'hasItem', item: 'miles_mark', qty: 1, from: 'player' }, { k: 'all', of: [{ k: 'companion', slot: 'matthew' }, { k: 'near', of: 'matthew', slot: 'sophie', r: 12 }] }] }],
          reason: '{sophie} releases the order only to {miles}\'s household or whoever carries his mark.',
        }),
      ],
    },
  },
  topics: [
    { slot: 'miles', node: 'mi_open', label: 'The axe head in {V}', when: [flagNot('accepted', true)] },
    { slot: 'lucy', node: 'lu_aside', label: 'The turnips', when: [flag('accepted'), flagNot('familyAgreed', true), flag('deal', 'none'), alive('matthew')] },
    { slot: 'miles', node: 'mi_hatchet', label: 'The road for {matthew}', when: [flag('accepted'), flagNot('hatchetGiven', true), alive('matthew'), { k: 'any', of: [flag('deal', 'paid'), flag('deal', 'free')] }] },
    { slot: 'matthew', node: 'ma_terms', label: 'Going to {V}', when: [flag('accepted'), flag('deal', 'none'), stageIs(1)] },
    { slot: 'matthew', node: 'ma_camp', label: 'The road so far', when: [flag('campReady'), flagNot('campSeen', true), { k: 'companion', slot: 'matthew' }] },
    { slot: 'sophie', node: 'so_pickup', label: '{miles}\'s order', when: [flag('accepted'), flagNot('itemCollected', true)] },
  ],
  observations: [
    { id: 'camp', at: { k: 'actor', slot: 'matthew' }, r: 8, dwellS: 20, when: [{ k: 'companion', slot: 'matthew' }, { k: 'hour', night: true }, { k: 'not', of: { k: 'sneaking' } }, { k: 'near', of: 'matthew', anchor: milesHouse, r: 400 }], effects: [set('campReady'), message('{matthew} sits by the fire, looking at the dark road behind you.', 'quest')] },
    { id: 'bend', at: { k: 'roadSide', frac: 0.7, off: 2 }, r: 25, dwellS: 1, when: [{ k: 'companion', slot: 'matthew' }, { k: 'quest', id: 'q02', in: ['active'] }, flagNot('bendSeen', true)], effects: [set('bendSeen'), message('{matthew}: "Is that the turned ground, where the carter got hurt? I wasn\'t going to run. I was going to walk very fast."', 'quest')] },
  ],
  counters: [],
  rules: [
    { id: 'paidDone', when: [flag('deal', 'paid'), flag('itemCollected'), backHome, ...haveGoods], effects: [...deliver, { k: 'end', ending: 'paid' }] },
    { id: 'freeDone', when: [flag('deal', 'free'), flag('itemCollected'), backHome, ...haveGoods], effects: [...deliver, { k: 'end', ending: 'free' }] },
    { id: 'soloDone', when: [flag('deal', 'solo'), flag('itemCollected'), backHome, ...haveGoods], effects: [...deliver, { k: 'consume', from: 'player', item: 'miles_mark', qty: 1 }, { k: 'end', ending: 'solo' }] },
    { id: 'dropped', when: [{ k: 'since', hours: 504, from: 'started' }], effects: [{ k: 'dismiss', slot: 'matthew' }, { k: 'end', ending: 'dropped' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 120, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    {
      id: 'paid',
      journal: 'The axe head and wedges are home. You paid {matthew} twenty coppers for four days on the road.',
      effects: [
        { k: 'pay', from: 'player', to: { purse: 'matthew' }, amount: 20 },
        { k: 'dismiss', slot: 'matthew' },
        { k: 'rep', delta: { helpfulness: 3 }, reason: 'A son sent to {V} and back' },
        opinion('matthew', 15), opinion('lucy', 5), opinion('miles', 10),
        message('"Twenty coppers. I earned them," says {matthew}. "I also earned the right to say that hill\'s in a stupid place."', 'info'),
      ],
    },
    {
      id: 'free',
      journal: 'The axe head and wedges are home. {matthew} came for nothing and asked {sophie} about spring work.',
      effects: [
        { k: 'dismiss', slot: 'matthew' },
        { k: 'rep', delta: { helpfulness: 3 }, reason: 'A son given his someday' },
        opinion('matthew', 25), opinion('lucy', 3), opinion('miles', 10),
        message('"I asked {sophie} about spring," says {matthew}. "She said bring my own boots."', 'info'),
      ],
    },
    {
      id: 'solo',
      journal: 'You fetched the axe head and wedges alone with {miles}\'s mark. He gave you 5 c for the road.',
      effects: [
        { k: 'pay', from: { purse: 'miles' }, to: 'player', amount: 5 },
        opinion('miles', 10), opinion('lucy', 3), opinion('matthew', 2),
        message('"Next time I\'m going," says {matthew}. "Next time you are," says {miles}.', 'info'),
      ],
    },
    { id: 'dropped', journal: 'The order is still waiting at {sophie}\'s forge.', effects: [opinion('miles', -3)] },
  ],
  lapse: { journal: 'Nobody went to {V} for the axe head.', effects: [{ k: 'dismiss', slot: 'matthew' }] },
}
