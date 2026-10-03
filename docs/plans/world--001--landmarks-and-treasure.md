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

## Step 4 — treasure chests (spec, plan review 2026-10-03, Opus)

*The "not done" chests from the step 2–3 result, specified so that Sonnet can build them without asking. It comes after `render--011` stage 2 in the queue and does not change roadmap priorities. **Model:** sonnet; Opus does the look check of the chest model.*

### Decisions

- **Chests are derived, not generated.** Chest spots come from the world seed and the landmark id, as `treasureSpots` does: a `chestSpots(sim)` next to it in `sim/treasure.ts`, with no change to `WorldData`, so **no `GEN_VERSION` bump**.
  - Placement: estate ruin 1, shipwreck 1, house ruin 30 %, boat wreck 20 %, stone circle 0.
  - Cave chambers: 0 or 1 per cave, sharing the chamber spots `world--003` already derives (`TreasureSpot.cave`).
- **Saved state:** opened chests add the key `chest:<landmarkId|caveId>:<n>` to the existing `px.lootTaken` string list. The saved shape does not change, so **no `SAVE_VERSION` bump** (D-SAVE-7 only requires a bump on a shape change).
- **Contents:** `rollTreasure(spotRng, richness)` with the same RNG seeding rule as the dig spots (never the sim stream). Contents enter through the existing `registerGiveStack` path (ledger source `treasure`). Coins are a declared money source, logged like dig coins. Nothing respawns.
- **Player only, no locks in v1:**
  - NPCs never open chests;
  - the interaction is **Open chest** (an interact option when within 2 m, on the same layer: surface or that cave);
  - opening takes 2 s of gameplay time (the gameplay-seconds domain, not the calendar) and moves the contents into the inventory. Anything that does not fit goes on the ground as normal drops.
  - Lockpicking is out of scope (there is no lockpick item and no skill for it).
- **Quest boxes stay as they are:** `quests--003` W3 deliberately models its boxes, vaults and the toll chest as `dig` / Observation anchors + `grant`. Do not convert them into world chests, and never place a random chest on a quest anchor. Skip any chest spot within 6 m of a quest anchor kind used by W3.
- **Map:** chests do not appear on the map or minimap (they are found by exploring). The landmark marker is enough. `treasureTales` rumours may mention "a chest in the <landmark>" for a spot that has not been opened.

### Render

- **Model:** `Chest_Wood` from Fantasy Props MegaKit (CC0; `_temp/extracted/Fantasy_Props_MegaKitStandard/Exports/glTF/Chest_Wood.gltf`; 2.5 k triangles; separate `Chest_Wood_Base` / `Chest_Wood_Lid` meshes on an armature with Open/Closed clips).
  - Build it **static**: drop the armature and animations, and keep two meshes, `Chest_Base` and `Chest_Lid`, with the lid pivot moved to the hinge.
  - Simplify to ≤ 800 triangles, base colour ≤ 512 px.
  - Add it to `landmarks.glb` (or a small `props/chest.glb`) through the existing build script.
  - Add the node names to `render/assetNames.ts` (guard test).
- **Drawing:** two `InstancedMesh`es (base and lid) for chests within the landmark radius (420 m), rebuilt only when the chest list or the opened set changes (event-driven, never per frame). An opened chest shows its lid rotated about 100°; no animation is needed. The procedural fallback is a box with a separate lid box. Chests in caves render on the cave floor layer, the same rule as `GroundItem.cave`.
- **Cost:** the whole world has ≤ 30 chests and few are in range at once. `bench:render` on WSL: a `landmark-estate` A/B (on vs off) or the existing scene if it has a chest in range; draw calls +2.

### Tests and acceptance

- vitest (`treasure.test.ts`):
  - chest spots are deterministic for a seed;
  - placement rules hold on ≥ 8 seeds (counts per landmark kind, none within 6 m of a W3 quest anchor);
  - opening moves the rolled contents into the inventory, logged in the ledger;
  - an opened chest is empty and stays opened after a JSON save round trip;
  - an NPC can never open one;
  - a cave chest can be opened only from inside that cave.
- e2e (WSL): one acceptance step that teleports to the nearest chest, opens it through the real interact UI, checks the inventory and the opened lid, saves, reloads and finds the chest still opened. Mobile: the interact button covers it (no new control).
- Frames: closed and opened chest at an estate ruin and a shipwreck by day and night, plus one in a cave → `docs/state/frames/world--001/`. Opus keeps or drops the look.
- Exit: `pnpm check` green, `pnpm e2e:run` green on WSL, FEATURES `LOOT-01` stays `implemented_unverified` until those frames and the e2e step pass, then becomes `verified`.
