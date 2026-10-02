# Three.js graphics techniques and optimization — recommendations for SeedVales

**Created:** 2026-10-02 08:30 CEST  
**Model:** GPT-5.6 Sol  
**Status:** research and recommendations; no rendering implementation in this document  
**Repository:** `jm-sky/SeedVales` (`package.json`: `SeedVales-2`)  
**Branch:** `main`  
**Recon base:** `527174c820b9f74b5e122ec985e91d7d4fa065aa`  
**Latest renderer code inspected:** `817c83ff8a507f0a40d4463b315f5a819b3d3990`  
**Web research checked:** 2026-10-02  
**Scope:** Three.js/WebGL2 rendering, vegetation, terrain, water, lighting/atmosphere, assets, Blender/offline pipeline, draw calls, GPU cost and quality profiles.

---

## 1. Executive recommendation

Do **not** change engine and do **not** make a broad WebGPU/PBR/post-processing migration now. The current renderer already has the right foundation: WebGL2, quality profiles, terrain LOD, instancing, time-sliced streaming, real-GPU timing, one shadow-casting sun, shader wind, dense grass with geometric LOD, and a controlled asset pipeline.

For the visual target in `docs/research/refs/`, the largest remaining gains are not "more shaders everywhere". They are:

1. **Trees with credible silhouettes at all distances** — current real models are acceptable; replace the procedural far blobs with impostors baked from the same models, extend the real-tree ring, then add leaf wind/back-light and more variants.
2. **Ground composition rather than uniform carpet** — keep the current grass system, but add bare-soil patches, litter/rocks, mixed grass height and sparse tall accents using the existing world-space patch function.
3. **Cheap but convincing water** — depth colour + shore fade + Fresnel + moving normals + sky/sun reflection; planar scene reflection only on high and only when useful.
4. **Atmospheric depth and lighting polish** — preserve the cheap sun/hemi/sky setup, tune haze and contrast, and use expensive light shafts/bloom only as optional high-profile accents.
5. **Attack the settlement draw-call problem before adding expensive high-profile effects** — the measured high-profile settlement is already the worst scene; optimize actors/material count before trying to brute-force quality with more GPU work.
6. **Improve the offline asset pipeline** — keep meshopt; add KTX2/BasisU for texture-heavy packs, atlas where it reduces material changes, generate LODs/impostors offline, and use Blender where authoring/baking actually helps.
7. **Make resolution elastic before deleting visible content** — high currently caps at DPR 2.0. A measured adaptive DPR is a better emergency valve than removing grass or shrinking visual distance.

The reference images are achievable in this renderer because their quality mostly comes from **silhouette, density variation, atmospheric perspective, coherent lighting and good distance transitions**, not from film-grade PBR or expensive screen-space effects.

---

## 2. Recon: current renderer and what is already working

### Renderer

- Three.js `0.186.1`, `WebGLRenderer`, WebGL2.
- Profiles: low / medium / high with DPR caps **1 / 1.5 / 2**, terrain view distance **650 / 1000 / 1400 m**, vegetation far distance **380 / 600 / 850 m**.
- One `DirectionalLight` casts shadows on medium/high; one `HemisphereLight`; 1024 shadow map on medium and 2048 on high.
- Shadow projection is already stabilized by texel snapping.
- Sky/fog/sun/hemi share one atmosphere model.
- Tone mapping is configurable but the current kept default is `none`.
- `renderer.info` draw calls / triangles / geometries / textures and asynchronous GPU timer metrics are already recorded.

Relevant code: `src/game/render/Renderer.ts`, `quality.ts`, `gpuTimer.ts`, `sky.ts`.

### Terrain

The current terrain path is stronger than the earlier research baseline:

- 2 / 4 / 8 / 16 m geometric LOD rings.
- Smooth normals derived independently of LOD.
- Season/snow/flower changes are shader uniforms rather than rebuild triggers.
- Procedural ground detail on medium/high.
- World-space grass/flower/dark patches are shared between terrain and grass.

This is a good architecture. Do not replace it with a multi-layer full-screen PBR terrain shader unless an A/B proves the visual gain is worth the fragment cost.

