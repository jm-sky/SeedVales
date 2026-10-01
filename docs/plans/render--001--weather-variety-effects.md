# Render: pogoda, życie sceny (ogień, wiatr, woda), różnorodność postaci i zwierząt, dekale

**Status:** planned  
**Domain:** render  
**Sub domains:** weather, actors, terrain, effects, vegetation, water, assets  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 4b — po `render--002`)  
**Created:** 2026-09-30  
**Updated:** 2026-10-01 — korekta stanu wyjściowego i kolejności wg [research 002](../research/2026-10-01--002--realistic-visuals-practical-roadmap.md) i [review 005](../reviews/2026-10-01--005--rendering-research-critical-review.md)  
**Finished:** —

---

Źródło: [VISION-APPENDIX.md](../VISION-APPENDIX.md) — „Modele postaci”, „Zwierzęta”, „Ślady”, „Pogoda”, „Kierunek graficzny”.
FEATURES: `WEATHER-01`, `WEATHER-02`, `CHAR-01`, `FAUNA-09`, `TRACE-01` (render), `RENDER-03`, `RENDER-05`.
Decyzje: **D-REN-5**, **D-REN-6**, **D-REN-7**, **D-PERF-2**.

**Zależność:** zaczynać po bramce wyjścia [`render--002`](render--002--visual-foundation-and-render-metrics.md) — metryki (krok 0), wspólne parametry światła/nieba (krok 2) i materiał terenu z uniformami (krok 3). Kroki 4 (CHAR-01) i 5 (FAUNA-09) nie zależą od fundamentu i mogą iść wcześniej/równolegle.

## Stan wyjściowy (sprawdzony w kodzie 2026-10-01, `d058700`)

- **Opady już istnieją:** `dynamics.ts` — 2500 punktów deszczu/śniegu wokół kamery; liczba nie zależy od profilu jakości. Poprzednia wersja planu („brak widocznych opadów”) była nieaktualna. Nie budować drugiego systemu — ulepszać istniejący.
- **Ogień:** stożki + pula `MAX_LIGHTS=6` świateł ognisk **plus** `playerLight` (pochodnia) = 7 `PointLight` w każdym programie oświetlanym; intensity 0 nie usuwa pętli światła z shadera. Brak limitu per profil.
- **Mokrość/śnieg:** w sim jest tylko `weather.wetness`; `snowCover` wylicza renderer (`Renderer.ts:154`: zima + śnieg/wilgoć → 0.8) i wypala w vertex colors terenu (przebudowa chunków przy zmianie tintu). Brak trwałej pokrywy śnieżnej w sim/save.
- Postacie: głowa UBC + stroje Peasant/Ranger + UAL1 (D-REN-1), 7–12 draw calli/os.; `build-assets.mjs` już próbuje `unifySkins/flatten/join` — bez efektu (znane ograniczenie). Brak wariantów włosów/brody/skali/tintu.
- Woda: Lambert, `opacity 0.78`, `depthWrite=false`, powierzchnie per chunk + ocean.
- Roślinność: instancing near + proceduralne bryły far, bez ruchu.
- Brak modeli części zwierząt (D-REN-3). `_temp/` lokalnie zawiera tylko zipy, w sesji chmurowej brak — tylko `public/assets/`.

## Kroki

Każdy krok: timebox i fallback jak niżej; po kroku `pnpm bench:render medium` (+ sceny z `render--002` krok 0) → PERF.md, zrzuty `tour.mjs` przed/po, decyzja keep/drop. Limity per profil to **wartości pilotażowe do pomiaru**, nie potwierdzone bezpieczne konfiguracje (research 002 §7.1).

