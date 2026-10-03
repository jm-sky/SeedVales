# Render: equipment-driven armour visuals from existing modular parts

**Status:** planned  
**Model:** sonnet — implementation, tests, asset wiring; opus reviews composition rules and visual conflicts  
**Domain:** render  
**Sub domains:** characters, equipment, assets  
**Roadmap:** follows [render--005](render--005--character-variants.md); stage 1 of equipment-driven character appearance  
**Created:** 2026-10-03  
**Finished:** —

---

## Goal

Make worn armour/clothing visible on both the player and NPCs using modular parts that already exist in the Quaternius Modular Character Outfits pack.

The rendered character must reflect `Human.eq.armor`. A character must not keep looking like an unarmoured peasant/ranger/blacksmith when the simulation says they are wearing plate armour, a helmet, pauldrons, boots, etc.

This stage is reuse-only: do not author missing armour pieces in Blender here. Missing visual coverage is recorded for stage 2: [render--012](render--012--missing-equipment-modules-blender.md).

## Existing foundation

- Equipment already has slots: `boots`, `legs`, `torso`, `head`, `hands`, `forearms`, `shoulders`.
- Armour uses `under` / `outer` layers.
- Player currently always renders with the `Ranger` outfit; NPC base outfit comes from profession.
- Existing character assets share the same 65-bone UBC skeleton.
- The source pack already contains modular Knight/Ranger/Peasant/etc. meshes, including useful pieces such as:
  - `Knight_Body_Armor`
  - `Knight_Legs_Armor`
  - `Knight_Feet_Armor`
  - `Knight_Head_Armet`
  - `Knight_Acc_Pauldron_Round` / `Knight_Acc_Pauldron_Spike`
  - Ranger bracers / boots / hood and other reusable outfit parts.

## Core rule

**Equipped items override the relevant visual region of the base outfit.**

The base outfit still comes from the player's/default look or NPC profession, but equipped armour is composed on top of or instead of the corresponding body region.

Examples:
- a farmer wearing `iron_helm` visibly gets a helmet;
- a peasant NPC wearing `plate_cuirass` visibly gets plate torso armour;
- a hunter wearing pauldrons keeps the hunter base look but gains visible shoulder armour;
- the same rules apply to the player.

Do not key visuals from profession labels. The source of truth is item id / armour slot in `h.eq.armor`.

## Scope

1. Define an equipment-visual mapping, preferably data-driven:
   - `itemId -> visual module(s)`
   - affected slot/region
   - whether the module replaces a base mesh or overlays it.
2. Export/package only the reusable modular parts needed from the existing source pack.
3. Extend character construction in `src/game/render/actors.ts` so player and NPC models are composed from:
   - base outfit,
   - head,
   - equipped armour modules.
4. Rebuild a visual when relevant equipment changes. Avoid rebuilding every frame.
5. Keep geometry/materials shared between actors; do not clone materials per character.
6. Handle obvious conflicts, e.g. hood vs helmet or base pauldron vs equipped pauldrons.
7. Add tests covering player and NPC equipment changes.
8. Add an E2E visual tour for representative combinations.

## Initial mapping target

Use existing parts wherever they give an acceptable visual approximation.

| Item | Existing visual candidate |
|---|---|
| `plate_cuirass` | Knight body armour |
| `iron_helm` | Knight Armet |
| `pauldrons` | Knight pauldron |
| `bracers` | Ranger bracer / suitable existing arm guard |
| `leather_boots` | Ranger boots / existing boot module |
| `leather_trousers` | suitable Ranger/Peasant/Knight leg part if visually acceptable |

Items without a credible existing match remain mechanically functional but are added to the stage-2 audit rather than forcing a misleading visual.

## Architecture constraints

- One skeleton contract for both sexes; use the existing shared bone names.
- Prefer separate skinned equipment modules attached/rebound to the same character skeleton rather than generating every possible full-outfit combination.
- Keep the base profession outfit system from `render--005`; equipment modifies it instead of replacing profession identity wholesale.
- Equipment state must win over profession outfit for covered regions.
- Character rebuild/update should happen on equipment-state change, not in the per-frame render path.
- Respect existing humanoid performance budgets and benchmark draw-call impact.

## Verification

- Unit/integration test: same actor with different `eq.armor` produces different equipment visual composition.
- Cover at least player + one NPC.
- Verify equip and unequip.
- Visual cases:
  - peasant/farmer + plate cuirass,
  - Ranger/player + iron helmet,
  - hunter + pauldrons/bracers,
  - plate combination on an NPC that normally uses Peasant.
- Check Idle, Walk, crouch and at least one combat animation for clipping.
- Run `pnpm check` and render benchmark before/after on WSL/Linux.

## Exit criteria

- Player appearance reacts to supported worn armour.
- NPC appearance reacts to supported worn armour.
- Profession/base outfit remains visible where not replaced by equipment.
- No supported plate-equipped NPC can still appear fully unarmoured.
- Existing pack coverage is documented.
- Missing/poorly represented equipment is listed explicitly for `render--012`.
