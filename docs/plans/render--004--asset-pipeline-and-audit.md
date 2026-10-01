# Render: offline asset pipeline — audit, guard test, missing models

**Status:** planned  
**Model:** sonnet — audit, guard test, Blender authoring  
**Domain:** render  
**Sub domains:** assets, perf, tooling  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (side track: steps 1–2 during wave 4b, step 3 before/with wave 5, step 4 only through wave 6)  
**Created:** 2026-10-01  
**Finished:** —

---

Source: [research 003 — Blender MCP](../research/2026-10-01--003--blender-mcp.md). Decisions: D-REN-3, **D-REN-8**, D-PERF-2, D-PERF-3. Related: [`render--003`](render--003--visual-polish-and-optimization.md) items 4, 5, 9; [`world--001`](world--001--landmarks-and-treasure.md) step 1; [`docs/assets/README.md`](../assets/README.md).

## Critical assessment of research 003 (what we take, what we correct)

- **Taken:** Blender is an offline tool that prepares `.glb` files; the runtime stays procedural world + glTF via Three.js; no AI 3D generators, no realistic Sketchfab models; source and licence recorded per asset.
- **Already done since the research:** rat, hare, boar and bear now have models (`e1c3267`, `scripts/assets/build-extra-animals.mjs`; boar/bear static, bear a style mismatch — `docs/assets/README.md`). The research's "missing animals" item shrinks to: rigs/clips for boar and bear, sheep/chicken/moose placeholders, a low-poly bear replacement.
- **Corrected — optimisation is not first:** the research ranks "decimate the village roofs / atlas the materials" as highest value. The roadmap's rule (wave 6) is "no measured problem → no work", and no measurement says triangles are the bottleneck: buildings are merged per material and instanced (D-REN-2), and headless `render.draw` is not representative (SwiftShader). So step 1 is an **audit** (measurement), and optimisation goes through `render--003` with a measured trigger.
- **Corrected — Blender is not required for the audit:** `scripts/assets/inspect-pack.mjs` and glTF Transform already run in Node and are reproducible by any session (cloud sessions have no Blender). Blender MCP is used where a human-style edit is needed (re-orienting, rigging, modelling).
- **Added — silent fallback risk:** render code looks parts up by node name (`render/assets.ts`, `vegetation.ts`, `carts.ts`); a renamed node after re-export silently falls back to procedural geometry and no test notices. A guard test is cheap and protects every later asset change.
- **Deferred:** `.blend` sources under `assets-src/` (Git LFS) only once there is a hand-authored source worth keeping; look-dev renders (Poly Haven HDRIs) and chunk baking into Blender (overlaps `tools--001`) — not planned.

## Steps

### 1. Asset audit (measurement only, ~1 h)

Extend `inspect-pack.mjs` (or a sibling script) to print, for every file in `public/assets/`: file size, triangles, meshes/primitives, materials, textures (resolution, format), animations, skinned or static. Write the table to `docs/assets/README.md` ("Audit" section, dated) and the totals to PERF.md. Join it with the existing render data: which assets are on screen in the `bench:render` scenes (draw calls, triangles per scene) and, once `diag--002` step 1 exists, how much of startup is asset download/decode.

Exit: one table; a short list of "candidates if a problem is measured" (expected: village roof tiles, `anims.glb` size, the 4096→512 bear) — **no file changed**.

### 2. Node-name guard test + pipeline rules (~1 h)

1. Vitest (Node, no WebGL): parse the JSON chunk of each `.glb` the render code uses and assert every node name the code requests exists (derive the list from the same constants the render code uses, not a copy). A missing name fails with the asset and name.
2. `docs/assets/README.md`: workflow section — source location, build script per pack, stable node names, post-processing (prune/dedupe/meshopt, texture size per class), credits rule (CC0 licence file or `CREDITS-CC-BY.txt`), Blender is dev-only (D-REN-8), Blender MCP caveats (scripts leave the scene clean; look nodes up by `type` in a non-English UI).

Exit: test in `pnpm check`; README updated.

### 3. Missing models (on demand, timebox per model)

Only when a plan needs the model. Each model: low-poly, Quaternius-compatible palette, named nodes, ≤ the triangle/texture class of comparable assets from the step-1 table, credits, before/after `bench:render` in a scene showing it, screenshots (`tour.mjs`).

| Need | Consumer | Trigger |
|---|---|---|
| Landmark pieces: stone circle stones, shipwreck, boat wreck, ruin parts not covered by partial village modules | `world--001` step 1 | before/with wave 5; fallback = procedural geometry |
| Rig + Walk/Attack/Death clips for boar and bear (or replacement low-poly animated models from Poly Pizza, CC0/CC-BY) | combat readability, FAUNA-09 | when static boar/bear are judged a problem (❓ user); fallback = static model |
| Sheep, chicken, moose | fauna placeholders (D-REN-3) | optional, same source order: Quaternius/Poly Pizza first, hand-modelling second |
| Held tools/weapons | `tools--001` Equipment Lab, VISION "in hand" | only with a plan for held items (FBX-only RPG Items pack can be converted in Blender) |

Source order: existing CC0 packs (`_temp/`, FBX → glTF through Blender) → Poly Pizza (needs an API key in the addon; CC-BY credit) → hand-modelling. Never AI generators (D-REN-8).

### 4. Geometry/texture optimisation (conditional — executed as `render--003` items)

Decimating roofs, material atlases, KTX2, stripping unused clips: only when a `render--003` item has a measured trigger (scene with settlements over the `render.prep` budget, startup dominated by asset decode, device GPU data, memory over the pilot limit). Verification: same `bench:render` scenes before/after with the D-PERF-3 verdict, startup result (`diag--002` step 1), screenshots; the guard test from step 2 must stay green.

## Exit

Steps 1–2 done; step 3 rows closed as delivered / fallback kept / not needed; step 4 either executed through `render--003` or closed as "not needed".

## Wynik

*(not started)*
