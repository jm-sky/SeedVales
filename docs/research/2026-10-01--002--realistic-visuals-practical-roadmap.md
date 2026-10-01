# Realistyczniejsza grafika: największa poprawa przy ograniczonym koszcie

**Data:** 2026-10-01  
**Status:** rekomendacja po niezależnym researchu i self-review; bez implementacji. **Wdrożona do planów 2026-10-01:** [`render--002`](../plans/render--002--visual-foundation-and-render-metrics.md) (fala 4a), [`render--001`](../plans/render--001--weather-variety-effects.md) (4b), [`render--003`](../plans/render--003--visual-polish-and-optimization.md) (fala 6); korekty krytyczne w `render--002` §„Krytyczna ocena źródeł”, decyzje D-REN-6/7, D-PERF-2.  
**Repo:** SeedVales-2, recon na `af30673768aaf9bec62d508cda0f351304896298`  
**Zakres:** laptop i mobile; mały/średni nakład pracy; jakość obrazu, stabilność klatek i koszt utrzymania

## 1. Rekomendacja

**Zachować Three.js/WebGL2. Najpierw poprawić powierzchnie, oświetlenie i atmosferę, potem ruch i wodę. Postprocessing pozostawić opcjonalnym dodatkiem.** Największą szansę na korzystny stosunek efektu do pracy ma zestaw: gładkie normalne terenu + oszczędne tekstury gruntu, naturalne niebo i światło, selektywny PBR, wiatr, animowany ogień oraz prosta woda bez renderowania odbić sceny.

Nie traktować low-poly jako celu artystycznego. Zachować oszczędną geometrię tam, gdzie nie psuje sylwetki, ale dobierać materiały, kolory i światło pod naturalny wygląd. Efekty nie zastąpią charakterystycznych modeli drzew, zwierząt i budynków. Wymiana jednego często widocznego placeholdera może dać więcej niż kolejny filtr ekranu.

**Pierwszy pakiet do wdrożenia:** pomiar referencyjny → światło/niebo → gładki teren z detalem → jeden materiał PBR z IBL → porównanie w ruchu. Dopiero po akceptacji rozszerzać zakres. Nie uruchamiać wszystkich pozycji z tabeli naraz.

To rekomendacja techniczna, a nie wynik porównania screenshotów działającej gry. W tej sesji przeczytano kod i istniejące pomiary; nie uruchamiano gry, nowych benchmarków ani testów urządzeń. Wpływ wizualny jest hipotezą do sprawdzenia w kontrolowanym A/B.

## 2. Metoda i niezależność

1. Przeczytano wskazówki repo, stan, plany, kod renderowania, pipeline assetów i narzędzia benchmarków.
2. Przeprowadzono research źródeł pierwotnych: dokumentacja Three.js, autorzy bibliotek, Khronos, Arm, Mozilla, publikacje autorów technik.
3. Zapisano niezależne rekomendacje przed otwarciem `2026-10-01--001--rendering-high-impact-low-cost.md`.
4. Następnie wykonano oddzielne [krytyczne review raportu 001](../reviews/2026-10-01--005--rendering-research-critical-review.md) i self-review obu dokumentów.

Źródła web sprawdzono 2026-10-01. Dokumentacja online jest ruchoma: przykłady i dokładne API należy sprawdzić z repozytoryjnym **Three.js 0.186.1**, zanim skopiujemy kod. Nie uznaję nowszości techniki ani demonstracyjnego FPS autora za dowód opłacalności w tej grze. Część najlepszych kandydatów to dojrzałe techniki nadal stosowane we współczesnym renderingu.

## 3. Recon: co rzeczywiście istnieje

Ścieżki w tabeli są względne do root repo i odnoszą się do powyższego commita.

