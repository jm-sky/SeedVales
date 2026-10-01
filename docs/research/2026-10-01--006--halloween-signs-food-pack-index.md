# Index — Halloween Bits, Signs pack, Ultimate Food Pack

**Date:** 2026-10-01  
**Type:** inventory (no asset converted, nothing under `public/assets/` changed)  
**Inputs:** `_temp/extracted/{Halloween Bits.undefined-glb, Signs pack-glb, Ultimate Food Pack-glb}` (gitignored; all already `.glb`, so no FBX → glTF step), measured with `node scripts/assets/inspect-pack.mjs --audit --md <dir>`.  
**Follow-up:** [`render--004`](../plans/render--004--asset-pipeline-and-audit.md) step 3 row "Halloween / Signs / Food packs" (verification task).

## Packs

| Pack | Files | Author / source | Licence | Textures | Notes |
|---|---|---|---|---|---|
| Halloween Bits | 63 | Kay Lousberg via Poly Pizza | per `credits.txt` — **confirm CC0 vs CC-BY on Poly Pizza before use** (CC-BY needs an entry in `CREDITS-CC-BY.txt`) | 1024² png per file (shared atlas look) | graveyard/crypt kit: fences, graves, candles, lanterns, pumpkins, dead/autumn trees, bones/skulls, path/floor tiles. Files with a `-<hash>` suffix are variants of the same name. |
| Signs pack | 14 | iPoly3D via Poly Pizza | per `credits.txt` — confirm as above | none (flat material colours, 2–4 materials/file) | 12 wooden signs + `Grass` tuft |
| Ultimate Food Pack | 50 | Quaternius via Poly Pizza | per `credits.txt` — Quaternius is normally CC0, confirm | none (flat material colours, 3–4 materials/file) | 8–75 KB, 0.1–1 k tris each; mix of medieval-plausible produce/meat/cookware and modern fast food |

Measured tables (unique tris = geometry, scene tris = with instancing; all static, no skins, no animations):

### Halloween Bits

