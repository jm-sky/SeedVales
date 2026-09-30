# Q01 — A Hare Out of Place

**Status: propozycja N; hunter 1/2.** Obowiązuje [kontrakt pakietu](README.md). Cztery etapy, 12 scen (trzy to alternatywne epilogi).

## Założenie

Biały zając pojawił się na ciemnym skraju lasu. Kit chce zarobić na pierwszą porządną torbę myśliwską; Mara chce, żeby nauczył się wybierać cel, a nie tylko trafiać. Oren jest zainteresowany futrem, ale nie zlecił nikomu zabicia konkretnego zwierzęcia. Gracz może zamienić tę sposobność w rzadki towar, zwyczajną pracę albo zalążek praktycznego notatnika przyrodniczego. Emocja: przyjemność pierwszej wyprawy i szacunek zdobywany bez uroczystego pasowania.

Start: H ma Marę, Kita, Orena i obszar z zajęcami; N generuje jednego białego osobnika o trwałym ID, nie nowego przy każdym wejściu. Mara nie wysyła początkującego w teren z aktywnym zagrożeniem. Potrzebne: możliwość obserwacji, a w gałęzi łowieckiej broń/nóż gracza lub pomoc Mary. Brak minimalnego levelu. Dorosły Kit wraca przed wieczornymi obowiązkami przy suszarni.

Mara mówi krótko, zadaje pytania o ślad, nie o moralność. Kit chce pewnego zarobku i samodzielności; przy niepewności mówi za szybko. Oren kupuje użyteczne rzeczy i osobliwości; nie udaje, że płaci za coś, czego nie zamawiał. Oren nie zna stanu zwierzęcia przed raportem gracza.

## Stan i przejścia

`accepted`, `offerKnown`, `feedingSeen`, `escapeSeen`, `ordinaryDelivered`, `whiteDelivered`, `notesShown`, `kitAgreed`, `settled` — false na starcie. `choice = unset|pelt|ordinary|notes`. Obserwacje to dwie różne czynności: obejrzenie żerowania oraz odejścia do osłony, bez wymuszania ataku. `recordComplete` oznacza zapis obu obserwacji żywego osobnika, wspólnie sprawdzony przez Kita; późniejsza śmierć zwierzęcia nie unieważnia danych.

| Etap | Cel / przejście |
|---|---|
| 1 Oferta | A1 przyjęcie; A2 wyjaśnia trzy możliwości; A3 spotkanie Kita. `accepted + offerKnown` → 2 |
| 2 Teren | Rozpoznać żerowisko. B1/B2 wskazują dowody, B3 dopuszcza powrót; po jednej obserwacji lub zdobyciu legalnego łupu → 3 |
| 3 Wybór pracy | C1 omawia dowody z Marą, C2 daje zgodę Kita na jego udział, C3 potwierdza z Orenem zlecenie. Wybrana gałąź po spełnieniu warunków → 4 |
| 4 Domknięcie | E1/E2/E3, rozłączne. Koniec ustala `settled`; pozostałe nie są już dostępne |

C2 ustawia proponowany `choice`; C3 zatwierdza ofertę i jej podział. Zmiana `choice` przed rozliczeniem wymaga ponowienia C2/C3, zwalnia poprzedni budżet i nie kasuje obserwacji. `recordComplete`: obie obserwacje zapisane oraz Kit był przy obu albo odbył z graczem uzupełniającą obserwację brakującej części. `notesShown`: fizyczne przedstawienie tego zapisu Orenowi; `whiteDelivered`/`ordinaryDelivered`: jednorazowe przekazanie zaakceptowanego łupu przy rozliczeniu. Te czynności są dostępne przez C3 po powrocie, nie wymagają nieopisanej sceny. Zanim gracz potwierdzi finał, Oren powtarza cenę i pyta: **“This is the agreed work. Shall we settle it?”** Player: **“Yes. Pay us as agreed.”** lub **“Not yet.”** Tylko pierwsza odpowiedź i spełnione warunki uruchamiają E1/E2/E3.

