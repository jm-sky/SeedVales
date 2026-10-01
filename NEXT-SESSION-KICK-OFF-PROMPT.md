# Kick-off: sesja 3 — fale dodatku 3–5 (długa pętla)

Kontynuujesz pracę nad grą SeedVales (Vue 3 + TypeScript + Three.js, pnpm). Stan na 2026-10-01: v1 domknięte (etap 0), fale 1 (`sim--001`) i 2 (`ui--001`) zrobione z niezależnymi review, z fali 3 zrobiony `economy--001`. Cały interfejs jest po angielsku (UI-LANG-01), mapa ma mgłę wojny (MAP-01). **Ta sesja to długa, samodzielna pętla: realizuj plany po kolei, aż skończą się plany albo trafisz na prawdziwą blokadę.**

## 1. Start (obowiązkowo, zwięźle)

1. Przeczytaj: `CLAUDE.md`, `docs/state/PROGRESS.md` (handoff — sekcja „Sesja 2” i „Następny krok”), `docs/roadmap/v1-closure-and-appendix.md` (kolejność fal), `docs/design/DECISIONS.md`, **`docs/IMPORTANT-PRODUCT-NOTES.md`** (wymagania przekrojowe: język UI, mgła wojny, widoczność wg zmysłów) i `docs/design/ui-english-glossary.md`. `docs/IMPLEMENTATION-PROMPT.md` nadal obowiązuje (§3, §6 diagnostyka, §8 weryfikacja, §10). `docs/VISION.md` / `docs/VISION-APPENDIX.md` tylko w sekcjach potrzebnych do bieżącego planu.
2. `git status`, `git log --oneline | head -20`, `git fetch origin main` — na `main` równolegle pojawiają się commity z dokumentacją (np. `docs/design/quests/`); scal je przed pracą.
3. Środowisko: brak `node_modules` → `pnpm install --frozen-lockfile`. Chromium wykrywany automatycznie (`scripts/e2e/lib.mjs`; nadpisanie przez `CHROME_PATH`, nie uruchamiaj `playwright install`); headless = SwiftShader (FPS niereprezentatywne, CPU tak). `_temp/` (paczki Quaternius) prawdopodobnie nie istnieje — pracuj na `public/assets/` i placeholderach.
4. Weryfikacja stanu: `pnpm check` (oczekiwane **131/131**), `node scripts/check-layers.mjs`; `pnpm e2e:run` (sam stawia serwer bez HMR): `smoke` 3/3, `acceptance` **29/29**, `mobile` **10/10**, 0 błędów konsoli. Jeśli coś pada — to jest pierwsze zadanie.

## 2. Kolejność pracy

Źródło prawdy: `docs/roadmap/v1-closure-and-appendix.md`. Pozostało:

**Fala 3 (dokończyć):**
1. `npc--001` — handel z każdym NPC, prezenty i preferencje, towarzysze (najem na czas/za kwotę/z zadaniem i ryzykiem; darmowe dołączenie), przekazanie i użycie ekwipunku. Relacja = `npc.opinion` (D-PLAN-3).
2. **Review fali 3** (skill `wave-review`): `economy--001` (RES-07, FOOD-03, TRANS-01 — `sim/actions.ts`, `sim/cooking.ts`, `sim/cart.ts`, `render/carts.ts`, migracja `SAVE_VERSION` 6) + `npc--001` → `docs/reviews/YYYY-MM-DD--006--wave3-review.md` (005 zajęte przez review renderingu).

**Fala 4** (kolejność = zależność techniczna, D-REN-7; przeczytaj research `docs/research/2026-10-01--002--realistic-visuals-practical-roadmap.md` §4–§8 i review `docs/reviews/2026-10-01--005--…`):
- **4a `render--002`** — najpierw metryki renderu (PERF-02: RAF pacing, GPU timer, spójne okna kwantyli, sceny noc/woda/deszcz/śnieg/marsz, baseline w PERF.md), potem światło/tone mapping/niebo, gładki teren + detal gruntu (tint przez uniformy), pilot PBR+IBL na jednym assecie. Każdy krok: timebox, fallback, keep/drop, zrzuty przed/po z tych samych kadrów.
- **4b `render--001`** — ogień + pula świateł per profil, chmury + ulepszenie **istniejących** opadów, mokry teren/śnieg na uniformach, CHAR-01 (bez wzrostu draw calli), FAUNA-09, wiatr, woda, dekale. CHAR-01/FAUNA-09 mogą iść równolegle z 4a.
- `tools--001` (draft — zdecyduj i zapisz D-TOOLS-1: realizować pierwszy wycinek albo odłożyć z uzasadnieniem).
- Wydajność na urządzeniu mierzy użytkownik (D-PERF-2): zostaw checklistę w PROGRESS.md jako ❓ i nie blokuj pętli; nie ogłaszaj efektu „tanim” na podstawie SwiftShadera.

