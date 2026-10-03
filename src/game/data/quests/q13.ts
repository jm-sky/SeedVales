/**
 * Q13 — The Ash House Vault (docs/design/quests/codex-quest-13-ash-house-vault.md). Giver: Irene of {T}, last of the family that
 * owned Ash House, a manor ruin in the woods. Pass the stag holding the orchard, shore the cellar stair, lever open the
 * vault, read the wage packet, and decide: rebuild a waystation, pay every debt, or sell to Silas. The vault's contents are
 * minted/granted when it opens (D-ECON-1) and belong to Irene: the player hands them over and takes a share.
 * @domain quests
 */
import type { Effect, QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, set, stage, stageGte, stageIs } from './dsl'

const ash = { k: 'landmark', kind: 'estate_ruin', pick: 'nearestTown' } as const
const gate = { k: 'offset', of: ash, dx: -20, dz: 0 } as const
const farWall = { k: 'offset', of: ash, dx: 24, dz: 9 } as const
const cellar = { k: 'offset', of: ash, dx: 4, dz: -4 } as const
const stagAt = { k: 'offset', of: ash, dx: -8, dz: 6 } as const
const has = (item: string, qty = 1) => ({ k: 'hasItem', item, qty, from: 'player' }) as const

/** Hand-over: everything the vault held goes to Irene (coin as a real transfer from the player). */
const handOver: Effect[] = [
  { k: 'give', from: 'player', to: { store: 'irene' }, item: 'ruby', qty: 2 },
  { k: 'give', from: 'player', to: { store: 'irene' }, item: 'studded_leather', qty: 1 },
  { k: 'give', from: 'player', to: { store: 'irene' }, item: 'ash_deed', qty: 1 },
  { k: 'give', from: 'player', to: { store: 'irene' }, item: 'wage_packet', qty: 1 },
  { k: 'pay', from: 'player', to: { purse: 'irene' }, amount: 180 },
]

const share = (id: string, text: string, effects: Effect[]) => opt(id, text, [...effects, set('share', id), { k: 'pay', from: { purse: 'irene' }, to: { purse: 'samuel' }, amount: 20 }])

