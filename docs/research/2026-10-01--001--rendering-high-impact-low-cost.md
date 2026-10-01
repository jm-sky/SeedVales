# Rendering 3D — wysoki efekt wizualny przy niskim koszcie

**Data:** 2026-10-01  
**Status:** research / rekomendacje  
**Projekt:** SeedVales-2  
**Cel:** możliwie duży wzrost jakości obrazu przy małym koszcie GPU/CPU/pamięci, z naciskiem na laptop i mobile.

## 1. Stan obecny projektu

Repo ma już sensowny fundament pod lekką grafikę 3D:

- Three.js `0.186.x`, `WebGLRenderer`;
- teren chunkowany z LOD 2/4/8/16 m i skirts;
- vegetation przez `InstancedMesh`, z modelami near i prostymi odpowiednikami far;
- budynki łączone w template i instancjonowane;
- modele postaci/zwierząt z GLB i animacjami w pobliżu gracza;
- dynamiczne day/night, fog i weather;
- opady jako jeden `THREE.Points`;
- ogień jako instancjonowana geometria + ograniczona liczba point lights;
- profile jakości `low / medium / high`;
- Meshopt, redukcja geometrii, małe tekstury 256–512 px;
- renderer diagnostics: draw calls, triangles, CPU time, liczba tekstur/geometrii;
- istniejący render benchmark.

Najważniejsze obecne ograniczenia z `docs/state/PERF.md`:

- settlement: ok. 350–425 draw calls;
- ok. 0.9–1.1 mln triangles;
- postacie: 7–12 draw calls na osobę;
- przebudowa vegetation podczas gwałtownego traversalu ma wysoki p95;
- brak reprezentatywnego pomiaru GPU na realnym telefonie.

Wniosek: obecna architektura jest dobra. Nie ma potrzeby wymiany renderera ani przechodzenia na ciężki pipeline post-processingu.

## 2. Główna strategia

Najlepszy kierunek dla SeedVales:

> Więcej jakości uzyskiwać przez shader/material/asset pipeline, a nie przez więcej geometrii, lights i fullscreen passes.

To pasuje do zaleceń MDN dla WebGL:

- batch draw calls;
- renderuj do mniejszego back buffera, jeśli trzeba;
- używaj compressed textures;
- przenoś odpowiednią pracę z fragment shader do vertex shader.

Źródło: MDN WebGL Best Practices  
https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

---

# 3. Priorytety

| Technika | Efekt wizualny | Koszt runtime | Mobile | Priorytet |
|---|---:|---:|---|---|
| procedural sky + horizon + sun/moon | bardzo wysoki | bardzo niski | bardzo dobry | A |
| vegetation wind w vertex shader | bardzo wysoki | bardzo niski | bardzo dobry | A |
| shaderowy wet/snow/season terrain | bardzo wysoki | niski | bardzo dobry | A |
| tani custom water shader | bardzo wysoki | niski/średni | dobry | A |
| tone mapping + exposure | wysoki | bardzo niski | bardzo dobry | A |
| dynamic resolution | pośrednio bardzo wysoki | oszczędność | kluczowy | A |
| KTX2/Basis textures | pośrednio bardzo wysoki | oszczędność VRAM/bandwidth | bardzo dobry | A |
| GPU precipitation | wysoki | niski | bardzo dobry | A |
| shadow redesign + blob/contact shadows | wysoki | niski / oszczędność | bardzo dobry | A |
| emissive windows / lanterns / fires | wysoki | bardzo niski | bardzo dobry | A |
| lepszy ogień / sparks / smoke | wysoki | niski | dobry | B |
| LOD hysteresis / transition | średni | bardzo niski | bardzo dobry | B |
| spatial vegetation culling | pośrednio wysoki | oszczędność | bardzo dobry | B |
| blood / footprints / ground decals | wysoki lokalnie | niski | dobry | B |
| SSAO / GTAO | wysoki | średni/wysoki | słaby jako default | C |
| WebGPU migration | potencjalnie wysoki | niepewny | jeszcze niepotrzebny | research |
| SSR / volumetrics / DoF / motion blur | wysoki | wysoki/bardzo wysoki | słaby | odradzane |

