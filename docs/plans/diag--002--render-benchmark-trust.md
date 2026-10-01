# Diag: trustworthy render benchmarks (startup, transitions, lifecycle, real travel)

**Status:** in_progress  
**Model:** sonnet — benchmark tooling with a clear spec; Opus only if a result is contradictory or a gate decision is needed  
**Domain:** diag  
**Sub domains:** bench, render, lifecycle  
**Roadmap:** side track in tiers (D-PERF-4) — tier A before `render--002` step 3 / `render--001` step 6, tier B before `render--003` leaves draft, tier C conditional; from [review 009](../reviews/2026-10-01--009--render-performance-and-measurement-review.md)  
**Created:** 2026-10-01  
**Finished:** —

FEATURES: `PERF-02`. Decisions: D-PERF-2, D-PERF-3, D-PERF-4.

Already done in session 4 (render--002 step 0 + review 009 triage): ≥ 60 frames per static scene, sample counts printed, render baseline files + `render.prep` p95 verdict (ok / inconclusive / regression), scene reset (calendar, weather) and failing locators, active point lights reported, console errors fail the run, nearest-rank percentiles and exact frame-pacing shares (F-10, F-11, part of F-09, F-06 reporting).

## Tiers and order (roadmap update 2026-10-01)

The steps below keep their numbers; they are executed by tier, not in numeric order.

| Tier | Steps | Trigger | Reason |
|---|---|---|---|
| A | 1 startup, 5 real travel | step 1 **before `render--002` step 3** (terrain changes chunk build); step 5 **before `render--001` step 6** (wind) / step 9 (ground clumps) | Upcoming work adds cost at startup and while streaming; the steady-state gate cannot see either (F-01 was found in streaming). |
| B | 2 transitions, 3 diagnostics overhead, 4 lifecycle/memory | before `render--003` leaves `draft` | Inputs for adaptive resolution / quality switching and long-session trust; no earlier step depends on them. |
| C | 6 scene isolation, 7 A/B metrics | only if a scene verdict is `inconclusive` twice or contamination is suspected | Largely covered by session-4 fixes (scene reset, failing locators, console errors fail the run). Otherwise "not needed". |

Step 1 also records the share of startup spent on asset download/decode (input for `render--004` step 1). Step 5 reuses the acceptance harness input helpers (pin targets by id) rather than a new driver.

## Steps (each a separate result class — never mixed into the steady-state gate)

1. **Startup (F-02):** fresh browser context × 3 per quality: time from "New game" to the first HUD frame, first-frame `render.cpu`/`render.prep`, chunks built in the first frame, vegetation rebuild, actor creation. Report max and wall time.
2. **Quality transitions (F-08):** after warm-up, medium→high→low→medium × 5; capture the switch frame + next 3 s (max/p95), programs/geometries/textures before/after.
3. **Diagnostics overhead (F-12):** same scene alternating `perf.enabled` on/off × 3 (frame CPU only); report the overhead as its own number.
4. **Lifecycle/memory (F-13, F-05 verification):** 10 × new game → 30 s → quit, 3 × save/load; post-GC heap points where `gc()` is exposed (`--js-flags=--expose-gc`), renderer.info geometries/textures/programs, `window.__sv` cleared after unmount. Expect a plateau after the asset cache warms.
5. **Real travel (F-15):** walk/run/cart along a fixed route driven by player input through `Game.frame()` (not position writes), ≥ 20 half-chunk crossings; compare with the synthetic march.
6. **Scene isolation (F-09 rest):** optional fresh context per scene when step 1 exists (reuses its code); assert an installed-state snapshot (player/camera, hour, weather, lit fires, counts) per scene.
7. **A/B metrics (F-14 rest):** `ab.mjs` sidecar table per variant (`render.prep`, draw calls, programs, textures, lights) and a state manifest per frame.

## Exit

Tiers A and B done; tier C done or closed as "not needed". Each step produces its own section in `test-results/bench/` and PERF.md; no budget/baseline changed to absorb a result.

## Wynik

**Step 1 (startup) done — session 7, 2026-10-01 (Sonnet):** `scripts/bench/startup-bench.mjs` (`pnpm bench:startup`), results in `test-results/bench/startup-<quality>.json` and a table in PERF.md "Startup" (cloud-only numbers, labelled). Steps 2–7 not started (tier B/C).
