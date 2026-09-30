# Roadmap: domknięcie v1 → VISION-APPENDIX (v2)

**Created:** 2026-09-30  
**Domains:** wszystkie  
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
| [sim--001--ai-cadence-and-animal-threat](../plans/sim--001--ai-cadence-and-animal-threat.md) | kadencja decyzji ~1 s per gatunek/stan + wymuszenie reakcji krytycznej; ucieczka zwierząt domowych do pasterza/zagrody; strach dzikich przed ludźmi/ogniem/zagrodami z wyjątkami (młode, legowisko); zjadanie zwłok w czasie, przerywalne; ślady krwi (sim) wabiące drapieżniki |

## Fala 2 — UI i ekrany

| Plan | Zakres |
|---|---|
| [ui--001--character-screens-map-settings](../plans/ui--001--character-screens-map-settings.md) | ekran postaci (atrybuty, reputacja, skille, choroby, ekwipunek, wybór broni głównej wręcz/dystansowej), filtrowanie/sortowanie, parametry przedmiotów, duża mapa, minimapa ze strzałką, ustawienia grafiki/głośności, nowa gra, nazwane zapisy, `Tab` — cykl celów |

## Fala 3 — gospodarka, relacje, towarzysze

| Plan | Zakres |
|---|---|
| [economy--001--gathering-cooking-transport](../plans/economy--001--gathering-cooking-transport.md) | ścinanie → pień, rozbijanie skał (weryfikacja istniejącego), gotowanie przy ognisku/patelni/ruszcie z parametrami produktu, taczka/wózek |
| [npc--001--trade-gifts-companions](../plans/npc--001--trade-gifts-companions.md) | handel z każdym NPC, prezenty i preferencje, towarzysze (najem/darmowe dołączenie), przekazanie i użycie ekwipunku |

## Fala 4 — oprawa wizualna

| Plan | Zakres |
|---|---|
| [render--001--weather-variety-effects](../plans/render--001--weather-variety-effects.md) | chmury, opady (cząsteczki), mokry teren, warstwa śniegu, różnorodność postaci, skalowanie/przyciemnianie zwierząt, dekale krwi, ogień z cząsteczkami/iskrami |
| [tools--001--calibration-lab](../plans/tools--001--calibration-lab.md) | *(opcjonalnie, przed/razem z falą 4)* Asset/Character/Equipment Lab na kodzie produkcyjnym — ułatwia kalibrację wariantów postaci i broni w dłoni |

## Fala 5 — świat i osada

| Plan | Zakres |
|---|---|
| [world--001--landmarks-and-treasure](../plans/world--001--landmarks-and-treasure.md) | landmarki w generatorze, skarby (zakopane, skrzynie, rzadko w drapieżniku), kosztowności |
| [settlement--001--mayor](../plans/settlement--001--mayor.md) | *(draft)* gracz burmistrzem przy wysokiej reputacji/relacjach; decyzje o rozbudowie — zależy od SET-04 (rozwój osad, deferred) |

## Zasady przekrojowe

- Każdy nowy system: pomiar kosztu (diag), test reguł, zapis/odczyt nowego stanu (bump `SAVE_VERSION` + migracja/odrzut zgodnie z planem game--002 A4), obsługa mobile jeśli dotyczy gracza.
- Zmiany generatora (landmarki, skarby) → bump `GEN_VERSION`.
- Dodatek nie unieważnia VISION.md; przy sprzeczności dodatek jest nowszy — zapisz rozstrzygnięcie w DECISIONS.
