# Render: character outfit variants from the full Modular Outfits pack

**Status:** in_progress  (steps 1, 2, 4 built; visual/perf verification on WSL pending)  
**Model:** sonnet — Node build script + wiring; opus only for the Blender-authored variants (step 4) design review  
**Domain:** render  
**Sub domains:** assets, characters, perf  
**Roadmap:** side track of [render--004](render--004--asset-pipeline-and-audit.md) step 3 (D-REN-10/11)  
**Created:** 2026-10-01  
**Finished:** —

---

Source: user request 2026-10-01 + [research 005](../research/2026-10-01--005--blender-pack-reuse-recommendations.md) (its "only Peasant/Ranger in the pack" finding is superseded — see below).

## Inputs (verified 2026-10-01)

`_temp/extracted/Modular Character Outfits - Fantasy[Source]/` (CC0) holds **Knight, Noble, Peasant, Ranger, Wizard**, male + female, as whole outfits and modular parts (`Exports/glTF (Godot-Unreal)/{Outfits,Modular Parts}`), `All_Male.blend` / `All_Female.blend`, and three base-colour textures per outfit (`T_<Outfit>_BaseColor`, `_2_`, `_3_`).

- **One skin, 65 UBC bones, everywhere** — each part is a separate skinned mesh on the same skeleton as `Male_Head`/`Female_Head` and `anims.glb`. Dropping/recombining parts needs no re-rig; every variant plays the existing 22 clips.
- **Source triangle counts (male)**: Peasant 12.9 k, Wizard 14.4 k, Knight 25.2 k (Armet 1.7 k), Noble 24.1 k (Crown 4.0 k), Ranger 27.0 k (Hood 2.1 k, Boots 9.2 k!). The runtime recipe (base-colour only, 512 px, simplify 0.35, meshopt) cuts to roughly a third: shipped Peasant 5.7 k, Ranger 12.9 k.
- Part names (stable look-up keys): `Knight_{Acc_Pauldron_Round|Acc_Pauldron_Spike|Acc_Scarf|Arms|Body_Armor|Body_Cloth|Feet_Armor|Head_Armet|Head_Horns|Legs_Armor}`, `Noble_{Acc_Gorget|Acc_Pauldron|Acc_Pauldron_Lion|Arms|Arms_Guards|Body|Body_Belt|Feet|Head_Crown|Legs}`, `Wizard_{Arms|Body|Body_Belt|Body_BeltOrnament|Feet|Legs}` (+ `Knight_Cloth` = ready-made outfit without plate body), `Ranger_{…Head_Hood, Feet_Boots, Arms_Bracer, Body_Belt_1/2, Acc_Pauldron}`.
- The legacy `_temp/extracted/Outfits/` folder (Peasant/Ranger only) is the older partial extract; `scripts/assets/build-assets.mjs` still points at it and is **not runnable as committed** (`unifySkins`/`flatten`/`join` are used but not defined/imported) — new work goes through `scripts/assets/build-characters.mjs`.

## Performance gate (every step)

Humanoid class (D-REN-11): ≤ 13 k body tris, ≤ 1 MB, ≤ 512 px, 1–2 materials, shared per outfit across NPCs (SkeletonUtils clones share geometry/material). New variants are loaded once at startup (`Actors.load`) — each costs ~0.5–0.9 MB of download/decode, so only variants a profession actually uses are wired; lazy-load rare variants (mayor, quest givers) via `loadGltf` on demand when they appear. Before/after `bench:render` on WSL/Linux (not Windows) + `tour.mjs` screenshots.

## Steps

### 1. Guard = Knight without helmet — **done 2026-10-01**
`build-characters.mjs` (Node, glTF Transform) → `Male_Knight.glb` (10.9 k tris, 786 KB), `Female_Knight.glb` (8.5 k, 774 KB), no Armet/Horns; `actors.ts` `charKey`: guard → Knight, hunter/player stay Ranger, rest Peasant; guard test lists both files. Not yet checked visually (no e2e on the Windows machine).

