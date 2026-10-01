# Review — 02 Rusty Debt

> **Historical (before the 2026-10-01 rework).** Refers to an earlier version of the scenario and uses old (Polish) character names; it is not evidence of the current version's quality. Current log: [REVIEW-2026-10-01](REVIEW-2026-10-01.md); name mapping: [QUEST-WORLD](QUEST-WORLD.md#cast).

## Overall

The premise is promising: a blacksmith, a customer, an escrowed payment, and a quality dispute can produce a grounded economic quest with no combat. This fits SeedVales very well.

The current version needs a **logic/economy rewrite before dialog polish**. Several branches move money in ways that are hard to justify in-world, especially the reeve personally covering Bernard Smith's price, the player subsidizing the settlement with grain, and the treasury fallback on Bernard's private reward.

## What works

- The dispute is about an ordinary but important object: a plowshare.
- Bernard can be both partly right and partly opportunistic; that is good moral texture.
- The farmer having already committed money prevents a trivial "just ask him to pay" solution.
- Anna's market-price hint is a useful optional piece of social evidence.
- Returning the plowshare is a valid non-cash outcome.
- No human violence is necessary.

## Major issues

### 1. Why is a private purchase paid through treasury_brzezyna?

The quest needs one explicit sentence establishing the institution.

For example:

> Large cross-village orders are settled through the buyer's village chest so travelling craftsmen do not need to chase individual households for payment.

Or make this particular order a village purchase for a communal plow/team.

Without that rule, the reeve appears to have arbitrarily taken control of a farmer's private debt.

### 2. The agreed price and deposited amount are internally muddy

World truth says Bernard demanded 40, farmer paid 35, and the reeve blocks payout over quality.

If 40 was the agreed price, the farmer is already 5 short. If 35 was the actual agreed amount, Bernard's claim of 40 is inflated.

Recommended version:

- Bernard quoted **40** orally.
- farmer disputed the finished quality and deposited **35** as the amount he considers fair.
- the reeve holds the 35 pending settlement.

Now the conflict is coherent: **price vs workmanship**, not three unrelated numbers.

### 3. Deal B should not come from the reeve's personal purse

Current:

> treasury 35 + soltys_purse 5 → Bernard

There is no convincing reason the village head should personally pay the disputed 5 copper.

Better options:

- persuade the farmer to add 5 from farmer_purse;
- persuade Bernard to accept 35;
- prove the plowshare meets the promised quality and make the buyer cover the last 5;
- have Domowice/Bernard voluntarily absorb part of the difference.

### 4. Deal R must settle the 35 copper already in escrow

If the plowshare returns to Bernard, the farmer's 35 should explicitly return to the farmer. Otherwise Brzeżyna keeps the farmer's money while Bernard gets the item back.

This is a significant conservation bug.

### 5. Deal S is difficult to explain

Current:

> 25 copper from treasury + player gives grain×6 to Bernard

Why does a blacksmith accept grain from the mediator to resolve a workmanship dispute? Why should the player personally subsidize either party?

A stronger fourth path would connect to the disputed object itself.

Suggested replacement: **repair settlement**
- 25 copper released now;
- Bernard repairs/reworks the plowshare;
- remaining 10 released after acceptance.

### 6. Player rewards should not fall back to treasury_home without an explicit public reason

Bernard hired the player. If his purse cannot cover a promised tip, the village treasury should not silently pay the difference.

Prefer partial payment from Bernard, a craft/service reward, or an explicit public bounty only if Domowice formally sponsors debt recovery.

## Evidence should affect outcomes

At the moment, ledger and farmer testimony mostly unlock the same deal menu.

Consider three evidence categories:

- **Contract evidence:** what price was actually agreed.
- **Payment evidence:** how much reached escrow.
- **Quality evidence:** whether the plowshare is defective or merely below Bernard's claimed premium quality.

A simple inspection by the player with smithing/trade skill, or a neutral experienced farmer opinion, would make verdicts feel earned.

## Dialog review

### Bernard opening

Suggested:

> **Bernard:** "I made a plowshare for a farmer in Brzeżyna. Forty copper was the price. He put thirty-five in their village chest, then complained about the iron and froze the payment. I want a fair settlement — coin or my work back."

### Anna hint

Suggested:

> **Anna:** "Bernard makes good iron, but forty is a proud price for that share. Thirty, maybe thirty-five, is what I'd expect."

### Farmer

Suggested:

> **Farmer:** "I put thirty-five in the chest. The share works, but not like a forty-copper piece. I'm not paying twice, and I'm not paying full price for work I disputed the day it arrived."

### Reeve

Current deal dialog reads like a menu.

Suggested:

> **Reeve:** "The chest holds thirty-five. I can release it, return it, or record a new settlement if both sides can live with it. What are you proposing?"

### Bernard return

Suggested:

> **Bernard:** "You came back. Good. What did they agree to?"

Shorter and more natural.

## Recommended revision direction

Make the quest about three questions:

1. What was promised?
2. Was the work worth that promise?
3. Where should the already-deposited 35 copper go?

Every ending should reconcile both **money and ownership of the plowshare**. If those ledgers balance, the quest will feel unusually grounded and strong.
