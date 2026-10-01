# Performance report (PERF)

**Updated:** 2026-10-01 (session 4, plan [render--002](../plans/render--002--visual-foundation-and-render-metrics.md) step 0 — clean baselines)
**Code:** `c5ed00c` + bench fix (`GEN_VERSION` 7, `SAVE_VERSION` 7). Earlier report (session 2, Polish): `git show c5ed00c:docs/state/PERF.md`.

## Environment and measurement limits

- CPU Intel Core Ultra 7 268V ×8, WSL2 (Linux 5.15), Node v22.15.1; browser: Chrome headless (Playwright driver).
- **Headless = SwiftShader (software GPU).** FPS, RAF intervals, GPU time and `render.draw` include software rasterisation and do not transfer to hardware. Pure JS phases (sim, terrain chunk builds, vegetation rebuilds, render preparation `render.prep`) are comparable **within the same environment** (D-PERF-2). The render gate metric is therefore `render.prep` p95 (= `render.cpu` without draw submission).
- **SwiftShader is slow:** medium renders at ~1.5–2 fps headless, low at ~3–5 fps. Since session 4 `bench:render` measures at least 60 frames per static scene (min 6 s, max 60 s); before, a fixed 6 s window gave ~10 samples and p95 was simply the max.
- **Quantiles** (since `089bfae`) come from a whole-run log histogram (2% buckets), so median/p95/p99/max/mean/overBudget share one window. Before, p95 used the last 512 samples only — the sim baseline was refreshed for that reason (see below).
- **GPU timer** (`EXT_disjoint_timer_query_webgl2`) is read asynchronously where available; headless numbers are SwiftShader's and not meaningful.
- **No measurement on a real laptop or phone yet** — see the device checklist below (❓ for the user, D-PERF-2).
- WSL noise is about ±20% on p95; regressions are confirmed with a repeat run (columns "a / b" = two runs).

## Budgets (D-PERF)

| Metric | Budget | Reason |
|---|---:|---|
| frame (CPU) | 33.3 ms | at least 30 fps on weaker hardware |
| `sim.tick` | 4 ms | at 60 fps (16.7 ms) half the frame stays for GPU/driver |
| `render.cpu` | 10 ms | as above |
| terrain chunk build | 8 ms | one chunk per frame without a hitch |
| wave 4a gate | `render.prep` p95 ≤ +10% | whole `render--002` package vs the baseline below (not +10% per step) |

## Scenes

**`pnpm bench:sim`** (Node, seed 1337, 5 s warm-up, 1/60 s step, diag timers on, `detailed=sim`; JSON + MD in `test-results/bench/`, baseline `scripts/bench/baseline.json`):
`small-settlement` (player in an SM settlement, 60 s) · `crowded-settlement` (LG settlement + 60 extra animals, 60 s) · `dense-forest` (walk through forest, 60 s) · `combat` (6 wolves attack, 30 s) · `chunk-traverse` (1200 m along a road, resource node streaming) · `accelerated-sleep` (8 calendar hours at ×40) · `long-run-5-days` (5 game days, 5 returns to the same places, 0.5 s step = 5 sub-steps, so ">4 ms" is not a 60 fps frame; memory and save size).

**`pnpm bench:render [low|medium]`** (Chrome headless, own Vite server, seed 1337, waits for `chunks.pending` = 0, then ≥ 60 frames): `small-settlement`, `crowded-settlement`, `dense-forest`, `night-campfires`, `water-shore`, `rain`, `snow`, `march-10mps` (steady 30 s march along the first road — crosses chunk borders, no teleport), `teleport-hitch` (12 jumps of ~100 m — loading/respawn case only). Screenshots per scene in `test-results/bench/`.

## Simulation baseline (session 4, whole-run quantiles, ms)

Baseline refreshed with `--update-baseline` on `c5ed00c` after two confirming runs. Reason: the quantile method changed from a last-512 ring to the whole run (`089bfae`), so p95/p99 now include warm-up and rare calendar systems — the unmodified `ffa2380` shows the same jump (small-settlement 0.10 → 0.20, accelerated-sleep 0.56 → 1.12, long-run 0.87 → 1.60), i.e. it is a measurement change, not a code regression.

