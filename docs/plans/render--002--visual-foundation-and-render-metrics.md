# Render: fundament wizualny (światło, niebo, teren, materiały) i metryki renderu

**Status:** in_progress  
**Model:** sonnet for step 3 (terrain material, normals, tint uniforms — draft code in "Wynik") and step 4 implementation; opus for keep/drop decisions, the exit gate and the wave review  
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

**Precondition (D-PERF-4, 2026-10-01):** [`diag--002`](diag--002--render-benchmark-trust.md) step 1 (startup result class) runs before this step, and again after it — terrain changes chunk build cost, which the steady-state gate does not see. Compare `chunks.build` and first-frame `render.prep` before/after.

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
- **Baseline done (session 4, quiet machine):** `bench:render low`/`medium` twice each and `bench:sim` twice + `--update-baseline` (reason: whole-run quantiles; unmodified `ffa2380` shows the same p95 jump). `bench:render` fixed to measure ≥ 60 frames per static scene (SwiftShader medium ≈ 2 fps gave only ~10 samples in the old 6 s window, so p95 = max). PERF.md rewritten in English with both baselines and the device checklist (❓ user, D-PERF-2). **Decision for step 1: needed** — march vegetation rebuild p95 9.8–38.7 ms > 8 ms.
- *(superseded)* Not done yet: a clean baseline (the only run so far overlapped with the reviewer subagent → CPU contention, not usable); PERF.md rewrite in English with the baseline + device checklist; `bench:sim` baseline refresh (quantile method changed from last-512 ring to whole run — rerun twice, then `--update-baseline` with this justification).
- First (noisy) observations: snow triggers vegetation rebuilds (n=3, ~24 ms) and terrain rebuilds (season/snow tint baked into vertex colours — step 3 moves it to uniforms); march p95 veg rebuild ~20 ms in the noisy run → re-measure before deciding step 1.

**Step 1 — vegetation streaming (done, session 4, keep):**
- Measured first (step 0 baseline): march at 10 m/s vegetation rebuild p95 9.8–38.7 ms > 8 ms → needed.
- `Vegetation.update`: the first build is synchronous; later rebuilds run as a generator job (gather per node chunk → compose matrices into staging `Float32Array`s in slices of 256 → commit with one typed-array copy per set), budget `VEG_BUDGET_MS` = 2.5 ms per frame, at least one step per frame. The previous instances stay fully visible until the commit (no half-updated forest). Idle frames prefetch one missing node chunk in the ring `vegFar + 128 m` (`NodeCache.has`, timer `render.vegetationPrefetch`). `render.vegetationRebuild` now measures the per-frame slice.
- Tests: `render/vegetation.test.ts` (sliced rebuild keeps old instances and ends equal to a full rebuild; prefetch one chunk per frame).
- `bench:render medium` (one run, vs baseline): march `render.prep` p95 7.95 ms (−62%), vegetation rebuild p95 3.8 ms (max 3.8, was 24–38.7); all static scenes ok (−13…−61%, partly from the review 009 allocation/scan fixes). Crowded-settlement showed one 14.8 ms slice right after its teleport (node chunks not prefetched there — teleport case). **Not yet done:** `bench:render low` and a second medium run to confirm (session interrupted before them).

**Step 2 — light/sky (in progress, uncommitted work landed in the checkpoint commit behind flags; defaults = old look):**
- `render/visualFlags.ts` (localStorage `sv-visual` overrides: tone none/aces/agx/neutral, exposure, sky flat/dome, smooth, detail), `render/atmosphere.ts` (one parameter set: zenith/horizon/fog/sun/hemisphere/sun direction), `render/sky.ts` (gradient dome + sun disc, tone mapped). `Renderer.lighting()` keeps the old path verbatim for `sky: flat`.
- A/B tool `scripts/e2e/ab.mjs [quality] 'label={flags}' …` → `test-results/ab/ab-<frame>.png` montages (6 frames: settlement noon/dusk/night, overcast, meadow hills, mountain river). First run done (before / dome / dome+ACES / dome+AgX×1.2) but **not yet reviewed**; it logged one 404 console error (unknown resource — check).
- **Session 5 — reviewed and decided (D-REN-9):** montages `before / dome / dome+ACES / dome+AgX×1.2` (medium, 6 frames). ACES crushes shadows and makes dusk/night unreadable; AgX washes out the biome colours; the dome sky alone keeps the palette and adds a gradient + sun disc. **Keep: dome sky (default on all profiles). Drop as default: tone mapping** (stays a flag; a palette recalibration would be an aesthetic call for the user — ❓). The 404 was the A/B montage page asking for `favicon.ico` (harness only; the e2e logs now name the failing URL).
- **Shadow texel snapping (keep):** `render/shadowSnap.ts` snaps the shadow camera centre to whole texels (90 m / mapSize) in light space; sun position = snapped target + direction × 150. Test `render/shadowSnap.test.ts` (RENDER-04). Bias/normalBias unchanged (no acne seen in the A/B frames). The slow sun rotation still re-rasterises shadows over time — acceptable.
- Step-1 confirmation: the cloud container (4-core Xeon) cannot use the WSL baseline (D-PERF-5); confirmation runs on the user's machine (❓). Cloud runs on `35b4b11`: low/medium in PERF.md "Cloud container".


