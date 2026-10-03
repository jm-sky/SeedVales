/**
 * Q03 — A Roof Before Rain (docs/design/quests/q03-a-roof-before-rain.md). Giver: the woodcutter (Miles).
 * Dialog lines are the design doc's; deviations are listed in the doc's "Implementation notes".
 * @domain quests
 */
import type { Cond, Effect, QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, sayIf, set, stage, stageGte, stageLt } from './dsl'

const house = { k: 'house', slot: 'miles' } as const
const milesStore = { store: 'miles' } as const
/** The house is in good repair again. */
const repaired = { k: 'durability', slot: 'miles', gte: 90 } as const
/** The player took part in the repair plan: repaired the house or arranged the beams from the common store. */
const contributed: Cond = { k: 'any', of: [{ k: 'counter', id: 'myRepairs', gte: 1 }, flag('storeGranted')] }
const everyone = ['miles', 'lucy', 'joan', 'matthew'] as const

/** {lucy}'s thanks: bread and milk (the design's cheese does not exist) from her household or 10 c from {miles}'s purse. */
const payOptions = (ending: string) => [
  opt(`take_goods_${ending}`, 'Take the bread and milk.', [set('thanks', 'goods'), { k: 'end', ending }]),
  opt(`take_coin_${ending}`, 'Take 10 c.', [set('thanks', 'coin'), { k: 'end', ending }]),
]

/** The thanks themselves are paid by the (exclusive) ending, so a repeated call cannot pay twice (review 014 #3). */
const thanks: Effect[] = [
  { k: 'if', when: [flag('thanks', 'goods')], then: [{ k: 'give', from: milesStore, to: 'player', item: 'bread', qty: 2 }, { k: 'give', from: milesStore, to: 'player', item: 'milk', qty: 1 }] },
  { k: 'if', when: [flag('thanks', 'coin')], then: [{ k: 'pay', from: { purse: 'miles' }, to: 'player', amount: 10 }] },
]