| Scene | p95 a / b | p99 a / b | >4 ms a / b |
|---|---|---|---|
| small-settlement | 0.192 / 0.188 | 0.441 / 0.517 | 1 / 0 |
| crowded-settlement | 0.507 / 0.432 | 1.075 / 0.696 | 3 / 0 |
| dense-forest | 0.077 / 0.059 | 0.216 / 0.148 | 0 / 0 |
| combat | 0.132 / 0.108 | 0.477 / 0.321 | 0 / 0 |
| chunk-traverse | 0.074 / 0.067 | 0.204 / 0.174 | 1 / 0 |
| accelerated-sleep | 0.918 / 1.119 | 2.027 / 1.872 | 0 / 0 |
| long-run-5-days | 1.391 / 1.260 | 2.520 / 2.151 | 79 / 29 |

All scenes stay far below the 4 ms budget. The ">4 ms" count in `long-run-5-days` is very sensitive to machine load (3–5 on a quiet machine in session 2, 29–89 now with whole-run counting of 5-sub-step frames) — compare p95, not this counter.

## Render baseline (session 4, before render--002 steps 1–4)

Two runs per profile ("a / b"), each static scene ≥ 60 frames, 0 console errors. Gate metric for wave 4a: `render.prep` p95 per scene vs these values (compare against the higher of a/b; differences under ±20% are noise).

**Low**

| Scene | frames a/b | render.prep med/p95 a | b | terrain p95 a / b | veg rebuild p95 (n) a / b | chunk build p95 a / b | draw calls | triangles | programs | lights |
|---|---|---|---|---|---|---|---:|---:|---:|---:|
| small-settlement | 60 / 63 | 0.7 / 3.82 | 0.7 / 1.91 | 0.2 / 0.1 | 0 (0) / 0 (0) | 0 / 0 | 148 | 455382 | 10 | 9 |
| crowded-settlement | 62 / 63 | 0.4 / 6.14 | 0.3 / 1.99 | 0.1 / 0.1 | 10.08 (8) / 2.28 (7) | 0 / 0 | 147 | 397575 | 11 | 9 |
| dense-forest | 61 / 60 | 0.3 / 1.39 | 0.2 / 1.8 | 0.2 / 0.2 | 1.9 (3) / 3.3 (3) | 0 / 0 | 58 | 321167 | 11 | 9 |
| night-campfires | 62 / 63 | 0.3 / 1.39 | 0.3 / 0.8 | 0.4 / 0.2 | 1.5 (1) / 1.7 (1) | 0 / 0 | 133 | 388291 | 11 | 9 |
| water-shore | 60 / 62 | 0.2 / 0.5 | 0.2 / 0.61 | 0.1 / 0.1 | 4.2 (2) / 4.1 (2) | 0 / 0 | 113 | 424033 | 11 | 9 |
| rain | 60 / 62 | 0.5 / 2.11 | 0.7 / 2.62 | 0.2 / 0.2 | 0 (0) / 2.78 (1) | 0 / 0 | 141 | 458581 | 12 | 9 |
| snow | 60 / 61 | 1.31 / 3.97 | 1.21 / 4.22 | 0.1 / 0.1 | 2.89 (1) / 8.77 (1) | 0 / 0 | 139 | 455295 | 12 | 9 |
| march-10mps | 56 / 85 | 3.01 / 24.09 | 1.39 / 8.77 | 9.13 / 6.65 | 22.7 (6) / 9.8 (8) | 8.27 / 5.24 | 127 | 572094 | 12 | 9 |
| teleport-hitch | 17 / 19 | 10.08 / 23.61 | 9.88 / 51.12 | 16.4 / 14.1 | 17.5 (10) / 41.94 (11) | 11.58 / 11.35 | 97 | 396558 | 12 | 9 |

**Medium**

