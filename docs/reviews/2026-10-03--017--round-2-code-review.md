# Code review, round 2: review-016 fixes (review--001, code part)

- **Range:** `2b52d64..2d8dabb` (main). It covers the board quest fixes, authored-quest name and pronoun templating, Q03/Q07/G03/G01, notice board scope, warehouse take/put quantity and reputation cost, touch floor, map labels, trade merge, build ghost, sleep wake, target cone and household baking (D-ECON-6). The caravan provisions (D-NPC-9) commits are outside the range: they landed before `2b52d64`, and only their tests were re-run here.
- **Reviewer:** an independent Opus subagent in an isolated worktree. No `src/` changes were made.
- **Evidence:**
  - Full vitest run with a temporary config that was not committed: **64 files, 401/401 passed**.
  - `pnpm type-check`, `eslint src` and `node scripts/check-layers.mjs` are clean. The layer check reports: "sim, world, data, config, core, save are free of three/vue/render/ui/audio imports; UI does not mutate sim state".
  - Throwaway probes (`review-probes/probe017.test.ts`, not committed) produced the numbers quoted below.
  - No e2e run: PROGRESS records `e2e:run` smoke 3/3, acceptance 39/39 and mobile 14/14 for this commit.
- **Legend:** ✅ confirmed (reproduced, or read in code with the failure path traced) · 🟡 assumption · ❓ open.

## Summary

The quest batch (016-Q) is solid:
- The rats completion rule and the `left` objective match the triage.
- Templating covers dialog lines, options, `reason`, topic labels, the journal, `choiceLabels` and `message` effects. `questText.test.ts` scans every string for design-doc names and unknown slots.
- D-QUEST-2 is implemented.
- Save format: there is no new mutable state, and none needs a `SAVE_VERSION` bump. `buildPreviewId` is UI-only. Clearing `denId` uses an existing saved field.
- Layering: `buildGhost` is in render, and the UI only reads sim (`noticeBoard`, `groupIdentical`) and mutates through `Game`.
- Per-tick queries: the new per-frame `blueprintSpot → canPlace` uses `buildingsNear`, a spatial query. The only new full scan, `s.animals` in `questSystem`, runs once when a quest completes.
- Conservation: baking has a grain sink and a bread source, both logged under `bake`, and the ledger test balances. Warehouse take and put move exact quantities in both directions.

The UI batch (016-U) has gaps:
- Sleep can still end in the dark on two paths. Triage #8 called this fixed; the tests cover only 21:00 and 22:30.
- The new per-piece warehouse buttons make the per-action honesty cost and the 10 c deposit threshold matter, and the preview hides both.
- The notice board shows distances to settlements the player has not discovered.

## Findings

