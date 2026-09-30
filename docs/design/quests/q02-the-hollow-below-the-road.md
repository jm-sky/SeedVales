# Q02 — The Hollow Below the Road

**Status: propozycja N; hunter 2/2.** Kontynuacja Q01 jest opcjonalna; wejście ma też wariant niezależny. Cztery etapy, trzy zakończenia.

## Założenie i warunki

Sella z sąsiedniej osady V znalazła wilcze ślady przy dolnej drodze. Nie chce „wyczyścić lasu”: ta droga prowadzi do studni i jest potrzebna pasterzom. Mara uważa, że bezpieczniejsza trasa może kosztować więcej czasu niż trzy martwe wilki. Konflikt dotyczy oceny ryzyka i odpowiedzialności, nie ukrytego złoczyńcy. Emocja: napięcie zamienia się w ulgę albo w świadomą zgodę na koszt.

Start: `wolves_near_road=true`, Sella żyje, droga i objazd istnieją. Posiadanie Q01 lub `Mara.opinion≥10` odblokowuje dodatkową kwestię, ale nie daje wiedzy o legowisku. I: walka z wilkami, palenie legowiska (P dla zachowań FAUNA), fizyczna podróż, reputacja. N: rozpoznanie legowiska, ocena obejścia, etykieta „strefa ryzyka”.

## Stan i etapy

`accepted`, `tracksRead`, `denFound`, `roadRiskReported`, `choice=clear|reroute|patrol`, `settled`. Sella świadczy tylko o tym, co sama widziała. Odległa mapa nie przenosi się telepatycznie.

### 1. The lower road

**S1 — Sella przy drogowskazie**

**Sella:** You came from H? Then you know this road is not a line on a map. It is where people carry water.
**Player:** What happened?
**Sella:** Two sheep turned back. A cart-driver heard a howl below the bend. I found tracks after rain.
**Player [A]:** I'll look with you.
**Sella:** Look first. Promise second. → `accepted`.
**Player [B]:** Ask the guard to close the road.
**Sella:** A closed road sends people across the marsh. We need a reason, not a gate.

**S2 — Mara, jeśli Q01 ukończony lub opinia ≥10**

**Mara:** Sella doesn't need another hunter to prove courage. She needs someone to count the ways this can go wrong.
**Player:** You know her?
**Mara:** I know the road. That is enough for today.
**Player:** Will you come?
**Mara:** To the first bend. After that, you report what you actually saw.

**S3 — Sella po przyjęciu**

**Sella:** The lower track is fresh. The higher one is old and dry.
**Player:** Which makes it safer?
**Sella:** Neither. It makes one easier to read. A wolf can use a safe road too.
**Player:** Then we mark the danger, not just the animal.
**Sella:** Now you are listening.

### 2. Read the hollow

**S4 — ślady przy zakręcie**

**Sella:** Three sets. One light. Young, perhaps.
**Player:** Perhaps?
**Sella:** I did not see the animal. I will not turn a guess into a fact.
**Player [A]:** We follow the tracks.
**Sella:** We follow until the ground tells us to stop. We do not walk into a den because a quest marker is patient.
**Player [B]:** We return with a larger party.
**Sella:** Sensible. Slower, but sensible.

**S5 — legowisko, tylko po fizycznym znalezieniu**

**Player:** The hollow is under the fallen pine.
**Sella:** Bones outside, warm earth inside. The young one may be there.
**Player:** We could burn it.
**Sella:** And drive a frightened mother across the road. Or we could wait for daylight and draw them away. The ground will not tell us which is kinder.

**S6 — powrót z informacją**

**Sella:** Is the den active?
**Player [denFound]:** I saw the entrance and fresh bones. I did not enter.
**Sella:** Good. That is enough to plan. The guard will need the exact bend, not “somewhere below.”
**Player:** What happens if I kill the wolves near the road?
**Sella:** The road is safer today. The territory is emptier tomorrow. Both are true.

### 3. A road has a price

**S7 — strażniczka Ada przez raport Selli**

**Ada:** Sella says you found the hollow. I have not seen it, so I am asking, not confirming.
**Player:** Three sets of tracks; one may be young. The entrance is under a pine.
**Ada:** That is a report. What do you recommend?
**Player [A]:** Clear the den before the next market day.
**Ada:** Give me a safe approach and a fallback. “Clear it” is not a plan.
**Player [B]:** Move the water route uphill.
**Ada:** That is a construction problem. The road crew will ask for time and timber.
**Player [C]:** Mark the bend and patrol it at dusk.
**Ada:** That is a guard problem. It spends people every evening.

