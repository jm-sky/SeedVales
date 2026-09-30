# Wydajność symulacji: gorące pętle + raport PERF.md

**Status:** done  
**Domain:** diag  
**Sub domains:** sim, render, bench  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md)  
**Created:** 2026-09-30  
**Finished:** 2026-09-30

---

Kontekst: `docs/state/PROGRESS.md` (pkt 1 i 3), `docs/design/DECISIONS.md` (D-PERF), `docs/IMPLEMENTATION-PROMPT.md` §6.

## 1. Pomiar „przed”

- `pnpm bench:sim` ×2 (potwierdzenie regresji z sesji 1: crowded-settlement p95 0.34→0.53 ms, accelerated-sleep 1.0→1.9 ms). Wyniki JSON/MD w `test-results/bench/` (gitignored) — kluczowe liczby przepisz do PERF.md.

## 2. Gorące pętle O(budynki × zwierzęta)

Potwierdzone miejsca (grep 2026-09-30):

- `src/game/sim/quests.ts:16` — szczury przy budynku (`s.animals.filter` w pętli po `s.buildings`)
- `src/game/sim/quests.ts:42` — wilki przy osadzie
- `src/game/sim/quests.ts:68` — pozostałe szczury
- `src/game/sim/worldSystems.ts:43` — szczury przy zaniedbanym budynku
- `src/game/sim/worldSystems.ts:110` — zwierzęta z legowiska (`denId`) — tu lepszy licznik/indeks per den niż zapytanie przestrzenne

Zamień na `sim.actors.query(x, z, r)` (+ filtr gatunku) lub liczniki utrzymywane przy spawnie/śmierci. Sprawdź poprawność testami (`features*.test.ts`, `economy.test.ts`).

## 3. Audyt spatial grid (VISION-APPENDIX „Spatial grid i częstotliwość decyzji”)

`grep -rn "state.animals\|state.npcs\|\.filter(\|\.find(" src/game/sim` — każde pełne skanowanie wywoływane per aktor/per tick zamień na zapytanie przestrzenne albo uzasadnij (np. rzadki system kalendarzowy). Wynik audytu zapisz w PERF.md (tabela: miejsce → decyzja).

## 4. Pomiar „po” i baseline

- `pnpm bench:sim` ×2 w tych samych warunkach; porównanie przed/po w PERF.md.
- `pnpm bench:sim --update-baseline` tylko z uzasadnieniem w commit message (nie po to, by ukryć regresję).

## 5. `docs/state/PERF.md`

Utwórz (FEATURES DIAG-02 już na niego wskazuje). Zawartość:

- środowisko (CPU/OS/Node, headless Chromium = SwiftShader ≠ GPU),
- sceny bench:sim i bench:render (`pnpm bench:render medium`) z seedem, rozgrzewką, czasem,
- wyniki: mediana/p95/p99, przekroczenia budżetu, liczba próbek, obciążenie (NPC, zwierzęta, chunki),
- budżety D-PERF i ich uzasadnienie,
- najdroższe systemy, znane wąskie gardła (draw calls postaci 7–12/os., superchunki terenu),
- tabela audytu z pkt 3,
- czego nie zmierzono (GPU, realny telefon).

## Kryterium ukończenia

PERF.md istnieje i jest aktualny; brak pętli O(n×m) po aktorach w systemach per-tick; bench po ≤ bench przed (lub wyjaśnione); `pnpm check` zielone; DIAG-02 `evidence` zgodne z rzeczywistością.

## Wynik

- Pomiar przed/po (×2) i audyt w [docs/state/PERF.md](../state/PERF.md). Regresja z sesji 1 (crowded 0.34→0.53, sleep 1.0→1.9) nie potwierdzona na obecnym kodzie: crowded p95 0.36–0.38, sleep 0.59–0.74 ms (świat GEN 7).
- Gorące pętle z pkt 2 zastąpione: `sim/queries.ts` (`animalsNear`/`countNear`), legowiska — jedno przejście na uruchomienie systemu.
- Nowe indeksy w `Sim`: `building(id)` (Map), `householdBuildings`, `settlementBuildings`, `npcsOf`, przestrzenne `groundNear`/`corpsesNear` (mutacje wyłącznie przez `addGround/removeGround/addCorpse/removeCorpse`).
- Po zmianie: neutralnie w granicach szumu przy obecnych populacjach (uzasadnienie w PERF.md); baseline zaktualizowany (świat GEN 5→7).
- Wykryte wąskie gardło renderu (przebudowa roślinności przy przeskoku, p95 30.7 ms przy teleportach) — opisane w PERF.md, do `render--001`.

