# Q01 — A Hare Out of Place

**Status: propozycja N; pakiet A (Codex 1), myślistwo 1/2.** Obsada i miejsca: [QUEST-WORLD](QUEST-WORLD.md). Cztery etapy, trzy zakończenia. Skala: mały quest startowy w H.

## Założenie

Leszek, dorosły syn pasterki Miry i uczeń myśliwego Jarosława, zobaczył za leszczynami białego zająca. Od tej chwili liczy pieniądze za futro, którego jeszcze nie ma — chce wreszcie kupić porządną torbę myśliwską u Stanisława, zamiast łatać starą. Jarosław chce, żeby chłopak nauczył się najpierw patrzeć, a dopiero potem strzelać. Stanisław rzeczywiście kupiłby białe futro, ale niczego nie zamówił. Gracz idzie z Leszkiem w teren i razem ustalają, czym ta okazja ma się stać: rzadkim futrem, zwykłą zdobyczą na stół albo obserwacją zwierzęcia, którego nikt w okolicy wcześniej nie widział.

Emocja: przyjemność pierwszej wspólnej wyprawy, mała duma bez uroczystego pasowania.

**Wiedza NPC.** Jarosław wie o zającu tylko od Leszka. Stanisław wie, że Leszek o nim opowiadał. Nikt nie wie, gdzie zając żeruje, dopóki gracz i Leszek tego nie zobaczą.

**Warunki startu.** H ma household myśliwego i pasterki z dorosłym synem; na skraju lasu istnieje jeden biały zając o trwałym ID (N; wygląd: `FAUNA-09` P), nieodradzany. Jarosław nie wysyła ucznia w teren z aktywnym zagrożeniem (wilk/dzik w pobliżu → start przesuwa się). Brak progu poziomu.

## Stan

`accepted`, `feedingSeen`, `coverSeen`, `leszekWitnessed`, `whiteDead`, `choice = unset|pelt|ordinary|watch`, `settled`. Obserwacje są czynnościami w terenie (patrzenie z ukrycia przez określony czas), nie dialogiem. `watchComplete = feedingSeen && coverSeen && leszekWitnessed`.

| Etap | Przejście |
|---|---|
| 1 Okazja | A1 przyjęcie → 2. A2 (Stanisław) i A3 (Leszek) opcjonalne |
| 2 Teren | B1 na miejscu; obserwacje lub zdobycz → możliwy powrót. B3 pozwala przerwać i wrócić kolejnego dnia |
| 3 Decyzja | C1 raport u Jarosława (wymagany), C2 uzgodnienie z Leszkiem ustawia `choice` |
| 4 Zakończenie | E1/E2/E3, rozłączne; `settled` |

`choice` można zmienić przed rozliczeniem, rozmawiając ponownie z Leszkiem. Zabicie białego zająca zamyka `watch` (chyba że `watchComplete` było już prawdą — wtedy obserwacja zachowuje wartość, a epilog nie twierdzi, że zając żyje). Jedno zwierzę daje jeden łup.

## Etap 1 — A white hare, apparently

### A1 — Jarosław przy suszarni
Warunek: quest nieprzyjęty. Obok leży torba Leszka z rozprutym paskiem.

**Jarosław:** Leszek saw a white hare beyond the hazels. Since then he's sold the hide, bought a new bag, and spent the change.
**Player:** Has he caught it?
**Jarosław:** He's told three people about it. That's a different skill.
**Leszek:** Two people. Stanisław was already listening when I told the first.
**Jarosław:** Go with him, if you've the day. Bring back what you saw. If you bring back the hare, I want to hear why that one.
**Player [A]:** I'll go. Where do we start?
**Jarosław:** Where he saw it. Then you sit still longer than he wants to. → `accepted`
**Player [B]:** Not today.
**Jarosław:** Then he mends the strap and waits. Waiting won't kill him. → odmowa bez skutków; oferta wraca przy kolejnej wizycie

### A2 — Stanisław przy straganie (opcjonalnie)

**Stanisław:** The white hare? Yes, I said I'd buy a hide like that. I say a lot of things across a counter.
**Player:** Leszek took it as an order.
**Stanisław:** I gathered. He's already asked me the price of the good bag twice.
**Player:** Would you buy it?
**Stanisław:** A clean white hide, no arrow through the middle — yes, and well. Folk in {T} line their collars with that. A plain hare I'll take any week for the pot.
**Player [A]:** And if we come back with neither?
**Stanisław:** Then nobody owes me anything, and I sell Leszek a strap instead.

### A3 — Leszek przy furtce (opcjonalnie)

**Leszek:** I've mended the strap. It looks worse, but it holds.
**Player:** Bring water.
**Leszek:** Already have. I was going to say that before you did.
**Player [A]:** Tell me exactly what you saw.
**Leszek:** By the split hazel. It went under the branches, not over. I cut a mark in the trunk. That's — that's all, really. I saw it once.
**Player [B]:** You don't have to prove anything to me.
**Leszek:** I know. I'd still like to come home with something I did myself.

