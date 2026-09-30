# Q07 — Six Bowls, One Pan

**Status: propozycja N/P; food/social.** Lekki quest społeczny; nie ma obowiązkowego zagrożenia.

## Założenie

Lina chce urządzić pierwszy wspólny posiłek dla sześciu osób po długim tygodniu pracy. Ma sześć misek, jedną patelnię i mięso o różnej świeżości. Ada ma patrol, Bram naprawę, Edda potrzebuje spokojnego miejsca, a Rowan chce zaprosić kogoś z V. Gracz organizuje kolejność, nie „wygrywa” kolacji. Wybory zmieniają, kto je razem i co zostaje na później.

I: świeżość, ognisko i jedzenie. P: pojemność patelni/rusztu (`FOOD-03`), relacja/prezenty. N: plan posiłku i dialog o obowiązkach.

## Etapy/sceny

Stan: `accepted`, `ingredientsChecked`, `guests=all|shifts|porch`, `cooked`, `settled`.

**S1 — Lina:** “I have six bowls and one pan. That is enough if nobody asks the pan to be a miracle.”
**Player:** Who is coming?
**Lina:** Bram, Edda, Rowan, Ada if her route allows, and you. Six if the sixth place is not an argument.
**Rowan:** I invited a friend.
**Lina:** You invited a question.

**S2 — sprawdzenie świeżości**

**Player:** This meat will spoil before the second serving.
**Lina:** Then it goes first. We do not hide freshness under a nice plate.
**Edda:** Salt is not a time machine.
**Player:** We can cook two now and two later only if the pan supports it.
**Lina:** Good. Count capacity, then count people.

**S3 — Ada przy ognisku**

**Ada:** I can eat for seven minutes.
**Player:** That is not a dinner.
**Ada:** It is a patrol with sauce.
**Player [all]:** Come for the first serving; Bram covers the gate.
**Ada:** If Bram agrees, not if you volunteer him.
**Player [shifts]:** Eat on the first shift, then go. We save a bowl for you.
**Ada:** That is an actual plan.

**S4 — Bram:** “I can cover the gate, but not the repair and the fire at once.”
**Lina:** Then we stop pretending all work happens simultaneously.
**Player:** I can tend the pan.
**Lina:** You may. The food remains yours to burn if you rush.

**S5 — Rowan:** “Should my friend come?”
**Player:** Only if there is a bowl and Lina agrees.
**Rowan:** I will ask, not assume.
**Lina:** Then there is room for the question.

**S6 — cooking**

**Player:** The pan is ready. First batch is two pieces.
**Lina:** Keep the cooked pieces separate from the raw ones.
**Edda:** I am impressed by a sentence no one should need to say.

**S7 — wybór**

**Player [all]:** We serve the six together if the patrol handoff is covered.
**Ada:** I will sit at the end, where I can see the path.
**Player [shifts]:** We serve two rounds and keep the food covered.
**Bram:** I can eat standing. I would rather not.
**Player [porch]:** We serve at the threshold so Ada can come and go.
**Edda:** Less private, more honest. I can live with that.

**S8 — real meal**

**Lina:** No speeches.
**Rowan:** I had one prepared.
**Lina:** Eat it instead.
**Ada:** The sauce is better than the gate.
**Bram:** The gate is not edible.

**S9 — E3 only, after a porch meal**

**Edda:** We shared a meal without pretending the house was larger.
**Player:** Is that enough?
**Edda:** Enough is a kind of success when it is chosen.

### Zakończenia

**E1 — One table:** `guests=all`, sześć realnych porcji ugotowanych zgodnie z capacity/freshness, Ada ma zastępstwo. Skutek: silniejsza social need/opinion, wykorzystane zapasy, wspomnienie wspólnej kolacji.

**E2 — Two shifts:** `guests=shifts`, dwie partie i zachowana bezpieczna porcja dla Ady. Skutek: mniej wspólnego czasu, ale nikt nie porzuca obowiązków; zużycie paliwa i jedzenia jest jawne.

**E3 — At the threshold:** `guests=porch`, posiłek zakończony przy wejściu. Skutek: Ada może patrolować, Edda nie traci spokojnego pokoju; relacje rosną mniej, za to osada widzi otwartość.

Odmowa: Lina odwołuje posiłek, składniki wracają właścicielom. Przerwanie gotowania nie psuje surowca poza normalnym czasem. Brak patelni/ruszta ogranicza liczbę porcji, nie tworzy dodatkowej funkcji. N: sloty gotowania, NPC coverage, preferencje potraw.