### 2. Simple variants (one `VARIANTS` line each, Node only, ~1 h total)
| Variant | How | Tris (male, est.) | Use |
|---|---|---:|---|
| `Knight_Helm` | keep `Head_Armet` | ~12 k | guard on night duty / alarm / captain; swap when `ai` is in combat state |
| `Ranger_NoHood` | drop `Head_Hood` | ~11 k | hunter (hood stays for the player); head from `*_Head.glb` |
| `Wizard` | whole outfit | ~5–6 k | trader (robe reads as "merchant"); Wizard has **no boots** (bare feet mesh) — fine for traders only if shoes aren't expected, otherwise step 4 |
| `Knight_Cloth` | source `Male_Knight_Cloth` | ~7 k | militia/guard recruit — cloth body, lighter than plate |
| Colour variants | pack ships `T_<Outfit>_2/3_BaseColor` → share one geometry, swap the map per variant (material clone per variant, not per NPC) | 0 extra | farmer/shepherd vs woodcutter/blacksmith looks, guard faction colours |

Decide per variant after seeing it in `tour.mjs`; data lives in `professions.ts` (`outfit` field), never keyed on label text.

### 3. Hair/beard library and held items
Unchanged from research 005 (P2 hair from Universal Base Characters, P3 bone-attached kit from Fantasy Props). Depends on nothing here; Knight_Helm makes hair visibility a quality-profile concern.

### 4. Blender variants from `All_Male.blend` / `All_Female.blend` (modular parts are separate objects with shared weights)
Highest-ROI combinations, all reuse existing weights so no rigging:
- **Peasant + Wizard feet/boots** → Peasant with shoes (`Peasant_Boots`): swap legs/feet mesh; the Peasant Feet mesh is 2.6 k tris — a cheaper boot mesh would also cut tris.
- **Peasant + dark apron** → Blacksmith: vertex-colour/UV edit of `Peasant_Body` (apron region mapped to a dark swatch of the shared atlas) — 0 extra tris; or add a small apron mesh (≤ 400 tris) to the rest.
- **Peasant + hood** (Ranger hood re-tinted) → herbalist/shepherd cloak.
- **Noble** only for mayor/quest givers (24 k source → ~8 k shipped, Crown separate): lazy-loaded.
- Export through the same Node recipe (strip → 512 px → meshopt); Blender is dev-only, scripts leave the scene clean.
Exit: each Blender variant ≤ the class budget, node names registered in `assetNames.ts`, guard test green, screenshots.

## Exit
Step 1 delivered; steps 2–4 each closed as done / not needed after the visual review; costs recorded in `docs/assets/README.md` audit table.

## Wynik
**Step 1** done (guard = Knight, no helmet). **Step 2** done 2026-10-01 (Windows, Node only): `Knight_Helm`, `Knight_Cloth`, `Ranger_NoHood`, `Wizard` for both sexes built via `VARIANTS` in `build-characters.mjs`. **Step 4** built 2026-10-01 (Windows, Blender MCP): `Peasant_Boots`, `Blacksmith`, `Herbalist` for both sexes — authored by `scripts/assets/blender-character-variants.py` into `assets-src/characters/*.raw.glb` (committed, ~1 MB each, 512 px base colour only), post-processed with `node scripts/assets/build-characters.mjs --raw`. Seen in the game on WSL 2026-10-01 (see "WSL verification").

| file (male / female) | tris | KB | note |
|---|---:|---:|---|
| Knight_Helm | 11.9 k / 9.5 k | 807 / 796 | Knight + Armet |
| Knight_Cloth | 8.4 k / 7.0 k | 734 / 732 | cloth body, no plate |
| Ranger_NoHood | 11.6 k / 11.8 k | 930 / 928 | hunter |
| Wizard | 7.6 k / 7.5 k | 821 / 846 | trader; no boots (bare feet mesh) |
| Peasant_Boots | 6.0 k / 7.7 k | 627 / 444 | Ranger boots decimated to 1.8 k, UV on a leather swatch of the Peasant atlas (1 atlas) |
| Blacksmith | 5.9 k / 6.1 k | 635 / 434 | Peasant + 224-tri apron (shrinkwrapped to Body+Legs, weights transferred), flat charcoal material |
| Herbalist | 7.0 k / 7.1 k | 646 / 445 | Peasant + Ranger hood, flat muted-olive material |

All inside the humanoid class (≤ 13 k tris, ≤ 1 MB, 512 px); the audit table in `docs/assets/README.md` is refreshed. Blacksmith/Herbalist (male) use 3 materials (atlas, skin, flat colour) — the Peasant atlas has no black/green swatch; if draw calls matter, switch to a swatch (script has `find_swatch`). Each variant has one skin per part with the same 65 joint names as `Male_Peasant.glb` (checked in Node).

