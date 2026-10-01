# Survival: campfire fuel, stone hearth, standing torches, waterskin recipe

**Status:** planned  
**Domain:** survival  
**Sub domains:** build, craft, items, traces, npc-duties, render  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (between 4a and 4b — the sim model feeds `render--001` steps 1 and 8; step 1 can go any time)  
**Created:** 2026-10-01  
**Finished:** —

---

Source: [VISION-APPENDIX.md](../VISION-APPENDIX.md) "Follow-up — 2026-10-01 (survival: waterskins, campfires, torches)". FEATURES: `CRAFT-03`, `FIRE-01`, `FIRE-02`, `FIRE-03`, `FIRE-04`. Decisions: time domains (`CLAUDE.md`, VISION), D-SAVE-7 (no save compatibility before release), D-PLAN-6.

## Current state (checked in code, 2026-10-01)

| Topic | In code | Gap |
|---|---|---|
| Waterskins | items `waterskin_s/m/l` (`data/items.ts`), fill/drink at water and wells (`sim/interact.ts`) | no recipe |
| Campfire | blueprint `campfire` = 4 stone + 3 branch, one 0.25 h stage, `lit = true` on completion (`sim/build.ts`); settlement campfires lit at generation; relight option only when `!lit`; nothing ever puts a campfire out | no fuel, no burn time, no size/light level, no ash, no hearth distinction |
| Standing torches | item `torch` (recipe branch + cloth → 2); the player can **throw** a held torch (`Game.dropTorchLit` → `GroundItem.lit = true`): it lies flat, lights and scares animals (`render/dynamics.ts`, `fauna/perception.ts`) and **burns forever**; pick up works. Settlement torch posts (`torchpost` buildings, 2.5 m) have `lit`, NPC light/douse duties and go out at low durability | no "plant torch upright" placement, no light/extinguish on a placed torch, no burn time |

## Critical notes (what the appendix needs reconciled)

