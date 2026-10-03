# Wave review: quests--003 W1/W2 authored quests and render--011 armour visuals

- **Range:** `e3a1c2a^..34b53cf` (main). It covers:
  - the twelve authored quests of quests--003 W1/W2: G08, G04, Q09, Q01, G07, G02, Q04, G06, Q08, G05, Q02 and Q06 (`src/game/data/quests/*.ts`);
  - the engine additions in `sim/questCore.ts`, `questEngine.ts`, `questDialog.ts` and `questHooks.ts`:
    - anchors `boundary`, `offset` and `roadSide`;
    - conditions `far`, `companion` and `canTravel`;
    - effects `fell`, `drive`, `companion`, `dismiss`, `hurt`, `slay`, `scare`, `grant` and `tag`;
    - events `fell`, `burn`, `dig`, `fill` and `sell`;
    - creature dens with young and a leash (`spawnCreature`), and the leash in `fauna/ai.ts` `pickWander`;
    - `questCompanion` and `canTravelWithPlayer` in `npc/companions.ts`;
  - render--011 stage 1 (`a456dd6`, `2c86d87`): `render/equipmentVisuals.ts`, `render/actors.ts` and `scripts/assets/build-equipment-modules.mjs`.

  The cave commits in the same range (world--003) were only read where they touch these files (`companionDist`, `dropItem`, `dig`). They were not reviewed on their own.
- **Plans and decisions:** `docs/plans/quests--003--remaining-authored-quests.md`, `docs/plans/render--011--equipment-armour-visuals-existing-parts.md`, `docs/design/DECISIONS.md` (D-QUEST-1, D-ECON-1, D-SAVE-7, D-CAVE-2).
- **Reviewer:** an independent Opus subagent in an isolated worktree (skill `wave-review`). No `src/` changes were made.
- **Evidence:**
  - Targeted vitest run: the 12 new quest test files, `questEngine.test.ts` and `equipmentVisuals.test.ts` give **14 files, 93/93 passed**. The full suite and e2e were not run (out of scope for this review).
  - `node scripts/check-layers.mjs`: OK. `data/quests/*` imports only `./types`, `./dsl` and `data`/`world` types.
  - Throwaway probes in `tmp-review021/repro.test.ts` and `tmp-review021/rt.test.ts` (not committed) produced every number quoted below.
- **Legend:** ✅ confirmed (reproduced, or read in code with the failure path traced) · 🟡 assumption · ❓ open (❓ user = a design call for the user).

## Summary

**What holds:**
- **Layering:** quest data stays plain data, and nothing in `sim` imports render or UI.
- **Money:** every transfer in the twelve quests goes through `transferMoney`, which is partial when the source is short, and never creates money.
- **Items:** new items enter only through `grant` (ledger `logProduce`), visitor provisions, `fell` (logs from a real tree, ledger-logged) and the existing butcher path (white pelt). They leave only through `consume`.
- **Save:** a mid-quest save survives a JSON round trip (✅ probe):
  - Q02's sow keeps `leash` 14 and `denId` `qden:q02`, and the den group of 6 is intact;
  - Q06's hired contract round-trips;
  - G02's `plowshare` keeps its `flawed` tag;
  - all three quests keep ticking as `active` after `new Sim(world, copy)`.

  The new optional fields (`Animal.tag`, `Animal.leash`, `ItemStack.tag`) need no `SAVE_VERSION` bump under D-SAVE-7, as PROGRESS states.
- **PERF-01:**
  - `noThreat` uses `actors.query` and runs only in the 30 s offer check;
  - `boundaryTree` uses `nodes.query` once and caches the result;
  - `drive` scans `state.animals`, but only once per effect, never per tick.
- **Fog of war:** new stage anchors go through `questMarkers`, which shows only explored cells.
- **Soft-locks:** no dialog can trap the player. `QuestTopics.vue` always offers "Leave it".

