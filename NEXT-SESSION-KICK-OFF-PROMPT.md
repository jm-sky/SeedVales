# Kick-off: session 11 — Opus look decisions, then trees (re-planned), water, fire

*Written 2026-10-01 by the session-10 Sonnet run on WSL (the session-10 kick-off is in git history, `a2f460e`).*

You continue work on SeedVales (Vue 3 + TypeScript + Three.js, pnpm). State: v1 complete; waves 1–3, 4s, 4a done; nature pass (4n) has terrain relief (`world--002`, `GEN_VERSION` 9), shared wind and grass (`render--007` steps 1–2, RENDER-06 `implemented_unverified`). `SAVE_VERSION` 8. Session 10 closed the 4a gate, measured grass on a **real GPU** and re-tuned it (numbers: `docs/state/PERF.md` "WSL session 10", plan `render--007` "Session 10"). **Model split:** start with **Opus** for the keep/drop calls below (short, batch them), then **Sonnet** for implementation.

**Language: English everywhere (D-LANG-1).** No save migrations before the first release (D-SAVE-7).

## 0. Real GPU on WSL (new, use it)

`SV_GPU=1` makes `scripts/e2e/lib.mjs` launch Chrome on the Intel Arc 140V through Mesa d3d12 (works for `bench:render`, `ab.mjs`, `tour.mjs`; frame-rate limit/vsync off → RAF interval = frame time; `gpu.frame` timer available). Default stays SwiftShader — the committed baselines are SwiftShader (D-PERF-5), do not mix. GPU runs are noisy on this laptop (host stalls of 100 ms–3 s appear): judge by medians and `gpu.frame`, repeat before claiming a regression. Bench env: `SV_VISUAL='{"grass":false}' SV_VISUAL_TAG=nograss`, `SV_SCENES=meadow` (march/teleport always run). Do not run benches in parallel with each other or with e2e.

## 1. Start (brief)

1. Read `CLAUDE.md`, `docs/state/PROGRESS.md` ("Teraz", "Session 10"), `docs/plans/render--007--nature-pass.md` ("Result" → Session 10, incl. the **Step 3 re-plan**), `docs/state/PERF.md` ("WSL session 10"), `docs/design/DECISIONS.md` (D-REN-13/14, D-PERF-2/3/5), `docs/research/refs/`.
2. `git status`, `git log --oneline | head`, merge `main`; a new review on main is triaged first (skill `wave-review` §3).
3. `pnpm install --frozen-lockfile`; `pnpm check` (230), `pnpm e2e:run` (3/3 · 32/32 · 11/11, 0 console errors). Red = task one.

## 2. Work order

1. **Opus decisions (≤ 1 h, write into plan Result + DECISIONS):** (a) grass look keep/drop — look at `docs/state/frames/render--007/wsl/`; wanted: per-clump colour variation, flower/clover accents (step 5), (b) relief amplitude (`world--002`; make a **same-spot** A/B pair with `ab.mjs` first — the stored pairs are from different spots), (c) **trees decision A** (kit vs own generator; recommendation in the plan: own generator, kit as fallback), (d) the **settlement cost on high** (PERF.md: 16–29 ms RAF, 700–890 draw calls with grass off) — decide whether a `render--003` item (building/prop merging, shadow-caster limits) goes before trees.
2. **Trees (`render--007` step 3, re-planned):** per the decision — generator or kit → leaf material (alpha-test, wind, back-light) → rings + baked impostors; measure on the GPU (`SV_GPU=1 bench:render` `dense-forest`, `forest-edge` frame) after each sub-step; add the missing `ab.mjs` frames `forest-edge`, `lake-shore`, `river-bank` first (also `diag--002` step 5, real-input travel).
3. **Grass follow-ups if Opus keeps it:** per-clump colour variation (instance colour or hash in the shader), flowers (step 5).
4. **Water (step 4):** cheap shader on every profile, planar reflection on high only — judge on the GPU; `water-shore` bench per profile.
5. **If time remains:** `render--001` fire 1a/1b, English first names (NPC pools still Polish, `GEN_VERSION` bump), `world--001` steps 2–3. Harness: fix `tour-01-npcs-close` (camera ends inside a house wall).

After each item: skill `verify`, skill `handoff` (FEATURES evidence, plan "Result", PROGRESS), commit + push to `main`.

## 3. Rules

Standing rules: `CLAUDE.md` (layering — render may import sim, sim never imports render; save/`GEN_VERSION`; fog of war; no weakened tests/budgets/baselines; subagents only with `isolation: "worktree"` and no `git checkout/switch/reset/stash`; `pnpm e2e:run`). Do not end a turn with a plan or a "shall I continue?" question. Background commands: set `timeout` explicitly (the default 30 min killed a medium bench once).

## 4. End of session

Skill `verify`, skill `handoff`; PROGRESS up to date (numbers, tuned values, Opus keep/drop notes, ❓ user items); commit + push to `main`; short report. Write the next kick-off here (new dated section).

---

**Start message (paste):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it. Start by verifying the state (merge main; a new review on main is triaged first), then work through §2 in order. Don't stop at a plan or a question about continuing. Finish with the next kick-off, then commit and push to `main`.
