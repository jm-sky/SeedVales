# Session 11 ultrareview (cloud)

- Scope: PR #1 (`main` vs `review/base-s11` = `7e4578b`), 24 commits of session 11.
- Tool: `/code-review ultra 1 --post`. Comment: https://github.com/jm-sky/SeedVales/pull/1#issuecomment-5952696208
- Result: 1 normal, 3 nit. No blocking findings. Status of every item: open (not triaged).

## Findings

### 1. [normal] `ab.mjs` rolling-hills frame crashes when no candidate is found
`scripts/e2e/ab.mjs:116-142`. `best` stays `null` if none of the 3000 samples is Meadow, height in [2,45], not underwater, and with `hi < Infinity`. Then `sv.teleport(best.x, best.z)` throws `TypeError`, which aborts the whole run. Affects only custom `SV_SEED` (default 1337 is fine). The `lake-shore` / `river-bank` frames fall through without teleporting; this one should do the same (or skip the frame with a message).

### 2. [nit] `Dynamics.update()` queries `sim.groundNear(p.x, p.z, 150)` twice per frame
`src/game/render/dynamics.ts:149-171` (calls at ~167 and ~176). Same params, each call re-scans the grid and allocates an array (PERF-01). Merge into one pass that fills both the torch and item instanced meshes, or reuse a single result array.

### 3. [nit] Duplicated IoU/coverage evaluation in `build-trees.mjs`
`scripts/assets/build-trees.mjs:242-345`. `cams` / `cov` / `refCov` / `evaluate` are re-implemented in the "tight" (159-172) and "merged" (219-233) LOD1 branches. Extract a `makeEvaluator(...)` helper so scoring cannot drift.

### 4. [nit] Module-singleton shader uniforms
`src/game/render/waterMaterial.ts:19-24` (`waterUniforms`) and the same pattern in `treeImpostors.ts` (`treeFadeUniforms`). Per-scene state lives in globals shared by all materials; two Renderer/Vegetation instances would overwrite each other. Latent, pre-existing pattern. Move to instance fields (as `Grass` does with `u`/`u1`).

## Triage

| # | Verdict | Action |
|---|---------|--------|
| 1 | ❓ | |
| 2 | ❓ | |
| 3 | ❓ | |
| 4 | ❓ | |