| file | KB | tris (unique) | tris (scene) | nodes | meshes/prims | mats | textures | anims | skin |
|---|---|---|---|---|---|---|---|---|---|
| Arch Gate.glb | 76 | 868 | 868 | 4 | 3/3 | 1 | 1024x1024 png | — | no |
| Arch.glb | 45 | 436 | 436 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Autumn pine-8wkRed6jU9.glb | 34 | 318 | 318 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Autumn pine-MOuuN8sEWx.glb | 30 | 260 | 260 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Autumn pine-TTXhwPOkpJ.glb | 30 | 260 | 260 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Autumn pine-UBWV4jb52N.glb | 34 | 318 | 318 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Autumn pine-UopgJkSuo9.glb | 34 | 318 | 318 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Autumn pine.glb | 34 | 318 | 318 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Bench-cp2QnHh7bf.glb | 63 | 978 | 978 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Bench.glb | 27 | 172 | 172 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Bone-2jLwMoAb2y.glb | 24 | 204 | 204 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Bone-gVT6iydSY6.glb | 23 | 220 | 220 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Bone.glb | 24 | 204 | 204 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Broken Fence Pillar.glb | 23 | 102 | 102 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Candle Melted.glb | 20 | 66 | 66 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Candle-fYtyVjkX3y.glb | 20 | 66 | 66 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Candle.glb | 20 | 66 | 66 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Candles.glb | 26 | 198 | 198 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Cobblestone tile.glb | 31 | 361 | 361 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Coffin-ySERERWPgE.glb | 94 | 2064 | 2064 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Coffin.glb | 35 | 316 | 316 | 3 | 2/2 | 1 | 1024x1024 png | — | no |
| Crypt.glb | 75 | 952 | 952 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Damaged Grave.glb | 40 | 416 | 416 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Damaged Iron fence.glb | 40 | 354 | 354 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Dead tree-68VK0NzgEZ.glb | 22 | 216 | 216 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Dead tree.glb | 24 | 256 | 256 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Dirt Floor Tile.glb | 25 | 120 | 120 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Fence Broken.glb | 45 | 446 | 446 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Fence Gate.glb | 60 | 620 | 620 | 4 | 3/3 | 1 | 1024x1024 png | — | no |
| Fence Pillar.glb | 23 | 94 | 94 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Fence.glb | 43 | 380 | 380 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Floor Dirt Small.glb | 22 | 80 | 80 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Grave Marker.glb | 21 | 56 | 56 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Grave-Yg8Yz6T8A6.glb | 25 | 132 | 132 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Grave.glb | 32 | 323 | 323 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Gravemarker.glb | 27 | 136 | 136 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Gravestone-lrEHKjTy29.glb | 30 | 190 | 190 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Gravestone.glb | 29 | 271 | 271 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Hanging Lantern.glb | 36 | 472 | 472 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Iron Fence.glb | 39 | 312 | 312 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Jackolantern.glb | 30 | 374 | 374 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Lantern.glb | 29 | 264 | 264 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Path-BibMU0BCgk.glb | 33 | 393 | 393 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Path.glb | 31 | 370 | 370 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Pillar.glb | 23 | 94 | 94 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Plaque Candles.glb | 38 | 418 | 418 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Plaque.glb | 22 | 88 | 88 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Post Lantern.glb | 43 | 568 | 568 | 3 | 2/2 | 1 | 1024x1024 png | — | no |
| Post With Skull.glb | 47 | 776 | 776 | 3 | 2/2 | 1 | 1024x1024 png | — | no |
| Post.glb | 23 | 96 | 96 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Pumpkin Orange Jacko.glb | 30 | 374 | 374 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Pumpkin.glb | 25 | 306 | 306 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Ribcage.glb | 68 | 1240 | 1240 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Rocks.glb | 28 | 275 | 275 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Shrine-Qq8M5LSXQ2.glb | 36 | 360 | 360 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Shrine.glb | 23 | 94 | 94 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Skull Candle.glb | 40 | 542 | 542 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Skull.glb | 29 | 344 | 344 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Small Dead tree.glb | 22 | 184 | 184 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Small Pumpkin-KnfqSrTtUX.glb | 26 | 322 | 322 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Small Pumpkin.glb | 25 | 306 | 306 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Tree Dead Large Deco.glb | 65 | 1496 | 1496 | 2 | 1/1 | 1 | 1024x1024 png | — | no |
| Yellow pumpkin.glb | 26 | 322 | 322 | 2 | 1/1 | 1 | 1024x1024 png | — | no |

Total: 63 files, 2.12 MB, 23545 unique tris

### Signs pack

| file | KB | tris (unique) | tris (scene) | nodes | meshes/prims | mats | textures | anims | skin |
|---|---|---|---|---|---|---|---|---|---|
| Grass.glb | 19 | 206 | 206 | 2 | 1/2 | 2 | — | — | no |
| Wooden Sign-3MStJYAez7.glb | 66 | 860 | 860 | 2 | 1/4 | 4 | — | — | no |
| Wooden Sign-AsEgIQcQfw.glb | 54 | 724 | 724 | 2 | 1/4 | 4 | — | — | no |
| Wooden Sign-EpQJ6RRLKZ.glb | 78 | 1052 | 1052 | 2 | 1/4 | 4 | — | — | no |
| Wooden Sign-GGbYyOmVCh.glb | 22 | 246 | 246 | 2 | 1/3 | 3 | — | — | no |
| Wooden Sign-SpRHK36gNl.glb | 56 | 686 | 686 | 2 | 1/4 | 4 | — | — | no |
| Wooden Sign-SzDPlKOhrH.glb | 37 | 468 | 468 | 2 | 1/3 | 3 | — | — | no |
| Wooden Sign-TzjiI94FC5.glb | 27 | 340 | 340 | 2 | 1/3 | 3 | — | — | no |
| Wooden Sign-U8DioeoNvJ.glb | 52 | 692 | 692 | 2 | 1/4 | 4 | — | — | no |
| Wooden Sign-ir1ipUXgGE.glb | 24 | 270 | 270 | 2 | 1/3 | 3 | — | — | no |
| Wooden Sign-jNdZygn3uR.glb | 49 | 644 | 644 | 2 | 1/4 | 4 | — | — | no |
| Wooden Sign-mxyDWLsKer.glb | 26 | 298 | 298 | 2 | 1/4 | 4 | — | — | no |
| Wooden Sign-p4TB5SdPsG.glb | 28 | 364 | 364 | 2 | 1/3 | 3 | — | — | no |
| Wooden Sign.glb | 26 | 324 | 324 | 2 | 1/3 | 3 | — | — | no |

