# Full repository recon — mechanics, performance, consistency, UI/UX and gameplay

**Date:** 2026-10-02  
**Model:** GPT-5.6 Sol  
**Repository:** `jm-sky/SeedVales` (renamed from `jm-sky/SeedVales-2`)  
**Analysed branch:** `main`  
**Analysed commit:** `6db2f7f6fb591745f9e02c0fd0b23f6b31f33683`  
**Method:** static repository recon across simulation, world generation, data catalogues, UI and previous reviews. Existing review findings that are already triaged/fixed were not re-filed as current bugs. No fresh test/benchmark run was executed as part of this review.

## Executive summary

The project is in substantially better shape than a typical feature-complete prototype: most hot gameplay operations already use spatial indices, simulation/render boundaries are explicit, determinism is taken seriously, and earlier reviews have removed several real exploits. The largest remaining risks are now **cross-system consistency and scaling**, not basic architecture.

The highest-value findings from this recon are:

1. **MAP-01 is currently bypassed by the map side panel:** undiscovered settlements are listed by name and distance and can be targeted/autopiloted even though the canvas hides them under fog of war.
2. **NPC and fauna LOD still start with full-world 20 Hz scans.** Expensive actor updates are throttled, but the scheduler itself scans every NPC/animal each 50 ms; fauna additionally clones the full animal array.
3. **Quest history grows without a bound.** Recurring quests are appended forever; quest generation repeatedly searches the whole history and the UI renders all historical quests.
4. **The item catalogue is ahead of the acquisition economy.** Several NPC wishes refer to items for which no normal player acquisition path was found, and a larger group of catalogue items appears effectively dead.
5. **Crafting economics are inconsistent by large factors.** Some recipes destroy most of the catalogue value while others more than double it; blacksmith order prices can be lower than the base value of the reserved ingredients.
6. **World-generation size support is internally inconsistent:** `XL` exists in the model but the current centre planner only generates SM → MD → LG. If XL becomes reachable, settlement layout logic already has a latent omission for inns.
7. **Road A* permits diagonal corner cutting**, which can create routes through geometrically blocked corners before smoothing/carving.
8. The two dynamic quest descriptions/progress models do not always match their actual completion rules: wolves say “drive off or kill” but only kills progress; rat UI reports kill progress but not the mandatory repair state.

Recommended order is: **knowledge/FOW correctness → scheduler scaling → quest lifecycle → item reachability/economy validation → generator invariants → UI discoverability/polish**.

---

# 1. Mechanics and calculation findings

## M-01 — Hidden settlements leak through the map side panel

**Priority:** P0/P1  
**Where:** `src/ui/panels/MapPanel.vue`

The canvas correctly checks `isExplored()` before drawing settlement markers, but the side panel is built from:

- every `sim.world.settlements` entry;
- the true settlement name;
- exact straight-line distance from the player;
- active **Target** and **Autopilot** buttons.

The template renders that list without an `isExplored` gate. This means a fresh player can learn all generated settlement names and distances and navigate directly to them despite MAP-01 fog of war.

This is not only a presentation leak: `setWaypoint(s.x, s.z, s.name)` and `autopilotTo(id)` turn hidden world knowledge into usable navigation.

**Fix direction**

Introduce a single “known location” predicate and use it for **both** canvas and list/action availability. A settlement should enter the map index only after one of:

- its cell is explored;
- the settlement was visited;
- an explicit rumor/map/quest revealed it.

This would also create a useful gameplay hook: information itself can become a reward.

**Regression test**

Fresh game → open map → assert that an unexplored settlement name is absent and its target/autopilot controls cannot be invoked.

---

## M-02 — Wolf quest says “drive off or kill”, but only kills can complete it

**Priority:** P1  
**Where:** `src/game/sim/quests.ts`

Generated wolf quest text says:

> “Drive the wolves off or kill them.”

Completion is actually:

`q.kills >= q.killsNeeded`

There is no sustained-distance/threat-state branch that recognizes driving the pack away.

This creates a direct contract mismatch between player-facing text and simulation rules.

**Fix direction**

Choose one:

1. change the quest to explicitly require kills; or
2. make “drive off” real: complete after the relevant wolves remain outside the settlement threat radius for N calendar/gameplay hours, with an optional bonus for non-lethal resolution.

Option 2 fits SeedVales better because it creates more systemic outcomes than a pure kill counter.

---

## M-03 — Rat quest progress hides the repair objective

**Priority:** P1/P2  
**Where:** `src/game/sim/quests.ts`, `src/ui/panels/QuestsPanel.vue`

The rat quest description requires two things:

- kill the rats;
- repair the damaged building so the nest is removed.

The panel only shows:

