# Render: fundament wizualny (światło, niebo, teren, materiały) i metryki renderu

**Status:** in_progress  
**Domain:** render  
**Sub domains:** lighting, sky, terrain, materials, diag, assets  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 4a — przed `render--001`)  
**Created:** 2026-10-01  
**Finished:** —

---

Źródła: [research 002 — realistyczniejsza grafika](../research/2026-10-01--002--realistic-visuals-practical-roadmap.md) (podstawa), [review 005 raportu 001](../reviews/2026-10-01--005--rendering-research-critical-review.md), [research 001](../research/2026-10-01--001--rendering-high-impact-low-cost.md) (tylko katalog kierunków — nie plan, patrz review 005 R1–R5). Wizja: [VISION-APPENDIX.md](../VISION-APPENDIX.md) „Kierunek graficzny” (low-poly nie ogranicza realistycznego designu, jeśli nie kosztuje dużo FPS).
FEATURES: `PERF-02`, `RENDER-04`. Decyzje: **D-REN-5**, **D-REN-6**, **D-REN-7**, **D-PERF-2**.

## Po co osobny plan i dlaczego przed `render--001`

Research 002 i review 005 zgodnie wskazują, że największe powierzchnie obrazu (teren, otoczenie) mają dziś najbardziej uproszczony wygląd: teren `MeshLambertMaterial` z `flatShading: true` i tintem wypalanym w vertex colors (`terrainChunks.ts:68`, `:195`), otoczenie przez `toLambert()` (`assets.ts:52`). Efekty z `render--001` (mokry teren, śnieg, ogień, opady) dotykają tych samych materiałów i tego samego światła. Kolejność **fundament → efekty** jest więc zależnością techniczną, nie preferencją: WEATHER-02 na obecnym materiale terenu oznaczałby dalsze wypalanie w kolorach wierzchołków i przebudowy chunków, a potem przepisanie na uniformy.

Fakty z kodu sprawdzone 2026-10-01 na `d058700` (✅): teren Lambert + flatShading + `computeVertexNormals()` per chunk, brak UV; `Renderer.ts` bez tone mappingu i `scene.environment`, `antialias` tylko na high i niezmienny po `setQuality()`; `diag/perf.ts` ring 512; `build-assets.mjs` `baseColorOnly()`; `snowCover` liczony w `Renderer.ts:154`, nie w sim.

## Krytyczna ocena źródeł (co przyjmujemy, co korygujemy)

- **Przyjęte:** zostajemy na Three.js/WebGL2; mały pierwszy pakiet zamiast 15 równoległych wdrożeń (R1); każdy eksperyment z timeboxem, fallbackiem i decyzją keep/drop; koszt GPU = hipoteza dopóki niezmierzony (R2); PBR selektywnie, nie masowo (R3); zależności pipeline assetów jawnie (R4); najpierw poprawne metryki, potem adaptive quality (R5).
- **Korekta 1 — pomiar na sprzęcie nie może blokować autonomicznej pętli.** Research wymaga laptopa/Androida/iPhone'a; sesje agenta mają tylko headless SwiftShader. Dzielimy weryfikację na dwa poziomy (D-PERF-2): *headless* (agent: CPU phases, `renderer.info`, liczba programów/świateł, zrzuty `tour.mjs`, brak regresji e2e) i *urządzenie* (użytkownik: RAF pacing, GPU timer, 10–15 min na telefonie). Bez danych z urządzenia efekt może być domyślnie włączony na medium/high, ale na low — tylko jeśli nie dodaje pracy per piksel (np. gładkie normalne tak, PBR/IBL nie). Status w FEATURES: `implemented_unverified` z dopiskiem „wydajność urządzeń niezweryfikowana”, dopóki użytkownik nie dostarczy pomiaru.
- **Korekta 2 — bramka ≤5% / ≤10% p95** stosujemy tylko do metryk mierzalnych w danym środowisku. Headless: przygotowanie renderu = `render.cpu` − `render.draw` (fazy JS), `render.terrain` (budowa chunków), `render.vegetationRebuild`, draw calls/trójkąty/programy. `render.draw` (zawarty w `render.cpu`) na SwiftShader obejmuje programową rasteryzację — raportować jako słaby wskaźnik kosztu per piksel, bez bramki i bez przenoszenia na hardware. Zmiany poniżej szumu WSL (±20% p95) = nierozstrzygnięte, nie „zaliczone”.
- **Korekta 3 — szacunki w dniach** (research §4) to praca człowieka; dla agenta to limity zakresu: jeśli krok przekracza zakres opisany niżej, zawęzić albo odłożyć, nie rozbudowywać.
- **Korekta 4 — zmiana wyglądu całego świata** (gładkie normalne, tone mapping) jest decyzją estetyczną, której headless nie rozstrzygnie. Agent przygotowuje A/B (zrzuty przed/po, te same kadry) i wybiera wariant wg bramki wartości z research §8; ostateczna akceptacja kierunku należy do użytkownika (zapisane jako ❓ w PROGRESS, nie blokuje dalszych kroków — wariant za flagą/profilem).
- **Korekta 5 — tone mapping przesunie całą paletę** (mgła, tło, hemisfera, kolory biomów i sezonów kalibrowane pod brak tone mappingu). Wliczyć rekalibrację palety w krok 2, inaczej „lepsze światło” da wyprane kolory.
- **Odrzucone w tym planie:** GPU-update opadów (R10 — brak dowodu bottlenecku), throttling shadow map (R11), alphaHash LOD fade (R13), migracja WebGPU/TSL, TAA/upscaling, SSR/SSGI/wolumetria, light probes/lightmapy (research §6) — patrz `render--003` lub odłożone.

