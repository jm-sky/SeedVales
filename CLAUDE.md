# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SeedVales is a browser-based medieval-themed world simulation game with RPG elements (no fantasy). Stack: Vue 3 + TypeScript + Tailwind CSS v4 + shadcn-vue + Three.js, using pnpm.

**Current repo state: integrated v1-ish game, v1 not yet declared done.** `src/game/` holds the full stack — `world/` (seeded generator, terrain, spatial grid, resource nodes), `sim/` (needs, NPC utility-AI + Big Five, fauna, combat, crafting, trade, build, reputation, quests), `data/`, `config/calibration.ts`, `save/` (IndexedDB world cache + versioned saves), `render/` (Three.js, Quaternius assets), `audio/`, `input/`, `diag/`, `debug/` (`window.__sv` test API), `Game.ts` (facade). Vue UI lives in `src/ui/` (HUD, panels, mobile controls). Always read `docs/state/PROGRESS.md` (handoff) and `git log` first; requirement statuses are in `docs/state/FEATURES.json`, the work order in `docs/roadmap/v1-closure-and-appendix.md`.

## Commands

- `pnpm dev` — start Vite dev server
- `pnpm lint` / `pnpm lint:fix` — ESLint (cached)
- `pnpm type-check` — `vue-tsc --build`
- Package manager is pinned via the `packageManager` field in `package.json`; use pnpm, not npm/yarn.
- `pnpm test` — vitest (sim rules named by FEATURES IDs, determinism, save, economy); `pnpm check` = type-check + lint + test
- `node scripts/check-layers.mjs` — sim/world/data/config/core/save must not import three/vue/render/ui/audio (not yet part of `pnpm check`)
- `pnpm e2e` — Playwright smoke + acceptance (§9) + mobile; needs `pnpm dev --port 5199` running
- `pnpm bench:sim [--update-baseline]`, `pnpm bench:render [low|medium]` — reports in `test-results/bench/` (gitignored); summary goes to `docs/state/PERF.md`
- `node scripts/e2e/tour.mjs` — screenshots for visual review; `pnpm build` — production build
- Headless Chromium uses SwiftShader: FPS numbers are not representative, CPU timings are.

## Documentation hub (`docs/`)

`docs/README.md` is the index. `docs/VISION.md` is the main product-requirements-style vision doc (Polish) and the authoritative source for game design questions — read it before designing any gameplay system. Subfolders, each with their own naming convention documented in their `README.md`:

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

The next session starts from `NEXT-SESSION-KICK-OFF-PROMPT.md` (long-running loop). The developer calibration tools proposal (`docs/DEVELOPER-CALIBRATION-TOOLS.md`) was assessed: a small first slice is planned as `docs/plans/tools--001--calibration-lab.md` (draft, optional alongside the render wave).

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

## Code style (enforced by `eslint.config.ts`)

- No semicolons, single quotes.
- Imports sorted alphabetically by `eslint-plugin-perfectionist` (`internal` patterns: `^~/.*`, `^@/.*`); other `perfectionist/sort-*` rules are mostly turned off — only import order is enforced.
- Vue: components always self-close (including HTML void/normal elements), max 1 attribute per line when multiline / 3 when single-line, multi-word component names allowed, `require-default-prop` off.
- Unused vars/args prefixed with `_` are allowed.

## Path aliases (`components.json`, shadcn-vue "new-york" style)

`@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/composables`.
