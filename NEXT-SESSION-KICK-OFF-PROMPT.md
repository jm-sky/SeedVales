# Kick-off: session 6 (Sonnet) — `survival--001` steps 2–4, then `diag--002` step 1 and `render--002` step 3

You continue work on SeedVales (Vue 3 + TypeScript + Three.js, pnpm). State on 2026-10-01 (end of session 5): v1 complete; waves 1–3 done; wave 4a `render--002` steps 0–2 done (step 2: dome sky default, no tone mapping — D-REN-9; shadow texel snapping); `survival--001` step 1 (CRAFT-03 waterskin recipes) done. **This session runs on Sonnet (D-PLAN-7): it implements `sonnet` items in a long autonomous loop until they run out or you hit a real blocker.**

**Language: English everywhere (D-LANG-1)** — code comments, docs, plans, reviews, commit messages. Polish docs are legacy: translate the parts you substantially edit; never add new Polish text.

## 0. Model split (D-PLAN-7)

Plans carry `**Model:** sonnet|opus`. Opus sets direction and controls quality; Sonnet does most of the work. You do `sonnet` items. An `opus` item (keep/drop or aesthetic decisions, draft → planned, review triage decisions, wave reviews) goes to an Opus subagent (`Agent` with `model: "opus"`, `isolation: "worktree"`) or is recorded in PROGRESS for an Opus session — never skipped silently, never decided by you.

## 1. Start (mandatory, brief)

