# Quaternius outfit `.blend` files: modular equipment candidates

**Date:** 2026-10-03 · **Author:** Sonnet (Windows machine, Blender MCP, Blender 5.2.0 LTS, addon 1.8) · **Plans:** [render--011 stage 2](../plans/render--011--equipment-armour-visuals-existing-parts.md), [render--012](../plans/render--012--missing-equipment-modules-blender.md)

Research and asset preparation only. No game code was changed, and none of the candidates is wired into the build. Re-run everything with [`scripts/assets/blender-equipment-modules.py`](../../scripts/assets/blender-equipment-modules.py) (build + posed fit sheets) and check it with [`scripts/assets/audit-eq-raw.mjs`](../../scripts/assets/audit-eq-raw.mjs).

## 1. Summary

- **The rest pose in the `.blend` files is the Outfits rest pose.** All 65 UBC joints of `All_Male.blend` / `All_Female.blend` match `Outfits/<Sex>_Peasant.gltf` to 0.0000 m (after the Z-up → Y-up conversion). Parts cut from the `.blend` therefore bind correctly to `Male_Peasant.glb` / `Female_Peasant.glb`. This is the pose the stage-1 "Modular Parts" exports got wrong.
- **`Ranger_Arms_Bracer` is a separate mesh, bracers only.** It has no hands, no skin material and no sleeve. It needs no cutting, and its skin weights (`lowerarm_*`, a little `hand_*`) are already correct. "Ranger without bracers" is `Ranger_Arms` plus the other Ranger parts, again with no cutting.
- **Eight candidates per sex are built** (16 `.raw.glb` files in `assets-src/characters/eq/`). Six are good enough to keep or to finish with small work. One is rejected for one sex (leather pauldron, female) and needs a recolour for the other. A cap, chainmail and studded leather do not exist in the pack (§4).
- **Two of the plan's assumptions changed.** The Ranger body and legs are green and black, so a "leather" module needs a UV recolour onto a brown swatch (a tint cannot do it). Gloves can be derived from the hand weights, which S2-D6 listed as impossible. See §5.

## 2. Inventory (both files)

Full data: [`docs/state/frames/render--011/blend-inventory.json`](../state/frames/render--011/blend-inventory.json) (the `WGT-rig_*` bone-shape objects are left out).

| Fact | `All_Male.blend` | `All_Female.blend` |
|---|---|---|
| Objects (scene) | 169 (167) | 166 |
| Outfit meshes | 39 (+ 2 `Female_Regular` leftovers) | 37 (+ 2 `Female_Regular` leftovers) |
| Collections | Knight, Noble, Peasant, Ranger, Wizard, WGTS_rig, Collection | same |
| Armature | one object `Armature`, **382 bones** (Rigify-style control rig); 65 deform bones carry the UBC names | same |
| Vertex groups per mesh | 65 (the UBC deform names) | 65 |
| Modifiers | `ARMATURE` on every part; `MIRROR` on some (arms, bracers, pauldrons, boots); `NODES` (Auto Smooth / Smooth by Angle) on others | same |
| Hidden objects, shape keys | none | none |
| Materials | `MI_Peasant`, `MI_Ranger`, `MI_Knight`, `MI_Noble`, `MI_Wizard` (4096² atlases + ORM + normal), `MI_Regular_Male` / `_Female` (skin, 2048²) | same |
| Animation | one action in the file (`Idle_Loop` / `Jog_Fwd_Loop`); pose position `REST` | same |

**Triangle counts.** The numbers in the file are before the `MIRROR` modifier, so a mirrored part has half the triangles of its glTF export (`Male_Ranger_Arms_Bracer` is 1818 in the file and 3636 in glTF). The table uses the evaluated (glTF-equivalent) counts.

