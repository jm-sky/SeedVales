# Soak with event log and economy invariants (verify--001 steps 1 and 3)

**Date:** 2026-10-02 · `pnpm soak --days=10 --seeds=1337,7,42` · recorder `src/game/diag/soak.ts` · event log + ledger `src/game/sim/eventLog.ts` · legend ✅ confirmed · 🟡 assumption / proposal for Opus · ❓ open

## What was built

- **Event log** (`sim.enableEventLog()`, ring buffer 50 000, not saved, off by default: each hook is one `active` null check). Entries `{ id, cal, kind, actorId?, settlementId?, data }` for `goal_start` / `goal_end` (goal id, result done/preempted/fail + failing step), `produce` / `consume` (item, qty, source or sink), `move` (deposit/withdraw/caravan), `trade` (player trades, NPC food purchases, caravans), `money` (from → to, amount, reason), `death` (cause), `quest` (board quests: available/active/done/expired — authored quests: call `logEvent('quest', …)` from the quest engine), `stuck`.
- **Ledger** (counts only real sources and sinks; moves between inventories are not flows): per item `produced`, `consumed`, with attribution `produce:<item>:<source>` / `consume:<item>:<sink>`; money `moneyFlows` by reason + `minted`. The world stock is measured independently (`worldStock`: player, NPCs incl. dead, building stores, ground, parked and pushed carts, forge orders), so a missing hook appears as a residual `produced − consumed − Δstock`.
- Sources hooked: tree felling, rock mining/chunks, gathering, butchering, digging, field harvest, shearing, herb garden, household kitchen garden (abstracted production), smelting, forging (stock + player orders), drying, fletching, crafting, cooking (raw → cooked), hearth dismantling, building-site refund. Sinks: eating/medicine, spoilage (packs, stores, ground), rats, burnt-out ground torches, animals eating carrion, fire fuel, ammunition, construction materials, repair, den burning, terraforming, craft/forge/smelt/dry/fletch inputs, cooking.
- **Soak invariants** (named, `SOAK_LIMITS` in `soak.ts`): the old ones (alive, eating, drinking, sleeping, not-stuck) plus `conservation`, `economy`, `fire`, `perf`, `working-output`.

## Run parameters

3 seeds × 10 game days, player idle next to the first settlement, 10 s sample, 0.5 s frame, event log ON, forced GC before each heap reading. ~35–65 s per seed.

## Per-day summary (seed 1337; all three seeds are in `test-results/soak/soak-latest.md`, not committed)

Output units per day per profession (work acts count one each, see `PROFESSION_OUTPUT`):

| day | alive | deaths | ate | drank | slept | treasury | hearth lit (day) | heap MB | blacksmith | farmer | guard | herbalist | hunter | shepherd | trader | woodcutter |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 68 | 0 | 100% | 100% | 100% | 1092 | 100% | 19 | 12 | 220 | 148 | 38 | 198 | 44 | 0 | 235 |
| 1 | 68 | 0 | 100% | 100% | 100% | 1093 | 100% | 21 | 0 | 239 | 129 | 28 | 128 | 42 | 1 | 232 |
| 2 | 68 | 0 | 100% | 100% | 100% | 1054 | 100% | 23 | 0 | 319 | 142 | 30 | 219 | 38 | 2 | 212 |
| 3 | 68 | 0 | 100% | 100% | 100% | 1096 | 100% | 25 | 0 | 219 | 116 | 26 | 164 | 25 | 0 | 163 |
| 4 | 68 | 0 | 100% | 100% | 100% | 1137 | 100% | 27 | 0 | 507 | 125 | 26 | 240 | 37 | 0 | 235 |
| 5 | 68 | 0 | 100% | 100% | 99% | 1181 | 97% | 27 | 0 | 216 | 91 | 26 | 102 | 14 | 0 | 151 |
| 6 | 68 | 0 | 100% | 100% | 100% | 1226 | 100% | 28 | 0 | 223 | 136 | 28 | 126 | 29 | 0 | 156 |
| 7 | 68 | 0 | 100% | 100% | 99% | 1268 | 100% | 28 | 0 | 435 | 123 | 32 | 60 | 40 | 0 | 165 |
| 8 | 68 | 0 | 100% | 100% | 100% | 1312 | 100% | 28 | 0 | 316 | 129 | 24 | 18 | 42 | 0 | 190 |
| 9 | 68 | 0 | 100% | 100% | 100% | 1357 | 100% | 28 | 0 | 546 | 125 | 26 | 18 | 43 | 0 | 222 |