1. Read: `CLAUDE.md`, `docs/state/PROGRESS.md` ("Teraz", "Session 5"), `docs/roadmap/v1-closure-and-appendix.md`, `docs/design/DECISIONS.md` (esp. D-PLAN-6, D-PLAN-7, D-SAVE-7, D-ECON-5, D-PERF-2…5, D-REN-9, D-NPC-6…8), `docs/IMPORTANT-PRODUCT-NOTES.md`, `docs/design/ui-english-glossary.md`, the plan `docs/plans/survival--001--fire-fuel-torches-waterskins.md` (incl. "Critical notes" — the user's decisions are recorded there — and "Wynik"). `docs/IMPLEMENTATION-PROMPT.md` still applies (§3, §6, §8, §10).
2. `git status`, `git log --oneline | head -20`, `git fetch origin main` and merge. **A new review on main = triage it first** (skill `wave-review` §3; triage *decisions* are Opus work — delegate per §0; the fixes are yours).
3. Environment: no `node_modules` → `pnpm install --frozen-lockfile`. Chromium auto-detected (`CHROME_PATH` override; do not run `playwright install`).
4. Verify: `pnpm check` (expect **175/175**), `pnpm e2e:run` (smoke 3/3, acceptance **30/30**, mobile 10/10, 0 console errors). Anything red is task one — "flaky" is not a diagnosis. Session 5 saw one unexplained exit-code-1 e2e run whose output was lost; if it recurs, keep the full output (`pnpm e2e:run 2>&1 | tee …`) and find the cause.

## 2. Benchmarks in the cloud (D-PERF-5, user decision)

Render baselines are per machine. In a cloud container `bench:render` prints `n/a (other machine)` against the committed (WSL) baselines — that is expected, not a failure. Official gates (render--002 step-1 confirmation, the 4a exit gate) run on the user's WSL laptop (❓ user). In the cloud do work that does not need trustworthy timing; when a change needs a before/after number, measure both commits **in the same container** (`--baseline=<file>` from a worktree run of the older commit) and label it as cloud-only. `bench:sim` (Node) is fine for relative before/after in the same container.

## 3. Work order

1. **`survival--001` steps 2–4** (Model: sonnet) — FIRE-01 campfire fuel / burn-out / `fireLevel` / ash trace; FIRE-02 stone hearth, settlement hearths, guard duty "Feeding the fire" from warehouse branches + fallback utility-AI goal (reservation, spatial queries, ~1 s cadence); FIRE-03 standing torch (`GroundItem.planted` + `burnH`, plant/light/extinguish/pick up, HUD + mobile control; thrown torches burn out too). Burn time is **calendar time**; numbers are calibration constants in `config/calibration.ts`. **One `SAVE_VERSION` bump 7 → 8** for all three steps + a test that a v7 save is rejected cleanly (D-SAVE-7, no migration). Check whether settlement hearths change the generator (`GEN_VERSION`) — the plan says keep the `campfire` site kind if possible. New player-facing words go into the glossary (hearth, fuel, ash, plant torch, light, extinguish). e2e: extend `acceptance.mjs` and `mobile.mjs` (selectors via `data-testid`; pin interaction targets by id). `bench:sim` before/after for the new hourly work and duty (same container). Step 5 (FIRE-04) is design-only → leave `planned` and note it. After the plan: wave review via `wave-review` (reviewer on Opus), fixes, `handoff`.
2. **`diag--002` step 1 — startup result class** (Model: sonnet, tooling): fresh context × 3 per quality, time from "New game" to the first HUD frame, first-frame `render.cpu`/`render.prep`, chunks in the first frame, vegetation build, actor creation, asset download/decode share. Numbers in the cloud are cloud-only (label them); the tool is what matters.
3. **`render--002` step 3 — terrain** (Model: sonnet implementation; keep/drop = opus): implement the draft at the end of the plan (tint masks + uniforms → no chunk rebuild on season/snow; smooth analytic normals with a LOD-independent 2 m step; procedural detail on medium/high) **behind the existing `sv-visual` flags, defaults unchanged**. Check seams on 3 seeds (screenshots — look at them), `chunks.build` before/after in the same container, and that snow no longer rebuilds terrain (count rebuilds — deterministic, machine-independent). Produce the A/B montages (`scripts/e2e/ab.mjs`) and hand the keep/drop decision to Opus (§0).
4. Then, if time remains: `render--004` step 1 (asset audit; step 2 guard test landed on main in `f932621`, D-REN-10 — read it) — Model: sonnet.

Outside the waves (do not start without a plan): MAP-02 sensory visibility; quest packs; English NPC/settlement name pools (batch with `world--001`).

## 4. Work loop (for each plan item)

1. Take the next item; set the plan `in_progress` at the first one.
2. Check in code whether the gap still exists; if not, note it in the plan's "Wynik".
3. Write the test for the new behaviour first (vitest, FEATURES ID in the name) — it must fail. Pattern: `src/game/sim/survival.test.ts`.
4. Implement minimally.
5. Skill `verify` (check, e2e, bench where relevant, screenshots — actually look at them).
6. Skill `handoff` (FEATURES + evidence, plan "Wynik", PROGRESS, DECISIONS, version bumps, commit + push to `main`). Push after every finished item.
7. Back to 1.

Do not end a turn with a plan or a "shall I continue?" question. Ask the user only for vision-changing decisions; record a blocked area in PROGRESS and move to independent work.

## 5. Rules

Standing rules (English everywhere, layering, save/`SAVE_VERSION`, fog of war, tests/budgets, subagents in worktrees without checkout/switch/reset/stash, `pnpm e2e:run`): `CLAUDE.md`. Formats now: `SAVE_VERSION` 7, `GEN_VERSION` 7. Conservation: every resource flow has a source and a sink (branches burned as fuel are the sink). Per-tick systems use spatial queries only (PERF-01).

## 6. End of session

Skill `verify` (check + all e2e), skill `handoff`; up-to-date PROGRESS (what works, how verified, simplifications, gaps, known bugs, exact next step, open `opus` items); commit + push to `main`; short report.

---

**Start message (paste, Sonnet session):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it. Start by verifying the state (merge main; a new review on main is triaged first — decisions via an Opus subagent), then work through the `sonnet` items in the order of §3 in the work loop (§4) until they run out or you hit a real blocker. Hand `opus` items to an Opus subagent or record them in PROGRESS. Don't stop at a plan or a question about continuing. Finish with a commit and push to `main`.