| Scene | frames a/b | render.prep med/p95 a | b | terrain p95 a / b | veg rebuild p95 (n) a / b | chunk build p95 a / b | draw calls | triangles | programs | lights |
|---|---|---|---|---|---|---|---:|---:|---:|---:|
| small-settlement | 61 / 61 | 1.39 / 3.39 | 1.51 / 7.64 | 0.2 / 0.2 | 0 (0) / 0 (0) | 0 / 0 | 334 | 1059912 | 15 | 9 |
| crowded-settlement | 60 / 61 | 1.31 / 8.43 | 1.8 / 6.39 | 0.2 / 0.2 | 8.4 (6) / 5.45 (7) | 0 / 0 | 361 | 870162 | 17 | 9 |
| dense-forest | 61 / 61 | 0.2 / 2.89 | 0.2 / 3.39 | 0.2 / 0.2 | 4.1 (4) / 4.3 (4) | 0 / 0 | 91 | 1081280 | 17 | 9 |
| night-campfires | 60 / 60 | 1.51 / 4.84 | 1.21 / 3.07 | 0.2 / 0.1 | 3.39 (2) / 2.19 (2) | 0 / 0 | 370 | 892092 | 17 | 9 |
| water-shore | 61 / 62 | 0.2 / 0.7 | 0.2 / 0.7 | 0.2 / 0.1 | 5 (1) / 4.2 (2) | 0 / 0 | 173 | 726772 | 17 | 9 |
| rain | 60 / 61 | 0.99 / 7.64 | 0.7 / 1.99 | 5.35 / 0.2 | 0 (0) / 0 (0) | 2.67 / 0 | 296 | 1055184 | 18 | 9 |
| snow | 60 / 60 | 1.7 / 17.55 | 1.1 / 6.39 | 11.81 / 0.9 | 22.7 (1) / 8.9 (1) | 7.64 / 1.3 | 272 | 1012458 | 18 | 9 |
| march-10mps | 48 / 52 | 4.56 / 20.97 | 3.32 / 12.04 | 6.92 / 7.79 | 38.74 (8) / 24 (8) | 4.94 / 5.04 | 242 | 1562760 | 18 | 9 |
| teleport-hitch | 10 / 12 | 16.53 / 33.4 | 13.3 / 33.73 | 13.8 / 12.78 | 24.5 (8) / 12.04 (8) | 8.9 / 7.79 | 162 | 827096 | 18 | 9 |

Readings:
- **March at 10 m/s: vegetation rebuild p95 9.8–22.7 ms (low) and 24–38.7 ms (medium)**, above the 8 ms threshold of `render--002` step 1 → amortising the rebuild over frames is needed (step 1 is a keep, not optional). Terrain chunk builds while marching stay at p95 5–8 ms.
- **Snow / rain on medium**: one run caught the season/weather terrain rebuild wave (terrain p95 11.8 ms, chunk build 7.6 ms); step 3 (tint as uniforms) removes it.
- Static scenes: `render.prep` median ≤ 1.8 ms, p95 ≤ 8.5 ms; programs 10–18, lights 9 (sun + hemisphere + 6 pooled fire lights + the player torch light).
- Teleport hitch: p95 23–51 ms (loading/respawn only).

## Character variants A/B (render--005, 2026-10-01, WSL)

`d8d7d12` (before outfits) vs HEAD (Knight/Ranger_NoHood/Wizard + Blacksmith/Herbalist/Peasant_Boots wired), medium, same machine, one run each. Baseline taken with `--update-baseline` in a worktree of `d8d7d12` and passed via `--baseline=`.

| Scene | prep p95 before → after | verdict | draw calls before → after |
|---|---|---|---|
| small-settlement | 2.62 → 2.62 | ok +0% | 375 → 379 |
| crowded-settlement | 3.6 → 3.97 | inconclusive +10% | 491 → 495 |
| night-campfires | 2.42 → 2.52 | ok +4% | 479 → 479 |
| landmark-estate | 0.61 → 0.8 | +31% (no actors, sub-ms noise) | 120 → 120 |

Startup (3 runs): HUD 5220 → 5249 ms median; asset files 17 → 21 (16.7 → 20.2 MB); render.cpu max 1474 → 1268 ms. Result: no measurable regression.

## Cloud container (session 5, reference only — D-PERF-5)

Machine: Intel Xeon @ 2.80 GHz ×4 (Anthropic cloud session). **Not comparable with the WSL baselines above** — `bench:render` now refuses that comparison (machine fingerprint in the baseline). Official gates (step-1 confirmation, 4a exit gate) run on the WSL laptop (❓ user). One run each on `915771d` + bench fix (render--002 step 1 code):

