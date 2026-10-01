# Save/load review — SeedVales-2

- **Date:** 2026-10-01
- **Repository:** `jm-sky/SeedVales-2`
- **Analysed branch:** `main`
- **Analysed commit:** `ffa238096a561205d83dce8f19ac3174b314b28e`
- **Reviewer:** independent persistence review

## Executive verdict

The normal `snapshot → IndexedDB write → readSave → new Sim` path preserves the mutable state that is intended to survive a reload. The existing happy-path test and source trace cover world edits, inventory, corpses, carts, terrain edits, fog-of-war, player activities, NPC state, orders and companions at the data-model level. The generator pairing check is also enforced before mounting a loaded world.

The save boundary is not a schema boundary, however. A semantically incomplete current-version payload is accepted by `readSave` and fails later during `Sim` construction with an implementation error. This is a confirmed corrupted-save handling defect. Slot IDs are also only timestamp-unique, so two same-seed saves created in the same millisecond can overwrite each other. Migration tests do not use complete historical payloads; they mostly take a current snapshot and change its version number, so they do not prove that old serialized shapes can be loaded.

## Findings

### SAVE-07-1 — Incomplete structured saves pass `readSave` and fail during load (High, confirmed)

- **File/lines:** `src/game/save/db.ts:149-156`; load path `src/game/Game.ts:102-114`; index rebuild `src/game/sim/sim.ts:80-101`.
- **Scenario:** A slot contains valid JSON `{ "saveVersion": 7, "player": {} }` (or another payload with only the two fields checked by `readSave`). The player selects Load.
- **Expected:** The slot is rejected as corrupted with a `SaveError` before world/simulation construction; the menu remains usable and the save is not silently treated as a playable state.
- **Actual:** `readSave` returns the malformed object. `Game.create` proceeds to `new Sim(world, state)`, where `reindex()` spreads `state.npcs` and `state.animals` and iterates other arrays. The user receives a low-level `TypeError` rather than the documented corrupted-save message.
- **Impact:** A damaged or partially written slot can block continuation and produces no actionable recovery guidance. It also leaves the validation contract weaker than the migration contract: the first malformed field determines where loading crashes.
- **Evidence:** An isolated Vitest reproduction inserted the payload above into fake IndexedDB; `readSave('bad-shape')` resolved successfully and returned `npcs === undefined`. Static tracing then reaches `Sim.reindex()` at lines 84–100, which requires those arrays.
- **Minimal fix direction:** Validate the complete persisted shape (including arrays, `time`, `weather`, `px`, version fields and numeric finite ranges) before migration, or use a schema parser and convert all failures to `SaveError`. Keep compatibility defaults only in explicit migrations.
- **Regression test:** Store malformed current-version payloads with each required top-level field missing/wrong-typed; assert `readSave` rejects with `SaveError(/corrupted/)`, and assert `Game.create` is never allowed to construct `Sim` for them.

### SAVE-07-2 — “Unique” new-game slots collide for same-seed calls in one millisecond (Low/Medium, confirmed)

- **File/lines:** `src/game/save/db.ts:121-122`; `src/game/Game.ts:117`; `src/ui/panels/GameMenu.vue:16-23`.
- **Scenario:** Two new games (or two concurrent “Save as new” actions) use the same seed and the same `Date.now()` value.
- **Expected:** Each playthrough gets an independent slot, as required by D-SAVE-2 and the `newSlotId` comment.
- **Actual:** `newSlotId(1337, 1000)` returns exactly the same string on every call: `slot-1337-rs`. The second `writeSave` replaces the first record and descriptor because both use that key.
- **Impact:** Rare but real loss of slot isolation; it is especially plausible with double-click/concurrent UI calls or automated starts. This is a residual weakness in the earlier “unique slot” fix.
- **Evidence:** Direct deterministic reproduction: `newSlotId(1337, 1000) === newSlotId(1337, 1000)` is `true`; `writeSave` uses the returned string as the key in both object stores (`db.ts:130-133`).
- **Minimal fix direction:** Add a monotonic process-local counter and/or cryptographically random suffix to the timestamp-based ID; retain the seed for display/debugging but do not use time alone as identity.
- **Regression test:** Generate at least 100 same-seed IDs with a mocked constant clock and assert all are distinct; then write two saves and assert both appear in `listSaves()`.

### SAVE-07-3 — Migration tests do not exercise real historical serialized shapes (Medium, confirmed test gap)