`Progress: kills / killsNeeded`

Actual completion additionally requires:

- `!b.ratNest`;
- no rats left for that nest/legacy strays.

A player can therefore see “3/3” while the quest remains active with no structured indication that repair is still missing.

**Fix direction**

Represent objectives explicitly, e.g.:

- Rats eliminated: 3/3
- Repair the warehouse: pending / done

This is a good reason to move quest state away from one generic kill counter toward objective data.

---

## M-04 — Quest panel promises a fixed reward that the game may not pay

**Priority:** P2  
**Where:** `src/game/sim/quests.ts`, `src/ui/panels/QuestsPanel.vue`

The quest card shows `reward X c`. On completion, `payFromTreasury()` can pay less when the settlement treasury is poor.

The treasury-backed behavior is mechanically good and preserves conservation, but the UI promise is inaccurate.

**Fix direction**

Before acceptance, show something such as:

- “Reward: up to 60 c, paid by the settlement treasury”, or
- current guaranteed amount if exposing treasury liquidity is intended.

After completion, persist/display the actual amount paid.

---

## M-05 — Route-distance calibration is soft even where the design treats it as an invariant

**Priority:** P2  
**Where:** `src/game/world/gen/centres.ts`

`pickNext()` prefers candidates inside the configured route band, but when none is found it accepts the closest candidate and increments `world.gen.routeBandMiss`.

`planCentres()` still accepts such a world as long as the three settlements and two roads exist.

That makes the documented “~1 day walk” calibration a best effort rather than a generation guarantee. A new seed can legally produce a significantly different opening travel cadence.

**Fix direction**

Define the intended contract explicitly:

- if the band is a hard product requirement, retry more home candidates / regenerate sub-seed / fail generation;
- if it is intentionally soft, expose the allowed maximum miss and test it statistically over a seed corpus.

A metric without a pass/fail boundary can hide drift.

---

## M-06 — Road A* can cut diagonally across blocked corners

**Priority:** P2  
**Where:** `src/game/world/gen/roads.ts`

The road search uses eight directions. For a diagonal step it validates the destination cell, but does not require the two adjacent orthogonal cells to be traversable.

Classic result: with two blocked cells forming a corner, the path may pass diagonally between them. After smoothing and terrain carving this can become a road clipping a water/steep/blocked corner that the path cost never truly traversed.

**Fix direction**

For diagonal moves, reject the step when either adjacent cardinal cell is non-traversable, or implement a specific geometric clearance rule.

Add a small synthetic grid test with an impassable L-shaped corner.

---

## M-07 — Settlement size `XL` exists but cannot currently be generated

**Priority:** P2 consistency / future bug  
**Where:** `src/game/world/types.ts`, `src/game/world/gen/centres.ts`, `src/game/world/gen/settlements.ts`

The public type is:

`SM | MD | LG | XL`

but `planFrom()` creates only:

`SM → MD → LG`

No XL centre is added.

There is also a latent bug if XL becomes reachable: layout adds an inn only for:

`size === 'LG' || size === 'MD'`

so XL would get no inn. XL also shares the generic non-SM/non-MD radius behavior rather than having a dedicated layout tier.

**Fix direction**

Either remove XL until its generator/content contract exists, or implement it end-to-end and add a size-contract test that verifies required structures and household counts for every size enum value.

---

## M-08 — “Smelt iron” happens at an anvil

**Priority:** P2 design/mechanics consistency  
**Where:** `src/game/data/recipes.ts`

The iron-ingot recipe consumes iron ore + coal but requires `station: 'anvil'`.

An anvil is not a heat source. In a game explicitly targeting non-fantasy medieval plausibility this breaks the physical production chain more than the other abstractions.

**Fix direction**

Add a forge/furnace station:

ore + fuel → bloom/ingot → anvil forging

A lighter version can keep one “forge” structure that covers both heat and anvil work while still making fuel and location meaningful.

---

## M-09 — Blacksmith order pricing can underpay even the catalogue value of ingredients

**Priority:** P1/P2 economy  
**Where:** `src/game/sim/orders.ts`, `src/game/data/recipes.ts`, `src/game/data/items.ts`

`orderPrice()` is:

`output base price × 1.1`

It does not use ingredient cost, skill, quality expectation or labor.

Examples using current base prices:

| Item | Ingredient value | Output base | Order price | Margin before labor |
|---|---:|---:|---:|---:|
| Axe | 61 c | 45 c | 50 c | **−11 c** |
| Sword | 135 c | 120 c | 132 c | **−3 c** |
| Pickaxe | 61 c | 55 c | 61 c | 0 c |

The smith reserves and consumes real store materials. Thus the household can destroy economic value by accepting an order even before accounting for labor.