### Grass

The session-11 grass implementation is already an example of the right optimization strategy:

- 16 thin blades per clump rather than multiplying instance count.
- Instanced rings with caps by profile.
- Fine/coarse geometric LOD.
- Seasonal growth and flowers.
- Patch/biome values computed per clump and passed as instance attributes rather than recomputed per vertex.
- One camera-facing quad per flower head; five-petal shape is cut in the shader.

Real-GPU Arc 140V result after the LOD/instance-attribute optimization:

- medium meadow: **GPU 3.67 ms**
- medium march: **GPU 4.22 ms**
- high meadow: **GPU 5.35 ms**
- high march: **GPU 6.52 ms**

The rejected version without the final optimization reached ~16.2 ms GPU on high march. This is strong evidence to keep the current pattern: **move stable spatial data out of per-vertex work, use instancing, and reduce geometry with distance**.

### Vegetation

Current `vegetation.ts`:

- real Quaternius models near the player, instanced per model/material;
- procedural cone/icosahedron "impostors" far away;
- real-tree radius is currently only `vegNear * 0.6`;
- tree batches have `frustumCulled = false`;
- rebuild work is time-sliced.

Current nature pack is ~3.3 MB, 27k unique triangles, and contains 11 separate ~512 px textures. Individual trees are roughly 3.3–5.8k triangles after offline simplification.

This is the most obvious mismatch with the reference screenshots.

### Structures and actors

Structures are already much better batched than a raw scene graph: templates are merged per material and repeated buildings use `InstancedMesh`. Therefore **do not assume structures are the main draw-call fix**.

The known remaining settlement problem is broader:

- medium settlements: roughly **10–12 ms** on the Arc 140V;
- high settlements: roughly **16–29 ms**, **700–890 draw calls**, **1.8–2.3 M triangles**;
- characters still commonly require multiple skinned mesh/material draws per body plus head.

The next settlement optimization should therefore start with a draw-call attribution pass, especially actor material/mesh count, rather than blindly merging more building geometry.

### Asset pipeline

The repository already has a useful offline pipeline:

- glTF Transform;
- meshoptimizer simplification and `EXT_meshopt_compression`;
- texture resize through Sharp;
- Blender scripts/MCP for rigging and model work;
- asset audit with triangle/material/texture budgets.

The main missing asset optimization is **GPU texture compression (KTX2/BasisU)** and, where justified, more deliberate material atlasing.

---

## 3. What the reference images actually require

Inspected references:

- `docs/research/refs/2026-10-01--threejs-ref-meadow-broadleaf.jpg`
- `docs/research/refs/2026-10-01--threejs-ref-conifer-grass-godrays.jpg`
- `docs/research/refs/2026-10-02--threejs-ref-flax-meadow.jpg`

The recurring visual signals are:

- readable trunks and branches instead of canopy blobs;
- leaf/needle cards that preserve tree silhouette;
- dense foreground grass but with **gaps, tufts and mixed height**;
- bare soil, leaf litter, small rocks and other scale cues;
- sparse larger flowers that remain readable at normal camera height;
- stronger foreground/midground/background separation through haze;
- coherent directional sunlight;
- restrained glow/light shafts, not a stack of full-screen effects;
- far geometry becomes simpler without suddenly changing visual language.

That means the project should spend geometry and shader budget where the eye notices it: **near silhouettes and composition**, then use impostors, fog and terrain colour to carry the same visual language into the distance.

---

## 4. Prioritized recommendations

