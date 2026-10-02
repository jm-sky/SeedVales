# Postęp implementacji (handoff)

**Aktualizacja:** 2026-10-01

## Teraz

- **D-LANG-1 (2026-10-01): English everywhere** — UI, proper names (English first name + occupational surname; home guard = Mark Hornblower), docs, plans, comments. Polish docs are legacy. NPC first names and settlement names in code are English (first names switched in session 11; picked in `sim/newGame.ts`, no format bump).
- Verification (latest, 2026-10-01, session 5): `pnpm check` 175/175 (after merging render--004 step 2 from main), `pnpm e2e:run`: acceptance 30/30, mobile 10/10, smoke 3/3, 0 console errors. Earlier (session 4 checkpoint): `pnpm check` 167/167, `pnpm e2e:run`: acceptance 30/30, mobile 10/10, smoke 3/3, 0 console errors; `check-layers` OK; `bench:sim` within budget (p95 flags vs the old baseline also appear on unmodified `ffa2380` — whole-run quantiles; baseline refresh pending in `render--002` step 0).
- Formats: `SAVE_VERSION` 8 (fire fuel, hearth, standing torch, ash — older saves rejected, no migrations, D-SAVE-7), `GEN_VERSION` 9 (mid-scale terrain relief, WORLD-12; before that 8 = landmarks + English settlement names).
- Latest check (2026-10-01, session 8, cloud): `pnpm check` 217/217; `pnpm e2e:run` smoke 3/3 · acceptance 32/32 · mobile 11/11, 0 console errors.
- v1 kompletne (2026-09-30, potwierdzone po UI-LANG-01 2026-10-01); wyjątek: WORLD-10 (dźwięk nieodsłuchany).
- Waves: 1 `sim--001` done, 2 `ui--001` done, 3 `economy--001` + `npc--001` done, 4s `survival--001` done, **4a `render--002` done (session 8; WSL gate numbers ❓ user, non-blocking — D-REN-13)**, **4n nature pass planned** (`world--002` → `render--007`, user 2026-10-01), **4b `render--001` planned** after it (1a → 1b → 8 → 3 → 2 → 4 → 5), 5 `world--001` in progress (step 1 done), 6 `render--003` draft. Side tracks: `diag--002` tier A step 1 done, step 5 before `render--001` step 6; tier B before wave 6; `render--004`/`render--005` in progress (WSL/Blender verification).
- Next step: **Sonnet** — nature pass first (user decision, D-REN-14): `world--002` (mid-scale terrain relief, `GEN_VERSION` 8 → 9), then `render--007` step 0 (`diag--002` step 5 + reference frames) → wind → grass → trees → water; then `render--001` 1a → 1b → 8 (fire, decals). English first names and `world--001` steps 2–3 ride along. Full order: roadmap "Schedule (session 8)". Opus next: look keep/drop after grass, trees (incl. asset choice), water, fire.
- ❓ for the user: (1) ~~4a gate on WSL~~ **done in session 10** (closed, PERF.md "WSL session 10"); (2) look of the new default terrain (smooth normals + ground detail; legacy via `sv-visual` `{"tintUniforms":false,"smooth":false,"detail":false}`) and of tone mapping (dropped); (3) fauna class screenshots (`tour.mjs` on WSL) and `bench:render` landmark-estate; (4) device measurement (D-PERF-2).
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

### Session 7 (cloud container, Sonnet)

