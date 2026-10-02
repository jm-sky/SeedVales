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
| 4a | [render--002--visual-foundation-and-render-metrics](../plans/render--002--visual-foundation-and-render-metrics.md) (**done** 2026-10-01; WSL gate numbers ❓ user, non-blocking) | render metrics + baseline gate → time-sliced vegetation rebuild → dome sky + shadow snapping (tone mapping dropped, D-REN-9) → terrain tint uniforms + smooth normals + ground detail as default (D-REN-13) · PBR+IBL pilot dropped, ground contact deferred to `render--003` |
| 4n | [world--002--terrain-relief](../plans/world--002--terrain-relief.md) → [render--007--nature-pass](../plans/render--007--nature-pass.md) (**planned**, user 2026-10-01: nature first — D-REN-14, D-WORLD-10) | mid-scale terrain relief (`GEN_VERSION` 9) → shared wind module → grass with LOD + wind → real trees (leaf cards, LOD, baked impostors) → water (depth-coloured transparency, Fresnel, sky reflection; planar reflection on high only) |
| 4b | [render--001--weather-variety-effects](../plans/render--001--weather-variety-effects.md) (**planned**, after 4n; order 1a → 1b → 8 → 3 → 2 → 4 → 5; steps 6/7/9 moved to `render--007`) | fire sources + per-profile light pool (1a), stateless GPU particle fire — flames, sparks, embers, smoke (1b, user requirement), clouds in the sky material + better precipitation, wet ground/snow on uniforms, character variety (no extra draw calls), animal scale/tint, blood/ash decals |
| 4s | [survival--001--fire-fuel-torches-waterskins](../plans/survival--001--fire-fuel-torches-waterskins.md) (done) | *(sim, after 4a, before 4b)* campfire fuel/burn time/size + ash trace, stone hearth (settlement hearths fed by NPC duty), standing torch (plant, light/extinguish, 4–6 h burn), waterskin recipes; one `SAVE_VERSION` bump. Feeds `render--001` step 1 (`fireLevel`) and step 8 (ash decals). Waterskin recipe may go any time. |
| — | [tools--001--calibration-lab](../plans/tools--001--calibration-lab.md) | *(optional, before/with 4b)* Asset/Character/Equipment Lab on production code — helps calibrating character variants and held weapons |

CHAR-01 and FAUNA-09 (render--001 steps 4–5) do not depend on 4a and may go in parallel. Exit gates of 4a and 4b: in the plans (≤ 10% p95 regression of `render.prep` per package vs the render baseline, D-PERF-3; screenshots from the same frames; device performance as ❓ for the user — D-PERF-2).

**Side-track triggers inside wave 4** (details below): `diag--002` step 1 (startup) **before** `render--002` step 3 (terrain changes chunk build cost, which only startup and streaming expose); `diag--002` step 5 (real travel) **before** `render--001` step 6 (wind) / step 9 (ground clumps); `render--004` steps 1–2 (asset audit + node-name guard) any time during 4b.

## Wave 5 — world and settlement

| Plan | Scope |
|---|---|
| [world--001--landmarks-and-treasure](../plans/world--001--landmarks-and-treasure.md) | generator landmarks, treasure (buried, chests, rarely inside a predator), valuables |
| [settlement--001--mayor](../plans/settlement--001--mayor.md) | *(draft)* player becomes mayor at high reputation/relations; expansion decisions — depends on SET-04 (settlement growth, deferred) |

**Side-track triggers for wave 5:** landmark models (stone circle, shipwreck, boat wreck, ruins beyond partial village modules) come from `render--004` step 3 — or procedural geometry if that step is skipped.

## Stage 5b — authored quests and Stage V — verification loop (planned 2026-10-02, user)

| Plan | Scope |
|---|---|
| [quests--001--authored-quest-engine-and-starters](../plans/quests--001--authored-quest-engine-and-starters.md) | stage-machine engine for authored quests (`QUEST-03` promoted to v2) + four starters from `docs/design/quests/`: Q03 A Roof Before Rain, Q07 Six Bowls One Pan, G03 Night Torches, G01 Lost Lamb (H-only, existing mechanics) |
| [verify--001--soak-and-npc-life](../plans/verify--001--soak-and-npc-life.md) | multi-day soak run: sim event log + ledger, invariants (NPCs alive, working, eating/sleeping, not stuck, conservation, fires kept), report |
| [review--001--review-fix-loop](../plans/review--001--review-fix-loop.md) | Sonnet/Opus code review + application review (gameplay, graphics, UX) → fix → re-review, ≤ 3 rounds per wave; first input = session 11 ultrareview |

