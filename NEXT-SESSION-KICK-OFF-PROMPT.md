# Kick-off: session 9 (Sonnet) — nature pass: `world--002` terrain relief, `render--006` wind → grass → trees → water; then `render--001` fire

*Written 2026-10-01 by the session-8 Opus run (the previous Opus-only kick-off is in git history, `5ae03e3`).*

You continue work on SeedVales (Vue 3 + TypeScript + Three.js, pnpm). State at the end of session 8: v1 complete; waves 1–3 and 4s (`survival--001`) done; **4a `render--002` done** (terrain tint uniforms + smooth normals + ground detail are the default — D-REN-13; PBR pilot dropped; WSL gate numbers are a non-blocking user step); **the nature pass is your main job** (user decision after seeing the screenshots, D-REN-14 / D-WORLD-10): `world--002` (mid-scale terrain relief, `GEN_VERSION` 8 → 9), then `render--006` (wind, grass with LOD, real trees with leaf cards + impostors, water); `render--001` (fire 1a/1b, decals) follows it. Formats: `SAVE_VERSION` 8, `GEN_VERSION` 8. **This session runs on Sonnet (D-PLAN-7):** implement to the plan; leave look/keep-drop calls marked "opus" or "❓ user" as notes in the plan's "Result" and PROGRESS — do not block on them.

**Language: English everywhere (D-LANG-1).** No save migrations before the first release (D-SAVE-7): a format change bumps `SAVE_VERSION` and older saves are rejected.

## 1. Start (brief)

1. Read `CLAUDE.md`, `docs/state/PROGRESS.md` ("Teraz", "Session 8"), roadmap "Schedule (session 8)" in `docs/roadmap/v1-closure-and-appendix.md`, `docs/plans/world--002--terrain-relief.md`, `docs/plans/render--006--nature-pass.md`, `docs/plans/render--001--weather-variety-effects.md` (later), `docs/design/DECISIONS.md` (D-REN-5, D-REN-7, D-REN-10/11, D-REN-13, D-REN-14, D-WORLD-10, D-PERF-2/3/5), `src/game/world/gen/heightfield.ts`, `src/game/render/vegetation.ts`, `src/game/render/terrainChunks.ts`.
2. `git status`, `git log --oneline | head -20`, `git fetch origin main` and merge. A new review on main is triaged first (skill `wave-review` §3) — if it needs judgement calls, record them for Opus and fix only the clear bugs.
3. `pnpm install --frozen-lockfile` if there is no `node_modules`. Verify: `pnpm check` (expect 217+ tests), `pnpm e2e:run` (smoke 3/3, acceptance 32/32, mobile 11/11, 0 console errors). Anything red is task one — "flaky" is not a diagnosis.

## 2. Work order (all `sonnet`)

1. **`world--002` step 1 — exact first step:** take the "before" A/B frames on the current commit (`node scripts/e2e/ab.mjs medium 'before={}'` for seeds 1337, 42, 777 — copy the montages aside, the next run overwrites them), then add the hilliness region field and the 40–250 m relief terms to `src/game/world/gen/heightfield.ts`, with a test first (a lowland slope sample stays under the collision slope limit; flat meadows still exist — share of near-flat lowland cells above a floor; settlements/roads/landmarks still generated on 3 seeds). `GEN_VERSION` 8 → 9 + old-save rejection test. Then step 2 (walk calibration, `bench:sim`, `bench:startup` same container) and step 3 ("after" frames; leave the keep/drop for Opus).
2. **`render--006` step 0:** `diag--002` step 5 (real-input travel), the new A/B frames (`meadow-grass`, `forest-edge`, `lake-shore`, `river-bank`), reference run.
3. **`render--006` steps 1 → 2:** shared wind module, then grass (data masks, LOD rings, wind, season/snow, caps test). Cloud before/after per profile in the plan's "Result".
4. **`render--006` step 3:** 3a asset search and `build-trees.mjs` (leave the asset choice as an Opus keep/drop with montages if unsure), 3b leaf material, 3c rings + baked impostors.
5. **`render--006` step 4:** water shader on every profile, planar reflection on high only.
6. If the session still has room: `render--001` 1a (fire sources + light pool), English first-name pools (no format bump), `world--001` steps 2–3.

After each item: skill `verify`, skill `handoff` (FEATURES evidence, plan "Result", PROGRESS), commit + push to `main`.

## 3. Rules

Standing rules: `CLAUDE.md` (layering — render may import sim, sim never imports render; save/`GEN_VERSION`; fog of war; no weakened tests/budgets/baselines; subagents only with `isolation: "worktree"` and no `git checkout/switch/reset/stash`; `pnpm e2e:run`). Benchmarks in the cloud: only same-container before/after comparisons are valid (D-PERF-5); a `bench:render` scene marked `unsettled` is not a result. Do not end a turn with a plan or a "shall I continue?" question.

## 4. End of session

Skill `verify`, skill `handoff`; PROGRESS up to date (what was done, the Opus keep/drop items with the montage paths, ❓ user items); commit + push to `main`; short report. Write the next kick-off here (a new dated section): Opus when look keep/drops are due (terrain relief, grass, trees, water — they can be batched into one Opus session), otherwise Sonnet with the next steps from the roadmap schedule.

---

**Start message (paste, Sonnet session):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it. Start by verifying the state (merge main; a new review on main is triaged first), then work through §2 in order, starting with `world--002` step 1. Don't stop at a plan or a question about continuing. Finish with the next kick-off, then commit and push to `main`.
