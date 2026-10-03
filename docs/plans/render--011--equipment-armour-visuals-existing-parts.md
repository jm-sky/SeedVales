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
- **Open:** (female farmer checked: same fit) the other professions, boots over the Peasant_Boots base add nothing visible (the base already wears them), performance with many armoured NPCs (A/B in PERF.md), the stage-2 items (`padded_jacket`, `leather_jerkin`, `studded_leather`, `chainmail`, `leather_cap`, `leather_trousers`, `bracers`) and the Opus look review. → Planned in "Stage 2" below (it also covers `leather_gloves`, which this list left out).

## Stage 2 — reuse completion (plan review 2026-10-03, Opus)

*PROGRESS and the kick-off call this "render--011 stage 2". It is the rest of **this** plan: the same reuse-only rule, no Blender. Blender authoring is [render--012](render--012--missing-equipment-modules-blender.md), the stage after this one. The decisions below are made, so Sonnet can run stage 2 without asking. Copy them into `docs/design/DECISIONS.md` at the stage-2 handoff as one new `D-REN-*` entry (not earlier: the quest line is editing DECISIONS at the moment).*

### Preconditions and environment split

- **Start after:** `quests--003` W3 is done, and the review 021 triage is done (its quest findings belong to `quests--003`). Stage 2 takes the render findings of review 021 (#15, #16, #17) as its own steps (S2-1 to S2-3 below). The triage marks them "→ render--011 stage 2".
- **Two environments, two sessions:**
  - **Windows (asset half).** The source pack `_temp/extracted/Modular Character Outfits - Fantasy[Source]/` exists only on the user's Windows machine (`_temp` is gitignored). Building `eq/<Sex>.glb` needs that pack. Allowed there: the build script, the audit script, `pnpm check`. **No e2e and no bench on Windows** (user rule).
  - **WSL (look and performance half).** Run `tour-equipment.mjs`, the bench A/B and `pnpm e2e:run`.

  Commit the packs on Windows; WSL only consumes them. A cloud session can do the pure code steps (S2-1, S2-2, S2-6, the tests) but neither half's asset or bench work.
- **Formats:** render-only. Worn armour (`Human.eq.armor`) is already saved. **No `SAVE_VERSION` and no `GEN_VERSION` bump.** S2-1 keeps its cache on the render side, so the saved shape does not change.
- **FEATURES:** no requirement ID covers equipment visuals, and this plan does not add one. Record the result in the plan's Result only (`CHAR-01` is the hair/beard requirement and stays separate).

### Source facts (verified 2026-10-03 against the source pack's `Outfits/*.gltf`)

Triangle counts are before simplification. Female names differ: `Female_Ranger_Feet`, `Female_Ranger_Acc_Pauldrons`, `Female_Knight_Acc_Pauldrons_Round`.

| Part (male name) | Tris | Material | Notes |
|---|---|---|---|
| `Ranger_Body` | 2998 | MI_Ranger | leather tunic, hips to collar |
| `Ranger_Body_Belt_1` / `_2` | 804 each | MI_Ranger | belts |
| `Ranger_Arms_Bracer` | 3636 | MI_Ranger | both forearms (x ±0.75 in T-pose; the bare arm ends at ±0.83, so the hands stay outside) |
| `Ranger_Legs` | 1128 | MI_Ranger | leather trousers |
| `Ranger_Acc_Pauldron` | 1376 | MI_Ranger | **one** leather shoulder piece |
| `Knight_Body_Cloth` | 2536 | MI_Knight | cloth body of the `Knight_Cloth` outfit (surcoat / quilted look) |
| `Noble_Arms_Guards` | 676 | MI_Noble | **male only**, no female counterpart, so it cannot be a both-sex module |
| `Noble_Acc_Gorget` | 888 | MI_Noble | no matching game item |
| `Knight_Head_Horns`, `Noble_Head_Crown` | — | — | fantasy or noble look; never used for a game item (vision: no fantasy) |

- **No part** in the pack is a cap, a glove, a mail shirt or a studded surface. The bare hands are part of the `Arms` meshes (skin material), so there is no separate glove region.
- **Each base outfit already shows armour-like parts. This is the main stage-2 trap:**
  - `Ranger` / `Ranger_NoHood` (player, hunter) already wear the Ranger body, belts, **bracers**, one **leather pauldron**, **boots** and **leather legs**;
  - `Peasant_Boots` (farmer) already wears Ranger boots;
  - `Knight` (guard) wears plate body armour, round pauldrons, armoured legs and armoured feet;
  - `Wizard` (trader) has **no head part**, so a helmet over it is safe (this resolves review 021 #16 for the trader). Its robe body covers the upper legs.
- **Every guard starts with `leather_jerkin` + `leather_cap`** (`sim/newGame.ts`). These are the two most common stage-2 items in normal play, ahead of anything the player buys.

### Decisions (made; Sonnet follows them)

- **S2-D1 Base provides (resolves review 021 #16).** Add a pure table `BASE_PROVIDES: Partial<Record<CharOutfit, EquipmentModule[]>>` in `equipmentVisuals.ts`. A module the base already shows is not attached, and it does not enter the visual key. Initial table:

  | Base | Provides |
  |---|---|
  | `Knight` | `PlateCuirass`, `Pauldrons`, `LeatherBoots`, `LeatherJerkin`, `LeatherTrousers` |
  | `Ranger`, `Ranger_NoHood` | `LeatherBoots`, `Bracers`, `LeatherJerkin`, `LeatherTrousers` |
  | `Peasant_Boots` | `LeatherBoots` |
  | `Wizard` | `LeatherTrousers` (the robe covers the upper legs) |

  The base identity stays as stage 1 decided. The guard keeps the Knight look, and its leather cap does show (the Knight base has no helmet). That guards look plate-armoured while they wear leather is recorded as ❓ user below; it is not changed here.
- **S2-D2 Outer hides under in the same slot.** If a slot has an outer module, its under module is not attached (gambeson under mail or plate). This means no clipping, one draw call fewer, and a simpler inflate. `padded_jacket` is visible only when no outer torso item is worn.
- **S2-D3 Tint variants are allowed, at build time only.** A module may be the same source geometry as another module with a different base-colour factor, set in `build-equipment-modules.mjs`. Share the accessors where gltf-transform allows it; if they are duplicated, record the bytes. Never tint at runtime or per actor. Use a tint only to separate material tiers (leather vs cloth). It must never make one material look like another (grey cloth is not mail).
- **S2-D4 Small modules cast no shadow.** Modules whose bounds are smaller than about 0.4 m (bracers, and later the cap and gloves) set `castShadow = false`. The shadow pass otherwise doubles their draw calls for a sub-pixel shadow.
- **S2-D5 Inflate tiers.** Under-layer modules ≤ 1.5 cm. Leather outer ≈ 2–3 cm. Plate stays at 5 cm. Under S2-D2 an under module never sits beneath an outer module, so the tiers only have to clear the base outfits.
- **S2-D6 Default verdicts per item.** Sonnet builds the "candidate" rows, takes a contact sheet (S2-4) and keeps a row only if it passes the acceptance check below. If it fails, the row becomes "rejected → render--012" with the reason. Do not ask.

  | Item | Candidate | Default | Reason / acceptance check |
  |---|---|---|---|
  | `leather_jerkin` | `Ranger_Body` + `Ranger_Body_Belt_1`, tint ≈ 0.85 (darker leather) | **support** | Most common stage-2 item, but every guard has a Knight base, which provides it. It shows on Peasant / Blacksmith / Herbalist bases and on companions. No visible base cloth may poke through at the collar or hips in Idle or Walk. |
  | `bracers` | `Ranger_Arms_Bracer`, simplify to ≈ 0.15 | **support** | Both sexes exist. Check that the mesh is forearm-only, with no upper-arm sleeve, over the Peasant arms. |
  | `leather_trousers` | `Ranger_Legs`, inflate 1.5 cm | **support** if it reads as trousers | Over `Female_Peasant` it must not stick out of the skirt or dress line. If it does, reject it for female bases only: the module stays male-only, and the female key leaves it out. |
  | `padded_jacket` | `Knight_Body_Cloth`, tint off-white / ochre | **candidate** | Keep it only if it reads as a padded cloth jacket and not as a knight's tabard. Otherwise → render--012. |
  | `studded_leather` | none | **rejected → render--012** | A darker jerkin would look identical to `leather_jerkin` (tiers must be told apart by silhouette). |
  | `chainmail` | none | **rejected → render--012** | Grey cloth reads as a tabard, not mail. Plate geometry would show the wrong tier. |
  | `leather_cap` | none | **rejected → render--012 (first priority)** | A hood is not a cap; the armet is metal; the horns and crown are fantasy. |
  | `leather_gloves` | none | **rejected → render--012** | No glove part exists. The hands belong to the arm mesh. |

  In the end, every item in `items.ts` with an armour slot is either mapped or listed as rejected in this plan (an exit criterion).

### Steps (in order; model per step)

| # | Step | Where | Model |
|---|---|---|---|
| S2-1 | **No per-frame allocation (review 021 #15).** Keep a render-side cache on `Visual`: the 14 armour stack references in a fixed `ARMOR_KEYS` order (a precomputed constant, not template strings built per frame), plus the last outfit. Each frame compares references only. Compute `humanKindKey` again only when a reference changed. No new `Human` field, no sim change. Test: an actor with unchanged armour causes no key build (spy or counter), and swapping a stack triggers exactly one rebuild. | any | sonnet |
| S2-2 | **Base-provides and outer-hides-under rules** (S2-D1, S2-D2) in `equipmentVisuals.ts`, with the key built from the *effective* modules. Tests: guard + `plate_cuirass` → no module, same key as bare; Ranger player + `leather_jerkin` → no module; Peasant + `leather_jerkin` → module; gambeson + mail → only mail (mail unmapped → none); trader + `iron_helm` → helm, Wizard base kept. | any | sonnet |
| S2-3 | **Build-script safety (review 021 #17).** Running with a module list writes to `--out <dir>` only; a partial run into `public/` is refused. Add `--audit`: write a JSON list of every source part per sex (name, triangles, material, bounds) to `test-results/eq-audit.json`, and render a contact sheet if Blender MCP is available. Otherwise use `tour-equipment.mjs` frames on WSL. | Windows | sonnet |
| S2-4 | **Audit + contact sheet.** Build the support / candidate rows from the S2-D6 table into a temporary `--out` pack and view them on both sexes over Peasant, Peasant_Boots, Blacksmith, Herbalist→Peasant and Ranger_NoHood. Write the verdict per row into this plan, and move every rejected row into render--012 "Input". | Windows (build) + WSL (frames) | sonnet; Opus look check before merge |
| S2-5 | **Final packs.** Add the kept modules to `MODULES` / `RATIO` / `INFLATE` and the tints, then rebuild both packs fully. Budget: **≤ 9 k triangles per sex pack in total** (stage 1 is ≈ 5.4 k; `LeatherBoots` is the biggest at ≈ 2.7 k. If the budget is short, reduce it to ≈ 1 k first), **≤ 1.6 MB per file**, one material per module, textures ≤ 512 px. Row in `docs/assets/README.md` (CC0, Quaternius). | Windows | sonnet |
| S2-6 | **Asset guard (missing from stage 1).** Add `equipmentAssets.test.ts` (or extend `assetNames.test.ts`): both packs parse; every `EquipmentModule` has an `EQ_<Module>` node (or `_n`) in both sexes, except modules listed as male-only; no animations; every skin joint name, with the `_n` suffix stripped, exists in the `Male_Peasant` / `Female_Peasant` skeletons. That last check matters because `attachEquipment` silently falls back to the pack's own bone, and the piece then freezes in the rest pose. Add the triangle/material budget from S2-5. | any | sonnet |
| S2-7 | **Runtime.** Attach the new modules (no logic change beyond S2-2). Clone only the wanted wrappers instead of `SkeletonUtils.clone(pack.scene)` for every build, which with ~8 modules clones 8 armatures per human. Use a per-module template cache, or clone the pack once per sex and keep its wrappers. Apply S2-D4. Add the visual flag `sv-visual {"equipment":false}` (skip `attachEquipment`) for the same-build A/B. | any | sonnet |
| S2-8 | **Look check.** Extend `tour-equipment.mjs` (not the generic tour): player Ranger with bare → jerkin (no change expected) → full kit; farmer male and female with jerkin + trousers + bracers; guard (cap only shows); trader + helm; herbalist + helm → Peasant base. Clips: Idle, Walk, Crouch, one attack, the dodge. Close-ups of collar, hips, knees and forearms. Frames go to `docs/state/frames/render--011/`. | WSL | sonnet; **Opus keep/drop per module** |
| S2-9 | **Performance.** Add an `armoured-crowd` scene: settlement 2 at noon, with the `__sv` armour helper putting the full stage-2 kit on every adult in model range (the helper already exists in `debug/api.ts` for one NPC; extend it to a radius). Measure `bench:render medium` A/B with `SV_VISUAL='{"equipment":false}'` vs default in the **same build**, alternating pairs (D-PERF-5 / D-REN-16 practice), and `bench:startup` before/after the pack change. The new scene gets its own first baseline. Existing baselines stay untouched. | WSL | sonnet |
| S2-10 | Result section, PROGRESS, DECISIONS entry (S2-D1…D6), roadmap row update; plan → `done` if every exit criterion holds; render--012 Input lists the rejected items. | any | sonnet (handoff skill) |

S2-1, S2-2, S2-6 and S2-7 can land before the asset half. They keep working with the stage-1 pack, and the guard test then simply covers four modules.

### Acceptance criteria (stage 2)

- Each `armor(...)` item in `data/items.ts` is mapped or listed as rejected with a reason. Mapped modules render on both sexes, or are explicitly marked as sex-limited.
- Guard + `plate_cuirass` / `pauldrons` and Ranger + `leather_jerkin` / `bracers` / `leather_boots` attach no duplicate module (test S2-2).
- A Peasant-base NPC wearing `leather_jerkin` changes visibly at gameplay camera distance (tour frame).
- No base cloth pokes through any kept module in Idle, Walk or Crouch (Opus look check). A module that clips is dropped, not shipped.
- No per-frame allocation for unchanged armour (S2-1 test). A rebuild happens only when the worn set changes.
- The asset guard passes, including the joint-name check (S2-6).
- Performance, `armoured-crowd` medium, equipment on vs off, same build:
  - draw calls rise by at most the number of attached modules × visible armoured humans (no shadow draws for S2-D4 modules);
  - `render.prep` p95 is within noise;
  - if `render.cpu` p95 rises by more than 10 %, cut module triangles or modules first; never move the baseline.
- Startup: the pack bytes grow by ≤ 0.8 MB in total; `bench:startup` stays in the same result class.
- `pnpm check` green. `pnpm e2e:run` green on WSL (no new e2e step is required: equipment is covered by the tour and the unit tests).

### Risks

- **Rest-pose mismatch:** stage 1 found that "Modular Parts" exports fly away when rebound. Keep cutting parts from the `Outfits/*.gltf` files only.
- **Bone fallback hides errors:** a missing joint binds to the pack bone and the piece floats in T-pose. The S2-6 guard catches it.
- **Inflate on thin parts:** at 2–3 cm, belts and bracers can look puffy. Prefer a lower inflate plus dropping the belt over a large inflate.
- **Female skirt bases:** trousers may be male-only (S2-D6). Record it rather than forcing a fit.
- **Player progression:** under S2-D1, leather items do not change the player's Ranger look. Only plate, pauldrons, the helm (and later mail, the cap and gloves) do. Acceptable for stage 2; see ❓ user.

### ❓ User (non-blocking; the defaults above apply until answered)

1. **Guards** look plate-armoured (Knight base) but wear a leather jerkin and cap. Options: (a) keep it (default); (b) give guards a cloth "Guard" base (Knight body cloth + plain legs), built in render--012, so their worn armour shows honestly.
2. **The player's Ranger base** already shows bracers, a pauldron and boots, so the first leather purchases change nothing visibly. Options: (a) keep it (default); (b) a plainer player base (Ranger without bracers and pauldron, built from existing parts via a `VARIANTS` drop list, no Blender), so every armour piece the player buys shows.