Total: 14 files, 0.55 MB, 7174 unique tris

### Ultimate Food Pack

| file | KB | tris (unique) | tris (scene) | nodes | meshes/prims | mats | textures | anims | skin |
|---|---|---|---|---|---|---|---|---|---|
| Apple Green.glb | 35 | 440 | 440 | 2 | 1/3 | 3 | — | — | no |
| Avocado.glb | 17 | 256 | 256 | 2 | 1/3 | 3 | — | — | no |
| Bacon.glb | 35 | 564 | 564 | 2 | 1/4 | 4 | — | — | no |
| Banana.glb | 20 | 348 | 348 | 2 | 1/1 | 1 | — | — | no |
| Bottle-Pc8dM9Ja4V.glb | 16 | 220 | 220 | 2 | 1/4 | 4 | — | — | no |
| Bottle.glb | 15 | 220 | 220 | 2 | 1/3 | 3 | — | — | no |
| Bread Slice.glb | 28 | 368 | 368 | 2 | 1/2 | 2 | — | — | no |
| Bread.glb | 29 | 412 | 412 | 2 | 1/2 | 2 | — | — | no |
| Broccoli.glb | 20 | 270 | 270 | 2 | 1/2 | 2 | — | — | no |
| Burger.glb | 56 | 847 | 847 | 2 | 1/6 | 6 | — | — | no |
| Carrot.glb | 48 | 864 | 864 | 2 | 1/2 | 2 | — | — | no |
| Cheeseburger.glb | 38 | 588 | 588 | 2 | 1/4 | 4 | — | — | no |
| Chicken Leg.glb | 18 | 288 | 288 | 2 | 1/2 | 2 | — | — | no |
| Chocolate Bar.glb | 23 | 436 | 436 | 2 | 1/1 | 1 | — | — | no |
| Chopsticks.glb | 25 | 440 | 440 | 2 | 1/1 | 1 | — | — | no |
| Cooking Pot-lMEdEOMg9L.glb | 15 | 260 | 260 | 2 | 1/1 | 1 | — | — | no |
| Cooking Pot.glb | 15 | 260 | 260 | 2 | 1/1 | 1 | — | — | no |
| Corndog.glb | 17 | 284 | 284 | 2 | 1/2 | 2 | — | — | no |
| Croissant.glb | 8 | 132 | 132 | 2 | 1/1 | 1 | — | — | no |
| Cupcake.glb | 27 | 412 | 412 | 2 | 1/3 | 3 | — | — | no |
| Donut.glb | 58 | 984 | 984 | 2 | 1/5 | 5 | — | — | no |
| Double Cheeseburger.glb | 52 | 860 | 860 | 2 | 1/4 | 4 | — | — | no |
| Egg Fried.glb | 8 | 101 | 101 | 2 | 1/2 | 2 | — | — | no |
| Egg.glb | 22 | 288 | 288 | 2 | 1/1 | 1 | — | — | no |
| Eggplant.glb | 22 | 368 | 368 | 2 | 1/2 | 2 | — | — | no |
| Fries.glb | 21 | 324 | 324 | 2 | 1/3 | 3 | — | — | no |
| Frying Pan.glb | 14 | 214 | 214 | 2 | 1/2 | 2 | — | — | no |
| Hotdog.glb | 57 | 988 | 988 | 2 | 1/4 | 4 | — | — | no |
| Ice Cream.glb | 73 | 1278 | 1278 | 2 | 1/3 | 3 | — | — | no |
| Ketchup Bottle.glb | 14 | 236 | 236 | 2 | 1/1 | 1 | — | — | no |
| Lettuce.glb | 33 | 592 | 592 | 2 | 1/1 | 1 | — | — | no |
| Mushroom Sliced.glb | 7 | 92 | 92 | 2 | 1/2 | 2 | — | — | no |
| Pancakes Stack.glb | 51 | 896 | 896 | 2 | 1/4 | 4 | — | — | no |
| Pepper Green.glb | 45 | 808 | 808 | 2 | 1/2 | 2 | — | — | no |
| Pizza Slice.glb | 23 | 392 | 392 | 2 | 1/3 | 3 | — | — | no |
| Pizza.glb | 60 | 1200 | 1200 | 2 | 1/3 | 3 | — | — | no |
| Plate Square.glb | 12 | 204 | 204 | 2 | 1/1 | 1 | — | — | no |
| Popsicle Chocolate.glb | 7 | 84 | 84 | 2 | 1/2 | 2 | — | — | no |
| Popsicle.glb | 11 | 120 | 120 | 2 | 1/4 | 4 | — | — | no |
| Pumpkin.glb | 37 | 644 | 644 | 2 | 1/2 | 2 | — | — | no |
| Soda.glb | 27 | 472 | 472 | 2 | 1/2 | 2 | — | — | no |
| Spoon.glb | 10 | 128 | 128 | 2 | 1/1 | 1 | — | — | no |
| Steak.glb | 25 | 412 | 412 | 2 | 1/2 | 2 | — | — | no |
| Sushi Nigiri.glb | 13 | 196 | 196 | 2 | 1/2 | 2 | — | — | no |
| Sushi.glb | 12 | 140 | 140 | 2 | 1/4 | 4 | — | — | no |
| Tentacle.glb | 34 | 612 | 612 | 2 | 1/2 | 2 | — | — | no |
| Tomato Slice.glb | 35 | 670 | 670 | 2 | 1/1 | 1 | — | — | no |
| Tomato.glb | 26 | 344 | 344 | 2 | 1/2 | 2 | — | — | no |
| Turnip.glb | 55 | 976 | 976 | 2 | 1/3 | 3 | — | — | no |
| Waffle.glb | 58 | 1112 | 1112 | 2 | 1/1 | 1 | — | — | no |

