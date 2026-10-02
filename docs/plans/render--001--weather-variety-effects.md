# Render: weather, scene life (fire, wind, water), character and animal variety, decals

**Status:** in_progress  
**Model:** sonnet — implementation of every step; opus — keep/drop calls on visual variants (marked per step) and the exit-gate review (`wave-review`)  
**Domain:** render  
**Sub domains:** effects, weather, actors, terrain, vegetation, water, assets  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (wave 4b — after `render--002`)  
**Created:** 2026-09-30  
**Updated:** 2026-10-01 (session 8, Opus) — draft → planned: translated to English (D-LANG-1), steps split with `**Model:**`, acceptance checks, light-pool budget, consumes the `survival--001` sim outputs, user's fire requirements (step 1)  
**Finished:** —

---

Source: [VISION-APPENDIX.md](../VISION-APPENDIX.md) — "Character models", "Animals", "Traces", "Weather", "Graphics direction". Research: [002](../research/2026-10-01--002--realistic-visuals-practical-roadmap.md), [review 005](../reviews/2026-10-01--005--rendering-research-critical-review.md).
FEATURES: `RENDER-03`, `TRACE-01` (render), `WEATHER-01`, `WEATHER-02`, `CHAR-01`, `FAUNA-09` (`RENDER-05` moved to `render--007`).
Decisions: **D-REN-5** (effects behind quality profiles), **D-REN-7** (no point-light shadows, fixed light pool per profile, at most one post pass), **D-REN-13** (terrain shader path is the default), **D-FIRE-1** (fire sim), **D-PERF-2/3/5** (what headless can and cannot prove).

**Dependency:** `render--002` exit gate (closed in the cloud on 2026-10-01; WSL numbers ❓ user — see that plan). Steps 4 (CHAR-01) and 5 (FAUNA-09) do not depend on the foundation.

## Starting point (checked in code, 2026-10-01, `5ae03e3` + session 8)

- **Fire** (`render/dynamics.ts`): every lit `campfire`/`torchpost` building and every lit ground item gets the same 0.8 m `ConeGeometry` flame (one `MeshBasicMaterial`, opacity 0.9) and one global sine flicker. **Nothing reads `fireLevel(b)`** — a dying fire looks like a full one. Hearths (`Building.hearth`) use the campfire template (`render/structures.ts:36`). A **planted torch** (`GroundItem.planted`) is drawn as the generic ground-item box with its flame at ground level (+0.1 m), not upright. NPCs holding a torch play `Idle_Torch_Loop` but have no flame or light. No sparks, embers or smoke.
- **Light pool:** `MAX_LIGHTS = 6` fire lights + `playerLight` = 7 `PointLight`s compiled into **every** lit program on **every** profile (intensity 0 does not remove the loop). `render.pointLights` gauge counts the active ones; `bench:render` reports lights = 9 (7 point + sun + hemisphere).
- **Precipitation:** `dynamics.ts` — 2500 `Points` around the camera on every profile, CPU-moved each frame.
- **Terrain** (D-REN-13, default since session 8): Lambert with season/snow as uniforms (`render/terrainMaterial.ts`, `TerrainShading`), per-vertex `aTint` masks, smooth normals, ground detail on medium/high. WEATHER-02 adds uniforms here — no chunk rebuild.
- **Traces:** sim has `Trace.kind` `blood` | `ash` (`sim/types.ts:314`, `sim.tracesNear`); render draws none.
- Characters: render--005 adds outfit variants (Knight/Ranger/Wizard/Peasant…); hair/beard library is render--005 step 3. Fauna: D-REN-12 class (rigged, Death/Eating clips).
- Water: Lambert, opacity 0.78, `depthWrite=false`, per-chunk surfaces + ocean plane. Vegetation: instanced near + procedural far, static.

## Execution order

Step numbers are kept (other plans and the roadmap cite them); execute in this order:

**(after `world--002` + `render--007`) 1a → 1b → 8 → 3 → 2 → 4 → 5**

