# Quests — authored quest engine (QUEST-03)

**Status:** design, accepted by Opus 2026-10-02 (session 13) as `quests--001` step 1. Decision: **D-QUEST-1** in [DECISIONS.md](DECISIONS.md). Implementation: `quests--001` steps 2–6 (Sonnet).

Scope: a small, data-driven stage machine for the authored quests in [docs/design/quests/](quests/README.md). Cast, places and reward scale: [QUEST-WORLD.md](quests/QUEST-WORLD.md). The sim-driven notice-board quests (`sim/quests.ts`: rats, wolves) are untouched and keep their own `state.quests` list.

Non-goals for the first slice: a general dialog-tree system for all NPCs, scripted cutscenes, cross-settlement quests, quest-specific new sim systems. A quest only uses mechanics that exist, plus the handful of engine primitives below. Anything else a design doc asks for is **stubbed** (a flag + a message) and written into the quest file's "Implementation notes".

## 1. Layers

| Layer | Path | Contents |
|---|---|---|
| data | `src/game/data/quests/types.ts` | Type definitions only (definition schema below). No imports from `sim/`. |
| data | `src/game/data/quests/<id>.ts` | One file per quest (`q03.ts`, `q07.ts`, `g03.ts`, `g01.ts`), each exports a `QuestDef`. Plain data: no functions, no closures — conditions and effects are tagged unions evaluated by the engine. |
| data | `src/game/data/quests/index.ts` | `AUTHORED_QUESTS: readonly QuestDef[]` (order = offer-check order). |
| sim | `src/game/sim/questEngine.ts` | Casting, condition evaluation, effect application, the tick system, the event hook, dialog resolution. |
| sim | `src/game/sim/questHold.ts` (or inside the NPC/fauna AI) | The two AI primitives: *hold* (NPC/animal stays at a spot) and *follow* (animal follows an actor). |
| save | `sim/types.ts` + `save/validate.ts` | `state.authoredQuests`, `SAVE_VERSION` 8 → 9 (see §8). |
| ui | `src/ui/panels/JournalPanel.vue`, quest topics in `DialogPanel.vue` | Read state through `Game`, act only through `Game` methods. |
| game | `Game.ts` | `questTopics(npcId)`, `questSay(questId, nodeId)`, `questChoose(questId, nodeId, optionId)`, `journal()`. |

`check-layers` already forbids sim/data importing render/ui. `data/quests/*` must not import `sim/*` (types it needs — `ProfessionId`, `Kin`, `RepDim` — come from `world/types` or are restated as string unions in `data/quests/types.ts`).

## 2. Definition schema (`QuestDef`)

```ts
type QuestId = string                    // 'q03', 'q07', 'g03', 'g01'
type SlotId = string                     // 'miles', 'lucy', 'hazel', 'pip', 'piers', …
type FlagValue = boolean | number | string

interface QuestDef {
  id: QuestId
  title: string                          // journal title (English, glossary terms)
  giver: SlotId
  cast: Record<SlotId, CastSpec>
  /** Checked only while the quest has no state entry (not offered yet). All must hold. */
  start: Cond[]
  /** Initial flag values (every flag the quest uses is declared here — typos fail a test). */
  flags: Record<string, FlagValue>
  /** Ordered stages; `stage` in the state is the index. Text for the journal. */
  stages: { id: string; journal: string }[]
  /** Dialog nodes, keyed by id. */
  nodes: Record<string, DialogNode>
  /** Per cast slot: which node opens when the player picks the quest topic on that NPC (first matching). */
  topics: { slot: SlotId; node: string; when?: Cond[]; label: string }[]
  /** Field observations (position + dwell time), §5. */
  observations: Observation[]
  /** Event counters, §6. */
  counters: Counter[]
  /** Rules re-evaluated on every quest tick while the quest is active (stage advances, recurring world effects, timeouts). */
  rules: Rule[]
  endings: Ending[]
  /** Ending used when a required cast member dies / the quest lapses (no reward, no penalty unless listed). */
  lapse?: { journal: string; effects: Effect[] }
}

interface CastSpec {
  kind: 'npc' | 'animal' | 'spawn'
  required: boolean                      // missing required slot → quest is never offered (QUEST-WORLD rule 5)
  // npc: picked from the home settlement by household profession + kin (+ optional age)
  profession?: ProfessionId              // household profession
  kin?: Kin[]                            // allowed kin, first match wins ('head' | 'spouse' | 'child' | 'elder' | 'son')
  age?: AgeGroup
  // animal: from the household of another slot (e.g. the shepherd's sheep), prefer variant 'young'
  ofSlot?: SlotId; species?: SpeciesId; preferVariant?: AnimalVariant
  // spawn: a quest-owned NPC created on accept (G01 Piers), see §7
  spawn?: { name: string; male: boolean; at: Anchor; items: { item: string; qty: number }[] }
  /** Name used in dialog when the slot is empty but optional (e.g. "your grandmother"). */
  fallbackName?: string
}

interface DialogNode {
  lines: { who: SlotId | 'player' | 'self'; text: string }[]   // {slotId} and {H}/{V} placeholders
  options: DialogOption[]                                      // empty → "Leave"
}
interface DialogOption {
  id: string
  text: string
  when?: Cond[]                          // hidden when false (or shown disabled with `reason`)
  reason?: string
  effects: Effect[]
  next?: string                          // follow-up node shown immediately
}
```

