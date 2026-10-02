# Kick-off: next WSL session — tree assets round 2, finish the nature pass, then fire

*Written 2026-10-02 by session 11 (Opus, WSL, real GPU). The session-11 kick-off is in git history (`7e4578b`).*

You continue work on SeedVales (Vue 3 + TypeScript + Three.js, pnpm). State: v1 complete; waves 1–3, 4s, 4a done; **4n nature pass in progress** (`render--007`): wind, grass (16 thin blades/clump, seasonal height, flower/dark/soil patches shared with the ground, height classes), trees (offline LOD0/LOD1 from `trees.glb` + offline impostor atlas, dithered bands), water shader first pass. `GEN_VERSION` 9, `SAVE_VERSION` 8. A parallel Windows/Blender session works on **tree assets round 2** (tight-cut LOD1 leaf cards, lighter pine LOD1, optional normal atlas — `docs/design/render-tree-assets-contract.md` "Round 2 requests").

**Language: English everywhere (D-LANG-1).** No save migrations before the first release (D-SAVE-7).

## 0. Environment notes (WSL)

- Real GPU: `SV_GPU=1` for `bench:render`, `ab.mjs`, `tour.mjs` (Arc 140V via Mesa d3d12). Committed baselines are SwiftShader (D-PERF-5) — do not mix.
- **WSL GPU stability investigation:** see `docs/state/PERF.md` "WSL GPU path stability" (repro protocol, monitors, recommended `.wslconfig`). GPU mode is now frame-capped by default (`SV_GPU_UNCAPPED=1` = old behaviour). Do not start GPU loops without the monitors and the user's go-ahead.
- **The `SV_GPU=1` path crashed WSL three times in session 11, each during a long GPU bench loop.** Run GPU benches one per command (`timeout 600 node scripts/bench/render-bench.mjs …`), append each result to a file under `test-results/` immediately, and never chain several GPU runs in one command or in the background. Software-rendering runs (default) never crashed.
- **GPU numbers on this laptop vary ±50 % run to run** (and another workload on the machine makes them meaningless — check `uptime` first). Quote only **alternating pairs** (A, B, A, B, A, B → medians), never single runs. Bench helpers: `SV_SCENES=dense-forest` (march/teleport always run), `SV_VISUAL='{"treeAssets":false}' SV_VISUAL_TAG=kit` for the kit-tree A/B. Visual flags: `grass`, `impostors`, `treeAssets` (`render/visualFlags.ts`).
- World cache (new): tests and e2e reuse generated worlds from `node_modules/.cache/seedvales/` (CLAUDE.md "Commands"); `SV_WORLD_CACHE=0` disables it.
- Check exit codes: never chain `grep` after a test run with `&&` to decide a commit (a failing e2e was pushed once that way) — use `pnpm e2e:run > log; echo $?`.

## 1. Start

1. Read `CLAUDE.md`, `docs/state/PROGRESS.md` ("Teraz", "Session 11"), `docs/plans/render--007--nature-pass.md` ("Result": Session 11, Session 12, Session 11 continued, and Session 14 if the Blender session wrote it), `docs/design/DECISIONS.md` (D-REN-14/15/16, D-TOOLS-1), `docs/state/PERF.md` (WSL session 11 sections), `docs/research/2026-10-02--003--threejs-graphics-techniques-and-optimization.md` (execution order §16).
2. `git pull`; a new review on main is triaged first (skill `wave-review` §3).
3. `pnpm install --frozen-lockfile`; `pnpm check` (237), `pnpm e2e:run` (3/3 · 32/32 · 11/11, 0 console errors). Red = task one.

## 2. Work order

1. ~~Tree assets round 2~~ **done in session 11** (high ring 200 m, normal atlas used; PERF.md). Remaining tree item: leaf back-light term; a third high GPU pair if the machine allows (two pairs agreed).
2. **Water:** judge the first pass on the GPU at noon and dusk (`lake-shore`, `river-bank`, `settlement-dusk`); planar reflection on **high only** per plan step 4.2 — implement only if a same-scene A/B shows a clear win and `water-shore` high stays within budget; otherwise record the drop.
3. **Opus exit review of 4n** (skill `wave-review`) → triage → plan `render--007` done (exit gate in the plan; FEATURES RENDER-05/06/07 stay `implemented_unverified` until the user's look/device check).
4. **`render--003`:** attribution tool exists (`scripts/bench/draw-attribution.mjs`), actor culling done (high crowded 934 → 363 draws) — **GPU A/B pending** (`SV_VISUAL='{"actorCull":false}'` vs default, crowded/small settlement, one run per command); next by the table: character part/material merge (asset work, Blender session) and the structures shadow pass. Original item: (research 003 §10: per-subsystem draw calls terrain / vegetation / grass / structures / actors / shadow pass) — before any high-only effect. High settlements are 16–29 ms on the laptop.
5. **Fire (`render--001` 1a → 1b)** per its plan.
6. If time remains: `world--001` steps 2–3; `diag--002` step 5 (real-input travel); harness: `tour-01-npcs-close` camera inside a house wall.

After each item: skill `verify`, skill `handoff` (FEATURES evidence, plan "Result", PROGRESS), commit + push to `main` (pull first — the Blender session pushes to main too; resolve doc conflicts by keeping both sections).

## 3. Rules

Standing rules: `CLAUDE.md` (layering; save/`GEN_VERSION`; fog of war; no weakened tests/budgets/baselines; "flaky" is not a diagnosis — e.g. acceptance 8b/18b were harness bugs found with a trace; subagents only with `isolation: "worktree"`; `pnpm e2e:run`). Do not end a turn with a plan or a "shall I continue?" question. Background commands: set `timeout` explicitly; never run benches in parallel with each other or with e2e.

## 4. End of session

Skill `verify`, skill `handoff`; PROGRESS up to date (numbers, tuned values, Opus keep/drop notes, ❓ user items); commit + push to `main`; short report. Write the next kick-off here.

---

**Start message (paste):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it. Start by verifying the state (pull main; a new review on main is triaged first), then work through §2 in order. Don't stop at a plan or a question about continuing. Finish with the next kick-off, then commit and push to `main`.
