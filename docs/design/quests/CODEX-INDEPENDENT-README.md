# Quest pack — Roads, Work, and What We Keep

**Status: autorska propozycja narracyjna, nie zatwierdzony kanon i nie implementacja.**  
Data: 2026-09-30. Brief i ograniczenia tematyczne: Jan. Dialogi: English; dokumentacja projektowa: polski.  
Źródła odczytane na `8e891fcbffa06ea2ae65cbafddab2aa7c58b23e1`.

## Źródła i zakres pewności

- [VISION](../../VISION.md), w całości; szczególnie §4–5 (podróż/czas), §7–14 (osady/NPC/skills), §15–19 (fauna/zasoby), §23–26 (praca/zadania).
- [VISION-APPENDIX](../../VISION-APPENDIX.md), w całości: landmarki, ślady, reakcje zwierząt, gotowanie, towarzysze.
- [DECISIONS](../DECISIONS.md), [FEATURES](../../state/FEATURES.json), [PROGRESS](../../state/PROGRESS.md), [roadmap](../../roadmap/v1-closure-and-appendix.md).
- Przeczytane plany: [sim--001](../../plans/sim--001--ai-cadence-and-animal-threat.md), [npc--001](../../plans/npc--001--trade-gifts-companions.md), [economy--001](../../plans/economy--001--gathering-cooking-transport.md), [world--001](../../plans/world--001--landmarks-and-treasure.md).
- Kontrola kodu: `src/game/sim/quests.ts` i `interact.ts`. Obecne questy liczą zabicia/naprawę; napis „przegoń albo ubij” nie dowodzi działającego niebojowego zakończenia. Pakiet wymaga nowej obsługi narracji.

Oznaczenia we wszystkich plikach:

| Kod | Znaczenie |
|---|---|
| **I** | Istniejąca funkcja, opisana jako verified w FEATURES; nie oznacza ponownego przetestowania jej w tej sesji |
| **P** | Wymaganie wizji z istniejącym planem planned, jeszcze nie działająca funkcja |
| **D** | Zatwierdzony kierunek wizji, odłożony/deferred; brak obietnicy realizacji w v1/v2 |
| **N** | Nowa propozycja tego pakietu, wymagająca decyzji i osobnego projektu implementacji |

I: potrzeby, fizyczne podróże, profesje bazowe, zbieranie, crafting/zamówienia, naprawy budynków, konstrukcje, handel, oprawianie, świeżość, walka ze zwierzętami, legowiska, opinia/reputacja. P: towarzysze/prezenty, gotowanie w slotach, wózki ręczne, zachowania strachu, landmarki i skarby. D: wieloetapowe questy (`QUEST-03`), jaskinie (`WORLD-05`), outposty (`SET-04`), górnik i pozostałe nowe profesje (`NPC-06`), jazda/wozy (`WORLD-09`). **Każdy scenariusz wymaga D:QUEST-03 oraz N: dialogów warunkowych, pamięci dowodów i rezerwacji obsady. Żaden nie jest dziś gotową zawartością wykonywalną.**

Nie zmieniamy statusów FEATURES ani harmonogramu implementacji. Przy sprzeczności bieżący status FEATURES ma pierwszeństwo przed historycznym akapitem PROGRESS. Nowe postacie, miejsca, receptury, prawa własności i liczby w tym katalogu mają status N.

## Zarys całego zestawu — ustalony przed rozwinięciem scen