Text rules: English, glossary terms, taken from the design doc without changing the logic; placeholders `{slot}` (generated first name of the cast NPC), `{H}`, `{V}`. **No logic ever reads label text** — options and nodes are matched by id.

### Conditions (`Cond`, tagged union, all pure reads)

| `k` | Fields | True when |
|---|---|---|
| `flag` | `flag, eq?, ne?, gte?, in?` | quest flag comparison |
| `stage` | `gte?, eq?` | stage index |
| `alive` | `slot` | cast actor exists and is not dead |
| `opinion` | `slot, gte?, lt?` | `npc.opinion` |
| `durability` | `slot` (house of the slot's household), `lt?, gte?` | `Building.durability` |
| `day` | `from?, to?` | calendar day index since game start (`START_CALENDAR_S`) |
| `hour` | `from, to` (wraps midnight) / `night: true` | `hourOf`, `isNight` |
| `hasItem` | `item, qty, from: 'player' \| {store: slot}` | inventory count (`countItem`) |
| `counter` | `id, gte` | §6 |
| `observed` | `id` | observation completed (§5) |
| `skill` | `skill, gte` | player skill (e.g. `survival` for the G01 pen read) |
| `near` | `slot \| anchor, r` | player within `r` m (no world scan: single distance) |
| `all` / `any` / `not` | `of: Cond[]` | boolean composition |

### Effects (`Effect`, tagged union, applied in order)

| `k` | Fields | Notes |
|---|---|---|
| `set` | `flag, value` | |
| `stage` | `to` | stage index (only forward; a test asserts this) |
| `accept` | — | `offered` → `active`, `startedAt` = now, journal entry |
| `end` | `ending` | applies the ending's effects, then `status = 'done'`, `settled = true`. Exclusive: a second `end` is a no-op (asserted). |
| `pay` | `from: Source, to: Source, amount, partial: true` | money transfer, never minted (§4) |
| `give` | `from: Source, to: Source, item, qty, partial: true` | item transfer, keeps stack fields (freshness, species) |
| `consume` | `from: Source, item, qty` | item leaves the world (eaten at the meal, used as a beam); logged as a sink (verify--001 ledger) |
| `opinion` | `slot, delta` | clamped −100..100 |
| `rep` | `delta: Partial<Record<RepDim, number>>, reason` | `addRep` on the home settlement |
| `need` | `slots, social?: number` | raises `vitals.social` (Q07 meal) |
| `message` | `text, kind?` | `sim.message` |
| `torch` | `anchor, lit` | sets `torchpost.lit` (G03 snuffing; the guard relights by his normal duty) |
| `hold` / `release` | `slot, at?: Anchor` | §7 |
| `follow` / `unfollow` | `slot, target: 'player' \| SlotId` | animal follows (G01 Pip) |
| `spawn` / `despawn` | `slot` | quest-owned NPC (§7) |
| `owner` | `anchor, to: SlotId` | building ownership to the slot's household (Q03 lean-to built by the player) |

`Source` = `'player'` · `{ purse: SlotId }` · `{ store: SlotId }` (the slot's household house inventory) · `{ treasury: 'home' }` · `{ warehouse: 'home' }`.

### Anchors

An `Anchor` names a place without coordinates in data: `{ house: SlotId }`, `{ building: SlotId, kind: StructureKind }` (nearest building of that kind owned by the slot's household, e.g. the shepherd's pen), `{ torchpost: 'nearestTo', slot }` (home-settlement torch post nearest to the slot's house), `{ settlement: 'home', kind }`, `{ actor: SlotId }`, `{ offset: Anchor, m: number, toward: 'road' }` (G01 ford camp: a point on the nearest road ~150–250 m out of H; resolved once and stored). Anchors are resolved **once** when first needed and the resolved coordinates/ids are cached in the quest state (`anchors`), so evaluation never searches the world again.

## 3. Runtime state (saved)

```ts
type AuthoredQuestStatus = 'offered' | 'active' | 'done' | 'lapsed' | 'refused'

interface AuthoredQuestState {
  status: AuthoredQuestStatus
  stage: number
  flags: Record<string, FlagValue>
  /** Outcome choice (Q03 `plan`, Q07 `guests`, G03 `path`, G01 `resolved`); changeable until `settled`. */
  choice?: string
  settled: boolean
  ending?: string
  offeredAt: number                     // calendar s
  startedAt?: number
  endedAt?: number
  cast: Record<SlotId, number>          // actor ids, resolved at offer time
  anchors: Record<string, { x: number; z: number; id?: string }>
  obs: Record<string, number>           // observation id → accumulated dwell (gameplay s); −1 = done
  counters: Record<string, number>
  /** Rule id → last calendar day it fired (for `once: 'day'`) or −1 (`once: 'ever'`). */
  fired: Record<string, number>
}

GameState.authoredQuests: Record<QuestId, AuthoredQuestState>
```

`choice` is just a flag with special journal treatment: the journal shows "Decision: …" and the endings read it; it can be changed by dialog until an `end` effect sets `settled`. The `refused` status keeps a refused quest re-offerable when the design says so (G01 D, G03 D: the giver topic reappears).

## 4. Rewards and conservation (D-ECON-1, D-ECON-3)

Every `pay`/`give` names its source. The engine moves `min(amount, available)` (QUEST-WORLD: "a treasury payout can never exceed its balance") and posts a "paid only X of Y" message when partial — same pattern as `payFromTreasury`. Nothing is created: there is no `mint`/`addItem` effect from thin air. `consume` is the only sink and is used for food eaten at the Q07 meal and the Q03 beams/prop log. Test: `QUEST-03 conservation` runs each quest's main path and asserts `totalMoney` unchanged and item totals change only by the declared `consume` amounts.

Reward numbers follow QUEST-WORLD "small local (H)": 10–35 c from a purse/treasury plus small goods. They are defaults (plan ❓ 2), kept in the quest files so calibration is one edit.

## 5. Field observations (position + dwell time)

```ts
interface Observation {
  id: string
  at: Anchor; r: number                 // player within r metres of the anchor
  dwellS: number                        // gameplay seconds, accumulated while all `when` hold
  when?: Cond[]                         // e.g. night, stage = 1, holding a lit torch ('hasLitTorch')
  reset?: boolean                       // leaving the radius resets the dwell (default: keeps it)
  effects: Effect[]                     // applied once when the dwell is reached
}
```

Examples: Q03 "inspect the beam" = within 3 m of the woodcutter house for 6 s holding a lit torch (`litTorch` cond) after `accepted`; G03 "watch the posts" = within 12 m of the hunter-side torch post for 40 s at night in stage 1, then the Hazel scene node opens (`message` + topic on Hazel); G01 "inspect the pen" = within 4 m of the shepherd pen for 5 s → `leads += prints` if survival ≥ 15 else `misreadWolf`. Only the observations of **active** quests in the current stage are checked; each is one distance test against a cached anchor.

## 6. Event hook and counters

One entry point, called from existing actions (no polling of the world): `questEvent(sim, ev)` with `ev` = `{ k: 'roast', n }` · `{ k: 'repair', buildingId }` · `{ k: 'light', buildingId }` · `{ k: 'douse', buildingId }` · `{ k: 'built', buildingId, kind }` · `{ k: 'give', npcId, item, qty }` · `{ k: 'kill', species }`. It loops over **active** quests only and bumps matching counters:

```ts
interface Counter { id: string; on: QuestEventKind; match?: { kind?: StructureKind; anchor?: Anchor; distinct?: boolean; item?: string; slot?: SlotId }; when?: Cond[] }
```

Example: Q07 "walk Mark's dusk round" = counter on `light` events of torch posts of H, `distinct`, at dusk, ≥ number of posts.

## 7. AI primitives: hold, follow, quest-owned NPC

- **Hold** (`Human.questHold?: { q: QuestId; x: number; z: number; until?: number }`, `Animal.questHold?` same): the NPC's goal options are reduced to safety (flee/fight), eat/drink from the pack and `quest_hold` (walk to the spot, idle). **A hold is bounded and a leash, not a cage (review 014 #1):** every `hold` effect ends at the next `untilHour` o'clock or after `hours` (default 3 game hours); a hold without `until` (older build) counts as expired. A critical need (thirst < 30, hunger < 25, vigor < 10) lifts the reduction: the NPC keeps its normal eat/drink/sleep options (home, well, store, bed), loses duties and social life, and walks back to the spot afterwards while the hold is valid. A held NPC cannot be hired and a travelling companion is never cast or held (#5). Used for Piers at the ford and Pip tied at the camp, and for Hazel at the post during the night scene. Saved (part of the actor). Released by `release`, quest end, or lapse — a test asserts no held actor remains after any ending.
- **Follow** (`Animal.questFollow?: number` actor id): fauna AI steers toward the target (≤ 2 m, walk/run like the dog) — G01 Pip back to the pen. Ending effects `unfollow` + `hold` released → the sheep returns to its normal household AI.
- **Quest-owned NPC** (`spawn`): a `Human` with `householdId = -1`, `kin: 'visitor'` (new `Kin` value), `settlementId` = home, `questOwner: QuestId`, pack with bread + waterskin, under `questHold` (96 h, longer than any quest timeout) while it exists and provisioned for the whole stay: `provisionVisitors` (engine tick) adds a bread (ledger `logProduce`, source `quest:<id>:visitor-provision`) when hunger < 50 and the pack has no food, and refills the waterskin when thirst < 50 (water is not a conserved item) - a declared external source. Excluded from household logic, taxes, companion hire, and from the soak "working" invariant (visitors don't work); still subject to vitals (eats from pack). `despawn` removes it from `state.npcs` and calls `sim.reindex()`; its money/items go to the home warehouse (never vanish — conservation). Only G01 uses it.

## 8. Tick, offer and performance (PERF-01)

System `authoredQuests`, interval **1 s** gameplay:

1. **Offer check** every 30 s: for each definition without a state entry, evaluate `start` conds (cheap reads). Cast-free start conditions (`day`, `posts`, `money`, `hour`, `quest`) are evaluated first; a definition whose `day.to` is behind us is never looked at again; a resolved cast is cached and reused while everyone in it lives (no re-cast every 30 s). On success resolve the cast (`sim.npcsOf(home)` once — the home settlement's ≤ 40 NPCs, never a world scan; companions are skipped); if a required slot is missing, record nothing and retry next day (the seed may change: deaths). Create the state with `status: 'offered'`; the giver gets the topic (dialog + a small journal "rumour" line).
2. **Active quests** (`status === 'active'`, plus `offered` for rules with `phase: 'offered'`): observations of the current stage, `rules` (`when` → `effects`, `once: 'day' | 'ever' | 'always'`), lapse check (required cast dead).
3. Done/lapsed/refused quests cost nothing per tick.

Budget: < 0.05 ms per tick with all four quests active (vitest asserts no `actors.query`/`buildingsNear` calls from the engine except `near`/observation single-distance checks; `bench:sim` unchanged within noise).

## 9. Save format

`SAVE_VERSION` 8 → **9**: `authoredQuests` (record), `Human.questHold`, `Human.questOwner`, `Kin` gains `'visitor'`, `Animal.questHold`, `Animal.questFollow`. `assertSaveShape` validates every `authoredQuests` entry (status enum, stage, flags/cast/anchors/obs/counters/seen/fired records) and each actor's `questHold`/`questFollow` shape. Tests: round-trip of a mid-quest state (each of the four quests at stage ≥ 1, held/following actors) and an 8-format save rejected cleanly (D-SAVE-7). Note: `world--001` step 3 (LOOT-01) will then bump 9 → 10.

## 10. UI

- **Dialog:** `DialogPanel` lists `game.questTopics(npcId)` as buttons (`data-testid="quest-topic-<questId>"`). Picking one shows the node lines and its options (`data-testid="quest-opt-<optionId>"`); `questChoose` applies effects and shows `next` or closes. Disabled options show their `reason`.
- **Journal:** `JournalPanel` (key **J**, also reachable from the quick menu and the mobile "Actions" menu): active quests with the current stage text, choices made, done/lapsed quests collapsed. The sim notice-board quests stay in `QuestsPanel`; the journal also lists the active board quests in a second section so the player has one place to look.
- **Map:** a marker for the giver / current anchor only when its cell is explored (MAP-01, `isExplored`) and only for active quests.
- Mobile: journal and topics work by touch (acceptance via mobile suite once).

## 11. Tests (vitest, names start with `QUEST-03`)

Engine: offer when start conds hold and cast resolves; never offered with a missing required slot; stage only moves forward; exclusive endings (second `end` ignored); `choice` changeable until settled, frozen after; observation dwell (accumulate, reset variant, night-only); counter distinct; rule `once: 'day'`; save round-trip; SAVE 8 rejected; conservation of every ending; no held actor after any ending; lapse when a required NPC dies. Per quest: one test per ending through `testSim` with direct `questChoose` calls + world actions (repair, roast, light). One acceptance e2e step per quest for the main path through the UI.

## 12. Per-quest mapping (first slice)

Design-doc mechanics marked N (new) are mapped onto the primitives above or stubbed. Each quest file gets an "Implementation notes" section listing what was stubbed or changed.

| Quest | Cast (slot → profession/kin) | Key mapping | Stubs |
|---|---|---|---|
| **Q03** | miles woodcutter/head (req), lucy woodcutter/spouse (req), joan woodcutter/elder (opt), matthew woodcutter/son\|child (opt), ralph farmer/head (req) | start: woodcutter house `durability < 60`; S4 = observation with lit torch; `plan` = choice; S8 = `give` 2 logs warehouse → Miles's store, flag `storeDebt`; E1 = house `durability ≥ 90` (repair counter or NPC repair) + `consume` 2 logs; E2 = player builds a `shed` within 15 m of the house (`built` event) → `owner` to the household; E3 = dialog "prop" consumes 1 log, flag `propped`; "family finished it" = durability ≥ 90 before `plan` set → ending `family` | prop does not slow wear (no new decay modifier); Joan/Matthew scenes skipped when the slot is empty; store debt repaid by a rule: first day the woodcutter store holds ≥ 2 logs, they move back to the warehouse |
| **Q07** | lucy, miles, joan (opt), matthew (opt), mark guard/head (req), luke shepherd/son\|child (opt) | start: Q03 done or opinion(lucy) ≥ 10; S2 `freshnessChecked` = dialog with Lucy (shows raw meat freshness in her store), `give` raw meat store → player; S3 Mark's round = counter `light` on torch posts (distinct, all posts of H) at dusk; S6 cooking = existing roast; meal = `give` cooked meat player → Lucy's store then `consume`; endings by `guests` choice | grill (P) not needed; "Mark lets you take torches" = flag + Mark's topic gives a torch from his store once per day |
| **G03** | mark (req), hazel hunter/child (req), martha hunter/spouse (req) | start: day ≤ 10, ≥ 1 torch post; rule `once: 'day'` at 23:00 while stage < 2: `torch` lit=false on the post nearest the hunter house (the guard's duty relights it — visible); watch/alone = night observation near that post → Hazel `hold` at the post + scene; morning = dialog with Martha after any snuffed night; paths = choice; `show` dusk scene = dialog at dusk with Mark + Hazel within 15 m; reward 15 c from treasury (partial) | sneak check for "alone" uses `px.sneaking` + night; the "Hazel lights the post each dusk" routine = rule that relights that post at dusk while `path=together` (flag only, no child AI change); after ~10 nights unresolved → ending `markSolved` (no player reward) |
| **G01** | molly shepherd/head\|spouse (req), tom shepherd other adult (opt), mark (opt witness), pip animal sheep of molly's household prefer young (req), piers spawn (req) | start: day 1–5; on offer: `spawn` Piers + `hold` at the ford anchor, `hold` Pip at the camp (pip leaves the pen); leads = flags (latch dialog, Mark dialog, pen observation + survival check); Piers dialog options by lead count; `paid` = `pay` player → Piers 10; taken_back = night + sneaking + observation at the camp; `follow` Pip → player; stage 3 = Pip within 6 m of the pen anchor → Molly's topic; rewards `pay` molly purse 15 (+10 refund on `paid`), `give` wool ×2 from Molly's store (partial); Piers sells Pip after 2 days if never resolved → `despawn` both, Molly −5 if accepted | `piersWork` epilogue = message only; Piers despawns at the end (his coins go to the warehouse) |

## 13. Implementation notes (steps 2-6, Sonnet)

Where the design was ambiguous or too thin, the simplest choice that satisfies it was made. Code: `data/quests/{types,dsl,index,q03,q07,g03,g01}.ts`, `sim/quest{Core,Engine,Dialog,Hold,Hooks,TestKit}.ts`.

- **Files.** The engine is split in three: `questCore.ts` (cast, anchors, conditions, effects), `questEngine.ts` (tick, offer, event counters), `questDialog.ts` (topics, say/choose, journal, markers). `questHooks.ts` is a tiny module through which `actions`/`cooking`/`build`/`gifts`/`quests`/`interact` call `questEvent` without importing the engine (no import cycle); the engine registers itself. `questTestKit.ts` is for tests and the e2e debug API (`window.__sv.forceQuest(id)`).
- **Schema additions.** `QuestDef.onOffer` (effects when offered; G01 spawns Piers and holds Pip); `DialogOption.needs` (enabled conditions; `when` only controls visibility, `reason` is shown on a disabled option); `DialogLine.when`; `TopicDef.done` (topic still offered after the quest is done: Mark's torches); `StageDef.anchor` (map marker); `choiceLabels`. Effects `choose` (flag + `choice`, frozen once settled), `refuse`, `lapse`, `if/else`; `set` accepts the value `'today'`. Conditions `posts`, `money`, `quest`, `since` (hours since offered/started), `litTorch`, `sneaking`; `near` has an optional `of` (the actor whose position is tested). Anchors: `{k:'road', m}` replaces `offset`+`toward` (a point beside the road leaving the settlement, `m` metres beyond its edge); `{k:'saved', id}` is a building remembered by a counter (`match.save`, used for the Q03 shed). State gained `seen` (buildings already counted by a `distinct` counter).
- **Topics.** One button per quest per NPC: the first topic whose `when` holds. Several scenes of the same NPC are reached through hubs (options with `next`) or by state changes (flags), not by several buttons.
- **Rules** run in the offered phase for `offered` and `refused` quests (`phase: 'offered' | 'both'`), so G03's snuffing continues after a refusal; `once` defaults to `ever`.
- **Offer.** The 30 s check resolves the NPC slots first (the start conditions may refer to them), then evaluates `start`, then resolves animal slots. A failed cast is retried the next game day (in-memory, not saved).
- **Holds.** An NPC under `questHold` plans only: fight/flee (existing safety options), eating/drinking from the pack and `quest_hold` (walk to the spot, wait). Animals under `questHold`/`questFollow` are driven by `animalQuestMotion` after the perception step (flee/aggro still win). `hold` never takes an actor held by another quest; `end`/`lapse` release every cast actor (`cleanup`) and remove spawned visitors. `snap` moves the actor next to the anchor at once (Hazel at the post, Pip at the camp).
- **Visitors.** `Sim.addNpc/removeNpc` add and remove NPCs at runtime. A visitor's belongings (`spawn.items`, declared in the data) are the only goods the quests create; on removal items go to the home warehouse and money to the home treasury. Visitors are skipped by the tax, by companion hiring and by the soak "life" invariants (`isLiving` in `diag/soak.ts`: no household, no profession, held).
- **Conservation.** Every ending test asserts `totalMoney` constant; item totals change only by explicit `consume` (Q03 beams and prop log, Q07 meal) and by the visitor kit.
- **UI.** Key `J` now opens the **Journal** (was the notice-board/reputation panel, which stays reachable from the game menu, notice boards and NPC dialogs). Journal entry also in the quick panel ("Notes") and the mobile top menu. Quest topics: `QuestTopics.vue` inside the dialog panel (`quest-topic-<id>`, `quest-opt-<optionId>`, `quest-leave`). Map: a gold "?" for the current stage's place of every active quest, drawn only in explored cells (no marker on the minimap).
- **Save:** `SAVE_VERSION` 9; `authoredQuests` must be a record; v8 saves are rejected cleanly (test).
- **Not done:** `bench:sim` was not re-run for this change (the tick makes no spatial queries; asserted by test `QUEST-03 PERF-01`).
- **Ledger.** Since merge `70f717d` `consume` goes through `consumeItem`, which logs the sink (`quest:<id>`); the visitor kit logs `logProduce`/`logMint` at spawn (and the provisioning bread), and what a visitor leaves behind moves to the warehouse/treasury.
- **Review 014 changes (tests in `questReview014.test.ts`).** (1) Holds are bounded (`hold.hours` / `untilHour`, `QuestHold.until`, `expireHolds` in the tick and `activeHold` in the AI) with the critical-need override above; no save-version bump: `until` is optional, a missing value means expired, and `assertSaveShape` validates it. (2) `since ... from: 'stage'` (state `stageAt`) lets rules time a stage out. (3) `questChoose` refuses a node the current topics cannot reach (topics valid now plus everything their `next` leads to) and a quest that is not talkable; rewards that must not repeat belong in the ending, not in the option. (5) see Holds. (6) Counter `on: 'visit'` (`visit: { kind, r, lit? }`) counts a home building once when the player stands within `r` m; the engine ticks it before the rules. (8) `assertSaveShape` validates every `authoredQuests` entry and `questHold`/`questFollow`. (10) A quest nobody accepted ends silently: no "completed/lapsed" message, no journal entry, and `quest ... started: true` conditions (Q07's Q03 trigger) ignore it. (11) Read paths (`questTopics`, `questSay`, `questJournal`, `questMarkers`) use `readCtxOf`: anchors they resolve go to a transient cache; the tick resolves the current stage's anchor and persists it. (13) see Offer. The event log is process-global by design (finding 12, accepted: one Sim per process in soak/tests).
- **Review 016 changes (tests in `questReview016.test.ts`, `questText.test.ts`).** (#2) All authored text uses `{slot}` names and pronoun tokens `{slot:he|him|his|himself}` (capitalised `{slot:He}`), resolved from the cast NPC's sex (`fallbackMale` for an empty optional slot); placeholders are filled in dialog lines, options, option `reason`, topic labels, the journal, `choiceLabels` and `message` effects (`questPlaceholders` / `fillQuestText` in `questCore.ts`). A test scans every quest string for the design-doc names outside placeholders. G03 gained the optional slot `jacob` (hunter head). (#4) Q03 thank-you scene: Miles's answer to Joan is conditional on Joan, Lucy opens every branch. (#5) `StageDef.progress` (conditions + sentences) appends done/still-to-do lines to the journal text; accept options carry a reply node (a test checks every `accept` option). (D-QUEST-2) The `family` ending needs `plan = unset`; with `plan = repair` NPC work to ≥ 90 ends with `repair_npc` (rule `npcRepair`; no thanks scene), and E1 pays opinion/rep/branches only when the player `contributed` (counter `myRepairs` = player repairs of the house, or beams arranged with the common store); the `repair` event carries `byPlayer`.