| Obszar | Stan potwierdzony w kodzie | Znaczenie dla rekomendacji |
|---|---|---|
| Stack | `package.json` i `pnpm-lock.yaml`: Vue 3.5.42, TS 6.0.2, Vite 8.3.0, Three.js 0.186.1; pnpm | Bez React/R3F; nie proponować migracji UI ani wrapperów React |
| Renderer | `src/game/render/Renderer.ts`: `WebGLRenderer`, bez composera, bez jawnego tone mappingu i `scene.environment` | Obecny pipeline prosty; każdy composer jest nowym kosztem integracji |
| Światło | Sun/moon jako jeden `DirectionalLight`, `HemisphereLight`, dynamiczny kolor tła i liniowa mgła | Dzień/noc i podstawowa atmosfera już są; poprawiać ich spójność |
| Cienie | PCF, 1024 medium / 2048 high; frustum ±45 m; low bez cieni | Najpierw stabilizacja i dobór casterów, nie zwiększanie rozdzielczości |
| Teren | `terrainChunks.ts`: Lambert, `flatShading: true`, vertex colors, normalne obliczane per chunk; LOD 2/4/8/16 m, skirts i superchunki; brak UV terenu | Gładkie normalne i detal gruntu to zmiana szeroko widoczna; teksturowanie wymaga dodania współrzędnych/masek |
| Sezony/śnieg | Tint wypalany w kolorach wierzchołków; zmiana oznacza dirty chunks | Uniformy mogą ograniczyć przebudowy; nie obiecywać zerowego kosztu shaderów |
| Materiały otoczenia | `assets.ts`: `mergeTemplate()` używa `toLambert()`; usuwa atrybuty poza color/normal/position/uv | PBR potrzebuje świadomej zmiany tej ścieżki; dodatkowe UV/wind weights obecnie przepadną |
| Pipeline offline | `build-assets.mjs`: `baseColorOnly()` usuwa normal, metallic-roughness i AO w packach oraz postaciach, ustawia roughness=1, metallic=0; PNG 256–512 i meshopt | Samo przełączenie klasy materiału nie przywróci utraconych map. Potrzebne źródła albo nowe materiały |
| Aktorzy | `actors.ts`: skinned glTF zachowują materiały z GLTFLoader; nie przechodzą przez `toLambert()` | Nieprawdziwe byłoby stwierdzenie „cała gra używa Lambert”. Materiały aktorów mają jednak zubożone dane po konwersji offline |
| Roślinność | `vegetation.ts`: instancing near + proceduralne bryły far, przebudowa po zmianie pół-chunka (~64 m), `frustumCulled=false` | Instancing i LOD już są. Więcej detalu wymaga kontroli zasięgu, przebudów i cieni |
| Woda | Lambert, opacity 0.78, `depthWrite=false`; powierzchnie per chunk i ocean | Jest miejsce na duży skok jakości bez SSR/refraction |
| Pogoda/ogień | `dynamics.ts`: 2500 punktów deszczu/śniegu wokół kamery, stożki ognia, sześć świateł ognisk + jedno gracza | Opady już działają. Nie budować drugiego systemu; jakość nie steruje jeszcze ich liczebnością/pulą świateł |
| Quality | `quality.ts`: low/medium/high; DPR cap 1/1.5/2, dystanse, cienie, modele | Dodać niezależne limity efektów. `setQuality()` nie zmienia MSAA utworzonego kontekstu |
| Diagnostyka | `diag/perf.ts`, `render-bench.mjs`, `Game.frame()`, `renderer.info` | Są CPU timery i liczniki; brak rzeczywistego GPU czasu i pełnej metryki frame pacing |
| Perspektywa | `render--001` planned: pogoda, wet/snow, warianty, dekale, ogień; roadmap fala 4 | Rozszerzyć ten kierunek o materiały/teren/światło, a nie tworzyć konkurencyjny duży projekt |

Aktualna instrukcja użytkownika dopuszcza realistyczny wygląd i ma pierwszeństwo nad dawnym zapisem o stylistyce low-poly. Przy implementacji zaktualizować decyzję D-REN-5 i `rendering-camera-and-art.md`. Ten research nie zmienia samodzielnie statusów FEATURES ani nie oznacza efektów jako wdrożonych.

### 3.1. Benchmarki: dane i granice wnioskowania

Źródło: [PERF.md](../state/PERF.md), raport 2026-09-30 po wcześniejszym stanie kodu (GEN 7/SAVE 4), nie pomiar dzisiejszego HEAD.

| Scena medium | `render.cpu` mediana / p95 | Draw calls | Trójkąty |
|---|---:|---:|---:|
| Mała osada | 3.8 / 11.5 ms | 353 | 1.08 mln |
| Zatłoczona osada | 4.6 / 12.3 ms | 425 | 0.93 mln |
| Las | 6.2 / 7.7 ms | 91 | 1.08 mln |
| Teleporty/streaming | `frame` p95 74.8 ms | — | — |

Przebudowa roślinności: mediana 4.9, p95 30.7 ms, tylko 13 próbek w scenie teleportów. Postać: wg raportu 7–12 draw calli. Symulacja zwykle p95 poniżej 1 ms na maszynie pomiarowej.

**Nie wynika z tego zapas GPU.** `scripts/e2e/lib.mjs` wymusza SwiftShader; profil mobile emuluje UI. `Game.frame()` mierzy synchroniczny fragment pracy JS, nie czas od prezentacji do prezentacji. `render.draw` mierzy wywołanie renderera, nie zakończenie GPU. CPU-side render/driver na SwiftShader także nie przenosi się wprost na hardware; czyste fazy JS są użyteczne do porównań na tym samym środowisku. Dokument PERF zbyt szeroko określa wszystkie CPU timingi jako reprezentatywne.

Budżet `render.cpu`=10 ms już bywa przekroczony w p95 osad. Baza `scripts/bench/baseline.json` dotyczy symulacji, nie zatwierdzenia efektów GPU. Liczba tekstur/geometrii i JS heap nie są pomiarem VRAM. Draw calls są wskaźnikiem pracy, nie uniwersalnym limitem FPS.

## 4. Ranking decyzji

Oceny kosztu są jakościowymi przewidywaniami dla tego repo. **Żadna pozycja nie ma zmierzonego tutaj kosztu GPU.** „Mały” może stać się duży przy wysokim DPR, overdraw lub wielu światłach. Nakład to orientacyjna praca jednej osoby znającej Three.js, łącznie z integracją i podstawowym QA; 1 dzień ≈ 6–8 h skupionej pracy. Nie obejmuje tworzenia nowych modeli i rozbudowanej matrycy urządzeń. Timebox oznacza czas do pierwszego rozstrzygającego A/B, nie gwarancję gotowego wdrożenia.

