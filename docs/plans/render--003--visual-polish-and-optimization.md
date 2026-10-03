# Render: wykończenie obrazu i optymalizacja grafiki (warunkowo)

**Status:** in_progress  
**Model:** opus to take it out of draft and pick items from measurements; sonnet implements the chosen items  
**Domain:** render  
**Sub domains:** postprocess, assets, perf, actors, vegetation, quality  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 6 — po fali 5)  
**Created:** 2026-10-01  
**Finished:** —

---

Źródła: [research 002](../research/2026-10-01--002--realistic-visuals-practical-roadmap.md) §6–§7, §9 pkt 6; [review 005](../reviews/2026-10-01--005--rendering-research-critical-review.md) R5, R13, R14. Decyzje: **D-REN-7**, **D-PERF-2**.

## Zasada

Ten plan jest **katalogiem warunkowym**, nie listą do odhaczenia. Każda pozycja startuje tylko, gdy odpowiada na **zmierzony problem** (headless lub z urządzenia użytkownika) albo jest potrzebna dla zaakceptowanego detalu. Brak problemu = brak pracy; zapisać „niepotrzebne” w „Wynik”. Dlatego plan jest po fali 5: dopiero wtedy scena ma docelową gęstość (landmarki, efekty z fali 4) i wiadomo, co faktycznie kosztuje.

Status `draft` → `planned` dopiero po przeglądzie wyników fali 4 i 5 w PERF.md oraz (jeśli dostępne) danych z urządzeń.

**Inputs required before leaving draft (roadmap update 2026-10-01):** `diag--002` tiers A and B (startup, real travel, quality transitions, diagnostics overhead, lifecycle/memory — D-PERF-4) and the asset audit table from [`render--004`](render--004--asset-pipeline-and-audit.md) step 1. Item 2 (adaptive resolution) needs the transition result; items 4, 5 and 9 and asset geometry optimisation (decimated roofs, material atlases, stripped clips — `render--004` step 4) use the audit to pick targets. Asset edits follow D-REN-8 (Blender offline only, node-name guard test green).

## Pozycje

| # | Pozycja | Warunek startu | Zakres / ograniczenia |
|---|---|---|---|
| 1 | **Pomiar na urządzeniach** (laptop docelowy, Android, iPhone jeśli wspierany) | Zawsze — wymaga użytkownika | Checklista z `render--002` krok 0; wynik przestawia efekty z ❓ na ✅/korekty domyślnych profili. Bez danych: profile pilotażowe zostają, efekty „wydajność urządzeń niezweryfikowana”. |
| 2 | **Adaptive resolution** | Dane RAF/GPU pokazują długotrwałe przeciążenie na którymś profilu | Rzadki wybór skali 3D z histerezą; nie reagować na pojedynczy rebuild/streaming; nie kompilować shaderów podczas korekty. UI Vue zostaje w natywnej rozdzielczości. Nie opierać na starym timerze `frame` (review R5). |
| 3 | **Jeden pass wykończenia: AO *albo* bloom *albo* AA** | A/B pokazuje konkretny problem (brak kontaktu, płaski ogień nocą, aliasing w ruchu) | Tylko medium/high, przełącznik w ustawieniach; low bez composera. AO: N8AO vs `GTAOPass` jako jeden test, nie oba. Bloom subtelny, próg na emisję ognia (kontrola śniegu/nieba). AA: FXAA/SMAA oceniane w ruchu; MSAA wymaga nowego kontekstu (`setQuality()` go nie zmienia — obsłużyć lub nie obiecywać live). Jeden tone mapping i jedna konwersja barw w pipeline; `renderer.info` reset przy wielu passach. |
| 4 | **KTX2 / Basis** | Zaakceptowane cięższe tekstury przekraczają limit pamięci pilotażu (+16/+32 MiB) | `KTX2Loader` + transkoder + offline glTF Transform; ETC1S albedo, UASTC normal. Tylko nowe tekstury, nie cała kolekcja. Meshopt już jest — nie liczyć go jako nowego zysku. |
| 5 | **Redukcja draw calli postaci** (7–12/os.) | Sceny osad przekraczają budżet `render.cpu` z powodu aktorów | Timebox na jeden strój/rig; test bind pose, skali, głowy, wszystkich animacji. Build już próbuje `unifySkins/flatten/join` — nie powtarzać. Nowy rig/atlas całej kolekcji → odłożyć. `InstancedMesh/BatchedMesh` nie rozwiązują niezależnych szkieletów (review R14). |
| 6 | **Spatial batches roślinności / culling** | GPU (urządzenie) pokazuje dużo pracy poza widokiem lub w cieniach | Kompromis: mniej niewidocznych trójkątów, więcej draw calli. `frustumCulled=true` tylko z poprawnymi bounds (także z wiatrem). |
| 7 | **Ograniczenie casterów cieni** | Shadow pass dominuje koszt na medium | Dobór casterów przestrzennie (wymaga pkt 6 dla instanced batches). CSM/PCSS tylko przy problemie, którego tańsze ustawienia nie rozwiązują. Throttling shadow map — nie przy ruchomych aktorach/słońcu (review R11). |
| 8 | **LOD fade drzew** | Widoczny „pop” po falach 4–5 | Najpierw histereza i zbliżone sylwetki/kolory LOD; alphaHash/dither tylko w krótkim zakresie po A/B (szum bez TAA, podwójny render — review R13). |
| 10 | **Asset geometry/texture optimisation** (`render--004` step 4) | Settlement scenes over the `render.prep` budget because of building/prop geometry, startup dominated by asset decode, or memory over the pilot limit | Targets from the `render--004` audit (expected: village roof tiles, `anims.glb`, oversized textures). Before/after on the same scenes + startup; node-name guard test stays green. |
| 9 | **Odbudowa paczek Quaternius z mapami PBR** | Pilot PBR z `render--002` krok 4 = keep i jest dostęp do `_temp/extracted` | Selektywnie (skały, dachy, metal), nie wszystkie paczki; zmiana `baseColorOnly()` per klasa assetu. |

