# Zadanie: samodzielna realizacja gry do pierwszego przeglądu

Jesteś odpowiedzialny za zaprojektowanie, implementację, uruchomienie i zweryfikowanie gry opisanej w `docs/VISION.md`.

Pracuj jako samodzielny inżynier odpowiedzialny za cały rezultat: architekturę, symulację, rendering, UI, integrację i jakość rozgrywki.

## 1. Cel i sposób pracy

Dostarcz grywalną wersję v1 do pierwszego przeglądu przez użytkownika.

V1 oznacza zintegrowaną grę obejmującą większość głównych obszarów wizji w podstawowej, ale rzeczywiście działającej postaci. Poszczególne systemy mogą być uproszczone, lecz muszą wpływać na rozgrywkę.

Zakładamy 1–3 długie, samodzielne sesje. Jest to cel organizacyjny, nie powód do deklarowania nieukończonego projektu jako gotowego.

- Nie zatrzymuj się na analizie, planie ani szkielecie projektu.
- Po zaplanowaniu od razu przejdź do implementacji.
- Pracuj iteracyjnie: implementacja → uruchomienie → weryfikacja → poprawki.
- Po ukończeniu fragmentu kontynuuj następny, jeśli nie ma rzeczywistej blokady.
- Nie kończ tury samą zapowiedzią kolejnego kroku ani pytaniem „czy kontynuować?”.
- Nie obiecuj pracy w tle po zakończeniu sesji.

## 2. Źródła wymagań i stan repozytorium

Na początku:

1. Przeczytaj instrukcje repozytorium, w tym `AGENTS.md` i `CLAUDE.md`, jeżeli istnieją.
2. Przeczytaj w całości `docs/VISION.md`.
3. Sprawdź strukturę repo, dostępne dokumenty, kod, zależności i skrypty.
4. Ustal, co rzeczywiście działa, co jest szkieletem, a czego brakuje.
5. Zachowaj i wykorzystaj wartościowe istniejące rozwiązania.

W zakresie produktu ten prompt doprecyzowuje wizję, a wizja określa kierunek realizacji. Starsze plany i dokumenty traktuj jako kontekst; nie przywracaj automatycznie sprzecznych, historycznych założeń.

Nie zakładaj ani pustego repozytorium, ani gotowej gry. Oprzyj plan na rzeczywistym stanie.

Jeżeli brakuje `docs/VISION.md`, poszukaj dokumentu zatytułowanego „Wizja i założenia projektu”. Jeśli nie znajdziesz jednoznacznego źródła, zgłoś blokadę zamiast wymyślać wymagania.

## 3. Samodzielność i decyzje

Podejmuj samodzielnie odwracalne decyzje techniczne i projektowe, zgodne z wizją.

- Dobieraj początkowe wartości liczbowe i zapisuj je jako parametry do kalibracji.
- Uzupełniaj drobne luki spójnymi rozwiązaniami.
- Otwarte pytania w wizji nie oznaczają automatycznie obowiązku pytania użytkownika.
- Istotne założenia, uproszczenia i odstępstwa zapisuj z krótkim uzasadnieniem.
- Pytaj tylko wtedy, gdy brak odpowiedzi blokuje sensowną pracę albo wymaga zmiany podstawowej wizji.
- Przy blokadzie jednego obszaru kontynuuj pozostałe niezależne prace.

Masz zgodę na lokalne zmiany kodu, dokumentacji, konfiguracji, dodanie potrzebnych zależności i lokalne commity. Zachowaj istniejące zmiany użytkownika.

Publikowanie, deployment, push oraz działania destrukcyjne poza zakresem implementacji wymagają osobnego upoważnienia.

## 4. Zakres v1

Najpierw zbuduj działającą pętlę gry, następnie rozszerzaj ją o kolejne obszary wizji.

Podstawowy zakres wymagany do v1:

- deterministycznie generowany teren, eksploracja i więcej niż jedna osada połączona dostępną trasą;
- poruszanie, kolizje i interakcje;
- upływ czasu, dzień/noc oraz podstawowy wpływ pogody i sezonu;
- wspólne mechanizmy atrybutów i potrzeb postaci;
- NPC z gospodarstwami, obowiązkami i kilkoma rzeczywiście działającymi profesjami;
- osobowość wpływająca na wybrane decyzje NPC;
- zasoby, przedmioty, ekwipunek, magazyny i capabilities narzędzi;
- podstawowe zachowania zwierząt, w tym zdobywanie pokarmu i reakcje na zagrożenie;
- crafting, handel i podstawowe budowanie;
- walka wręcz i dystansowa, wyposażenie, obrażenia oraz odzyskiwanie sprawności;
- reputacja i co najmniej jedno zadanie wynikające z rzeczywistego problemu w symulacji;
- pełny zapis i odczyt zmiennego stanu wdrożonych systemów;
- obsługa desktop i mobile dla funkcji dostępnych w v1.

W obrębie każdego systemu najpierw doprowadź do działania reprezentatywny przypadek end-to-end, następnie rozszerzaj zawartość.

Wiele profesji, przedmiotów i gatunków powinno wykorzystywać wspólne mechanizmy i konfigurację danych.

Za dopuszczalne obszary późniejszego rozwoju uznaj przede wszystkim:
- pełną kolonizację i transport między kontynentami;
- wielopokoleniową demografię;
- rozbudowany rozwój i upadek osad;
- zaawansowane sieci relacji społecznych;
- szeroki katalog wieloetapowych questów narracyjnych.

Pozostałych wymagań nie usuwaj po cichu. Każde wymaganie z wizji musi mieć status i przypisanie do zakresu.

Jeżeli nie uda się ukończyć wymaganego zakresu, przekaż działający stan pośredni i dokładnie wskaż braki. Nie nazywaj go ukończonym v1.

## 5. Początkowa kalibracja czasu i przestrzeni

Przyjmij jako konfigurowalny punkt startowy:

- 1 jednostka przestrzeni świata = 1 metr.
- Doba gry = 60 realnych minut przy normalnym tempie.
- Kalendarz upływa 24 razy szybciej niż czas rzeczywisty.
- Podstawowy marsz = około 1,5 metra na realną sekundę.
- 16 godzin marszu według kalendarza = 40 realnych minut = około 3,6 km trasy.
- Najbliższa osada powinna być początkowo oddalona o około jeden taki dzień marszu.
- Dystans podróży licz po dostępnej trasie, nie wyłącznie w linii prostej.
- Rok początkowo ma 60 dni: 12 miesięcy po 5 dni, cztery sezony po 15 dni.
- Popraw oczywistą pomyłkę `12 × 5 = 70` z wizji na `60`.

Rozdziel jednostki czasu:

- Kalendarz świata: potrzeby długoterminowe, sen, produkcja, psucie żywności, wzrost, pogoda i sezony.
- Sekundy rozgrywki: ruch, zamachy, pociski, naciąganie łuku, krótkoterminowa stamina i ochrona po utracie przytomności.

Nie mnoż prędkości ruchu przez mnożnik kalendarza.

120 sekund ochrony gracza oznacza 120 sekund rozgrywki przy normalnym tempie.

Sen i długa praca powinny umożliwiać przyspieszenie całej symulacji, przerywane przez zagrożenie. Nie przyspieszaj samego licznika gracza z pominięciem świata.

Dopuszczalne jest bezpieczne przyspieszanie fizycznej podróży po drodze, jeżeli będzie potrzebne dla grywalności. Nie zastępuj podróży teleportacją.

Skalibruj koszty potrzeb, produkcję i podróże wspólnie. Nie kopiuj bezpośrednio realistycznych dobowych wartości do skróconego kalendarza bez sprawdzenia skutków.

