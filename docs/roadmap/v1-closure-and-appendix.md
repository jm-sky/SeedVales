# Roadmap: v1 closure → VISION-APPENDIX (v2)

**Created:** 2026-09-30  
**Domains:** all  
**Updated:** 2026-10-01 — (1) wave 4 split (foundation → effects), new wave 6 (visual polish/optimisation) and perf gates per [research 002](../research/2026-10-01--002--realistic-visuals-practical-roadmap.md) / [review 005](../reviews/2026-10-01--005--rendering-research-critical-review.md); (2) side tracks from [review 009](../reviews/2026-10-01--009--render-performance-and-measurement-review.md) (benchmark trust) and [research 003](../research/2026-10-01--003--blender-mcp.md) (offline asset pipeline) scheduled against the waves — see "Side tracks"; [review 008](../reviews/2026-10-01--008--save-load-review.md) needs no further work (no save compatibility before release, D-SAVE-7); (3) survival follow-up from VISION-APPENDIX (campfire fuel, hearth, standing torches, waterskins) as stage 4s `survival--001` (D-PLAN-6). Translated to English (D-LANG-1).  
**Sources:** [VISION.md](../VISION.md), [VISION-APPENDIX.md](../VISION-APPENDIX.md), [review v1](../reviews/2026-09-30--001--v1-review.md), [DEVELOPER-CALIBRATION-TOOLS.md](../DEVELOPER-CALIBRATION-TOOLS.md)

Order agreed with the user on 2026-09-30: **close v1 first, then the vision appendix in waves**. A wave starts only when the previous one is `done` (or its leftovers are explicitly deferred in DECISIONS). Plans inside a wave can go in any order if they are independent. Side tracks are not waves: each is tied to a **trigger** (the wave step it must precede), not to a calendar slot.

Appendix requirements are in `docs/state/FEATURES.json` with `scope: "v2"` and status `planned` (`vision: "APPX: <section>"`).

## Stage 0 — v1 closure (done)

| Plan | Scope | Status |
|---|---|---|
| [game--002--v1-review-fixes](../plans/game--002--v1-review-fixes.md) | review fixes: economy/resources, save↔genVersion, AI loops, multi-seed WORLD-04 | done |
| [diag--001--sim-hotspots-and-perf-report](../plans/diag--001--sim-hotspots-and-perf-report.md) | O(n×m) → spatial query, scan audit, `docs/state/PERF.md` | done |
| (in PROGRESS) | RES-04 seasonal yield test; WORLD-10 explicitly "not listened to" | done |
| [review 002](../reviews/2026-09-30--002--v1-closure-review.md) | independent stage-0 review + fixes | done |

**Stage 0 closed 2026-09-30 — v1 declared (PROGRESS.md).**

## Wave 1 — simulation and AI (done)

| Plan | Scope |
|---|---|
| [sim--001--ai-cadence-and-animal-threat](../plans/sim--001--ai-cadence-and-animal-threat.md) (done) | ~1 s decision cadence per species/state + forced critical reaction; domestic animals flee to herder/pen; wild animals fear humans/fire/pens with exceptions (young, den); interruptible carcass eating; blood traces (sim) attract predators |

## Wave 2 — UI and screens (done)

| Plan | Scope |
|---|---|
| [ui--001--character-screens-map-settings](../plans/ui--001--character-screens-map-settings.md) (done) | character screen, filtering/sorting, item details, big map, minimap with arrow, graphics/volume settings, new game, named saves, `Tab` target cycle |

## Wave 3 — economy, relations, companions (done)

| Plan | Scope |
|---|---|
| [economy--001--gathering-cooking-transport](../plans/economy--001--gathering-cooking-transport.md) (done) | felling → stump, rock breaking, cooking at campfire/pan/grill with product parameters, wheelbarrow/cart |
| [npc--001--trade-gifts-companions](../plans/npc--001--trade-gifts-companions.md) (done) | trade with any NPC, gifts and preferences, companions (hire/free join), equipment hand-over and use |