| Priorytet | Zmiana | Korzyść | Koszt runtime | Nakład | Pierwszy timebox / decyzja |
|---|---|---|---|---|---|
| P0 | Hardware baseline, poprawne metryki, sceny A/B | Ochrona czasu i FPS | Mały tylko w diagnostyce | 0.5–1.5 dnia | 4 h; bez rozbudowy frameworka |
| P1 | Światło, ekspozycja, tone mapping, niebo/mgła | Bardzo szeroka poprawa obrazu | Mały–średni | 1–2 dni | 4 h; porównać dzień/zachód/noc |
| P1 | Gładki teren + 1–2 warstwy detalu | Bardzo duża zmiana odbioru podłoża | Mały–średni | 1.5–3 dni | 4 h normalne, potem 1 dzień tekstury |
| P1 | Selektywny PBR + ograniczone IBL | Czytelny kamień, drewno, metal, wilgoć | Średni, zależny od pokrycia ekranu | 1.5–3 dni z dostępnymi mapami | 1 dzień na skałę i fragment gruntu |
| P1 | Ogień flipbook + iskry; ograniczenie świateł | Duży lokalny efekt i lepsza noc | Mały–średni, overdraw | 0.5–1.5 dnia z gotowym atlasem | 4 h; ognisko bez bloom musi wyglądać dobrze |
| P2 | Wiatr vertex shader | Krajobraz przestaje być nieruchomy | Mały–średni, także shadow pass | 1–2 dni | 4–6 h na jednym rodzaju rośliny |
| P2 | Woda: normalne, Fresnel, odbicie nieba | Duży efekt przy wodzie | Średni przy dużej tafli | 1.5–3 dni | 1 dzień; bez reflektora sceny |
| P2 | Mokrość i śnieg przez uniformy/maski | Wiarygodna pogoda, mniej rebuildów | Mały–średni po przygotowaniu materiałów | 1–2 dni | 4–6 h; sprawdzić przejścia pogodowe |
| P2 | Kontakt z podłożem: blob shadows / AO assetów | Mniej „lewitujących” obiektów | Mały przy limitowanym zasięgu | 0.5–1.5 dnia | 4 h; porównać z istniejącym cieniem |
| P2 | Kilka kęp gruntu, drobne dekale, lepszy placeholder | Wiarygodna skala i różnorodność | Zależny od gęstości/assetu | 1–3 dni; modele osobno | 1 dzień na jedną polanę/osadę |
| P3 | KTX2 dla nowych cięższych tekstur | Pozwala utrzymać detal w pamięci | Mniej transferu pamięci, koszt transkodowania przy load | 0.5–2 dni | 4 h na jednym assetcie |
| P3 | AO ekranu, łagodny bloom, AA | Dodatkowe wykończenie | Średni–wysoki i nowe render targets | 1–3 dni na wybrany wariant | 1 dzień; tylko po bazie hardware |

Nie sumować pozycji jako zobowiązania do dużej przebudowy. Pierwszy mały pakiet zamknąć w **3–5 dniach**: baseline, światło/niebo, poprawa normalnych i jeden detal gruntu. PBR, woda i wiatr to kolejne osobne decyzje. Brak dobrych rezultatów po timeboxie oznacza redukcję zakresu albo odłożenie.

## 5. Szczegóły rekomendowanych technik

### 5.1. Światło, kolor i niebo

Zacząć od porównania `AgXToneMapping`, `ACESFilmicToneMapping` i obecnego obrazu przy świadomie dobranej ekspozycji. Nie zakładać, że AgX zawsze wygrywa. Jawny sRGB na wyjściu porządkuje konfigurację, ale nie naprawia domniemanego błędu: sRGB i ColorManagement są już domyślne. Albedo/emissive to dane kolorystyczne; normal/roughness/AO to dane liczbowe. GLTFLoader obsługuje oznaczenia zgodnie z glTF — nie dodawać drugiej konwersji [S1, S2].

Na low proponuję tanią kopułę z gradientem horyzont–zenit i tarczą słońca; na medium krótki A/B z oficjalnym `Sky`. Jest to model analityczny, nie chmury wolumetryczne [S3]. Jedna warstwa chmur z przygotowaną teksturą/noise, mieszana w materiale nieba, ma lepszą przewidywalność niż stos przezroczystych billboardów. Bez generowania wielu oktaw noise na każdy piksel w pierwszej wersji.

Niebo, mgła, kolor hemisfery, kierunek słońca i ekspozycja powinny korzystać z jednego zestawu parametrów pory dnia/pogody. Nie renderować słońca w innym kierunku niż cień. Własny sky shader musi uwzględniać tone mapping i wyjściową przestrzeń barw. Nie przyciemniać nocy tak, by znikała czytelność gry na telefonie.

**Stop:** jeśli zmiana wygląda dobrze tylko w południe albo wymaga kaskady filtrów korygujących kolory. Fallback: dotychczasowa mgła + prosty gradient.

### 5.2. Teren: normalne, skala detalu, maski

Najpierw wyłączyć wymuszone flat shading w prototypie terenu. Obecne `computeVertexNormals()` per chunk może ujawnić szwy po wygładzeniu: wyliczyć normalne z wysokości próbkowanej także poza granicą chunka, według spójnej reguły niezależnej od LOD. To poprawa oświetlenia powierzchni, bez zagęszczania siatki. Skirts ukrywają szczeliny geometrii, ale nie gwarantują ciągłości normalnych ani kolorów.

Następnie dodać współrzędne świata XZ w metrach i 1–2 powtarzalne tekstury detalu: grunt/trawa oraz ziemia/kamień. Istniejące vertex colors mogą zachować makrozróżnicowanie, ale trzeba ograniczyć podwójne barwienie albedo. Maski drogi, biomy i nachylenie pobierać przy budowie chunka i przechowywać jako osobne atrybuty/teksturę. **Nie odtwarzać rodzaju podłoża z finalnego RGB.**

Low: detail albedo na Lambert. Medium: wybrane powierzchnie z normal/roughness. Ujednolicić skalę tekstur między chunkami i filtrowanie mipmap; start 512–1024 px, nie kolekcja 4K. Strome ściany: najpierw prosty wariant projekcji bocznej albo odrębny materiał skały. Pełne triplanar na wszystkich warstwach mnoży próbkowanie i trudność poprawnego mieszania normalnych.