- **survival--001 steps 2–4 done (FIRE-01/02/03, D-FIRE-1):** `sim/fire.ts`, ash in `traces.ts`, burn-down in `ecology`, hearth blueprint (`kind: 'campfire'` + `hearth` flag), guard "Feeding the fire" + fallback goal `tend_fire` (reservation `Building.tender`), standing torch (`GroundItem.planted/burnH`, remaining life kept on the stack's `dur`), quick-panel buttons (also in the touch menu "Actions"). `SAVE_VERSION` 8, **no migration**: `migrate()` now rejects every older format cleanly and the old migrations/tests were removed (D-SAVE-7). Note for `world--001` step 3 (LOOT-01): its save bump is now 8 → 9.
- Verified: `pnpm check` 187/187 before merging main; e2e smoke 3/3, acceptance 32/32 (new 18a/18b), mobile 11/11 (M10), 0 console errors; `bench:sim` same container before/after: no regression (cloud-only numbers in the plan's "Wynik").
- Simplifications: no spit discount next to a hearth, no cleaner profession, burning torches scanned in the existing ground loop. FIRE-04 stays design-only. `fireLevel` and ash traces are exposed read-only (`sim/fire.ts`, `Trace.kind`) for `render--001` steps 1 and 8 — render code was not touched.
- Unexplained once: one acceptance run lost step 18b's campfire (no building appeared); the next two runs were green. The step now throws a descriptive error with the sim state if it recurs.
- Open `opus` items: wave review of `survival--001` (see below if done), keep/drop for `render--002` step 3 once built.
- **diag--002 step 1 done:** `pnpm bench:startup` (cloud numbers in PERF.md "Startup").
- **render--002 step 3 implemented behind `sv-visual` flags** (`tintUniforms`, `smooth`, `detail`; defaults unchanged): snow/season rebuilds 19 → 0, smooth normals LOD-independent, chunk build +46% (cloud). A/B montages looked at on 3 seeds, no seams. **Open `opus` item:** keep/drop + making it the default (details in the plan's "Wynik"); official gate numbers on WSL (❓ user).
- **survival--001 wave review (review 010, Opus reviewer) triaged:** 6 fixed with regression tests (player hearth no longer tended/fed by the settlement, settlement hearth not dismantlable, worn torches no longer merge with fresh ones, "Put out the fire", NPC feeding a full fire is a success), burn-out message + fuel hours in rest/sleep labels, finding 7 (settlement fires dying) not confirmed over 3 days (100% lit); plan `survival--001` → done. Final: `pnpm check` 216/216, e2e 3/3 · 32/32 · 11/11.

### Session 8 (cloud container, Opus)

- Start: branch = `main` (`5ae03e3`), no new review on main; `pnpm check` 216/216, e2e 3/3 · 32/32 · 11/11, 0 console errors.
- **render--002 step 3: keep, default on (D-REN-13).** A/B re-run with new `summer-meadow`/`autumn-meadow` frames in `ab.mjs` (season fade identical to the baked path, no seams); `tintUniforms` + `smooth` default on all profiles, `detail` on medium/high, swapped in place on a runtime quality change (new: shared detail texture, `TerrainChunks.detailActive`, test). Same-container startup within noise → no chunk-build mitigation before the flip.
- **`bench:render` harness bug found and fixed:** `settle()` stopped after 50 polls, so a slower terrain path was measured mid-stream (first comparison showed dense-forest +100 %, rain +51 %; diagnosed with a chunk-build trace: streaming drains in 20 s legacy vs 25 s new). Now waits up to 90 s, marks `unsettled`. Re-measured: static scenes ok, snow −43 %, night −31 %, march inconclusive (overlapping runs) → WSL. PERF.md "render--002 step 3 default flip".
- **render--002 step 4 (PBR+IBL) dropped, step 5 deferred to `render--003`; plan done** with the WSL gate run as a non-blocking user step (D-REN-13). RENDER-04 → `implemented_unverified`.
- **render--001 → planned** (English rewrite): step 1 split into 1a (fire sources from spatial queries, `fireLevel`-driven size/light, per-fire phase flicker, light pool low 1 / medium 3 / high 4 incl. the player torch, upright planted torch, hearth stone ring, held-torch flames for NPCs) and 1b (stateless GPU particles: flames, sparks, embers, smoke on medium/high; counts by source and `level`; caps per profile). Execution order and `**Model:**` per step; user's fire requirements recorded (D-REN-13 d).
- Schedule (roadmap "Schedule (session 8)"): first names are still Polish (`data/professions.ts`) — picked in `sim/newGame.ts`, so the switch needs no format bump.
- **User feedback on the screenshots → new plans (D-REN-14, D-WORLD-10):** no grass, boxy trees (real models only within 27–72 m, procedural icosahedron/cone impostors beyond), flat opaque-ish blue water, terrain too flat (no relief between ~30 and ~250 m). User decisions: nature first; trees = models with leaf cards + baked impostors; water = cheap shader everywhere + planar reflection on high only; more mid-scale relief. New plans `world--002--terrain-relief` and `render--007--nature-pass` (planned); `render--001` steps 6/7/9 moved into `render--007`; FEATURES `RENDER-06` (grass), `RENDER-07` (trees), `WORLD-12` (relief) added.


### Session 9 (cloud container, Sonnet)

- Start: branch `ccr-77496001-gicduv` from `main` (`9802676`), no new review on main.
- **world--002 steps 1–3 done (WORLD-12 `implemented_unverified`):** hilliness field + 40–320 m relief terms, `GEN_VERSION` 9, `relief.test.ts`; calibration held (8-seed route-band test), `bench:sim` within noise same container, world gen +13 % (2.4 → 2.75 s, cached). A test (FIRE-02 sink) was made layout-independent, not weakened. Numbers + frames: plan "Result", `docs/state/frames/world--002/`. **Open `opus` item:** look keep/drop of the relief (amplitudes may be raised — Sonnet read: moderate at camera height).
- Not done this session: `render--007` (all steps), `render--001`, English first names, `world--001` steps 2–3 → next kick-off.
- Verification: `pnpm check` 222/222; `pnpm e2e:run` green twice (3/3 · 32/32 · 11/11, 0 console errors) — **but** the first full run after the relief change failed acceptance 8b + 18b once (nest in settlement 2, one rat of that nest 147 m from it never reached by the kill loop; 18b then found no campfire with an NPC dialog open — probably a cascade of the same state). Not reproduced in two reruns (one with the same s2 nest). Cause not identified; first suspect is the 8b kill loop `approach` with a rat far outside the nest radius. Watch for a recurrence; if it returns, log the rat's position/state in the loop.
- **render--007 steps 1–2 (first pass):** shared wind module (`render/wind.ts`) and grass (`render/grass.ts` + `grassPlacement.ts`, flag `sv-visual {"grass":false}`), RENDER-06 `implemented_unverified`. User feedback "far too little grass" → densities raised (3/2 clumps per m² LOD0/LOD1; low ring 24 m ×0.4). Dark-blade bug fixed (back-face normal flip). Mobile test M1 had failed once because the cloud software renderer slowed with the first (heavier) low ring — fixed by the lighter low ring, test untouched. Final: `pnpm check` 230/230, `pnpm e2e:run` 3/3 · 32/32 · 11/11, 0 console errors. Frames `docs/state/frames/render--007/`.
- **User direction (2026-10-01):** two Three.js reference screenshots saved in `docs/research/refs/` (broadleaf trees with branches + leaf cards, layered grass with flowers; conifers with needle-card branches, long grass, light shafts) — "we can go that way"; forests/trees/extras **planned later**; **next session is the WSL session** (kick-off rewritten for it).
- Still open from the session-9 plan: `render--007` steps 0 (diag--002 step 5, other frames), 3 (trees), 4 (water); `render--001`; English first names; `world--001` steps 2–3. Opus items: relief look, grass look/density/colour, e2e 8b/18b intermittent (see above).

### Session 10 (WSL, user's laptop, real GPU, Sonnet)

- Start: `main` (`a2f460e`), no new review (010 already triaged); `pnpm check` 230/230, e2e 3/3 · 32/32 · 11/11, 0 console errors; acceptance 8b/18b did not fail.
- **Real GPU available in WSL:** Chrome + `--use-angle=gl` with `GALLIUM_DRIVER=d3d12` + `/usr/lib/wsl/lib` renders on the Intel Arc 140V. `SV_GPU=1` (in `scripts/e2e/lib.mjs`, so it works for `bench:render`, `ab.mjs`, `tour.mjs`) switches to it; default stays SwiftShader (D-PERF-5: baselines are SwiftShader). Bench additions: `SV_VISUAL`/`SV_VISUAL_TAG` (flag A/B), `SV_SCENES`, `meadow` scene, grass-update and GPU-frame columns.
- **4a gate closed** (item 1): see PERF.md — only sub-2-ms noise cells flagged, no regression.
- **Grass cost on GPU** (item 2): ≈ +1 ms GPU medium, ≈ +0.3 ms low/high; rings re-tuned to low 14/36 ×0.6, medium 22/70, high 38/95 (denser/longer than before, a larger trial was too heavy); caps test updated. **Finding:** settlements on *high* are 16–29 ms (≈ 35 fps in crowded-settlement, grass off too), medium ≈ 10–12 ms — unrelated to grass, listed in PERF.md for a render--003 decision.
- **Look pass** (item 3): grass colour desaturated + steppe ground greened (render-only, `GEN_VERSION` 9 unchanged); frames in `docs/state/frames/render--007/wsl/`. Terrain relief (`world--002`) reads as gentle undulation — kept, no amplitude change (Opus may want more; A/B pairs in `docs/state/frames/world--002/` are from different spots, so a same-spot pair is a follow-up). Tour on GPU: 13 shots, 0 errors; fauna/landmark/estate frames look correct; `tour-01` places the camera inside a house wall (harness stop to fix).
- Item 4 partial: `tour.mjs` and `landmark-estate` bench (low RAF ≈ 1.5 ms, medium ≈ 2.5 ms on GPU) ran, nothing wrong; WORLD-10 sound listen remains ❓ user (no ear).
- Item 5: trees re-plan written in `render--007` ("Step 3 re-plan", Opus decision A: own generator vs kit). Water and `diag--002` step 5 not started.
- Final: `pnpm check` 230/230, e2e 3/3 · 32/32 · 11/11, 0 console errors.
- ❓ Opus: grass look keep/drop (per-clump colour variation? flowers), relief amplitude, trees source decision A. ❓ user: WORLD-10 listen, phone measurement.

### Session 11 (WSL, real GPU, Opus) — in progress

- Start: `main` (`7e4578b`), no new review; `pnpm check` 230/230, e2e 3/3 · 32/32 · 11/11, 0 console errors.
- **Opus decisions (D-REN-15):** grass kept + reworked; relief ×1.15 unchanged (same-spot A/B, new `rolling-hills` frame); trees keep the MegaKit models — step 3c (longer ring + baked impostors) first, no own generator for now; settlement cost on high after trees 3c.
- **Grass rework per user feedback** (thinner/longer/denser, seasonal height, flower = yellowish patches, dark patches, match the ground, optimise): 16 blades/clump, `grassSeasonal`, `render/groundPatch.ts` (shared GLSL/TS), biome tint, instance attributes, fine/coarse LOD, camera-facing petal heads. GPU medium meadow gpu.frame 3.7 ms (session 10: 3.1 ms with 7 blades). PERF.md "WSL session 11".
- New reference from the user: `docs/research/refs/2026-10-02--threejs-ref-flax-meadow.jpg` (ideas in the plan: soil/litter patches, bigger flower heads, mixed heights, haze).
- Checkpoint `817c83f`: `pnpm check` 233/233, e2e 3/3 · 32/32 · 11/11, 0 console errors. Next: trees 3c.
- **Acceptance 8b/18b intermittent failures — causes found (harness, not game):**
  - 18b: the campfire was placed from wherever 18a left the player; a blocked spot (`canPlace` false) created no site (`sites: []`, branches unconsumed). Fix: start from `openSpot` like step 5; the failure dump includes the toast.
  - 8b: a per-attempt trace showed the last rat 0.9 m from the player, stamina 100, but **0 swings per click** and the element under the click point a `DIV`, not the canvas. The repair loop always ran 3 times; when the nest was already gone after 2 repairs, the third `KeyE` opened the interaction menu (no `opt-repair`), which stayed open over the screen centre and swallowed every kill-loop click while the rat fled (365 m away by the end; session 9 saw 147 m). Fix: stop repairing when the option is gone; the kill loop presses Escape and re-equips the club if anything but the canvas is under the click point. The trace stays in the 8b failure details.