| Priority | Recommendation | Visual value | Runtime risk | Project-specific action |
|---|---|---|---|---|
| **P0** | Real-tree ring + baked multi-view impostors | Very high | Medium | Finish `render--007` 3c first. Same source model must drive LOD0/LOD1/impostor. |
| **P0** | Spatially coherent ground composition | Very high | Low–medium | Extend `groundPatch`: soil tint/gaps + sparse litter/rocks + height classes. |
| **P0** | Settlement draw-call reduction, especially actors | High + performance headroom | Low if measured first | Attribute draw calls by subsystem; reduce skinned material/part count before adding expensive high effects. |
| **P0** | KTX2/BasisU pilot for nature textures | Medium visual enabler + memory win | Low–medium at load | Add `KTX2Loader`; convert one pack first, measure startup + GPU/device memory behavior. |
| **P1** | Water shader from `render--007` | Very high near water | Medium | Depth/shore/Fresnel/normals/sky reflection all profiles; planar reflection only high. |
| **P1** | Adaptive DPR with hysteresis | Preserves quality under load | Low–medium | Keep existing quality content, reduce DPR only after sustained GPU overload. |
| **P1** | Tree/vegetation spatial batches with valid bounds | Performance enabler | Medium | Evaluate after new tree rings; do not keep one huge always-visible batch if sector batching wins. |
| **P1** | Leaf material: alpha-test + near-only wind/back-light | High | Medium overdraw | No blended leaf transparency; alpha-to-coverage only where MSAA actually exists. |
| **P1** | Shader compilation warm-up | Smoothness | Low | Use `renderer.compileAsync()` for known material families after assets/lights are ready. |
| **P2** | Atmosphere/haze polish | High | Low–medium | Tune current fog/sky first; optional cheap sun-scatter/light-shaft approximation on high. |
| **P2** | Selective tone-mapping/PBR revisit | Medium–high on selected assets | Medium–high | Only after nature/water; one controlled material class, not a world-wide conversion. |
| **P2** | Optional high-only post effect | Medium | Medium–high | Choose at most one first: subtle bloom **or** light shafts, measured at real resolution. |
| **Future** | TSL/WebGPU migration | Architecture/future features | High implementation risk now | Prototype later; do not block current visual pass. |

---

## 5. Trees: the highest-value next graphics task

### 5.1. Preserve one visual source across distance

The far tree must look like the near tree, not like a different art style.

Recommended chain:

`LOD0 model → LOD1 simplified model → 8-view impostor atlas → fog/terrain carry`

Current plan already points in this direction. Keep it.

For medium, the existing target around **120 m real models** is sensible as a starting point; high around **200 m**. The exact split is a measurement result, not a fixed rule.

### 5.2. Bake impostors offline, not necessarily at game startup

The current plan proposes rendering the atlas at load. That works, but for stable production assets an **offline atlas is preferable** if it matches the runtime appearance:

- no startup render-target work;
- deterministic output;
- no one-time shader compilation spike;
- atlas can be inspected and compressed;
- optional normal/depth channel can be baked once.

Best workflow:

1. Blender for model cleanup, leaf-card placement, LOD authoring and optional atlas baking.
2. Or a small build-time Three.js renderer if exact game Lambert/shader colour matching is more important than Blender convenience.
3. glTF Transform / meshoptimizer for final simplification and GLB compression.
4. KTX2 for the impostor/leaf atlas after the look is accepted.

Do **not** hand-author every tree in Blender. Use Blender where the asset needs structural editing; keep repeatable optimization in scripts.

### 5.3. More variants, but not more material chaos

The kit has additional tree variants that can improve the forest immediately. Add variants only if they share a small material/atlas family.

A forest with 6–8 silhouettes and two material families is better than 20 unique variants each producing separate material state and texture bindings.

### 5.4. Foliage material

Use:

- opaque + `alphaTest`, not regular `transparent`;
- mipmapped leaf textures;
- modest anisotropy only where it visibly helps;
- wind on near real trees, reduced or disabled on far LOD;
- matching deformation in the shadow material;
- simple back-light/transmission approximation, not `MeshPhysicalMaterial`.

Three.js `alphaToCoverage` can smooth alpha-tested edges, but it only makes sense with multisampling. In the current renderer only the high profile creates the WebGL context with antialiasing, so this is a **high-only experiment**, not a general foliage setting.

### 5.5. Spatial batching/culling

Current vegetation instances intentionally disable frustum culling. With the longer real-tree ring this deserves a new A/B:

- split vegetation into world sectors/tiles;
- one `InstancedMesh` per model/material/sector, or another bounded grouping;
- compute/update the batch bounds;
- keep sectors coarse enough that draw calls do not explode.

