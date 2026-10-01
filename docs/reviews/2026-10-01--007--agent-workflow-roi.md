# Review 007 — narzędzia i dokumentacja dla pracy agenta AI (top-5 ROI)

**Data:** 2026-10-01 · **Zakres:** konfiguracja repo pod sesje agentowe (skills, MCP, hooki, skrypty, dokumentacja). Bez zmian w kodzie.
**Metoda:** płytki przegląd: `CLAUDE.md`, `NEXT-SESSION-KICK-OFF-PROMPT.md`, `docs/state/PROGRESS.md`, `scripts/e2e/lib.mjs`, `vite.config.ts`, `package.json`, brak katalogu `.claude/`.
**Numer:** 006 jest zarezerwowany w PROGRESS/kick-off dla review fali 3, więc ten raport ma 007.

Legenda: ✅ potwierdzone w pliku · 🟡 założenie/ocena · ❓ do decyzji użytkownika.

## Diagnoza w skrócie

Repo ma dobrą dokumentację produktową i dobrą weryfikację (`pnpm check`, e2e, bench, `window.__sv`). Najwięcej czasu agenta idzie jednak na **rytuały operacyjne opisane prozą** (start serwera dev, CHROME_PATH, unikanie HMR, sprzątanie worktree, aktualizacja 4 plików stanu). Każda sesja przerabia je od nowa i część z nich już kiedyś zawiodła (lekcje w kick-off §5). Najwyższy zwrot daje zamiana tych rytuałów na kod i konfigurację, a nie dokładanie kolejnej dokumentacji.

## Top-5

### 1. Samowystarczalny runner e2e (`pnpm e2e:run`) — ROI: bardzo wysoki

**Problem (✅):**
- `pnpm e2e` wymaga ręcznie uruchomionego `pnpm dev --port 5199` w tle z timeoutem ≥ 2 h (kick-off §1.4).
- HMR przeładowuje stronę w trakcie testów, gdy agent edytuje `src/`, uruchamia vitest albo działa worktree subagenta (kick-off §5, PROGRESS).
- `CHROME_PATH` jest różny w kontenerze (`/opt/pw-browsers/...`, kick-off) i lokalnie (`/usr/bin/google-chrome`, domyślny w `lib.mjs`). Tutaj `/opt/pw-browsers` nie istnieje.

**Propozycja:** `scripts/e2e/run.mjs`:
1. Uruchamia Vite programowo (`createServer`) na wolnym porcie z `server.hmr: false` i `watch: null`. Alternatywą jest `vite build && vite preview`: wolniejsze, ale w pełni odporne na zmiany plików.
2. Czeka na gotowość i uruchamia smoke, acceptance i mobile z `SV_URL`.
3. Wypisuje jednolinijkowe podsumowanie (`smoke 3/3 · acceptance 29/29 · mobile 10/10 · console errors 0`) i zamyka serwer.
4. Sam wykrywa Chrome: `CHROME_PATH`, potem `/opt/pw-browsers/*`, potem `~/.cache/ms-playwright/chromium-*`, potem `/usr/bin/google-chrome`.

**Efekt 🟡:** znika cała klasa fałszywych porażek („Execution context was destroyed”) i kilka kroków przy każdej weryfikacji. E2E da się wtedy bezpiecznie odpalać z subagenta. Koszt: ~1 h.

### 2. Naprawa przyczyny problemów z worktree w konfiguracji, nie w instrukcjach — ROI: bardzo wysoki, koszt minimalny

**Problem (✅):** kick-off §5 każe ręcznie sprzątać worktree, bo „vitest/eslint zbierają kopie z `.claude/worktrees/` (508 testów zamiast 127)” i HMR reaguje na worktree. Przyczyna leży w konfiguracji:
- `vite.config.ts` `test` nie ma `exclude` dla `.claude/**`.
- `server.watch.ignored` nie obejmuje `.claude/**`.
- `.claude/worktrees/` nie ma w `.gitignore` ani w `.git/info/exclude`. `exclude` i tak nie przetrwa świeżego klonu w kontenerze.

**Propozycja:**
- Dodać `.claude/worktrees/` do `.gitignore`.
- Dodać `.claude/**` do `test.exclude` (razem z `configDefaults.exclude`) i do `server.watch.ignored`.
- Sprawdzić `ignores` w `eslint.config.ts`.
- Potem skrócić §5 kick-off do jednego zdania.

Koszt: ~15 min.

### 3. Projektowe skills w `.claude/skills/` dla powtarzalnych procedur — ROI: wysoki

**Problem (✅):** brak katalogu `.claude/` w repo. Procedury żyją w `NEXT-SESSION-KICK-OFF-PROMPT.md`, który jest przepisywany co sesję, i w `IMPLEMENTATION-PROMPT.md` (390 linii). Lekcje giną albo dryfują między wersjami promptu.

**Propozycja:** 3 krótkie skills, które agent ładuje na żądanie zamiast całego promptu:

| Skill | Zawartość |
|---|---|
| `wave-review` | subagent z `isolation: "worktree"`, zakaz `checkout/switch/reset/stash`, zakres przez zakres commitów, nadanie numeru review (następny wolny ID), format raportu, pętla „potwierdź → test regresji → fix”, sprzątanie worktree |
| `handoff` | spójna aktualizacja `FEATURES.json` (status + `evidence`), „Wynik” planu, `PROGRESS.md`, `DECISIONS.md`; reguły bumpów `SAVE_VERSION`/`GEN_VERSION`; commit + push na `main` |
| `verify` | `pnpm check` z filtrem wyjścia, runner e2e (pkt 1), kiedy `bench:sim`/`bench:render`, jak czytać wyniki SwiftShadera |

