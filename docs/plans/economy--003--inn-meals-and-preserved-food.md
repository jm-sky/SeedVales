# Inn meals and preserved food reserves

**Status:** draft  
**Model:** opus — service/economy rules and calibration; sonnet — implementation and tests  
**Domain:** economy  
**Sub domains:** food, inns, crafting, trade, households, survival  
**Roadmap:** independent small economy slice; compatible with [later-vision-backlog](../roadmap/later-vision-backlog.md) L3 and `economy--002`  
**Created:** 2026-10-03  
**Finished:** —

---

## Goal

Make inns a useful travel service instead of only a paid bed:

1. the player can buy a meal at an inn;
2. meals come in several price/size tiers and restore a substantial amount of hunger;
3. eating is a short activity, not an instant stat button;
4. the food is consumed from real inn stock — nothing appears from an infinite service source;
5. inns and some households keep durable emergency food;
6. preserved foods are normal items with recipes and participate in spoilage, trade and the item-source audit.

The first implementation intentionally stays lightweight: no waiter AI, table service, plate objects or physical serving sequence.

## Current `main` recon

Recon against `main` commit **3af63f4533be528455d795127a9e25fa104e6e5b**.

### Inns

- `StructureKind` already includes `inn`.
- `newGame.ts` gives every inn an `Inventory` (`b.inv = { items: [] }`), but it starts empty.
- `interact.ts` currently exposes only **Rent a bed (8c) and sleep**.
- Lodging is already a real money flow. The current code tries to pay an arbitrary living settlement `trader` as an "innkeeper", otherwise the settlement treasury receives the 8c.
- There is no dedicated innkeeper profession/household ownership model yet.

### Food and hunger

- Hunger is 0..100, 100 = satiated.
- Current tuning drains full hunger in ~30 calendar hours.
- Existing food already covers useful building blocks:
  - bread: 25 nutrition, 4 d shelf life;
  - roast meat: 30, 3 d;
  - dried meat: 24, 40 d;
  - stew: 40, 2 d;
  - cabbage: 14, 15 d.
- D-SIM-8 currently describes a normal meal as roughly 25–40 hunger points, so meal tiers should extend this carefully rather than silently replacing the existing needs calibration.
- Stored food already spoils through `worldSystems.ts`; building inventory uses `FOOD.chestSpoilFactor = 0.5`.

### Existing preservation / household supply

- `dried_meat` already exists and is active.
- There is already a player recipe:
  `2 × raw_meat -> 1 × dried_meat` at a drying rack.
- Every household currently starts with `HOUSEHOLD_PANTRY = bread ×2 + branches ×4`.
- Household background production already exists; winter production can create `dried_meat`.
- This background production is intentionally scheduled for a more explicit profession/structure budget model in `economy--002` step 5. This plan must not introduce a second competing household-production system.
- There is currently no `salt`, `cucumber`, salted meat, sauerkraut or pickled-food item.

## Design decisions

### 1. The inn inventory is the source of truth

Use the existing `Building.inv` on the inn as its pantry.

Do **not** add a second service-stock structure and do not create food on purchase. Meal availability is derived from what can actually be consumed from `inn.inv`.

The existing stockpile/barrel visuals may reflect these quantities later, but visuals are never authoritative.

### 2. Meals are service recipes, not inventory items

Add a small data table, e.g. `data/innMeals.ts`, describing:

- id / player-facing name;
- ingredient alternatives;
- price;
- hunger/thirst effect or a deterministic effect derived from the consumed ingredients;
- eating duration.

Do not create a "Cheap meal" item in the player's inventory. The service consumes ingredients directly and applies the meal result.

Initial menu target:

| Tier | Example ingredients | Target hunger restore | Price intent |
|---|---|---:|---:|
| Simple meal | bread + vegetable | ~35–40 | cheap |
| Hearty meal | bread + dried/salted meat | ~45–55 | medium |
| Good meal | stew or meat + bread + vegetable/preserved side | ~55–65 | expensive |

Exact numbers are calibration, not a hard design requirement. The upper tier deliberately goes above the old 25–40 generic-meal note because the requested inn meal should be a substantial travel meal; verify that it does not trivialize hunger.

Ingredient selection should prefer the oldest still-edible compatible stacks first so inns do not waste fresh food while an older batch spoils.

### 3. Ordering is a short player activity

Interaction with an inn gains **Eat a meal** (or three direct tier options if that is clearer in the current interaction UI).

Flow:

1. show only tiers for which the inn has a complete ingredient set;
2. show price and approximate satiation in the label/panel;
3. starting the order creates a short activity (target ~5–8 gameplay seconds);
4. on completion, re-check stock and money;
5. atomically consume the ingredients, transfer money and apply hunger/thirst;
6. cancel/interruption before completion consumes neither money nor ingredients.