**Fix direction**

Price orders from:

`max(output reference value, ingredient replacement cost) + labor + quality premium`

and add an invariant test: an order cannot be priced below the valued consumed inputs unless a deliberate subsidy is modeled.

---

## M-10 — Crafting value ratios are highly inconsistent

**Priority:** P2 balance/economy  
**Where:** `src/game/data/recipes.ts`, `src/game/data/items.ts`

Current catalogue prices imply very different transformation economics:

| Recipe | Input value | Output value | Change |
|---|---:|---:|---:|
| Rope | 18 c | 10 c | −44% |
| Cloth | 12 c | 8 c | −33% |
| Sling | 25 c | 5 c | **−80%** |
| Waterskin M | 25 c | 10 c | −60% |
| Waterskin L | 40 c | 16 c | −60% |
| Wheelbarrow | 58 c | 40 c | −31% |
| Handcart | 112 c | 75 c | −33% |
| Stew | 9 c | 24 c | **+167%** |

Some negative ratios can be reasonable when raw prices include scarcity and a crafted object is common, but the current spread is too large to behave as a coherent economy. It also makes crafting skill progression unintuitive: learning to make certain useful objects is economically worse than selling their ingredients and buying the finished object.

**Fix direction**

Add an automated economy audit with accepted ratio bands by recipe class. Prices should intentionally model:

- material value;
- labor;
- rarity;
- durability/reusability;
- skill barrier;
- local scarcity.

Do not force every recipe to be profitable, but make exceptions explicit.

---

# 2. Performance and scaling findings

## P-01 — NPC LOD still begins with a full-world scan at 20 Hz

**Priority:** P1  
**Where:** `src/game/sim/npc/ai.ts`, `installSystems()`

The NPC system runs every 0.05 s. Each run loops over **all** `sim.state.npcs`, calculates player distance, then decides whether the NPC is due for its LOD-dependent update.

The expensive per-NPC work is successfully throttled, but scheduling remains O(total NPC count) × 20 per second.

This is exactly the kind of cost that is invisible with a few hundred actors but becomes the limiting floor when world population grows.

**Fix direction**

Use a scheduler rather than scanning to discover who is due:

- min-heap / timing wheel keyed by `nextUpdate`;
- near-player bucket from the spatial grid at high cadence;
- coarse far-actor queue at lower cadence.

Keep the spatial index for interaction/perception; use time indexing for update scheduling.

**Metric to add**

`npc.schedulerVisited` vs `npc.updated`. The ratio should stay close to 1 rather than scaling with world population.

---

## P-02 — Fauna performs the same full-world 20 Hz scan and also clones the entire animal array

**Priority:** P1  
**Where:** `src/game/sim/fauna/ai.ts`

`faunaSystem()` runs at 0.05 s and starts with:

`for (const a of [...sim.state.animals])`

So every 50 ms it:

1. allocates a new array proportional to total fauna;
2. iterates every animal;
3. only then skips actors whose `nextUpdate` is in the future.

This combines scheduler scaling with avoidable garbage generation.

The copy is presumably defensive because animal death/removal can mutate the original collection. That safety can be retained with deferred removals, stable IDs, reverse iteration, or a due-actor scheduler.

---

## P-03 — Quest history is unbounded and makes quest-system cost grow with campaign length

**Priority:** P1  
**Where:** `src/game/sim/quests.ts`, `src/ui/panels/QuestsPanel.vue`

Rat and wolf troubles can be reposted after cooldown/expiry, and every instance remains in `state.quests`.

The 10-second quest system then repeatedly:

- scans historical quests with `.find()` per rat-nest building;
- scans historical quests with `.find()` per settlement;
- loops all quests again for resolution.

The UI reverses and renders the entire list as well.

This creates three coupled long-run problems:

- simulation work increases with elapsed campaign history;
- save size increases forever;
- the quest panel becomes less usable.

**Fix direction**

Separate:

- active/available quest state;
- bounded history/journal.

Index current recurring problems by a stable key such as `rats:<buildingId>` / `wolves:<settlementId>`. Archive only the last N or last X days of completed/expired entries.

Add a long-run test generating many repost cycles and assert bounded active lookup cost and bounded history.

---

## P-04 — SpatialHash retains empty cell arrays

**Priority:** P3  
**Where:** `src/game/world/spatial.ts`

`remove()` and cross-cell `update()` splice the actor from its old array but do not delete the map entry when the array becomes empty.

The world is finite, so this is bounded by visited grid cells rather than truly unbounded memory, but long sessions with roaming actors can leave many empty arrays/Map entries.

**Fix direction**

After removal:

`if (arr.length === 0) cells.delete(k)`

