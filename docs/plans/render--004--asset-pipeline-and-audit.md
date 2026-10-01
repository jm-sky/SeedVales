# Render: offline asset pipeline — audit, guard test, missing models

**Status:** in_progress  
**Model:** sonnet — audit, guard test, Blender authoring  
**Domain:** render  
**Sub domains:** assets, perf, tooling  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (side track: steps 1–2 during wave 4b, step 3 before/with wave 5, step 4 only through wave 6)  
**Created:** 2026-10-01  
**Finished:** —

---

Source: [research 003 — Blender MCP](../research/2026-10-01--003--blender-mcp.md). Decisions: D-REN-3, **D-REN-8**, D-PERF-2, D-PERF-3. Related: [`render--003`](render--003--visual-polish-and-optimization.md) items 4, 5, 9; [`world--001`](world--001--landmarks-and-treasure.md) step 1; [`docs/assets/README.md`](../assets/README.md).

## Critical assessment of research 003 (what we take, what we correct)

- **Taken:** Blender is an offline tool that prepares `.glb` files; the runtime stays procedural world + glTF via Three.js; no AI 3D generators; source and licence recorded per asset.
- **Updated 2026-10-01 — D-REN-10 (user):** direction is realistic models where the CPU/GPU cost is small. "Quaternius-compatible palette / style mismatch" is no longer a hard criterion; realistic CC0/CC-BY models (Sketchfab, Poly Pizza, Poly Haven) are allowed within the step-1 triangle/texture class, with before/after `bench:render` and screenshots, and a whole class (e.g. fauna) is replaced together to avoid mixed styles. The audit (step 1) therefore also defines the per-class budget.
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

Only when a plan needs the model. Each model: realistic or low-poly per D-REN-10 (class consistency, cost within the audited budget), named nodes, ≤ the triangle/texture class of comparable assets from the step-1 table, credits, before/after `bench:render` in a scene showing it, screenshots (`tour.mjs`).

| Need | Consumer | Trigger |
|---|---|---|
| Landmark pieces: stone circle stones, shipwreck, boat wreck, ruin parts not covered by partial village modules | `world--001` step 1 | before/with wave 5; fallback = procedural geometry |
| Rig + Walk/Attack/Death clips for boar and bear (or replacement low-poly animated models from Poly Pizza, CC0/CC-BY) | combat readability, FAUNA-09 | when static boar/bear are judged a problem (❓ user); fallback = static model |
| Sheep, chicken, moose | fauna placeholders (D-REN-3) | optional, same source order: Quaternius/Poly Pizza first, hand-modelling second |
| Held tools/weapons | `tools--001` Equipment Lab, VISION "in hand" | only with a plan for held items (FBX-only RPG Items pack can be converted in Blender) |
| **Halloween Bits / Signs pack / Ultimate Food Pack** (63 + 14 + 50 `.glb`, indexed in [research 006](../research/2026-10-01--006--halloween-signs-food-pack-index.md)) | **Verification task (needs Blender MCP, Windows is fine — no e2e):** open the candidate pieces listed in research 006 in Blender, check scale (1 unit = 1 m), origin/pivot, orientation, material count and texture size against the D-REN-11 class budget, render a contact sheet, and confirm each pack's licence on Poly Pizza (`credits.txt` gives only author). Output: a keep/drop list per piece appended to research 006 (consumers: food → `economy--001` / ground items, signs + graveyard/ruins → `world--001`, candles/lanterns → `survival--001`, fences/benches/trees → settlement and vegetation variety), then a build script per kept group (merge materials, 512 px, stable node names + `assetNames.ts` guard, credits) only for pieces with a consumer. Drop modern food and Halloween gimmicks. | before/with the plan that consumes the first piece; verification itself can run any time |

Source order: existing CC0 packs (`_temp/`, FBX → glTF through Blender) → Poly Pizza (needs an API key in the addon; CC-BY credit) → hand-modelling. Never AI generators (D-REN-8).

### 4. Geometry/texture optimisation (conditional — executed as `render--003` items)

Decimating roofs, material atlases, KTX2, stripping unused clips: only when a `render--003` item has a measured trigger (scene with settlements over the `render.prep` budget, startup dominated by asset decode, device GPU data, memory over the pilot limit). Verification: same `bench:render` scenes before/after with the D-PERF-3 verdict, startup result (`diag--002` step 1), screenshots; the guard test from step 2 must stay green.

## Exit

Steps 1–2 done; step 3 rows closed as delivered / fallback kept / not needed; step 4 either executed through `render--003` or closed as "not needed".

## Wynik

*(in progress)* Step 2 done 2026-10-01: `src/game/render/assetNames.ts` + `assetNames.test.ts` guard, workflow section in `docs/assets/README.md`.

