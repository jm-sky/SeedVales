# Decyzje projektowe i uproszczenia (v1)

Format: **ID — decyzja.** Uzasadnienie. Odwracalność / co dalej.

## Świat i czas

- **D-TIME-1 — Rok = 60 dni (12×5), sezon = 15 dni.** Poprawiona pomyłka `12×5=70` z wizji. Parametry w `src/game/config/calibration.ts`.
- **D-TIME-2 — Dwie domeny czasu:** `time.play` (sekundy rozgrywki, ruch/walka/stamina) i `time.cal` = play × 24 (kalendarz). Ruch nigdy nie jest mnożony przez 24.
- **D-TIME-3 — Przyspieszenie (sen ×40, długa praca ×20, autopilot ×3) mnoży cały krok symulacji** (Sim.step sub-steppuje, max krok 0.1 s × timeScale/4). Przerywane zagrożeniem (`interruptReason`) i Esc.
- **D-WORLD-1 — Świat 8192×8192 m, siatka 8 m (1025²), jeden kontynent w oceanie z gradientem klimatu N (zimno) → S (step).** 2–3 kontynenty, tundra/pustynia/dżungla odłożone (WORLD-06). Uzasadnienie: koszt generacji ~2 s i cache ~20 MB; wystarcza na 3 osady w łańcuchu dni marszu.
- **D-WORLD-2 — Rzeki z akumulacji spływu po priority-flood; minimalna widoczna szerokość ≈ 8 m (siatka 8 m).** Strumienie są więc szersze niż w wizji. Poprawa: osobna warstwa rzek jako wstęgi (ribbon) z rzeczywistą szerokością.
- **D-WORLD-3 — Trasy liczone po drodze A* (koszt nachylenia/wody/biomu), dom → sąsiad ~3.1–4.5 km (test).** Mosty/brody na przecięciach z rzekami. Drogi spłaszczają teren (maska `flat`/`road`).
- **D-WORLD-4 — Jaskinie odłożone** (WORLD-05): wymagają osobnej geometrii (wizja §6.1), nie blokują pętli gry.
- **D-WORLD-5 — Zasoby (drzewa, krzewy, skały, zioła) generowane deterministycznie per chunk 128 m; zmiany (ścięte/zebrane/wyczerpane) trzymane w `GameState.nodes`.** Odrost: krzewy/zioła dni, drzewo z pnia po 20 dniach (uproszczenie „rozsiewania”).
- **D-WORLD-6 — Edycje terenu łopatą zapisywane rzadko per chunk (siatka 2 m).**
- **D-WORLD-7 — Łańcuch osad: trasa dom→sąsiad w paśmie [0.8, 1.3]× DAY_MARCH_M mierzona po zbudowanej drodze** (`world/gen/centres.ts`), z ponawianiem alternatywnych lokalizacji domu; test na 8 seedach. Odcinek do LG: cel 1.25× z pasmem [0.7, 1.3]× celu.

## Symulacja