## Etap 2 — Read the ground

### B1 — Rozwidlona leszczyna
Warunek: gracz i Leszek na miejscu. Rozmowa niczego nie zalicza.

**Leszek:** There. White hairs on the bark.
**Player [A]:** The run is low. We watch from the far side, downwind.
**Leszek:** Right. I'll stay back. My boots are louder than yours, Jarosław says so every morning.
**Player [B]:** Hair tells us it came by. Not when.
**Leszek:** No. I nearly said "this morning" because that's when I found it.
**Player:** Let's find where it feeds instead.
**Leszek:** The clover by the old fence, maybe. I'll keep my mouth shut, I promise.

### B2 — Po obejrzeniu żerowania
Warunek: `feedingSeen`. Jeśli Leszka przy tym nie było, mówi tylko: "Show me where. I want to see it myself."

**Leszek:** Did you see that? Under the pale branches you can hardly make it out. Then it steps into the clover and — there it is.
**Player:** Easy to see isn't easy to catch.
**Leszek:** I was counting coins again. Sorry.
**Player [A]:** We could take an ordinary hare and leave this one be.
**Leszek:** For the pot? That's honest work. Less glory, mind.
**Player [B]:** We could keep watching. Where it feeds, where it hides, when.
**Leszek:** Nobody here's ever seen a white one. Jarosław would want to know where it goes, I think. Even if he'd never say so.
**Player [C]:** The hide's worth a lot. We could do that properly.
**Leszek:** Properly, yes. One clean shot or none. I'm not chasing it through the wood with an arrow in its leg.

Ucieczka do osłony (`coverSeen`) jest osobną obserwacją: zając wraca do gęstwiny niskim przejściem, gdy coś go spłoszy (gracz może poczekać na naturalne spłoszenie, np. lisa, albo celowo się pokazać — wtedy obserwacja się liczy, ale zając tego dnia już nie wraca).

### B3 — Przed zmrokiem (opcjonalnie)

**Leszek:** Clouds are coming over. We could stay another hour.
**Player [A]:** We've seen enough for today. Home.
**Leszek:** If we hurry I'll be at the racks before Jarosław. That'd be a first.
**Player [B]:** We wait — if there's water and light enough to get back.
**Leszek:** Let me check. Half a skin. Less than half. We'd better not.
**Player:** Tomorrow, then.
**Leszek:** After the racks. I'll ask him when he can spare me.

## Etap 3 — Decide what it's for

### C1 — Raport u Jarosława
Warunek: powrót z terenu. Odpowiedzi gracza dostępne tylko dla posiadanych flag.

**Jarosław [domyślnie]:** Well. What did you find?
**Jarosław [opinia ≥ 25, zamiast powyższego]:** Sit. There's room on the bench. What did you find?
**Player [feedingSeen]:** It feeds in the clover by the old fence, then crosses open ground.
**Jarosław:** Then it's either brave or new here. Where does it go when it's done?
**Player [coverSeen]:** Back into the thicket, low, under the hazel.
**Jarosław:** Same path both ways? *(gracz potwierdza)* Then I could set a snare there with my eyes shut. So could anyone.
**Player [zdobycz bez obserwacji]:** We brought a hare. I didn't watch long.
**Jarosław:** Then let me see how it was taken. That'll tell me the rest.
**Player:** What would you do?
**Jarosław:** Me? I'd fill the rack. But it's not my bag that's split. *(patrzy na Leszka)* And it's not my hare he found.

### C2 — Uzgodnienie z Leszkiem
Warunek: C1. Ustawia `choice`.

**Leszek:** So. What are we doing?
**Player [pelt]:** The white hide. One clean shot, and we split what Stanisław pays.
**Leszek:** All right. If the shot isn't there, we walk away. I'd rather mend this strap a third time than botch it.
**Player [ordinary]:** An ordinary hare for Stanisław and the rack. You learn to skin one you're not afraid to ruin.
**Leszek:** …Yes. Honestly, the white one scares me a bit. Imagine cutting the most expensive hide in the wood crooked.
**Player [watch]:** We leave it. Watch it a few more days — where it feeds, where it shelters, whether it stays.
**Leszek:** No money in that.
**Player:** No. But you'd be the first one here who knows anything about it.
**Leszek:** *(pauza)* Put my name on it, then. Not "the boy who saw it". Leszek.

## Etap 4 — Zakończenia

### E1 — The white collar
Warunek: `choice=pelt`, białe futro oprawione (I: oprawianie) i dostarczone Stanisławowi w dobrym stanie. Cena: propozycja **30–40 c** z sakiewki Stanisława (uszkodzenie futra obniża cenę; Stanisław pokazuje to w zwykłym oknie handlu). Gracz i Leszek dzielą wypłatę po połowie — Leszek dostaje swój udział jako realny transfer i kupuje torbę, jeśli mu starcza.