| Scene | low prep med/p95 | low veg rebuild p95 (n) | medium prep med/p95 | medium veg rebuild p95 (n) | medium frames |
|---|---|---|---|---|---:|
| small-settlement | 1.39 / 4.56 | 0 (0) | 3.2 / 5.79 | 0 (0) | 61 |
| crowded-settlement | 0.5 / 3.2 | 2.6 (12) | 4.94 / 12.78 | 4.47 (19) | 60 |
| dense-forest | 0.4 / 3.32 | 6.39 (10) | 0.9 / 8.11 | 4.3 (12) | 44 |
| night-campfires | 0.4 / 1.99 | 2.6 (4) | 2.67 / 10.91 | 2.5 (2) | 54 |
| water-shore | 0.3 / 1.6 | 5.79 (2) | 0.7 / 7.79 | 2.5 (6) | 61 |
| rain | 1.31 / 6.39 | 0 (0) | 2.52 / 10.28 | 3.2 (3) | 52 |
| snow | 1.8 / 5.35 | 3 (2) | 7.34 / 17.55 | 2.6 (4) | 49 |
| march-10mps | 4.3 / 10.91 | 6 (12) | 9.13 / 16.86 | 5.3 (19) | 28 |
| teleport-hitch | 12.53 / 26.5 | 6.6 (16) | 11.13 / 15.89 | 4 (6) | 6 |

Observations: medium runs at ~1 fps here (march only 28 frames, teleport 6) and static scenes still build terrain chunks after `chunks.pending` = 0 (terrain p95 6–8 ms) — the container is slower than the warm-up assumes. Vegetation rebuild slices stay ≤ 6.4 ms (max), but static scenes now show more slices (node changes by NPCs → the time-sliced rebuild spans several frames); whether that moves `render.prep` p95 on the WSL machine is part of the user's confirmation run.

## Device measurement checklist (for the user — ❓ D-PERF-2)

Headless cannot judge GPU cost or real frame pacing. To measure on a laptop and a phone:

1. Production build: `pnpm build && pnpm exec vite preview --host` (phone on the same network), open the printed URL. Do not measure `pnpm dev`.
2. Start a new game with seed **1337**, pick the quality profile to test (Settings), stand in the home settlement at noon (clear weather).
3. Warm up for **30 s** without measuring (shader compilation, chunk streaming).
4. In the browser console (on a phone: remote debugging, e.g. Chrome `chrome://inspect`): `window.__sv.perf.reset()`, wait **60 s**, then `copy(JSON.stringify(window.__sv.pacing()))` and paste the result into a note. `pacing()` returns RAF p50/p95/p99, share of frames over 16.7 / 33.3 / 50 ms, CPU frame quantiles and GPU quantiles (or "no data" when the GPU timer extension is missing).
5. Repeat step 4 **3×**, alternating with the other quality profile (e.g. low, medium, low, medium, …).
6. On the phone, additionally play normally for **10–15 min** (walk out of the settlement, night with campfires, rain if possible) and note heat/throttling and the last `pacing()` result.
7. Note the device, browser and battery saver state. Send the notes back; they go into this file under "Device results".

## Asset audit (2026-10-01, render--004 step 1)

`node scripts/assets/inspect-pack.mjs --audit --md` over `public/assets/`: **26 files, 18.64 MB, 168 372 unique triangles** (animals 0.5–4 k each, characters 2–13 k, packs: nature 27 k, props 29 k, village 25 k, `landmarks.glb` 15 k / 419 KB). Per-file table, class budgets (D-REN-11) and "candidates if a problem is measured" are in `docs/assets/README.md` ("Audit"). The audit changed no asset. The scene join (which assets are on screen per `bench:render` scene) and startup decode time wait for `diag--002` step 1. New bench scene `landmark-estate` (largest landmark, ~28 k tris merged) has no baseline yet — first run on the WSL laptop (❓ user).

## Known bottlenecks

