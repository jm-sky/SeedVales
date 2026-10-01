# Świat: landmarki i skarby

**Status:** planned  
**Domain:** world  
**Sub domains:** world-gen, items, loot, render  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 5)  
**Created:** 2026-09-30  
**Finished:** —

---

Źródło: [VISION-APPENDIX.md](../VISION-APPENDIX.md) — „Landmarki i skarby”.
FEATURES: `WORLD-11`, `LOOT-01`.

## Kroki

1. **WORLD-11 — landmarki w generatorze** (`world/gen/features.ts` lub nowy `landmarks.ts`): kamienny krąg, ruiny domu, ruiny posiadłości, wrak statku (wybrzeże), wrak łodzi (brzeg rzeki/jeziora). Deterministyczne z seeda, reguły rozmieszczenia (odległość od osad i dróg, biom, nachylenie), zapis w `WorldData` → bump `GEN_VERSION`. Render z modułów Medieval Village (ruiny = niepełne moduły) / proceduralnie; pieces the packs do not have (stone circle, shipwreck, boat wreck) come from [`render--004`](render--004--asset-pipeline-and-audit.md) step 3 (Blender offline, D-REN-8) or stay procedural. Combine this `GEN_VERSION` bump with the D-LANG-1 name-pool switch if that has a plan by then (one bump invalidates all saves, D-SAVE-1). Oznaczenie na mapie po odkryciu (ui--001).
2. **LOOT-01 — skarby** *(expected first `SAVE_VERSION` bump after v7 → `save--001` v6/v5 fixtures first, D-SAVE-7)*: tablica lootu (dane w `src/game/data/`) z wagami rzadkości: złote pierścienie, rubiny, szmaragdy, diamenty, monety, broń bardzo wysokiej jakości (sztylet damasceński/obsydianowy — QUAL-02 technologie są `deferred`, tu tylko jako gotowy przedmiot). Źródła: zakopane obok landmarków (kopanie łopatą — istniejący mechanizm), skrzynie przy landmarkach, jaskinie (WORLD-05 `deferred` → ta część też później), rzadko w brzuchu zabitego drapieżnika (przy oprawianiu). Stan „wydobyty/otwarty” w `GameState` (nie w cache świata).
3. Wycena kosztowności w handlu (ECON) — bez rozwalenia ekonomii osad (limit gotówki NPC).

## Weryfikacja

vitest: determinizm landmarków (ten sam seed → te same), reguły rozmieszczenia na ≥ 8 seedach, loot nie odradza się po save/load. e2e/tour: zrzuty każdego typu landmarku. Render landmarków przez istniejące szablony scalane + instancing (D-REN-2) i materiały wg polityki z `render--002` krok 4; `bench:render` w scenie z landmarkiem w zasięgu (draw calls, `render.cpu`, `render.vegetationRebuild` przy marszu) — przekroczenie budżetu → redukcja kosztu przed kolejnymi krokami (zasady przekrojowe roadmapy).
