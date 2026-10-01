# Kick-off: sesja 3 — fale dodatku 3–5 (długa pętla)

Kontynuujesz pracę nad grą SeedVales (Vue 3 + TypeScript + Three.js, pnpm). Stan na 2026-10-01: v1 domknięte (etap 0), fale 1 (`sim--001`) i 2 (`ui--001`) zrobione z niezależnymi review, z fali 3 zrobiony `economy--001`. Cały interfejs jest po angielsku (UI-LANG-01), mapa ma mgłę wojny (MAP-01). **Ta sesja to długa, samodzielna pętla: realizuj plany po kolei, aż skończą się plany albo trafisz na prawdziwą blokadę.**

## 1. Start (obowiązkowo, zwięźle)

1. Przeczytaj: `CLAUDE.md`, `docs/state/PROGRESS.md` (handoff — sekcja „Sesja 2” i „Następny krok”), `docs/roadmap/v1-closure-and-appendix.md` (kolejność fal), `docs/design/DECISIONS.md`, **`docs/IMPORTANT-PRODUCT-NOTES.md`** (wymagania przekrojowe: język UI, mgła wojny, widoczność wg zmysłów) i `docs/design/ui-english-glossary.md`. `docs/IMPLEMENTATION-PROMPT.md` nadal obowiązuje (§3, §6 diagnostyka, §8 weryfikacja, §10). `docs/VISION.md` / `docs/VISION-APPENDIX.md` tylko w sekcjach potrzebnych do bieżącego planu.
2. `git status`, `git log --oneline | head -20`, `git fetch origin main` — na `main` równolegle pojawiają się commity z dokumentacją (np. `docs/design/quests/`); scal je przed pracą.
3. Środowisko: brak `node_modules` → `pnpm install --frozen-lockfile`. Chromium: `export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (nie uruchamiaj `playwright install`); headless = SwiftShader (FPS niereprezentatywne, CPU tak). `_temp/` (paczki Quaternius) prawdopodobnie nie istnieje — pracuj na `public/assets/` i placeholderach.
4. Weryfikacja stanu: `pnpm check` (oczekiwane **131/131**), `node scripts/check-layers.mjs`; serwer dev w tle z długim limitem (`pnpm dev --port 5199`, timeout ≥ 2 h — krótszy zabija serwer w trakcie e2e), potem `smoke` 3/3, `acceptance` **29/29**, `mobile` **10/10**, 0 błędów konsoli. Jeśli coś pada — to jest pierwsze zadanie.

## 2. Kolejność pracy

Źródło prawdy: `docs/roadmap/v1-closure-and-appendix.md`. Pozostało:

**Fala 3 (dokończyć):**
1. `npc--001` — handel z każdym NPC, prezenty i preferencje, towarzysze (najem na czas/za kwotę/z zadaniem i ryzykiem; darmowe dołączenie), przekazanie i użycie ekwipunku. Relacja = `npc.opinion` (D-PLAN-3).
2. **Review fali 3** (subagent, izolowany worktree): `economy--001` (RES-07, FOOD-03, TRANS-01 — `sim/actions.ts`, `sim/cooking.ts`, `sim/cart.ts`, `render/carts.ts`, migracja `SAVE_VERSION` 6) + `npc--001` → `docs/reviews/YYYY-MM-DD--005--wave3-review.md`, popraw potwierdzone uwagi z testami regresji.

**Fala 4:** `render--001` (pogoda, różnorodność postaci/zwierząt, dekale śladów krwi — TRACE-01 część render, ogień z cząsteczkami/iskrami za profilem jakości D-REN-5); `tools--001` (draft — zdecyduj i zapisz D-TOOLS-1: realizować pierwszy wycinek albo odłożyć z uzasadnieniem).

**Fala 5:** `world--001` (landmarki, skarby — landmarki także na mapie z mgłą wojny); `settlement--001` (draft — doprecyzuj albo odłóż z uzasadnieniem).

**Poza falami (nie zaczynaj bez planu):** MAP-02 (widoczność NPC/zwierząt wg zmysłów, v2 — model TBD w IMPORTANT-PRODUCT-NOTES; jeśli zostanie czas, najpierw plan + decyzja); pakiety zadań fabularnych w `docs/design/quests/` (tylko dokumentacja projektowa — wdrożenie wymaga osobnego planu i uzgodnienia z użytkownikiem).

Po każdej fali: review subagentem, wpis w `docs/reviews/`, poprawki, aktualizacja roadmapy/planów (`Status: done`, `Finished:`).

## 3. Pętla robocza (powtarzaj dla każdej pozycji planu)

1. Weź następną niezrobioną pozycję planu; status planu `in_progress` przy pierwszej.
2. Zweryfikuj w kodzie, czy luka nadal istnieje. Nie → zapisz w „Wynik” planu i dalej.
3. Test, który opisuje nowe zachowanie (vitest; ID z FEATURES w nazwie) — ma najpierw paść.
4. Implementuj minimalnie wg §4.
5. Weryfikacja: `pnpm check` + `check-layers`; przy UI/integracji — e2e (rozszerz `scripts/e2e/acceptance.mjs` / `mobile.mjs`, interakcja przez UI, selektory przez `data-testid`, nie tekst); przy nowym systemie per-tick — `pnpm bench:sim` przed/po; przy zmianach wizualnych — zrzuty i obejrzyj je.
6. Aktualizuj: `docs/state/FEATURES.json` (status + `evidence`, tylko rzeczywiste dowody), „Wynik” planu, `PROGRESS.md` (krótko), `DECISIONS.md` przy istotnych decyzjach.
7. Commit (mały, opisowy) i push: na gałąź sesji **oraz** na `main` (`git push origin HEAD:main` po `git fetch` + merge `origin/main`). Push po każdej ukończonej pozycji — kontener jest ulotny.
8. Wróć do 1.

**Nie kończ tury planem ani pytaniem „czy kontynuować?”.** Pytaj użytkownika tylko przy decyzji zmieniającej wizję; blokadę jednego obszaru zapisz w PROGRESS.md i przejdź do niezależnej pracy.

## 4. Zasady (skrót — pełne w CLAUDE.md i IMPLEMENTATION-PROMPT.md)

- **Cały tekst widoczny dla gracza po angielsku** (D-UI-4, bez warstwy i18n), terminy wg `docs/design/ui-english-glossary.md` (dopisuj nowe terminy). Nazwy własne (osady, NPC) bez zmian. Dokumentacja i komentarze mogą być po polsku. Logika nie może zależeć od treści etykiet (było: `label.includes('owce')`) — używaj id/pól.
- Dwie domeny czasu: kalendarz (potrzeby, produkcja — np. pieczenie D-FOOD-3, psucie, pogoda, zanikanie śladów) vs sekundy rozgrywki (ruch, walka, stamina). Ruchu nie mnożyć ×24.
- Sim/world/data/config/core/save bez three/vue/render/ui/audio; UI zmienia stan tylko przez metody `Game`.
- Nowy zmienny stan → do zapisu; zmiana formatu → bump `SAVE_VERSION` (obecnie **6**) + migracja w `save/migrate.ts` + test. Zmiana generatora → bump `GEN_VERSION` (obecnie 7).
- Tylko zapytania przestrzenne w systemach per-tick (PERF-01). Konserwacja zasobów i pieniędzy: każdy przepływ ma źródło i cel.
- Mapa: mgła wojny (MAP-01) — nowe elementy mapy/minimapy ukrywaj w nieodkrytych komórkach (`isExplored`).
- Nie osłabiaj kryteriów, nie wyłączaj testów, nie zmieniaj budżetów/baseline, by ukryć regresję. „Flaky” to nie diagnoza — szukaj przyczyny (np. krok e2e ze szczurami ujawnił realny błąd zadania).
- Małe pliki/moduły z jedną odpowiedzialnością; bez budowania „silnika” na zapas.

## 5. Praca z subagentami i e2e (lekcje z sesji 2)

- Subagentów (review, równoległe duże zadania jak tłumaczenie) uruchamiaj **zawsze z `isolation: "worktree"`** i zakazem `git checkout/switch/reset/stash` — subagent bez izolacji przełączył kiedyś repo na stary commit.
- Przed uruchomieniem subagentów zacommituj pliki, których potrzebują (worktree powstaje z commita). Po scaleniu ich gałęzi usuń worktree (`git worktree remove`, `git branch -D`) — inaczej vitest/eslint zbierają kopie z `.claude/worktrees/` (było 508 testów zamiast 127). `.claude/worktrees/` dodaj do `.git/info/exclude`.
- W trakcie `pnpm e2e` nie edytuj `src/`, nie uruchamiaj vitest ani `pnpm install` w worktree pod katalogiem repo — HMR Vite przeładowuje stronę („Execution context was destroyed”).
- Zmienne `window.__*` w e2e giną po przeładowaniu strony (krok 9 robi reload) — przekazuj id przez zmienne w skrypcie Node.

## 6. Oszczędność kontekstu i ciągłość

- Skrypty i zbiorcze komendy zamiast długich sekwencji pojedynczych wywołań; do kontekstu tylko podsumowania (np. `pnpm check 2>&1 | grep -E "Tests |✖|error"`).
- Duże, niezależne zadania deleguj subagentom (§5); sam weryfikujesz ich wynik (testy, zrzuty).
- Aktualizuj `PROGRESS.md` po każdym fragmencie i przed kompakcją kontekstu (co zrobione, co w toku, następny krok).

## 7. Zakończenie sesji

`pnpm check`, e2e (smoke, acceptance, mobile), aktualny `PROGRESS.md` (co działa, jak sprawdzone, uproszczenia, braki, znane błędy, dokładny następny krok), commit + push (gałąź sesji i `main`), krótki raport: co zrobiono (plany/FEATURES), wyniki testów, ograniczenia, jak daleko zaszły fale dodatku.

---

**Wiadomość startowa (do wklejenia):**

> Przeczytaj `NEXT-SESSION-KICK-OFF-PROMPT.md` w katalogu głównym i wykonaj go. Zacznij od weryfikacji stanu, potem realizuj plany w kolejności z roadmapy w pętli roboczej (§3), aż skończą się plany albo trafisz na prawdziwą blokadę. Nie kończ na planie ani na pytaniu o kontynuację. Na koniec commit i push do `main`.
