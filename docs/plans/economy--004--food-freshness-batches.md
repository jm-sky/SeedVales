# Food freshness batches and oldest-first use

**Status:** planned  
**Model:** opus — freshness/stack semantics; sonnet — implementation and tests  
**Domain:** economy  
**Sub domains:** food, inventory, cooking, inns, households, trade, survival  
**Roadmap:** depends on `items--001`; prerequisite for freshness-aware parts of `economy--003`  
**Created:** 2026-10-03  
**Finished:** —

---

## Goal

Preserve the real freshness of food batches.

The player, NPCs, inns and households must be able to own old food that is close to spoiling and fresh food of the same type at the same time. Acquiring fresh food must never rejuvenate old food, and acquiring old food must never age fresh food.

Recon is against `main` commit **53ffebe06da719df4bfdbcb14dd4901fd78a9a69**.

## Current main problem

Food definitions are stackable and `newStack()` initializes `fresh` from `FoodStats.spoilH`.

`canMerge()` does not include freshness. `addItem()` therefore merges otherwise-compatible food and replaces freshness with a weighted average:

`(oldFresh * oldQty + newFresh * newQty) / totalQty`.

Example: one raw meat with 2 h remaining plus one fresh raw meat with 18 h remaining becomes two units with 10 h remaining. The old meat is artificially refreshed and the new meat artificially aged.

D-FOOD-3 currently documents weighted-average freshness within a species. This plan intentionally supersedes that part of D-FOOD-3.

## Required behavior

### 1. Freshness is batch state

Food with materially different freshness stays in separate stacks.

Example inventory:

- Raw meat (deer) ×3 — ~4 h remaining;
- Raw meat (deer) ×2 — ~17 h remaining.

Species, quality/material where applicable, and freshness compatibility all participate in batch identity.

### 2. Do not create one stack per apple unnecessarily

Exact per-unit timestamps would be correct but can cause excessive stack fragmentation.

Implement bounded freshness batching. Preferred rule:

- freshly produced/acquired items with effectively equal freshness merge;
- already separated old and fresh batches do not collapse later;
- if quantization is used, define it centrally and choose a resolution small enough that merging cannot meaningfully extend shelf life.

Do not re-average freshness after a compatible merge. A homogeneous batch keeps one canonical freshness value.

Opus should choose the exact quantization/tolerance after checking simulation cadence and inventory-size impact. The acceptance requirement is behavioral, not a specific bucket size.

### 3. Oldest food is consumed first by default

When a system requests food by item id rather than a specifically selected stack, choose the compatible batch with the lowest remaining freshness first.

Apply this to:

- NPC eating;
- household/inn meal ingredient selection;
- automatic recipe ingredient consumption;
- campfire roasting batch selection;
- other background food consumption.

When the player explicitly clicks a particular stack, consume that selected stack.

### 4. Spoilage is batch-local

`spoilInventory()` decrements each batch independently. One expired stack is removed without affecting fresher stacks of the same item.

No averaging or redistribution occurs when one batch spoils.

### 5. Cooking preserves source freshness proportion

Keep the existing D-FOOD-3 intent that roasted meat inherits relative freshness from its raw input, including the spoiled-food rule.

However, calculate output from the actual consumed source batches. If a roasting job consumes batches with different freshness, either:

- emit separate output batches preserving their derived freshness, or
- combine only outputs that satisfy the new freshness compatibility rule.

Never use weighted averaging merely to collapse the outputs into one stack.

### 6. Preservation creates a new shelf-life state, not a refresh exploit

Drying, salting or fermenting is real production and may legitimately transform shelf life.

The produced food's freshness must be derived by the recipe/preservation rule from the consumed batch, not reset blindly because `newStack()` defaults to full freshness.

This is especially important for `economy--003` preserved food.

## UI

Inventory/storage/trade views must make multiple same-item batches understandable.

At minimum expose a concise freshness state, preferably remaining time or a stable label such as:

- Fresh;
- Aging;
- Eat soon;
- Spoiled/unsafe if spoiled food is retained in a future iteration.

Do not hide two distinct batches behind one row if selecting one row would ambiguously consume/sell the other.

Exact presentation is a UI detail; the simulation must expose enough information for it.

## Trade and value

For the first slice, keep base item prices unless an existing pricing hook already makes condition adjustment straightforward.

Do not block this plan on freshness-based dynamic pricing. But ensure buying/selling a specific batch preserves its freshness exactly so such pricing can be added later.

## Changes to existing plans/decisions

- Update D-FOOD-3: replace "within a species freshness is the weighted average" with batch-preserving freshness semantics.
- Update `economy--003--inn-meals-and-preserved-food.md`: its current note deferring FIFO because of weighted-average stacks becomes obsolete. After this plan, inn meals should consume oldest suitable stock first.
- `items--001` supplies the generic condition-preserving inventory invariant.

## Tests

Cover at least:

1. old + fresh same food remains two batches;
2. acquiring fresh food does not increase old food freshness;
3. acquiring old food does not decrease fresh food freshness;
4. spoilage removes only the expired batch;
5. implicit consumption chooses oldest first;
6. explicit player consumption uses the selected stack;
7. roasting several freshness batches preserves derived freshness without averaging;
8. storage/cart/trade/drop/pickup preserve freshness;
9. species-specific meat remains separated as today;
10. repeated production/transfer does not cause unbounded stack explosion under the chosen batching policy.

## Exit criteria

- old and fresh food coexist independently;
- no weighted-average freshness remains in generic inventory merging;
- automatic consumers use oldest suitable food first;
- cooking/preservation derive output from actual source freshness;
- UI can distinguish same-item batches;
- D-FOOD-3 and `economy--003` no longer contradict the implemented model.