Nowocześniejsza opcja to stochastic tiling/blending — zweryfikowana publikacja i implementacja autorów [S18]. Odkładam ją, dopóki powtarzalność nie pozostanie widoczna po makromaskach i zwykłym detalu. Nie przenosić gotowego Shader Graph z Unity jako rzekomego drop-in do Three.js.

**Stop:** szwy LOD, migotanie detalu lub konieczność wielowarstwowego triplanar przed pierwszym widocznym zyskiem. Fallback: gładkie normalne + vertex colors + jedna mapa detalu.

### 5.3. Selektywny PBR i IBL

`MeshStandardMaterial` daje metalness/roughness, normal mapping i oświetlenie środowiskowe kosztem większej pracy per fragment niż Lambert [S4]. Priorytet: skały blisko gracza, mokry grunt, dach/tynk w osadzie, metal. Nie zamieniać od razu całej roślinności i całego dalekiego terenu.

W `assets.ts` wprowadzić świadomą politykę materiałów dla klas assetów/profilu. Klucz cache musi rozróżniać warianty; nie modyfikować wspólnego materiału, jeśli inne instancje mają pozostać suche/matowe. W `build-assets.mjs` zachować mapy dla pilotażowego assetu. Brak `_temp/extracted` jest rzeczywistym blockerem odbudowy oryginalnych paczek, więc nie wpisywać „przywróć mapy” jako godzinnej pracy. Alternatywa: nowa mała tekstura gruntu/kamienia lub PBR ze stałą roughness jako skromniejszy pierwszy krok.

IBL: mała mapa środowiskowa wstępnie filtrowana PMREM, przygotowana przy ładowaniu, nie z całej sceny co klatkę [S5]. W pierwszym kroku wystarczy miękkie, mało kontrastowe niebo. Zmieniać intensywność/wybrane stany z porą dnia; jeśli przełączanie jest widoczne, dodać rzadkie przygotowanie kolejnego stanu lub ograniczone mieszanie. Przenikanie dwóch PMREM w standardowym materiale nie jest darmową właściwością — to dodatkowa implementacja i sampling.

Zweryfikować, czy `mergeTemplate()` zachowuje wymagane UV i grupy materiałowe. Obecnie bierze pierwszy materiał z tablicy i usuwa dodatkowe atrybuty: bogatszy asset może wymagać poprawy importu, a nie tylko nowego shadera. Nie zaczynać od `MeshPhysicalMaterial` z transmission/clearcoat na szerokich powierzchniach.

**Stop:** utrata spójności stylu lub wzrost shader cost na całym ekranie przy małej różnicy wizualnej. Fallback: wybrane obiekty PBR, reszta Lambert. Materiał nie poprawi kanciastej sylwetki drzewa.

### 5.4. Kontakt i cienie

Medium: zachować jeden shadow-casting directional light. Poprawić dopasowanie frustum do obszaru gry, stabilizację w przestrzeni światła i bias/normalBias. Texel snapping ogranicza pływanie przy translacji, ale nie usuwa aliasingu wynikającego z ruchu słońca. Dalsze castery ograniczać przestrzennie; aktualne globalne instanced batches z wyłączonym frustum culling ograniczają skuteczność takiej selekcji.

Low: miękkie, lokalne blob shadows pod graczem i bliskimi aktorami. Próbkować wysokość/nachylenie podłoża, ograniczyć liczbę i dystans; test przy schodach, skarpach i mostach. Nie dublować silnego blob shadow i shadow mapy. Dla stałych assetów można zachować lub przygotować lokalne AO. Bake całego światła świata słabo pasuje do proceduralnego świata, budowania i dnia/nocy.

Shadow maps ponownie rysują castery; point-light shadows wymagają wielu kierunków [S6]. Nie dodawać ich do ognisk. Nie zamrażać bezwarunkowo shadow mapy w scenie z poruszającymi się aktorami, słońcem i roślinami. CSM/PCSS dopiero po wykazaniu konkretnego problemu, którego tańsze ustawienia nie rozwiązują.

### 5.5. Wiatr i roślinność

Sprawdzona technika: proceduralne odchylenie w vertex shader, zgodne z instancingiem [S7]. Pierwsza wersja: jedna–dwie funkcje okresowe, osobna faza z pozycji instancji, maska wysokości/giętkości, nieruchoma podstawa. Mocny ruch liści nie powinien wyginać pnia jak gumy. Czas animacji w sekundach renderowania; siła może zależeć od pogody. Nie używać przyspieszenia kalendarza do częstotliwości machania.

Najtańszy sensowny zakres to trzciny, krzewy i wierzchołki najbliższych drzew. Jeśli potrzebne są dodatkowe wagi, obecny merge musi je zachować. Powtórzyć deformację w depth material dla cieni; poszerzyć bounding volumes o maksymalne odchylenie [S19, S20]. Distant LOD powinien mieć zbliżony kolor/sylwetkę, aby ruch nie podkreślał gwałtownego przełączenia.

Zwiększenie ilości trawy to osobna decyzja. Kilka kęp wokół kamery, spatial batches i culling; bez geometry shaderów i milionów źdźbeł. Alpha-cutout ogranicza problem sortowania, ale nie czyni overdraw darmowym [S21]. Alpha-to-coverage ma sens tylko z rzeczywistym MSAA; obecne low/medium tworzą kontekst bez AA [S19].

**Stop:** rozjechany cień, ruch całej bryły zamiast rośliny lub konieczność kompleksowego rigowania. Fallback: wiatr tylko na kępach bez cieni.

### 5.6. Woda bez drugiego renderowania świata