- **File/lines:** `src/game/save/save.test.ts:51-84`; `src/game/sim/appendix-npc.test.ts:228-235`; migrations `src/game/save/migrate.ts:25-75`.
- **Scenario:** A schema change removes/renames a nested field in an old save. The migration test starts from `JSON.stringify(snapshot(currentState))`, changes `saveVersion`, and deletes only a few selected fields.
- **Expected:** Each migration test starts from a representative payload produced by the corresponding old version, including fields that did not yet exist and old field names/types.
- **Actual:** The v1 test keeps current fields such as `carts`, `traces`, companion-era fields and current top-level arrays while only deleting treasuries and replacing orders. The v4 test similarly starts from a current snapshot, deletes `traces`, then injects rats. The v6 test starts from a current snapshot and only deletes `kin`. Consequently, a migration can appear green while relying on fields that an actual old save never contained. The already-documented v5→v6 cart backfill remains untested: the current v1 fixture already has `carts`, so `carts ??= []` is not exercised.
- **Impact:** Regression coverage can miss exactly the missing-field crashes and defaulting errors that affect old users after a release. This weakens confidence in SAVE_VERSION compatibility even though current-format round trips pass.
- **Evidence:** The fixture construction and selective deletions are visible at the cited lines; the prior wave-3 review also recorded the v5→v6 gap, and it is still present on this commit.
- **Minimal fix direction:** Keep immutable versioned JSON fixtures (v1…v6) containing only fields that existed in that format, including at least one real order, rat, terrain edit, activity, cart/absence-of-cart and NPC population case. Feed them through `readSave`, not only `migrate`.
- **Regression test:** For every migration edge, load the fixture through fake IndexedDB, assert `SAVE_VERSION`, then construct `Sim`, install systems, advance time, and verify conservation and index usability.

## Scenario trace

### Normal continuation after an in-game save

1. Player changes a tree/node, kills an animal, edits terrain, changes inventory, or parks a cart.
2. `snapshot()` copies the top-level state and serializes terrain edits plus the authoritative RNG state (`snapshot.ts:10-16`).
3. `writeSave()` writes the JSON record and menu metadata in one `readwrite` transaction over `saves` and `meta` (`db.ts:124-141`).
4. `readSave()` parses, migrates to `SAVE_VERSION = 7`, and `Game.create()` checks seed and `GEN_VERSION` before constructing `Sim`.
5. `Sim` reconstructs terrain edits, RNG, actor/ground/corpse/trace/building indexes (`sim.ts:65-101`). The existing test then advances the loaded simulation (`save.test.ts:15-39`).

This path is sound for valid current-format data. In particular, player activities are stored in `px.activity`; orders, carts, inventory, NPC/AI/companion fields, world mutations (`nodes`, `sites`, `buildings`, `ground`, `corpses`, `traces`) and fog-of-war are inside `GameState`. `sysAcc`, projectiles, camera/UI and diagnostics are intentionally omitted under D-SAVE-3; after load, periodic systems restart their accumulators, with at most one interval of scheduling delay.

### Interrupted activity

`px.activity.elapsed` is persisted. Resource-consuming completion handlers run only when the activity completes (`playerActivities.ts:1-4`, `20-82`), while cancellation of construction applies only elapsed partial progress. This avoids consuming inputs twice across a save/load boundary. No confirmed duplication or loss was found in the valid activity path.

### Orders, carts and world changes

Orders reserve materials at placement and keep the forged item in the order until collection (`sim/orders.ts`); cart load is a separate inventory and both parked and pushed carts are represented in `GameState`. The valid round-trip tests cover a felled tree, corpse, terrain edit and inventory; appendix tests cover carts and traces. No additional confirmed conservation defect was found in this review.

### Failure and transaction handling

`writeSave()` maps quota and transaction failures to `SaveError`, and its two stores are written atomically. `deleteSave()` also uses one two-store transaction. Reads are isolated per slot key. There is no explicit save mutex, but IndexedDB serializes transactions on the connection; concurrent same-slot calls are last-writer-wins by design. The unresolved risks are malformed semantic payloads (SAVE-07-1) and timestamp-only slot identity (SAVE-07-2).

## Accepted limitations and non-findings

- The omitted state listed in D-SAVE-3 is intentional: in-flight projectiles disappear, system accumulator phase resets, and camera/UI/diagnostics are not gameplay progress.
- A save is valid only for the same `seed` and exact `GEN_VERSION`; `checkWorldCompat()` rejects mismatches before mounting (`migrate.ts:16-20`, `Game.ts:108-110`).
- Rebuilding simulation indexes after load is implemented for actors, ground items, corpses, blood traces and buildings. Node availability is derived from saved `state.nodes` against deterministic world nodes; no index loss was found.
- Earlier reports’ fixed findings (generator pairing, unique-slot intent, v4→v5 rat migration, cart persistence, conservation tests) were rechecked and are not repeated as new defects here. The v5→v6 fixture gap is repeated only because it remains unaddressed and is directly relevant to this review’s migration-test question.

## Verification scope and limitations

