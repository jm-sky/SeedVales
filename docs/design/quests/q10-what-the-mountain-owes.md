# Q10 — What the Mountain Owes

**Status: propozycja N/D; gold mine.** Największy quest pakietu. Wymaga `QUEST-03`, `WORLD-05` lub innej dostępnej jaskini, `SET-04` outpostów, górnika (`NPC-06`), trwałego złoża i planu transportu. To scenariusz docelowy, nie obietnica v1.

## Założenie

Ysra, doświadczona górniczka w miasteczku T, znajduje starą sztolnię ze śladem złota. Corvin chce natychmiast sprzedać prawa inwestorowi z miasta. Bram reprezentuje domową osadę, która może wysłać pionierów, lecz nie może obiecać bezpieczeństwa ani pieniędzy bez końca. Gracz bada wejście, przygotowuje outpost i wybiera między jednorazową wypłatą, udziałem w zysku a małą sezonową eksploatacją należącą do osady.

Nie ma tajnego złoczyńcy: Corvin jawnie chce zysku, Ysra jawnie chce bezpiecznej pracy, Bram jawnie chroni wspólny skarbiec. Konflikt jest o ryzyko, własność i tempo. Emocja: zachwyt odkryciem przechodzący w ciężar podpisu.

## Stan i warunki

Wymagane: `accepted`, `sampleTaken`, `routeMeasured`, `safetyPlan`, `outpostBuilt`, `choice=buyout|share|seasonal`, `firstShipment`, `settled`. Próbka nie tworzy automatycznie złota w ekonomii; potwierdza tylko złoże. Każda moneta ma płatnika.

### 1. The vein

**S1 — Ysra:** “Gold is not a promise. It is a yellow line in rock, and the rock has the larger voice.”
**Player:** How much is there?
**Ysra:** Enough to justify measuring. Not enough to justify a parade.
**Player [A]:** I will inspect the route and the entrance.
**Ysra:** Bring a sample, not a rumour.
**Player [B]:** Sell the claim now.
**Ysra:** You may. You would sell a question at the price of an answer.

**S2 — Corvin:** “I can pay for a claim today.”
**Player:** Before an assay?
**Corvin:** For the risk of being early. The contract names that risk.
**Player:** And if the mine fails?
**Corvin:** Then the price was for the claim, not the gold.

**S3 — Bram:** “The home settlement has a treasury, not a miracle.”
**Player:** Would it send people?
**Bram:** If the route, water, shelter, and return are named. I will not send a family into a story.

### 2. Measure the cost

**S4 — route:**
**Ysra:** The old tunnel is above the stream. A cart route would need a cut through the slope.
**Player:** We have no mine carts.
**Ysra:** Then write “hand transport” in the first plan. Do not borrow later technology in today’s sentence.

**S5 — sample:**
**Player:** The vein is real, but narrow here.
**Ysra:** Good. “Real” is not “rich.”
**Player:** What would make it unsafe?
**Ysra:** Bad air, loose roof, and a crew too tired to notice either.

**S6 — safety council:**
**Bram:** Outpost needs shelter, water, tools, and a person who can say stop.
**Corvin:** Every “stop” has a cost.
**Ysra:** Every ignored “stop” has a larger one.
**Player:** Then safety is part of the contract, not a kindness.

### 3. The outpost

**S7 — choose the plan:**
**Player [buyout]:** Take Corvin’s one-time payment and transfer the claim.
**Corvin:** Payment on signed transfer and verified sample.
**Bram:** The settlement gets money now and no future control.

**Player [share]:** Build the outpost and take a defined share of verified shipments.
**Corvin:** I will fund the first tools if the share and accounting are public.
**Bram:** The treasury accepts a risk, not a blank cheque.

**Player [seasonal]:** Keep a small seasonal mine operated by the settlement.
**Ysra:** Smaller output, fewer people away from home.
**Bram:** And the outpost closes when the season closes, or it becomes a second settlement by accident.

**S8 — construction:**
**Player:** Shelter is complete. Water is marked. Tools are counted.
**Ysra:** Who keeps the count?
**Player:** The named storekeeper, with a copy in H.
**Corvin:** That is slower.
**Player:** It is also how two places know the same number.

**S9 — first shipment:**
**Ysra:** The first sack is small.
**Player:** Small enough to prove the route.
**Bram:** We do not celebrate the total before it reaches the scale.
**Corvin:** At least let us celebrate the existence of the road.

### 4. Trzy zakończenia

**E1 — Sold once, settled once.** Warunek: `buyout`, transfer podpisany, Corvin rzeczywiście płaci z istniejącego kapitału, próbka i własność zapisane. Skutek: jednorazowy wpływ do wskazanego odbiorcy, brak udziału gracza/osady w przyszłej produkcji, Corvin ponosi dalsze ryzyko.

**Corvin:** The claim is mine now.
**Ysra:** The mountain did not sign your paper.
**Player:** Nor did it promise the next sack.
**Corvin:** I know. That is why I paid before it arrived.

**E2 — A share with witnesses.** Warunek: `share`, outpost działa, first shipment weighed, public accounting. Skutek: cykliczna wypłata z realnych przyszłych wpływów; outpost wymaga utrzymania, a brak transportu zatrzymuje dostawę, nie tworzy dochodu.

**Bram:** The first share is smaller than Corvin’s offer.
**Player:** And the next one exists only if the mine does.
**Ysra:** Keep the safety clause. It is worth more after the first collapse you avoid.
**Corvin:** I dislike the clause. I will sign it.

**E3 — A mine for one season.** Warunek: `seasonal`, osada posiada ludzi/narzędzia, sezonowe zamknięcie i rozliczenie wykonane. Skutek: mniejszy, ale lokalny dochód; osada nie traci całej ekipy; złoże może być ponownie ocenione w przyszłości.

**Bram:** The outpost closes before the snow.
**Ysra:** I will leave the supports marked for the next survey.
**Player:** What did the mountain owe us?
**Ysra:** A chance. We owed it caution.

## Odmowa, przerwanie, pominięcia

Odmowa S1 zamyka ten trop bez utraty świata. Brak próbki blokuje wszystkie kontrakty. Zawalenie/KO przerywa aktywność i może wymagać leczenia; nie rozstrzyga automatycznie moralnie. Jeśli osada sama zorganizuje wyprawę, gracz nie otrzymuje udziału bez podpisanej umowy, ale może zobaczyć realny wynik przez transport. Śmierć Ysry usuwa jej fachową wiedzę, chyba że została wcześniej zapisana w raporcie; Corvin nie zna technicznych parametrów, których nie usłyszał. Nie ma „złej” gałęzi opartej na zdradzie.

## Mechaniki / otwarte kwestie

D: jaskinie, outposty, górnik, ekonomia złota, transport. I: skarbiec/handel, budowanie, materiały, czas, reputacja. N: assay/próbka, własność koncesji, rachunkowość shipmentów, sezonowe zamknięcie, ryzyko i utrzymanie. Autor musi rozstrzygnąć, czy kopalnia jest jednym globalnym questem, czy szablonem generowanym per złoże; jaka część złota trafia do ekonomii oraz czy UI pokazuje udział jako przyszłe zobowiązanie, a nie gwarantowaną nagrodę.
