/**
 * Q05 — The Map That Missed the River (docs/design/quests/q05-the-map-that-missed-the-river.md). Giver: Rosalind, a trader of {T}.
 * Her grandmother's map shows a river with three bends; find the dry old bed, the stone circle and the box under the eastern
 * stone (not in the first hollow), bring it back closed, then choose: keep it in the family (a third in coin), mark the dry
 * crossing with Percy ("Dulcie's Bend"), or take an emerald instead of coin. The box is the only creation path (D-ECON-1):
 * its contents are minted/granted when Rosalind opens it. Roles missing in the generator use the closest profession (D-QUEST-4).
 * @domain quests
 */
import type { Effect, QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, set, stage, stageIs } from './dsl'

const circle = { k: 'landmark', kind: 'stone_circle', pick: 'nearestRoad', road: ['V', 'T'] } as const
const eastStone = { k: 'offset', of: circle, dx: 6.5, dz: 0 } as const
const oldBed = { k: 'offset', of: circle, dx: -22, dz: 6 } as const
const box = { k: 'hasItem', item: 'strongbox_dulcie', qty: 1, from: 'player' } as const

const payShare: Effect[] = [
  // Rosalind sells one emerald to Silas to pay in coin; if Silas is short she pays what she has.
  { k: 'if', when: [alive('silas')], then: [{ k: 'give', from: { store: 'rosalind' }, to: { purse: 'silas' }, item: 'emerald', qty: 1 }, { k: 'pay', from: { purse: 'silas' }, to: { purse: 'rosalind' }, amount: 180 }] },
  { k: 'pay', from: { purse: 'rosalind' }, to: 'player', amount: 190 },
]

