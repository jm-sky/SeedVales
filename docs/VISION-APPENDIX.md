# Dodatek do wizji projektu — VISION-APPENDIX

## Modele postaci

Chcemy osiągnąć różnorodność przez:

- Różne kolory włosów: blond, brązowe, czarne, rude, siwe.
- Różne warianty brody lub brak brody u mężczyzn.
- Różne fryzury.
- Różny rozmiar i wysokość, np.:
  - skalowanie osi X i Z o ±5% — grubość,
  - skalowanie osi Y o ±10% — wysokość.
  - To propozycja do rozważenia.
- Jeżeli nie mamy modelu dziecka, można użyć pomniejszonego modelu dorosłego jako fallback.
- Możemy kolorować ubrania, np. na kolory neutralne, zielone, niebieskie itp., używając tint.
- Możemy łączyć elementy różnych modeli, np.:
  - nogi i buty od Wizard — stopy owinięte materiałem,
  - reszta od Peasant.

## Zwierzęta

- Młode mogą mieć pomniejszony model (`scaled-down`).
- Prime/Alfa mogą mieć powiększony model (`scaled-up`).
- Prime/Exceptional mogą mieć przyciemnienie o 10%.
- Zwierzę, które zabiera się za jedzenie zwłok, nie może momentalnie ich zjadać. Gracz musi mieć możliwość przerwania konsumpcji i przegonienia drapieżnika.

## Ślady

- Udane trafienia, które zadają obrażenia, mogą zostawiać ślad krwi na ziemi.
- Ślad zmywa się z czasem oraz dodatkowo przez deszcz.
- Może wabić drapieżniki w to miejsce.

## Pogoda

- Powinny być chmury na niebie.
- Powinno być widać padający deszcz i śnieg.
- Teren pod wpływem opadu powinien zmieniać „teksturę”, robić się mokry.
- Pod wpływem śniegu teren powinien robić się biały. Można pomyśleć o warstwie śniegu.


## Landmarki i skarby

### Landmarki

Losowe lokalizacje mogą zawierać landmarki, np.:

- kamienny krąg,
- ruiny domu,
- ruiny posiadłości,
- wrak statku,
- wrak łodzi.

### Skarby i zdobycze

- Skarby mogą być losowo zakopane obok landmarków.
- Mogą znajdować się w skrzyni z losowym lootem.
- Mogą też występować losowo w jaskiniach.
- Rzadko skarb może znaleźć się w brzuchu drapieżnika.
- Przykładowe wartościowe znaleziska:
  - złote pierścienie,
  - rubiny,
  - szmaragdy,
  - diamenty,
  - monety,
  - bardzo wysokiej jakości broń, np. sztylet damasceński lub obsydianowy.
- Lista możliwych zdobyczy nie jest zamknięta.

## Handel, prezenty i relacje

- Handel powinien być możliwy z każdym NPC, ponieważ każdy NPC może mieć coś na wymianę lub sprzedaż.
- Mechanizm handlu może też służyć do przekazywania przedmiotów.
- Poza handlem powinien istnieć osobny system dawania prezentów.
- Prezent może podnosić relację gracza z NPC.
- NPC powinni móc wyrażać preferencje dotyczące przedmiotów, które chcieliby dostać, np. konkretnej broni lub innego przedmiotu.

## Interfejs i ekrany

Powinny istnieć ekrany obejmujące co najmniej:

- podgląd postaci,
- atrybuty,
- reputację,
- umiejętności,
- aktualny stan chorób,
- ekwipunek,
- wybór podstawowej broni ręcznej,
- wybór podstawowej broni dystansowej,
- filtrowanie i sortowanie przedmiotów po kategoriach,
- podgląd parametrów przedmiotów,
- zadania.

Powinna być dostępna:

- duża mapa z oznaczeniem lokalizacji,
- minimapa ze strzałką pomagającą kierować się w stronę wyznaczonego miejsca.

Powinno istnieć menu z konfiguracją, w tym:

- ustawienia jakości grafiki,
- ustawienia głośności dźwięku.

Powinna być możliwość:

- rozpoczęcia nowej gry,
- zapisania save'a pod określoną nazwą.

## Wybór celu interakcji

