# Render: nature pass — grass with LOD and wind, real trees (leaf cards + impostors), water

**Status:** in_progress  
**Model:** sonnet — implementation of every step; opus — asset choice keep/drop (step 3a), look keep/drop per step, exit-gate review (`wave-review`)  
**Domain:** render  
**Sub domains:** vegetation, terrain, water, assets, perf  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) — wave 4n "nature pass", **before** the rest of [`render--001`](render--001--weather-variety-effects.md) (user, 2026-10-01: nature first)  
**Created:** 2026-10-01 (session 8, user feedback on the screenshots)  
**Finished:** —

---

**User feedback (2026-10-01):** "No grass at all, only ground colour (should be grass with LOD and shader wind). Boxy trees, no branches or leaves. Water is blue without transparency or simplified reflections (careful for performance)." **User decisions:** nature before fire; trees = models with branches and alpha-cutout leaf cards + baked impostors; water = cheap transparency/Fresnel/sky reflection on every profile, a planar reflection **on high only**; terrain gets mid-scale relief first ([`world--002`](world--002--terrain-relief.md)).

FEATURES: `RENDER-06` grass (new), `RENDER-07` trees (new), `RENDER-05` (wind + water — moved here from `render--001` steps 6, 7, 9). Decisions: **D-REN-14**, D-REN-5/7/10/11, D-PERF-2/3/5.

## Starting point (checked in code, 2026-10-01)

- **Grass: none.** The ground is terrain colour + the D-REN-13 detail texture. `reed` nodes (`Grass_Common_Tall`) are the only grass-like meshes.
- **Trees** (`render/vegetation.ts`): Quaternius `CommonTree_1/3`, `Pine_1/3`, `DeadTree_1` (low-poly blob canopies, no leaf cards) **only within `vegNear × 0.6`** = 27 m low / 48 m medium / 72 m high; everything beyond (up to `vegFar` 380/600/850 m) is a procedural icosahedron/cone impostor — the "boxy trees" in the screenshots. Static, no wind.
- **Water:** `MeshLambertMaterial` 0x3f7392, opacity 0.78, `depthWrite=false`; per-chunk inland surfaces + one ocean plane. No depth colour, no Fresnel, no reflection.
- Vegetation rebuild is time-sliced (2.5 ms/frame, `render--002` step 1); terrain material has season/snow uniforms (`TerrainShading`) the grass can share.

## Budgets (pilot values — measured per step, not promises)

| profile | grass | trees: real model ring | impostors | water |
|---|---|---|---|---|
| low | none near the camera beyond a sparse clump ring 0–25 m (or off — decided after measuring) | 0–40 m, LOD1 mesh | to `vegFar` | cheap shader, no reflection, opaque-ish |
| medium | dense blades 0–30 m, clumps 30–70 m | 0–120 m (LOD0 to 50 m, LOD1 beyond) | 120 m → `vegFar` | cheap shader |
| high | dense 0–45 m, clumps 45–100 m | 0–200 m | 200 m → `vegFar` | cheap shader + planar reflection (half res) |

Whole pass gate: `render.prep` p95 ≤ +10 % vs before this plan on the WSL baseline (D-PERF-3) is **not realistic** for adding grass + real trees — they are new content, not a refactor. Rule instead (D-REN-14): each step reports its own cost per profile; low must stay within its frame budget on the user's laptop (❓ user), medium/high may cost more if the A/B shows a clear win; any step that doubles `render.prep` p95 on medium in the cloud same-container comparison stops for an Opus decision.

## Steps

### 0. Preconditions — **Model: sonnet**