| Part | Male | Female | Material | Notes |
|---|---|---|---|---|
| `Peasant_Arms` | 5338 | 6848 | atlas + skin | male: sleeve + black cuff + tan hand; **female: olive sleeve + leather cuff with straps fused in + dark hand (already gloved)** |
| `Peasant_Body` / `Legs` / `Feet` | 3856 / 1112 / 2588 | 2188 / 1944 / 2588 | `MI_Peasant` | male: olive shirt, black baggy trousers; female: brown bodice, black leggings (no skirt) |
| `Ranger_Arms` | 4928 | 4872 | `MI_Ranger` + skin | dark green sleeve to the wrist, skin hand |
| `Ranger_Arms_Bracer` | 3636 | 3636 | `MI_Ranger` | bracers only: 6 loose parts per side (306-tri tube, 96-tri straps) |
| `Ranger_Body` | 2998 | 2962 | `MI_Ranger` | **green** vest with brown leather straps and a brown tasset skirt |
| `Ranger_Body_Belt_1` / `_2` | 804 | 804 | `MI_Ranger` | two belts, same mesh data, different object transforms |
| `Ranger_Legs` | 1128 | 1204 | `MI_Ranger` | **black** trousers |
| `Ranger_Feet_Boots` (female `Ranger_Feet`) | 9172 | 9172 | `MI_Ranger` | very heavy, decimate before use |
| `Ranger_Acc_Pauldron` (female `…Pauldrons`) | 1376 | 1376 | `MI_Ranger` | one pauldron, pale grey-green (fabric/metal patch of the atlas), not brown leather |
| `Ranger_Head_Hood` | 2136 | 2136 | `MI_Ranger` | pointed hood with a back peak |
| `Knight_Body_Cloth` | 2536 | 2536 | `MI_Knight` | **same mesh for both sexes**: sleeveless tabard, red/white with a cross and a belt |
| `Noble_Acc_Gorget`, `Noble_Acc_Pauldron(_Lion)`, `Noble_Arms_Guards` (male only), `Knight_Acc_Scarf` | 888, 596/928, 676, 471 | 888, 596/928, –, 471 | | noble or knightly look, not used |

**Rest pose.** 65/65 joints, max difference 0.0000 m in both sexes, so the `.blend` rest pose equals the Outfits rest pose. (The `anims.glb` skeleton differs from the Peasant skeleton by 1.5 cm at the upper arm and up to 8 cm male / 16 cm female at the finger leaf bones; this does not matter for the posed fit sheets, which only need approximate poses.)

## 3. Answers to the questions of the task

### 2a. Is `Ranger_Arms_Bracer` an arms mesh with bracers?
No. It is a **separate bracers-only mesh** (leather tube, two straps, buckles, a small hand plate). `Ranger_Arms` is the sleeve + hand mesh, and its forearm has no leather on it. Nothing needs separating by loose parts, material or vertex selection. Screenshots: [`blend-arms-male.png`](../state/frames/render--011/blend-arms-male.png), [`blend-arms-female.png`](../state/frames/render--011/blend-arms-female.png) (top row: Peasant arms, Ranger arms; bottom row: bracers alone, Ranger arms + bracers).

### 2b. "Ranger without bracers" and "bracers only"
Both are done, with no cutting:
- **`Ranger_Plain_<Sex>`** = `Ranger_Arms` + `Ranger_Body` + both belts + `Ranger_Legs` + boots decimated to 1800 tris (the same budget as the existing `Peasant_Boots`). No bracers, no pauldron, no hood. 12.4 k triangles raw. `Ranger_Plain_Hood_<Sex>` adds the hood (14.6 k).
- **`Bracers_<Sex>`** = the bracer mesh, collapse-decimated in Blender from 3636 to **600** triangles. Meshopt alone cannot get below about 750 (the strap islands keep their borders), so the Blender decimate is part of the script (`BRACER_TRIS`).

### 2c. Pauldron, belts, hood, body, legs, cloth
Fit numbers are the depth by which module vertices lie inside the Peasant base surface at rest (`p95`, in cm, among vertices within 10 cm of the base). Sheets: `blend-<jerkin|trousers|gambeson|pauldron|hood|bracers>-<sex>.png` (rest, original colours, over the Peasant base) and `blend-fit-<Module>-<sex>.png` (posed, final candidate, see §6).

