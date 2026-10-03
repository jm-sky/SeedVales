/**
 * Q09 — Goods on the Ground (docs/design/quests/q09-goods-on-the-ground.md). Giver: Stephen, the trader.
 * Three households need tools Stephen carries but cannot pay for; the player makes the deal carry. Goods move as real
 * item stacks (gifts to Stephen are counted); the tools Stephen "brought back" are a one-off ledger-logged grant.
 * @domain quests
 */
import type { Cond, Effect, QuestDef } from './types'
import { flag, flagNot, message, opinion, opt, say, set, stage } from './dsl'

const heard2: Cond = { k: 'any', of: [{ k: 'all', of: [flag('hMiles'), flag('hRalph')] }, { k: 'all', of: [flag('hMiles'), flag('hMolly')] }, { k: 'all', of: [flag('hRalph'), flag('hMolly')] }] }
const tool = (to: 'molly' | 'ralph' | 'miles', item: string): Effect => ({ k: 'give', from: { purse: 'stephen' }, to: { store: to }, item, qty: 1 })
const toolRule = (id: string, counter: string, gte: number, to: 'molly' | 'ralph' | 'miles', item: string, flagName: string, text: string) => ({
  id,
  when: [flag('deal', 'barter'), { k: 'counter', id: counter, gte } as Cond, flag(flagName, false)],
  effects: [tool(to, item), set(flagName), opinion(to, 10), message(text, 'info')],
})