**Wired** (data in `ProfessionDef.outfit`, logic by id): guard → Knight, hunter → Ranger_NoHood, trader → Wizard, player → Ranger (hood stays), rest Peasant. Wired after WSL verification (2026-10-01): blacksmith → Blacksmith, herbalist → Herbalist, farmer → Peasant_Boots. Not wired (files ready, kept): `Knight_Helm`, `Knight_Cloth`. `Actors.load` loads Peasant/Ranger/Ranger_NoHood/Knight/Wizard/Peasant_Boots/Blacksmith/Herbalist × 2 sexes at startup (~3.5 MB more than before: NoHood + Wizard, 2 sexes × ~0.9 MB) — lazy-load via `loadGltf` if startup cost shows up in `bench:startup`.

### Colour variants (maps ready, not wired)
`node scripts/assets/build-characters.mjs --tex` writes `public/assets/characters/tex/<Outfit>_2.png|_3.png` (Knight, Noble, Peasant, Ranger, Wizard; 512 px, 0.28–0.52 MB each, same UV layout as `<Outfit>_BaseColor`). To use one in code: clone the outfit material once per colour (cache by `outfit+n`, not per NPC), load the PNG with `THREE.TextureLoader`, set `tex.flipY = false` and `tex.colorSpace = THREE.SRGBColorSpace` (glTF convention), assign to `material.map`, and use the clone for the NPC's skinned meshes after `SkeletonUtils.clone`. Geometry is shared, so no extra tris.

### WSL verification (2026-10-01, d8d7d12 → HEAD with all outfits wired)
- **bench:render medium** (same machine, baseline taken in a worktree at `d8d7d12`): `render.prep` p95 ok/noise on all settlement scenes (small-settlement +0 %, crowded +10 % inconclusive, night-campfires +4 %); draw calls +4 at most (small 375 → 379, crowded 491 → 495, programs unchanged). The only flag (`landmark-estate` +31 %, 0.61 → 0.8 ms) has no actors in view → noise. Full table: `docs/state/PERF.md`.
- **bench:startup medium** (3 runs each): HUD 5220 ms → 5249 ms median (within noise), asset files 17 → 21, 16.7 → 20.2 MB (+3.5 MB as predicted), asset time ÷ HUD 0.03 → 0.07. No lazy-load needed.
- **Screenshots** (`node scripts/e2e/tour-outfits.mjs`, NPC moved to open ground, walking pose): Knight (guard) fine; Ranger_NoHood fine, no head/hair clipping; Wizard — navy/gold robe reads well, boots visible, no bare-feet problem; Blacksmith — flat charcoal apron sits on the torso, no clipping seen while walking; Herbalist — olive hood + light tunic reads well; Peasant_Boots — fine. Crouch pose was not checked.
- **Decision:** wire Blacksmith, Herbalist, Peasant_Boots (farmer only, woodcutter stays Peasant for variety); no variant cut or dropped; `Knight_Helm`/`Knight_Cloth` remain unwired (candidates for guard rank/night watch variety later).

### To verify on WSL (done, see above)
1. `pnpm bench:render` (medium) in a settlement scene before/after this commit (extra outfits loaded at startup, hunter/trader models) and `pnpm bench:startup` (asset decode +~3.5 MB).
2. `node scripts/e2e/tour.mjs` screenshots: guard (Knight), hunter (Ranger_NoHood, head/hair not clipping), trader (Wizard robe, bare feet acceptable?), plus temporary wiring of Blacksmith/Herbalist/Peasant_Boots to look at the apron fit (it is a flat-ish sheet; check it does not clip while walking/crouching), boots (flat leather colour), hood (flat olive).
3. Decide per variant: wire (`outfit` in `professions.ts` — blacksmith → `Blacksmith`, herbalist → `Herbalist`, optionally farmer/woodcutter → `Peasant_Boots`), cut (ratio in `VARIANTS`/`RAW_RATIO`) or drop. Wiring needs `CharOutfit` + `CHAR_OUTFITS` in `actors.ts` extended and the file listed in `assetNames.test.ts`.
4. If the apron/hood look too flat or the 3rd material costs draw calls: regenerate with the Blender script (constants at the top) and rerun `--raw`.