| Quest | Konflikt, postacie | Aktywności i kluczowy wybór | Kierunki zakończeń / ton |
|---|---|---|---|
| [Q01 A Hare Out of Place](q01-a-hare-out-of-place.md) | Łowczyni Mara, jej dorosły uczeń Kit, handlarz Oren: pierwszy samodzielny zarobek czy rzadka obserwacja? | Tropienie, obserwacja, polowanie; ustalenie, co właściwie jest zleceniem | Białe futro; zwykła zwierzyna; notatnik obserwacji. Ciekawość, duma bez egzaminatora |
| [Q02 The Hollow Below the Road](q02-the-hollow-below-the-road.md) | Mara i łowca Sella chronią drogę, drwal potrzebuje dostępu do lasu | Rozpoznanie legowiska, groźne wilki, pomiar obejścia; trwały koszt bezpieczeństwa | Usunięte legowisko; przeniesiona droga robocza; droga tylko z eskortą. Odpowiedzialność zawodowa |
| [Q03 A Roof Before Rain](q03-a-roof-before-rain.md) | Drwal Bram i jego matka Edda mają dom wymagający większej naprawy niż oczekiwali | Oględziny, naprawa/budowa, uzgodnienie użycia wspólnego budynku | Stary dom; mały nowy dom; wspólny dom na zimę. Przywiązanie i zmiana |
| [Q04 The Handle Remembers](q04-the-handle-remembers.md) | Kowalka Nessa i ojciec Tobin inaczej rozumieją wartość zużytego młotka | Próby narzędzia, zamówienie, praca przy kowadle | Lekka praca starym narzędziem; przekucie; pamiątka i nowe narzędzie. Intymny, spokojny konflikt |
| [Q05 The Map That Missed the River](q05-the-map-that-missed-the-river.md) | Handlarka Iven odczytuje mapę babki; archiwista Pell chce zachować wiedzę | Landmarki, orientacja, kopanie, skarb; przeznaczenie odzyskanej trasy i zapisków | Rodzinny powrót; publiczny szlak odkrywców; mapa handlowa. Zachwyt i odkrycie |
| [Q06 Room for One More](q06-room-for-one-more.md) | Dorosły syn Bramowego domu, Rowan, chce wyruszyć; matka Lina potrzebuje zastępstwa | Przygotowanie, ekwipunek, fizyczna eskorta, rozmowy podczas postoju | Termin u kowalki; powrót z własnym zadaniem; czasowy towarzysz. Pierwsza samodzielność |
| [Q07 Six Bowls, One Pan](q07-six-bowls-one-pan.md) | Rolniczka Lina organizuje posiłek; strażniczka Ada nie może porzucić obchodu | Świeżość, porcje, gotowanie, dostawy; kto naprawdę może przyjść? | Jedna wspólna kolacja; dwa posiłki zmianowe; kolacja na progach. Ciepło i humor |
| [Q08 The Long Way to Water](q08-the-long-way-to-water.md) | Pasterka Wren i rolniczka Dena tracą czas przy wspólnej studni | Obserwacja kolejki, koryto, noszenie, budowa; lokalizacja i utrzymanie | Koryto na skraju; studnia pastwiskowa; wspólny dyżur. Praktyczna sąsiedzkość |
| [Q09 Goods on the Ground](q09-goods-on-the-ground.md) | Oren ma potrzebne narzędzia, mieszkańcy dobra, ale mało gotówki | Oględziny zapasów, jawny barter, magazyn, plan dostawy | Wymiana od ręki; komis lokalny; powrót z zamówieniami. Lekka negocjacja bez oszustwa |
| [Q10 What the Mountain Owes](q10-what-the-mountain-owes.md) | Górniczka Ysra, Nessa, inwestor Corvin i przedstawiciel osady Bram: kto ponosi koszt kopalni? | Jaskinia, próbki, bezpieczeństwo, outpost, dostawa pilotażowa, kontrakt | Sprzedaż praw; udział w rzeczywistym zysku; niewielka kopalnia sezonowa osady. Ambicja i koszt sukcesu |

Po przeglądzie zarysów rozdzielono role: Q01 dotyczy fachowego wyboru celu, Q02 infrastruktury łowieckiej; Q03 prywatnego domu, Q08 dostępu do wspólnego zasobu; Q05 odkrycia, Q10 produkcji. Q07 nie otrzymuje katastrofy ani złoczyńcy. Q09 nie ukrywa oszustwa. Żaden quest nie wymaga zabijania ludzi, wulgaryzmów, zdrady ani fantastyki.

Inspiracje traktujemy jako kierunek twórczy: wielość praktycznych rozwiązań i powracające konsekwencje; wyraziste lokalne historie; zdobywanie zaufania przez pracę i znajomość miejsca. Nie kopiujemy postaci, dialogów, scen, cynizmu dla samego cynizmu, brutalności wobec ludzi ani wszechmocnych testów perswazji. To brief stylistyczny, nie analiza historyczna wskazanych gier.

## Obsada, miejsca i powiązania

