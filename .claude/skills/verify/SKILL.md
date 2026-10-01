---
name: verify
description: Verify a change in SeedVales — run type-check/lint/layers/vitest, e2e suites, and sim/render benchmarks. Use before every commit, after finishing a plan item, and at session end.
---

# verify

Rules (layering, no weakening tests/budgets, no HMR e2e): `CLAUDE.md` → "Standing rules" and "Commands". Expected counts: `docs/state/PROGRESS.md` → "Teraz".

## 1. Static + unit (always)

```bash
pnpm check 2>&1 | grep -E "Tests |✖|error" | tail
```

`pnpm check` = type-check + lint + `check-layers` + vitest. On failure, rerun only the failing part (`pnpm type-check`, `pnpm lint`, `pnpm test -t "<FEATURE-ID>"`) and fix the cause — never skip or loosen a test.

## 2. e2e (UI / integration / save changes)

```bash
pnpm e2e:run                      # smoke + acceptance + mobile
pnpm e2e:run smoke acceptance     # chosen suites
```

It starts its own Vite server without HMR and prints one summary line. Expect 0 console errors. Safe to run while editing `src/`. New UI behavior → extend `scripts/e2e/acceptance.mjs` / `mobile.mjs` (selectors via `data-testid`, never label text).

## 3. Benchmarks (only when relevant)

- New or changed per-tick system (sim/NPC/fauna/economy) → `pnpm bench:sim` before and after; compare p95 against the budget. Update the baseline only with `--update-baseline` after a justified, recorded change.
- Render change (materials, lights, particles, terrain, assets) → `pnpm bench:render low` and `medium`.
- Reports: `test-results/bench/`; summary goes to `docs/state/PERF.md`.

## 4. Visual changes

`node scripts/e2e/tour.mjs`, then actually look at the screenshots (same frames before/after).

## SwiftShader caveat

Headless Chromium rasterizes in software. CPU phases (sim, chunk/vegetation builds, render preparation) are comparable within one environment. `render.draw`, GPU time and FPS are NOT representative — never claim an effect is "cheap" or "slow" from them. Device measurement is the user's step (D-PERF-2): leave it as ❓ in PROGRESS.

## Report

One line: `check N/N · smoke a/a · acceptance b/b · mobile c/c · console errors 0` plus bench verdict if run. Failures are reported with output, not hidden.
