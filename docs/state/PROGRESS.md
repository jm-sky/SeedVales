# Postęp implementacji (handoff)

**Aktualizacja:** 2026-10-01

## Teraz

- **D-LANG-1 (2026-10-01): English everywhere** — UI, proper names (English first name + occupational surname; home guard = Mark Hornblower), docs, plans, comments. Polish docs are legacy. Open follow-up: switch NPC/settlement name pools in code to English (`GEN_VERSION` bump).
- Verification (latest, 2026-10-01, session 5): `pnpm check` 175/175 (after merging render--004 step 2 from main), `pnpm e2e:run`: acceptance 30/30, mobile 10/10, smoke 3/3, 0 console errors. Earlier (session 4 checkpoint): `pnpm check` 167/167, `pnpm e2e:run`: acceptance 30/30, mobile 10/10, smoke 3/3, 0 console errors; `check-layers` OK; `bench:sim` within budget (p95 flags vs the old baseline also appear on unmodified `ffa2380` — whole-run quantiles; baseline refresh pending in `render--002` step 0).
- Formats: `SAVE_VERSION` 7, `GEN_VERSION` 8 (landmarks + English settlement names).
- Latest check (2026-10-01, session 6, Windows — no e2e/bench there): `pnpm check` 195/195.
- v1 kompletne (2026-09-30, potwierdzone po UI-LANG-01 2026-10-01); wyjątek: WORLD-10 (dźwięk nieodsłuchany).
- Waves: 1 `sim--001` done, 2 `ui--001` done, 3 `economy--001` + `npc--001` done (review 006 triaged); 4a `render--002` in progress (steps 0–1 done, step 2 scaffolding behind flags), 4s `survival--001` (planned: campfire fuel/hearth/ash, standing torch, waterskin recipe — VISION-APPENDIX follow-up, D-PLAN-6), 4b `render--001`, 5, 6 — not started. Side tracks (roadmap update 2026-10-01, D-PERF-4 / D-SAVE-7 / D-REN-8): `diag--002` tier A (startup before `render--002` step 3; real travel before `render--001` step 6), tier B before wave 6, tier C conditional; `save--001` closed (no save compatibility before the first release — D-SAVE-7: a format bump rejects older saves, no migrations); `render--004` (planned: asset audit + node-name guard during 4b, models for wave 5, optimisation only via `render--003`).
- Next step (**Sonnet session**, D-PLAN-7): `survival--001` steps 2–4 (FIRE-01 fuel/ash, FIRE-02 hearth + guard/fallback duty, FIRE-03 standing torch; one `SAVE_VERSION` bump 7 → 8); then `diag--002` step 1 (startup tooling), then `render--002` step 3 (terrain: draft material in the plan's notes; startup re-measured), step 4. Step 2 done (dome sky default, no tone mapping — D-REN-9; shadow texel snapping). Step-1 confirmation and the 4a exit gate benchmarks run on the user's WSL laptop (D-PERF-5) — ❓ user.
- ❓ dla użytkownika: ocena wyglądu klasy fauny po zrzutach (`tour.mjs` na WSL) i `bench:render` landmark-estate; akceptacja wyglądu po A/B (gładki teren, tone mapping); pomiar na urządzeniu (D-PERF-2).
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

## Session 3

- **`npc--001` done (2026-10-01):** TRADE-02 (surplus trade with any NPC, Give), SOC-01 (gifts, wishes revealed in conversation), COMP-01 (hiring: days/task/risk, following, expiry), COMP-02 (free joining, a grown son in every settlement), COMP-03 (better weapon/armour used) — verified. `SAVE_VERSION` 7 (D-NPC-1…5). `pnpm check` 144/144, e2e acceptance 30/30 (new step 17: hire + gift through the UI), mobile 10/10, smoke 3/3.
- **Wave 3 review 006** (`docs/reviews/2026-10-01--006--wave3-review.md`): 15 findings (8 ✅ reproduced). Worktree removed. **Triage not started.**
- **`render--002` started:** step 0 metrics committed (`089bfae`); step 2 sky/atmosphere/tone-mapping scaffolding behind `sv-visual` flags (defaults unchanged) + A/B script `scripts/e2e/ab.mjs`. Details in the plan's "Wynik".

### Session 4

- **Review 006 triaged (2026-10-01):** 11 fixed with failing-first regression tests (`src/game/sim/review006.test.ts`, 14 tests), #11 rejected (D-NPC-8), #13–#15 info/deferred (D-TRANS-2, D-ECON-5 note, D-UI-5). New decisions D-NPC-6 (companions live from their pack away from home, persistent `follow` step, stuck cooldown), D-NPC-7 (trading away from home uses the pack only), D-ECON-4 (symmetric warehouse goodwill), D-ECON-5 (no circular-trade profit), D-FOOD-3 updated (spoiled meat stays spoiled). No save format change (`ai.cooldowns` keys only). Wave 3 → done.
- e2e harness fixes found on the way: acceptance 17 targeted the closest villager instead of the son (pinned by id now; float tolerance on the contract length); acceptance 8b missed rats the nest bred during the repair (kill loop runs again after the repair).
- **render--002 step 0 done:** clean baselines (PERF.md in English, device checklist ❓ user); `bench:render` measures ≥ 60 frames; render baseline files + verdict (D-PERF-3). March vegetation rebuild p95 9.8–38.7 ms > 8 ms → step 1 needed.
- **Review 008 (save/load, arrived on main) triaged:** SAVE-07-1 fixed (structural validation after migration, D-SAVE-4), SAVE-07-2 fixed (collision-proof slot ids, D-SAVE-5), SAVE-07-3 deferred to plan `save--001` (D-SAVE-6); Grok's extra notes fixed via the same validator.
- **Review 009 (render performance, arrived on main as `docs/review/…`, filed as 009) triaged:** F-03/F-04/F-05/F-10/F-11 fixed, F-01 → render--002 step 1, the measurement-tooling rest → plan `diag--002`; F-06/F-07/F-16 conditional / user step.
- **render--002 step 1 done:** time-sliced vegetation rebuild (2.5 ms/frame, old instances visible until commit) + node chunk prefetch; medium march veg rebuild p95 3.8 ms (was 24–38.7), `render.prep` p95 −62% vs baseline (one run). e2e harness: acceptance 4e now pins the blacksmith as target (same bug class as step 17).
- **Checkpoint (user request):** session stopped after step 1; kick-off for session 5 in `NEXT-SESSION-KICK-OFF-PROMPT.md`.

### Session 5 (cloud container)

- Start: branch = main, no new review; `pnpm check` 167/167, e2e 3/3 · 30/30 · 10/10, 0 console errors.
- **Benchmarks across machines (D-PERF-5):** the container is a 4-core Xeon, the committed render baselines are the user's WSL laptop, so the first ⚠️ verdicts were invalid. `bench:render` now stores a machine fingerprint and refuses cross-machine verdicts (`--baseline=<file>` for a local reference). Cloud numbers in PERF.md "Cloud container" (reference only). User decision: cloud sessions do non-benchmark work; official gates run on WSL.
- **render--002 step 2 done:** A/B reviewed — dome sky kept as default, tone mapping dropped as default (ACES too dark at night, AgX washed out; D-REN-9); shadow texel snapping (`render/shadowSnap.ts`, test RENDER-04). The A/B 404 was the montage page's `favicon.ico` (harness); e2e logs now include the failing URL.
- One `pnpm e2e:run` attempt right after the A/B run exited with code 1; its output was cut off by `tail` and the result files were overwritten by the immediate rerun (green 3/3 · 30/30 · 10/10) — cause not identified. Watch for a recurrence.
- **survival--001 step 1 (CRAFT-03) done:** waterskin recipes S/M/L (sewing kit, hide/rope), no value creation (D-ECON-5). `pnpm check` 171/171, e2e 3/3 · 30/30 · 10/10, 0 console errors.
- **Model split (D-PLAN-7, user):** plans carry `**Model:**`; the rest of `survival--001` (steps 2–4) is Sonnet work and moves to the next session (kick-off prompt updated). This session (Opus) stops here.

### Session 6 (Windows, Blender MCP)

- **render--004 step 1 done:** `inspect-pack.mjs --audit [--md]`; dated "Audit" table + class budgets (D-REN-11) in `docs/assets/README.md`, totals in PERF.md. No asset changed by the audit.
- **world--001 step 1 (WORLD-11) implemented:** `world/gen/landmarks.ts` (5 stone circles, 8 house ruins, 3 estate ruins, 4 shipwrecks, 5 boat wrecks), `GEN_VERSION` 8, English settlement + NPC names (occupational surnames, D-LANG-1 follow-up), `render/landmarks.ts` + `landmarks.glb` (poly.pizza CC0 downloads from `_temp/`, built by `scripts/assets/build-landmarks.mjs`), explored landmarks on the map. Blender MCP used to inspect sources and render the final pieces/layouts (scene left clean). D-WORLD-8, D-REN-11. FEATURES WORLD-11 `implemented_unverified`.
- Found on the way: meshopt quantisation puts a scale on the mesh node and `mergeTemplate` drops the looked-up node's transform → pieces need an identity wrapper node (README).
- Later in session 6: fauna class finished (D-REN-12) and landmark collision (D-WORLD-9, `sim/landmarkSolids.ts`); `rig-boar-bear.py` → `rig-fauna.py`.
- Open: NPC pathing around ruins; minimap marker; bench/tour on WSL; steps 2–3 of world--001 (LOOT-01, SAVE_VERSION bump there); quest casting by fixed names (Mark Hornblower) not implemented.