Cheap and removes avoidable structural memory.

---

## P-05 — Road candidate evaluation repeatedly allocates million-cell A* buffers

**Priority:** P2 startup/generator performance  
**Where:** `src/game/world/gen/roads.ts`, `src/game/world/gen/centres.ts`

The world grid is about 1.05 million cells. Each `findRoadPath()` creates/fills:

- `Float32Array(N)`;
- `Int32Array(N)`;
- `Uint8Array(N)`;
- a heap.

Centre search may test multiple candidates and multiple home attempts, so startup generation can repeatedly allocate and initialize multi-megabyte buffers.

The world cache makes this less important during ordinary play, but it is a major first-generation cost and seed-testing cost.

**Fix direction**

Consider reusable generation workspace with epoch markers, coarse-to-fine path search, or a lower-resolution routing grid with high-resolution final carving.

Measure before changing: this belongs in generator phase timings, not frame performance.

---

## P-06 — Known vegetation rebuild spikes remain a real rendering risk

**Priority:** P1/P2, already tracked  
**Source:** `docs/state/PERF.md`, review 009 / current render plans

Earlier measured ordinary-travel vegetation rebuild p95 values exceeded the desired per-rebuild budget (roughly 9.8–38.7 ms in the recorded baselines). This is already recognized and should remain visible in the project risk list until current nature work is re-measured on representative hardware.

Do not reopen old fixed render findings; this is the one previously documented performance issue that remains directly relevant to present graphics work.

---

# 3. Cross-system consistency and “dead content”

## C-01 — Several NPC wishes currently point to items with no normal acquisition path found

**Priority:** P1 content consistency  
**Where:** `src/game/sim/gifts.ts`, `src/game/data/items.ts`, `recipes.ts`, `professions.ts`, quest rewards

Static acquisition audit found wishes for items that are defined but were not found in:

- player starting gear;
- trader starting stock;
- current crafting recipes;
- current quest rewards;
- relevant profession stores/kits as a player-facing source.

High-confidence blocked wishes:

- `big_axe` — Woodcutter
- `leather_gloves` — Woodcutter
- `long_bow` — Hunter
- `arrow_bodkin` — Hunter
- `iron_helm` — Guard / Blacksmith
- `chainmail` — Guard
- `pot` — Herbalist
- `furs` — Elder

A wish being impossible is worse than a merely dead catalogue item because the game explicitly advertises the desired object to the player.

**Fix direction**

Add a CI/content test that constructs a reachability graph:

sources → resources/items → recipes/trade/loot/quest rewards → reachable items

Then assert that every:

- NPC wish;
- recipe ingredient;
- quest-required item;
- build material;
- ammo type advertised by obtainable weapons

is reachable in at least one intended way.

---

## C-02 — The item catalogue contains a larger group of likely unreachable/dead player items

**Priority:** P2  
**Where:** `src/game/data/items.ts`

Beyond the blocked wishes, the catalogue is materially larger than the currently wired acquisition graph. Candidates that should be audited include:

- `long_sword`
- `small_axe`
- `composite_bow`
- `crossbow`
- `bolt`, `bolt_heavy`, `bolt_blunt`
- `arrow_blunt`
- `padded_jacket`
- `studded_leather`
- `plate_cuirass`
- `leather_trousers`
- `bracers`
- `pauldrons`
- `saddlebag`
- `tent`

Some catalogue-only entries may be intentional future content, but then they should be marked as such rather than silently participating in balance/data APIs.

**Recommendation**

Add an item metadata field such as:

`availability: 'active' | 'future' | 'quest-only' | 'unique'`

and make the audit fail only for `active` content with no source.

---

## C-03 — Quest rewards are coins-only, so quests do not help close the item acquisition graph

**Priority:** P2 gameplay/content  
**Where:** `src/game/sim/quests.ts`

Both current systemic quests pay treasury coins only. There is no item/reputation/recipe/knowledge reward model.

This leaves rare equipment and special tools with only crafting/trade as possible acquisition channels and makes quests economically homogeneous.

A good extension is a reward bundle:

- coins;
- item(s);
- recipe/knowledge unlock;
- settlement reputation;
- location rumor/map reveal;
- service/discount.

Treasury conservation can remain for coins while physical item rewards come from an NPC/warehouse inventory.

---

## C-04 — `workbench` exists in the crafting station type but not in the world structure model

**Priority:** P3  
**Where:** `src/game/data/recipes.ts`, `src/game/world/types.ts`

`StationKind` includes `workbench`, but `StructureKind` and current blueprints do not.

No current recipe uses it, so this is not an active player bug, but it is dead/incomplete API surface and an easy source of an impossible future recipe.

