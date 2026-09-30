# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SeedVales is a browser-based medieval-themed world simulation game with RPG elements (no fantasy). Planned stack: Vue 3 + TypeScript + Tailwind CSS v4 + shadcn-vue + Three.js, using pnpm.

**Current repo state: early scaffolding.** Vite/Vue/TS config, `src/` (App, main, shadcn `components/ui`, `lib/utils.ts`), Tailwind entry CSS and Three.js dependency exist; no game code yet. Check `git log` and `docs/state/PROGRESS.md` (if present) before assuming what already exists.

## Commands

- `pnpm dev` — start Vite dev server
- `pnpm lint` / `pnpm lint:fix` — ESLint (cached)
- `pnpm type-check` — `vue-tsc --build`
- Package manager is pinned via the `packageManager` field in `package.json`; use pnpm, not npm/yarn.
- `pnpm build` (`vue-tsc -b && vite build`) and `pnpm test` (`vitest run --passWithNoTests`) exist; there are no tests yet.

## Documentation hub (`docs/`)

`docs/README.md` is the index. `docs/VISION.md` is the main product-requirements-style vision doc (Polish) and the authoritative source for game design questions — read it before designing any gameplay system. Subfolders, each with their own naming convention documented in their `README.md`:

Independent review (Grok / Scribe, 2026-09-30): see [docs/reviews/2026-09-30--001--v1-review.md](docs/reviews/2026-09-30--001--v1-review.md).


- `docs/vision/` — vision broken out per domain (one file per domain)
- `docs/design/` — detailed design for a domain/area, filename prefixed by domain (e.g. `ui-combat.md`)
- `docs/plans/` — implementation plans, named `domain--ID--slug.md`, with a `Status: draft|planned|in_progress|blocked|done` header
- `docs/research/` — research notes, named `YYYY-MM-DD--ID--slug.md`
- `docs/reviews/` — review notes, named `YYYY-MM-DD--ID--slug.md`
- `docs/roadmap/` — per-area roadmaps spanning multiple domains/plans
- `docs/state/` — current-state/dependency descriptions per domain or subdomain

`docs/IMPLEMENTATION-PROMPT.md` is the standing brief for autonomous "build v1" sessions. It instructs the agent to create, if missing, plans in `docs/plans/`, `docs/state/FEATURES.json` and `docs/state/PROGRESS.md`, and `docs/design/DECISIONS.md` as the cross-session memory for implementation status — check for these at the start of any implementation session and read `PROGRESS.md` before continuing prior work.

`docs/VISION.md` is canonical (the old `PR.md` was migrated into it). Plan statuses: `draft|planned|in_progress|blocked|done`.

## Key design constraints from the vision (`docs/VISION.md`)

- **Camera/art (decided)**: third-person camera; procedural low-poly terrain/buildings, imported glTF (or procedural placeholders) for characters/animals — see `docs/design/rendering-camera-and-art.md`.
- **Simulation/rendering split**: the world/simulation model and rules must be kept separate from rendering (Three.js) and UI.
- **Two independent time domains** — do not conflate them:
  - *World calendar*: long-term needs, sleep, production, food spoilage, weather, seasons. Baseline: 1 game day = 60 real minutes, calendar runs 24x real time.
  - *Gameplay seconds*: movement, attack swings, bow draw, short-term stamina, knockdown protection timers. Movement speed (~1.5 m/s) must NOT be multiplied by the calendar speedup — only the calendar itself accelerates.
- **World scale**: 1 world unit = 1 meter. Travel is physical only (no map-click teleport); nearest settlement is calibrated to ~1 day's walk (~3.6 km actual route at current constants).
- **Deterministic, seed-based world generation** must be cached separately from mutable per-playthrough save state (savegame goes in browser storage, e.g. IndexedDB; the generated-world cache is shared/reusable across games).
- Design for spatial indexing, distance-based update frequency/LOD, and patch/cache mechanisms from the start — this is a stated non-negotiable, not a later optimization pass.
- Avoid building a generic "engine" or heavy abstractions before a working gameplay loop exists; avoid large files/modules with multiple unrelated responsibilities.

## Code style (enforced by `eslint.config.ts`)

- No semicolons, single quotes.
- Imports sorted alphabetically by `eslint-plugin-perfectionist` (`internal` patterns: `^~/.*`, `^@/.*`); other `perfectionist/sort-*` rules are mostly turned off — only import order is enforced.
- Vue: components always self-close (including HTML void/normal elements), max 1 attribute per line when multiline / 3 when single-line, multi-word component names allowed, `require-default-prop` off.
- Unused vars/args prefixed with `_` are allowed.

## Path aliases (`components.json`, shadcn-vue "new-york" style)

`@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/composables`.
