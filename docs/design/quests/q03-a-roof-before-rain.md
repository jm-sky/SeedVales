# Q03 — A Roof Before Rain

**Status: propozycja N; construction/repair.** Cztery etapy; konflikt prywatny, bez „uratowania świata”.

## Założenie

Bram od miesięcy łata dach domu, w którym mieszka z Liną, Eddą i Rowanem. Ostatnia burza ujawniła, że problemem nie jest jedna dziura, lecz spróchniała belka nad pokojem Eddy. Bram chce naprawić wszystko własnymi rękami, bo zima oznacza mniej pracy. Lina uważa, że rodzina potrzebuje suchego miejsca teraz. Gracz pomaga ustalić, czy naprawa jest rozsądna, czy lepiej wykonać małą dobudowę z użyciem wspólnego magazynu za zgodą osady.

Start: Bram household istnieje, budynek ma `durability < 60`, dostępne są gałęzie i młotek albo możliwość ich pozyskania. I: budowa placu, naprawa, udźwig, czas pracy i pomoc NPC. N: inspekcja konstrukcji, zgoda rodziny, podział pomieszczeń.

## Stan

`accepted`, `beamFound`, `materialsPlan=repair|lean_to|shared`, `consent`, `workComplete`, `settled`. Podczas przyspieszenia czasu potrzeby rodziny działają normalnie; deszcz nie tworzy ukrytego limitu.

### Etap 1 — The room that drips

**S1 — Bram przy drabinie**

**Bram:** If you are here to tell me the roof is leaking, you have good eyes and poor timing.
**Player:** I came because Lina asked for another pair of hands.
**Bram:** Lina asked for a pair of eyes. Hands come after the measuring.
**Player [A]:** Show me the damage.
**Bram:** Roof first. Then the beam above Edda's room. If I say it is one job, stop me.
**Player [B]:** I can bring timber immediately.
**Bram:** Bring a tape line instead. Wood cut to the wrong length is still a tree that died for nothing.

**S2 — Lina**

**Lina:** The bed is dry if the wind is from the east. That is not a useful kind of dry.
**Player:** Bram says the beam needs checking.
**Lina:** Bram says many things after lifting a beam. I want the one he says before.
**Player:** What do you need first?
**Lina:** One dry room for Edda, and a plan that does not borrow tomorrow's food.

**S3 — Edda**

**Edda:** The drip lands in the same bowl every time. I have become very good at moving a bowl.
**Player:** Has the wall shifted?
**Edda:** The cupboard door sticks. It did not last spring.
**Player:** I will tell Bram.
**Edda:** Tell him before he climbs. A house is less forgiving than an old woman.

### Etap 2 — Measure twice

**S4 — oględziny belki**

**Bram:** The outer boards are bad. The beam is worse.
**Player:** Can it be repaired?
**Bram:** Not with a patch. A support can hold it for a season, but the room would still be unsafe in a hard wind.
**Player [A]:** Replace the beam.
**Bram:** I need two straight pieces and help lifting. That is a proper repair.
**Player [B]:** Build a lean-to for Edda.
**Bram:** Faster, smaller, and the old room remains closed. That is not failure. It is a different bill.

**S5 — Rowan**

**Rowan:** If Edda moves, I can take the small room.
**Player:** That is what you want?
**Rowan:** I want a door that closes. I also want to know if the roof comes down before I sleep under it.
**Player:** Your work changes with each plan.
**Rowan:** So does the amount of wood. That is why I am asking.

**S6 — Bram and Lina together**

**Lina:** We can afford timber or the extra grain this week. Not both from the house stores.
**Bram:** I can take a short job after the repair.
**Lina:** And who carries the child’s water while you do it?
**Player:** I can bring the first load; the rest needs a household decision.
**Bram:** Good. We will not call a promise a material.

### Etap 3 — A household decision

**S7 — wybór naprawy**

**Player [repair]:** Replace the beam. The room returns to the house when the work is complete.
**Bram:** Then I ask Rowan to help lift, and you to fetch only the measured pieces.
**Lina:** I accept if the food store stays above the winter line.
**Edda:** I accept if you stop calling the dangerous room “almost fine.”

**Player [lean_to]:** Build a small dry room and close the old one.
**Lina:** That gives us space, but not the old house back.
**Bram:** It gives us time. Time is a material too.
**Edda:** Put my chair by the window. The old room never had a good one.

**S8 — zgoda na użycie magazynu osady**

**Bram:** Two straight beams are in the settlement store. They are not ours.
**Player:** I will ask the steward.
**Bram:** Ask what happens if another roof fails. A gift that empties the store is a delayed bill.
**Player:** And if they refuse?
**Bram:** We use what we own, or choose the lean-to. No one is shamed for counting.

**S9 — plac budowy**

**Lina:** The rain has not started. That is not permission to rush.
**Player:** Materials are here and the plan is agreed.
**Bram:** Then start the progress bar, as you people say. Stop if the wall moves.
**Rowan:** If I say “stop,” will anyone listen?
**Bram:** If you say it twice.

### Etap 4 — Trzy zakończenia

**E1 — The old house holds.** Warunek: `repair`, wymagane materiały i zakończona naprawa; plac budowy rzeczywiście podnosi durability. Edda zostaje w pokoju.

**Edda:** The bowl is empty.
**Bram:** The roof is not.
**Lina:** We still owe the store two beams.
**Player:** I can help carry them back.
**Bram:** Help is welcome. Calling it free would be rude.

Skutek: trwała naprawa, koszt materiałów i czasu, niewielki wzrost opinii household; brak automatycznej zapłaty bez ustalenia.

**E2 — A smaller dry room.** Warunek: `lean_to`, budowa zaakceptowana i ukończona. Stary pokój jest zamknięty; Edda otrzymuje nowe miejsce, Rowan nie przejmuje go bez rozmowy.

**Lina:** It is small.
**Edda:** So was the old room before the cupboard grew into it.
**Rowan:** I can move the chair.
**Edda:** You can visit first. Ownership is a separate conversation.

Skutek: nowa mała konstrukcja, stary budynek pozostaje częściowo uszkodzony; rodzina zyskuje bezpieczeństwo kosztem miejsca i materiałów.

**E3 — The house waits for a better season.** Warunek: gracz po inspekcji odmawia obu budowom, ale ustawia tymczasowe podparcie i suchy nocleg (N: tymczasowa akcja). Brak udawanej naprawy.

**Bram:** It is not fixed.
**Player:** No. It is supported until we can fix it.
**Lina:** I prefer that sentence.
**Edda:** Then put it on the noticeboard, where people can read it before they sleep.

Skutek: ograniczone zabezpieczenie i jawny powrót do zadania po zgromadzeniu materiałów; durability nie wraca do pełnej wartości.

## Przerwanie i kwestie

Odmowa S1 bez kary. Atak, KO lub brak materiałów przerywa aktywność i zwraca niewykorzystane surowce; częściowa naprawa jest stanem budynku, nie pełnym zakończeniem. Jeśli NPC sami naprawią dach, quest przechodzi do epilogu „household finished”, a gracz nie dostaje zapłaty za nieistniejącą pracę. Śmierć Brama: Lina może potwierdzić rodzinny plan tylko wtedy, gdy go wcześniej usłyszała. Otwarte: N status tymczasowego podparcia, zgoda na materiał wspólny, reguła ownership i konkretne wymagania budowy.