**S8 — Mara**

**Mara:** A wolf is not a debt. You do not owe the road its death.
**Player:** And if it attacks a child?
**Mara:** Then the danger is different. Today we have tracks, a den, and a road used by adults who can choose another hour.
**Player:** You would leave it?
**Mara:** I would choose what I can protect. Do not confuse that with leaving everything alone.

**S9 — Sella przed decyzją**

**Sella:** I will walk any of the three plans. I will not pretend they cost the same.
**Player:** Tell me the cost.
**Sella:** Clear: risk now, quiet later. Reroute: timber and a longer walk. Patrol: people, every dusk, until the pack moves on.
**Player:** Then I choose with the cost named.
**Sella:** That is the first useful thing anyone has said about a wolf today.

### 4. Trzy zakończenia

**E1 — Clear the hollow.** Warunek: `choice=clear`, `denFound`, wymagany sprzęt/ogień i faktyczne usunięcie aktywnego legowiska; wilki mogą zostać przegonione lub zabite, ale bieżąca implementacja I nie obsługuje jeszcze pełnego „przegonienia” — P/ N. `Sella` i `Ada` potwierdzają tylko to, co zobaczą lub otrzymają w raporcie.

**Sella:** The hollow is cold.
**Player:** We did not kill the young one.
**Sella:** Then remember that the adults may return looking for it. We watch the road for three evenings.
**Ada:** I will pay for the work, not for a story about it. The road is open when I can verify the sign.

Skutek: brak aktywnego den w tej lokalizacji; tymczasowy spadek presji wilków, reputacja `courage/helpfulness`; koszt zużytych gałęzi/ognia i ryzyko walki.

**E2 — Move the work, not the animals.** Warunek: `choice=reroute`, zgoda Brama na drewno i wykonana naprawa/krótki objazd (N/P poza obecnym budynkiem drogi).

**Bram:** The uphill line needs six posts, maybe eight.
**Player:** I can bring the first load.
**Bram:** Bring what you can carry. The road is longer; the work should not become a boast.
**Sella:** People will complain about the extra bend.
**Bram:** They complain about mud too. At least this one has a reason.

Skutek: utrwalony objazd, zużyte drewno/czas, mniejsza ekspozycja podróżnych; wilki pozostają w świecie, a teren nie jest „oczyszczony”.

**E3 — A marked risk.** Warunek: `choice=patrol`, `roadRiskReported`, trzy rzeczywiste obchody Selli/Ada (N: harmonogram patrolu) lub jawne odroczenie do kolejnego tygodnia.

**Ada:** Third evening. No wolves on the road.
**Player:** That is not the same as no wolves.
**Ada:** Correct. I am writing “no sighting,” not “safe forever.”
**Sella:** The signs lead west now. The patrol bought us time.
**Player:** And after that?
**Ada:** We inspect again. A boundary is useful only if someone remembers to look at it.

Skutek: brak budowy i brak gwarancji bezpieczeństwa; koszt pracy strażników, trwała flaga ostrzegawcza i możliwość ponownego questu po realnym powrocie wilków.

## Odmowa, przerwanie, pominięcia

Odmowa S1 nie obniża reputacji. Wycofanie po śladach zapisuje `tracksRead`; Sella nie twierdzi, że gracz znalazł den. Jeśli NPC rozwiążą problem, quest kończy się jako „resolved by settlement” i gracz dostaje wyłącznie uznanie za zweryfikowany wkład. Nie pojawia się automatyczny skarb ani nowe wilki. Śmierć Selli zamyka jej rekomendację; Ada może przyjąć raport, ale nie pamięta nieprzekazanych szczegółów. Pominięcie oględzin blokuje E1; nie można podpalić nieznanego miejsca bez celu.

## Mechaniki / otwarte kwestie

I: wilki, walka, legowiska jako dane, reputacja, droga i budynki. P: FAUNA-07/08, patrol, przegonienie, ostrzegawcza flaga. N: trwała strefa ryzyka, objazd drogi roboczej, harmonogram patroli, koszt drewna. D: pełne outposty nie są wymagane. Do decyzji: czy spalenie legowiska ma usuwać spawn, czy tylko czasowo przenosić aktywność; czy reputacja za obejście ma być liczona jak za walkę.
