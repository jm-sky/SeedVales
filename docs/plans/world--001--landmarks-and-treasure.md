# Świat: landmarki i skarby

**Status:** in_progress  
**Model:** sonnet — generator + sim work; batch the `GEN_VERSION` bump with the English name pools  
**Domain:** world  
**Sub domains:** world-gen, items, loot, render  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 5)  
**Created:** 2026-09-30  
**Finished:** —

---

Źródło: [VISION-APPENDIX.md](../VISION-APPENDIX.md) — „Landmarki i skarby”.
FEATURES: `WORLD-11`, `LOOT-01`.

## Kroki

1. **WORLD-11 — landmarki w generatorze** (`world/gen/features.ts` lub nowy `landmarks.ts`): kamienny krąg, ruiny domu, ruiny posiadłości, wrak statku (wybrzeże), wrak łodzi (brzeg rzeki/jeziora). Deterministyczne z seeda, reguły rozmieszczenia (odległość od osad i dróg, biom, nachylenie), zapis w `WorldData` → bump `GEN_VERSION`. Render z modułów Medieval Village (ruiny = niepełne moduły) / proceduralnie; pieces the packs do not have (stone circle, shipwreck, boat wreck) come from [`render--004`](render--004--asset-pipeline-and-audit.md) step 3 (Blender offline, D-REN-8) or stay procedural. Combine this `GEN_VERSION` bump with the D-LANG-1 name-pool switch if that has a plan by then (fewer bumps = fewer world-cache rebuilds). Oznaczenie na mapie po odkryciu (ui--001).
2. **LOOT-01 — skarby** *(`SAVE_VERSION` bump, old saves rejected — D-SAVE-7)*: tablica lootu (dane w `src/game/data/`) z wagami rzadkości: złote pierścienie, rubiny, szmaragdy, diamenty, monety, broń bardzo wysokiej jakości (sztylet damasceński/obsydianowy — QUAL-02 technologie są `deferred`, tu tylko jako gotowy przedmiot). Źródła: zakopane obok landmarków (kopanie łopatą — istniejący mechanizm), skrzynie przy landmarkach, jaskinie (WORLD-05 `deferred` → ta część też później), rzadko w brzuchu zabitego drapieżnika (przy oprawianiu). Stan „wydobyty/otwarty” w `GameState` (nie w cache świata).
3. Wycena kosztowności w handlu (ECON) — bez rozwalenia ekonomii osad (limit gotówki NPC).

## Weryfikacja

vitest: determinizm landmarków (ten sam seed → te same), reguły rozmieszczenia na ≥ 8 seedach, loot nie odradza się po save/load. e2e/tour: zrzuty każdego typu landmarku. Render landmarków przez istniejące szablony scalane + instancing (D-REN-2) i materiały wg polityki z `render--002` krok 4; `bench:render` w scenie z landmarkiem w zasięgu (draw calls, `render.cpu`, `render.vegetationRebuild` przy marszu) — przekroczenie budżetu → redukcja kosztu przed kolejnymi krokami (zasady przekrojowe roadmapy).

## Wynik

**Step 1 (WORLD-11) implemented 2026-10-01** — `implemented_unverified` until the screenshots/bench run on WSL.

- Generator: `world/gen/landmarks.ts` (`GenLandmark` in `WorldData.landmarks`, rules in `LANDMARK_RULES`, English unique names, D-WORLD-8). 5 stone circles, 8 house ruins, 3 estate ruins, 4 shipwrecks, 5 boat wrecks on every seed tested; nearest landmark to home 200–750 m. `GEN_VERSION` 8 — batched with the English settlement names (D-LANG-1); NPC names are English too (`SURNAMES`), which only affects new games.
- Render: `render/landmarks.ts` (pieces from `landmarks.glb`, merged per material within 420 m, procedural fallback), node names in `render/assetNames.ts` (guard test covers them). Map: discovered (explored cell) landmarks as labelled diamonds on the map panel — no new saved state, so no `SAVE_VERSION` bump (comes with LOOT-01).
- Tests: `landmarks.test.ts` (determinism + placement rules on 8 seeds, English names) and `render/landmarks.test.ts` (layout piece names). `pnpm check` green.
- Not done / next: **no collision** for walls and stones (walkable-through), minimap marker, ❓ bench scene `landmark-estate` baseline + `tour.mjs` stops 09–13 on WSL (no e2e/bench on Windows), then steps 2–3 (LOOT-01, valuables trade).

**Steps 2–3 (LOOT-01) implemented 2026-10-03 (session 14, Sonnet):** `data/loot.ts` (weighted table: gold ring, ruby, emerald, diamond, obsidian/Damascus dagger as ready items, coin purses; richness per landmark kind), `sim/treasure.ts` (spots derived from world seed + landmark id — no `GEN_VERSION` bump; contents rolled from a spot-seeded RNG, never the sim stream; `px.lootTaken` is the only saved state; player only), hook in `dig` (within 1.6 m of a spot) and `butcher` (4 % belly find for wolf/bear/boar, keyed by corpse id). Valuables trade through the existing buy/sell path (NPC cash limit refuses poor buyers, conservation test). New items `gold_ring`, `ruby`, `emerald`, `diamond`, `obsidian_dagger`, `damascus_dagger` (source kind `treasure`). Tests: `treasure.test.ts`. **Not done:** treasure chests (render + interaction), caves (WORLD-05 deferred), hints/clues on the map, quests using treasure (later vision L-backlog).