| seed | NPCs | deaths | treasury start → end | money (start → end, minted) | ledger | hearth lit by day (min over settlements) | sim.tick median / p95 / p99 / max (ms) | heap growth after day 0 | days with output (farmer · wood · hunter · guard · herb · shep · trader · smith) |
|---|---:|---:|---|---|---|---|---|---:|---|
| 1337 | 68 | 0 | 1092 → 1357 (sum, start 1050) | 3985 → 3985 (0) | all items balanced | 100 / 100 / 100 % | 0.42 / 0.92 / 1.36 / 94 | 9 MB | 100 · 100 · 100 · 100 · 100 · 100 · 20 · 10 % |
| 7 | 74 | 0 | 1088 → 1334 | 4032 → 4032 (0) | all items balanced | 100 / 100 / 100 % | 0.70 / 2.03 / 3.67 / 66 | 9 MB | 100 · 100 · 80 · 100 · 100 · 100 · 40 · 10 % |
| 42 | 75 → 74 | 1 (combat, hunter, day 2, info) | 1084 → 1299 | 3889 → 3889 (0) | all items balanced | 100 / 100 / 100 % | 0.46 / 1.05 / 1.66 / 69 | 8 MB | 100 · 100 · 90 · 100 · 100 · 100 · 30 · 10 % |

## Invariants and results

| Invariant | Result |
|---|---|
| ✅ alive (no hunger/thirst death) | pass on all 3 seeds (the seed 42 combat death is info as before) |
| ✅ eating / drinking / sleeping ≥ 80 % per day | pass; 🟡 seed 7 eating share sags to 84 / 84 / 86 % on days 7–9 (97–100 % before) — above the threshold but a trend, probably the same cause as finding 1 (trips and needs) |
| ✅ not stuck | pass |
| ✅ **conservation** (items): produced − consumed − Δstock = 0, tolerance 0 | pass for every item on all 3 seeds, checked at every day close. Each hook site was verified by this check: the first run was clean, and `ECON-01: an unlogged source shows up as a residual` proves the check can fail |
| ✅ **conservation** (money): total constant, only coin finds mint | pass (no coins found in any run; money flows by reason: tax, quest, caravan fee, food purchases) |
| ✅ economy: treasury ≥ 0, ≤ 10× start, not at 0 for 3 days | pass (the sum grows ~+30 per day from taxes, 1050 → ~1300–1360; no outflow except quest rewards/caravan fees) |
| ✅ economy: food (bread/grain) and fuel (log/branch) present in some store of every settlement, never 0 for 2 day-closes in a row | pass |
| ✅ economy: prices of trader goods inside the formula envelope, resale never pays more than purchase | pass |
| ✅ fire: settlement hearth lit ≥ 90 % of day-time samples per settlement | pass, 100 % (the worst single day was 97 %, seed 1337 day 5) |
| ✅ perf: `sim.tick` p95 ≤ 4 ms (D-PERF) over the whole run | pass: 0.92 / 2.03 / 1.05 ms (log ON, 0.5 s step = 5 sub-steps, same convention as `bench:sim` `long-run-5-days`) |
| ✅ perf: heap growth after day 0 ≤ 40 MB | pass: 9 / 9 / 8 MB (plateau from day 4; the 50 000-entry ring is already full by then) |
| ❓ working-output (see the next section) | seed 1337 fails for traders, seeds 7 and 42 pass |

## Violations

### 1. `working-output` — trader, seed 1337: no output on days 3–8 (window of 6 days) — 🟡 bug: caravans never finish the second trip

