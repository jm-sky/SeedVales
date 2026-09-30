# Wydajność — raport (PERF)

**Aktualizacja:** 2026-09-30 (sesja 2, plan [diag--001](../plans/diag--001--sim-hotspots-and-perf-report.md))
**Kod:** po `game--002` (GEN_VERSION 7, SAVE_VERSION 4) + audyt pełnych skanów (PERF-01).

## Środowisko i ograniczenia pomiaru

- CPU Intel Core Ultra 7 268V ×8, WSL2 (Linux 5.15), Node v22.15.1; przeglądarka: Chromium headless (Playwright).
- **Headless = SwiftShader (programowy GPU):** FPS i czas GPU są niereprezentatywne; czasy CPU (sim, `render.cpu`, budowa chunków, przebudowa roślinności) są reprezentatywne.
- **GPU nie jest mierzone** (brak powszechnego `EXT_disjoint_timer_query_webgl2`) — raportujemy tylko CPU i `renderer.info` (D-PERF).
- **Nie zmierzono na realnym telefonie** — profil `low` i emulacja mobile w e2e dotyczą tylko UI/sterowania.
- WSL daje szum pomiarowy rzędu ±20% p95 — regresje potwierdzamy powtórką (kolumny „a / b” = dwa przebiegi).

## Budżety (D-PERF)

| Metryka | Budżet | Uzasadnienie |
|---|---:|---|
| klatka (CPU) | 33.3 ms | minimum 30 FPS na słabszym sprzęcie |
| `sim.tick` | 4 ms | przy 60 FPS (16.7 ms) zostaje połowa na GPU/driver |
| `render.cpu` | 10 ms | jw. |
| budowa chunka terenu | 8 ms | jeden chunk na klatkę bez przycięcia |

## Sceny

**`pnpm bench:sim`** (Node, seed 1337, rozgrzewka 5 s, krok 1/60 s, timery diag włączone, `detailed=sim`; JSON+MD w `test-results/bench/`, baza `scripts/bench/baseline.json`):

- `small-settlement` — gracz w osadzie SM, 60 s.
- `crowded-settlement` — osada LG + 60 dodatkowych zwierząt, 60 s.
- `dense-forest` — marsz przez las, 60 s.
- `combat` — 6 wilków atakuje, 30 s.
- `chunk-traverse` — 1200 m drogą (streaming węzłów zasobów).
- `accelerated-sleep` — 8 h kalendarza przy ×40.
- `long-run-5-days` — 5 dni gry, 5 powrotów w te same miejsca, krok 0.5 s (jeden `sim.step` = 5 pod-kroków, więc „>4 ms” nie oznacza klatki 60 FPS); pamięć i rozmiar zapisu.

**`pnpm bench:render medium`** (Chromium headless, seed 1337, rozgrzewka 4 s, pomiar 6 s): `small-settlement`, `crowded-settlement`, `dense-forest`, `chunk-traverse` (12 teleportów po 100 m wzdłuż drogi — celowo najgorszy przypadek streamingu).

## Symulacja — przed/po audycie (ms, 2 przebiegi każdy)

| Scena | p95 przed | p95 po | p99 przed | p99 po | >4 ms przed | >4 ms po |
|---|---|---|---|---|---|---|
| small-settlement | 0.096 / 0.107 | 0.099 / 0.111 | 0.183 / 0.187 | 0.199 / 0.201 | 0 / 0 | 0 / 0 |
| crowded-settlement | 0.378 / 0.361 | 0.369 / 0.367 | 0.505 / 0.548 | 0.544 / 0.506 | 0 / 0 | 0 / 0 |
| dense-forest | 0.039 / 0.039 | 0.044 / 0.041 | 0.085 / 0.098 | 0.094 / 0.082 | 0 / 0 | 0 / 0 |
| combat | 0.056 / 0.060 | 0.044 / 0.067 | 0.110 / 0.113 | 0.120 / 0.168 | 0 / 0 | 0 / 0 |
| chunk-traverse | 0.043 / 0.040 | 0.052 / 0.037 | 0.099 / 0.106 | 0.185 / 0.086 | 0 / 0 | 0 / 0 |
| accelerated-sleep | 0.589 / 0.647 | 0.574 / 0.740 | 0.975 / 0.795 | 0.968 / 1.039 | 0 / 0 | 0 / 0 |
| long-run-5-days | 0.786 / 0.817 | 0.795 / 0.860 | 0.981 / 0.976 | 1.065 / 2.167 | 5 / 5 | 3 / 3 |