---

# 4. Tone mapping

Obecny renderer nie ustawia jawnie tone mappingu.

Warto A/B przetestować:

```ts
renderer.toneMapping = THREE.AgXToneMapping
renderer.toneMappingExposure = 1.0
```

oraz:

```ts
renderer.toneMapping = THREE.NeutralToneMapping
```

To tani sposób na lepsze zachowanie jasnych obszarów: słońce, ogień, śnieg, jasne niebo.

Nie wymaga `EffectComposer`.

Rekomendacja:

- dodać `toneMapping` i `exposure` do calibration/settings;
- porównać AgX vs Neutral na kilku stałych scenach.

---

# 5. Procedural sky

Obecne niebo jest głównie kolorem tła zależnym od dnia i pogody.

Bardzo tani shader nieba może dać duży skok jakości:

- gradient zenith → horizon;
- rozjaśnienie przy horyzoncie;
- analityczny sun disc;
- moon disc;
- stars w nocy;
- jedna niskoczęstotliwościowa warstwa clouds/noise;
- cloud density z `weather.kind`;
- kolory sterowane istniejącym `daylight`.

Najlepiej zrobić to jako:

- jedna kopuła/sfera, albo
- jeden background shader.

Nie robić volumetric clouds.

To powinien być jeden z pierwszych efektów do wdrożenia.

---

# 6. Vegetation wind w vertex shader

Statyczne drzewa i rośliny bardzo obniżają odczuwaną jakość świata.

Najlepszy kosztowo wariant:

- nie aktualizować matrix każdej instancji po stronie JS;
- deformować vertex positions w shaderze;
- fazę wyliczać deterministycznie z world position / instance;
- zwiększać bend wraz z wysokością vertexa;
- sterować przez `windStrength` i `windDirection`.

Przykład koncepcyjny:

```text
phase = hash(worldPosition)
bend = sin(time * speed + phase) * windStrength * heightMask
```

Profile:

- low: jedna fala;
- medium: fala + gust;
- high: dwie częstotliwości / większa lokalna wariancja.

MDN rekomenduje przenoszenie odpowiednich obliczeń do vertex shader, bo fragment shader zwykle wykonuje się znacznie częściej.

Rekomendacja: **priorytet A**.

---

# 7. Wet / snow / season powinny przejść do shaderów

To jest szczególnie ważna obserwacja dla obecnego kodu.

W `terrainChunks.ts` część zmian wyglądu terenu jest wbudowywana w vertex colors podczas budowy chunka. Zmiana season/snow może prowadzić do oznaczania chunków jako dirty i ich przebudowy.

Dla czysto wizualnego stanu lepiej użyć uniforms:

```text
wetness
snowCover
season
sunStrength
```

## Wet ground

Low/medium:

- lekkie przyciemnienie;
- lokalnie mniejsza jasność;
- bardzo tani highlight zależny od kąta.

High:

- trochę mocniejszy tani specular.

Nie ma potrzeby przechodzić całym światem na `MeshStandardMaterial`.

Three.js dokumentuje, że `MeshLambertMaterial` jest prostszy i szybszy od Phong/Standard/Physical.

Źródło:  
https://threejs.org/docs/pages/MeshLambertMaterial.html

## Snow

Snow mask może zależeć od:

- `snowCover`;
- normal.y / slope;
- altitude;
- biome;
- taniego world-space noise.

Koncepcyjnie:

```text
snow =
  snowCover
  * slopeMask
  * altitudeMask
  * noise
```

Dzięki temu:

- strome skały pozostają mniej ośnieżone;
- nie trzeba przebudowywać geometrii;
- przejścia pogodowe mogą być płynne.

Rekomendacja: **priorytet A**.

---

# 8. Custom water shader

Obecna woda korzysta z przezroczystego Lambert material.

