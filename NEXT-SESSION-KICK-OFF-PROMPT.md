# Kick-off: session 8 (Opus) — decisions for `render--002` step 3, 4a exit gate, plan `render--001`

You continue work on SeedVales (Vue 3 + TypeScript + Three.js, pnpm). State on 2026-10-01 (end of session 7): v1 complete; waves 1–3 done; `survival--001` done (FIRE-01/02/03, review 010 triaged, `SAVE_VERSION` 8); `diag--002` step 1 done (`pnpm bench:startup`); wave 4a `render--002` steps 0–2 done, **step 3 (terrain) implemented behind `sv-visual` flags with defaults unchanged — waiting for your decision**. Formats: `SAVE_VERSION` 8, `GEN_VERSION` 8. **This session runs on Opus (D-PLAN-7): it sets direction and controls quality; Sonnet implements afterwards.**

**Language: English everywhere (D-LANG-1).** No save migrations before the first release (D-SAVE-7): a format change bumps `SAVE_VERSION` and older saves are rejected.

## 1. Start (brief)

1. Read `CLAUDE.md`, `docs/state/PROGRESS.md` ("Teraz", "Session 7"), `docs/roadmap/v1-closure-and-appendix.md`, `docs/design/DECISIONS.md` (D-PLAN-7, D-PERF-2…5, D-REN-5/9/10/11/12, D-FIRE-1), `docs/plans/render--002*.md` (esp. "Wynik", step 3), `docs/plans/render--001*.md`, `docs/plans/survival--001*.md` (render hand-off notes), `docs/state/PERF.md`.
2. `git status`, `git log --oneline | head -20`, `git fetch origin main` and merge (other sessions push asset/world work to main). A new review on main is triaged first (skill `wave-review` §3).
3. `pnpm install --frozen-lockfile` if there is no `node_modules`. Verify: `pnpm check` (expect 216+ tests), `pnpm e2e:run` (smoke 3/3, acceptance 32/32, mobile 11/11, 0 console errors). Anything red is task one — "flaky" is not a diagnosis.

## 2. Work order (all `opus`)

1. **`render--002` step 3 — keep/drop.** Evidence is in the plan's "Wynik" (snow/season rebuilds 19 → 0, smooth normals LOD-independent, chunk build +46% in the cloud, A/B montages on seeds 1337/42/777 with no seams). Re-run `node scripts/e2e/ab.mjs medium 'before={}' 'step3={"tintUniforms":true,"smooth":true,"detail":true}'` (`SV_SEED=<n>` for other seeds) and look at the montages yourself, including a summer/autumn frame (the A/B frames start in winter). Decide: (a) make `tintUniforms` + `smooth` the default (`VISUAL_DEFAULTS`), (b) keep or drop `detail`, (c) whether the +0.6 ms per chunk build needs mitigation (reuse the height grid) before the default flips. Record in DECISIONS (D-REN-13) and the plan. Pure taste calls that need the user go under ❓ in PROGRESS; do not block on them.
2. **4a exit gate.** Read the gate in the plan. Official `bench:render` numbers run on the user's WSL laptop (D-PERF-5, ❓ user); in the cloud only same-container before/after comparisons are valid. Decide what can be closed now and what waits for the user; update plan status honestly.
3. **`render--001` (4b) — take it from draft to planned.** It consumes what the sim now exposes: `fireLevel(b)` and `Building.hearth` (flame size, light pool), `Trace.kind === 'ash'` (decals, step 8), `GroundItem.planted/lit/burnH` (upright torch with the flame at the tip), campfire vs hearth looks. Split it into steps with `**Model:**` per step (Sonnet for implementation), name acceptance checks and which need the user's eyes. Check D-REN-5 quality profiles and the 7-light pool budget.
4. **Schedule, do not start:** `world--001` steps 2–3 (LOOT-01; its save bump is now 8 → 9), `diag--002` tiers B/C (only when triggered), `render--004` step 3+ follow-ups, MAP-02, quest packs, English name pools.

## 3. Rules

Standing rules: `CLAUDE.md` (layering, save/`GEN_VERSION`, fog of war, no weakened tests/budgets, subagents only with `isolation: "worktree"` and no `git checkout/switch/reset/stash`, `pnpm e2e:run`). Skills: `verify`, `wave-review`, `handoff`. Do not end a turn with a plan or a "shall I continue?" question; ask the user only for vision-changing decisions and record blocked areas in PROGRESS.

## 4. End of session

Skill `verify`, skill `handoff`; up-to-date PROGRESS (decisions made, what Sonnet does next and in which order, ❓ user items); commit + push to `main`; short report. **Then write the Sonnet kick-off** for the implementation items you made `planned` (a new dated section here, with the exact first step).

---

**Start message (paste, Opus session):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it. Start by verifying the state (merge main; a new review on main is triaged first), then work through the `opus` items in the order of §2. Don't stop at a plan or a question about continuing. Finish with a Sonnet kick-off for the next implementation session, then commit and push to `main`.