| Source part | Fit over Peasant (p95 male / female) | Result |
|---|---|---|
| Pauldron | 0.96 / **4.25** cm | male: sits well, but is a pale grey-green and a single piece. Female: the shoulder shape is wrong, 5 cm of inflate would balloon it. **Needs work (male: recolour to leather), rejected for female.** |
| Belts (`Body_Belt_1/_2`) | 1.5 / 0.2 cm | clean; used inside the jerkin (`Belt_1`) and the Plain outfit (both) |
| Hood | 9.3 / 0.7 cm male | male number is the peak/back of the hood in front of the head (not a clipping problem). The hood is already used by `Herbalist`; nothing new |
| `Ranger_Body` as jerkin | 1.67 / 1.31 cm | male: base shirt pokes through at the collar, chest and hips at rest; **2.5 cm inflate** fixes it (female **2 cm**). Collar and hips are clean afterwards, in Idle, Walk, Crouch and attack. **Keep, after the recolour.** |
| `Ranger_Legs` over Peasant legs | 2.62 / 1.45 cm | male: the Peasant trousers are baggy, so 3.5 cm of inflate is needed. Female: the Peasant legs are leggings, there is **no skirt line**, 2 cm is enough. Recoloured to brown they read as breeches in both sexes. **Keep.** |
| `Knight_Body_Cloth` as gambeson | 1.5 / 0.8 cm | the red heraldic crest makes it a tabard. With the whole mesh collapsed onto one linen/ochre swatch of the Peasant atlas it reads as a plain padded vest (sleeveless: the base sleeves show). 2 / 1.5 cm inflate. **Keep, provisional (Opus look check).** |

### 2d. Anything else usable
- **No hidden objects and no shape keys** in either file. The only extra meshes are the two `Female_Regular` leftovers (a base female body, not an outfit) and the 128 `WGT-rig_*` custom bone shapes (empty meshes).
- **Gloves:** the hands are part of the arm meshes, but they can be derived. Faces of `Peasant_Arms` that lie beyond the wrist (`|x| >= hand_l head − 2 cm`) form a clean hand shell with the right weights; decimated to 560 tris, pushed out 4 mm and collapsed onto a brown leather UV they read as gloves on the **male** Peasant. The **female Peasant arms already have dark gloves and cuffs**, so the module is not needed there.
- **Leather cap: not derivable.** Cutting the hood above brow level (z ≥ 1.62) leaves a pointed cowl with ragged tails (`blend` test in §7), not a cap. Needs a procedural dome in render--012.
- **Mail, studded leather:** no source geometry or texture anywhere in the pack.
- Noble/Wizard/Knight parts (gorget, scarf, arm guards, noble belt) exist and are CC0, but they are heraldic or fantasy and match no game item. A gorget (`Noble_Acc_Gorget`, 888 tris, both sexes) is the only one that could be an armour item later (neck guard).

## 4. Candidates and verdicts

Files: `assets-src/characters/eq/<Module>_<Sex>.raw.glb`. All have the 65-bone UBC skeleton (all joint names are in `Male_Peasant` / `Female_Peasant`, checked by `audit-eq-raw.mjs`), no animations, one base-colour-only 512 px material (the outfits: two, atlas + skin), no normal/ORM textures. "After simplify" is the result of the same meshopt step as `build-equipment-modules.mjs` (weld + simplify, error 0.05) to the render--012 budget. `inflate` is the value to put into `INFLATE` (p95 penetration + 4 mm, rounded up to 5 mm) and was used in the fit sheets.

