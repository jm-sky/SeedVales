# Assety

Źródło: lokalny magazyn `_temp/` (ignorowany w git, 12 paczek Quaternius, ~1.35 GB). Gra i build **nie** zależą od `_temp/` — używają tylko `public/assets/`.

Odtworzenie: rozpakuj potrzebne paczki do `_temp/extracted/` (patrz niżej), potem:

```bash
node scripts/assets/build-assets.mjs          # konwersje → public/assets
node scripts/assets/inspect-pack.mjs public/assets/village.glb   # wymiary i trójkąty modeli w paczce
```

Konwersje: glTF → GLB, `resample` animacji, EXT_meshopt_compression (dekodowane w przeglądarce przez `MeshoptDecoder`), tekstury zmniejszone do 256–512 px (sharp), usunięte mapy normal/ORM (styl low-poly, Lambert), uproszczenie siatek (meshoptimizer) dla drzew i strojów, wycięcie głowy z pełnej postaci bazowej (trójkąty powyżej y=1.50/1.44 m).

## Paczki (inwentaryzacja)

| Paczka | Zawartość | Licencja | Użycie |
|---|---|---|---|
| Stylized Nature MegaKit [Standard] | 68 modeli glTF/FBX/OBJ, tekstury 2048 | CC0 (License_Standard.txt) | drzewa, krzewy, skały, zioła, trzciny |
| Medieval Village MegaKit [Standard] | 176 modułów (ściany 2×3.12 m, dachy, drzwi, rekwizyty) | CC0 | domy, magazyn, gospoda, szopa, płoty |
| Fantasy Props MegaKit [Standard] | 94 rekwizyty | CC0 | tylko neutralne: kowadło, beczki, stragan, warsztat |
| Ultimate Animated Animal Pack | 12 zwierząt glTF z animacjami (Idle/Walk/Gallop/Attack/Death/Eating) | brak pliku licencji w ZIP — Quaternius publikuje jako CC0 (🟡 do potwierdzenia) | sarna, jeleń, wilk, lis, krowa, koń, osioł, pies (Husky) |
| Universal Base Characters [Standard] | Superhero Male/Female FullBody + fryzury | CC0 | tylko głowa+włosy+oczy (wycięte) |
| Modular Character Outfits – Fantasy [Source] | stroje (Knight/Noble/Peasant/Ranger/Wizard), tekstury 4096 | CC0 (License_Source.txt) | Peasant (mieszkańcy), Ranger (gracz, myśliwi, strażnicy) |
| Universal Animation Library [Standard] | UAL1 (43 animacje), szkielet zgodny z UBC (65 kości, te same nazwy) | CC0 | 22 animacje (chód, bieg, walka, interakcje, pływanie…) |
| Universal Animation Library 2 [Source] | UAL2 + Blend | CC0 | nieużyte (v1) |
| Furniture Pack, Ultimate Food Pack, Ultimate RPG Items, Textured Stylized Trees | FBX/OBJ/Blend (bez glTF) | CC0 | nieużyte (brak konwertera FBX w środowisku); kandydaci na ikony przedmiotów/wnętrza |

## Wybrane pliki (`public/assets/`)

