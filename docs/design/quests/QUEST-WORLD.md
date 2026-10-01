# Quest world — wspólna obsada, miejsca i powiązania

**Status:** propozycja N (2026-10-01), wspólna dla trzech pakietów questów. Nie jest kanonem gry ani implementacją. Gdy plik scenariusza i ten plik się różnią, wygrywa ten plik — scenariusze zostały do niego dopasowane w review 2026-10-01 ([REVIEW-2026-10-01](REVIEW-2026-10-01.md)).

## Zasady obsady

1. **Rola, nie imię, jest kluczem.** Generator (`src/game/world/gen/settlements.ts`, `centres.ts`) tworzy osadę domową **SM**, sąsiednią **MD** (~1 dzień marszu) i miasteczko **LG** (kolejne 1–2 dni). Gospodarstwa SM: farmer, woodcutter, hunter, guard, herbalist, shepherd, trader (bez kowala). MD dodaje drugiego farmera i kowala; LG — po dwóch farmerów/drwali/handlarzy/strażników.
2. **Imiona w scenariuszach to uchwyty projektowe.** Przy obsadzaniu quest wybiera istniejącego NPC o danej profesji/household i wyświetla jego wygenerowane imię. Uchwyty dobrano w stylu puli `NAMES` z `src/game/data/professions.ts` (polskie imiona); nie wymagają zmiany puli. Imiona historyczne (zmarli, przodkowie) są zwykłym tekstem.
3. **Jeden slot = jedna osoba we wszystkich pakietach.** Jeśli dwa pakiety opisywały tę samą rolę w tej samej osadzie, postacie zostały scalone (tabela niżej). Żaden NPC nie ma sprzecznych ról.
4. **Nazwy osad w dialogach:** `{H}`, `{V}`, `{T}` — podstawiane nazwą wygenerowanej osady. Stare uchwyty Groka: Domowice = H, Brzeżyna = V. Landmarki questowe mają angielskie nazwy (UI po angielsku): Blackwater Chapel, Pinewatch, Ash House, Split Hazel itd.
5. **Brak NPC/slotu:** jeśli seed nie ma pasującego household (np. brak dorosłego syna drwala), quest nie startuje; nie doklejamy profesji i nie teleportujemy postaci.

## Obsada

### H — osada domowa (SM)

| Household (profesja) | Osoby (uchwyt) | Questy | Scalone z |
|---|---|---|---|
| farmer + **sołtys** (village head) | **Radosław** | G02 (trzyma zapłatę za lemiesz), G05 (mediator), G06, G08 (zleceniodawca), Q03 (wspólny magazyn), Q09 (zboże) | — |
| woodcutter | **Mirosław**; żona **Ludmiła**; matka **Jadwiga**; dorosły syn **Mieszko** | G05, Q03, Q06, Q07, Q09 | Codex: Bram, Lina, Edda, Rowan |
| hunter | **Jarosław**; żona **Marta**; córka **Halina** (dziecko); pies Szarik (zginął przed startem gry) | Q01, Q02 (opcjonalnie), G03 (Marta, Halina), G07 | Codex: Mara |
| guard | **Wojciech** | G01, G03, G07, Q07 | Codex: Ada (rola w H) |
| herbalist | **Dobrawa**; syn **Maciej** (dziecko) | G04, G07, G08 | — |
| shepherd | **Mira**; mąż **Tomasz** (warzy cienkie piwo); dorosły syn **Leszek** (uczeń Jarosława); jagnię Miki | G01, G08 (beczka Tomasza), Q01 (Leszek) | Codex: Kit → Leszek |
| trader | **Stanisław** | Q01, Q09, G06 | Codex: Oren |

### V — osada sąsiednia (MD)