Czynności można wykonać wcześniej. Zabicie białego zająca przed zakończeniem obserwacji zamyka wariant obserwacyjny, ale nie zwyczajną dostawę. Gotowy uczciwy zapis zachowuje wartość po późniejszej śmierci zwierzęcia; dialog nie zapewnia wtedy, że nadal żyje. Jedno zwierzę nie daje wielokrotnego łupu.

## Etap 1 — A possible commission

### A1 — Mara przy suszarni
Warunek: nieprzyjęty quest. Na miejscu widoczna uszkodzona torba Kita.

**Mara:** Kit saw a white hare beyond the hazels. Now he's priced its hide, bought a new bag in his head, and spent the change.
**Player:** Has he caught it?
**Mara:** He's told three people about it. Different skill.
**Kit:** Two. Oren was already listening.
**Player [A]:** I'll go with him. What needs doing first?
**Mara:** Find out what Oren actually wants. Then find the hare. In that order. → `accepted`.
**Player [B]:** I can't take a trip today.
**Mara:** Then don't promise one. Kit can mend that strap while he waits. → odmowa, bez kary.

### A2 — Oren przy swoim zapasie
Warunek: po A1; ustawia `offerKnown` po całej rozmowie.

**Oren:** A white hide? I'd buy one in good condition. I said that, yes.
**Player:** Kit heard a commission.
**Oren:** Then I owe him a clearer sentence. I haven't set aside money for it yet.
**Oren:** There are three jobs I can pay for: the white hide, an ordinary hare for food, or a useful feeding record. Different prices.
**Player [A]:** What can you definitely offer?
**Oren:** Choose a job and I'll show you the money I can set aside. Don't start on a guessed price.
**Player [B]:** Why would you buy an account?
**Oren:** I buy meat every week. Knowing which meadow still has it is worth a little. Not a white-hide price. A little.
**Player:** And Kit's bag?
**Oren:** He can see the price on it. I'd rather he did that before spending a week outdoors.

### A3 — Kit przy furtce
Warunek: `accepted`; opcjonalne przygotowanie. Nie przekazuje Orenowi żadnej wiedzy.

**Kit:** I've repaired the strap. It looks worse, but it holds.
**Player:** Take water as well.
**Kit:** Already did. I was going to say that before you said it.
**Player [A]:** Tell me where you saw it.
**Kit:** By the split hazel. It went under, not over. I marked the trunk. That's all I've actually seen.
**Player [B]:** You don't have to prove anything to me.
**Kit:** I know. I'd still like to come home with something I earned.
**Player:** We'll decide what that is when we know more.
**Kit:** Good. Mara decides very quietly. You only notice afterwards.

## Etap 2 — Read the ground

### B1 — Rozwidlenie przy leszczynie
Warunek: gracz i Kit na miejscu; rozmowa nie daje automatycznie obserwacji.

**Kit:** There. White hair on the bark.
**Player [A]:** The opening is low. Let's watch from the other side.
**Kit:** Below the wind? Yes. I'll keep back. My boots are louder than yours.
**Player [B]:** Hair tells us it passed. Does it tell us when?
**Kit:** No. I nearly said this morning because that's when I found it.
**Player:** We can check the feeding patch instead.
**Kit:** Right. I'll mark where I found it. You check the grass?

### B2 — Po rzeczywistym obejrzeniu żerowania
Warunek: `feedingSeen`; Kit musi być świadkiem, inaczej jego pierwsza kwestia: “Show me where you saw it.”

**Kit:** It hardly shows while it's under those pale branches. Then it steps out and there it is.
**Player:** Easy to notice isn't the same as easy to catch.
**Kit:** I was counting the coins again. Sorry.
**Player [A]:** We could take an ordinary hare and leave this one.
**Kit:** If Oren agreed to buy it, that's still work. I'd want to do my part.
**Player [B]:** We could finish the observation record.
**Kit:** Feeding place, cover, time. And write what we don't know? Mara does that.
**Player [C]:** The hide is still a fair commission.
**Kit:** Then we should do it properly. No chasing it halfway through the wood with a poor shot.

### B3 — Przed powrotem
Warunek: po B1; opcjonalne. Pogorszenie pogody/pragnienie nie są scenariuszowym game over.

