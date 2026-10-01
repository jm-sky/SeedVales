# Q07 — Six Bowls, One Pan

**Status: propozycja N/P; pakiet A (Codex 1), jedzenie/społeczny.** Obsada: [QUEST-WORLD](QUEST-WORLD.md). Lekki quest bez zagrożenia; trzy zakończenia. Skala: mały quest w H.

## Założenie

Po tygodniu ścinki Ludmiła chce wreszcie zjeść jeden porządny posiłek z całym domem i z sąsiadami, którym są coś winni. Ma sześć misek, jedną patelnię, mięso w różnym stanie świeżości i za mało rąk. Strażnik Wojciech ma obchód, Mirosław musi pilnować ognia pod smołą do dachu, Jadwiga nie lubi tłoku, a Mieszko zaprosił kogoś, nie pytając. Gracz pomaga ułożyć kolejność — nie „wygrywa” kolacji. Wybory zmieniają, kto je razem i co zostaje na później.

**Wiedza NPC.** Ludmiła zna swoje zapasy. Wojciech zna swój grafik. Nikt nie wie, kogo zaprosił Mieszko (Leszka — syna Miry; jeśli Leszek nie istnieje w seedzie, dowolnego rówieśnika z H).

**Warunki startu.** Household drwala istnieje; gracz ma z nim opinię ≥ 10 (np. po Q03) albo przyniósł mu kiedyś jedzenie. I: świeżość, ognisko, jedzenie. P: pojemność patelni/rusztu (`FOOD-03`), prezenty/relacje. N: plan posiłku, zastępstwo na warcie.

## Stan

`accepted`, `freshnessChecked`, `guests = unset|together|shifts|doorstep`, `wojciechCovered`, `cooked`, `settled`. Porcje: 6 (lub 7 z gościem Mieszka). Pojemność: patelnia = 2 kawałki na raz (APPENDIX), ognisko bez naczynia = 1, ruszt (P) = 4+.

## Sceny

**S1 — Ludmiła przy skrzyni z zapasami**

**Ludmiła:** Six bowls and one pan. That's enough if nobody expects the pan to do miracles.
**Player:** Who's coming?
**Ludmiła:** Mirosław, his mother, Mieszko, you, me — and Wojciech, if his rounds let him. He split our kindling all last week when Mirosław was laid up. I owe him a hot meal.
**Mieszko:** I asked Leszek, too.
**Ludmiła:** *(odwraca się powoli)* You asked.
**Mieszko:** He's bringing a hare.
**Ludmiła:** …Then he's welcome. And you're washing seven bowls. → `accepted`

**S2 — Zapasy** (czynność: obejrzenie mięsa → `freshnessChecked`)

**Player:** This piece won't last till tomorrow. That one's fine for days.
**Ludmiła:** Then the old one goes in first, and nobody hides it under the onions.
**Jadwiga:** In my mother's house we'd have salted it and pretended.
**Ludmiła:** Your mother's house had stronger stomachs.
**Player:** One pan, two pieces at a time.
**Ludmiła:** Then we count pieces, then people, then how long the fire lasts. In that order.

**S3 — Wojciech przy bramie**

**Wojciech:** A meal? Ludmiła's? *(wzdycha)* I've the dusk round and the night round, and nobody to take either.
**Player:** How long could you sit down?
**Wojciech:** Long enough to burn my tongue.
**Player [A]:** I'll walk the dusk round for you. You eat with everyone.
**Wojciech:** You'd do the gate and the posts? All six of them, and light the two by the pens? *(gracz potwierdza)* …Then I'll come. Bring the torch back lit. → po wykonaniu obchodu (N: krótki obchód z zapaleniem pochodni, I: pochodnie) `wojciechCovered`
**Player [B]:** Eat first, go after. We'll keep a bowl hot for later.
**Wojciech:** That I can manage.
**Player [C]:** We'll eat by the door, so you can come and go.
**Wojciech:** On the step? I've eaten in worse places. The gatehouse, for one.

**S4 — Mirosław przy kotle ze smołą**