| Module | Source | Tris raw (M / F) | After simplify (M / F) | Inflate M / F (cm) | Verdict |
|---|---|---|---|---|---|
| `Bracers` | `Ranger_Arms_Bracer`, Blender-decimated | 600 / 600 (source 3636) | 600 / 600 | 1.5 / 2.0 | **keep.** Both sexes, forearm only. Sits over the male black cuff and over the female fused cuff. Replaces S2-D6 `bracers` |
| `LeatherJerkin` | `Ranger_Body` + `Belt_1`, green faces remapped to leather brown | 3802 / 3766 | 1497 / 1498 (budget 1500) | 2.5 / 2.0 | **keep.** Replaces `leather_jerkin` (a tint of 0.85 cannot turn green into leather, the UV recolour does) |
| `LeatherTrousers` | `Ranger_Legs`, collapsed onto a leather brown UV | 1128 / 1204 | no simplify needed | 3.5 / 2.0 | **keep.** Female has no skirt problem. Replaces `leather_trousers` for both sexes |
| `PaddedJacket` | `Knight_Body_Cloth`, collapsed onto a linen swatch of `MI_Peasant` | 2536 / 2536 | 1500 / 1500 | 2.0 / 1.5 | **keep, provisional.** Reads as a plain padded vest, sleeveless, no quilting. Opus decides from WSL frames. Replaces `padded_jacket` |
| `Gloves` | hand shell of `Peasant_Arms`, decimated, leather UV | 560 / 559 | 560 / 559 | 0 (already a shell) | **keep for male; not needed for female** (female Peasant arms are already gloved). Replaces `leather_gloves` on male bases |
| `LeatherPauldron` | `Ranger_Acc_Pauldron` | 1376 / 1376 | 600 / 600 | 1.5 / 5.0 | **needs work (male)**: grey-green texture, one piece only. **Reject (female)**: 4.25 cm penetration. No S2-D6 row (`pauldrons` already uses the Knight round pair) |
| `Ranger_Plain` | Ranger parts without bracers/pauldron/hood, boots at 1800 | 12462 / 12446 | not budgeted (base outfit, like the existing 10 k outfits) | – | **keep** as a candidate base for hunters, so that bracers (and the jerkin, trousers) can come from equipment instead of being baked into `Ranger_NoHood` |
| `Ranger_Plain_Hood` | + `Ranger_Head_Hood` | 14598 / 14582 | not budgeted | – | **keep** (hood optional, as asked). The hood must still be dropped when a helmet is worn (stage 1 rule) |
| leather cap | – | – | – | – | **no source** (§3 2d). First priority of render--012: procedural dome, weights from `Head` |
| chainmail, studded leather | – | – | – | – | **no source.** Stay with render--012 |

**Which S2-D6 rows the candidates can replace** (decisions are not changed): `leather_jerkin`, `bracers`, `leather_trousers` (both sexes), `padded_jacket` (provisional), `leather_gloves` (male bases). Not replaceable: `studded_leather`, `chainmail`, `leather_cap`.

Budgets: torso ≤ 1.5 k and small pieces ≤ 600 are met by every module after the simplify step (bracers via the Blender decimate). **The pack budget is not:** the five kept modules add up to 1.5 (jerkin) + 1.2 (trousers) + 0.6 (bracers) + 0.56 (gloves) + 1.5 (padded jacket) ≈ 5.4 k per sex on top of stage 1's ≈ 5.4 k, i.e. ≈ 10.8 k against the S2-5 limit of 9 k (the render--012 ceiling is 12 k). Reduce `LeatherBoots` (≈ 2.7 k) to ≈ 1 k first, as S2-5 says, which saves ≈ 1.7 k.

## 5. What worked, what failed, and why

- **Cutting by weights, not by geometry.** The hand shell (gloves) is cut by position (`|x| >= wrist`) rather than by `hand_*` weight ≥ 0.5: the weight cut gave a ragged wrist edge (the weights blend over the forearm). The plane cut is clean.
- **Recolour instead of tint.** The Ranger atlas has no flat brown block, so the usual "search the uniform 8×8 block nearest a colour" (`find_swatch`, used for the apron and boots) fails (it returned green). The script instead reads the atlas colour at each face centroid, picks the UV of a typical brown face (`brown_uv`), and moves the UVs of the faces to be recoloured onto it (`remap_faces` for the green faces of the jerkin, `collapse_uv` for whole meshes). One material is kept; the strap and buckle faces keep their own colours.
- **Weights are free.** Every module is a copy of a source mesh (or a cut of it), so the vertex groups are inherited; no weight transfer was needed. Collapse-decimate interpolates the weights acceptably (checked in poses, no fly-away vertices). The Armature modifier must be lifted off before applying `Decimate`.
- **Inflate along averaged normals.** Pushing each exported vertex along its own normal tears the mesh at UV and hard-edge seams (cracks in the sheets). The script averages the normals of vertices that share a position first.
- **Fused cuffs.** `Female_Peasant_Arms` already has a leather cuff and a dark glove. A bracer on top still reads, but a glove module on the female Peasant is pointless.
- **Sleeveless modules.** `PaddedJacket` and `LeatherJerkin` have no sleeves, so the base sleeves show. This is right for a jerkin and passable for a gambeson.
- **Rejected:** the cap from the hood (pointed cowl, ragged edge), the pauldron on the female body, any mail/studded look (no source).

