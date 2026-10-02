/**
 * G01 — Lost Lamb (docs/design/quests/grok-quest-01-lost-lamb.md). Giver: Molly, the shepherd.
 * Dialog lines are the design doc's; deviations are listed in the doc's "Implementation notes".
 * @domain quests
 */
import type { Cond, Effect, QuestDef } from './types'
import { alive, flag, flagNot, message, opinion, opt, say, sayIf, set, stage, stageIs, stageLt } from './dsl'

const camp = { k: 'road', m: 200 } as const
const pen = { k: 'building', slot: 'molly', kind: 'pen' } as const
/** At least two of the three leads (Molly's latch, Mark's witness, the prints at the pen). */
const leads2: Cond = {
  k: 'any',
  of: [
    { k: 'all', of: [flag('latch'), flag('witness')] },
    { k: 'all', of: [flag('latch'), flag('prints')] },
    { k: 'all', of: [flag('witness'), flag('prints')] },
  ],
}
/** Pip leaves the camp and follows the player home. */
const takePip = (resolved: string): Effect[] => [{ k: 'choose', flag: 'resolved', value: resolved }, { k: 'release', slot: 'pip' }, { k: 'follow', slot: 'pip', target: 'player' }, stage(3)]
const reward = (refund: boolean, extra: Effect[]): Effect[] => [
  { k: 'pay', from: { purse: 'molly' }, to: 'player', amount: refund ? 25 : 15 },
  { k: 'give', from: { store: 'molly' }, to: 'player', item: 'wool', qty: 2 },
  ...extra,
]