1. **RENDER-03 — ogień i pula świateł.** Flipbook płomienia (mały atlas) na kilku billboardach zamiast stożków, pooling iskier, nieregularna faza per ognisko, limit dymu. Pula świateł stała per profil (pilotażowo low 1 / medium 3 / high 4 — razem z pochodnią gracza, priorytet pochodni), przebudowa puli tylko przy zmianie profilu (rekompilacja akceptowalna), nie per klatka. Sprawdzić faktyczną liczbę świateł w programie (`render.pointLights` + liczba programów). Ognisko musi wyglądać dobrze **bez** bloom. Dalsze ogniska: tylko emissive (nie oświetla otoczenia — świadomy kompromis). Bez cieni świateł punktowych.
2. **WEATHER-01 — chmury i opady.** Chmury: jedna warstwa tekstury/noise w materiale nieba z `render--002` krok 2 (ruch z wiatrem, gęstość z pogody); nie stos przezroczystych billboardów, nie wielooktawowy noise per piksel w pierwszej wersji. Opady: istniejące punkty → deszcz jako krótkie smugi (instanced quads), śnieg jako wolne płatki; liczba z profilu i intensywności (pilotażowo low 400–800 / medium 1000–1600 / high ≤2500). Prosty test schronienia (gracz pod dachem → brak opadu wewnątrz), nie raycasty per cząstka. GPU-update cząstek — tylko jeśli pomiar pokaże koszt CPU (review R10).
3. **WEATHER-02 — mokry teren i śnieg** na materiale terenu z uniformami (`render--002` krok 3): mokrość = przyciemnienie + niższa roughness tam, gdzie jest PBR (na Lambert tylko przyciemnienie — nie pisać własnego modelu połysku „taniego Lamberta”, review R7). Śnieg = maska z normalnej powierzchni i istniejącej sezonowości, bez drugiego mesha terenu i bez przebudowy geometrii przy zmianie uniformu. Semantyka `snowCover` bez zmian (render-derived); trwała akumulacja/topnienie = osobna decyzja sim/save (nie w tym planie).
4. **CHAR-01 — różnorodność postaci:** kolor włosów (blond/brąz/czarne/rude/siwe), warianty brody/braku, fryzury (jeśli są w paczkach), skala X/Z ±5%, Y ±10% (parametry w `calibration.ts`), fallback dziecka = pomniejszony dorosły, tint ubrań (paleta neutralna/zieleń/błękit), łączenie części tylko jeśli dostępne i niefantastyczne. Deterministycznie z id NPC. **Warunek: nie zwiększać draw calli na postać** (tint przez uniform/vertex color, nie nowe materiały). Redukcja 7–12 draw calli to osobny spike w `render--003` — nie blokuje CHAR-01.
5. **FAUNA-09** — młode: skala w dół; prime/alfa: skala w górę + przyciemnienie ~10%. Wymaga cech w sim (`young`, `prime` — wspólne z sim--001 krok 3).
6. **RENDER-05 — wiatr roślinności.** Vertex shader: 1–2 funkcje okresowe, faza z pozycji instancji, maska wysokości/giętkości, nieruchoma podstawa; czas w sekundach renderu (nie kalendarz ×24), siła z pogody. Start na jednym rodzaju (trzciny/krzewy), potem wierzchołki bliskich drzew. Ta sama deformacja w depth/shadow material, bounds poszerzone o max odchylenie, `mergeTemplate()` musi zachować potrzebne wagi. **Stop:** rozjechany cień albo gumowy pień. Fallback: wiatr tylko na kępach bez cieni.
7. **RENDER-05 — woda bez drugiego renderu sceny.** Dwie przesuwane próbki normal mapy (wspólne world UV między chunkami), Fresnel, kolor głębokości/brzegu z maski płytkiej wody liczonej z heightfieldu i lokalnego poziomu wody (odświeżanej po edycji terenu), odbicie nieba/środowiska, połysk słońca. Wybrać opaque vs alpha świadomie (widoczność dna/zanurzonych obiektów, kolejność z deszczem i dekalami). Bez addonu `Water` z reflektorem, SSR, refrakcji, FFT. Fallback: jedna normal map + kolor + Fresnel.
8. **TRACE-01 (render) — dekale:** bounded instanced quads (limit wieku/odległości), alpha z intensywności śladu, polygon offset. Ślady istotne dla tropienia nie znikają na niższym profilu — profil ogranicza tylko czysto wizualny brud.
9. *(opcjonalnie)* kilka kęp gruntu wokół kamery (spatial batches, culling, alpha-cutout; bez milionów źdźbeł) — tylko po kroku 6 i jeśli `render.vegetationRebuild` mieści się w budżecie (`render--002` krok 1).

## Bramka wyjścia

- Cały pakiet fali 4b ≤10% regresji p95 przygotowania renderu (`render.cpu` − `render.draw`) względem stanu po `render--002` (headless; nie sumować dopuszczalnych regresji kroków). Draw calls postaci nie rosną.
- Sceny akceptacji (zrzuty): noc z ogniskami, deszcz, śnieg, brzeg wody, las w wietrze, osada. Bramka wartości: widoczna poprawa przy typowej kamerze, nie tylko na zbliżeniu.
- FEATURES: `verified` dla efektów tylko z dowodem headless + zrzutami; wydajność na urządzeniu jako ❓ w PROGRESS (D-PERF-2).

## Ryzyka

- SwiftShader w headless → FPS niereprezentatywne; porównuj draw calls/trójkąty/programy/CPU.
- Overdraw (ogień, dym, opady, chmury, woda alpha) sumuje się — mierz sceny łączone (noc + deszcz + ogniska), nie tylko pojedyncze efekty.
- Brak `_temp/` → warianty fryzur/bród mogą wymagać prostych proceduralnych siatek; zapisz to jako placeholder w `docs/assets/README.md`.
