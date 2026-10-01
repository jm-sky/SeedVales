# Quest pack — Roads, Work, and What We Keep

**Status: autorska propozycja narracyjna, nie zatwierdzony kanon i nie implementacja.** Przerobione w review 2026-10-01 ([REVIEW-2026-10-01](REVIEW-2026-10-01.md)); obsada, miejsca, powiązania i kalibracja nagród są teraz wspólne dla wszystkich pakietów: [QUEST-WORLD](QUEST-WORLD.md) (wygrywa przy sprzeczności).  
Data: 2026-09-30. Brief i ograniczenia tematyczne: Jan. Dialogi: English; dokumentacja projektowa: polski.  
Źródła odczytane na `8e891fcbffa06ea2ae65cbafddab2aa7c58b23e1`.

## Źródła i zakres pewności

- [VISION](../../VISION.md), w całości; szczególnie §4–5 (podróż/czas), §7–14 (osady/NPC/skills), §15–19 (fauna/zasoby), §23–26 (praca/zadania).
- [VISION-APPENDIX](../../VISION-APPENDIX.md), w całości: landmarki, ślady, reakcje zwierząt, gotowanie, towarzysze.
- [DECISIONS](../DECISIONS.md), [FEATURES](../../state/FEATURES.json), [PROGRESS](../../state/PROGRESS.md), [roadmap](../../roadmap/v1-closure-and-appendix.md).
- Przeczytane plany: [sim--001](../../plans/sim--001--ai-cadence-and-animal-threat.md), [npc--001](../../plans/npc--001--trade-gifts-companions.md), [economy--001](../../plans/economy--001--gathering-cooking-transport.md), [world--001](../../plans/world--001--landmarks-and-treasure.md).
- Kontrola kodu: `src/game/sim/quests.ts` i `interact.ts`. Obecne questy liczą zabicia/naprawę; napis „przegoń albo ubij” nie dowodzi działającego niebojowego zakończenia. Pakiet wymaga nowej obsługi narracji.

### Współistnienie z pakietem Groka i pakietem skarbów

Pierwotnie pakiety istniały obok siebie bez integracji, co dawało sprzeczne obsady tych samych slotów w H. Od 2026-10-01 wszystkie trzy pakiety dzielą jedną obsadę i mapę ([QUEST-WORLD](QUEST-WORLD.md)), a globalny mutex `roadActive` z pakietu Groka został usunięty. Indeks wszystkich questów: [README](README.md).

Oznaczenia we wszystkich plikach:

| Kod | Znaczenie |
|---|---|
| **I** | Istniejąca funkcja, opisana jako verified w FEATURES; nie oznacza ponownego przetestowania jej w tej sesji |
| **P** | Wymaganie wizji z istniejącym planem planned, jeszcze nie działająca funkcja |
| **D** | Zatwierdzony kierunek wizji, odłożony/deferred; brak obietnicy realizacji w v1/v2 |
| **N** | Nowa propozycja tego pakietu, wymagająca decyzji i osobnego projektu implementacji |

I: potrzeby, fizyczne podróże, profesje bazowe, zbieranie, crafting/zamówienia, naprawy budynków, konstrukcje, handel, oprawianie, świeżość, walka ze zwierzętami, legowiska, opinia/reputacja. P: towarzysze/prezenty, gotowanie w slotach, wózki ręczne, zachowania strachu, landmarki i skarby. D: wieloetapowe questy (`QUEST-03`), jaskinie (`WORLD-05`), outposty (`SET-04`), górnik i pozostałe nowe profesje (`NPC-06`), jazda/wozy (`WORLD-09`). **Każdy scenariusz wymaga D:QUEST-03 oraz N: dialogów warunkowych, pamięci dowodów i rezerwacji obsady. Żaden nie jest dziś gotową zawartością wykonywalną.**

Nie zmieniamy statusów FEATURES ani harmonogramu implementacji. Przy sprzeczności bieżący status FEATURES ma pierwszeństwo przed historycznym akapitem PROGRESS. Nowe postacie, miejsca, receptury, prawa własności i liczby w tym katalogu mają status N.

## Zestaw (po review 2026-10-01)

