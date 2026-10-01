# Postęp implementacji (handoff)

**Aktualizacja:** 2026-10-01

## Teraz

- Weryfikacja (ostatnia, 2026-10-01): `pnpm check` 144/144, `pnpm e2e:run`: acceptance 30/30, mobile 10/10, smoke 3/3, 0 błędów konsoli; `check-layers` OK; `bench:sim` ok (powtórka; pierwszy przebieg na WSL dał szum).
- Formaty: `SAVE_VERSION` 7, `GEN_VERSION` 7.
- v1 kompletne (2026-09-30, potwierdzone po UI-LANG-01 2026-10-01); wyjątek: WORLD-10 (dźwięk nieodsłuchany).
- Fale: 1 `sim--001` done, 2 `ui--001` done, 3 `economy--001` done / `npc--001` done (review 006 w toku); 4a `render--002`, 4b `render--001`, 5, 6 — nierozpoczęte.
- Następny krok: review fali 3 (numer 006), potem fala 4a `render--002`.
- ❓ dla użytkownika: akceptacja wyglądu po A/B (gładki teren, tone mapping); pomiar na urządzeniu (D-PERF-2).
- Starsze sekcje (sesja przygotowawcza, stan po sesji 1): [progress-log.md](progress-log.md).

## Sesja 2

### Etap 0 — domknięcie v1 (zakończony)

- `game--002` done (A1–A6, B1–B7, C1–C9 bez C6, D), `diag--001` done (`docs/state/PERF.md`), RES-04 verified, WORLD-10 logika zweryfikowana / dźwięk nieodsłuchany (D-PLAN-5).
- Niezależne review: `docs/reviews/2026-09-30--002--v1-closure-review.md` — 10 ustaleń, wszystkie potwierdzone poprawione (broń NPC po walce, zwłoki szczura, zamówienia z rezerwacją i anulowaniem, obieg pieniędzy D-ECON-3, wiadro pasterza, meta starych zapisów, objazd, udźwig przy magazynie).
- Formaty: `SAVE_VERSION` 4, `GEN_VERSION` 7 (stare zapisy: migracja formatu; inny generator → odrzut z komunikatem, menu je oznacza).
- Weryfikacja końcowa: `pnpm check` 91/91 (type-check, lint, check-layers, vitest), e2e smoke 3/3, acceptance 16/16, mobile 7/7, 0 błędów konsoli; `bench:sim` wszystkie sceny p95 < 1.1 ms (budżet 4 ms).

### Czy v1 ukończone? **TAK** (2026-09-30)

Uzasadnienie: wszystkie wymagania `scope: v1` w FEATURES.json mają status `verified` (76) poza WORLD-10 (`implemented_unverified` — brak możliwości odsłuchu w headless, decyzja D-PLAN-5, nie blokuje); 11 pozycji `deferred` zgodnie z DECISIONS/prompt §4. Ustalenia obu review (001 Grok/Scribe, 002 subagent) poprawione z testami regresji albo jawnie odrzucone/odłożone z uzasadnieniem. Znane ograniczenia (nie blokujące): dźwięki proceduralne nieodsłuchane; brak pomiaru GPU i telefonu; przebudowa roślinności przy teleporcie (p95 ~31 ms, PERF.md); postacie 7–12 draw calli; placeholdery zwierząt (szczur, zając, dzik, niedźwiedź, owca, kura, łoś); mapa mobile przycięta w poziomie (do `ui--001`); aktor stojący w wąskim przejściu może blokować innych (D-SIM-11).

### Fale dodatku