Total: 50 files, 1.39 MB, 23644 unique tris

## First-glance relevance (to be verified by the task in `render--004`)

Hypotheses only — nothing here is decided.

- **Likely useful:** Food — Bread, Egg, Chicken Leg, Steak, Bacon, Carrot, Turnip, Tomato, Lettuce, Pumpkin, Apple Green, Cooking Pot, Frying Pan, Plate Square, Spoon, Bottle (ground items / carried goods / cooking visuals, `economy--001`, `survival--001`). Signs — wooden signs (settlement entrances, shops, landmarks; `world--001`). Halloween — Candle(s), Lantern/Hanging Lantern/Post Lantern (light sources, `survival--001` fire/torches), Grave/Gravestone/Crypt/Coffin/Shrine/Bones/Skull (graveyard landmark, treasure/ruins; `world--001`), Dead tree/Autumn pine (autumn vegetation variety), Fence/Bench/Path/Cobblestone (settlement dressing).
- **Probably not:** modern food (Burger, Hotdog, Pizza, Donut, Cupcake, Soda, Ketchup Bottle, Ice Cream, Popsicle, Sushi, Fries, Corndog, Chopsticks), Jackolantern/Pumpkin Orange Jacko (Halloween gimmick), Tentacle — no medieval fit (VISION: no fantasy, no anachronisms).
- **Open questions:** style fit against Quaternius village/props (Halloween Bits is flat-shaded 1024² atlas; Signs/Food are flat-colour materials — material counts of 2–4 per file would mean extra draw calls unless merged, D-REN-11); texture size vs the 512 px class budget; licence per pack; whether item meshes are needed at all before an inventory-in-world/ground-item feature exists.

## Verification result — keep/drop list (render--004 step 3, 2026-10-01)

**Method.** The candidate pieces were opened in Blender MCP (5.2 LTS, scene restored afterwards), bounding boxes read per piece, true-scale contact sheets rendered (Workbench, flat shading, per pack group), then the kept groups were built by `scripts/assets/build-pack-pieces.mjs` and re-imported from the built `.glb` for a second sheet. Windows machine: no e2e, no bench.

