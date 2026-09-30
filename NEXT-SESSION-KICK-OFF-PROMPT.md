# Kick-off: sesja 2 — domknięcie v1

Kontynuujesz pracę nad grą SeedVales (Vue 3 + TypeScript + Three.js, pnpm). Sesja 1 dostarczyła działającą, zintegrowaną grę, ale v1 nie jest jeszcze ogłoszone jako ukończone.

## Na start (obowiązkowo, zwięźle)

1. Przeczytaj: `CLAUDE.md`, `docs/IMPLEMENTATION-PROMPT.md` (standing brief — obowiązuje nadal), `docs/state/PROGRESS.md` (handoff), `docs/design/DECISIONS.md`, `docs/state/FEATURES.json`. `docs/VISION.md` tylko w potrzebnych sekcjach.
2. `git status`, `git log --oneline | head -15`.
3. Weryfikacja stanu: `pnpm check` (type-check + lint + 55 testów), `node scripts/check-layers.mjs`, uruchom `pnpm dev --port 5199` w tle i `pnpm e2e` (oczekiwane: acceptance 15/15, mobile 6/6, 0 błędów konsoli).
4. Nie projektuj całości od nowa — kontynuuj od listy poniżej.

## Zadania (w tej kolejności)

1. **Niezależny review** — zleć subagentowi (nie autorowi kodu) review `src/game/sim/**`, `src/game/save/**`, `src/game/world/gen/**`, `src/game/Game.ts` pod kątem: zachowania zasobów/pieniędzy (handel, crafting, budowa, magazyny, zamówienia, przerwanie czynności), kompletności zapisu (stan poza `GameState`), mieszania domen czasu (kalendarz vs sekundy rozgrywki), zapętleń/zawieszeń AI, działania dla innych seedów niż 1337. Oceń uwagi, popraw potwierdzone błędy, dodaj testy regresji, zapisz wynik w `docs/reviews/YYYY-MM-DD--001--v1-review.md`.
2. **Wydajność symulacji** — `pnpm bench:sim` (powtórz, by potwierdzić). Zastąp pętle O(budynki×zwierzęta) w `src/game/sim/quests.ts` i `src/game/sim/worldSystems.ts` (`animals.filter` dla szczurów/wilków/legowisk) zapytaniami `sim.actors.query`; porównaj przed/po w tych samych warunkach, sprawdź poprawność (testy), zaktualizuj baseline (`--update-baseline`) z uzasadnieniem.
3. **Raport wydajności** — utwórz `docs/state/PERF.md`: środowisko, sceny, wyniki sim (CPU) i render (`pnpm bench:render medium`, zaznacz że SwiftShader ≠ GPU), budżety (D-PERF), najdroższe systemy, znane wąskie gardła (draw calls postaci 7–12/os., superchunki terenu).
4. **Pozycje implemented_unverified** w FEATURES.json: RES-04 (sezonowe plony — dopisz test), WORLD-10 (dźwięk — test logiki jest; oznacz jasno brak odsłuchu).
5. Jeśli zostanie czas (mniejsze, w miarę wartości): widoczna broń/narzędzie w dłoni, Esc zamykający menu przy pointer-lock jednym naciśnięciem, lżejsze postacie (mniej draw calli), zdjęcia z `node scripts/e2e/tour.mjs` do przeglądu wizualnego i poprawki UI.

## Zasady

- Zasady z `docs/IMPLEMENTATION-PROMPT.md` (§3, §6 diagnostyka, §8 weryfikacja, §10 zakończenie) nadal obowiązują.
- Małe, spójne commity; po każdym fragmencie aktualizuj `docs/state/PROGRESS.md`. Bez push/deploy.
- Przed zakończeniem: `pnpm check`, `pnpm e2e`, aktualny `PROGRESS.md` (co działa, jak sprawdzone, braki, następny krok, komendy) i krótki raport: jak uruchomić, zakres, wyniki testów, ograniczenia, **czy v1 jest ukończone**.
- Oszczędzaj kontekst: skrypty zamiast długich sekwencji pojedynczych wywołań; do kontekstu tylko podsumowania.

---

**Wiadomość startowa (do wklejenia):**

> Przeczytaj `NEXT-SESSION-KICK-OFF-PROMPT.md` w katalogu głównym i wykonaj opisane zadania. Zacznij od weryfikacji stanu, potem realizuj listę po kolei. Nie kończ na planie.
