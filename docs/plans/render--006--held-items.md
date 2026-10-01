# Render: profession held items attached to bones (hand-off spec)

**Status:** draft  (assets + data done and parked 2026-10-01; the renderer attach code is not written)  
**Model:** sonnet — attach code, guard test, bench; **opus reviews the attach design** (section "Attach design") before it merges  
**Domain:** render  
**Sub domains:** assets, characters, perf  
**Roadmap:** [research 005](../research/2026-10-01--005--blender-pack-reuse-recommendations.md) P3; sibling of [render--005](render--005--character-variants.md) step 3
**Created:** 2026-10-01  
**Finished:** —

---

## What exists (do not redo)

Built in a Blender-MCP + Node session (no gameplay / sim / UI / render code touched):

| file | what |
|---|---|
| `public/assets/parked/props_held.glb` | 113 KB for all kits, 3.97 k tris, **1 material** (`Held_Items`, vertex colours, no texture), meshopt. One identity wrapper node `Kit_<Profession>` with a single `Kit_<Profession>_mesh` child (1 mesh, 1 primitive = 1 draw call per kit). |
| `public/assets/parked/attachments.json` | `{ professionId → { node, bone, position, quaternion, scale, notes } }`, data only, keys = ids of `data/professions.ts`. |
| `scripts/assets/build-held-items.mjs` | reproducible build (Node, glTF Transform; licence/provenance header). `node scripts/assets/build-held-items.mjs` rewrites both outputs and prints a self-check: rest-pose world bounds of every kit, which matched the Blender numbers exactly. `--pieces <out.glb>` writes the raw piece library for a new Blender placement session. |
| `scripts/assets/held-items-layout.json` | the Blender session's result (rest-pose world matrices, Y-up, of every kit frame and piece). It is the **input** of the build script, so re-tuning an offset = a new Blender session (or hand edit) + re-run, never a hand edit of the two outputs. |
| `src/game/render/assetNames.test.ts` | new test "parked held items" keeps the contract (profession ids, bones exist in both skeletons, unit quaternion, 1 primitive, ≤ 1.5 k tris per kit) green while the file is parked. |

Licence: pieces from Fantasy Props MegaKit [Standard] by Quaternius, **CC0 1.0** (`_temp/extracted/Fantasy_Props_MegaKitStandard/License_Standard.txt`), glTF versions only (the 10 MB `Chest_Wood` not used). Hammer, staff, quiver + arrows and bow are hand-modelled primitives (the pack has none of them); no AI generators (D-REN-8). No `CREDITS-CC-BY.txt` entry needed.

## Which profession gets what (professions that exist in `data/professions.ts`: farmer, woodcutter, hunter, guard, herbalist, trader, blacksmith, shepherd)

| profession id | kit node | bone | contents | tris | KB (kit mesh) | note |
|---|---|---|---|---:|---:|---|
| `woodcutter` | `Kit_Woodcutter` | `hand_r` | `Axe_Bronze` (pack) | 826 | 48 | head up/forward, tilted outward so it clears the thigh in Walk; kit frame = grip |
| `blacksmith` | `Kit_Blacksmith` | `hand_r` | smith hammer (hand-modelled; the pack has no hammer) | 68 | 4 | kit frame = grip |
| `shepherd` | `Kit_Shepherd` | `hand_r` | 1.64 m staff, rope grip band, knob (hand-modelled) | 112 | 7 | foot touches the ground in Idle (grip 1.0 m above the foot); swings free in Walk |
| `guard` | `Kit_Guard` | `spine_01` | `Sword_Bronze` at the left hip (hilt up, scale 0.7) + `Shield_Wooden` on the back (dome backwards, scale 0.7) | 1244 | 73 | pieces simplified 0.4 / 0.45 |
| `hunter` | `Kit_Hunter` | `spine_03` | quiver with 5 arrows + short bow slung diagonally on the back (both hand-modelled) | 343 | 20 | bow slung, not drawn: no bow clips exist |
| `herbalist` | `Kit_Herbalist` | `spine_01` | `Pouch_Large` (belt, front right) + `Bottle_1` (belt, front left, scale 0.55) | 583 | 34 | |
| `trader` | `Kit_Trader` | `spine_01` | `Bag` as a sack backpack (scale 0.55) + `Pouch_Large` (belt, front left) | 793 | 47 | |