export const Q09: QuestDef = {
  id: 'q09',
  title: 'Goods on the Ground',
  giver: 'stephen',
  cast: {
    stephen: { kind: 'npc', required: true, profession: 'trader', kin: ['head'] },
    miles: { kind: 'npc', required: true, profession: 'woodcutter', kin: ['head'] },
    ralph: { kind: 'npc', required: true, profession: 'farmer', kin: ['head'] },
    molly: { kind: 'npc', required: true, profession: 'shepherd', kin: ['head', 'spouse'] },
  },
  start: [{ k: 'day', from: 3 }],
  onOffer: [
    { k: 'grant', to: { purse: 'stephen' }, item: 'saw', qty: 1, why: 'stephen-trip' },
    { k: 'grant', to: { purse: 'stephen' }, item: 'shears', qty: 1, why: 'stephen-trip' },
    { k: 'grant', to: { purse: 'stephen' }, item: 'sickle', qty: 1, why: 'stephen-trip' },
    { k: 'grant', to: { store: 'miles' }, item: 'oak_plank', qty: 2, why: 'seasoned-planks' },
  ],
  flags: { result: 'none', accepted: false, hMiles: false, hRalph: false, hMolly: false, deal: 'none', toolsMolly: false, toolsRalph: false, toolsMiles: false, planksTaken: false, woolTaken: false, grainTaken: false },
  stages: [
    { id: 'needs', journal: '{stephen} is back with a saw, shears and a sickle, and nobody can pay. Hear what {miles}, {ralph} and {molly} could trade, then find {stephen} a deal he can carry.', anchor: { k: 'actor', slot: 'stephen' }, progress: [{ when: [heard2], text: 'You have heard enough to propose a deal.' }] },
    { id: 'deal', journal: 'The deal is struck. See it through with {stephen}.', anchor: { k: 'actor', slot: 'stephen' } },
  ],
  choiceLabels: { barter: 'A straight swap, goods for tools', consign: 'Goods on commission, tools handed out at once', order: 'A list of needs for the next trip' },
  nodes: {
    st_open: {
      lines: [
        say('stephen', 'Half the village has been past to look at the saw. Nobody\'s bought it. They stroke it like a cat and walk off.'),
        say('player', 'They\'ve no coin.'),
        say('stephen', 'They\'ve grain, timber and wool, and I\'ve a donkey, not a wagon. I can\'t eat timber and I can\'t sell it in {V} — they\'ve a forest of their own.'),
        say('player', 'So nobody trades.'),
        say('stephen', 'So everybody waits and grumbles. (pause) If you can find me a deal I can carry, I\'ll make it. I\'d rather sell the saw for wool than take it back up that hill.'),
      ],
      options: [
        opt('find_deal', 'I\'ll see what each house can offer.', [{ k: 'accept' }, set('accepted'), stage(0), opinion('stephen', 5)], { next: 'st_go' }),
        opt('lend', 'Why not just lend it?', [], { next: 'st_lend' }),
        opt('refuse', 'Not now.', [{ k: 'refuse' }], { next: 'st_no' }),
      ],
    },
    st_lend: {
      lines: [say('stephen', 'Because the last thing I lent in this village came back as a story about why it broke. — No, that\'s unfair. Half a story.')],
      options: [opt('find_deal', 'I\'ll see what each house can offer.', [{ k: 'accept' }, set('accepted'), opinion('stephen', 5)], { next: 'st_go' })],
    },
    st_go: { lines: [say('stephen', 'Ask {miles}, {ralph} and {molly}. Two of them is enough to start with.')], options: [] },
    st_no: { lines: [say('stephen', 'Then the saw goes back up the hill.')], options: [] },
    st_deal: {
      lines: [say('stephen', 'Well? What can I carry?')],
      options: [
        opt('barter', 'Straight swap, today. Wool for the shears, grain for the sickle, the planks for the saw. I\'ll carry the heavy stuff to you.', [set('deal', 'barter'), { k: 'choose', flag: 'result', value: 'barter' }, stage(1)], { needs: [heard2], reason: 'You haven\'t heard enough yet — ask the houses first.', next: 'st_barter' }),
        opt('consign', 'Take the wool and planks on commission. They get the tools now; pay them what the goods fetch when you\'re back.', [set('deal', 'consign'), { k: 'choose', flag: 'result', value: 'consign' }, stage(1), tool('molly', 'shears'), tool('ralph', 'sickle'), tool('miles', 'saw')], { needs: [heard2], reason: 'You haven\'t heard enough yet — ask the houses first.', next: 'st_consign' }),
        opt('order', 'No deal today. Write down what everyone needs and bring the right things next time.', [set('deal', 'order'), { k: 'choose', flag: 'result', value: 'order' }, stage(1)], { needs: [heard2], reason: 'You haven\'t heard enough yet — ask the houses first.', next: 'st_order' }),
      ],
    },
    st_barter: { lines: [say('stephen', 'The wool I\'ll take gladly. Grain — two sacks, not four, I can only store so much. The planks… (weighing it up) …if they\'re as good as they say, yes. And you carry them, because my back\'s already promised to the donkey. Give them to me and the tools go out.')], options: [] },
    st_consign: { lines: [say('stephen', 'That\'s trust on both sides. I keep a tally, they keep a tally. Bring me the wool and two planks; in three days I\'ll settle with them. The tools are already on their way.')], options: [] },
    st_order: { lines: [say('stephen', 'A list. (pause) That\'s not nothing. Half my trips I guess what people want and guess wrong. Come back in a few days.')], options: [] },
    st_wait: { lines: [say('stephen', 'Bring me what we agreed and I\'ll finish it.', flag('deal', 'barter')), say('stephen', 'Wait for the settling — I told them three days.', flag('deal', 'consign')), say('stephen', 'Next trip. I wrote it all down.', flag('deal', 'order'))], options: [] },
    mi_needs: {
      lines: [
        say('miles', 'The saw? I\'d give a cartload of split wood for it. He doesn\'t want a cartload of split wood.'),
        say('player', 'What else have you got?'),
        say('miles', 'Two good oak planks from last winter. Seasoned. Somebody in {V} might want those — a cooper, a joiner. Heavier than they look. Everything worth having is.'),
      ],
      options: [opt('ok', 'Heavy, but I\'ll manage.', [set('hMiles')])],
    },
    mi_planks: {
      lines: [say('miles', 'The planks are by the woodpile. Take them for {stephen} — and mind your back.')],
      options: [opt('take', 'I\'ll carry them.', [{ k: 'give', from: { store: 'miles' }, to: 'player', item: 'oak_plank', qty: 2 }, set('planksTaken')])],
    },
    ra_grain: {
      lines: [say('ralph', 'Two sacks, dry. They\'re heavy — take them for {stephen}.')],
      options: [opt('take', 'I\'ll carry them.', [{ k: 'give', from: { store: 'ralph' }, to: 'player', item: 'grain', qty: 2 }, set('grainTaken')])],
    },
    mo_wool: {
      lines: [say('molly', 'A clean fleece for {stephen}. It\'s light enough.')],
      options: [opt('take', 'I\'ll bring it to him.', [{ k: 'give', from: { store: 'molly' }, to: 'player', item: 'wool', qty: 1 }, set('woolTaken')])],
    },
    ra_needs: {
      lines: [
        say('ralph', 'I need the sickle before harvest. I\'ve grain — last year\'s, dry, in sacks.'),
        say('player', '{stephen} says grain\'s cheap in {V}.'),
        say('ralph', 'This year it is. Ask him what he thinks it\'ll be after this summer. He hasn\'t said. He\'s been buying sacks for himself, quietly. That\'s saying.'),
      ],
      options: [opt('ok', 'I\'ll tell him two sacks would do.', [set('hRalph')])],
    },
    mo_needs: {
      lines: [
        say('molly', 'Shears. Mine are notched; I\'m cutting the wool more than shearing it.'),
        say('player', 'Wool\'s light, at least.'),
        say('molly', 'Light and worth something in {V}, if it\'s clean. Mine\'s clean.'),
      ],
      options: [opt('ok', 'Then {stephen} can have a fleece for the shears.', [set('hMolly')])],
    },
  },
  topics: [
    { slot: 'stephen', node: 'st_open', label: 'The tools nobody buys', when: [flagNot('accepted', true)] },
    { slot: 'stephen', node: 'st_deal', label: 'A deal he can carry', when: [flag('accepted'), flag('deal', 'none')] },
    { slot: 'stephen', node: 'st_wait', label: 'The deal', when: [flagNot('deal', 'none')] },
    { slot: 'miles', node: 'mi_needs', label: 'The saw', when: [flag('accepted'), flagNot('hMiles', true)] },
    { slot: 'ralph', node: 'ra_needs', label: 'The sickle', when: [flag('accepted'), flagNot('hRalph', true)] },
    { slot: 'miles', node: 'mi_planks', label: 'The oak planks', when: [flag('hMiles'), flagNot('planksTaken', true)] },
    { slot: 'ralph', node: 'ra_grain', label: 'The grain', when: [flag('hRalph'), flagNot('grainTaken', true)] },
    { slot: 'molly', node: 'mo_wool', label: 'The fleece', when: [flag('hMolly'), flagNot('woolTaken', true)] },
    { slot: 'molly', node: 'mo_needs', label: 'The shears', when: [flag('accepted'), flagNot('hMolly', true)] },
  ],
  observations: [],
  counters: [
    { id: 'gWool', on: 'give', weight: 'n', match: { slot: 'stephen', item: 'wool' } },
    { id: 'gGrain', on: 'give', weight: 'n', match: { slot: 'stephen', item: 'grain' } },
    { id: 'gPlank', on: 'give', weight: 'n', match: { slot: 'stephen', item: 'oak_plank' } },
  ],
  rules: [
    toolRule('toolMolly', 'gWool', 1, 'molly', 'shears', 'toolsMolly', '{molly} tries the shears: that is the sound it should make.'),
    toolRule('toolRalph', 'gGrain', 2, 'ralph', 'sickle', 'toolsRalph', '{ralph} tests the sickle against his thumb and nods.'),
    toolRule('toolMiles', 'gPlank', 2, 'miles', 'saw', 'toolsMiles', '{miles} hangs the saw on its nail where he can see it.'),
    { id: 'barterDone', when: [flag('toolsMolly'), flag('toolsRalph'), flag('toolsMiles')], effects: [{ k: 'end', ending: 'barter' }] },
    { id: 'commission', when: [flag('deal', 'consign'), { k: 'since', hours: 72, from: 'stage' }, { k: 'counter', id: 'gWool', gte: 1 }, { k: 'counter', id: 'gPlank', gte: 2 }], effects: [{ k: 'end', ending: 'consign' }] },
    { id: 'listDone', when: [flag('deal', 'order'), { k: 'since', hours: 120, from: 'stage' }], effects: [{ k: 'end', ending: 'order' }] },
    { id: 'stalled', when: [{ k: 'since', hours: 240, from: 'started' }], effects: [{ k: 'end', ending: 'stalled' }] },
    { id: 'ignored', phase: 'both', when: [{ k: 'since', hours: 96, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'lapse' }] },
  ],
  endings: [
    {
      id: 'barter',
      journal: 'The tools are in the houses and the goods are in {stephen}\'s store. {stephen} paid you 10 c for the carrying.',
      effects: [{ k: 'pay', from: { purse: 'stephen' }, to: 'player', amount: 10 }, { k: 'rep', delta: { helpfulness: 10 }, reason: 'You made a deal that carries' }, opinion('stephen', 20)],
    },
    {
      id: 'consign',
      journal: '{stephen} sold the wool and planks in {V} and settled with the houses from his own purse; you got 10 c from him and 5 c from each house.',
      effects: [
        { k: 'pay', from: { purse: 'stephen' }, to: { purse: 'molly' }, amount: 12 },
        { k: 'pay', from: { purse: 'stephen' }, to: { purse: 'miles' }, amount: 18 },
        { k: 'pay', from: { purse: 'stephen' }, to: 'player', amount: 10 },
        { k: 'pay', from: { purse: 'molly' }, to: 'player', amount: 5 },
        { k: 'pay', from: { purse: 'miles' }, to: 'player', amount: 5 },
        { k: 'rep', delta: { helpfulness: 12 }, reason: 'You made a deal that carries' },
        opinion('stephen', 15), opinion('molly', 10), opinion('miles', 10),
      ],
    },
    {
      id: 'order',
      journal: '{stephen} wrote the houses\' needs down and came back from his next trip with a little more iron than usual.',
      effects: [{ k: 'grant', to: { purse: 'stephen' }, item: 'iron_ingot', qty: 2, why: 'extra-stock' }, { k: 'rep', delta: { helpfulness: 5 }, reason: 'You made a list that carries' }, opinion('stephen', 5), opinion('molly', 5), opinion('ralph', 5), opinion('miles', 5)],
    },
    { id: 'stalled', journal: 'Nothing came of the deal; {stephen} took what he could back up the hill.', effects: [opinion('stephen', -5)] },
  ],
  lapse: { journal: '{stephen} sold what he could and packed the rest.', effects: [] },
}