Review [006](../reviews/2026-10-01--006--wave3-review.md) triaged — 11 fixed with regression tests, 1 rejected, 3 info/deferred. Reviews [008](../reviews/2026-10-01--008--save-load-review.md) and [009](../reviews/2026-10-01--009--render-performance-and-measurement-review.md) triaged in session 4 (code fixes done; the rest → side tracks below).

## Wave 4 — visuals

The order inside the wave is a technical dependency (D-REN-7): weather and fire effects use the shared light/sky and the uniform-driven terrain material, so the foundation comes first. Every step has a timebox, a fallback and a keep/drop decision.

| Stage | Plan | Scope |
|---|---|---|
| 4a | [render--002--visual-foundation-and-render-metrics](../plans/render--002--visual-foundation-and-render-metrics.md) (in progress, steps 0–1 done) | render metrics + baseline gate (done) → time-sliced vegetation rebuild (done) → light, tone mapping, sky, fog → smooth terrain normals + ground detail + tint via uniforms → selective PBR+IBL pilot on one asset → (optional) ground contact |
| 4b | [render--001--weather-variety-effects](../plans/render--001--weather-variety-effects.md) | fire flipbook + per-profile light pool, clouds in the sky material + better precipitation, wet ground/snow on uniforms, character variety (no extra draw calls), animal scale/tint, vegetation wind, water without a scene reflection render, blood decals |
| 4s | [survival--001--fire-fuel-torches-waterskins](../plans/survival--001--fire-fuel-torches-waterskins.md) | *(sim, after 4a, before 4b)* campfire fuel/burn time/size + ash trace, stone hearth (settlement hearths fed by NPC duty), standing torch (plant, light/extinguish, 4–6 h burn), waterskin recipes; one `SAVE_VERSION` bump. Feeds `render--001` step 1 (`fireLevel`) and step 8 (ash decals). Waterskin recipe may go any time. |
| — | [tools--001--calibration-lab](../plans/tools--001--calibration-lab.md) | *(optional, before/with 4b)* Asset/Character/Equipment Lab on production code — helps calibrating character variants and held weapons |

CHAR-01 and FAUNA-09 (render--001 steps 4–5) do not depend on 4a and may go in parallel. Exit gates of 4a and 4b: in the plans (≤ 10% p95 regression of `render.prep` per package vs the render baseline, D-PERF-3; screenshots from the same frames; device performance as ❓ for the user — D-PERF-2).

**Side-track triggers inside wave 4** (details below): `diag--002` step 1 (startup) **before** `render--002` step 3 (terrain changes chunk build cost, which only startup and streaming expose); `diag--002` step 5 (real travel) **before** `render--001` step 6 (wind) / step 9 (ground clumps); `render--004` steps 1–2 (asset audit + node-name guard) any time during 4b.

## Wave 5 — world and settlement

| Plan | Scope |
|---|---|
| [world--001--landmarks-and-treasure](../plans/world--001--landmarks-and-treasure.md) | generator landmarks, treasure (buried, chests, rarely inside a predator), valuables |
| [settlement--001--mayor](../plans/settlement--001--mayor.md) | *(draft)* player becomes mayor at high reputation/relations; expansion decisions — depends on SET-04 (settlement growth, deferred) |

**Side-track triggers for wave 5:** landmark models (stone circle, shipwreck, boat wreck, ruins beyond partial village modules) come from `render--004` step 3 — or procedural geometry if that step is skipped.

## Wave 6 — visual polish and graphics optimisation (conditional)

| Plan | Scope |
|---|---|
| [render--003--visual-polish-and-optimization](../plans/render--003--visual-polish-and-optimization.md) | *(draft)* device measurements; items only for a measured problem: adaptive resolution, one AO/bloom/AA pass (medium/high), KTX2, character draw-call reduction, vegetation spatial batches/culling, shadow-caster limits, LOD fade, PBR pack rebuild, asset geometry optimisation |