**Step 3 — draft (session 4, not wired in, not verified):** planned approach — keep vertex colours for biome/patch/road/rock/beach, write per-vertex masks `aTint` (x = grass share that fades with season = grass biome × (1 − rock) × (1 − road) × (1 − beach) weights from `colorAt`; y = slope < 0.9 for snow) at chunk build, apply season/snow in the shader from uniforms (then `tintChanged` no longer dirties all chunks — medium snow showed terrain p95 11.8 ms from that rebuild wave). Smooth normals: analytic central differences of `heightAt` with a fixed 2 m step for every LOD (LOD-independent → no seams; reuse the height grid when step = 2), skirts copy edge normals, `flatShading` off behind `visual.smooth`. Detail: procedural 256² value-noise `DataTexture` in world metres (no asset), fade 25–110 m, medium/high only. Draft material module:

```ts
/**
 * Terrain material (render--002 step 3): Lambert with the season and snow tint as uniforms — a season or
 * weather change no longer rebuilds chunks — and an optional world-space ground detail texture
 * (medium/high, D-PERF-2). Per-vertex masks (`aTint`: x = grass share that fades in autumn/winter,
 * y = surface flat enough to hold snow) are written at chunk build time; the ground type is never
 * reconstructed from the final colour.
 * @domain render
 * @subdomain terrain
 */
import * as THREE from 'three'

/** Colours the tint fades towards (linear, like the vertex colours). */
const DRY = new THREE.Color(0xb3a55a)
const SNOW = new THREE.Color(0xf0f4f8)

export interface TerrainShading {
  /** 0 = summer, up to ~0.8 = faded autumn/winter grass. */
  season: { value: number }
  /** 0..1 snow cover. */
  snow: { value: number }
}

/** Small tiling value-noise texture (R fine grain, G coarse blotches), generated once — no asset needed. */
function detailTexture(): THREE.DataTexture {
  const N = 256
  const data = new Uint8Array(N * N * 4)
  let s = 0x9e3779b9
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const lattice = (cells: number) => {
    const g = Float32Array.from({ length: cells * cells }, rnd)
    return (x: number, y: number) => {
      const fx = (x / N) * cells
      const fy = (y / N) * cells
      const i = Math.floor(fx)
      const j = Math.floor(fy)
      const tx = fx - i
      const ty = fy - j
      const sx = tx * tx * (3 - 2 * tx)
      const sy = ty * ty * (3 - 2 * ty)
      const at = (a: number, b: number) => g[((b % cells) * cells + (a % cells)) % (cells * cells)]!
      const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx
      const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx
      return a + (b - a) * sy
    }
  }
  const fine = lattice(64)
  const mid = lattice(16)
  const coarse = lattice(4)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = (y * N + x) * 4
      data[k] = Math.round((fine(x, y) * 0.65 + mid(x, y) * 0.35) * 255)
      data[k + 1] = Math.round(coarse(x, y) * 255)
      data[k + 2] = 0
      data[k + 3] = 255
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.needsUpdate = true
  return t
}

export function createTerrainMaterial(opts: { smooth: boolean; detail: boolean }): { material: THREE.MeshLambertMaterial; shading: TerrainShading } {
  const shading: TerrainShading = { season: { value: 0 }, snow: { value: 0 } }
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: !opts.smooth })
  const detail = opts.detail ? detailTexture() : null
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uSeason = shading.season
    sh.uniforms.uSnow = shading.snow
    sh.uniforms.uDry = { value: DRY }
    sh.uniforms.uSnowC = { value: SNOW }
    if (detail) sh.uniforms.uDetail = { value: detail }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aTint;\nvarying vec2 vTint;\nvarying vec2 vGroundXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;\nvGroundXZ = position.xz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uSeason;\nuniform float uSnow;\nuniform vec3 uDry;\nuniform vec3 uSnowC;\nvarying vec2 vTint;\nvarying vec2 vGroundXZ;${detail ? '\nuniform sampler2D uDetail;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, uDry, uSeason * 0.45 * vTint.x);
diffuseColor.rgb = mix(diffuseColor.rgb, uSnowC, uSnow * 0.85 * vTint.y);${detail ? `
{
  // Ground detail in world metres: fine grain every ~3 m, blotches every ~40 m; fades out with distance (no moiré).
  float fine = texture2D(uDetail, vGroundXZ / 3.2).r;
  float blot = texture2D(uDetail, vGroundXZ / 41.0).g;
  float fade = 1.0 - smoothstep(25.0, 110.0, length(vViewPosition));
  diffuseColor.rgb *= 1.0 + ((fine - 0.5) * 0.22 * fade + (blot - 0.5) * 0.12);
}` : ''}`)
  }
  material.customProgramCacheKey = () => `terrain:${opts.detail ? 1 : 0}`
  return { material, shading }
}

export function disposeTerrainMaterial(m: THREE.MeshLambertMaterial) {
  m.dispose()
}
```
