# Render: wykończenie obrazu i optymalizacja grafiki (warunkowo)

**Status:** draft  
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
| 9 | **Odbudowa paczek Quaternius z mapami PBR** | Pilot PBR z `render--002` krok 4 = keep i jest dostęp do `_temp/extracted` | Selektywnie (skały, dachy, metal), nie wszystkie paczki; zmiana `baseColorOnly()` per klasa assetu. |

## Odłożone (bez planu; wrócić tylko z nowym uzasadnieniem)

WebGPU/TSL (migracja materiałów i postprocessingu, fallback WebGL2), TAA/temporal upscaling/FSR, SSR/SSGI/ray tracing, wolumetryczne chmury i mgła, light probes i lightmapy świata, octahedral impostors / VAT tłumów, stochastic tiling i pełny triplanar. Uzasadnienia: research 002 §6.

## Wynik

—
