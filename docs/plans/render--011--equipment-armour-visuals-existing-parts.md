# Render: equipment-driven armour visuals from existing modular parts

**Status:** in_progress    
**Model:** sonnet — implementation, tests and asset pipeline; opus reviews the composition rules/visual result before merge  
**Domain:** render  
**Sub domains:** characters, equipment, assets, perf  
**Roadmap:** follows [render--005](render--005--character-variants.md); stage 1 of equipment-driven character appearance; missing assets continue in [render--012](render--012--missing-equipment-modules-blender.md)  
**Created:** 2026-10-03  
**Finished:** —

---

## Goal

Make worn armour visibly change **both the player and NPC models**, using only modular parts already present in the Quaternius Modular Character Outfits source pack.

The source of truth is `Human.eq.armor`. A farmer, hunter or other NPC that equips plate armour must no longer continue to look fully unarmoured just because its profession base outfit is Peasant/Ranger/etc.

This stage is **reuse-only**: no new armour geometry is authored in Blender. Missing or visually unacceptable pieces are explicitly handed to `render--012`.

## Codebase preview — verified 2026-10-03

The first draft was directionally correct, but these implementation details matter:

1. `Equipment.armor` is already suitable: `Partial<Record<`${ArmorSlot}_${ArmorLayer}`, ItemStack>>`, with slots `boots|legs|torso|head|hands|forearms|shoulders` and layers `under|outer`.
2. `actors.ts` currently chooses exactly one complete outfit:
   - player → `Ranger`,
   - NPC → `ProfessionDef.outfit ?? Peasant`.
   The resulting `Visual.kindKey` is only `h:<outfit>:<age>`; armour changes therefore do **not** invalidate/rebuild an existing visual.
3. `build-characters.mjs` is a **whole-outfit pipeline**. It ends with `flatten()` + `join({ keepNamed: false })`, so it intentionally destroys the modular node boundaries needed here. Do **not** extend that output and then expect to select Knight torso/helm/boots at runtime.
4. `buildHuman()` already contains the exact skeleton-rebind pattern needed for equipment: it clones the head, maps its skin bones by name to the outfit skeleton, creates a new `THREE.Skeleton`, and binds it. Generalise/reuse that pattern for skinned equipment modules.
5. `applyLook()` tints almost every non-skin/non-eye material under the character root. If metal equipment is attached before that call, plate can accidentally inherit the random cloth tint. Apply the base look **before** attaching equipment, or explicitly exclude equipment materials.
6. The shipped `Ranger` player includes a hood; `Ranger_NoHood` already exists. A helmet must not render through that hood. `Herbalist` also has an authored hood and needs a compatible fallback while head armour is worn.
7. Renderer is intentionally read-only with respect to simulation state. Do not add render callbacks to inventory/equip operations just to refresh the model; derive a stable visual signature from `h.eq.armor` and compare it in `Actors.update()`.

## Existing reusable source parts

Verified in the source-pack work from `render--005`:

- `Knight_Body_Armor`
- `Knight_Body_Cloth`
- `Knight_Legs_Armor`
- `Knight_Feet_Armor`
- `Knight_Head_Armet`
- `Knight_Acc_Pauldron_Round`
- `Knight_Acc_Pauldron_Spike`
- Ranger hood / bracer / boots and other modular Ranger pieces
- all character parts use the same 65-bone UBC skeleton as the current heads/outfits/anims.

Reuse is accepted only where the result visually reads as the actual item. Do not map a mechanically different item to a misleading mesh just to reach 100% coverage.

## Composition rules

### 1. Base identity stays

The existing profession/player outfit remains the base:

- player → Ranger,
- guard → Knight,
- hunter → Ranger_NoHood,
- trader → Wizard,
- farmer → Peasant_Boots,
- blacksmith → Blacksmith,
- herbalist → Herbalist,
- others → Peasant.

Equipment augments that base. Do not choose armour from profession labels.

### 2. Equipped item wins for its region

For each supported `ItemStack` in `h.eq.armor`, attach the mapped module. Deterministic order is **under first, outer second**.

For a slot with both layers:
- an outer module visually takes precedence;
- an under-layer module may remain visible only where it does not obviously clip through the outer piece.

This plan does not change simulation rules or armour stats.

### 3. Headgear compatibility

Head armour must remove incompatible hood appearance:

- player `Ranger` + visible helmet/cap → use `Ranger_NoHood` as the base outfit;
- `Herbalist` + visible head armour → temporary stage-1 fallback to a hoodless existing base (prefer `Peasant` unless a no-hood Herbalist can be produced from existing source parts without Blender authoring);
- other current base outfits are already headgear-safe.

Do not render Armet through a hood.

### 4. Torso compatibility