Wniosek: przy obecnych populacjach (91 NPC, ~180–240 zwierząt) zmiana jest neutralna w granicach szumu — zapytania przestrzenne o dużym promieniu (≈400 m wokół osady) kosztują tyle co skan ~200 zwierząt, ale skalują się z powierzchnią, nie z populacją. `dens` wypadł z listy najdroższych systemów. Wszystkie sceny ≪ 4 ms (p95 ≤ 0.9 ms). Dryf crowded p95 0.34 (sesja 1, świat GEN 5) → 0.37 wynika ze zmiany świata (GEN 7) i objazdów budynków (D-SIM-11) i mieści się w progu regresji 1.25×. Baza `scripts/bench/baseline.json` zaktualizowana po audycie (świat GEN 5 → 7 = inne sceny, porównanie ze starą bazą byłoby nieadekwatne).

### Obciążenie i najdroższe systemy (przebieg „po” #1)

| Scena | obciążenie | najdroższe systemy (p95, ms) |
|---|---|---|
| small-settlement | npcs=91 animals=181 nearNpc=9 nearFauna=7 spatialQueries=25816 collisionChecks=9223 aiPlans=65 aiFailures=16 | quests 0.59, dens 0.20, regrow 0.20 |
| crowded-settlement | npcs=91 animals=241 nearNpc=19 nearFauna=43 spatialQueries=68722 collisionChecks=42281 aiPlans=78 aiFailures=14 | fauna 0.29, npc 0.18, quests 0.07 |
| dense-forest | npcs=91 animals=181 spatialQueries=5246 collisionChecks=3601 aiPlans=64 chunksGenerated=1 | quests 0.08, npc 0.05, ecology 0.04 |
| combat | npcs=91 animals=187 spatialQueries=4540 aiPlans=24 aiFailures=5 | quests 0.18, npc 0.07, ecology 0.05 |
| chunk-traverse | npcs=91 animals=187 spatialQueries=121985 collisionChecks=57848 aiPlans=984 aiFailures=200 chunksGenerated=20 | regrow 0.57, quests 0.12, ecology 0.06 |
| accelerated-sleep | npcs=91 animals=183 nearNpc=18 nearFauna=12 spatialQueries=23134 aiPlans=203 aiFailures=24 | npc 0.40, fauna 0.16, quests 0.08 |
| long-run-5-days | npcs=91 animals=216 ground=92 corpses=0 nodesState=452 saveKB=428 heapΔ=7.5 MB | — |

`quests` na szczycie małych scen to pojedyncze wywołania co 10 s (pierwsze po rozgrzewce JIT); nie wpływa na p95 ticka. `aiFailures` w `chunk-traverse` to NPC przy dalekim LOD, których cele zostały daleko od teleportowanego gracza (cooldown, bez pętli).

## Rendering (medium, CPU)

| Scena | frame CPU med/p95 | render.cpu med/p95 | draw calls | trójkąty | inne |
|---|---|---|---:|---:|---|
| small-settlement | 4.7 / 12.6 | 3.8 / 11.5 | 353 | 1.08 M | mixers 9, heap 128 MB |
| crowded-settlement | 5.7 / 13.2 | 4.6 / 12.3 | 425 | 0.93 M | chunk build 0.5 / 1.6, mixers 15, heap 160 MB |
| dense-forest | 6.5 / 7.9 | 6.2 / 7.7 | 91 | 1.08 M | chunk build 0.4 / 1.1, heap 164 MB |
| chunk-traverse | 13.1 / 74.8 | — | — | — | chunk build 3.6 / 4.7 (max 8.1), veg rebuild 4.9 / 30.7, nodes gen 0.3 / 0.7 per chunk, heap 206 MB |

### Uwaga o szumie (powtórka po review 002)

Licznik „>4 ms” w `long-run-5-days` jest bardzo czuły na obciążenie maszyny: ten sam kod dał 3–5 (spokojna maszyna) i 35 (load average ~2) — test A/B HEAD vs poprawki review w tych samych warunkach: 35 vs 27. Nie jest to regresja kodu; p95 wszystkich scen nadal < 1 ms.

## Znane wąskie gardła

1. **Przebudowa roślinności przy przeskoku** (`render.vegetationRebuild`): mediana 4.9 ms, ale p95 30.7 ms przy teleporcie o 100 m (generacja ~30 chunków węzłów naraz + wypełnienie instancji; 13 próbek). Przy marszu przebudowa co ~64 m (pół chunka) → pojedynczy koszt ~5 ms. Poprawa (przy `render--001`): prefetch chunków węzłów po 1–2 na klatkę w pierścieniu `vegFar` + margines i/lub rozłożenie wypełniania instancji na kilka klatek.
2. **Postacie: 7–12 draw calli na osobę** (skinned części nie są łączone) — dominują draw calls w osadach (353–425). Poprawa: atlas + scalenie części (render--001 / tools--001).
3. **Budowa chunka terenu** max 8.1 ms (na granicy budżetu 8 ms) przy teleportach; przy marszu 3.6 ms.
4. **Brak pomiaru GPU i telefonu** — patrz wyżej.