1. **Snow (and season tint) rebuilds terrain** — the tint is baked into vertex colours, so a weather/season change marks chunks dirty and rebuilds them (medium snow: `render.terrain` median ~5 ms every frame during the rebuild wave). `render--002` step 3 moves the tint to uniforms.
2. **Vegetation rebuild during the march** — fixed by `render--002` step 1 (time-sliced rebuild + node chunk prefetch): medium march vegetation rebuild p95 24–38.7 → 3.8 ms, march `render.prep` p95 20.97 → 7.95 ms (one run; low + second medium run pending).
3. **Characters: 7–12 draw calls per person** (skinned parts not merged) — dominate draw calls in settlements. Fix: atlas + merged parts (`render--001` / `tools--001` / `render--003`).
4. **Teleport hitch** (loading/respawn only — travel is physical): many chunks at once; acceptable behind a loading screen.
5. **No GPU / phone measurement** — checklist above.

## Full-scan audit (PERF-01)

Rule: per-tick / per-actor systems query only objects in range (`sim.actors.query`, `sim.nodes.query`, `sim.groundNear`, `sim.corpsesNear`, `sim.buildingsNear`) or indices (`sim.building(id)`, `sim.householdBuildings`, `sim.settlementBuildings`, `sim.npcsOf`). Full list scans are allowed in rare calendar systems and player actions — with a reason.