**What breaks:** four problems are worth fixing before the wave counts as done:
- **Q06 (#1):** the companion contract can end before the pickup, and nothing tells the player how to recover.
- **Quest goods on sale (#2, #3):** quest-only goods with a price are on sale from NPC stores. A `give` from a source that is short does nothing and says nothing, so some endings pay for goods that never moved. G02 can be farmed for money this way.
- **Creatures outlive their endings (#4):** endings that say "he left the region" or "{V} dealt with the sow itself" leave the unique creature where it was, still dangerous.

## Findings

| # | Severity | | Where | Failure scenario | How to reproduce |
|---|---|---|---|---|---|
| 1 | **major** | ✅ | `data/quests/q06.ts:113` (pickup `needs`), `:123` (`ma_terms` only while `deal` is `none`), `:136` (`dropped` after 504 h), `sim/interact.ts:278` ("End the contract") | **Q06 pickup can become impossible.** After the paid or free deal, Sophie hands the order over only to the player with Miles's mark, or with Matthew as a **current** companion within 12 m. Matthew can stop being a companion before the pickup in four ways: the player chooses "End the contract" in the interact menu, he starves on the road (`companionSystem`), a free companion's opinion drops below 0, or the 4-day contract expires. After that, `ma_terms` is gone (it needs `deal` `none`), no topic grants the mark, and the journal still says "collect the order". The only way out is re-hiring Matthew through the generic hire panel and paying a wage again. Nothing hints at that, and it is impossible if he is dead (he is an optional slot, so his death does not lapse the quest). Otherwise the quest waits 21 days for `dropped`. | Probe: offer, `mi_open/plan`, `ma_terms/paid`, then `dismissCompanion(matthew)`. Stand at Sophie's house with Matthew 1 m away: `so_pickup` options are `[["take", false]]`, Matthew has no topic, and Miles only offers `mi_hatchet`. **Fix idea:** gate the pickup on Matthew being near the player (the `near` clause) instead of on `companion`. Or let Miles hand over the mark when `deal` is `paid` or `free` and Matthew is not a companion. |
| 2 | **major** | ✅ | `sim/trade.ts:60` (`tradeStock` skips only `price <= 0`); `sim/questCore.ts:541-542` (`transferItems` returns silently when the source is short); onOffer grants in `q06.ts:32-33`, `g02.ts:22`, `q09.ts:30-33` | **Quest goods are ordinary trade stock, and a short `give` fails silently.** Right after the offer, before the player has accepted anything, the probe lists for sale: Ralph's `plowshare`, Sophie's `axe_head` and two `iron_wedge` (Miles's **prepaid** order), Stephen's `saw`, `shears` and `sickle`, and Miles's `oak_plank`. The player can buy them (paying twice for Miles's order), and so can the NPC economy. The quest effects then move nothing, yet set their flags and end as normal. Examples: Q09 `toolRule` sets `toolsMiles` and says "Miles hangs the saw on its nail" when Stephen no longer has the saw. Q06 `so_pickup` sets `itemCollected` with nothing handed over. Endings with a store `give` (G08 small beer, Q08 wool ×3, Q01 arrows and dried meat, Q04 bread, Q02 bread) also say nothing when the store is short. Conservation holds (nothing is created), but the journal text and the flags drift away from the items. | Probe: offer every quest (day 5, V visited), put each NPC at its door, and call `tradeStock`. Output: `g02 ralph ['plowshare']`, `q06 sophie ['axe_head','iron_wedge','iron_wedge']`, `q09 stephen ['saw','shears','sickle']`, `q09 miles ['oak_plank']`. **Fix idea:** keep `availability: 'quest-only'` stacks out of `tradeStock` (or tag quest-reserved stacks). Have `transferItems` report a short transfer, as `transferMoney` already does ("could pay only…"). |
| 3 | **major** | ✅ | `data/quests/g02.ts:60` ("return" takes the share, with no item check later), `:116` (`returned` ending: `give` from player, then `bernardPays(5)`) | **G02 can be farmed.** Take "Give the share back to Bernard", sell the plowshare to any NPC, then report "Here's your share" to Bernard. The `give` silently moves nothing, Bernard still pays 5 c, and the ending says "The share went back to the forge". Ralph's share is gone for good. | Probe: `be_open/talk`, `ra_field/return`, `sellToNpc(ralph, share)`: "Sold: Plowshare ×1 for 17 c". Then `be_close/returned`: status `done`, ending `returned`, **player +22 c**, share held 0. **Fix idea:** give `be_close/returned` the option `needs: [share()]`, and the same for `ra_back` (it already gates on `share('mended')`). Also #2. |
| 4 | **major** | ✅ G07 / 🟡 Q02 effect on travellers | `data/quests/g07.ts:99` (`driveDay2` uses `scare`), `q02.ts:127-128` (`watch`/`settled`), `:158`, `:160`; `sim/questCore.ts:706-721` (`cleanup` despawns only `spawn` slots) | **Quest creatures are never retired by endings that say they are gone.** G07 `drive` says "he left the region", but `scare` is a 30-minute flee: the unique alpha wolf keeps its home 900 m north of the village and keeps hunting there. The `drive` effect added for Q02, which moves the home and lifts the leash, is not used. Q02 `settled` ("{V} dealt with the sow itself"), `watch` ("bend clear"), `reroute` and the lapse leave the aggressive sow and her five young leashed (14 m) to a den 18 m off the H–V road for the rest of the game. A boar's guard range with young is 18 m, so the group sits within about 32–36 m of the road on every trip (🟡 whether caravans or NPCs actually get attacked was not measured). G07 `gaveUp` also leaves the wolf, which is consistent with "the wolf is still out there". | Probe: G07 `ja_open/must`, two clues, `ja_how/drive`, `driveDay1 = 1`, day 7 with a torch, near the wolf, `tickQuests`: `done drive`, **wolf alive, home moved 0 m**. Q02: read `watchDone`/`settled` and `cleanup`; no effect touches the `sow` slot. **Fix idea:** G07 should use `{ k: 'drive', slot: 'greybeard', m: 1500 }` (or `despawn`). Q02 should apply `drive` (or a `despawn` of the group) in `watch`, `settled` and `lapse`. |
| 5 | minor | ✅ | `data/quests/g08.ts:127`; test `sim/questG08.test.ts:82` | **G08 "quiet" never pays its small beer.** `small_beer` is quest-only, and nothing ever puts it into a store (`grep` finds only `items.ts` and `g08.ts`). Tom's store holds 0, so the `give` silently does nothing, while the journal says "{tom} sent a small beer from a good cask". The test pushes 2 small beers into Tom's store by hand, which hides the bug. | Probe: offer G08, then `countItem(tomStore, 'small_beer')` gives 0. **Fix:** `grant` it with a `why` (beer from his own cask), or give it to Tom's store at the offer, and drop the manual push from the test. |
| 6 | minor | ✅ (code path) | `sim/questCore.ts:759-762` (`dismiss`), `q06.ts:136`, `:172` | **`dismiss` ends any contract, including one the quest did not create.** Suppose the player takes the solo road (or never accepts) and later hires Matthew through the hire panel for a wage. The `dropped` rule (504 h) or the lapse (`ignored`, 120 h) then calls `dismiss` and ends that paid contract early. `hireCompanion` keeps no refund path, so the wage is lost. The `companion` contract made by the quest is not marked as quest-owned. | Read: `dismiss` checks only `h.companion`. To reproduce: Q06 `mi_open/solo`, `hireCompanion(sim, matthew, 'escort', 'low', 30)`, +505 h, `tickQuests`: Matthew is dismissed. **Fix idea:** store `questId` on the contract and dismiss only a contract of this quest. Optionally `cleanup` could end such contracts too, the way it clears holds. |
| 7 | minor | ✅ (arithmetic) | `data/quests/g05.ts:108-109` (`fellNight` = `hour night`, `fellDay` = hours 6–20); `sim/time.ts` `daylight`/`dayBounds` | **Felling the oak can go uncounted.** In summer, sunrise is at 4.25 h, so `isNight` ends at about 3.8 h. A fell between about 03:50 and 06:00 matches neither counter. The oak becomes a stump and the quest goes on. A later `for_h` verdict says "{miles} felled it" (the `fell` effect does nothing because the node is already felled) and pays 15 c, with no disgrace. | On a mid-summer day at 05:00, fell the boundary oak as the player, `tickQuests`: G05 stays `active`. **Fix:** one `fell` counter without `when` (the ending is the same either way), or close the hour gap. |
| 8 | minor | ✅ | `data/quests/q02.ts:112` (`found` needs `calm`, so a living sow), `:93`, `:107`, `:125` (`hollowFound` gates the report and "clear"), `:128` | **Q02 can stall for 14 days.** If the sow dies before the hollow is "found" (the player kills her on the way, wolves prey on boar, or she dies from the leash fights), `found` can never fire, so there is no report, no choice and no clear. Only `settled` after 336 h ends the quest. The young are then left leashed to a den with no adult. | Probe: accept, `tracksRead = true`, remove the sow, stand at the den, `tickQuests(10)`: `hollowFound false`, Bridget has no topic. **Fix idea:** `found` should also fire when `{ k: 'dead', slot: 'sow' }` (the bedding is still there), or a `dead` sow should enable `br_report`. |
| 9 | minor | ✅ | `data/quests/q01.ts:110` (`sMeat` matches any `raw_meat`) | **Q01 "ordinary hare" accepts any raw meat.** One piece of deer meat sold to Stephen ends the "ordinary hare" branch. The stack carries `sp`, but the counter `match` has no species filter. | Probe: choose `ordinary`, sell `raw_meat` (`sp: 'deer'`) to Stephen: ending `ordinary`. **Fix:** a `match.sp` (or `species`) for `sell`/`give` events. |
| 10 | minor | 🟡 intent | `data/quests/g06.ts:110` (`rumour`) | **G06 `rumour` (−5 honesty in V, 72 h after "agreed") almost never fires.** Rules run only while the quest is active, and `st_back/agreed` ends it the moment the player reports back. The penalty therefore applies only to a player who waits more than 3 days to report, which is the opposite of what "word got round" suggests. | Read the rule order: `tickRules` runs only for `live()` states. **Fix idea:** apply the reputation change in the `agreed` ending (or with a delayed `priceMod`-style record). |
| 11 | minor | ✅ (code path) | `data/quests/g02.ts:109` (`weld` re-tags the share in the **player's** pack), `:100` | **G02's weld happens in the player's pack.** Sophie "re-welds" the share while it stays in the player's pack, and the tag changes remotely after 12 h. If the player has meanwhile dropped, stored or sold it, `tag` does nothing but `welded` is still set. `ra_back` needs `share('mended')`, so the quest then waits for `lostShare` (336 h). | Take the `mend` path, drop the share, +12 h: `welded` is true, nothing is tagged, and `ra_back` never appears. **Fix idea:** at `be_mend` move the share to Bernard's store (`give player → store`), re-tag it there, and hand it back at the end of the weld. |
| 12 | minor | ✅ | `data/quests/q08.ts:88` (`consent` counts from the **stage**), `:85` (`fills` counts any trough near the pen) | **Two Q08 timers count the wrong thing.** (a) Margaret says "come back tomorrow", but the 12 h run from choosing the plan, so asking 12 h later gives consent at once. (b) `fills` counts fills of **any** trough within 40 m of the pen, before or after choosing the trough plan, including a pre-existing one, and a fill from the well counts as a full one. The design says "build it and fill it three times". | Read. **Fix idea:** a `set('consentDay','today')` + `dayAfter` (or a stage bump at `ask`). Save the built trough as an anchor (`match.save`) and require `near` that anchor for `fills`. |
| 13 | minor | ✅ | `sim/quest*.test.ts` | **No save test covers the W1/W2 state.** No round-trip test covers creature casts (`tag`, `leash`, `qden:` dens), a quest-made companion contract or tagged items. The probe shows they survive today. Add the probe as a regression test next to the existing round trip in `questEngine.test.ts:319`. | `tmp-review021/rt.test.ts` (this review) passes. |
| 14 | minor | 🟡 | `sim/questCore.ts:255` (`boundaryTree` filters `tree_broad` but not `nodeAvailable`) | **The boundary oak can be a stump.** If the largest broadleaf tree near the road midpoint was felled before the quest is accepted (by the player, or by another axe), the anchor is a stump. The bark and age observations then describe a living oak, and `for_h` "fells" nothing. | Fell the tree the anchor would pick, then accept G05. **Fix:** skip nodes whose `sim.state.nodes[id]?.kind === 'felled'` (resolution happens once, so no per-tick cost). |
| 15 | minor | ✅ | `render/actors.ts:373`, `:166` | **Per-frame allocations for every human model.** For every human drawn as a model, every frame builds `humanKindKey`, which calls `charKey`, which calls `outfitWithEquipment` and then `equipmentModules`. Then `equipmentVisualKey` calls `equipmentModules` again. That is several arrays and template strings per actor per frame, against review 009 F-04 ("no allocation per actor"). | Read. **Fix idea:** keep an equipment revision counter on `Human` (bumped by equip/unequip), or compare `equipmentVisualKey` at a low rate (for example on the 5 Hz overlay tick) or on an equip event. |
| 16 | minor | ❓ user | `render/equipmentVisuals.ts:49-53` | **Two outfit and module combinations may clash.** Only Ranger and Herbalist lose their hood under a helmet. A trader (outfit `Wizard`, with a hat) or a guard (`Knight`, with body armour) who gets an `iron_helm` or `plate_cuirass` as a companion (COMP-03) would draw a helmet through the hat, or a second cuirass inflated 5 cm over the Knight's own. 🟡 Not seen in the tour, which covers the farmer, guard and herbalist without these items. | `tour-equipment.mjs` with a trader companion given `iron_helm`. |
| 17 | minor | ✅ | `scripts/assets/build-equipment-modules.mjs:95-121` | **A partial build overwrites the full pack.** The header advertises `[Module…]`, but a partial run writes a pack with **only** those modules to the same `eq/<Sex>.glb`, so the other modules silently disappear and the runtime simply skips them. | `node scripts/assets/build-equipment-modules.mjs IronHelm` drops the cuirass, pauldrons and boots. **Fix:** merge into the existing pack, or refuse partial runs without `--out`. |
| 18 | minor | ❓ user | `data/quests/q01.ts:28` (stage `field` anchor = the hare **actor**), `q02.ts:31` (stage `hollow` anchor = the den) | **Two map markers give the answer away.** The quest marker follows the white hare's live position (in explored cells) during "read the ground, watch it from cover". Q02 marks the hollow on the map while the stage asks the player to *find* it. Both undercut the field-craft the quests are about. | Open the map during these stages. **Option:** mark the area (`offset` or the forest-edge point) rather than the creature or the den. |
| 19 | nit | ✅ | `sim/questCore.ts:635` | **A den timer is saved as `null`.** The quest den is created with `nextSpawn: Infinity`. JSON saves it as `null`, so after a load `cal < null` is false and the den is processed once more, then reset to a finite time. It is harmless (`maxCount` is 0), but it is a non-number in a number field that `assertSaveShape` does not check. | Probe: `roundTrip` shows `"nextSpawn":null`. Use a large finite value, or skip `maxCount === 0` dens. |
| 20 | nit | ✅ (code path) | `sim/questCore.ts:627`, `sim/questEngine.ts:166-170` | **Creature RNG and debug re-offers.** The creature RNG seed uses only `def.id.charCodeAt(0)`, so Q01 and Q02 (and every `q…`/`g…` quest) share one stream (deterministic, but correlated). Separately, `forceOfferQuest` re-offers after `cleanup`, which does not despawn `creature` slots, so each debug or e2e re-offer of Q01 or G07 leaves another white hare or alpha wolf in the world. | `__sv.forceQuest('g07')` twice leaves 2 tagged wolves. Seed with `hashString(def.id)`, and despawn creature slots in `forceOfferQuest`. |
| 21 | nit | ✅ | `sim/questDialog.ts:155` | **The deadline can read "1 day 24 h."** `Math.ceil` of the remaining hours shows "Time left: 1 day 24 h." at 47.5 h left. Round first, then split into days and hours. | `timeLeftText` with 47.5 h left. |
| 22 | nit | 🟡 | `data/quests/q06.ts:81` | **The lent hatchet is created, not lent.** Miles's "old hatchet, not the good one" is a `grant` (new item) into Matthew's pack instead of a `give` from Miles's store. It is a declared source, but the woodcutter household already owns axes. | Read. |

### Checked without findings

- **Held and led actors:** none of the twelve quests uses `hold` or `follow`. Q06's companion is ended by every ending that has one (`paid`, `free`, `dropped`, the lapse and a `requiredDead` lapse), apart from #1 and #6.
- **Creature death:** with `requiredDead` skipping `creature` slots, a dead white hare or wolf no longer lapses Q01, G07 or Q02. Each has its own ending or a timeout.
- **Conservation in the new effects:**
  - `fell` logs are ledger-logged into a cast store;
  - `slay` leaves an ordinary corpse without a player kill or reputation;
  - `drive` moves only the den group;
  - `grant` always passes a `why`;
  - Q06's prepaid 24 c is a purse-to-purse transfer, and Q09's consign payouts are purse to purse;
  - `sell` events fire after the money has moved.
- **The leash** applies only to wandering (`pickWander`). Flight and aggro are unchanged, so a driven group (leash lifted) is not pulled back.
- **Item tags:** `canMerge` and `stackLookKey` include `tag`, so a `flawed` and a `mended` share never merge.
- **Armour rebinding:**
  - modules bind to the outfit's bones by name, with a fallback that strips the `_n` suffix;
  - geometry and materials are shared, and `dropVisual` disposes nothing, so shared buffers are safe;
  - `applyLook` runs before the modules are attached, so plate is not tinted;
  - a change of worn armour marks the visual `stale` and rebuilds it.

## Counts

- **major:** 4 (#1–#4)
- **minor:** 14 (#5–#18; #16 and #18 are ❓ user)
- **nit:** 4 (#19–#22)

## Triage (Sonnet, 2026-10-03)

Regression tests: `src/game/sim/questReview021.test.ts` and `questQ06.test.ts` ("review 021 #1/#6").

| # | Status | Note |
|---|---|---|
| 1 | fixed | pickup also opens when the deal is paid/free and Matthew is at the forge; Miles hands over the mark (`mi_mark`) when Matthew can no longer come (dead or contract ended) |
| 2 | fixed | `quest-only` goods are no longer shop stock; `give` from a short source posts "could hand over only n of m" |
| 3 | fixed | G02 `returned` needs the share in the pack |
| 4 | fixed | G07 drive uses `drive` (1500 m); Q02 `settled`/`watch`/`reroute`/lapse drive the sow group away (400 m, leash lifted) |
| 5 | fixed | G08 grants two small beers to Tom's store at the offer |
| 6 | fixed | companion contracts made by a quest carry `quest`; `dismiss` ends only those |
| 7 | fixed | one `felled` counter (no hour gap) |
| 8 | fixed | Q02 `found`/`count` also fire when the sow is dead |
| 9 | open | Q01 "ordinary hare" counts any raw meat (needs a species filter on `sell`/`give` events) |
| 10 | open | G06 `rumour` only after >72 h; move the penalty into the ending when the design is revisited |
| 11 | open | G02 weld happens in the player's pack (move the share to Bernard's store) |
| 12 | open | Q08 consent timer from the stage and `fills` of any trough near the pen |
| 13 | fixed | round-trip test (Q02 den group, leash) |
| 14 | fixed | felled trees are skipped for the boundary anchor |
| 15 | open | per-frame armour key allocation (equip revision counter) — render stage 2 |
| 16–18 | open ❓ | helmet/cuirass clipping on Wizard/Knight, partial module build overwrites the pack, quest markers give answers away — user/Opus decisions |
| 19 | fixed | den timer finite |
| 20 | partly | creature RNG seeded by the id hash; debug re-offers still pile up creatures |
| 21 | fixed | deadline text ("2 days", never "1 day 24 h") |
| 22 | rejected | the grant is a declared source; no Miles axe store is guaranteed |

Counts: 4 major fixed; of 14 minor: 8 fixed (#5–#8, #13, #14 plus #6), 6 open; nits 3 fixed, 1 rejected.
