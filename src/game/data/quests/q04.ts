/**
 * Q04 — The Handle Remembers (docs/design/quests/q04-the-handle-remembers.md). Giver: Sophie, the forge runner of {V}.
 * A cracked hammer: test it on cold iron, find the crack, then reforge it, forge a new one, or hang the old one up.
 * @domain quests
 */
import type { QuestDef } from './types'
import { flag, flagNot, message, opinion, opt, say, set, stage, stageGte, stageIs } from './dsl'

const anvil = { k: 'settlement', kind: 'anvil', place: 'V' } as const

export const Q04: QuestDef = {
  id: 'q04',
  title: 'The Handle Remembers',
  giver: 'sophie',
  cast: {
    sophie: { kind: 'npc', required: true, place: 'V', profession: 'blacksmith', kin: ['child', 'spouse', 'head'] },
    bernard: { kind: 'npc', required: true, place: 'V', profession: 'blacksmith', kin: ['elder', 'head'] },
  },
  start: [{ k: 'visited', place: 'V' }],
  flags: { worked: false, result: 'none', accepted: false, bernardTold: false, testDone: false, crackFound: false, choice: 'none', pending: 'none' },
  stages: [
    { id: 'handle', journal: '{sophie} says {bernard}\'s hammer is cracked right where his hand goes. Let {bernard} show you how he uses it, then test it on cold iron at the anvil.', anchor: { k: 'actor', slot: 'sophie' }, progress: [{ when: [flag('bernardTold')], text: 'You have heard {bernard} out.' }, { when: [flag('testDone')], text: 'You tested the hammer on cold iron.' }, { when: [flag('crackFound')], text: 'There is a hairline crack in the head.' }] },
    { id: 'choose', journal: 'Decide with {sophie}: reforge the head (coal ×4), forge a new hammer (iron ingot ×2, coal ×4), or hang the old one up.', anchor: { k: 'actor', slot: 'sophie' } },
    { id: 'work', journal: '{sophie} is at the forge. It takes half a day.', anchor: { k: 'actor', slot: 'sophie' } },
  ],
  choiceLabels: { reforge: 'The same hammer, shorter', new: 'Two hammers', keepsake: 'The old hammer on the wall' },
  nodes: {
    so_open: {
      lines: [
        say('sophie', 'Cracked along the grain. Right where his hand goes. That\'s not the place you want a crack.'),
        say('player', 'Can it be fixed?'),
        say('sophie', 'I can put a new handle on it in an afternoon. Or I can make him a new hammer, which he\'ll hate. Those aren\'t the same job.'),
      ],
      options: [
        opt('show', 'Let {bernard} show me how he uses it.', [{ k: 'accept' }, set('accepted'), opinion('sophie', 5)], { next: 'so_show' }),
        opt('new', 'Just make a new one.', [{ k: 'refuse' }], { next: 'so_new' }),
      ],
    },
    so_show: { lines: [say('sophie', 'Yes. Please. He\'ll be insulted, and then he\'ll show you everything.')], options: [] },
    so_new: { lines: [say('sophie', 'You tell him. I\'ve tried three times.')], options: [] },
    be_story: {
      lines: [
        say('bernard', 'I had this hammer before she could lift the bellows.'),
        say('player', 'Then you know its balance better than anyone.'),
        say('bernard', 'I know *my* balance. The hammer\'s changed less than my knees have. Edges, thin work — it does those best. (long pause) The last few shares I did came out — not bad. Not like they used to. I put it down to the iron.'),
      ],
      options: [opt('ok', 'Let\'s test it on cold iron.', [set('bernardTold')])],
    },
    so_test: {
      lines: [say('sophie', 'One test. Cold iron. No showing off. Heat hides a bad hammer; cold shows you where the blow goes.'), say('bernard', 'It goes into my wrist.'), say('sophie', 'Exactly.')],
      options: [opt('strike', 'Hold the bar. I\'ll strike.', [set('testDone'), message('The blow lands true, but the hammer shivers on the way back up.')])],
    },
    so_crack: {
      lines: [say('sophie', '(takes the hammer, turns it to the light) …There. There it is. Father, that\'s been in there months.'), say('bernard', '(quietly) The shares.')],
      options: [opt('ok', 'It\'s in the head, not the handle.', [stage(1)])],
    },
    so_choose: {
      lines: [say('sophie', 'Three ways. Reforge the head: I draw it out again, it comes out shorter, maybe a little lighter. A new hammer from new iron. Or hang this one up and he uses mine until he wants his own.')],
      options: [
        opt('reforge', 'Reforge the head. Keep the old handle on the wall.', [{ k: 'consume', from: 'player', item: 'coal', qty: 4 }, set('pending', 'reforge'), { k: 'choose', flag: 'choice', value: 'reforge' }, stage(2)], { needs: [flag('crackFound'), { k: 'hasItem', item: 'coal', qty: 4, from: 'player' }], reason: 'Reforging needs the crack found and coal ×4.', next: 'so_reforge' }),
        opt('new', 'A new hammer. The old one stays as it is.', [{ k: 'consume', from: 'player', item: 'coal', qty: 4 }, { k: 'consume', from: 'player', item: 'iron_ingot', qty: 2 }, set('pending', 'new'), { k: 'choose', flag: 'choice', value: 'new' }, stage(2)], { needs: [{ k: 'hasItem', item: 'coal', qty: 4, from: 'player' }, { k: 'hasItem', item: 'iron_ingot', qty: 2, from: 'player' }], reason: 'A new hammer needs iron ingot ×2 and coal ×4.', next: 'so_new_hammer' }),
        opt('keepsake', 'Hang it up. He uses yours until he wants his own.', [{ k: 'choose', flag: 'choice', value: 'keepsake' }, { k: 'end', ending: 'keepsake' }], { next: 'so_keepsake' }),
      ],
    },
    so_reforge: { lines: [say('sophie', 'That\'s keeping it and losing it at once. Come back in half a day.')], options: [] },
    so_new_hammer: { lines: [say('sophie', 'You brought the iron, so I\'ll do the work for nothing. Half a day.')], options: [] },
    so_keepsake: { lines: [say('sophie', 'Then I\'ll make you a light one when you ask. Not before.')], options: [] },
    so_done: {
      lines: [say('sophie', 'Done. (she puts it in your hand)', flag('pending', 'new')), say('bernard', '(second strike) …It feels honest. The old handle goes on the wall, over the door.', flag('pending', 'reforge'))],
      options: [opt('take', 'Good work.', [{ k: 'end', ending: 'forged' }])],
    },
  },
  topics: [
    { slot: 'sophie', node: 'so_open', label: 'The cracked hammer', when: [flagNot('accepted', true)] },
    { slot: 'bernard', node: 'be_story', label: 'The old hammer', when: [flag('accepted'), flagNot('bernardTold', true)] },
    { slot: 'sophie', node: 'so_test', label: 'The cold-iron test', when: [flag('bernardTold'), flagNot('testDone', true)] },
    { slot: 'sophie', node: 'so_crack', label: 'The head of the hammer', when: [flag('crackFound'), stageIs(0)] },
    { slot: 'sophie', node: 'so_choose', label: 'What next', when: [stageIs(1)] },
    { slot: 'sophie', node: 'so_done', label: 'The finished work', when: [stageGte(2), flag('worked')] },
  ],
  observations: [
    { id: 'look', at: anvil, r: 4, dwellS: 5, when: [flag('testDone'), flagNot('crackFound', true)], effects: [set('crackFound'), message('Under the poll of the head: a hairline crack, dark with old oil.')] },
  ],
  counters: [],
  rules: [
    { id: 'worked', when: [stageIs(2), flag('worked', false), { k: 'since', hours: 12, from: 'stage' }], effects: [set('worked'), message('{sophie} has finished the work at the forge.', 'info')] },
    { id: 'stalled', when: [{ k: 'since', hours: 336, from: 'started' }], effects: [{ k: 'end', ending: 'stalled' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 96, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    {
      id: 'forged',
      journal: 'The work is done. {sophie} put the new edge on your tool as thanks, and {bernard}\'s fine work comes back.',
      effects: [
        { k: 'if', when: [flag('pending', 'new')], then: [{ k: 'grant', to: 'player', item: 'hammer', qty: 1, why: 'forged-by-sophie' }, { k: 'pay', from: { purse: 'sophie' }, to: 'player', amount: 8 }], else: [{ k: 'repairHeld' }] },
        { k: 'rep', delta: { helpfulness: 6 }, reason: 'You saved the old hammer\'s work', places: ['V'] },
        opinion('sophie', 15), opinion('bernard', 10),
      ],
    },
    { id: 'keepsake', journal: 'The old hammer hangs on the wall. {sophie} gave you a meal and the family\'s thanks.', effects: [{ k: 'give', from: { store: 'sophie' }, to: 'player', item: 'bread', qty: 1 }, opinion('sophie', 15), opinion('bernard', 15)] },
    { id: 'stalled', journal: 'The hammer stayed cracked; {sophie} fitted a new handle on it and nothing changed.', effects: [opinion('sophie', -3)] },
  ],
  lapse: { journal: '{sophie} fitted a new handle on the cracked head.', effects: [] },
}
