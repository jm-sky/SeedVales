# Roadmap: domknięcie v1 → VISION-APPENDIX (v2)

**Created:** 2026-09-30  
**Domains:** wszystkie  
**Updated:** 2026-10-01 — fala 4 podzielona (fundament → efekty), nowa fala 6 (wykończenie/optymalizacja grafiki) i bramki wydajności wg [research 002](../research/2026-10-01--002--realistic-visuals-practical-roadmap.md) / [review 005](../reviews/2026-10-01--005--rendering-research-critical-review.md)  
**Źródła:** [VISION.md](../VISION.md), [VISION-APPENDIX.md](../VISION-APPENDIX.md), [review v1](../reviews/2026-09-30--001--v1-review.md), [DEVELOPER-CALIBRATION-TOOLS.md](../DEVELOPER-CALIBRATION-TOOLS.md)

Kolejność ustalona z użytkownikiem 2026-09-30: **najpierw domknięcie v1, potem dodatek do wizji falami**. Fala zaczyna się dopiero, gdy poprzednia ma status `done` (lub pozostałości są jawnie odłożone w DECISIONS). W obrębie fali plany można realizować w dowolnej kolejności, jeśli są niezależne.

Wymagania z dodatku są w `docs/state/FEATURES.json` ze `scope: "v2"` i statusem `planned` (`vision: "APPX: <sekcja>"`).

## Etap 0 — domknięcie v1 (obowiązkowe przed falami)

| Plan | Zakres | Status |
|---|---|---|
| [game--002--v1-review-fixes](../plans/game--002--v1-review-fixes.md) | poprawki z review: ekonomia/zasoby, save↔genVersion, pętle AI, multi-seed WORLD-04 | done |
| [diag--001--sim-hotspots-and-perf-report](../plans/diag--001--sim-hotspots-and-perf-report.md) | O(n×m) → spatial query, audyt skanów, `docs/state/PERF.md` | done |
| (w PROGRESS) | RES-04 test plonów sezonowych; WORLD-10 jawnie „nieodsłuchane” | done |
| [review 002](../reviews/2026-09-30--002--v1-closure-review.md) | niezależne review etapu 0 + poprawki | done |

**Etap 0 zamknięty 2026-09-30 — v1 ogłoszone (PROGRESS.md).**

Wyjście z etapu 0: `pnpm check` + `pnpm e2e` zielone, FEATURES bez fałszywych `verified`, PROGRESS.md mówi jasno „v1 ukończone” albo co blokuje.

## Fala 1 — symulacja i AI (fundament pod resztę)

| Plan | Zakres |
|---|---|
| [sim--001--ai-cadence-and-animal-threat](../plans/sim--001--ai-cadence-and-animal-threat.md) (done) | kadencja decyzji ~1 s per gatunek/stan + wymuszenie reakcji krytycznej; ucieczka zwierząt domowych do pasterza/zagrody; strach dzikich przed ludźmi/ogniem/zagrodami z wyjątkami (młode, legowisko); zjadanie zwłok w czasie, przerywalne; ślady krwi (sim) wabiące drapieżniki |

## Fala 2 — UI i ekrany

| Plan | Zakres |
|---|---|
| [ui--001--character-screens-map-settings](../plans/ui--001--character-screens-map-settings.md) | ekran postaci (atrybuty, reputacja, skille, choroby, ekwipunek, wybór broni głównej wręcz/dystansowej), filtrowanie/sortowanie, parametry przedmiotów, duża mapa, minimapa ze strzałką, ustawienia grafiki/głośności, nowa gra, nazwane zapisy, `Tab` — cykl celów |

## Fala 3 — gospodarka, relacje, towarzysze

| Plan | Zakres |
|---|---|
| [economy--001--gathering-cooking-transport](../plans/economy--001--gathering-cooking-transport.md) (done) | ścinanie → pień, rozbijanie skał (weryfikacja istniejącego), gotowanie przy ognisku/patelni/ruszcie z parametrami produktu, taczka/wózek |
| [npc--001--trade-gifts-companions](../plans/npc--001--trade-gifts-companions.md) (done) | handel z każdym NPC, prezenty i preferencje, towarzysze (najem/darmowe dołączenie), przekazanie i użycie ekwipunku |

**Wave 3 done (2026-10-01):** review [006](../reviews/2026-10-01--006--wave3-review.md) triaged — 11 fixed with regression tests, 1 rejected, 3 info/deferred.

## Fala 4 — oprawa wizualna

