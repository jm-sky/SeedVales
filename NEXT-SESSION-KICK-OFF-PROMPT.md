# Kick-off: session 5 — finish wave 4a `render--002` (steps 2–4), then waves 4b–5 (long loop)

You continue work on SeedVales (Vue 3 + TypeScript + Three.js, pnpm). State on 2026-10-01 (end of session 4, checkpoint): v1 complete; waves 1–3 done (review 006 triaged); reviews 008 (save/load) and 009 (render performance) triaged; wave 4a `render--002` **steps 0–1 done** (clean baselines, render baseline gate, time-sliced vegetation rebuild + node prefetch), step 2 scaffolding (sky dome / tone mapping) sits behind `sv-visual` flags with the old look as default. **This session is a long autonomous loop: work through the plans in order until they run out or you hit a real blocker.**

**Language: English everywhere (D-LANG-1)** — code comments, docs, plans, reviews, commit messages. Polish docs are legacy: translate the parts you substantially edit; never add new Polish text.

## 1. Start (mandatory, brief)

1. Read: `CLAUDE.md`, `docs/state/PROGRESS.md` ("Teraz", "Session 4"), `docs/roadmap/v1-closure-and-appendix.md`, `docs/design/DECISIONS.md` (esp. D-PERF-2, D-PERF-3, D-REN-5…7), `docs/IMPORTANT-PRODUCT-NOTES.md`, `docs/design/ui-english-glossary.md`, the plan `docs/plans/render--002--visual-foundation-and-render-metrics.md` (incl. "Wynik" and the step-3 draft at its end), `docs/state/PERF.md`, and `docs/reviews/2026-10-01--009--render-performance-and-measurement-review.md` (triage table at the end). `docs/IMPLEMENTATION-PROMPT.md` still applies (§3, §6, §8, §10).
2. `git status`, `git log --oneline | head -20`, `git fetch origin main` and merge — docs/reviews land on `main` in parallel (two arrived during session 4). **A new review on main = triage it first** (skill `wave-review` §3; reviews go to `docs/reviews/YYYY-MM-DD--ID--slug.md`, next free ID = highest + 1).
3. Environment: no `node_modules` → `pnpm install --frozen-lockfile`. Chromium auto-detected (`CHROME_PATH` override; do not run `playwright install`). Headless = SwiftShader.
4. Verify: `pnpm check` (expect **167/167**), `pnpm e2e:run` (smoke 3/3, acceptance **30/30**, mobile 10/10, 0 console errors). Anything red is task one — "flaky" is not a diagnosis (session 4 found three harness bugs: interaction targets must be pinned by id, see acceptance 4e/17).

## 2. Work order

1. **Confirm `render--002` step 1** on a quiet machine (no subagents, no e2e in parallel): `pnpm bench:render low` and `pnpm bench:render medium` (second run). The verdict column compares with `scripts/bench/render-baseline-*.json` (D-PERF-3). Record both in PERF.md and the plan "Wynik". Then `handoff`.
2. **Step 2 — light/sky:** `node scripts/e2e/ab.mjs medium 'before={}' 'dome={"sky":"dome"}' 'aces={"sky":"dome","tone":"aces"}' 'agx={"sky":"dome","tone":"agx","exposure":1.2}'`; **look at** `test-results/ab/ab-*.png`; find the 404 console error the first A/B run logged; recalibrate palette/exposure (correction 5 — tone mapping shifts biome/season colours); pick defaults in `render/visualFlags.ts`; keep/drop; then shadow texel snapping in `Renderer.lighting()` (snap the light-space centre to the shadow texel size 90 m / mapSize). Night must stay readable. Aesthetic acceptance = ❓ for the user (correction 4), not a blocker.
3. **Step 3 — terrain:** implement the draft at the end of the plan (tint masks + uniforms → no chunk rebuild on season/snow; smooth analytic normals with a LOD-independent 2 m step; procedural detail on medium/high). Check seams on 3 seeds (screenshots), chunk build time (`chunks.build`) and that snow no longer rebuilds terrain.
4. **Step 4 — PBR pilot** (one asset, CC0 texture or procedural; low stays Lambert) — keep/drop with A/B. Step 5 optional.
5. **Exit gate 4a:** `render.prep` p95 ≤ +10% vs baseline for the whole package (two runs), check + e2e green, programs not growing combinatorially. Then skill `wave-review` (worktree subagent), triage, `handoff`, wave 4a → done.
6. **Wave 4b `render--001`**, `tools--001` (decide D-TOOLS-1), `diag--002` (render benchmark trust — startup, transitions, lifecycle, real travel; can go alongside 4b), **wave 5** `world--001`, `settlement--001` (draft — refine or defer), **wave 6** `render--003` (conditional on device data) — as in the roadmap. After each wave: `wave-review`, then `handoff`.
7. When convenient: `save--001` (historical save fixtures), and the D-LANG-1 follow-up (English NPC/settlement name pools, `GEN_VERSION` bump — needs a plan).

Outside the waves (do not start without a plan): MAP-02 sensory visibility; quest packs in `docs/design/quests/`.

## 3. Work loop (for each plan item)

1. Take the next item; set the plan `in_progress` at the first one.
2. Check in code whether the gap still exists; if not, note it in the plan's "Wynik".
3. Write the test for the new behaviour first (vitest, FEATURES ID in the name) — it must fail. Render logic that can run in Node (no WebGL) gets vitest too (`render/dynamics.test.ts`, `render/vegetation.test.ts` are the pattern).
4. Implement minimally.
5. Skill `verify` (check, e2e, bench, screenshots — actually look at them).
6. Skill `handoff` (FEATURES + evidence, plan "Wynik", PROGRESS, DECISIONS, version bumps, commit + push to `main`). Push after every finished item.
7. Back to 1.

Do not end a turn with a plan or a "shall I continue?" question. Ask the user only for vision-changing decisions; record a blocked area in PROGRESS and move to independent work.

## 4. Rules

Standing rules (English everywhere, layering, save/`SAVE_VERSION`, fog of war, tests/budgets, subagents in worktrees without checkout/switch/reset/stash, `pnpm e2e:run`): `CLAUDE.md`. Formats: `SAVE_VERSION` 7, `GEN_VERSION` 7. Benchmarks only on a quiet machine (no subagent / e2e / vitest running); render baselines change only via `--update-baseline` after two confirming runs with a recorded reason (D-PERF-3). Do not edit `src/` while a benchmark runs (it loads modules from the working tree).

## 5. End of session

Skill `verify` (check + all e2e), skill `handoff`; up-to-date PROGRESS (what works, how verified, simplifications, gaps, known bugs, exact next step); commit + push to `main`; short report.

---

**Start message (paste):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it. Start by verifying the state (triage any new review on main first), confirm render--002 step 1 with the benchmarks, then work through the plans in roadmap order in the work loop (§3) until the plans run out or you hit a real blocker. Don't stop at a plan or a question about continuing. Finish with a commit and push to `main`.