This follows the existing crafting rule: completion is the transaction boundary, preventing cancel/duplicate exploits without adding a reservation subsystem.

No waiter navigation, table assignment or plate object is required.

### 4. Inn ownership/payment: remove the fake "any trader is the innkeeper" assumption

The current inn building is settlement-owned and there is no innkeeper profession.

For this slice, treat the inn as a settlement service:

- lodging revenue -> settlement treasury;
- meal revenue -> settlement treasury.

This makes ownership explicit and removes the current arbitrary lookup of any `trader` in the settlement.

If a dedicated innkeeper/inn household is added later, both lodging and meal payment can move to that owner in one place.

All money flows stay conserved and must be logged through the existing economy ledger.

### 5. Preserved food set

Keep the first set small and useful.

#### Already present

- **Dried meat** — keep as-is unless balance review changes its yield/shelf life.

#### Add now

- **Salt** — resource/commodity, required by salting and fermentation.
- **Salted meat** — long-lived meat reserve.
- **Sauerkraut** — long-lived cabbage reserve.

Suggested first-pass properties:

| Item | Inputs | Shelf-life target | Notes |
|---|---|---:|---|
| Salted meat | raw meat + salt | 60–90 d | durable inn/travel protein |
| Sauerkraut | cabbage + salt | 60–120 d | durable vegetable side |
| Dried meat | existing recipe | 40 d | already implemented |

Use ordinary `FoodStats.spoilH`; do not create a separate preservation clock.

#### Defer unless cucumber farming is added in the same slice

- **Pickled cucumbers** are a good thematic item, but the game has no cucumber item/crop today.
- Do not add a one-off cucumber only to satisfy one recipe.
- Add pickled cucumbers later with a real cucumber source (field crop / household production / trade channel), then use cucumber + salt.

Possible later additions: hard cheese, smoked meat, dried apples/fruit, pickled mixed vegetables. They are not needed for the first slice.

### 6. Salt must not be magical

There is currently no salt extraction source.

For the first implementation, make salt a **finite imported/trade commodity**:

- seed modest salt stock in trader stores and/or settlement warehouses;
- seed larger inn reserve where appropriate;
- expose it through the normal item-source/reachability audit.

Do not add periodic free salt generation.

Long-term renewable/import replenishment belongs with `economy--002` / TRADE-03 inter-settlement trade. If salt runs out before that system exists, inns can still serve recipes based on dried meat and ordinary food; salted/pickled production naturally stops.

### 7. Initial inn and household reserves

#### Inns

Every generated inn starts with a deliberate pantry containing:

- bread/grain-derived food;
- dried meat;
- a small preserved-vegetable reserve once available;
- some salt;
- optionally a small amount of fresh food.

Stock quantity should scale modestly with settlement size, not be identical everywhere.

This is initial mutable state, not a new world-generator structure.

#### Households

Do not give every home an identical emergency cellar.

At new-game creation, deterministically give **some** households extra preserved food, with variation by profession and household id/seed. Example target: ~35–60% of households receive 2–6 durable portions.

Biases may include:

- hunter / woodcutter / guard: more dried or salted meat;
- farmer: more sauerkraut / preserved vegetables;
- trader: broader mixed reserve;
- other households: small chance of either.

Keep `HOUSEHOLD_PANTRY` for universal basics, but move emergency preserves into a separate seeded reserve helper/table so the intent is clear.

### 8. Ongoing inn resupply

Do not generate food directly inside the inn.

Add a low-frequency inn resupply path that moves real stock into `inn.inv`:

1. prefer settlement warehouse surplus;
2. optionally buy household surplus when the treasury can afford it;
3. move items physically in inventory terms (source stack decreases, inn stack increases);
4. when buying from a household, treasury pays the household/NPC owner and the ledger records it;
5. preserve household food reserves — do not take below the same reserve rules used by trade.

Keep this deliberately simple and low frequency (calendar-scale, not per tick).

If implementing household procurement would overlap too much with `economy--002` step 5, the acceptable first slice is:
- initial inn stock;
- warehouse -> inn transfers only;
- explicit follow-up note that household procurement lands with the L3 economy work.

### 9. Recipes and crafting

Add ordinary recipes for the preserved items.

The existing crafting system has only `campfire`, `anvil` and `dryrack` stations. Do not invent a large fermentation workstation system for two recipes.

First slice options:

- salted meat: knife/cut capability or no station, moderate craft time;
- sauerkraut: no station or a simple container/tool requirement only if an existing suitable item can be reused;
- keep dried meat on the drying rack.