## Odłożone (bez planu; wrócić tylko z nowym uzasadnieniem)

WebGPU/TSL (migracja materiałów i postprocessingu, fallback WebGL2), TAA/temporal upscaling/FSR, SSR/SSGI/ray tracing, wolumetryczne chmury i mgła, light probes i lightmapy świata, octahedral impostors / VAT tłumów, stochastic tiling i pełny triplanar. Uzasadnienia: research 002 §6.

## Wynik

—

### Session 11 (2026-10-02, WSL) — settlement draw-call attribution and the actor fix

- **Attribution tool:** `Renderer.drawAttribution()` (exposed as `window.__sv.drawAttribution()`) counts draws per render subsystem for one extra frame, main and shadow pass separately, via temporary `onBeforeRender` / `onBeforeShadow` hooks (exact). Script: `node scripts/bench/draw-attribution.mjs [low|medium|high]` → table + `test-results/bench/draws-<q>.json` (draw counts do not depend on the GPU).
- **Finding:** actors owned the settlement cost — high crowded-settlement 934 draws, of which actors 356 main + 347 shadow (75 %); structures 59 + 59, terrain 77, vegetation 29, grass 3. Causes: actor meshes have `frustumCulled = false` (animated skinned bounds are unreliable), so every actor within the model range was drawn even behind the camera, and every body part of every model actor cast a shadow.
- **Fix (`render/actors.ts`):** per-actor frustum test (sphere r = 3 m around the root; off-screen actors are not drawn and their mixers are not updated) and a shadow radius per profile (`quality.ts` `actorShadow`: low 0 / medium 30 / high 40 m, toggled only when crossing it). A/B flag `sv-visual {"actorCull":false}`; test `actors.test.ts`.
- **Result (draw calls):** high crowded-settlement 934 → 363, high small-settlement 714 → 410, medium crowded 578 → 342, medium small 525 → 296; dense-forest unchanged (no actors). GPU confirmation pending: the machine was loaded by a parallel session (load average ~6), so the GPU runs of this step are invalid — next session: alternating pairs `SV_VISUAL='{"actorCull":false}'` vs default on `crowded-settlement`/`small-settlement`, medium and high, on an idle machine.
- **Next candidates (by the table):** character part/material merge per skinned body (7–12 draws per character; asset work → Blender session), structures shadow pass (59 shadow draws), then high-only effects.

## Look baseline from the previous app (user, 2026-10-02)

`docs/research/refs/2026-10-02--seedvale-v1-ref-screenshot-as-baseline-1.jpg` and `-2.jpg` are screenshots of the previous SeedVale version to compare against (Opus read, 2026-10-03): dense, knee-high mixed grass with yellow-olive tips covering almost all open ground; broadleaf canopies in dark red/olive autumn tones mixed with conifers; strong aerial perspective (blue-grey fog fading distant trees); warm, saturated low sun with long shadows and dark silhouettes at dusk; a dirt path worn into the grass; minimap with tile colours. Use: one `ab.mjs` frame pair at the same time of day/season (meadow by a forest edge, morning and late afternoon) next to these refs in every look review of waves 4n/4b/6; differences are ❓ user keep/drop items, not automatic targets (the old app had no perf budget). Cave refs (`-3-cave-enterance.png`, `-4-cave-inside.jpg`) belong to `world--003`.

