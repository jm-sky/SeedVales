/**
 * Q11 — The Bell in Blackwater (docs/design/quests/codex-quest-11-bell-in-blackwater.md). Giver: Eve, the boat-builder of {V}.
 * A dry summer shows the roof of a drowned chapel in the marsh. Find the causeway (round the black pool, never across), deal
 * with the bull moose, free the silver-clad bell and the toll chest, count them in {V}, then choose: rebuild the crossing,
 * sell to Silas, or invest in Eve's boat for a share of the tolls (a recurring payout after the quest ends, rule phase `done`).
 * Stubs (design-accepted): seasonal water level, boat transport (heavy goods need a cart), the bell dent, crossing as a timer.
 * @domain quests
 */
import type { QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, sayIf, set, stage } from './dsl'

const chapel = { k: 'landmark', kind: 'chapel_ruin', pick: 'nearestHome' } as const
const boatStone = { k: 'offset', of: chapel, dx: -34, dz: 0 } as const
const causeway = { k: 'offset', of: chapel, dx: -14, dz: 9 } as const
const blackPool = { k: 'offset', of: chapel, dx: -14, dz: -9 } as const
const willow = { k: 'offset', of: chapel, dx: 26, dz: 10 } as const
const has = (item: string, qty = 1) => ({ k: 'hasItem', item, qty, from: 'player' }) as const
const handled = flagNot('moose', 'none')

