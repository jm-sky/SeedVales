/**
 * Q02 — The Hollow Below the Road (docs/design/quests/q02-the-hollow-below-the-road.md). Giver: Edith, the hunter of {V}.
 * A sow with five young holds a hollow beside the road between {H} and {V}. Read the tracks at first light, find the hollow
 * and count the farrow without spooking her, report to Bridget, then clear the hollow (kill her or burn the den and drive
 * her off), carry timber for a detour, or keep the watch at the bend. The sow and her den are created at acceptance.
 * @domain quests
 */
import type { QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, set, stage, stageIs } from './dsl'

const den = { k: 'roadSide', frac: 0.7, off: 18 } as const
const bend = { k: 'roadSide', frac: 0.7, off: 2 } as const
const calm = (r: number) => ({ k: 'calm', slot: 'sow', r }) as const
const choose = (value: string) => [{ k: 'choose', flag: 'choice', value } as const, stage(4)]

export const Q02: QuestDef = {
  id: 'q02',
  title: 'The Hollow Below the Road',
  giver: 'edith',
  cast: {
    edith: { kind: 'npc', required: true, place: 'V', profession: 'hunter', kin: ['head'] },
    bridget: { kind: 'npc', required: true, place: 'V', profession: 'guard', kin: ['head'] },
    jacob: { kind: 'npc', required: false, profession: 'hunter', kin: ['head'], fallbackName: 'the hunter', fallbackMale: true },
    sow: { kind: 'creature', required: true, creature: { species: 'boar', at: den, young: 5, leash: 14 } },
  },
  start: [{ k: 'visited', place: 'V' }],
  flags: { choice: 'none', accepted: false, tracksRead: false, hollowFound: false, farrowCounted: false, reported: false, spooked: false, driven: false, d1: 0, d2: 0, jacobTold: false },
  stages: [
    { id: 'road', journal: 'A sow with young has taken a hollow beside the road between {H} and {V}; a carter came away bruised. {edith} wants help finding where she lies up.', anchor: bend },
    { id: 'tracks', journal: 'Read the tracks at the bend at first light (between 4 and 9 o\'clock), standing still beside the road.', anchor: bend },
    { id: 'hollow', journal: 'Find the hollow without spooking the sow: stay beyond her reach and watch. Count the young from where you can still stand still.', anchor: den, progress: [{ when: [flag('hollowFound')], text: 'You found the hollow.' }, { when: [flag('farrowCounted')], text: 'You counted the farrow.' }] },
    { id: 'report', journal: 'Tell {bridget} at the {V} gate what you saw, then choose: clear the hollow, build a detour with timber, or keep the watch at the bend.', anchor: { k: 'actor', slot: 'bridget' } },
    { id: 'work', journal: 'Do what you chose. Clear the hollow (kill the sow, or burn the den and drive her off), bring {bridget} four logs for the detour, or take evening shifts at the bend.', anchor: bend },
  ],
  choiceLabels: { clear: 'Clear the hollow', reroute: 'Move the road, not the pigs', watch: 'The watched bend' },
  nodes: {
    ed_open: {
      lines: [
        say('edith', 'Don\'t step there. That\'s where he dropped it, and that\'s where she came out. See how the ground\'s turned?'),
        say('player', 'A boar?'),
        say('edith', 'A sow. The prints are small and there are smaller ones round them. She\'s got young somewhere close, and she\'s decided this bend is hers.'),
        say('player', 'The carter?'),
        say('edith', 'Bruised to the bone and lucky. He\'ll walk in a week. He won\'t walk this way.'),
      ],
      options: [
        opt('help', 'I\'ll help you find where she\'s lying up.', [{ k: 'accept' }, set('accepted'), { k: 'spawn', slot: 'sow' }, stage(1), opinion('edith', 5)], { next: 'ed_go' }),
        opt('why', 'Why not just close the road?', [], { next: 'ed_why' }),
        opt('later', 'Not now.', [{ k: 'refuse' }], { next: 'ed_later' }),
      ],
    },
    ed_go: { lines: [say('edith', 'Good. Quietly, and not at noon — she\'ll be lying in, and so would I. Come at first light.')], options: [] },
    ed_why: {
      lines: [say('edith', 'Then people go round by the marsh, and the marsh has drowned more carters than pigs have. {bridget} won\'t close it without a reason she can point at.')],
      options: [opt('help', 'Then I\'ll help you find her.', [{ k: 'accept' }, set('accepted'), { k: 'spawn', slot: 'sow' }, stage(1), opinion('edith', 5)], { next: 'ed_go' })],
    },
    ed_later: { lines: [say('edith', 'The sow will still be there. The carts will go round, or they won\'t.')], options: [] },
    ed_tracks: {
      lines: [
        say('edith', 'Two trails. This one\'s fresh — wet edges. That one\'s old.'),
        say('player', 'Which is safer?'),
        say('edith', 'Neither. The fresh one\'s just easier to read. As far as the ground lets us. When I put my hand up, you stop. Not after one more step.'),
      ],
      options: [],
    },
    ed_hollow: {
      lines: [
        say('edith', '(whispering) Under the roots. See the bedding? She\'s dragged half the bracken in the wood in there.'),
        say('player', 'I count five small ones.', flag('farrowCounted')),
        say('edith', 'Five. Spring farrow. In six weeks they\'ll follow her anywhere, and she\'ll stop guarding one hole.', flag('farrowCounted')),
        say('edith', 'Back! Behind the trunk — now! (after a moment) …She\'s stopped. She\'s only telling us. Walk away slowly and don\'t turn your back on her till the bend.', flag('spooked')),
        say('edith', 'Well. You\'ve seen it. Now you tell {bridget} — you saw it closer than I did. And if you just kill her, the road\'s safe tomorrow and there are five piglets that won\'t see autumn. I\'m not saying don\'t. I\'m saying count it.', flag('hollowFound')),
      ],
      options: [],
    },
    ja_hint: {
      lines: [
        say('jacob', 'You\'re going down to {edith}\'s bend? I heard about the carter. Then don\'t go down wanting a fight. A sow with young doesn\'t care how brave you are. She cares where you\'re standing.'),
        say('jacob', 'Upwind of her, never between her and the young. And pick the tree you\'d climb before you need it.'),
      ],
      options: [opt('ok', 'Thanks.', [set('jacobTold'), opinion('jacob', 3)])],
    },
    br_report: {
      lines: [
        say('bridget', '{edith} says you\'ve been to the hollow. Tell me what you saw, not what you think I want to hear.'),
        say('player', 'One sow, five young, under the fallen pine by the bend. Fresh bedding. She came at us only when we got too close.', flag('farrowCounted')),
        say('bridget', 'Good. Now I can do something.'),
      ],
      options: [opt('report', 'What are the choices?', [set('reported'), stage(3), opinion('bridget', 5)], { next: 'br_choose' })],
    },
    br_choose: {
      lines: [say('bridget', 'Kill her or drive her off — with what, and who\'s standing where when she turns? Or move the road uphill for the season: posts and our woodcutters\' week. Or watch the bend and walk people through at set hours until the young can travel — that\'s my evenings for six weeks.')],
      options: [
        opt('clear', 'Clear her out before the next market day.', choose('clear'), { needs: [flag('hollowFound')], reason: 'You have not found the hollow yet.', next: 'br_clear' }),
        opt('reroute', 'Move the road uphill for the season. I\'ll bring four logs.', choose('reroute'), { next: 'br_reroute' }),
        opt('watch', 'Stand watch at the bend and walk people through at set hours. I\'ll take evenings.', choose('watch'), { next: 'br_watch' }),
      ],
    },
    br_clear: { lines: [say('bridget', 'Give me a cold hollow — kill her, or burn the den and drive her off (five branches and a flame) — and I\'ll pay for it. I\'ll walk the bend myself tonight.')], options: [] },
    br_reroute: { lines: [say('bridget', 'Bring me the logs — four, and the woodcutters do the rest in two days. People will complain about the hill. Good. Better the hill than their legs.')], options: [] },
    br_watch: { lines: [say('bridget', 'Evenings, between dusk and ten, standing at the bend while people pass. I\'ll pay six coppers a shift for three. It closes when she moves on, or after six weeks.')], options: [] },
  },
  topics: [
    { slot: 'edith', node: 'ed_open', label: 'The bend in the road', when: [flagNot('accepted', true)] },
    { slot: 'jacob', node: 'ja_hint', label: 'The sow at the bend', when: [flag('accepted'), flagNot('jacobTold', true), alive('jacob')] },
    { slot: 'edith', node: 'ed_tracks', label: 'The tracks', when: [flag('tracksRead'), stageIs(1)] },
    { slot: 'edith', node: 'ed_hollow', label: 'The hollow', when: [flag('hollowFound')] },
    { slot: 'bridget', node: 'br_report', label: 'The sow on the road', when: [flag('hollowFound'), flagNot('reported', true)] },
    { slot: 'bridget', node: 'br_choose', label: 'What to do about the road', when: [flag('reported'), flag('choice', 'none')] },
  ],
  observations: [
    { id: 'tracks', at: bend, r: 8, dwellS: 4, when: [flag('accepted'), flagNot('tracksRead', true), { k: 'hour', from: 4, to: 9 }], effects: [set('tracksRead'), stage(1), message('Two trails: a fresh one with wet edges and an old one. A sow, and smaller prints around hers.', 'quest')] },
    { id: 'found', at: den, r: 28, dwellS: 3, when: [flag('tracksRead'), flagNot('hollowFound', true), calm(28)], effects: [set('hollowFound'), stage(2), message('Under the roots of a fallen pine: bedding, dragged in by the armful. The sow is there.', 'quest')] },
    { id: 'count', at: den, r: 24, dwellS: 8, when: [flag('hollowFound'), flagNot('farrowCounted', true), calm(24)], effects: [set('farrowCounted'), message('Five small ones, moving in the bracken.', 'quest')] },
    { id: 'spook', at: den, r: 28, dwellS: 1, when: [flag('accepted'), flagNot('spooked', true), { k: 'near', slot: 'sow', r: 28 }, { k: 'not', of: calm(28) }, { k: 'alive', slot: 'sow' }], effects: [set('spooked'), message('The sow lifts her head and charges — then stops. She is only telling you.', 'bad')] },
    { id: 'shift1', at: bend, r: 10, dwellS: 120, reset: true, when: [flag('choice', 'watch'), { k: 'hour', from: 18, to: 22 }], effects: [set('d1', 'today'), { k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 6 }, opinion('bridget', 3), message('An evening shift at the bend: six coppers from the {V} treasury.', 'good')] },
    { id: 'shift2', at: bend, r: 10, dwellS: 120, reset: true, when: [{ k: 'observed', id: 'shift1' }, { k: 'dayAfter', flag: 'd1' }, { k: 'hour', from: 18, to: 22 }], effects: [set('d2', 'today'), { k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 6 }, opinion('bridget', 3), message('A second evening shift: six coppers.', 'good')] },
    { id: 'shift3', at: bend, r: 10, dwellS: 120, reset: true, when: [{ k: 'observed', id: 'shift2' }, { k: 'dayAfter', flag: 'd2' }, { k: 'hour', from: 18, to: 22 }], effects: [{ k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 6 }, opinion('bridget', 3), message('A third evening shift: six coppers.', 'good')] },
  ],
  counters: [
    { id: 'burnt', on: 'burn', match: { den: true } },
    { id: 'logs', on: 'give', weight: 'n', match: { item: 'log', slot: 'bridget' }, when: [flag('choice', 'reroute')] },
  ],
  rules: [
    { id: 'drive', when: [{ k: 'counter', id: 'burnt', gte: 1 }, flagNot('driven', true)], effects: [{ k: 'drive', slot: 'sow', m: 260 }, set('driven'), message('The den burns. The sow bolts, the young scrambling after her.', 'quest')] },
    { id: 'clearDone', when: [flag('choice', 'clear'), flag('hollowFound'), { k: 'any', of: [{ k: 'dead', slot: 'sow' }, flag('driven')] }], effects: [{ k: 'end', ending: 'clear' }] },
    { id: 'rerouteDone', when: [flag('choice', 'reroute'), { k: 'counter', id: 'logs', gte: 4 }, { k: 'since', hours: 48, from: 'stage' }], effects: [{ k: 'end', ending: 'reroute' }] },
    { id: 'watchDone', when: [flag('choice', 'watch'), { k: 'any', of: [{ k: 'since', hours: 1008, from: 'stage' }, { k: 'far', slot: 'sow', anchor: den, r: 150 }, { k: 'dead', slot: 'sow' }] }], effects: [{ k: 'end', ending: 'watch' }] },
    { id: 'settled', when: [{ k: 'since', hours: 336, from: 'started' }, flag('reported', false)], effects: [{ k: 'end', ending: 'settled' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 96, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    {
      id: 'clear',
      journal: 'The hollow is cold. {bridget} paid 40 c from the {V} treasury.',
      effects: [
        { k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 40 },
        { k: 'rep', delta: { courage: 5, helpfulness: 5 }, reason: 'Cleared the hollow by the road', places: ['V'] },
        opinion('edith', 15), opinion('bridget', 10),
        { k: 'if', when: [{ k: 'dead', slot: 'sow' }], then: [message('"Then we\'ll dress her properly," says {edith}. "The little ones I\'ll take to the farm, if someone will have them."', 'info')], else: [message('"She\'ll find another root to lie under," says {edith}. "Further from the road, I hope."', 'info')] },
      ],
    },
    {
      id: 'reroute',
      journal: 'The detour is up. {bridget} paid 22 c from the {V} treasury and stood you a meal.',
      effects: [
        { k: 'pay', from: { treasury: 'V' }, to: 'player', amount: 22 },
        { k: 'give', from: { store: 'bridget' }, to: 'player', item: 'bread', qty: 2 },
        { k: 'rep', delta: { helpfulness: 6 }, reason: 'A detour round the sow', places: ['V'] },
        opinion('bridget', 10), opinion('edith', 5),
        message('"When the young can run, we pull the posts," says {edith}. "Or don\'t — the new bend drains better."', 'info'),
      ],
    },
    {
      id: 'watch',
      journal: 'The bend is clear. {bridget} writes "bend clear", not "safe forever".',
      effects: [{ k: 'rep', delta: { helpfulness: 4 }, reason: 'Kept the watch at the bend', places: ['V'] }, opinion('bridget', 10), opinion('edith', 5), message('"If she comes back next spring, we know what to do," says {bridget}.', 'info')],
    },
    { id: 'settled', journal: '{V} dealt with the sow itself.', effects: [opinion('bridget', 3)] },
  ],
  lapse: { journal: 'The sow stayed at the bend and the carts went round by the marsh.', effects: [] },
}