**Mirosław:** I can't leave the pitch. If it boils over, the roof's done for another month.
**Ludmiła:** Then you'll eat standing up, like a horse.
**Player:** I can watch the pan while you two sort the pitch.
**Ludmiła:** You can. If you burn it, it's your bowl that gets the burnt bit.

**S5 — Jadwiga w kącie**

**Jadwiga:** Seven people round one fire. I'll be the one with smoke in her eyes.
**Player:** Where would you like to sit?
**Jadwiga:** Somewhere I can hear the talk without having to join it. I'm old, not unfriendly.

**S6 — Gotowanie** (czynność: pieczenie partiami — I: gotowanie przy ognisku; P: patelnia na 2)

**Ludmiła:** Cooked on the board, raw in the bowl — don't let them touch.
**Jadwiga:** I'm amazed anyone needs telling that.
**Ludmiła:** You'd be amazed what Mirosław needs telling.
**Leszek (jeśli przyszedł):** I skinned the hare myself. Jarosław only fixed one edge.
**Ludmiła:** Then you'll eat a piece of it yourself first, in case.

**S7 — Wybór** (ustawia `guests`; wymaga `freshnessChecked`)

**Player [together]:** *(wymaga `wojciechCovered`)* Everyone at one table. I've walked Wojciech's round.
**Wojciech:** I'll take the end seat. I can see the path from there. Habit.
**Player [shifts]:** Two sittings. The first lot eats, the second takes over the fire and the gate.
**Mirosław:** I could eat sitting down for once. I'd like that.
**Player [doorstep]:** We eat on the doorstep, so Wojciech and Mirosław can come and go.
**Jadwiga:** Less cosy. More honest. I'll have the bench by the wall.

**S8 — Posiłek**

**Ludmiła:** No speeches.
**Mieszko:** I'd got one ready.
**Ludmiła:** Eat it instead.
**Wojciech:** The sauce is better than the gatehouse.
**Mirosław:** The gatehouse isn't edible.
**Wojciech:** You've never been that hungry.

## Zakończenia

**E1 — One table.** Warunek: `guests=together`, `wojciechCovered`, wszystkie porcje upieczone w terminie świeżości. Skutek: potrzeba społeczna NPC zaspokojona (I: potrzeby), opinia Ludmiły, Mirosława i Wojciecha o graczu +10 (N), Wojciech od tej pory pozwala graczowi brać pochodnie ze stojaka przy bramie (N). Zużyte zapasy household. Brak gotówki — gracz je razem z nimi.

**Jadwiga (epilog):** Seven at one table. The last time was Mirosław's wedding, and half of them were drunk.

**E2 — Two sittings.** Warunek: `guests=shifts`, dwie partie, bezpieczna porcja odłożona dla drugiej zmiany. Skutek: wszyscy najedzeni, mniej wspólnego czasu (opinia +5), zużycie opału i jedzenia widoczne w zapasach.

**Mirosław (epilog):** I ate it sitting down. Warm. Don't tell anyone, they'll expect it.

**E3 — On the doorstep.** Warunek: `guests=doorstep`, posiłek zakończony przy wejściu. Skutek: Wojciech nie traci obchodu; sąsiedzi przechodzący obok dostają po kawałku (N: opinia osady o household rośnie trochę), relacje z domownikami rosną mniej.

**Jadwiga (epilog):** We fed half the street and nobody had to pretend the house was bigger than it is. That'll do.

## Odmowa, przerwanie, pominięcia

- Odmowa: Ludmiła gotuje dla domu sama; brak skutków.
- Przerwanie gotowania: surowiec psuje się tylko w normalnym tempie (I).
- Zepsute mięso podane gościom: ryzyko choroby jak w normalnym systemie (I: `illnessChance`), Ludmiła wie, kto pilnował patelni (opinia −).
- Wojciech wezwany do realnego zagrożenia: zakończenie E1 niedostępne tego dnia; posiłek przechodzi w E2 lub E3.

## Mechaniki

I: świeżość, ognisko, jedzenie, potrzeby, pochodnie. P: pojemność patelni/rusztu (`FOOD-03`), relacje i prezenty. N: zastępstwo na obchodzie, plan posiłku, uprawnienia do pochodni. **Do decyzji:** czy posiłek wspólny ma osobny efekt potrzeby „społecznej”.