## 6. How the fit was checked

`scripts/assets/blender-equipment-modules.py` mode `all` imports `public/assets/characters/<Sex>_Peasant.glb` and the candidate `.raw.glb` with the glTF importer, re-binds the candidate to the Peasant armature, applies the recommended inflate in memory only (the exported files are not inflated, the build step applies `INFLATE`), and poses the rig with `anims.glb` clips. Each sheet [`blend-fit-<Module>-<sex>.png`](../state/frames/render--011/) has the whole body in the rest pose, Idle, Walk (side), Crouch_Idle and Sword_Attack, then two close-ups in the Idle pose (front and side) of the collar, hips, knees or forearm. The base outfits (`Ranger_Plain*`) are shown alone.

## 7. Screenshots (`docs/state/frames/render--011/`, each ≤ 200 KB)

- `blend-arms-<sex>.png`: Peasant arms, Ranger arms, bracers, Ranger arms + bracers (answer 2a).
- `blend-base-peasant-<sex>.png`: the Peasant base, front/side/back.
- `blend-<jerkin|trousers|gambeson|pauldron|hood|bracers>-<sex>.png`: the **original** Ranger/Knight part (before any recolour or inflate) over the Peasant base, front/side/back.
- `blend-fit-<Module>-<sex>.png`: the final candidates, posed (Bracers, LeatherJerkin, LeatherTrousers, PaddedJacket, LeatherPauldron, Gloves, Ranger_Plain, Ranger_Plain_Hood).
- `blend-inventory.json`, `blend-modules.json` (triangles, fit, inflate, bounds per candidate), `blend-audit.json` (Node audit).
- The cap-from-hood and glove-cut test renders are not kept (reproduce with `render_sheet` and `extract` from the script).

## 8. Blender MCP pitfalls found in this session

(also summarised in [2026-10-01--003--blender-mcp.md](2026-10-01--003--blender-mcp.md) §5)

1. `bpy.data.libraries.load` refuses the file that is open (`Cannot load from the current blend file`). Load from a copy under `_temp/work/`. Textures are stored relative to the source folder, so the copy's images resolve to the wrong place and render magenta; repoint `img.filepath` to `<pack>/Textures/...` and `reload()`.
2. Every MCP call has a fresh namespace. Only `bpy.app.driver_namespace` survives. Keep the snapshot of datablocks (for the cleanup) there, and re-`exec` the helper script at the start of each call.
3. Loaded datablocks get `.001` suffixes when the open file has the same names. Strip them for lookups, and clean up by comparing snapshots, never by name patterns or collection membership. A pattern-based cleanup here deleted original objects (the master-collection `Armature`); the fix was to reopen the source file from disk (which is also the clean state the task wants). `is_dirty` is `True` right after opening the pack, because its embedded Rigify UI scripts register classes, so it is not a sign of real edits.
4. The Workbench engine is not in the RNA enum of `scene.render.engine`; assign `'BLENDER_WORKBENCH'` inside `try/except TypeError`. "Texture" colour mode shows the **active** image node of the material: make the base-colour image node active, or the lavender ORM/normal map shows.
5. Blender 5 slotted actions: `animation_data.action = act` leaves `action_slot` empty and the pose stays in rest. Set `ad.action_slot = ad.action_suitable_slots[0]`.
6. `Image.pixels` rows start at the bottom: reverse the rows when stitching tiles. Use a background pixel from the **top** row when padding.
7. The glTF importer adds an `Icosphere` bone-shape mesh; select skinned meshes by `vertex_groups`.
8. Skinned meshes ignore their node transform in glTF. When copying with `bpy.data.meshes.new_from_object` (modifiers applied: mirror, geometry nodes), call `mesh.transform(obj.matrix_world)` and recreate the vertex groups by name.
9. Two objects can share one mesh datablock (the two belts), and the exporter then names the primitive after the mesh, not the object.
10. The exporter and importer print a lot. Wrap the call in `contextlib.redirect_stdout(io.StringIO())` or the tool result floods the context.
11. `export_def_bones=True` on the 382-bone control rig gives exactly the 65 UBC joints. The "more than 4 joint influences" warning is harmless (top 4, normalised).
12. Every GLB is exported **with the Armature** (selected with the meshes, `export_skins`, `export_def_bones`): the scene root is the armature node (named `Armature.001` because the open file already has an `Armature`; the runtime binds by joint name, so the name does not matter) with one 65-joint skin shared by all meshes of the module.
13. `pnpm check` on Windows can fail once with `EPERM ... rename ... world-*.bin` (parallel vitest workers writing the world cache); the failing file passes alone and a re-run is green.
14. Meshopt (`simplify`) keeps the borders of loose parts, so small strap islands cannot go below about 750 triangles for the bracers; use Blender's collapse decimate first.