| Household | Osoby | Questy | Scalone z |
|---|---|---|---|
| blacksmith | **Bogdan** (stary kowal); córka **Zofia** (prowadzi kuźnię) | G02, Q04, Q06 | Grok: Bogdan (przeniesiony z H — SM nie ma kowala); Codex: Tobin, Nessa |
| farmer + **sołtys V** | **Małgorzata** | Q08, Q11 (zarządza wspólnym skarbcem), G05/G06/G08 (gdy rozmowa toczy się w V) | Codex: Dena; Halvar (Q11) |
| farmer | **Kazimierz** | G05 | — |
| hunter | **Dorota** | Q02, Q05 (wzmianka) | Codex: Sella |
| shepherd | **Elżbieta** | Q08, G05 (świadek pastwiska) | Codex: Wren; Grok: Wanda (rola świadka) |
| guard | **Bogna** | Q02, Q08 | Codex: Ada (rola w V) |
| trader | **Janko** | G06 | — |
| woodcutter | **Ewa** (szkutniczka i przewoźniczka sezonowa w household drwala) | Q11 | — |
| herbalist | **Świętosława** (starsza; trzyma odpis księgi kaplicy) | Q11 | Codex: Anika (Q11) |

### T — miasteczko (LG)

| Rola | Osoba | Questy | Scalone z |
|---|---|---|---|
| trader | **Radomira** (wnuczka autorki mapy) | Q05 | Codex: Iven |
| pisarz/archiwista ratusza (N) | **Przemysł** | Q05, Q12 (rejestr straży), Q13 (księga cmentarna) | Codex: Pell; Olek (Q12); Anika (Q13) |
| trader, kupiec-inwestor | **Zbigniew** | Q10, Q11, Q12, Q13 (kupiec przy zakończeniach sprzedażowych) | Codex: Corvin, Soren, Olek (Q11) |
| guard | **Wisława** (dowodzi strażą drogi) | Q12 | Codex: Nela |
| hunter / przewodniczka górska | **Milena** | Q12 | Codex: Vika |
| były strażnik drogi (senior w household strażnika) | **Dobromir** | Q12 (zleceniodawca) | nowa postać zamiast „kamienia cmentarnego” jako źródła tropu |
| woodcutter-cieśla | **Sławomir** | Q13 | Codex: Tomas |
| górniczka (D: `NPC-06`) | **Agnieszka** | Q10 | Codex: Ysra |
| sołtys/wójt T (rola) | **Bolesław** | Q10 | Codex: Bram jako przedstawiciel (zastąpiony — H jest za daleko na outpost) |
| szwaczka | **Irena** | Q13 | — |

### Poza osadami

| Postać | Gdzie | Quest |
|---|---|---|
| **Piotr**, wędrowiec | droga lokalna przy H | G01 |
| Siwy — stary wilk z obciętym palcem lewej przedniej łapy | legowisko pod wywróconą sosną na północ od H | G07 |
| locha z warchlakami | wykrot przy dolnej drodze V | Q02 |
| biały zając (albinos, `FAUNA-09` P) | leszczyny na skraju lasu H | Q01 |
| stary łoś byk | bagno Blackwater | Q11 |
| niedźwiedź „prime” | piwnica wieży Pinewatch | Q12 |
| jeleń na rykowisku | sad przy Ash House | Q13 |

## Mapa miejsc (proponowana topologia)

```
           [Pinewatch ruins]   [old adit]           (góry za T)
                    \            /
 [Ash House] ---- {T} miasteczko ---- [stone circle, river valley]
                    |  1–2 dni
                  {V} sąsiednia: kuźnia, studnia i pastwisko, dolna droga (wykrot lochy)
                    |  ~1 dzień
   [boundary oak] --+-- [marsh: zioła; Blackwater Chapel i stara grobla]
                    |
                  {H} dom: leszczyny, słupy z pochodniami, beczka Tomasza, legowisko Siwego
```

## Powiązania między questami

Wszystkie powiązania są **miękkie** (dodatkowa kwestia, opcja lub informacja), chyba że zaznaczono inaczej. Żaden quest nie wymaga konkretnego zakończenia innego questu.