After wave 5, because only then the scene has its target density. No measured problem = item closed as "not needed". **Inputs required before it leaves `draft`:** `diag--002` steps 2–4 (transitions, diagnostics overhead, lifecycle/memory) and the `render--004` audit table; device data (D-PERF-2) when the user provides it.

## Side tracks (from review 009 and research 003)

Critical assessment, in short: the cheap, high-value parts go early and are tied to the step whose risk they cover; the expensive or speculative parts wait for evidence. Nothing here changes a budget or baseline to absorb a result.

| Plan | What | When (trigger) | Why this placement |
|---|---|---|---|
| [diag--002--render-benchmark-trust](../plans/diag--002--render-benchmark-trust.md) — **tier A** (steps 1, 5) | startup result class; real-input travel | step 1 before `render--002` step 3; step 5 before `render--001` step 6 | The steady-state gate cannot see the two places where the upcoming work adds cost: chunk/terrain build at startup and streaming while walking (F-01 was found exactly there). |
| `diag--002` — **tier B** (steps 2–4) | quality transitions, diagnostics overhead, lifecycle/memory | before `render--003` leaves `draft` (wave 6) | Only needed to decide adaptive resolution / quality switching and to trust long sessions; nothing earlier depends on them. |
| `diag--002` — **tier C** (steps 6–7) | fresh context per scene; per-variant A/B metrics table | only if a verdict comes out `inconclusive` twice or scene contamination is suspected | Partly covered already (scene reset, failing locators, console errors fail the run). Otherwise closed as "not needed". |
| [render--004--asset-pipeline-and-audit](../plans/render--004--asset-pipeline-and-audit.md) | asset audit, node-name guard test, source/credits rules (step 1–2); authoring of missing models with Blender as an offline tool (step 3); geometry/texture optimisation (step 4) | steps 1–2 during 4b; step 3 before/with `world--001` step 1 and when rigs for boar/bear are wanted; step 4 only via `render--003` | Blender is a dev tool, never a build/CI/e2e dependency (D-REN-8). Optimising assets without a measured problem contradicts wave 6's rule, so the audit is measurement, optimisation stays conditional. |

Other pending work outside the waves (needs a plan before starting): D-LANG-1 follow-up (English NPC/settlement name pools, `GEN_VERSION` bump — best combined with `world--001` step 1, which bumps `GEN_VERSION` anyway), MAP-02 sensory visibility, quest packs in `docs/design/quests/`.

## Cross-cutting rules

- Every new system: cost measurement (diag), rule test, save/load of new state (`SAVE_VERSION` bump; until the first release older saves are rejected cleanly, no migrations — D-SAVE-7), mobile support where the player is involved.
- Generator changes (landmarks, treasure, name pools) → `GEN_VERSION` bump. Batch them into one bump where possible (each bump rebuilds the world cache and invalidates saves, D-SAVE-1).
- **Graphics (from wave 4):** every visual change behind a quality profile, with `bench:render` before/after (render--002 step 0 scenes, verdict vs baseline, D-PERF-3) and screenshots from the same frames. Changes to chunk/terrain build or asset loading also need the startup result (`diag--002` step 1) once it exists. Plans adding geometry or world objects (wave 5: landmarks, chests; grass clumps) — `bench:render` in a scene with the new objects; exceeding the render-prep budget or `render.vegetationRebuild` while walking → reduce cost first (render--003), do not keep adding.
- New or replaced `.glb` assets: credits/licence in `public/assets/CREDITS-CC-BY.txt` or the CC0 licence file, row in `docs/assets/README.md`, node names required by render code preserved (guard test from `render--004` step 2).
- Low has no composer/postprocessing; one shadow-casting directional light; no point-light shadows (D-REN-7).
- The appendix does not invalidate VISION.md; on conflict the appendix is newer — record the resolution in DECISIONS.