## 9. Next steps (not done here)

1. `build-equipment-modules.mjs`: add a `raw` source per module (`assets-src/characters/eq/<Module>_<Sex>.raw.glb`), `INFLATE` from §4, `RATIO` only where the audit shows the budget is not yet met (jerkin 0.39, padded jacket 0.59, pauldron 0.43).
2. S2-4 contact sheet on WSL: look at the candidates in the game camera; Opus keeps or drops `PaddedJacket` and decides on `Ranger_Plain` for hunters.
3. render--012 keeps: cap, chainmail, studded leather. The recolour and cut methods of the script (`brown_uv`, `remap_faces`, `hand_shell`) are reusable there.

## 10. Follow-up: modest women's dress modules (Noble)

The female outfits had no skirts and showed strong bust/waist shaping. [`scripts/assets/blender-dress-modules.py`](../../scripts/assets/blender-dress-modules.py) (female only, re-uses the helpers of `blender-equipment-modules.py`) builds three candidates from `Female_Noble_Body` into `assets-src/characters/eq/`:

| Module | Content | Tris | Notes |
|---|---|---|---|
| `NobleBodice_Female` | Noble bodice (puffed shoulders, corset), short split skirt cut away | 2824 | arms stay with the base outfit |
| `LongSkirt_Female` | generated ankle-length flared skirt, gold hem band | 392 | wear with any top |
| `Dress_Female` | bodice + long skirt | 3216 | complete dress |

- **Modesty:** the bust relief is flattened (`BUST_FLATTEN` 0.65) and the corset waist loosened (`WAIST_LOOSEN` 1.10); tunable constants at the top of the script.
- **Rig:** same 65-bone UBC skeleton and vertex-group names as the other modules. Skirt weights: pelvis plus thighs (left/right split by x), calves below the knee (`THIGH_MAX` 0.9). Checked posed with `anims.glb` (rest, Idle, Walk, Crouch_Idle, Sword_Attack): [`blend-fit-Dress-female.png`](../state/frames/render--011/blend-fit-Dress-female.png). Known limitation: at the far back swing of Walk the rear foot can poke out below the hem; the skirt is one rigid tube, no cloth sim.
- **Integration:** the Noble bodice is a complete torso, so `Dress` / `NobleBodice` should **replace** the base Body (and Legs for `Dress`) instead of layering over them (the Peasant bodice pokes through by up to 7 cm otherwise). The sheet shows the base Arms and Feet kept. The Noble arms are not used (bare skin, second material).
- **Not done:** no glTF post-processing (`build-equipment-modules.mjs` `raw` source), no game wiring, no male variant, no recolour variants (the red/gold atlas swatches are fixed; a tint at runtime is the cheap option).
