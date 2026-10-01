# Kick-off: session 10 (WSL, user's machine, real GPU) — measure and look at the nature pass so far

*Written 2026-10-01 by the session-9 Sonnet run (the session-9 kick-off is in git history, `9802676`).*

You continue work on SeedVales (Vue 3 + TypeScript + Three.js, pnpm). State: v1 complete; waves 1–3, 4s, 4a done. Session 9 added **`world--002` mid-scale terrain relief** (`GEN_VERSION` 9, WORLD-12 `implemented_unverified`), the **shared wind module** and a **first grass pass** (`render--007` steps 1–2, RENDER-06 `implemented_unverified`; flag `sv-visual {"grass":false}` = old look). Formats: `SAVE_VERSION` 8, `GEN_VERSION` 9. **Everything so far was measured only in the cloud container (software rendering, no GPU numbers).** This session runs on the user's WSL machine, where GPU numbers and real-eyes looks exist, and the previous kick-off's ❓ user items are waiting there. Model: Sonnet for the measuring/tuning, **Opus** for the look keep/drop calls (batch them at the end or leave them as notes in the plans' "Result").

**Language: English everywhere (D-LANG-1).** No save migrations before the first release (D-SAVE-7).

## 1. Start (brief)

1. Read `CLAUDE.md`, `docs/state/PROGRESS.md` ("Teraz", "Session 9"), `docs/plans/world--002--terrain-relief.md` ("Result"), `docs/plans/render--007--nature-pass.md` ("Result", budgets table), `docs/plans/render--002--visual-foundation-and-render-metrics.md` ("Exit gate"), `docs/design/DECISIONS.md` (D-REN-13/14, D-WORLD-10, D-PERF-2/3/5), `docs/research/refs/` (the two reference screenshots).
2. `git status`, `git log --oneline | head -20`, merge `main`; a new review on main is triaged first (skill `wave-review` §3).
3. `pnpm install --frozen-lockfile`; verify: `pnpm check` (230+ tests), `pnpm e2e:run` (3/3 · 32/32 · 11/11, 0 console errors). Anything red is task one. Known open: acceptance 8b/18b failed **once** in the cloud (settlement-2 rat nest, a rat 147 m away — PROGRESS session 9); if it recurs here, log the rat's position/state in the 8b kill loop and find the cause.

## 2. Work order

1. **4a exit gate on WSL (❓ user from session 8):** `pnpm bench:render low` and `medium` against the committed baselines (render--002 "Exit gate", D-PERF-3). Note: the nature pass changes the scenes (relief, grass), so run the gate **twice**: with `sv-visual {"grass":false}` on the new commit (terrain/relief effect only) and with grass on. Write the numbers into PERF.md; an unsettled scene is not a result.
2. **Grass cost on a real GPU (render--007 step 2):** fps and `render.prep` p95 per profile (low/medium/high), grass on/off, standing in a meadow and walking (`bench:render` march). Tune `GRASS_RINGS` (rings, `k`) and `CLUMP_DENSITY` in `src/game/render/grassPlacement.ts` so low stays comfortable on the user's laptop (D-REN-14) and medium/high are as dense as they can afford — the user's feedback was "far too little grass", so do not thin the look without a measured need. Update the caps in `grassPlacement.test.ts` with the numbers.
3. **Look pass with real eyes (screenshots via `scripts/e2e/ab.mjs` / `tour.mjs`, or the game itself):** terrain relief (`world--002`; the A/B pairs are in `docs/state/frames/world--002/`), grass (`docs/state/frames/render--007/`). Collect concrete notes: relief amplitude too low/high, grass colour vs the ground tint (steppe is yellow, blades green — the terrain colour under grass is not tuned yet), blade shape, flowers/clover wanted?, ring edge visible while walking, wind amplitude. Apply the clear fixes (colours, amplitudes in `heightfield.ts` → `GEN_VERSION` 10 only if the generator changes, bump + the existing old-save test), leave real design choices as Opus notes.
4. **Pending WSL verifications from earlier sessions (user's list, PROGRESS ❓):** `render--005` character variants / `render--004` fauna class screenshots (`node scripts/e2e/tour.mjs`), `bench:render` landmark-estate, WORLD-10 sound listen (no headless ear) — only report/fix what shows up.
5. **If time remains (cloud-independent work):** `render--007` step 0 leftovers (`diag--002` step 5 real-input travel; frames `forest-edge`, `lake-shore`, `river-bank` in `ab.mjs`), then the **water shader** (step 4; every profile, planar reflection on high only) — it needs a real GPU to judge. **Trees/forest are deliberately not started:** the user wants them planned later from the reference screenshots (`docs/research/refs/`: leaf-card branch clusters with real branches, bark, long grass with flowers, light shafts) — if there is room, write that re-plan (a revised `render--007` step 3, with an asset/own-generation decision for Opus) instead of implementing.

After each item: skill `verify`, skill `handoff` (FEATURES evidence, plan "Result", PROGRESS), commit + push to `main`.

## 3. Rules

Standing rules: `CLAUDE.md` (layering — render may import sim, sim never imports render; save/`GEN_VERSION`; fog of war; no weakened tests/budgets/baselines; subagents only with `isolation: "worktree"` and no `git checkout/switch/reset/stash`; `pnpm e2e:run`). Benchmarks: WSL numbers compare only with WSL baselines (machine fingerprint, D-PERF-5). Do not end a turn with a plan or a "shall I continue?" question.

## 4. End of session

Skill `verify`, skill `handoff`; PROGRESS up to date (numbers, tuned values, Opus keep/drop notes, ❓ user items); commit + push to `main`; short report. Write the next kick-off here (a new dated section): Opus if look keep/drops are due (relief, grass, water), then Sonnet for `render--007` trees (re-planned) and water, `render--001` fire 1a/1b, English first names, `world--001` steps 2–3.

---

**Start message (paste, WSL session):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it. Start by verifying the state (merge main; a new review on main is triaged first), then work through §2 in order, starting with the 4a gate on WSL. Don't stop at a plan or a question about continuing. Finish with the next kick-off, then commit and push to `main`.