## Kroki

Każdy krok: timebox = zakres poniżej; po kroku zapis w PERF.md (headless), zrzuty przed/po z tych samych kadrów, decyzja keep/drop w „Wynik”. Fallback zawsze opisany.

### 0. Metryki i sceny A/B (PERF-02) — przed jakąkolwiek zmianą wyglądu

1. `diag/perf.ts`: kwantyle i max liczone z tego samego okna co `samples/mean/overBudget` (dziś p95 z ostatnich 512 próbek, średnia z całego przebiegu) — eksport okien albo histogram całego testu.
2. RAF pacing: czas między callbackami `requestAnimationFrame`, p50/p95/p99, udział klatek > 16.7 / 33.3 / 50 ms — osobno od `frame` (synchroniczny JS).
3. Opcjonalny GPU timer `EXT_disjoint_timer_query_webgl2` (asynchroniczny odczyt, odrzucanie disjoint; brak rozszerzenia = „brak danych”, nie 0). Dostępny w debug API (`window.__sv`) i w `bench:render`, żeby użytkownik mógł zebrać dane na urządzeniu bez narzędzi deweloperskich.
4. `bench:render`: liczba programów shadera i aktywnych świateł; sceny dodatkowe: noc z ogniskami, brzeg wody, deszcz, śnieg, marsz przez granice chunków (teleport osobno jako test hitchy). Te same seed/zapis/kamera/pora/pogoda.
5. Baseline headless przed krokiem 1 → PERF.md. Instrukcja pomiaru na urządzeniu (krótka checklista dla użytkownika: build produkcyjny, 30 s rozgrzewki, 3×60 s naprzemiennie, 10–15 min na telefonie) → PERF.md.
6. Popraw w PERF.md i D-PERF zdanie „czasy CPU są reprezentatywne” → reprezentatywne są czyste fazy JS porównywane w tym samym środowisku; `render.draw` na SwiftShader nie.

Bez nowego dashboardu i frameworka. Zakres: rozszerzenie istniejących `diag/perf.ts`, `render-bench.mjs`.

### 1. Przebudowa roślinności — zmierzyć marsz, amortyzować tylko przy potrzebie

PERF.md: `render.vegetationRebuild` p95 30.7 ms dotyczy **teleportów po 100 m** (13 próbek); przy marszu przebudowa co ~64 m kosztuje ~5 ms. Gra nie ma teleportacji (podróż tylko fizyczna), więc research 002 §7.2 przecenia pilność tego długu dla zwykłej rozgrywki. Kroki:

1. Dodać do `bench:render` scenę marszu/biegu (i jazdy z wózkiem) przez granice chunków — steady state, nie teleport.
2. Jeśli p95 `render.vegetationRebuild` przy marszu > 8 ms (budżet budowy chunka) **albo** kroki `render--001` (kępy trawy) / `world--001` (landmarki) go przekroczą → rozłożyć generację węzłów i wypełnianie instancji na klatki, stara reprezentacja do gotowości nowej (prefetch w pierścieniu `vegFar`, jak w PERF.md „Poprawa”).
3. Teleport (wczytanie zapisu, respawn, debug) — tylko jako test hitchy; akceptowalny ekran/ukrycie przy wczytaniu.

