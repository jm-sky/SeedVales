# Q05 — The Map That Missed the River

**Status: propozycja N/P; treasure/landmark.** Wymaga `WORLD-11` i `LOOT-01`, jaskinia nie jest konieczna.

## Założenie

Iven w miasteczku T ma mapę swojej babki: zaznaczony kamienny krąg i skrzynia, ale narysowana rzeka nie zgadza się z terenem. Pell, archiwista, uważa, że mapa jest błędna; Iven chce sprawdzić, czy błąd nie jest śladem dawnej trasy handlowej. Gracz może oddać znalezisko rodzinie, przekazać mapę do publicznego archiwum albo użyć odkrytej trasy do prywatnego kontraktu handlowego. Nikt nie ukrywa skarbu przed graczem.

Start: mapa trafia do gracza przez Iven; landmark istnieje albo quest nie pojawia się. I: fizyczna podróż, łopata, mapa/minimapa po implementacji. P: landmark/skrzynia. N: interpretacja mapy, proweniencja przedmiotu, publiczna kopia.

## Stan i sceny

`accepted`, `mapRead`, `riverMismatchSeen`, `circleFound`, `chestOpened`, `choice=family|archive|trade`, `settled`.

### 1. A line that should be water

**Iven:** My grandmother drew this river with three bends. The river has two now.
**Player:** Rivers move.
**Iven:** Exactly. Pell says the map is wrong because he has a newer map. I say newer is not the same as truer.
**Player [A]:** I will compare it on the ground.
**Iven:** Bring back what you see, not what makes the story better.
**Player [B]:** Sell the map to Pell.
**Iven:** You can. I will not call it my family’s map after that.

**Pell:** I have catalogued the paper. I have not walked the valley.
**Player:** What do you know?
**Pell:** The ink is old. The date is uncertain. The mark beside the circle resembles a surveyor’s sign.
**Player:** And the chest?
**Pell:** I know only the mark. I will not invent a chest because the word is exciting.

**Iven:** If you find the circle, do not open anything before looking for a name.
**Player:** Why?
**Iven:** Because objects belong to someone before they belong in a story.

### 2. The changed bank

**Sella, jeśli gracz przyniósł raport z Q02:** The old bank is passable above the bend. Below it, the water cuts fast.
**Player:** I’m following a map older than the current river.
**Sella:** Then use the river as it is, and the map as a question.

**Player:** The bank has moved. The mark must have been farther east.
**Iven:** That is what I hoped and feared.
**Player:** I have not found the circle yet.
**Iven:** Then we have a better uncertainty, not an answer.

**Pell:** A map becomes evidence only when another person can follow it.
**Player:** So I should mark the new crossing.
**Pell:** Mark both: “old water” and “water now.” Future people deserve the difference.

### 3. Stone and soil

**Iven:** There. Three stones in a ring.
**Player:** The centre is disturbed.
**Iven:** My grandmother wrote “do not trust the first hollow.”
**Player:** We inspect before digging.
**Iven:** Thank you. Excitement is a poor shovel.

**Pell [po otrzymaniu świadka/rysunku, nie telepatycznie]:** You found the circle. Did you find an inscription?
**Player:** A maker’s mark and a sealed place under the eastern stone.
**Pell:** Then I want the mark recorded before the seal is broken.

**Iven:** If there is a family token, I want it. If it is only coins, we can discuss the rest.
**Player:** And if the chest belongs to someone else?
**Iven:** Then “my grandmother’s map” is not a claim of ownership.

### 4. Trzy zakończenia

**E1 — Back to the family.** Warunek: `family`, `circleFound`, `chestOpened`, znaleziony token jednoznacznie rodzinny lub list pozwalający Iven zidentyfikować właściciela. Otwieranie skrzyni i loot są P; nie generować przedmiotu, którego generator nie obsługuje.

**Iven:** This ring. She wore it when she left the valley.
**Player:** The map was not a treasure map, then.
**Iven:** It was a way home that had forgotten the river.
**Pell:** I will copy the route if you permit it.

Skutek: token trafia do Iven; kopia techniczna może później trafić do archiwum za zgodą; brak publicznej mapy bez jej decyzji.

**E2 — The public route.** Warunek: `archive`, Iven zgadza się na kopię, Pell otrzymał opis landmarku i nowego brodu.

**Pell:** I will write “Iven’s family map, compared with present water.”
**Iven:** Put my name on the first line, not in a footnote.
**Player:** And the contents of the chest?
**Iven:** The archive can list them. It does not own my ring.

Skutek: odkryty landmark/route oznaczony dla przyszłych podróży; łup dzielony wg jawnej własności; wzrost renomy za wiedzę.

**E3 — A trader’s shortcut.** Warunek: `trade`, Iven świadomie podpisuje jednorazowe użycie trasy, Oren/handlarz ma rzeczywiste towary i transport; nie obejmuje automatycznych wozów, jeśli `WORLD-09` jest odłożone.

**Iven:** One caravan season. After that, the route is public or closed by agreement.
**Player:** You are selling access to a road you did not build.
**Iven:** I am selling a survey and accepting the cost of being wrong.
**Pell:** Put the term in writing. Memory is not a contract.

Skutek: jednorazowy dochód z istniejącego skarbca/handlu, większe zużycie trasy i możliwość późniejszego osadu logistycznego; brak teleportu.

## Odmowa, przerwanie, mechaniki

Gracz może zatrzymać mapę bez przyjęcia — Iven poszuka innej osoby po czasie, bez kary. Zniszczona mapa: jeśli gracz wykonał kopię, quest trwa; bez kopii nie wolno odtworzyć treści. Skrzynia otwarta bez oględzin blokuje `archive` tylko dla pełnej dokumentacji, nie tworzy moralnej kary. NPC nie zna znalezionego tokenu bez przekazania. I: fizyczne kopanie i landmarki po implementacji P; N: proweniencja, podpis, umowa handlowa. Jaskinia nie jest warunkiem tego questa.