Either implement the station or remove it until needed.

---

## C-05 — Household food production follows a separate economy from player-visible farming/crafting

**Priority:** P2 design consistency  
**Where:** `src/game/sim/worldSystems.ts::households()`

Every household periodically creates food from an abstract seasonal pool. This is documented in code as an abstraction for self-sufficiency, but it means:

- a blacksmith/guard household can generate food without explicit field/livestock inputs;
- bread appears without consuming grain;
- milk/eggs can appear without modeled matching livestock;
- settlement production does not obey the same recipes the player sees.

This may be acceptable for simulation scope, but it should be treated as an explicit “background production source”, not an invisible exception to conservation.

**Improvement**

Represent abstract production as household production budgets/credits with profession/structures determining outputs. This preserves performance while aligning sources with the visible world.

---

## C-06 — Skill gain per craft ignores recipe complexity

**Priority:** P3 balance  
**Where:** `src/game/sim/craft.ts`

Every completed recipe trains its skill with the same base amount, while recipes range from a few seconds/simple inputs to 40+ seconds and expensive smithing.

That encourages grinding the cheapest/fastest recipe if progression matters.

**Fix direction**

XP should depend on some combination of:

- base craft time;
- recipe tier/minSkill;
- material value;
- diminishing returns when skill greatly exceeds recipe difficulty.

---

## C-07 — Several UI panels bypass the Game facade

**Priority:** P3 architecture consistency  
**Where:** examples include `TradePanel.vue`, `QuestsPanel.vue`, `OrdersPanel.vue`, previously noted related panels

Repository guidance says UI mutation should go through `Game` methods. Several panels directly invoke sim mutators and then manually increment `version`.

This pattern makes it easier to forget:

- version/refresh;
- toast/message behavior;
- distance/interaction policy;
- future telemetry/replay hooks.

This is already a known pattern from prior review; it is worth fixing as a cross-cutting cleanup rather than one panel at a time.

---

# 4. UI/UX development recommendations

These are product recommendations rather than correctness bugs, except where linked to findings above.

## UI-01 — Make the quest panel objective-oriented

Current quests are flat cards ordered by reverse insertion. Add:

- tabs: **Active / Available / Completed**;
- hide expired quests by default;
- pin/track one quest;
- explicit objective checklist;
- distance/direction to known objective;
- actual reward state;
- optional “why blocked?” text.

For rats, the card should directly say:

- Kill rats: 3/3
- Repair warehouse: 42% → needs hammer/axe + 2 branches

This reduces the need to infer simulation rules.

---

## UI-02 — Crafting needs filters and a planning mode

The recipe list will not scale with more content.

Recommended controls:

- search;
- category tabs;
- `Craftable now` toggle;
- sort by craftable / skill / name / time;
- batch quantity;
- “craft max” where safe;
- pin recipe / shopping list;
- show missing totals rather than only per-input have/need;
- show where a required station/tool can be found.

For recipe discovery, consider hiding advanced recipes until learned instead of displaying a permanently disabled wall.

---

## UI-03 — Trade needs quantity controls, filtering and clearer intent

Current trade is one-item-per-click and unfiltered.

Add:

- search/category filters;
- sort by name/value/weight;
- quantity stepper;
- Buy 1 / Buy X / Buy max;
- Sell 1 / Sell X / Sell all stack;
- show carried weight impact;
- highlight an NPC's current wish;
- clearly separate household stock from personal carried stock if that distinction remains gameplay-relevant.

For expensive items, show quality/durability comparison before purchase.

---

## UI-04 — Inventory should become a real equipment decision screen

Existing filter/sort/details are a good base. Next useful additions:

- text search;
- stack quantity action for drop;
- side-by-side comparison with currently equipped item;
- damage/resistance deltas;
- durability/freshness bars;
- favorites/lock to prevent accidental drop/sale;
- weight contribution and carry-capacity impact;
- quick transfer when storage/cart is open.

---

## UI-05 — Map needs knowledge-aware list, filters and navigation affordances

After fixing M-01:

- list only known settlements/landmarks;
- distinguish **known by rumor** vs **visited**;
- filters for settlements, quests, landmarks;
- map legend;
- center-on-player / center-on-target;
- zoom/pan when the world grows;
- approximate distance for rumor-only places;
- do not allow autopilot to a location whose route is not known.

A rumor system would turn the fog-of-war constraint into gameplay rather than only a restriction.

---

## UI-06 — Quick actions should be contextual and explain disabled states

The fixed QuickPanel is useful but becomes noisy as systems grow.

Prefer:

- top section: contextually valid/recent actions;
- disabled actions with reason (“Need 4 stones”, “No cart nearby”, “Needs shovel”);
- keybind badge;
- favorites;
- last-used action;
- build categories delegated to the full Build panel.

---

## UI-07 — Message log should support signal management

As more systems emit messages, add:

- category filters (combat, quest, survival, economy, system);
- duplicate coalescing (“Cannot reach target ×4”);
- severity/icon;
- timestamps in game time;
- clickable quest/location/NPC references where appropriate.

This will be especially useful for companions, orders and long-running simulation events.

---

# 5. Gameplay development opportunities

These suggestions are deliberately chosen to reuse systems already present rather than create isolated feature islands.

## G-01 — Forge/smithing production chain

Close M-08 and activate dead equipment at the same time:

1. forge/furnace structure;
2. fuel/heat;
3. ore → ingot;
4. ingot + components → equipment at anvil;
5. quality from skill/material;
6. repair/maintenance loop.

This gives coal, ore, blacksmiths and high-tier gear a stronger reason to exist.

---

## G-02 — Item availability tiers and regional trade

Use the dead-item problem as content progression:

- common goods: local households/trader;
- profession goods: specialist settlements;
- rare gear: larger settlements or named smiths;
- unique/old gear: ruins/treasure quests;
- exotic goods: future long-distance caravan/import systems.

This is preferable to putting every item into the generic trader inventory.

---

## G-03 — Item/recipe/knowledge quest rewards

Move beyond copper-only rewards.

Examples:

- hunter gives bodkin arrows or teaches their recipe;
- guard rewards an iron helm from armory stock;
- herbalist teaches salve/tea;
- ruin quest reveals another landmark;
- trader gives a regional map;
- blacksmith unlocks a higher-tier weapon order.

This immediately makes quests part of progression rather than only money/reputation.

---

## G-04 — Rumors as a lightweight exploration system

NPC dialogue can reveal:

- settlement direction/approximate distance;
- dangerous animal area;
- ore deposit;
- landmark;
- traveling merchant;
- local shortage/surplus.

A rumor marks an approximate map region, not an exact coordinate. Visiting confirms it.

This naturally fixes the current tension between fog of war and the desire to help the player navigate a large physical world.

---

## G-05 — Turn currently underused skills into explicit loops

The data model already has skill breadth. Prioritize skills that can reuse existing world state:

- **Traps:** snares/traps, bait, track selection, animal population consequences.
- **Medicine:** wound treatment quality, diagnosis, infection/illness treatment.
- **Construction:** faster/cheaper builds, repair quality/durability.
- **Trade:** better information/negotiation, not only price multipliers.
- **Sneak:** visibility/noise UI and hunting feedback.

Every skill should have at least one repeatable action, one visible effect and one progression decision.

---

## G-06 — Equipment maintenance as a material sink

Weapons/tools already have durability but the long-term economy can benefit from explicit repair:

- sharpening for edged weapons;
- handle repair;
- armor patching;
- smith repair for metal gear.

This creates continuing demand for materials and services and makes quality more meaningful.

Avoid turning it into constant busywork: repair thresholds and service options matter.

---

## G-07 — Non-lethal / systemic quest resolutions

The wolf text accidentally points toward a stronger quest model.

Possible resolutions:

- kill pack members;
- scare them repeatedly;
- remove food/carrion attracting them;
- reinforce pens;
- hire hunter/guard assistance;
- destroy/relocate a den.

Rewards/reputation can differ without needing branching cinematic content.

---

# 6. Recommended automated consistency audits

The most important outcome of this recon should be preventing these classes of issue from returning.

## A. Item reachability audit

Build a graph of all active items and all sources:

- new-game inventory;
- NPC profession kits/stores;
- resource nodes/digging/corpses/animal products;
- recipes;
- quest rewards;
- scripted loot.

Assertions:

- every NPC wish is reachable;
- every active recipe ingredient is reachable;
- every obtainable ranged weapon has obtainable ammo;
- every active catalogue item has a source unless explicitly `future`/`unique`.

---

## B. Recipe economy audit

For each recipe calculate:

- base input value;
- base output value;
- ratio;
- time;
- minimum skill;
- station/tool.

Flag ratios outside per-category tolerances.

Separately assert:

`blacksmith order price >= valued reserved ingredients`

unless a documented subsidy exists.

---

## C. World-generator invariant corpus

Run hundreds/thousands of deterministic seeds and record:

- settlement counts by size;
- route lengths and route-band misses;
- missing required structures;
- road-water crossings;
- settlement water/terrain violations;
- generation time and A* expansions.

Fail on product invariants, not only crashes.

---

## D. Long-campaign simulation soak

Advance enough calendar time to exercise repeated:

- quests;
- household production;
- spoilage;
- animal respawn;
- building decay/repairs;
- treasury flows.

Track growth of:

- `quests`;
- ground items;
- corpses;
- traces;
- spatial cells;
- save bytes;
- sim p95.

The key assertion is not merely “no crash”; persistent collections should have intentional bounds.

---

## E. PERF-01 scheduler counters

Add counters:

- total NPCs / animals;
- actors inspected by scheduler;
- actors actually updated;
- spatial queries;
- AI decisions.

A large `inspected / updated` ratio should be treated as a scaling regression.

---

# 7. Suggested implementation order

### P0/P1 — fix before expanding content

1. Map knowledge leak / MAP-01 side list and autopilot.
2. NPC/fauna due-update scheduler; remove per-50-ms animal array clone.
3. Bound/index recurring quest lifecycle.
4. Fix wolf quest contract and rat objective presentation.
5. Add item reachability audit; repair impossible NPC wishes.

### P2 — next systems-quality pass

6. Economy audit and blacksmith order pricing.
7. Road diagonal corner rule + seed-corpus generator invariants.
8. Decide/implement XL end-to-end or remove it from active type surface.
9. Forge/smelting station model.
10. Craft/trade/quest UI scaling features.

### P3 — cleanup / future-proofing

11. SpatialHash empty-cell cleanup.
12. Remove/implement dead `workbench` station type.
13. Normalize UI mutations through `Game`.
14. Difficulty-aware crafting skill gain.
15. Explicit metadata for future/unique catalogue items.

---

# 8. Files inspected / areas sampled

The recon covered, among others:

- `CLAUDE.md`
- `docs/state/PROGRESS.md`
- `docs/state/PERF.md`
- prior reviews 003, 004, 006, 008, 009, 010, 011
- `src/game/data/{items,recipes,skills,professions}.ts`
- `src/game/world/types.ts`
- `src/game/world/spatial.ts`
- `src/game/world/gen/{generate,centres,roads,settlements,hydrology,features}.ts`
- `src/game/sim/{sim,worldSystems,queries,quests,craft,trade,orders,inventory,cooking,gifts,newGame}.ts`
- `src/game/sim/npc/{ai,companions}.ts`
- `src/game/sim/fauna/ai.ts`
- `src/ui/panels/{Map,Quests,Craft,Trade,Inventory,Orders,Quick}Panel.vue`
- `src/ui/panels/inventory/InventoryToolbar.vue`

This is a broad static recon, not an exhaustive proof of every code path. Findings marked as current bugs above are based on direct code traces; the broader “dead item” candidate list should be finalized by the proposed automated reachability audit.

---

# Triage (Opus, session 13, 2026-10-02 — review--001 round 1 input)

Legend: **fix** = regression test first, then fix (this round) · **defer** = recorded with a destination · **reject** = reason given. Batch A = quests/map/UI agent, batch B = economy/content/perf agent.

