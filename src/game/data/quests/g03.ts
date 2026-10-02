/**
 * G03 — Night Torches (docs/design/quests/grok-quest-03-night-torches.md). Giver: Mark Hornblower, the guard.
 * Dialog lines are the design doc's; deviations are listed in the doc's "Implementation notes".
 * @domain quests
 */
import type { Cond, Effect, QuestDef } from './types'
import { flag, message, opinion, opt, say, set, stage, stageGte, stageIs, stageLt } from './dsl'

/** The torch post nearest to the hunter's house — the one that goes dark. */
const post = { k: 'torchpost', slot: 'hazel' } as const
const dusk: Cond = { k: 'hour', from: 16, to: 22 }
const pay15: Effect = { k: 'pay', from: { treasury: 'home' }, to: 'player', amount: 15 }

export const G03: QuestDef = {
  id: 'g03',
  title: 'Night Torches',
  giver: 'mark',
  cast: {
    mark: { kind: 'npc', required: true, profession: 'guard', kin: ['head'] },
    hazel: { kind: 'npc', required: true, profession: 'hunter', kin: ['child'] },
    martha: { kind: 'npc', required: true, profession: 'hunter', kin: ['spouse'] },
  },
  start: [{ k: 'day', from: 3, to: 10 }, { k: 'posts', gte: 1 }],
  flags: { mode: 'unset', path: 'unset', lastSnuff: 0 },
  stages: [
    { id: 'rumour', journal: '{mark} says somebody keeps putting out the torch posts by the hunter\'s house at night. Talk to him.', anchor: { k: 'actor', slot: 'mark' } },
    { id: 'dark_posts', journal: 'Find out who snuffs the torch posts by the hunter\'s house: keep watch near the post at night (sneak if you are alone), or ask {martha} in the morning after a dark night.', anchor: post },
    { id: 'hazel', journal: 'You know who it is. Talk to {hazel}. If you promised to show {hazel} the wolf tracks, bring {mark} and {hazel} together at dusk.', anchor: { k: 'actor', slot: 'hazel' } },
    { id: 'lights_back', journal: 'The lights are back. Tell {mark} how it ended.', anchor: { k: 'actor', slot: 'mark' } },
  ],
  choiceLabels: { together: 'Hazel told Mark herself, with you beside her', show: 'You showed Hazel what the light is for', tell: 'You told Martha and Mark' },
  nodes: {
    m_open: {
      lines: [
        say('mark', 'Third night this week. The posts by the hunter\'s house go dark before midnight. Not blown out — snuffed. Somebody climbs up there and puts a lid on them.'),
        say('player', 'Who\'d do that?'),
        say('mark', 'Somebody who wants the dark. That\'s the bit I don\'t like. Help me find out — quietly. I don\'t want the whole square talking about thieves.'),
      ],
      options: [
        opt('watch', 'I\'ll keep watch with you tonight.', [{ k: 'accept' }, set('mode', 'watch'), stage(1)]),
        opt('alone', 'I\'ll hide near the posts on my own.', [{ k: 'accept' }, set('mode', 'alone'), stage(1)]),
        opt('morning', 'Let me look at the posts in the morning.', [{ k: 'accept' }, set('mode', 'morning'), stage(1)]),
        opt('refuse', 'Not tonight.', [{ k: 'refuse' }]),
      ],
    },
    m_wait: {
      lines: [say('self', '{mark} shakes his head: the posts by the hunter\'s house still go dark before midnight. Find out who does it.')],
      options: [],
    },
    // Morning — Martha at her door.
    ma_morning: {
      lines: [
        say('martha', 'Soot on our stool. And a cup from my shelf with black on the rim. (she sits down heavily) Hazel. It\'s Hazel, isn\'t it. She hasn\'t slept right since Patch.'),
      ],
      options: [opt('talk_gently', 'I\'d like to talk to her. Gently.', [stage(2), { k: 'hold', slot: 'hazel', at: { k: 'house', slot: 'hazel' }, hours: 3 }], { next: 'ma_morning_b' })],
    },
    ma_morning_b: {
      lines: [say('martha', 'Please. And — not in front of the square. Jacob\'s out every night after that wolf. I can\'t do this one alone too.')],
      options: [],
    },
    // Stage 2 — Hazel.
    h_confront: {
      lines: [
        say('self', 'A small shape climbs the post like a cat, a clay cup in one hand. The flame dies under it. She climbs down, looks toward the forest for a long moment — and only then sees you.', { k: 'flag', flag: 'mode', in: ['watch', 'alone'] }),
        say('hazel', 'You\'re not going to tell Father?'),
        say('player', 'Tell me why first.'),
        say('hazel', 'Because the wolves come where the light is. That\'s how they found Patch — he was by the lamp in the yard. If it\'s dark, they can\'t see us. So they\'ll go somewhere else.'),
        say('player', 'Did someone tell you that?'),
        say('hazel', 'No. I worked it out.'),
      ],
      options: [
        opt('path_together', 'Let\'s go and tell Mark together. I\'ll stand next to you.', [{ k: 'choose', flag: 'path', value: 'together' }, opinion('hazel', 20), opinion('martha', 10), stage(3), { k: 'release', slot: 'hazel' }], { next: 'h_together' }),
        opt('path_show', 'Wolves see better in the dark than we do. Come with me and Mark tomorrow at dusk — he\'ll show you.', [{ k: 'choose', flag: 'path', value: 'show' }, opinion('hazel', 10), { k: 'release', slot: 'hazel' }], { next: 'h_show' }),
        opt('path_tell', 'I have to tell your mother and Mark. The guard needs the lights.', [{ k: 'choose', flag: 'path', value: 'tell' }, opinion('hazel', -20), opinion('mark', 5), stage(3), { k: 'release', slot: 'hazel' }], { next: 'h_tell' }),
      ],
    },
    h_together: { lines: [say('hazel', '…Will he shout?'), say('player', 'Not if I\'m there.')], options: [] },
    h_show: { lines: [say('hazel', 'Show me how?')], options: [] },
    h_tell: { lines: [say('hazel', '(quietly) I knew you would.')], options: [] },
    // Dusk scene (path = show).
    m_dusk: {
      lines: [
        say('mark', 'See the prints along the ditch? A fox, and that bigger one there — wolf. Now see where they go. All the way round the lit posts, not between them. They don\'t like the light. They don\'t like us, either.'),
        say('hazel', 'So the light keeps them out.'),
        say('mark', 'The light and me. I need both.'),
        say('hazel', '(after a while) Patch was in the dark bit. By the woodpile. The lamp was on the other side.'),
        say('mark', '(gently) Then the lamp wasn\'t what found him, was it.'),
      ],
      options: [opt('let_sink', 'Say nothing and let it sink in.', [stage(3), { k: 'release', slot: 'hazel' }, { k: 'release', slot: 'mark' }])],
    },
    // Stage 3 — Mark closes it.
    m_close: {
      lines: [
        say('mark', 'So it\'s you, little owl. Come here. No — I\'m not angry. Can you climb that post and take the lid off? Good. From now on, the post by your house is yours. You light it at dusk with your mother. Every night. Can you do that?', flag('path', 'together')),
        say('hazel', 'Every night.', flag('path', 'together')),
        say('mark', 'You know what the light\'s for now. Leave the lids on your mother\'s shelf.', flag('path', 'show')),
        say('hazel', 'Can I come again? To see the prints?', flag('path', 'show')),
        say('mark', 'Ask your father when he\'s home. He knows more than I do.', flag('path', 'show')),
        say('martha', 'She\'ll stay in at night until she understands.', flag('path', 'tell')),
        say('martha', '(to you, stiffly) Thank you for telling me first, at least.', flag('path', 'tell')),
      ],
      options: [
        opt('close_together', 'The lights are back.', [{ k: 'end', ending: 'together' }], { when: [flag('path', 'together')] }),
        opt('close_show', 'The lights are back.', [{ k: 'end', ending: 'show' }], { when: [flag('path', 'show')] }),
        opt('close_tell', 'The lights are back.', [{ k: 'end', ending: 'tell' }], { when: [flag('path', 'tell')] }),
      ],
    },
  },
  topics: [
    { slot: 'mark', node: 'm_open', label: 'The torch posts', when: [stageIs(0)] },
    { slot: 'mark', node: 'm_dusk', label: 'Wolf tracks at dusk', when: [flag('path', 'show'), stageIs(2), dusk, { k: 'near', of: 'hazel', slot: 'mark', r: 15 }] },
    { slot: 'mark', node: 'm_close', label: 'The lights', when: [stageIs(3)] },
    { slot: 'mark', node: 'm_wait', label: 'The torch posts', when: [stageGte(1), stageLt(3)] },
    { slot: 'martha', node: 'ma_morning', label: 'The soot on the stool', when: [flag('mode', 'morning'), stageIs(1), { k: 'flag', flag: 'lastSnuff', gte: 1 }] },
    { slot: 'hazel', node: 'h_confront', label: 'The torch cups', when: [stageIs(2), flag('path', 'unset')] },
  ],
  observations: [
    {
      id: 'watch',
      at: post,
      r: 12,
      dwellS: 40,
      when: [stageIs(1), flag('mode', 'watch'), { k: 'hour', night: true }],
      effects: [stage(2), { k: 'torch', anchor: post, lit: false }, { k: 'hold', slot: 'hazel', at: post, snap: true, untilHour: 6 }, message('A small shape climbs the torch post by the hunter\'s house. It is Hazel. Talk to her.')],
    },
    {
      id: 'alone',
      at: post,
      r: 12,
      dwellS: 40,
      when: [stageIs(1), flag('mode', 'alone'), { k: 'hour', night: true }, { k: 'sneaking' }],
      effects: [stage(2), { k: 'torch', anchor: post, lit: false }, { k: 'hold', slot: 'hazel', at: post, snap: true, untilHour: 6 }, message('A small shape climbs the torch post by the hunter\'s house. It is Hazel. Talk to her.')],
    },
  ],
  counters: [],
  rules: [
    { id: 'snuff', phase: 'both', once: 'day', when: [stageLt(2), { k: 'hour', from: 23, to: 24 }], effects: [{ k: 'torch', anchor: post, lit: false }, set('lastSnuff', 'today')] },
    // Every path ends without the player (review 014 #2): 9 days to find the culprit, 36 h to talk to her, 12 h to close.
    { id: 'markSolves', phase: 'both', when: [{ k: 'since', hours: 216, from: 'offered' }, stageLt(2)], effects: [{ k: 'end', ending: 'markSolved' }] },
    { id: 'markSolvesLate', when: [stageIs(2), { k: 'since', hours: 36, from: 'stage' }], effects: [{ k: 'end', ending: 'markSolved' }] },
    {
      id: 'autoClose',
      when: [stageIs(3), { k: 'since', hours: 12, from: 'stage' }],
      effects: [
        { k: 'if', when: [flag('path', 'together')], then: [{ k: 'end', ending: 'together' }] },
        { k: 'if', when: [flag('path', 'show')], then: [{ k: 'end', ending: 'show' }] },
        { k: 'if', when: [flag('path', 'tell')], then: [{ k: 'end', ending: 'tell' }] },
      ],
    },
    // The dusk scene does not depend on Mark's patrol: at dusk the quest calls him (and Hazel) to the post until 22:00.
    // When Mark is busy with another quest the hold is refused and the scene waits for the next dusk.
    {
      id: 'showScene',
      once: 'always',
      when: [flag('path', 'show'), stageIs(2), dusk],
      effects: [{ k: 'hold', slot: 'mark', at: post, untilHour: 22 }, { k: 'hold', slot: 'hazel', at: post, untilHour: 22 }],
    },
  ],
  endings: [
    {
      id: 'together',
      journal: 'Hazel told Mark herself, with you beside her. The post by her house is hers to light each dusk. Mark paid you 15 c for the lights.',
      effects: [pay15, { k: 'rep', delta: { helpfulness: 10, honesty: 5 }, reason: 'You brought the torches back' }, opinion('mark', 20), opinion('martha', 5)],
    },
    {
      id: 'show',
      journal: 'You showed Hazel what the light is for. The torches stay lit. Mark paid you 15 c for the lights.',
      effects: [pay15, { k: 'rep', delta: { helpfulness: 8 }, reason: 'You brought the torches back' }, opinion('mark', 15), opinion('martha', 10)],
    },
    {
      id: 'tell',
      journal: 'You told Martha and Mark. The torches stay lit and Hazel is kept indoors at night. Mark paid you 15 c for the lights.',
      effects: [pay15, { k: 'rep', delta: { honesty: 5 }, reason: 'You brought the torches back' }, opinion('mark', 5)],
    },
    {
      id: 'markSolved',
      journal: 'Mark caught the culprit himself and Martha keeps her indoors at night. The torches stay lit.',
      effects: [message('Mark solved the matter of the torch posts himself.', 'info')],
    },
  ],
  lapse: { journal: 'The matter of the torch posts was settled without you.', effects: [] },
}