## Audyt pełnych skanów (PERF-01)

Reguła: systemy per-tick / per-aktor pytają tylko obiekty w zasięgu (`sim.actors.query`, `sim.nodes.query`, `sim.groundNear`, `sim.corpsesNear`, `sim.buildingsNear`) albo indeksy (`sim.building(id)`, `sim.householdBuildings`, `sim.settlementBuildings`, `sim.npcsOf`). Skany całych list są dozwolone w rzadkich systemach kalendarzowych i akcjach gracza — z uzasadnieniem.

| Miejsce | Było | Decyzja |
|---|---|---|
| `quests.ts` szczury przy budynku / pozostałe szczury | `s.animals.filter` w pętli po budynkach | `countNear` (`sim/queries.ts`) — zapytanie 40/60 m |
| `quests.ts` wilki przy osadzie | `s.animals.filter` per osada | `animalsNear` (promień osady + 350 m) |
| `quests.ts`, `build.ts`, `interact.ts` (gospodarz, handlarz, strażnik) | `s.npcs.find` | `sim.npcsOf(settlementId)` (indeks) |
| `worldSystems.ts` szczury przy gnieździe | `s.animals.filter` | `countNear` 40 m |
| `worldSystems.ts` zwierzęta legowiska | `s.animals.filter` per legowisko | jedno przejście na uruchomienie systemu (co 30 s) → mapa `denId → liczba` (zwierzęta legowiska wędrują do 160 m — zapytanie przestrzenne byłoby błędne) |
| `fauna/ai.ts` padlina/przynęta, zjadanie | `state.ground` / `state.corpses` `.find` z dystansem | `sim.groundNear` / `sim.corpsesNear` (nowe indeksy przestrzenne, mutacje przez `sim.addGround/removeGround/addCorpse/removeCorpse`) |
| `fauna/ai.ts` zagroda/koryto | `state.buildings.find` | `sim.householdBuildings(hid)` |
| `npc/queries.ts` `householdBuilding` / `settlementBuildings` | `state.buildings.find/filter` | indeksy w `Sim.rebuildBuildingIndex` |
| `sim.building(id)` (27 wywołań, m.in. per plan NPC) | `state.buildings.find` | `Map` id → budynek |
| `npc/goals.ts` ranny do pomocy | `state.npcs.find` z dystansem | `sim.actors.query(150)` |
| `npc/goals.ts` sprzedawca jedzenia | `state.npcs.find` | `sim.npcsOf` |
| `npc/duties.ts` zwłoki dla myśliwego | `state.corpses.find` | `sim.corpsesNear(200)` |
| `interact.ts` cele przy graczu (5 Hz) | skan `corpses` / `ground` | `corpsesNear` / `groundNear` |
| `npc/ai.ts` `npcSystem`, `fauna/ai.ts` `faunaSystem` | pętla po wszystkich aktorach | **zostaje** — scheduler LOD (każdy aktor ma `nextUpdate`); koszt O(n) porównań czasu |
| `worldSystems.ts` `ecology` (psucie, trwałość, pola) | pętle po budynkach/NPC/ziemi | **zostaje** — system kalendarzowy co 5 s, praca per obiekt jest konieczna |
| `quests.ts` pętla po budynkach z gniazdem | skan `buildings` co 10 s | **zostaje** — ~150 budynków, filtr `ratNest` |
| `npc/works.ts` `shear` | pętla po zwierzętach | **zostaje** — rzadki akt pracy |
| `interact.ts` świadkowie kradzieży | pętla po NPC | **zostaje** — akcja gracza, nie per tick |
| `treasury.ts` `totalMoney` | pętla po NPC | **zostaje** — tylko testy/diagnostyka |

Nowe liczniki diagnostyczne z sesji 2: `ai.detours`, `fauna.huntGiveUp`, `world.gen.routeBandMiss`, `world.gen.homeRetry`, `world.gen.structureMissing`, `world.gen.householdSkipped`.

## Jak odtworzyć

```bash
pnpm bench:sim                     # 2× dla potwierdzenia; porównanie z scripts/bench/baseline.json
pnpm dev --port 5199 &             # potrzebne dla bench:render
pnpm bench:render medium
```
