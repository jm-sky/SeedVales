# Q03 — A Roof Before Rain

**Status: propozycja N; pakiet A (Codex 1), budowa/naprawa.** Obsada: [QUEST-WORLD](QUEST-WORLD.md). Cztery etapy, trzy zakończenia. Skala: mały, prywatny quest w H.

## Założenie

Drwal Mirosław od miesięcy łata dach domu, w którym mieszka z żoną Ludmiłą, matką Jadwigą i dorosłym synem Mieszkiem. Ostatnia burza pokazała, że to nie jedna dziura: nad izbą Jadwigi spróchniała belka. Mirosław chce naprawić wszystko sam, „po sezonie”, bo teraz jest czas ścinki i każdy dzień przy dachu to dzień bez drewna na sprzedaż. Ludmiła chce, żeby matka spała w suchym miejscu już teraz. Gracz pomaga ocenić szkodę i doprowadzić rodzinę do decyzji: wymiana belki, mała dobudówka albo podparcie na przeczekanie.

**Wiedza NPC.** Jadwiga zauważyła, że drzwi szafy się zacinają — nikt jej o to nie pytał. Mirosław wie, że belka jest zła, ale nie wie, jak bardzo. Radosław (sołtys) zarządza wspólnym magazynem drewna i wie, co w nim jest.

**Warunki startu.** Dom household drwala ma `durability < 60` (I: stan budynków). I: naprawa, budowa, udźwig, czas pracy, pomoc NPC. N: oględziny konstrukcji, zgoda household, wydanie materiału ze wspólnego magazynu.

## Stan

`accepted`, `beamInspected`, `cupboardHeard`, `plan = unset|repair|lean_to|prop`, `storeAsked`, `storeGranted`, `workComplete`, `settled`. Zapowiedź deszczu nie uruchamia ukrytego licznika; deszcz w świecie przyspiesza jedynie zwykłe zużycie budynku (I).

## Etap 1 — The room that drips

**S1 — Mirosław na drabinie**

**Mirosław:** If you've come to tell me the roof leaks, you've got good eyes and bad timing.
**Player:** Ludmiła asked if I could lend a hand.
**Mirosław:** Ludmiła asked for a second pair of eyes, I'd bet. Hands come after we've measured.
**Player [A]:** Show me the damage.
**Mirosław:** Roof first. Then the beam over Mother's room. If I start telling you it's one job, stop me. → `accepted`
**Player [B]:** I could bring timber right away.
**Mirosław:** Bring a measuring cord instead. I've cut enough wood to the wrong length this year.

**S2 — Ludmiła przy palenisku**

**Ludmiła:** Her bed's dry when the wind's from the east. That's not what I call dry.
**Player:** Mirosław says the beam needs a look.
**Ludmiła:** Mirosław says a lot of things after he's lifted a beam. I want the thing he says before.
**Player:** What do you need first?
**Ludmiła:** One dry room for his mother. And a plan that doesn't eat next month's flour.

**S3 — Jadwiga w swojej izbie**

**Jadwiga:** The drip lands in the same bowl every time. I've become very good at moving a bowl.
**Player:** Has anything else changed in here?
**Jadwiga:** The cupboard door sticks. It didn't last spring. I thought it was the damp. → `cupboardHeard`
**Player:** I'll tell Mirosław.
**Jadwiga:** Tell him before he climbs up there. He doesn't listen to me once he's on a ladder.

## Etap 2 — Measure twice

**S4 — Oględziny belki** (czynność: wejście na strych z lampą/pochodnią → `beamInspected`)

**Mirosław:** Outer boards are bad. The beam's worse — look, the knife goes in like it's cheese.
**Player [cupboardHeard]:** Your mother's cupboard door sticks since spring. The wall's moving.
**Mirosław:** *(milczy chwilę)* …Then it's sagging, not just rotting. Right. That's not a patch job.
**Player [A]:** Then we replace the beam.
**Mirosław:** Two straight pieces, four paces long, and three people to lift. That's a proper repair. Three days, maybe four.
**Player [B]:** Or build a small dry room on the side for her.
**Mirosław:** Quicker. Smaller. And we shut the old room till next year. It's not a failure — it's a different cost.

Bez `cupboardHeard` Mirosław uważa, że wystarczy podpora na sezon, i opcja `prop` jest jego pierwszą propozycją; gracz może i tak zaproponować wymianę.

**S5 — Mieszko**

**Mieszko:** If Grandmother moves to a lean-to, I could have the small room.
**Player:** Is that what you want?
**Mieszko:** I want a door that shuts. I'd also like to know the roof won't come down while I'm asleep under it.
**Player:** You'd be lifting the beam if we replace it.
**Mieszko:** I know. I'm asking which week I lose, that's all.

**S6 — Mirosław i Ludmiła razem**

**Ludmiła:** We can buy timber or we can buy extra grain for winter. Not both, not this month.
**Mirosław:** I'll take a felling job after the repair. That pays it back.
**Ludmiła:** And who fetches the water and splits the kindling while you're up there?
**Player:** I can bring the first load. The rest is for the two of you to decide.
**Mirosław:** Fair. Nobody counts a promise as timber.

## Etap 3 — A household decision

**S7 — Wybór** (ustawia `plan`; każda odpowiedź potwierdzana przez obie strony)

