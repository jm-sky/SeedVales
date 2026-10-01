# Diag: trustworthy render benchmarks (startup, transitions, lifecycle, real travel)

**Status:** planned  
**Domain:** diag  
**Sub domains:** bench, render, lifecycle  
**Roadmap:** alongside wave 4 (needed before `render--003` decisions); from [review 009](../reviews/2026-10-01--009--render-performance-and-measurement-review.md)  
**Created:** 2026-10-01  
**Finished:** —

FEATURES: `PERF-02`. Decisions: D-PERF-2, D-PERF-3.

Already done in session 4 (render--002 step 0 + review 009 triage): ≥ 60 frames per static scene, sample counts printed, render baseline files + `render.prep` p95 verdict (ok / inconclusive / regression), scene reset (calendar, weather) and failing locators, active point lights reported, console errors fail the run, nearest-rank percentiles and exact frame-pacing shares (F-10, F-11, part of F-09, F-06 reporting).

## Steps (each a separate result class — never mixed into the steady-state gate)

1. **Startup (F-02):** fresh browser context × 3 per quality: time from "New game" to the first HUD frame, first-frame `render.cpu`/`render.prep`, chunks built in the first frame, vegetation rebuild, actor creation. Report max and wall time.
2. **Quality transitions (F-08):** after warm-up, medium→high→low→medium × 5; capture the switch frame + next 3 s (max/p95), programs/geometries/textures before/after.
3. **Diagnostics overhead (F-12):** same scene alternating `perf.enabled` on/off × 3 (frame CPU only); report the overhead as its own number.
4. **Lifecycle/memory (F-13, F-05 verification):** 10 × new game → 30 s → quit, 3 × save/load; post-GC heap points where `gc()` is exposed (`--js-flags=--expose-gc`), renderer.info geometries/textures/programs, `window.__sv` cleared after unmount. Expect a plateau after the asset cache warms.
5. **Real travel (F-15):** walk/run/cart along a fixed route driven by player input through `Game.frame()` (not position writes), ≥ 20 half-chunk crossings; compare with the synthetic march.
6. **Scene isolation (F-09 rest):** optional fresh context per scene when step 1 exists (reuses its code); assert an installed-state snapshot (player/camera, hour, weather, lit fires, counts) per scene.
7. **A/B metrics (F-14 rest):** `ab.mjs` sidecar table per variant (`render.prep`, draw calls, programs, textures, lights) and a state manifest per frame.

## Exit

Each step produces its own section in `test-results/bench/` and PERF.md; no budget/baseline changed to absorb a result.

## Wynik

*(not started)*
