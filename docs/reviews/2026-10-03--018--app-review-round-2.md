# App review, round 2 (review--001, application part)

- **Round:** 2 of at most 3. **Scope:** only what changed since `2b52d64` (fix range of review 016): board quests and the authored quests Q03, Q07, G01, G03; the notice board; warehouse Take/Put quantity and reputation cost; the mobile touch-target floor (≥ 32 px); map labels and the mobile map; trade list merging; the build ghost; sleep wake time; the target cone. Plus a smoke pass over the neighbouring loops (start, needs, trade, combat, build, frames).
- **Commit under review:** `2d8dabb` (main). No `src/` or script changes were made for this review.
- **Reviewer:** an independent Opus subagent in an isolated worktree (skill `app-review`).
- **Evidence:** `node scripts/e2e/review-run.mjs` (all 7 scenarios) exited 0: 193 screenshots, 0 console errors, every step performed (start 7/7, economy 10/10, combat 7/7, build 7/7, quests 11/11, ui 55/55, frames 36/36). `ui-checks.json`: **0 hits** in 55 views (the round-1 count of small buttons was 400). Two throwaway probes ran against their own dev server (scripts in the reviewer's scratchpad, not committed): **probe A** (`test-results/review/probe-018/`) covers notice boards in three settlements, the rats quest with nest rats still alive, the target cone next to a tree, the build ghost at a blocked spot, camp sleep at 23:30, two "Take 1" clicks in the warehouse, and trade with two identical clubs. **probe B** (`probe-018b/`) re-checks the meadow-hills frame. Screenshots are in `test-results/review/<scenario>/` (gitignored); 22 copies are in [assets/018/](assets/018/).
- **Caveats:** headless SwiftShader, so no FPS or GPU claims (D-PERF-2). The scenarios pause the sim and teleport, which produces the same artifacts as in round 1. They are **not** findings: "not visited" on the map, NPCs who are "Sleeping" while the script talks to them at forced hours, Piers's "Morning." at 01:17, and the player standing inside the hearth ring (`approach` to 1.8 m).
- **Legend:** ✅ confirmed · 🟡 assumption · ❓ open (❓ user = a taste or design call for the user).

## Round-1 fixes checked in the running app

| 016 # | Fix | Holds? | Evidence |
|---|---|---|---|
| 1 | Rats quest completes at kills + repaired nest; leftover nest rats become strays | ✅ | review-quests: done, 42 c from the treasury (150 → 108), journal ticks both objectives ([rats-completed](assets/018/rats-completed.jpg)). Probe A with **4 nest rats still alive** and kills = 3: the quest completes after the repair, 0 rats keep the nest tag. |
| 2 | Authored text uses cast names + pronoun tokens | ✅ except one leak (#2 below) | Q03/Q07/G03/G01 dialogs, messages and journals use Edmund/Edith/Peter Sawyer, Nicholas Shieldman, Geoffrey/Eleanor Forester and Peter/Isabel Herder. Pronouns are correct: "Peter found **his** pen latch", Geoffrey "**He** climbs down". |
| 3 | Warehouse Take/Put asks for a quantity and shows the reputation cost | ✅ with issues #1, #3, #5 below | "Take 1" / "All" plus a cost line per row ("1: −0.3 · all 6: −1.8 Helpfulness, Honesty −1"). One click moves 1 bread (6 → 5). The toast states the cost. |
| 4 | Q03 thank-you scene: Edith speaks first, no dangling line | ✅ | "Edith: The beam holds…" opens the node. Edmund still answers from afar (see #9). |
| 5 | Q07 journal per stage; accept options get a reply | ✅ (readability: #10) | Q07 journal: "Done: you looked at the meat… Still to do: roast 4 pieces… Done: every torch post is lit…". Q07 accept → Edith answers; G03 "watch" → Nicholas answers. |
| 7 | Smith order price capped at the trader price | ❌ **not done** | See #4. |
| 8 | Bed/camp sleep wakes at daylight, not in the dark | ✅ | Inn at 21:00 → wake **06:26** ([inn-wake-0626](assets/018/inn-wake-0626.jpg)); probe A camp sleep at 23:30 → wake **06:16**, vigor 100. |
| 10 | Build ghost at the real placement spot | ✅ (residual #7) | Green box shown while the panel is open; the panel docks to the side ([build-ghost-green](assets/018/build-ghost-green.jpg)). Red box at a blocked spot next to the well ([build-ghost-red](assets/018/build-ghost-red.jpg)). |
| 11 | Target prompt only offers what is in front | ✅ in sim (frame symptom: #6) | Probe A, tree 1.6 m behind the player: `findTargets` → `[]`. Facing it → "Broadleaf tree". |
| 12 | Touch-target floor ≥ 32 px | ✅ | ui-checks: 0 small-button hits on mobile (round 1: 400). The touch HUD, close buttons, row buttons and sliders all look large enough ([mobile-touch-hud](assets/018/mobile-touch-hud.jpg)). |
| 13 | Mobile map canvas fits | ✅ | The canvas is inside the panel, nothing cut off ([mobile-map-fits](assets/018/mobile-map-fits.jpg)). Label size: #11. |
| 14 | Map labels stay inside the canvas | ✅ | "Heatherby ?" flips to the left of its marker ([desktop-map-label-flipped](assets/018/desktop-map-label-flipped.jpg)). |
| 15 | Trade list merges identical stacks | ✅ | Trader: "Flint and steel ×2" in one row ([trade-merged](assets/018/trade-merged.jpg)). Probe A: two separate club stacks in the backpack → one row "Club ×2". |
| 16 | Empty storage says "Empty." | ✅ | [storage-empty-text](assets/018/storage-empty-text.jpg) |
| 17 | Notice board grouped by settlement; Accept only locally | ✅ (fog: #8) | Probe A: "Maplewick (you are here)" first, then "Hollowgate (2.9 km away: go there to accept)" and Heatherby, with no Accept button on the others ([notice-board-grouped](assets/018/notice-board-grouped.jpg)). Accepting a Heatherby notice from Maplewick via `game.acceptBoardQuest` is refused: "This notice was posted in Heatherby: go there to accept it." |

## Findings

| # | Area | Severity | | Reproduction | Screenshot | Expected vs actual |
|---|---|---|---|---|---|---|
| 1 | Gameplay: warehouse reputation | **major** | ✅ | Settlement helpfulness below 10 (new game). Open the Maplewick warehouse and click `take-bread` ("Take 1") six times, or click `take-all-bread` once. | [warehouse-take-one](assets/018/warehouse-take-one.jpg) | **Expected:** taking 6 bread costs the same whether you take them one at a time or all at once, and the cost line says so. **Actual:** `warehouseTakeCost` (`interact.ts:545-550`) adds a flat **Honesty −1 per take**, whatever the quantity. "Take 1" is now the primary (orange) button, so six single takes cost **Honesty −6**, while "All" costs −1 (review-economy: one Take 1 = "Helpfulness −0.3, Honesty −1"). The cost line "1: −0.3 · all 6: −1.8 Helpfulness, Honesty −1" reads as if Honesty −1 applied only to "all". The 016 #3 fix made the harsher path the default. Fix: scale honesty with the value taken (or charge it once per visit or day), and show it for each quantity. |
| 2 | Gameplay: Q07 text | minor | ✅ | review-quests Q07: light all 6 posts on Nicholas's dusk round. | [q07-hewers-leak](assets/018/q07-hewers-leak.jpg) | **Expected:** the cast household's name. **Actual:** "The posts are lit. Nicholas goes to the **Hewers'** table." (`q07.ts:208`). The household is the Sawyers. The 016 name-scan test does not include design-doc surnames such as "Hewer". |
| 3 | UX: warehouse weights | minor | ✅ | Probe A: open the warehouse and click "Take 1" on Bread ×5 twice. | [warehouse-stale-weight](assets/018/warehouse-stale-weight.jpg) | **Expected:** the weight follows the quantity. **Actual:** the row shows "Bread ×3 · **2.5 kg**" (should be 1.5), and the backpack shows "Bread ×2 · **0.5 kg**" (should be 1.0). Also in review-economy: Stone ×21 · 60.0 kg, Stone ×3 · 12.0 kg. `ItemRow.vue` computes `info` from a non-reactive `stack` object whose identity does not change when only `qty` is mutated (`stackLabel` in the template re-renders, the computed does not). Before 016 #3 whole stacks moved, so this never showed. The trade panel passes fresh objects and is correct. |
| 4 | Gameplay: economy (016 #7) | minor | ✅ | review-economy `smith-order`. | [orders-knife-39c](assets/018/orders-knife-39c.jpg) | The 016 triage says "fix, batch 016-U", but no order-pricing change exists in `2b52d64..HEAD` (`sim/orders.ts` is untouched). A knife still costs **39 c** from the smith vs 11 c from the trader. Either implement it or move the row back to open or ❓. |
| 5 | UX: feedback under panels | minor | ✅ | review-economy warehouse/trade: Take, Put, Buy or Sell with the panel open. | [storage-toast-behind-panel](assets/018/storage-toast-behind-panel.jpg) | **Expected:** the result line ("Taken: Bread (Helpfulness −0.3, Honesty −1)", "Sold: Apple…") is readable. **Actual:** the toast sits under the panel (`Hud.vue` toast vs the `z-20` panel) and shows as faint text behind it. A storage move also writes nothing to the message log, so the reputation change is easy to miss. This affects every panel that triggers a toast. |
| 6 | Graphics: vegetation after teleport | minor | 🟡 | review-frames `medium-meadow-hills` (frame 26). Compare with `low-meadow-hills` (frame 08) and probe B (medium, fresh session). | [meadow-hills-no-trees-medium](assets/018/meadow-hills-no-trees-medium.jpg), [meadow-hills-trees-low](assets/018/meadow-hills-trees-low.jpg) | The prompt "Broadleaf tree · Fell the tree" shows in an open meadow with no trees. Probe B: the player stands in a grove (trees at 0.75 m and 3.3 m, 74–85° off facing, inside the 80° cone). The low frame and a fresh medium session render the grove; frame 26 (medium, after 25 earlier teleports) renders **no trees at all** near the player. So the round-1 symptom (#11) came from trees that were **not drawn**, not from targets behind the camera. Probable cause: the vegetation chunk is not rebuilt or streamed within the 4.5 s wait after a long teleport on medium. It may be harness timing on SwiftShader, but needs a look (render--003 / streaming). |
| 7 | UX: build placement | minor | ✅ | review-build `campfire`: mark the site, then build. | [campfire-hidden-after-place](assets/018/campfire-hidden-after-place.jpg) | The ghost solves "where" while the panel is open. After "Mark site" the panel closes, and with the camera straight behind, the player's body still hides the site and the finished campfire (now ~2.9 m ahead). Remainder of 016 #10; camera work (016 #9, deferred). |
| 8 | UX / fog of war: notice board | minor | 🟡 | Probe A at the start (map lists only Maplewick, see `ui/10-desktop-map-empty`): rats notices are posted in all three settlements; open the Maplewick board. | [notice-board-grouped](assets/018/notice-board-grouped.jpg) | The board names **Hollowgate (2.9 km)** and **Heatherby (3.8 km)**, and the log says "On the notice board: Rats in Heatherby", while the map still hides them. The reputation table also lists every settlement (this predates the fix range). MAP-01 covers map elements; whether a board may reveal other settlements (as news) is a design call. If not, show only known settlements or "a distant settlement". |
| 9 | Gameplay: authored scenes | minor | ❓ user | review-quests Q03 "The household decision" / "The work is done" with Edith picking berries in the woods; Q07 "Serve the meal". | [q03-thanks-absent-speaker](assets/018/q03-thanks-absent-speaker.jpg) | Multi-speaker nodes play lines from cast members who are not there: Edmund answers in Edith's scenes (and pays "10 c from Edmund Sawyer") while he is felling trees elsewhere. Q07's supper dialogue has Nicholas, Edmund and Peter talking to Edith, who is "Now: Sleeping". Options: skip lines from absent speakers (as `sayIf` does for optional cast), gate the scene on who is nearby, or accept it as abstraction. |
| 10 | UX: Q07 journal | minor | ❓ user | Press J after accepting Q07. | [q07-journal-wall-of-text](assets/018/q07-journal-wall-of-text.jpg) | The progress lines are run-on sentences appended to a 3-line instruction ("…Then tell Edith. Still to do: look at the meat… Still to do: roast 4 pieces of meat. Optional: …"). Board quests use a `[ ] / [x]` list. The same list for authored stages would read faster. |
| 11 | UX: mobile map labels | minor | ❓ user | review-ui `mobile-map-filled`. | [mobile-map-fits](assets/018/mobile-map-fits.jpg) | The canvas is now ~260 px on the phone viewport and the labels are drawn at a fixed canvas font. "Heatherby ?" is about 6 px tall on screen and hard to read. The settlement list beside the map compensates. |
| 12 | UX: docked build panel | minor | ✅ | review-build / review-ui `desktop-build-*`: open the building panel on desktop. | [build-ghost-green](assets/018/build-ghost-green.jpg) | The new `dock` position (`left-2 top-2`) covers the status bars (Health… Hydration) and the weapon/money chips, and its title overlaps them. Moving it below the status block (or to the right) keeps the HUD visible while placing. |
| 13 | Gameplay: Q03/Q07 premise | minor | 🟡 | review-quests Q03 with a household that has no elder (cast without `joan`). | [q03-old-woman-journal](assets/018/q03-old-woman-journal.jpg) | The `fallbackName: 'the old woman'` keeps the story about "the beam over **the old woman's room**", "Listen to… the old woman in her room", "the room goes back to the old woman", and Q07 counts "Edmund, the old woman, Peter…". This household has no old woman. Either require the elder for Q03 (and pick a household that has one) or reword it for a generic room or child. |
| 14 | UX: board quest objectives | minor | ✅ | Notice board, rats quest just posted (probe A). | [notice-board-grouped](assets/018/notice-board-grouped.jpg) | "[ ] Rats eliminated: 0/3" and "[ ] Rats of the nest left: **4**" are shown together. Two counters that disagree (3 needed, 4 left) are confusing. Showing "left" only after the player's kill count has stalled, or folding it into one line ("3 of 4 nest rats"), would be clearer. |
| 15 | Text: grammar and pronouns | minor | ✅ | Any NPC dialog; the log after an authored-quest offer. | [g03-hazel-dialog-article](assets/018/g03-hazel-dialog-article.jpg) | "I've been hoping to get **iron helm**." / "…to get **apple**." (missing article or plural). "Edith Sawyer has something on **their** mind." (`questEngine.ts:74`), although pronoun tokens now exist and the NPC's sex is known. Outside the fix range except the pronoun line; noted for the glossary/text pass. |
| 16 | Docs: triage reference | — | ✅ | `docs/reviews/2026-10-03--016--app-review-round-1.md`, Triage table. | — | Rows 1, 2, 4, 5 and 17 cite fix commit `1347aee`, which no branch contains. The merged commit on main is `b53a4f0`. |

### Smoke of neighbouring areas (no new findings)

- **Start/needs:** idle rates match round 1 (hunger 3.35, thirst 5.0, vigor 2.5, social 2.8 per game hour). Well thirst 40 → 85, bread +25.
- **Combat:** wolf with the club: 9 hits / 14 swings, player 100 → 38.6 HP and bleeding. Boar: 8 hits, player down to 42.7 HP. Bow: wolf 3 hits, boar 6. Knock-out: 3 s down, 120 s of protection. Bandage +15 HP. Herbalist 15 c, +55 HP. Unchanged; balance stays ❓ user (016 #6).
- **Build:** campfire 0.24 h, hearth 0.48 h, shed 1.9 h + 3.7 h, torch 5 h of burn. Failure texts unchanged and clear.
- **Quests, money conservation:** world money is 3985 before and after every authored quest. Rewards come from the stated sources: Q03 10 c from Edmund's purse, Q07 a torch from Nicholas's store, G03 15 c from the treasury, G01 10 c to Piers and 25 c back from Peter's purse.
- **Frames:** no new artifacts in settlement noon, dusk and night, snow, rain, the forest edge or the fire at night. Camera clipping into roofs and walls (016 #9, deferred) still shows in the inn, warehouse and repair shots.
- **Language:** no non-English hits in `ui-checks.json` and no Polish text in any screenshot.

### Not checked

- FPS/GPU and popping in motion (SwiftShader, single frames).
- Real touch gestures (panels were opened by taps on test ids).
- Q03/Q07/G03/G01 branches other than the main path; quest timeouts.
- Save/load during a quest or with the build ghost open.
- Keyboard-only navigation of the new Take 1 / All and Put 1 / All buttons.

## Summary for triage

One confirmed **major**: #1, the flat Honesty −1 on every "Take 1" click, which the 016 #3 fix made the default path. So the loop does not end at this round. 016 #7 (smith order price) is marked as fixed but has no change (#4). Every other round-1 fix holds in the running app. The new findings are minor or ❓ user.

## Triage (session 14)

Round 2 result: the one major (#1 Honesty per take) was already found by code review 017 #3 and fixed (D-ECON-8, Honesty scales with the value taken). 016 #7 (smith price): **kept on purpose**, recorded as D-ECON-7 (the triage row now says so).

| # | Verdict | Action |
|---|---|---|
| 1 | fixed | `warehouseTakeCost` honesty = 0.5 × helpfulness cost (`review016u.test.ts`) |
| 2 | fixed | Q07 text "{lucy}'s table"; name-scan test lists Hewers/Sawyers |
| 3 | fixed | list keys include the quantity (StoragePanel, InventoryPanel) |
| 5 | fixed | toast copy above the panels (`ToastLine overlay`); storage moves write to the message log (test) |
| 8 | fixed | notice board hides unknown settlements (review 017 #6); the message-log leak of settlement names on the board itself is gone with it |
| 14 | fixed | objective reads "Rats you killed: 0/3" next to "Rats of the nest left: 4" |
| 15 | fixed | `withArticle` for wishes, quest offer message uses his/her/their (test) |
| 16 | fixed | docs: triage rows cite `b53a4f0` |
| 4, 6, 7, 12, 13 | open, minor | 6 = SwiftShader vegetation timing after teleports (🟡, not reproducible on a fresh session); 7 = campfire site hidden behind the player after "Mark site" (camera, `combat--001`/`render--003`); 12 = docked build panel covers the status bars; 13 = "the old woman" fallback when no elder is cast |
| 9, 10, 11 | ❓ user | absent cast in authored scenes; Q07 journal as checklist; mobile map labels ~6 px |

Round 2 stops here (no open blocker/major). Round 3 not needed.