- Powinno istnieć wspomaganie wyboru celu interakcji.
- Jeżeli wiele obiektów znajduje się w bliskim zasięgu, klawisz `Tab` może przełączać pomiędzy nimi w trybie cycling.

## Pozyskiwanie surowców i transport

### Drzewa

- Drzewa powinno dać się ścinać siekierą.
- Po ścięciu drzewa powinien pozostać pień.

### Skały

- Większe kawałki skał powinno dać się rozbijać kilofem na mniejsze kawałki.
- W ten sposób można pozyskiwać kamienie.

### Transport ciężkich surowców

Do ręcznego lub zwierzęcego transportu większych ilości ciężkich surowców mogą być potrzebne:

- taczka,
- wózek ręczny,
- wózek pod osła,
- wózek pod konia.

## Zachowanie zwierząt przy zagrożeniu

### Zwierzęta domowe

W przypadku zagrożenia lub ataku zwierzęta domowe powinny uciekać:

- do pasterza,
- albo do swojej zagrody.

### Zwierzęta dzikie

Zwierzęta dzikie powinny bać się:

- ludzi,
- ognia,
- zagród.

Wyjątki:

- gdy mają młode,
- gdy człowiek znajduje się blisko ich legowiska.

W takich sytuacjach zwierzęta mogą stawać się bardziej agresywne.


## Spatial grid i częstotliwość decyzji

- Systemy nie powinny skanować wszystkich obiektów świata, tylko obiekty znajdujące się w odpowiednim zasięgu, wykorzystując spatial grid lub równoważny mechanizm indeksowania przestrzennego.
- NPC i zwierzęta nie powinny podejmować decyzji co klatkę.
- Decyzje mogą być podejmowane np. raz na sekundę.
- Częstotliwość podejmowania decyzji może zależeć od gatunku i stanu organizmu.
- Słabszy gatunek lub zmęczony organizm może podejmować decyzje rzadziej.
- Krytyczne sytuacje powinny mieć możliwość wymuszenia szybszej reakcji niezależnie od normalnej częstotliwości decyzji.

## Burmistrz i zarządzanie osadą

- Przy wysokiej reputacji i dobrych relacjach z mieszkańcami osady gracz może zostać jej burmistrzem.
- Obecny burmistrz lub sołtys może wtedy zostać zastępcą gracza.
- Dzięki temu gracz może mieć decydujący wpływ na rozbudowę osady i podobne decyzje dotyczące jej rozwoju.

## Kierunek graficzny

- Określenie `low poly` nie powinno ograniczać ładnego i realistycznego designu oraz grafiki tam, gdzie nie powoduje to dużego spadku FPS.
- Przykład: ogień może korzystać z particles i mieć iskry.


## Gotowanie przy ognisku

- Na ognisku można upiec mięso.
- Mając naczynie lub patelnię, można upiec 2 kawałki mięsa jednocześnie.
- Można zbudować ruszt i piec więcej kawałków równocześnie.
- Upieczone mięso powinno zachowywać parametry opisujące produkt, np.:
  - gatunek zwierzęcia,
  - świeżość.
- Lista parametrów może być później rozszerzona.

## Towarzysze

- Gracz może zatrudnić towarzysza:
  - na określony czas,
  - za określoną kwotę,
  - z określeniem zadania,
  - z uwzględnieniem poziomu ryzyka.
- Wspólne podróże i bycie towarzyszem mogą budować relację między graczem a NPC.
- Można też zapytać NPC, czy chce dołączyć do gracza za darmo.
- Szansę na darmowe dołączenie zwiększają:
  - reputacja,
  - relacja z NPC.
- Decyzję modyfikują również:
  - charakter NPC,
  - jego aktualna sytuacja,
  - obowiązki.
- Bardziej chętni do dołączenia będą młodzi mężczyźni bez rodziny.
- W osadzie powinien zawsze być przynajmniej jeden taki starszy syn bez własnej rodziny.
- Gracz musi mieć możliwość przekazania towarzyszowi broni i pancerza.
- Przekazanie może odbywać się jako:
  - prezent,
  - handel.
- NPC powinien następnie faktycznie używać otrzymanego wyposażenia.
- NPC powinien wybierać swoją lepszą broń.
