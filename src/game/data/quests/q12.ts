/**
 * Q12 — The Iron Under the Pine (docs/design/quests/codex-quest-12-iron-under-the-pine.md). Giver: Duncan, an old road guard of {T}.
 * Forty years ago he sealed his captain's sword in the stone locker under the Pinewatch tower. A bear dens in front of it.
 * Slip past by rope, drive her out with fire, or fight; bring the sword, the badge and the cache down; then choose: the
 * north patrol keeps it (an armoury item and 40 c), sell it (four ordinary swords), or carry it after a week on the north
 * patrol. The sword is unique: it exists once and ends in exactly one place per ending.
 * @domain quests
 */
import type { QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, set, stage, stageGte } from './dsl'

const tower = { k: 'landmark', kind: 'watch_tower_ruin', pick: 'nearestTown' } as const
const door = { k: 'offset', of: tower, dx: -6, dz: 7 } as const
const locker = { k: 'offset', of: tower, dx: 3, dz: -3 } as const
const splitPine = { k: 'offset', of: tower, dx: -40, dz: 20 } as const
const has = (item: string, qty = 1) => ({ k: 'hasItem', item, qty, from: 'player' }) as const
const handled = flagNot('bear', 'none')
const onDuty = [{ k: 'near', slot: 'willa', r: 40 }, { k: 'hour', from: 8, to: 18 }] as const

/** Patrol days: five distinct days within 40 m of Willa while she is on duty (the daily chain of flags). */
const patrolRules = [1, 2, 3, 4, 5].map((n) => ({
  id: `patrol${n}`,
  when: [flag('choice', 'carry'), flag('plan', 'patrol'), ...(n === 1 ? [] : [flagNot(`p${n - 1}`, 0), { k: 'dayAfter', flag: `p${n - 1}` } as const]), flag(`p${n}`, 0), ...onDuty],
  effects: [set(`p${n}`, 'today'), message(`North patrol, day ${n} of 5.`, 'quest')],
})) as unknown as QuestDef['rules']