| Z → Do | Rodzaj | Opis |
|---|---|---|
| Q01 → Q02 | miękkie | Leszek/Jarosław znają gracza; Jarosław dodaje radę w Q02 |
| G04 → G07 | **bramka opcji** | Trucizna dla Siwego tylko po ukończonym G04 i relacji Dobrawy ≥10 |
| G03 ↔ G07 | miękkie | Szarik był psem Jarosława; Halina boi się wilków, jej ojciec poluje na Siwego |
| Q04 ↔ G02 | miękkie | Zła sprężystość starego młota tłumaczy wadę lemiesza; po Q04 Zofia mówi to wprost |
| Q04 → Q06 | brak | Q06 odbiera **klin i obuch siekiery** Mirosława, nie młot z Q04 |
| G05 ↔ Q03 | miękkie | Belki: wspólny magazyn albo drewno z rozstrzygnięcia sporu o dąb |
| Q09 ↔ G06 | miękkie | Stanisław ma gotówkę w towarze i boi się złego roku — tło listu do Janka |
| Q05 ↔ Q13 | miękkie | Przemysł pamięta gracza; zakres jego wiedzy tylko z rozmów |
| Q10/Q11/Q12/Q13 | miękkie | Zbigniew pamięta wcześniejsze transakcje z graczem (ton, nie cena) |
| G01, G08 | miękkie | Household Miry: jagnię (G01), beczka Tomasza (G08) |

## Zasada równoległości (zastępuje `roadActive`)

Wcześniejszy pakiet Groka używał globalnego mutexu `roadActive`, który blokował pięć questów nawzajem, a pakiety Codexa nie znały tej reguły. To tworzyło przypadkowe blokady między pakietami. **Propozycja N:** brak globalnego mutexu. Questy mogą być aktywne równolegle; tylko questy z terminem (G04: 2 dni, Q06: umowa na dni) pokazują przy przyjęciu ostrzeżenie o kolidującym terminie. Fizyczna podróż i czas same ograniczają gracza. Flaga `roadActive` znika ze scenariuszy.

## Kalibracja nagród (propozycja do decyzji)

Źródła: `TREASURY_START` SM 150 / MD 300 / LG 600; sakiewki NPC z `professions.ts` (pasterz 15–40, drwal 20–50, myśliwy 25–70, strażnik 30–80, zielarz 30–70, kowal 60–150, handlarz 200–400); ceny `items.ts` (chleb 6, bandaż 6, maść 20, miecz 120, longsword 200, kolczuga 240, napierśnik płytowy 420, kusza 180); questy symulacyjne płacą 30–60 (`quests.ts`). D-ECON-1: brak kreacji monet — skarb jest jawnym źródłem zewnętrznym (jak ITEM-04).

| Skala | Przykłady | Gotówka dla gracza | Wartość przedmiotów |
|---|---|---|---|
| Mały lokalny (H) | G01, G03, Q01, Q03, Q07, Q09 | 10–35 z sakiewki/skarbca SM | drobne: wełna, chleb, pochodnie |
| Średni / droga H↔V | G02, G04, G05, G06, G07, G08, Q02, Q04, Q06, Q08 | 20–70 | do ~60 (skóra wilka, maści) |
| Wyprawa ze skarbem (V/T i dalej) | Q05, Q11, Q12, Q13 | 150–600 realnie do zdobycia | 200–800 (pierścienie, kamienie, broń mistrzowska) |
| Wielki projekt | Q10 | 300–900 jednorazowo **albo** udział 10–20% z rzeczywistych dostaw | — |

Wartości proponowanych przedmiotów (do zatwierdzenia w `items.ts`/LOOT-01): złoty pierścień 80–150, rubin/szmaragd szlifowany 120–250, srebrna sztaba handlowa 60–90, dzwon srebrzony (sprzedaż na metal i rzemiosło) 300–450, **Pinewatch Longsword** (longsword klasy mistrzowskiej) 450–600, wzmacniany kaftan skórzany wysokiej jakości 120–180. Wypłata ze skarbca osady nie może przekroczyć jego stanu (wypłata częściowa jak w `quests.ts`).
