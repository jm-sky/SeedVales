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
| `animals/{Rat,Hare,Boar,Bear}.glb` | `_temp/extracted/Extra_Animals/` (Poly Pizza, Sketchfab) | rat, hare (animated: Idle/Walk, rat also Gallop/Attack/Death); boar, bear static (no rig) | built by `node scripts/assets/build-extra-animals.mjs`; boar (FBX) and bear normalised in Blender first (head → +Z, feet at y=0); bear simplified 18.7k → ~9k tris (UV seams limit further simplification), texture 4096 → 512 |
| `characters/{Male,Female}_{Peasant,Ranger}.glb` | Outfits | ciało postaci | uproszczone ~35–50% |
| `characters/{Male,Female}_Head.glb` | Base Characters | głowa (re-bind do szkieletu stroju) | |
| `characters/anims.glb` | UAL1 Standard | 22 klipy, bez siatek | 2.5 MB |
| `LICENSE-Quaternius-CC0.txt` | | licencja | |
| `CREDITS-CC-BY.txt` | | CC BY attributions (hare, boar, bear) — required by the license | |

## Do wymiany / braki (placeholdery)

- Sheep, chicken, moose: procedural placeholders (not in the packs).
- Boar and bear: static models (no skeleton/animations); a rig + walk/attack clips is a follow-up. The bear is a realistic fur-textured model, a style mismatch with the low-poly Quaternius animals; replace it if a better low-poly bear turns up.
- Studnia, ognisko, tablica, pochodnie, koryto, suszarnia, palisada, most, uprawy — proceduralne low-poly.
- Broń/narzędzia w dłoni — brak (FBX-only w RPG Items).
