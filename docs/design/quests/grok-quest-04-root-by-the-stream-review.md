# Review — 04 Root by the Stream

> **Historyczne (sprzed przeróbki 2026-10-01).** Dotyczy wcześniejszej wersji scenariusza; nie jest dowodem jakości obecnej wersji. Aktualny rejestr: [REVIEW-2026-10-01](REVIEW-2026-10-01.md).

## Overall

The quest has a solid survival-sim premise: a time-limited request for ordinary resources, multiple acquisition routes, and a late-but-not-catastrophic outcome. It is useful as a tutorial for gathering, barter, travel, and reputation.

The current design is **too mechanically artificial in several places**. questTagged herbs, an exclusive source flag, and a global road lock even when the player stays in Domowice make the world behave like a quest system rather than a simulation.

## What works

- Two-day pressure is understandable without forcing a death timer.
- No scripted death is a good fit for an early quest.
- Gathering, barter, purchase, and theft are meaningfully different acquisition styles.
- Advance vs final payment is explicitly accounted for.
- The quest links naturally to Dobrawa and later herbal knowledge.
- Late delivery still matters without invalidating the whole quest.

## Major issues

### 1. Existing herbs should count if they are usable

The current rule says only units obtained after quest start count.

This is strongly gamey. If the player already owns fresh yarrow, mint, and chamomile, Dobrawa should not reject them because they predate the quest flag.

Better rule:
- any valid items in acceptable condition count;
- the quest tracks required quantities handed over, not origin timestamp;
- if freshness/quality matters, check those properties instead of quest provenance.

### 2. q04.source should not be exclusive

A player may reasonably gather yarrow, barter for mint, and buy chamomile.

Use either a sources-used set/list or no source state at all unless it is needed for dialog/reputation.

### 3. roadActive should not lock the entire quest

The player can complete the set through a local trade, yet accepting the quest immediately locks all other road quests.

Better:
- accepting q04 does not set roadActive;
- entering a long road/marsh expedition sets it if the mutex is genuinely needed;
- local acquisition does not reserve the road.

### 4. The timing text contradicts itself

The table says marsh ~0.5 day and Brzeżyna ~1 day road, while world truth says buying in Brzeżyna is faster on foot.

Either make marsh gathering uncertain/longer while Brzeżyna purchase is guaranteed, or say buying is **easier/more reliable**, not faster.

### 5. The shepherd conveniently possessing the full herb set is contrived

A shepherd trading all five required herb units for one rope or one milk is mechanically convenient but narratively weak.

Better:
- shepherd knows where mint grows and can trade one component;
- another local NPC has dried chamomile;
- marsh provides the rest.

This encourages mixed sourcing naturally.

### 6. Advance/reward rules are overcomplicated

Simpler:
- promised reward = 30 copper;
- if advance 15 taken, final on-time payment = 15;
- late total reward = 15, so final late payment = max(0, 15 - advance);
- alternative item reward is offered only if no advance was taken.

No special "return advance first" interaction is needed unless it has narrative value.

### 7. Frame the illness treatment as Dobrawa's belief

The quest can remain grounded without presenting the exact herb mix as objective medical truth.

Prefer:

> Dobrawa believes the herbs will ease his fever and breathing.

## Dialog review

### Dobrawa opening

Suggested:

> **Dobrawa:** "Maciej's fever is worse this morning. I'm short on yarrow, mint, and chamomile. I can stay with him, or I can go gathering — not both. Can you bring me the herbs by the end of tomorrow?"

This explains why she needs the player.

### Terms

Suggested:

> **Dobrawa:** "Two yarrow, two mint, one chamomile. Fresh or properly dried is fine. The stream marsh usually has all three."

Options:
- "I'll bring them."
- "I need half the payment now."
- "When this is over, show me how you use them."

### Shepherd

Suggested:

> **Shepherd:** "Mint grows thick below the old footbridge. I've got some dried chamomile here if you need it. Trade me a skin of milk and it's yours."

### Marsh discovery

Suggested:

> The bank is wet enough for mint. Yarrow grows higher in the grass, and a patch of chamomile survives where the ground dries. There is enough here, but gathering it carefully will take time.

### Delivery

Suggested on-time:

> **Dobrawa:** "Let me see. Yarrow, mint... good. Chamomile too. That's everything."

Suggested late:

> **Dobrawa:** "You're late, but I can still use these. Maciej had a rough night. Give them here."

No need to say "Maciej still lives"; the design already guarantees that.

## Failure design

"Incomplete after deadline" should not necessarily hard-fail instantly if the player is standing in front of Dobrawa with four of five units.

Consider:
- Dobrawa accepts useful partial herbs;
- quest fails as a contract but relation penalty is smaller;
- she sources the missing ingredient herself/NPC simulation does.

## Recommended revision direction

Make the quest operate on **real inventory and travel state**, not quest-specific copies of the same world objects. It can then become an excellent example of SeedVales' intended principle: authored narrative that still respects the simulated world.