- Read: `CLAUDE.md`, `docs/state/PROGRESS.md`, `docs/design/DECISIONS.md`, save code, `Game.ts`, simulation/index code, and prior reviews `001`–`006`.
- Current commit: `ffa238096a561205d83dce8f19ac3174b314b28e` on `main`.
- Unit tests: direct Vitest invocation completed **146/146 tests, 19 files passed**. The package-manager wrapper could not be used because its supply-chain build gate stops on ignored `esbuild`/`vue-demi` scripts; this is an environment issue, not a repository test failure.
- Diagnostic reproduction: malformed current-version payload accepted by `readSave` (fake IndexedDB), as described in SAVE-07-1. The temporary test was removed after execution.
- Browser E2E could not run: the environment has no Chromium executable at `/usr/bin/google-chrome`; all three suites therefore reported `0/0` before exercising the game.
- No code or gameplay fix was implemented.

## Three highest-priority recommendations

1. Add strict persisted-state validation before migration and turn every structural failure into a player-facing `SaveError`.
2. Make slot IDs collision-proof under a constant clock and test concurrent/same-seed creation.
3. Replace version-number-only migration fixtures with committed historical JSON fixtures loaded through IndexedDB and `Sim`, including an explicit v5→v6 no-cart case.

## Uwagi Grok po weryfikacji review

**Weryfikacja:** 2026-10-01 · drzewo lokalne HEAD `bd2899b` (review cytuje `ffa2380`) · Grok / Scribe

### Werdykt
Review jest **w większości poprawny i wystarczająco kompletny** dla ścieżki happy-path oraz findingów SAVE-07-1 i SAVE-07-2. SAVE-07-3 trzyma się jako krytyka jakości fixture’ów migracji, ale **jeden szczegół jest nieaktualny** (test v5→v6 carts już istnieje). Kolizja ID `007` jest realna — plik przemianowany na `008`.

### Tabela weryfikacji

| Finding | Status | Uwaga |
|---------|--------|-------|
| SAVE-07-1 (słaba walidacja `readSave` → crash w `Sim.reindex`) | **POTWIERDZONE** | `db.ts` sprawdza tylko `saveVersion` + truthy `player`; `sim.ts` `reindex` wymaga tablic |
| SAVE-07-2 (kolizja `newSlotId` przy tym samym seed+ms) | **POTWIERDZONE** | `db.ts` `newSlotId`; UI „Save as new” → `Game.ts` |
| SAVE-07-3 (fixture’y migracji ≠ historyczne kształty) | **CZĘŚCIOWO** | Ogólna teza OK (`save.test.ts` v1/v4, `appendix-npc` v6). **Błąd:** twierdzenie, że backfill v5→v6 `carts` „nadal nieprzetestowany” — test jest w `src/game/sim/review006.test.ts` (`c5ed00c`, przodek commit’u tego review) |

### Kolizja ID
Oba pliki miały ID `007`: `agent-workflow-roi` oraz ten save/load. Zgodnie z `docs/reviews/README.md` ID mają być unikalne. **Zrobione:** rename → `2026-10-01--008--save-load-review.md`.

### Braki / korekty (tylko silne)

1. **[Korekta SAVE-07-3]** Twierdzenie o braku testu v5→v6 carts jest nieaktualne — test jest (`review006.test.ts`, describe SAVE-01).
2. **[Medium, pominięte]** Niekompletny zapis ze *starym* `saveVersion` (np. `1`) i bez `npcs` / `settlements` / `buildings` kończy się `TypeError` w `migrate`, nie `SaveError` — to samo okno recovery co SAVE-07-1.
3. **[Medium, pominięte]** `TerrainEdits.fromJSON` nie waliduje długości/typu tablic edycji → możliwe ciche przekłamanie terenu po „udanym” loadzie.

### Poza zakresem podniesienia
Hotkey save przy działającej symulacji, brak mutexa zapisu, quota/transakcje IDB — zgodne z opisem w review / bez nowego High/Medium.

— Grok / Scribe, 2026-10-01

## Triage result (2026-10-01, session 4)

| Finding | Verdict | Fix | Regression test (`src/game/save/save.test.ts`) |
|---|---|---|---|
| SAVE-07-1 incomplete saves crash in `Sim` | fixed | `save/validate.ts` `assertSaveShape` after migration; migration exceptions become `SaveError` (D-SAVE-4) | `SAVE-01: structurally broken saves are rejected as corrupted before a Sim is built` (9 malformed payloads) |
| SAVE-07-2 slot id collision | fixed | `newSlotId` adds a session counter + random suffix (D-SAVE-5) | `SAVE-01: new slot ids stay unique for the same seed and the same millisecond` |
| SAVE-07-3 migration fixtures | deferred | Historical per-version fixtures planned in `save--001` (D-SAVE-6); the v5→v6 carts test already exists (`review006.test.ts`), as Grok noted | — |
| Grok #2 incomplete old-version save → `TypeError` in `migrate` | fixed | Same path as SAVE-07-1 (migration wrapped) | case `old-version-incomplete` in the test above |
| Grok #3 `TerrainEdits.fromJSON` accepts wrong-length arrays | fixed | Validator checks each edit chunk length = `EDIT_N²` and finite values | case `terrain-edit-short` |

Verification: `pnpm check` green (see PROGRESS); no format change, `SAVE_VERSION` stays 7.
