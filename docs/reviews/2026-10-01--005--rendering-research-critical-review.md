# Krytyczne review: rendering high-impact / low-cost

**Data:** 2026-10-01  
**Dokument:** [2026-10-01--001--rendering-high-impact-low-cost.md](../research/2026-10-01--001--rendering-high-impact-low-cost.md)  
**Sprawdzona wersja:** blob `1de10c6ea14023671eb4e9a085e35b0d582ed9b0`  
**Kod odniesienia:** `af30673768aaf9bec62d508cda0f351304896298`  
**Werdykt:** **Request changes przed użyciem jako plan wdrożenia.** Jako katalog kierunków dokument jest wartościowy, lecz nie kontroluje dostatecznie kosztu pracy i zbyt pewnie klasyfikuje koszt GPU.

## 1. Niezależność i zakres

Raport 001 otwarto dopiero po reconie kodu, researchu internetowym i zapisaniu niezależnej rekomendacji [002 — realistyczniejsza grafika](../research/2026-10-01--002--realistic-visuals-practical-roadmap.md). Review nie jest drugim niezależnym agentem: to końcowa krytyczna ocena wykonana w tej samej sesji, zgodnie z kolejnością zadania.

Nie uruchamiano nowych benchmarków ani wizualnej wersji gry. Oceny wyglądu i kosztu GPU nie są wynikami A/B. Porównywano raport z kodem, istniejącym PERF.md i źródłami pierwotnymi. Raportu 001 nie nadpisano, aby zachować czytelną podstawę porównania.

## 2. Co jest trafne i warto zachować

- Pozostawienie WebGLRenderer i brak migracji silnika tylko dla obietnicy FPS.
- Pierwszeństwo światła, nieba, wiatru, pogody i prostej wody nad ciężkim postprocessingiem.
- Poprawne rozpoznanie już istniejących LOD, instancingu, opadów, day/night i profili jakości. Raport **nie twierdzi**, że opadów jeszcze nie ma; nieaktualny jest pod tym względem osobny plan `render--001`.
- Poprawne rozróżnienie Meshopt od KTX2 oraz PNG/download od pamięci tekstur na GPU.
- Ograniczenie cieni punktowych, SSR, wolumetrii i niepotrzebnych filtrów.
- Zauważenie rebuildów terenu od tintu i wyłączonego cullingu instanced vegetation.
- Propozycja testu spatial batching z uwzględnieniem wzrostu draw calli — już jest warunkowa, nie wymaga zarzutu „bez benchmarku”.
- Wymóg realnego laptopa/Androida oraz A/B na tej samej scenie. To dobra baza, którą trzeba doprecyzować.

## 3. Zmiany blokujące traktowanie raportu jako planu

„Blokujące” oznacza tu brak wystarczającej podstawy do uruchomienia całego proponowanego zakresu. Nie oznacza, że wszystkie pomysły techniczne są błędne.

### R1 — Priorytet A dla prawie wszystkiego nie chroni czasu implementacji

**Miejsce:** §3, §23–24.

W tabeli priorytet A obejmuje m.in. niebo, wiatr, teren, wodę, dynamic resolution, KTX2, GPU opady i przebudowę cieni. Kolejność zawiera 15 wdrożeń, bez szacunku pracy, timeboxów i bramek odrzucenia. To łatwo zamienia się w kilkutygodniowy projekt przed ustaleniem, które efekty w ogóle robią różnicę.

**Poprawka:** wybrać pierwszy pakiet na 3–5 dni: hardware baseline, światło/niebo, normalne terenu i jeden detal gruntu. PBR/woda/wiatr osobno. Każdy eksperyment musi mieć fallback i decyzję keep/drop po kilku godzinach lub dniu. KTX2 i przeniesienie 2500 cząstek na GPU nie muszą poprzedzać widocznej poprawy obrazu.

### R2 — Zbyt pewne oceny „bardzo niski” i „bardzo dobry na mobile”

