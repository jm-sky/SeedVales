# Blender plans from the unpacked packs — high ROI, performance first

**Date:** 2026-10-01  
**Type:** analysis + recommended plans (no Blender run, no asset changed)  
**Inputs:** `_temp/extracted/*` (8 pack folders), `public/assets/` + audit and budgets in [`docs/assets/README.md`](../assets/README.md), [`render--004`](../plans/render--004--asset-pipeline-and-audit.md), `src/game/render/actors.ts`, `src/game/data/professions.ts`.  
**Out of scope:** fauna (boar/bear rigging, sheep/chicken/moose) — another session owns it ([research 004](2026-10-01--004--rigging-static-animals.md)).

---

## 1. Findings that change the plan

1. **The Outfits pack contains only Peasant and Ranger** (male + female, whole outfits and modular parts: Body/Arms/Legs/Feet, Ranger also Hood, Pauldron, Bracer, Belts). There is **no Knight, Noble, Wizard or Warrior** in `_temp/extracted/Outfits` — the `docs/assets/README.md` pack table ("Knight/Noble/Peasant/Ranger/Wizard") is stale for this extract. Those variants need the full Quaternius pack (❓ user: do you have it elsewhere?); the plans below do not depend on it.
2. **Free recolours already ship in the pack, with zero Blender work:** `Textures/Peasant/` has `T_Peasant_BaseColor`, `_2_BaseColor`, `_3_BaseColor`; `Textures/Ranger/` has the same three. Today the game uses only variant 1 of each. Swapping the BaseColor texture is a Node/glTF Transform job — 3 looks per outfit for the cost of one 512 px texture each.
3. **The renderer picks a model by `charKey` only** (`Male|Female` × `Peasant|Ranger`; ranger = player/hunter/guard). All 8 professions (farmer, woodcutter, hunter, guard, herbalist, trader, blacksmith, shepherd) therefore look identical except a placeholder-only `shirt` colour used for far LOD. The visible gap is **profession readability**, not model count.
4. **Peasant is the cheap base (≈ 5.9 k tris, 1 material, 462–686 KB); Ranger is 2× heavier (≈ 13 k tris, 9 skinned meshes).** Ranger-derived variants cost more per NPC: any new variant must stay in the humanoid class (≤ 13 k body, ≤ 1 MB, ≤ 512 px, D-REN-11) and be preferred in the Peasant weight class.
5. **The head/hair is a separate rig-rebound mesh** (`Male_Head`/`Female_Head`, 2.2–2.7 k tris). The Universal Base Characters pack ships 8 hairstyle/beard pieces (`Hair_Beard`, `Hair_Buns`, `Hair_Buzzed(Female)`, `Hair_Long`, `Hair_SimpleParted`, eyebrows) in an "Origin at 0" and a "Rigged to Head Bone" variant (~2–3 KB glTF, tiny). We currently bake one head only.
6. **Animations are shared** (`anims.glb`, UAL1, 22 clips) and skeleton names are common to outfits, heads and UAL — so every variant below needs **no new rig and no new clips**, only mesh/material/accessory work. That is the main reason the character plans are cheap.
7. **Props / village packs are only partly used.** `props.glb` and `village.glb` carry a small subset of the 94 + 176 pieces. Held tools (axe, pickaxe, sword, hammer, shield, whetstone, anvil) exist as small static meshes in Fantasy Props (`Axe_Bronze`, `Pickaxe_Bronze`, `Sword_Bronze`, `Shield_Wooden`, `Whetstone`, `Bucket_*`, `Bag`, `Pouch_Large`, `Rope_*`, `Mug`, `Torch_Metal`, `WeaponStand`, `Dummy`) at 20–70 KB FBX each (≈ 0.3–1.5 k tris) but nothing is held in hand: `actors.ts` has no attach-to-bone code. "Weapon in hand" is the largest unexploited visual cue (VISION "in hand", `tools--001`).

## 2. Ranking rule

ROI = visible effect per day of work. Every plan must also pass the **performance gate**: no new draw calls per NPC beyond +1 (merged accessory) — ideally 0 (texture/vertex colour only); triangles inside the D-REN-11 class; texture ≤ 512 px and **shared** between NPCs (one material per outfit variant, instanced skeleton clones as today); `bench:render` before/after (on WSL/device, not Windows — memory *no-e2e-on-windows*) plus `tour.mjs` screenshots. Blender is used only where a Node script cannot do the job (re-weighting, boolean/merge, hand-posing attachment origins); Blender MCP stays dev-only (D-REN-8).

