# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SeedVales is a browser-based medieval-themed world simulation game with RPG elements (no fantasy). Stack: Vue 3 + TypeScript + Tailwind CSS v4 + shadcn-vue + Three.js, using pnpm.

**Current repo state: integrated game, v1 complete; addendum waves (`docs/roadmap/v1-closure-and-appendix.md`) in progress.** `src/game/` holds the full stack — `world/` (seeded generator, terrain, spatial grid, resource nodes), `sim/` (needs, NPC utility-AI + Big Five, fauna, combat, crafting, trade, build, reputation, quests), `data/`, `config/calibration.ts`, `save/` (IndexedDB world cache + versioned saves), `render/` (Three.js, Quaternius assets), `audio/`, `input/`, `diag/`, `debug/` (`window.__sv` test API), `Game.ts` (facade). Vue UI lives in `src/ui/` (HUD, panels, mobile controls). Always read `docs/state/PROGRESS.md` (handoff; section "Teraz" = current counts, format versions, next step) and `git log` first; requirement statuses are in `docs/state/FEATURES.json`, the work order in `docs/roadmap/v1-closure-and-appendix.md`.

## Commands

- `pnpm dev` — start Vite dev server
- `pnpm lint` / `pnpm lint:fix` — ESLint (cached)
- `pnpm type-check` — `vue-tsc --build`
- Package manager is pinned via the `packageManager` field in `package.json`; use pnpm, not npm/yarn.
- `pnpm test` — vitest (sim rules named by FEATURES IDs, determinism, save, economy); `pnpm check` = type-check + lint + check-layers + test
- `node scripts/check-layers.mjs` — sim/world/data/config/core/save must not import three/vue/render/ui/audio (already run by `pnpm check`)
- `pnpm e2e:run [smoke] [acceptance] [mobile]` — preferred: starts its own Vite server (free port, no HMR/watch), runs the suites (all by default), prints one summary line; Chrome auto-detected (override with `CHROME_PATH`)
- `pnpm e2e` — same suites against an already running `pnpm dev --port 5199` (manual debugging)
- `pnpm bench:sim [--update-baseline]`, `pnpm bench:render [low|medium]`, `pnpm bench:startup [low|medium] [--runs=3]` (cold-start result class) — reports in `test-results/bench/` (gitignored); summary goes to `docs/state/PERF.md`
- `node scripts/e2e/tour.mjs` — screenshots for visual review; `pnpm build` — production build
- World cache for tests/e2e (not committed): `node_modules/.cache/seedvales/world-<seed>-<sourcehash>.bin` — vitest (`testSim`) and the dev server (`/__sv-world/<seed>`, dev builds only) reuse it; the key hashes `src/game/{world,core,config,data}`, `serialize.test.ts` checks it against a fresh generation; `SV_WORLD_CACHE=0` disables it (`bench:startup` always does).
- Headless Chromium uses SwiftShader: FPS/GPU numbers are not representative; pure JS phases (sim, chunk/vegetation builds, render preparation) are comparable within the same environment, `render.draw` is not (software rasterization). Device measurements are the user's step (D-PERF-2).

## Documentation hub (`docs/`)

`docs/README.md` is the index. `docs/VISION.md` is the main product-requirements-style vision doc (legacy Polish — see the language rule below) and the authoritative source for game design questions — read it before designing any gameplay system. Important cross-cutting product requirements are collected in `docs/IMPORTANT-PRODUCT-NOTES.md`; read it before UI, map, exploration, or visibility work. Subfolders, each with their own naming convention documented in their `README.md`:

- `docs/vision/` — vision broken out per domain (one file per domain)
- `docs/design/` — detailed design for a domain/area, filename prefixed by domain (e.g. `ui-combat.md`)
- `docs/plans/` — implementation plans, named `domain--ID--slug.md`, with a `Status: draft|planned|in_progress|blocked|done` header
- `docs/research/` — research notes, named `YYYY-MM-DD--ID--slug.md`
- `docs/reviews/` — review notes, named `YYYY-MM-DD--ID--slug.md`
- `docs/roadmap/` — per-area roadmaps spanning multiple domains/plans
- `docs/state/` — current-state/dependency descriptions per domain or subdomain