export const G01: QuestDef = {
  id: 'g01',
  title: 'Lost Lamb',
  giver: 'molly',
  cast: {
    molly: { kind: 'npc', required: true, profession: 'shepherd', kin: ['head', 'spouse'] },
    tom: { kind: 'npc', required: false, profession: 'shepherd', kin: ['spouse', 'head', 'son'], fallbackName: 'her husband' },
    mark: { kind: 'npc', required: false, profession: 'guard', kin: ['head'], fallbackName: 'the guard' },
    pip: { kind: 'animal', required: true, ofSlot: 'molly', species: 'sheep', preferVariant: 'young' },
    piers: { kind: 'spawn', required: true, spawn: { name: 'Piers Walker', male: true, at: camp, items: [{ item: 'bread', qty: 2 }, { item: 'waterskin_m', qty: 1 }], money: 0 } },
  },
  start: [{ k: 'day', from: 1, to: 5 }, { k: 'not', of: { k: 'near', anchor: pen, r: 40 } }],
  onOffer: [{ k: 'spawn', slot: 'piers' }, { k: 'hold', slot: 'pip', at: camp, snap: true, hours: 50 }],
  flags: { accepted: false, latch: false, witness: false, prints: false, misreadWolf: false, askedMark: false, resolved: 'none', piersWork: false },
  stages: [
    { id: 'rumour', journal: '{molly} found her pen latch lifted and her lamb Pip gone. Talk to her.', anchor: { k: 'actor', slot: 'molly' } },
    { id: 'open_pen', journal: 'Find out who took Pip: {molly}\'s latch, what {mark} saw before first light, and the tracks at the pen (the pen is the shepherd\'s).', anchor: pen },
    { id: 'ford', journal: 'A wanderer camps by the road with a lamb on a cord. Go and talk to him — or wait for night and take her back quietly.', anchor: camp },
    { id: 'home', journal: 'Bring Pip home to {molly}\'s pen.', anchor: pen },
  ],
  choiceLabels: { evidence: 'Piers gave her up when you showed him the evidence', paid: 'You paid Piers a finder\'s fee', taken_back: 'You took Pip back while Piers slept', guard: 'Mark sent Piers on his way' },
  nodes: {
    mo_open: {
      lines: [
        say('molly', 'Pip\'s gone. My lamb — the little one with the brass bell. The latch is up and the gate\'s shut behind her. Nobody shuts a gate behind themselves by accident.'),
        say('player', 'Could she have got out on her own?'),
        say('molly', 'And closed it after? No. Somebody walked her out.'),
        sayIf('tom', 'I didn\'t hear a thing. I\'m sorry, Molly.'),
        say('molly', 'You never hear anything, love. That\'s not your fault, it\'s your ears.', alive('tom')),
      ],
      options: [
        opt('help', 'I\'ll find her. Tell me everything.', [{ k: 'accept' }, set('accepted'), stage(1), opinion('molly', 5)], { next: 'mo_brief' }),
        opt('worth', 'What\'s it worth to you?', [{ k: 'accept' }, set('accepted'), stage(1)], { next: 'mo_worth' }),
        opt('wolves', 'Wolves come down this time of year.', [{ k: 'accept' }, set('accepted'), stage(1)], { next: 'mo_wolves' }),
        opt('refuse', 'I can\'t now.', [{ k: 'refuse' }]),
      ],
    },
    mo_worth: {
      lines: [say('molly', 'Fifteen coppers, and two fleeces when you bring her back. It\'s what I\'ve got.')],
      options: [opt('go_on', 'Go on.', [], { next: 'mo_brief' })],
    },
    mo_wolves: {
      lines: [say('molly', 'Wolves don\'t lift latches. Come and look.')],
      options: [opt('go_on', 'Show me.', [], { next: 'mo_brief' })],
    },
    mo_brief: {
      lines: [say('molly', 'Feel this latch. You lift it and slide it — it doesn\'t swing up on its own, it\'s too stiff. And listen for the bell. It\'s not a cow bell, it\'s high and thin. If you hear that on the road, that\'s her, not the wind.')],
      options: [
        opt('no_accusing', 'Don\'t go accusing anyone till I\'m back.', [set('latch'), stage(2)], { next: 'mo_brief_a' }),
        opt('who_passed', 'Who\'s been past lately?', [set('latch'), stage(2)], { next: 'mo_brief_b' }),
      ],
    },
    mo_brief_a: { lines: [say('molly', 'I won\'t. I\'ll just think it very loudly.')], options: [] },
    mo_brief_b: { lines: [say('molly', 'Carters for the market. A man I didn\'t know yesterday evening, asking for water. Thin. Polite.')], options: [] },
    mo_progress: {
      lines: [say('molly', 'Any luck? I keep listening for the bell.', stageLt(3)), say('molly', 'You said you had her. Where is she? Bring her home to the pen.', stageIs(3))],
      options: [opt('say_wolf', 'I think a wolf took her.', [], { when: [flag('misreadWolf'), stageLt(3)], next: 'mo_wolf_blood' })],
    },
    mo_wolf_blood: {
      lines: [say('molly', 'Then show me the blood. There\'s always blood with a wolf. (silence) No? Then it wasn\'t a wolf. Go and look on the road.')],
      options: [],
    },
    mo_home: {
      lines: [say('molly', '(hears the bell before she sees them) That\'s her. That\'s — come here, you idiot sheep. (to you) Where was she?')],
      options: [
        opt('home_evidence', 'A wanderer had her. Piers. He was going to sell her in {V} — he hadn\'t eaten in days.', [set('piersWork'), { k: 'end', ending: 'evidence' }], { when: [flag('resolved', 'evidence')], next: 'mo_end_evidence' }),
        opt('home_paid', 'I paid him a finder\'s fee to hand her over.', [{ k: 'end', ending: 'paid' }], { when: [flag('resolved', 'paid')], next: 'mo_end_paid' }),
        opt('home_taken', 'I took her back while he slept.', [{ k: 'end', ending: 'taken_back' }], { when: [flag('resolved', 'taken_back')], next: 'mo_end_taken' }),
        opt('home_guard', 'Mark\'s sent him on his way.', [{ k: 'end', ending: 'guard' }], { when: [flag('resolved', 'guard')], next: 'mo_end_guard' }),
      ],
    },
    mo_end_evidence: { lines: [say('molly', 'Hadn\'t eaten. (long pause) …Is he still by the ford? We\'ve a fence wants mending. A day\'s work for a day\'s food. If he steals the hammer, I\'ll know who to blame.')], options: [] },
    mo_end_paid: { lines: [say('molly', 'You paid him for my lamb? …Well. She\'s back. Let me give you the fee back at least.')], options: [] },
    mo_end_taken: { lines: [say('molly', 'Good. I\'d have done the same, only louder.')], options: [] },
    mo_end_guard: { lines: [say('molly', 'Good riddance. And thank Mark for me — no, I\'ll take him a cheese myself.')], options: [] },
    ma_witness: {
      lines: [say('mark', 'Before first light, on the cart road, a man went by with a pack and something on a cord. I took it for a dog. He walked quick for someone with nowhere to be.')],
      options: [
        opt('keep_quiet', 'Thanks. I\'ll keep it quiet till I\'m sure.', [set('witness'), opinion('mark', 5)]),
        opt('arrest', 'Come with me and arrest him.', [set('witness'), set('askedMark')], { next: 'ma_arrest' }),
      ],
    },
    ma_arrest: { lines: [say('mark', 'For walking a dog? Bring me something firmer and I\'ll come.')], options: [] },
    pi_ford: {
      lines: [say('piers', 'Morning. You\'ll be from {H}? I found this one wandering on the road at dawn. Thought I\'d keep her safe till someone came asking. Feeding her\'s cost me, mind — a finder\'s fee wouldn\'t be out of place.')],
      options: [
        opt('evidence', 'Molly\'s latch was lifted, not broken. Mark saw you on the road with her on a cord. And your boot prints are next to her hoof prints all the way from the pen.', takePip('evidence'), { when: [leads2], next: 'pi_evidence' }),
        opt('guard', 'Mark\'s on his way. You can explain it to him.', [...takePip('guard')], { when: [flag('askedMark'), leads2], next: 'pi_guard' }),
        opt('paid', 'Here\'s your fee. Ten coppers.', [{ k: 'pay', from: 'player', to: { purse: 'piers' }, amount: 10 }, ...takePip('paid')], { needs: [{ k: 'money', gte: 10 }], reason: 'You don\'t have 10 c.', next: 'pi_paid' }),
        opt('where', 'Where exactly did you find her?', [], { next: 'pi_where' }),
      ],
    },
    pi_evidence: { lines: [say('piers', '…I was going to sell her in {V}. I haven\'t eaten properly in four days. I\'m not a thief, I just — I am one, this morning. Take her.')], options: [] },
    pi_guard: { lines: [say('self', 'Mark arrives, walks Piers to the edge of {H} and tells him not to come back.')], options: [] },
    pi_paid: { lines: [say('piers', 'Ten\'s fair. She\'s a good lamb.')], options: [] },
    pi_where: { lines: [say('piers', 'Up the road a way.')], options: [] },
  },
  topics: [
    { slot: 'molly', node: 'mo_home', label: 'Pip', when: [stageIs(3), { k: 'near', of: 'pip', slot: 'molly', r: 10 }] },
    { slot: 'molly', node: 'mo_open', label: 'The lost lamb', when: [flagNot('accepted', true)] },
    { slot: 'molly', node: 'mo_brief', label: 'The latch', when: [flag('accepted'), flagNot('latch', true)] },
    { slot: 'molly', node: 'mo_progress', label: 'Pip', when: [flag('accepted')] },
    { slot: 'mark', node: 'ma_witness', label: 'The stranger on the cart road', when: [flag('accepted'), flagNot('witness', true)] },
    { slot: 'piers', node: 'pi_ford', label: 'The lamb', when: [flag('accepted'), stageLt(3)] },
  ],
  observations: [
    {
      id: 'pen',
      at: pen,
      r: 4,
      dwellS: 5,
      when: [flag('accepted'), flagNot('prints', true), flagNot('misreadWolf', true)],
      effects: [
        {
          k: 'if',
          when: [{ k: 'skill', skill: 'survival', gte: 15 }],
          then: [set('prints'), message('Two sets of tracks leave the gate together — small hooves, and boots beside them. Nothing was dragged.')],
          else: [set('misreadWolf'), message('Torn fur and churned mud by the fence. Something fought here.')],
        },
      ],
    },
    {
      id: 'camp',
      at: camp,
      r: 8,
      dwellS: 5,
      when: [stageIs(2), { k: 'hour', night: true }, { k: 'sneaking' }, flag('resolved', 'none')],
      effects: [...takePip('taken_back'), message('You untie Pip while Piers sleeps.')],
    },
  ],
  counters: [],
  rules: [
    // Mark walks Piers off: Piers leaves once the player has walked away from him (never mid-dialog, review 014 #7).
    { id: 'piersLeaves', once: 'always', when: [flag('resolved', 'guard'), { k: 'not', of: { k: 'near', slot: 'piers', r: 8 } }], effects: [{ k: 'despawn', slot: 'piers' }] },
    { id: 'sold', phase: 'both', when: [{ k: 'since', hours: 48, from: 'offered' }, stageLt(3)], effects: [{ k: 'end', ending: 'sold' }] },
  ],
  endings: [
    {
      id: 'evidence',
      journal: 'Piers gave Pip up when you laid out the evidence. Molly paid you 15 c and two fleeces, and may give Piers a day\'s work mending her fence.',
      effects: reward(false, [opinion('molly', 30), { k: 'rep', delta: { helpfulness: 10 }, reason: 'You brought the lamb home' }, message('Piers mends Molly\'s fence for a day, eats with the family and leaves for the next village in the morning.', 'info')]),
    },
    {
      id: 'paid',
      journal: 'You paid Piers a finder\'s fee for Pip. Molly paid you back and added her thanks.',
      effects: reward(true, [opinion('molly', 20), { k: 'rep', delta: { helpfulness: 5 }, reason: 'You brought the lamb home' }]),
    },
    {
      id: 'taken_back',
      journal: 'You took Pip back while Piers slept. Molly paid you 15 c and two fleeces.',
      effects: reward(false, [opinion('molly', 25), { k: 'rep', delta: { helpfulness: 8, courage: 3 }, reason: 'You brought the lamb home' }]),
    },
    {
      id: 'guard',
      journal: 'Mark sent Piers on his way and you brought Pip home. Molly paid you 15 c and two fleeces.',
      effects: reward(false, [opinion('molly', 20), opinion('mark', 10), { k: 'rep', delta: { helpfulness: 8 }, reason: 'You brought the lamb home' }]),
    },
    {
      id: 'sold',
      journal: 'You never came for Pip: Piers sold her at the next market.',
      effects: [{ k: 'despawn', slot: 'pip' }, { k: 'if', when: [flag('accepted')], then: [opinion('molly', -5)] }, message('Pip is gone: the wanderer sold her at the market.', 'bad')],
    },
  ],
  lapse: { journal: 'Molly is gone; her household sorted the matter of the lamb out without you.', effects: [] },
}