Plate/body modules are allowed to include existing **supporting cloth from the same source outfit** when required for fit (e.g. Knight body cloth + Knight body armour as one logical `plate_cuirass` visual). That is still stage-1 reuse.

Do not switch the entire character to a fully armoured Knight model merely because one torso item is equipped: that would falsely show leg/boot armour the actor does not own.

If an existing torso module cannot be made to sit acceptably over the current bases using only source parts, mark that item as stage-2 rather than shipping visible clipping.

## Asset pipeline

Add a dedicated modular-equipment build path; do **not** reuse the final `flatten()+join()` whole-outfit output.

Recommended output:

- `public/assets/characters/equipment/Male.glb`
- `public/assets/characters/equipment/Female.glb`

Each file contains:
- the source armature required for valid glTF skins;
- stable, named top-level equipment wrapper nodes such as `EQ_PlateCuirass`, `EQ_IronHelm`, `EQ_Pauldrons`;
- one or more skinned meshes below each wrapper;
- no animations;
- base-colour-only textures, ≤512 px, meshopt, and the same simplification policy as current characters;
- **no transform that joins meshes across different equipment wrapper nodes**.

A new script such as `scripts/assets/build-equipment-modules.mjs` should read from the pack's `Modular Parts` source, create the explicit whitelist of modules and verify node names after writing.

One pack per sex is preferred over one GLB per item to avoid many extra startup requests. If implementation shows that preserving independent skins inside one pack is unreliable, separate per-item GLBs are an acceptable fallback, but record the startup cost.

## Runtime architecture

Create a small pure module, e.g. `src/game/render/equipmentVisuals.ts`, that owns:

- supported item → module mapping;
- conflicting/base-outfit rules;
- `equipmentVisualKey(h)`;
- module selection in deterministic slot/layer order.

Suggested data shape (exact names may change):

```ts
interface EquipmentVisualDef {
  modules: string[]
  region: ArmorSlot
  mode: 'overlay' | 'cover'
  hidesHood?: boolean
}
```

Do not put these rules directly into a large switch inside `Actors.buildHuman()`.

### Visual invalidation

Add the armour signature to human visual identity.

Conceptually:

```ts
humanVisualKey(h) =
  `h:${baseOutfitForVisual(h)}:${h.age}:${equipmentVisualKey(h)}`
```

In `Actors.update()`, when a near/model human already has a visual and its desired human key differs from `v.kindKey`, drop/rebuild it exactly like the existing stale/model-distance path.

Important:
- signature should use item ids relevant to visuals, not durability/quality unless those later alter appearance;
- no per-frame allocations beyond a small deterministic string/primitive signature;
- far placeholders do not need armour visuals; when the NPC comes back inside `humanModel`, the correct model is built from current equipment automatically.

### Module attachment

Generalise the existing head rebind code into a helper that can:

1. clone a named equipment wrapper/template while sharing geometry/material resources;
2. find every `SkinnedMesh` inside it;
3. map its skeleton bone names to the already-cloned base outfit bones;
4. bind a new skeleton using the module's existing `boneInverses`;
5. attach the rebound module to the character root.

Do not clone textures/materials per actor.

Order inside `buildHuman()`:

1. clone base outfit;
2. clone/rebind head;
3. apply deterministic character look/tint to the **base**;
4. clone/rebind equipment modules;
5. set shadow/frustum flags over the final tree;
6. construct mixer/actions as today.

This prevents random cloth tint from recolouring iron/plate.

## Stage-1 coverage target

First visually audit these mappings against both sexes before locking them:

| Game item | Candidate from existing pack | Stage-1 expectation |
|---|---|---|
| `plate_cuirass` | Knight `Body_Cloth + Body_Armor` (or Body_Armor alone if fit is clean) | **must attempt / high priority** |
| `iron_helm` | Knight `Head_Armet` | expected supported |
| `pauldrons` | Knight `Acc_Pauldron_Round` | expected supported |
| `bracers` | Ranger bracer | expected supported if both-sex fit is clean |
| `leather_boots` | Ranger boots | expected supported |
| `leather_trousers` | existing Ranger/Peasant leg part | support only if it clearly reads as leather trousers |

Likely stage-2 unless the audit finds a convincing existing match:

- `padded_jacket` / Gambeson
- `leather_jerkin`
- `studded_leather`
- `chainmail`
- `leather_cap`
- `leather_gloves`

The audit result must be written into this plan (supported / rejected + reason) before implementation is considered complete.

## Tests

### Pure/unit

Add tests for `equipmentVisuals.ts`:

- same equipment → same visual key;
- equip/unequip changes key;
- durability changes alone do not change key;
- under/outer ordering is deterministic;
- helmet changes Ranger player to hoodless base;
- unsupported item does not silently map to an unrelated module.

### Asset guard

Extend `assetNames.test.ts` (or a dedicated equipment asset test):