Do not require a consumable barrel unless the game gains reusable container accounting. A barrel can remain the visual/storage representation of a stack in a building.

If a preservation station is later justified by multiple recipes, add it as a separate design step instead of prematurely expanding `StationKind`.

## Implementation steps

| # | Step | Model |
|---|---|---|
| 0 | Reconfirm current meal/hunger calibration and select first-pass tier prices/effects; decide the exact salt starting channel and inn-resupply scope without conflicting with `economy--002` | opus |
| 1 | Add preserved-food items and recipes; update item-source audit/reachability; keep `dried_meat` as the existing baseline | sonnet |
| 2 | Add deterministic initial preserved reserves for inns and a subset of households; settlement-size/profession variation; no new save schema fields | sonnet |
| 3 | Add `InnMeal` data and meal availability/ingredient-selection helpers over `inn.inv` | sonnet |
| 4 | Add short meal activity and completion transaction: re-check, consume, pay treasury, restore hunger; cancellation is free | sonnet |
| 5 | Refactor inn lodging payment to the same explicit settlement-service payment helper; remove arbitrary trader-as-innkeeper lookup | sonnet |
| 6 | Add low-frequency real-stock inn resupply from warehouse; add paid household-surplus procurement only if it does not duplicate `economy--002` | sonnet |
| 7 | UI/interactions: show meal tiers, price, availability and "out of food" state on desktop/mobile without waiter/table simulation | sonnet |
| 8 | Verification and tuning: unit tests, economy conservation, spoilage, save/load, e2e inn meal, mobile interaction, soak supply/depletion | sonnet + opus review |

## Tests / acceptance criteria

### Meal service

- An inn with required stock exposes the corresponding meal.
- An inn missing an ingredient does not offer that tier (or shows it disabled with the missing-stock reason).
- A completed meal:
  - removes the exact ingredient quantities from `inn.inv`;
  - transfers the exact price to the settlement treasury;
  - increases player hunger by the defined amount, capped at 100;
  - writes matching consume/money ledger entries.
- Cancelling before completion changes no food, money or hunger.
- If stock or money changed during the activity, completion fails cleanly without partial transaction.
- Repeated ordering eventually depletes the pantry; there is no infinite service stock.

### Preserved foods

- `salted_meat` and `sauerkraut` are reachable through the item-source audit.
- Salt itself has an explicit finite source; no periodic free minting.
- Preservation recipes consume their inputs and produce exactly their outputs.
- Preserved foods spoil using the existing freshness system and live materially longer than their fresh inputs.
- Dried meat remains obtainable and does not regress.

### World/economy

- Every inn starts with a non-zero useful pantry.
- Only a subset of households receives extra emergency preserves; the result is deterministic for the same new game seed.
- Inn resupply always has a source inventory and never duplicates items.
- Paid household procurement conserves money.
- Household reserve rules prevent the inn from emptying a family's protected food.
- 10-day × 3-seed soak: no negative quantities, no money/item conservation drift, inns are neither permanently full from free generation nor universally empty after the first few customers.

### Save/versioning

This design uses existing `Building.inv` and existing item stacks. If implementation adds no new persisted fields, **do not bump `SAVE_VERSION` only because new item ids/starting stock exist**.

If any new mutable field is introduced, follow D-SAVE-7: bump `SAVE_VERSION`, no migration, and assert that the previous format is rejected cleanly.

No `GEN_VERSION` bump is expected unless world generation itself changes.

## Non-goals

- waiter AI and carrying plates;
- table/chair reservation;
- eating animations beyond the existing activity/render hint if available;
- full innkeeper profession/household ownership;
- reusable barrel/container accounting;
- fermentation simulation;
- a new food-production economy parallel to `economy--002`;
- cucumber/pickled-cucumber content without a real cucumber source.

## Likely files

- `src/game/data/items.ts`
- `src/game/data/recipes.ts`
- `src/game/data/itemSources.ts`
- `src/game/data/professions.ts` (salt trade stock only if selected)
- new `src/game/data/innMeals.ts`
- `src/game/config/calibration.ts`
- `src/game/sim/newGame.ts`
- `src/game/sim/interact.ts`
- `src/game/sim/player.ts` / activity completion path
- `src/game/sim/worldSystems.ts` or a focused `sim/inns.ts` system
- `src/game/sim/eventLog.ts`
- relevant unit/e2e/mobile tests

## Relationship to `economy--002`

This plan owns the **player-facing inn meal service, preserved-food content and concrete inn pantry**.

`economy--002` continues to own the broader redesign of household background production, regional availability, inter-settlement demand/supply and long-term economic calibration.

When both are implemented, the inn should consume the production/trade outputs of that economy rather than maintain special-case free production.