**Dropped / not done, and why**
- `farmer`: nothing in the pack fits (no shovel/hoe/pitchfork; `Pickaxe_Bronze` is a miner's tool, `Bucket_Wooden_1` only makes sense while carrying). Candidate if wanted: a hand-modelled hoe (~150 tris) by the same script. ❓ user.
- Research table items that do not exist as pack pieces: **whetstone** (`Whetstone` is a 1.15 m grinding-wheel station, not a belt item — dropped), blacksmith **apron** (already in the `Blacksmith` outfit), hunter quiver/bow (modelled), shepherd staff (modelled). `Rope_1` coil and `Bucket_Wooden_1` market role left out (the bucket needs a state, not a profession).
- The player (Ranger outfit) has no profession → no kit. Weapons the sim equips (`weapon: 'spear'`, `short_bow`, …) are unrelated: kits are **identity props**, not the equipment layer. The guard's `weapon` is `spear` in the data yet the kit carries a sword — see open questions.
- `Pickaxe_Bronze`, `Torch_Metal`, `Lantern_*`: unused here (torches belong to `survival--001`, held via `Idle_Torch_Loop`).

## Contract: how to read `attachments.json`

`position` / `quaternion` (x, y, z, w) / `scale` are the **local transform of the kit node in the bone's local space** (glTF node space = three.js `Bone` space), i.e. `bone.add(kit)` with `kit.position/quaternion/scale` set from the JSON. At rest (T-pose) the kit then sits exactly where it was placed in Blender; during animation it follows the bone. What the kit frame means (vertices are baked in it):
- hand tools (`woodcutter`, `blacksmith`, `shepherd`): origin = grip point in the fist, +Y = along the shaft toward the head, +Z = blade/face normal;
- body kits (`guard`, `hunter`, `herbalist`, `trader`): origin = the bone head at rest, axes = the character's model axes (Y up, +Z front, +X the character's left). The JSON quaternion is then just the inverse of the bone's rest rotation, `position` is 0 — still apply it, it is what makes the kit upright.

**Both sexes**: `Male_` and `Female_` rigs have the same bone names and orientation; head positions differ by 1.9 cm (spine_01) to 5.8 cm (hand_r), but offsets are bone-relative, so one entry serves both — **no per-sex offset needed**. Checked in Blender with ray-parity penetration tests on the evaluated meshes over Idle_Loop, Walk_Loop (4 frames), Interact and Sword_Attack (4 frames): in Idle/Walk every kit is ≤ 2.6 cm into the body for both sexes (a hand grip is meant to overlap; the male guard sword sits 2.6 cm into the hip in Idle, the female 1.7 cm). Honest caveats: the numeric test also flagged 8–15 cm for the male belt-front items (herbalist pouch/bottle, trader pouch) at Interact frame 12, but the contact sheets show no visible clipping there (the test is noisy near thin arm geometry) — treat that as unverified until the tour screenshots; and in Sword_Attack the herbalist pouch hits the lunging leg (6–10 cm, ~0.3 s) and the quiver/bow meet the swinging arm — transient. Children (root scale 0.68) and elders (0.96) scale the kit with the root; no special case.

Kit node structure: `Kit_X` (wrapper, identity) → `Kit_X_mesh` (mesh; meshopt quantisation leaves a scale/offset on it). **Clone the wrapper**, not the mesh node (same lesson as `mergeTemplate` in README).

## Attach design (Opus reviews this section)

Where: `Actors.buildHuman` (`src/game/render/actors.ts`), directly after the `bones` map is built (it already maps every bone name of the outfit skeleton) and before `root.traverse` that sets `castShadow`/`frustumCulled`:

```ts
const att = h.profession ? this.heldKits.get(h.profession) : undefined   // { template: Object3D, bone, pos, quat, scale }
const bone = att && bones.get(att.bone)
if (att && bone && this.q.heldItems) {
  const kit = att.template.clone()          // Object3D.clone: geometry + material are shared, only nodes are new
  kit.position.fromArray(att.position); kit.quaternion.fromArray(att.quaternion); kit.scale.fromArray(att.scale)
  bone.add(kit)
}
```