**Stanisław:** Hm. Hold that corner. No — to the light.
**Leszek:** Is something wrong with it?
**Stanisław:** No. That's what I'm checking. *(pauza)* It's good. It'll go to {T}, to some merchant's wife who'll never know there was a clover field.
**Leszek:** It looks smaller on the table.
**Stanisław:** Everything does. The price doesn't.
**Player:** Your share, Leszek.
**Leszek:** *(liczy)* That's the bag. That's actually the bag. — I'm keeping the old one too. The strap's good now.

Skutek: białego zająca nie ma w świecie (brak odrodzenia). Leszek nosi nową torbę (N: zmiana ekwipunku NPC). Jarosław przy kolejnej rozmowie: "Clean shot, I heard. Good. Don't go looking for another."

### E2 — Supper, and practice
Warunek: `choice=ordinary`, świeża zwykła zwierzyna (I: świeżość) sprzedana Stanisławowi (cena rynkowa mięsa/skóry, ok. **8–12 c** łącznie, dzielone) lub oddana na suszarnię Jarosława (wtedy bez gotówki, mięso zostaje w household). Biały zając żyje dalej według symulacji.

**Jarosław:** You've left too much on this edge.
**Leszek:** I know. I was scared of cutting through.
**Jarosław:** Give me the knife. Watch the loose bit — here. Now you.
**Player:** Stanisław took the meat.
**Leszek:** Less than the white one would've been. Enough for a proper strap and thread.
**Jarosław:** You'll want the thread again.
**Leszek:** Can I do the next one without you reaching for the knife?
**Jarosław:** If you stop when you're not sure, and ask. Then yes.

Skutek: Leszek ćwiczy oprawianie (praktyka, bez magicznej premii); opinia Jarosława o graczu rośnie (+10, N).

### E3 — The blank line
Warunek: `choice=watch`, `watchComplete`, potem jeszcze jedna obserwacja kolejnego dnia (zając wrócił albo nie — oba wyniki zaliczają, bo celem jest wiedza). Brak gotówki. Jarosław daje graczowi zestaw **wnyków ×2** i **strzały ×10** z własnego zapasu (realny transfer z inwentarza household; propozycja).

**Jarosław:** Where it feeds. Where it hides. That it came back — or didn't. *(czyta)* Who wrote "don't know" here?
**Leszek:** Me. How long it stays. We haven't watched long enough.
**Jarosław:** Good. Leave it like that. Most people fill that line with a guess.
**Player:** No hide, no coin. Was it worth it?
**Jarosław:** Ask me in winter, when I know which clover still has hares on it. *(do Leszka)* There's a feeding ground past the old fence-line. Two mornings. Take a spare page.
**Leszek:** Paid?
**Jarosław:** Two mornings. Ask me about pay when you're back.
**Leszek:** *(do gracza, cicho)* That means yes.

Skutek: biały zając pozostaje w świecie jako rzadki widok (może później zginąć z przyczyn symulacji; epilogi o tym nie kłamią). Leszek zyskuje kolejne zadanie obserwacyjne (dialog, bez nowego questa).

## Odmowa, przerwanie, pominięcia

- Odmowa A1: bez kary, oferta wraca.
- Przerwanie w terenie: zebrane obserwacje zostają.
- Zając zabity przez gracza przed `watchComplete`: E3 zamknięte, E1/E2 dostępne; Leszek, jeśli nie był świadkiem, pyta, co się stało (gracz może powiedzieć prawdę lub nie — kłamstwo nie ma tu skutku mechanicznego, bo nikt nie ma dowodu).
- Zając zginął z innej przyczyny: E1 dostępne tylko, jeśli gracz znajdzie truchło w stanie do oprawienia; inaczej E2/E3 (E3, jeśli `watchComplete`).
- Pominięcie Leszka: gracz może sam upolować i sprzedać futro (zwykły handel), ale quest nie kończy się E1 — Leszek mówi: "You could've waited for me." Quest zamyka się bez nagrody relacyjnej.
- Nieobecny Stanisław: łup trzeba przechować do jego powrotu (świeżość mięsa obowiązuje — futro trwałe, mięso nie).
- Śmierć Leszka/Jarosława: quest zamknięty bez dopisywania im kwestii.

## Mechaniki

I: zając, łuk, skradanie, oprawianie, świeżość, handel, opinia NPC. P: wariant umaszczenia (`FAUNA-09`). N: unikatowy osobnik o trwałym ID, czynność „obserwuj zwierzę” (czas bez spłoszenia), ekwipunek NPC zmieniany zakupem, dialog warunkowy. Obserwacja nie wymaga nowego skilla. **Do decyzji autora:** cena białego futra (proponowane 30–40 c), trudność obserwacji.