## 6. Architektura i wydajność

Kamera i oprawa (decyzja, `docs/VISION.md` §4.4): widok zza postaci; teren, roślinność i budynki proceduralne low-poly; postacie i zwierzęta — importowane glTF lub proceduralne placeholdery.

Stack: TypeScript, Vue, Tailwind CSS, shadcn-vue i Three.js, z uwzględnieniem istniejącej konfiguracji repo.

- Oddziel model świata i reguły symulacji od renderowania i UI.
- Wspólne mechanizmy wykorzystuj dla gracza, NPC i zwierząt tam, gdzie ma to sens.
- Używaj jawnych jednostek czasu, odległości i ilości.
- Oddziel deterministyczny fundament świata od zmian konkretnej rozgrywki.
- Zapewnij wersjonowanie generatora, cache i formatu zapisu.
- Przechowuj stan w przeglądarce, np. w IndexedDB.
- Projektuj aktualizacje systemów z różną częstotliwością i uproszczenia dla odległych obszarów.
- Uwzględnij spatial index, streaming i ograniczanie kosztu renderowania stosownie do skali.
- Unikaj wielkich plików i modułów obejmujących wiele niezależnych odpowiedzialności.
- Unikaj nadmiernych abstrakcji i budowania uniwersalnego silnika przed działającą grą.

Mierz wydajność na jawnie opisanej scenie i w dostępnym środowisku. Raportuj wyniki oraz ograniczenia pomiarów. Nie deklaruj wydajności na telefonie tylko na podstawie emulowanego rozmiaru ekranu.

### 6.1. Dostępne assety Quaternius

W lokalnym katalogu `_temp/` w głównym folderze repozytorium znajduje się 12 paczek assetów Quaternius, łącznie około 1,35 GB:

```text
Fantasy Props MegaKit[Standard].zip
Furniture Pack - March 2019-20260930T094541Z-1-001.zip
Medieval Village MegaKit[Standard].zip
Modular Character Outfits - Fantasy[Source].zip
Stylized Nature MegaKit[Standard].zip
Textured Stylized Trees - May 2020-20260930T094450Z-1-001.zip
Ultimate Animated Animal Pack.zip
Ultimate Food Pack - Oct 2019-20260930T094520Z-1-001.zip
Ultimate RPG Items Pack - Aug 2019-20260930T094533Z-1-001.zip
Universal Animation Library 2[Source].zip
Universal Animation Library[Standard].zip
Universal Base Characters[Standard].zip
```

Masz zgodę na ich lokalne rozpakowanie, przeglądanie, konwersję i wykorzystanie w grze.

#### Wybór i integracja

- Na początku zinwentaryzuj zawartość archiwów: modele, formaty, tekstury, animacje, podglądy i licencje. Nie zakładaj zawartości ani zgodności szkieletów wyłącznie na podstawie nazw paczek.
- Rozpakowuj potrzebne paczki do osobnych katalogów w `_temp/extracted/`, zachowując oryginalne ZIP-y.
- Preferuj dostępne assety zamiast tworzyć ich odpowiedniki od zera. Wybierz spójny wizualnie zestaw pasujący do średniowiecznej gry bez fantasy. Z paczek „Fantasy” wykorzystuj wyłącznie elementy zgodne z wizją.
- Proceduralne generowanie świata i osad może korzystać z gotowych modeli oraz modułów budynków, roślin i rekwizytów. Proceduralność dotyczy także ich doboru, składania i rozmieszczania; nie wymaga generowania każdej siatki od zera.
- Preferuj glTF/GLB do użycia w Three.js. Konwertuj inne formaty, jeśli jest to potrzebne i dostępne są odpowiednie narzędzia.
- Sprawdź skalę w metrach, orientację, pivoty, materiały, zależności tekstur oraz działanie animacji. Zweryfikuj zgodność postaci, ubrań i bibliotek animacji przed ich połączeniem.
- Placeholdery są dozwolone tymczasowo albo gdy brakuje odpowiedniego assetu. Zapisuj, co wymaga późniejszej wymiany.