Pierwsza wersja: dwie wolno przesuwane próbki normal mapy, Fresnel, kolor głębokości/brzegu, odbicie nieba/środowiska i lekki połysk od słońca. Zapewnić wspólne UV świata między chunkami. Maska płytkiej wody może być przygotowana z istniejącego heightfieldu i poziomu wody, odświeżana tylko po edycji terenu; nie wymaga od razu screen-depth pass. Przy wodzie o innym poziomie niż ocean używać lokalnej powierzchni rzeki/jeziora.

Oficjalny `Water` jest efektem z odbiciem i render targetem; nie należy utożsamiać łatwego importu z małym kosztem runtime [S8]. Nie tworzyć osobnego reflektora dla każdego chunka. Wykluczyć z pierwszej wersji SSR, refrakcję sceny, FFT ocean i realistyczną symulację płynu.

Odbicie samego nieba nie pokaże postaci ani domów — to świadomy kompromis. Wariant nieprzezroczysty z kolorem głębokości może być szybszy/stabilniejszy od obecnego alpha blending, ale zmienia widoczność dna i obiektów zanurzonych; ocenić gameplay przed wyborem. Prosty alpha wariant potrzebuje kontroli kolejności z deszczem, śladami i powierzchniami wody.

**Stop:** rozwiązanie wymaga już drugiego renderu całej sceny albo napraw wielu przypadków screen-space. Fallback: jedna animowana normal map + kolor i Fresnel.

### 5.7. Pogoda, ogień i drobny detal

**Wet/snow:** faktyczne wejście sim to `weather.wetness`; `snowCover` jest obecnie wyliczanym polem renderera, nie trwałym stanem pokrywy śnieżnej w symulacji. Zacząć od tej samej semantyki. Mokrość: przyciemnienie plus kontrolowane zmniejszenie roughness tam, gdzie jest PBR. Śnieg: maska z normalnej powierzchni i istniejącej sezonowości, nie drugi pełny mesh terenu. Nie przebudowywać geometrii przy każdej zmianie uniformu. Trwały śnieg/topnienie wymaga osobnej decyzji sim/save.

**Opady:** ulepszać istniejące 2500 punktów. Dodać limit per profil i intensity; deszcz jako krótkie streaks/instanced quads, śnieg jako wolne płatki. Pula wokół kamery, kontrola pokrycia ekranu, brak pełnoekranowej mgły z wielu warstw alpha. Minimum poprawności: brak rażącego deszczu wewnątrz domu; prosty test schronienia zamiast 2500 raycastów/klatkę. Soft particles z depth texture odłożyć, dopóki przecięcia nie są realnym problemem.

**Ogień:** mały atlas flipbook płomienia na kilku billboardach, pooling iskier, nieregularna faza per ognisko, limit dymu. Zastąpić stożki, wykorzystać istniejące światła. Proponowany low: 1 lokalne światło w sumie, z priorytetem pochodni gracza; medium: 2–3; high: 4. Są to limity pilotażowe do pomiaru, nie stwierdzenie „tyle jest bezpieczne”. Sprawdzić faktyczną liczbę świateł w programie shadera — intensity=0 nie dowodzi, że pętla światła zniknęła. Utrzymywać stabilną pulę per profil, a nie przełączać wariantów shadera co klatkę.

**Dekale:** bounded instanced quads dla śladów/brudu, limit wieku/odległości. Dopasowanie do terenu i polygon offset zamiast z-fighting; oddzielić czysto wizualny brud od śladów istotnych dla tracking. Nie usuwać informacji gameplay tylko dlatego, że profil ma mniej ozdób.

## 6. Nowe technologie: przyjąć, testować czy odłożyć?

| Technologia | Decyzja dla SeedVales | Dlaczego / warunek |
|---|---|---|
| Three.js WebGPU + TSL | Odłożyć migrację; zachować jako późniejszy eksperyment | Nowy system materiałów i postprocessingu, fallback WebGL2; GLSL/onBeforeCompile i stary composer nie przechodzą automatycznie. Dokumentacja nadal wskazuje ograniczenia i możliwie lepszą wydajność WebGLRenderer [S9] |
| KTX2 / Basis Universal | Wprowadzać wraz z bogatszymi teksturami | Kompresja GPU, nie tylko mniejszy download; wymaga KTX2Loader, detectSupport, transkodera i pipeline offline [S10, S11] |
| Meshopt | Zachować | Już obecny; nie przypisywać nowego zysku ponownemu „wdrożeniu” |
| N8AO | Jeden opcjonalny eksperyment na laptopie/high | Half-res ogranicza pracę, ale wymaga upsamplingu i ma kompromisy stabilności. Liczby autora nie są prognozą dla telefonu [S12] |
| Oficjalny GTAOPass | Alternatywa do tego samego A/B, nie drugi obowiązkowy AO | Wbudowane addon, ale dodatkowe dane depth/normal i filtrowanie; nie „darmowy kontakt” [S13] |
| UnrealBloomPass | Opcjonalnie, subtelnie | Wieloetapowe filtrowanie i render targets; próg emisji ognia, kontrola śniegu/nieba [S14] |
| `postprocessing` (pmndrs, bez React) | Rozważyć dopiero przy kilku uzasadnionych efektach | Łączenie kompatybilnych efektów redukuje operacje; nie usuwa kosztu AO/depth/blur. Ma własne zasady tone mappingu [S15] |
| Stochastic tiling / pełny triplanar | Odłożyć | Najpierw prosty detal i makrozróżnicowanie; więcej sampli i integracji [S18] |
| TAA / temporal upscaling / FSR / neural rendering | Nie w pierwszym pakiecie | Historia obrazu, ghosting roślin/cząstek, reset po teleporcie i często motion vectors; brak uzasadnienia dla tej skali prac |
| SSGI, SSR, ray tracing, wolumetryczne chmury/mgła | Odłożyć | Za duża powierzchnia debugowania i niepotwierdzony budżet GPU |
| Light probes / pełne lightmapy świata | Odłożyć | Dynamiczna pora dnia, edycja terenu i proceduralne budynki; lokalne AO assetu jest prostsze |
| Octahedral impostors / VAT tłumów | Odłożyć do zmierzonego problemu dalekich drzew/tłumów | Wymagają nowego pipeline assetów; nie są małą poprawką do obecnych skinned postaci |