Domowa osada **H**, sąsiednia **V**, miasteczko **T** są rolami przypisywanymi do wygenerowanych osad. Nie nadpisywać ich nazw ani wymuszać czwartej osady/XL. H→V trwa około dnia marszu, V→T kolejną dłuższą wyprawę. Lokalny wypad nie wymaga przemarszu między osadami. Q05/Q10 mogą wymagać późniejszego generatora odpowiednich lokacji; brak miejsca oznacza niedostępność questu, a nie teleport/skarb pod stopami.

| Rola | Osada / profesja | Relacje, obowiązek i głos |
|---|---|---|
| Mara | H / myśliwa | Mentorka Kita; troszczy się o zapasy. Konkretne pytania, toleruje ciszę, mało pochwał |
| Kit | H / dorosły uczeń myśliwego | Bez więzi rodzinnej z Marą; chce zarobić. Wyprzedza własne myśli, poprawia się |
| Bram | H / drwal | Partner Liny, syn Eddy, ojciec Rowana. Robocze porównania, mierzy koszt czasem pracy |
| Edda | H / starsza domowniczka | Matka Brama. Dokładne wspomnienia zwykłych czynności, bez „mądrości w każdym zdaniu” |
| Lina | H / rolniczka | Partnerka Brama, matka dorosłego Rowana. Planuje posiłki i prace; oszczędny humor |
| Rowan | H / dorosły pomocnik domowy | Starszy syn bez własnej rodziny. Ciekawy fachu; pyta o szczegóły zamiast o sławę |
| Ada | H / strażniczka | Obchody i noclegi. Krótkie komunikaty; suchy humor, nie urzędnicza karykatura |
| Sella | V / myśliwa | Bez dawnego konfliktu z Marą. Mówi o terenie i porach, jawnie zaznacza niepewność |
| Wren / Dena | V / pasterka / rolniczka | Sąsiadki, nie krewne. Wren liczy zwierzęta i odległości; Dena wiadra i pracę |
| Nessa / Tobin | V / kowalka / starszy pomocnik | Córka i ojciec. Nessa język prób i materiału; Tobin opowiada o użyciu przedmiotu |
| Oren | H / handlarz | Towar należy do niego; podróż handlowa jako N/P rozszerzenie. Głośno liczy, przyjmuje rozsądne „nie” |
| Iven | T / handlarka | Wnuczka autorki mapy. Pamięta niedokładne rodzinne wersje; odkrywa, nie zataja |
| Pell | T / archiwista (N rola zajęciowa) | Porządkuje zapiski, nie zna terenu. Precyzyjny, ale potrafi powiedzieć „I don't know” |
| Ysra / Corvin | T / górniczka (D) / handlarz-inwestor (N rola) | Fachowa ostrożność / jawne rachunki i limity. Żadne nie jest sekretnym antagonistą |

N: rezerwować istniejących kompatybilnych NPC przed pierwszą ekspozycją, z ich household i profesją. Imiona i relacje to propozycje: nie przemianowywać spotkanych osób ani przepisywać małżeństw w istniejącym save. Przy braku kompatybilnej rodziny odroczyć odpowiedni quest; nie doklejać wszystkim profesji. Bram może reprezentować osadę w Q10 na jedną delegację, nie zostaje automatycznie sołtysem. Nie rezerwować NPC tak, by głodował lub stał wiecznie przy znaczniku. Q06 i Q10 korzystają z tej samej dostępności household co Q03/Q07.

## Wspólny kontrakt scen i stanu (N)

Każdy plik definiuje własne flagi w przestrzeni `Qxx`. Flagi logiczne startują jako false, wyliczenia jako `unset`; rzeczy wykonane fizycznie mają ID encji/zdarzenia. Zapis „X + Y” w warunku oznacza AND; `A / B` w opisie wariantu to wybór, nie losowanie. Każdy wiersz `Player [A/B/…]` jest osobną wybieralną odpowiedzią; następująca po nim wypowiedź NPC jest jej reakcją. Po reakcji wracamy do wspólnej części albo wskazanego przejścia. Gracz nie wypowiada wszystkich wariantów.