`docs/VISION-APPENDIX.md` extends the vision with newer requirements (FEATURES `scope: "v2"`); on conflict the appendix wins and the resolution goes to `docs/design/DECISIONS.md`.

Independent review (Grok / Scribe, 2026-09-30): see [docs/reviews/2026-09-30--001--v1-review.md](docs/reviews/2026-09-30--001--v1-review.md); its findings are triaged into `docs/plans/game--002--v1-review-fixes.md`.


`docs/IMPLEMENTATION-PROMPT.md` is the standing brief for autonomous "build v1" sessions. It instructs the agent to create, if missing, plans in `docs/plans/`, `docs/state/FEATURES.json` and `docs/state/PROGRESS.md`, and `docs/design/DECISIONS.md` as the cross-session memory for implementation status — check for these at the start of any implementation session and read `PROGRESS.md` before continuing prior work.

`docs/VISION.md` is canonical (the old `PR.md` was migrated into it). Plan statuses: `draft|planned|in_progress|blocked|done`.

The next session starts from `NEXT-SESSION-KICK-OFF-PROMPT.md` (long-running loop). Rendering/visual work order (wave 4a foundation → 4b effects → wave 6 conditional polish/optimization) comes from `docs/research/2026-10-01--002--realistic-visuals-practical-roadmap.md` + `docs/reviews/2026-10-01--005--rendering-research-critical-review.md`; plans `render--002`, `render--001`, `render--003`. The developer calibration tools proposal (`docs/DEVELOPER-CALIBRATION-TOOLS.md`) was assessed: a small first slice is planned as `docs/plans/tools--001--calibration-lab.md` (draft, optional alongside the render wave).

**Pending handoff — `render--009` stockpile visuals (models done on Windows 2026-10-02, verification pending on WSL).** Read `docs/plans/render--009--stockpile-visuals.md` ("Result" + "Update") and `docs/design/render-stockpile-assets-contract.md` first. State: render code (`render/stockpiles.ts`, `stockpileTiers.ts`) and all 17 tier models (`public/assets/stockpiles.glb`: firewood, stone, grain sacks, food crates/barrels) are committed; the models were never seen in the running game, only in Blender. The triangle budget was raised from 2.5 k to **4 k per tier** at the user's request (top tiers: food_40 ≈ 3.5 k, grain_30 ≈ 3.4 k, firewood_20 ≈ 3.1 k) — you decide on WSL whether it stays (`bench:render` crowded-settlement A/B, PERF.md); lowering it means reducing detail in the generator, not weakening the test. Your job: step 3 (`pnpm e2e:run`, `ab.mjs` frames `stores-low`/`stores-full`, bench A/B, PERF.md entry), check the tiers against `pnpm soak` stock levels, review the look in the game lighting (Blender preview was dark/flat), then mark the plan `done` or fix. Models come only from `scripts/assets/blender-stockpiles.py` (run inside Blender via MCP, then `node scripts/assets/build-stockpiles.mjs`; purge old `pile_*` objects/meshes first or node names get a `.001` suffix). Look decisions made with the user: logs have furrowed bark with dark bark rim / pale sapwood / medium heart on the cut ends, no random per-face colour (structured shading only); sacks lie and touch; open crates show real produce; stones are placed onto a height field so none float (measured: no gap > 2 cm) — taller mounds than ~0.9 m would need tilted rocks. Third-party packs in `public/assets/parked/piles assets/` (Quaternius CC0 bags/crate, K H CC-BY wood pile) were evaluated and deliberately **not used**; they are untracked on purpose (K H pile is 5.6 k tris, 32 separate logs, does not decimate cleanly). Remove this paragraph when the plan is `done`. Not done: hides/wool models.

## Key design constraints from the vision (`docs/VISION.md`)

- **Camera/art (decided)**: third-person camera; procedural low-poly terrain/buildings, imported glTF (or procedural placeholders) for characters/animals — see `docs/design/rendering-camera-and-art.md`. "Low-poly" is a style, not a quality cap: nicer effects (fire particles, clouds, precipitation, wet/snowy ground) are welcome within the perf budget, behind quality profiles (D-REN-5).
- **Simulation/rendering split**: the world/simulation model and rules must be kept separate from rendering (Three.js) and UI.
- **Two independent time domains** — do not conflate them:
  - *World calendar*: long-term needs, sleep, production, food spoilage, weather, seasons. Baseline: 1 game day = 60 real minutes, calendar runs 24x real time.
  - *Gameplay seconds*: movement, attack swings, bow draw, short-term stamina, knockdown protection timers. Movement speed (~1.5 m/s) must NOT be multiplied by the calendar speedup — only the calendar itself accelerates.
