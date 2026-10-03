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

## Input

Start from the coverage audit produced by `render--011`.

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

## Exit criteria

- Every armour item intended for the current game scope has an acceptable visible representation, either reused from stage 1 or authored here.
- Player and NPC use exactly the same equipment-visual mapping.
- Equip/unequip updates are visible without changing profession/base identity unnecessarily.
- Representative full combinations have been checked in Idle, Walk, crouch and combat.
- New assets stay within agreed performance limits and are documented in the asset audit.