export const Q13: QuestDef = {
  id: 'q13',
  title: 'The Ash House Vault',
  giver: 'irene',
  cast: {
    samuel: { kind: 'npc', required: false, place: 'T', profession: 'woodcutter', kin: ['head'], fallbackName: 'the carpenter', fallbackMale: true },
    silas: { kind: 'npc', required: false, place: 'T', profession: 'trader', kin: ['head'], fallbackName: 'the merchant', fallbackMale: true },
    percy: { kind: 'npc', required: false, place: 'T', profession: 'trader', kin: ['elder', 'spouse', 'child'], fallbackName: 'the scribe', fallbackMale: true },
    bart: { kind: 'npc', required: false, place: 'T', profession: 'farmer', kin: ['head'], fallbackName: 'a farmer' },
    irene: { kind: 'npc', required: true, place: 'T', kin: ['head', 'spouse'] },
    stag: { kind: 'creature', required: false, creature: { species: 'stag', variant: 'strong', at: stagAt, tag: 'ash_stag', leash: 28 } },
  },
  start: [{ k: 'visited', place: 'T' }, { k: 'anchorExists', anchor: ash }],
  flags: { choice: 'none', share: 'none', accepted: false, gravesRead: false, orchard: 'none', cellarShored: false, collapsed: false, vaultOpen: false, handedOver: false, packetRead: false, waystation: false },
  stages: [
    { id: 'house', journal: '{irene} is the last of the family that owned Ash House, a ruin in the woods near {T}. Her grandmother said the house "kept the winter money where the fire couldn\'t reach it."', anchor: { k: 'actor', slot: 'irene' } },
    { id: 'orchard', journal: 'Go out to Ash House. A stag in rut holds the old orchard: wait for dusk at the gate, go round by the garden wall, or face him.', anchor: gate },
    { id: 'cellar', journal: 'The cellar stair lies under fallen beams. Shore it first (two logs, worked on for a while at the cellar), then lever open the vault door with a pickaxe.', anchor: cellar, progress: [{ when: [flag('cellarShored')], text: 'The cellar is shored.' }] },
    { id: 'packet', journal: 'The vault is open. Take what it held to {irene} in {T}.', anchor: { k: 'actor', slot: 'irene' } },
    { id: 'choice', journal: 'Decide with {irene} what to do with Ash House, then choose your share: a ruby, the leather cuirass or 100 c.', anchor: { k: 'actor', slot: 'irene' } },
  ],
  choiceLabels: { rebuild: 'The Ash Waystation', clear_debts: 'Wages paid', sell: 'Sold to the merchant' },
  nodes: {
    ir_open: {
      lines: [
        say('irene', 'Ash House. My great-grandmother\'s. Don\'t look like that, it\'s a ruin — you\'d walk past it. (pause) My grandmother always said Hester "kept the winter money where the fire couldn\'t reach it." I thought it was a saying. Then the moneylender came round for the third time this month and I thought — what if it isn\'t?'),
        say('player', 'You want me to look.'),
        say('irene', 'I want somebody to come with me who isn\'t a moneylender or a man who\'ll fall through the floor. You look at everything else.'),
      ],
      options: [
        opt('come', 'I\'ll come.', [{ k: 'accept' }, set('accepted'), { k: 'spawn', slot: 'stag' }, stage(1), opinion('irene', 5)], { next: 'ir_come' }),
        opt('share', 'If there\'s money, what\'s my share?', [{ k: 'accept' }, set('accepted'), { k: 'spawn', slot: 'stag' }, stage(1), opinion('irene', 3)], { next: 'ir_money' }),
        opt('later', 'Not now.', [{ k: 'refuse' }], { next: 'ir_later' }),
      ],
    },
    ir_come: { lines: [say('irene', 'Thank you. The house is half a day out, in the woods; the track is overgrown, and there\'s an orchard before the gate.')], options: [] },
    ir_money: { lines: [say('irene', 'A fair one. I\'ll not haggle with someone before they\'ve walked a step. If there\'s nothing, I\'ll owe you a shirt. The house is half a day out, in the woods.')], options: [] },
    ir_later: { lines: [say('irene', 'The moneylender won\'t wait, but I suppose I\'ll have to.')], options: [] },
    pe_graves: {
      lines: [say('percy', 'The Ash graves are on the hill behind the house. The book here has the names — Hester, her brother, her daughter. And a note in the margin I\'ve never understood: "the winter hands unpaid, the stair fallen." I always assumed it meant the house was too ruined to pay anyone from. Perhaps it meant something more literal.')],
      options: [opt('ok', 'I\'ll remember that.', [set('gravesRead'), opinion('percy', 3)])],
    },
    ir_hand: {
      lines: [
        say('irene', '(reading the packet) "Winter wages, owed: Bartholomew, John, Walter. Twenty each." (pause) They never got paid. The fire, and then the stair —'),
        sayIfSamuel('Read that again. (he has stopped moving) Walter was my great-grandfather. My grandmother used to say the Ash winter was the year they ate the seed corn. Because there was no pay.'),
        say('irene', 'Twenty of it was always his family\'s. Of course it was.'),
      ],
      options: [
        opt('hand', 'Here — all of it is yours: the coins, the stones, the cuirass, the deed and the packet.', [...handOver, set('handedOver'), set('packetRead'), stage(4), opinion('irene', 15)], {
          needs: [has('ruby', 2), has('studded_leather'), has('ash_deed'), has('wage_packet')],
          reason: 'You must bring everything the vault held.',
          next: 'ir_laid',
        }),
      ],
    },
    ir_laid: {
      lines: [
        say('irene', 'Twenty to {samuel} — that\'s not a question. The rest… I could pay the moneylender with half the coins and still have the stones. Or I could keep the stones and put the house back on its feet. Or sell the lot and never think about it again.'),
      ],
      options: [],
    },
    ir_choice: {
      lines: [say('irene', 'So. What do we do with Ash House?')],
      options: [
        opt('rebuild', 'Keep the house. Let {samuel} roof the kitchen wing as a waystation.', [{ k: 'choose', flag: 'choice', value: 'rebuild' }], { next: 'ir_share_pick' }),
        opt('clear', 'Pay every debt — yours, Walter\'s, Bartholomew\'s and John\'s if their families can be found — and keep the house as it is for now.', [{ k: 'choose', flag: 'choice', value: 'clear_debts' }], { next: 'ir_share_pick' }),
        opt('sell', 'Sell to {silas}. Clear the debt and keep the stone you like best.', [{ k: 'choose', flag: 'choice', value: 'sell' }], { needs: [alive('silas')], reason: 'There is no buyer in {T} now.', next: 'ir_share_pick' }),
      ],
    },
    ir_share_pick: { lines: [say('irene', 'And your share — one ruby, the cuirass, or a hundred in coin?')], options: [] },
    ir_share: {
      lines: [say('irene', 'Your share. What will it be?')],
      options: [
        share('ruby', 'One ruby.', [{ k: 'give', from: { store: 'irene' }, to: 'player', item: 'ruby', qty: 1 }]),
        share('cuirass', 'The leather cuirass.', [{ k: 'give', from: { store: 'irene' }, to: 'player', item: 'studded_leather', qty: 1 }]),
        share('coin', 'A hundred in coin.', [{ k: 'pay', from: { purse: 'irene' }, to: 'player', amount: 100 }]),
      ],
    },
  },
  topics: [
    { slot: 'irene', node: 'ir_open', label: 'Ash House', when: [flagNot('accepted', true)] },
    { slot: 'percy', node: 'pe_graves', label: 'The Ash graves', when: [flag('accepted'), flagNot('gravesRead', true)] },
    { slot: 'irene', node: 'ir_hand', label: 'What the vault held', when: [flag('vaultOpen'), flagNot('handedOver', true)] },
    { slot: 'irene', node: 'ir_choice', label: 'What to do with Ash House', when: [flag('handedOver'), flag('choice', 'none')] },
    { slot: 'irene', node: 'ir_share', label: 'Your share', when: [flag('handedOver'), flagNot('choice', 'none'), flag('share', 'none')] },
  ],
  observations: [
    { id: 'wait', at: gate, r: 20, dwellS: 90, reset: true, when: [flag('accepted'), flag('orchard', 'none'), { k: 'hour', from: 17, to: 21 }], effects: [set('orchard', 'waited'), stage(2), message('At dusk the stag drifts off to his hinds. The orchard is clear.', 'quest')] },
    { id: 'around', at: farWall, r: 5, dwellS: 3, when: [flag('accepted'), flag('orchard', 'none')], effects: [set('orchard', 'around'), stage(2), message('The old garden wall: slow and scratchy, but the stag never saw you.', 'quest')] },
    { id: 'faced', at: stagAt, r: 6, dwellS: 2, when: [flag('accepted'), flag('orchard', 'none'), { k: 'alive', slot: 'stag' }], effects: [set('orchard', 'faced'), stage(2), message('The stag lowers his head. You are past him — barely.', 'quest')] },
    { id: 'shore', at: cellar, r: 4, dwellS: 12, when: [flag('accepted'), stageGte(2), flagNot('cellarShored', true), has('log', 2)], effects: [{ k: 'consume', from: 'player', item: 'log', qty: 2 }, set('cellarShored'), message('Two poles and wedges: the fallen beams hold. Now the vault.', 'quest')] },
    { id: 'vault', at: cellar, r: 5, dwellS: 10, when: [flag('cellarShored'), flagNot('vaultOpen', true), has('pickaxe')], effects: [set('vaultOpen'), stage(3), { k: 'mint', to: 'player', amount: 180, why: 'old coin from the Ash House vault' }, { k: 'grant', to: 'player', item: 'ruby', qty: 2, why: 'Ash House vault' }, { k: 'grant', to: 'player', item: 'studded_leather', qty: 1, why: 'Ash House vault' }, { k: 'grant', to: 'player', item: 'ash_deed', qty: 1, why: 'Ash House vault' }, { k: 'grant', to: 'player', item: 'wage_packet', qty: 1, why: 'Ash House vault' }, message('Coins. Two red stones. A reinforced leather coat. A tube. And a packet.', 'good')] },
  ],
  counters: [{ id: 'digCellar', on: 'dig', match: { near: { anchor: cellar, r: 3 } }, when: [flagNot('cellarShored', true)] }],
  rules: [
    { id: 'collapse', when: [{ k: 'counter', id: 'digCellar', gte: 1 }, flagNot('collapsed', true)], effects: [set('collapsed'), { k: 'harm', amount: 15 }, message('Dig without shoring and the stair comes down. Shore it before you dig again.', 'bad')] },
    { id: 'rebuild', when: [flag('choice', 'rebuild'), flagNot('share', 'none')], effects: [set('waystation'), { k: 'rep', delta: { helpfulness: 5 }, reason: 'The Ash Waystation', places: ['T'] }, opinion('irene', 20), opinion('samuel', 10), { k: 'end', ending: 'rebuild' }] },
    { id: 'clear', when: [flag('choice', 'clear_debts'), flagNot('share', 'none')], effects: [{ k: 'if', when: [alive('bart')], then: [{ k: 'pay', from: { purse: 'irene' }, to: { purse: 'bart' }, amount: 20 }] }, { k: 'rep', delta: { honesty: 6, renown: 4 }, reason: 'The Ash House wages were paid', places: ['T'] }, opinion('irene', 20), opinion('samuel', 10), { k: 'end', ending: 'clear_debts' }] },
    { id: 'sell', when: [flag('choice', 'sell'), flagNot('share', 'none')], effects: [{ k: 'pay', from: { purse: 'silas' }, to: { purse: 'irene' }, amount: 400 }, { k: 'pay', from: { purse: 'irene' }, to: 'player', amount: 50 }, opinion('irene', 15), opinion('silas', 5), { k: 'end', ending: 'sell' }] },
    { id: 'theft', when: [has('ruby', 2), flagNot('handedOver', true), { k: 'since', hours: 96, from: 'stage' }, stageIs(3)], effects: [{ k: 'rep', delta: { honesty: -10 }, reason: 'Kept the Ash House vault', places: ['T'] }, opinion('irene', -30), { k: 'lapse' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 240, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    { id: 'rebuild', journal: 'Ash House keeps its walls: {samuel}\'s crew will roof the kitchen wing as a waystation, and you have a bed there whenever you pass.', effects: [message('"Kitchen wing\'s roofed by spring," says {samuel}. "Irene says you get a bed here, no charge."', 'info')] },
    { id: 'clear_debts', journal: 'The wages of the winter hands were paid and the notice is in the town book. {irene} is out of debt.', effects: [message('"I paid people I\'ve never met for work done before my mother was born," says {irene}. "It felt better than paying the moneylender."', 'info')] },
    { id: 'sell', journal: '{silas} bought Ash House for 400 c. {irene} gave you 50 c on top of your share.', effects: [message('"You found it, the lady sold it, I bought it," says {silas}. "The shortest story I\'ve been part of this year."', 'info')] },
  ],
  lapse: { journal: 'Nobody went through the vault of Ash House.', effects: [] },
}

function sayIfSamuel(text: string) {
  return say('samuel', text, alive('samuel'))
}
