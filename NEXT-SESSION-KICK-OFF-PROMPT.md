# Kick-off: sesja 2 — domknięcie v1, potem VISION-APPENDIX (długa pętla)

Kontynuujesz pracę nad grą SeedVales (Vue 3 + TypeScript + Three.js, pnpm). Sesja 1 dostarczyła zintegrowaną grę. Sesja przygotowawcza (2026-09-30, tylko dokumentacja) przejrzała review Grok/Scribe i `docs/VISION-APPENDIX.md` i rozpisała całą dalszą pracę na plany. **Ta sesja to długa, samodzielna pętla: realizuj plany po kolei, aż skończą się plany albo trafisz na prawdziwą blokadę.**

## 1. Start (obowiązkowo, zwięźle)

1. Przeczytaj: `CLAUDE.md`, `docs/state/PROGRESS.md` (handoff), `docs/roadmap/v1-closure-and-appendix.md` (kolejność pracy), `docs/design/DECISIONS.md`. `docs/IMPLEMENTATION-PROMPT.md` nadal obowiązuje (§3, §6 diagnostyka, §8 weryfikacja, §10) — przeczytaj go raz; `docs/VISION.md` i `docs/VISION-APPENDIX.md` tylko w sekcjach potrzebnych do bieżącego planu.
2. `git status`, `git log --oneline | head -20`.
3. Środowisko: jeśli brak `node_modules` → `pnpm install --frozen-lockfile`. W kontenerze chmurowym Chromium jest w `/opt/pw-browsers` (nie uruchamiaj `playwright install`); headless = SwiftShader (FPS niereprezentatywne, CPU tak). `_temp/` (paczki Quaternius) prawdopodobnie **nie istnieje** — pracuj na `public/assets/` i placeholderach, zapisz braki w `docs/assets/README.md`.
4. Weryfikacja stanu: `pnpm check` (oczekiwane 54/54), `node scripts/check-layers.mjs`, `pnpm dev --port 5199` w tle i `pnpm e2e` (oczekiwane: acceptance 15/15, mobile 6/6, 0 błędów konsoli). Jeśli coś pada — to jest pierwsze zadanie.

## 2. Kolejność pracy

Źródło prawdy: `docs/roadmap/v1-closure-and-appendix.md`. Skrót:

**Etap 0 — domknięcie v1 (najpierw, w całości):**
1. `docs/plans/game--002--v1-review-fixes.md` — grupa A (A1 kowal, A2 karawana, A3 pościg, A4 genVersion/migrate, A5 sloty zapisu, A6 multi-seed WORLD-04), potem B (konserwacja zasobów/pieniędzy), potem C, D w miarę czasu.
2. `docs/plans/diag--001--sim-hotspots-and-perf-report.md` — O(n×m) → spatial query, audyt pełnych skanów, `docs/state/PERF.md`.
3. RES-04 (test plonów sezonowych), WORLD-10 (jawnie: logika przetestowana, dźwięk nieodsłuchany).
4. Niezależne review (subagent, który nie pisał kodu) zmian z etapu 0 → `docs/reviews/YYYY-MM-DD--002--v1-closure-review.md`; popraw potwierdzone uwagi.
5. Pełna weryfikacja (`pnpm check`, `pnpm e2e`, `pnpm bench:sim`) i **jawna decyzja w PROGRESS.md: „v1 ukończone: tak/nie + dlaczego”**.

**Fale dodatku (dopiero po etapie 0):**
1. `sim--001` — kadencja decyzji AI, zwierzęta domowe/dzikie przy zagrożeniu, zwłoki, ślady krwi (sim)
2. `ui--001` — ekrany postaci, filtrowanie/sortowanie, mapa + minimapa, ustawienia, nazwane zapisy, `Tab`
3. `economy--001` (pień/skały, gotowanie, taczka) i `npc--001` (handel z każdym, prezenty, towarzysze)
4. `render--001` (pogoda, różnorodność postaci/zwierząt, krew, ogień); `tools--001` (draft — zdecyduj i zapisz D-TOOLS-1)
5. `world--001` (landmarki, skarby); `settlement--001` (draft — doprecyzuj albo odłóż z uzasadnieniem)

Po każdej fali: review subagentem (jak w etapie 0), wpis w `docs/reviews/`, poprawki.

## 3. Pętla robocza (powtarzaj dla każdej pozycji planu)