**Miejsce:** §3, §5–8, §11, §14.

Oceny nie mają hardware baseline. Jeden shader nieba może pokrywać cały ekran; wiatr wykonuje się także dla geometrii cieni; woda zajmuje duży obszar; dym i chmury mogą mnożyć overdraw. „Jeden draw call” i „na GPU” nie oznaczają małego czasu klatki. Dokument później wymaga pomiarów, ale tabela komunikuje większą pewność niż dowody.

**Poprawka:** opisać koszt jako hipotezę zależną od zakresu: gradient/tekstura kontra wielooktawowy noise, mała liczba kęp kontra gęsty las, nieprzezroczysta woda kontra blending. Każdą pozycję oznaczyć „GPU niezmierzone”, a default mobile ustalić dopiero po A/B. Arm opisuje wpływ przezroczystości i overdraw; MDN zaleca kontrolę rozdzielczości i zasobów [W1, W2].

### R3 — Zbyt zachowawcza strategia powierzchni względem celu „realistyczniej”

**Miejsce:** §21, §24, §26.

Brak masowej zamiany na PBR jest rozsądny. Problemem jest uznanie obecnego upraszczania materiałów za bezwarunkowo słuszne i praktyczne ograniczenie Standard do metalu/hero items. W kodzie największe powierzchnie obrazu — teren i otoczenie — mają uproszczone materiały, a teren dodatkowo flat shading. Raport nie proponuje jako priorytetu wygładzenia normalnych, detalu gruntu ani kontrolowanej próby PBR+IBL na kamieniu, drewnie czy wilgoci.

**Poprawka:** porównać trzy małe warianty: obecny Lambert; Lambert z gładkim terenem i detail albedo; selektywny Standard z roughness/normal/IBL. Nie przesądzać PBR dla całego świata, ale nie odrzucać go przed pomiarem. Dokumentacja Three.js potwierdza zarówno korzyści PBR, jak i większy koszt [W3]. **To spór o priorytety, nie dowód, że PBR będzie szybszy.**

### R4 — Brak kluczowych kosztów pipeline assetów i shaderów

**Miejsce:** §7, §10, §21–22.

`scripts/assets/build-assets.mjs` usuwa normal/metallic-roughness/AO w wybranych assetach; `assets.ts` zamienia materiały packów na Lambert i odrzuca dodatkowe atrybuty. `terrainChunks.ts` nie tworzy UV. Ładniejszy materiał wymaga danych i ich zachowania, a nie wyłącznie przełączenia shadera. Źródła `_temp/extracted` nie są w git. Skinned aktorzy nie przechodzą przez toLambert, więc uproszczenie świata i aktorów należy opisywać oddzielnie.

**Poprawka:** wpisać zależności do pilotażu: dostępność map/źródeł, UV/maski, zachowanie atrybutów, cache materiałów i zgodność importowanych grup. Najpierw jeden asset, nie ponowne przetwarzanie wszystkich paczek. Przy braku źródeł użyć nowego niewielkiego materiału lub ograniczonej roughness, jawnie z mniejszym efektem.

### R5 — „Frame time” nie ma jeszcze właściwej definicji do adaptive resolution

**Miejsce:** §9 i §25.

Zalecenie mediany/p95 jest dobre, ale istniejące `Game.frame()` mierzy synchroniczną pracę JS, a `render.draw` wywołanie renderera, nie zakończenie GPU. `scripts/e2e/lib.mjs` wymusza SwiftShader. W `diag/perf.ts` kwantyle/max obejmują ostatnie 512 próbek, podczas gdy liczba próbek, średnia i overBudget obejmują cały przebieg. Raport nie rozpoznaje tych ograniczeń istniejącej telemetrii.

