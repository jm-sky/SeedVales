# Authored quests batch 3: all remaining designed quests (17)

**Status:** planned  
**Model:** opus — engine extension design review, wave reviews, ❓ decisions; sonnet — engine slices, quest data, tests, e2e  
**Domain:** quests  
**Sub domains:** dialog, npc, fauna, economy, world-gen, items, save  
**Roadmap:** [later-vision-backlog](../roadmap/later-vision-backlog.md) stage **L2** (QUEST-04). Supersedes steps 4–5 of [quests--002](quests--002--batch-2-rumours-and-rewards.md) (which keeps rumours, reward bundles, non-lethal wolf resolution and the soak step).  
**Created:** 2026-10-03  
**Finished:** —

---

Sources: designs in [docs/design/quests/](../design/quests/README.md) (cast and places: [QUEST-WORLD](../design/quests/QUEST-WORLD.md), which wins on conflict), engine [quests-engine.md](../design/quests-engine.md) + D-QUEST-1/2, code in `src/game/sim/quest*.ts` and `src/game/data/quests/`.

## 0. Status of the 21 designs

| Done (engine + data + tests, `quests--001`) | Remaining (this plan) |
|---|---|
| Q03 `data/quests/q03.ts`, Q07 `q07.ts`, G03 `g03.ts`, G01 `g01.ts` | **Q01 Q02 Q04 Q05 Q06 Q08 Q09 Q10 · G02 G04 G05 G06 G07 G08 · Q11 Q12 Q13** |

All 17 remaining designs are chosen. Q10 is **blocked** on deferred systems (§9), the rest are implementable; four treasure quests (Q05, Q11, Q12, Q13) wait for `world--001` LOOT-01.

## 1. What the first slice can and cannot do (gap analysis)

The engine ([quests-engine.md](../design/quests-engine.md) §13) was built for four home-settlement quests. Reading the 17 designs against it gives this list of **missing primitives**; the per-quest sections (§5–§9) say which ones each quest needs.

| # | Gap | Needed by | Section |
|---|---|---|---|
| E1 | Cast and anchors only come from the **home** settlement `H` (`resolveNpcSlots` uses `npcsOf(homeId)`); treasuries are `{treasury:'home'}` only. Most remaining quests have givers/participants in **V** (neighbour, size `MD`) or **T** (town, `LG`) | Q02 Q04 Q05 Q06 Q08 Q10–Q13 G02 G05 G06 | E1 |
| E2 | Quest **items with state** (sealed/opened letter, flawed/mended plowshare), new item ids, heavy loot | G02 G06 Q04 Q05 Q06 Q09 Q11–Q13 | E2 |
| E3 | **Treasure / prepared goods** need an explicit external source (D-ECON-1). Today only the visitor kit mints | Q05 Q11 Q12 Q13 Q06 Q10 | E3 |
| E4 | **Persistent unique animals and dens** (white hare, Greybeard, sow + farrow, bull moose, prime bear, rutting stag) | Q01 G07 Q02 Q11 Q12 Q13 | E4 |
| E5 | Missing **event kinds**: `gather`, `dig`, `sell`, `fill`, `fell`, `skin`, `order` (today: roast/repair/light/douse/built/give/kill) | G04 Q05 Q09 Q08 G05 Q01 Q04 Q06 | E5 |
| E6 | **Price modifiers** per settlement with expiry (`priceMod.grain`, `tradeFriction`, wood +10 %) — nothing exists in `trade.ts` | G06 G08 G05 | E6 |
| E7 | **Deadlines** shown in the journal (G04: 2 days) and timed stages | G04 Q11 Q06 | E7 |
| E8 | Humans as **followers/companions** in scenes (today `follow` is animals-only); real `CompanionContract` terms from dialog | Q06 Q12 Q05 | E8 |
| E9 | **Recurring payouts** (tolls, loads) — rules fire `ever`/`day`/`always` only | Q11 Q10 | E9 |
| E10 | New **conditions/anchors**: `visited`, `season`, `place`, `landmark`, `den`, `dead`, `calm`, `companion`, `tag` | many | E1, E4 |
| E11 | New **landmark kinds** (chapel ruin in the marsh, tower ruin in the mountains) and landmark-relative anchors | Q11 Q12 (Q05/Q13 reuse existing kinds) | §7.0 |
| E12 | NPC modifiers (smith quality, work speed), village-consent scenes, rumours | Q04 Q09 Q08 | stubs/§10 |

Principle (unchanged from D-QUEST-1): a quest uses mechanics that exist plus the primitives in this plan; anything beyond is **stubbed as a flag + message** and written into the quest file's "Implementation notes".

## 2. Delivery order (waves)

| Wave | Content | Gate |
|---|---|---|
| **W0 Engine** (E1–E10, one commit per primitive, tests first) | §3 | `pnpm check` green, `questEngine.test.ts` extended, no `bench:sim` regression |
| **W1 H-only** | G08 → G04 → Q09 → G07 → Q01 | each: one vitest per ending + 1 acceptance step; wave review (opus, `wave-review`) |
| **W2 H ↔ V** | G06 → Q04 → G02 → G05 → Q08 → Q02 → Q06 | same + soak with all offered |
| **W3 Treasure** (needs LOOT-01 + W1 landmarks) | Q05 → Q13 → Q11 → Q12 | same + review (large quests) |
| **W4 Mine** | Q10 | blocked, §9 |

Order inside a wave goes from least to most new machinery, so each quest exercises one new primitive. After each wave: `verify`, `wave-review`, `app-review` skills, then `handoff` (state files + commit).

## 3. W0 — engine extensions

All additions are **optional/additive** (existing four quests and tests untouched). Layering rules stay: `data/quests/*` imports no `sim/*`; UI only through `Game`.

### E1 — Places: cast, anchors, sources in V and T

Settlements are identified by size: `H = world.homeSettlement` (SM), `V = size 'MD'`, `T = size 'LG'` (`world/gen/centres.ts`). A quest whose place does not exist in the seed is never offered (QUEST-WORLD rule 5).

`src/game/data/quests/types.ts`:

```ts
export type PlaceId = 'H' | 'V' | 'T'

export interface CastSpec {
  // ...existing
  /** npc: settlement the household belongs to (default 'H'). */
  place?: PlaceId
  /** npc: take the head of the first farmer household as the settlement's reeve (no mayor exists in the sim yet). */
  reeve?: boolean
}

export type Source =
  | 'player'
  | { purse: SlotId }
  | { store: SlotId }
  | { treasury: 'home' | PlaceId }   // 'home' kept for existing data (== 'H')
  | { warehouse: 'home' | PlaceId }

// anchors gain an optional place (default H); landmarks and dens are new kinds, see E4/W1
export type Anchor =
  | { k: 'house'; slot: SlotId }
  | { k: 'settlement'; kind: StructureKind; place?: PlaceId }
  | { k: 'torchpost'; slot: SlotId }
  | { k: 'road'; m: number; to?: PlaceId; at?: number }   // `to`: road toward that place; `at` 0..1 = fraction along it (Q02 bend)
  | { k: 'landmark'; kind: LandmarkKind; pick: 'nearestHome' | 'nearestRoad'; road?: [PlaceId, PlaceId] }
  | { k: 'den'; slot: SlotId }                            // home point of a creature slot
  | { k: 'offset'; of: Anchor; dx: number; dz: number }   // fixed offset (east stone of a circle)
  // ...existing
```

`src/game/sim/questCore.ts`:

```ts
export const placeId = (sim: Sim, p: PlaceId = 'H'): number | undefined =>
  p === 'H' ? sim.world.homeSettlement : sim.world.settlements.find((s) => s.size === (p === 'V' ? 'MD' : 'LG'))?.id

// resolveNpcSlots: npcsOf(placeId(sim, spec.place)); `reeve` = first household with profession farmer, head.
// moneyHolder/invOf: `{treasury: 'V'}` -> state.settlements[placeId('V')].treasury, `{warehouse: 'V'}` likewise.
```

New conditions (`Cond`): `{ k: 'visited'; place: PlaceId }` (uses `isVisited` from `sim/navigation.ts`), `{ k: 'season'; in: ('spring'|'summer'|'autumn'|'winter')[] }` (calendar helper in `sim/time.ts`), `{ k: 'tag'; ... }` is E2.

Offer-check cost stays bounded: `npcsOf` of at most three settlements (≤ 40 NPCs each) every 30 s per **not yet offered** quest, and the resolved cast is cached. Add a vitest `QUEST-04 PERF-01` that counts `npcsOf`/`actors.query` calls from the engine (same pattern as `QUEST-03 PERF-01`).

Tests: a V-cast quest is offered only when `visited V` and V has the household; payout from `{treasury:'V'}` is partial when short; conservation holds. `forceOfferQuest` in `questTestKit.ts` and `debug/api.ts` already exist and must accept V/T quests.

### E2 — Items with state, quest items

`src/game/sim/types.ts`: `ItemStack.tag?: string` (stacks with different tags never merge, like `sp`). Validate in `save/validate.ts` (`assertSaveShape` — string or absent).

`src/game/data/items.ts` (new ids; `weight`, `size`, `price` per QUEST-WORLD calibration; mark non-trade with `price: 0` + `quest: true` on `ItemDef` so `sellPrice` returns 0 and drop/sell are refused):

| Item id | Kg | Price | Used by |
|---|---|---|---|
| `letter` (tag `sealed`/`opened`/`amended`) | 0.05 | 0 (quest) | G06 |
| `plowshare` (tag `flawed`/`mended`) | 8 | 30 | G02 |
| `miles_mark` | 0.05 | 0 (quest) | Q06 |
| `axe_head`, `iron_wedge` | 2.5, 0.8 | 24, 6 | Q06 |
| `saw`, `shears`, `sickle` | 1.2, 0.4, 0.5 | 40, 14, 18 | Q09 |
| `oak_plank` | 6 | 14 | Q09 |
| `cheese`, `small_beer` (cask 5 kg) | | 6, 12 | Q08 G08 |
| `nails`, `snare` (verify first: `grep -n "trap" src/game/data/items.ts` — the traps skill exists, the item may not) | | | Q01 Q04 |
| `grey_pelt`, `white_pelt` | 1.5 | 25, 35 | G07 Q01 |
| `strongbox_dulcie` (15 kg), `gold_ring`, `emerald`, `ruby`, `silver_bar`, `gold_nugget_pouch`, `account_book` | | 0 / 100 / 180 / 180 / 75 / 100 / 0 | Q05 Q10 Q13 |
| `chapel_bell` (60 kg), `toll_chest` (25 kg), `ferry_seal` | | 380, 0, 0 | Q11 |
| `pinewatch_longsword` (unique; longsword stats, quality 3, +durability), `company_badge`, `guard_shield`, `spearhead` | | 520, 0, 40, 12 | Q12 |
| `ash_cuirass` (reinforced leather, quality 3), `ash_deed`, `wage_packet` | | 150, 0, 0 | Q13 |

A `unique: true` flag on `ItemDef` + a test "at most one stack of a unique item exists in the world" (inventories + stores + ground) covers the Pinewatch sword, rubies, the bell. Plan `world--001` step 2 (LOOT-01) owns *random* loot tables; the quest treasures here are **fixed** and listed in `data/quests/grants.ts` (E3) so LOOT-01 does not need to know them.