**Player [repair]:** Replace the beam. The room goes back to your mother when it's done.
**Mirosław:** Then Mieszko lifts with me, and you fetch only the pieces I've marked.
**Ludmiła:** If the flour stays above the winter line, yes.
**Jadwiga:** And if you all stop calling that room "almost fine".

**Player [lean_to]:** Build a small dry room on the south side and close the old one.
**Ludmiła:** That gives us room, not the old house.
**Mirosław:** It gives us till spring.
**Jadwiga:** Put my chair by the window. The old room never had a decent one.

**Player [prop]:** Prop the beam now, move her bed to the main room, fix it properly after the felling season.
**Mirosław:** That I can do in a day.
**Ludmiła:** And sleep next to your mother's snoring till spring.
**Jadwiga:** I heard that.

**S8 — Wspólny magazyn** (tylko `repair`, jeśli household nie ma dwóch belek)

**Radosław:** Two straight beams? There are three in the common store. They're there for the next roof that falls in — which, by the sound of it, is yours.
**Player:** Can Mirosław have two?
**Radosław:** He can borrow two. He brings back two before the first snow, felled and squared. Same length.
**Player [A]:** Agreed — I'll help him fell them. → `storeGranted`
**Player [B]:** Couldn't the settlement just give them?
**Radosław:** And if the herbalist's roof goes in a month? I'll lend, not give. That's the best I've got. → `storeGranted`
**Player [C, jeśli G05 zakończony `peace` lub `home`]:** There's oak from the boundary settlement coming in.
**Radosław:** Then that's his payback sorted, isn't it. Take them. → `storeGranted`, zwrot zaliczony

Bez zgody gracz może kupić drewno od innego drwala (I: handel) albo zmienić plan.

**S9 — Przed rozpoczęciem pracy**

**Ludmiła:** It hasn't started raining. That's not a reason to rush.
**Player:** The wood's here and we've all agreed.
**Mirosław:** Then let's start. If the wall so much as creaks, everyone stops.
**Mieszko:** And if I say stop?
**Mirosław:** Say it twice and loud. I'm half deaf on a roof.

Praca: aktywność budowy (I: plac budowy, pomoc NPC). Udział gracza skraca czas; przerwanie zostawia częściowy postęp w świecie.

## Etap 4 — Zakończenia

### E1 — The old house holds
Warunek: `plan=repair`, belki na miejscu, praca ukończona (durability domu wraca do ≥ 90). Jadwiga wraca do izby. Zapłata: Ludmiła daje graczowi **bochen chleba ×2 i ser** albo **10 c** z sakiewki household (wybór gracza); dług wobec magazynu pozostaje długiem Mirosława.

**Jadwiga:** The bowl's empty.
**Mirosław:** The roof isn't. Mostly.
**Ludmiła:** We still owe the store two beams.
**Player:** I'll help bring them back.
**Mirosław:** You'll be welcome. Don't let me call it a favour — I'll owe you a load of firewood.

Skutek: trwała naprawa; opinia całego household +15 (N); Mirosław oferuje graczowi później darmowy ładunek drewna opałowego (jednorazowy transfer z jego stosu).

### E2 — A smaller dry room
Warunek: `plan=lean_to`, dobudówka ukończona (I/N: mała konstrukcja przy domu). Stary pokój zamknięty. Zapłata jak w E1.

**Ludmiła:** It's small.
**Jadwiga:** So was the old room, once the cupboard moved in.
**Mieszko:** I can carry your chair.
**Jadwiga:** You can visit first. We'll talk about who sleeps where some other day.

Skutek: nowa mała konstrukcja, stary budynek pozostaje uszkodzony; Mieszko wciąż śpi we wspólnej izbie (może wrócić w Q06 jako powód, by chciał ruszyć w drogę — miękkie powiązanie).

### E3 — Propped till spring
Warunek: `plan=prop`, podpora postawiona (N: tymczasowa akcja „podeprzyj”), łóżko Jadwigi przeniesione. Brak udawanej naprawy: durability nie wraca, dom zużywa się wolniej do wiosny.

**Mirosław:** It isn't fixed.
**Player:** No. It's held up until you can fix it.
**Ludmiła:** I like that better than "almost fine".
**Jadwiga:** Write it on the board in the square, then. So people know where not to stand.

Skutek: quest można później otworzyć ponownie jako `repair` (ta sama rodzina, nowe sceny nie są wymagane — S7/S8/S9 wystarczą).

## Odmowa, przerwanie, pominięcia

- Odmowa S1: bez kary; household naprawia dach sam w swoim tempie.
- KO/atak/brak materiałów: praca stoi, niezużyte materiały zostają na placu, częściowa naprawa jest stanem budynku.
- Jeśli rodzina naprawi dach sama, quest kończy się epilogiem „the family finished it”; gracz nie dostaje zapłaty za cudzą pracę, ale dostaje podziękowanie, jeśli coś przyniósł.
- Śmierć Mirosława: Ludmiła może prowadzić plan, jeśli brała udział w S6/S7; inaczej quest wygasa.

## Mechaniki

I: budynki i durability, plac budowy, pomoc NPC, udźwig, handel drewnem. N: oględziny konstrukcji, wspólny magazyn z pożyczką w naturze, tymczasowa podpora, dobudówka. **Do decyzji:** czy podpora ma być osobnym obiektem budowy; reguła pożyczek z magazynu osady.