Nie dodawać AO+bloom+AA+LUT jako obowiązkowego zestawu. Na low pozostawić bezpośredni render bez composera. Dla opcjonalnego WebGL composera pilnować pojedynczego tone mappingu i pojedynczej konwersji barw; `OutputPass` w addonach Three.js ma inną rolę niż `ToneMappingEffect` w pmndrs [S16, S15]. UI Vue pozostaje ostre w natywnej rozdzielczości.

AA oceniać w ruchu: FXAA jest prosty, lecz może rozmyć detal; SMAA jest kolejnym kosztem i nie rozwiązuje wszystkich problemów temporalnych. Zmiana `setQuality()` nie zmienia flagi MSAA utworzonego kontekstu. Nie obiecywać live przełączania AA bez obsługi tej różnicy.

## 7. Warunki utrzymania FPS i pamięci

### 7.1. Profile pilotażowe

To proponowane punkty startowe do testów, **nie potwierdzone konfiguracje docelowe**. Najpierw zachować obecne dystanse, aby A/B nie mieszało efektów ze zmianą widoczności.

| Ustawienie | Low / mobile | Medium / laptop | High / opcjonalnie |
|---|---|---|---|
| Rozdzielczość 3D | DPR cap 1; skala 0.8–1 jako fallback | A/B cap 1 kontra obecne 1.5 | Cap ≤2, tylko z zapasem |
| Niebo | Gradient + jedna tekstura chmur | Gradient albo Sky po A/B | Jak medium |
| Teren | Gładkie normalne + 1 detal | 1–2 warstwy, wybrane normal/roughness | Większy promień detalu dopiero po pomiarze |
| Cienie | Lokalne blobs | Jedno PCF, 1024 | 2048 tylko jeśli poprawa widoczna |
| Woda | Kolor, Fresnel, ograniczone normalne | Dwie próbki + odbicie nieba | Bez SSR w tym etapie |
| Rośliny | Krótki promień wiatru/drobnego detalu | Szerszy promień wiatru | Opcjonalnie więcej kęp |
| Opady | Przykładowo 400–800 | 1000–1600 | Do obecnych 2500 |
| Lokalne światła razem | 1 | 2–3 | 4 |
| AO/bloom | Wyłączone | Wyłączone domyślnie do pomiarów | Osobne przełączniki po akceptacji |

Wyższy DPR zwiększa liczbę pikseli kwadratowo: cap 1.5 oznacza do 2.25× pikseli względem 1, cap 2 do 4×, jeżeli urządzenie osiąga dany cap. Nie jest to proporcjonalna prognoza FPS; scena może być ograniczona CPU albo geometrią.

Adaptive quality najpierw jako prosty, rzadki wybór skali z histerezą, nie oscylujący regulator wszystkich parametrów. Nie obniżać skali jako remedium na 30 ms przebudowy roślinności. Oddzielić warm-up/streaming od przeciążenia stałego, nie uruchamiać kompilacji nowych shaderów podczas automatycznej korekty.

### 7.2. Minimalne usprawnienia przed dokładaniem geometrii

- Rozłożyć generację węzłów/wypełnianie instancji na klatki; utrzymać starą reprezentację do gotowości nowej. Najpierw zmierzyć zwykły marsz, nie traktować teleportów jako stałego FPS.
- Spatial batches roślinności rozważyć, jeśli GPU pokazuje dużo pracy poza widokiem/cieniami. To kompromis: mniej niewidocznych trójkątów, ale więcej draw calli. Nie włączać w ciemno `frustumCulled=true` bez poprawnych bounds.
- Redukcja 7–12 draw calli skinned postaci: oddzielny spike offline dla jednego stroju. Obecny build już próbuje `unifySkins/flatten/join`; nie powtarzać tego jako nowego rozwiązania. Testować bind pose, skale, głowy i wszystkie używane animacje. Jeżeli wymaga nowego riga/atlasu całej kolekcji, odłożyć; nie uzależniać pierwszego lepszego nieba od tego zadania.
- Liczyć shader variants i unikać kombinatorycznej liczby definicji. Parametry pogody aktualizować uniformami; kompilować potrzebne warianty przy ładowaniu/zmianie profilu. Proste poprawki GLSL trzymać w małych modułach z `customProgramCacheKey`; po upgrade Three wykonać wizualny smoke [S19].

### 7.3. Pamięć i assety

Nowe tekstury dobierać po widocznym detalu, nie rozdzielczości materiału źródłowego. Jedna nieskompresowana mapa RGBA8 1024² z pełnymi mipami to około **5.33 MiB**; trzy takie mapy około 16 MiB. To obliczenie pojemności, nie pomiar sterownika; PNG/WebP na dysku nie oznacza kompresji GPU. Uwzględnić również render targets, depth, shadows i bufory geometrii. Mipmap, batching, mniejszy backbuffer i jawny budżet pamięci są zgodne z zaleceniami MDN [S23].

