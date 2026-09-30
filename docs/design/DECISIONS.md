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

## Ekonomia

- **D-ECON-1 — Pieniądze tylko się przemieszczają: każdy przepływ ma płatnika i odbiorcę.** Portfele gracza i NPC (także zmarłych) + skarbce osad (`SettlementState.treasury`, start `TREASURY_START`: SM 150, MD 300, LG 600 m). Skarbiec płaci nagrody za zadania i opłaty karawan; przyjmuje noclegi bez gospodarza i przeprosiny. Jawne źródło z zewnątrz: monety wykopane łopatą w osadzie (ITEM-04). Podatki/dochody skarbca — poza v1 (skarbiec może się wyczerpać: nagrody wtedy częściowe).
- **D-ECON-2 — Udźwig jest twardym limitem przy podnoszeniu, braniu z magazynu i kupnie** (`fitQty`); przeciążenie (spowolnienie ×0.5) zostaje tylko jako stan przejściowy (np. zdjęty plecak).

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

## Wydajność (D-PERF)

- Budżety CPU (ms): klatka 33.3 (30 FPS minimum na słabszym sprzęcie), sim.tick 4, render.cpu 10, budowa chunka 8. Uzasadnienie: 60 FPS docelowo na desktop = 16.7 ms, zostawiamy połowę na GPU/driver.
- **GPU nie jest mierzone** (brak powszechnego `EXT_disjoint_timer_query_webgl2`); raportujemy tylko CPU i `renderer.info` (draw calls, trójkąty, geometrie, tekstury).
- Headless = SwiftShader (programowy GPU) → ~4 FPS przy ~0.5 mln trójkątów; wyniki FPS z headless **nie są** reprezentatywne; pomiary CPU tak.

## UI

- **D-UI-1 — Vue HUD czyta stan przez licznik `version` (5 Hz), nie przez głęboką reaktywność.** Brak kosztu proxy na stanie symulacji.
- **D-UI-2 — Esc przy pointer-lock najpierw zwalnia kursor (zachowanie przeglądarki); drugi Esc otwiera menu/przerywa czynność.** Menu pauzuje świat.
- **D-UI-3 — Mobile:** joystick L, drag kamery prawą połową, przyciski Akcja/Atak/Bieg/Walka/Skradanie, pasek menu u góry; auto-cel 220° i obrót do celu.

## Planowanie (2026-09-30)

- **D-PLAN-1 — Najpierw domknięcie v1, potem VISION-APPENDIX falami** (decyzja użytkownika 2026-09-30). Kolejność: `docs/roadmap/v1-closure-and-appendix.md`. Wymagania dodatku w FEATURES.json mają `scope: "v2"`.
- **D-PLAN-2 — Pozycje review v1 oznaczone jako potwierdzone obniżają status powiązanych FEATURES** (`verified` → `in_progress`: CRAFT-02, SAVE-01, ECON-01, WORLD-04; DIAG-02 → `implemented_unverified`, bo PERF.md nie istnieje). Kryteria nie zostały osłabione; status wraca do `verified` po poprawce z testem regresji (plan `game--002`).
- **D-PLAN-3 — „Relacja” z dodatku = istniejące `npc.opinion`** (−100..100). Prezenty, towarzysze i burmistrz używają tego pola zamiast nowego systemu relacji.
- **D-PLAN-4 — Spatial grid już istnieje** (`sim.actors.query`, `sim.nodes.query`); wymaganie dodatku realizowane jako audyt i usunięcie pełnych skanów (PERF-01, plan `diag--001`). Kadencja decyzji (AI-01) jest osobna od LOD aktualizacji (D-SIM-1).
