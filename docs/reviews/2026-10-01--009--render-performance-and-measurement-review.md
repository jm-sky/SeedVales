# Independent render-performance and measurement review

**Review date:** 2026-10-01  
**Audited branch:** \`main\`  
**Audited commit:** \`bd2899bb3e02c3db8ffad2a66f8348dc09396934\`  
**Repository:** \`jm-sky/SeedVales-2\`  
**Scope:** \`src/game/render/\`, \`src/game/diag/\`, \`src/game/Game.ts\`, \`scripts/bench/\`, render A/B scripts, and the rendering plans/decisions.

## Executive conclusion

The implementation has a sensible foundation: terrain streaming has a per-frame build budget after startup, vegetation uses pooled \`InstancedMesh\` batches, actors are queried spatially, the renderer exposes useful \`renderer.info\` counters, and the optional GPU timer correctly treats an unavailable extension as “no data”.

The current evidence does not establish safe real-device performance. The strongest measured signal is already a real hitch in the existing headless data: teleport streaming produced \`render.vegetationRebuild\` p95 \`30.7 ms\` and \`render.cpu\` p95 \`74.8 ms\` in the documented medium run (PERF.md:66-84). That is a valid warning for load/respawn/debug jumps, but it is not evidence that ordinary travel is over budget. The planned walking measurement is still missing.

The largest measurement problem is not the percentile implementation alone. The benchmark deliberately warms away the most expensive first-frame work, runs all scenes inside one mutable game, does not compare render results against a render baseline, and does not exercise repeated game lifetime/quality transitions. It can therefore report a clean steady state while missing startup hitches, state contamination, resource retention, and transition spikes.

No new benchmark run was completed during this review. The local command executor was unavailable because of an execution-approval usage limit. The measured numbers in this report are therefore existing measurements from the repository, not fresh measurements made by this review.

## Implementation status at the audited commit

### Implemented and active

- Terrain chunk streaming, LOD rings, skirts, inland water meshes, and disposal of evicted chunk geometries: \`src/game/render/terrainChunks.ts:101-177\`.
- Near/far vegetation representation with pooled instanced meshes and rebuilds on movement/state changes: \`src/game/render/vegetation.ts:89-191\`.
- Actor spatial query, model/placeholder selection, animation mixers, and removal of visuals outside the actor query: \`src/game/render/actors.ts:292-350\`.
- Dynamic crops, flames, point-light pool, items, arrows, corpses, and precipitation: \`src/game/render/dynamics.ts:20-188\`.
- Renderer CPU timers, scene statistics, quality switching, shadows, sky/fog/lighting: \`src/game/render/Renderer.ts:42-224\`.
- Whole-run histogram timers, RAF interval recording, and optional \`EXT_disjoint_timer_query_webgl2\`: \`src/game/diag/perf.ts:8-172\` and \`src/game/render/gpuTimer.ts:1-75\`.
- Render benchmark and visual A/B script: \`scripts/bench/render-bench.mjs:1-170\` and \`scripts/e2e/ab.mjs:1-90\`.

### In progress or conditional

- \`render--002\` is \`in_progress\`. Step 0 code is present, but the plan explicitly says a clean baseline and device checklist are still pending (render--002:103-111).
- Step 2 light/sky work is scaffolding behind \`localStorage.sv-visual\`; defaults remain the old flat sky/no-tone-mapping path (render--002:111-114; \`visualFlags.ts:20-27\`).
- \`render--001\` is \`planned\`, not implemented as a new wave. Rain/snow and a seven-light pool already exist in the baseline; they must not be counted as completed work from that plan (render--001:19-31).
- \`render--003\` is \`draft\` and explicitly conditional on measured need. No costly optimization should be started from that catalogue without a device or headless phase showing the problem.

The flags \`tone\`, \`exposure\`, and \`sky\` are consumed by \`Renderer\`. The \`smooth\` and \`detail\` fields are declared in \`VisualFlags\` but have no consumer in the current render path. They are therefore not active implementations and should be described as reserved/non-functional A/B fields until code uses them.

## Findings

### F-01 — P1: vegetation rebuild can create real travel/load hitches

**Files/lines:** \`src/game/render/vegetation.ts:112-191\`; \`src/game/render/terrainChunks.ts:114-169\`; documented evidence \`docs/state/PERF.md:73,81-84\`.

**Scenario:** A player crosses a vegetation half-chunk, loads a save, respawns, or is moved by a debug/teleport operation.

**Evidence:** Existing medium data reports:

- \`render.vegetationRebuild\`: median \`4.9 ms\`, p95 \`30.7 ms\`, only 13 samples in the teleport-hitch case.
- \`render.cpu\`: \`13.1 / 74.8 ms\` median/p95 for the documented chunk-traverse/teleport workload.
- Chunk build reached a maximum of \`8.1 ms\), already at the stated \`8 ms\` budget.

The code rebuilds a complete visible vegetation instance description after the player changes the half-chunk key. It queries all nodes in \`vegFar\`, creates per-set arrays, fills instance matrices, and may replace an entire pooled batch when capacity is exceeded. Terrain also creates a new desired-chunk map and sorts pending work on every update.

**Impact:** A teleport/load hitch is proven. Ordinary walking is not yet proven over budget, because the planned steady march measurement is absent. The current implementation can also combine terrain streaming and vegetation rebuild work during the same frame.

**Minimal direction:** First measure real walking/running and cart movement across repeated chunk boundaries. If the p95 or maximum remains above the budget, prefetch a small ring and amortize node generation/instance filling while retaining the previous batch until the replacement is ready. Do not optimize the teleport-only case as if it were ordinary travel.

**Verification:** Add a fixed-seed walk/run/cart scenario that crosses at least 20 half-chunk boundaries. Report sample count, p50/p95/p99/max, pending chunks, vegetation instance count, and the number of rebuilds. Keep teleport as a separate hitch test.

**Classification:** measured problem for teleport/load; hypothesis for normal travel.

### F-02 — P1: the benchmark excludes the first-frame startup cost

**Files/lines:** \`src/game/render/Renderer.ts:204\`; \`src/game/render/terrainChunks.ts:101-169\`; \`scripts/bench/render-bench.mjs:82-100\`.

**Scenario:** New game from the menu, loading a save, or remounting after “New game”.

**Evidence:** The first renderer frame calls terrain update with \`this.first ? 4000 : 5\`, allowing up to four seconds of chunk-build work in one update. Vegetation is dirty initially and assets/actor visuals are created before or during the first active frames. The benchmark then waits for streaming to settle, resets the timers, and measures only the following six seconds.

**Impact:** The benchmark can pass while the first playable frame stalls. This is exactly the work a user experiences after new game/load and it is absent from the reported p95.

**Minimal direction:** Add a separate startup result, not part of the steady-state gate. Measure from game mount through the first stable HUD/render window, with first-frame \`render.prep\`, first-frame \`render.cpu\`, chunk count, vegetation rebuild, actor creation, asset load, and time-to-first-playable-frame. Keep the existing steady-state warm-up semantics for the normal gate.

**Verification:** Run a fixed seed from a fresh browser context three times per quality. Report first-frame max and startup wall time separately from the steady-state p95. Do not move the startup sample into the steady-state baseline.

**Classification:** static code evidence; user-visible impact is highly plausible but not freshly measured here.

### F-03 — P1: dynamic rendering performs full ground/corpse scans every frame

**Files/lines:** \`src/game/render/dynamics.ts:67-153\`.

**Scenario:** Long play sessions with many dropped stacks, lit dropped torches, and corpses.

**Evidence:** Each \`Dynamics.update()\` performs:

- a full \`sim.state.ground\` scan to find lit ground fires;
- another full \`sim.state.ground\` scan to build visible item instances;
- a full \`sim.state.corpses\` scan for corpse visuals.

Only the building fire query is range-limited. The loops then apply distance checks after iterating the complete arrays.

**Impact:** Frame cost grows with total historical ground/corpse state rather than nearby objects. A player can be in an empty forest and still pay for all dropped items and corpses created elsewhere. This is also a direct long-session scaling risk and is not covered by the current render scenes.

**Minimal direction:** Use the existing spatial-query pattern for nearby ground and corpses, or maintain render-facing nearby indexes. Preserve the current hard visual caps, but make the cap operate on a bounded nearby result rather than after a whole-world scan.

**Verification:** Add a render scene with identical nearby content and 0, 1,000, and 10,000 far-away ground/corpse entries. The nearby render timings and draw counts should remain effectively flat. Measure the query itself separately from matrix filling.

**Classification:** measured by static code; runtime magnitude is not measured.

### F-04 — P1: avoidable per-frame allocations exist in hot render paths

**Files/lines:** \`src/game/render/actors.ts:327-328\`; \`src/game/render/dynamics.ts:70,86,95-138\`; \`src/game/render/Renderer.ts:170\`; \`src/game/render/atmosphere.ts:54,67\`; \`src/game/render/terrainChunks.ts:114,150\`.

**Scenario:** Normal gameplay with visible actors, fires/items/projectiles, lighting updates, and terrain streaming.

**Evidence:** Examples include:

- two new \`THREE.Vector3\` objects per visible actor update for interpolation/distance;
- a new \`Matrix4\` per dynamics update, plus vectors/quaternions for crops, fires, lights, items, and projectiles;
- a new cloned/scaled storm color on every flat-path lighting update;
- a new storm color and a new \`Color\` passed to \`lerp\` on every atmosphere update;
- new \`Map\`/array structures and sorting in terrain update, even when no rebuild is needed.

**Impact:** These allocations increase garbage-collection pressure and can turn otherwise acceptable CPU work into intermittent frame spikes. The current timers aggregate the work but do not identify GC pauses or allocation volume, so a clean p95 does not disprove this mechanism.

**Minimal direction:** Reuse scratch vectors/quaternions/matrices and stable temporary arrays in the per-frame paths. Avoid changing algorithms until a profiler or allocation counter shows this is material; the first action should be measurement, not a broad rewrite.

**Verification:** Use a real browser performance recording and, where available, allocation instrumentation. Compare a fixed 60-second scene with diagnostics on/off and record heap slope plus long-task/frame-pacing outliers. A successful change must reduce allocation/GC evidence without changing scene load.

**Classification:** static code evidence and hypothesis about the size of the hitch.

### F-05 — P1: renderer-child resources have no explicit lifecycle disposal

**Files/lines:** \`src/game/Game.ts:156-165\`; \`src/game/render/Renderer.ts:42-224\`; \`src/game/render/dynamics.ts:20-65\`; \`src/game/render/terrainChunks.ts:172-177\`; \`src/game/render/actors.ts:206-210\`; \`src/ui/GameView.vue:40-42\`.

**Scenario:** Repeated in-game “new game”, quit to menu, load, and quality changes.

**Evidence:** \`Game.stop()\` disposes the WebGLRenderer, forces context loss, disposes the GPU timer, detaches controls, and closes audio. There is no renderer-level disposal that explicitly removes/disposes the ocean, terrain material, precipitation geometry/material, dynamic meshes/materials/lights, target marker, cart geometries, pooled vegetation meshes, actor-specific cloned materials, or sky-dome resources. Context loss releases GPU-side context resources, but it does not release JavaScript object graphs while references remain.

The debug API stores the complete \`Game\` in \`window.__sv\` (\`src/game/debug/api.ts:48-53,145-146\`). It is not cleared when \`GameView\` unmounts. The two once-only audio unlock listeners are attached to \`window\` (\`Game.ts:92-94\`) and are not removed by \`stop()\` if they have not fired.

**Impact:** At minimum, the stopped game remains reachable through \`window.__sv\` while the menu is shown. If the audio gesture has not happened, its closures can retain old games across repeated mounts. Explicit child disposal is also missing, making it difficult to distinguish a true leak from browser/driver retention. The global GLTF cache in \`assets.ts\` is intentional reuse, but it means asset memory is not expected to return to the pre-game level.

**Minimal direction:** Add one idempotent renderer disposal path, remove/neutralize the debug global on unmount, and retain removable references for the audio unlock listeners. Do not dispose shared cached GLTF materials/geometries from one renderer; use ownership rules and only dispose resources created exclusively by that renderer.

**Verification:** Add a browser lifecycle scenario: create a game, run 30 seconds, quit, repeat 10 times, and sample JS heap after forced GC where available. Record live WebGL contexts, renderer geometries/textures/programs, and the retained \`window.__sv\` value. A plateau after the intentional global asset cache is expected; a positive slope after cache warm-up is not.

**Classification:** static code evidence; leak magnitude is not measured.

### F-06 — P1/P2: light and shadow work is not actually bounded by quality profile

**Files/lines:** \`src/game/render/dynamics.ts:16-65\`; \`src/game/render/Renderer.ts:62-78\`; \`docs/plans/render--001--weather-variety-effects.md:22\`.

**Scenario:** Low quality at night, scenes with several fires, and quality switching.

**Evidence:** The scene always contains six pooled fire \`PointLight\` objects plus \`playerLight\`. Setting intensity to zero does not remove lights from the scene or from the shader light count. The plan itself records that this is seven point lights in every lighting program and that there is no per-profile limit. Low quality disables the sun shadow map, but the point-light pool remains.

**Impact:** This is an unmeasured GPU/shader and light-evaluation cost. The current \`render.lights\` gauge counts visible lights through scene traversal, not active non-zero lights; \`render.pointLights\` is the more relevant active count but is not collected by \`render-bench.mjs\`. The headless SwiftShader draw time cannot establish device GPU cost.

**Minimal direction:** Do not change the pool until device or a representative hardware GPU capture shows a problem. If needed, keep the pool size/profile policy explicit and collect both total scene lights and active lights. Prefer emissive-only distant fires as already planned.

**Verification:** On a real laptop and phone, compare low/medium/high with 0, 1, 3, and 6 fires, measuring RAF p95/p99, GPU timer where available, and shader program/light counts. Check night-plus-rain-plus-fire as a combined overdraw case.

**Classification:** measured architectural fact; performance impact is a hypothesis until hardware data exists.

### F-07 — P2: actor draw-call cost is visible but not yet proven to justify an optimization

**Files/lines:** \`src/game/render/actors.ts:160-204\`; \`docs/state/PERF.md:66-84\`; \`docs/plans/render--003--visual-polish-and-optimization.md:15-26\`.

**Scenario:** Crowded settlements with many human skinned meshes.

**Evidence:** Existing documentation reports approximately 7–12 draw calls per character and 353–425 total draw calls in the measured settlement scenes, with approximately 0.93–1.08M triangles. The actor meshes explicitly set \`frustumCulled = false\`.

**Impact:** This is a credible candidate for hardware GPU/driver cost, but there is no proof that actors are the current bottleneck on the target laptop or phone. A premature atlas/rig rewrite would be expensive and risky.

**Minimal direction:** Keep the issue conditional as \`render--003\` does. First collect a real-device frame/GPU profile and separate actor cost from terrain/lighting. Do not start a global character merge based only on draw-call count.

**Verification:** A settlement scene with fixed actor count (for example 0/10/25/50 visible humans), same camera and quality, with hardware RAF/GPU measurements. Confirm visual/animation correctness before considering a one-rig spike.

**Classification:** measured draw-call/triangle fact; bottleneck status is a hypothesis.

### F-08 — P2: runtime quality changes are not benchmarked as transitions

**Files/lines:** \`src/game/render/Renderer.ts:105-129\`; acceptance coverage \`scripts/e2e/acceptance.mjs:500-566\`.

**Scenario:** Medium → high → low while the game is running, then new game/load.

**Evidence:** \`setQuality()\` changes pixel ratio, shadow state and shadow-map size, disposes/recreates the shadow map when needed, updates terrain/vegetation/actors, and traverses the whole scene marking materials for update when shadows change. The acceptance test verifies the resulting settings, but it does not capture the transition frame or subsequent shader compilation/rebuild cost.

**Impact:** A user can experience a one-frame or multi-frame hitch that all static-profile benchmarks miss. Repeated high/low changes can also expose resource churn.

**Minimal direction:** Add a transition scenario to the benchmark, but keep its result separate from steady-state baselines. Capture the frame containing the switch and the next 2–3 seconds. Do not change antialiasing live; the code correctly documents that it stays as created.

**Verification:** Repeat medium→high→low→medium five times after warm-up. Report transition max/p95, chunks pending, geometries/textures/programs before/after, and whether the first post-switch frame compiles shaders.

**Classification:** static code evidence; magnitude unmeasured.

### F-09 — P2: render benchmark scenes are not isolated or fully deterministic

**Files/lines:** \`scripts/bench/render-bench.mjs:24-62,94-102\`; \`src/game/debug/api.ts:69-76,129-137\`; \`src/game/Game.ts:623-628\`.

**Scenario:** Comparing scene rows within one \`bench:render\` run.

**Evidence:**

- One game is created and all scenes mutate the same simulation.
- \`setHour()\` changes calendar time but does not reset weather, lit buildings, NPC/animal positions, ground items, corpses, or other mutable state.
- The night scene sets every torchpost/campfire lit, and later scenes do not clear those flags.
- The setup silently falls through if the water-shore search finds no valid location; there is no assertion that the intended scene was installed.
- Teleport changes player position and calls the actor index update, but does not reset camera distance/yaw/pitch or all renderer warm state.
- The game RAF continues while setup functions mutate state, so simulation and rendering can advance between setup and the warm-up boundary.

**Impact:** Later rows can inherit fire, weather, accumulated actors/items, camera state, and JIT/renderer state from earlier rows. Results are useful as a single exploratory run but weak as independent scene comparisons.

**Minimal direction:** Use a fresh game/browser context per scenario, or implement a complete scenario reset including calendar, weather, lit objects, mutable collections, camera, and renderer warm state. Fail loudly when a locator cannot find its intended scene.

**Verification:** Run each scene three times in a fresh context and compare the installed state snapshot before warm-up. The snapshot should include player/camera, hour/season, weather, nearby actors, ground/corpse counts, lit fires, chunks, and vegetation instances.

**Classification:** static benchmark design issue.

### F-10 — P2: render results have no render-baseline comparison or regression gate

**Files/lines:** \`scripts/bench/render-bench.mjs:157-170\`; \`scripts/bench/baseline.json:2-10,543-567\`; \`docs/plans/render--002--visual-foundation-and-render-metrics.md:86-114\`.

**Scenario:** A render regression is introduced and \`pnpm bench:render\` is run.

**Evidence:** The render script writes \`render-<quality>-latest.json/md\` and prints rows, but never loads a baseline or computes a delta/pass/fail. The only repository baseline shown is \`scripts/bench/baseline.json\`, which is for \`bench:sim\` and records commit \`3632d15\`, not the audited main. The plan explicitly marks a clean render baseline as pending.

**Impact:** A developer receives numbers but no automated signal that p95 preparation, max rebuild time, draw calls, programs, triangles, or memory changed. This creates a strong false sense of safety, especially because the documentation contains older measurements while the code has moved on.

**Minimal direction:** After the clean step-0 baseline is produced twice, add a render baseline with explicit metric classes: gate \`render.prep\`, supporting CPU phase metrics, instantaneous renderer-info counts, and non-gated SwiftShader draw/RAF data. Preserve fixed budgets and do not refresh a baseline to hide a regression.

**Verification:** Run baseline and candidate under the same environment and seed. Print absolute and percentage deltas, sample counts, and “inconclusive” for changes below the documented noise threshold. Require manual confirmation for a baseline update.

**Classification:** confirmed tooling gap.

### F-11 — P2: short headless samples make tail statistics fragile

**Files/lines:** \`scripts/bench/render-bench.mjs:65-79,82-100\`; \`src/game/diag/perf.ts:53-83\`; \`docs/state/PERF.md:36,73,81\`.

**Scenario:** SwiftShader render benchmark, where draw submission is slow.

**Evidence:** The script measures only six seconds after warm-up. It prints p95/p99/max but hides the sample count in the Markdown for most metrics; only vegetation includes \`n=\`. Existing hitch data has only 13 vegetation samples. With small n, p95/p99 are effectively order-statistic choices near the maximum, while one rare hitch can be missed or dominate the result depending on the sample count.

The histogram is useful for long runs, but \`quantile()\` uses \`floor(p * count)\` as the zero-based target, not an explicitly documented percentile convention. \`shareAbove()\` counts only buckets strictly above the threshold bucket, so values above the threshold but still inside the same 2% bucket are omitted.

**Impact:** Percentile results are not necessarily wrong, but their confidence and threshold semantics are unclear. Comparing rows with different sample counts is unsafe. The current test covers a broad case but not threshold-edge values or small-n behavior.

**Minimal direction:** Report sample counts for every metric, minimum duration/sample count, and an “inconclusive” state for small n. Define the percentile convention and add exact edge tests. For RAF budget shares, either retain raw samples for the short window or use a bucket method that accounts for the threshold bucket conservatively.

**Verification:** Test 1, 2, 20, 60, 100, and 1,000 samples with known sorted values; test thresholds just below, equal to, and just above values in one histogram bucket. Compare the histogram result with an exact reference implementation.

**Classification:** confirmed measurement-quality issue.

### F-12 — P2: diagnostic overhead is included in the measured work and is not A/B controlled

**Files/lines:** \`src/game/diag/perf.ts:88-145\`; \`src/game/render/Renderer.ts:197-224\`; \`scripts/bench/render-bench.mjs:65-79\`.

**Scenario:** Render-preparation gate and frame CPU budget.

**Evidence:** \`perf.enabled\` is true by default and the render benchmark does not run a diagnostics-off control. \`render.prep\` surrounds the preparation work, and every frame performs timer calls, histogram pushes, map writes, gauges, and renderer-info reads. \`render.vegetation\` also wraps \`Vegetation.update()\`, while vegetation adds a nested \`render.vegetationRebuild\` timer. The periodic \`lightCount()\` scene traversal is included in \`frame/render.cpu\` but is not timed separately.

**Impact:** A small but systematic diagnostic cost is treated as game cost, while any periodic diagnostic spike can be mistaken for a renderer regression. Without a control run, the report cannot state how much of the gate is instrumentation.

**Minimal direction:** Add a benchmark switch that runs the same scenario with base diagnostics disabled, while preserving a separate diagnostic-on run for observability. Do not subtract timings after the fact; measure the control. Keep detailed subsystem timing off unless explicitly requested.

**Verification:** Same browser/context/scene, alternating diagnostics-on/off, at least three repetitions. Report overhead as a separate result and verify that the gate remains valid with diagnostics enabled.

**Classification:** confirmed tooling gap; magnitude unmeasured.

### F-13 — P2: memory coverage is only a single non-portable heap snapshot

**Files/lines:** \`scripts/bench/render-bench.mjs:71-79\`; \`scripts/bench/sim-bench.ts:171-186\`; \`src/game/Game.ts:156-165\`.

**Scenario:** Long travel and repeated new-game/menu/load lifecycle.

**Evidence:** The render benchmark records \`performance.memory.usedJSHeapSize\` once at collection time, if the non-standard API exists. It does not force GC, compute a before/after delta, record a slope, or sample after a renderer stop. The long-run simulation benchmark does have a Node heap delta, but it does not exercise Three.js/WebGL or render lifetimes. The Game stop path has no child-resource disposal contract.

**Impact:** A growing heap or retained render graph can remain invisible. GPU memory is not exposed by this metric at all. A single high heap value after asset caching is not a leak proof, and a low value before GC is not a no-leak proof.

**Minimal direction:** Add a dedicated lifecycle/memory scenario rather than folding memory into the frame gate. Use browser GC only when explicitly available, record several post-GC points, and separate intentional asset-cache residency from per-game residency.

**Verification:** Ten new-game→quit cycles plus three save-load cycles, with a warm-up cycle discarded. Record JS heap, geometries, textures, programs, contexts, pooled mesh counts, and retained debug globals. No conclusion about GPU memory should be made without a browser/device-specific memory tool.

**Classification:** confirmed coverage gap.

### F-14 — P2: the A/B script is reproducible in intent but not an automated visual/performance decision

**Files/lines:** \`scripts/e2e/ab.mjs:23-90\`; \`src/game/render/visualFlags.ts:20-27\`.

**Scenario:** Comparing flat/dome/tone-mapping variants.

**Evidence:** Each variant gets a new page and a new game, then six named frames are captured. This is good isolation between variants. However, the script only writes screenshots and a montage; it does not calculate image differences, verify camera/state snapshots, or record render-prep/draw-call deltas for each variant. The flag parser accepts unchecked JSON values, and the current \`smooth\`/\`detail\` fields are not consumed.

The plan records that an earlier A/B run had one 404 console error (render--002:111-114). The script reports errors but does not fail the run on them.

**Impact:** A visually different or broken frame can be accepted by human inspection, and a performance regression in a visual variant can go unnoticed. The 404 also weakens confidence in the prior montage until identified.

**Minimal direction:** Keep the montage, add a state/camera manifest and console-error failure policy, and record CPU/info metrics per variant. Validate flag values before applying them. Do not turn screenshot pixel equality into a visual-quality oracle; use it as a change detector.

**Verification:** Same variant list, same frame manifest, no console errors, identical camera/player/weather snapshots, and a sidecar table of \`render.prep\`, draw calls, triangles, programs, textures, and lights.

**Classification:** confirmed tooling gap; visual consequence depends on the unresolved 404.

### F-15 — P2: the “march” scenario is synthetic rather than a real gameplay travel path

**Files/lines:** \`scripts/bench/render-bench.mjs:104-145\`.

**Scenario:** Long physical travel through chunk boundaries.

**Evidence:** The script directly assigns \`sim.player.x/z/y/rot\` and calls \`sim.actors.update(p)\` from a second RAF callback. It does not use \`Game.frame()\`, normal input, collision, movement stamina, cart state, activity state, or the complete simulation/render cadence as a player would experience it.

**Impact:** It is useful for isolating spatial streaming, but it does not validate actual walking/running/cart travel. It may under-test collision and simulation work and may race the ordinary Game RAF loop.

**Minimal direction:** Keep this synthetic test as a lower-level streaming test and add a separate real-play scenario driven through input/debug intent, with a fixed route and the same frame loop. Do not replace one with the other.

**Verification:** Compare synthetic and real movement on the same route. Record movement speed, chunk boundaries crossed, simulation ticks, vegetation rebuilds, terrain builds, and frame pacing.

**Classification:** confirmed scenario limitation.

### F-16 — P2: device and hardware-GPU evidence is still absent

**Files/lines:** \`CLAUDE.md\` performance commands/limitations; \`docs/state/PERF.md:1-17,84\`; \`src/game/render/gpuTimer.ts:1-75\`.

**Scenario:** Target laptop and phone.

**Evidence:** The repository correctly warns that headless Chrome uses SwiftShader and that FPS/GPU time are not representative. The optional GPU timer is only useful when the device exposes the extension. No real-device result is committed, and the plan keeps this as an explicit user step.

**Impact:** Shadow cost, point-light cost, overdraw, shader complexity, and actor draw-call cost remain unverified where they matter. Headless \`render.prep\` can still guide pure JS comparisons, but it cannot certify 30/60 FPS.

**Minimal direction:** Do the small device matrix listed at the end of this report before enabling expensive visual defaults or starting render--003 optimizations.

**Verification:** Use a production build, fixed scenes, fixed camera, 30 seconds of warm-up, three alternating 60-second samples, and a 10–15 minute mobile run. Record RAF p50/p95/p99, slow-frame shares, GPU timer when available, quality, pixel ratio, viewport, browser/device, and console errors.

**Classification:** confirmed missing evidence.

## Reliability assessment of the current benchmarks

### What the current benchmarks can detect

- Pure simulation regressions in the Node benchmark, with fixed seed and explicit load scenes.
- Relative JS phase changes inside the same headless environment: \`render.prep\`, terrain build, vegetation rebuild, actor preparation, and some renderer-info counts.
- Large streaming hitches when they occur during the six-second collection window.
- Gross changes in draw calls, triangles, shader program count, geometry count, and texture count at the final collected frame.
- Basic A/B image differences, provided a human reviews the generated montage.

### What they can miss or misrepresent

- First-frame new-game/load hitch, because it is warmed out before \`perf.reset()\`.
- Real-device GPU/driver cost, because draw/FPS/SwiftShader numbers are not portable.
- Repeated lifecycle leaks, because render benchmark uses one game and one browser page and only samples current JS heap.
- Quality-switch hitches, because profiles are selected before game creation except for functional acceptance coverage.
- Rare stalls when the sample count is small, or when a hitch happens outside the six-second window.
- State-independent scene comparisons, because scenes share one mutable game and later scenes inherit state.
- Far-away ground/corpse scaling, because no render scene increases these lists.
- True player travel, because the march writes position directly.
- A clean baseline regression decision, because render-bench has no baseline comparison.
- Diagnostic overhead, because there is no controlled diagnostics-off run.
- GPU memory/context retention, because \`renderer.info\` is not a memory profiler and \`performance.memory\` is JS-only/non-standard.

### Measurement errors or ambiguities to resolve

1. Replace the stale “bounded ring buffer” wording in \`perf.ts:1-10\`; the current implementation is a whole-run histogram.
2. Document percentile rank semantics and test small sample counts.
3. Fix or explicitly conservatively define \`shareAbove()\` threshold behavior.
4. Print sample counts for every render metric.
5. Separate startup, steady-state, transition, and teleport-hitch result classes.
6. Add a render baseline only after two clean same-environment runs; mark noisy deltas inconclusive instead of refreshing the baseline.
7. Report active point lights separately from total visible lights.
8. Make failed scene locators and console errors fail the benchmark.
9. Add diagnostics-on/off control runs.
10. Add a lifecycle/memory benchmark that is intentionally not part of the FPS/render-prep gate.

## Three most important actions

1. **Make the render benchmark trustworthy:** isolate each scene, add startup and quality-transition scenarios, assert setup success, print sample counts, add a render baseline/delta gate, and keep teleport separate from ordinary travel.
2. **Measure lifecycle and scaling risks:** add real repeated new-game/menu/load cycles and scenes with many far-away ground items/corpses; clear \`window.__sv\` and close listener/resource ownership paths as part of the lifecycle contract.
3. **Measure ordinary travel on real hardware before optimizing:** add real walk/run/cart route measurements and collect device RAF/GPU data. Only then decide whether vegetation amortization, light-pool reduction, actor draw-call work, or another optimization is warranted.

## Minimal real-device measurement set

Use a production build and the same seed/scene manifest on the target laptop and phone:

- low, medium, and high quality where supported;
- settlement noon with 10/25/50 visible humans;
- forest walk/run across at least 20 chunk boundaries;
- night with 0/1/3/6 fires and the player torch;
- rain and snow at a settlement;
- water shore and mountain/river;
- medium→high→low→medium transition five times;
- ten new-game→quit cycles and three save-load cycles for lifecycle observation;
- 10–15 minutes of mobile play after a 30-second warm-up.

Record: viewport and device pixel ratio, browser/GPU, quality, RAF p50/p95/p99, shares above 16.7/33.3/50 ms, frame CPU p50/p95/p99, GPU timer p50/p95/p99 when available, draw calls, triangles, programs, active/total lights, geometries, textures, chunks, vegetation rebuild count/max, console errors, and post-GC JS heap points if the browser permits them.

## Explicitly not measured in this review

- No fresh \`pnpm bench:render\` run.
- No fresh \`scripts/e2e/ab.mjs\` run or screenshot review.
- No real laptop or phone RAF/GPU measurement.
- No browser allocation profile or forced-GC lifecycle run.
- No GPU-memory measurement.
- No direct reproduction of the documented \`30.7 ms\` vegetation p95; it is cited from the repository’s existing PERF report.
- No proof that the full ground/corpse scans or per-frame allocations currently exceed a device budget; those are code-level risks requiring the verification scenarios above.
