# Review — 03 Night Torches

> **Historical (before the 2026-10-01 rework).** Refers to an earlier version of the scenario and uses old (Polish) character names; it is not evidence of the current version's quality. Current log: [REVIEW-2026-10-01](REVIEW-2026-10-01.md); name mapping: [QUEST-WORLD](QUEST-WORLD.md#cast).

## Overall

This is one of the stronger concepts in the pack. The cause is human, small-scale, emotionally understandable, and directly tied to a simulation-visible object: torches going dark. Hazel Bowman is not evil or foolish; she is frightened after losing Patch.

The main improvements should be **tone, child dialog, and consequence design**. The extortion path is disproportionately ugly compared with the rest of the quest, and some lines explain mechanics rather than sounding like people.

## What works

- Strong local mystery with a simple reveal.
- Good reuse of Mark Hornblower and the Patch soft-link.
- No combat is required.
- Morning/night approaches give replayable flavor without changing the whole quest.
- Empathy and teaching are meaningfully distinct.
- Hazel's motive is understandable and not a conspiracy twist.

## Major issues

### 1. The extortion path is tonally out of scale

Threatening a mother for money to hide her frightened child's behavior is much darker than the rest of the quest. It shifts the player from "help solve a village problem" to "blackmail a vulnerable family."

Recommendation for v1: **remove it**.

If retained:
- require a deliberate intimidation action;
- make Mark able to discover it later;
- do not treat the quest as cleanly completed;
- do not reward it structurally like a normal solution.

### 2. Avoid making a questionable wildlife claim the core lesson

Current:

> "A wolf sees in the dark anyway. Light bothers it more than it bothers us."

The quest does not need a biological absolute. What Hazel needs to understand is that darkness makes **the guard** less able to protect the village.

Better:

> "The wolves already smell the animals and hearths. Putting out the torch doesn't hide the village. It only makes it harder for Mark to see what's coming."

### 3. The report path should not humiliate Hazel publicly

The table calls it **Public report**, while the dialog only says "I'll tell the guard myself."

A child making a fear-driven mistake does not need a public-shaming branch. A stern/private report to Mark is enough to create a colder outcome.

Rename it to **strict report**.

### 4. "Shortens gaps between torches" is unclear

Define the world change mechanically. A grounded result would be:

> Mark adds one extra torch near Martha Bowman's house and checks the line twice per night.

That is observable and easy to implement.

### 5. The quest should explicitly resolve Hazel's behavior

Each clean path should say why she stops:

- empathy: she agrees to stop and walks the first check with Mark;
- teach: Mark demonstrates how the watch uses light;
- strict report: Martha keeps her indoors at night for several days.

## Dialog review

### Mark opening

Suggested:

> **Mark:** "Three nights now, the same torches go dark before midnight. I relight them and an hour later they're out again. Help me catch whoever's doing it, and keep it quiet until we know why."

### Martha, morning route

Suggested:

> **Martha:** "That's Hazel's stool. And those little soot marks are hers. She hasn't slept well since Patch died. If you talk to her, don't make her more afraid than she already is."

### Hazel reveal

Current is evocative but a little writerly for a child.

Suggested:

> **Hazel:** "I thought the torches showed the wolves where we are. If it's dark, maybe they pass us by. Patch went outside when the lights were on... and he never came back."

### Teach response

> "The wolves already know people and animals live here. The light helps Mark see them first. Come with me — he can show you how the watch works."

### Empathy response

> "You were trying to keep everyone safe. I understand. But putting out the lights makes the watch harder. Come with me and we'll tell Mark together."

### Mark close

Current is too stylized.

Suggested:

> **Mark:** "All right. What happened, and do I need to change tonight's watch?"

## Reward/consequence suggestion

A cleaner set:

- **Empathy:** Hazel stops; one extra torch/check near the house; strong relation gain.
- **Teach:** Hazel stops and later helps with a safe daytime watch task; moderate relation + honesty/helpfulness.
- **Strict report:** Hazel stops because Martha/Mark restrict her night access; less relation, modest honesty reward.
- **Dirty intimidation (if retained):** temporary silence only; problem can recur; reputation risk.

The treasury can reasonably pay because this is a village-watch problem, but payout differences should be smaller than social differences.

## Recommended revision direction

Preserve the core exactly: **mystery → frightened child → choose how to correct the situation**. Remove or de-emphasize the blackmail branch and make the emotional resolution as concrete as the torch-system resolution.