#### Organizacja plików

- `_temp/` jest lokalnym magazynem źródłowym: dodaj go do `.gitignore` i wyklucz z obserwowania zmian przez dev server.
- Nie kopiuj całych paczek do katalogu publicznego.
- Do `public/assets/` przenoś wyłącznie wybrane zasoby potrzebne grze, wraz z wymaganymi teksturami i informacjami licencyjnymi.
- Gra i jej build nie mogą zależeć od obecności `_temp/`.
- Utwórz `docs/assets/README.md` z krótkim katalogiem paczek i wybranych assetów. Zapisuj źródłową paczkę, ścieżkę modelu, przeznaczenie, licencję i wykonane konwersje.
- Wykorzystuj dołączone podglądy. Jeśli wybór modeli jest niejasny, wygeneruj niewielkie plansze podglądowe z nazwami plików.
- Zachowaj skrypty potrzebne do odtworzenia istotnych konwersji.

#### Wydajność i weryfikacja

Ładuj zasoby stosownie do potrzeb, współdziel geometrie i materiały oraz używaj instancjonowania dla odpowiednich powtarzalnych obiektów. Sprawdzaj koszt tekstur, liczbę trójkątów i draw calls.

Zweryfikuj wybrane modele w uruchomionej grze, w tym animacje, rozmiary względem postaci i kolizje. Nie utożsamiaj widocznego modelu z gotową mechaniką obiektu.

Jeżeli `_temp/` nie jest dostępny w bieżącym środowisku, zapisz ten brak, kontynuuj pracę z tymczasowymi modelami i nie oznaczaj integracji assetów jako ukończonej.

### Wydajność i diagnostyka przez cały cykl implementacji

Wydajność jest częścią każdego etapu, od fundamentów do odbioru końcowego. Każdy istotny system powinien od początku udostępniać diagnostykę pozwalającą ustalić jego koszt i przyczynę spowolnień.

#### Wspólna infrastruktura pomiarowa

- Przygotuj lekki, wspólny mechanizm pomiarów, liczników i agregacji wyników.
- Mierz czas klatki i ticka symulacji oraz koszty poszczególnych systemów.
- Rozdziel czas CPU od pomiarów GPU. Nie przedstawiaj czasu wywołań renderera jako czasu wykonania pracy przez GPU.
- Raportuj medianę, p95, p99, przekroczenia budżetu oraz liczbę próbek.
- Powiąż wyniki z obciążeniem: liczbą aktywnych NPC, zwierząt, obiektów, chunków i wykonywanych operacji.
- Zapewnij możliwość włączenia dokładniejszych pomiarów wybranego systemu bez zalewania logów.
- Ogranicz narzut diagnostyki przez agregację i próbkowanie. Unikaj logowania każdej klatki i każdej encji.
- Szczegółowa diagnostyka powinna być przełączalna; bufory pomiarowe muszą mieć ograniczony rozmiar.

#### Zakres diagnostyki

Obejmij pomiarami odpowiednie warstwy:
- generowanie świata, streaming chunków i cache;
- scheduler symulacji, AI, wybór celów i pathfinding;
- zapytania przestrzenne, kolizje i interakcje;
- rendering: draw calls, trójkąty, geometrie, tekstury i aktywne animacje;
- UI: częstotliwość aktualizacji i koszt synchronizacji z symulacją;
- ładowanie assetów: transfer, dekodowanie i przygotowanie do użycia;
- zapis/odczyt: czas, wielkość danych i operacje bazy;
- pamięć i długie zadania głównego wątku, w zakresie dostępnym w środowisku.

Brak dostępnego pomiaru oznaczaj jawnie. Nie zastępuj go wymyśloną wartością.

