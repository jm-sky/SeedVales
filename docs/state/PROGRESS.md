# Postęp implementacji (handoff)

**Aktualizacja:** 2026-09-30, koniec sesji 1 (przerwana limitem — stan zapisany)

## Stan

Zintegrowana gra działa w przeglądarce: generator świata (seed, cache IndexedDB) → symulacja (NPC utility-AI + Big Five, 8 profesji, zwierzęta, walka, crafting, handel, budowa, reputacja, zadanie ze szczurami, karawany) → rendering Three.js (assety Quaternius) → UI Vue desktop/mobile → zapis/odczyt.

Weryfikacja (ostatnie uruchomienia):
- `pnpm test`: 55/55 (vitest; reguły z FEATURES.json, determinizm, zapis, 3-dniowa symulacja).
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

## Niedokończone / następny krok (priorytet)

1. **Regresja wydajności sim (niepotwierdzona do końca):** `pnpm bench:sim` po ostatnich zmianach AI pokazał p95 crowded-settlement 0.34→0.53 ms i accelerated-sleep 1.0→1.9 ms (powtórka potwierdziła częściowo; pierwszy przebieg miał skok `quests` 14.7 ms — prawdopodobnie szum WSL). Wszystko nadal < budżetu 4 ms. Do zrobienia: zastąpić pętle O(budynki×zwierzęta) w `sim/quests.ts` i `worldSystems.ts` (rats/wolves/dens `animals.filter`) zapytaniami `sim.actors.query`, powtórzyć benchmark, zaktualizować baseline.
2. **Niezależny review (subagent) nie zakończył się** przed utratą połączenia — uruchomić ponownie (zakres: zachowanie zasobów/pieniędzy, kompletność zapisu, domeny czasu, pętle AI, inne seedy) i zapisać wynik w `docs/reviews/`.
3. `docs/state/PERF.md` — spisać wyniki benchmarków (sim + render medium) i budżety; obecnie tylko w `test-results/bench` (gitignored).
4. Znane ograniczenia: rzeki min. ~8 m szerokości; brak modeli dla szczura/zająca/dzika/niedźwiedzia/owcy/kury/łosia (placeholdery); broń w dłoni nieswidoczna; postacie 7–12 draw calli każda (join skinned nie działa); Esc przy pointer-lock wymaga dwóch naciśnięć; dźwięki proceduralne (placeholder).
5. Odłożone (deferred): jaskinie, kontynenty/transport, jazda konna, książki skilli, rybołówstwo, pozostałe profesje, demografia, zadania narracyjne, głosy.

## Czy v1 ukończone?

Wymagany zakres §4 ma działające implementacje i weryfikację (poza 2 pozycjami implemented_unverified). Otwarte przed ogłoszeniem v1: pkt 1–3 powyżej (review + raport wydajności).
