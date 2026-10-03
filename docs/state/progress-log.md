# Dziennik historyczny (PROGRESS)

Archiwum starszych sekcji wyniesionych z [PROGRESS.md](PROGRESS.md): sesja przygotowawcza 2026-09-30 i stan po sesji 1. Liczniki poniżej są historyczne (nieaktualne) — aktualny stan w PROGRESS.md, sekcja „Teraz”.

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

## Archived "Teraz" bullets (replaced 2026-10-03, session 15)

The old running list in PROGRESS.md "Teraz" mixed three sessions; its content is condensed into the single snapshot and the Session 14/15 sections of PROGRESS.md. Verbatim copy for reference (counts and "next step" lines are historical):

- **D-LANG-1:** English everywhere (UI, names, docs, comments). Polish docs are legacy.
- Verification (latest, 2026-10-02, session 13, WSL, after merging quests + verify + review scripts + recon batch A): `pnpm check` 329/329; `pnpm e2e:run` smoke 3/3 · acceptance 37/37 · mobile 12/12, 0 console errors (last full run before batch A: 3/3 · 36/36 · 12/12).
- Formats: **`SAVE_VERSION` 9** (authored quests `state.authoredQuests`, quest holds, visitor NPC; v8 rejected, D-SAVE-7; not released yet — further v9 field additions this cycle need no extra bump), `GEN_VERSION` 10 (caves, D-CAVE-1).
- Stage: quests--001 steps 1–6 done (engine + Q03, Q07, G03, G01; review 014 fixes in progress); verify--001 steps 1–3 done (event log, ledger, invariants, D-VERIFY-1); review--001 steps 1–3 done, **round 1 in progress**; render--009 stockpiles done by the Windows session (`062000c`).
- **Review round 1 state:** recon 013 (GPT) triaged — batch A merged, batch B in a worktree; code review 014 triaged — fixes in a worktree; soak 015 trader caravan stall — fix in a worktree; app review (skill `app-review`, `pnpm review:app`) + full soak 10 d × 3 seeds not run yet.
- **Caves v1 (Windows session 2026-10-03, world--003 steps 1-2):** generator, derived cave grid, walkable cave (`px.cave`), terrain cutting, cave meshes + rock textures, map marker, `__sv.teleportToCave(i)`. Verified here with vitest only (`caves.test.ts`, `caveSpace.test.ts`, `render/caves.test.ts`); `pnpm check` has 2 failures that also fail on clean HEAD `3eba766` (`eventLog.test.ts` ledger residual, `soak.test.ts` 2-day) — not caused by caves. **Pending on WSL:** `pnpm e2e:run`, a visual pass (screenshots at the mouth/tunnel/chamber via `teleportToCave`), `bench:render` at a cave, light-count/draw-call check (one always-present `PointLight` was added), grass/vegetation over the cutting. Next caves steps: NPC/animal navigation + actor partition (steps 3/5), contents/loot (7), look/audio/perf (8).
- Next step: merge the three worktree branches (caravan, recon batch B, review 014 fixes) → `pnpm check` + `pnpm e2e:run` + `pnpm soak --days=10 --seeds=1337,7,42` → app review round 1 (Opus reviewer) → triage → round 2 on the fix range (max 3 rounds). Then roadmap: render--001 rest / render--008 (4c) → wave 5 → wave 6 → proposals--001 → [later-vision-backlog](../roadmap/later-vision-backlog.md) L1–L7 (D-PLAN-9).
- ❓ user: looks (render--001/007 frames, stockpiles), WORLD-10 listen, phone measurement, mobile touch targets (app-review evidence: 371 buttons < 32 px → `ui--002` step 0), bench:sim on a quiet machine after the merges (batch runs were under load).
- **D-LANG-1:** English everywhere. Polish docs are legacy.
- Verification (latest, 2026-10-03, session 14, WSL, after the last `git pull --rebase`): `pnpm check` **497/497**; `pnpm e2e:run` smoke 5/5 · acceptance 47/47 · mobile 16/16, 0 console errors; `pnpm soak --days=10 --seeds=1337,7,42,3,11,99` **0 violations**; `bench:sim` + render A/B in PERF.md. Dev loop: `pnpm check:fast`, `pnpm test:changed`, `pnpm e2e:fast` (see skill `verify`, tiered).
- Formats: **`SAVE_VERSION` 9** (unreleased; new optional fields this session: `px.lootTaken`, settlement `headmanId/deputyId/playerMayor/taxRate`), `GEN_VERSION` 9.
- **Done this session (14, Sonnet):** review loop round 1 + round 2 closed (reviews 013–018; `quests--001`, `verify--001`, `review--001` step 4 done); D-USER-1: Mark Hornblower, quest icons + name labels above NPCs (e2e step 14), `audio--001` steps 1–5 (+ voices volume channel), `render--009` done (A/B in PERF.md), LOOT-01 (buried treasure, belly finds, valuables), SET-05 minimal mayor slice, `combat--001` target lock (D-COMBAT-1), `combat--002` block/parry + wooden shield (D-COMBAT-2). Roadmap wave 5d added for the user's new plans (items--001, economy--004, combat--005, economy--003).
- **`render--010` done** (carrion phase + spoiled-food cue over warehouse yards; bone-pile model, player fly wisp, flies audio open). **`economy--003` inn meals + preserved food done** (D-INN-1). **`combat--005` sharpness done** (D-COMBAT-4; whetstone, edge dulls/sharpens, no save bump). **`items--001` + `economy--004` done** (D-ITEM-1 / D-FOOD-4: condition-preserving stacks, freshness batches, oldest-first; soak 0 violations). **`combat--003` dodge done** (D-COMBAT-3; proactive spacing, no i-frames). **`combat--004` jump done** (D-MOVE-1; `sim/motion.ts`, Space + mobile Jump, tests + e2e 17). Round-3 code review 019 triaged and fixed (11 findings). Next: an app review round (skill `app-review`, Opus) for the new combat/jump/inn/sharpness UI, then wave 6 (needs device data) / the user's pick from the proposals / later backlog carrion/spoilage effects (user request), wave 6, `proposals--001`, later backlog.
- **Caves v1 (`world--003`, wave 5e) are being implemented by a second agent in another environment (user, 2026-10-03) — do not start caves here; expect merge conflicts in world gen / collision / camera / save and rebase carefully (`git pull --rebase`).**
- **Priority adjustments applied (D-PLAN-10, `docs/ROADMAP-PRIORITY-ADJUSTMENTS.md`):** caves → wave 5e (next big world slice, Opus design round first), QUAL-02a rare Damascus/obsidian items done, WORLD-06a desert split off (opportunistic), WORLD-06 continents deferred, DEV-01 dropped, living society stays late.
- **Proposals document ready for the user's pick:** `docs/proposals/2026-10-03--proposals.md` (21 items; shortlist P-01 market days, P-05 journey provisions UI, P-09 NPC memory, P-12 maintenance loop, P-16 photo mode).
- **Review loop closed for this wave:** code review 019 and app review 020 triaged (020: 10 minors fixed, open: #1 labels through walls, #6 lock marker, #8 sharpness display, #10 treasure hint).
- **Session 15 (Sonnet, 2026-10-03):** rebased 55 local commits onto caves v1 (conflict merges in Renderer/collision/player/Game/combat/types) and pushed; added small proposal slices, each with a unit test, no full e2e per slice: audio pick-up/drop one-shots, NPC labels hidden behind walls (review 020 #1), sharpness relative to the blade's best edge (#8), combat lock name/health in the target prompt (#6), text-size setting + Block hold/toggle (P-17), map notes (P-08), treasure tales (P-06 slice), weekly market day (P-01 slice, `sim/market.ts`), companion banter (P-11 text), foraging knowledge for poisonous herbs (P-02), code map (`pnpm code-map`, P-20). Last full `pnpm check` 524/524 and e2e 47/47 + 16/16 mid-session; acceptance 18 flaked twice (menu-settings click timeout, same oddity as in ❓ above), passed once.
- **quests--003 wave W1 done (session 15):** G08 Well and Rumor, G04 Root by the Stream, Q09 Goods on the Ground, Q01 A Hare Out of Place, G07 Trail of the Grey Wolf; engine: cast `place:'V'`, creature cast + `wild` anchor, conditions `dead/calm/noThreat/dayAfter/visited`, effects `grant/ill/heal/priceMod/hurt/slay/scare/timedWarn`, `sell` event, `deadlineHours`, price modifiers (`sim/priceMods.ts`). Verified: vitest quest/data suites, acceptance 47/47, soak 0 violations. **Wave review (Opus) and app review of the five quests are still to do.** **W2 started:** G02 Rusty Debt, Q04 The Handle Remembers, G06 The Trader's Letter done (item tags, `{treasury:'V'}`, `Game.breakSeal`); acceptance 47/47 and soak 10 d seed 1337 0 violations after them. Open in W2: G05, Q08, Q02, Q06 (builds, E8 humans following, creature groups).
- **Session 15 end state:** `pnpm check` 580/580 (102 files); `pnpm e2e:run` smoke 5/5 · acceptance 47/47 · mobile 16/16, 0 console errors; soak 10 d × seeds 1337/7/42: 0 violations. Also done: `render--011` stage 1 (helm, cuirass, pauldrons, boots on player and NPCs, `scripts/e2e/tour-equipment.mjs`), quests W2 G02/Q04/G06/Q08(part). Open: G05, Q02, Q06 and the Q08 well (decision D-QUEST-3: allow a `well` blueprint outside the square?), Opus wave review + app review of the 9 new quests, render--011 stage-2 items and PERF A/B, acceptance-18 oddity (did not recur in the last four full runs).
- **Next step (Sonnet session):** see `NEXT-SESSION-KICK-OFF-PROMPT.md`.
- ❓ user/Opus: e2e oddity — a real Space key press in acceptance step 18 (combat) makes the next `page.click` on the game menu time out ("waiting for element to be stable") on SwiftShader; the dodge itself is tested via `Game.dodge()`; root cause not found.
- ❓ user: combat balance (wolf 9 club hits); feel of target lock / block-parry (no guard/shield/stagger clips yet — placeholder pose, shield invisible); look of render--001/007 frames and stockpiles; WORLD-10 + audio listen; phone measurement; **sound licences list (release gate: complete credits for all 136 files in `public/sounds/`)**; smith order price kept (D-ECON-7); mayor thresholds (D-SET-1); app review 018 open minors (build panel covers status bars, camp site hidden behind the player, mobile map label size, Q07 journal as checklist).
- Older sections: [progress-log.md](progress-log.md).