- both equipment pack GLBs exist and parse;
- every mapped wrapper node exists;
- module skins reference bone names present in both current character skeletons;
- no animations in the equipment packs;
- record/check triangle and material counts per module;
- no wrapper unexpectedly contains another equipment wrapper.

### Renderer/E2E

Add a focused equipment tour rather than bloating the generic tour. Show at minimum:

- player Ranger: no helmet → iron helmet → unequip;
- farmer/Peasant base + plate cuirass;
- hunter + pauldrons + bracers;
- NPC with plate torso + helmet;
- both male and female cases.

Check Idle, Walk, Crouch and one combat clip, especially:
- hood/head clipping,
- shoulder/arm deformation,
- torso penetration,
- boots/trousers at knees/ankles.

## Performance verification

Equipment adds extra **skinned** primitives, so draw calls and skinning cost matter more than file size alone.

Measure on WSL/Linux:

- `pnpm check`;
- `pnpm bench:startup` before/after (two new pack loads + bytes/decode);
- `pnpm bench:render medium` before/after;
- one synthetic/fixture scene with several fully equipped humans in model range, not only normal settlements where few NPCs may own armour.

Targets/gates:

- geometry/materials shared across actors;
- no per-actor texture/material clone;
- no rebuild when equipment signature is unchanged;
- each logical equipment module should be reduced to as few skinned primitives/materials as practical;
- if a fully equipped crowd produces a material draw-call regression large enough to trigger existing render performance gates, simplify/merge **within each equipment wrapper** or reduce stage-1 module count before merge.

## Implementation order

1. **Asset audit only** — verify exact source node names for male/female and make screenshots/contact sheet of candidate modules.
2. Decide supported/rejected mappings; update the table above and seed `render--012` with rejected/missing items.
3. Build the two modular equipment packs + asset guard.
4. Add pure mapping/key/base-outfit rules in `equipmentVisuals.ts`.
5. Generalise the skeleton-rebind helper and attach modules in `Actors.buildHuman()`.
6. Add human visual-key invalidation in `Actors.update()`.
7. Unit + E2E visual verification.
8. Startup/render benchmark and record results.

Do not start Blender modelling during this plan.

## Exit criteria

- Player and NPC appearance both react to every **stage-1-supported** worn armour item.
- Equipping/unequipping while the actor remains in model range refreshes the visual.
- A supported plate cuirass visibly changes a Peasant/Ranger-style actor without falsely granting unrelated leg/boot armour.
- Helmet does not clip through the player's Ranger hood or Herbalist hood.
- Profession/base identity remains where the equipped region does not cover it.
- No random cloth tint recolours metal equipment.
- Unsupported items are explicitly documented and moved to `render--012`; there is no misleading fallback mesh.
- Asset guards, `pnpm check`, visual tour and WSL performance gates pass.


## Result (session 15, 2026-10-03, Sonnet) — stage 1, four modules

- **Modules:** `scripts/assets/build-equipment-modules.mjs` → `public/assets/characters/eq/<Sex>.glb` (≈1.2 MB each, ≈5.4 k triangles for all four): `EQ_IronHelm` (Knight armet), `EQ_PlateCuirass` (Knight body armour), `EQ_Pauldrons` (Knight round pauldrons), `EQ_LeatherBoots` (Ranger boots). Parts are cut from the **Outfits** exports (the "Modular Parts" exports use a different rest pose and fly away when rebound). Each module is inflated along its normals (cuirass 5 cm, pauldrons 2.5 cm) so the plate sits over the base outfit instead of sinking into it. Boots are heavy for their size (≈2.7 k tris): reduce if the budget needs it.
- **Runtime:** `render/equipmentVisuals.ts` (item → module, hood rule, signature; test `equipmentVisuals.test.ts`) and `Actors` (`attachEquipment`, `humanKindKey`): the visual is rebuilt when the worn set changes, the base look is applied before the modules, a helmet swaps `Ranger` → `Ranger_NoHood` and `Herbalist` → `Peasant`. The loader names the armature of later modules `pelvis_1`…, so bones are looked up with that suffix stripped.
- **Checked:** `scripts/e2e/tour-equipment.mjs` (player and a farmer in none/plate/helm/full, close-ups in `test-results/e2e/eq-*.png`): modules sit on the Ranger player and the Peasant NPC, no hood clipping, no tint on the metal. vitest render 59/59, smoke 5/5.
- **Open:** (female farmer checked: same fit) the other professions, boots over the Peasant_Boots base add nothing visible (the base already wears them), performance with many armoured NPCs (A/B in PERF.md), the stage-2 items (`padded_jacket`, `leather_jerkin`, `studded_leather`, `chainmail`, `leather_cap`, `leather_trousers`, `bracers`) and the Opus look review.
