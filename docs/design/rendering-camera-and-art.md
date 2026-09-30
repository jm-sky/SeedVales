# Rendering: kamera i oprawa wizualna

**Status:** decyzja użytkownika (v1)  
**Domain:** rendering  
**Źródło:** `docs/VISION.md` §4.4

## Decyzje

| Obszar | Wybór | Uzasadnienie |
|---|---|---|
| Kamera | Third-person (zza postaci), z zoomem | Naturalna walka wręcz i łuk, dobra immersja; średni koszt |
| Teren, roślinność, budynki | Proceduralne, low-poly, paleta kolorów | Brak zależności od assetów, szybka iteracja, pasuje do generatora świata |
| Postacie, zwierzęta | Importowane glTF (docelowo) | Animacje i czytelność postaci; placeholdery proceduralne do czasu doboru |

## Doprecyzowanie (VISION-APPENDIX, 2026-09-30)

„Low-poly” opisuje styl geometrii, a **nie** ogranicza jakości: tam, gdzie nie kosztuje to dużo FPS, stosujemy ładniejsze efekty (np. ogień z cząsteczkami i iskrami, chmury, opady, mokry/ośnieżony teren), sterowane profilem jakości (`render/quality.ts`). Patrz D-REN-5 w `DECISIONS.md` i plan `docs/plans/render--001--weather-variety-effects.md`.

## Konsekwencje

- **Sterowanie:** desktop — WASD + mysz; mobile — joystick + drag kamery, przyciski akcji.
- **Walka:** celowanie/zamach względem kierunku kamery; wymaga kolizji kamery z terenem.
- **Koszt:** LOD i culling potrzebne od początku (widok na dalszy teren); instancing dla roślin.
- **Assety:** przed importem sprawdzić licencję (CC0/własne); zapisać źródło w `docs/research/`.
- **Rozdział:** renderer czyta stan symulacji, nie modyfikuje go (patrz `docs/VISION.md` §3).

## Otwarte (❓)

- Konkretna paczka assetów postaci/zwierząt i format animacji.
- Limity wydajności na mobile (do zmierzenia na realnym urządzeniu).