KTX2: ETC1S jako kandydat dla albedo, UASTC dla normalnych/map wymagających lepszego zachowania szczegółów; ocenić artefakty, czas load i docelowy format na urządzeniu [S10, S11]. Pakowanie AO/roughness/metalness oszczędza zasoby, ale różne kanały/UV i użycie w shaderze trzeba sprawdzić. `mergeTemplate()` obecnie usuwa dodatkowe zestawy UV.

Dla pilotażowej sceny ustalić lokalny limit nowych tekstur, np. +16 MiB low / +32 MiB medium, i sprawdzić go na telefonie. To limit zakresu eksperymentu, nie rozpoznany „bezpieczny VRAM” telefonu. Nie ładować drugiej pełnej kolekcji tekstur jako fallback z góry.

Źródło gotowych materiałów/małego HDRI: Poly Haven — licencja assetów CC0 [S22]. Zapisać URL konkretnego assetu, wersję, licencję i konwersję w `docs/assets/README.md`. W tej sesji nie pobierano ani nie oceniano konkretnych map.

## 8. Protokół A/B, który zamyka decyzję

**Sceny:** ta sama osada w dzień i w nocy z kilkoma ogniami; las z obrotem kamery; łąka/skraj drogi; brzeg wody; deszcz; śnieg; marsz przez granice chunków. Teleport osobno jako test hitches, nie steady state. Te same seed, zapis, kamera, pora, pogoda i ustawienia. Dwa dodatkowe seedy sprawdzają szwy/uwarunkowania terenu, nie wymagają pełnego sweep.

**Urządzenia:** rzeczywisty laptop docelowy (zapisać aktywne GPU, zasilanie i viewport), Android klasy docelowej, a jeśli wspierany jest iOS — Safari na realnym iPhonie. Emulacja Playwright nie zastępuje żadnego z nich. Bez dostępu do sprzętu status efektu brzmi „prototyp, wydajność urządzeń niezweryfikowana”.

**Przebieg:** produkcyjny build bez HMR; około 30 s rozgrzewki po załadowaniu/kompilacji; 3×60 s A/B przy tej samej rozdzielczości, z naprzemienną kolejnością; następnie 10–15 min typowej gry na telefonie i ponowny krótki pomiar. Osobno cold start/nowa pogoda/quality switch. Nie mylić shader stutter przy pierwszym użyciu ze stałym kosztem.

**Metryki:**

- Czas pomiędzy callbackami RAF i udział długich klatek; p50/p95/p99, oddzielnie od obecnego `frame` CPU. RAF jest przybliżeniem frame pacing, nie dokładnym timestampem prezentacji; raportować odświeżanie ekranu.
- CPU: `sim.tick`, render preparation/draw submission, chunks i vegetation rebuild. GPU: opcjonalny `EXT_disjoint_timer_query_webgl2`, asynchroniczny odczyt, odrzucanie disjoint; brak rozszerzenia = brak danych, nie zero [S17].
- Draw calls/trójkąty całej klatki, liczba programów i aktywnych świateł, szacowana pamięć nowych zasobów. Po dodaniu composera kontrolować reset `renderer.info`, aby nie raportować tylko ostatniego passa [S2].
- Krótki film ruchu + stałe kadry; sprawdzić szwy, migotanie, halo, clipping cząstek, noc, chowanie celu, zmianę profilu i powrót do tej samej lokacji.
- Obecne timery mają ring **512**: kwantyle/max liczone są z ostatnich 512 próbek, `samples/mean/overBudget` obejmują cały przebieg. Dla długich testów eksportować osobne okna albo histogram/aggregację całego testu; samo wydłużenie benchmarka nie naprawi tej niespójności.

**Bramka kosztu (propozycja projektowa, nie wynik):** dla pojedynczej małej zmiany celować w ≤5% regresji p95 czasu pracy CPU/GPU; dla średniej ≤10%, przy zachowanym docelowym frame pacing. Cały zaakceptowany pakiet również ≤10% względem baseline — nie sumować wielu „dozwolonych 10%”. Jeśli baseline już nie utrzymuje celu, najpierw profilowanie/redukcja kosztu, nie dalsze konsumowanie budżetu. Progi sprawdzać w powtórkach, a zmiany poniżej szumu oznaczać jako nierozstrzygnięte.

Proponowany cel: stabilne 30 FPS na low/mobile, 60 FPS na medium/laptopie, z kontrolą udziału klatek przekraczających odpowiednio 33.3/16.7 ms i skoków >50 ms. Kwantyle RAF są skwantowane odświeżaniem, więc nie traktować różnicy 16.7→33.3 ms jako liniowego przyrostu kosztu shadera. GPU timing i CPU phases wyjaśniają koszt, a pacing ocenia rezultat dla gracza. Nie dodawać CPU+GPU jako prostego czasu klatki — potoki częściowo pracują równolegle.

**Bramka wartości:** przy typowej kamerze i bez powiększenia widoczna poprawa w przynajmniej dwóch reprezentatywnych scenach; dla lokalnego efektu — w jego typowej scenie z kilku kierunków. Brak zauważalnej korzyści po timeboxie → usunąć eksperyment, zachować tylko wyniki. Brak dryfu pamięci po kilku pętlach trasy i włącz/wyłącz. Poprawność gry ma pierwszeństwo nad atrakcyjniejszym screenshotem.

## 9. Kolejność małych wdrożeń