**Licences (Poly Pizza, checked 2026-10-01).** Every piece looked up is **CC0 1.0** — Halloween Bits = Kay Lousberg (Grave, Gravestone, Damaged Grave, Crypt, Grave Marker, Gravemarker, Coffin, Skull, Bone, Iron Fence, Damaged Iron fence, Fence Gate, Fence Broken, Broken Fence Pillar, Lantern, Hanging Lantern, Post Lantern, Bench, Tree Dead Large Deco, Jackolantern, pumpkins), Signs pack = iPoly3D (all 12 Wooden Sign variants listed), Ultimate Food Pack = Quaternius (Carrot, Turnip, Cooking Pot, Pumpkin, Apple Green, Broccoli, Avocado). Not every one of the 127 files was looked up individually (Poly Pizza search caps at 32 rows); the unlisted ones share author and pack. **No `CREDITS-CC-BY.txt` entry is needed**; provenance is listed in the build script header. (Search also surfaces CC-BY look-alikes from other authors — those were not used.)

**Measured findings (all three packs).**

| Aspect | Halloween Bits | Signs pack | Food pack |
|---|---|---|---|
| Scale | oversized cartoon: candle 0.79 m, lantern 0.93 m, skull 0.92 m, gravestone 1.6 m, fence module 4 × 2.2 m, crypt 6 × 8 × 8 m | signs ≈ real (post 2 m, board 1–3 m wide) | **~10× too big**: carrot 2.8 m, pot 2.4 m, egg 0.47 m |
| Pivot | origin on the ground and centred / at the post (fine) — except hanging lantern (origin at the hook, kept) and trees (roots 0.3 m below 0) | at the post base, but boards are off-centre (post at the origin, kept as authored) | arbitrary (carrot y −1.0…1.8, bowl/pot z −0.4…0.7) — re-based to XZ centre / y = 0 |
| Orientation | Y-up after import, front toward −Y; no fixes needed | same | same; carrots/leeks stand upright (a ground item would be rotated by the consumer) |
| Materials | 1 (shared atlas) | 3–4 flat colours | 1–4 flat colours |
| Textures | 1024² png atlas per file (identical across files → one after dedup) | none | none |
| PBR | metallic 1 / roughness 1 in the exports → flattened to 0 / 1 (renderer is Lambert-style) | same | same |

**Keep (built into `assets-src/`, scale baked so 1 unit = 1 m):**

| Group → file | Pieces (node name, source, scale, resulting size) | Consumer / rationale |
|---|---|---|
| Graveyard / churchyard → `graveyard.glb` (31 nodes, 10.0 k tris, 282 KB, 1 material, 512² atlas) | `Candle`, `Candles`, `Candle_Melted` (×0.3, 0.2–0.24 m); `Lantern` (×0.35, 0.32 m), `Lantern_Hanging` (×0.35, origin at hook), `Lantern_Post` (×0.65, 2.1 m); `Grave`, `Grave_Damaged` (×0.5, 1.05 m), `Gravestone` (×0.5, 0.8 m), `Grave_Marker_A/B` (×0.7 wooden crosses, 0.84 m); `Crypt` (×0.7, 4.2 × 5.6 × 5.6 m), `Shrine` (×0.6, 1.4 m), `Coffin` (×0.6, 1.8 m); `Fence_Stone`, `Fence_Stone_Broken`, `Fence_Gate`, `Fence_Pillar`, `Fence_Pillar_Broken` (×0.5, 2 m module, 1.1 m high), `Fence_Iron`, `Fence_Iron_Broken` (×0.5, 1 m high), `Bench` (×0.9, 1.8 m), `Arch`, `Arch_Gate` (×0.65, 2.7 × 2.9 m, walkable); `Path_Tile`, `Cobble_Tile`, `Path_Rocks` (1.9 m, 0.1 m thick), `Dead_Tree`, `Dead_Tree_Small` (as authored, 5 m / 3 m), `Skull` (×0.22, 0.2 m), `Bone` (×0.35, 0.25 m) | `world--001` (graveyard/ruins landmark, treasure scatter: graves, markers, crypt, fence, gate, skull/bone), settlement dressing (bench, fences, path tiles, arch gate), `survival--001` visuals (candles, standing/post/hanging lantern as light-source props), vegetation variety (dead trees; `nature.glb` has `DeadTree_1` only). Largest piece: Crypt 952 tris (landmark class ≤ 3.2 k per piece, ≤ 30 k per placed landmark — a full graveyard of ~40 pieces fits). |
| Signs → `signs.glb` (13 nodes, 7.0 k tris, 128 KB, 1 palette material, 16 × 4 px texture) | `Sign_01 … Sign_13` (iPoly3D "Wooden Sign" variants, scale 1; 1.6–2.55 m tall, 0.9–3.0 m wide: direction posts with 2–3 arrows, hanging boards on a gallows frame, oval/rectangular shop signs, big notice boards; each includes small grass tufts/stones at the base) | settlement entrances, shops, crossroads, landmark labels (`world--001`, settlement dressing). Names are numbered (file order: `Wooden Sign`, then the 12 hash variants alphabetically); sizes are in the build log (`build-pack-pieces.mjs`) — rename when a consumer picks. |
| Food → `food.glb` (14 nodes, 6.4 k tris, 133 KB, 2 palette materials of one 64 × 4 px texture) | `Bread` (×0.25, 0.3 m), `Egg` (×0.12), `Chicken_Leg` (×0.18), `Steak` (×0.12), `Bacon` (×0.2), `Carrot` (×0.1, 0.28 m), `Turnip` (×0.1), `Tomato` (×0.13), `Lettuce` (×0.15, stands in for cabbage), `Pumpkin` (×0.25, 0.37 m), `Apple_Green` (×0.1), `Cooking_Pot` (×0.15, 0.36 m), `Frying_Pan` (×0.12), `Spoon` (×0.13); origin at base centre | item meshes for ground items / carried goods / cooking visuals: `items.ts` ids `apple`, `carrot`, `cabbage`, `tomato`, `egg`, `bread`, `raw_meat` (Steak), `cooked_meat` (Chicken_Leg), `dried_meat` (Bacon), `stew` (Cooking_Pot); Pumpkin/Turnip for crops. Pot and pan match the `economy--001` capacity props. |

