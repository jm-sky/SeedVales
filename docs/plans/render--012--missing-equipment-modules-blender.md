# Render: author missing equipment visual modules in Blender

**Status:** planned  
**Model:** sonnet — Blender scripting/export pipeline and wiring; opus reviews asset choices and visual quality  
**Domain:** render  
**Sub domains:** characters, equipment, assets, blender  
**Roadmap:** stage 2 after [render--011](render--011--equipment-armour-visuals-existing-parts.md)  
**Created:** 2026-10-03  
**Finished:** —

---

## Goal

Fill the gaps left by `render--011` by creating only the armour/clothing modules that do not have an acceptable existing equivalent in the Quaternius character pack.

The output must plug into the same equipment-driven visual system used by player and NPCs.

## Gates (plan review 2026-10-03, Opus)

- **Start only when all three hold:**
  1. `render--011` stage 2 is `done` and has written its final rejected list into "Input" below;
  2. the user has given an **art decision** (roadmap wave 5f): "author the missing modules" or "drop the plan";
  3. a **Windows + Blender MCP session** is available (Blender is a dev-only tool, D-REN-8; never run e2e or bench on Windows).
- Never blocks a gameplay wave. Until it runs, rejected items keep the base outfit, which is honest (no misleading mesh).
- **Format impact:** none. Render-only, so no `SAVE_VERSION` or `GEN_VERSION` bump.

## Priority (by how often the item is seen in play)

1. `leather_cap`: every guard starts with one (`sim/newGame.ts`), so it is on screen in every settlement. The pack has no cap part.
2. `chainmail`: the mid tier between leather and plate, and the first big armour purchase. No mail part exists.
3. `leather_gloves`: cheap leather recipe, so an early player item. The hands belong to the arm mesh, so a glove is a thin shell over the hand and wrist.
4. `studded_leather`: needs a silhouette that differs from `leather_jerkin`, such as a stud pattern on a stiffer, shorter body.
5. `padded_jacket`: only if `render--011` S2-D6 rejected the `Knight_Body_Cloth` candidate.
6. **Guard base switch (user, 2026-10-03; render--011 S2-D8):** as soon as both `leather_cap` (here) and `leather_jerkin` (render--011 stage 2) have modules, switch the guard base from `Knight` to `Peasant` with the guard shirt tint and remove the `Knight` row from `BASE_PROVIDES`. Guards then show what they really wear (leather now; mail or plate when they own it). Tests: guard bare → no armour modules; guard with its starting kit → jerkin + cap; guard + `chainmail` → mail module. Tour frame of a guard in each state.

## Input

Start from the coverage audit produced by `render--011` (stage 2 section, table S2-D6 and its final verdicts). Default rejected list as of the 2026-10-03 plan review: `leather_cap`, `chainmail`, `leather_gloves`, `studded_leather` (+ `padded_jacket` / `leather_trousers` female if the look check rejects them).

Current armour items that must be checked for dedicated visuals include:

- `padded_jacket` — Gambeson
- `leather_jerkin`
- `studded_leather`
- `chainmail`
- `plate_cuirass`
- `leather_cap`
- `iron_helm`
- `leather_boots`
- `leather_trousers`
- `leather_gloves`
- `bracers`
- `pauldrons`

Do not recreate an item if stage 1 already has a good reusable module.

## Asset strategy

Create **modular pieces, not complete character permutations**.

Target modules follow the equipment regions already used by the simulation:

- head,
- torso,
- shoulders,
- forearms,
- hands,
- legs,
- boots.

Examples of likely Blender work:
- gambeson torso,
- leather jerkin,
- chainmail torso,
- leather/studded armour variant,
- leather cap,
- gloves,
- any missing clean leg/boot module.

Reuse or modify existing pack geometry wherever practical before modelling from scratch.

## Blender contract

- Keep the existing UBC 65-bone skeleton and vertex-group naming.
- Produce male and female compatible variants where body fit requires it.
- Reuse weights from nearest existing outfit parts whenever possible.
- No new gameplay skeleton or animation set.
- Export through the existing character asset pipeline and optimise consistently with `render--005`.
- Keep Blender dev-only; generated runtime assets go to the existing character asset locations.
- Prefer low-poly forms whose silhouette clearly communicates the item at gameplay camera distance.

