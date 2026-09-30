# Review — 06 Trader's Letter

## Overall

This is a strong type of quest for SeedVales: no combat, a physical object with state, a meaningful temptation to inspect it, and economic consequences that persist after the conversation.

The current version needs a **significant rewrite of character logic and branch causality**. The largest problem is path W: Janko is described as the cartel partner and intended recipient, so "warning Janko" about the proposal he is supposed to receive does not logically kill the cartel.

## What works

- Sealed/opened letter state is a good physical mechanic.
- The player can honor, inspect, expose, or redirect confidential information.
- Grain prices create a world consequence instead of only relation numbers.
- Stanisław paying cartel courier money from his own purse is correct and important.
- The one-day rumor delay is a useful delayed consequence.
- The quest gives the trader profession real social/economic texture.

## Major issues

### 1. Path W does not currently make sense

World truth says Janko is the cartel partner. The letter proposes the cartel to Janko.

Then path W is:

> open and warn Janko → cartel dies

Warn him about what? He is the person being invited to the deal and will read the same proposal moments later.

There are two good fixes.

**Option A — make Janko a prospective partner, not an existing one**
- Stanisław hopes Janko will agree.
- The player can privately show Janko the contents first and persuade him to refuse.
- This cleanly kills the deal.

**Option B — change W into warning the Brzeżyna sołtys**
- then N can be a public denunciation while W is a quiet warning.

Option A preserves Janko as the central counterpart and is probably cleaner.

### 2. Stanisław should not knowingly entrust the letter to someone who says they may open it

Current intent option:

> "I reserve the right to open it..."

A trader arranging illicit price coordination would not reasonably hand over the letter after that statement.

Better:
- acceptance is neutral;
- the player makes the open/keep-sealed decision privately on the road;
- intent can be inferred from action, not announced to the quest giver.

If an intent flag is mechanically useful, set it through subtler dialog:
- "You can trust me." → loyal expectation.
- "Forty copper buys delivery, not questions." → transactional expectation.

Neither explicitly threatens to break the seal.

### 3. Several Stanisław lines are too stylized

Examples:
- "The seal is for fools and for the loyal."
- "don't come back wearing a face you can't afford."
- "Business isn't theft — it's breathing in the same rhythm."

These sound authored rather than spoken by a working trader.

Stanisław can be sharp without speaking in aphorisms every time.

### 4. The letter is unrealistically incriminating

Current:

> "Hold grain asking-price for one season. Split the cream. Burn this after reading."

It reads like a villain note written for evidence.

A more believable letter can still be clear:

> "Do not undercut six copper a sack before the autumn fair. I will hold the same price in Domowice. If we both keep the line, neither market loses margin."

That is enough for the player to understand price coordination without a cartoon confession.

### 5. Path S contains an impossible/unclear rumor rule

The outcome table for sealed delivery mentions honesty loss:

> after rumor ≥1d if opening is later proven

But in path S the letter is sealed. If it was actually opened, it should be path O.

Keep state strict:
- S = genuinely sealed at handoff.
- O = seal broken/opened.
- rumor consequences apply only to O unless another actor later opens the sealed letter normally.

### 6. Why does Janko pay the player on W?

Current W payout includes 15 copper from janko_purse plus an optional treasury reward.

If Janko is persuaded to reject the scheme, a small payment can work only if motivated:
- he pays for useful warning/information;
- or he does not pay, but relation rises.

Do not pay simply because each branch needs money.

Likewise treasury_brzezyna should only pay if the sołtys learns of the attempted scheme and explicitly rewards the evidence.

### 7. Economic consequences should be slightly more concrete

priceMod.grain is useful, but add one sentence of player-visible meaning:

- grain buy price rises for one season;
- NPC households/traders may complain;
- trader margins improve;
- reputation effects can appear when the arrangement becomes known.

That makes the moral/economic choice legible.

## Dialog review

### Stanisław opening

Suggested:

> **Stanisław:** "I need a letter taken to Janko in Brzeżyna. Sealed. Put it in his hand and come back to me. Forty copper when it's done."

Player:
- "What's the letter about?"
- "Forty, from your purse?"
- "I'll carry it."
- "Find another courier."

If asked:

> **Stanisław:** "Grain business. The kind that stops being business if the whole square reads it."

### Letter text

Suggested:

> "Janko — hold grain at no less than six copper a sack until the autumn fair. I will do the same in Domowice. If neither of us undercuts, both markets keep their margin. — S."

Clear, plausible, incriminating enough.

### Janko, sealed

Suggested:

> **Janko:** "From Stanisław? Give it here. Seal looks untouched."

### Janko, opened

> **Janko:** "The wax is broken. Did you read it?"

Possible player responses:
- "Yes. I wanted to know what I was carrying."
- "Yes, and you should refuse it."
- "The seal broke on the road." — lie, with honesty consequence if exposed.

This is much stronger than "curiosity itch."

### Janko rejection path

If Janko is a prospective partner:

> **Janko:** "He wants us to hold the same price and squeeze both villages. No. Tell him I sell my grain at my price."

Then the player can choose whether to report that faithfully.

### Stanisław return

Sealed:

> **Stanisław:** "Janko has it?"
>
> Player: "In his hand, seal intact."
>
> **Stanisław:** "Good. Forty, as promised."

Exposed/rejected:

> **Stanisław:** "You opened my letter and killed the deal."
>
> Player: "I carried it. I never promised to help you raise everyone's grain price."

Plain conflict is stronger than metaphor here.

## Recommended revision direction

The best version is:

1. Stanisław hires a courier without explaining the real proposal.
2. Player may open the letter privately.
3. Sealed delivery lets Janko decide normally.
4. Opened delivery creates distrust.
5. Player can persuade Janko to reject the scheme or take the letter to a sołtys.
6. Consequences change grain prices and trader relations.

That gives every branch a clear cause and keeps the moral choice grounded in information, trust, and economics.
