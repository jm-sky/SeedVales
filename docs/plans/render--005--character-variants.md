# Render: character outfit variants from the full Modular Outfits pack

**Status:** in_progress  
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
Step 1 done (see above). Next stage: user picks which step-2 variants to wire (recommended: `Ranger_NoHood` for hunters, `Wizard` for traders, `Knight_Helm` for alarm state, colour variants), then step 4 in Blender.