- **D-SIM-1 — LOD symulacji wg odległości od gracza:** ≤180 m co 0.1 s z kolizjami, ≤700 m co 0.5 s, dalej co 3 s bez kolizji z roślinnością. Ten sam kod AI (brak osobnego „abstrakcyjnego” modelu).
- **D-SIM-2 — AI NPC = utility + plany wieloetapowe** (goto/work). Wynik celu = siła potrzeby × osobowość, siła obowiązku × sumienność, kontekst (pora, pogoda, zagrożenie), koszt (odległość, ryzyko wody × neurotyczność). Histereza 0.15; cooldown celu po porażce (60 s) — brak nieskończonych pętli.
- **D-SIM-3 — Big Five:** C → waga pracy i napraw; E → potrzeba kontaktu i gospoda; N → ucieczka/schronienie, awersja do ryzykownej wody; A → oddawanie nadwyżek, ceny, pomoc rannym; O → zasięg wędrówek i losowość wyboru.
- **D-SIM-4 — Zadanie z symulacji:** budynki tracą durability (szybciej przy złej pogodzie); wspólny magazyn nie ma „właściciela”, więc zaniedbany (start 28–38%) → gniazdo szczurów → szczury zjadają zapasy → strażnik publikuje ogłoszenie. Naprawa >60% usuwa gniazdo; jeśli zrobi to NPC, zadanie wygasa.
- **D-SIM-5 — Walka:** trafienie = skill/zręczność; obrażenia = broń × jakość × skill × stamina × kary; część ciała losowana wagami; pancerz warstwowy per slot (1−∏(1−r)). Gracz przy 0 HP: KO 3 s + 120 s ochrony (wrogowie ignorują), rekonwalescencja 12 h. NPC: ranny do −20 HP, woła o pomoc; śmierć poniżej.
- **D-SIM-6 — Łuk (NPC myśliwy) poza bliskim LOD rozstrzygany abstrakcyjnie** (szansa trafienia z odległości), gracz strzela realnymi pociskami z grawitacją.
- **D-SIM-7 — Handel: NPC sprzedaje ze skrzyni domu; pieniądze zachowane (transfer 1:1).** Waluta: miedziak (100 m = 1 sr, 100 sr = 1 zł).
- **D-SIM-8 — Kalibracja potrzeb:** pragnienie pełne→0 w 20 h, głód 30 h, wigor ~19 h marszu (NEEDS). Posiłek 25–40 sytości. Wartości do strojenia.

- **D-SIM-12 — Strach dzikich zwierząt (dodatek): ogień > ludzie > zagrody**, parametry `FEAR` w `calibration.ts`. Drapieżnik atakuje człowieka tylko głodny (> 30 h), alfa/silny, wściekły albo osaczony (< 8 m); przy młodych/legowisku zwierzę broni się. Kadencja decyzji ~1 s (AI-01) jest niezależna od LOD ruchu (D-SIM-1); zdarzenia krytyczne wymuszają decyzję (`alertAround`).
- **D-SIM-13 — Obrona legowiska i młodych (review 003):** legowiska bronią tylko drapieżniki i zwierzęta agresywne (zasięg `perception × 0,6`); ofiary (sarna, jeleń, lis) nigdy nie szarżują przy legowisku, a młodych bronią tylko z bliska (`FEAR.preyDefendM` = 6 m) — dalej uciekają. Spłoszenie przerywa polowanie/padlinę/węszenie i blokuje je na `FEAR.suppressS` (45 s).

## Ekonomia