export const Q11: QuestDef = {
  id: 'q11',
  title: 'The Bell in Blackwater',
  giver: 'eve',
  cast: {
    eve: { kind: 'npc', required: true, place: 'V', profession: 'woodcutter', kin: ['head'] },
    margaret: { kind: 'npc', required: true, place: 'V', profession: 'farmer', kin: ['head'] },
    winifred: { kind: 'npc', required: false, place: 'V', profession: 'herbalist', kin: ['elder', 'head'], fallbackName: 'the old herbalist' },
    silas: { kind: 'npc', required: false, place: 'T', profession: 'trader', kin: ['head'], fallbackName: 'the merchant', fallbackMale: true },
    moose: { kind: 'creature', required: false, creature: { species: 'moose', variant: 'strong', at: willow, tag: 'blackwater_bull', leash: 30 } },
  },
  start: [{ k: 'visited', place: 'V' }, { k: 'anchorExists', anchor: chapel }],
  flags: { choice: 'none', accepted: false, bookRead: false, causewayMarked: false, bogged: false, moose: 'none', chapelReached: false, bellOut: false, chestOut: false, counted: false, crossingOpen: false },
  stages: [
    { id: 'roof', journal: 'A dry summer has lowered the marsh, and {eve} has seen the roof of Blackwater Chapel for the first time in thirty years: a silver-clad bell, a toll chest, and the drowned causeway.', anchor: { k: 'actor', slot: 'eve' } },
    { id: 'road', journal: 'Follow the drowned causeway from the boat-stone, round the black pool — never across it — and deal with the old bull moose that holds the reed beds.', anchor: boatStone, progress: [{ when: [flag('bookRead')], text: '{winifred} told you the causeway goes round the pool.' }, { when: [flag('causewayMarked')], text: 'You marked the causeway.' }, { when: [handled], text: 'The bull is no longer in your way.' }] },
    { id: 'chapel', journal: 'Under the chapel roof: free the bell (rope, and two people or two ropes) and bring the toll chest ashore, then carry both back to {V} with a cart along the marked causeway.', anchor: chapel },
    { id: 'count', journal: 'Bring the bell and the chest to {margaret} in {V} and open the chest together.', anchor: { k: 'actor', slot: 'margaret' } },
    { id: 'use', journal: 'Choose what the bell and the chest are for.', anchor: { k: 'actor', slot: 'margaret' } },
  ],
  choiceLabels: { crossing: 'The bell at the landing', sale: 'A granary and a closed marsh', investor: 'Shareholder' },
  nodes: {
    ev_open: {
      lines: [
        say('eve', 'Come and look at this. No — up here, on the bank. See that? Past the dead willows. That grey hump.'),
        say('player', 'A roof?'),
        say('eve', 'Blackwater Chapel. My mother used to say you could hear its bell from the {H} road on a still morning. This summer the water\'s dropped so far I can see the ridge-tiles.'),
        say('eve', 'There\'s a bell in it — silver on the outside — and the old causeway runs right past. If the causeway can be rebuilt, I\'ve a ferry business for life. If it can\'t, there\'s still the bell.'),
      ],
      options: [
        opt('come', 'I\'ll come.', [{ k: 'accept' }, set('accepted'), { k: 'spawn', slot: 'moose' }, stage(1), opinion('eve', 5)], { next: 'ev_come' }),
        opt('share', 'What\'s in it for me?', [{ k: 'accept' }, set('accepted'), { k: 'spawn', slot: 'moose' }, stage(1), opinion('eve', 3)], { next: 'ev_share' }),
        opt('later', 'Not now.', [{ k: 'refuse' }], { next: 'ev_later' }),
      ],
    },
    ev_come: { lines: [say('eve', 'Good. Start at the boat-stone at the marsh edge. And ask old {winifred} about the causeway first.')], options: [] },
    ev_share: { lines: [say('eve', 'A share of whatever comes out, fair and agreed with {margaret} before we sell anything. And mud. Lots of mud.')], options: [] },
    ev_later: { lines: [say('eve', 'The water won\'t stay low past the autumn rains. Don\'t take too long.')], options: [] },
    wi_book: {
      lines: [
        say('winifred', 'Blackwater? (she laughs) My grandmother rang that bell for every wedding in {V}. Fetch me the book — no, the green one. (reading) "The causeway runs from the boat-stone to the black pool, then round it, never across, to the chapel steps." People forgot that. They drew it straight on every map since.'),
        say('player', 'What\'s the black pool?'),
        say('winifred', 'Deep. Oxen went into it, the year of the flood, and didn\'t come out.'),
      ],
      options: [opt('ok', 'Round it, never across.', [set('bookRead'), opinion('winifred', 5)])],
    },
    ma_bell: {
      lines: [say('margaret', 'The bell\'s {V}\'s. Our grandparents paid for it out of the common chest, and the tolls went back into that chest. If it comes out of the marsh, it comes to {V} first. I\'ll see you\'re paid fairly for fetching it — I\'m not a thief. Then mind the moose.')],
      options: [],
    },
    ma_count: {
      lines: [
        say('margaret', '(the lid comes up) Coppers — a lot of them, green as grass. Two silver bars. And this. (the seal) "Blackwater Crossing." My father paid tolls with this stamp on the tag.'),
        sayIf('winifred', 'And the bell? You could hang it tomorrow.'),
        say('margaret', 'Then the question is where.'),
      ],
      options: [
        opt('open', 'Open the chest and hand over the bell.', [
          { k: 'give', from: 'player', to: { store: 'margaret' }, item: 'chapel_bell', qty: 1 },
          { k: 'consume', from: 'player', item: 'toll_chest', qty: 1 },
          { k: 'mint', to: { treasury: 'V' }, amount: 150, why: 'toll coppers from the chest' },
          { k: 'grant', to: { store: 'margaret' }, item: 'silver_bar', qty: 2, why: 'toll chest' },
          { k: 'grant', to: { store: 'margaret' }, item: 'ferry_seal', qty: 1, why: 'toll chest' },
          set('counted'), stage(4), opinion('margaret', 10),
        ], { needs: [has('chapel_bell'), has('toll_chest')], reason: 'You need both the bell and the chest.', next: 'ma_use' }),
      ],
    },
    ma_use: { lines: [say('margaret', 'Three ways I can see. Tell me which you\'d back.')], options: [] },
    ma_choice: {
      lines: [say('margaret', 'Which would you back?')],
      options: [
        opt('crossing', 'Rebuild the causeway with the chest money. Hang the bell at the landing, and let {eve} run the crossing.', [{ k: 'choose', flag: 'choice', value: 'crossing' }], { next: 'ma_crossing' }),
        opt('sale', 'Sell the bell and bars to {silas}. The village gets the money now.', [
          { k: 'choose', flag: 'choice', value: 'sale' },
          { k: 'give', from: { store: 'margaret' }, to: { purse: 'silas' }, item: 'chapel_bell', qty: 1 },
          { k: 'give', from: { store: 'margaret' }, to: { purse: 'silas' }, item: 'silver_bar', qty: 2 },
          { k: 'pay', from: { purse: 'silas' }, to: { treasury: 'V' }, amount: 470 },
          { k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 130 },
          { k: 'end', ending: 'sale' },
        ], { needs: [alive('silas')], reason: 'There is no buyer at hand.' }),
        opt('investor', 'I\'ll pay for {eve}\'s boat myself. Hang the bell at the landing. I take a share of the tolls in return.', [
          { k: 'choose', flag: 'choice', value: 'investor' },
          { k: 'pay', from: 'player', to: { purse: 'eve' }, amount: 80 },
          { k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 40 },
        ], { needs: [{ k: 'money', gte: 80 }], reason: 'You need 80 c for the boat.', next: 'ma_investor' }),
      ],
    },
    ma_crossing: { lines: [say('eve', 'I\'d need timber for the broken stretch — thirty posts — and the boat mended. I\'d pay a share of every toll back to the village.'), say('margaret', 'The chest covers the posts. And you get your share for fetching it.')], options: [] },
    ma_investor: { lines: [say('eve', 'You\'d put your own money into my boat?'), say('margaret', 'Then the chest pays for the causeway posts, you pay for the boat, and the tolls are split three ways. I\'ll write it on the board in the square.')], options: [] },
  },
  topics: [
    { slot: 'eve', node: 'ev_open', label: 'The roof in the reeds', when: [flagNot('accepted', true)] },
    { slot: 'winifred', node: 'wi_book', label: 'Blackwater Chapel', when: [flag('accepted'), flagNot('bookRead', true)] },
    { slot: 'margaret', node: 'ma_bell', label: 'The bell', when: [flag('accepted'), flagNot('counted', true), flagNot('bellOut', true)] },
    { slot: 'margaret', node: 'ma_count', label: 'The bell and the chest', when: [flag('bellOut'), flag('chestOut'), flagNot('counted', true)] },
    { slot: 'margaret', node: 'ma_choice', label: 'What the bell is for', when: [flag('counted'), flag('choice', 'none')] },
  ],
  observations: [
    { id: 'causeway', at: causeway, r: 6, dwellS: 6, when: [flag('accepted'), flagNot('causewayMarked', true), { k: 'any', of: [flag('bookRead'), { k: 'skill', skill: 'survival', gte: 20 }] }], effects: [set('causewayMarked'), message('You mark the old stakes: the causeway bends round the pool and holds.', 'quest')] },
    { id: 'pool', at: blackPool, r: 5, dwellS: 2, when: [flag('accepted'), flagNot('causewayMarked', true), flagNot('bogged', true)], effects: [set('bogged'), message('The ground goes soft: you sink to the waist and haul yourself out. The pool is deep. Round it, never across.', 'bad')] },
    { id: 'lure', at: willow, r: 5, dwellS: 5, when: [flag('accepted'), flag('moose', 'none'), has('branch', 5)], effects: [{ k: 'consume', from: 'player', item: 'branch', qty: 5 }, set('moose', 'lured'), { k: 'scare', slot: 'moose', minutes: 240 }, message('You leave cut willow upwind, on the far side. The bull goes to browse it.', 'quest')] },
    { id: 'drive', at: chapel, r: 30, dwellS: 15, when: [flag('accepted'), flag('moose', 'none'), { k: 'litTorch' }], effects: [set('moose', 'driven'), { k: 'scare', slot: 'moose', minutes: 90 }, message('Torchlight and noise: the bull crashes off through the reeds, angrier than before.', 'quest')] },
    { id: 'chapel', at: chapel, r: 8, dwellS: 3, when: [flag('accepted'), handled, flagNot('chapelReached', true)], effects: [set('chapelReached'), stage(2), message('The floor is under water — but there is a floor. A bell hangs askew from a black beam, and an iron-bound chest sits on the altar step.', 'quest')] },
    { id: 'bell', at: chapel, r: 8, dwellS: 20, when: [flag('chapelReached'), flag('causewayMarked'), flagNot('bellOut', true), has('rope', 2), { k: 'any', of: [{ k: 'companion', slot: 'eve' }, { k: 'near', of: 'eve', anchor: chapel, r: 12 }] }], effects: [{ k: 'consume', from: 'player', item: 'rope', qty: 2 }, set('bellOut'), { k: 'grant', to: 'player', item: 'chapel_bell', qty: 1, why: 'silver-clad bell from the drowned chapel' }, message('The chain parts, the bell surfaces dripping. "It\'s a bell. They don\'t make them light so they\'ll float."', 'good')] },
    { id: 'chest', at: chapel, r: 8, dwellS: 8, when: [flag('chapelReached'), flag('causewayMarked'), flagNot('chestOut', true)], effects: [set('chestOut'), { k: 'grant', to: 'player', item: 'toll_chest', qty: 1, why: 'toll chest from the drowned chapel' }, message('The chest is heavy, and shut. "Leave it shut," says {eve}.', 'good')] },
  ],
  counters: [{ id: 'timber', on: 'give', weight: 'n', match: { item: 'log', slot: 'eve' }, when: [{ k: 'any', of: [flag('choice', 'crossing'), flag('choice', 'investor')] }] }],
  rules: [
    { id: 'killed', when: [flag('accepted'), flag('moose', 'none'), { k: 'dead', slot: 'moose' }], effects: [set('moose', 'killed'), message('The bull is dead; wolves will come to the marsh for a few days.', 'quest')] },
    { id: 'built', when: [{ k: 'any', of: [flag('choice', 'crossing'), flag('choice', 'investor')] }, { k: 'any', of: [{ k: 'since', hours: 672, from: 'stage' }, { k: 'counter', id: 'timber', gte: 30 }] }, flag('crossingOpen', false)], effects: [set('crossingOpen'), { k: 'if', when: [flag('choice', 'crossing')], then: [{ k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 60 }, { k: 'end', ending: 'crossing' }], else: [{ k: 'end', ending: 'investor' }] }] },
    { id: 'tolls', phase: 'done', everyDays: 7, max: 8, when: [flag('choice', 'investor'), flag('crossingOpen')], effects: [{ k: 'pay', from: { purse: 'eve' }, to: 'player', amount: 8 }, message('Your share of the tolls from {eve}.', 'good')] },
    { id: 'theft', when: [has('toll_chest'), flagNot('counted', true), { k: 'since', hours: 96, from: 'stage' }, flag('chestOut')], effects: [{ k: 'rep', delta: { honesty: -10 }, reason: 'Kept the Blackwater toll chest', places: ['V'] }, opinion('margaret', -30), { k: 'lapse' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 240, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    { id: 'crossing', journal: 'The causeway is rebuilt and the bell hangs at the landing. {margaret} paid you 60 c from the {V} treasury.', effects: [{ k: 'rep', delta: { helpfulness: 10 }, reason: 'The crossing at Blackwater', places: ['V'] }, opinion('eve', 20), opinion('margaret', 10), message('"Hear that?" says {eve}. "That\'s what my mother meant."', 'info')] },
    { id: 'sale', journal: '{silas} bought the bell and the bars for 470 c. You received 130 c; the marsh stays closed.', effects: [{ k: 'rep', delta: { helpfulness: 4 }, reason: 'The Blackwater bell was sold for {V}', places: ['V'] }, opinion('margaret', 10), opinion('eve', -5), message('"It\'s a lot of granary," says {eve}.', 'info')] },
    { id: 'investor', journal: 'The causeway is rebuilt; you paid for {eve}\'s boat and take a third of the tolls: 40 c now and a share each week for a while.', effects: [{ k: 'rep', delta: { helpfulness: 8, renown: 3 }, reason: 'Shareholder in the Blackwater crossing', places: ['V'] }, opinion('eve', 25), opinion('margaret', 10)] },
  ],
  lapse: { journal: 'The bell stays in the marsh.', effects: [] },
}