Evidence (same seed re-run with a 200 000-entry ring so the ids are reachable; ids are sequence numbers and deterministic): the three MD/LG traders (#70, #128, #133) complete exactly one caravan trade each (events #12688, #20169, #20302, calendar day ~3–4). The second trip starts at calendar day 8 and never reaches the destination warehouse in the next three days: trader #70 alternates `Caravan to Maplewick` ↔ `Sheltering from the rain` (#59469 … #62836: every 20–30 calendar minutes the caravan goal is preempted by `shelter`, the NPC walks back to the shelter, then restarts the trip), ↔ `Buying food` / `Going for a meal` (#43337, #49081, #71414: the meal need pulls the trader away from the road; 🟡 the reason it does not eat from its provisions was not examined; `eat#1:eat_store` fails in #48796). With positions sampled every 12 game hours, outbound traders are 940 → 27 → 170 m from home instead of 4 km away. After `TRIP_MAX_CAL` (2 days) outbound the trip is turned into `returning`, the trader goes home, and the next departure is two days later. Proposal: **bug** (NPC-life defect, not a metric artefact): a long-duration `work` goal should not be preempted by shelter/eat when the NPC carries provisions and a camp option exists, or the trip needs commitment/hysteresis. Not fixed here (non-trivial behaviour change, needs its own plan and a regression test, e.g. "a caravan completes ≥ 1 trade per 6 days in a 10-day soak"). The check stays red on seed 1337 until it is fixed; it is not loosened.

Seed 7 (4 of 10 days with output) and seed 42 (3 of 10) pass the 6-day window but show the same pattern (trader output only on days 1–3 and one more trip): 🟡 probably the same defect (not examined in detail).

### 2. Info (not violations)

- Blacksmith: output only on day 0 (12 units: the initial forging/smelting), then 0 for 9 days on every seed. Cause: `smith` stops when the store holds ≥ 6 tools (`SMITH_STOCK_CAP`) — nobody buys tools in a soak (no player), so the saturation is designed. 🟡 accepted: the check exempts the blacksmith from the day share **only while every living smith's store is at the cap** (note in the report). Opus: confirm that demand-capped output is acceptable, or add demand (NPC tool wear/purchase) — ❓.
- Seed 42: hunter #12 killed by a predator on day 2 (combat death, torso 86), as in review 012 finding 2 — info.
- `sim.tick` max 66–94 ms is the first frames (warm-up), p99 ≤ 3.7 ms.

## What was fixed

Nothing in gameplay. Soak/tooling only: `SMITH_TOOLS`, `SMITH_STOCK_CAP`, `smithStock` exported from `npc/works.ts` (same logic, now shared with the soak). Regression tests for the tooling: `src/game/sim/eventLog.test.ts` (8 tests: off by default, ring wrap, a known flow, spoilage sink, ledger balance over 10 game hours, an unlogged source gives a residual, money flows/mint, death cause), extended `diag/soak.test.ts`.

## Measurement notes

- Day boundaries: output is tallied per gameplay hour (`play / 3600`), identical to the recorder's days; the calendar day is offset by the start time (calendar day 2 ≈ soak day 0).
- The ring buffer (50 000) wraps within ~2 game days; aggregates (ledger, per-day output) do not depend on it. Event ids in violations are only reachable when the run is repeated with a bigger ring (`sim.enableEventLog(200000)`).
- Heap numbers are `heapUsed` after a forced GC (`scripts/soak/run.ts` injects the probe; the vitest variant does not measure the heap).

## Triage

| # | Finding | Status | Fix and test |
|---|---|---|---|
| 1 | `working-output` trader, seed 1337: second caravan trip never arrives | ✅ fixed (2026-10-02) | Root causes below. Fix: `npc/provisions.ts` (provisions packed moved-not-created; `CARAVAN_PROVISIONS` / `CARAVAN_RETURN_NUTRITION` / `CARAVAN_MIN_NUTRITION` in `calibration.ts`), `goals.ts` (no home meal on the road, no shelter for a departing/outbound caravan), `duties.ts` (departure only with provisions, `TRIP_MAX_CAL` 2 → 3 days, turn back when starving far from the goal). Tests: `caravan.test.ts` "ECON-01 caravan: every MD/LG trader completes >= 2 trades in 10 days, with rain and an empty household store" (failed first: 0 trades for #70 under rain) and "ECON-01 caravan: provisions move from the household store / warehouse into the pack (nothing created)". |
| 1b | seed 7 after the fix: hunter #13 starved on day 6 (`alive`) | ✅ fixed | Pre-existing weakness that the changed trajectory exposed (the unfixed code also has the hunter at hunger 0 / thirst 0 far from home at the same time): a hunter started a hare chase at hunger ~40, ~580 m from home, then could not get back to food in time. `HUNT_MIN_NEED` (50): no chase for game when hungry or thirsty (predator control unchanged). Test: `waterFail.test.ts` "a hungry or thirsty hunter does not start a chase for game". |

### Root causes of finding 1 (event log, seed 1337, traders #70 / #128 / #133)

1. **The pack is empty at the second departure.** `caravan_depart` packed at most 6 items from the *household store* only. A trader household has no field, so its store is usually empty; the first trip lived on bread that came from the destination warehouse, and the trader ate that bread at home (`eat_inv` has priority at home) so it left again with nothing (`food=` empty in the day-by-day trace, d6.5). Seed 1337 settlement warehouses held no bread at all; the food sits in farmer households.
2. **`eat` pulled the trader home.** With an empty pack, the `eat` goal planned "Going for a meal" (`eat_store`, fails: empty) or "Buying food" from a *home* seller, i.e. a walk of 1.5 km back from the road (d7.13 → d7.63: 1514 m → 34 m, hunger 16 → 0), and `shelter` did the same inside `homeRadius + 200` (`onTrip` was only true farther out). The trip was therefore not on the road for hours.
3. **`TRIP_MAX_CAL` of 2 days is too short for an LG route.** The route to Hollowgate is ~4.3 km; with the night camps a trader walks ~11 h a day, so even an undisturbed trip arrives at ~1.9–2.1 days (#128 and #133 were turned around 100–400 m before the warehouse in the test with rain).
4. Smaller: the return-leg provisions were 4 items from the destination warehouse only (often none) and the last-resort warehouse meal used the *home* warehouse when the trader was on the road (`settlementAt(...) ?? h.settlementId`).

### Before / after (days with output, `pnpm soak --days=10 --seeds=1337,7,42`)

| seed | trader before | trader after | violations after |
|---|---:|---:|---|
| 1337 | 20 % (fail: days 3–8 empty) | 50 % | 0 |
| 7 | 40 % | 40 % | 0 |
| 42 | 30 % | 60 % | 0 |

Traders now run one round trip per ~4–5 days (outbound 2 days incl. camps, back 2 days; departures on even days only) — output on 4–6 of 10 days is the design cadence of the caravan, not a defect. Not done (❓ for Opus): storms still do not make a caravan on the road shelter (as before); a trader household has no food production, so provisions depend on buying from farmers (`npc_buys_food` money flow, conservation unaffected: all food moves store → pack).