**Drop (nothing built):**

| Piece(s) | Why |
|---|---|
| Halloween gimmicks: `Jackolantern`, `Pumpkin Orange Jacko`, all `Pumpkin`/`Small Pumpkin`/`Yellow pumpkin` (Halloween Bits; the farm `Pumpkin` of the food pack is kept), `Post With Skull`, `Skull Candle`, `Tree Dead Large Deco` (hanging skull + lantern), `Ribcage`, `Plaque Candles`, `Plaque`, `Post`, `Pillar` | VISION: no fantasy/horror staging; they only add Halloween flavour. |
| `Autumn pine` ×6 | flat orange cone, clashes with the Quaternius pines in `nature.glb`; autumn colour is a seasonal-tint job, not a model. |
| Hash-suffixed duplicates (`Bench-cp2…` 978 tris, `Coffin-ySE…` 2064 tris, `Gravestone-lrE…`, `Grave-Yg8…`, `Path-Bib…`, `Shrine-Qq8…`, `Candle-fYt…`, `Bone-2jL…/gVT…`, `Dead tree-68V…`, `Small Pumpkin-Knf…`) | same piece with a different variant at a higher triangle count or without a need; add later if variety is wanted. |
| `Dirt Floor Tile`, `Floor Dirt Small` | terrain is procedural; the 4 × 4 m slab would z-fight/hover. |
| Modern food: Burger, Cheeseburger, Double Cheeseburger, Hotdog, Corndog, Pizza (+Slice), Donut, Cupcake, Ice Cream, Popsicle ×2, Soda, Ketchup Bottle, Fries, Sushi ×2, Chopsticks, Chocolate Bar, Waffle, Pancakes Stack, Croissant, Tentacle, Bottle ×2 (champagne-style glass), Plate Square | anachronistic / fantasy (VISION). |
| Food with no item and no medieval-Europe fit: Avocado, Banana, Eggplant, Pepper Green, Broccoli, Mushroom Sliced (`nature.glb` has a whole mushroom), Egg Fried, Bread Slice, Tomato Slice | not in `items.ts`; New-World/tropical produce. `Tomato` is kept only because the game already has the `tomato` item. |
| Signs pack `Grass` | one tuft; vegetation exists (and the signs already carry tufts). |

**Open for the user.** (1) Style fit: the graveyard pieces are cartoony and desaturated blue-grey — close to the Quaternius village kit, but the crypt's orange-brick roof is loud; recolour in the atlas or drop `Crypt` if it looks wrong in a scene. (2) The unused numbered signs need a human choice of which look to use where.