**Poprawka:** najpierw RAF pacing i opcjonalny asynchronous GPU timer z kontrolą disjoint [W4], oddzielne CPU phases i agregacja okien. Adaptive resolution ma reagować na długotrwałe przeciążenie odpowiedniego typu, nie na jednorazowe vegetation rebuild. Dodać cold start, rozgrzewkę, powtórki i pomiar po 10–15 min na telefonie. `heap` i liczba tekstur nie potwierdzają budżetu VRAM. Bez tego nie ustalać automatycznego regulatora na podstawie istniejącego timera `frame`.

## 4. Ważne poprawki techniczne i priorytetowe

| ID | Miejsce | Ryzyko / brak | Zalecana korekta |
|---|---|---|---|
| R6 | §6, wind | Modyfikacja vertex positions nie wystarczy do zgodnych cieni i bounds | Zgodna deformacja depth/shadow pass, maski giętkości, margines bounds i zachowanie atrybutów podczas merge; fallback bez cienia dla małych kęp |
| R7 | §7, wet | „Tani highlight” na Lambert to własny model oświetlenia; koszt utrzymania pominięty | Porównać małe rozszerzenie z gotowym Standard. Nie rozbudowywać własnego PBR pod nazwą „tani Lambert” |
| R8 | §7, snow | Uniform `snowCover` brzmi jak istniejący stan sim | W aktualnym kodzie trwałe `weather.wetness` istnieje, ale snowCover wylicza renderer. Zachować tę semantykę; akumulacja/topnienie wymaga decyzji sim/save |
| R9 | §8, water | Brak źródła shallow/deep, spójności chunków i kosztu przezroczystości | Wyliczyć maskę z terenu/poziomu lokalnej wody; wspólne world UV; określić opaque/alpha; sprawdzić zanurzone obiekty. Fallback bez renderu odbić sceny |
| R10 | §11, GPU precipitation | 2500 cząstek to jeszcze nie dowód istotnego CPU bottleneck | Najpierw zmierzyć i dodać profile/intensity/shelter. GPU update ma usunąć konkretny koszt lub ułatwić lepszy wygląd; nie robić go tylko dlatego, że brzmi nowocześnie |
| R11 | §12, shadow updates | Rzadsze aktualizacje mogą zostawić opóźnione cienie aktorów i wiatru | Testować ruch, słońce i caster bounds. Stabilizacja frustum i ograniczenie casterów wcześniej niż throttling |
| R12 | §13–14, lights | `MAX_LIGHTS=6` nie obejmuje dodatkowego `playerLight`; brak limitów per profil | Liczyć wszystkie siedem potencjalnych świateł, zaproponować mniejszą pulę low/medium i zweryfikować wariant shadera. Emissive nie oświetla otoczenia |
| R13 | §15 i §17, alphaHash | Brak kosztu szumu i podwójnego renderu podczas LOD fade | Dokumentacja wskazuje ziarno i potencjalną pomoc TAA [W5]. Przy braku TAA preferować najpierw histerezę i zbliżone sylwetki; blend tylko w krótkim zakresie po A/B |
| R14 | §22, actors | Atlas/join nie są prostym nowym rozwiązaniem: build już próbuje unifySkins/flatten/join | Osobny timebox na jeden rig; sprawdzenie bind pose i animacji. `InstancedMesh/BatchedMesh` nie załatwiają automatycznie wielu niezależnie animowanych szkieletów |
| R15 | §25, performance | Brak kosztu całego pakietu i progów rezygnacji | Dodać limit regresji względem baseline, cel 30/60 FPS jako wymaganie do weryfikacji, brak shader stutter i pętle pamięci. Nie przydzielać 10% osobno każdemu z 15 efektów |

## 5. Uzupełnienia o największej wartości