Woda jest wizualnie ważna i duża powierzchniowo, dlatego dedykowany tani shader ma bardzo dobry stosunek efekt/koszt.

Rekomendowany zakres:

- 2 kierunki prostych fal/noise;
- shallow/deep color variation;
- Fresnel-like brightening pod małym kątem;
- sun glint;
- integracja z fog;
- opcjonalne minimalne vertex displacement tylko na high.

Nie stosować:

- planar reflections;
- SSR;
- refraction wymagającego dodatkowego renderu sceny;
- multi-pass reflection cameras.

Profile:

- low: animated color;
- medium: + Fresnel + sun highlight;
- high: + małe vertex waves.

Rekomendacja: **priorytet A**.

---

# 9. Dynamic resolution

Aktualne profile mają stałe limity pixel ratio:

- low 1.0;
- medium 1.5;
- high 2.0.

Na mobile fill-rate może stać się głównym ograniczeniem, zwłaszcza przy wysokim DPR.

Three.js oraz MDN rekomendują ograniczanie drawing-buffer resolution zamiast automatycznego renderowania w pełnym device pixel ratio.

Źródła:

- https://threejs.org/manual/pages/responsive.html
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

Proponowana architektura:

```text
quality profile
  -> max render scale
  -> adaptive controller
  -> actual drawing-buffer scale
```

Controller powinien brać pod uwagę:

- median/p95 frame time;
- przeciążenie utrzymujące się przez kilka sekund;
- hysteresis;
- cooldown po zmianie;
- powolne zwiększanie jakości i szybsze zmniejszanie.

Nie zmieniać skali co klatkę.

To pozwala zachować efekty na słabszym sprzęcie kosztem niewielkiego spadku resolution zamiast wyłączania całego wyglądu.

Rekomendacja: **priorytet A**.

---

# 10. KTX2 / Basis Universal

Asset pipeline już używa Meshopt oraz redukuje tekstury do 256–512 px, ale finalne tekstury są głównie PNG.

PNG może być mały w transferze, ale po uploadzie do GPU zwykle nie daje korzyści GPU-compressed texture.

MDN wskazuje compressed textures jako ważne dla VRAM i bandwidth, szczególnie na mobile.

Three.js ma `KTX2Loader`, który obsługuje Basis Universal i transkoduje teksturę do formatu wspieranego przez dane GPU.

Źródło:  
https://threejs.org/docs/pages/KTX2Loader.html

glTF Transform obsługuje KTX2/Basis, w tym ETC1S i UASTC:

https://gltf-transform.dev/

Dla SeedVales:

- baseColor → ETC1S;
- przyszłe normal/ORM → UASTC;
- zostawić Meshopt dla geometrii.

Meshopt i KTX2 rozwiązują różne problemy i warto używać obu.

Rekomendacja: **priorytet A**.

---

# 11. GPU precipitation

Obecny deszcz/śnieg jest jednym `THREE.Points`, co jest dobre, ale każda klatka:

- JS przechodzi przez particle positions;
- modyfikuje buffer;
- ustawia `needsUpdate`.

To można przenieść na GPU.

Każda cząstka dostaje początkową pozycję/phase, a vertex shader oblicza:

```text
y = initialY - mod(time * speed + phase, height)
x/z += drift(time, phase)
```

JS aktualizuje tylko:

- time;
- camera position;
- precipitation intensity;
- wind.

Dla rain można później użyć krótkich instanced quads/streaks. Snow może pozostać points/sprites.

Trzeba ograniczać overdraw i promień cząstek wokół kamery.

Rekomendacja: **priorytet A**.

---

# 12. Shadows

Aktualny kierunek jest dobry:

- jeden directional sun;
- point lights bez shadows;
- shadows wyłączone na low.

Three.js shadow maps wymagają dodatkowego renderowania shadow-casterów z punktu widzenia światła.

Źródło:  
https://threejs.org/manual/pages/shadows.html

## Low

- bez shadow maps;
- tanie blob/contact shadow pod graczami, NPC i większymi zwierzętami.