Kolejność wewnątrz fali jest zależnością techniczną (D-REN-7): efekty pogody i ognia korzystają ze wspólnego światła/nieba i materiału terenu z uniformami, więc najpierw fundament. Pierwszy pakiet 4a jest celowo mały (metryki, światło/niebo, teren, jeden pilot PBR) — każdy krok z timeboxem, fallbackiem i decyzją keep/drop.

| Etap | Plan | Zakres |
|---|---|---|
| 4a | [render--002--visual-foundation-and-render-metrics](../plans/render--002--visual-foundation-and-render-metrics.md) | metryki renderu (RAF pacing, GPU timer, spójne okna kwantyli, sceny A/B: noc/woda/deszcz/śnieg/marsz) → światło, tone mapping, niebo, mgła → gładkie normalne terenu + detal gruntu + tint przez uniformy → pilot selektywnego PBR+IBL na jednym assecie → (opcjonalnie) kontakt z podłożem |
| 4b | [render--001--weather-variety-effects](../plans/render--001--weather-variety-effects.md) | ogień flipbook + pula świateł per profil, chmury w materiale nieba + ulepszenie istniejących opadów, mokry teren/śnieg na uniformach, różnorodność postaci (bez wzrostu draw calli), skala/tint zwierząt, wiatr roślinności, woda bez renderu odbić sceny, dekale krwi |
| — | [tools--001--calibration-lab](../plans/tools--001--calibration-lab.md) | *(opcjonalnie, przed/razem z 4b)* Asset/Character/Equipment Lab na kodzie produkcyjnym — ułatwia kalibrację wariantów postaci i broni w dłoni |

CHAR-01 i FAUNA-09 (render--001 kroki 4–5) nie zależą od 4a i mogą iść równolegle. Bramki wyjścia 4a i 4b: w planach (≤10% regresji p95 przygotowania renderu `render.cpu` − `render.draw` na pakiet względem baseline, zrzuty z tych samych kadrów, wydajność na urządzeniu jako ❓ do pomiaru przez użytkownika — D-PERF-2).

## Fala 5 — świat i osada

| Plan | Zakres |
|---|---|
| [world--001--landmarks-and-treasure](../plans/world--001--landmarks-and-treasure.md) | landmarki w generatorze, skarby (zakopane, skrzynie, rzadko w drapieżniku), kosztowności |
| [settlement--001--mayor](../plans/settlement--001--mayor.md) | *(draft)* gracz burmistrzem przy wysokiej reputacji/relacjach; decyzje o rozbudowie — zależy od SET-04 (rozwój osad, deferred) |

## Fala 6 — wykończenie obrazu i optymalizacja grafiki (warunkowo)

| Plan | Zakres |
|---|---|
| [render--003--visual-polish-and-optimization](../plans/render--003--visual-polish-and-optimization.md) | *(draft)* pomiar na urządzeniach; pozycje tylko przy zmierzonym problemie: adaptive resolution, jeden pass AO/bloom/AA (medium/high), KTX2, redukcja draw calli postaci, spatial batches/culling roślinności, ograniczenie casterów cieni, LOD fade, odbudowa paczek z mapami PBR |

Po fali 5, bo dopiero wtedy scena ma docelową gęstość. Brak zmierzonego problemu = pozycja zamknięta jako „niepotrzebne”.

## Zasady przekrojowe

- Każdy nowy system: pomiar kosztu (diag), test reguł, zapis/odczyt nowego stanu (bump `SAVE_VERSION` + migracja/odrzut zgodnie z planem game--002 A4), obsługa mobile jeśli dotyczy gracza.
- Zmiany generatora (landmarki, skarby) → bump `GEN_VERSION`.
- **Grafika (od fali 4):** każda zmiana wizualna za profilem jakości, z pomiarem `bench:render` przed/po (sceny z render--002 krok 0) i zrzutami z tych samych kadrów. Plany dokładające geometrię lub obiekty w świecie (fala 5: landmarki, skrzynie; kępy trawy) — `bench:render` w scenie z nowymi obiektami; przekroczenie budżetu przygotowania renderu lub `render.vegetationRebuild` przy marszu → najpierw redukcja kosztu (render--002 krok 1 / render--003), nie dalsze dokładanie.
- Na low brak composera/postprocessingu; jeden shadow-casting directional light; bez cieni świateł punktowych (D-REN-7).
- Dodatek nie unieważnia VISION.md; przy sprzeczności dodatek jest nowszy — zapisz rozstrzygnięcie w DECISIONS.
