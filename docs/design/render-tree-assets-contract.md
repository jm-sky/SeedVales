# Render: tree assets contract (LOD0 / LOD1 / baked impostors) — for the Blender session

**Created:** 2026-10-02 (session 11)  
**Plan:** [`render--007`](../plans/render--007--nature-pass.md) step 3 · **Decisions:** D-REN-15, D-REN-8 (Blender = offline dev tool), D-REN-10/11 (asset direction and budgets)  
**Status of the game side:** runtime impostor baking works today (`src/game/render/treeImpostors.ts`); this contract defines what an offline asset set must look like so it can replace the runtime bake and the current single-LOD models without code guesswork.

## What exists now (so the new assets are a drop-in improvement)

- Models: Quaternius Stylized Nature MegaKit (CC0), packed by `scripts/assets/build-assets.mjs` into `public/assets/nature.glb`: `CommonTree_1`, `CommonTree_3`, `Pine_1`, `Pine_3`, `DeadTree_1` (3.3–5.9 k triangles each after meshopt simplification). Node kinds → models: `src/game/render/assetNames.ts` (`NATURE_MODEL`: `tree_broad`, `tree_apple`, `tree_pine`, `tree_dead`; `baseH` = model height used to normalise to the node's height in metres).
- Runtime: real model within `treeModel` = 28 / 48 / 72 m (low / medium / high), dithered 8 m cross-fade, then impostors baked at load from 8 azimuths into an atlas (one draw call). LOD1 meshes would let the model ring grow towards 120 m (medium) / 200 m (high) — the main reason for this task.

## Deliverables

All under `public/assets/` (the game never reads Blender files; sources may live in `_temp/` or an asset repo):

1. `trees.glb` — one root node per tree variant, each with two children named exactly `LOD0` and `LOD1`.
2. `trees-impostors.png` — the impostor atlas.
3. `trees-impostors.json` — atlas metadata.
4. Credits/licence lines in `public/assets/CREDITS-CC-BY.txt` (only if a source is CC-BY) and a row per variant in `docs/assets/README.md` "Audit".

## Variants (first set)

| root node name | game kind | notes |
|---|---|---|
| `Broadleaf_A`, `Broadleaf_B`, `Broadleaf_C` | `tree_broad` | oak/beech-like, different silhouettes |
| `Apple_A` | `tree_apple` | smaller, rounder crown |
| `Pine_A`, `Pine_B` | `tree_pine` | spruce/pine, drooping needle-card branches |
| `Dead_A` | `tree_dead` | bare branches, no leaf cards |

More variants are welcome only if they share the same two material families (see Materials) — 6–8 silhouettes are better than 20 material variants.

## Geometry rules

- **Units / axes:** metres, **Y up** (glTF default; Blender exporter "+Y Up" on). Trunk base centre at the origin (0, 0, 0), the tree stands on y = 0. Real height in metres (a mature broadleaf 9–16 m, pine 12–20 m, apple 4–6 m); the game scales each instance to the node height, so one consistent size per variant is fine.
- **Front:** no special front needed (instances are rotated randomly about Y).
- **Budgets (D-REN-11):** `LOD0` ≤ 3 000 triangles, `LOD1` ≤ 800 triangles (a 500–800 tri LOD1 with fewer, larger leaf cards is the target). Dead tree: LOD0 ≤ 2 000.
- `LOD1` must keep the `LOD0` silhouette and the same pivot/scale (it is swapped by distance, so a size or offset mismatch pops).
- Apply all transforms before export; no modifiers left unapplied; no armatures; no animation.
- Optional vertex colour channel **R = wind weight** (0 at trunk base, 1 at twig tips / leaf cards): the game will use it for branch sway and leaf flutter. If absent, the game falls back to height-based sway.

## Materials

- Exactly two material families per pack: **bark** (opaque) and **leaves/needles** (alpha-masked: glTF `alphaMode: MASK`, cutoff 0.5). No blended transparency.
- Textures: one bark texture ≤ 512² (tiling), one shared **leaf atlas** ≤ 1024² holding all leaf/needle cards for all variants (RGBA, straight alpha, colour bled into transparent pixels — at least 4 px of colour padding around each card so mipmaps do not produce dark/white fringes).
- Base colour only (plus optional normal map ≤ 512² for bark). No metallic/roughness maps needed (the game converts to Lambert). sRGB colour textures.
- Double-sided for leaf cards.

## Impostor atlas

- **Views:** 8 horizontal views per variant (camera elevation 0°), orthographic.
  - View `k` (0…7): camera on the circle at azimuth `a = k · 45°`, positioned at `(sin a, 0, cos a) · D` (glTF/three axes: view 0 looks from **+Z** towards the origin, view 2 from **+X**), looking at the trunk axis, up = +Y.
  - Image right = camera right (view 0: +X to the right).
- **Framing:** per variant, ortho width = `2 · halfWidth`, where `halfWidth` = max |x| / |z| over the LOD0 bounds (× 1.02), height from `minY` to `maxY` of the bounds; the same framing for all 8 views of a variant.
- **Layout:** row = variant (row 0 at the **bottom** of the image, i.e. GL texture convention — or say `"rowOrigin": "top"` in the JSON), column = view k (left to right). Cell 256 × 256 px (the game may downscale to 128 for low).
- **Content:** RGBA, alpha = coverage (cutout, straight alpha, colour bled into transparent pixels). **Colour = unlit base colour (albedo)** with at most a soft ambient-occlusion darkening towards the crown interior and trunk base — **no sun direction, no cast shadows** (the game lights impostors at runtime).
- Optional second atlas `trees-impostors-normal.png` (same layout, tangent = view space: R = right, G = up, B = towards the camera, 0.5-biased) — lets the game light impostors with the real sun direction. Nice to have, not required for the first drop.
- PNG for now; the game may convert to KTX2 later (research 003 §11).

### `trees-impostors.json`

```json
{
  "views": 8,
  "cell": 256,
  "rowOrigin": "bottom",
  "rows": [
    { "name": "Broadleaf_A", "kind": "tree_broad", "halfWidth": 4.1, "minY": 0.0, "maxY": 12.6 },
    { "name": "Pine_A", "kind": "tree_pine", "halfWidth": 2.9, "minY": 0.0, "maxY": 15.2 }
  ]
}
```

`name` = the root node name in `trees.glb`; bounds in metres in the model's own space.

## Acceptance (game side, after the drop)

- `pnpm check`, `pnpm e2e:run` green; `node scripts/e2e/ab.mjs medium 'old={"impostors":false}' 'new={}'` frames `forest-edge`, `meadow-hills`, `lake-shore` (`SV_GPU=1`) show no pop at the model ↔ impostor fade and impostors matching the models in colour/silhouette.
- `SV_GPU=1 SV_SCENES=dense-forest node scripts/bench/render-bench.mjs medium|high`: with LOD1 the model ring can grow (target 120 m medium / 200 m high) while dense-forest GPU time stays within ~+1 ms of today (medium 3.5 ms, high 6.0 ms, PERF.md "WSL session 11").
- Startup: the offline atlas removes the runtime bake (`render.impostorBake`); `bench:startup` must not get slower.

## Not needed from Blender

Grass, flowers, rocks, bushes (separate later steps); wind animation (shader-side); LOD2 (impostors cover it); shadows/AO bakes beyond the soft albedo darkening above.

## Delivery notes (session 12, asset side)

Delivered per this contract; clarifications only (no contract change): `halfWidth` = radial max x 1.02, `minY` = 0 with the impostor clipped at y = 0, `COLOR_0` = (wind, AO, 1) so `vertexColors` must be disabled on load, Dead_A shares the bark texture, no normal atlas. Details: render--007 plan "Session 12".