Mierzalne headless (CPU). Nie włączać `frustumCulled=true` bez poprawnych bounds (spatial batches → `render--003`).

### 2. Światło, ekspozycja, tone mapping, niebo, mgła

- A/B: obecny obraz vs `ACESFilmicToneMapping` vs `AgXToneMapping` przy dobranej ekspozycji; dzień / zachód / noc / pochmurno. Nie zakładać zwycięzcy.
- Jeden zestaw parametrów pory dnia i pogody steruje: kolorem/kierunkiem słońca, hemisferą, mgłą, kolorem nieba, ekspozycją. Tarcza słońca zgodna z kierunkiem cienia.
- Niebo: low — kopuła z gradientem horyzont–zenit + tarcza słońca; medium — krótki A/B z addonem `Sky`. Zachmurzenie na tym etapie tylko jako parametr koloru/światła (warstwa chmur = WEATHER-01 w `render--001`, w tym samym materiale nieba).
- Rekalibracja palety biomów/sezonów pod tone mapping (korekta 5). Noc musi pozostać czytelna na telefonie.
- Shadow: stabilizacja frustum (texel snapping), bias/normalBias; bez zwiększania rozdzielczości.
- **Stop:** dobrze wygląda tylko w południe albo wymaga kaskady filtrów kolorów. Fallback: obecna mgła + gradient nieba.

### 3. Teren: gładkie normalne + detal gruntu

- Wyłączyć `flatShading`; normalne z heightfieldu próbkowanego także poza krawędzią chunka, wg reguły niezależnej od LOD (inaczej szwy między chunkami/LOD; skirts nie gwarantują ciągłości normalnych).
- Tint sezonu/śniegu jako uniformy zamiast wypalania w vertex colors → mniej `dirty chunks` (mierzalne headless: liczba przebudów przy zmianie pory roku/pogody). To przygotowuje WEATHER-02.
- Współrzędne świata XZ w metrach jako UV + 1–2 tekstury detalu (trawa/grunt, ziemia/kamień), 512–1024 px. Maski droga/biom/nachylenie zapisane przy budowie chunka jako atrybut — **nie odtwarzać rodzaju podłoża z finalnego RGB**. Vertex colors zostają jako makrozróżnicowanie (uważać na podwójne barwienie).
- Low: detail albedo na Lambert. Medium: wybrane warstwy z normal/roughness dopiero po kroku 4.
- Źródło tekstur: Poly Haven (CC0) lub własne; wpis w `docs/assets/README.md` (URL, licencja, konwersja). Tekstury nowe — nie zależą od `_temp/`.
- **Stop:** szwy LOD, migotanie detalu, potrzeba pełnego triplanar przed widocznym zyskiem. Fallback: gładkie normalne + vertex colors (sam ten wariant też jest wartościowy i tani).

### 4. Pilotaż selektywnego PBR + IBL (jeden asset)

- Jeden pilot: skała blisko gracza **albo** fragment gruntu — `MeshStandardMaterial` z roughness/normal i małą mapą środowiska z PMREM przygotowaną przy ładowaniu (nie z całej sceny co klatkę). Intensywność IBL zależna od pory dnia; przenikanie dwóch PMREM to osobna implementacja — dopiero, gdy przełączanie jest widoczne.
- `assets.ts`: polityka materiałów per klasa assetu i profil (klucz cache rozróżnia warianty; nie modyfikować wspólnego materiału). Sprawdzić, czy `mergeTemplate()` zachowuje potrzebne UV/grupy (dziś bierze pierwszy materiał i usuwa atrybuty spoza color/normal/position/uv).
- Mapy: `build-assets.mjs` `baseColorOnly()` je usuwa, a `_temp/extracted` nie jest w git (lokalnie są tylko zipy; w chmurze brak). Dlatego pilot **na nowej teksturze CC0**, nie na odbudowie paczek. Odbudowa paczek z mapami = osobna decyzja po pilocie.
- Porównanie trzech wariantów (review R3): Lambert; Lambert + gładki teren + detail; Standard + IBL. Low pozostaje na Lambert.
- **Stop:** wzrost kosztu pełnoekranowego przy małej różnicy albo utrata spójności stylu. Fallback: wybrane obiekty PBR, reszta Lambert. Materiał nie poprawi kanciastej sylwetki modelu — wymiana placeholderów to osobna sprawa (D-REN-3).

### 5. Kontakt z podłożem (opcjonalnie, jeśli A/B kroku 2–4 pokaże „lewitowanie”)

