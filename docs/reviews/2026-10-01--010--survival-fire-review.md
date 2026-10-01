# Survival fire review (survival--001 steps 2–4)

- **Date:** 2026-10-01
- **Analysed commit:** `eddcf09` (diff `5fb9dfd..eddcf09`; the later merge is out of scope)
- **Scope:** plan `docs/plans/survival--001--fire-fuel-torches-waterskins.md`, FEATURES FIRE-01/02/03, DECISIONS D-FIRE-1, D-SAVE-7, PERF-01
- **Reviewer:** independent code review (static trace, Opus; no code changed)
- **Legend:** ✅ confirmed by code trace · 🟡 assumption / likely · ❓ open question

## Verdict

The core model is sound: fuel is calendar time, burn-down sits inside the existing 5 s `ecology` loop (no per-tick work, PERF-01 OK), fire/trace code imports nothing from render/ui (layering OK), the save bump is clean (`migrate` rejects every older format with `SaveError`, `readSave` keeps it a `SaveError`), and the guard/fallback reservation works because `planNpc` calls `plan()` only for the chosen goal and a `null` plan gets a 30 s cooldown (no flapping). No new map elements were added, so fog of war is not affected.

The real problems are at the **ownership boundaries**: player hearths and settlement hearths are mixed up in both directions. There is also a torch-durability **sink** caused by stack merging, and a sleep/rest interaction that the new burn-out breaks.

## Findings