## Medium

- directional sun shadow tylko blisko gracza;
- ograniczona liczba casterów;
- blob shadows dla mniej ważnych aktorów.

## High

- większy obszar dynamicznych shadows;
- nadal ograniczony shadow-camera extent.

Dodatkowo można zbadać rzadsze aktualizacje shadow map, jeżeli słońce i istotna część sceny zmieniają się wolno.

Rekomendacja: **priorytet A**.

---

# 13. Emissive lighting zamiast kolejnych point lights

Noc może wyglądać dużo lepiej bez dodawania wielu lights.

Przykłady:

- jasne/emissive okna;
- emissive lantern mesh;
- distant campfire sprite;
- prawdziwe PointLight tylko dla kilku najbliższych źródeł.

Pozwala zachować obecny limit `MAX_LIGHTS`, ale wizualnie osada nadal wygląda na oświetloną.

Rekomendacja: **priorytet A**.

---

# 14. Fire

Obecny ogień: instanced cone + flickering point light.

Tani upgrade:

1. 1–3 camera-facing flame sprites/quads;
2. kilka GPU sparks;
3. kilka wolnych smoke sprites;
4. realne PointLight tylko dla bliskich ognisk;
5. dla dalekich: emissive sprite bez light.

Większość animacji powinna bazować na shader `time`, nie symulacji CPU.

Rekomendacja: **priorytet B**.

---

# 15. LOD transitions

Projekt już intensywnie korzysta z LOD. Widoczne popping może być bardziej irytujące niż sama niższa szczegółowość.

Three.js `LOD` obsługuje hysteresis, które zapobiega szybkiemu przełączaniu na granicy poziomów.

Źródło:  
https://threejs.org/docs/pages/LOD.html

Dla własnych LOD SeedVales warto zachować tę samą zasadę.

Opcjonalnie dla wybranych transitions można zbadać:

- alpha hash;
- screen-door / dither;
- krótki zakres przejścia.

Three.js `Material.alphaHash` pozwala przybliżyć transparency bez klasycznych problemów sortowania.

Źródło:  
https://threejs.org/docs/pages/Material.html

Rekomendacja: **priorytet B**.

---

# 16. Vegetation spatial culling

W obecnym `vegetation.ts` instanced meshes mają:

```ts
im.frustumCulled = false
```

Dla wielkiego zbioru instancji jest to zrozumiałe, ale oznacza, że vegetation za kamerą nadal może trafiać do renderowania.

Do benchmarku warto zrobić wariant:

```text
vegetation
  -> spatial cell 64–128 m
      -> InstancedMesh per model/material
```

Każda komórka ma wtedy sensowny bounding volume i może korzystać z frustum culling.

Trade-off:

- więcej potencjalnych draw calls;
- mniej vertex/fragment work poza kadrem.

Nie wdrażać bez pomiaru. Przetestować kilka rozmiarów cell.

Rekomendacja: **priorytet B / benchmark first**.

---

# 17. Ground decals: blood, footprints, scorch marks

Planowane blood traces dobrze pasują do taniej infrastruktury:

- pooled/instanced ground quads;
- limit liczby;
- lifetime;
- fade bucketami;
- weather-driven fade;
- alpha-test lub alphaHash zamiast ciężkiego blending, gdzie wygląda dobrze.

Ta sama infrastruktura może później obsłużyć:

- footprints w snow;
- mud footprints;
- scorch marks;
- małe dirt patches.

Rekomendacja: **priorytet B**.

---

# 18. Fog

Obecny linear fog jest tani i przydatny.

Warto A/B sprawdzić bardziej atmosferyczną charakterystykę dla:

- storm;
- mist;
- swamp;
- morning.

Nie trzeba dodawać volumetric fog.

Podstawowa zasada: sky color i fog color muszą pozostać spójne.

Rekomendacja: **B, po ważniejszych efektach**.

---

# 19. Post-processing

Nie rekomenduję budowania rozbudowanego `EffectComposer` pipeline na tym etapie.