export const Q05: QuestDef = {
  id: 'q05',
  title: 'The Map That Missed the River',
  giver: 'rosalind',
  cast: {
    rosalind: { kind: 'npc', required: true, place: 'T', profession: 'trader', kin: ['head'] },
    silas: { kind: 'npc', required: false, place: 'T', profession: 'trader', kin: ['head'], fallbackName: 'the merchant', fallbackMale: true },
    percy: { kind: 'npc', required: false, place: 'T', profession: 'trader', kin: ['elder', 'spouse', 'child'], fallbackName: 'the scribe', fallbackMale: true },
  },
  start: [{ k: 'visited', place: 'T' }, { k: 'anchorExists', anchor: circle }],
  flags: { choice: 'none', accepted: false, oldBedFound: false, circleFound: false, firstHollowSeen: false, chestFound: false, chestBroughtBack: false, hollowDug: false, percyHeard: false, dulciesBend: false },
  stages: [
    { id: 'stall', journal: '{rosalind}\'s grandmother drew a river with three bends; today it has two. {rosalind} thinks the missing bend is an old dry channel — and that her grandmother\'s strongbox lies at a stone circle between {V} and {T}.', anchor: { k: 'actor', slot: 'rosalind' } },
    { id: 'valley', journal: 'Walk the valley between {V} and {T}: look for a dry, overgrown bed where the third bend should be, and for the stone circle. "Not in the first hollow," says the map.', anchor: oldBed, progress: [{ when: [flag('oldBedFound')], text: 'You found the dry old bed.' }, { when: [flag('circleFound')], text: 'You found the stone circle.' }] },
    { id: 'soil', journal: 'Dig by the eastern stone of the circle (a shovel) — not in the hollow in its middle. Bring the box back to {rosalind} closed.', anchor: circle },
    { id: 'return', journal: 'You have the strongbox. Bring it to {rosalind} in {T} and let her open it.', anchor: { k: 'actor', slot: 'rosalind' } },
    { id: 'split', journal: 'Choose what to do with what the box held and with the knowledge of the crossing.', anchor: { k: 'actor', slot: 'rosalind' } },
  ],
  choiceLabels: { family: 'Keep it in the family', ford: 'Dulcie\'s Bend', keep_gem: 'A green stone of your own' },
  nodes: {
    ro_open: {
      lines: [
        say('rosalind', 'My grandmother drew this river with three bends. It has two. {percy} says that makes it wrong.'),
        say('player', 'Rivers move.'),
        say('rosalind', 'That\'s what I keep telling {percy:him}. Newer isn\'t the same as truer.'),
        say('player', 'What\'s at the end of it?'),
        say('rosalind', 'Her strongbox. She lost a cart and two oxen at that river the spring of the great flood and buried what she could carry. She went back and couldn\'t find it.'),
      ],
      options: [
        opt('go', 'I\'ll go and look at the ground.', [{ k: 'accept' }, set('accepted'), stage(1), opinion('rosalind', 5)], { next: 'ro_go' }),
        opt('why', 'Why not go yourself?', [], { next: 'ro_why' }),
        opt('later', 'Not now.', [{ k: 'refuse' }], { next: 'ro_later' }),
      ],
    },
    ro_go: { lines: [say('rosalind', 'Then I\'ll pay for your bread and a third of whatever\'s in the box, if there\'s a box. One more thing: she always said "not in the first hollow." I don\'t know what it means. Bring the box closed — I\'d like to open it myself.')], options: [] },
    ro_why: {
      lines: [say('rosalind', 'Because I\'ve a stall, a sick husband and no idea how to cross a river that eats carts.')],
      options: [opt('go', 'All right, I\'ll look at the ground.', [{ k: 'accept' }, set('accepted'), stage(1), opinion('rosalind', 5)], { next: 'ro_go' })],
    },
    ro_later: { lines: [say('rosalind', 'The map will keep.')], options: [] },
    pe_map: {
      lines: [
        say('percy', 'I\'ve had the paper in my hands. Old rag paper, oak-gall ink — it\'s genuinely forty years old, I\'ll give her that. And the river is wrong, measured against the survey for the road. Three bends where there are two.'),
        say('player', 'Unless one dried up.'),
        say('percy', '(thinks) …Unless one dried up. I\'ve never walked that valley. I\'d want to see it. And that mark by the circle — a surveyor\'s sign. "Measured from here."'),
      ],
      options: [opt('ok', 'I\'ll tell you what the ground says.', [set('percyHeard'), opinion('percy', 3)])],
    },
    ro_box: {
      lines: [
        say('rosalind', '(opens it slowly) Coins. Her book — the ink\'s run, but that\'s her hand, look at the loops. And — (silence) — that\'s her ring. She was married in that ring. She told me she\'d sold it.'),
        say('rosalind', 'Emeralds. "Two green stones, for Master Halm of {T}, half paid." Halm\'s house died out before I was born. Nobody\'s coming for these.'),
      ],
      options: [
        opt('open', 'Open it.', [
          { k: 'consume', from: 'player', item: 'strongbox_dulcie', qty: 1 },
          { k: 'mint', to: { purse: 'rosalind' }, amount: 180, why: 'coins from Dulcie\'s strongbox' },
          { k: 'grant', to: { store: 'rosalind' }, item: 'gold_ring', qty: 1, why: 'Dulcie\'s strongbox' },
          { k: 'grant', to: { store: 'rosalind' }, item: 'emerald', qty: 2, why: 'Dulcie\'s strongbox' },
          { k: 'grant', to: { store: 'rosalind' }, item: 'account_book', qty: 1, why: 'Dulcie\'s strongbox' },
          set('chestBroughtBack'), stage(4), opinion('rosalind', 10),
        ], { needs: [box], reason: 'You do not have the strongbox.', next: 'ro_split' }),
      ],
    },
    ro_split: {
      lines: [say('rosalind', 'Now you get your third. I said a third and I meant it. But there\'s the crossing, too. You found a way over that river nobody in {T} knows. That\'s worth something, and I don\'t know to whom.')],
      options: [],
    },
    ro_choice: {
      lines: [say('rosalind', 'So. What shall we do with it all?')],
      options: [
        opt('family', 'Keep it in the family. The coins and stones are yours; give me my third in coin. The crossing stays your grandmother\'s secret.', [{ k: 'choose', flag: 'choice', value: 'family' }, ...payShare, { k: 'end', ending: 'family' }]),
        opt('ford', 'Let {percy} mark the dry crossing on the town map. Carters get their day back, and your grandmother\'s name goes on the bend.', [{ k: 'choose', flag: 'choice', value: 'ford' }, { k: 'companion', slot: 'percy', mode: 'free', days: 0, task: 'escort' }], { needs: [{ k: 'canTravel', slot: 'percy' }, flag('oldBedFound')], reason: '{percy} cannot walk the bed with you now, or you have not found it.', next: 'ro_ford' }),
        opt('gem', 'I\'ll take one of the emeralds as my share instead of coin.', [{ k: 'choose', flag: 'choice', value: 'keep_gem' }, { k: 'give', from: { store: 'rosalind' }, to: 'player', item: 'emerald', qty: 1 }, { k: 'end', ending: 'keep_gem' }]),
      ],
    },
    ro_ford: { lines: [say('rosalind', '"Dulcie\'s Bend." (laughs) She\'d have hated the fuss. She\'d have loved the name. Take {percy} along — I\'d like to see the line on the map.')], options: [] },
  },
  topics: [
    { slot: 'rosalind', node: 'ro_open', label: 'The old map', when: [flagNot('accepted', true)] },
    { slot: 'percy', node: 'pe_map', label: 'The map and the river', when: [flag('accepted'), flagNot('percyHeard', true)] },
    { slot: 'rosalind', node: 'ro_box', label: 'The strongbox', when: [flag('chestFound'), flagNot('chestBroughtBack', true)] },
    { slot: 'rosalind', node: 'ro_choice', label: 'What the box held', when: [flag('chestBroughtBack'), flag('choice', 'none')] },
  ],
  observations: [
    { id: 'bed', at: oldBed, r: 10, dwellS: 3, when: [flag('accepted'), flagNot('oldBedFound', true)], effects: [set('oldBedFound'), message('The third bend is still here: dry, full of willow — but you could walk it.', 'quest')] },
    { id: 'circle', at: circle, r: 9, dwellS: 2, when: [flag('accepted'), flagNot('circleFound', true)], effects: [set('circleFound'), stage(2), message('Seven stones, one fallen. "Not in the first hollow." East stone, then.', 'quest')] },
    { id: 'hollow', at: circle, r: 3, dwellS: 2, when: [flag('circleFound'), flagNot('firstHollowSeen', true)], effects: [set('firstHollowSeen'), message('In the middle a hole, half filled with leaves. Someone dug here long ago and left in a hurry.', 'quest')] },
    { id: 'walkBed', at: oldBed, r: 10, dwellS: 3, when: [flag('choice', 'ford'), { k: 'companion', slot: 'percy' }, { k: 'near', of: 'percy', anchor: oldBed, r: 12 }], effects: [set('dulciesBend'), message('{percy} writes it down: "Summer crossing, dry bed, found from the map of Dulcie, trader of {T}."', 'quest')] },
  ],
  counters: [
    { id: 'diggedEast', on: 'dig', match: { near: { anchor: eastStone, r: 2.5 } } },
    { id: 'diggedHollow', on: 'dig', match: { near: { anchor: circle, r: 3 } } },
  ],
  rules: [
    { id: 'hollow', when: [{ k: 'counter', id: 'diggedHollow', gte: 1 }, flagNot('hollowDug', true)], effects: [set('hollowDug'), message('Nothing but rust from an old spade. "Not in the first hollow."', 'quest')] },
    { id: 'boxFound', when: [{ k: 'counter', id: 'diggedEast', gte: 1 }, flagNot('chestFound', true)], effects: [set('chestFound'), stage(3), { k: 'grant', to: 'player', item: 'strongbox_dulcie', qty: 1, why: 'buried by Dulcie forty years ago' }, message('Under the eastern stone: an iron-bound box. It is heavy.', 'good')] },
    { id: 'fordDone', when: [flag('choice', 'ford'), flag('dulciesBend')], effects: [{ k: 'dismiss', slot: 'percy' }, ...payShare, { k: 'rep', delta: { renown: 8 }, reason: 'Dulcie\'s Bend', places: ['T', 'V'] }, { k: 'end', ending: 'ford' }] },
    { id: 'theft', when: [box, flagNot('chestBroughtBack', true), { k: 'since', hours: 72, from: 'stage' }, stageIs(3)], effects: [{ k: 'rep', delta: { honesty: -10 }, reason: 'Kept Rosalind\'s strongbox', places: ['T'] }, opinion('rosalind', -30), { k: 'lapse' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 240, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    { id: 'family', journal: 'The box went back to the family. {rosalind} paid you a third in coin and keeps her grandmother\'s ring.', effects: [{ k: 'rep', delta: { helpfulness: 6 }, reason: 'Dulcie\'s strongbox came home', places: ['T'] }, opinion('rosalind', 20), message('"She wore it at her wedding and on the day she lost the oxen," says {rosalind}. "I\'ll wear it to market. Let people ask."', 'info')] },
    { id: 'ford', journal: 'Dulcie\'s Bend is on the town map. {rosalind} paid you a third in coin.', effects: [opinion('rosalind', 20), opinion('percy', 10), message('"Now it\'s true for everyone," says {percy}.', 'info')] },
    { id: 'keep_gem', journal: 'You took an emerald as your share.', effects: [{ k: 'rep', delta: { helpfulness: 4 }, reason: 'Dulcie\'s strongbox came home', places: ['T'] }, opinion('rosalind', 15), message('"Don\'t sell it to the first man who smiles at it," says {rosalind}.', 'info')] },
  ],
  lapse: { journal: 'The map stayed with {rosalind}; nobody found the strongbox.', effects: [{ k: 'dismiss', slot: 'percy' }] },
}