**Step 1 done 2026-10-01:** `inspect-pack.mjs --audit [--md] [dir|files…]` (Node only) prints size, tris (unique/scene), nodes, meshes/primitives, materials, textures (size, format), animations, skin per file. Table + dated "Audit" section + per-class budgets (D-REN-11) in `docs/assets/README.md`, totals in PERF.md (23 files, 18.63 MB, 174 k tris). Candidates if a problem is measured: village roofs/modules, `anims.glb` 2.5 MB, 11 separate nature textures, bear 9 k tris, props chest clips. No asset file changed by the audit. Not yet joined: per-scene on-screen assets (needs `bench:render` on WSL) and startup decode (`diag--002` step 1).

**Step 3 — landmark row delivered 2026-10-01** (with `world--001` step 1): `landmarks.glb` (419 KB, 15.4 k tris, 17 pieces) from poly.pizza CC0 downloads the user added to `_temp/` (Quaternius Modular Ruins Pack → `Ruin_*`, Quaternius Rocks → `Stone_1..5`, Quaternius Sail Boat hull → `Wreck_Boat`, Kenney Ship Wreck → `Wreck_Ship`); Quaternius Ship / Small Ship not used. Built by `scripts/assets/build-landmarks.mjs` in Node (glTF Transform) instead of Blender editing — the pieces needed only picking, scaling, recentring and 512 px textures; Blender MCP was used to inspect the sources and to render the final pieces and the real `layout()` output for a visual check (scene left clean). Lesson recorded in the README: meshopt quantisation puts a scale on the mesh node, so a looked-up node must be an identity wrapper above it (`mergeTemplate` drops the looked-up node's transform). Realistic-vs-stylised: the ruins/rocks match the Quaternius village kit; the Kenney wreck is flat-colour low-poly — acceptable at its size, ❓ user judges the look. Other step-3 rows (boar/bear clips, sheep/chicken/moose, held items) unchanged.

**Step 3 — fauna rows delivered 2026-10-01 (session 6):** Death/Eating for boar and bear; new rigged moose, sheep, chicken and a 666-tri bear (replaces the 9 k outlier); hare Gallop/Death derived in Node. Pipeline: `normalize-fauna.py` → `rig-fauna.py` (Blender MCP, contact sheets checked per clip, Death verified numerically to rest on z = 0) → `build-extra-animals.mjs`. Fauna total 0.5–4 k tris, ≤ 414→140 KB per file; audit table refreshed (26 files, 168 k tris). Quaternius' own Poly Pizza sheep/chicken variants were rejected (voxel-ish or no Walk). Remaining rows: held items. See D-REN-12.

**Step 3 — Halloween / Signs / Food verification delivered 2026-10-01 (Blender session, Sonnet):** Blender MCP (5.2 LTS) used to open the candidate pieces, measure bounds/pivots and render true-scale contact sheets (before, and again from the built `.glb`); scene restored afterwards. Licences: all looked-up pieces are **CC0** on Poly Pizza (Kay Lousberg, iPoly3D, Quaternius) → no `CREDITS-CC-BY.txt` entry. Findings: Halloween pieces are oversized cartoon proportions (candle 0.8 m, crypt 8 m), signs are ≈ real size, food is ~10× too big with arbitrary pivots; exports carry metallic 1. Keep/drop list appended to [research 006](../research/2026-10-01--006--halloween-signs-food-pack-index.md): kept 31 graveyard/churchyard pieces, 13 signs, 14 medieval-plausible food/cookware pieces; dropped Halloween gimmicks, autumn pines, modern/New-World food. `scripts/assets/build-pack-pieces.mjs` (Node/glTF Transform) bakes scale (1 unit = 1 m), keeps stable node names, merges to 1 material per file (palette for flat colours), ≤ 512 px, meshopt → `assets-src/graveyard.glb` (282 KB, 10.0 k tris), `signs.glb` (128 KB, 7.0 k), `food.glb` (133 KB, 6.4 k); audit rows added to `docs/assets/README.md`.

**Not shipped on purpose:** no plan consumes these pieces yet (`economy--001` and `survival--001` are done without item meshes; `world--001` step 1 shipped `landmarks.glb` only), so the files stay in `assets-src/` and `assetNames.ts`/`public/assets/` are untouched. Hand-off for a consumer: copy the file to `public/assets/`, add the node names it requests to `assetNames.ts` + `packNodeNames()`, wire it, then run `bench:render` before/after (WSL) as for any new model. Likely first consumers: graveyard/ruins landmark variety (`world--001`), ground-item meshes for `items.ts` food ids, settlement signs. Blender-side edits were not needed (Node script was enough); the crypt's orange roof may need a recolour (❓ user judges the look).