export const Q12: QuestDef = {
  id: 'q12',
  title: 'The Iron Under the Pine',
  giver: 'duncan',
  cast: {
    duncan: { kind: 'npc', required: true, place: 'T', profession: 'guard', kin: ['elder', 'head'] },
    willa: { kind: 'npc', required: true, place: 'T', profession: 'guard', kin: ['head', 'spouse', 'child'] },
    mabel: { kind: 'npc', required: false, place: 'T', profession: 'hunter', kin: ['head', 'child'], fallbackName: 'the guide' },
    percy: { kind: 'npc', required: false, place: 'T', profession: 'trader', kin: ['elder', 'spouse', 'child'], fallbackName: 'the scribe', fallbackMale: true },
    silas: { kind: 'npc', required: false, place: 'T', profession: 'trader', kin: ['head'], fallbackName: 'the merchant', fallbackMale: true },
    bear: { kind: 'creature', required: false, creature: { species: 'bear', variant: 'strong', at: door, tag: 'pinewatch_bear', leash: 14 } },
  },
  start: [{ k: 'visited', place: 'T' }, { k: 'anchorExists', anchor: tower }],
  flags: { choice: 'none', plan: 'none', accepted: false, registerFound: false, routeFound: false, towerReached: false, bear: 'none', swordOut: false, handedOver: false, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, armoury: false },
  stages: [
    { id: 'map', journal: '{duncan}, an old road guard, wants his captain\'s sword brought out of the stone locker under the Pinewatch tower in the mountains beyond {T}, forty years after the avalanche.', anchor: { k: 'actor', slot: 'duncan' } },
    { id: 'road', journal: 'Climb to Pinewatch: past the second ridge, the pine with the split top (iron spikes in the trunk), then the old road keeping left of the drop. {mabel} knows the mountain.', anchor: splitPine, progress: [{ when: [flag('registerFound')], text: '{percy} found the old register entry.' }, { when: [flag('routeFound')], text: 'You found the pine with the spikes.' }] },
    { id: 'tower', journal: 'The tower has fallen in, and a bear sleeps in the outer cellar. Slip past by rope from the broken floor, drive her out with fire, or fight her; then lever up the locker slab.', anchor: tower },
    { id: 'down', journal: 'You have the sword, the badge and the guard\'s cache. Bring them to {duncan} in {T}.', anchor: { k: 'actor', slot: 'duncan' } },
    { id: 'who', journal: 'Decide who carries the sword: the north patrol, a buyer for four ordinary swords, or you.', anchor: { k: 'actor', slot: 'willa' } },
  ],
  choiceLabels: { guard: 'Iron on the north road', sale: 'Four swords', carry: 'Carried' },
  nodes: {
    du_open: {
      lines: [
        say('duncan', 'You\'re the one who goes places. Sit. No, sit, I talk better when people sit. (pause) Pinewatch. Up past the second ridge. There was a tower there, and a road, before the snow took them. And there\'s a sword in the tower that should\'ve come down forty years ago.'),
        say('player', 'Whose sword?'),
        say('duncan', 'Martin\'s. My captain. He dug me out. Took him an hour and he got me out and then the second slide came. I put his sword away myself. Thought somebody\'d go back for it in spring. Nobody did. I didn\'t. I\'d like to see it once more. Then the guard can have it, or you can — I don\'t care which. Just not the dark.'),
      ],
      options: [
        opt('go', 'I\'ll go.', [{ k: 'accept' }, set('accepted'), { k: 'spawn', slot: 'bear' }, stage(1), opinion('duncan', 5)], { next: 'du_go' }),
        opt('way', 'What\'s the way?', [{ k: 'accept' }, set('accepted'), { k: 'spawn', slot: 'bear' }, stage(1), opinion('duncan', 3)], { next: 'du_way' }),
        opt('later', 'Not now.', [{ k: 'refuse' }], { next: 'du_later' }),
      ],
    },
    du_go: { lines: [say('duncan', 'Take {mabel}. She\'s the only one who\'s been past the second ridge this year.')], options: [] },
    du_way: { lines: [say('duncan', 'Past the pine with the split top. Then the road — what\'s left of it — keeps to the left of the drop. If it\'s the right pine. It might be a different pine. It\'s been forty years.')], options: [] },
    du_later: { lines: [say('duncan', 'I\'ll be here. Probably.')], options: [] },
    pe_register: {
      lines: [say('percy', 'Pinewatch… here. "One longsword, city work, for Capt. Martin, paid from the road account." And a later hand, shaky: "Sword and spare gear secured in the tower locker. D." That\'s Duncan\'s "D". He was nineteen. It makes it the road account\'s, which is the guard\'s now. But {willa}\'s not one to snatch a sword off the person who carried it down a mountain. Ask her.')],
      options: [opt('ok', 'Thank you.', [set('registerFound'), opinion('percy', 3)])],
    },
    wi_info: {
      lines: [say('willa', 'Duncan\'s sword? He\'s told me that story six times. (pause) I believed it four. If it\'s real, my north patrol could use a blade like that. Take {mabel}. She\'s the only one who\'s been past the second ridge this year.')],
      options: [],
    },
    mb_go: {
      lines: [say('mabel', 'Rope, lamp, food for three days, something warm for the nights. Snow\'s already on the tops. There are four split pines up there. We\'ll find the road first and the pine after.')],
      options: [opt('come', 'Come with me, as far as the tower.', [{ k: 'companion', slot: 'mabel', mode: 'free', days: 0, task: 'escort' }, opinion('mabel', 3)], { needs: [{ k: 'canTravel', slot: 'mabel' }], reason: '{mabel} cannot come now.' })],
    },
    du_hand: {
      lines: [
        say('duncan', '(silence; then he unwraps the badge first, not the sword) …His badge. I forgot I put that in. (holds it a long time) I\'ll keep this. If nobody minds.'),
        say('duncan', '(he draws the sword a little, puts it back) Well. There it is. It\'s been in the dark long enough.'),
      ],
      options: [
        opt('give', 'Here: the badge for you, the shield and spearheads for the guard.', [
          { k: 'give', from: 'player', to: { store: 'duncan' }, item: 'company_badge', qty: 1 },
          { k: 'give', from: 'player', to: { store: 'willa' }, item: 'guard_shield', qty: 1 },
          { k: 'give', from: 'player', to: { store: 'willa' }, item: 'spearhead', qty: 3 },
          set('handedOver'), stage(4), opinion('duncan', 15),
        ], { needs: [has('pinewatch_longsword'), has('company_badge'), has('guard_shield'), has('spearhead', 3)], reason: 'You must bring everything from the locker.', next: 'du_who' }),
      ],
    },
    du_who: { lines: [say('willa', 'The register says it\'s the guard\'s. The old man says he doesn\'t care. And you carried it down. So — tell me what you think should happen.')], options: [] },
    wi_choice: {
      lines: [say('willa', 'Well? What should happen to the sword?')],
      options: [
        opt('guard', 'Give it to your north patrol. That\'s what it was for.', [{ k: 'choose', flag: 'choice', value: 'guard' }, { k: 'give', from: 'player', to: { store: 'willa' }, item: 'pinewatch_longsword', qty: 1 }], { next: 'wi_pick' }),
        opt('sale', 'Sell it. Buy your patrol ordinary swords and armour with the money.', [
          { k: 'choose', flag: 'choice', value: 'sale' },
          { k: 'give', from: 'player', to: { purse: 'silas' }, item: 'pinewatch_longsword', qty: 1 },
          { k: 'pay', from: { purse: 'silas' }, to: { treasury: 'T' }, amount: 500 },
          { k: 'consume', from: { purse: 'silas' }, item: 'pinewatch_longsword', qty: 1 },
          { k: 'pay', from: { treasury: 'T' }, to: 'player', amount: 125 },
          { k: 'end', ending: 'sale' },
        ], { needs: [alive('silas')], reason: 'There is no buyer at hand.' }),
        opt('carry', 'Let me carry it.', [{ k: 'choose', flag: 'choice', value: 'carry' }, set('plan', 'patrol')], { needs: [{ k: 'opinion', slot: 'duncan', gte: 30 }], reason: '{duncan} must trust you more first.', next: 'wi_patrol' }),
      ],
    },
    wi_pick: {
      lines: [say('willa', 'It\'ll be on the north road by the end of the week. Take something from the armoury in return — I mean it. The mail shirt, or the crossbow. Your pick.')],
      options: [
        opt('mail', 'The mail shirt.', [{ k: 'give', from: { warehouse: 'T' }, to: 'player', item: 'chainmail', qty: 1 }, { k: 'pay', from: { treasury: 'T' }, to: 'player', amount: 40 }, { k: 'end', ending: 'guard' }]),
        opt('crossbow', 'The crossbow.', [{ k: 'give', from: { warehouse: 'T' }, to: 'player', item: 'crossbow', qty: 1 }, { k: 'pay', from: { treasury: 'T' }, to: 'player', amount: 40 }, { k: 'end', ending: 'guard' }]),
      ],
    },
    wi_patrol: { lines: [say('duncan', 'Let them. It was made to be carried on a road, not hung on a wall or sold to a man who\'ll hang it on a wall.'), say('willa', '…Then do something for the road with it. Walk my north patrol with us one week this winter — five days, between eight and six. After that it\'s yours, and I won\'t ask for it back.')], options: [] },
  },
  topics: [
    { slot: 'duncan', node: 'du_open', label: 'The tower at Pinewatch', when: [flagNot('accepted', true)] },
    { slot: 'percy', node: 'pe_register', label: 'The old guard register', when: [flag('accepted'), flagNot('registerFound', true)] },
    { slot: 'willa', node: 'wi_info', label: 'Duncan\'s sword', when: [flag('accepted'), stageGte(1), flag('handedOver', false)] },
    { slot: 'mabel', node: 'mb_go', label: 'The road to Pinewatch', when: [flag('accepted'), flag('handedOver', false), { k: 'companion', slot: 'mabel', active: false }] },
    { slot: 'duncan', node: 'du_hand', label: 'What was in the locker', when: [flag('swordOut'), flagNot('handedOver', true)] },
    { slot: 'willa', node: 'wi_choice', label: 'Who carries the sword', when: [flag('handedOver'), flag('choice', 'none')] },
    { slot: 'willa', node: 'wi_pick', label: 'A piece from the armoury', when: [flag('choice', 'guard')] },
  ],
  observations: [
    { id: 'pine', at: splitPine, r: 8, dwellS: 4, when: [flag('accepted'), flagNot('routeFound', true)], effects: [set('routeFound'), message('Old iron spikes, driven in at shoulder height: guard-road markers. This is the right pine.', 'quest')] },
    { id: 'tower', at: tower, r: 15, dwellS: 3, when: [flag('accepted'), flagNot('towerReached', true)], effects: [set('towerReached'), stage(2), message('The tower has fallen inward; the cellar roof still holds. Musk, fresh scratches on the doorframe, a trampled bed of bracken in the outer cellar.', 'quest')] },
    { id: 'slip', at: tower, r: 5, dwellS: 10, when: [flag('towerReached'), flag('bear', 'none'), { k: 'sneaking' }, has('rope'), { k: 'calm', slot: 'bear', r: 15 }], effects: [set('bear', 'slipped_past'), message('Rope round the broken floor-beam, down behind the partition, and she never lifts her head.', 'quest')] },
    { id: 'drive', at: door, r: 12, dwellS: 15, when: [flag('towerReached'), flag('bear', 'none'), { k: 'litTorch' }], effects: [set('bear', 'driven'), { k: 'scare', slot: 'bear', minutes: 120 }, message('Fire and noise at the outer door. She leaves toward the ravine — and may come back.', 'quest')] },
    { id: 'locker', at: locker, r: 4, dwellS: 15, when: [flag('towerReached'), handled, flagNot('swordOut', true), has('rope'), { k: 'any', of: [{ k: 'near', slot: 'mabel', r: 15 }, { k: 'skill', skill: 'melee', gte: 30 }] }], effects: [set('swordOut'), stage(3), { k: 'grant', to: 'player', item: 'pinewatch_longsword', qty: 1, why: 'Captain Martin\'s sword from the Pinewatch locker' }, { k: 'grant', to: 'player', item: 'company_badge', qty: 1, why: 'Pinewatch locker' }, { k: 'grant', to: 'player', item: 'guard_shield', qty: 1, why: 'Pinewatch locker' }, { k: 'grant', to: 'player', item: 'spearhead', qty: 3, why: 'Pinewatch locker' }, message('Wrapped in oiled cloth: a sword in a dark scabbard, a small brass badge with a pine, a shield and three spearheads. Not a rust spot. Forty years.', 'good')] },
  ],
  counters: [],
  rules: [
    { id: 'killed', when: [flag('accepted'), flag('bear', 'none'), { k: 'dead', slot: 'bear' }], effects: [set('bear', 'killed')] },
    { id: 'armoury', when: [flag('accepted'), flag('armoury', false)], effects: [set('armoury'), { k: 'grant', to: { warehouse: 'T' }, item: 'chainmail', qty: 1, why: 'guard armoury stock, declared at the quest start' }, { k: 'grant', to: { warehouse: 'T' }, item: 'crossbow', qty: 1, why: 'guard armoury stock, declared at the quest start' }] },
    ...patrolRules,
    { id: 'carried', when: [flag('choice', 'carry'), flagNot('p5', 0)], effects: [{ k: 'end', ending: 'carry' }] },
    { id: 'theft', when: [has('pinewatch_longsword'), flagNot('handedOver', true), { k: 'since', hours: 120, from: 'stage' }, flag('swordOut')], effects: [{ k: 'rep', delta: { honesty: -10 }, reason: 'Kept the road-guard sword', places: ['T'] }, opinion('duncan', -30), { k: 'lapse' }] },
    { id: 'dropped', when: [{ k: 'since', hours: 720, from: 'started' }, flag('swordOut', false)], effects: [{ k: 'end', ending: 'dropped' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 336, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    { id: 'guard', journal: 'The Pinewatch sword is the north patrol\'s. {willa} gave you an armoury piece and {T} paid 40 c.', effects: [{ k: 'rep', delta: { helpfulness: 8, courage: 3 }, reason: 'Iron on the north road', places: ['T'] }, opinion('willa', 20), opinion('duncan', 10), message('"Three wolves on the north road last week," says {willa}. "The patrol came home. All of them."', 'info')] },
    { id: 'sale', journal: '{silas} paid 500 c for the sword; {willa} gave you a quarter.', effects: [{ k: 'rep', delta: { helpfulness: 4 }, reason: 'The Pinewatch sword was sold for the guard', places: ['T'] }, opinion('willa', 10), opinion('duncan', -5), message('"Martin would\'ve said four swords," says {duncan}. "He was practical."', 'info')] },
    { id: 'carry', journal: 'You walked the north patrol for five days and keep the Pinewatch Longsword.', effects: [{ k: 'rep', delta: { renown: 6, courage: 4 }, reason: 'Walked the north patrol', places: ['T'] }, opinion('willa', 15), opinion('duncan', 20), message('"Good," says {duncan}, seeing it on your belt. "That\'s where it goes."', 'info')] },
    { id: 'dropped', journal: 'The sword is still in the dark.', effects: [] },
  ],
  lapse: { journal: 'Nobody brought the sword down from Pinewatch.', effects: [] },
}