1. **Wiedza:** NPC zna zdarzenie tylko jako świadek, uczestnik przekazania dowodu lub odbiorca wskazanej rozmowy. Dziennik gracza i globalna flaga nie są telepatią. Raport ustny pozwala reagować na raport, nie udaje oględzin. Wariant relacyjny oparty na `npc.opinion ≥ 25` dotyczy tonu/dodatkowej opcji, nigdy obowiązkowego przejścia; wartości są N do kalibracji. Domyślna wersja zawsze istnieje.
2. **Przebieg:** rozmowy pomocnicze są opcjonalne, chyba że warunek przejścia wymaga ich wyniku. Oględziny/praca pozostają czynnościami gracza. Przewidziane świadectwo NPC może zastąpić zręcznościowy/skillowy wąski gardło kosztem jego czasu i materiałów. Brak EXP i poziomów postaci. Trening wynika z praktyki, nie z magicznej premii po dialogu.
3. **Zakończenie:** wyłącznie przy jawnym potwierdzeniu dostępnej gałęzi; sprawdzić wszystkie warunki ponownie, zastosować jednorazowo. Zmiana świata, rozmowa epilogowa i wypłata są osobnymi skutkami jednego zapisanego wyniku. Wyjście z rozmowy nie wybiera zakończenia. Konsekwencje są zakresem tej propozycji, nie gotowymi bonusami silnika.
4. **Czas:** zapowiedź deszczu/wyjazdu nie uruchamia ukrytego zegara porażki. Termin pojawia się dopiero po podaniu go w dzienniku i świadomym umówieniu. Potrzeby i praca liczone w kalendarzu; walka w sekundach rozgrywki. Nie zatrzymujemy całego świata dla questa. Gdy sytuację rozwiąże NPC, uznajemy rzeczywisty wynik i wykonany wkład gracza; nie odtwarzamy uszkodzeń/zwierząt.
5. **Ekonomia:** każdy pieniądz i przedmiot ma właściciela, płatnika oraz źródło. Ceny pozostają do kalibracji; przed transakcją pokazać konkretną ofertę i dostępne środki. D-ECON-1 zabrania kreacji monet. Nie przyznawać za chwilę pracy więcej niż skarb osady. Brak pieniędzy daje jawnie zaproponowaną zapłatę rzeczową lub odroczenie decyzji, nie ukryty dług bez końca. Zapłata za pracę nie zmienia fabularnego wyniku.
6. **Przerwanie:** odmowa przed przyjęciem nie daje kary. Wstrzymanie zapisuje postęp i przywraca NPC obowiązki; wznowienie sprawdza świat. KO gracza nie kasuje dowodów, po powrocie należy ponownie ocenić ryzyko. Niedostępny NPC: czekanie/leczenie; po śmierci brak automatycznego zastępcy pamiętającego prywatne rozmowy. Dziennik wskazuje faktyczne zamknięcie lub możliwą wskazaną sukcesję. To nie czwarty autorski epilog.
7. **Przedmioty:** nie zużywać unikatowych dowodów przy zwykłym handlu/craftingu bez ostrzeżenia; przechowują je gracz albo nazwany depozyt. Utracona mapa może być odtworzona z już sporządzonej kopii; nieodczytany zniszczony dokument nie odtwarza się magicznie. Udźwig i świeżość obowiązują też w questach; dopuszczalne kilka kursów.
8. **Zależności:** tylko Q02 jest kontynuacją Q01, ale ma wejście niezależne. Pozostałe nie wymagają konkretnego zakończenia wcześniejszego questu. Pamięć o wyniku daje lokalny callback wyłącznie świadkom lub po przekazaniu informacji. Nie wymagamy wspólnego „najlepszego zakończenia” wszystkich questów.

## Wymagania wspólne pozostawione implementatorowi

N: trwałe ID obsady i rekwizytów, flagi świadectw, wielogałęziowe rozmowy, jednostkowe zakończenia, obsługa przerw i odmienionego świata, harmonogramy bez blokowania AI, własność i zgoda na użycie zasobów. Stany sprawdzać przy zdarzeniach/rozmowie, nie pełnym skanem świata co klatkę. Zapis/odczyt, jednorazowość transferów i migracje mają objąć całość. To wymagania zachowania; nie narzucamy schematu danych ani architektury silnika.

## Status pracy

Zarys, rozwinięcia, trzy rundy review per quest oraz końcowe review pakietu ukończone. Rejestr zmian: [REVIEW](REVIEW.md). Pakiet jest propozycją narracyjną do dalszego review autora gry; nie oznacza implementacji mechanik oznaczonych P/D/N.
