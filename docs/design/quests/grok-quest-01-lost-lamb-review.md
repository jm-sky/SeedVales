# Review — 01 Lost Lamb

> **Historical (before the 2026-10-01 rework).** Refers to an earlier version of the scenario and uses old (Polish) character names; it is not evidence of the current version's quality. Current log: [REVIEW-2026-10-01](REVIEW-2026-10-01.md); name mapping: [QUEST-WORLD](QUEST-WORLD.md#cast).

## Overall

The quest has a strong starter-quest core: a small local problem, a readable physical clue (the latch), one witness, one identifiable animal, and several ways to recover it. The structure is easy to implement and fits SeedVales better than a large scripted mystery.

The current version still needs a **substantive narrative pass**. The main issue is not prose polish but plausibility: Piers Walker behaves like a quest exposition device rather than a person, and the Wanda branch does not follow naturally from the player's goal.

## What works

- The problem is grounded and understandable immediately.
- The brass bell is a good persistent identifying detail.
- "A wolf did it" as a mistaken first hypothesis connects investigation to Survival without making the quest supernatural.
- Molly Lambert's certainty about the undamaged latch gives her a clear voice and makes her competent rather than passive.
- Mark Hornblower is used economically as a witness without taking over the quest.
- The quest can teach that observations, NPC testimony, relations, and skills can all unlock solutions.

## Major issues

### 1. Piers effectively confesses before the confrontation starts

Current line:

> "Pretty brass bell — sounds like a shepherd's pet. Maybe Molly's lamb Pip followed me. Twenty-two copper and she's yours without a fuss."

This is too explicit. A thief who knows the lamb's owner, name, identifying bell, and then demands money to return it has already admitted almost everything. Evidence stops mattering.

Piers should begin with a defensible story and only lose ground when the player presents evidence.

Better structure:

- Piers claims he found a stray lamb near the road.
- He says he fed it / kept it safe and wants a modest finder fee.
- The latch proves the lamb did not simply wander out.
- The witness places Piers near Domowice at the right time.
- Inspecting the bell confirms identity.
- With enough evidence, the player can make him return Pip without payment.
- A low-evidence player can still buy the lamb back, but the payment feels like an expedient compromise rather than openly paying a thief's ransom.

### 2. The evidence system is present mechanically but not dramatic enough

The quest says "gather a lead," but almost any single lead is enough to reach the same confrontation. The best solution should feel earned.

Suggested distinction:

- **Bell only:** proves identity, not theft.
- **Latch:** proves Pip was deliberately let out.
- **Witness:** places Piers near the pen/road at dawn.
- **Track:** connects the route from the pen toward Piers.

Then let combinations change the conversation:

- 1 clue: Piers can plausibly deny theft.
- 2 clues: pressure / persuasion solution.
- 3 clues: clean exposure; Piers gives Pip back and leaves.

### 3. The Wanda branch should be removed or fundamentally rewritten

The player has recovered **Pip** specifically, identified by a brass bell. Walking that lamb for a full day to Wanda, then accidentally giving her "the wrong animal," is not a natural continuation of the quest.

It also creates a large travel branch that is disproportionate to a starter quest and consumes roadActive for little narrative payoff.

Recommendation: **cut the branch in v1**.

If Wanda must remain, give her a clear reason to exist. For example, Piers claims the lamb belongs to Wanda, creating an optional verification trip **before** the player has positively identified Pip. That would turn Wanda into evidence rather than an arbitrary delivery destination.

### 4. Weak Survival currently tells the player the correct answer while setting the wrong conclusion

The discovery text already reveals hare carrion and an undamaged latch, then offers a weak-Survival interpretation of a wolf drag. The narration has already solved the check.

Use separate observations.

**Strong Survival**

> The marks cross instead of running in a straight drag. Hare fur is caught in the mud, not lamb's wool. Whatever happened here, a wolf did not pull Pip through this gate.

**Weak Survival**

> Claw-like marks cut through the mud beside a scrap of fur. In the half-light, it could be a predator's trail.

### 5. "Forced" should not automatically mean dishonesty

If the player has proved Piers stole Pip, taking the stolen animal back is not equivalent to stealing it.

Split this into clearer behaviors:

- compel return after proof → courage/relation consequence, perhaps no honesty penalty;
- sneak Pip away without establishing the truth → possible honesty penalty;
- attacking Piers should not be needed.

### 6. Treasury fallback for Molly's private advance/reward needs justification

Molly losing a lamb is primarily a private problem. treasury_home silently covering her purse makes the economy feel game-authored rather than simulated.

Either pay only what Molly can afford, have Molly explicitly say the village agreed to contribute because livestock theft threatens everyone, or reserve treasury support for a formally recognized village theft problem.

## Dialog review

### Molly opening

Suggested:

> **Molly:** "Pip's missing. The little ewe with the brass bell. Her gate was shut last night and open before dawn. If you can find her, please do it before whoever took her gets far."

Player:
- "Show me the gate."
- "Did anyone hear the bell?"
- "I can look, but I want ten copper up front."

### Mark witness

Suggested:

> **Mark:** "I saw a stranger take the east road before sunrise. Thin fellow, travel pack, walking slowly like he had something following him. I didn't think much of it then."

### Piers confrontation

Suggested base line:

> **Piers:** "If you're after the lamb, I found her wandering near the road. Fed her, kept her out of the woods. If she's yours, prove it."

Evidence options:
- "Brass bell, worn through on the left side. Molly described it before I saw the lamb."
- "She didn't wander out. Her latch was opened, and you were seen leaving before sunrise."
- "I don't have time for this. Name a fair finder fee."
- "I'll check your story before I take her."

If exposed:

> **Piers:** "All right. Take the lamb. I don't need a village guard remembering my face."

### Molly successful close

Suggested:

> **Molly:** "That's Pip. I'd know that bell anywhere. Good work. Tell me where you found her."

This naturally opens a short final choice about whether the player tells the full truth about Piers.

## Recommended revision direction

Keep the quest small:

1. Molly reports Pip missing.
2. Player gathers 1–3 clues.
3. Player finds Piers and resolves the ownership/theft dispute.
4. Player returns Pip.
5. Consequences depend on how convincingly and how cleanly the player handled Piers.

That is enough for a very good starter quest. The current Wanda detour and artificial "wrong lamb" failure make the quest larger but not better.