**Kit:** The clouds are coming over. We could stay another hour.
**Player [A]:** We have enough for today. Let's go.
**Kit:** I can get back to the racks before Mara does. That would be new.
**Player [B]:** We'll wait, but only with enough water and time to return.
**Kit:** Let me check mine. Half. No, less than half. We should refill first.
**Player:** We can try again tomorrow.
**Kit:** After the racks. I'll ask Mara when she can spare me.

## Etap 3 — Decide what the work is

### C1 — Raport Marze
Warunek: gracz wrócił. Przekazanie obserwacji tylko dla flag posiadanych przez gracza; pominąć niedostępne odpowiedzi.

**Mara [domyślnie]:** What did you find?
**Mara [opinion ≥ 25, zamiast powyższego]:** Sit here. I've left room on the bench. What did you find?
**Player [feedingSeen]:** It feeds under the pale hazels, then crosses open ground.
**Mara:** That gives you a place. Did you see where it goes when it's finished?
**Player [escapeSeen]:** Into the thick bank, through the low opening.
**Mara:** Good. Put both in the account if you choose that job.
**Player [łup, bez obserwacji]:** We brought back a hare. I didn't watch long enough to say more.
**Mara:** Then don't say more. Let me look at your work.
**Player:** Which job would you take?
**Mara:** Today? Food. My rack has space. Kit may need a different sort of day.

### C2 — Uzgodnienie z Kitem
Warunek: C1 oraz wybór proponowanej pracy. Ustawia `kitAgreed`; zgoda dotyczy konkretnego planu, nie kolejnych zleceń.

**Kit:** If we sell the white hide, I can afford the bag sooner.
**Player [pelt]:** That's the job I propose. One clean hunt, and we split the agreed work payment.
**Kit:** All right. If the shot isn't there, we come back. I'd rather mend this strap twice.
**Player [ordinary]:** Let's fill Mara's rack and sell an ordinary hare.
**Kit:** Yes. I can learn to prepare the hide without worrying about ruining the most expensive one in the wood.
**Player [notes]:** Let's finish the feeding record. Less money, more watching.
**Kit:** I'll do it. But put my name on it too. Not just “the boy who saw it.”
**Player:** Kit. In full.
**Kit:** That will do.

### C3 — Zatwierdzenie oferty
Warunek: `kitAgreed`; Oren dostaje raport o wybranej pracy. UI pokazuje cenę, wkład i podział przed potwierdzeniem.

**Oren:** Tell me which job we're agreeing to.
**Player [pelt]:** One white hide, in the condition you're asking for.
**Oren:** I'll reserve that payment. Damage changes the price; I'll show you before you accept it.
**Player [ordinary]:** An ordinary hare, properly prepared, while it's still fresh.
**Oren:** I can use that. No premium for colour, no penalty for being sensible.
**Player [notes]:** A record of feeding and cover, with Kit's name beside mine.
**Oren:** Two observations, something I can follow, and no invented certainty. Agreed.
**Player:** Show us the payment and what each of us receives.
**Oren:** Here. Count it now. → potwierdzenie rezerwuje ofertę; można odmówić bez zakończenia.

## Etap 4 — Trzy zakończenia

### E1 — The white lining
Warunek: `choice=pelt + kitAgreed + whiteDelivered`; dostarczono istniejące futro do Orena i zaakceptowano cenę, nie sam fakt zabicia. Oren finansuje wypłatę. Kit może kupić torbę, jeśli wystarcza jego udział. Oren eksponuje futro; biały osobnik pozostaje martwy. Brak odradzania „na potrzeby questu”.

**Oren:** I'll use it inside the display case. Keeps the small pieces from sliding.
**Kit:** Inside? I thought everyone would see it.
**Oren:** They'll see it when I open the case. Come here. Hold this corner.
**Player:** Is that what you expected, Kit?
**Kit:** No. It looks smaller on a table.
**Oren:** Most things do. The agreed price hasn't grown smaller.
**Kit:** I did the work. I'll count my share.
**Player:** And the old bag?
**Kit:** Keeping it. The strap is good now.