Low (bez shadow map): blob shadows pod graczem i bliskimi aktorami (limit liczby i dystansu, próbkowanie nachylenia). Nie dublować z shadow mapą na medium. Bez cieni świateł punktowych (D-REN-7).

## Bramka wyjścia (fala 4a → 4b)

- Kroki 0–3 keep albo drop z zapisem; krok 4 rozstrzygnięty (keep → polityka materiałów gotowa do użycia w `render--001`; drop → uzasadnienie).
- Headless: cały pakiet ≤10% regresji p95 przygotowania renderu (`render.cpu` − `render.draw`) vs baseline z kroku 0 (nie sumować „po 10%” na krok); `pnpm check`, e2e zielone; brak nowych błędów konsoli; liczba programów shadera nie rośnie kombinatorycznie (warianty kompilowane przy ładowaniu / zmianie profilu, nie w trakcie gry).
- Urządzenie: checklista pomiaru przekazana użytkownikowi w PROGRESS.md (❓ dopóki brak danych).

## Ryzyka

- Szwy normalnych na granicach chunków/LOD — test na 3 seedach.
- Shader stutter przy pierwszym użyciu — kompilacja przy ładowaniu (`renderer.compile`), nie mylić z kosztem stałym.
- Własne poprawki GLSL przez `onBeforeCompile` — małe moduły z `customProgramCacheKey`; po upgrade Three wizualny smoke.
- Pamięć: każda RGBA8 1024² z mipami ≈ 5.3 MiB GPU (PNG na dysku to nie kompresja GPU). Limit pilotażu: +16 MiB low / +32 MiB medium nowych tekstur. KTX2 dopiero przy cięższych teksturach (`render--003`).

## Wynik

*(English per D-LANG-1.)*

**Step 0 — metrics (code done, commit `089bfae`; baseline pending):**
- `diag/perf.ts`: quantiles from a whole-run log histogram (2% buckets), so median/p95/p99, max, mean and overBudget share one window; `perf.shareAbove()`. Test `diag/perf.test.ts` (PERF-02).
- RAF pacing: `raf.interval` timer in `Game.start`; GPU timer `render/gpuTimer.ts` (EXT_disjoint_timer_query_webgl2, async readback, disjoint dropped; no extension = `gpu.timerAvailable` 0, no data). `window.__sv.pacing()` returns RAF p50/p95/p99, share > 16.7/33.3/50 ms, CPU frame and GPU quantiles — for the user's device checklist.
- `render.prep` timer (= render.cpu without draw submission, the D-PERF-2 gate metric); gauges `render.programs`, `render.lights` (light count refreshed every 120 frames).
- `bench:render` now starts its own Vite server (`scripts/e2e/server.mjs`), waits until `chunks.pending` = 0 before measuring, and has the scenes small/crowded settlement, dense forest, night with campfires, water shore, rain, snow, steady march along a road at 10 m/s, and a teleport hitch test. Screenshots per scene.
- **Not done yet:** a clean baseline (the only run so far overlapped with the reviewer subagent → CPU contention, not usable); PERF.md rewrite in English with the baseline + device checklist; `bench:sim` baseline refresh (quantile method changed from last-512 ring to whole run — rerun twice, then `--update-baseline` with this justification).
- First (noisy) observations: snow triggers vegetation rebuilds (n=3, ~24 ms) and terrain rebuilds (season/snow tint baked into vertex colours — step 3 moves it to uniforms); march p95 veg rebuild ~20 ms in the noisy run → re-measure before deciding step 1.

**Step 2 — light/sky (in progress, uncommitted work landed in the checkpoint commit behind flags; defaults = old look):**
- `render/visualFlags.ts` (localStorage `sv-visual` overrides: tone none/aces/agx/neutral, exposure, sky flat/dome, smooth, detail), `render/atmosphere.ts` (one parameter set: zenith/horizon/fog/sun/hemisphere/sun direction), `render/sky.ts` (gradient dome + sun disc, tone mapped). `Renderer.lighting()` keeps the old path verbatim for `sky: flat`.
- A/B tool `scripts/e2e/ab.mjs [quality] 'label={flags}' …` → `test-results/ab/ab-<frame>.png` montages (6 frames: settlement noon/dusk/night, overcast, meadow hills, mountain river). First run done (before / dome / dome+ACES / dome+AgX×1.2) but **not yet reviewed**; it logged one 404 console error (unknown resource — check).
- Next: review montages, tune exposure/palette (correction 5), pick defaults, keep/drop; shadow texel snapping.