| [render--008--roads-banks-and-ground-textures](../plans/render--008--roads-banks-and-ground-textures.md) | *(draft, user notes 2026-10-02, wave 4c)* road relief/cobbles + town-square paving, ground/rock textures, river banks (beach / 0.3–0.5 m cut bank) with a channel, reeds and lilies; step 4 = `GEN_VERSION` bump |
| [render--009--stockpile-visuals](../plans/render--009--stockpile-visuals.md) | *(draft, user note 2026-10-02, wave 4c after render--008)* stockpiles show stored amounts (firewood tiers 1/5/7/14/20+, stone, grain, food, hides/wool); Blender models; render-only, 2 s cadence, nearby buildings only |
| [proposals--001--claude-proposals](../plans/proposals--001--claude-proposals.md) | **last stage:** Claude prepares 15–25 proposals from evidence (soak, reviews, vision gaps) autonomously; user picks a few; they are built and reviewed |

After this roadmap: [later-vision-backlog.md](later-vision-backlog.md) (stages L1–L7, proposal, ❓ user).

Order: finish `render--001` (4b) → `render--008` (4c, user additions — only when it fits; it must not delay the main order) → `verify--001` steps 1–3 (cheap, protects everything after) → `quests--001` → first full `review--001` round → wave 5 continues. The loop repeats after every wave and before each release candidate.

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

**Schedule (session 8, Opus) — scheduled, not started:**

1. **Nature pass (user, 2026-10-01):** `world--002` (terrain relief, `GEN_VERSION` 8 → 9) → `render--007` step 0 (`diag--002` step 5 real-input travel + reference A/B frames) → 1 (wind) → 2 (grass) → 3a–3c (trees; Opus keep/drop of the asset choice) → 4 (water). Opus look reviews after steps 2, 3, 4.
2. `render--001` 1a → 1b → 8 (fire, decals; Opus keep/drop of the fire look after 1b), then 3 → 2 → 4 → 5; Opus wave review closes 4n + 4b.
3. D-LANG-1 follow-up — English **first-name** pools (`data/professions.ts` `FIRST_M`/`FIRST_F`; settlement names and surnames are English since `world--001` step 1). Names are picked in `sim/newGame.ts`, not in the world generator, and stored as strings → **no `GEN_VERSION` or `SAVE_VERSION` bump**; new games only. Small Sonnet item, can ride with any session.
4. `world--001` steps 2–3 (LOOT-01 + valuables pricing; `SAVE_VERSION` 8 → 9) — Sonnet; may run in parallel (disjoint files). If FAUNA-09 (`render--001` step 5) adds saved `prime` state, whichever lands second bumps again.
5. `render--004` step 3+ / `render--005` step 3 (hair/beard library, needs a Windows + Blender session — user's machine): before `render--001` step 4 (CHAR-01) wants beards; colour/scale variety does not wait for it.
6. `diag--002` tier B before `render--003` leaves draft; tier C only on WSL (a cloud `inconclusive` is not a trigger — D-PERF-5).
7. Needs an Opus plan first: MAP-02 sensory visibility (after 4b, before wave 5 UI work), quest packs in `docs/design/quests/` (after `world--001`, which provides landmark/treasure hooks).

## Cross-cutting rules

- Every new system: cost measurement (diag), rule test, save/load of new state (`SAVE_VERSION` bump; until the first release older saves are rejected cleanly, no migrations — D-SAVE-7), mobile support where the player is involved.
- Generator changes (landmarks, treasure, name pools) → `GEN_VERSION` bump. Batch them into one bump where possible (each bump rebuilds the world cache and invalidates saves, D-SAVE-1).
- **Graphics (from wave 4):** every visual change behind a quality profile, with `bench:render` before/after (render--002 step 0 scenes, verdict vs baseline, D-PERF-3) and screenshots from the same frames. Changes to chunk/terrain build or asset loading also need the startup result (`diag--002` step 1) once it exists. Plans adding geometry or world objects (wave 5: landmarks, chests; grass clumps) — `bench:render` in a scene with the new objects; exceeding the render-prep budget or `render.vegetationRebuild` while walking → reduce cost first (render--003), do not keep adding.
- New or replaced `.glb` assets: credits/licence in `public/assets/CREDITS-CC-BY.txt` or the CC0 licence file, row in `docs/assets/README.md`, node names required by render code preserved (guard test from `render--004` step 2).
- Low has no composer/postprocessing; one shadow-casting directional light; no point-light shadows (D-REN-7).
- The appendix does not invalidate VISION.md; on conflict the appendix is newer — record the resolution in DECISIONS.