Reasoning: the nature pass comes first (user, 2026-10-01: grass/trees/water fill most of the screen); then fire (1) — an effect the user explicitly asked for — consuming the newest sim state; decals (8) are small and consume the same sim hand-off; wet/snow (3) is a few uniforms on the material that is now the default; clouds/precipitation (2) need the sky material only; variety (4, 5) is independent.

## Steps

Every step: timebox = the scope below; fallback named; after the step: `pnpm check`, `pnpm e2e:run`, cloud `bench:render medium` before/after in the same container (`--baseline=<file>`, D-PERF-5) → numbers in the plan's "Result"; A/B frames with `scripts/e2e/ab.mjs` (add a frame per effect); keep/drop in "Result". "❓ user" = needs eyes on a real screen; never blocks the next step.

### 1a. RENDER-03 — fire sources, light pool per profile, torch/hearth looks — **Model: sonnet**

Data first, so the particle step has one source of truth.

1. `render/fireSources.ts` (pure, testable, no Three objects in the selection): collect fire emitters near the camera from spatial queries only (`sim.buildingsNear`, `sim.groundNear`, `sim.actors.query` — PERF-01). Each emitter: `{ x, y, z, kind, level, phase }` with
   - `kind`: `campfire` | `hearth` | `torchpost` | `planted` | `held`;
   - `level`: `fireLevel(b)` for campfire/hearth (D-FIRE-1), 1 for torchpost/planted/held (torch flames do not shrink; planted burn-out is a sim event);
   - `phase`: stable per id (hash), so fires do not flicker in sync;
   - position: campfire/hearth at ground +0.1; torchpost at the post tip (2.5 m, as today); **planted torch at its tip** (upright torch ~1.3 m — match the item mesh in point 4); **held torch** at the hand: player and NPCs within 40 m whose `eq.off`/`eq.main` is a lit torch (use the hand bone position if the actor rig exposes it cheaply, else an offset from the actor transform).
2. **Light pool per profile** (D-REN-7), pilot values to measure: **low 1 / medium 3 / high 4**, *including* the player's torch, which has priority when lit; the remaining slots go to the nearest emitters weighted by `level`. The pool size changes only on `setQuality` (lights added/removed once → one recompile, acceptable); never per frame. Emitters without a light stay emissive only (conscious trade-off, as today).
3. **Light animation** (user requirement): intensity = base(kind) × `level` × night factor × flicker, where flicker = sum of 2–3 sines at different frequencies (≈ 1.3, 3.7, 7.9 Hz) with the emitter's `phase` + a small smoothed random walk — a gentle unsteady breathing, no strobing (amplitude ≤ ±15%). Light position jitters a few cm. Base intensity/range per kind: campfire > hearth (bigger bed, same as campfire ×1.2) > torchpost > planted/held torch. All numbers in one table in `config/calibration.ts`? **No** — they are render-only; keep them in `fireSources.ts` (layering: config is shared with sim, but these are pure look constants).
4. **Looks:** hearth template = a ring of 8 larger stones (no new structure kind — `hearth: true`, D-FIRE-1); planted torch = an upright torch mesh (stick + wrapped head, merged into one geometry, instanced) instead of the item box; a burnt-out campfire is already replaced by an ash trace (step 8 draws it).
5. Tests (`render/fireSources.test.ts`, RENDER-03): pool size per profile; player torch keeps a slot when lit; a fire at `fireLevel` 0.2 gets a weaker light than one at 1; planted torch emitter is at its tip; phases differ between two fires; selection uses spatial queries (no `state.buildings` scan).
6. Acceptance: `bench:render` night-campfires `render.prep` within the gate; `render.lights` = profile pool + sun + hemisphere (low drops from 9 to 3); `render.programs` does not grow per frame. Low gets cheaper per pixel (fewer lights) — note it in PERF.md.

Fallback: keep 6+1 lights on medium/high, pool only on low.