#### Powtarzalne benchmarki i raporty

- Przygotuj sceny benchmarkowe: mała osada, zatłoczona osada, gęsty las, walka, podróż przez granice chunków oraz przyspieszona symulacja.
- Dodaj scenariusze sprawdzające narastanie kosztu lub zużycia pamięci podczas dłuższej gry i wielokrotnego odwiedzania obszarów.
- Benchmarki powinny mieć określony seed, stan początkowy, rozgrzewkę, czas pomiaru i profil jakości.
- Zapisuj środowisko pomiaru, wersję kodu, parametry sceny i ustawienia diagnostyki.
- Generuj automatycznie raport JSON oraz krótkie podsumowanie Markdown z najdroższymi systemami i regresjami.
- Rozdziel pomiary poprawności wykonywane w headless od pomiarów reprezentatywnych dla rzeczywistej wydajności graficznej.
- Ustal początkowe budżety wydajności i zapisuj ich uzasadnienie. Nie zmieniaj progów wyłącznie po to, aby ukryć regresję.

#### Obowiązek na każdym etapie

Przy dodawaniu lub istotnej zmianie systemu:
1. Określ przewidywany koszt i sposób jego pomiaru.
2. Dodaj odpowiednie liczniki lub pomiary do wspólnej diagnostyki.
3. Uruchom właściwy benchmark i sprawdź wpływ na całą grę.
4. Zidentyfikuj dominujące wąskie gardło i popraw je, jeśli przekracza budżet.
5. Porównaj wyniki przed i po zmianie w tych samych warunkach.
6. Sprawdź, czy optymalizacja nie zmieniła poprawności symulacji.

Najpierw mierz, potem optymalizuj. Rozbudowuj szczegółowość diagnostyki tam, gdzie wyniki wskazują problem. Mechanizmy diagnostyczne i benchmarki utrzymuj wraz z kodem, aby kolejne sesje mogły automatycznie wykrywać i analizować regresje.

## 7. Plan i pamięć między sesjami

Wykorzystaj istniejące odpowiedniki poniższych dokumentów; nie twórz duplikujących się źródeł prawdy.

Jeżeli ich nie ma, utwórz zgodnie ze strukturą `docs/`:

- `docs/plans/` — plany etapów, pliki `domain--ID--slug.md` (patrz `docs/plans/README.md`);
- `docs/state/FEATURES.json` — lista wymagań i kryteria odbioru wraz ze statusami;
- `docs/state/PROGRESS.md` — aktualny stan i przekazanie następnej sesji;
- `docs/design/DECISIONS.md` — istotne decyzje projektowe i uproszczenia (szczegółowy design obszarów: `docs/design/<domena>-*.md`).

Każda pozycja listy wymagań powinna zawierać:
- stabilne ID;
- odniesienie do części wizji;
- zakres: v1 lub później;
- oczekiwane zachowanie;
- sposób weryfikacji;
- status;
- krótką informację o dowodach weryfikacji.

Rozróżniaj przynajmniej:
`planned`, `in_progress`, `implemented_unverified`, `verified`, `blocked`, `deferred`.

Nie usuwaj kryteriów ani nie osłabiaj ich tylko po to, aby oznaczyć funkcję jako ukończoną. Zasadną zmianę kryterium udokumentuj.

Plan ma pomagać realizacji. Nie poświęcaj całej sesji na rozbudowę dokumentacji.

## 8. Implementacja i weryfikacja

Pracuj małymi, zintegrowanymi fragmentami. Po każdym istotnym fragmencie sprawdź jego działanie i popraw wykryte problemy.

Weryfikuj odpowiednio do zmiany:

- typecheck, lint i build;
- testy istotnych reguł symulacji;
- deterministyczność generowania;
- zapis/odczyt po rzeczywistych zmianach świata;
- interakcje systemów;
- uruchomioną grę w przeglądarce;
- UI i sterowanie desktop/mobile.