### 1. A player-built hearth near a settlement is fed by the guard from the warehouse — High ✅
- **Where:** `src/game/sim/build.ts:44` (`settlementId = settlementAt(x, z, 60)`), `build.ts:123` (`hearth = true`, `fuel = 0`), `src/game/sim/npc/duties.ts:106` (`settlementBuildings(sid, 'campfire').find(b => b.hearth && fuel < belowH …)`).
- **Scenario:** The player builds a stone hearth within 60 m of a settlement. It gets the settlement's id and starts with `fuel 0 < tendBelowH`. The guard (and the `tend_fire` fallback for every adult below 2 h) reserves it, takes warehouse branches and logs, and `npcFeedFire` **lights** it. N hearths mean N fires to tend, so the settlement's stores feed the player's private fires. Then `dismantleHearth` still returns 4 stones.
- **Why it matters:** This breaks conservation. The flow has a source (the settlement's stores) but the benefit goes to the player, and the player can also starve the settlement's own fire.
- **Repro:** In a test, call `placeSite(sim, 'hearth', wh.x + 20, wh.z)` and complete the build, then `run(sim, 600)`. Expect the player hearth to stay `lit: false` and the warehouse branches to stay unchanged. Today the hearth gets lit.
- **Fix direction:** Filter `owner === 'settlement'` (or `!playerBuilt`) in `feedFirePlan` and in the `goals.ts:168` fallback.

### 2. The player can dismantle a settlement hearth for free stones — Medium ✅
- **Where:** `src/game/sim/interact.ts:170`, `src/game/sim/fire.ts:99` (no owner check).
- **Scenario:** The warehouse runs out of fuel, so the settlement hearth goes cold (the intended FIRE-02 outcome). The player picks "Dismantle the hearth". The player gets 4 stones that were never paid for (generated hearths have no material source), and the settlement loses its fire and its social gathering point (`goals.ts:151`) for good. Nothing rebuilds it and there is no reputation consequence.
- **Repro:** Use the "unstocked fire goes out" test setup, then call `runOption(sim, {type:'building', id: fire.id}, 'dismantle_hearth')`. Today it returns OK and the building is gone.
- **Fix direction:** Allow dismantling only when `owner === 'player'`, or count it as theft through the reputation system.

### 3. Picking up a used torch drains every torch in the pack stack — Medium ✅
- **Where:** `src/game/sim/fire.ts:119` (`restoreTorchDur`), `src/game/sim/inventory.ts:31` (`addItem` merge: `ex.dur = Math.min(ex.dur, stack.dur)`); torch is `stack: true, durability: 60` (`data/items.ts:182`).
- **Scenario:** The player has the starting kit (2 torches in one stack). They plant one, burn it for 4.5 h and pick it up. Its `dur` becomes 6, it merges into the stack holding the remaining fresh torch, and the stack's `dur` becomes 6. A full 5 h torch is lost. It also happens the other way round: picking up a fresh planted torch while carrying a worn stack makes the fresh one worn too. D-FIRE-1(f) prevents refills but creates an unearned **sink**. (A related open question: `Math.max(1, …)` turns any spent-but-unlit torch into a 0.08 h stub.)
- **Repro:** Give the player `torch ×2`, plant one, set `g.burnH = 0.5`, then `pickup`. Then `torchBurnH(stack)` is about 0.5 for both torches.
- **Fix direction:** Make `canMerge` compare `dur` for items with durability, or keep a picked-up worn torch as its own stack.

### 4. Sleeping or resting "by the campfire" outlasts a plain campfire — Medium ✅
- **Where:** `src/game/sim/player.ts:67` (`sleepComfort` reads `fire` once, when sleep starts), `src/game/sim/interact.ts:293` (`camp_sleep`) and `:448` (`rest`, accel 20), `src/game/sim/fire.ts` `removeBurntOut`.
- **Scenario:** A new campfire holds 2.1 h of fuel. "Sleep by the campfire" (about 8 h) keeps the tent+fire comfort for the whole night, but the fire is removed after 2.1 h. That ends the predator deterrent (`fauna/perception.ts:26`) for the rest of the night. "Rest by the fire" (20× speed-up) burns it out in about 16 s real time, and the rest keeps going with no fire. The option is offered with no fuel check or warning.
- **Repro:** Build a campfire, run `camp_sleep`, run 8 calendar hours. The building is gone after about 2.1 h, `fireNear` is null, and comfort is still the fire-boosted value.
- **Fix direction:** Show the hours left on the sleep/rest option, warn when fuel is below the sleep length, or re-check the fire in the sleep tick.

### 5. A hearth cannot be put out by the player — Low ✅
- **Where:** `src/game/sim/interact.ts:161-171` (campfire options: no `douse`), `fire.ts:101` ("Put the fire out first").
- **Scenario:** The dismantle refusal tells the player to put the fire out, but no option does that. The player has to wait for up to 24 h of fuel to burn. The test even sets `b.lit = false` by hand (`survival.test.ts`, FIRE-02 dismantle).
- **Repro:** Light a hearth, then call `targetOptions`. There is no extinguish option.

### 6. Feeding fails when the fire is already full, and that blocks all of the guard's duties — Low ✅
- **Where:** `src/game/sim/fire.ts:68` (`npcFeedFire` returns `r.used > 0`), `src/game/sim/npc/works.ts:196`, `src/game/sim/npc/ai.ts` `failGoal` (60 s cooldown on the whole `work` goal).
- **Scenario:** The player tops up the hearth while the guard is walking to it. `feed_fire` uses 0 items and returns false, so `failGoal` puts a 60 s cooldown on `work`. The guard skips lighting the torch posts for that minute. The fire state is fine, so this should count as success.
- **Repro:** Get `feedFirePlan(guard)`, set `fire.fuel = 24`, run until the guard reaches the `feed_fire` step, then check `ai.cooldowns.work > now`.

### 7. Can the settlement fire last more than a few days? — Medium 🟡
- **Where:** `src/game/sim/newGame.ts:89` (warehouse starts with 20 branches + 6 logs ≈ 29 h of fuel), `src/game/sim/npc/duties.ts:225` (chores gather branches only until the house holds 15), `src/game/sim/npc/works.ts:129` (`pickup_surplus` keeps 15 branches and 8 logs).
- **Scenario:** A hearth burns 24 h of fuel per day, which is about 34 branches. Branches reach the warehouse only above the household keep-thresholds, so inflow is probably close to 0. Woodcutter logs would be the only real source. Starting stock plus the 12 h start fuel lasts about 1.7 days. After that the settlement fires may go out everywhere, and the fire would also compete with warehouse repairs that use the same branches (`actions.ts:387`). The tests run only 600–900 gameplay s.
- **Repro / missing test:** Run 3–5 calendar days with `playerFarAway` and assert that each settlement hearth is lit for at least X% of the time and that the warehouse has branches left for repair. Record the result in `bench:sim` long-run.

### 8. The "lost campfire" in e2e step 18b is probably the 2.1 h burn-out — Low 🟡
- **Where:** `scripts/e2e/acceptance.mjs` step 18b. The plan's result section says it was "unexplained".
- **Scenario:** A plain campfire lasts 2.1 calendar h, which is 315 gameplay s, or about 16 s of gameplay at 20× acceleration (`ACCEL.longWork`, rest/sleep). If the build activity or `finishActivity` runs accelerated and unpaused, the fire is removed before the check reads it. That is a real cause, not flakiness: the same reason step 9 now forces `fuel = 10`.
- **Repro:** Log `sim.state.time.cal` between `place-campfire` and the `fire0` read. If more than 2.1 h passed, the fire is gone and an ash trace sits at its position.

### 9. Visual parts of the plan are missing (render hand-off) — Low ✅
- **Where:** `src/game/render/dynamics.ts:119` (ground fires are drawn at +0.1 m). Nothing in render or ui reads `planted`, `burnH`, `hearth`, `fireLevel` or traces.
- **Scenario:** A planted torch is drawn lying flat, like a dropped one (plan step 4 says upright at ~1.2 m). Ash is never visible (traces are not rendered at all), but FEATURES FIRE-01 and the plan's e2e line say "ash appears". A plain campfire and a stone hearth look identical. FIRE-01/03 evidence claims more than the player can see. Either mark these as deferred to `render--001` in FEATURES, or add them.

### 10. Test gaps — ❓
There are no tests for findings 1–4, 6 and 7. Also missing:
- a planted torch that is lit through "fire next to it" with no flint (`canLightTorch`);
- `runOption('light_planted')` called while the option is disabled (`runOption` does not re-check `enabled`, so a non-UI caller can light without a tool);
- a pickup of a lit thrown torch (non-planted: no "Extinguish" option, so it goes back to the pack while lit, and its remaining time is restored);
- 'add_fuel' message when only logs are carried and a log would overflow the cap ("You have no branches or logs" is wrong).

Also: the `build()` helper in `survival.test.ts` contains a no-op line (`addItem(… newStack(m.item, 0))`) and a flint grant that should be removed or documented.

## Not issues (checked)
- PERF-01: `canLightTorch`, `roastSpot`, `fireNear` and `sleepComfort` use spatial queries. Burn-down and torch burn reuse the existing `ecology` loops. `removeBurntOut` rebuilds the index only when something burned out.
- Save: `fuel`, `hearth`, `tender`, `burnH`, `planted` and `Trace.kind` are plain fields in the snapshot. `SAVE_VERSION` 8 is enforced, and v0/v1/v7 are rejected (`save.test.ts`).
- Reservation leak: `tender` expires after 1 calendar hour (150 gameplay s) if the plan is interrupted. That is acceptable.
- Ash vs blood: `bleedAt` skips ash when merging, and `smellTrace` ignores ash. The trace cap evicts the oldest trace of either kind.

## Triage (session 7, Sonnet)

| # | Result | Regression test (`survival.test.ts`, "review 010 triage") |
|---|---|---|
| 1 | ✅ confirmed, **fixed** — only `owner === 'settlement'` hearths are tended/fed (`isSettlementHearth`) | player hearth near a settlement is not fed |
| 2 | ✅ confirmed, **fixed** — dismantling is player-owned hearths only | settlement hearth cannot be dismantled |
| 3 | ✅ confirmed, **fixed** — stacks with different durability no longer merge (`canMerge`) | worn torch pickup keeps fresh torches fresh |
| 4 | ✅ confirmed, **mitigated** — rest/sleep options show the hours of fuel; the player gets "The campfire has burnt out." when a fire within 40 m dies; comfort is still read once at the start (accepted simplification) | burn-out message |
| 5 | ✅ confirmed, **fixed** — "Put out the fire" option | douse option |
| 6 | ✅ confirmed, **fixed** — a topped-up fire is a success for the NPC | `npcFeedFire` on a full fire |
| 7 | 🟡 **not confirmed** — over 3 calendar days (player far away) the settlement hearths were lit 100% of the time (woodcutter/household surplus keeps the warehouse supplied); kept as a guard test (> 60%). Longer horizons remain unmeasured | 3-day lit-share test |
| 8 | 🟡 plausible cause of the one lost campfire in e2e step 18b (2.1 h burn-out under acceleration); not reproduced; the step throws the sim state if it recurs | — |
| 9 | ✅ confirmed — render hand-off is a known gap: flat planted torch, no ash decal, hearth looks like a campfire; FEATURES evidence now says "sim side; visuals in `render--001` steps 1/8" | — |
| 10 | partly fixed (no-op line removed from the `build()` helper, "cannot take any more" message); disabled-option re-check in `runOption` and lit thrown-torch pickup left as is (UI only offers enabled options) | — |

Counts: 10 findings — 8 confirmed (6 fixed, 1 mitigated, 1 deferred to `render--001`), 2 unconfirmed/plausible, 0 rejected outright.