### 1b. RENDER-03 — particle fire (flames, sparks, embers, smoke) — **Model: sonnet**; keep/drop of the look: **opus**, final look ❓ user

**User requirements (2026-10-01):** a good-looking particle fire —
- animated light intensity with a light flicker (done in 1a);
- **small white sparks rising upwards**;
- **flame particles**;
- **an ember glow: red particles low and close to the centre**;
- **particle count and strength depend on the source** (campfire vs torch).

Design (cheap by construction — the CPU does not move particles):

1. **Stateless GPU particles.** One `InstancedMesh` of camera-facing quads per particle layer (flames, sparks, embers, smoke) with per-instance attributes `emitter position`, `seed`, `scale`; a small `ShaderMaterial` (or `onBeforeCompile` on `MeshBasicMaterial` with `customProgramCacheKey`) computes `age = fract(uTime * rate + seed)`, rise, drift, size and colour/alpha over life in the vertex shader from render seconds (**gameplay/render time, never the ×24 calendar**). The CPU only rewrites the instance blocks when the emitter set or a `level` changes (throttled, e.g. every 0.25 s), not per frame. Additive blending, `depthWrite: false`, no bloom needed (the user's fire must look good without bloom — D-REN-7).
2. **Layers** (per-emitter counts at `level` 1, scaled by `level`; pilot values):

   | layer | look | campfire | hearth | torchpost / planted / held |
   |---|---|---:|---:|---:|
   | flames | 4-frame flipbook atlas generated on a canvas at load (no asset), orange → yellow core, shrinking as they rise | 10 | 12 | 4 |
   | sparks | tiny white-yellow points, fast rise with sideways wobble, short life (0.6–1.2 s), sparse | 8 | 10 | 3 |
   | embers | red-orange dots low (≤ 0.25 m) within the fire bed radius, slow pulse, long life | 10 | 14 | 0 (1 on torchpost) |
   | smoke | soft grey quads, slow rise, fade at 3–4 m; **medium/high only** | 3 | 4 | 0 |

   A dying fire (`level` → 0.2) has few small flames, few sparks, the ember layer stays — it reads as glowing coals.
3. **Budgets per profile** (pilot): particle emitters only within 45 m (low) / 70 m (medium) / 90 m (high); beyond that up to the old 200 m, one flame billboard per fire (the old cone replaced by a single flame quad). Total instance caps: low 300 / medium 900 / high 1400; low halves counts and has no smoke. Caps are counted in a test.
4. Wind (`weather` wind if present, else none) may tilt rise direction later — not in this step.
5. A/B: new frames in `ab.mjs` — `fire-campfire-night` (close, 6 m), `fire-hearth-dusk` (settlement hearth), `fire-torches-night` (planted + held torch, torchpost); a short **frame strip** (4 screenshots 120 ms apart) per frame so the motion is visible in a still review.
6. Tests (`render/fireParticles.test.ts`): counts scale with `level` and kind; caps respected; distance cut-offs; no instance rewrite when nothing changed.
7. Acceptance: night-campfires and crowded-settlement `render.prep` within the gate vs 1a; `render.programs` +≤ 4 (one per layer, compiled at load — `renderer.compile` warm-up so the first fire does not stutter); 0 console errors. ❓ user: look and motion on a real screen (screenshots/strip from WSL `tour.mjs`), plus `bench:render` on WSL.

Stop: overdraw visible on low in the night scene, or flipbook flicker reads as noise. Fallback: flames + embers only, sparks on medium/high.

### 8. TRACE-01 (render) — blood and ash decals — **Model: sonnet**

One instanced quad set (ground-aligned, polygon offset), fed by `sim.tracesNear(camera, 60 m)` every 0.5 s; tint and texture per `Trace.kind` (blood: dark red irregular splat; ash: grey-black disc with a few charcoal bits — both procedural canvas textures); alpha = `intensity`; size from intensity (ash ~1.3 m). Tracking-relevant traces never disappear on lower profiles — the profile only limits pure visual dirt (none yet). Cap 128 instances; fog of war is irrelevant (always near the player). Test: decal count follows traces in range; ash and blood tints differ. Acceptance frame: a fresh ash patch next to a campfire, a blood trail after a hunt.

### 3. WEATHER-02 — wet ground and snow on the terrain uniforms — **Model: sonnet**; look: **opus** keep/drop

On `render/terrainMaterial.ts` (D-REN-13): new uniform `uWet` from `weather.wetness` (render-derived, smoothed over a few seconds) darkens and slightly saturates the ground colour where `aTint.y` (flat enough) — Lambert only darkens (no fake gloss, review R7). Snow: keep `snowCover` (render-derived) and add a slope/normal falloff in the shader (snow thins on steeper faces using the smooth normal) — no second terrain mesh, no rebuild on uniform change (test: a wetness change rebuilds 0 chunks, as for snow). Puddles: no. Persistent snow accumulation/melt in sim/save: not in this plan (separate sim decision). Acceptance: rain and snow frames before/after; `render.prep` unchanged (uniform only).

### 2. WEATHER-01 — clouds and precipitation — **Model: sonnet**; look: **opus** keep/drop

- Clouds: one noise layer in the existing sky dome material (`render/sky.ts`): a tiling 2D noise texture generated at load, scrolled with wind, density/coverage from weather (`clear` low, `overcast`/`rain` high, darker underside); sun disc dimmed by coverage. Not a stack of billboards, not multi-octave per-pixel noise in the first version.
- Precipitation: the existing `Points` → rain as short streaks (instanced quads stretched along fall direction), snow as slow tumbling flakes; count from profile × intensity (pilot low 400–800 / medium 1000–1600 / high ≤ 2500). Move them in the vertex shader from render time (stateless, like 1b) so the CPU loop over 2500 points disappears. Simple shelter test: player under a roof → no precipitation inside a small radius (one query, not a raycast per particle).
- Acceptance: overcast and rain frames; rain `render.prep` p95 must not grow (it should fall — the CPU loop goes away).

### 4. CHAR-01 — character variety — **Model: sonnet** (needs render--005 step 3 for hair/beard meshes)

Hair colour (blond/brown/black/red/grey), beard/no beard (render--005 step 3 hair library; until then colour only), scale X/Z ±5 %, Y ±10 % (parameters in `config/calibration.ts`), child = scaled adult, cloth tint (neutral/green/blue palette); deterministic from the NPC id. **Condition: no extra draw calls per character** (tint via uniform/vertex colour/instance attribute, never new materials). Test: the same id gives the same look; draw calls per character unchanged (`bench:render` crowded-settlement). Acceptance: settlement frame with ≥ 6 NPCs visibly different. ❓ user look.

### 5. FAUNA-09 — young and prime animals — **Model: sonnet**

Young: scale down; prime/alpha: scale up + ~10 % darker. Needs sim traits `young`/`prime` (shared with sim--001 step 3); if `prime` is new saved state → `SAVE_VERSION` bump (no migration, D-SAVE-7) — coordinate with `world--001` step 3 (8 → 9) so the two do not collide (whichever lands second bumps again). All fauna is rigged now (D-REN-12), scale/tint does not touch the rig.

### 6, 7, 9 — moved to [`render--007`](render--007--nature-pass.md) (session 8, user: nature first)

Vegetation wind (6) is `render--007` step 1 (shared wind module for grass and trees), water (7) is `render--007` step 4 (now with transparency/depth colour and a planar reflection on high — user decision), ground clumps (9) became real grass (`render--007` step 2). Numbers kept here so older references resolve.

## Light and overdraw budget (whole wave)

- Point lights: low 1 / medium 3 / high 4 (step 1a) — down from 7 everywhere. No point-light shadows (D-REN-7).
- Additive/alpha layers that stack at night in a settlement: fire particles (1b) + smoke + precipitation (2) + water (7) + decals (8). Measure the combined scene **night + rain + campfires** (add it to `bench:render` in step 2), not only single effects.
- Programs: compiled at load or on profile change (`renderer.compile`), never first-use stutter in play.

## Exit gate

- Whole wave 4b ≤ 10 % p95 `render.prep` regression vs the state after `render--002` (headless, same machine; do not add up per-step allowances). Character draw calls do not grow.
- Acceptance frames (A/B montages): night with campfires, hearth, torches, rain, snow, settlement. Value gate: a visible improvement at the normal camera distance, not only in close-ups.
- FEATURES: `verified` for an effect only with headless evidence + frames; device performance stays ❓ in PROGRESS (D-PERF-2). Opus wave review (`wave-review`) at the end.

## Risks

- SwiftShader headless → FPS meaningless; compare draw calls/triangles/programs/CPU phases.
- Overdraw from stacked transparent layers (see budget).
- Stateless particles need render time that survives pause/sleep acceleration: use render seconds, clamp large `dt` so a long pause does not jump every particle.
- Hand-bone lookup for held torches may cost more than it is worth — offset fallback.
- No `_temp/` in the cloud → hair/beard variants depend on render--005 step 3 (WSL/Blender session).

## Result

*(empty — filled per step)*

### Session 11 (2026-10-02, WSL) — step 1a done

- `render/fireSources.ts` (pure): emitters from spatial queries only — campfire / **hearth** (`fireLevel`), torch post (tip 2.5 m), **planted torch at its tip** (`PLANTED_TORCH_H` 1.25 m), **held torches** of the player and NPCs within 40 m (hand offset from the actor transform, no bone lookup), a lying lit torch as a small fire (level 0.35); stable per-key phase. `selectLights`: player's torch first, then distance weighted by level. `flicker`: three sines (≈ 1.3 / 3.7 / 7.9 Hz) with the fire's phase, ±15 %, render seconds.
- `render/dynamics.ts`: **light pool per profile low 1 / medium 3 / high 4** (`LIGHT_POOL`, player's torch included — the separate player light is gone); lights are added/removed only in `setQuality` (one recompile on a quality switch, never per frame). Intensity = kind base × level × night factor (1 − daylight × 0.75) × flicker; range shrinks with level; a few cm of position jitter. Flame cones scale with kind and level and flicker per fire; NPCs' held torches now have a flame. Planted torches are an upright instanced mesh (stick + wrapped head) instead of the item box. Hearth (`structures.ts`): a wider ring of 8 larger stones with a second course.
- Tests: `fireSources.test.ts` (pool sizes, player torch priority on low, dying fire → weaker light, planted tip height, hearth kind, phases differ, flicker bounds, spatial queries only); `dynamics.test.ts` still green. Frame `docs/state/frames/render--001/s11-fire1a-settlement-night.png` (software rendering).
- Not measured on the GPU (WSL GPU path unstable this session). Expected: low gets cheaper per pixel (1 light instead of 7), `render.lights` = pool + sun + hemisphere. Next: 1b particles.

### Session 11 — step 1b first pass

- `render/fireParticles.ts`: four layers (flames, sparks, embers, smoke), each one instanced camera-facing quad mesh; stateless GPU particles (age/rise/drift/size/colour from render seconds and a per-instance seed in the vertex shader); instance data rewritten only when the emitter set or a level changes, throttled to 0.25 s (held torches follow their actor on the throttle). Counts per kind and level as in the plan table (a dying fire keeps its embers), low halves and has no smoke; particle range 45 / 70 / 90 m, caps 300 / 900 / 1400; the old flame cone only beyond the particle range. Flames additive with a generated soft teardrop texture and per-particle rotation/size (simplification: no 4-frame flipbook); smoke normal blending. Bed flames enlarged after the first frame (0.55 → 0.85 m, higher rise).
- Tests `fireParticles.test.ts` (counts by kind/level, low/smoke, caps, range, no rewrite when unchanged); `dynamics.test.ts` asserts particle flames near the player. New A/B frame `fire-close-night` (hearth from ~5 m, player holding a torch). Frames `docs/state/frames/render--001/s11-fire1b-*` (software rendering).
- ❓ user: look and motion on a real screen; GPU cost (`night-campfires`, `crowded-settlement`) pending — the WSL GPU path is being debugged in a separate session.

### Session 11 — step 8 done (TRACE-01 render side)

- `render/decals.ts`: blood and ash as two instanced ground-aligned quad sets (one draw call each), fed by `sim.tracesNear(player, 60 m)` every 0.5 s, nearest first, cap 128; each decal tilted to the terrain normal (finite differences ±0.5 m), stable spin per trace id, polygon offset, no depth write; alpha = intensity (fades with the sim), size from intensity (ash ~1.3 m); procedural textures (irregular dark-red splat; grey-black disc with a paler rim and charcoal bits). Not hidden on any profile (tracking-relevant). User asked whether blood should be a mesh: it is a flat textured quad — the standard decal technique; a 3D puddle would cost more without being visible from the third-person camera.
- Test `decals.test.ts` (counts follow traces in range, faded and out-of-range traces skipped; blood vs ash tint). A/B frame `traces`; `docs/state/frames/render--001/s11-traces-blood-ash.png`.

### Session 11 — step 3 done (WEATHER-02)

- Terrain material (`terrainMaterial.ts`): new uniform `uWet` (`TerrainShading.wet`) — wet ground darker (×0.62) and slightly more saturated where flat (`aTint.y`, partly elsewhere), only where there is no snow; Lambert only darkens (no gloss). Snow now thins on steep faces using the smooth view-space normal (`smoothstep(0.72, 0.9, n·up)`; flat shading keeps the baked mask). Wetness is render-derived in `Renderer.lighting` from `weather.wetness`, smoothed (rate 0.4/s), 0 when snow cover is on; nothing saved, no chunk rebuild (test extended: `terrain.test.ts` RENDER-04 / WEATHER-02 — season/snow/wetness change rebuilds 0 chunks and reaches the uniform).
- A/B frames `summer-dry` / `rain-wet` (same view, summer pinned — an earlier `winter-snow` frame leaves the calendar in winter, where snow cover wins); `docs/state/frames/render--001/s11-weather-*`. Effect is subtle on grass-covered ground (soil and path patches darken clearly); blades do not darken when wet — possible follow-up.

### Session 11 — step 2, clouds done (precipitation open)

- Clouds in the sky dome (`sky.ts`): one generated 256² tiling value-noise texture (R: large blobs, G: detail) sampled twice on a virtual cloud plane (`uv = d.xz / (d.y + 0.06)`), scrolled with the shared wind (render seconds); cover from the weather (clear 0.3, overcast 0.72, rain/snow 0.85, storm 0.95), smoothed ~3 s; darker underside with more cover, dimmed at night (horizon brightness), fade at the horizon; the sun disc and glow fade behind clouds. Frames `docs/state/frames/render--001/s11-clouds-*`.
- Precipitation done (session 12): `render/precipitation.ts` — stateless GPU streaks (rain) / flakes (snow), one instanced quad per drop, position from render seconds + seed wrapped in a 44×26×44 m box around the camera (world-stable), wind slant from the shared wind uniform, rain streaks keep ~2 px width and lengthen with distance, fade at the box edge and near the camera. Counts `precipCount` = cap(profile: 700/1500/2500) × intensity (storm ×1.3). Shelter: `isSheltered` (player inside a roofed footprint: house/inn/warehouse/shed/market, one `buildingsNear(…, 20)` query) clears a 7 m column around the player, smoothed. The CPU loop over 2500 points in `dynamics.ts` is gone (per frame: uniforms only). Test `precipitation.test.ts`. Lesson: the streak quad faced away from the camera (backface culled) until the side vector was `cross(view, axis)`. Frames `test-results/ab` rain-wet / winter-snow (`docs/state/frames/render--001/s12-rain.png`). ❓ `render.prep` rain p95 not yet re-measured (`bench:render` rain scene) — expected to fall.
