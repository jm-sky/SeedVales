# Wizja i założenia projektu

> **Uzupełnienia:** [VISION-APPENDIX.md](VISION-APPENDIX.md) — nowsze doprecyzowania i nowe wymagania (postacie, zwierzęta, ślady, pogoda, landmarki/skarby, handel/prezenty, UI, pozyskiwanie i transport, spatial grid/kadencja decyzji, burmistrz, kierunek graficzny, gotowanie, towarzysze). Przy sprzeczności dodatek jest nowszy; rozstrzygnięcia w `docs/design/DECISIONS.md`. Status wymagań z dodatku: `docs/state/FEATURES.json` (`scope: "v2"`), kolejność: `docs/roadmap/v1-closure-and-appendix.md`.

## Spis treści

1. [Ogólna wizja gry](#1-ogólna-wizja-gry)
2. [Główne obszary projektu](#2-główne-obszary-projektu)
3. [Architektura i performance](#3-architektura-i-performance)
4. [Skala świata, przestrzeń i podróż](#4-skala-świata-przestrzeń-i-podróż)
5. [Czas, dzień/noc, pogoda i pory roku](#5-czas-dzieńnoc-pogoda-i-pory-roku)
6. [Geografia](#6-geografia)
7. [Osady](#7-osady)
8. [NPC i ludzie](#8-npc-i-ludzie)
9. [Atrybuty i liczniki postaci](#9-atrybuty-i-liczniki-postaci)
10. [AI NPC i potrzeby](#10-ai-npc-i-potrzeby)
11. [Osobowość NPC — Big Five](#11-osobowość-npc--big-five)
12. [Skills](#12-skills)
13. [Profesje](#13-profesje)
14. [Reputacja](#14-reputacja)
15. [Zwierzęta](#15-zwierzęta)
16. [Surowce, rośliny i żywność](#16-surowce-rośliny-i-żywność)
17. [Woda i choroby](#17-woda-i-choroby)
18. [Zwłoki, mięso i psucie żywności](#18-zwłoki-mięso-i-psucie-żywności)
19. [Przedmioty](#19-przedmioty)
20. [Bronie](#20-bronie)
21. [Zbroje](#21-zbroje)
22. [Jakość, materiały i technologia przedmiotów](#22-jakość-materiały-i-technologia-przedmiotów)
23. [Crafting](#23-crafting)
24. [Budowanie i modyfikacja świata](#24-budowanie-i-modyfikacja-świata)
25. [Walka](#25-walka)
26. [Zadania](#26-zadania)
27. [Interfejs](#27-interfejs)
28. [Tematy do uzupełnienia](#28-tematy-do-uzupełnienia)

---

# 1. Ogólna wizja gry

- Gra działa w przeglądarce.
- Technologia: JavaScript + Three.js.
- Gra jest symulacją świata obejmującą m.in.:
  - geografię,
  - osady,
  - NPC,
  - zwierzęta,
  - góry,
  - morza,
  - domki.
- Klimat średniowieczny.
- Gra ma elementy RPG.
- Bez żadnego fantasy.

---

# 2. Główne obszary projektu

Tematy obejmują między innymi:

- skalę świata,
- skalę czasu,
- kalibrację podstawowych wartości,
- geografię,
- morza,
- osady,
- lasy,
- góry,
- ludzi,
- zwierzęta,
- wspólną warstwę atrybutów,
- warstwę AI dla ludzi opartą o Big Five,
- reputację,
- profesje,
- przedmioty,
- combat,
- quests,
- performance.

---

# 3. Architektura i performance

Od początku musimy myśleć o performance.

Model danych, relacji i mechanizmów powinien być pisany osobno od modelu renderowania.

Od początku trzeba myśleć o:

- patchowaniu,
- cachowaniu,
- spatial grid,
- częstotliwości odświeżania,
- innych mechanizmach ograniczających koszt symulacji i renderowania.

> Pytania:
> - Jak dokładnie będzie działać poziom szczegółowości symulacji dla obiektów daleko od gracza?

Dobrze aby świat mógł żyć daleko od gracza, ale możemy użyć uproszczeń, symulacji większymi partiami.

> - Jak często mają być aktualizowane NPC, zwierzęta, pogoda i inne systemy zależnie od odległości od gracza?

Trzeba dobrać sensowną jednostkę, np. co 4 godziny gry, albo zależnie od kontekstu.

> - Jak będzie działało zapisywanie i odtwarzanie dużego świata?

Musimy zapisywać stan gry ze wszystkimi stanami w bazie danych (browser only). Ale wynik deterministycznego generowania świata oparty o seed możemy zapisać osobno, jako wspólny cache/fundament dla wielu różnych gier.

---

# 4. Skala świata, przestrzeń i podróż

## 4.1. Ogólne założenia

- Świat ma być duży i różnorodny.
- Podróż odbywa się tylko fizycznie w świecie.
- Nie ma skrótu podróży przez mapę.
- Można podróżować:
  - piechotą,
  - konno.

## 4.2. Odległości

Odległość między pierwszą osadą a najbliższą osadą to około 1–2 dni drogi piechotą.

Przyjmujemy:

- dzień marszu: około 16 godzin kalendarza,
- prędkość marszu: 1,5 m/s w przestrzeni świata (≈ 5,4 km/h).

Przykład (skala skompresowana, patrz §5.2):

`16 h kalendarza = 40 realnych minut × 1,5 m/s ≈ 3,6 km trasy`

Realistyczne 80 km/dzień (16 h × 5 km/h) byłoby zbyt dużym światem, dlatego świat jest celowo gęstszy. Obowiązuje wartość 3,6 km/dzień marszu.

## 4.3. Długie podróże

Ratunkiem od długich i nudnych podróży jest:

- jazda konno,
- autopilot po wyznaczonych, ubitych drogach.

> Pytania:
> - A co z końmi, jukami, wozami i transportem większej ilości przedmiotów?

Gracz/NPC może mieć konia/osła. Te zwierzęta mogą mieć juki i ciągnąć wóz.

> - Jak duża ma być faktyczna skala świata względem skali reprezentowanej przez kilometry?

Świat powinien być dość duży, oferować wiele wiosek (ale nie jedna-na-drugiej), lasy (w tym duże i gęste lasy), obszary bagienne, zamki, cmentarze - aby świat był ciekawy, aby daleka podróż miała sens.

> - Czy podróż konna zużywa zasoby lub męczy konia?

Podróż konna męczy konia, a gracza minimalnie - ale zależnie od skill "Riding".

## 4.4. Kamera i oprawa wizualna (decyzja)

- **Kamera:** widok zza postaci (third-person), z możliwością przybliżenia. Sterowanie: WASD + mysz na desktopie; joystick + przeciąganie kamery na mobile. Walka wręcz i dystansowa opiera się na tym widoku.
- **Oprawa:** hybryda. Teren, roślinność i budynki są generowane proceduralnie (low-poly, kolory z palety). Postacie i zwierzęta mogą używać importowanych assetów (glTF) o zgodnej licencji; do czasu ich doboru — proste modele proceduralne jako placeholdery.
- Szczegóły i uzasadnienie: `docs/design/rendering-camera-and-art.md`.

---

# 5. Czas, dzień/noc, pogoda i pory roku

Świat ma mieć:

- dzień i noc,
- pogodę,
- pory roku.

## 5.1. Pogoda

Rodzaje pogody:

- słoneczna,
- deszcz,
- burza,
- śnieg,
- mgła.

Mgła może występować także w połączeniu z innymi pogodami.

Deszcz i burza mogą mieć efekt na zwierzęta i NPC, np.:

- szukanie schronienia,
- spłoszenie.

## 5.2. Czas

Jeden dzień gry może trwać około:

- 60 realnych minut.

Jeden rok może trwać np.:

- `12 × 5 = 60 dni gry`, przy założeniu, że miesiąc ma 5 dni — **wariant początkowy (domyślny)**,
- albo `12 × 10 = 120 dni` — wariant do rozważenia później, jako parametr konfiguracji.

> Pytania:
> - Jak dokładnie działają sezony i ile trwa każdy z nich?
> - Jak pory roku wpływają na pogodę, uprawy, zwierzęta, długość dnia i dostępność żywności?

Jeżeli miesiąc ma 5 dni, to sezon ma 15 dni. Sezon to głównie pogoda, ale też wpływ na przyrodę - mniejsze plony, mniej jedzenia dla zwierząt, niższa temperatura - ciężej nocować w namiocie.
Deszcze naturalnie podlewają pola, dzięki czemu NPC nie muszą tego robić.

| Parametr | Propozycja początkowa |
|---|---:|
| Doba gry | **60 realnych minut** |
| Upływ czasu | **24×** |
| Chodzenie | **1,5 m/s**, czyli 5,4 km/h w przestrzeni świata |
| 1 godzina kalendarza gry | 2,5 realnej minuty → 225 m marszu |
| 16 godzin marszu w grze | **40 realnych minut → 3,6 km** |
| Najbliższa osada: 1–2 dni marszu | **3,6–7,2 km faktycznej trasy** (start: ~1 dzień) |


Odległość liczymy po dostępnej trasie, uwzględniając rzeki, góry i drogi (byłoby miło, ale dla ułatwienia możemy użyć linii prostej z modyfkatorami za przeszkody; aczkolwiek chcemy mieć drogi, więc może da radę z drogami). (drogi powinny być nakładane na geografię, wybierając sensowne przejścia, i lekko modyfikując teren aby pokazać, że ktoś tamtędy chodził i ziemia się wyrównała).

Nie mnożymy prędkości chodzenia przez przyspieszenie kalendarza. Inaczej postać pędziłaby przez teren. Metry nadal służą do rozmiarów budynków, zasięgu broni i kolizji; „dzień drogi” jest miarą podróży w skompresowanym świecie.

**Konsekwencje:**

- **Najbliższy sąsiad to długa wyprawa:** około 30–40 minut samego marszu w jedną stronę (przy założeniu 1 dzień marszu, tzn. 16 godzin marszu, bo nie maszerujemy 24 godziny). To pasuje do ekspedycji, ale utrudnia częsty handel. Autopilot zwalnia z kierowania, lecz nie skraca czekania.
- **Koń ma realną wartość:** przy średniej prędkości podróżnej 2× większej skraca taką podróż do około 15–20 minut.
- **Potrzeby i produkcja korzystają z kalendarza:** sen, głód, psucie żywności, pogoda, uprawy. Kalibrujemy je do długości dnia.
- **Walka korzysta z sekund rozgrywki:** zamach, naciąganie łuku, regeneracja staminy, ochrona po utracie przytomności. Twoje 120 sekund ochrony powinno oznaczać 120 realnych sekund przy normalnym tempie.
- **Sen i długa praca wymagają przyspieszenia:** osiem godzin snu oznaczałoby inaczej 20 minut czekania. Przyspieszenie musi obejmować cały świat i przerywać się przy zagrożeniu. Oraz z opcją "[Esc] Przerwij"
- **Rok 60-dniowy to 60 godzin bez przyspieszania.** Wzrost roślin, rozród i starzenie wymagają osobnej kalibracji.

---

# 6. Geografia

- Świat ma być duży i różnorodny.
- Wyobrażam sobie 2–3 kontynenty na oceanie.
- Powinny być strefy klimatyczne:
  - na północ zimno — tundra,
  - na południe gorąco — step, pustynia.
- Dżungla może być na drugim kontynencie.

Świat powinien zawierać:

- lasy iglaste,
- lasy liściaste,
- lasy mieszane,
- łąki,
- stepy,
- pustynie,
- bagna,
- góry,
- jeziora,
- strumienie,
- rzeki,
- jaskinie.

## 6.1. Jaskinie

Jaskinie mogą być:

### Małe

Krótka jaskinia z komorą.

### Średnie

- około 2 tuneli,
- około 3 komór.

### Duże

Więcej:

- dłuższych tuneli,
- komór.

Jaskinie raczej występują w górach, ale mogą pojawiać się również niżej.

### Technicznie

Jeżeli będziemy robić świat w THREE.js, to jaskinie można zrobić tak:

- w górskim terenie, przy zboczu dodajemy kolejny plane heightmap, który ma wymiar np. 20x20 i jest klonem części terenu,
- w tym planie robimy tunele, które schodzą niżej,
- dodajemy też plane pod sufit,
- ściany powstają poprzez połączenie obu tych płaszczyzn.

## 6.2. Góry i ukształtowanie terenu

- Góry powinny być wysokie.
- Szczyty powinny być ostre i niedostępne.

Wybrzeża morskie, brzegi jezior i teren powinny przewidywać:

- uskoki,
- klify,
- strome zbocza.

Przykłady:

- brzeg morski może mieć klif wysokości 4–8 m,
- na łące mogą pojawiać się uskoki wysokości 1–2 m i długości np. 5–10 m,
- w górach mogą występować:
  - strome zbocza,
  - przepaście,
  - kaniony.


## 6.3. Rzeki, jeziora, morza

Rzeki powinny mieć źródła w górach - najpierw tworząc strumień, potem rzekę; mieć ujście do morza lub jeziora.

Powinny mieć jakieś koryto i głębokość. Rzeka powinna móc osiągnąć szerokość nawet 10 m. Rzeki w miejscach przecięcia z drogą powinny mieć bród, albo nawet prosty most.

Głęboka woda wymaga pływania, w płytkiej można brodzić. Pływanie zużywa stamina, może prowadzić do utonięcia.

Zwierzęta muszą wybierać trasę uwzględniając wodę, aby się nie utopić. Szczególnie miejsce do picia powinno być z brzegu zbiornika.

## Otoczenie

Chcemy mieć dźwięki otoczenia, np.
- Na łąkach śpiewają ptaki
- Nad morzem słychać fale i mewy
- W górach wiatr
- W jaskiniach krople wody

Oprócz tego:
- W nocy czasem słychać sowę
- Zwierzęta też wydają swoje dźwięki

Trzeba dodać mechanizm cooldown i zabezpieczyć się przez orkiestrą równoczesnych vocalization.

---

# 7. Osady

Osady mają wielkość:

- `SM` — mała wioska,
- `MD` — duża wioska,
- `LG` — małe miasteczko,
- `XL` — miasto.

Od domowej osady kolejne osady muszą rosnąć progresywnie, aby zapewnić fabularne odkrywanie coraz większych lokacji.

Przykład:

- około 1 dzień drogi do drugiej osady,
- potem 1–2 dni drogi do miasteczka,
- potem 1–2 dni drogi do miasta.

Między osadami są drogi, które układamy sensownie na istniejącej geografii.

Duże osady mają często:

- bogatszych mieszkańców,
- większy wybór przedmiotów w sklepach,
- możliwe specjalizacje handlarzy,
- możliwe specjalizacje wyrobników, np. kowali.

> Pytania:
> - Jak osady powstają, rozwijają się i zmieniają w czasie?

Osady są generowane na początku. Osada może się rozwijać lub maleć, zależnie surowców i sytuacji. Brak surowców (wycięli drzewa w pobliżu), może spowodować wyprawy do dalszego lasu albo budowę outpost.

> - Jak określana jest populacja poszczególnych wielkości osad?

Np. mała osada (SM) ma kilka households (zazwyczaj: mąż, żona, dziecko, czasem starzec) dla kluczowych profesji (rolnik, drwal, strażnik, myśliwy). Kluczowe profesje zależą od obszaru - nad morzem będzie więcej rybaków, w górach więcej górników i kowali itp.

Mała osada może mieć np. 6 households (rolnik, drwal, myśliwy, strażnik, zielarz, pasterz) - w tej liczbie ktoś może być handlarzem i sołtysem.

Większa osada może mieć 8-10 households, miasteczko więcej.

> - Jakie budynki i usługi są wymagane dla SM / MD / LG / XL?

Każda osada ma plac z ogniskiem, tablicą ogłoszeń, wspólną studnią. Każde hosusehold ma dom, podwórko, studnię, zabudowę pod profesję (zagroda dla zwierząt dla rolnika; kowadło dla kowala). 
MD powinno mieć targ, może mieć gospodę.
LG powinno mieć targ, gospodę, ratusz.
XL musi mieć ratusz.

Tablica ogłoszeń służy do:
- Czasem mogą tam trafić quests
- Gracz wiesza tam swoje zlecenia: Zlecenia na pomoc w budowie. Zlecenie na pomoc w wyprawie (companion).

Cmentarze - małe osady mogą mieć własny cmentarz lub wspólny z najbliższą osadą. Większe osady mają swoje cmentarze na uboczu.

Magazyny - każda osada ma magazyn (albo magazyny - osobny na surowce, osobny na żywność). Household też mają swoje magazyny. To może być sterta drewna, skrzynia na przedmioty, beczka, szopa.

NPC często oddają swoje nadwyżki do wspólnego magazynu osady, oraz w razie potrzeby mogą z niego korzystać - ale jako ostateczność.

## Naprawa

- Budynki i obiekty użytkowe mają swój stan (durability?) i mogą wymagać okresowych napraw. Zła pogada wpływa na szybsze zużycie.
- NPC starają się naprawiać swoje i wspólne budowle i obiekty.  Trzeba zapewnić im narzędzia i surowce na początku gry, jako minimalny początkowy zestaw.

---

# 8. NPC i ludzie

Każdy NPC ma:

- podstawowe atrybuty,
- skills,
- osobowość,
- potrzeby,
- wyposażenie,
- początkowe pieniądze,
- broń,
- przedmioty.

Każda profesja ma:

- obowiązki podstawowe,
- obowiązki dodatkowe.

Rodzina często pomaga NPC w wykonywaniu obowiązków.

Przykłady:

- myśliwy może dodatkowo:
  - wyrabiać łuki i strzały,
  - wykonywać wyroby ze skóry,
  - suszyć mięso;
- rolnik może mieć:
  - krowę,
  - psa.

Dzieci zależnie od wieku też pomagają, starcy również - ale np. w zakresie 30%.

---

# 9. Atrybuty i liczniki postaci

Bazujemy trochę na Fallout.

## 9.1. Atrybuty

- Strength
- Perception
- Endurance
- Charisma
- Intelligence
- Agility

Niektóre atrybuty mogą powoli, delikatnie rosnąć w miarę używania, ale nie powinno to dublować skills. Np. Strength może rosnąć w miarę noszenia ciężkich przedmiotów.

## 9.2. Liczniki

### HP

HP jest wyliczane ze stanu zdrowia i obrażeń obszarów ciała, np.:

- głowa,
- korpus,
- wnętrzności,
- ręce,
- nogi,
- itd.

### Stamina

- Możliwość krótkotrwałego wysiłku.
- Szybko się regeneruje.

### Vigor

- Siła na cały dzień.
- Regeneruje się podczas:
  - odpoczynku,
  - snu.
- Powinien wystarczać na około 18–20 godzin marszu.
- Po wyczerpaniu daje karne modyfikatory.
- Można przeciągnąć aktywność z zerowym Vigor, np. przez kolejne 24 godziny.
- Wraz z dalszą aktywnością:
  - rosną kary,
  - potem trzeba dłużej odpocząć.

Vigor regeneruje się podczas odpoczynku zależnie od komfortu miejsca.  
- Spanie na kocu w polu podczas deszczu - to chyba najniższy komfort.
- Namiot lub stóg siana - daje niski komfort (+ survival skill)
- Namiot + ognisko + posłanie ze skór - daje średni komfort (+ survival skill)
- Dom z łóżkiem - daje komfort średni-wysoki zależnie od warunków.

### Hunger

Głód. Głodnym można być dłuższy czas, choć pojawiają się karne modyfikatory.

### Thirst

Pragnienie. Pragnienie działa mocniej niż głód.

---

# 10. AI NPC i potrzeby

NPC mają model sztucznej inteligencji oparty o potrzeby podstawowe:

- woda,
- jedzenie,
- sen,
- odpoczynek.

Do tego dochodzą potrzeby wyższego rzędu.

NPC będą:

- układać potrzeby w strategie,
- wybierać najlepsze rozwiązanie.

> Pytania:
> - Jakie dokładnie są potrzeby wyższego rzędu?

Istnieje potrzeba społeczna/kontaktu - realizowana przez spotkania z innymi NPC przy ognisku albo w gospodzie, oraz czasem przez wspólne aktywności (polowanie). Ale ogółem potrzeba wyższego rzędu to obowiązki wynikające z household i profesji - np. muszę zadbać aby w domu było jedzenie, aby zwierzęta miały co jeść i pić, muszę wykonywać moje obowiązki zawodowe.

> - Jak NPC wybiera pomiędzy obowiązkami profesji, potrzebami, rodziną, bezpieczeństwem i innymi celami?

Tu musi być mechanizm, który liczy:
- siła potrzeby podstawowej
- siła obowiązku
- kontekst
- koszty, odległości, zmęczenie, dostępne narzędzia

Np. wodę można pobrać z kilku różnych źródeł - której jest bliżej?

To trzeba mądrze zaprojektować.

> - Jak działa planowanie wieloetapowych strategii?

Trzeba to zaprojektować.

---

# 11. Osobowość NPC — Big Five

NPC mają osobowość opartą o Big Five.

Osobowość modyfikuje:

- zachowanie NPC,
- wybór strategii,
- inne decyzje AI.

[DO UZUPEŁNIENIA]

---

# 12. Skills

## 12.1. Tryby działania skills

### Pasywne

Działają automatycznie.

Przykład:

- `melee weapons` działa automatycznie podczas walki.

### Aktywowane

Gracz aktywuje skill.

Przykład:

- skradanie się.

### Z wyborem celu

Skill wymaga wybrania celu.

Przykład:

- medycyna.

## 12.2. Lista skills

- medycyna,
- skradanie się,
- survival,
- traps,
- melee weapons,
- ranged weapons,
- construction,
- Blacksmith.

> Pytania:
> - Jak rosną skills?

Skills rosną w miarę używania. Wyższy poziom wymaga większej praktyki.
Dostępne są książki dla kilku poziomów wiedzy:
- Podstawowy: dostępny dla wszystkich; może dać skill max 20%; do 30% trzeba podbić go praktyką lub szkoleniem
- Średni: dostępny gdy mamy poziom 30%; może pobić skill max do 50%; potem trzeba praktyki
- Wysoki (mistrz)
- Bardzo wysoki (wyśmienity mistrz)

> - Czy istnieją poziomy, doświadczenie albo continuous values?

Nie ma poziomów, nie ma EXP. Wszystko rośnie w miarę używania i treningu.


---

# 13. Profesje

Lista profesji:

- Drwal - mieszka w domku, ma siekierę i chodzi ścinać drzewa.
- Zielarz - chodzi na łąkę zbierać zioła, może mieć zioła w ogródku, zna podstawową medycynę
- Lekarz - dobrze zna medycynę, może zbierać zioła i wytwarzać leki
- Myśliwy - poluje na zwierzęta (np. sarny), czasem zmniejsza populację drapieżników, pilnuje aby zwierzyny nie było zbyt mało, czasem może dokarmiać zwierzęta, jest źródłem quests z serii tej profesji, może wytwarzać łuki i strzały
- Strażnik miejski - piluje osady, patroluje w nocy, zapala pochodnie wokół osady, oferuje tani ale niezbyt wygodny nocleg, jest źródłem zadań
- Handlarz miejski
- Farmer
- Pasterz - ma swoje stado 2-5 owiec, zbiera z nich wełnę, pilnuje, wyprowadza na wypas; ma często kij, czasem włócznię, procę
- Wędkarz / Rybak
- Kowal
- Górnik
- Handlarz wędrowny
- Kurier
- Woźnica
- Hodowca bydła / Rzeźnik
- Hodowca koni
- Tkacz
- Cieśla
- Leatherman
- Sołtys
- Burmistrz

Niektóre profesje mogą się trochę łączyć.

Każda profesja ma:

- obowiązki podstawowe,
- obowiązki dodatkowe.

Rodzina często pomaga.

## 13.1. Przykładowe wyposażenie

Każdy NPC ma podstawowe:

- początkowe pieniądze,
- broń,
- przedmioty.

Przykład — Pasterz:

- proca,
- kij,
- oszczep,
- bukłak,
- bandaż,
- koc,
- lina,
- pies.

## 13.2. Profesje i wielkość osady

Lepszych kowali raczej będzie więcej w miastach, ale nie jest to reguła.

Górskie wioski blisko surowców mogą mieć dobrych kowali.

Dobry kowal ma wysoki skill.

Wysoki skill daje szansę na:

- lepszy przedmiot,
- przedmiot lepszej jakości.

---

# 14. Reputacja

Gracz ma reputację w sensownych socjologicznych wymiarach, np.:

- `uczciwość`,
- `uczynność`,
- `rozpoznawalność`,
- `odwaga`.

Reputacja funkcjonuje w ramach jednej osady.

Jednocześnie reputacja rozchodzi się po świecie podobnie jak wiedza:

- przenoszą ją NPC,
- częściowo może przepływać sama z siebie do najbliższych osad.

Reputacja rośnie np.:

- po wykonaniu zadań,
- po zabiciu groźnych zwierząt.

> Pytania:
> - Czy reputacja może również spadać?

Tak. Dodatkowo powininen być system achievements/badges - za pozytywne i negatywne rzeczy. np.
- gracz sprzątał dużo i często osadę (zabijał i grzebał szczury)
- gracz kopał na cmentarzu i został przyłapany (noc i Sneak zmniejsza szansę)
- gracz zabił wiele groźnych zwierząt
- gracz został przyłapany na kradzieży

Ale jest możliwość zdjęcia negatywnego badge - do ustalenia, np. przeprosić wszystkich i odczekać kilka dni.

> - Jak szybko informacje o graczu rozchodzą się między osadami?

Dla najbliższych osad (zasięg 1 dzień drogi) - 30% reputacji z opóźnieniem równym odległości dla szybkiego marszu. Nie robimy transferu całej reputacji, a raczej tylko sensowych wymiarów.
Jeżeli będzie transport i podróże między osadami - wtedy możemy oprzeć to na realnym trasferze wiedzy albo zrobić model hybrydowy.

> - Czy NPC mają własną indywidualną opinię o graczu niezależną od reputacji osady?

Tak, powinna być relacja/sympatia, ale niekoniecznie każdy wymiar z reputacji - ale to do ustalenia.

---

# 15. Zwierzęta

## 15.1. Lista

- szczur,
- lis,
- wilk,
- niedźwiedź,
- dzik,
- zając,
- sarna,
- jeleń,
- łoś,
- krowa,
- kura,
- owca,
- koń,
- osioł,
- pies.

## 15.2. Rodzaje

Zwierzęta mogą być:

- młode,
- dorosłe,
- zwykłe,
- alfa,
- wyjątkowo silne,
- rzadkie, np. albinos.

## 15.3. Zachowanie

Zwierzęta:

- mają swoje miejsca żerowania,
- muszą chodzić po wodę do strumienia,
- drapieżniki polują na inne zwierzęta.

Zwierzęta mogą jeść upuszczone przedmioty.

Mogą być przez takie przedmioty wabione.

Przykłady:

- padlina przyciąga wilki,
- upuszczone mięso również może przyciągać zwierzęta.

Zależy to od:

- gatunku,
- pogody,
- pory dnia,
- itd.

## 15.4. Legowiska

Zwierzęta mogą mieć własne legowisko.

Legowisko jest spawn-pointem.

Można je zniszczyć, np.:

- spalić - co wymaga np. 5x gałąź (+ krzesiwo)

---

# 16. Surowce, rośliny i żywność

Wyobrażam sobie, że będzie trawa. Warto aby miała połacia/obszary różnych kolorów - np. większość zielona, plamy żółtawe, plany ciemniejsze.

Dobrze by nad wodą były trzciny.

## 16.1. Drzewa

- Drzewa rosną.
- Drzewa się rozsiewają.
- Można je ścinać.
- Są źródłem:
  - gałęzi,
  - belek.

Wyobrażam sobie, że drzewa mają realistyczną wysokość, nie 4 m, tylko raczej 10-30 m (albo nawet więcej).

## 16.2. Kamień i złoża

- Są kamienie w ziemi.
- Kamień można wydobywać ze skał.

Surowce mineralne:

- węgiel,
- żelazo,
- złoto,
- miedź.

Złoża mogą mieć różną wielkość.

Kopanie łopatą/kilofem w okolicach złóż daje % szansy na trafienie na surowiec.

## 16.3. Zioła

Są zioła, np.:

- mięta.

Zioła mogą być:

- lecznicze,
- trujące.

Proponuję 4-6 ziół na początek: pospolite, średnie i rzadkie; z różnym zakresem i potencjałem leczniczym.

## 16.4. Żywność i rośliny

Występują:

- jagody,
- jabłka,
- pomidory,
- marchew,
- kapusta,
- grzyby.

Można łowić ryby.

---

# 17. Woda i choroby

Woda dzieli się na:

- pitną,
- niepitną, np. morze.

Woda pitna może być:

- bezpieczna,
- ryzykowna.

Ryzyko rośnie:

- dalej od źródła,
- bliżej ludzi,
- bliżej zwierząt.

Ryzykowna woda może powodować choroby.

Gracz, NPC i zwierzę mogą zachorować.

Przykłady:

- choroba pokarmowa,
- zatrucie.

## 17.1. Wścieklizna

Zwierzęta mogą mieć wściekliznę.

Wtedy:

- są odważne,
- atakują wszystkich dookoła,
- mogą zarażać.

> Pytania:
> - Jak przebiegają choroby i jak są leczone?
> - Czy choroby mogą rozprzestrzeniać się między NPC i osadami?
> - Jak długo trwa inkubacja i rozwój choroby?

[DO UZUPEŁNIENIA]

---

# 18. Zwłoki, mięso i psucie żywności

Po zabiciu zwierzęcia zostają zwłoki.

Można je oprawić i uzyskać:

- mięso,
- skórę,
- czasem poroża,
- kości.

Zwłoki po kilku godzinach:

- gniją,
- stają się źródłem chorób.

Zwłoki po:

- oprawieniu,
- albo całkowitym przegniciu

zostawiają kości.

## 18.1. Żywność

Mięso oraz inny pokarm mają:

- wartość odżywczą,
- czas użyteczności.

Po określonym czasie jedzenie się psuje.

Przykłady:

- surowe mięso psuje się szybciej niż pieczone,
- suszone mięso jest długo jadalne.

Warunki przechowywania wpływają na trwałość.

Pokarm schowany w skrzyni jest dłużej jadalny niż pokarm noszony w ekwipunku.

---

# 19. Przedmioty

Kategorie przedmiotów obejmują:

- bronie,
- zbroje,
- narzędzia (pochodnia, łopata, kilof, młot, zestaw do szycia...),
- inne przedmioty.

Przykłady innych przedmiotów:

- opatrunki,
- namiot,
- koc,
- lina,
- bukłak:
  - S,
  - M,
  - L.

Łopata jest ważnym narzędziem - umożliwia wyrównanie terenu pod budowę, kopanie w ziemi, zakopywania zwłok.  
Kopanie nad morzem daje szansę na muszle, lub drogocenne muszle.  
Kopania w okolicach osady daje szansę na przedmiot lub monety.  
Kopanie na skałach jest niemożliwe - trzeba mieć kilof.  
Pochodnia też jest ważna, powinna być opcja trzymania pochodni w lewej ręce, albo za pasem podczas walki (lub rzucamy ją na ziemię, aby coś nam trochę świeciło).

## 19.1. Podstawowe parametry przedmiotów

- waga,
- gabaryt, np.
  - XXS - moneta
  - XS - grot
  - SM
  - MD
  - LG
  - XL - halabarda
- durability,
- cena
- capability, np.
  - cięcie / oprawianie (do wycinania miesa, wstępnego oprawiania skóry)
  - ścinanie drzewo / chopping
  - transport wody (wiadra, bukłaki)
  - nabieranie wody (przy dojeniu krów)

Zastosowanie
- waga + gabaryt określają możliwość transportu w ekwipunku
- plecak, sakwy - zwiększają możliwości transportowe (np. placek dodaje ~15 kg udźwigu)

---

# 20. Bronie

Lista broni:

- nóż,
- sztylet,
- krótki miecz,
- miecz,
- długi miecz,
- mały topór,
- duży topór,
- włócznia,
- młot,
- maczuga,
- krótki łuk,
- długi łuk,
- łuk kompozytowy,
- proca,
- kusza.

Strzały i bełty występują w 3 rodzajach.

## 20.1. Parametry broni

Przykładowe parametry:

- zasięg,
- ostrość,
- maksymalna ostrość,
- trwałość ostrza,
- szybkość,
- czas do kolejnego zamachu,
- typ obrażeń:
  - cięte,
  - kłute,
  - obuchowe,
- itd.

---

# 21. Zbroje

## 21.1. Sloty

- buty,
- nogi,
- tors,
- głowa,
- dłonie,
- przedramiona,
- ramiona.

## 21.2. Rodzaje

- miękki podkład,
- skórzane,
- skórzane z okuciami,
- kolczuga,
- płytowe.

Zbroje mogą czasem łączyć się w 2 warstwy.

Przykład:

- podkład + płyta.

## 21.3. Parametry

- Waga noszonego pancerza ×0,6, ponieważ ciężar rozkłada się na ciele.
- Czy pancerz ogranicza ruch - wpływ na walkę,
- Wpływ na prędkość.
- Odporność na różne rodzaje ataku.

---

# 22. Jakość, materiały i technologia przedmiotów

Każdy przedmiot — broń, zbroja, być może także narzędzia — ma poziom jakości.

## 22.1. Klasa wykonania

Zależy od skill.

Poziomy:

- niska,
- średnia,
- wysoka,
- wyjątkowa.

## 22.2. Klasa materiałów

- niska,
- średnia,
- wysoka.

## 22.3. Technologia

Przykłady:

- Damascus — dla mieczy i noży,
- Obsidian.

Jakość i klasa wpływają na parametry przedmiotu.

Przykłady:

- przedmiot może być lżejszy,
- w lepszym pancerzu może być łatwiej się poruszać.

---

# 23. Crafting

Lepszych kowali raczej będzie więcej w miastach, ale nie jest to reguła.

Górskie wioski blisko surowców mogą mieć dobrych kowali.

Dobry kowal ma wysoki skill.

Wysoki skill daje szansę na:

- lepszy przedmiot,
- lepszą jakość przedmiotu.

Można robić zamówienia u NPC na konkretne przedmioty.

Przy zamówieniu można zapłacić zaliczkę za surowce.

> Pytania:
> - Jak dokładnie wygląda crafting wykonywany przez gracza?

Potrzebny jest skill, narzędzie, czasem warsztat. Każda czynność (nie tylko crafting) powinna zajmować czas (ale z uwzględnieniem gameplay) więc pokazujemy progress-bar (z możliwością przerwania), dla długich czynności (budowa studni, domu) dodajemy przyspieszenie czasu.
Dobry skill może przyspieszyć efekt.

---

# 24. Budowanie i modyfikacja świata

Postać może używać łopaty i zmieniać teren.

Może:

- kopać dołki,
- wyrównywać większe obszary.

Postać może rozpalić ognisko.

Postać może budować obiekty, np.:

- studnie,
- palisadę,
- dom.

## 24.1. Studnia

Studnia daje bezpieczną wodę.

## 24.2. Koryto

Koryto daje wodę dla zwierząt.

Trzeba je napełniać wiadrem.

Koryto stojące blisko studni można napełnić bezpośrednio ze studni.

> Pytania:
> - Jak działa własność terenu i budynków?

Budynki mają właścicieli. Gracz może kupić, sprzedać, oddać budynek. Ziemia w osadzie i bezpośrednio wokół należy do osady - trzeba ją kupić. Nie ma systemowego zakazu budowy na tym terenie albo na drodze - po prostu może przyjść strażnik i zrobić nam problem.

> - Jak długo trwa budowa i jakie wymaga zasoby, skills oraz pracę NPC?

Budowa studni może trwać np. 4 godziny kopania dołu, 4 godziny budowy. NPC mogą pomóc - dobrowolnie lub na zlenie. Surowce mogą leżeć blisko stanowiska budowy na ziemi - są automatycznie zaliczane.

---

# 25. Walka

Gra ma osobny `combat-mode`.

Oznacza to stan:

- dobytej broni,
- schowanej broni.

## 25.1. Łuk

Łuk wymaga przytrzymania LPM, aby naciągnąć cięciwę.

## 25.2. Sterowanie i skills

Walka wymaga:

- celowania,
- klikania.

Jednocześnie większość ciężaru walki niesie `SKILL`.

## 25.3. Utrata HP i ochrona gracza

Gracz nie ginie zbyt łatwo.

Przy `0 HP` może stracić przytomność.

Następnie dostaje `120 sekund` ochrony.

Po około `3 sekundach` może wstać.

W tym czasie:

- jest ignorowany przez wrogów,
- może uciec.

> Pytania:
> - Co dzieje się po zakończeniu 120 sekund ochrony?
> - Jak działają obrażenia poszczególnych części ciała?
> - Jak pancerz, skill, broń, stamina i stan zdrowia łączą się w model walki?

To trzeba zaprojektować.

---

# 26. Zadania

Zadania mogą być dwóch głównych rodzajów.

## 26.1. Zadania wynikające z symulacji

Przykład:

W osadzie nagromadziły się szczury, ponieważ budynków nikt nie naprawiał i powstały gniazda.

W efekcie:

- pojawia się realny problem w symulacji,
- strażnik może poprosić gracza o pomoc.

## 26.2. Zadania dedykowane pod narrację

Mogą być:

- jednorazowe,
- wieloetapowe,
- wielolokalizacyjne,
- wielorozwiązaniowe.

### Przykład — Kopalnia Złota

Trzeba pomóc reaktywować kopalnię.

Potem gracz może otrzymać:

- jednorazowo `$$$`,
- albo `$` co jakiś czas.

> Pytania:
> - Jak zadania narracyjne łączą się ze stanem symulowanego świata?

Łączą się sensownie :)

> - Czy zadanie może zniknąć lub zakończyć się samo, jeśli problem rozwiąże NPC albo zmieni się sytuacja świata?

Tak, ale uważamy na gameplay.

---

# 27. Interfejs

Projektujemy grę pod:

- web browser,
- desktop,
- mobile.

Mobile powinno mieć ułatwienia podczas walki.

Przykład:

- szerszy kąt / pole auto-targetowania.

> Pytania:
> - Jak będzie wyglądać sterowanie ruchem, interakcją, ekwipunkiem i budowaniem na mobile?

Na mobile dodajemy joystick po lewej stronie, oraz kilka guzików po prawej (interact, alternative action...)

> - Jak duża część UI desktopowego ma być dostępna na telefonie?

Całość.

## Ułatwienia

- Jeżeli mam nóż w ekwipunku, to UI daje mi możliwość interakcji np. ze zwłokami zwierzęcia, nawet jak nie mam noża w ręce. Powoduje to wzięcia noża do ręki.
- Powinny być szybkie akcje podzielone na kategorie, np.
  - Ogień: Zapal ognisko, Zapal gałąź, Zapal pochodnię
  - Budowa: Zbuduj studnię, Zbuduj dom
  - Teren: Wyrównaj, Wykop dziurę, Zrób wyżej

---

# Assets

- Mamy trochę assets od Quaternius w ignorowanym katalogu `_temp/` - można wybierać przydatne rzeczy i wrzucać np. w `public/models`
- Dźwięki trzeba poszukać/wygenerować/dodać później
- Głosy można zrobić w Fish Audio
  - Dla różnych profesji i różnych klas i grup wiekowych używać różnych tekstów/fraz oraz różnych "modeli" głosów
  - Np. frazy z grup `greeting`, `farewell`, `thanks`, `warning_danger`, `call_for_help`, `tired`, `hungry`...

---

# 28. Tematy do uzupełnienia

## Ekonomia i waluta

> Pytania:
> - Jaka jest waluta?

Walutą jest `1 copper coin`. Jajko można kupic za 2 copper. Można przeliczać copper na silver i na gold.

> - Jak działa gospodarka między osadami?

Osady powinny być samowystarczalne w zakresie jedzenia i picia. Wymieniają się i handlują surowcami i przedmiotami.


## Transport

> Pytania:
> - A co z końmi, jukami, wozami?
> - Jak działa woźnica?

Woźnica to NPC dostępny do długich wypraw, kieruje wozem. Zazwyczaj korzysta z niego wędrowny handlarz (gdy jest bogaty). Wędrowny handlarz może być biedny (ma osła, sztylet, juki), średni (ma konia, toporek, strażnika), bogaty (ma konia z wozem, dwóch strażników z dobrym sprzętem, kuszę)

> - Jak transportowane są towary pomiędzy osadami?

Do zaprojektowania.

## Relacje społeczne NPC

> Pytania:
> - Jak reprezentujemy rodzinę, znajomości, przyjaźń, konflikty i inne relacje między NPC?
> - Jak relacje wpływają na decyzje AI i reputację?

Do zaprojektowania.

## Śmierć NPC i gracza

> Pytania:
> - Czy NPC mogą umrzeć permanentnie?

Tak, ale dajemy im dodatkową ochronę, np. do -20 HP.
Poza tym mogą wołać o pomoc - wtedy inni NPC, szczególnie strażnicy, im pomagają.

> - Co dokładnie oznacza śmierć lub ciężkie obrażenia gracza?

Gracz nie umiera, leży nieprzytomny aż odzyskaświadomość. Ciężkie obrażenia goją się dłużej, wymagają pomocy lekarza, czasem okresu rekonwalesencji (karny modyfikator).

> - Jak świat reaguje na śmierć ważnego NPC?

Jakoś reaguje. Ogółem w ramach osady - robią pogrzeb, potem bliscy odwiedzają czasem grób.

## Rozwój świata w czasie

> Pytania:
> - Czy osady mogą rosnąć, maleć lub zostać zniszczone?

Tak

> - Czy powstają nowe budynki, drogi i gospodarstwa?

Tak

> - Czy populacja NPC zmienia się wraz z upływem lat?

Tak

---

# Docs, development, AI

- Trzeba pracować aby zapewnić optymalne środowisko dla pracy AI.  
- Możemy używać skryptów do automatycznego utrzymania dokumentacji w oparciu o nagłówki.  
- Możemy oznaczać kod TypeScript za pomocą JSDoc i tagów typu `@domain`, `@subdomain`, a potem automatycznie generować mapę kodu.
- Trzeba być token-efficient, używać sensownych narzędzi.
- Trzeba czasem zrobić research, aby nie wymyślać koła od początku. W web mogą być sensowne, dobre, sprawdzone wzorce i algorytmy.
- Tworząc pliki `.ts` i `.vue` trzeba od razu myśleć o przyszłości, aby nie powstały wielkie pliki z ogromną odpowiedzialnością.
- W repo są przykładowe pliki `eslint.config.ts`, `package.json` - mogą wymagać poprawy, ale są początkowym punktem odniesienia.
- Stack: TypeScript, Vue.js, TailwindCSS, ShadCN-Vue, THREE.js

---

# Uwagi

- Nie wszystko musi być w wersji v1, ale raczej większość.
- Wersję v1 rozumiem jako efekt pracy AI do pierwszego przeglądu przez użytkownika. Zakładam, że AI będzie pracować kilka długich, samodzielnych sesji robią auto-weryfikację, tworząc plany i kolejne wersje `0.1 -> 0.2 -> 0.3` aż dojdziem do v1.