**Fala 5:** `world--001` (landmarki, skarby — landmarki także na mapie z mgłą wojny; `bench:render` ze sceną landmarku); `settlement--001` (draft — doprecyzuj albo odłóż z uzasadnieniem).

**Fala 6:** `render--003` (draft, warunkowy) — przejrzyj PERF.md po falach 4–5 i dane z urządzeń (jeśli są); uruchamiaj tylko pozycje odpowiadające na zmierzony problem, resztę zamknij jako „niepotrzebne”.

**Poza falami (nie zaczynaj bez planu):** MAP-02 (widoczność NPC/zwierząt wg zmysłów, v2 — model TBD w IMPORTANT-PRODUCT-NOTES; jeśli zostanie czas, najpierw plan + decyzja); pakiety zadań fabularnych w `docs/design/quests/` (tylko dokumentacja projektowa — wdrożenie wymaga osobnego planu i uzgodnienia z użytkownikiem).

Po każdej fali: skill `wave-review` (review, wpis w `docs/reviews/`, poprawki z testami regresji), potem skill `handoff` (roadmapa/plany: `Status: done`, `Finished:`).

## 3. Pętla robocza (powtarzaj dla każdej pozycji planu)

1. Weź następną niezrobioną pozycję planu; status planu `in_progress` przy pierwszej.
2. Zweryfikuj w kodzie, czy luka nadal istnieje. Nie → zapisz w „Wynik” planu i dalej.
3. Test, który opisuje nowe zachowanie (vitest; ID z FEATURES w nazwie) — ma najpierw paść.
4. Implementuj minimalnie wg §4.
5. Weryfikacja: skill `verify` (check, e2e, bench, zrzuty).
6. Stan i commit: skill `handoff` (FEATURES + evidence, „Wynik” planu, PROGRESS, DECISIONS, bumpy wersji, commit + push na gałąź sesji **oraz** `main`). Push po każdej ukończonej pozycji — kontener jest ulotny.
7. Wróć do 1.

**Nie kończ tury planem ani pytaniem „czy kontynuować?”.** Pytaj użytkownika tylko przy decyzji zmieniającej wizję; blokadę jednego obszaru zapisz w PROGRESS.md i przejdź do niezależnej pracy.

## 4. Zasady

Stałe zasady (język UI, warstwy, zapis/`SAVE_VERSION`, mgła wojny, testy/budżety itd.): `CLAUDE.md`, sekcja „Standing rules”. Bieżące wersje formatów: `docs/state/PROGRESS.md`, „Teraz”.

## 5. Subagenci i e2e

Zasady pracy z subagentami (worktree, zakaz checkout/switch/reset/stash) i e2e: `CLAUDE.md`, „Standing rules”; procedura review: skill `wave-review`.

## 6. Oszczędność kontekstu i ciągłość

- Skrypty i zbiorcze komendy zamiast długich sekwencji pojedynczych wywołań; do kontekstu tylko podsumowania (np. `pnpm check 2>&1 | grep -E "Tests |✖|error"`).
- Duże, niezależne zadania deleguj subagentom (§5); sam weryfikujesz ich wynik (testy, zrzuty).
- Aktualizuj `PROGRESS.md` po każdym fragmencie i przed kompakcją kontekstu (co zrobione, co w toku, następny krok).

## 7. Zakończenie sesji

skill `verify` (check + wszystkie e2e), skill `handoff`; aktualny `PROGRESS.md` (co działa, jak sprawdzone, uproszczenia, braki, znane błędy, dokładny następny krok), commit + push (gałąź sesji i `main`), krótki raport: co zrobiono (plany/FEATURES), wyniki testów, ograniczenia, jak daleko zaszły fale dodatku.

---

**Wiadomość startowa (do wklejenia):**

> Przeczytaj `NEXT-SESSION-KICK-OFF-PROMPT.md` w katalogu głównym i wykonaj go. Zacznij od weryfikacji stanu, potem realizuj plany w kolejności z roadmapy w pętli roboczej (§3), aż skończą się plany albo trafisz na prawdziwą blokadę. Nie kończ na planie ani na pytaniu o kontynuację. Na koniec commit i push do `main`.