- **D-ECON-1 — Pieniądze tylko się przemieszczają: każdy przepływ ma płatnika i odbiorcę.** Portfele gracza i NPC (także zmarłych) + skarbce osad (`SettlementState.treasury`, start `TREASURY_START`: SM 150, MD 300, LG 600 m). Skarbiec płaci nagrody za zadania i opłaty karawan; przyjmuje noclegi bez gospodarza i przeprosiny. Jawne źródło z zewnątrz: monety wykopane łopatą w osadzie (ITEM-04). Podatki/dochody skarbca — poza v1 (skarbiec może się wyczerpać: nagrody wtedy częściowe).
- **D-ECON-3 — Karawanie płaci jej własna osada (skarbiec domowy), a osady pobierają dzienny podatek** 3% od sakiewek NPC ponad 20 m (`TAX`, system `taxes` co 30 s, raz na dzień kalendarza). Zamyka obieg pieniędzy w osadzie; bez tego skarbiec osady domowej gracza pustoszał w ~14 dni (review 002 #5). Symulacja 10 dni: skarbce rosną powoli, suma pieniędzy stała.
- **D-CRAFT-1 — Zamówienie u kowala rezerwuje materiały z magazynu kowala w chwili zamówienia**; zamówić można tylko receptury, na które kowal ma materiały; anulowanie zwraca zaliczkę (z sakiewki kowala) i materiały.
- **D-ECON-2 — Udźwig jest twardym limitem przy podnoszeniu, braniu z magazynu i kupnie** (`fitQty`); przeciążenie (spowolnienie ×0.5) zostaje tylko jako stan przejściowy (np. zdjęty plecak).
- **D-FOOD-3 — Pieczenie przy ognisku (FOOD-03):** czas pieczenia to produkcja, więc liczony w kalendarzu (`ROAST.calMin` = 30 min kalendarza ≈ 75 s rozgrywki; aktywność przyspiesza czas ×5 jak odpoczynek). Pojemność: samo ognisko 1, z patelnią/kociołkiem (`cook_vessel`) 2, z rusztem w ≤ 3 m od ogniska 5; cała partia piecze się w tym samym czasie, najpierw najmniej świeże kawałki. Produkt dziedziczy gatunek (`ItemStack.sp`) i względną świeżość (`spoilH_pieczone × fresh/spoilH_surowe`, min. 20%). Stosy różnych gatunków nigdy się nie łączą; w obrębie gatunku świeżość = średnia ważona (jak dotąd). Receptura `cook_meat` z panelu wytwarzania zastąpiona opcją „Piecz mięso” przy ognisku.
- **D-RES-7 — Skały (RES-07):** skały `scale ≥ 2` to głazy — uderzenie kilofem odłupuje „Odłamek skały” (12 kg, na ziemi obok), który kilofem rozbija się na 4 kamienie; mniejsze skały dają kamienie od razu. Pień zostaje do odrostu (20 dni, D-WORLD-5).

- **D-TRANS-1 — Taczka i wózek (TRANS-01):** pchane oburącz (broń i pochodnia trafiają do plecaka; atak i narzędzia wymagają zaparkowania — narzędzie parkuje wózek automatycznie). Ładunek wózka to osobny ekwipunek tylko na ciężkie surowce (`HEAVY_GOODS`), nie liczy się do udźwigu postaci; sam wózek w trakcie pchania też nie. Prędkość ×0,8 / ×0,68, bez biegu; wzniesienie > 0,32 m/m albo woda > 0,25 m blokuje ruch. Rozładunek do magazynu osady daje uczynność (jak oddanie zasobów).

## NPCs and relations

- **D-NPC-1 — Trade with any NPC = surplus (TRADE-02):** the NPC's pack + household store minus a reserve (profession work kit, `TRADE.foodReservePerMember` = 3 portions per member, one water container); children trade from their own pack only; goods bought from the player go to the household store. "Handing over" an item uses the gift path (SOC-01, Give button in the trade panel) — one function, no separate zero-price mode.
- **D-NPC-2 — Gifts and wishes (SOC-01):** opinion gain = min(25, 1 + 4·log2(1 + value/5)) × preference × (0.7 + 0.6·A) / (1 + gifts given that day) (`GIFT`). The cap applies to the value part before the preference, so a wished-for item still counts more when expensive. Wishes are derived deterministically from profession/role and NPC id (no saved state); owned items are skipped, so a fulfilled wish moves on to the next one.
- **D-NPC-3 — Companions (COMP-01/02):** tasks Escort and Protection; a "work" task is deferred (needs a design for working on the player's behalf). Risk sets the wage (×1/1.6/2.6), consent (neuroticism vs opinion) and combat stance (low: by personality; medium: fights when armed; high/Protection: always). Paid up front, no refund; max 3 companions. Following is a `follow` goal steered directly (like fighting), forced at the decision cadence when farther than 1.5× `followM`. Needs keep running; away from home the companion camps. Bond: +0.5 opinion per calendar hour within 30 m (up to 60), +2 for a dangerous animal killed together. A free companion leaves when opinion drops below 0.
- **D-NPC-4 — A grown son without a family in every settlement (COMP-02):** added in `createNewGame` with a separate RNG stream (the rest of the population is unchanged). The population lives in the save, not in the world cache, so no `GEN_VERSION` bump; `SAVE_VERSION` 7 (`kin`, `companion`, `gifts`, `joinAskDay`). Migration 6→7 derives `kin` (profession → head, other adult → spouse); old saves get no son.
- **D-NPC-5 — Shared weapon score `weaponScore`** (damage × quality × wear) for NPCs (`wieldBest`) and the player's automatic choice (`switchWeapon`). An NPC switches to a better weapon even when the one in hand is usable; received armour is worn when better for its slot (`armorScore`).

## Zapis

- **D-SAVE-1 — Zapis = zmiany względem wygenerowanego świata, więc jest ważny tylko dla tego samego `seed` i `GEN_VERSION`.** Niezgodność → jawny odrzut z komunikatem (bez migracji świata — generatora nie da się „przemigrować”). Każda zmiana generatora (bump `GEN_VERSION`) unieważnia stare zapisy; menu je oznacza.
- **D-SAVE-2 — Format zapisu: `SAVE_VERSION` + łańcuch migracji `MIGRATIONS[n]` (n→n+1) w `save/db.ts`.** Nowszy lub nieobsługiwany format → odrzut. Nowa gra zawsze tworzy nowy slot (`slot-<seed>-<ts>`).

- **D-SIM-9 — Myśliwy (łuk) poluje tylko na zwierzynę niegroźną: sarna, jeleń, zając.** Dziki (agresywne) atakują w zwarciu i samotny łucznik ginął w testach długiej symulacji. Dziki nadal bronią się, a wilki są zwalczane jako drapieżniki. W zwarciu (≤ 6 m) NPC dobywa najlepszej broni białej z ekwipunku.
- **D-SIM-10 — NPC powalony (HP ≤ 0) pozostaje nietykalny, dopóki HP nie wróci > 0; śmierć przy HP ≤ −20 z dowolnej przyczyny** (trafienie, krwawienie, głód). Bez pomocy krwawienie może zabić — zgodnie z wizją (ochrona do −20 HP).
- **D-SIM-11 — Nawigacja lokalna: objazd budynku przez narożnik powiększonego obrysu** (`sim/detour.ts`, tylko bliski LOD), zamiast samego ślizgu po ścianie. Znane ograniczenie: stojący aktor na wąskim przejściu może blokować (tylko miękka separacja).

- **D-SAVE-3 — Celowo niezapisywane:** strzały w locie (`Sim.projectiles`), akumulatory interwałów systemów (`sysAcc` — po wczytaniu systemy okresowe startują od zera, max opóźnienie = interwał), kamera, otwarty panel/toast UI, diagnostyka. `snapshot` zwraca kopię stanu.

## Rendering i assety

- **D-REN-1 — Assety Quaternius (CC0):** drzewa/krzewy/skały (Stylized Nature), moduły domów (Medieval Village), rekwizyty (Fantasy Props — tylko neutralne: kowadło, beczki, stragan), zwierzęta (Animated Animal Pack), postacie = głowa z Universal Base Characters (wycięta nad szyją w skrypcie) + stroje Peasant/Ranger + animacje UAL1. Szczegóły: `docs/assets/README.md`.
- **D-REN-2 — Szablony scalane per materiał + InstancedMesh** (budynki, roślinność). Draw calls ~ szablony × materiały.
- **D-REN-3 — Brak modeli: szczur, zając, dzik, niedźwiedź, owca, kura, łoś → proceduralne placeholdery.**
- **D-REN-5 — Low-poly to styl, nie limit jakości (VISION-APPENDIX).** Efekty (cząsteczki ognia/iskry, chmury, opady, mokry/ośnieżony teren, dekale krwi) dozwolone, jeśli mieszczą się w budżecie D-PERF; każdy efekt za profilem jakości i mierzony `bench:render`.
- **D-REN-4 — Profile jakości** (`render/quality.ts`): zasięg widzenia, LOD terenu, promienie modeli roślin/postaci, cienie, pixel ratio.
- **D-REN-6 — Kierunek: naturalny wygląd materiałów i światła; oszczędna geometria tam, gdzie nie psuje sylwetki** (2026-10-01; VISION-APPENDIX „Kierunek graficzny”: low poly nie ogranicza realistycznego designu, jeśli nie kosztuje dużo FPS — appendix wygrywa z VISION.md §„Oprawa” w zakresie stylu, geometria proceduralna zostaje). Konsekwencje: gładkie normalne terenu, detal gruntu, selektywny PBR+IBL dopuszczalne po A/B (`render--002`). Wymiana placeholderów/modeli nie wynika z tej decyzji (D-REN-3). ❓ Akceptacja wyglądu po A/B (gładki teren, tone mapping) — użytkownik.
- **D-REN-7 — Kolejność i granice prac graficznych** (2026-10-01; research 002 + review 005, z korektami w `render--002` §„Krytyczna ocena”). Zostajemy na Three.js `WebGLRenderer` (bez migracji WebGPU). Kolejność: metryki → światło/niebo → teren → pilot PBR (fala 4a) → efekty pogody/ognia/wiatru/wody na wspólnym fundamencie (4b) → warunkowe wykończenie i optymalizacje tylko przy zmierzonym problemie (fala 6, `render--003`). Każdy krok: timebox, fallback, keep/drop. Low bez composera; jeden shadow-casting directional; bez cieni świateł punktowych; pula świateł stała per profil; postprocessing najwyżej jeden pass wybrany przez A/B, nie zestaw AO+bloom+AA+LUT.

## Wydajność (D-PERF)

- Budżety CPU (ms): klatka 33.3 (30 FPS minimum na słabszym sprzęcie), sim.tick 4, render.cpu 10, budowa chunka 8. Uzasadnienie: 60 FPS docelowo na desktop = 16.7 ms, zostawiamy połowę na GPU/driver.
- **GPU nie jest mierzone** (brak powszechnego `EXT_disjoint_timer_query_webgl2`); raportujemy tylko CPU i `renderer.info` (draw calls, trójkąty, geometrie, tekstury).
- Headless = SwiftShader (programowy GPU) → ~4 FPS przy ~0.5 mln trójkątów; wyniki FPS z headless **nie są** reprezentatywne; pomiary CPU tak.
- **D-PERF-2 — Dwa poziomy weryfikacji grafiki** (2026-10-01, `render--002`). *Headless* (agent): fazy JS (przygotowanie = `render.cpu` − `render.draw`, który zawiera się w `render.cpu`; `render.terrain`, `render.vegetationRebuild`), `renderer.info`, liczba programów i świateł, zrzuty z tych samych kadrów; bramka pakietu ≤10% regresji p95 vs baseline (pojedyncza mała zmiana ≤5%; poniżej szumu WSL = nierozstrzygnięte). *Urządzenie* (użytkownik): RAF pacing p50/p95/p99, GPU timer (`EXT_disjoint_timer_query_webgl2` jeśli dostępny), 10–15 min na telefonie; cel 30 FPS low/mobile, 60 FPS medium/laptop. Bez danych z urządzenia efekt jest „wydajność urządzeń niezweryfikowana” (❓) i na low domyślnie tylko, jeśli nie dodaje pracy per piksel. Korekta wcześniejszego zapisu: „pomiary CPU reprezentatywne” dotyczy faz JS porównywanych w tym samym środowisku, nie `render.draw` na SwiftShader.

## UI

- **D-UI-1 — Vue HUD czyta stan przez licznik `version` (5 Hz), nie przez głęboką reaktywność.** Brak kosztu proxy na stanie symulacji.
- **D-UI-2 — Esc przy pointer-lock najpierw zwalnia kursor (zachowanie przeglądarki); drugi Esc otwiera menu/przerywa czynność.** Menu pauzuje świat.
- **D-UI-3 — Mobile:** joystick L, drag kamery prawą połową, przyciski Akcja/Atak/Bieg/Walka/Skradanie, pasek menu u góry; auto-cel 220° i obrót do celu.
- **D-MAP-1 — Mgła wojny (MAP-01, `IMPORTANT-PRODUCT-NOTES.md`):** siatka 64 m (128×128 dla świata 8 km), odkrywanie w promieniu 180 m wokół gracza co 2 s (`navigationSystem`), bitmaska w `px.explored` (zapis; stare zapisy zaczynają z pustą mgłą). Maska rysowana na mapie i minimapie z wygładzeniem (miękkie krawędzie); osady/budynki w mgle ukryte. Lista osad w panelu mapy zostaje (nazwy i drogi znane ze słyszenia — autopilot). Widoczność aktorów wg zmysłów to osobny system (MAP-02, v2).

- **D-UI-4 — Interfejs wyłącznie po angielsku (UI-LANG-01, `IMPORTANT-PRODUCT-NOTES.md`, potwierdzone przez użytkownika 2026-10-01):** cały tekst widoczny dla gracza (UI, nazwy przedmiotów/budowli/gatunków/umiejętności, komunikaty symulacji, zadania, daty, pogoda, błędy zapisu) jest po angielsku, bez warstwy i18n (wybór użytkownika: „English only”). Terminologia: `docs/design/ui-english-glossary.md`. ~~Nazwy własne (osady, NPC) pozostają bez zmian. Dokumentacja i komentarze mogą być po polsku.~~ **Zastąpione przez D-LANG-1.**
- **D-LANG-1 — English everywhere (author decision, 2026-10-01; supersedes the proper-name and docs clauses of D-UI-4).** Player-facing text, proper names, documentation, plans, quest designs and code comments are English. NPC names: English first name + occupational surname hinting at the trade (fixed by the author: the home guard is **Mark Hornblower**); settlements and landmarks get English names. Existing Polish docs are legacy — translate when substantially edited, never add new Polish text. Follow-up (not done yet): switch `NAMES` (`src/game/data/professions.ts`) and settlement `NAMES` (`src/game/world/gen/settlements.ts`) to English and decide how occupational surnames are generated (per-profession list vs. quest-cast renaming before first meeting); a name change in the generator needs a `GEN_VERSION` bump. Reference cast: `docs/design/quests/QUEST-WORLD.md`.
## Planowanie (2026-09-30)

- **D-PLAN-1 — Najpierw domknięcie v1, potem VISION-APPENDIX falami** (decyzja użytkownika 2026-09-30). Kolejność: `docs/roadmap/v1-closure-and-appendix.md`. Wymagania dodatku w FEATURES.json mają `scope: "v2"`.
- **D-PLAN-2 — Pozycje review v1 oznaczone jako potwierdzone obniżają status powiązanych FEATURES** (`verified` → `in_progress`: CRAFT-02, SAVE-01, ECON-01, WORLD-04; DIAG-02 → `implemented_unverified`, bo PERF.md nie istnieje). Kryteria nie zostały osłabione; status wraca do `verified` po poprawce z testem regresji (plan `game--002`).
- **D-PLAN-3 — „Relacja” z dodatku = istniejące `npc.opinion`** (−100..100). Prezenty, towarzysze i burmistrz używają tego pola zamiast nowego systemu relacji.
- **D-PLAN-4 — Spatial grid już istnieje** (`sim.actors.query`, `sim.nodes.query`); wymaganie dodatku realizowane jako audyt i usunięcie pełnych skanów (PERF-01, plan `diag--001`). Kadencja decyzji (AI-01) jest osobna od LOD aktualizacji (D-SIM-1).
- **D-PLAN-5 — WORLD-10 (dźwięki otoczenia) pozostaje `implemented_unverified` i nie blokuje ogłoszenia v1.** Logika (cooldown, limit głosów, sprzątanie AudioContext) ma testy; jakości brzmienia nie da się ocenić w headless — potrzebny odsłuch przez użytkownika. Dźwięki są proceduralnymi placeholderami (znane ograniczenie).
