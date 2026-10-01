# Review — 08 Well and Rumor

> **Historical (before the 2026-10-01 rework).** Refers to an earlier version of the scenario and uses old (Polish) character names; it is not evidence of the current version's quality. Current log: [REVIEW-2026-10-01](REVIEW-2026-10-01.md); name mapping: [QUEST-WORLD](QUEST-WORLD.md#cast).

## Overall

This is one of the best high-level premises in the set. A health scare, rumor pressure, a mundane real cause, and the possibility of damaging inter-settlement trade all fit the grounded simulation direction.

The quest needs a **careful evidence and branch rewrite**. The truth path is strong, but the current proof relies too much on "smells clean," the mediation stance assumes Tom Lambert is at fault before evidence exists, and the dirty branches contain payouts and actions that are not causally explained.

## What works

- The apparent crisis is socially larger than the actual cause.
- The well is an important village system, so the rumor matters.
- Multiple sick NPCs create visible world state.
- Dora Herbert is used naturally as someone who can compare symptoms and sources.
- The false Brzeżyna theory can create persistent trade friction.
- A quiet mediation outcome is meaningfully different from public blame.
- No combat is needed.

## Major issues

### 1. Define exactly what spoiled

The document alternates between "barrel of food/drink," "shared barrel," and Tom's "sour beer."

Choose one concrete thing.

Suggested world truth:

> Tom left a communal barrel of weak ale poorly sealed in warm weather. Several households drank from it after drawing water normally from the well.

This creates a specific object the player can inspect and a plausible reason multiple households share exposure.

### 2. Clean smell is not enough to prove the well is safe

Current proof:

> "Well water ladles clean."

A contaminated well can look and smell normal. The game does not need laboratory science, but the deduction should rest on stronger comparative evidence.

Use a simple exposure pattern:

- every sick person drank from Tom's barrel;
- several people who drank from the well but not the barrel are healthy;
- the barrel is visibly/sensibly spoiled;
- illness started after the barrel was opened/shared.

Dora can state:

> "I can't prove the well safe by smell. But the sick all drank from that barrel, and the households using only well water are fine."

That is much more grounded.

### 3. stance=mediate prejudges Tom before investigation

Current stance option:

> "Tom apologizes — or he carries buckets for a week."

At this point the player does not know Tom caused anything.

Replace stance with an **investigation approach**, for example:

- quiet facts;
- public warning around the well;
- suspicion toward Brzeżyna.

Mediation should unlock after proof shows Tom's negligence.

### 4. The frame path is too vague

Current action:

> "Plant something that points at Brzeżyna."

What object? Where does it come from? Why would anyone believe it?

For a simulation-driven game, fabricated evidence must be a real item/action or the path should be removed.

Recommendation for v1: **remove the forged-evidence path**. The "accuse without proof" cold-war path already provides a dishonest/irresponsible choice without inventing an entire evidence-forgery subsystem.

If frame remains, define:
- the item;
- how player obtains it;
- where it is planted;
- who inspects it;
- how it can later be exposed.

### 5. The cold-path payout from Tom makes no sense

Current:

> proof=none + accuse → from: tomasz_purse 10

Why would Tom pay the player for falsely blaming Brzeżyna?

Remove this payout unless there is an explicit scene in which he pays for silence or for redirecting blame. That would be a much darker quest and should be written deliberately, not implied by a reward table.

### 6. Accusing Brzeżyna after discovering the barrel should be treated as deliberate scapegoating

The branch is valid, but consequences should be sharper and clearer:
- Ralph Fieldman should object if he knows the barrel evidence;
- no normal village reward;
- honesty hit;
- Tom's reaction depends on whether the lie shields him or makes the situation worse;
- tradeFriction starts.

This is different from a mistaken accusation made before evidence exists.

### 7. Public truth should not automatically make Tom hate the player by −20

If the player accurately says "bad lid, not poison," the response depends on whether Tom is publicly shamed.

Split:
- factual public announcement → modest Tom negative;
- humiliating blame → larger negative;
- quiet mediation → neutral/positive.

That gives the player a real social choice.

## Better investigation structure

A clean sequence:

1. Ralph asks the player to stop panic and find the common factor.
2. Interview sick households.
3. Compare with healthy households.
4. Inspect the well and Tom's barrel.
5. Ask Dora for an interpretation.
6. Return with one of:
   - strong barrel evidence;
   - insufficient evidence;
   - irresponsible accusation.

This feels like an investigation rather than a flag menu.

## Dialog review

### Ralph opening

Suggested:

> **Ralph:** "Three people are sick and now half the square says the well is poisoned. Some are already blaming Brzeżyna. I need facts before somebody turns a bad stomach into a village feud. Can you look into it?"

This is direct and establishes stakes.

### Investigation approach

Suggested:

> **Ralph:** "Start with the sick households. Find out what they shared before we close the well or accuse anyone."

Player:
- "I'll keep it quiet until I know more."
- "We should warn people not to use the well until we're sure."
- "If I find anything pointing to Brzeżyna, I'll bring it back."

No premature Tom punishment.

### Sick villager

Suggested:

> **Villager:** "I drank from Tom's barrel after supper. My wife did too. We were both sick by morning. The children drank well water and they're fine."

This gives useful comparative evidence.

### Dora

Suggested:

> **Dora:** "I can't clear a well by smell alone. But everyone sick drank from the same barrel, and people using the well without that drink are fine. Check the barrel before you blame the water."

### Tom

Suggested:

> **Tom:** "The lid sat loose yesterday. I should've thrown the rest out when it turned sour. That's on me. But I didn't poison anyone, and Brzeżyna had nothing to do with it."

This makes him culpable for negligence without making him malicious.

### Ralph final — truth

Suggested:

> **Ralph:** "So?"
>
> **Player:** "The well isn't the common source. The sick households all drank from Tom's spoiled barrel. We should empty it, clean the vessels, and tell the square before the rumor grows."

### Mediation

> **Player:** "The barrel spoiled. Tom admits the bad lid. Let him replace what was lost and keep this from becoming a public hanging."

This is clearer than "Tom withdraws without public shame."

## Recommended revision direction

Keep the quest focused on **how rumor outruns evidence**. The strongest moral tension is already there:

- investigate carefully;
- announce a cautious interim warning;
- accuse a neighboring settlement too early;
- or knowingly scapegoat them after learning the truth.

You do not need vague planted evidence or arbitrary hush-money rewards. The social consequences are enough.