Szczególnie sprawdź:
- NPC potrafi zaspokoić potrzebę i wrócić do obowiązków;
- brak zasobu lub niedostępny cel nie powoduje nieskończonej pętli;
- handel, crafting i budowa prawidłowo przenoszą lub zużywają zasoby;
- postęp czynności i zasoby pozostają spójne po przerwaniu;
- przyspieszenie czasu nie destabilizuje symulacji;
- opuszczenie obszaru i powrót nie resetują jego zmian;
- wczytanie gry nie odtwarza zużytych zasobów ani pokonanych przeciwników.

Nie traktuj udanego buildu jako dowodu grywalności.

Użyj dostępnych narzędzi automatyzacji przeglądarki. Sprawdzaj zachowanie, błędy konsoli i wygląd. Jeśli narzędzie jest niedostępne, oznacz niewykonaną weryfikację i kontynuuj dostępne testy.

Jeśli środowisko obsługuje subagentów, możesz delegować niezależne prace i review. Ustal odpowiedzialności i dopilnuj integracji. Wielu agentów nie jest wymaganiem.

### Review i odpowiedzialność za jakość

Po każdym większym etapie wykonaj osobną rundę review:
- porównaj rezultat z wymaganiami i kryteriami odbioru;
- sprawdź poprawność mechanik, integrację, architekturę i możliwe regresje;
- wypisz konkretne problemy, popraw je i ponownie zweryfikuj zmienione obszary.

Jeżeli korzystasz z subagentów, jako agent główny odpowiadasz za ich rezultat. Przejrzyj zmiany, sprawdź integrację i uruchom odpowiednią weryfikację. Sam raport subagenta ani jego deklaracja „testy przeszły” nie wystarczają do oznaczenia funkcji jako `verified`.

Jeżeli subagenci są dostępni, zleć niezależne review najważniejszych zmian i końcowego scenariusza odbioru agentowi, który nie implementował ocenianego fragmentu. Oceń zasadność uwag, popraw potwierdzone problemy i zapisz wynik review w `docs/reviews/`.

### Weryfikacja w przeglądarce

Na początku sprawdź dostępność narzędzia browser/MCP lub automatyzacji przeglądarki. Wykorzystuj je podczas implementacji oraz przy odbiorze końcowym.

Otwórz działającą grę, wykonuj rzeczywiste interakcje i oglądaj zrzuty ekranu. Sprawdź:
- czytelność tekstu, kontrast, hierarchię informacji i spójność wizualną;
- rozmieszczenie HUD, menu, ekwipunku, dialogów i paneli;
- nakładanie elementów, przycinanie treści, przewijanie i skalowanie;
- desktop oraz widoki mobile, w tym sterowanie dotykowe;
- odkrywalność akcji, informację zwrotną, anulowanie i obsługę błędów;
- kamerę, widoczność postaci i celów oraz zasłanianie świata przez UI;
- pełny przebieg podstawowych czynności gracza, a nie tylko wygląd ekranu.

Naprawiaj wykryte problemy i powtarzaj związane z nimi scenariusze. Brak błędów konsoli, poprawny DOM lub pojedynczy screenshot nie stanowią pełnej weryfikacji UI/UX.

Jeżeli dostęp do przeglądarki jest niemożliwy, jawnie oznacz kontrolę wizualną i interakcyjną jako niewykonaną. Nie zastępuj jej deklaracją opartą wyłącznie na analizie kodu.

### Automatyzacja weryfikacji i oszczędność kontekstu

Powtarzalne sprawdzenia realizuj za pomocą wielokrotnie używalnych skryptów i scenariuszy. Unikaj długich sekwencji pojedynczych wywołań narzędzi typu „ruch → screenshot → ruch → screenshot”.