| Place | Was | Decision |
|---|---|---|
| `quests.ts` rats at a building / rats left | `s.animals.filter` in a loop over buildings | `countNear` (`sim/queries.ts`) — 40/60 m query |
| `quests.ts` wolves near a settlement | `s.animals.filter` per settlement | `animalsNear` (settlement radius + 350 m) |
| `quests.ts`, `build.ts`, `interact.ts` (host, trader, guard) | `s.npcs.find` | `sim.npcsOf(settlementId)` (index) |
| `worldSystems.ts` rats at a nest | `s.animals.filter` | `countNear` 40 m |
| `worldSystems.ts` den animals | `s.animals.filter` per den | one pass per system run (every 30 s) → map `denId → count` (den animals roam up to 160 m — a spatial query would be wrong) |
| `fauna/ai.ts` carrion/bait, eating | `state.ground` / `state.corpses` `.find` with distance | `sim.groundNear` / `sim.corpsesNear` (spatial indices; mutations via `sim.addGround/removeGround/addCorpse/removeCorpse`) |
| `fauna/ai.ts` pen/trough | `state.buildings.find` | `sim.householdBuildings(hid)` |
| `npc/queries.ts` `householdBuilding` / `settlementBuildings` | `state.buildings.find/filter` | indices in `Sim.rebuildBuildingIndex` |
| `sim.building(id)` (27 calls, e.g. per NPC plan) | `state.buildings.find` | `Map` id → building |
| `npc/goals.ts` downed neighbour to help | `state.npcs.find` with distance | `sim.actors.query(150)` |
| `npc/goals.ts` food seller | `state.npcs.find` | `sim.npcsOf` |
| `npc/duties.ts` corpses for the hunter | `state.corpses.find` | `sim.corpsesNear(200)` |
| `npc/companions.ts` companion list (per companion per tick) | `state.npcs.filter` | cached list, rebuilt on hire/join/dismiss/death and every `companionSystem` run (review 006 #9) |
| `interact.ts` targets around the player (5 Hz) | scan of `corpses` / `ground` | `corpsesNear` / `groundNear` |
| `npc/ai.ts` `npcSystem`, `fauna/ai.ts` `faunaSystem` | loop over all actors | **kept** — LOD scheduler (each actor has `nextUpdate`); O(n) time comparisons |
| `worldSystems.ts` `ecology` (spoilage, durability, fields) | loops over buildings/NPCs/ground | **kept** — calendar system every 5 s, per-object work is required |
| `npc/companions.ts` `companionSystem` | loop over NPCs | **kept** — every 2 s, contracts/bond per companion |
| `quests.ts` loop over buildings with a nest | `buildings` scan every 10 s | **kept** — ~150 buildings, `ratNest` filter |
| `npc/works.ts` `shear` | loop over animals | **kept** — rare work act |
| `interact.ts` theft witnesses | loop over NPCs | **kept** — player action, not per tick |
| `treasury.ts` `totalMoney` | loop over NPCs | **kept** — tests/diagnostics only |

## How to reproduce

```bash
pnpm bench:sim                     # 2× to confirm; compared with scripts/bench/baseline.json
pnpm bench:render low              # own Vite server; 2× to confirm
pnpm bench:render medium
```

## render--002 step 3 default flip — cloud before/after (session 8, reference only — D-PERF-5)

Same container (Intel Xeon @ 2.10 GHz ×4), same commit `5ae03e3` + session-8 working tree, only `VISUAL_DEFAULTS` differs (legacy baked/flat terrain vs `tintUniforms` + `smooth` + `detail`). Medium, `bench:render --baseline=<before file>`.

**Harness fix first:** `settle()` gave up after 50 polls (~15–25 s); a teleport on SwiftShader medium needs 20 s (legacy) to 25 s (shader path, +46 % per chunk build) to drain ~110 chunks, so the first comparison measured streaming as steady state on the new path only (dense-forest/rain "+100 %/+51 %", terrain p95 0 → 6 ms). The session-5 note "static scenes still build terrain chunks after `chunks.pending` = 0" was the same cap. `settle()` now waits up to 90 s of wall time and marks a scene `unsettled` instead of measuring it.

| Scene | before prep med/p95 | after prep med/p95 | verdict |
|---|---|---|---|
| small-settlement | 1.6 / 3.2 | 1.51 / 3.39 | ok +6 % |
| crowded-settlement | 1.7 / 4.66 | 1.7 / 4.84 | ok +4 % |
| dense-forest | 0.61 / 2.67 | 0.61 / 2.78 | ok +4 % |
| night-campfires | 1.31 / 3.82 | 1.1 / 2.62 | ok −31 % |
| water-shore | 0.5 / 1.8 | 0.4 / 0.9 | ok −50 % |
| landmark-estate | 0.4 / 0.9 | 0.4 / 0.9 | ok +0 % |
| rain | 1.1 / 3.39 | 0.9 / 3.32 | ok −2 % |
| snow | 1.31 / 3.97 | 1.31 / 2.28 | ok −43 % (no terrain rebuild wave) |
| march-10mps | 6.92 / 9.88 | 7.06 / 13.04 | inconclusive — see below |
| teleport-hitch | 9.69 / 31.1 | 9.88 / 29.95 | n = 9–10, hitch test only |

March (n ≈ 32 frames per run) across all five same-container runs of the day: before p95 13.84 / 9.88, after 11.13 / 11.35 / 13.04 — the ranges overlap, `chunks.build` p95 4.2–5.8 ms in both. Cloud cannot resolve it; the WSL 4a gate run decides (❓ user). Startup (`bench:startup`, 3 runs): medium HUD 9103 → 8934 ms, worst first-frame `render.prep` 362 → 396 ms (+9 %); low HUD 4465 → 4658 ms, `render.prep` max 227 → 239 ms (+5 %) — within noise of a shared container, no mitigation needed before the flip (D-REN-13).

## Startup (diag--002 step 1; `pnpm bench:startup [low|medium|high] [--runs=3]`)

A result class of its own (not the steady-state gate). Fresh browser process per run, empty cache and IndexedDB (world generated, not cached), "New game" click → first HUD frame, then 4 s of frames. Cloud container (4-core Xeon, SwiftShader) — **cloud-only, comparable only within this environment**; the tool is the deliverable, WSL numbers are a user step (D-PERF-5).

| quality | HUD ms (median / max) | render.cpu max | render.prep max | chunks.build n / max | veg rebuild max | actors max | world gen ms | asset files / KB | asset time ÷ HUD |
|---|---|---:|---:|---|---:|---:|---:|---|---:|
| low | 5956 / 6204 | 884 | 382.3 | 60 / 26.7 | 122.6 | 59.2 | 3823.5 | 14 / 15064 | 0.06 |
| medium | 8271 / 8456 | 2157 | 446.1 | 114 / 27.3 | 121.1 | 59.8 | 3435 | 15 / 15147 | 0.03 |

Reading: world generation dominates the cold start (~3.4–3.8 s of 6–8 s); asset download/decode is a small share here (localhost, so network cost is absent — a real network adds the 15 MB). First-frame `render.cpu` max (0.9–2.2 s on SwiftShader) is mostly shader compilation + software rasterisation, not representative. Use as the "before" for `render--002` step 3.

