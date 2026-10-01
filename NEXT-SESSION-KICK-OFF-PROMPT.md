# Kick-off: session 9 (Sonnet) — `render--001` fire (1a → 1b), decals (8), English first names, then `world--001` LOOT-01

*Written 2026-10-01 by the session-8 Opus run (the previous Opus-only kick-off is in git history, `5ae03e3`).*

You continue work on SeedVales (Vue 3 + TypeScript + Three.js, pnpm). State at the end of session 8: v1 complete; waves 1–3 and 4s (`survival--001`) done; **4a `render--002` done** (terrain tint uniforms + smooth normals + ground detail are the default — D-REN-13; PBR pilot dropped; WSL gate numbers are a non-blocking user step); **4b `render--001` planned** — that is your main job. Formats: `SAVE_VERSION` 8, `GEN_VERSION` 8. **This session runs on Sonnet (D-PLAN-7):** implement to the plan; leave look/keep-drop calls marked "opus" or "❓ user" as notes in the plan's "Result" and PROGRESS — do not block on them.

**Language: English everywhere (D-LANG-1).** No save migrations before the first release (D-SAVE-7): a format change bumps `SAVE_VERSION` and older saves are rejected.

## 1. Start (brief)

1. Read `CLAUDE.md`, `docs/state/PROGRESS.md` ("Teraz", "Session 8"), roadmap "Schedule (session 8)" in `docs/roadmap/v1-closure-and-appendix.md`, `docs/plans/render--001--weather-variety-effects.md` (whole plan; steps 1a, 1b, 8 in detail), `docs/design/DECISIONS.md` (D-REN-5, D-REN-7, D-REN-13, D-FIRE-1, D-PERF-2/3/5), `src/game/render/dynamics.ts`, `src/game/sim/fire.ts`.
2. `git status`, `git log --oneline | head -20`, `git fetch origin main` and merge. A new review on main is triaged first (skill `wave-review` §3) — if it needs judgement calls, record them for Opus and fix only the clear bugs.
3. `pnpm install --frozen-lockfile` if there is no `node_modules`. Verify: `pnpm check` (expect 217+ tests), `pnpm e2e:run` (smoke 3/3, acceptance 32/32, mobile 11/11, 0 console errors). Anything red is task one — "flaky" is not a diagnosis.

## 2. Work order (all `sonnet`)

1. **`render--001` step 1a — exact first step:** create `src/game/render/fireSources.ts` (pure emitter selection from `sim.buildingsNear` / `sim.groundNear` / `sim.actors.query`, `kind` campfire|hearth|torchpost|planted|held, `level` from `fireLevel(b)`, stable per-id `phase`, planted-torch tip position) with `render/fireSources.test.ts` written first (pool size per profile low 1 / medium 3 / high 4 incl. the player torch with priority; weaker light at `fireLevel` 0.2; planted emitter at the tip; distinct phases). Then switch `Dynamics` to it: light pool per profile (rebuilt only in `setQuality`), multi-sine + smoothed-noise flicker per fire, upright planted-torch mesh, hearth stone ring (`render/structures.ts`). Measure: cloud `bench:render medium` before/after in the same container (`--update-baseline --baseline=<scratch file>` on the base commit, then `--baseline=<file>`), lights gauge drop on low.
2. **Step 1b — particle fire** (user requirement, D-REN-13 d): stateless GPU particle layers (flames with a canvas-generated flipbook, white rising sparks, low red embers, smoke on medium/high), counts by source × `level`, distance cut-offs and instance caps per profile, render seconds (never the ×24 calendar), `renderer.compile` warm-up. Add the A/B frames `fire-campfire-night`, `fire-hearth-dusk`, `fire-torches-night` + 4-shot frame strips to `scripts/e2e/ab.mjs`; run it before/after and leave the montages for the Opus keep/drop (❓ user for the final look on WSL).
3. **Step 8 — blood/ash decals** (`Trace.kind`), bounded instanced quads, test + acceptance frame.
4. **English first-name pools** (`src/game/data/professions.ts` `FIRST_M`/`FIRST_F`; English, medieval-plausible, no fantasy): picked in `sim/newGame.ts`, stored as strings → no `GEN_VERSION`/`SAVE_VERSION` bump. Check tests/e2e that match names by text (logic must not depend on labels).
5. **`world--001` steps 2–3** (LOOT-01 treasure + valuables pricing; `SAVE_VERSION` 8 → 9 with a rejection test) — if the session still has room; otherwise leave it first in the next kick-off.

After each item: skill `verify`, skill `handoff` (FEATURES evidence, plan "Result", PROGRESS), commit + push to `main`.

## 3. Rules

Standing rules: `CLAUDE.md` (layering — render may import sim, sim never imports render; save/`GEN_VERSION`; fog of war; no weakened tests/budgets/baselines; subagents only with `isolation: "worktree"` and no `git checkout/switch/reset/stash`; `pnpm e2e:run`). Benchmarks in the cloud: only same-container before/after comparisons are valid (D-PERF-5); a `bench:render` scene marked `unsettled` is not a result. Do not end a turn with a plan or a "shall I continue?" question.

## 4. End of session

Skill `verify`, skill `handoff`; PROGRESS up to date (what was done, the Opus keep/drop items with the montage paths, ❓ user items); commit + push to `main`; short report. Write the next kick-off here (a new dated section): Opus if a keep/drop or wave review is due (1b fire look), otherwise Sonnet with the next steps from the roadmap schedule.

---

**Start message (paste, Sonnet session):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it. Start by verifying the state (merge main; a new review on main is triaged first), then work through §2 in order, starting with `render--001` step 1a. Don't stop at a plan or a question about continuing. Finish with the next kick-off, then commit and push to `main`.
