/**
 * Q07 — Six Bowls, One Pan (docs/design/quests/q07-six-bowls-one-pan.md). Giver: Lucy (woodcutter's wife).
 * Dialog lines are the design doc's; deviations are listed in the doc's "Implementation notes".
 * @domain quests
 */
import type { Effect, QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, sayIf, set, stage, stageGte } from './dsl'

const guests = ['lucy', 'miles', 'joan', 'matthew', 'mark', 'luke'] as const
const meat = { k: 'hasItem', item: 'cooked_meat', qty: 4, from: 'player' } as const
const meal = (ending: string, social: number, extra: Effect[]): Effect[] => [
  { k: 'choose', flag: 'guests', value: ending },
  { k: 'consume', from: 'player', item: 'cooked_meat', qty: 4 },
  { k: 'need', slots: [...guests], social },
  ...extra,
  { k: 'end', ending },
]

/** Scene S8 — shared by all three meals. */
const supper = [
  say('lucy', 'No speeches.'),
  sayIf('matthew', 'I\'d got one ready.'),
  say('lucy', 'Eat it instead.', alive('matthew')),
  sayIf('mark', 'The sauce is better than the gatehouse.'),
  say('miles', 'The gatehouse isn\'t edible.', alive('mark')),
  sayIf('mark', 'You\'ve never been that hungry.'),
]