`EffectComposer` używa pośrednich render targets i kolejnych passes:

https://threejs.org/docs/pages/EffectComposer.html

Na mobile to dodatkowy koszt bandwidth/fill-rate.

## Decyzje

| Efekt | Rekomendacja |
|---|---|
| bloom | późniejszy eksperyment high-only |
| LUT grading | niepotrzebne na początku |
| SSAO | później, eksperymentalnie |
| GTAO | tylko high i po realnych pomiarach |
| DoF | nie |
| motion blur | nie |
| SSR | nie |
| volumetric fog | nie |
| volumetric clouds | nie |
| god rays | nie jako default |
| chromatic aberration | nie |
| film grain | nie |

Three.js opisuje SSAO jako podstawowe AO, a GTAO jako lepszej jakości, ale droższe.

Źródła:

- https://threejs.org/docs/pages/SSAOPass.html
- https://threejs.org/docs/pages/GTAOPass.html

---

# 20. WebGPU / TSL

Three.js `WebGPURenderer` potrafi używać WebGPU, a jeśli nie jest dostępne — ma backend WebGL2.

Źródło:  
https://threejs.org/docs/pages/WebGPURenderer.html

Jednocześnie oficjalny manual nadal opisuje renderer jako experimental i zaznacza, że zależnie od sceny `WebGLRenderer` może nadal mieć lepszą wydajność. `WebGLRenderer` pozostaje rekomendowany dla aplikacji celujących bezpośrednio w WebGL2.

Źródło:  
https://threejs.org/manual/pages/webgpurenderer

Wniosek:

- nie migrować teraz tylko „dla wydajności”;
- utrzymać WebGLRenderer jako produkcyjny;
- izolować custom shaders/material factories;
- unikać rozsiewania `onBeforeCompile` po całym kodzie;
- w przyszłości zrobić osobną gałąź benchmarkową WebGPU/TSL.

WebGPU jest dobrym tematem na osobny późniejszy research, nie warunkiem poprawy obecnej grafiki.

---

# 21. Zachować Lambert jako domyślny materiał świata

Nie rekomenduję masowego przejścia na `MeshStandardMaterial`.

Obecny pipeline słusznie upraszcza materiały.

Zamiast tego:

```text
terrain        -> Lambert/custom extension
vegetation     -> Lambert/custom wind shader
water          -> dedicated custom shader
wet terrain    -> cheap custom response
metal weapons  -> selected Phong/Standard
hero items     -> optional Standard
reszta świata  -> Lambert
```

Dzięki temu PBR kosztuje tylko tam, gdzie faktycznie go widać.

---

# 22. Draw calls

Obecne draw calls w settlement są istotnym kosztem.

Three.js wspiera `InstancedMesh` i `BatchedMesh` jako mechanizmy redukcji draw calls.

Najbardziej oczywisty problem repo: postacie 7–12 draw calls/os.

Dalsza optymalizacja postaci powinna skupiać się na:

- mniejszej liczbie materials;
- atlas textures;
- łączeniu kompatybilnych skinned primitives;
- współdzieleniu skeleton/animation data, gdzie możliwe.

Redukcja draw calls postaci daje później „budżet” na inne efekty.

---

# 23. Docelowe profile jakości

## Low / mobile

- dynamic resolution;
- no shadow map;
- blob actor shadows;
- procedural sky;
- simple clouds;
- shader vegetation wind;
- shader wet/snow;
- simple animated water;
- GPU rain/snow;
- emissive fire/windows;
- Lambert world;
- KTX2;
- agresywny LOD.

## Medium

Dodatkowo:

- directional near shadow;
- lepszy water Fresnel/specular;
- większy vegetation radius;
- więcej particles;
- lepsze clouds.

## High

Dodatkowo:

- większa shadow resolution/radius;
- większy vegetation distance;
- więcej particles;
- water displacement;
- opcjonalny eksperymentalny AO/bloom.

Różnice między profilami powinny dotyczyć głównie ilości/resolution/range, a nie zupełnie innego stylu.