Three.js `InstancedMesh` is correct when geometry/material are shared. `BatchedMesh` becomes interesting for many static objects with the **same material but different geometries**. It is not a replacement for independent skinned NPCs.

Do not implement spatial batching before the new tree system exists; the optimum changes with the real/impostor distance split.

---

## 6. Grass, flowers and ground: keep geometry, improve composition

Do **not** replace the current grass renderer. Its measured architecture is good.

The next visual improvement should come from distribution and scale cues:

### 6.1. Add three grass height/shape classes without more CPU-per-frame work

Use one deterministic per-instance attribute/hash:

- short/base grass;
- normal grass;
- long/arching accent grass.

Bias long grass toward forest edges, water margins and selected meadow patches. Keep the same tile/ring system. If possible, encode the class as an attribute and reuse the same draw/material family rather than creating a new mesh system.

### 6.2. Make bare soil primarily a terrain-shader feature

The flax reference gains a lot from exposed earth between tufts.

Cheapest implementation:

- derive a third weight from the existing `groundPatch`;
- tint terrain toward soil/brown and suppress grass density in the same world-space region;
- optionally add subtle leaf-litter colour/noise there.

This gives large visible patches for almost no additional draw calls.

Then add only sparse physical accents near the player:

- a few existing pebbles/rocks;
- tiny twigs/leaves as instanced triangles/very small meshes;
- no shadows for litter;
- hard cap by profile.

This is preferable to covering the ground with many transparent decal layers.

### 6.3. Keep the current flower approach

The shader-cut one-quad flower head is excellent value. Do not replace it with high-resolution flower textures unless aliasing becomes a measured problem.

Add diversity through:

- size;
- stem height;
- species colour;
- patch density;
- rare taller stems.

The goal is not more total flowers; it is **readable flowers at multiple scales**.

---

## 7. Water

The planned water design is appropriate. Keep it deliberately cheaper than the scene.

### All profiles

- shallow/deep colour from local depth;
- shore fade;
- Fresnel;
- one or two moving normal samples depending on profile;
- sun glint;
- sky/horizon colour reflection;
- shared world-space coordinates across chunks.

Avoid SSR and avoid full-scene refraction.

### High only

One planar reflection target:

- half resolution initially;
- only when planar water is near the camera;
- terrain / trees / buildings / sky only;
- omit grass, particles and most actors;
- update every second frame initially;
- automatically off away from water.

If high `water-shore` cost is too large, reduce to quarter resolution or lower update frequency before dropping the visual effect entirely.

The reflection should be treated like a **budgeted local feature**, not a permanent second render of the game.

---

## 8. Lighting, fog and post effects

### Keep the current lighting topology

One shadow-casting directional sun is the correct baseline. Three.js shadow maps re-render shadow casters from the light; multiplying shadow-casting lights multiplies scene rendering work. Point lights for fire should remain unshadowed.

Do not add CSM/PCSS until a concrete shadow defect remains after:

- current texel snapping;
- tighter caster distance;
- good bias/normalBias;
- correct near-tree/actor caster selection.

### Atmosphere first

The references rely heavily on depth haze. The existing sky/fog system is already cheap and coherent, so tune it before adding volumetrics:

- slightly stronger far desaturation;
- horizon colour tied to the atmosphere;
- weather-dependent fog density;
- preserve foreground contrast;
- optionally add a cheap sun-facing scattering/glow term.

A good haze transition also hides LOD/impostor changes.

### Light shafts / bloom

The conifer reference uses strong sun shafts; the flax reference uses soft bloom. These are useful **finishing** effects, not foundations.

Recommendation:

- medium: no mandatory full-screen bloom/god-rays;
- high: test one low-resolution effect after trees and water are stable;
- avoid volumetric ray marching through the entire scene;
- a low-resolution radial/sun-shaft approximation or carefully authored light beam is enough for the target style.

Use the normal camera screenshots and motion test as the value gate. If the effect only looks good in a staged screenshot, drop it.

---

## 9. Shadows

Three.js documentation is explicit: every shadow-casting light introduces extra scene rendering, and point-light shadows are particularly expensive.

For SeedVales:

- one sun shadow only;
- low: keep shadows off and use contact/blob cues where needed;
- medium/high: real trees cast shadows only inside a bounded near range;
- impostors should normally not cast full geometry shadows;
- small grass/litter/flowers should not cast shadows;
- actors need shadows only in a useful near range;
- fire lights remain unshadowed.

Do not increase shadow-map resolution beyond the current 1024/2048 until caster selection and frustum use are proven insufficient.

---

## 10. Settlement performance: where the next major headroom is

The current high-profile settlement is more urgent than the grass.

### 10.1. Add subsystem draw-call attribution

The aggregate `renderer.info.render.calls` is not enough for optimization decisions. Add diagnostic counters or a controlled render isolation for:

- terrain;
- vegetation/grass;
- structures;
- actors;
- dynamic props/particles;
- shadow pass if practical.

The goal is to know what owns the 700–890 calls.

### 10.2. Actors are the first suspect

Current character assets commonly have several skinned mesh primitives/materials, plus separate head meshes.

Timebox one representative NPC in Blender/offline tooling:

- atlas compatible materials;
- join skinned parts sharing the same skeleton/material;
- preserve bones/weights/animations;
- aim for materially fewer draw calls without changing the visible silhouette.

Do not solve this with `InstancedMesh` or `BatchedMesh`; independently animated skeletons do not become one ordinary instanced draw just because the source mesh is similar.

A reduction from many material/mesh draws per visible NPC is likely more valuable in the settlement than reducing a few already-instanced houses.

### 10.3. Static heterogeneous props

For static objects that share one material but have different geometry, Three.js `BatchedMesh` is worth a targeted test. It is explicitly designed to reduce draw calls for that case and supports per-object frustum culling.

Use it only where the data shape fits. The existing structure templates already use effective instancing, so avoid rewriting them without evidence.

---

## 11. Asset pipeline: meshopt + KTX2 + Blender

### Keep meshopt

The project already uses `EXT_meshopt_compression` and Three.js `MeshoptDecoder`. Keep this. Meshoptimizer/gltfpack also performs vertex/index optimization, quantization, mesh simplification and optional mesh merging.

### Add a KTX2 pilot

PNG/JPEG file size is not GPU memory size. KTX2/Basis Universal allows Three.js to transcode one source texture into a GPU-native compressed format supported by the device.

Best first candidate: `nature.glb`, because it currently contains many separate 512-ish textures and is central to the visual upgrade.

Implementation:

1. Add `KTX2Loader`.
2. Call `detectSupport(renderer)`.
3. Connect it with `GLTFLoader.setKTX2Loader()`.
4. Convert only the nature pack first.
5. Measure: file size, load/decode time, first-frame/stutter, texture count, real-device memory/stability and visual artifacts.
6. Only then expand to village/characters.

Suggested encoding policy to test:

- ETC1S: colour/albedo where compact size matters;
- UASTC: normal/data maps if those are later introduced and ETC1S artifacts are visible.

Do not convert every texture blindly.

### Atlas only when it changes material/draw state

An atlas is useful when it allows multiple otherwise-separate materials to become one shared material. It is not automatically useful just because several images exist.

For the tree pack, a bark/leaf atlas shared across variants could be valuable. Preserve mip padding to avoid bleeding.

### Blender should be an authoring tool, not a runtime dependency

Good Blender tasks:

- tree leaf-card cleanup;
- LOD mesh authoring when automatic simplification damages silhouette;
- UV/atlas cleanup;
- baking normal/AO maps for hero/close assets;
- impostor atlas baking when the output matches the game look;
- rigging/skinning;
- merging character material regions while preserving skeletons;
- checking animations and contact.

Prefer scripts/glTF Transform/meshoptimizer for repeatable bulk conversion and validation.

---

## 12. Resolution and anti-aliasing

High profile currently allows DPR 2.0. Pixel cost grows with rendered pixel count, so this is one of the largest controllable GPU levers.

Recommended adaptive DPR experiment:

- low: keep fixed at 1.0 initially;
- medium/high: start at configured quality DPR;
- use the existing GPU timer when available, otherwise stable RAF pacing;
- lower DPR only after sustained overload, not one streaming hitch;
- raise it slowly after a long stable period;
- use hysteresis and coarse steps to prevent oscillation;
- never change world simulation or grass placement because of a one-frame spike.