## 3. Recommended plans (ordered by ROI)

### P1 — Outfit recolour variants from existing textures (tier S: ~2 h, no Blender)

Use `T_Peasant_2/3_BaseColor` and `T_Ranger_2/3_BaseColor` (downsized to 512 px, same pipeline as `build-assets.mjs`) to emit `Male|Female_Peasant_{A,B,C}.glb` + `Ranger_{A,B,C}.glb` — or better, **ship the extra textures once in a shared file** and swap the material map at runtime (clone material per variant, not per NPC: 3 materials per class, shared across NPCs). Map professions to a look: farmer/shepherd = Peasant A, woodcutter/blacksmith = Peasant B (darker/brown), herbalist/trader = Peasant C; guard = Ranger B, hunter = Ranger A (green), player = Ranger C or A. Choice is data in `professions.ts` (`outfit: 'peasant_b'`), not label-dependent (D-LANG-1).  
**Cost to runtime:** 0 extra draw calls/tris; +5 textures × 512 px ≈ 0.5–1 MB on disk (check meshopt/png vs jpeg; could replace the dual-texture approach by tinting a greyscale — rejected, the pack's textures differ in pattern).  
**Why first:** biggest gap (all 8 professions look the same) fixed with the least work; unblocks quest/recognition gameplay (find the blacksmith at a glance).

### P2 — Hair/beard/age variety via a hair-and-accessory library (tier A: ~½ day, light Blender)

Take the 8 "Rigged to Head Bone" hair/beard/eyebrow meshes (each ≈ 0.5–1.5 k tris, tiny) from `Universal_Base_Characters/Hairstyles`, bake colour variants (4 hair tints via vertex colour or per-instance `instanceColor`/material clone per tint), and add them onto the already rebound head (the pipeline in `buildHuman` already re-binds head meshes to the outfit skeleton — the same code handles hair). Add procedural selection from the NPC seed (`h.id` hash): beard for older males, buns/long for females, buzzed for guards, grey tint for `age: 'elder'`.  
**Blender role:** verify hair is skinned to `head` bone and weights are clean; export hair as one merged mesh per style (named nodes in `assetNames.ts`); optional: author a "hood-down / bald elder" head by deleting hair.  
**Cost:** +1 skinned mesh per NPC within `humanModel` range (≤ +1.5 k tris, 1 shared material per tint). Gate by `QualitySettings` so low profile skips hair on far NPCs.  
**ROI:** the second most visible cue after clothing: faces/hair currently make every NPC a clone; hair gives each villager an identity at nearly zero cost.

### P3 — Profession accessories as a merged "kit" mesh attached to bones (tier A: ~1 day, Blender needed once)

Bake small **profession accessories** from Fantasy Props and attach them with a single bone-parented merged mesh per profession — *no extra skeleton, no animation*:

| Profession | Held / worn accessory (source piece) | tris est. |
|---|---|---|
| Woodcutter | `Axe_Bronze` in right hand (idle) / across back | ~400–800 |
| Blacksmith | `Whetstone` / leather apron via vertex-colour tweak, hammer in hand (`Pickaxe_Bronze` hammer-head variant or the existing `hammer` item) | ~600 |
| Guard | `Sword_Bronze` at hip + `Shield_Wooden` on back | ~1.2 k |
| Hunter | quiver (`Bag`/`Pouch_Large` reshaped) + short bow; Ranger already has `Pauldron/Bracer` | ~800 |
| Herbalist | `Pouch_Large` + `Bottle_1` belt pouch + `Bucket_Wooden_1` for the market role | ~700 |
| Shepherd | staff (a cylinder + `Rope_1` coil) | ~300 |
| Trader | `Bag` backpack + `Pouch_Large` | ~600 |

Mechanics: in Blender (MCP, dev-only) place each piece once at the hand/back/hip, record bone name + local offset in a small JSON (`public/assets/characters/attachments.json`) and export **one `props_held.glb` of named nodes** (≤ 100 KB, ≤ 1.5 k tris each, D-REN-11 "held items" class). The renderer adds `bone.add(meshClone)` once at `buildHuman` — all clones share geometry/material. Weapons visible only inside `humanModel` radius; swap with equipment state later (`h.eq`).  
**Cost:** +1 draw call per equipped NPC (merge the kit into 1 mesh/material per profession to keep it at 1); mesh ~1 k tris ≈ +15 % of Peasant.  
**ROI:** the largest "RPG feel" gain per hour — players and NPCs actually hold tools; supports combat readability (see which NPC has a spear) and the Equipment Lab (`tools--001`) and quest dialogue ("the one with the axe"). Needs a small renderer change (attach code) — a Sonnet-sized task, Blender only for authoring offsets.

### P4 — Re-tinted + re-materialled outfits for status (Noble-lite) (tier B: ~½ day, Blender light)

Without Noble/Knight in the pack, make **three status looks out of Peasant/Ranger** using recolour textures (P1) plus a cheap **vertex-colour/texture-atlas edit in Blender** of the existing body UVs: cloak (Ranger hood up + pauldron, tinted red/dark blue = "guard captain/mayor"), merchant (Peasant with darker long-sleeve + hat from Props? see P3). One extra texture variant each, no new geometry beyond the accessory kit. This supplies the mayor (see `settlement--001`) with a distinct look. If the full pack with Knight/Noble/Wizard is later available, do a proper conversion following the existing `build-assets.mjs` flow (that pack is already CC0 and the pipeline is proven) — decimate to ≤ 13 k tris, textures 512, only for named NPCs (mayor, quest givers) because Knight/Wizard outfits are the heaviest.

### P5 — Child and elder proportions (tier B: ~½ day, Blender; skip unless a problem shows)

Today children/elders only scale the whole root (0.68 / 0.96): proportions look wrong (large heads). Cheapest improvement in Blender: bake a **slightly bigger head scale on the head bone + smaller body** into a dedicated `*_Child.glb` — or do it procedurally in code via bone scaling (no Blender: `head.scale.setScalar(1.25)` on child, `spine` squash). **Recommendation: do the code route first** (bone scale on `head`, `hand`, no new asset). Blender only if a visible artefact appears.

### P6 — Prop & settlement consumption of unused kit pieces (tier A for visible clutter: ~1 day, mostly Node, minimal Blender)

`village.glb` and `props.glb` use a fraction of 94 + 176 pieces. High-value, low-cost additions as **instanced** props (no per-instance draw call growth, D-REN-2 holds):

- **Settlement clutter by function** (blacksmith: `Anvil_Log`, `Workbench_Drawers`, `WeaponStand`, `Dummy` for the guard training yard; herbalist: `Cauldron`, `Shelf_Small_Bottles`, `Potion_*`, `Bucket_Wooden_1`; market: `Stall_Cart_Empty`, `FarmCrate_Apple/Carrot`, `Barrel_Apples`, `Mug`, `Table_*`; inn interior: `Bed_Twin1/2`, `Chair_1`, `Stool`, `Candle_*`, `Bookcase_2`, `Chandelier`, `Chest_Wood` (**10 MB FBX — exclude or strip**)). Interiors only matter if interiors are rendered (check `render/structures.ts`); otherwise stick to exteriors: crates, barrels, wagon (`Prop_Wagon`), fences (`Prop_WoodenFence_*`, `Prop_MetalFence_*`), chimneys, vines (`Prop_Vine*` — climbing greenery on walls: strong visual per triangle), banners (`Banner_1/2` + cloth).
- **Nature kit extras** not in `nature.glb`: `TwistedTree_1–5` (500 KB each FBX — heavy, only 1–2 as rare variants), `RockPath_*` (cobbled paths from path network → settlement paths, cheaper than a texture splat), `Petal_*`, `Clover`, `Grass_Wispy_*`, `Mushroom_Laetiporus`, `Plant_7`, `Bush_Common_Flowers`. Best ROI: **rock-path tiles along roads inside settlements** (visual landmark of "village centre", ~50 tris each, instanced).  
**Gate:** merge/instance per material; each addition checked against `nature.glb`/`village.glb` budgets (pack ≤ 3.5 MB, tris ≤ 6 k per model); no extra textures — reuse the atlas of the existing pack where the new piece shares the material (the pack uses one atlas per kit). Where `nature.glb` has 11 separate 512×498 textures (audit candidate), fold the new pieces into the same atlas **only when** doing the atlas job anyway (render--003 trigger).

### P7 — Pack-level hygiene that Blender can do once and that helps every other plan (tier B, conditional)

- **Texture atlas for `nature.glb`** (audit: 11 separate 512×498 PNG): one atlas → fewer texture uploads/binds. Only after `render--003` measures it (triggers: startup decode or GPU memory) — keep the rule "no measured problem, no work".
- **Strip `Chest_Wood`-class oversize files** (10 MB FBX in Fantasy Props) from any future import, and prefer the glTF versions for everything else (all glTF in the pack are small — 2–8 KB descriptors + bins).
- **Trim `anims.glb`** to clips actually referenced by `actors.ts` (22 → ~16: `Idle_Loop`, `Walk_Loop`, `Sprint_Loop`, `Crouch_*`, `Swim_*`, `Death01`, `Sword_Attack`, `Spell_Simple_Shoot`, `Pistol_Aim_Neutral`, `Interact`, `Fixing_Kneeling`, `Idle_Talking_Loop`, `Idle_Torch_Loop`, `Sitting_Idle_Loop`) — save ~0.3–0.6 MB; Node only; do it only if startup shows asset decode (diag--002 step 1).

### Not recommended (low ROI or violates the budget)

- Whole new rigged humanoids (Knight/Wizard full outfits from other sources): 13–20 k tris each × crowds. Only for 1–3 named NPCs.
- Per-NPC unique meshes or textures: breaks instancing/atlas sharing; use tint + hair + accessory instead.
- Interior kits (`Medieval_Village` floors/overhangs/hole covers) — useful only with real interiors; check VISION before investing.
- AI 3D generators (D-REN-8), importing FBX through Blender when a glTF export exists (use the pack's glTF).
- Animal-pack work: already covered by the other session.

## 4. Suggested order and sizes

| # | Plan | Blender needed | Effort | Perf cost | Value |
|---|---|---|---|---|---|
| P1 | Outfit recolour variants (texture swap) | No (Node + sharp) | ~2 h | 0 draw calls / 0 tris | ★★★★★ |
| P2 | Hair/beard library on rebound head | Light (verify skin) | ~½ day | +1 skinned mesh (≤ 1.5 k tris), culled by `QualitySettings` | ★★★★ |
| P3 | Profession accessories attached to bones | Once, for offsets/merge | ~1 day | +1 draw call (merged kit), ≤ 1.5 k tris | ★★★★★ |
| P6 | Unused props / rock paths / vines instanced | Minimal | ~1 day | instanced, within pack budget | ★★★ |
| P4 | Status looks (mayor, captain) from P1+P3 | Light | ~½ day | texture only | ★★★ |
| P5 | Child/elder proportions via bone scale | No (code) → Blender only if needed | ~2 h | 0 | ★★ |
| P7 | Atlas / anims trim | Node | conditional | negative (saves) | ★ until measured |

**Recommended first slice:** P1 → P3 → P2 (in that order, each its own commit with before/after `tour.mjs` screenshots), then P6 for settlements. P1+P2+P3 reuse the existing skeleton, clips, head rebind code and asset pipeline; none requires a new rig. Add `docs/plans/render--005--character-variety.md` (Model: sonnet; Opus reviews P3 attach design) covering P1–P5, and fold P6 into `render--003` / `world--001`.

## 5. Open questions for the user

- ❓ Do you have the **full Modular Outfits pack** (Knight/Noble/Wizard)? This extract has only Peasant/Ranger.
- ❓ Is there a visual-direction preference for held items: realistic bronze props from Fantasy Props (matches the Quaternius kit), or none until combat is reworked?
- ❓ Are interiors going to be rendered (affects P6 interior pieces)?

## 6. Process notes

- Source order unchanged: existing CC0 packs in `_temp/` first, hand-modelling last; each pack here is CC0 (`License_*.txt` present in every folder except Animals pack — still 🟡, Quaternius publishes CC0).
- Every plan: stable node names added to `src/game/render/assetNames.ts` + guard test first; credits unchanged (CC0); Blender scripts leave the scene clean, shader nodes looked up by `type`.
- Performance verification per plan: `node scripts/assets/inspect-pack.mjs --audit` totals, `pnpm bench:render` before/after (WSL/Linux, not Windows), screenshots via `tour.mjs`, and the D-PERF-3 verdict. No budget changes to hide a regression.