1. **The current campfire is already a stone hearth** (it costs 4 stones and is permanent). Proposal: split it — `campfire` = 3 branches (the appendix's starter fuel), burns out and is removed, leaving ash; `hearth` = stone ring (3–5 stones), permanent, dismantle returns the stones, the fire on it can be relit with fuel only (no build stage). Settlement campfires become hearth + fire.
2. **Time domain:** burn time is fuel/production → **calendar time** (world-calendar domain, `CLAUDE.md`). A 5 h torch is ~12.5 real minutes at 24×; a 3-branch fire for e.g. 2 h is ~5 real minutes. ❓ User: confirm calendar hours (default) and the base numbers (calibration constants, not hard-coded).
3. **Settlement fires must not silently die.** Fauna fear (sim--001), NPC "gathering at the campfire" and cooking depend on lit fires. Proposal: settlement hearths are fed by an NPC duty from the warehouse branches (same pattern as torch-post duties, conservation: branches are the sink); with no branches the fire goes out — a visible, intended consequence. ❓ User if a settlement fire should instead be exempt.
4. **Fire size feeds rendering:** expose a `fireLevel` 0..1 (from fuel) that `render--001` step 1 (flipbook + light pool) uses for flame size and light strength — build the effect once, already parametrised. Ash uses the same bounded decal system as blood (`render--001` step 8).
5. **Rain:** "hearth shelters the fire from rain" is a loose idea; today rain does not affect fires at all. Default: no rain extinction in this plan (one more system interaction for little gain) — only "rain clears ash faster", which the trace system already does for blood.
6. **Save:** one `SAVE_VERSION` bump for the whole plan (fuel on buildings, trace kind, placed-torch state). No migration — old saves are rejected cleanly (D-SAVE-7, nothing released yet).
7. **Waterskin economics:** hide trades at 15, waterskins at 6/10/16 — crafting destroys value. Fine for the player's own use; check that no NPC buys waterskins for more than their inputs (no circular profit, D-ECON-5).
8. **Standing torch = cheap lantern (user, 2026-10-01).** The appendix's "torch" means a torch placed upright on the ground, not the held one. Reuse the ground-item path (`GroundItem` with `planted` + `burnH`) instead of a new building kind: no build stage, picking it up is the existing `pickup`. The held torch keeps today's behaviour (out of scope). Settlement torch posts stay as they are (durability-based, NPC duties).

## Steps

1. **CRAFT-03 — waterskin recipes** (no save change, can go first/anytime): S = 1 hide, M = 1 hide + 1 rope, L = 2 hide + 1 rope; tool `sew`, skill survival, category `leather`. Test: recipes craftable with inputs, outputs carry `waterCapacity`; trade check per note 7.
2. **FIRE-01 — campfire fuel and burn-out:** `Building.fuel` (calendar hours) with a cap (calibration, e.g. 24 h); lighting needs `fire_start` + starter fuel (3 branches, also the build cost); "Add fuel" option (branches; logs if an item exists) adds hours; `fireLevel` = f(fuel) rises with fuel and shrinks toward a baseline as it burns; at 0 → `lit = false`; a plain campfire is then removed and leaves an ash trace (`Trace.kind = 'ash'`, fades over ~12 h, faster in rain). Burn-down runs in the hourly world system (spatially scoped like the rest of `worldSystems`), not per tick. Tests: burn time, fuel cap, shrink, burn-out → ash → fade, rain fade, conservation of branches.
3. **FIRE-02 — stone hearth:** blueprint `hearth` (3–5 stones), never despawns, "Dismantle" returns the stones (fire must be out), relight with fuel only; spit build cheaper/faster next to a hearth. Settlement campfires become hearths with a lit fire at generation (sim-side `newGame`, no `GEN_VERSION` change if the world data keeps the `campfire` site kind — check). NPC duty feeds settlement hearths from warehouse branches (note 3). Tests: dismantle conservation, settlement hearths lit at start, duty keeps a stocked settlement fire lit and lets an unstocked one go out.
4. **FIRE-03 — standing torch:** "Plant torch" (from the pack or the hand; HUD + mobile control) places it upright in front of the player (`GroundItem.planted`, rendered upright at ~1.2 m with the flame at the tip). Interactions on a planted torch: "Light" (needs `fire_start` or a lit fire/torch within reach) / "Extinguish" / "Pick up". Burns 4–6 calendar hours while lit (`burnH` decreases only while lit; calibration constant); at 0 it goes out and becomes a spent stub that is removed (or lies as a small ash trace). A thrown torch (`dropTorchLit`) follows the same burn rule (today it burns forever). Light and fauna fear read `lit` (already true for ground items). Placement uses the spatial ground index; the burn-down runs in the hourly world system over lit ground torches only (keep a small list of lit ground items rather than scanning all ground items). Tests: burn only while lit, extinguish/relight keeps the remaining time, burn-out removes the light and the fear effect, thrown torch burns out, save/load keeps `burnH`.
5. **FIRE-04 — standing-torch refuel (v2, design only):** candidate fuels cloth/fabric, wool/yarn, resin, tar — need item sources first. Recorded as `planned` with no implementation here; revisit with a crafting/materials plan.
6. Save: one `SAVE_VERSION` bump, no migration — a test asserts a v7 save is rejected with the clean "outdated/corrupted" message (D-SAVE-7). New games generate settlement hearths directly. UI glossary: hearth, fuel, ash, plant torch, light/extinguish.

## Verification

vitest per FEATURES ID (names above); e2e acceptance: build a campfire, add fuel, watch it go out (time speed-up), ash appears; plant, light, extinguish and pick up a standing torch from the HUD and the mobile controls; a planted torch burns out after the time speed-up. `bench:sim` (new hourly work + duty). Render hand-off: `fireLevel` and ash traces exposed through the read-only state for `render--001`.

## Exit

CRAFT-03, FIRE-01…03 verified; FIRE-04 recorded as design-pending; one save bump (old saves rejected); `render--001` steps 1 and 8 updated to consume `fireLevel` and ash traces.

## Wynik

*(not started)*