- **Fala 1 `sim--001` done** — AI-01, FAUNA-06/07/08 verified, TRACE-01 (część sim; dekale w render--001). `SAVE_VERSION` 5.
- Review fali 1: `docs/reviews/2026-09-30--003--wave1-sim-review.md` — 9 ustaleń; 7 poprawionych z testami regresji (sarna przy legowisku nie szarżuje — D-SIM-13, lis jako zagrożenie dla drobiu, cooldown po spłoszeniu, ślad krwi nie odwiedzany ponownie, sezonowa noc w detekcji, migracja 4→5 przypina szczury do gniazda, szansa ataku wściekłego zwierzęcia), 2 informacyjne.
- **Fala 2 `ui--001`:** zrobione kroki 1–2 (UI-03 verified: ekran postaci, broń podstawowa + X/„Broń”, ekwipunek filtr/sort/szczegóły) i krok 6 (UI-06 verified: Tab/„Cel” cyklicznie przez cele w zasięgu, pierścień celu). e2e: acceptance 19/19 (nowe kroki 10–11; krok 8 idzie do tablicy osady, w której pojawiło się gniazdo), mobile 9/9 (M7–M8), smoke 3/3; `pnpm check` 112/112.
- Uwaga dla e2e: nie edytuj `src/` ani nie uruchamiaj vitest w trakcie `pnpm e2e` — HMR Vite przeładowuje stronę („Execution context was destroyed”); worktree subagenta w katalogu repo też to wywołuje.
- Krok 3 (UI-04 verified): mapa z celem/odwiedzonymi osadami/znacznikami zadań + minimapa ze strzałką do celu (`sim/navigation.ts`, `hud/Minimap.vue`). e2e acceptance 21/21, mobile 9/9.
- Kroki 4–5 (UI-05 verified): ustawienia jakości/głośności bez restartu, zapisy pod nazwą, nowa gra z menu gry. **Fala 2 `ui--001` done** — UI-03/04/05/06 verified. Weryfikacja: `pnpm check` (type-check, lint, vitest 119/119), check-layers OK, e2e acceptance 24/24, mobile 10/10, smoke 3/3, 0 błędów konsoli.
- Review fali 2: `docs/reviews/2026-09-30--004--wave2-ui-review.md` — 7 ustaleń, 6 poprawionych (szczegóły przedmiotu, jakość po nowej grze, mapa cieni, broń dwuręczna vs pochodnia, NaN celu, kontekst WebGL), 1 info.
- **Fala 3 `economy--001` w toku:** krok 1 RES-07 verified (głaz → odłamki → kamienie, pień), krok 2 FOOD-03 verified (pieczenie partiami: ognisko 1 / patelnia 2 / ruszt 5, gatunek i świeżość w produkcie — D-FOOD-3). `pnpm check` 126/126, e2e acceptance 27/27, mobile 10/10, smoke 3/3.
- **Nowe wymagania z `docs/IMPORTANT-PRODUCT-NOTES.md` (dodane na main w trakcie sesji):** MAP-01 mgła wojny (v1) — **zrobione** (D-MAP-1, test + e2e); UI-LANG-01 cały tekst dla gracza po angielsku (v1) — **planned**, duża zmiana przekrojowa (wymaga planu: katalog tekstów, nazwy przedmiotów/receptur w `data/`, komunikaty sim, selektory tekstowe w e2e); MAP-02 widoczność aktorów wg zmysłów (v2) — planned. Status v1 w świetle nowych wymagań: **brakuje UI-LANG-01**.
- **UI-LANG-01 verified (2026-10-01):** cały interfejs po angielsku (decyzja użytkownika: bez i18n, D-UI-4; słownik `docs/design/ui-english-glossary.md`). Nazwy własne bez zmian. Nowy tekst dla gracza pisz od razu po angielsku według słownika. **v1 znów kompletne** wg FEATURES (poza WORLD-10 — dźwięk nieodsłuchany).
- **Fala 3 `economy--001` done (2026-10-01):** RES-07, FOOD-03, TRANS-01 verified (taczka/wózek, `SAVE_VERSION` 6). `pnpm check` 131/131, e2e acceptance 29/29, mobile 10/10, smoke 3/3.
- Następny krok: `npc--001` (handel z każdym NPC, prezenty, towarzysze), potem review fali 3 (subagent w izolowanym worktree; zakres od `0514669^` / `2c6e4d6^` do HEAD w `src/game/sim/{actions,cooking,cart}.ts` i powiązanych).
- **Plan grafiki (docs, 2026-10-01):** research 002 + review 005 wpięte w roadmapę — fala 4 = 4a `render--002` (metryki PERF-02 → światło/niebo → teren → pilot PBR) → 4b `render--001` (przepisany: opady już istnieją, pula 7 świateł, wiatr/woda RENDER-05); nowa fala 6 `render--003` (draft, warunkowy: wykończenie i optymalizacje tylko przy zmierzonym problemie). Decyzje D-REN-6/7, D-PERF-2. ❓ Dla użytkownika: akceptacja wyglądu po A/B (gładki teren, tone mapping) i pomiar na realnym laptopie/telefonie (checklista powstanie w `render--002` krok 0). Review fali 3 → numer **006**.

## Sesja 3

- **`npc--001` done (2026-10-01):** TRADE-02 (handel nadwyżkami z każdym NPC, Give), SOC-01 (prezenty, życzenia w rozmowie), COMP-01 (najem: dni/zadanie/ryzyko, podążanie, wygasanie), COMP-02 (darmowe dołączenie, syn w każdej osadzie), COMP-03 (lepsza broń/pancerz) — verified. `SAVE_VERSION` 7 (D-NPC-1…5). `pnpm check` 144/144, e2e acceptance 30/30 (nowy krok 17: najem + prezent przez UI), mobile 10/10, smoke 3/3.