- **Loading**: in `Actors.load()` add `loadGltf('props_held.glb')` + `attachments.json` (plain `fetch`, ~2 KB) next to the head/outfit loads; build `heldKits` once: `template = gltf.scene.getObjectByName(a.node)`. Failure must degrade silently like the other assets (no kit, no crash; a `console.warn`).
- **Range gate**: nothing extra. `buildHuman` only runs for `d < humanModel` (30 / 40 / 70 m on low / medium / high) and the visual is dropped and rebuilt on crossing it, so the kit lives and dies with the skinned model; far NPCs use `placeholderHuman` and get no kit. Do **not** attach to the placeholder.
- **Quality gate**: add one boolean `heldItems` to `QualitySettings` (`render/quality.ts`): `false` on `low`, `true` on `medium`/`high`. Alternative if `low` should keep identity props: attach only when `d < humanModel / 2` — a decision for the user (open question 2). `setQuality` already exists; kits of existing visuals update on the next rebuild (the `model !== wantModel` path), no live re-attach needed.
- **Sharing**: geometry and the `Held_Items` material are shared by every clone (`clone()` keeps references; no `.clone()` of the material, no per-NPC materials — the same rule as outfits). `dropVisual` never disposes geometry/material, so shared GPU buffers stay alive; do not add disposal. Because the material is vertex-coloured Lambert (`toLambert` keeps `vertexColors`), it needs no texture upload. `castShadow = true` on the kit mesh like the body (or `false` on `medium` if shadow cost shows up in the bench).
- **Cost per NPC in range**: +1 draw call (1 mesh/primitive/material) and ≤ 1.24 k tris (guard) — about +15 % of a Peasant; the animated bone moves the kit with no extra skinning work (it is a plain child of a bone, not a skinned mesh).
- **Not in scope here**: swapping kits with `h.eq` / equipment state, hiding the tool while the NPC sleeps, drawing a weapon for combat, the Equipment Lab (`tools--001`), status looks (research P4). The JSON shape allows a later `{ profession → kit[] }` or per-state variants.

## Guard test (when the file stops being parked)

1. Move `props_held.glb` and `attachments.json` from `public/assets/parked/` up to `public/assets/` (update the two build-script output paths and the loader).
2. In `src/game/render/assetNames.ts` add `export const HELD_KIT_NODES = [...]` (the seven `Kit_*` names, ideally derived from `attachments.json` so they cannot drift) and add `'props_held.glb': HELD_KIT_NODES` to `packNodeNames()`; `assetNames.test.ts` already runs every entry. Move the "parked held items" test (contract checks) to the new path — keep it, it covers bones/professions/tris.
3. Add `props_held.glb` to the "exists and parses" list only if it is not already in `packNodeNames()`.

## Verification (WSL/Linux only — never on the Windows machine)

1. `pnpm check` (Windows is fine for this).
2. WSL: `pnpm bench:render medium` and `low` **before and after** (same seed, same scenes): compare `render.draw`, draw calls, triangles and `render.prep` in the settlement scenes (most NPCs in range); record in `docs/state/PERF.md`. Expect +1 call per NPC in range and ≈ +0.8 k tris per NPC; if `render.draw` grows beyond the render--003 triggers, enable the `low` gate or the half-range gate.
3. `node scripts/e2e/tour.mjs`: screenshots of each profession (woodcutter, blacksmith, shepherd at the very least: hand tools are where a grip can look off) in Idle, Walk and during the attack clip. ❓ user judges the look.
4. Re-run `node scripts/assets/build-held-items.mjs` after any tweak; its self-check must still print the same bounds unless an offset was meant to move.

## Open questions for the user

1. **Look**: realistic bronze Fantasy Props pieces (current) or something else; the hand-modelled hammer/staff/bow are plain boxes and tubes in the same palette — acceptable, or should a pack with real ones be sourced?
2. **`low` profile**: no kits at all, or kits at half range?
3. **Guard**: `professions.ts` says `weapon: 'spear'` but no spear exists in the pack. Kit carries sword + shield (research table). A hand-modelled spear (~120 tris) in the right hand is possible. Which one?
4. **Farmer**: a hoe/shovel kit (hand-modelled) or nothing?
5. **Held weapon during combat**: should the hand tool replace the equipped weapon visual later (sim `weapon` field), i.e. is this plan only identity props?
6. **Staff / tools while the NPC works**: kits are always shown, also while an NPC sleeps or sits (the sheltering ones are not rendered at all). Hide while `sit`/`sleep` clips play?