| # | Verdict | Action |
|---|---|---|
| M-01 | ✅ fix (A) | MAP-01 leak: one "known settlement" predicate (explored cell or visited) for canvas, side list, waypoint and autopilot; regression test + e2e assertion. |
| M-02 | ✅ fix (A) | Text changed to require kills (option 1). A real "drive off" outcome is a design item → backlog (later-vision-backlog L2, G-07 non-lethal resolutions). |
| M-03 | ✅ fix (A) | Board quests get explicit objectives (rats eliminated n/m, repair pending/done) shown in the quest panel and the journal. |
| M-04 | ✅ fix (A) | "Up to X c, paid by the settlement treasury" before acceptance; the amount actually paid is stored on the quest (`paid`, part of save format v9 — not released yet, no extra bump) and shown. |
| M-05 | 🟡 fix (B) | Keep the band soft, but make it a contract: statistical test over a seed corpus with an explicit maximum miss rate/distance (no generator change). |
| M-06 | ✅ defer | Real, but changes road layouts → `GEN_VERSION` bump; bundled with `render--008` step 4 (already a GEN bump touching roads). Test with the L-corner grid goes in there. |
| M-07 | ✅ fix (B) | Remove `XL` from `SettlementSize` until a generator/content contract exists; size-contract test for SM/MD/LG (required structures, households). |
| M-08 | ✅ defer | Accepted abstraction until the forge/smelting chain (later backlog L3 economy between settlements, recon G-01). |
| M-09 | ✅ fix (B) | Order price ≥ replacement value of the reserved inputs + labour; invariant test. |
| M-10 | 🟡 fix part (B) | Recipe economy audit (report + test with explicit, documented exceptions); price recalibration itself is deferred to an economy calibration pass (L3) — the audit makes the outliers visible, it does not silently change prices beyond the clear errors it documents. |
| P-01 | 🟡 defer + measure (B) | Add scheduler counters (`npc.schedulerVisited` vs `npc.updated`, same for fauna) to perf/soak; a due-time queue is deferred until population grows (L5) — current cost is ~200 NPCs × 20 Hz of a distance check (`bench:sim` p95 ≤ 1 ms). |
| P-02 | ✅ fix (B) | No per-tick clone of the animal array (deferred removals or reverse iteration). |
| P-03 | ✅ fix (A) | Board quests: active index by stable key, history bounded (last N done/expired), long-run test. |
| P-04 | ✅ fix (B) | Delete empty SpatialHash cells; test. |
| P-05 | defer | Generator start-up cost only (world cache hides it); measure in `bench:startup` before changing. |
| P-06 | already tracked | `render--003` / PERF.md. |
| C-01 | ✅ fix (B) | Every NPC wish reachable through a plausible channel (smith order, trader stock, recipe); reachability audit test (wishes, recipe ingredients, build materials, ammo of obtainable weapons). |
| C-02 | ✅ fix (B) | Item `availability: 'active' \| 'future' \| 'quest-only' \| 'unique'`; audit fails only for `active` items with no source. |
| C-03 | defer | Authored quests (QUEST-03) already give items from named stores; item/knowledge rewards for board quests → QUEST-04 / later backlog L2. |
| C-04 | ✅ fix (B) | Remove the unused `workbench` station kind. |
| C-05 | accepted | Household background production is an explicit, logged ledger source (verify--001); documented as such in D-VERIFY-1 follow-up — not hidden. |
| C-06 | defer | Skill-gain calibration → economy calibration pass (L3). |
| C-07 | ✅ fix (A) | Panels mutate state only through `Game` methods (TradePanel, QuestsPanel, OrdersPanel and any other found); CLAUDE.md rule. |
| UI-01…UI-07, G-01…G-07 | planned | UI-01…07 → [`ui--002`](../plans/ui--002--panels-at-scale-and-sensory-map.md); G-01, G-02, G-06 (+ M-08, M-10 prices, C-05, C-06) → [`economy--002`](../plans/economy--002--production-chain-and-calibration.md); G-03, G-04, G-07 (+ C-03) → [`quests--002`](../plans/quests--002--batch-2-rumours-and-rewards.md); G-05 → `proposals--001` input. Map: [later-vision-backlog](../roadmap/later-vision-backlog.md) §1d. |
| Audits A–E | A, B, E in batch B; C exists partly (route-band/generator tests) → M-05; D done (verify--001 soak). |

### Batch A results (2026-10-02)

| Finding | Regression test | Result |
|---|---|---|
| M-01 | `navigation.test.ts` "MAP-01: an unexplored, unvisited settlement is unknown — hidden from the list, waypoint and autopilot refuse it"; e2e acceptance "12. mapa: nieodkryta osada nie wycieka do listy (MAP-01)" | fixed: `isKnownSettlement`/`knownSettlements`/`waypointToSettlement`/`autopilotToSettlement` in `sim/navigation.ts`; `Game.targetSettlement` and `Game.autopilotTo` refuse unknown places; MapPanel list uses `knownSettlements` (mobile e2e M4 now checks any `autopilot-*` button) |
| M-02 | `questBoard.test.ts` "QUEST-01: the wolf quest text requires kills (no "drive off")" | fixed (option 1) |
| M-03 | `questBoard.test.ts` "QUEST-01: a rat quest exposes kills and repair as separate objectives…", "…a wolf quest has one kills objective" | fixed: `questObjectives()` (from fields), rendered by `BoardQuestObjectives.vue` in QuestsPanel and JournalPanel |
| M-04 | `questBoard.test.ts` "QUEST-01: the reward is shown as "up to X c"…" | fixed: `questRewardText()`, `Quest.paid?` (optional, no SAVE_VERSION bump) |
| P-03 | `questBoard.test.ts` "PERF-01 / QUEST-01: many repost cycles keep state.quests bounded…" (120 cycles, max 22 entries) | fixed: per-key index (`rats:<buildingId>`, `wolves:<settlementId>`) built once per run, `pruneQuestHistory` keeps live quests + last 20 finished + any inside the repost cooldown (no new saved state) |
| C-07 | `uiFacade.test.ts` "C-07: no UI file imports a sim mutator" | fixed: `Game.buyFrom/sellTo/giftTo/orderFrom/cancelSmithOrder/collectSmithOrder/acceptBoardQuest/apologize/moveStorage/hire/cancelPlayerActivity`; panels (Trade, Gift, Orders, Quests, Hire, Storage, ActivityBar) call only these |