### E2 — Supper, and practice
Warunek: `choice=ordinary + kitAgreed + ordinaryDelivered`, świeża legalnie pozyskana zwykła zwierzyna. Biały zając nie jest wymagany żywy: jeśli zginął niezależnie, epilog nie wspomina o jego bezpieczeństwie. Oren kupuje żywność; Mara kupuje swoją porcję od Orena (osobny transfer, bez podwójnego zaliczania mięsa), Kit przeznacza kolejne wolne godziny na oprawianie zamiast pogoni za rzadkim futrem.

**Mara:** You left too much on this edge.
**Kit:** I know. I was afraid of cutting through.
**Mara:** Bring the knife here. I'll show you on the loose piece.
**Player:** Oren accepted the delivery.
**Kit:** Less than the white hide. Enough for a proper strap and some thread.
**Mara:** You'll need the thread again.
**Kit:** I thought so. Could I prepare the next one without you reaching for the knife?
**Mara:** If you stop before you're uncertain, and ask.

### E3 — The blank line
Warunek: `choice=notes + kitAgreed + feedingSeen + escapeSeen + notesShown + recordComplete`. Oren po oględzinach notatek płaci z umówionego budżetu; w H zostaje kopia terenowego notatnika. Kit otrzymuje od Mary kolejne zadanie obserwacyjne zamiast dostawy futer; los białego zająca nadal wynika z symulacji; zakończenie nie potwierdza jego obecnego zdrowia ani nie wskrzesza go.

**Oren:** This line is empty.
**Kit:** How often it comes back. We haven't watched long enough.
**Oren:** Leave it empty, then. I can add a date when I see it.
**Player:** You wanted something useful.
**Oren:** This is useful. I know which bit I still need to check.
**Mara:** Kit, take a spare page next time. There's a feeding patch beyond the old fence.
**Kit:** A paid page?
**Mara:** A page. Ask me about pay before you leave.
**Kit:** I'm learning.

## Odmowa, przerwanie, pominięcia

Odmowa A1: powrót do obowiązków. Wyjście z terenu: obserwacje zostają. Śmierć zająca przed ukończeniem notatnika: E3 zamknięte, bez oskarżenia gracza; E2 dostępne. Po ukończeniu notatnika E3 zostaje dostępne. Wiadomość o śmierci dociera do NPC wyłącznie ze świadectwa. Utrata/zepsucie łupu: nowa zwykła dostawa albo uzgodnienie innej gałęzi, bez odtworzenia białego osobnika. Ominięcie Kita nie pozwala przyznać mu współautorstwa obserwacji, których nie współtworzył; gracz może wrócić po niego. Nieobecny Oren: zdeponować łup za zgodą w jego magazynie lub wrócić później; sam depozyt nie jest sprzedażą. Śmierć Kita/Mary zamyka osobistą serię bez dopisywania im kwestii.

## Mechaniki / otwarte kwestie

I: fauna/zając i warianty, łuk, skradanie, oprawianie, freshness, handel, npc.opinion. P: wygląd wariantów FAUNA-09. N: konkretny biały osobnik i jego umaszczenie, niegwarantowane przez ten plan. N: odczytywane tropy niezależne od krwi TRACE-01, obserwacja zachowania, obsada ucznia, umowa na dokumentację, notatnik, współudział i ceny. Obserwacja nie wymaga nowego skilla „Tracking”: to interakcja z terenem; ewentualny bonus Survival jest sprawą implementatora. Autor: ustalić wartości ofert, poziom trudności polowania i wygląd białego osobnika.

**Kontrola dojścia (R3):** E1: A1→A2→teren→C1→C2 pelt→C3→polowanie/oprawienie→rozliczenie. E2: ta sama droga z ordinary i zwykłym łupem. E3: A1→A2→dwie obserwacje z Kitem→C1→C2 notes→C3→okazanie zapisu→rozliczenie. Nie trzeba zabijać, by wejść do etapu 3. Przy braku gotówki Oren proponuje konkretny dostępny towar; odrzucenie oferty pozostawia quest otwarty.