export const Q03: QuestDef = {
  id: 'q03',
  title: 'A Roof Before Rain',
  giver: 'miles',
  cast: {
    miles: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['head'] },
    lucy: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['spouse'] },
    joan: { kind: 'npc', required: false, profession: 'woodcutter', kin: ['elder'], fallbackName: 'the old woman' },
    matthew: { kind: 'npc', required: false, profession: 'woodcutter', kin: ['son', 'child'], fallbackName: 'the boy' },
    ralph: { kind: 'npc', required: true, profession: 'farmer', kin: ['head'] },
  },
  start: [{ k: 'durability', slot: 'miles', lt: 60 }],
  flags: { accepted: false, beamInspected: false, cupboardHeard: false, plan: 'unset', storeGranted: false, storeDebt: false, workComplete: false, propped: false, thanks: 'none' },
  stages: [
    { id: 'rumour', journal: '{miles} has been patching the roof of the house for months and is up on the ladder again. Talk to {miles:him}.', anchor: { k: 'actor', slot: 'miles' } },
    { id: 'measure', journal: 'Judge the damage: climb into the loft of {miles}\'s house with a lit torch (hold a torch and stand by the house). Listen to the household: {lucy} by the hearth, {joan} in {joan:his} room.', anchor: house },
    { id: 'decision', journal: 'The beam is rotten. Bring the household to a decision with {lucy} and {miles}: replace the beam, build a small dry room, or prop it up until spring.', anchor: { k: 'actor', slot: 'lucy' } },
    { id: 'work', journal: 'The plan is agreed. Do the work: repair the house (hammer, 2 branches per repair), build a shed beside it, or prop the beam with a log. Then tell {lucy}.', anchor: house },
  ],
  choiceLabels: { repair: 'Replace the beam', lean_to: 'Build a small dry room on the side', prop: 'Prop the beam up until spring' },
  nodes: {
    // S1 — Miles on the ladder.
    m_open: {
      lines: [
        say('miles', 'If you\'ve come to tell me the roof leaks, you\'ve got good eyes and bad timing.'),
        say('player', '{lucy} asked if I could lend a hand.'),
        say('miles', '{lucy} asked for a second pair of eyes, I\'d bet. Hands come after we\'ve measured.'),
      ],
      options: [
        opt('show_damage', 'Show me the damage.', [{ k: 'accept' }, set('accepted'), stage(1)], { next: 'm_open_a' }),
        opt('bring_timber', 'I could bring timber right away.', [], { next: 'm_open_b' }),
      ],
    },
    m_open_a: { lines: [say('miles', 'Roof first. Then the beam over {joan}\'s room. If I start telling you it\'s one job, stop me.')], options: [] },
    m_open_b: { lines: [say('miles', 'Bring a measuring cord instead. I\'ve cut enough wood to the wrong length this year.')], options: [] },
    m_wait: {
      lines: [say('self', '{miles} is on the ladder. To judge the beam you have to climb into the loft with a lit torch: hold a torch (T) and stand next to the house for a moment.')],
      options: [],
    },
    // S4 — the beam.
    m_beam: {
      lines: [
        say('miles', 'Outer boards are bad. The beam\'s worse — look, the knife goes in like it\'s cheese.'),
        say('player', '{joan}\'s cupboard door has stuck since spring. The wall\'s moving.', flag('cupboardHeard')),
        say('miles', '…Then it\'s sagging, not just rotting. Right. That\'s not a patch job.', flag('cupboardHeard')),
        say('miles', 'Might not be worth ripping out. A prop for the season would see us through, if you ask me.', flagNot('cupboardHeard', true)),
      ],
      options: [
        opt('plan_repair', 'Then we replace the beam.', [{ k: 'choose', flag: 'plan', value: 'repair' }], { next: 'm_beam_repair' }),
        opt('plan_lean_to', 'Or build a small dry room on the side for {joan:him}.', [{ k: 'choose', flag: 'plan', value: 'lean_to' }], { next: 'm_beam_lean' }),
        opt('plan_prop', 'Prop it up for now.', [{ k: 'choose', flag: 'plan', value: 'prop' }], { next: 'm_beam_prop' }),
      ],
    },
    m_beam_repair: { lines: [say('miles', 'Two straight pieces, four paces long, and three people to lift. That\'s a proper repair. Three days, maybe four.')], options: [] },
    m_beam_lean: { lines: [say('miles', 'Quicker. Smaller. And we shut the old room till next year. It\'s not a failure — it\'s a different cost.')], options: [] },
    m_beam_prop: { lines: [say('miles', 'That I can do in a day.')], options: [] },
    // S9 — before work starts; the prop.
    m_work: {
      lines: [
        say('lucy', 'It hasn\'t started raining. That\'s not a reason to rush.'),
        say('player', 'The wood\'s here and we\'ve all agreed.'),
        say('miles', 'Then let\'s start. If the wall so much as creaks, everyone stops.'),
        sayIf('matthew', 'And if I say stop?'),
        sayIf('miles', 'Say it twice and loud. I\'m half deaf on a roof.', alive('matthew')),
      ],
      options: [
        opt('prop_beam', 'Prop the beam now (1 log).', [
          { k: 'consume', from: 'player', item: 'log', qty: 1 },
          set('propped'),
          set('workComplete'),
          message('You wedge a log under the beam. {joan}\'s bed moves to the main room. Tell {lucy}.'),
        ], { when: [flag('plan', 'prop'), flagNot('propped', true)], needs: [{ k: 'hasItem', item: 'log', qty: 1, from: 'player' }], reason: 'You need a log.', next: 'm_work_prop' }),
      ],
    },
    m_work_prop: { lines: [say('miles', 'That I can do in a day.')], options: [] },
    // S2 — Lucy at the hearth.
    l_hearth: {
      lines: [
        say('lucy', '{joan}\'s bed is dry when the wind\'s from the east. That\'s not what I call dry.'),
        say('player', '{miles} says the beam needs a look.'),
        say('lucy', '{miles} says a lot of things after {miles:he}\'s lifted a beam. I want the thing {miles:he} says before.'),
        say('player', 'What do you need first?'),
        say('lucy', 'One dry room for {joan}. And a plan that doesn\'t eat next month\'s flour.'),
      ],
      options: [],
    },
    // S6 + S7 — the household decision.
    l_decide: {
      lines: [
        say('lucy', 'We can buy timber or we can buy extra grain for winter. Not both, not this month.'),
        say('miles', 'I\'ll take a felling job after the repair. That pays it back.'),
        say('lucy', 'And who fetches the water and splits the kindling while you\'re up there?'),
        say('player', 'I can bring the first load. The rest is for the two of you to decide.'),
        say('miles', 'Fair. Nobody counts a promise as timber.'),
      ],
      options: [
        opt('say_repair', 'Replace the beam. The room goes back to {joan} when it\'s done.', [{ k: 'choose', flag: 'plan', value: 'repair' }], { next: 'l_repair' }),
        opt('say_lean_to', 'Build a small dry room on the south side and close the old one.', [{ k: 'choose', flag: 'plan', value: 'lean_to' }], { next: 'l_lean_to' }),
        opt('say_prop', 'Prop the beam now, move {joan:his} bed to the main room, fix it properly after the felling season.', [{ k: 'choose', flag: 'plan', value: 'prop' }], { next: 'l_prop' }),
        opt('agree', 'Then it\'s settled. Let\'s start.', [stage(3)], { when: [flagNot('plan', 'unset')], next: 'l_agreed' }),
      ],
    },
    l_repair: {
      lines: [
        say('miles', 'Then {matthew} lifts with me, and you fetch only the pieces I\'ve marked.', alive('matthew')),
        say('lucy', 'If the flour stays above the winter line, yes.'),
        sayIf('joan', 'And if you all stop calling that room "almost fine".'),
      ],
      options: [opt('agree', 'Then it\'s settled. Let\'s start.', [stage(3)], { next: 'l_agreed' })],
    },
    l_lean_to: {
      lines: [
        say('lucy', 'That gives us room, not the old house.'),
        say('miles', 'It gives us till spring.'),
        sayIf('joan', 'Put my chair by the window. The old room never had a decent one.'),
      ],
      options: [opt('agree', 'Then it\'s settled. Let\'s start.', [stage(3)], { next: 'l_agreed' })],
    },
    l_prop: {
      lines: [
        say('miles', 'That I can do in a day.'),
        say('lucy', 'And sleep next to {joan}\'s snoring till spring.'),
        sayIf('joan', 'I heard that.'),
      ],
      options: [opt('agree', 'Then it\'s settled. Let\'s start.', [stage(3)], { next: 'l_agreed' })],
    },
    l_agreed: { lines: [say('self', 'The household agrees. See the work through, then come back to {lucy}.')], options: [] },
    // Endings E1–E3: Lucy's thanks.
    l_done: {
      lines: [
        say('lucy', 'The beam holds. I didn\'t think I would say that before winter.', flag('plan', 'repair')),
        sayIf('joan', 'The bowl\'s empty.', flag('plan', 'repair')),
        say('miles', 'The roof isn\'t. Mostly.', alive('joan'), flag('plan', 'repair')),
        say('lucy', 'The store has its two beams back, out of our own woodpile. We\'ll be short of firewood by spring.', flag('plan', 'repair'), flag('storeDebt')),
        say('player', 'I\'ll help you split what\'s left.', flag('plan', 'repair'), flag('storeDebt')),
        say('miles', 'You\'ll be welcome. Don\'t let me call it a favour — I\'ll owe you a load of firewood.', flag('plan', 'repair')),
        say('lucy', 'It\'s small.', flag('plan', 'lean_to')),
        sayIf('joan', 'So was the old room, once the cupboard moved in.', flag('plan', 'lean_to')),
        sayIf('matthew', 'I can carry your chair.', flag('plan', 'lean_to')),
        sayIf('joan', 'You can visit first. We\'ll talk about who sleeps where some other day.', flag('plan', 'lean_to')),
        say('lucy', 'Well. It stands.', flag('plan', 'prop')),
        say('miles', 'It isn\'t fixed.', flag('plan', 'prop')),
        say('player', 'No. It\'s held up until you can fix it.', flag('plan', 'prop')),
        say('lucy', 'I like that better than "almost fine".', flag('plan', 'prop')),
        sayIf('joan', 'Write it on the board in the square, then. So people know where not to stand.', flag('plan', 'prop')),
      ],
      options: [
        ...payOptions('repair').map((o) => ({ ...o, when: [flag('plan', 'repair')] })),
        ...payOptions('lean_to').map((o) => ({ ...o, when: [flag('plan', 'lean_to')] })),
        opt('finish_prop', 'That will do.', [{ k: 'end', ending: 'prop' }], { when: [flag('plan', 'prop')] }),
      ],
    },
    // S3 — Joan.
    j_room: {
      lines: [say('joan', 'The drip lands in the same bowl every time. I\'ve become very good at moving a bowl.')],
      options: [opt('ask_changed', 'Has anything else changed in here?', [set('cupboardHeard')], { next: 'j_cupboard' })],
    },
    j_cupboard: {
      lines: [say('joan', 'The cupboard door sticks. It didn\'t last spring. I thought it was the damp.')],
      options: [opt('tell_miles', 'I\'ll tell {miles}.', [], { next: 'j_tell' })],
    },
    j_tell: { lines: [say('joan', 'Tell {miles:him} before {miles:he} climbs up there. {miles:He} doesn\'t listen to me once {miles:he}\'s on a ladder.')], options: [] },
    // S5 — Matthew.
    ma_room: {
      lines: [
        say('matthew', 'If {joan} moves to a lean-to, I could have the small room.'),
        say('player', 'Is that what you want?'),
        say('matthew', 'I want a door that shuts. I\'d also like to know the roof won\'t come down while I\'m asleep under it.'),
        say('player', 'You\'d be lifting the beam if we replace it.'),
        say('matthew', 'I know. I\'m asking which week I lose, that\'s all.'),
      ],
      options: [],
    },
    // S8 — the common store.
    r_store: {
      lines: [
        say('ralph', 'Two straight beams? There are three in the common store. They\'re there for the next roof that falls in — which, by the sound of it, is yours.'),
        say('player', 'Can {miles} have two?'),
        say('ralph', '{miles:He} can borrow two. {miles:He} brings back two before the first snow, felled and squared. Same length.'),
      ],
      options: [
        opt('store_agree', 'Agreed — I\'ll help {miles:him} fell them.', [{ k: 'give', from: { warehouse: 'home' }, to: milesStore, item: 'log', qty: 2 }, set('storeGranted'), set('storeDebt')]),
        opt('store_give', 'Couldn\'t the village just give them?', [{ k: 'give', from: { warehouse: 'home' }, to: milesStore, item: 'log', qty: 2 }, set('storeGranted'), set('storeDebt')], { next: 'r_lend' }),
      ],
    },
    r_lend: { lines: [say('ralph', 'And if the herbalist\'s roof goes in a month? I\'ll lend, not give. That\'s the best I\'ve got.')], options: [] },
    r_have: { lines: [say('ralph', 'The beams are with {miles}. When the roof is done {miles:he} squares the store from {miles:his} own woodpile.')], options: [] },
  },
  topics: [
    { slot: 'lucy', node: 'l_done', label: 'The work is done', when: [flag('workComplete')] },
    { slot: 'lucy', node: 'l_decide', label: 'The household decision', when: [flag('beamInspected'), stageLt(3)] },
    { slot: 'lucy', node: 'l_hearth', label: '{joan}\'s room', when: [flag('accepted')] },
    { slot: 'miles', node: 'm_open', label: 'The roof', when: [flagNot('accepted', true)] },
    { slot: 'miles', node: 'm_beam', label: 'The beam', when: [flag('beamInspected'), flag('plan', 'unset')] },
    { slot: 'miles', node: 'm_work', label: 'The work', when: [stageGte(3)] },
    { slot: 'miles', node: 'm_wait', label: 'The roof', when: [flag('accepted'), flagNot('beamInspected', true)] },
    { slot: 'joan', node: 'j_room', label: '{joan:His} room', when: [flag('accepted')] },
    { slot: 'matthew', node: 'ma_room', label: 'The small room', when: [flag('beamInspected')] },
    { slot: 'ralph', node: 'r_store', label: 'The common timber store', when: [flag('plan', 'repair'), flagNot('storeGranted', true), { k: 'not', of: { k: 'hasItem', item: 'log', qty: 2, from: milesStore } }] },
    { slot: 'ralph', node: 'r_have', label: 'The common timber store', when: [flag('storeGranted')] },
  ],
  observations: [
    {
      id: 'beam',
      at: house,
      r: 7,
      dwellS: 6,
      when: [flag('accepted'), flagNot('beamInspected', true), { k: 'litTorch' }],
      effects: [
        set('beamInspected'),
        stage(2),
        message('You climb into the loft with the torch. The outer boards are bad; the beam over {joan}\'s room gives way under a knife like cheese. Talk to {miles}.'),
      ],
    },
  ],
  counters: [
    { id: 'myRepairs', on: 'repair', match: { byPlayer: true, near: { anchor: house, r: 3 } }, when: [flag('accepted')] },
    { id: 'leanTo', on: 'built', match: { kind: 'shed', near: { anchor: house, r: 15 }, save: 'leanTo' }, when: [flag('plan', 'lean_to'), stageGte(3)] },
  ],
  rules: [
    { id: 'repairDone', when: [stageGte(3), flag('plan', 'repair'), repaired, flagNot('workComplete', true), contributed], effects: [set('workComplete'), message('The beam is in and the roof holds. Tell {lucy}.')] },
    { id: 'leanDone', when: [stageGte(3), flag('plan', 'lean_to'), { k: 'counter', id: 'leanTo', gte: 1 }, flagNot('workComplete', true)], effects: [set('workComplete'), message('The small dry room is up. Tell {lucy}.')] },
    // D-QUEST-2: with the plan "replace the beam" the house mended by NPC work alone ends the quest with E1
    // (no thanks payment: the player took no part).
    { id: 'npcRepair', when: [flag('plan', 'repair'), repaired, flagNot('workComplete', true), { k: 'not', of: contributed }], effects: [{ k: 'end', ending: 'repair' }] },
    // "The family finished it" applies only while no plan was agreed (D-QUEST-2).
    {
      id: 'family',
      phase: 'both',
      when: [repaired, flagNot('workComplete', true), flag('plan', 'unset')],
      effects: [{ k: 'end', ending: 'family' }],
    },
  ],
  endings: [
    {
      id: 'repair',
      journal: 'The old house holds. The beam was replaced and {joan} sleeps in {joan:his} own room again; {miles} repaid the common store its two beams from {miles:his} own woodpile and owes you a load of firewood.',
      effects: [
        { k: 'if', when: [contributed], then: everyone.map((s) => opinion(s, 15)), else: [opinion('miles', 3)] },
        ...thanks,
        { k: 'consume', from: milesStore, item: 'log', qty: 2 },
        { k: 'if', when: [flag('storeDebt')], then: [{ k: 'give', from: milesStore, to: { warehouse: 'home' }, item: 'log', qty: 2 }] },
        { k: 'if', when: [contributed], then: [{ k: 'give', from: milesStore, to: 'player', item: 'branch', qty: 6 }] },
        { k: 'if', when: [contributed], then: [{ k: 'rep', delta: { helpfulness: 4 }, reason: 'You helped mend a roof' }] },
      ],
    },
    {
      id: 'lean_to',
      journal: 'A smaller dry room stands beside the house. The old room is shut; the old roof is still bad.',
      effects: [...everyone.map((s) => opinion(s, 10)), ...thanks, { k: 'owner', anchor: { k: 'saved', id: 'leanTo' }, to: 'miles' }, { k: 'rep', delta: { helpfulness: 3 }, reason: 'You helped build a dry room' }],
    },
    {
      id: 'prop',
      journal: 'The beam is propped until spring. It is not mended, and everyone knows it.',
      effects: [...everyone.map((s) => opinion(s, 5)), message('The prop does not mend the roof: the house keeps wearing as before.', 'info')],
    },
    {
      id: 'family',
      journal: 'The family finished the roof on their own.',
      effects: [opinion('miles', 3), message('{miles} and {miles:his} family mended the roof themselves.', 'info')],
    },
  ],
  lapse: { journal: '{miles} is gone; the household sorted the roof out without you.', effects: [] },
}