1. **Normalne i detale podłoża.** Wygładzenie z normalnymi wyprowadzanymi spójnie z heightfieldu, UV/maski i 1–2 mapy; sprawdzenie szwów między LOD oraz wpływu skirts. To ważniejsze dla odejścia od widocznego low-poly niż kolejny drobny particle effect.
2. **Oświetlenie środowiskowe dla wybranego PBR.** Mały PMREM przygotowany przy load, kontrola nocy i zachmurzenia. Nie regenerować świata co klatkę, nie uznawać blendu dwóch map za gotową darmową opcję [W6].
3. **N8AO jako warunkowy punkt odniesienia.** Nie obowiązkowa biblioteka; jeden eksperyment przeciw blob/AO assetu. Half-res i upsampling mają kompromisy; nie kopiować czasów autora na mobile [W7].
4. **Gotowe materiały zamiast nadmiernego custom shader development.** Kontrolowany asset grunt/kamień/tynk, właściwa skala i dobór kolorów. Koszt jakości obejmuje również dobór treści, nie tylko programowanie.
5. **Wartość przy typowej kamerze.** Wymagać widocznego zysku w ruchu, także na ekranie telefonu. Screenshot z bliska nie wystarcza do akceptacji.

## 6. Sugerowana korekta końcowej rekomendacji raportu 001

Zachować obecny renderer. Najpierw zmierzyć sceny na rzeczywistym sprzęcie i poprawić światło, niebo, normalne terenu oraz detal powierzchni. Następnie wykonać ograniczony test PBR z IBL na wybranych materiałach. Wiatr, ogień, woda i mokrość wdrażać jako osobne krótkie eksperymenty z fallbackiem. KTX2, GPU cząstki i scalanie postaci rozwijać wtedy, gdy odpowiadają na zmierzone ograniczenie lub są potrzebne dla zaakceptowanego detalu. Postprocessing i migrację WebGPU pozostawić opcjonalne. Po każdym kroku porównywać wartość wizualną, koszt całej klatki i stabilność po rozgrzaniu telefonu.

## 7. Źródła weryfikacyjne

Szczegółowe źródła kodowe i pełniejsza bibliografia są w researchu 002. Poniżej źródła bezpośrednio wspierające zastrzeżenia:

- W1 — [Arm: hidden performance problems / overdraw](https://developer.arm.com/community/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/finding-and-fixing-hidden-performance-problems-in-mobile-games-with-arm-performance-studio).
- W2 — [MDN: WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
- W3 — [Three.js: MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html).
- W4 — [Khronos: EXT_disjoint_timer_query_webgl2](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/).
- W5 — [Three.js: Material, alphaHash i alphaToCoverage](https://threejs.org/docs/pages/Material.html).
- W6 — [Three.js: PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html).
- W7 — [N8AO: README autora](https://github.com/N8python/n8ao/blob/master/README.md).

## 8. Self-review końcowy

- Sprawdzono zarzuty względem pełnego raportu: nie przypisano mu błędu o braku opadów, braku mobile A/B ani bezwarunkowym spatial culling.
- Oddzielono pięć luk blokujących plan od uwag technicznych; brak pomiarów nie został przedstawiony jako dowód złej wydajności konkretnego efektu.
- Selektywny PBR jest propozycją A/B, nie nakazem masowej migracji ani obietnicą darmowej jakości.
- Usunięto nieuprawnione uproszczenie „wszystko Lambert”; odróżniono build assetów od runtime aktorów.
- Zachowano silne strony raportu: brak potrzeby zmiany silnika, ograniczenie postprocessingu, shaderowe środowisko i świadome profile.
- W nowym researchu jawnie zaznaczono brak uruchomienia gry, orientacyjne estymacje i obowiązek weryfikacji GPU. Doprecyzowano też ograniczenia MSAA, ring buffer, nocnego IBL i shadow deformation.

**Końcowy wniosek:** raport 001 trafnie wskazuje rodzinę lekkich efektów, ale dla aktualnego celu użytkownika wymaga przejścia od szerokiej listy technik do małych, mierzalnych decyzji oraz większego nacisku na jakość materiałów i samego terenu.