- **World scale**: 1 world unit = 1 meter. Travel is physical only (no map-click teleport); nearest settlement is calibrated to ~1 day's walk (~3.6 km actual route at current constants).
- **Deterministic, seed-based world generation** must be cached separately from mutable per-playthrough save state (savegame goes in browser storage, e.g. IndexedDB; the generated-world cache is shared/reusable across games).
- Design for spatial indexing, distance-based update frequency/LOD, and patch/cache mechanisms from the start — this is a stated non-negotiable, not a later optimization pass.
- Systems query only objects in range (spatial grid: `sim.actors.query`, `sim.nodes.query`), never full-world scans per actor/tick. NPC/animal *decisions* run at ~1 s cadence (per species/state), separate from movement LOD; critical events force an immediate decision.
- Avoid building a generic "engine" or heavy abstractions before a working gameplay loop exists; avoid large files/modules with multiple unrelated responsibilities.

## Standing rules

- **English everywhere (D-LANG-1, supersedes parts of D-UI-4).** Player-facing text (no i18n layer; terms per `docs/design/ui-english-glossary.md`, add new ones), proper names (NPCs: English first name + occupational surname, e.g. the home guard **Mark Hornblower**; settlements, landmarks), all new/edited docs, plans, quest designs and code comments are English. Existing Polish docs are legacy: translate when substantially edited, never add new Polish text. Logic must never depend on label text — use ids/fields.
- Layering: sim/world/data/config/core/save never import three/vue/render/ui/audio; UI mutates state only through `Game` methods.
- New mutable state must be saved; a format change needs a `SAVE_VERSION` bump + a test that older saves are rejected cleanly — no migrations before the first release (D-SAVE-7). A generator change needs a `GEN_VERSION` bump. Current values: `docs/state/PROGRESS.md` "Teraz".
- Per-tick systems use spatial queries only (PERF-01). Conservation: every resource/money flow has a source and a sink.
- Fog of war (MAP-01): hide new map/minimap elements in unexplored cells (`isExplored`).
- Never weaken criteria, disable tests, or change budgets/baselines to hide a regression. "Flaky" is not a diagnosis — find the cause.
- Subagents: always `isolation: "worktree"` and forbid `git checkout/switch/reset/stash` (an unisolated one once switched the repo to an old commit). Commit the files they need first (a worktree is created from a commit). After merging their branches, remove the worktrees (`git worktree remove`, `git branch -D`) as hygiene.
- Use `pnpm e2e:run` (no HMR). With the manual `pnpm e2e` + `pnpm dev`, do not edit `src/` or run vitest / `pnpm install` meanwhile — HMR reloads the page ("Execution context was destroyed"). `window.__*` globals are lost on page reload in e2e; pass ids via Node script variables.
- Model split (D-PLAN-7): plans carry `**Model:** sonnet|opus`. Opus sets direction and controls quality (architecture, hard decisions, keep/drop, reviews); Sonnet does most implementation. Wave reviews always run on Opus (`wave-review`).
- Project skills (`.claude/skills/`): `verify` (check/e2e/bench), `wave-review` (worktree subagent review + triage), `handoff` (state files, version bumps, commit/push) — use them instead of re-deriving these procedures.

## Code style (enforced by `eslint.config.ts`)

- No semicolons, single quotes.
- Imports sorted alphabetically by `eslint-plugin-perfectionist` (`internal` patterns: `^~/.*`, `^@/.*`); other `perfectionist/sort-*` rules are mostly turned off — only import order is enforced.
- Vue: components always self-close (including HTML void/normal elements), max 1 attribute per line when multiline / 3 when single-line, multi-word component names allowed, `require-default-prop` off.
- Unused vars/args prefixed with `_` are allowed.

## Path aliases (`components.json`, shadcn-vue "new-york" style)

`@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/composables`.