This lets the game keep richer trees/grass/water when the bottleneck is fill-rate.

Do this **after** the new tree/water cost is known, not before; otherwise the regulator hides regressions.

---

## 13. Shader/program strategy

The renderer now has several `onBeforeCompile` customizations. They are valid, but shader-family growth should be controlled.

Recommendations:

- keep common wind/terrain/grass shader chunks centralized;
- use `customProgramCacheKey` for materially different `onBeforeCompile` variants;
- avoid generating per-object shader variants for look parameters that can be uniforms/instance attributes;
- precompile known material families after assets, lighting and scene environment are set.

Three.js r186 exposes `renderer.compileAsync()`, using `KHR_parallel_shader_compile` where available, specifically to reduce first-use shader compilation stalls. Use it for the stable set of nature/fire/water materials rather than discovering them during the first encounter.

---

## 14. WebGPU / TSL

Three.js r186 now treats TSL as its portable shader/node direction, and `WebGPURenderer` has a newer post-processing stack with MRT and pass combination. That is technically attractive.

It is **not** the next SeedVales optimization.

Reasons:

- current renderer is measured and working;
- the project has many custom GLSL `onBeforeCompile` paths;
- nature/water/actors are currently content and batching problems, not an API ceiling;
- a migration would mix renderer risk with visual work and make A/B attribution worse.

Recommended future path:

1. finish the current WebGL2 nature/effects/optimization waves;
2. for a new isolated shader, consider a TSL prototype only if it can also run under the WebGL compatibility path;
3. later create a separate WebGPU benchmark branch/worktree;
4. compare the same scenes and visual output before making an engine-level decision.

Do not rewrite current grass/tree shaders into TSL only for "future proofing" during this visual pass.

---

## 15. Techniques I would explicitly avoid now

- global conversion of terrain/vegetation/buildings to `MeshStandardMaterial`;
- global SSR;
- volumetric fog or ray-marched god rays;
- shadow-casting point lights;
- CSM before current shadow range/caster selection is exhausted;
- millions of individually managed grass blades;
- CPU-updated particles per particle per frame;
- transparent blended leaf cards when alpha-test works;
- runtime generation of expensive noise that can be evaluated once per tile/instance;
- a WebGPU migration as a performance fix;
- increasing high DPR/shadow resolution to hide weak assets;
- adding visual effects without a same-scene GPU/RAF A/B.

---

## 16. Recommended execution order

### Phase A — finish the nature silhouette

1. Tree real-model ring + LOD1.
2. Baked multi-view impostors from the same models.
3. Tree leaf wind/back-light.
4. Add a few additional tree variants with a controlled material family.
5. Re-measure `dense-forest`, `forest-edge`, march and startup.

### Phase B — ground composition

1. Soil/gap weight in `groundPatch`.
2. Use it both to tint terrain and suppress grass density.
3. Mixed grass height classes.
4. Sparse tall stems/flowers.
5. Sparse rocks/twigs/litter near the player.
6. Re-measure meadow/forest-edge and inspect ring transitions in motion.

### Phase C — water

Implement the cheap shader on all profiles; planar reflection high only. Measure `water-shore`, `lake-shore`, `river-bank`.

### Phase D — reclaim settlement budget

Profile draw calls by subsystem. Timebox character material/skinned-part consolidation. Test `BatchedMesh` only for suitable static heterogeneous props.

### Phase E — asset/memory pipeline

KTX2 pilot on nature; then decide whether village/characters need it. Bake production impostors offline. Add shader warm-up.

### Phase F — finish

Atmosphere tuning, then at most one high-profile post effect. Only then revisit selective PBR/tone mapping or WebGPU/TSL.

---

## 17. Acceptance / performance rules

Every graphics change should answer two questions independently:

**Does it look better at the normal game camera?**  
Use fixed seed/camera/weather/time frames plus a short movement capture. Close-up-only wins do not count for environment features.

**What did it cost on real hardware?**  
Use the existing Arc 140V path and, where possible, a target phone. Report:

- RAF p50/p95/p99;
- `gpu.frame` median/p95 when the disjoint timer is valid;
- `render.prep`;
- draw calls;
- triangles;
- shader program count;
- active texture/geometry counts;
- startup/load time for asset changes;
- long-run thermals/frame pacing on mobile for large visual changes.

Do not sum CPU and GPU timings as if they were serial. Do not treat SwiftShader FPS as real-GPU performance.

For a new effect, keep the project's existing stop rule: a visually useful change gets a measured budget; a cost spike with weak visible gain is removed or reduced.

---

## 18. Sources

Primary/current documentation checked on 2026-10-02:

1. Three.js — InstancedMesh: https://threejs.org/docs/pages/InstancedMesh.html
2. Three.js — BatchedMesh: https://threejs.org/docs/pages/BatchedMesh.html
3. Three.js — LOD: https://threejs.org/docs/pages/LOD.html
4. Three.js — Material (`alphaTest`, `alphaHash`, `alphaToCoverage`, `forceSinglePass`): https://threejs.org/docs/pages/Material.html
5. Three.js — WebGLRenderer (`setPixelRatio`, `renderer.info`, `compileAsync`): https://threejs.org/docs/pages/WebGLRenderer.html
6. Three.js — shadows manual: https://threejs.org/manual/pages/shadows.html
7. Three.js — optimize lots of objects / geometry merging: https://threejs.org/manual/pages/optimize-lots-of-objects.html
8. Three.js — KTX2Loader: https://threejs.org/docs/pages/KTX2Loader.html
9. Three.js — GLTFLoader (`setMeshoptDecoder`, `setKTX2Loader`): https://threejs.org/docs/pages/GLTFLoader.html
10. Three.js — Texture / mipmaps / anisotropy: https://threejs.org/docs/pages/Texture.html
11. Three.js — TSL guide, r186: https://threejs.org/tsl/
12. Three.js — WebGPURenderer: https://threejs.org/manual/pages/webgpurenderer
13. Three.js — WebGPU post-processing: https://threejs.org/manual/pages/webgpu-postprocessing.html
14. Khronos — glTF / KTX2 delivery: https://www.khronos.org/gltf/
15. Khronos — KTX: https://www.khronos.org/ktx/
16. Khronos — `EXT_disjoint_timer_query_webgl2`: https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/
17. meshoptimizer / gltfpack: https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md
18. Blender manual — glTF 2.0 export and baked normal/AO material workflow: https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html
19. MDN — WebGL best practices (smaller back buffer, GPU-compressed textures, VRAM budgeting): https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

Repository evidence used:

- `CLAUDE.md`
- `docs/state/PROGRESS.md`
- `docs/state/PERF.md`
- `docs/design/DECISIONS.md`
- `docs/plans/render--007--nature-pass.md`
- `docs/plans/render--001--weather-variety-effects.md`
- `docs/research/2026-10-01--002--realistic-visuals-practical-roadmap.md`
- `docs/reviews/2026-10-01--005--rendering-research-critical-review.md`
- `docs/assets/README.md`
- `src/game/render/Renderer.ts`
- `src/game/render/quality.ts`
- `src/game/render/terrainChunks.ts`
- `src/game/render/terrainMaterial.ts`
- `src/game/render/grass.ts`
- `src/game/render/grassPlacement.ts`
- `src/game/render/groundPatch.ts`
- `src/game/render/vegetation.ts`
- `src/game/render/structures.ts`
- `src/game/render/actors.ts`
- `src/game/render/assets.ts`
- `scripts/assets/build-assets.mjs`
- the three reference images listed in §3.

---

## 19. Bottom line

The current project is already past the stage where a generic "Three.js optimization checklist" is useful.

The shortest path to the target look is:

**credible trees across distance → non-uniform ground/grass composition → water → settlement draw-call recovery → compressed/offline asset pipeline → restrained atmosphere/post polish.**

The most important technical discipline is to keep doing what worked in the grass rework: **move work out of the hot shader/frame path, represent repetition with instances, change geometry by distance, and measure the final frame on real hardware.**