1. [`diag--002`](diag--002--render-benchmark-trust.md) **step 5 (real-input travel)** — walking/running with real input across chunk borders; grass and tree streaming add cost exactly there (D-PERF-4).
2. A/B frames for the pass in `scripts/e2e/ab.mjs`: `meadow-grass` (camera at normal height over a meadow), `forest-edge` (trees at 10–150 m), `lake-shore` (water at 5–60 m, afternoon sun), `river-bank`, plus the existing frames. Reference run on the commit before step 1 (montages kept in the plan's "Result" by path).
3. `world--002` done first (grass/trees/water sit on the new relief).

### 1. Shared wind module — **Model: sonnet**

`render/wind.ts`: one uniform block (time in **render seconds**, strength and direction from `sim.weather`, gust noise) and a GLSL chunk injected with `onBeforeCompile` + `customProgramCacheKey`: sway = f(world position, height mask), used by grass, tree leaves/branches and reeds/bushes. The same deformation in `customDepthMaterial`/`customDistanceMaterial` so shadows follow. Test: the chunk compiles into a material; strength 0 = no displacement. (Replaces `render--001` step 6.)

### 2. Grass with LOD and wind (RENDER-06) — **Model: sonnet**; look **opus**, ❓ user

1. **Placement from data, never from the final colour:** a per-tile density mask from biome (meadow/steppe/forest floor high, swamp tall reeds-like, beach/rock/road/snow/water zero), road, slope, settlement flat pads and building footprints (no grass through floors), season (sparser in winter; under snow cover hidden). Tile = 16 m, built by the existing time-sliced job pattern (gather → compose → commit; cached per tile; rebuilt on terrain edit).
2. **Geometry:** LOD0 blade clump = 3–5 curved blades, ~12–20 triangles, vertex colour base→tip gradient; LOD1 = a crossed-quad clump with an alpha-tested blade texture (canvas-generated at load, no asset); instanced per tile ring. Heights from `terrain.heightAt` at placement (exact on edits).
3. **Distance handling:** density thins and blades shrink smoothly towards each ring's outer edge (no popping line), then the terrain detail + a slightly greener/darker grass-tint in the terrain shader carries the look beyond (the far field must not look bald next to near grass — the terrain colour under grass is tuned in the same step).
4. **Wind** from step 1 (tip mask = vertex height); optional small bend around the player (one uniform, near ring only).
5. **Season/snow:** share `TerrainShading` (dry tint in autumn/winter; hidden under `snowCover`).
6. Caps per profile (instances per ring) in a test; spatial only (tiles around the camera), no per-blade CPU work per frame.
7. Acceptance: `meadow-grass`, `summer-meadow`, `autumn-meadow`, `winter-snow` frames; march scene `render.vegetationRebuild` per-frame slice ≤ 2.5 ms budget; cloud same-container `bench:render` per profile in the "Result".

Stop: ring borders visible while walking, or medium `render.prep` doubling. Fallback: LOD1 clumps only, shorter ring.

### 3. Real trees (RENDER-07) — models + leaf cards + impostors

**3a. Asset selection — Model: sonnet (search + build), opus keep/drop, ❓ user look.** Candidates (CC0 preferred, CC-BY with credit — D-REN-10): Quaternius "Stylized Nature MegaKit" (trees with leaf textures), Poly Pizza / Sketchfab low-poly realistic trees with leaf cards, Kenney nature kits as fallback. Needed species: broadleaf (oak/beech-like) ×2, apple, pine/spruce ×2, dead tree, bush. Per-class budget (extend D-REN-11): **tree LOD0 ≤ 3 k triangles, LOD1 ≤ 800**, one leaf atlas ≤ 1024² (≤ 512² on low), bark tiling ≤ 512². Pipeline: `scripts/assets/build-trees.mjs` → `trees.glb` with LOD0/LOD1 nodes (LOD1 via meshopt simplify at build time), credits in `CREDITS-CC-BY.txt` / `docs/assets/README.md`. Replace the whole tree class at once (D-REN-10 consistency). Blender only if a model needs leaf-card cleanup (dev tool, D-REN-8).

**3b. Leaf material — Model: sonnet.** Alpha-tested leaf cards (`alphaTest` ~0.5; `alphaToCoverage` where MSAA is on), double-sided, simple translucency term (back-lit leaves slightly brighter — one line in the Lambert shader), wind from step 1 (trunk sway by height + leaf flutter by vertex colour mask), shadow material with the same alpha test and wind.

**3c. Distance rings — Model: sonnet.** Real model to the profile's ring (table above; replaces `vegNear × 0.6`), LOD0 → LOD1 by distance, then **baked impostors**: at load, render each tree model from 8 azimuths (+ 1 top-down optional) into one atlas (render target, once, ~256² per view on medium), instanced camera-facing quads choose the nearest view and crossfade between two; lit by the sun direction using a baked normal channel if cheap, else albedo × hemisphere. Transition between model and impostor with a short dithered fade, not a pop. The procedural cone/blob impostors are removed.

**3d. Acceptance:** `forest-edge`, `dense-forest`, `meadow-hills` frames; tree draw calls stay instanced (one call per model × LOD + one for all impostors); `render.prep` and draw calls per profile in "Result"; felled/stump states still render (vegetation node state).

Stop: leaf-card overdraw makes medium dense forest unplayable in the cloud comparison (> 2× `render.prep`), or impostor popping is obvious. Fallback: shorter model ring + impostors; leaf flutter off on low.

### 4. Water (RENDER-05) — **Model: sonnet**; look **opus**, ❓ user

1. **Cheap shader, all profiles** (replaces `render--001` step 7): transparency with **depth colour** (shallow = clear/brownish showing the bed, deep = dark blue-green) from a per-vertex depth attribute (water surface − terrain height at build time, refreshed with the water mesh on terrain edits), soft shore fade (alpha → 0 at depth 0), Fresnel (more sky reflection at grazing angles), **sky/environment reflection** = the dome sky gradient evaluated in the shader (shared `atmosphere.ts` parameters, so dusk water is orange), two scrolling procedural normal maps (world UV, continuous across chunks), sun glint (specular lobe from the sun direction, Lambert world → added term only on water). Low: one normal sample, no glint. Ocean plane uses the same material.
2. **Planar reflection — high only:** one `WebGLRenderTarget` at half resolution, mirrored camera over the **nearest water surface within ~80 m whose surface is close to planar** (lakes and the sea; sloped river segments fall back to the cheap reflection), clip plane, reflection scene with layers limited to terrain, trees/impostors, buildings and sky (no grass, particles, actors beyond 30 m), updated every 2nd frame; distorted by the normal maps. Disabled automatically when no qualifying water is near (no cost on dry land). Profile switch on/off at runtime.
3. Order with transparents: water before rain/particles; decals (`render--001` step 8) not on water.
4. Tests: depth attribute = surface − terrain; reflection target exists only on high and only when water is near; material programs compiled at load.
5. Acceptance: `lake-shore`, `river-bank`, `water-shore` (bench) frames at noon and dusk; high vs medium montage to judge whether the planar reflection is worth its cost (bench `water-shore` per profile).

Stop: the planar reflection more than doubles `render.prep`/draw calls in `water-shore` on high in the cloud → Opus decision (cheaper layers, quarter resolution, or drop).

### 5. Flowers/undergrowth accents *(optional)* — **Model: sonnet**

Sparse flower/fern accents in the grass tiles (same system, a few species, seasonal), only after steps 2–3 are kept and within budget. (Replaces `render--001` step 9.)

## Exit gate

- Steps 1–4 keep/drop recorded with montages (before = step-0 reference) on 3 seeds; `pnpm check`, `pnpm e2e:run` green, 0 console errors.
- Cost table per profile and scene in PERF.md (cloud same-container before/after); WSL `bench:render low/medium` run as a ❓ user step — low must stay inside its budget there.
- FEATURES `RENDER-05/06/07` → `implemented_unverified` (device performance ❓, D-PERF-2) or `verified` with frames + WSL numbers.
- Opus wave review.

## Risks

- Overdraw (grass blades, leaf cards, transparent water) stacks; measure the combined `forest-edge` + `lake-shore` frames, not only single effects.
- Alpha-tested foliage in the shadow pass is expensive — shadow casters limited to the LOD0 ring (impostors cast no shadow; known trade-off).
- Impostor baking at load adds startup time → `bench:startup` before/after; cache the atlas in IndexedDB only if it is measurably slow.
- SwiftShader makes per-pixel cost look worse than hardware; per-pixel verdicts come from WSL/device (D-PERF-5).

## Result


### Session 9 (Sonnet, cloud)

- **Step 0:** only the `meadow-grass` frame was added to `scripts/e2e/ab.mjs` (+ `SV_FRAMES=a,b` to render a subset); `diag--002` step 5 and the `forest-edge`/`lake-shore`/`river-bank` frames are **not done** (next).
- **Step 1 done — shared wind** (`render/wind.ts`, test `wind.test.ts`): weather-derived strength (clear 0.3 … storm 1.2, derived, nothing saved), direction drifting with the calendar, render-seconds clock, `applyWind(material, {amplitude, heightScale})` injects the sway after `begin_vertex` (instance-aware, works on colour/depth/distance materials); strength 0 ⇒ zero offset. Wired in `Renderer.render`. Used by grass now; trees/reeds/bushes later.
- **Step 2 done (first pass) — grass** (RENDER-06 `implemented_unverified`): `render/grassPlacement.ts` (pure: data masks biome/road/slope/water/footprints → density, 16 m tiles, deterministic jittered grid, caps) + `render/grass.ts` (two instanced rings: LOD0 7-blade curved clumps, 21 tris; LOD1 crossed quads with a generated alpha blade texture, 4 tris; tile cache, per-frame budget 2.5 ms, shader fade by distance — no ring line —, wind, season dry tint + sparser, hidden under snow, flat up-normal so blades are lit like the ground). Rings/density: low far 24 m ×0.4 (clump ring only), medium 20 m blades + 65 m clumps, high 36/90 m (`GRASS_RINGS`; caps in `grassPlacement.test.ts`). Flag `sv-visual {"grass":false}` = old look. **User feedback during the session: first version far too sparse → densities raised to 3 / 2 clumps per m² (LOD0/LOD1)**. Frames: `docs/state/frames/render--007/` (`ab.mjs medium 'nograss={"grass":false}' 'grass={}'`). Cloud SwiftShader fps (same container, not GPU numbers): mobile/low 4.2 → 3.8 (after the low reduction; before it 4.6 → 2.8, which broke mobile test M1 — fixed by shrinking the low ring, no test change), desktop medium 1.4 → 1.2 with 34.5 k instances. **Opus/❓ user:** look (colour vs the ground tint — steppe ground is yellow, blades are green; terrain colour under grass not yet tuned; blade shapes), wildflowers/clover variety, whether medium/high are too heavy on a real GPU (WSL measurement is the next step — see the kick-off).
- **Reference direction (user, 2026-10-01, two Three.js screenshots):** `docs/research/refs/2026-10-01--threejs-ref-meadow-broadleaf.jpg` (broadleaf trees with real branches + alpha leaf cards, layered grass with small flowers and stones, distance fog) and `…-conifer-grass-godrays.jpg` (conifers with drooping needle-card branches, dense long grass blades with strong sun light shafts). The user wants to go in this direction; **forest/trees and the extras (flowers, light shafts) are to be planned later, not now** — step 3 gets re-planned from these references (leaf-card branch clusters instead of blob canopies, bark texture, flower sprites in the grass tiles, god rays as a post/billboard effect on high).
