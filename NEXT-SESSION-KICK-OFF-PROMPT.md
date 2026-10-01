# Kick-off: session 4 — wave 3 review triage, then waves 4–5 (long loop)

You continue work on SeedVales (Vue 3 + TypeScript + Three.js, pnpm). State on 2026-10-01 (end of session 3, checkpoint): v1 complete; waves 1–2 done; wave 3 `economy--001` and `npc--001` done (TRADE-02, SOC-01, COMP-01/02/03 verified, `SAVE_VERSION` 7); independent review 006 of wave 3 received, **triage not started**; wave 4a `render--002` in progress (step 0 metrics committed, step 2 light/sky scaffolding behind flags). **This session is a long autonomous loop: work through the plans in order until they run out or you hit a real blocker.**

**Language: English everywhere (D-LANG-1)** — code comments, docs, plans, reviews, commit messages. Existing Polish docs are legacy: translate the parts you substantially edit; never add new Polish text.

## 1. Start (mandatory, brief)

1. Read: `CLAUDE.md`, `docs/state/PROGRESS.md` ("Teraz", "Session 3", **"Triage plan for review 006"**), `docs/reviews/2026-10-01--006--wave3-review.md`, `docs/roadmap/v1-closure-and-appendix.md`, `docs/design/DECISIONS.md`, `docs/IMPORTANT-PRODUCT-NOTES.md`, `docs/design/ui-english-glossary.md`, and the plan `docs/plans/render--002--visual-foundation-and-render-metrics.md` (incl. "Wynik"). `docs/IMPLEMENTATION-PROMPT.md` still applies (§3, §6, §8, §10).
2. `git status`, `git log --oneline | head -20`, `git fetch origin main` and merge — docs commits land on `main` in parallel.
3. Environment: no `node_modules` → `pnpm install --frozen-lockfile`. Chromium auto-detected (`CHROME_PATH` override; do not run `playwright install`). Headless = SwiftShader.
4. Verify: `pnpm check` (expect **146/146**), `pnpm e2e:run` (smoke 3/3, acceptance **30/30**, mobile 10/10, 0 console errors). Anything red is task one.

## 2. Work order

1. **Triage review 006** (skill `wave-review` §3): follow the triage plan in PROGRESS.md — fix #1–#10 and #12, each with a failing-first regression test named with its FEATURES ID; #11 reject with reason; #13–#15 record as info/deferred. Mark each finding in the report (fixed + test name / rejected + reason), add a summary line, `bench:sim` (companion AI touched), then skill `handoff`. Wave 3 → `done` in the roadmap.
2. **Wave 4a `render--002`** (continue):
   - Step 0: clean baselines on a quiet machine (no subagents running): `pnpm bench:render low` and `medium` (twice), `pnpm bench:sim` twice then `--update-baseline` (quantiles changed from a last-512 ring to the whole run — record the reason). Rewrite `docs/state/PERF.md` in English with the baseline, the new scenes, and the device checklist for the user (`window.__sv.pacing()`; production build, 30 s warm-up, 3×60 s alternating, 10–15 min on a phone) → ❓ in PROGRESS.
   - Step 2: run `node scripts/e2e/ab.mjs medium 'before={}' 'dome={"sky":"dome"}' 'aces={"sky":"dome","tone":"aces"}' 'agx={"sky":"dome","tone":"agx","exposure":1.2}'`, **look at** `test-results/ab/ab-*.png`, recalibrate the palette/exposure, pick defaults in `render/visualFlags.ts`, decide keep/drop, check the 404 console error the A/B run logged. Then shadow texel snapping. Night must stay readable.
   - Steps 1, 3, 4 (5 optional) per the plan; exit gate: `render.prep` p95 ≤ 10% regression vs baseline for the whole package.
3. **Wave 4b `render--001`**, `tools--001` (decide D-TOOLS-1), **wave 5** `world--001`, `settlement--001` (draft — refine or defer), **wave 6** `render--003` (conditional) — as in the roadmap. After each wave: skill `wave-review`, then `handoff`.
4. Open follow-up from D-LANG-1 (only after waves or when convenient, needs a plan): English NPC/settlement name pools with occupational surnames (`GEN_VERSION` bump).

Outside the waves (do not start without a plan): MAP-02 sensory visibility; quest packs in `docs/design/quests/` (design docs only — implementation needs a plan and the user's agreement).

## 3. Work loop (for each plan item)

1. Take the next item; set the plan `in_progress` at the first one.
2. Check in code whether the gap still exists; if not, note it in the plan's "Wynik".
3. Write the test for the new behaviour first (vitest, FEATURES ID in the name) — it must fail.
4. Implement minimally.
5. Skill `verify` (check, e2e, bench, screenshots — actually look at them).
6. Skill `handoff` (FEATURES + evidence, plan "Wynik", PROGRESS, DECISIONS, version bumps, commit + push to `main`). Push after every finished item.
7. Back to 1.

Do not end a turn with a plan or a "shall I continue?" question. Ask the user only for vision-changing decisions; record a blocked area in PROGRESS and move to independent work.

## 4. Rules

Standing rules (English everywhere, layering, save/`SAVE_VERSION`, fog of war, tests/budgets, subagents in worktrees without checkout/switch/reset/stash, `pnpm e2e:run`): `CLAUDE.md`. Current format versions: PROGRESS "Teraz". Benchmarks are only meaningful when no subagent/test run competes for the CPU.

## 5. End of session

Skill `verify` (check + all e2e), skill `handoff`; up-to-date PROGRESS (what works, how verified, simplifications, gaps, known bugs, exact next step); commit + push to `main`; short report.

---

**Start message (paste):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it. Start by verifying the state, triage review 006, then work through the plans in roadmap order in the work loop (§3) until the plans run out or you hit a real blocker. Don't stop at a plan or a question about continuing. Finish with a commit and push to `main`.