| Plik | Źródło | Przeznaczenie | Uwagi |
|---|---|---|---|
| `nature.glb` | Nature: CommonTree_1/3, Pine_1/3, DeadTree_1, Bush_Common(_Flowers), Rock_Medium_1/2, Pebble_Round_1, Mushroom_Common, Flower_3_Group, Plant_1, Grass_Common_Tall, Fern_1 | roślinność w pobliżu gracza | drzewa ~3.3–5.8k tris; dalej proceduralne impostory |
| `village.glb` | Village: ściany Plaster/UnevenBrick, narożniki, dachy 4x4/6x6/6x8/8x8/8x10, komin, skrzynie, płot, wóz, drzwi, okna | domy składane w runtime (`render/structures.ts`) | 2458 KB, tekstury 512 |
| `props.glb` | Props: Anvil(_Log), Barrel, Bench, Stall(_Cart)_Empty, Workbench, Chest, Bucket, Torch, Cauldron, FarmCrate_Carrot, Crate, Lantern | kowal, targ, magazyn | tekstury 256 |
| `animals/*.glb` | Animal Pack | 8 gatunków ze szkieletem | skalowane do wysokości z `data/species.ts` |
| `animals/{Rat,Hare,Boar,Bear,Moose,Sheep,Chicken}.glb` | `_temp/extracted/Extra_Animals/` (Poly Pizza, Sketchfab), sources in `_temp/fauna/` (id → credit in `CREDITS-CC-BY.txt`) | fauna class (D-REN-10/11). Rat, hare: source clips (hare: Gallop = walk at 2x, Death = whole-body topple, no Attack). Boar, bear, moose, sheep, chicken: rigged by us, clips Idle/Walk/Gallop/Attack/Eating/Death | built by `node scripts/assets/build-extra-animals.mjs` from `*_rigged.glb` (made in Blender MCP by `normalize-fauna.py` then `rig-fauna.py`); texture 2048 → 256 for bear/moose; the species `model` in `data/species.ts` is the file name |
| `characters/{Male,Female}_{Peasant,Ranger}.glb` | Outfits | ciało postaci | uproszczone ~35–50% |
| `characters/{Male,Female}_Head.glb` | Base Characters | głowa (re-bind do szkieletu stroju) | |
| `characters/anims.glb` | UAL1 Standard | 22 klipy, bez siatek | 2.5 MB |
| `landmarks.glb` | poly.pizza downloads in `_temp/` (Quaternius Modular Ruins Pack, Rocks, Sail Boat; Kenney Ship Wreck — all CC0) | WORLD-11 landmark pieces: `Ruin_*`, `Stone_1..5`, `Wreck_Ship`, `Wreck_Boat` (names in `render/assetNames.ts`) | built by `node scripts/assets/build-landmarks.mjs` (scale baked into vertices, origin at XZ centre / base, textures 512, meshopt; identity wrapper node above each mesh node because quantisation puts a scale on the mesh node and `mergeTemplate` drops the looked-up node's transform) |
| `stockpiles.glb` | own models (Blender MCP, `scripts/assets/blender-stockpiles.py`) | render--009 tiered piles `pile_<kind>_<tier>` (firewood, stone, grain, food), vertex colours, no textures; contract `docs/design/render-stockpile-assets-contract.md` | exported from Blender, then `node scripts/assets/build-stockpiles.mjs` (weld, meshopt, identity wrapper nodes) |
| `public/assets/parked/{graveyard,signs,food}.glb` (**parked**: in the build output, not requested by any code) | Halloween Bits (Kay Lousberg), Signs pack (iPoly3D), Ultimate Food Pack (Quaternius) — all CC0 via Poly Pizza, `_temp/extracted/` | kept pieces of research 006 (churchyard/graveyard kit, 13 wooden signs, 14 medieval-plausible food/cookware pieces), scaled to 1 unit = 1 m | built by `node scripts/assets/build-pack-pieces.mjs`; 1–2 materials per file, textures ≤ 512 px, stable node names. **No consumer plan yet** (no `assetNames.ts` entry, nothing loads them): to use one, move it up to `public/assets/`, add the requested node names to `assetNames.ts` and the file to `packNodeNames()`, then wire it in the consuming plan. Keep/drop list: [research 006](../research/2026-10-01--006--halloween-signs-food-pack-index.md) |
| `public/assets/parked/props_held.glb` + `attachments.json` (**parked**, render--006) | Fantasy Props MegaKit [Standard] by Quaternius (CC0): `Axe_Bronze`, `Sword_Bronze`, `Shield_Wooden`, `Pouch_Large`, `Bottle_1`, `Bag`; hammer, staff, quiver + arrows, bow hand-modelled in the build script | profession held items (research 005 P3): 7 kits `Kit_{Woodcutter,Blacksmith,Shepherd,Guard,Hunter,Herbalist,Trader}`, 1 mesh/primitive per kit, 1 vertex-colour material, no texture; `attachments.json` = bone + local position/quaternion/scale per profession id (valid for both Male_/Female_ rigs) | built by `node scripts/assets/build-held-items.mjs` from `scripts/assets/held-items-layout.json` (Blender-MCP placement result). 113 KB, 4.0 k tris total (kits 68–1244 tris, 4–73 KB each). **No consumer yet**: attach code is [render--006](../plans/render--006--held-items.md) |
| `trees.glb` + `trees-impostors.png/json` + `trees-impostors-normal.png` (+ `trees-build.json`) | Quaternius Stylized Nature MegaKit (CC0): CommonTree_1/3/4/5, Pine_1/4, DeadTree_2 | render--007 step 3: 7 variants (`Broadleaf_A-C`, `Apple_A`, `Pine_A/B`, `Dead_A`), each root node with `LOD0` (about 3 k tris) / `LOD1` (round 2: tight-cut leaf cards, <= 1000 broadleaf/apple, ~450 pines), 2 materials, bark 512 + leaf atlas 1024, 8-view impostor atlas | built by `node scripts/assets/build-trees.mjs` (Node only, ~16 min; `--lod1=merged` = session-12 LOD1), checked by `validate-trees.mjs`; round-2 before/after numbers in the render--007 plan, session 14; details and contract notes in the render--007 plan, session 12. No consumer yet (game loader pending) |
| `LICENSE-Quaternius-CC0.txt` | | licencja | |
| `CREDITS-CC-BY.txt` | | CC BY attributions (hare, boar, bear, moose, chicken) — required by the license | |

## Do wymiany / braki (placeholdery)

- Fauna: no placeholders left in the class. Procedural placeholders in `render/actors.ts` remain only as the far-distance LOD and the load-failure fallback.
- Fauna we rigged ourselves (boar, bear, moose, sheep, chicken; `rig-fauna.py`): 2-bone legs, spine/neck/head, geometric skin weights (bone heat fails on these unwelded meshes), procedural gait/attack/eat/death clips; the chicken is a biped (`CHICKEN` bones, `weigh_chicken`). Rebuild: `normalize-fauna.py` (sources → `Extra_Animals/<Name>.glb`), `rig-fauna.py` (→ `<Name>_rigged.glb`), `build-extra-animals.mjs`. The black bear (666 tris) replaced the 9 k-tri sculpt; the moose is the Poly Pizza "Elk" model (elk-style antlers, not palmate). The old sculpt bear and its rig are kept in `_temp/extracted/Extra_Animals/Bear_sculpt*.glb`.
- Landmarks (WORLD-11): stone circle, ruins, wrecks come from `landmarks.glb`; if it fails to load, `render/landmarks.ts` falls back to boxes/cylinders with the same footprint.
- Studnia, ognisko, tablica, pochodnie, koryto, suszarnia, palisada, most, uprawy — proceduralne low-poly.
- Broń/narzędzia w dłoni — brak (FBX-only w RPG Items).
- Food item meshes, signs and graveyard/churchyard pieces: ready in `public/assets/parked/` (see the table above), waiting for a consuming plan.

## Audit (2026-10-01, render--004 step 1; refreshed after the step-3 fauna class and the render--005 outfit variants, 2026-10-01)

Measurement only — no asset file changed by the audit. Reproduce: `node scripts/assets/inspect-pack.mjs --audit --md [dir|files…]` (Node + glTF Transform, no Blender; default `public/assets`). "tris (unique)" counts every mesh once, "tris (scene)" what one scene instance draws; packs hold many models, so their totals are not per-model.

| file | KB | tris (unique) | tris (scene) | nodes | meshes/prims | mats | textures | anims | skin |
|---|---|---|---|---|---|---|---|---|---|
| animals/Bear.glb | 100 | 666 | 666 | 16 | 1/1 | 1 | 256x256 jpeg | 6: Idle,Walk,Gallop,Attack,Eating,Death | yes (1) |
| animals/Boar.glb | 132 | 2308 | 2308 | 18 | 1/5 | 5 | — | 6: Idle,Walk,Gallop,Attack,Eating,Death | yes (1) |
| animals/Chicken.glb | 61 | 462 | 462 | 11 | 1/7 | 7 | — | 6: Idle,Walk,Gallop,Attack,Eating,Death | yes (1) |
| animals/Cow.glb | 538 | 2450 | 2450 | 44 | 1/7 | 7 | — | 13: Attack_Headbutt,Attack_Kick,Death,Eating,Gallop,Gallop_Jump,… | yes (1) |
| animals/Deer.glb | 524 | 2098 | 2098 | 48 | 1/7 | 7 | — | 13: Attack_Headbutt,Attack_Kick,Death,Eating,Gallop,Gallop_Jump,… | yes (1) |
| animals/Donkey.glb | 602 | 2000 | 2000 | 52 | 1/8 | 7 | — | 13: Attack_Headbutt,Attack_Kick,Death,Eating,Gallop,Gallop_Jump,… | yes (1) |
| animals/Fox.glb | 540 | 1848 | 1848 | 53 | 1/5 | 4 | — | 12: Attack,Death,Eating,Gallop,Gallop_Jump,Idle,… | yes (1) |
| animals/Hare.glb | 88 | 1560 | 1560 | 48 | 1/3 | 3 | — | 4: Idle,Walk,Gallop,Death | yes (1) |
| animals/Horse.glb | 609 | 2182 | 2182 | 52 | 1/8 | 8 | — | 13: Attack_Headbutt,Attack_Kick,Death,Eating,Gallop,Gallop_Jump,… | yes (1) |
| animals/Husky.glb | 511 | 1920 | 1920 | 51 | 1/5 | 5 | — | 12: Attack,Death,Eating,Gallop,Gallop_Jump,Idle,… | yes (1) |
| animals/Moose.glb | 130 | 1644 | 1644 | 18 | 1/1 | 1 | 256x256 jpeg | 6: Idle,Walk,Gallop,Attack,Eating,Death | yes (1) |
| animals/Rat.glb | 189 | 4004 | 4004 | 34 | 1/2 | 2 | — | 5: Attack,Death,Idle,Gallop,Walk | yes (1) |
| animals/Sheep.glb | 83 | 610 | 610 | 16 | 1/2 | 2 | — | 6: Idle,Walk,Gallop,Attack,Eating,Death | yes (1) |
| animals/Stag.glb | 481 | 3670 | 3670 | 41 | 2/6 | 5 | — | 13: Attack_Headbutt,Attack_Kick,Death,Eating,Gallop,Gallop_Jump,… | yes (1) |
| animals/Wolf.glb | 541 | 1962 | 1962 | 53 | 1/4 | 4 | — | 12: Attack,Death,Eating,Gallop,Gallop_Jump,Idle,… | yes (1) |
| characters/Female_Blacksmith.glb | 434 | 6091 | 6091 | 70 | 5/5 | 2 | 512x512 png | — | yes (5) |
| characters/Female_Head.glb | 697 | 2703 | 2703 | 69 | 3/3 | 3 | 512x512 png; 256x256 png (×3) | — | yes (3) |
| characters/Female_Herbalist.glb | 445 | 7147 | 7147 | 70 | 5/5 | 2 | 512x512 png | — | yes (5) |
| characters/Female_Knight.glb | 774 | 8484 | 8484 | 71 | 6/6 | 1 | 512x512 png | — | yes (6) |
| characters/Female_Knight_Cloth.glb | 732 | 6967 | 6967 | 70 | 5/5 | 1 | 512x512 png | — | yes (5) |
| characters/Female_Knight_Helm.glb | 796 | 9472 | 9472 | 72 | 7/7 | 1 | 512x512 png | — | yes (7) |
| characters/Female_Peasant.glb | 462 | 5915 | 5915 | 70 | 4/4 | 1 | 512x512 png | — | yes (4) |
| characters/Female_Peasant_Boots.glb | 444 | 7674 | 7674 | 69 | 4/4 | 1 | 512x512 png | — | yes (4) |
| characters/Female_Ranger.glb | 949 | 13035 | 13035 | 75 | 9/10 | 2 | 512x512 png (×2) | — | yes (9) |
| characters/Female_Ranger_NoHood.glb | 928 | 11787 | 11787 | 73 | 8/9 | 2 | 512x512 png (×2) | — | yes (8) |
| characters/Female_Wizard.glb | 846 | 7463 | 7463 | 71 | 6/7 | 2 | 512x512 png (×2) | — | yes (6) |
| characters/Male_Blacksmith.glb | 635 | 5876 | 5876 | 70 | 5/6 | 3 | 512x512 png (×2) | — | yes (5) |
| characters/Male_Head.glb | 661 | 2213 | 2213 | 69 | 3/3 | 3 | 512x512 png; 256x256 png (×3) | — | yes (3) |
| characters/Male_Herbalist.glb | 646 | 7007 | 7007 | 70 | 5/6 | 3 | 512x512 png (×2) | — | yes (5) |
| characters/Male_Knight.glb | 786 | 10906 | 10906 | 71 | 6/6 | 1 | 512x512 png | — | yes (6) |
| characters/Male_Knight_Cloth.glb | 734 | 8430 | 8430 | 70 | 5/5 | 1 | 512x512 png | — | yes (5) |
| characters/Male_Knight_Helm.glb | 807 | 11912 | 11912 | 72 | 7/7 | 1 | 512x512 png | — | yes (7) |
| characters/Male_Peasant.glb | 686 | 5747 | 5747 | 70 | 4/5 | 2 | 512x512 png (×2) | — | yes (4) |
| characters/Male_Peasant_Boots.glb | 627 | 5987 | 5987 | 69 | 4/5 | 2 | 512x512 png (×2) | — | yes (4) |
| characters/Male_Ranger.glb | 951 | 12912 | 12912 | 75 | 9/10 | 2 | 512x512 png (×2) | — | yes (9) |
| characters/Male_Ranger_NoHood.glb | 930 | 11626 | 11626 | 73 | 8/9 | 2 | 512x512 png (×2) | — | yes (8) |
| characters/Male_Wizard.glb | 821 | 7589 | 7589 | 71 | 6/7 | 2 | 512x512 png (×2) | — | yes (6) |
| characters/anims.glb | 2496 | 0 | 0 | 67 | 0/0 | 0 | — | 22: Crouch_Fwd_Loop,Crouch_Idle_Loop,Death01,Fixing_Kneeling,Hit_Chest,Idle_Loop,… | yes (1) |
| landmarks.glb | 419 | 15357 | 15357 | 34 | 17/34 | 14 | 512x512 png; 512x512 jpeg (×2) | — | no |
| nature.glb | 3325 | 27127 | 27127 | 30 | 15/21 | 11 | 512x512 png; 512x498 png (×11) | — | no |
| props.glb | 851 | 28758 | 28758 | 33 | 15/31 | 4 | 256x256 png (×4) | 4: Chest_Close,Chest_Closed,Chest_Open,Chest_Opened | yes (2) |
| village.glb | 2458 | 25221 | 25221 | 46 | 23/45 | 7 | 512x512 png (×6) | — | no |

**Total:** 42 files, 29.75 MB, 302790 unique tris (the largest single files: `nature.glb` 3.3 MB, `anims.glb` 2.5 MB, `village.glb` 2.4 MB).

Parked, **not loaded by the game** (`public/assets/parked/`, 2026-10-01, render--004 step 3 verification; see research 006): same script, same columns.

| file | KB | tris (unique) | tris (scene) | nodes | meshes/prims | mats | textures | anims | skin |
|---|---|---|---|---|---|---|---|---|---|
| public/assets/parked/food.glb | 133 | 6426 | 6426 | 28 | 14/14 | 2 | 64x4 png | — | no |
| public/assets/parked/graveyard.glb | 282 | 9976 | 9976 | 62 | 31/31 | 1 | 512x512 png | — | no |
| public/assets/parked/props_held.glb | 113 | 3969 | 3969 | 14 | 7/7 | 1 | — (vertex colours) | — | no |
| public/assets/parked/signs.glb | 128 | 6968 | 6968 | 26 | 13/13 | 1 | 16x4 png | — | no |

Against D-REN-11: every piece ≤ 1.1 k tris (largest: the widest signs ≈ 1.05 k, `Crypt` 952) — inside the props/landmark class; the packs are 0.13–0.28 MB (pack ≤ 0.5 MB landmark / ≤ 3.5 MB props class); 1 shared material per file (food: 2 identical-look palette materials), textures ≤ 512 px. Not counted in the totals above (`inspect-pack.mjs --audit` without arguments does include `parked/`).

### Budgets per model class (D-REN-10, D-REN-11)

Derived from the table; a new or replacement model stays inside its class or goes behind a quality profile / is rejected (the `bench:render` before/after + `tour.mjs` screenshots still decide).

| Class | Triangles | File (meshopt) | Textures | Animation | Notes |
|---|---:|---:|---|---|---|
| Fauna, small/medium (rat, hare, fox, wolf, deer…) | ≤ 4 k | ≤ 600 KB | none or ≤ 512 px | Idle + Walk (+ Gallop/Attack for hostile/prey) | 0.5–4 k, all inside the class (fauna class refreshed 2026-10-01) |
| Fauna, large (bear, horse, cow, moose) | ≤ 6 k | ≤ 700 KB | ≤ 512 px | as above (+ Death) | bear 0.7 k / 100 KB, moose 1.6 k / 130 KB |
| Humanoids (body outfits, heads) | ≤ 13 k body, ≤ 3 k head | ≤ 1 MB | ≤ 512 px, 1–2 maps | shared `anims.glb` (22 clips) | rangers 13 k, peasants 6 k; render--005 variants 5.9–13.0 k (Blacksmith/Herbalist use 3 materials: atlas, skin, flat colour) |
| Vegetation / props / village modules | ≤ 6 k per model | pack ≤ 3.5 MB | 256–512 px, atlas shared | — | trees 3.3–5.8 k; instanced (D-REN-2) |
| Landmark pieces (`landmarks.glb`) | ≤ 3.2 k per piece; ≤ 30 k per placed landmark (merged) | ≤ 500 KB for the pack | ≤ 512 px | — | built only within 420 m; ≈ 2–5 draw calls per landmark (one per material) |
| Held items / small props | ≤ 1.5 k | ≤ 100 KB | ≤ 256 px | — | `props_held.glb` (parked): 7 kits of 68–1244 tris, 4–73 KB each (whole file 113 KB), no texture, 1 draw call per kit |

### Candidates *if a problem is measured* (render--003 triggers, nothing done now)

- `village.glb` roofs and wall modules (25 k tris, 7 materials): decimate/atlas only if `render.prep` in settlement scenes exceeds its budget.
- `anims.glb` (2.5 MB, 22 clips, no meshes): strip unused clips only if startup is dominated by asset decode (`diag--002` step 1).
- `props.glb` (29 k tris over 15 models, 4 chest clips): check which are actually used before touching.
- `nature.glb` 3.3 MB: 11 separate 512×498 textures — one atlas would reduce decode/upload work.

## Workflow and rules (render--004 step 2)

- **Where things live:** third-party sources in `_temp/` (not committed); committed output only in `public/assets/`. Build scripts: `scripts/assets/build-assets.mjs` (packs, characters), `build-extra-animals.mjs` (rat/hare/boar/bear/moose/sheep/chicken), `build-pack-pieces.mjs` (graveyard/signs/food → `public/assets/parked/`, Node only: scale/pivot baking, palette merge, 512 px), `normalize-fauna.py` + `rig-fauna.py` (Blender MCP normalising and rigging). Source and licence per asset: `LICENSE-Quaternius-CC0.txt`, `CREDITS-CC-BY.txt` (CC-BY credit is mandatory).
- **Held items (render--006):** `build-held-items.mjs` (Node/glTF Transform: samples the pack's trim-sheet textures per triangle into vertex colours, simplifies, merges one mesh per profession kit, writes `props_held.glb` + `attachments.json`, self-check of rest-pose bounds) reading `held-items-layout.json`, which a Blender-MCP session produces (import `--pieces` library + a character rig + `anims.glb`, place pieces at bones in the Idle pose, check with Workbench contact sheets over Idle/Walk/Sword_Attack/Interact, dump rest-pose world matrices; scene purged afterwards, no .blend committed). Bone-local transform = `inverse(boneRestWorld) · kitFrame`; the layout is in glTF Y-up, bone rest matrices come from `Male_Peasant.glb` (verified against Blender: bone heads match to 1 mm).
- **Character outfit variants (render--005):** `build-characters.mjs` (Node: `VARIANTS` lines from the pack glTFs, `--raw` for Blender-authored `assets-src/characters/*.raw.glb`, `--tex` for the colour-variant maps in `public/assets/characters/tex/`); `blender-character-variants.py` (Blender MCP, dev-only: Peasant_Boots, Blacksmith, Herbalist; scene restored afterwards, no .blend committed). Wired by `ProfessionDef.outfit` in `data/professions.ts`.
- **Trees (render--007 step 3):** `scripts/assets/build-trees.mjs` + `scripts/assets/trees/*` (simplify, leaf-card culling/merging, atlas, software-rasterised impostor bake, no Blender), `validate-trees.mjs`; `blender-tree-sheet.py` renders LOD0/LOD1/impostor verification sheets (dev only). Contract: `docs/design/render-tree-assets-contract.md`.
- **Stable node names:** render code looks parts up by name. All requested names live in `src/game/render/assetNames.ts`; `assetNames.test.ts` (part of `pnpm check`) fails with the file and name if a re-export drops one, and checks that every species/character GLB exists and parses. Adding a looked-up node = add it to `assetNames.ts` first.
- **Model direction (D-REN-10):** realistic where the CPU/GPU cost is small; replace a whole class together; budget = triangle/texture class of comparable assets (audit table), before/after `bench:render` + `tour.mjs` screenshots per model.
- **Post-processing:** prune/dedupe/meshopt via glTF Transform (Node, reproducible in any session); texture size per class; no optimisation without a measured trigger (`render--003`).
- **Blender is dev-only (D-REN-8):** never part of build/CI/e2e. MCP scripts must leave the scene clean, look shader nodes up by `type` (non-English UI), and read enum values instead of hardcoding. No AI 3D generators.
