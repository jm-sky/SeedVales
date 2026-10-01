# Review — 07 Trail of Siwy

> **Historyczne (sprzed przeróbki 2026-10-01).** Dotyczy wcześniejszej wersji scenariusza; nie jest dowodem jakości obecnej wersji. Aktualny rejestr: [REVIEW-2026-10-01](REVIEW-2026-10-01.md).

## Overall

The quest has a good survival/hunting skeleton and fits the project better than a generic "kill N wolves" task. A named animal, identifiable signs, optional hunter assistance, and a non-lethal solution are all useful.

The main problems are **identity evidence, the poison branch, and under-specified resolution mechanics**. The quest currently says Siwy is a specific wolf but does not give the player strong enough clues to distinguish him from another large grey wolf.

## What works

- A named recurring animal threat is more memorable than a generic pack.
- One-shot assistance avoids requiring the full companion system.
- Fight, trap, and drive-off methods support different skills/play styles.
- Non-lethal resolution is present.
- The Szarik connection is restrained rather than turning into a melodramatic revenge plot.
- The den gives the hunt a concrete spatial objective.

## Major issues

### 1. Give Siwy an identifiable physical signature

Current clues include grey fur, a heavy trail, and a deeper howl. None proves the same individual wolf is responsible.

Give Siwy one persistent trait visible in tracks/model, for example:
- missing toe on the left forepaw;
- old scar over one flank;
- unusually pale shoulder patch;
- damaged ear.

Then clues can converge:

- Wojciech finds a four-paw track with the same missing toe.
- player sees the distinctive print on the trail.
- fur/color at the den matches.

Now "Siwy" is an individual the player can actually identify.

### 2. The poison branch has no acquisition step

The gate checks:
- q04 completed;
- Dobrawa relation ≥10;
- q04 not active.

But where does the poison come from?

Completion of an herb quest should not silently materialize poison knowledge or bait.

If poison remains:
- player must talk to Dobrawa;
- she must agree or refuse based on relation/personality;
- she provides or teaches preparation of a specific item;
- ingredients/cost/time are defined;
- risks to scavengers/domestic animals are acknowledged.

That is especially important in a simulation-focused game.

### 3. Dobrawa's role needs characterization

A trusted herbalist may reasonably know toxic plants, but it does not follow that she willingly provides poison for a wolf.

Give her a position:
- she reluctantly provides it only if attacks are severe;
- she refuses indiscriminate bait and suggests a controlled dose near the den;
- or the player must acquire poison elsewhere.

This creates actual narrative content instead of using relation ≥10 as a vending-machine gate.

### 4. Jarosław's poison penalty can be applied multiple times

The document mentions Jarosław−15:
- when poison is unlocked if he later learns;
- at den resolution;
- at closing;
- in the reward table.

This is ambiguous and risks stacking the same consequence several times.

Define exactly one rule:

> If method=P and Jarosław learns the truth, apply Jarosław−15 once at close.

### 5. Trap outcome is unclear

"Trapped clean" plus grey_pelt implies a lethal trap, but "trap" can also mean capture/restraint.

Specify:
- lethal snare/deadfall → pelt;
- capture trap → player must decide kill/release/relocate;
- if v1 only supports lethal traps, say so plainly.

### 6. Fight/trap success is too automatic

The quest lists methods but not meaningful failure/retreat states.

For grounded gameplay:
- combat can fail and player can flee;
- trap may fail if poorly placed;
- assist can improve odds;
- failed first attempt should not necessarily destroy the quest.

A simple fail-forward model is enough:
- Siwy escapes;
- player can retry after a cooldown;
- relation/reward changes only if the player causes extra risk.

### 7. Non-lethal drive-off is temporary, so the world should remember that

Current N says Siwy leaves "for a season" but the quest becomes done.

That is fine if the completion text is explicit:
- immediate threat resolved;
- Siwy gets a return-after-season world flag;
- future encounter may happen elsewhere or near Domowice.

This is a good place to demonstrate persistent simulation state.

## Dialog review

### Jarosław opening

Suggested:

> **Jarosław:** "The grey wolf is back. Siwy. Same damaged forepaw, same trail around the sheep pens. We scare off the smaller ones and he comes back alone. Help me find where he's bedding down."

This immediately explains how Jarosław knows it is the same wolf.

### Wojciech clue

Suggested:

> **Wojciech:** "Grey fur on the post, and look here — left forepaw print. One toe doesn't touch the mud. Jarosław showed me the same mark last week."

Now it is real evidence.

### Jarosław after clues

Current menu-like line can be simpler:

> **Jarosław:** "That's enough. We know the trail and we know the den. I can come with you at dawn, or you can handle it alone. How do you want to do this?"

Then method-specific options follow.

### Non-lethal option

> "We'll make the den unusable and drive him away with fire and noise. If he moves on, that's enough for me."

Jarosław can respond according to his values rather than the narrator declaring the solution.

### Closing

Current:

> "Is Siwy meat, trapped, gone to another valley — or did someone salt the quiet way?"

Too literary.

Suggested:

> **Jarosław:** "You found him?"
>
> Player answers with the actual outcome.

For example:

> "Dead. The track matches."
>
> "Trap worked."
>
> "I drove him off. He left the valley trail."
>
> "I used poison." / "He's dead." if hiding the method.

The last option can create an honesty consequence if the player lies.

## Recommended revision direction

Make the hunt about **recognizing one animal**, not simply following generic wolf markers. Then make each method exist physically in the world: weapon, trap, fire/noise, or an actually acquired poison item.

The quest will become much stronger once its investigation and resolution use the same simulation rules as ordinary animals.
