# Postęp implementacji (handoff)

**Aktualizacja:** 2026-09-30, sesja 2 (długa pętla: domknięcie v1 → dodatek)

## Sesja 2

### Etap 0 — domknięcie v1 (zakończony)

- `game--002` done (A1–A6, B1–B7, C1–C9 bez C6, D), `diag--001` done (`docs/state/PERF.md`), RES-04 verified, WORLD-10 logika zweryfikowana / dźwięk nieodsłuchany (D-PLAN-5).
- Niezależne review: `docs/reviews/2026-09-30--002--v1-closure-review.md` — 10 ustaleń, wszystkie potwierdzone poprawione (broń NPC po walce, zwłoki szczura, zamówienia z rezerwacją i anulowaniem, obieg pieniędzy D-ECON-3, wiadro pasterza, meta starych zapisów, objazd, udźwig przy magazynie).
- Formaty: `SAVE_VERSION` 4, `GEN_VERSION` 7 (stare zapisy: migracja formatu; inny generator → odrzut z komunikatem, menu je oznacza).
- Weryfikacja końcowa: `pnpm check` 91/91 (type-check, lint, check-layers, vitest), e2e smoke 3/3, acceptance 16/16, mobile 7/7, 0 błędów konsoli; `bench:sim` wszystkie sceny p95 < 1.1 ms (budżet 4 ms).

### Czy v1 ukończone? **TAK** (2026-09-30)

Uzasadnienie: wszystkie wymagania `scope: v1` w FEATURES.json mają status `verified` (76) poza WORLD-10 (`implemented_unverified` — brak możliwości odsłuchu w headless, decyzja D-PLAN-5, nie blokuje); 11 pozycji `deferred` zgodnie z DECISIONS/prompt §4. Ustalenia obu review (001 Grok/Scribe, 002 subagent) poprawione z testami regresji albo jawnie odrzucone/odłożone z uzasadnieniem. Znane ograniczenia (nie blokujące): dźwięki proceduralne nieodsłuchane; brak pomiaru GPU i telefonu; przebudowa roślinności przy teleporcie (p95 ~31 ms, PERF.md); postacie 7–12 draw calli; placeholdery zwierząt (szczur, zając, dzik, niedźwiedź, owca, kura, łoś); mapa mobile przycięta w poziomie (do `ui--001`); aktor stojący w wąskim przejściu może blokować innych (D-SIM-11).

### Fale dodatku

- Następny krok: fala 1 — `docs/plans/sim--001--ai-cadence-and-animal-threat.md`.

## Sesja przygotowawcza 2026-09-30 (docs only, bez zmian w kodzie)

- Zapoznano się z `docs/VISION-APPENDIX.md` i review Grok/Scribe (`docs/reviews/2026-09-30--001--v1-review.md`).
- Review: wyrywkowo potwierdzono w kodzie #1 (kowal), #2 (karawana), #3 (pościg), #4 (genVersion), #5 (slot) — triage i plan: `docs/plans/game--002--v1-review-fixes.md`.
- FEATURES.json: statusy obniżone zgodnie z review (CRAFT-02, SAVE-01, ECON-01, WORLD-04 → `in_progress`; DIAG-02 → `implemented_unverified`, PERF.md nie istnieje) — D-PLAN-2. Dodano PERF-01 (v1) i 25 wymagań z dodatku (`scope: "v2"`, `planned`).
- Nowe plany: `game--002`, `diag--001` (etap 0 = domknięcie v1), `sim--001`, `ui--001`, `economy--001`, `npc--001`, `render--001`, `world--001`, `tools--001` (draft), `settlement--001` (draft). Kolejność: `docs/roadmap/v1-closure-and-appendix.md` (D-PLAN-1: najpierw v1, potem dodatek).
- CLAUDE.md zaktualizowany (stan repo, komendy), `docs/README.md` = indeks, `NEXT-SESSION-KICK-OFF-PROMPT.md` przepisany pod długą pętlę.
- Weryfikacja stanu w czystym kontenerze: `pnpm install --frozen-lockfile` OK, `pnpm check` OK (**54/54** testów, 8 plików — PROGRESS sesji 1 podawał 55), `node scripts/check-layers.mjs` OK. e2e/bench nie uruchamiane w tej sesji.

## Stan po sesji 1

## Stan