| # | Area | Severity | | Location | Failure scenario | Reproduction |
|---|---|---|---|---|---|---|
| 1 | Sleep wake (016 #8) | minor | ✅ | `sim/interact.ts:511`, `sim/player.ts:20` | **Fix incomplete: an evening "nap" ends in the dark.** `startSleep` takes the morning path only when `isNight` holds or the hour is past 20:00. Anything earlier is a nap of `max(2, (100 − vigor)/12)` h. The early wake is blocked after 20:00, so the nap runs to its full length. A player who goes to bed at dusk wakes in the night, which is the symptom of #8. This is common in autumn and spring: sunset is about 18:00 and `isNight` starts about 18:27, so going to bed at 18:00 with vigor 40 wakes about 23:00. | Probe: longest day (bounds 4.25–19.75), sleep at 19:30 with vigor 40. **Wakes 00:31, `isNight` true.** |
| 2 | Sleep wake (016 #8) | minor | ✅ | `sim/interact.ts:500-507` | **Winter evening sleep falls back to 9 h and wakes at about 02:00.** `hoursUntilMorning` searches only `off ≤ 14` h for a light hour ≥ 06:00. On the shortest days, `isNight` starts at 16:42 and light comes at 07:18. A sleep started between 16:42 and 17:18 finds no light hour inside 14 h and returns the 9 h fallback. The 9 h end is reached and the activity stops regardless of `restedAndLight`. | Probe: shortest day (bounds 7.75–16.25), vigor 99. Start 16:48 → `hoursUntilMorning` 9, **wakes 01:48 (night)**. Start 17:00 → wakes 02:00. Start 17:12 → wakes 02:12. Fix: search up to 24 h, or compute from `dayBounds`. Add a test across `dayBounds` extremes and evening hours 16–20. |
| 3 | Warehouse reputation (016 #3, D-ECON-4) | minor | ✅ | `sim/interact.ts:573-583`; `ui/panels/StoragePanel.vue:25-37` | **The honesty penalty is per click, not per quantity, and "Take 1" is now the primary button.** Below helpfulness 10, every take costs Honesty −1 (D-ECON-4 "as before"). Before this range a take moved the whole stack. Now taking a stack piece by piece multiplies the honesty loss. The hint prints `1: −0.3 · all 6: −1.8 Helpfulness, Honesty −1`, which reads as if the −1 applies once. | Probe: helpfulness 0, warehouse holds 6 bread. Six `transferToStorage(…, 1)` calls give **Honesty −6**. One "All" gives **−1**. Decide whether honesty should scale with value or count once per visit or day. Either way, the hint must say "per take". |
| 4 | Warehouse preview (016 #3) | minor | ✅ | `ui/panels/StoragePanel.vue:27-28`; `Game.ts:680-687`; `sim/reputation.ts:119` | **The deposit hint is hidden whenever one piece is worth < 10 c, and "Put 1" then earns nothing.** `repHint` returns `''` when the one-piece preview is null. `storageRepPreview` returns null when the gain is 0, and `depositGoodwill` gives 0 below `WAREHOUSE.minValue` (10 c). Bread (6 c), branches, stones and most food: no hint at all, although "All" would gain helpfulness. A player who puts a stack in piece by piece (the primary button) gets 0, then pays the full linear `takeGoodwill` to take it back. | Bread ×6 in the backpack: `warehouseDepositGain(wh, bread6, 1)` = 0, `(…, 6)` = 1.8. The row shows no hint. Show the "all" line even when one piece earns 0, e.g. "1: no effect (under 10 c) · all 6: +1.8". |
| 5 | Warehouse preview | minor | ✅ | `Game.ts:686`; `sim/interact.ts:582` | **The honesty cost of a zero-price item is not previewed, and the toast shows "Helpfulness −0".** `storageRepPreview` returns null when `helpfulness` is 0, even though `honesty` is 1. | Probe: helpfulness 0, take 1 `sling_stone` (price 0). Cost `{helpfulness:0, honesty:1}`; toast **"Taken: Sling stone (Helpfulness −0, Honesty −1)"**; honesty −1. The panel shows no hint. Return the preview when either part is non-zero, and omit zero parts from the toast. |
| 6 | Fog of war (MAP-01), notice board (016 #17) | minor | ✅ | `sim/quests.ts:186-198`; `ui/panels/QuestsPanel.vue:54` | **The board gives the distance to undiscovered settlements**: "(2.9 km away: go there to accept)". `questSystem` posts notices for every settlement in the world, and `noticeBoard` adds `distanceM` without checking `isKnownSettlement`. Meanwhile `waypointToSettlement` refuses the same place with "You have not heard of that place yet.". The name already leaked through the title before this range; the distance and the "go there" call to action are new. | Probe (`testSim`, fresh game): groups Maplewick (here), **Hollowgate 2924 m** and **Heatherby 3788 m**; `isKnownSettlement` is false for both. Either hide notices from unknown settlements, or show "posted in a distant village" without a distance until the settlement is known. No test covers this. |
| 7 | Q03 text / effects (D-QUEST-2) | minor | ✅ | `data/quests/q03.ts:253`, `:276-283` | **The `repair_npc` journal claims a debt repayment that cannot have happened, and its `storeDebt` branch is dead.** `npcRepair` fires only when `not contributed`. `contributed` includes `flag('storeGranted')`, and `storeDebt` is set only together with `storeGranted` (`store_agree`). So in `repair_npc`, `storeDebt` is always false and the warehouse `give` never runs. Yet the journal always says "{miles} repaid the common store its two beams from his own woodpile". | Read: `store_agree` effects `[give logs, set('storeGranted'), set('storeDebt')]`, and `contributed = any(myRepairs ≥ 1, storeGranted)`. Drop the clause from the journal and the dead `if`, or move the store debt out of `contributed` if a store loan without player work should count as "without you". |
| 8 | Docs vs code | minor | ✅ | `docs/design/DECISIONS.md` D-QUEST-2; `docs/design/quests-engine.md:252`; `docs/reviews/2026-10-03--016--app-review-round-1.md:72`; `docs/state/PROGRESS.md:10` | (a) D-QUEST-2 and quests-engine.md say NPC repair under `plan = repair` "ends with E1". The code ends with the separate `repair_npc` ending (commit `762bfb3`). (b) Triage row #7 says "fix … order price capped … batch 016-U", but `orders.ts` is unchanged in the range. `review016u.test.ts` asserts the opposite ("kept: M-09 floor wins"), and no decision records the keep. (c) PROGRESS "Review loop round 1" still says the UI batch is "interrupted … unverified", while line 8 says it is merged and verified. | `git diff 2b52d64..HEAD --stat -- src/game/sim/orders.ts` is empty. Update the triage row (#7 → "kept, reason …" plus a D-ECON entry), D-QUEST-2 and quests-engine.md (`repair_npc`), and the PROGRESS line. |

### Missing tests

These gaps are 🟡: there is no failure beyond those above, only no coverage.
- Sleep: evening hours 16:00–20:00 across the `dayBounds` extremes (#1, #2). The existing tests start only at 21:00 and 22:30 on the default day.
- Warehouse: `transferToStorage(…, toStorage = true, 1)` (put one piece) and its goodwill. There is no test of the deposit quantity path. Also missing: honesty over repeated `Take 1`, and the preview for price-0 items.
- Notice board: no MAP-01 test for unknown settlements. The `acceptQuest` refusal message outside the posting settlement is tested only indirectly.
- Trade merge: `groupIdentical` rounds `dur` and `fresh` to integers while `canMerge` and `sellPrice` use exact values. This is harmless in practice: the price difference is below 1 c after rounding. 🟡 Not exercised with priced rows.

### Checked and fine

- Rats completion (016 #1):
  - The quest completes at `kills ≥ killsNeeded` with the nest gone. The remaining nest rats are untagged, and the `left` objective appears only while `kills < killsNeeded`.
  - `countByDen` (a full animal scan) is called only from UI panels and once per `questSystem` pass, as before.
  - 🟡 Untagged rats keep their `homeX/Z` by the building, so they stay within the 20 m stray radius for the next nest cycle. This is harmless while completion uses kills.
- Templating (016 #2): `fillQuestText` leaves unknown tokens visible. The `questText` test guarantees that every token names a cast slot or `H`/`V`, and that no braces survive for any offered quest's nodes and journal. Titles carry no tokens.
- D-QUEST-2: `family` needs `plan = unset`. `repairDone` needs `contributed`; `myRepairs` counts only `byPlayer` repairs within 3 m of the house anchor. `byPlayer` is set at the only `repair` emitter (`actions.ts:402`).
- Notice board acceptance: `settlementAt(…, 400)` cannot pick a neighbour, because settlements are ≥ 2.9 km apart in the test world.
- Target cone (016 #11): 80° half-angle plus a 0.6 m touch radius. Ranges are unchanged and the candidate queries are spatial.
- Build ghost (016 #10): the ghost and placement share `blueprintSpot`. The ghost is visible only while the build panel is open, and is reset `onUnmounted`.
- Baking (D-ECON-6): `bakePlan` checks the house inventory and the act consumes from `storeOf` = `houseOf().inv`, the same inventory. The ratio matches recipe `bread`. Grain has no other consumer, so baking it all starves nothing.
- Map labels: `placeLabel` clamps inside the canvas. Picking uses `getBoundingClientRect`, so the smaller canvas maps clicks correctly.

## Triage (session 14)

All 8 confirmed. Fixed with tests: #1–2 sleep (`review016u.test.ts`, all seasons × evening hours), #3 Honesty cost proportional (D-ECON-8), #4 deposit hint shows the "all" gain, #5 zero-cost toast/preview, #6 notice board hides unknown settlements (`questReview016.test.ts`), #7 `repair_npc` journal and dead branch removed, #8 docs (D-QUEST-2, quests-engine, D-ECON-7, PROGRESS).