1. Weź następną niezrobioną pozycję z bieżącego planu. Ustaw status planu na `in_progress` (przy pierwszej pozycji).
2. Zweryfikuj w kodzie, czy problem/luka nadal istnieje. Nie potwierdza się → zapisz w sekcji planu „Wynik” i idź dalej.
3. Napisz test, który reprodukuje problem albo opisuje nowe zachowanie (vitest; ID z FEATURES w nazwie testu). Ma najpierw paść.
4. Implementuj minimalnie, zgodnie z zasadami z §4.
5. Weryfikacja: `pnpm check` + `node scripts/check-layers.mjs`; przy zmianach UI/integracji — `pnpm e2e` (i rozszerz scenariusz e2e o nową funkcję, interakcja przez UI); przy zmianach wydajnościowych lub nowym systemie per-tick — `pnpm bench:sim` / `pnpm bench:render medium` przed/po. Przy zmianach wizualnych — `node scripts/e2e/tour.mjs` i obejrzyj wybrane zrzuty.
6. Zaktualizuj: status i `evidence` w `docs/state/FEATURES.json` (tylko rzeczywiste dowody), sekcję „Wynik” planu, `docs/state/PROGRESS.md` (krótko), `DECISIONS.md` przy istotnych decyzjach.
7. Commit (mały, spójny, opisowy). Push na gałąź wskazaną w instrukcjach tej sesji — regularnie (co najmniej po każdej ukończonej pozycji A/B i każdym planie), bo kontener jest ulotny. Bez deploy.
8. Wróć do kroku 1. Po ukończeniu planu: status `done`, `Finished:` data, następny plan wg roadmapy.

**Nie kończ tury planem, pytaniem „czy kontynuować?” ani zapowiedzią.** Pytaj użytkownika tylko przy decyzji zmieniającej wizję; przy blokadzie jednego obszaru zapisz ją w PROGRESS.md i przejdź do niezależnej pracy.

## 4. Zasady (skrót — pełne w CLAUDE.md i IMPLEMENTATION-PROMPT.md)

- Dwie domeny czasu: kalendarz (potrzeby, produkcja, pieczenie, psucie, pogoda, zanikanie śladów) vs sekundy rozgrywki (ruch, walka, stamina). Ruchu nie mnożyć ×24.
- Sim/world/data/config/core/save bez three/vue/render/ui/audio; UI nie mutuje `sim.state` bezpośrednio.
- Nowy zmienny stan → do zapisu; zmiana formatu → bump `SAVE_VERSION` + migracja lub jawny odrzut (po A4). Zmiana generatora → bump `GEN_VERSION`.
- Tylko zapytania przestrzenne w systemach per-tick (PERF-01). Każdy nowy system: pomiar w `diag`.
- Konserwacja zasobów i pieniędzy: każdy przepływ ma źródło i cel (lub jawne źródło w DECISIONS).
- Nie osłabiaj kryteriów, nie wyłączaj ani nie pomijaj testów, nie zmieniaj budżetów/baseline, by ukryć regresję.
- Relacja z NPC = `npc.opinion` (D-PLAN-3). Low-poly ≠ limit jakości, ale efekty za profilem jakości (D-REN-5).
- Małe pliki/moduły z jedną odpowiedzialnością; bez budowania „silnika” na zapas.

## 5. Oszczędność kontekstu i ciągłość

- Skrypty i zbiorcze komendy zamiast długich sekwencji pojedynczych wywołań; do kontekstu tylko podsumowania (np. `pnpm test 2>&1 | tail -20`).
- Duże, niezależne zadania (review, eksploracja) deleguj subagentom; sam weryfikujesz ich wynik.
- Aktualizuj `PROGRESS.md` po każdym fragmencie i przed kompakcją kontekstu (co zrobione, co w toku, następny krok).

## 6. Zakończenie sesji

`pnpm check`, `pnpm e2e`, aktualny `PROGRESS.md` (co działa, jak sprawdzone, uproszczenia, braki, znane błędy, dokładny następny krok, komendy), commit + push, krótki raport: jak uruchomić, co zrobiono (plany/FEATURES), wyniki testów i benchmarków, ograniczenia, **czy v1 jest ukończone**, jak daleko zaszły fale dodatku.

---

**Wiadomość startowa (do wklejenia):**

> Przeczytaj `NEXT-SESSION-KICK-OFF-PROMPT.md` w katalogu głównym i wykonaj go. Zacznij od weryfikacji stanu, potem realizuj plany w kolejności z roadmapy w pętli roboczej (§3), aż skończą się plany albo trafisz na prawdziwą blokadę. Nie kończ na planie ani na pytaniu o kontynuację.