Zintegrowana gra działa w przeglądarce: generator świata (seed, cache IndexedDB) → symulacja (NPC utility-AI + Big Five, 8 profesji, zwierzęta, walka, crafting, handel, budowa, reputacja, zadanie ze szczurami, karawany) → rendering Three.js (assety Quaternius) → UI Vue desktop/mobile → zapis/odczyt.

Weryfikacja (ostatnie uruchomienia):
- `pnpm test`: 55/55 wg sesji 1 (54/54 w sesji przygotowawczej) (vitest; reguły z FEATURES.json, determinizm, zapis, 3-dniowa symulacja).
- `scripts/e2e/acceptance.mjs` (§9 desktop): 15/15, 0 błędów konsoli. `scripts/e2e/mobile.mjs`: 6/6 (emulacja telefonu).
- `scripts/check-layers.mjs`: OK. type-check + lint: OK.
- FEATURES.json: 74 verified, 2 implemented_unverified (WORLD-10 dźwięk — nie odsłuchany; RES-04 plony sezonowe), 11 deferred (zgodnie z prompt §4 / DECISIONS).
- Headless = SwiftShader: pomiary FPS/GPU niereprezentatywne; CPU tak (patrz `test-results/bench/*`, lokalnie).

## Komendy

```bash
pnpm dev --port 5199            # gra: http://localhost:5199/?seed=1337
pnpm check                      # type-check + lint + test
pnpm e2e                        # smoke + acceptance + mobile (wymaga dev servera na :5199)
node scripts/e2e/tour.mjs       # zrzuty do przeglądu wizualnego
pnpm bench:sim [--update-baseline]   # benchmark CPU symulacji (JSON+MD w test-results/bench)
pnpm bench:render [low|medium]       # benchmark renderu w przeglądarce
node scripts/check-layers.mjs
node scripts/assets/build-assets.mjs # tylko gdy _temp/extracted jest dostępny
```

## Następny krok

Etap 0 z `docs/roadmap/v1-closure-and-appendix.md`: plan `game--002` (grupa A: A1–A6), potem `diag--001`, potem RES-04/WORLD-10. Dopiero po ogłoszeniu v1 — fala 1 (`sim--001`).

## Niedokończone po sesji 1 (historyczne — pkt 1–3 przeniesione do planów diag--001 i game--002)

1. **Regresja wydajności sim (niepotwierdzona do końca):** `pnpm bench:sim` po ostatnich zmianach AI pokazał p95 crowded-settlement 0.34→0.53 ms i accelerated-sleep 1.0→1.9 ms (powtórka potwierdziła częściowo; pierwszy przebieg miał skok `quests` 14.7 ms — prawdopodobnie szum WSL). Wszystko nadal < budżetu 4 ms. Do zrobienia: zastąpić pętle O(budynki×zwierzęta) w `sim/quests.ts` i `worldSystems.ts` (rats/wolves/dens `animals.filter`) zapytaniami `sim.actors.query`, powtórzyć benchmark, zaktualizować baseline.
2. **Niezależny review (subagent) nie zakończył się** przed utratą połączenia — uruchomić ponownie (zakres: zachowanie zasobów/pieniędzy, kompletność zapisu, domeny czasu, pętle AI, inne seedy) i zapisać wynik w `docs/reviews/`.
3. `docs/state/PERF.md` — spisać wyniki benchmarków (sim + render medium) i budżety; obecnie tylko w `test-results/bench` (gitignored).
4. Znane ograniczenia: rzeki min. ~8 m szerokości; brak modeli dla szczura/zająca/dzika/niedźwiedzia/owcy/kury/łosia (placeholdery); broń w dłoni nieswidoczna; postacie 7–12 draw calli każda (join skinned nie działa); Esc przy pointer-lock wymaga dwóch naciśnięć; dźwięki proceduralne (placeholder).
5. Odłożone (deferred): jaskinie, kontynenty/transport, jazda konna, książki skilli, rybołówstwo, pozostałe profesje, demografia, zadania narracyjne, głosy.

## Czy v1 ukończone?

**Nie.** Review wykazało błędy konserwacji zasobów/pieniędzy i parowania save↔generator (plan game--002). Tekst poniżej to ocena z sesji 1.


Wymagany zakres §4 ma działające implementacje i weryfikację (poza 2 pozycjami implemented_unverified). Otwarte przed ogłoszeniem v1: pkt 1–3 powyżej (review + raport wydajności).