Conditions: `{ k:'hasItem', item, qty, from, tag? }` (tag filter), effect `give`/`consume` get an optional `tag`; effect `tag`: `{ k:'tag', item, from: Source, to: string }` re-tags one stack (G02 flawed→mended after Sophie's weld, G06 sealed→opened).

### E3 — Granted goods (treasure and prepared orders) with a declared source

D-ECON-1: nothing is minted silently. Add a registry and one effect:

`src/game/data/quests/grants.ts`:

```ts
/** Every good or coin a quest may create, with its justification. A test fails on a `grant` whose id is missing here. */
export const QUEST_GRANTS = {
  'q05:dulcie-box': { items: [{ item: 'strongbox_dulcie', qty: 1 }], money: 0, why: 'treasure (external, D-ECON-1)' },
  'q11:toll-chest': { items: [{ item: 'toll_chest', qty: 1 }, { item: 'chapel_bell', qty: 1 }], money: 0, why: 'treasure' },
  'q06:order': { items: [{ item: 'axe_head', qty: 1 }, { item: 'iron_wedge', qty: 2 }], money: 0, why: 'order crafted by Sophie, prepaid by Miles' },
  // ...
} as const satisfies Record<string, { items: { item: string; qty: number }[]; money: number; why: string }>
export type GrantId = keyof typeof QUEST_GRANTS
```

Effect: `{ k: 'grant'; id: GrantId; to: Source }` (once per quest per id: guarded by `st.fired['grant:'+id]`). `questCore.applyEffect` adds the stacks to the target and calls `logProduce(item, qty, 'quest:<id>:<grantId>')` / `logMint(money, ...)` from `sim/eventLog.ts` — same ledger path as the visitor kit. Treasure **contents** that the player later sells enter the economy through normal trade; NPC purses stay bounded (`sellPrice` uses the NPC's cash — see valuables note below).

Tests (`questGrants.test.ts`): every `grant` effect in all `AUTHORED_QUESTS` names a registered id; each id fires at most once; `totalMoney` equals start + granted money.

**Valuables and NPC cash limit** (`world--001` step 3): an NPC cannot pay 450 c for a sword if their purse has 80. Treasure sales therefore always go through an explicit `pay` from a named purse/treasury (Silas, Willa's guard) and partial payment applies — the quest never relies on the open market for its price.

### E4 — Creatures: unique animals, dens, young

`CastSpec.kind` gains `'creature'`:

```ts
creature?: {
  species: SpeciesId
  variant?: AnimalVariant            // 'albino' | 'alpha' | 'strong' exist already (FAUNA-09)
  at: Anchor                          // resolved once, cached
  young?: number                      // piglets etc. (variant 'young', follow the adult)
  den?: boolean                       // gives them a denId 'quest:<id>:<slot>' so the world spawner leaves them alone
  tag?: string                        // 'greybeard' — printed in journal/prints
}
```

- `Animal.questOwner?: string` and `Animal.tag?: string` (save shape + `assertSaveShape`). `fauna/ai.ts` and the den/respawn system skip animals with `questOwner` for **respawn**, so "one white hare, never respawned" is guaranteed; the animal may still die of simulation causes.
- Effect `spawn` already handles `kind:'spawn'` visitors; extend `spawnVisitor`'s sibling `spawnCreature(c, slot)` (`questCore.ts`) which uses `makeAnimal` (`sim/newGame.ts`) + `sim.addAnimal`. Spawn happens in `onOffer` (like Piers) **or** at accept (`effects: [{k:'spawn', slot:'sow'}]`) — Q02/Q11/Q12/Q13 spawn at accept so an unaccepted quest never changes the world; G07/Q01 spawn at offer because the animal "already lives there" (visible in the world, a design requirement for the hare and Greybeard).
- New conditions: `{ k:'dead'; slot }`, `{ k:'calm'; slot; r }` (animal within `r` m and **not** in `flee`/`aggro` state — "watch it without spooking it", Q01/Q02), `{ k:'near', slot }` already works for animals through `actorOf`.
- Events: `{ k:'kill', species }` gets `slot` resolved by actor id: the hook passes `actorId`; counters can `match.slot`.
- Fear/drive-off (FAUNA-07, verified): a lit torch/campfire within ~6 m makes wild animals flee; "drive" endings use an Observation (`dwellS`, `when: litTorch`, at the den anchor) then effect `scare` (new, one line: sets `flee` from the player for N min via the existing fear path). No scripted pursuit: G07's "keep at him for half a day" is a **counter** of fire-observations over two game days (§5.4).
- Carrion draws predators (Q11 killed bull): already implemented (FAUNA-08).

### E5 — New event kinds

`src/game/sim/questHooks.ts` `QuestEvent` and `data/quests/types.ts` `QuestEventKind` gain:

| Event | Hook (file → function) | Payload |
|---|---|---|
| `gather` | `sim/actions.ts` → `gatherNode` | `{ item, qty, nodeId }` (hemlock look-alike uses a node flag, see G04) |
| `dig` | `sim/actions.ts` → `dig` | `{ x, z, found: boolean }` |
| `sell` | `sim/trade.ts` → `sellToNpc` | `{ npcId, item, qty, tag? }` |
| `fill` | `sim/actions.ts` → `fillTrough` (also a bucket poured into a household barrel) | `{ buildingId, amount }` |
| `fell` | `sim/actions.ts` → `fellTree` | `{ nodeId }` |
| `skin` | `sim/actions.ts` → `butcher` | `{ species, q }` (hide quality) |
| `order` | `sim/orders.ts` → `collectOrder` | `{ npcId, item }` |

`Counter.match` gains `node?: 'oak'` (anchor-matched node id), `item?` (exists), `minQ?`. All hooks call `questEvent` exactly like `build.ts:136`, so they cost one function call when no authored quest is active (`handler && sim.state.authoredQuests`). Test: each hook increments the matching counter and does nothing without an active quest.

### E6 — Price modifiers (`priceMod`, `tradeFriction`)

New saved state `GameState.priceMods: { place: number; item: string | '*'; mult: number; until: number; why: string }[]` (calendar seconds). `src/game/sim/priceMods.ts`:

```ts
export function priceMult(sim: Sim, settlementId: number, item: string): number {
  let m = 1
  for (const p of sim.state.priceMods) if (p.until > sim.state.time.cal && p.place === settlementId && (p.item === '*' || p.item === item)) m *= p.mult
  return m
}
export const addPriceMod = (sim: Sim, p: Omit<PriceMod, 'until'> & { days: number }) => { /* pushes with until = cal + days*86400, replaces same why+place+item */ }
```

`sim/trade.ts`: `buyPrice` and `sellPrice` multiply by `priceMult(sim, npc.settlementId, stack.id)` (the existing rule "sell price always below the lowest buy price" must still hold: apply the multiplier before the `lowestBuyPrice` clamp and multiply `lowestBuyPrice` too — extend the review 006 #4 test with a mod active). Expired entries are pruned daily in `worldSystems.ts` (existing daily hook). Effect `{ k:'priceMod'; place: PlaceId | PlaceId[]; item: string; mult: number; days: number; why: string }`. `tradeFriction` (G08): `place:'V'`, `item:'*'`, `mult 1.2`, but only **for H residents** in the design — i.e. the player buying in V is not affected; stub: applies to the **player** when the player's home is H (always true here). Poorest-households-at-base-price (G06): stub, `priceMod` only; the reserve is a flag + message and an optional rule that gives the poorest household (lowest purse in H) a one-off bread gift from Stephen's store (named source) so the promise is visible.

Tests: price rises and expires; `bench:sim` unaffected (the loop is over ≤ 4 mods).

### E7 — Deadlines in the journal

`QuestDef.deadline?: { hours: number; from: 'started'; on: Effect[] }` and `StageDef.deadline` is **not** added (one per quest is enough). Journal text appends "Time left: 1 day 6 h" (`questDialog.ts` journal builder). When `since(hours, from:'started')` passes and the quest is not settled, the engine runs `deadline.on` once (G04: end `late`/`failed` per delivery state). `warn` on accept if another timed quest is active (QUEST-WORLD parallel quests): the accept effect posts a message listing it.

### E8 — Humans following / companions in scenes

- `follow`/`unfollow` effects currently set `Animal.questFollow`. Add `Human.questFollow?: { target: number }` handled in `sim/npc/ai.ts` goals (`quest_follow`: walk to ≤ 3 m of the target; idle). Used for Percy walking the dry bed (Q05 E2) — bounded by the same `until` rule as holds (review 014 #1).
- **Real companion contracts** (COMP-01..03 verified, `sim/npc/companions.ts: hireCompanion`): effect `{ k:'companion'; slot: SlotId; mode: 'hire'|'free'; days: number; wage?: number; task: CompanionTask }` calls `hireCompanion(sim, npc, task, risk, days)` (hire) or sets `CompanionContract { kind:'free' }`; condition `{ k:'companion'; slot; active?: boolean }`. The quest cleans up (`cleanup`) by dismissing the contract at end/lapse. `resolveNpcSlots` already skips companions at casting; here the quest creates the contract itself. Q06 pays the wage with a normal `pay` at the end (E1 of the design) — **not** daily by the companion system, so the contract wage is `0` and the quest owns the money flow (single source of truth, conservation test stays simple).

### E9 — Recurring payouts

`Rule.every?: { days: number }` plus `once: 'always'`-style gating: the engine stores `fired[ruleId] = lastDay` and fires when `day - last >= days`. `Rule.max?: number` caps the count. Used by Q11 E3 (tolls to the investor every 7 days, **from `{treasury:'V'}`**, partial, capped at 8) and Q10 E2 (10 % of weighed loads — blocked). Every payout has a named source, so "no loads = no payout" and conservation hold by construction.

### E10 — Test kit and e2e support

`questTestKit.ts` additions: `standAt(sim, anchorOrSlot)` (teleport the player for observations), `giveStack(sim, stack)`, `fastForwardDays(sim, n)` (calls `tickQuests` once per game hour), `castAt(sim, questId, slot)`, `endingOf(sim, id)`. `debug/api.ts`: `forceQuest` unchanged; add `__sv.teleportTo(slotOrAnchor)` for the acceptance script (dev only). `scripts/e2e/acceptance.mjs`: one new step per quest using `talkTo`, `questOpts`, `questState` (existing helpers, lines 42–69).

### W0 acceptance

`pnpm check`; `questEngine.test.ts` extended with E1–E10 unit tests named `QUEST-04 …`; FEATURES `QUEST-04` → `in_progress`; `docs/design/quests-engine.md` gets a "Batch 3 extensions" section and **D-QUEST-3** in DECISIONS (opus: places, grants registry, price mods, creatures). `SAVE_VERSION`: while v9 is unreleased the additions (`ItemStack.tag`, `Animal.questOwner/tag`, `Human.questFollow`, `priceMods`) are additive and need no bump (PROGRESS "Teraz"); if `world--001` LOOT-01 already moved the version to 10, follow the same rule at that number. Every new field gets an `assertSaveShape` check and a round-trip test.

## 4. Conventions for every quest (copy from Q03/Q07/G03/G01)

1. **Files:** `src/game/data/quests/<id>.ts` (plain data, exports `QuestDef`), registered in `data/quests/index.ts` (`AUTHORED_QUESTS` order = offer-check order), one vitest `src/game/sim/quest<Id>.test.ts` (copy `questG01.test.ts` layout: `testSim()`, `forceOfferQuest`, `tickQuests`, `choose`, `say`), acceptance step in `scripts/e2e/acceptance.mjs`, mobile step only for the first quest of each wave.
2. **Text:** English, from the design doc **verbatim**; names via `{slot}` and pronoun tokens `{slot:he|him|his}`, settlements `{H}`/`{V}`/`{T}` (add `{T}` to `questPlaceholders` in E1). `questText.test.ts` scans every string for design-doc names.
3. **Every reward is a `pay`/`give`/`grant` from a named source**, partial when short; the ending test asserts `totalMoney` constant (except `grant` money) and item totals change only by `consume`/`grant`.
4. **One test per ending** plus: refusal re-offer, required NPC dies → lapse (no held actor left, review 014 #1), save round-trip mid-quest, `choice` changeable until `settled`, no `actors.query` per tick.
5. **Stubs go into the quest file header comment and the design doc's new "Implementation notes" section** (same as Q03/Q07), and the design doc status line changes from "proposal (N)" to "implemented (I)" at the end.
6. **Design amendments** found while implementing are written to `DECISIONS.md` (one `D-QUEST-n` per wave, opus).
7. After each quest: update `docs/state/FEATURES.json` (`QUEST-04` evidence), `docs/state/PROGRESS.md`, README table in `docs/design/quests/`, then `verify` + commit (handoff skill).

Reward numbers below are the design defaults, kept in the quest data as named constants at the top of each file so calibration is one edit (plan ❓ 2 of quests--001).

---

## 5. Wave W1 — home settlement only (G08, G04, Q09, G07, Q01)

### 5.1 G08 — Well and Rumor (giver Ralph, H; medium)

Design: [grok-quest-08](../design/quests/grok-quest-08-well-and-rumor.md). New primitives: sick NPCs (existing `vitals.illness`), authored "bad barrel" (a flag + inspect observation), `priceMod` (E6). No quest start dependency.

| Cast slot | Role | Req |
|---|---|---|
| `ralph` | H farmer / head | yes |
| `wife` | H farmer / spouse | yes (sick) |
| `stephen` | H trader / head | yes (sick) |
| `tom` | H shepherd / spouse, head, son | yes |
| `dora` | H herbalist / head | yes |
| `molly` | H shepherd / head, spouse | no |
| `margaret` | V farmer / head (`reeve: true`) | no (accusation path only) |

```ts
export const G08: QuestDef = {
  id: 'g08', title: 'Well and Rumor', giver: 'ralph',
  cast: { /* as table; margaret: { kind:'npc', required:false, place:'V', profession:'farmer', reeve:true } */ },
  start: [{ k: 'day', from: 4 }, { k: 'alive', slot: 'tom' }],            // "3+ days in H"
  onOffer: [
    { k: 'ill', slots: ['wife', 'stephen'], illness: 'food', severity: 30, hours: 72 },   // new tiny effect over vitals.illness
    { k: 'set', flag: 'rumourStart', value: 'today' },
  ],
  flags: { accepted: false, whoDrank: false, wellClean: false, barrelBad: false, doraSaid: false, accused: false, tomTold: false, result: 'none' },
  stages: [ { id: 'rumour', ... }, { id: 'facts', ... }, { id: 'square', ... } ],
  observations: [
    { id: 'well', at: { k: 'settlement', kind: 'well' }, r: 3, dwellS: 4, when: [stageGte(1)], effects: [set('wellClean'), message('Cold, clear, smells of stone. A ladle of it tastes like it always has.')] },
    { id: 'cellar', at: { k: 'building', slot: 'tom', kind: 'house' }, r: 4, dwellS: 5, when: [stageGte(1)], effects: [set('barrelBad'), message('The end barrel smells sharp and wrong. At the bottom there is a grey slime. The cask was never scalded.')] },
  ],
  rules: [
    { id: 'doraTraces', when: [{ k: 'since', hours: 48, from: 'offered' }, flag('accepted', false)], effects: [{ k: 'end', ending: 'traced' }] },   // refusal: Dora traces it in two days, no reward
  ],
  endings: [
    { id: 'truth', journal: '…', effects: [
      { k: 'pay', from: { treasury: 'home' }, to: 'player', amount: 25 },
      { k: 'rep', delta: { honesty: 10 }, reason: 'Told the square the truth about the beer' },
      opinion('ralph', 20), opinion('tom', -5), opinion('dora', 5), { k: 'heal', slots: ['wife', 'stephen'] } ] },
    { id: 'quiet', /* pay 20, give small_beer ×1 from {store: tom}, helpfulness+10, Tom+20, Molly+10 */ },
    { id: 'accusation', /* no pay, honesty −15 (H,V), Margaret −25, Ralph −10, priceMod V '*' ×1.2 for 30 days */ },
    { id: 'traced', /* silent: no journal, no reward */ },
  ],
}
```

Mapping notes:
- **Facts** are flags set by dialog topics (Stephen/Wife/Dora via `topics` with `when: [stageGte(1)]`) and the two observations. `truth`/`quiet` need `barrelBad` + one more fact (cond `any`); the Ralph node hides the options otherwise (`needs` shows `reason` "You don't know enough yet").
- **Accusation** = a topic on `margaret` (V) with `when: [{k:'visited',place:'V'}]` and `< 2 facts`; the apology branch (bring `barrelBad` within a day → `honesty −5`, no friction) is a second option guarded by `since(24h, from:'stage')`.
- `quiet` needs `tomTold`, set by the option "Tell Ralph yourself. I'll come with you." (a `near` condition: player and Tom within 6 m of Ralph when the option is picked — `near` has `of: 'tom'`).
- New tiny effects: `ill` (sets `vitals.illness`, kind `food` — check `IllnessKind` in `types.ts`), `heal` (clears it). The sick NPCs recover by themselves after `hours`; the effect only starts it.
- Tom "scalds his casks" = flag `scalded` + message (no brewing sim); the beer item `small_beer` is `give` from Tom's store (partial; quest still ends if empty).
- Stub: crowd/square announcement = journal line + rep.

Tests (`questG08.test.ts`): each of 4 endings; refusal → `traced` after 48 h without reward; two facts rule; accusation + apology; conservation (treasury −25, player +25); `priceMod` active 30 days then expires; illness cleared.

### 5.2 G04 — Root by the Stream (giver Dora; medium, 2-day timer)

Design: [grok-quest-04](../design/quests/grok-quest-04-root-by-the-stream.md). New: deadline (E7), `gather` event (E5), hemlock look-alike, hand-over checklist.

Cast: `dora` (H herbalist/head, req), `toby` (H herbalist/child, req — presentation only), `molly` (H shepherd/head|spouse, opt), `stephen` (H trader/head, opt), `pip` not needed.

Key mapping:
- `deadline: { hours: 48, on: [ending 'failed' unless handed in] }`; `StageDef` text "Time left" appended by E7. Accept effect `{k:'timedWarn'}` posts the overlap warning.
- Advance: option B `pay {purse:'dora'} → player 10` + `set advance 10`.
- Herb sources: Molly's mint = topic `give {store:'molly'} → player mint ×2` once (flag `mintGiven`); Stephen's chamomile = ordinary trade (no quest code); yarrow = `gatherNode`. **Look-alike:** map nodes of kind `herb` in the marsh get a `lookalike` roll at gather time: in `gatherNode` (`actions.ts`), when a quest `g04` is active and the node is a marsh `yarrow` node, `rng() < 0.5 - survival/400` returns `hemlock` instead and posts the narrated hint ("smells faintly of mice"). The roll lives in a small pure function `gatherLookalike(sim, node)` in `sim/questHooks.ts` guarded by the `gather` event handler returning a replacement item — only when the quest is active, so ordinary play is untouched. Option C ("What does yarrow look like?") sets `askedLook`; with it the roll is 0 hemlock for players who pass the survival 15 check (design: knowledge helps).
- Delivery: node `do_deliver` options are generated from a `needs` condition `hasItem yarrow ≥ 2 & mint ≥ 2 & chamomile ≥ 1` (from `'player'`). Effect list on delivery: `consume` the herbs from `player` (**sink**, logged `quest:g04`), then `if` (`since(…) < 48h`) `then` pay on-time (`pay {purse:'dora'}→player 30 − advance`; alternative `give {store:'dora'} salve ×2`) `else` late (15, bandage ×2). Hemlock among the bundle: `needs` fails with `reason`, and a separate option "Hand over what I have" → Dora catches it: `set hemlockCaught` + `consume hemlock` (taught) and continues if real yarrow is in the bag.
- `q04.status=done` for G07's poison gate: nothing special — G07 reads `{k:'quest', id:'g04', in:['done'], started:true}` and `opinion(dora) ≥ 10`.
- Toby epilogue: two options → `opinion('toby'…)`, `opinion('dora', 5)`.
- Stub: Toby's sickness = journal text only.

Tests: on time / late / failed (deadline, advance stays), hemlock caught, theft is not special-cased (no assertion), partial pay when Dora's purse is short, `deadline` journal text, timer overlap warning with G03 active, G04 `done` unlocks G07 `poisonOK`.

### 5.3 Q09 — Goods on the Ground (giver Stephen; small)

Design: [q09](../design/quests/q09-goods-on-the-ground.md). New: barter through real item moves, `sell` event, commission stub, tools raise work speed (stub).

Cast: `stephen` (H trader/head, req), `miles` (woodcutter head), `ralph` (farmer head), `molly` (shepherd head|spouse) — all req (the design needs all three needs).

State: `needsHeard` counter (0–3), `deal`. Counter `{ id:'needsHeard', on:'give' }` is the wrong tool — needs are dialog-set: each house node does `set miles`/`ralph`/`molly` true and a rule recounts into the numeric flag (`needsHeard`), or simpler: flags + cond `any` of pairs (as G01 `leads2`).

Deals:
- `barter` (needs `needsHeard ≥ 2`): physical moves. Three **delivery counters** on the `give` event: `give` to Stephen of `wool`, `grain` (qty 2), `oak_plank` (2) — `Counter { on:'give', match:{ slot:'stephen', item:'wool' } }`. When satisfied for a household, the matching tool moves from Stephen's store to that household (`give {store:'stephen'} → {store:'molly'} shears`) via rules (`once:'ever'`), and the player gets `pay {purse:'stephen'} → player 10` at the end. Stephen's tools must exist: `onOffer` `grant q09:tools` (saw, shears, sickle, rope) into Stephen's store with `why: 'trader stock brought from {T}'` (Stephen "is back from {T}"): documented external source, once.
- `consign`: wool+planks go to Stephen's store as above, tools handed out **immediately** (`give` from Stephen), a `tally` flag; rule `commission` waits `since 72h`, then Stephen **pays the houses from his purse** (`pay {purse:'stephen'}→{purse:'molly'|'miles'}` what the goods fetched: fixed 12/18 c, partial) and the player gets 10 from Stephen + 5 from each house purse. If the planks "don't sell" (rng at settle time, seeded flag) they return to Miles's store — `give` back, no pay for that house.
- `order`: sets `list` flag; rule after 5 days `grant q09:extra-stock` (2 shears, 5 salt? → not an item; use `iron_ingot ×2`) into Stephen's store; opinion +5 each.
- Wheelbarrow: Miles's topic `give {store:'miles'}→player wheelbarrow` (exists as an item, TRANS-01) and flag; returned by `give` back; no enforcement (design: "he'd like it back with the wheel on").
- NPC work speed with tools (N): stub — flag `toolsFor<slot>` + message; **not** implemented.

Tests: barter end-to-end with real stacks (heavy: carrying limit forces two trips → `fitQty` message), consign pays from purses and survives Stephen's short purse, order produces stock, Stephen dies → commission frozen (quest lapses without penalty).

### 5.4 G07 — Trail of Greybeard (giver Jacob; medium)

Design: [grok-quest-07](../design/quests/grok-quest-07-trail-of-greybeard.md). New: unique wolf (E4), den, clues as observations, four methods, quest gate on G04.

Cast: `jacob` (H hunter/head, req), `martha` (hunter/spouse, req), `mark` (guard/head, req), `dora` (herbalist/head, opt), `hazel` (hunter/child, opt), `greybeard`: `{ kind:'creature', required:true, creature:{ species:'wolf', variant:'alpha', at:{k:'road', m:900, ...} (a wild point ~900 m north of H: new anchor `{k:'wild', bearing:'north', m:900, biome:'forest'}`), den:true, tag:'greybeard' } }`.

> Anchor `wild`: resolved with `world/terrain` + `biome` queries once; reuse the `roadPoint` offset idea but off-road: pick the nearest forest cell ≥ m from H in the given bearing, dry land, slope < 3. Cached in `anchors`. Add it in E1 together with `landmark`/`den` (it is also used by Q01 hazels and Q02).

Start: `[{k:'day', from:2}, {k:'posts', gte:1}]` and "first night passed" (cond `day from 2`).
Clues (stage 1): `post` = topic on `mark` (set `cluePost`); `print` = Observation at `{k:'wild', bearing:'north', m:350}` ("ditch", `r 6, dwell 4, when [stageGte(1)]`); `den` = Observation at `{k:'den', slot:'greybeard'}`, `r 12`, `dwell 6`, `when: [flag('cluePrint')]`. A rule advances to stage 2 when ≥ 2 clues (cond `any` of pairs).
Methods (stage 2) — option ids on the `jacob`/den nodes:

| Method | Mechanism | Ending effects |
|---|---|---|
| `bow` | the player kills Greybeard: counter `kill` with `match.slot:'greybeard'` → end `bow`. With `assist`: `onAssist` effect `hold jacob at den` for 3 h + a one-shot "Jacob shoots" = `damage` effect on the wolf at the first aggro tick (stub: 1 arrow worth, `{k:'hurt', slot:'greybeard', amount: 25}`) | `pay {treasury:'home'}→player 30` (`if_empty` Jacob's purse max 20 via a second `pay` guarded by `flag treasuryShort` — see below), `give` `grey_pelt` from the corpse: the pelt is normal skinning loot, so no `give`; instead `hasItem grey_pelt` is **not required**. courage +10; Jacob +30; Mark +10; Martha +15 |
| `trap` | the existing traps skill: counter `kill` with `match.slot:'greybeard'` **and** `cause: 'trap'` (event payload `cause`) | like `bow`, courage +5, renown +3 |
| `drive` | Observation at the den: `dwellS 20, when [litTorch]` then `scare` effect (E4) + counter `driveDays` ticks once per day while `stage ≥ 2` and the player is within 400 m of Greybeard with a lit torch (rule `once:'day'`); at `driveDays ≥ 2` → effect `despawn greybeard` (he "leaves the region", den abandoned) → end `drive` | pay 20; courage+5, helpfulness+5; Jacob+20; Hazel+10 |
| `poison` | gate `{k:'quest', id:'g04', in:['done'], started:true}` + `opinion dora ≥ 10`; effect: place `hemlock` bait: `consume hemlock ×2 from player` at an Observation of the den (`dwell 8`, `when hasItem hemlock 2`); Greybeard dies by simulation after one game day: effect `slay greybeard in 24h` → rule with `since 24h` → `kill` effect `{k:'slay', slot}` (sets hp 0; **no loot**, corpse remains) → end `poison` | pay 20; honesty −3 (rumour tick rule: 3 days later); Jacob −15 when "he learns" (rule `since 24h` after poison) |

Jacob's "if you never take the quest, he kills Greybeard himself after ~20 nights" = rule in the **offered** phase: `{ id:'jacobKills', when:[{k:'day', from: 22}, flag('accepted', false)], effects:[{k:'slay', slot:'greybeard'}, {k:'lapse'}], phase:'offered' }`.
Failure at the den → "den relocation": effect `relocate greybeard` + reset `clueDen` (`set false`), nodes unchanged.
Treasury shortfall fallback: engine `pay` already pays partially and posts a message; the design's "if empty, Jacob's purse max 20" is a second `pay` right after (`from:{purse:'jacob'}`, `amount: 20`) wrapped in `if when [{k:'flag', flag:'shortPaid'}]` — flag set by `pay` when partial (E1 addition: `pay` sets `flags['_short']`). Keep it simple: two sequential `pay` effects with amounts 30 (treasury) and, only if the first was short, `if`.

New effects here: `slay` (kills an animal, no loot, for poison), `relocate`, `hurt`. Each is 5–10 lines in `questCore.applyEffect` and a unit test.

Tests: each method's ending, poison gate closed without G04, drive needs two days, den relocation, `jacobKills` rule, wolf is not respawned (kill it, advance 10 days, assert no new `greybeard`), no held actor left, G03 `show` flavour line (soft link: `quest g03 ended show` → Hazel line).

### 5.5 Q01 — A Hare Out of Place (giver Jacob/Luke; small)

Design: [q01](../design/quests/q01-a-hare-out-of-place.md). Needs the white hare (FAUNA-09 `albino` variant exists in `AnimalVariant`; status `implemented_unverified`) — **verify rendering on WSL before accepting this quest** (plan step 1).

Cast: `jacob` (H hunter/head, req), `luke` (H shepherd/son, req), `stephen` (H trader/head, req), `hare`: creature `{ species:'hare', variant:'albino', at:{k:'wild', bearing:'forestEdge', m:450}, tag:'white_hare' }` spawned in `onOffer`.
Start: `[{k:'day', from:2}, no wolf/boar within 400 m of H]` — new cond `{ k:'threat', r: 400 }` (reads the existing `sim.threatNear(h)`/`sim--001` animal-threat index; if absent, query the spatial grid once per offer check — allowed, 30 s cadence, single query, assert in the PERF test).

Observations (all `reset:true`, "watch from cover"):
- `feeding`: at `{k:'actor', slot:'hare'}`, `r 25`, `dwellS 20`, `when [calm hare r 25, sneaking, not near(<8 m)]` → `set feedingSeen`; Luke present flag `lukeSaw` if `near luke ≤ 15` at that moment (effect `if`).
- `cover`: at the hare's den point, `dwellS 6`, `when: [flag feedingSeen]`, effect `set coverSeen` (the "startled" detail is relaxed to: the hare returns to its hide when the player stays calm; a `scare` also counts: option "show yourself").
- Decision at Jacob (`choice` ∈ pelt/ordinary/watch). `watch` needs `feedingSeen & coverSeen & lukeSaw` plus one more observation on **another day** (`observation.when: [{k:'day', from: <day of watchDone> +1}]` — implemented as flag `watchDay` = `'today'` and cond `flag gte` on day via a new `{k:'dayAfter', flag}` helper cond).
- Endings: **E1 pelt:** counter `sell` to Stephen with `match.item:'white_pelt'`; a skinned albino hare yields `white_pelt` (butcher: species `hare`, variant `albino` → loot id `white_pelt`; 3-line change in `actions.ts: butcher` + `data/items.ts`). `sell` hook → ending `pelt`: Stephen's own trade already paid at sell; the quest adds the **bonus** so total is 30–40 c: `pay {purse:'stephen'} → player (35 − paidAtTrade)` and Luke's share `pay player→{purse:'luke'} 15` (a real transfer) then Luke "buys the bag": `give {store:'stephen'}→{purse:'luke'}` is not needed — flag `lukeBag` + message (NPC equipment by purchase is stubbed). **E2 ordinary:** counter `sell` of `raw_meat`/`hide` to Stephen ≥ 1 within the stage → `pay stephen→player 6` bonus, opinion jacob +10, Luke practises skinning (flag only). **E3 watch:** `give {store:'jacob'}→player snare ×2, arrow ×10` (partial) + message; no coin.
- Killing the hare before `watchComplete` closes `watch` (cond `dead hare` hides the option); hare dead of other causes: E1 only if a `white_pelt`/corpse exists — stub: E1 requires the pelt item, so no corpse = no E1.
Tests: three endings, kill-before-watch, hare not respawned, watching without cover scare, `threat` start gate, Luke absence line.

---

## 6. Wave W2 — H ↔ V (G06, Q04, G02, G05, Q08, Q02, Q06)

W2 starts only after E1 (places). All V NPCs exist in the sim; the quest topic appears when the player talks to the cast NPC, so no V world scan occurs.

### 6.1 G06 — Trader's Letter (giver Stephen H → Jack V → Stephen; medium)

Design: [grok-quest-06](../design/quests/grok-quest-06-traders-letter.md). New: `letter` item with tag (E2), V cast, `priceMod` (E6).

Cast: `stephen` (H trader/head), `jack` (**V** trader/head), `margaret` (V farmer/head, `reeve:true`), `ralph` (H farmer/head, opt for public), `farmer` (V farmer other household member, opt).
Start: `[{k:'visited', place:'V'}, any(opinion stephen ≥ 10, quest q09 done)]`.

Mapping:
- Accept: `give` effect from nowhere → use grant: `grant 'g06:letter'` (a `letter` tagged `sealed` into the player's inventory; `why: 'authored carried message'`) — quest item, `price 0`, not droppable.
- Jack's reading scene: the node `jack_read` has a condition `hasItem letter tag sealed`; first option effect `{k:'tag', item:'letter', from:'player', to:'opened'}`. Opening the letter yourself: the design says the seal break is a normal world action; implement as an inventory action **“Break the seal”** (UI: item context menu, `Game.breakSeal()`), effect: tag → `opened` and flag `playerOpened`. Jack then refuses (`result=refused` without advice), Stephen −15 on turn-in. This is the only new UI affordance (1 context-menu entry, shown only for `letter`).
- Choices (`agreed`/`capped`/`refused`/`public`):
  - `agreed`: `priceMod {place:['H','V'], item:'grain', mult:1.4, days:60}`; Stephen +15, Jack +10; rumour rule: `since 72h` → `rep honesty −5 (V)`.
  - `capped`: `tag letter → amended`, `priceMod grain ×1.15`, flag `reserve`; rule: first day a poorest-household member (lowest purse H) is present, Stephen gives one `bread` from his store (named source) — visible stub of "poor buy at base price"; `rep helpfulness +5` when the rule fires; Stephen +10, Jack +15.
  - `refused`: no change; Jack +10.
  - `public` (needs `farmersHeard` flag, set by a topic on `farmer`): scene at Margaret with Jack; Ralph attends "by message" = rule delay 24 h (`since 24h from stage`) then `priceMod ×1.15` + announce message; pay Stephen 10 + `{treasury:'V'}` 10; honesty +10, renown +5; Stephen −10, Jack +10, Margaret +20, Ralph +10.
- Delivery to Stephen: node reads `result`; pay `{purse:'stephen'}` 10 (agreed/refused/public), 12 (capped); refused-by-player (C at start) → world rule `carterDelivers`: after 7 days `priceMod ×1.4` as `agreed` (default world outcome), unless the player talked to Jack meanwhile.
- Lost letter: option on Stephen "I lost it" → new `grant g06:letter` after `since 24h` (once per extra copy, max 1) — `fired` guard.
Tests: four results; opened seal path; refusal default outcome; price mods change `buyPrice` in H and V and expire; conservation; Jack dies → lapse with 10 c trip pay (quest-end effect `pay`).

### 6.2 Q04 — The Handle Remembers (giver Sophie, V; small)

Design: [q04](../design/quests/q04-the-handle-remembers.md). New: tool test as Observation, order with materials, NPC output modifier (stub-light).

Cast: `sophie` (V blacksmith/child|head — the forge runner; pick `kin:['child','head']`, `age:'adult'`), `bernard` (V blacksmith/elder|head). `place:'V'` both, required.
Start: `[{k:'visited', place:'V'}]`.
Flags/choice as design (`reforge|new|keepsake`). Scenes:
- `S3 test`: Observation at `{k:'building', slot:'sophie', kind:'anvil'}`, `r 3`, `dwellS 8`, `when [flag bernardTold]` → `set testDone`; **`crackFound`** = a second Observation `look` at the same anvil: `dwellS 5`, `when: [flag testDone]` (the "looking at the head closely" action; with survival ≥ 10 or smithing ≥ 5 effect adds `crackFound`, otherwise Sophie finds it herself at the next topic — `reforge` needs `crackFound` per design, so the fallback is **always** reachable by repeating the look; a skill roll never gates progress).
- Choices unlock: `reforge` needs `crackFound`; materials `coal ×4` (reforge) or `iron_ingot ×2 + coal ×4` (new) are checked with `hasItem` from `player`; **work** = real CRAFT-02 order: effect `{k:'order', smith:'sophie', recipe:'hammer'|'war_hammer'...}` — wraps `placeOrder(sim, smith, recipeId)` from `sim/orders.ts:51` with the materials `consume`d from the player (deposit paid by the player when forge materials are used: `pay player→{purse:'sophie'} 12`). Completion: `order` event (E5) on `collectOrder` → counter `orderDone`; ending fires in the Bernard node.
- Endings: E1 reforge: service reward `repairAll`: new effect `{k:'serviceRepair', slot:'sophie'}` sets durability of one player-chosen weapon/tool to max — stub UI: repairs the **equipped main-hand item** (documented), otherwise nothing; Bernard's output modifier: `Human.workMult 1.1` on Bernard for 30 days (E12 stub: just a flag + message; if `Human.workMult` exists by then, wire it). E2 new: `give {store:'sophie'}→player nails ×20` (partial) or `knife`; if the player brought iron, no labour charge (the deposit is refunded: `pay sophie→player 12`). E3 keepsake: opinion +15 for both, `give {store:'sophie'}→player cooked_meat/bread` meal (partial), and a rule `since 14 days` → message "Sophie made Bernard a light hammer".
- Refusal: flag `handleOnly` → Sophie fits a new handle; the world note (shivering/weaker work) stays; G02 background remains true.
- Soft link G02: Bernard's extra line when `quest g02` has `bernardAdmits` — conditional line, no gating.
Tests: three endings with materials from the player, order really completes (smith time), `reforge` closed without `crackFound`, refused order returns materials (CRAFT-02 rule), Sophie dead → order waits then lapses.

### 6.3 G02 — Rusty Debt (giver Bernard V; medium)

Design: [grok-quest-02](../design/quests/grok-quest-02-rusty-debt.md). New: `plowshare` item with tags `flawed`→`mended`, V and H treasuries, inspection observation.

Cast: `bernard`, `sophie` (V blacksmith, as Q04), `ralph` (H farmer/head, req).
Start: `[{k:'visited', place:'V'}]`. `onOffer`: `grant 'g02:plowshare'` into **Ralph's household store** (the share Bernard already made: `plowshare`, tag `flawed`, `why:'goods crafted by Bernard before the quest'`). 35 c is held in `{treasury:'home'}` (exists: TREASURY_START 150) — test asserts the treasury has ≥ 35 at offer, else the start condition `{k:'treasuryGte', gte:35}` blocks (new tiny cond).
Mapping of outcomes:
- `settled30`: needs `priceKnown` (Sophie topic, optional) → `pay {treasury:'home'}→{purse:'bernard'} 30`, then reward `pay {purse:'bernard'}→player 8`.
- `mended`: `take share`: `give {store:'ralph'}→player plowshare` (8 kg; the heavy-item carry rule applies — handcart suggestion in text), at the forge Sophie re-welds: effect `tag plowshare player flawed→mended` after `since 12h from stage` ("half a day"; the player waits or sleeps — implemented as a timer-gated option, not a craft order), carry back, `give player→{store:'ralph'}` and `pay {treasury:'home'}→{purse:'bernard'} 35`; player reward `pay bernard→player 12` + `serviceSharpen` (same stub as Q04 `serviceRepair`). `bernardAdmits` set by Mend options A/B; B requires `quest q04` flag `crackFound`: cond `{k:'quest', id:'q04', in:['active','done'], flag?}` — add optional `flag` filter to the `quest` cond (`{k:'quest', id, in, flagEq:{crackFound:true}}`).
- `returned`: `give player→{store:'bernard'} plowshare`, `pay bernard→player 5`; Ralph −5.
- `pressured`: Ralph pays 40 (`{treasury:'home'}` 35 + `{purse:'ralph'}` 5) → `{purse:'bernard'}`; honesty −8 (H), courage +3 (V), Ralph −20, Sophie −5; only offered when `priceKnown` is **false or true** (always available, design option D).
- Abandoned share: the `plowshare` stack dropped as a world item; Ralph −10 if he learns (rule `since 48h` while `share not in inventory/stores` — stub: flag + opinion).
Tests: four outcomes; Bernard/Ralph/Sophie deaths (design lines: Sophie closes; payments to household purse — implement via `lapse` effects that `pay` to `{store}`); G02↔Q04 soft link; conservation across the three purses and the home treasury.

### 6.4 G05 — Disputed Oak (giver Miles H; medium)

Design: [grok-quest-05](../design/quests/grok-quest-05-disputed-oak.md). New: unique tree node, evidence set, mediator verdict, `fell` event, wood `priceMod`.

Cast: `miles` (H woodcutter/head), `cedric` (V farmer, *second* household if two, else the head: `place:'V', profession:'farmer', kin:['head'], pick:'last'` — add optional `CastSpec.pick: 'first'|'last'` default first), `elspeth` (V shepherd/head|spouse), `ralph` (H farmer/head, `reeve`), `margaret` (V farmer/head, `reeve`) — mediator is whichever the player brings the case to, so both are required cast (reeve of V = first farmer household).
The boundary oak: Anchor `{k:'landmarkTree'}`? Use a generated **boundary point**: `{k:'boundary', frac:0.5}` = a point on the H–V road at 50 % ± 120 m off road, snapped to the nearest tree node (`sim.nodes.query`, once, cached with `id`). If no tree within 60 m, the engine **designates** the nearest large tree (`ResNode kind tree`, `age` high) and marks it `questOwner: 'g05'` (a flag on the node; new optional `ResNode.questTag?: string`, saved with the nodes' state delta — check `nodes.ts`; if node deltas are not saved, store the node id in `anchors[...].id` and keep felling state in quest flags: `oakFelled` + the node is hidden via existing tree depletion). Decision: store id in `anchors`, felling uses existing `fellTree`.
Evidence (stage 2) = four Observations (`bark`, `stone` at offsets from the oak, `age` requires survival ≥ 10 **or** felling skill ≥ 10 — cond `any`), `witness` = Elspeth topic, flag counter `evidence` (rule recount). Cedric topic A needs evidence ≥ 2, unlocks `shared`.
Verdict nodes live on the reeve slots (`topics` on both, same `node` reachable from either; `needs evidence ≥ 2`).
Endings:
- `shared`: `pay {treasury:'home'}→player 12` + `pay {treasury:'V'}→player 12`; rep helpfulness +8 (both: `rep` effect needs `place`: add optional `place` to `rep`, default H); flag `felling rights V woods` + Miles gets two **trees** he may fell: modelled as `grant`? no — flag + message (stub per design "felling rights as a flag"); deadwood limbs: `give` nothing (message).
- `for_h`: `fell` event on the oak node is required **by Miles**: effect `{k:'fellOak'}` (NPC logging stub: tree depleted, `log ×4` placed into Miles's store from the tree's natural yield — use `nodes` depletion: logs come from the node yield, and the quest `give`s nothing). Pay `{treasury:'home'}` 15; honesty +5 H, −5 V; Miles +25, Cedric −25; `pannage` stub: `priceMod V pork? ` not modeled → message + flag `cedricPigsThin` (E12).
- `for_v`: pay `{treasury:'V'}` 15; honesty +5 (V); Cedric +25; Miles −10.
- `felled_at_night`: counter `fell` on the oak node at night (`hour night`) by the player → ending: honesty −20 (H and V), Cedric −40, V reeve −20, Miles −10, wood `priceMod` H+V '*' for `log` ×1.1 for 90 days (E6; "a season").
Q03 link: ending `shared`/`for_h` sets a quest-state flag that Q03's `storeDebt` rule already reads? Q03 is done; add cond line only if trivial, otherwise record as a stub in notes.
Tests: evidence gating (≥2), each verdict via both reeves, night felling, oak felled only once, V cast missing → not offered.

### 6.5 Q08 — The Long Way to Water (giver Elspeth V; medium)

Design: [q08](../design/quests/q08-the-long-way-to-water.md). New: build events at V (`built`), `fill`, `dig` observation, rota stub.

Cast: `elspeth` (V shepherd/head|spouse, req), `margaret` (V farmer/head, reeve, req), `bridget` (V guard/head, req), `cedric` (V farmer last, opt).
Mapping:
- `routeWalked`: Observation at `{k:'road', to:'V', at:0.15}`-style anchor "pasture corner" = `{k:'building', slot:'elspeth', kind:'pen'}` `r 8`, `dwell 3`. `groundChecked` = `dig` event (E5) at an anchor `{k:'offset', of: lowField, dx:0, dz:0}` where `lowField` = nearest `field` of Margaret's household (`{k:'building', slot:'margaret', kind:'field'}`): counter `{ on:'dig', match:{ near:{ anchor: lowField, r: 12 } } }` ≥ 1 (the shovel already supports digging — ITEM-04; the quest only listens).
- `plan`: `trough` → counter `built` kind `trough` within 40 m of the pen anchor **and not within 12 m of the road** (new match `offRoad: 12`), then counter `fill` with `minAmount` (three bucket trips = three `fill` events ≥ 1 each) ≥ 3, `owner` effect to Elspeth's household (exists). `well` (needs `groundChecked` and the village consent scene): consent = Margaret topic option → `set consent` after `since 12 h from stage` (stub of "asks in the square") ; build `well` near the low field (`built` kind `well`, `near lowField r 25`, **new**: `build.ts` must allow wells outside settlement squares: design ❓ "new wells outside the square v1 or SET-04" → decision D-QUEST-3 (opus); default: allow `well` blueprint anywhere with ≥ 2 spades dig check). `rota`: 3 game days kept = counter by rule `once:'day'` increments while the flag `rota` is set and no `animalsNearWell` violation is observed (stub: always kept unless the player sets 'break' flag; Bridget shouts: message).
- Endings: E1 `give {store:'elspeth'}→player wool ×3` (or cheese ×2 if wool short) + `pay {treasury:'V'}→player 15`; E2 `pay {treasury:'V'}→player 40` + rep helpfulness +8 (V); E3 `pay {treasury:'V'}→player 10`. Rota break → quest reopens (`status:'refused'` re-offer path exists for G01/G03: reuse).
- Road violation: if a `trough`/`well` is built within 6 m of the road → `deconstruct` effect after one day (Bridget): 3-line `build.ts` removal (exists? `sim.removeBuilding` — check, else stub = message + no payment until moved).
Tests: three endings, trough gating (off-road), dig counter, drought pause (cond `weather` — check `weather.ts` has `drought` flag; else stub), V cast absence.

### 6.6 Q02 — The Hollow Below the Road (giver Edith V; medium)

Design: [q02](../design/quests/q02-the-hollow-below-the-road.md). New: creature group with den (E4), detour build (stub road segment).

Cast: `edith` (V hunter/head, req), `bridget` (V guard/head, req), `jacob` (H hunter/head, opt), `margaret` (V reeve, opt for piglets), `sow`: creature `{ species:'boar', at:{k:'road', to:'V', at:0.7}, den:true, young:5 }` (the "hollow" = anchor at a point 8–25 m beside the road, resolved once).
Start: `[{k:'visited', place:'V'}]`; Q01 link: S2 line `when: [any(quest q01 done, opinion jacob ≥ 10)]`.
Flow:
- accept → spawn sow + five piglets (`onAccept`), `hold`? no: the sow stays at the den by her normal den AI (aggressive near young, FAUNA-07 verified).
- `tracksRead`: Observation on the road bend `r 6, dwell 4, when [hour 4..9]` ("at first light").
- `hollowFound`: Observation `near sow den r 30` (without spooking: `when: [calm sow r 30]`); `farrowCounted`: `dwell 8` at `r 20`, `calm`. Spook → sow aggression is already systemic; effect `scare` is not used; Edith's S5 line triggers on first aggro: new event `aggro` is **not** needed — Observation `when: [not calm sow]` sets flag `spooked` with the line.
- `reported` = option at Bridget after `hollowFound`.
- Endings: **E1 clear:** either `kill` counter on sow (`match.slot:'sow'`) *or* drive-off: Observation at den `dwell 15, litTorch` + effect `scare sow` (E4) → sow flees to a point ≥ 200 m, `despawn` den; plus a **burn den** action already implemented ("burning a den — 5× branch + flint"): counter on a new event `burn` (E5 addendum) — hook in the existing den-burn code (find with `grep -n "burn" src/game/sim/*.ts`). Pay `{treasury:'V'}→player 40`; courage +, helpfulness + (V); piglets: if sow killed, `transfer` the piglets to Margaret's household as livestock: effect `{k:'adopt', slots:['piglets'], to:'margaret'}` (sets `householdId` + pen; E12 stub → just a message if no pen exists).
  **E2 reroute:** counter `carried` — the player brings ≥ 4 `log` (half of 8 beams) to a `{k:'settlement', kind:'woodpile', place:'V'}` via `give` events; remaining 4 posts are "done by V woodcutters" via rule `since 48h` → flag `detourBuilt`; effect `roadMod` is a **stub** (flag + message; the real "working road segment" (N) is not built): reward `pay {treasury:'V'}→player 22` + `give {store:'bridget'}→player bread ×2` (free meal).
  **E3 watch:** counters `shifts` (rule: player stands at the bend anchor for `dwell 120 s` on an evening, `when hour 18..22`, once per day, max 3 counted; each pays `{treasury:'V'}` 6) over `since 42 days` **or** the sow leaves (cond `dead`/`calm far`: `{k:'far', slot:'sow', r:200}` new cond = not within r) → end `watch`: message "bend clear, not safe forever"; stub: seasonal note flag.
- NPC resolution ("settled by V" if Edith/guards solve it): rule `since 14 days` & `flag reported` false → ending `settled` (small opinion for any report).
Tests: three endings, spooked sow does not end quest, `hollowFound` needed for `clear`, drive-off vs kill, Edith dead → Bridget accepts report only, no den respawn, `PERF-01` (calm check is one distance test).

### 6.7 Q06 — Room for One More (giver Matthew/Lucy H; medium; companion)

Design: [q06](../design/quests/q06-room-for-one-more.md). New: companion contract from dialog (E8), a prepared order in V (E3), `miles_mark`.

Cast: `matthew` (H woodcutter/son|child, req — design: without him only solo), `lucy` (spouse), `miles` (head), `sophie` (**V** blacksmith/child|head).
Start: `[{k:'visited', place:'V'}, day ≥ 3]`; onOffer: `grant 'q06:order'` (axe head + 2 wedges) into **Sophie's store** and `pay {purse:'miles'}→{purse:'sophie'} 24` (prepaid; if Miles is short, the grant is smaller... keep: skip the pay when Miles' purse < 24 and flag `onCredit`; test both).
Deals:
- `solo`: `give` of `miles_mark` (grant `q06:mark`), Sophie releases only to a holder of the mark **or** a household member (cond `hasItem miles_mark` or Matthew `near`); E3: `pay {purse:'miles'}→player 5` or `give {store:'miles'} log ×3` (firewood load).
- `paid`: `companion` effect `{slot:'matthew', mode:'hire', days:4, wage:0, task:'escort'}`; the quest pays `5 c × days used` at the end from the **player** to Matthew's purse (real transfer). Needs `familyAgreed` for Lucy (bucket ×4 into the household barrel: counter on `fill` with `match.slot:'lucy'` ≥ 4 → set `familyAgreed`; if not agreed the hire still works with Lucy −5). Hatchet: effect `give {store:'miles'}→{purse:'matthew'} small_axe` (NPC equipment: COMP-03 uses the best weapon; verified).
- `free`: needs `opinion matthew ≥ 25 or helpfulness H ≥ 10` → contract `mode:'free'`.
- Camp scene S6: node attached to topic `matthew` with `when: [companion active, hour night, near campfire r 6]` (the existing camp = player-lit `campfire` structure; cond `{k:'near', anchor:{k:'nearestKind', kind:'campfire'}}` — use an Observation at `{k:'actor', slot:'matthew'}` `dwell 20 when sneaking false & hour night & litCampfire` to arm node `s6`; text from the design).
- Pickup: Sophie topic `pickup` needs mark/Matthew near → `give {store:'sophie'}→player axe_head ×1, iron_wedge ×2` (heavy-ish 4.1 kg; the E3 grant already placed them) → `itemCollected`.
- Return: `returned` = player within 25 m of Miles' house with the items and the companion contract still active or ended; endings per deal. Late return: deal ends after `days`; rule `since 4 days` while companion active → Matthew walks home (companion system dismisses) and pays only worked days.
- Q03 E2 link: Matthew's extra S1 line when `quest q03` ending `E2`/choice `lean_to`… expose `endingOf` cond: `{k:'quest', id:'q03', in:['done'], ending:'<id>'}` (add optional `ending` filter next to `flagEq`).
- Q02 link (S7 at the lower bend): line when the player is near the `q02` den anchor and `quest q02` is active — `quest` cond + `near`.
Stubs: NPC migration in spring (E2 epilogue) = message only; "calls for help when the player is KO" = existing companion behaviour only.
Tests: all three deals end-to-end with a real companion contract (hire, pay, dismiss), mark gate, order prepaid conservation, Matthew refuses at low opinion → solo, Lucy water counter.

---

## 7. Wave W3 — treasure quests (Q05, Q13, Q11, Q12)

### 7.0 W3.0 — landmarks and treasure plumbing (before the quests)

Prerequisite: `world--001` step 2 (LOOT-01 chests/`dig` loot) — the quests below do **not** use random loot, only fixed `grant`s (E3) and `dig` events, so they can ship **before** LOOT-01 if desired; the dependency is only that the **landmark kinds exist and are placed** (WORLD-11 done, `implemented_unverified`: verify with `tour.mjs` stops 09–13 first).

New landmark kinds (one `GEN_VERSION` bump 9 → 10, batched; world cache rebuilds):

```ts
// src/game/world/types.ts
export type LandmarkKind = 'stone_circle' | 'house_ruin' | 'estate_ruin' | 'shipwreck' | 'boat_wreck' | 'chapel_ruin' | 'watch_tower_ruin'

// src/game/world/gen/landmarks.ts — LANDMARK_RULES additions
{ kind: 'chapel_ruin', count: 1, radius: 14, minSettlement: 250, minRoad: 40, maxSlope: 3, biomes: [Biome.Swamp] },
{ kind: 'watch_tower_ruin', count: 1, radius: 12, minSettlement: 600, minRoad: 0, maxSlope: 5, biomes: [Biome.Mountain] },
// names: 'Blackwater Chapel', 'Pinewatch' (quest-facing names; LANDMARK_NAMES entries)
```

Placement bias: `chapel_ruin` within 1.5 km of the H–V road (`nearRoad` helper exists in `landmarks.ts`), `watch_tower_ruin` within 3 km beyond T (mountain biome). If the seed produces none → the quest is never offered; add a `landmarks.test.ts` case "≥ 6 of 8 seeds have a chapel and a tower" and adjust placement parameters (not the test).
Render: `render/landmarks.ts` + `landmarks.glb` pieces for the two new kinds; **procedural fallback** (existing path: "procedural fallback") ships first, models later (render--004 step 3). Collision for landmark walls (`landmarkSolids.ts`) exists but the plan notes "no collision for walls" — Q11/Q12 interiors need the shell solid; add shell solids for the two kinds (cellar/locker is a quest **node**, not geometry).
Existing kinds reused: Q05 = `stone_circle` (pick `nearestRoad` on the V–T road within 1.2 km, else never offered), Q13 = `estate_ruin` ("Ash House" appears in journal text via `{landmark}` placeholder = generated name, so no clash with "Blackwater Manor"). Add `{landmark:<slot>}` placeholders to `questPlaceholders` and anchors `{k:'landmark', kind, pick, road}` (E1). Landmark discovery for the map marker already uses explored cells.

Quest-owned objects inside landmarks (the buried box, the vault, the locker, the toll chest): modelled as **`dig`/Observation anchors + `grant`**, not world containers:

```ts
// buried box: digging at the east stone
observations: [{ id:'dig_east', at:{k:'offset', of:{k:'landmark', kind:'stone_circle', pick:'nearestRoad', road:['V','T']}, dx: 6.5, dz: 0}, r: 2.5, dwellS: 0,
  when:[stageIs(2), { k:'hasItem', item:'shovel', qty:1, from:'player' }], effects:[] }]
counters: [{ id:'diggedEast', on:'dig', match:{ near:{ anchor: eastStone, r: 2.5 } } }]   // E5: dig event
rules: [{ id:'boxFound', when:[{k:'counter', id:'diggedEast', gte:1}], effects:[{k:'grant', id:'q05:dulcie-box', to:'player'}, set('chestFound')] }]
```
(`dig` already exists as a player action — ITEM-04; digging in the "first hollow" (circle centre) = a counter `diggedHollow` that only sets `firstHollowSeen`'s negative hint.)

### 7.1 Q05 — The Map That Missed the River (giver Rosalind, T; treasure)

Design: [q05](../design/quests/q05-the-map-that-missed-the-river.md). New: T cast, landmark anchor, `dig`, heavy box, `companion`-like follow (E8) for Percy, optional dry-bed route stub.

Cast: `rosalind` (**T** trader/head), `percy` (**T** — the "town scribe" role does not exist: use `T` guard/elder or any T adult with `profession:'guard'` + `fallbackName:'Percy Clark'`? **Decision ❓ (opus):** roles missing in the generator (scribe, alderman, miner, carpenter, seamstress, retired guard, mountain guide — see QUEST-WORLD cast table T). Default: cast by the **closest generated profession** per slot (T `trader` for Percy/Silas ordering, T `woodcutter`+`carpenter` stub for Samuel, T `hunter` for Mabel, T `guard`/`elder` for Duncan, T `herbalist` for Irene's seamstress) and rely on `{slot}` generated names — exactly D-QUEST-1(c) "NPCs are not renamed". Record the mapping in `data/quests/roles.ts` (one table, used by Q05, Q10–Q13).
`edith` (V hunter, opt).
Start: `[{k:'visited', place:'T'}, landmark exists]`.
Beats → mechanics:
- `oldBedFound`: Observation at the "dry bed" anchor = midpoint of the arc between the circle and the river (`offset` from landmark, `dx:-20`), `r 10`, `dwell 3`; `circleFound`: Observation at the circle centre `r 9`; `firstHollowSeen`: Observation at centre `r 3` (message "Seven stones…"). River current/wading risk: **stub** (existing water depth handling only).
- Digging east stone gives the box (above). Opening the box on the spot: `strongbox_dulcie` is a container item with `tag 'locked'`; **Break the lock** action = the same inventory context action as the letter (`tag locked→broken`); `chestBroughtBack` = give to Rosalind (`give` event to `rosalind`, item `strongbox_dulcie`) — if `tag broken` Rosalind "knows".
- Opening scene S8 → effects `consume strongbox_dulcie` (sink) and `grant 'q05:dulcie-contents'` into Rosalind's store: ring, 2 emeralds, 180 c in coin → money goes to `{purse:'rosalind'}` via the grant (`money 180`), book `account_book`.
- Choice: `family`: `pay {purse:'rosalind'}→player 60` ← "a third of box value ≈ 150–200": box cash value 180 + ring 100 + 2 × 180 = 640 → a third ≈ 210; the design says 150–200 (Rosalind sells one emerald to Silas: `give {store:'rosalind'}→{purse:'silas'} emerald` + `pay {purse:'silas'}→{purse:'rosalind'} 180`, then `pay rosalind→player 190`; partial rule if Silas is short → rest on a later visit: rule `since 3 days` pays the remainder). Discount: `priceMod`-like personal discount stub (flag + message; E12). `ford`: Percy `follow player` along the route (E8) to the bed anchor (Observation `near percy ≤ 6 & near bed`) → effect `rep renown +8 (T), +5 (V)` and flag `dulciesBend`; **seasonal shortcut in the road graph = stub** (flag + map label via landmark name "Dulcie's Bend"); pay as `family`. `keep_gem`: `give {store:'rosalind'}→player emerald ×1` instead of coin; may be combined with `ford` later (flags are independent; ending id picks first).
- Theft: player keeps the box → ordinary honesty reputation rule via `rep` effect on a rule: `hasItem strongbox_dulcie` in player inventory and `since 2 days from stage` → quest `lapse` with `rep honesty -10 (T)` (Percy knows).
Tests: dig east stone vs hollow, lock broken path, three endings with Silas short purse partial, Rosalind dead → household pays, no landmark → never offered.

### 7.2 Q13 — The Ash House Vault (giver Irene, T; treasure)

Design: [codex-quest-13](../design/quests/codex-quest-13-ash-house-vault.md). New: estate-ruin anchor, shoring construction step, vault anchor, rutting stag (creature), fixed loot, share choice.

Cast: `irene` (T herbalist/head — seamstress stub), `samuel` (T woodcutter/head), `percy` (T trader/elder), `silas` (T trader/head), `stag`: creature `{ species:'stag', variant:'strong', at: landmark orchard offset, tag:'ash_stag' }` spawned at accept (autumn only: start cond `season in ['autumn']` — design ties the rut to autumn; otherwise the stag is omitted).
Anchor `ash`: `{k:'landmark', kind:'estate_ruin', pick:'nearestHome'}`. Beats:
- orchard: `wait` Observation at the road gate `dwell 90` with `when hour 17..21` ("moves off at dusk"), `around` Observation at the far wall offset `r 4`, `faced` = counter `near stag ≤ 5` (any contact) — all set `orchard` (`choose`).
- `cellarShored`: needs `log ×2` (poles) and `stick`? design "2 straight poles and wedges": `consume log ×2 from player` + Observation `dwell 12` at the cellar anchor (carpenter's time); without shoring a dig triggers collapse: Observation `dig` event without `cellarShored` → effect `hurt player 15` (existing damage helper `damage(sim, player, …)`) + message, flag `collapsed` (progress not lost).
- `vaultOpen`: tool check `hasItem crowbar or pickaxe` (`pickaxe` exists; crowbar not → accept pickaxe) + Observation `dwell 10` at the vault anchor (offset from `ash`) → `grant 'q13:vault'` (180 c to Irene's purse... coin goes to Irene (owner), items `ruby ×2`, `ash_cuirass`, `ash_deed`, `wage_packet`) into the **player's** inventory (carried to town; theft rule as Q05 if the player keeps them).
- Packet scene: `packetRead` + `slawomirKnows` flags (Samuel: sets name via `{samuel}`); Samuel's 20 c = `pay {purse:'irene'}→{purse:'samuel'} 20` in **every** ending.
- Choice + share: `share` ∈ {ruby, cuirass, coin100}: `give player→? ` the player already holds the items: instead `give player→{store:'irene'} ruby ×1`, `consume`? Simplest: at hand-over the player gives Irene everything (`give` events), then the share is a transfer back: `give {store:'irene'}→player ruby ×1` | `ash_cuirass` | `pay {purse:'irene'}→player 100`.
- `rebuild`: `give player→{store:'irene'}` rest; flag `waystation`; **construction over time = stub:** rule `since 90 days` → `owner`-like effect `build` new effect `{k:'placeBuilding', kind:'shed', at: ash kitchen wing anchor, label:'Ash Waystation'}` (E12 stub: spawns one `shed` with a bed? if bed kind absent, message only) + free lodging flag; `clear_debts`: Percy notice = journal entries; descendant found after `since 7 days` (rule pays `{purse:'irene'}→{purse:'<T farmer>'} 20`, cast slot `bart` T farmer optional, John's 20 c stays "standing claim" flag); `sell`: `pay {purse:'silas'}→{purse:'irene'} 400` (partial), Irene gives the player 50 c from it (+ share), Silas owns the ruin: landmark flag `sold` (message; no ownership model).
Tests: shoring gate and collapse damage, three endings × three shares (9-case table test), Silas short purse, no autumn → no stag but quest still offered, Samuel missing → packet twist replaced by Percy notice (design note).

### 7.3 Q11 — The Bell in Blackwater (giver Eve, V; treasure; 5 stages)

Design: [codex-quest-11](../design/quests/codex-quest-11-bell-in-blackwater.md). New: `chapel_ruin` (W3.0), creature moose, bog/water stubs, heavy transport, recurring tolls (E9), investor choice.

Cast: `eve` (**V** woodcutter/head, req), `winifred` (V herbalist/elder|head, opt), `margaret` (V reeve, req), `silas` (T trader/head, req — `visited T` not required: Silas "arrives or the player brings word": cast resolved from T regardless, topic only reachable by going to T), `moose`: creature `{ species:'moose', variant:'strong', at:{k:'landmark', kind:'chapel_ruin', pick:'nearestRoad'} + offset, tag:'blackwater_bull' }` spawned at accept.
Start: `[visited V, season in ['summer','autumn'] (low water), landmark exists]`; autumn rains rule: when `season` becomes winter and the bell is not out → quest status stays `active` with a journal pause line (`phase` rule) and resumes in the next summer (cond `season`).
Beats:
- `bookRead`: Winifred topic. `causewayMarked`: Observation at the "black pool" detour anchor (`landmark`-relative offset) `dwell 6, when [bookRead or survival ≥ 20]` — going straight (an observation `at poolCentre r 6, when not causewayMarked`) → effect `hurt` stamina + `drop` heavy items? **Stub:** message "you sink to the waist" and `set bogged`; no item loss (design's retrievable loss deferred, listed in notes).
- Moose: `wait` (Observation: `dwell 1800 s` of game time ≈ half a day — implemented as `since 12 h from stage` + `hour 11..14` condition), `lure` (counter `give`? no: **drop willow** — new event `drop` is overkill; use `hasItem branch ×5` consumed at an Observation `at: upwind offset`, effect `moveCreature moose → far anchor` (new effect `lead` = sets `questHold` elsewhere 6 h)), `drive` (fire observation, `scare`), `fight` = `kill` counter; carcass draws wolves already (FAUNA-08).
- Bell: `bellOut` requires `hasItem knife`/`axe` for the chain (tool check) + `strength` stat check → just rope + 2 people: `companion eve` follow + `hasItem rope ≥ 2`; Observation `dwell 20` at the chapel anchor; **dent**: careless strike = if the player's main hand is a blunt tool while observing (`when equipped hammer`) set `dented` (−20 % value: `grant` uses `chapel_bell` with `q:1`). Then `grant 'q11:bell'` / `'q11:chest'` to player; transport: bell 60 kg needs `handcart`/`wheelbarrow` (TRANS-01) — heavy carry rule enforces it naturally; without `causewayMarked` the cond `{k:'flag'…}` on the "deliver" node refuses (cannot carry back on foot) — stub: the quest does not simulate the route, it requires the **flag**.
- Count in V: `give player→margaret` bell + chest then `consume toll_chest`→ `grant 'q11:toll-contents'` into `{warehouse:'V'}`: 150 c coin → `{treasury:'V'}` (money grant), 2 `silver_bar`, `ferry_seal`. Silas inspect: `pay {purse:'silas'}→{treasury:'V'} 350 + 120` for bell+bars on `sale`.
- Endings: `crossing` (E1): `pay {treasury:'V'}→player 60`, flag `crossingOpen`; stub timed construction rule `since 28 days` → `crossingBuilt` (V woodcutters) with optional player timber speed-up (`give` `log ×N` to Eve → −1 day each). Free crossings for life = flag. `sale` (E2): `pay {treasury:'V'}→player 130` after Silas pays; `investor` (E3): needs `money ≥ 80`: `pay player→{purse:'eve'} 80`, `pay {treasury:'V'}→player 40`, then **recurring** `Rule { every:{days:7}, max:8, when:[flag crossingBuilt, season not winter, near V visited], effects:[pay {purse:'eve'}→player 8] }` (source: Eve's purse is rebuilt by tolls — Eve's purse is the toll pool; documented; partial if short). Opening the chest alone: `rep honesty` rule as Q05.
Tests: bog path (no loss), moose four ways, dent effect on price, seasons pause, each ending, tolls fire weekly and stop in winter, `max` respected, conservation with grants.

### 7.4 Q12 — The Iron Under the Pine (giver Duncan, T; treasure)

Design: [codex-quest-12](../design/quests/codex-quest-12-iron-under-the-pine.md). New: `watch_tower_ruin`, prime bear in a den, climbing/cold (existing terrain/weather), unique sword, armoury item transfer, "patrol week" scenes.

Cast: `duncan` (T guard/elder, req), `willa` (T guard/head, req), `mabel` (T hunter/head|child, req — falls back to solo route), `percy` (T trader/elder, opt), `silas` (T trader/head, opt), `bear`: creature `{ species:'bear', variant:'strong', at: landmark tower offset, den:true, tag:'pinewatch_bear' }` spawned at accept (autumn/winter only: start `season in ['autumn','winter']`).
Anchors: `tower` `{k:'landmark', kind:'watch_tower_ruin', pick:'nearestHome'}` (picked beyond T: `pick:'beyond', place:'T'`: add as a third `pick` mode in E1), `splitPine` = offset along the approach.
Beats:
- `registerFound`: Percy topic; `routeFound`: Observation at `splitPine` (spikes) `dwell 4`; Mabel as follower (E8, `companion` `free`/`hire`: task `escort`) — climb cold uses existing weather/stamina; camp scene = node armed by `near campfire & hour night` as in Q06.
- Tower: `towerReached` Observation `r 15`. Bear options: `slip` (rope descent: Observation `dwell 10` `when: sneaking, hasItem rope` at the partition offset; noise: `bear` calm check `calm bear r 15` must hold during the dwell — failure wakes the bear = she becomes aggro normally), `drive` (fire `scare` as Q02), `fight` (`kill` counter). Locker: Observation `dwell 15`, `when [hasItem rope, companion mabel near OR skill strength ≥ 20]` (stat key: `skills`? check `SkillId` for strength; else `near mabel`) → `grant 'q12:locker'` to the player: `pinewatch_longsword`, `company_badge`, `guard_shield`, `spearhead ×3`.
- Duncan scene: `give player→duncan company_badge` (he keeps it) etc.; choice:
  - `guard`: `give player→{store:'willa'} pinewatch_longsword, guard_shield, spearhead ×3`; reward: **armoury transfer**: pick `mail`/`crossbow`: `chainmail` or `crossbow` from `{warehouse:'T'}` (armoury = T warehouse inventory; ensure at start of quest that T warehouse holds 1 of each: `grant 'q12:armoury'` only if missing — documented external source) + `pay {treasury:'T'}→player 40`. NPC equipment upgrade: Willa's guard NPCs use the sword via COMP-03/NPC equipment logic (the best-weapon chooser) — optional; message otherwise.
  - `sale`: `pay {purse:'silas'}→{treasury:'T'} 500` (partial), `pay {treasury:'T'}→player 125`; the sword is `give` to Silas then **removed from the world** (it "leaves for the city": a sink `consume`, ledger `quest:q12`; the unique-item test then asserts zero).
  - `carry`: needs `opinion duncan ≥ 30` or option "ask directly"; the **patrol week** = counters: 3 patrol days via rule `once:'day'` increments while the player is within 600 m of a T-guard-owned point (`{k:'actor', slot:'willa'}` + `companion`? simplest: the player must be `near willa ≤ 40` for `dwell 3600 s` per day (Observation reset daily) × 5 days) — NPC patrol task is **stubbed** (Willa, as a quest-held NPC, `hold` moves along the road? no): stub = "5 distinct days with the player within 30 m of Willa while she is on duty (her normal AI) between 08:00–18:00", the counter increments in a day-gated rule. Encounters are whatever fauna does. Then `give {store:'willa'}→player pinewatch_longsword` (the sword was in her store pending).
- Duncan dies early: badge goes to the grave: stub message; `carry` needs `quest` Willa opinion ≥ 30 or `patrolDone`.
Tests: bear three ways, sword unique count after each ending (guard: in Willa's store, sale: gone, carry: player's), patrol-week counter, Mabel absent route, season gate, partial Silas payment.

---

## 8. Wave W4 — Q10 What the Mountain Owes (blocked)

Design: [q10](../design/quests/q10-what-the-mountain-owes.md). **Blocked by:** `WORLD-05` caves ([world--003](world--003--caves.md), draft) for the adit and flooded gallery, `NPC-06` miner/alderman roles ([economy--002](economy--002--production-chain-and-calibration.md) slice), `SET-04` outpost (deferred), gold ore in the economy (`gold_ore` exists in `HEAVY_GOODS`; the mine/ore economy flow does not), "bad air" hazard and "air out" action (new).

Plan so it is ready once unblocked (no code before then):
- Roles: `agnes` (T — the miner; until NPC-06, a T woodcutter via `roles.ts` with `fallbackName`), `silas`, `baldwin` (T guard/head as alderman stub).
- Adit = a cave landmark from world--003 (`LandmarkKind` `'adit'`, interior as a separate small heightfield/volume per that plan) with anchors `entrance`, `sideChamber`, `floodedGallery`.
- Hazard `bad_air`: a region flag on the side chamber anchor; effect/observation: entering with `hasItem candle`-lit (`torch` exists; add `candle`) shows the blue-flame message; stay > 6 s without `ventilated` → KO via the existing KO path (never death, design rule); `air out` = Observation `dwell 3600` at the mouth with `cloth ×2 + log ×1` consumed (E5 `consume` sink) → `set ventilated`.
- `pouchFound` `grant 'q10:pouch'` (`gold_nugget_pouch`, 100 c) — finder's rule: player keeps (decision ❓ in D-QUEST-3).
- Endings: `sell` (Silas pays 600: `pay {purse:'silas'}` → player 275, `{purse:'agnes'}` 200, `{treasury:'T'}` 125 — partial with the investment pool stub: Silas's purse is topped up **once** by `grant`-money `q10:silas-pool` 600 `why:'merchant capital, declared'`, otherwise partial), `share` (E9 recurring payout `every 7 days`, `max 12`, `pay {purse:'silas'}→player 30`, funded by `gold_ore` sales of NPC miners — requires NPC-06; until then stub: the quest ends at the `outpost` flag with a lump `pay {treasury:'T'}→player 60`), `town_season` (rule `season` → closes before snow; `pay {treasury:'T'}→player 150` after the ore is sold).
- Re-open as `share` the next year: `refused`-style status.

---

## 9. Cross-cutting: quest links and ordering

| Link | Implementation |
|---|---|
| Q01 → Q02, Q03 → Q06 (E2), Q04 ↔ G02, G04 → G07 (**gate**), G03 ↔ G07, G01 → G04, Q08 → Q11, Q09 ↔ G06, G05 ↔ Q03, Q05 ↔ Q13, Q10–Q13 Silas tone | `Cond.quest { id, in, started?, ending?, flagEq? }` (E1 adds `ending`/`flagEq`) — extra lines/options only; **only G04 → G07 is a gate** |
| Offer-check order (`AUTHORED_QUESTS`) | H small quests first (existing four, then G08, G04, Q09, Q01, G07), then H↔V, then treasure, then Q10 |
| Parallel quests | no mutex; timed quests (G04, Q11) warn on overlap (E7) |
| Giver hubs | one topic button per quest per NPC (D-QUEST-1 note); Jacob (Q01, Q02 mention, G07), Stephen (Q09, G06), Molly (G01 existing, G08 mention), Sophie/Bernard (Q04, G02), Margaret (G05, Q08 mention, Q11), Edith (Q02), Silas (Q05, Q10–Q13 as secondary) get several topics on the same NPC in different quests: `QuestTopics.vue` already lists one button per quest |

Cast-id conflicts across quests are fine (cast is per quest); the `used` set only prevents two slots of the same quest from taking the same NPC.

## 10. Verification and review

- **Per quest:** `pnpm check` (type-check + lint + layers + vitest), the quest's vitest file (one test per ending + guards above), `pnpm e2e:run acceptance` step, copy `scripts/e2e/review-quests.mjs` scenario entry so the `app-review` skill can drive the quest headless.
- **Per wave:** `wave-review` (worktree opus subagent; remember the worktree/`git checkout` prohibitions in CLAUDE.md), triage into `quests--00x--review-fixes` if needed, `app-review` for visuals (white hare, dens, landmarks), `pnpm soak` with **all** authored quests offered and their hold paths exercised (bounded holds, quests--002 step 6): NPC-life invariants hold, no held actor remains after any ending, quest-owned animals do not break the animal budget.
- **Perf:** `bench:sim` before W0 and after W3; the engine tick stays < 0.05 ms with ten quests active (asserted by the PERF test: no `actors.query`/`buildingsNear` except single-distance checks; creature `calm` is a distance test on the cast actor).
- **Docs at the end of each wave:** quest design file status line + "Implementation notes", `docs/design/quests/README.md` table (add a Status column: I/stub list), `quests-engine.md` §12 table gets one row per quest, FEATURES `QUEST-04` evidence, PROGRESS "Teraz" counts, handoff commit.

## 11. Decisions needed (❓, owner: opus/user)

1. **Roles that do not exist in the generator** (scribe, alderman, miner, carpenter, seamstress, retired guard, mountain guide): default = closest generated profession per slot in `data/quests/roles.ts`, no renaming (consistent with D-QUEST-1c). Alternative: add professions (NPC-06, deferred).
2. **Wells outside the square** (Q08): default = allow the `well` blueprint with a dig check; confirm it is v1 and not SET-04.
3. **Finder's rule / treasure external sources** (Q05, Q10–Q13): default = player keeps finds from long-abandoned places; explicit `grant` registry = the only creation path (D-ECON-1). Confirm item prices (§3 E2 table = QUEST-WORLD calibration).
4. **New landmark kinds** (`chapel_ruin`, `watch_tower_ruin`) and the single `GEN_VERSION` bump they cost; alternative: reuse `boat_wreck`/`house_ruin` as the chapel/tower stand-ins (no gen change, weaker fit).
5. **Burning/den, scare, slay, hurt, adopt, ill/heal effects** are small additions to `applyEffect`; confirm they may live in `questCore.ts` (file is 670 lines — split `questEffects.ts` out first if it passes ~800).
6. **Stubs accepted** (listed per quest): seasonal road shortcut (Q05), working detour segment (Q02), livestock route change (Q08), NPC migration (Q06), waystation building (Q13), tool-driven work speed (Q04/Q09), crowd scenes (G08), river current/bog item loss (Q05/Q11).
7. **Q10**: schedule only after world--003 + NPC-06; keep this section as the ready design.

## 12. Steps (summary)

| # | Step | Model | Wave |
|---|---|---|---|
| 1 | E1 places + `roles.ts` + `{T}`/`{landmark}` placeholders; tests | sonnet (opus reviews D-QUEST-3) | W0 |
| 2 | E2 item tags/new items + E3 grants registry + ledger | sonnet | W0 |
| 3 | E4 creatures/dens/`calm`/`dead`/`scare`/`slay`/`hurt` | sonnet | W0 |
| 4 | E5 events + hooks; E6 price mods; E7 deadlines; E9 recurring rules | sonnet | W0 |
| 5 | E8 human follow + companion effect; E10 test kit/e2e helpers; save validation + round trips | sonnet | W0 |
| 6 | W1 quests: G08, G04, Q09, G07, Q01 (each: data, vitest, acceptance step, notes) | sonnet | W1 |
| 7 | Wave review W1 + app review + soak | opus | W1 |
| 8 | W2 quests: G06, Q04, G02, G05, Q08, Q02, Q06 | sonnet | W2 |
| 9 | Wave review W2 + app review + soak + bench | opus | W2 |
| 10 | W3.0 landmark kinds + `GEN_VERSION` bump + render fallback; verify WORLD-11 landmarks on WSL | sonnet | W3 |
| 11 | W3 quests: Q05, Q13, Q11, Q12 | sonnet | W3 |
| 12 | Wave review W3 + user play-through list | opus | W3 |
| 13 | Q10 (after world--003, NPC-06) | sonnet | W4 |

## Result

—

### Progress (session 15, 2026-10-03)

- **E6 price modifiers done** (`sim/priceMods.ts`, `state.priceMods`, applied in `trade.ts` including the no-resell clamp). **E1 partial:** `CastSpec.place: 'V'`, condition `visited`, `rep.places`; new effects `ill` / `heal` / `priceMod`.
- **W1 G08 Well and Rumor done** (`data/quests/g08.ts`, `questG08.test.ts` — truth, quiet, accusation, apology, refusal; implementation notes in the design doc). Acceptance e2e 47/47 with G08 in the offer list. - **E7 deadline display + `timedWarn` done; W1 G04 Root by the Stream done** (`g04.ts`, `questG04.test.ts`; no `gather` event needed — see the design doc's notes). - **W1 Q09 Goods on the Ground done** (`q09.ts`, `questQ09.test.ts`; effect `grant`, `give` counters weighted by quantity). - **E4 core (creature cast, `wild` anchor, `dead`/`calm`/`noThreat`/`dayAfter`, `sell` event, `Animal.tag`) + W1 Q01 A Hare Out of Place done** (`q01.ts`, `questQ01.test.ts`). - **W1 G07 Trail of the Grey Wolf done** (`g07.ts`, `questG07.test.ts`; effects `hurt`/`slay`/`scare`). **Wave W1 complete** (G08, G04, Q09, Q01, G07). Soak 6 d seed 1337: 0 violations. Next: W2 (H↔V: G06, Q04, G02, G05, Q08, Q02, Q06) — needs place `T` and more E1 work.
- **W2 G02 Rusty Debt done** (`g02.ts`, `questG02.test.ts`; E2 item tags, `tag`/`repairHeld`, `treasuryGte`). Next in W2: Q04, G06, G05, Q08, Q02, Q06.
- **W2 Q04 The Handle Remembers done** (`q04.ts`, `questQ04.test.ts`; `settlement` anchor `place`). Next in W2: G06, G05, Q08, Q02, Q06.
