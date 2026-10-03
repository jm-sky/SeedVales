# Cave visual / design review (entrance + interior)

**Date:** 2026-10-03 · **Reviewer:** Opus · **Scope:** `world--003` caves as of `2ae9639` — `render/caves.ts`, `world/caveShape.ts`, `world/caveField.ts`, the terrain cut in `render/terrainChunks.ts`, cave lighting in `render/Renderer.ts`, `render/cameraRig.ts`, `scripts/e2e/tour-cave.mjs`; commits `87fd9bd`, `ec5d984`, `75fd27d`, `0173e5f`, `cd3e132`.
**Result:** the plan stage **world--003 step 9 "Cave visual polish"** ([plan](../plans/world--003--caves.md#9-cave-visual-polish--model-sonnet-implementation-opus-keepdrop-and-look-review)).

Legend: ✅ confirmed (screenshot / probe / code) · 🟡 AI assumption · ❓ open.

## Method

- New script `scripts/e2e/review-caves.mjs` (seed 1337, medium, clear noon, **real lighting** — `tour-cave.mjs` adds a debug emissive glow to the cave materials for its overview shots, which hides exactly the problems below). 13 shots per cave: approach, front / side / side2 / above / from-hill around the mouth, threshold from outside, threshold from inside looking out, first tunnel without / with torch, chamber without / with torch / high camera. Caves: 0 (large, slope 0.48), 1 (medium, 0.54), 2 (small, 0.24, flattest), 3 (medium, 0.66, steepest).
- Probes (scratch, not committed): terrain cut per cave (which sky cells actually lose their terrain quad), magenta background / cave group hidden / terrain hidden at the mouth, rain inside a tunnel.
- SwiftShader: colours and geometry are representative, frame times are not (CLAUDE.md).
- Selected shots (960 px JPG) in [`assets/022/`](assets/022/); full set is regenerated with `node scripts/e2e/review-caves.mjs 1337 before`.

## Findings

### A. Entrance geometry

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| A1 | **3 of 7 caves have no terrain hole at all.** `TerrainChunks.build` cuts only when `caves.nearBucket(chunk centre)`: the 128 m chunk centre lies in one of its four 64 m buckets; a cave registered only in another bucket of that chunk is never cut. Seed 1337: caves 2, 4, 5 (all their 36/44/48 sky cells). The cave floor, banks and rim rocks are drawn inside an intact hillside and the player walks *through* the visible terrain into the cave. The acceptance e2e step uses cave 0, which happens to be cut. | `c2-small-no-hole-front.jpg`, `c2-small-no-hole-above.jpg`; probe: `missBucket` = all sky cells for caves 2/4/5, 0 for the rest | ✅ |
| A2 | **The mouth does not read as a natural opening**: from the front it is a black star-shaped hole with sawtooth edges (the 2 m block outline at 45° through the quad diagonals), surrounded by dark slabs. | `c3-steep-approach.jpg`, `c3-steep-front.jpg`, `c3-threshold-out.jpg` | ✅ |
| A3 | **Bank panels are slivers, not banks.** Each cell edge gets its own leaning quad pair; the per-vertex lean (up to 4 m, ±25 % jitter) lands on arbitrary terrain points, so neighbouring panels fan out into long thin spikes and beams (several metres long, a few cm thick) that stick out over the slope; on steep slopes (0.66) they form a spider-like outline. | `c3-steep-side.jpg`, `c1-medium-side.jpg`, `c0-large-side.jpg`, `c3-steep-above.jpg` | ✅ |
| A4 | **The black areas are opaque geometry, not see-through voids** (a magenta background never shows): they are the lintel / tunnel shell / bank faces, nearly unlit. Vertical faces get almost no sun at noon, the albedo is dark brown (`0x8a847c` × dark diffuse × vertex shade 0.85) and the cave material has no ambient term of its own. With the cave mesh hidden, the raw hole is a 2 m sawtooth polygon. | `c3-no-cave-mesh-hole.jpg`; magenta probe | ✅ |
| A5 | **Rim rocks look procedural and loose**: dark-brown flattened icosahedra, sunk only 20 % of their radius, placed on bank tops 0.4 m above the ground (`LIP_M`), so they read as plates floating on the slope and do not cover the seam between the terrain hole and the bank. They also do not match the surface rocks (grey-green Quaternius `Rock_Medium_*` boulders right next to the mouth). | all mouth shots | ✅ |
| A6 | **No overhang / rock framing.** The lintel is a flat vertical face from the ceiling edge to the ground; there is no projecting brow, no jamb rocks, so from outside the mouth has no readable "cave entrance" shape — just a hole in a slope. | `c3-threshold-out.jpg`, `c3-steep-front.jpg` | ✅ |
| A7 | **Grass grows in the cutting and floats above it.** Grass placement ignores cuttings: blades stand on the cut floor and, seen from inside, hover in the air at the old terrain height above the mouth. | `c0-large-lookout-floating-grass.jpg`, `c3-threshold-out.jpg` | ✅ |
| A8 | **LOD mismatch.** The hole is cut only at LOD 0 (2 m step, 120–220 m by profile) but the cave group is built within `CAVE.showM` = 260 m: in the band between the two the hole is closed while banks/rocks (0.4 m above LOD-0 heights) float or sink in the coarser LOD terrain; at the LOD switch the mouth pops. | code (`terrainChunks.ts` `step === 2`, `caves.ts` `showM`), quality profiles `lods[0]` 120/180/220 m | 🟡 not screenshotted |

### B. Surface → cave transition

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| B1 | **Daylight is a global switch on the layer flag.** `caveK` follows `px.cave` (0/1) with a ~0.25 s ease and dims the *global* sun (−95 %) and hemisphere (−80 %). Consequences: (a) the light changes abruptly at the threshold cell instead of fading with depth; (b) from inside, the lit outside (terrain, trees, banks) seen through the mouth is dimmed too and looks like dusk — only the sky dome and fogged distance stay bright — so there is no "bright opening" contrast. | `c3-threshold-in-lookout.jpg` (dark slope and trees at noon), `c0-large-lookout-floating-grass.jpg` (dark near ground under a bright sky) | ✅ |
| B2 | **Material jump at the mouth.** Light-grey terrain rock → dark-brown cave rock on the first bank edge; no blend zone. | all mouth shots | ✅ |
| B3 | Floor height at the threshold matches the surface (`followGround`, no raised platform, no visible step) — fine. | `c3-threshold-out.jpg`, acceptance step 20 | ✅ |
| B4 | Camera at the mouth / under the lintel: no breakout seen in these shots; the boom shortens in tunnels as designed. The camera treats sky cells as open (`ceilAt` = ∞), so any overhang added in A6 must stay above `ceil` or the camera will pass through it. | shots 07–09; `cameraRig.ts` | ✅ / 🟡 for future overhang |

### C. Interior

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C1 | **Boxy, "dungeon" cross-section**: vertical walls on 1 m cell edges + an almost flat ceiling (±0.35 m noise) → a rectangular corridor; diagonal tunnel walls are 1 m staircases. | `c3-tunnel.jpg`, `c3-tunnel-torch.jpg`, `c3-chamber.jpg` | ✅ |
| C2 | **Vertical stripes**: each 1 m wall quad has its own flat normal and its own per-cell hash shade (`shadeAt`), so walls read as planks / picket fence. Non-indexed geometry → no smooth normals. | `c3-tunnel.jpg`, `c3-tunnel-torch.jpg` | ✅ |
| C3 | **Floor reads as paving**: the floor diffuse (cracked dried mud) at a 4 m repeat shows obvious tiles; floor and walls meet at a hard 90° line without contact darkening. | `c3-chamber-torch-high.jpg`, `c3-chamber.jpg` | ✅ |
| C4 | **No surface response**: Lambert + diffuse + vertex colour only; no wet/damp mask, no roughness/specular glint under the torch, no normal/detail map (the Poly Haven normal/roughness EXRs were never converted), no colour variation beyond per-cell noise, no anti-tiling — all items the plan's material strategy already asked for. | `caves.ts` materials; torch shots | ✅ |
| C5 | **Readability**: without a torch the walls are almost black beyond ~3 m (only the floor around the player catches the fill light); with a torch the floor reads but walls and ceiling stay dark, chambers read as a black void. The fill light is a single point light at +2.4 m (intensity 3.2, 18 m) — it lights the floor, not the walls. | `c3-tunnel.jpg`, `c3-chamber.jpg`, `c3-chamber-torch-high.jpg` | ✅ |
| C6 | Floor/wall/ceiling variety: one texture each for floor and shell, same tint everywhere; the deep chamber looks like the tunnel. | chamber shots | ✅ |

### D. Underground rendering

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| D1 | **Almost every draw call underground is invisible surface content.** In a chamber (camera fully enclosed): 138–209 draw calls and 0.50–0.91 M triangles, of which the cave itself is **2** draws ("other"); the rest is terrain 19–24, vegetation 17–27 (+11–14 shadow), structures 43–57 (+0–57 shadow), actors 13–17 (+13–17 shadow), grass 3, sky 1. The sun shadow pass keeps running at 5 % sun intensity. | `drawAttribution()` in the chamber, caves 0/1/2/3 | ✅ |
| D2 | The cave group is not in the `drawAttribution` tag list (shows as "other"). | `Renderer.drawAttribution` | ✅ |
| D3 | **Rain falls inside tunnels** (precipitation follows the camera and ignores the cave layer). | `c3-rain-in-tunnel.jpg` (streak right of the player) | ✅ |
| D4 | Surface actors on another layer are still drawn (and cast shadows) while the player is underground. | D1 numbers (`actors` 13–17) | ✅ |

### E. Performance baseline (for the A/B)

`PERF.md` (session 16): `cave-mouth` / `cave-inside` `render.prep` p95 1.5 / 2.7 ms, 261 draw calls, 0.86–0.89 M triangles, cave build one cave per frame. The polish must keep `render.prep` p95 within these numbers (+0.5 ms tolerance for the mouth patch), cut `cave-inside` draw calls and triangles sharply (D1), and add ≤ 2 draw calls per built cave on the surface.

## What is fine and should stay

- The layer model, `followGround` mouth floor, spine navigation, collision and camera behaviour inside tunnels; the threshold crossing has no vertical jump (B3).
- Local, streamed cave meshes (2 draws per cave) — the cost problem is the surface left on, not the cave.
- Tunnel / chamber proportions are comfortable for the third-person camera.

## Recommendations (→ plan step 9)

MUST: fix the terrain cut lookup (A1); replace the per-edge leaning banks + icosahedron rims with one watertight entrance patch that owns the hole seam (A2–A4, A8); grass/precipitation off in cuttings and caves (A7, D3); underground culling of surface content and the sun shadow pass behind a mouth-visibility test (D1, D4).
SHOULD: mouth framing from instanced `Rock_Medium_*` + lintel overhang (A5, A6); position-based daylight on the cave material instead of the global dim (B1); one cave material with world-space macro variation, anti-tiling, wet mask with roughness, detail normal, vertex AO and a mouth colour blend (B2, C2–C6); rounded tunnel profile and staircase chamfering (C1).
LATER: far-LOD mouth hint, floor rubble / stalagmite scatter, drip-wet animated highlights, eye adaptation.