## Visual design principles

The goal is readability, not historical micro-detail.

Different equipment tiers should be recognisable by silhouette/material:
- cloth/padded,
- leather,
- studded/reinforced leather,
- mail,
- plate.

Avoid tiny details that cost triangles but disappear at normal camera distance.

New modules should combine cleanly with existing pieces, e.g.:
- gambeson + pauldrons,
- chainmail + helmet,
- plate cuirass + bracers + boots.

## Implementation steps

1. Read the missing-coverage report from `render--011`.
2. Prioritise modules used by the most common items/slots.
3. Author or adapt meshes in Blender.
4. Transfer/reuse skin weights and test both sexes.
5. Export and run the same optimisation pipeline used for current character variants.
6. Register each new module in the equipment visual mapping.
7. Add asset-contract tests: node names, skeleton compatibility, triangle/material limits.
8. Run visual combinations through the equipment E2E tour.
9. Benchmark representative crowded scenes after all new modules are enabled.

## Performance targets

Use the existing humanoid budgets as the reference. In addition:

- modules should be as small as practical;
- geometry/materials must be shared across actors;
- no material clone per NPC/player instance;
- avoid adding separate materials when an existing atlas/swatch can represent the part acceptably;
- evaluate draw-call growth for fully equipped characters, not only triangle count.

If a visually minor module has disproportionate render cost, simplify or merge it.

## Contract additions (plan review 2026-10-03)

- **Reproducible sources:** the Quaternius source pack exists only in `_temp/` on the user's Windows machine. As in `render--005` step 4, commit the Blender output as `assets-src/characters/eq/<Module>_<Sex>.raw.glb` (base colour only, ≤ 512 px). Then `build-equipment-modules.mjs` can take a `raw` source per module, and WSL or cloud sessions can rebuild the packs without `_temp`. The authoring script goes into `scripts/assets/blender-equipment-modules.py`, the same pattern as `blender-character-variants.py`.
- **Rest pose:** model and weight on the **Outfits** rest pose (the pose of `Male_Peasant.glb` and the other base outfits), not the "Modular Parts" pose. Stage 1 found that parts from the wrong pose fly away when rebound.
- **Fit targets:** every module must sit cleanly over Peasant, Peasant_Boots, Blacksmith and Ranger_NoHood on both sexes, using the same inflate approach as `render--011` (S2-D5). The cap must also fit with the head of either sex and with the hair the head mesh carries.
- **Budgets per module and sex** (after simplification):
  - torso: ≤ 1.5 k triangles;
  - cap, gloves: ≤ 600 triangles;
  - one material;
  - prefer a swatch of an existing outfit atlas over a new texture.

  The whole `eq/<Sex>.glb` pack stays ≤ 12 k triangles and ≤ 2 MB. If it would exceed that, simplify the authored modules first.
- **Wiring:** add the module to `EquipmentModule`, `EQUIPMENT_VISUALS` (with `hidesHood: true` for the cap) and `BASE_PROVIDES` where needed. Extend the asset guard from `render--011` S2-6 (node names, joint names, budgets); it must fail on a missing module.
- **Licence:** derived from CC0 Quaternius parts or authored new. Add a row to `docs/assets/README.md`.

## Acceptance (in addition to the exit criteria)

- Each prioritised item above is authored and kept, or explicitly dropped with a reason. Opus keeps or drops each module from frames on WSL (`tour-equipment.mjs`: Idle, Walk, Crouch, attack, dodge; close-ups).
- `armoured-crowd` bench (from `render--011` S2-9), equipment on vs off in the same build:
  - draw calls rise by at most one per attached module and armoured human (no shadow draws for small modules);
  - `render.cpu` p95 rises by ≤ 10 % compared with the end of `render--011` stage 2.
- `bench:startup` stays in the same result class. `pnpm check` and `pnpm e2e:run` (WSL) are green.

## Exit criteria

- Every armour item intended for the current game scope has an acceptable visible representation, either reused from stage 1 or authored here.
- Player and NPC use exactly the same equipment-visual mapping.
- Equip/unequip updates are visible without changing profession/base identity unnecessarily.
- Representative full combinations have been checked in Idle, Walk, crouch and combat.
- New assets stay within agreed performance limits and are documented in the asset audit.