Kick-off zostaje wtedy krótki: „stan + kolejność fal + uruchom skill X”. Koszt: ~1–2 h. 🟡 Najpierw warto zrobić pkt 1 i 2, żeby skille opisywały proste komendy, a nie obejścia.

### 4. Jedno źródło prawdy o stanie i regułach (higiena dokumentacji) — ROI: wysoki

**Problem (✅):**
- `CLAUDE.md` jest nieaktualny w dwóch miejscach. Mówi „v1 not yet declared done”, a PROGRESS: „Czy v1 ukończone? TAK”. Mówi też, że check-layers jest „not yet part of `pnpm check`”, a `package.json` `check` już go zawiera.
- Reguły stałe (§4 kick-off: dwie domeny czasu, angielski UI, mgła wojny, `SAVE_VERSION`, PERF-01) są powielone w trzech miejscach: `CLAUDE.md`, kick-off i `IMPLEMENTATION-PROMPT.md`.
- `PROGRESS.md` to dziennik w kolejności mieszanej: „Sesja 2” u góry, „Stan po sesji 1” na dole z nieaktualnymi licznikami (55/55, 15/15). Agent musi go przeczytać w całości, żeby znaleźć „następny krok”.

**Propozycja:**
- Poprawić dwa nieaktualne zdania w `CLAUDE.md`.
- Przenieść stałe reguły z kick-off §4 i §5 do `CLAUDE.md` (lub `docs/design/`). Kick-off ma zawierać tylko to, co zmienne.
- Na górze `PROGRESS.md` dodać sekcję **„Teraz”** (≤ 15 linii): aktualne liczniki testów, wersje formatów, następny krok, otwarte ❓ dla użytkownika. Historię sesji przenieść niżej lub do `docs/state/progress-log.md`.

Koszt: ~1 h. Zysk: mniej kontekstu na starcie i mniej błędnych założeń.

### 5. Mały skrypt zapytań o stan wymagań (`pnpm features`) — ROI: średnio-wysoki

**Problem (✅):** `FEATURES.json` ma 1076 linii i 119 wymagań. Agent czyta go w całości albo grepuje, żeby ustalić, co jest otwarte dla danego planu, albo żeby policzyć statusy do PROGRESS.

**Propozycja:** `scripts/features.mjs` (bez zależności):
- `summary`: liczniki status × scope.
- `open [--scope v2] [--prefix NPC]`.
- `show ID`.
- `lint`: dozwolone statusy; `verified` wymaga niepustego `evidence`; ścieżki plików w `evidence` istnieją.

`lint` można dołączyć do `pnpm check`. Koszt: ~45 min.

## Rozważone i odrzucone (na teraz)

- **MCP przeglądarki (Playwright/Chrome DevTools MCP):** 🟡 niski zysk. Repo ma już `scripts/e2e/*`, `tour.mjs` (zrzuty) i `window.__sv`, a użytkownik ma globalny skill `agent-browser`. SwiftShader i tak nie daje wiarygodnego obrazu wydajności. Wrócić do tematu, jeśli fala 4 (render) będzie wymagała dużo interaktywnego debugowania wizualnego.
- **Hook PostToolUse z lint/type-check po każdej edycji:** 🟡 `vue-tsc --build` jest zbyt wolny na każdą edycję, a w trakcie e2e mógłby przeszkadzać. Wystarczy `pnpm check` w pętli roboczej.
- **MCP do GitHub/GitLab:** brak potrzeby. Praca jest na `main` i push idzie przez `git`.
- **Więcej dokumentacji wizji/designu:** jest jej dużo i jest dobra. Wąskim gardłem jest proces, nie wiedza domenowa.

## Rekomendowana kolejność

2 → 1 → 4 → 5 → 3 (najpierw tanie poprawki przyczyn, potem skrypty, na końcu skills opisujące już uproszczony proces). Łącznie ~4–5 h.

❓ Do decyzji użytkownika: czy wdrożyć pkt 1–2 od razu (zmiany w `vite.config.ts`, `.gitignore`, nowy skrypt), czy zostawić jako zadanie dla kolejnej sesji pętli.

## Status wdrożenia

Decyzja użytkownika (2026-10-01): wdrożyć pkt 1–4, nie musi być w jednej sesji. Gdzie się da, robi to model Sonnet, żeby oszczędzać tokeny.

- **Sesja 2026-10-01 — zrobione:** pkt 2 (wykluczenia `.claude/**` w vitest, watcherze Vite i ESLint; `.claude/worktrees/` w `.gitignore`), pkt 1 (`pnpm e2e:run`, autodetekcja Chrome; weryfikacja: `pnpm check` 131/131, e2e 3/3 · 29/29 · 10/10, 0 błędów konsoli), pkt 4 (CLAUDE.md „Standing rules”, PROGRESS „Teraz”, `docs/state/progress-log.md`). Wykonali subagenci Sonnet.
- **Sesja 2026-10-01 (2) — zrobione:** pkt 3 (skills `verify`, `wave-review`, `handoff` w `.claude/skills/`; kick-off odsyła do skilli).
- ~~**Następna sesja:** pkt 3~~ (wykonane) (skills `wave-review`, `handoff`, `verify` w `.claude/skills/`). Skills mają opisywać już uproszczony proces: `pnpm e2e:run`, reguły w `CLAUDE.md` i sekcję „Teraz” w PROGRESS. Zadanie nadaje się dla Sonneta, a skill `anthropic-skills:skill-creator` może pomóc z formatem.
- Pkt 5 (`scripts/features.mjs`): niezlecony, opcjonalny.