| Quest | Konflikt, postacie | Aktywności i kluczowy wybór | Zakończenia / ton |
|---|---|---|---|
| [Q01 A Hare Out of Place](q01-a-hare-out-of-place.md) | Myśliwy Jarosław, jego uczeń Leszek, handlarz Stanisław: futro, zwierzyna czy obserwacja? | Tropienie, obserwacja z ukrycia, polowanie | Białe futro; zwykła zwierzyna; zając zostaje. Ciekawość, mała duma |
| [Q02 The Hollow Below the Road](q02-the-hollow-below-the-road.md) | Myśliwa Dorota i strażniczka Bogna (V): locha z warchlakami przy drodze | Rozpoznanie wykrotu, ocena ryzyka | Usunięcie; objazd; warta do odejścia lochy. Odpowiedzialność |
| [Q03 A Roof Before Rain](q03-a-roof-before-rain.md) | Drwal Mirosław, Ludmiła, Jadwiga, Mieszko: belka nad izbą matki | Oględziny, pożyczka z magazynu, budowa | Wymiana belki; dobudówka; podpora. Przywiązanie i zmiana |
| [Q04 The Handle Remembers](q04-the-handle-remembers.md) | Kowalka Zofia i jej ojciec Bogdan (V): pęknięty młot | Próba narzędzia, odkrycie pęknięcia | Przekucie; nowy młot; pamiątka. Intymny |
| [Q05 The Map That Missed the River](q05-the-map-that-missed-the-river.md) | Handlarka Radomira i archiwista Przemysł (T): mapa babki | Wyprawa, suche łoże rzeki, kopanie, skrzynia | Rodzina; publiczny bród; szmaragd dla gracza. Odkrycie |
| [Q06 Room for One More](q06-room-for-one-more.md) | Mieszko chce iść do V; matka potrzebuje go w polu | Podróż z towarzyszem, obóz, odbiór zamówienia | Płatny; „someday that I mean”; solo. Pierwsza samodzielność |
| [Q07 Six Bowls, One Pan](q07-six-bowls-one-pan.md) | Ludmiła organizuje posiłek; Wojciech ma obchód | Świeżość, gotowanie, zastępstwo na warcie | Jeden stół; dwie zmiany; na progu. Ciepło i humor |
| [Q08 The Long Way to Water](q08-the-long-way-to-water.md) | Pasterka Elżbieta, sołtyska Małgorzata, Bogna (V) | Trasa, próbny wykop, budowa | Koryto; studnia; grafik. Sąsiedzkość |
| [Q09 Goods on the Ground](q09-goods-on-the-ground.md) | Stanisław ma narzędzia, domy H mają ciężkie dobra | Potrzeby, barter, noszenie | Wymiana; komis; lista potrzeb. Lekka negocjacja |
| [Q10 What the Mountain Owes](q10-what-the-mountain-owes.md) | Górniczka Agnieszka, kupiec Zbigniew, wójt Bolesław (T) | Sztolnia, złe powietrze, próbka, outpost | Sprzedaż; udział; sezon. Ambicja i koszt |

## Obsada, miejsca i powiązania

Przeniesione do [QUEST-WORLD](QUEST-WORLD.md). Zasada pozostaje: imiona to uchwyty projektowe, quest obsadza istniejącego NPC o danej roli; brak pasującego household oznacza, że quest się nie pojawia.

## Wspólny kontrakt scen i stanu (N)

Każdy plik definiuje własne flagi w przestrzeni `Qxx`. Flagi logiczne startują jako false, wyliczenia jako `unset`; rzeczy wykonane fizycznie mają ID encji/zdarzenia. Zapis „X + Y” w warunku oznacza AND; `A / B` w opisie wariantu to wybór, nie losowanie. Każdy wiersz `Player [A/B/…]` jest osobną wybieralną odpowiedzią; następująca po nim wypowiedź NPC jest jej reakcją. Po reakcji wracamy do wspólnej części albo wskazanego przejścia. Gracz nie wypowiada wszystkich wariantów.