- Przygotuj wspólne komendy do uruchamiania kontroli jakości, testów, scenariuszy przeglądarkowych i benchmarków.
- Scenariusze powinny samodzielnie przygotowywać stan, wykonywać serię działań, sprawdzać oczekiwane rezultaty i zwracać zwięzłe podsumowanie.
- Korzystaj ze stałych seedów, kontrolowanych zapisów gry i powtarzalnych scen testowych.
- Udostępnij interfejs testowy/debug do przygotowania sceny, ustawienia czasu, pozycji i wyposażenia oraz odczytu stanu symulacji. Oddziel go od normalnych funkcji gracza.
- Przygotowanie stanu może korzystać z interfejsu testowego, ale sprawdzenie konkretnej interakcji UI musi wykonywać tę interakcję przez UI.
- Weryfikuj logikę przez asercje stanu i zdarzeń. Screenshoty wykonuj w wybranych punktach kontroli wizualnej oraz przy błędach.
- Używaj warunków zakończenia i limitów czasu zamiast długich, sztywnych opóźnień.
- Do kontekstu przekazuj podsumowania i istotne błędy. Pełne logi, trace i screenshoty zapisuj jako lokalne artefakty dostępne do analizy.
- Po błędzie wykonaj ograniczoną reprodukcję, ustal przyczynę i popraw problem. Nie powtarzaj identycznego scenariusza bez nowej hipotezy lub zmiany.
- Po naprawie uruchom scenariusz dotyczący problemu i odpowiednie testy regresji. Pełny zestaw uruchamiaj przy większych integracjach i odbiorze końcowym.

Automatyzacja nie zastępuje oceny wyglądu i wygody gry. Kontrolę wizualną wykonuj celowo, na reprezentatywnych ekranach i stanach.

## 9. Scenariusz odbioru

Doprowadź do działania i sprawdź co najmniej następujący przebieg:

1. Nowa gra z wybranego seeda.
2. Wejście do osady i obserwacja NPC realizujących potrzeby oraz obowiązki.
3. Zdobycie zasobów przy użyciu właściwego narzędzia.
4. Przeniesienie zasobów, crafting i handel.
5. Rozpoczęcie i ukończenie prostej budowy.
6. Podróż poza osadę, spotkanie zwierzęcia i walka.
7. Regeneracja lub leczenie po obrażeniach.
8. Rozwiązanie problemu będącego źródłem zadania i zmiana reputacji.
9. Zapis, zamknięcie/odświeżenie gry i odczyt zachowujący istotne zmiany.
10. Kontrola tych samych podstawowych interakcji przez interfejs mobile.

W testach używaj seedów kontrolnych i narzędzi debugowania, aby nie czekać godzinami na podróż lub sezon. Sprawdź również normalne tempo gry; debug nie może zastępować właściwej mechaniki.

## 10. Zakończenie i wznowienie sesji

Przy rozpoczynaniu kolejnej sesji:
- przeczytaj wizję, plan, decyzje i aktualny postęp;
- sprawdź status git i ostatnie zmiany;
- uruchom podstawową weryfikację istniejącego stanu;
- kontynuuj najwyższy priorytet bez ponownego projektowania całego projektu.

Przed zakończeniem sesji zapisz:
- co działa i jak zostało sprawdzone;
- co jest uproszczone;
- co pozostaje nieweryfikowane lub niedokończone;
- znane błędy i blokady;
- dokładny następny krok;
- komendy uruchomienia i weryfikacji.

Twórz lokalne commity obejmujące spójne zmiany. Nie dołączaj przypadkowo cudzych zmian.

Końcowy raport dla użytkownika ma być krótki i zawierać:
- sposób uruchomienia gry;
- dostępny zakres rozgrywki;
- wyniki najważniejszych testów;
- istotne ograniczenia;
- informację, czy wymagany zakres v1 rzeczywiście został ukończony.

Zacznij teraz od przeczytania repozytorium i wizji. Następnie zapisz zwięzły plan i przejdź do realizacji.