---

# 24. Proponowana kolejność wdrożenia

1. tone mapping + exposure;
2. procedural sky + sun/moon/stars/clouds;
3. vegetation wind w vertex shader;
4. shader wet/snow/season;
5. custom water shader;
6. GPU precipitation;
7. dynamic resolution;
8. KTX2 texture pipeline;
9. shadow/contact-shadow redesign;
10. emissive settlements at night;
11. lepszy fire/sparks/smoke;
12. LOD hysteresis/transitions;
13. vegetation spatial culling benchmark;
14. decals: blood/footprints;
15. dopiero później eksperymenty FXAA/AO/bloom.

---

# 25. Benchmarki wymagane przed dalszymi efektami

Obecny benchmark renderingu jest dobrym początkiem, ale nie daje reprezentatywnego GPU/mobile.

Stałe sceny:

- dense forest;
- small settlement;
- crowded settlement;
- night settlement;
- rain/storm;
- snow;
- water/coast;
- combat;
- fast traversal.

Zapisywać:

- viewport resolution;
- drawing-buffer resolution;
- actual render scale;
- quality profile;
- frame median/p95/p99;
- render CPU;
- draw calls;
- triangles;
- textures;
- active point lights;
- shadow casters;
- vegetation instances;
- particle counts;
- heap, gdzie dostępny.

Każdy nowy efekt porównywać:

```text
baseline
feature on
feature off
```

na tej samej scenie i urządzeniu.

Docelowo potrzebne są realne pomiary przynajmniej na:

- laptopie z integrated GPU;
- mid-range Android;
- urządzeniu iOS/iPadOS, jeżeli jest oficjalnym targetem.

---

# 26. Końcowa rekomendacja

Renderer nie wymaga wymiany.

Największy skok wizualny przy najmniejszym koszcie powinien pochodzić z:

1. **procedural sky**;
2. **vegetation wind w vertex shader**;
3. **shader wet/snow terrain**;
4. **taniego custom water shader**;
5. **tone mapping + lepszego lighting calibration**.

Najważniejsze optymalizacje wspierające:

1. **dynamic resolution**;
2. **KTX2/Basis**;
3. **GPU precipitation**;
4. **tańsze shadows / blob shadows**;
5. **redukcja draw calls postaci**.

Nie rekomenduję ciężkiego, post-processingowego kierunku graficznego. Dla dużego outdoor world działającego w browser + mobile większą wartość daje połączenie:

**art direction + shaderowe environment effects + instancing + LOD + rozsądny resolution/texture budget.**

---

# Źródła

Oficjalna dokumentacja i materiały wykorzystane w research:

- MDN — WebGL Best Practices  
  https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- Three.js — WebGLRenderer  
  https://threejs.org/docs/pages/WebGLRenderer.html
- Three.js — MeshLambertMaterial  
  https://threejs.org/docs/pages/MeshLambertMaterial.html
- Three.js — Responsive Design / HD-DPI  
  https://threejs.org/manual/pages/responsive.html
- Three.js — KTX2Loader  
  https://threejs.org/docs/pages/KTX2Loader.html
- Three.js — Shadows  
  https://threejs.org/manual/pages/shadows.html
- Three.js — Material / alphaHash / alphaToCoverage  
  https://threejs.org/docs/pages/Material.html
- Three.js — LOD / hysteresis  
  https://threejs.org/docs/pages/LOD.html
- Three.js — EffectComposer  
  https://threejs.org/docs/pages/EffectComposer.html
- Three.js — SSAOPass  
  https://threejs.org/docs/pages/SSAOPass.html
- Three.js — GTAOPass  
  https://threejs.org/docs/pages/GTAOPass.html
- Three.js — WebGPURenderer  
  https://threejs.org/docs/pages/WebGPURenderer.html
- Three.js — WebGPURenderer manual / migration notes  
  https://threejs.org/manual/pages/webgpurenderer
- glTF Transform  
  https://gltf-transform.dev/