1. **Baseline:** rozszerzyć obecny benchmark o rzeczywisty hardware i właściwe metryki. Nie budować nowego dashboardu.
2. **Pierwsza widoczna poprawa:** światło/kolor/niebo i gładki teren. Jedna polana + osada jako wspólny wzorzec.
3. **Materiały:** detal gruntu oraz jeden asset PBR z IBL. Dopiero po akceptacji zmieniać pipeline szerszej kolekcji.
4. **Życie sceny:** ogień, wiatr i poprawa już istniejących opadów; limit świateł i overdraw.
5. **Woda i pogoda powierzchni:** osobne flagi, kontrola kosztu i semantyki sim.
6. **Opcjonalne wykończenie:** wybrać jeden z AO/bloom/AA według problemu widocznego w A/B. Brak problemu oznacza brak nowego passa.

Każdy krok: krótki zapis wyników w PERF.md, zrzuty/film, decyzja keep/drop. Przy rozpoczęciu poprawić nieaktualne zdanie w `render--001`, jakoby opadów nie było, oraz dodać sceny noc/woda/opady do akceptacji. Nie wymagać pełnego wielogodzinnego zestawu testów symulacji po samym dostrojeniu światła; nowe shadery i zmiany importu wymagają smoke odpowiednich scen i profili.

## 10. Źródła pierwotne

Źródła uzasadniają możliwości i ograniczenia technik. Ranking, timeboxy i limity pilotażowe są oceną autora dla tego repo, nie deklaracjami autorów bibliotek.

| ID | Źródło | Użycie |
|---|---|---|
| S1 | [Three.js: Color Management](https://threejs.org/manual/pages/color-management.html) | Linear workflow, mapy i wyjście |
| S2 | [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) | Tone mapping, sRGB, statystyki, kompilacja |
| S3 | [Sky](https://threejs.org/docs/pages/Sky.html) | Analityczne niebo WebGL |
| S4 | [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html) | PBR, roughness/normal, środowisko |
| S5 | [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html) | Filtrowanie środowiska |
| S6 | [Three.js: Shadows](https://threejs.org/manual/pages/shadows.html) | Dodatkowe rendery casterów i ograniczenia |
| S7 | [NVIDIA GPU Gems 3: Vegetation Procedural Animation and Shading in Crysis](https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis) | Dojrzały wiatr w vertex shader |
| S8 | [Water](https://threejs.org/docs/pages/Water.html) | Refleksyjna woda i render targets |
| S9 | [Three.js: WebGPURenderer](https://threejs.org/manual/pages/webgpurenderer.html) | TSL, backendy, koszty migracji |
| S10 | [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html) | Transkodowanie do formatów GPU |
| S11 | [glTF Transform CLI](https://gltf-transform.dev/cli) | Offline KTX2/Basis, optymalizacja assetów |
| S12 | [N8AO — README autora](https://github.com/N8python/n8ao/blob/master/README.md) | Half-res, preset, ograniczenia i integracja |
| S13 | [GTAOPass](https://threejs.org/docs/pages/GTAOPass.html) | GBuffer i alternatywa AO |
| S14 | [UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html) | Wieloskalowy bloom |
| S15 | [pmndrs postprocessing](https://pmndrs.github.io/postprocessing/public/docs/) | EffectPass, format bufora, tone mapping |
| S16 | [OutputPass](https://threejs.org/docs/pages/OutputPass.html) | Wyjście pipeline addonów Three.js |
| S17 | [Khronos: EXT_disjoint_timer_query_webgl2](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/) | Pomiar czasu GPU |
| S18 | [Deliot / Heitz: Procedural Stochastic Textures by Tiling and Blending](https://eheitzresearch.wordpress.com/738-2/) | Ograniczanie powtarzalności tekstur |
| S19 | [Material](https://threejs.org/docs/pages/Material.html) | onBeforeCompile i cache programów |
| S20 | [Object3D](https://threejs.org/docs/pages/Object3D.html), [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) | Depth material i bounds instancji |
| S21 | [Arm: finding and fixing hidden performance problems](https://developer.arm.com/community/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/finding-and-fixing-hidden-performance-problems-in-mobile-games-with-arm-performance-studio) | Overdraw i rzeczywiste ograniczenia mobile |
| S22 | [Poly Haven: Asset License](https://polyhaven.com/license) | CC0 dla potencjalnych materiałów i HDRI |
| S23 | [MDN: WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) | Mipmap, batching, rozdzielczość, pamięć i unikanie blokowania |

## 11. Self-review i ograniczenia

- Oddzielono kod istniejący, stare pomiary, propozycje i niezweryfikowane koszty.
- Potwierdzono opady i pulę siedmiu świateł; poprawiono potencjalne założenie o braku pogody i jednolitym Lambert.
- Sprawdzono offline usuwanie map, runtime usuwanie dodatkowych atrybutów i już obecną próbę scalania skinned mesh.
- Uwzględniono szwy normalnych/chunków, brak UV terenu, deformacje shadow pass, nocne IBL, przezroczystość wody i AA przy zmianie profilu. W self-review poprawiono odsyłacz do API depth material: właściwość jest opisana w Object3D.
- Nie przypisano GPU FPS do SwiftShader ani pamięci GPU do heap/licznika tekstur; wykryto ograniczenie ring buffer 512.
- Każda większa propozycja ma mały pierwszy zakres, fallback albo bramkę odrzucenia. Nie ma zobowiązania do wdrożenia całej listy.
- Bez nowego benchmarku i wizualnego A/B nie można potwierdzić, że konkretny efekt będzie tani ani ładniejszy na urządzeniu użytkownika. Nie wykonano implementacji, instalacji bibliotek ani testów kompatybilności ich wersji.

Ocena końcowa: **duży potencjał poprawy bez zmiany silnika**, przede wszystkim przez materiały, teren, atmosferę i ruch. Największym ryzykiem jest równoczesne rozszerzenie liczby przezroczystości, świateł i passów przy niezmierzonym GPU.