export const Q07: QuestDef = {
  id: 'q07',
  title: 'Six Bowls, One Pan',
  giver: 'lucy',
  cast: {
    lucy: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['spouse'] },
    miles: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['head'] },
    joan: { kind: 'npc', required: false, profession: 'woodcutter', kin: ['elder'], fallbackName: 'the old woman' },
    matthew: { kind: 'npc', required: false, profession: 'woodcutter', kin: ['son', 'child'], fallbackName: 'the boy', fallbackMale: true },
    mark: { kind: 'npc', required: true, profession: 'guard', kin: ['head'] },
    luke: { kind: 'npc', required: false, profession: 'shepherd', kin: ['son', 'child'], fallbackName: 'a young man', fallbackMale: true },
  },
  start: [{ k: 'any', of: [{ k: 'quest', id: 'q03', in: ['done'], started: true }, { k: 'opinion', slot: 'lucy', gte: 10 }] }],
  flags: { accepted: false, freshnessChecked: false, roundAccepted: false, markCovered: false, cooked: false, guests: 'unset', markTorches: false, torchDay: 0, roundDay: 0 },
  stages: [
    { id: 'rumour', journal: '{lucy} wants one proper meal for the whole house after a week of felling. Talk to {lucy:him}.', anchor: { k: 'actor', slot: 'lucy' } },
    { id: 'prepare', journal: 'Get the meal ready: look at the meat in {lucy}\'s food chest, roast at least 4 pieces at a campfire (a pan roasts 2 at a time), and, if you want {mark} at the table, walk {mark:his} dusk round (after 16:00, {mark:he} waits by the fire while you do): visit every torch post in the settlement and light the ones that are dark. Then tell {lucy}.', anchor: { k: 'actor', slot: 'lucy' },
      progress: [
        { when: [flag('freshnessChecked')], text: 'Done: you looked at the meat in {lucy}\'s food chest.' },
        { when: [flagNot('freshnessChecked', true)], text: 'Still to do: look at the meat in {lucy}\'s food chest (talk to {lucy:him}).' },
        { when: [{ k: 'counter', id: 'pieces', gte: 4 }], text: 'Done: you have roasted enough meat.' },
        { when: [{ k: 'not', of: { k: 'counter', id: 'pieces', gte: 4 } }], text: 'Still to do: roast 4 pieces of meat.' },
        { when: [flag('markCovered')], text: 'Done: every torch post is lit and {mark} is free to come to the table.' },
        { when: [flag('roundAccepted'), flagNot('markCovered', true)], text: 'Still to do: light the torch posts on {mark:his} round (after 16:00).' },
        { when: [flagNot('roundAccepted', true)], text: 'Optional: ask {mark} about the dusk round.' },
      ] },
    { id: 'table', journal: 'The meat is roasted. Tell {lucy} how the meal should be served: one table, two sittings, or on the doorstep.', anchor: { k: 'actor', slot: 'lucy' } },
  ],
  choiceLabels: { together: 'One table, everyone together', shifts: 'Two sittings', doorstep: 'On the doorstep' },
  nodes: {
    // S1 — Lucy at the food chest.
    l_open: {
      lines: [
        say('lucy', 'Six bowls and one pan. That\'s enough if nobody expects the pan to do miracles.'),
        say('player', 'Who\'s coming?'),
        say('lucy', '{miles}, {joan}, {matthew}, you, me — and {mark}, if {mark:his} rounds let {mark:him}. {mark:He} split our kindling all last week when {miles} was laid up. I owe {mark:him} a hot meal.'),
        sayIf('matthew', 'I asked {luke}, too.'),
        say('lucy', '(turns slowly) You asked.', alive('matthew')),
        sayIf('matthew', '{luke:He}\'s bringing a hare.'),
        say('lucy', '…Then {luke:he}\'s welcome. And you\'re washing seven bowls.', alive('matthew')),
      ],
      options: [opt('accept', 'I\'ll help with the supper.', [{ k: 'accept' }, set('accepted'), stage(1)], { next: 'l_accepted' })],
    },
    l_accepted: { lines: [say('lucy', 'Good. Start with the food chest — I want to know what we have before I count the bowls.')], options: [] },
    // S2 — the stores.
    l_stores: {
      lines: [say('self', '{lucy} lifts the lid of the food chest. Meat of several ages lies inside.')],
      options: [opt('examine_meat', 'Look at the meat.', [set('freshnessChecked'), { k: 'give', from: { store: 'lucy' }, to: 'player', item: 'raw_meat', qty: 2 }], { next: 'l_stores_b' })],
    },
    l_stores_b: {
      lines: [
        say('player', 'This piece won\'t last till tomorrow. That one\'s fine for days.'),
        say('lucy', 'Then the old one goes in first, and nobody hides it under the onions.'),
        sayIf('joan', 'In my mother\'s house we\'d have salted it and pretended.'),
        say('lucy', 'Your mother\'s house had stronger stomachs.', alive('joan')),
        say('player', 'One pan, two pieces at a time.'),
        say('lucy', 'Then we count pieces, then people, then how long the fire lasts. In that order.'),
      ],
      options: [],
    },
    // S6 — cooking.
    l_prep: {
      lines: [
        say('lucy', 'Cooked on the board, raw in the bowl — don\'t let them touch.'),
        sayIf('joan', 'I\'m amazed anyone needs telling that.'),
        say('lucy', 'You\'d be amazed what {miles} needs telling.', alive('joan')),
        sayIf('luke', 'I skinned the hare myself. Only one edge needed a second cut.'),
        say('lucy', 'Then you\'ll eat a piece of it yourself first, in case.', alive('luke')),
        say('self', 'You need 4 pieces of roast meat: roast raw meat at a lit campfire (a pan roasts two at a time, a bare fire one).'),
      ],
      options: [],
    },
    // S7 — the choice.
    l_meal: {
      lines: [say('self', 'The meat is ready. How shall the meal be served?')],
      options: [
        opt('together', 'Everyone at one table. I\'ve walked {mark}\'s round.', [{ k: 'choose', flag: 'guests', value: 'together' }], { needs: [flag('markCovered')], reason: '{mark} is still on duty: walk {mark:his} dusk round first.', next: 'l_together' }),
        opt('shifts', 'Two sittings. The first lot eats, the second takes over the fire and the gate.', [{ k: 'choose', flag: 'guests', value: 'shifts' }], { needs: [{ k: 'counter', id: 'batches', gte: 2 }], reason: 'Roast the meat in two batches first.', next: 'l_shifts' }),
        opt('doorstep', 'We eat on the doorstep, so {mark} and {miles} can come and go.', [{ k: 'choose', flag: 'guests', value: 'doorstep' }], { next: 'l_doorstep' }),
      ],
    },
    l_together: {
      lines: [sayIf('mark', 'I\'ll take the end seat. I can see the path from there. Habit.')],
      options: [
        opt('serve_together', 'Serve the meal.', meal('together', 40, [opinion('lucy', 10), opinion('miles', 10), opinion('mark', 10), opinion('joan', 5), opinion('matthew', 5), set('markTorches'), { k: 'rep', delta: { helpfulness: 3 }, reason: 'You fed a household and the guard' }]), { needs: [meat], reason: 'You need 4 pieces of roast meat.', next: 'l_end_together' }),
        opt('rethink', 'Let me think again.', [], { next: 'l_meal' }),
      ],
    },
    l_shifts: {
      lines: [say('miles', 'I could eat sitting down for once. I\'d like that.')],
      options: [
        opt('serve_shifts', 'Serve the meal.', meal('shifts', 25, [opinion('lucy', 5), opinion('miles', 5), opinion('mark', 5)]), { needs: [meat], reason: 'You need 4 pieces of roast meat.', next: 'l_end_shifts' }),
        opt('rethink', 'Let me think again.', [], { next: 'l_meal' }),
      ],
    },
    l_doorstep: {
      lines: [sayIf('joan', 'Less cosy. More honest. I\'ll have the bench by the wall.')],
      options: [
        opt('serve_doorstep', 'Serve the meal.', meal('doorstep', 20, [opinion('lucy', 3), opinion('miles', 3), { k: 'rep', delta: { helpfulness: 2 }, reason: 'You fed the street' }]), { needs: [meat], reason: 'You need 4 pieces of roast meat.', next: 'l_end_doorstep' }),
        opt('rethink', 'Let me think again.', [], { next: 'l_meal' }),
      ],
    },
    // S8 — the meal, and the epilogues.
    l_end_together: { lines: [...supper, sayIf('joan', 'Seven at one table. The last time was {miles}\'s wedding, and half of them were drunk.')], options: [] },
    l_end_shifts: { lines: [...supper, say('miles', 'I ate it sitting down. Warm. Don\'t tell anyone, they\'ll expect it.')], options: [] },
    l_end_doorstep: { lines: [...supper, sayIf('joan', 'We fed half the street and nobody had to pretend the house was bigger than it is. That\'ll do.')], options: [] },
    // S3 — Mark at the gate.
    m_gate: {
      lines: [
        say('mark', 'A meal? {lucy}\'s? (sighs) I\'ve the dusk round and the night round, and nobody to take either.'),
        say('player', 'How long could you sit down?'),
        say('mark', 'Long enough to burn my tongue.'),
      ],
      options: [
        opt('round', 'I\'ll walk the dusk round for you. You eat with everyone.', [set('roundAccepted'), set('roundDay', 'today')], { next: 'm_gate_a' }),
        opt('eat_first', 'Eat first, go after. We\'ll keep a bowl hot for later.', [], { next: 'm_gate_b' }),
        opt('by_door', 'We\'ll eat by the door, so you can come and go.', [], { next: 'm_gate_c' }),
      ],
    },
    m_gate_a: { lines: [say('mark', 'You\'d do the gate and the posts? All six of them, and light the two by the pens? …Then I\'ll come. Bring the torch back lit.')], options: [] },
    m_gate_b: { lines: [say('mark', 'That I can manage.')], options: [] },
    m_gate_c: { lines: [say('mark', 'On the step? I\'ve eaten in worse places. The gatehouse, for one.')], options: [] },
    m_wait: {
      lines: [say('self', '{mark} waits by the fire from 16:00 to midnight while you walk {mark:his} round: stand by every torch post in {H} and light the ones that are dark (a torch post can be lit with flint and steel). Posts that are already burning count when you pass them.')],
      options: [opt('round_again', 'I\'ll walk your round tonight.', [set('roundDay', 'today')], { when: [flagNot('roundDay', 'today')] })],
    },
    m_torches: {
      lines: [say('mark', 'The rack by the gate is yours when you need a torch. One a day, mind.')],
      options: [opt('take_torch', 'Take a torch.', [{ k: 'give', from: { store: 'mark' }, to: 'player', item: 'torch', qty: 1 }, set('torchDay', 'today')], { when: [flagNot('torchDay', 'today')] })],
    },
    // S4 / S5 — Miles at the pitch kettle, Joan in the corner.
    mi_pitch: {
      lines: [
        say('miles', 'I can\'t leave the pitch. If it boils over, the roof\'s done for another month.'),
        say('lucy', 'Then you\'ll eat standing up, like a horse.'),
        say('player', 'I can watch the pan while you two sort the pitch.'),
        say('lucy', 'You can. If you burn it, it\'s your bowl that gets the burnt bit.'),
      ],
      options: [],
    },
    j_corner: {
      lines: [
        say('joan', 'Seven people round one fire. I\'ll be the one with smoke in my eyes.'),
        say('player', 'Where would you like to sit?'),
        say('joan', 'Somewhere I can hear the talk without having to join it. I\'m old, not unfriendly.'),
      ],
      options: [],
    },
  },
  topics: [
    { slot: 'lucy', node: 'l_open', label: 'The supper', when: [flagNot('accepted', true)] },
    { slot: 'lucy', node: 'l_meal', label: 'Serve the meal', when: [flag('cooked'), flag('freshnessChecked')] },
    { slot: 'lucy', node: 'l_stores', label: 'The stores', when: [flagNot('freshnessChecked', true)] },
    { slot: 'lucy', node: 'l_prep', label: 'The cooking', when: [flag('accepted')] },
    { slot: 'mark', node: 'm_torches', label: 'Torches', when: [flag('markTorches'), flagNot('torchDay', 'today')], done: true },
    { slot: 'mark', node: 'm_gate', label: 'The supper', when: [flag('accepted'), flagNot('roundAccepted', true), flagNot('markCovered', true)] },
    { slot: 'mark', node: 'm_wait', label: 'The dusk round', when: [flag('roundAccepted'), flagNot('markCovered', true)] },
    { slot: 'miles', node: 'mi_pitch', label: 'The pitch kettle', when: [flag('accepted')] },
    { slot: 'joan', node: 'j_corner', label: 'The supper', when: [flag('accepted')] },
  ],
  observations: [],
  counters: [
    { id: 'batches', on: 'roast', when: [flag('accepted')] },
    { id: 'pieces', on: 'roast', weight: 'n', when: [flag('accepted')] },
    { id: 'posts', on: 'light', match: { kind: 'torchpost', home: true, distinct: true }, when: [flag('roundAccepted'), { k: 'hour', from: 16, to: 24 }] },
    // A post that already burns (Mark lit it) counts when the player stands by it (review 014 #6).
    { id: 'posts', on: 'visit', visit: { kind: 'torchpost', r: 4, lit: true }, when: [flag('roundAccepted'), { k: 'hour', from: 16, to: 24 }] },
  ],
  rules: [
    // Mark is held only for the dusk window (16:00 to midnight) of the day the round was promised (review 014 #1).
    {
      id: 'roundHold',
      once: 'always',
      when: [flag('roundAccepted'), flagNot('markCovered', true), flag('roundDay', 'today'), { k: 'hour', from: 16, to: 24 }],
      effects: [{ k: 'hold', slot: 'mark', at: { k: 'settlement', kind: 'campfire' }, untilHour: 24 }],
    },
    {
      id: 'roundDone',
      when: [flag('roundAccepted'), flagNot('markCovered', true), { k: 'counter', id: 'posts', gte: 'homePosts' }],
      effects: [set('markCovered'), { k: 'hold', slot: 'mark', at: { k: 'house', slot: 'lucy' }, untilHour: 24 }, message('The posts are lit. {mark} goes to the Hewers\' table.')],
    },
    {
      id: 'cooked',
      when: [{ k: 'counter', id: 'pieces', gte: 4 }, flagNot('cooked', true), stageGte(1)],
      effects: [set('cooked'), stage(2), message('You have roasted enough meat. Tell {lucy} how the meal should be served.')],
    },
    { id: 'timeout', when: [{ k: 'since', hours: 96, from: 'started' }], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    { id: 'together', journal: 'One table: {lucy}, {miles}, {mark} and the whole house ate together. {mark} now lets you take a torch from the rack by the gate once a day.', effects: [] },
    { id: 'shifts', journal: 'Two sittings: everyone was fed, with less time together, and the fire and the gate were never left alone.', effects: [] },
    { id: 'doorstep', journal: 'The meal was eaten on the doorstep. {mark} kept {mark:his} round and the neighbours got a bite.', effects: [] },
  ],
  lapse: { journal: 'The supper never happened: {lucy} cooked for the house {lucy:himself}.', effects: [] },
}