1. **Wiedza:** NPC zna zdarzenie tylko jako świadek, uczestnik przekazania dowodu lub odbiorca wskazanej rozmowy. Dziennik gracza i globalna flaga nie są telepatią. Raport ustny pozwala reagować na raport, nie udaje oględzin. Wariant relacyjny oparty na `npc.opinion ≥ 25` dotyczy tonu/dodatkowej opcji, nigdy obowiązkowego przejścia; wartości są N do kalibracji. Domyślna wersja zawsze istnieje.
2. **Przebieg:** rozmowy pomocnicze są opcjonalne, chyba że warunek przejścia wymaga ich wyniku. Oględziny/praca pozostają czynnościami gracza. Przewidziane świadectwo NPC może zastąpić zręcznościowy/skillowy wąski gardło kosztem jego czasu i materiałów. Brak EXP i poziomów postaci. Trening wynika z praktyki, nie z magicznej premii po dialogu.
3. **Zakończenie:** wyłącznie przy jawnym potwierdzeniu dostępnej gałęzi; sprawdzić wszystkie warunki ponownie, zastosować jednorazowo. Zmiana świata, rozmowa epilogowa i wypłata są osobnymi skutkami jednego zapisanego wyniku. Wyjście z rozmowy nie wybiera zakończenia. Konsekwencje są zakresem tej propozycji, nie gotowymi bonusami silnika.
4. **Czas:** zapowiedź deszczu/wyjazdu nie uruchamia ukrytego zegara porażki. Termin pojawia się dopiero po podaniu go w dzienniku i świadomym umówieniu. Potrzeby i praca liczone w kalendarzu; walka w sekundach rozgrywki. Nie zatrzymujemy całego świata dla questa. Gdy sytuację rozwiąże NPC, uznajemy rzeczywisty wynik i wykonany wkład gracza; nie odtwarzamy uszkodzeń/zwierząt.
5. **Ekonomia:** każdy pieniądz i przedmiot ma właściciela, płatnika oraz źródło. Ceny pozostają do kalibracji; przed transakcją pokazać konkretną ofertę i dostępne środki. D-ECON-1 zabrania kreacji monet. Nie przyznawać za chwilę pracy więcej niż skarb osady. Brak pieniędzy daje jawnie zaproponowaną zapłatę rzeczową lub odroczenie decyzji, nie ukryty dług bez końca. Zapłata za pracę nie zmienia fabularnego wyniku.
6. **Przerwanie:** odmowa przed przyjęciem nie daje kary. Wstrzymanie zapisuje postęp i przywraca NPC obowiązki; wznowienie sprawdza świat. KO gracza nie kasuje dowodów, po powrocie należy ponownie ocenić ryzyko. Niedostępny NPC: czekanie/leczenie; po śmierci brak automatycznego zastępcy pamiętającego prywatne rozmowy. Dziennik wskazuje faktyczne zamknięcie lub możliwą wskazaną sukcesję. To nie czwarty autorski epilog.
7. **Przedmioty:** nie zużywać unikatowych dowodów przy zwykłym handlu/craftingu bez ostrzeżenia; przechowują je gracz albo nazwany depozyt. Utracona mapa może być odtworzona z już sporządzonej kopii; nieodczytany zniszczony dokument nie odtwarza się magicznie. Udźwig i świeżość obowiązują też w questach; dopuszczalne kilka kursów.
8. **Zależności:** tylko Q02 jest kontynuacją Q01, ale ma wejście niezależne. Mapa miękkich powiązań między pakietami: [QUEST-WORLD](QUEST-WORLD.md#powiązania-między-questami). Pozostałe nie wymagają konkretnego zakończenia wcześniejszego questu. Pamięć o wyniku daje lokalny callback wyłącznie świadkom lub po przekazaniu informacji. Nie wymagamy wspólnego „najlepszego zakończenia” wszystkich questów.

## Wymagania wspólne pozostawione implementatorowi

N: trwałe ID obsady i rekwizytów, flagi świadectw, wielogałęziowe rozmowy, jednostkowe zakończenia, obsługa przerw i odmienionego świata, harmonogramy bez blokowania AI, własność i zgoda na użycie zasobów. Stany sprawdzać przy zdarzeniach/rozmowie, nie pełnym skanem świata co klatkę. Zapis/odczyt, jednorazowość transferów i migracje mają objąć całość. To wymagania zachowania; nie narzucamy schematu danych ani architektury silnika.

## Status pracy

Pierwotny zestaw i autoreview: [REVIEW](REVIEW.md) (historyczne). Przeróbka 2026-10-01 (trzy rundy na quest, scalenie obsady, kalibracja): [REVIEW-2026-10-01](REVIEW-2026-10-01.md). Pakiet pozostaje propozycją do decyzji autora gry; nie oznacza implementacji mechanik P/D/N.
