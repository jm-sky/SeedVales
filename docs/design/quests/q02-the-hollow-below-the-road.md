# Q02 — The Hollow Below the Road

**Status: propozycja N; pakiet A (Codex 1), myślistwo 2/2.** Obsada: [QUEST-WORLD](QUEST-WORLD.md). Kontynuacja Q01 jest opcjonalna. Cztery etapy, trzy zakończenia. Skala: średni quest w V.

## Założenie

Na dolnym odcinku drogi z {H} do {V}, tuż przed zakrętem, locha z warchlakami zryła wykrot pod zwaloną sosną. Dwa dni temu wpadła na woźnicę z {V}, który szedł obok wozu — wyszedł z poturbowanym udem i porzuconym workiem soli. Myśliwa Dorota nie chce „czyścić lasu”: lochę z małymi da się przeczekać, ale nie każdy może czekać — tą drogą chodzi się na targ i do {H}. Strażniczka Bogna musi zdecydować, co zrobić z drogą, i potrzebuje kogoś, kto zobaczy wykrot z bliska. Konflikt dotyczy oceny ryzyka i kosztu, nie złoczyńcy.

Emocja: napięcie przy wykrocie, potem ulga albo świadoma zgoda na koszt.

**Wiedza NPC.** Dorota widziała tropy i zryty grunt, nie widziała wykrotu. Bogna zna tylko relację woźnicy i raport gracza/Doroty. Jarosław (H) zna dolną drogę, nie zna tego wykrotu.

**Warunki startu.** Gracz był w {V} co najmniej raz; w wykrocie istnieje legowisko dzika z młodymi (I: legowiska jako spawn; P: agresja przy młodych, `FAUNA-07/08`). Q01 ukończony lub opinia Jarosława ≥ 10 dodaje scenę S2.

## Stan

`accepted`, `tracksRead`, `hollowFound`, `farrowCounted`, `reported`, `choice = unset|clear|reroute|watch`, `settled`. `hollowFound` wymaga fizycznego dojścia na odległość obserwacji; `farrowCounted` — obserwacji bez spłoszenia.

## 1. The lower road

**S1 — Dorota przy porzuconym worku soli**

**Dorota:** Don't step there. That's where he dropped it, and that's where she came out. See how the ground's turned?
**Player:** A boar?
**Dorota:** A sow. The prints are small and there are smaller ones round them. She's got young somewhere close, and she's decided this bend is hers.
**Player:** The carter?
**Dorota:** Bruised to the bone and lucky. He'll walk in a week. He won't walk this way.
**Player [A]:** I'll help you find where she's lying up.
**Dorota:** Good. Quietly, and not today at noon — she'll be lying in, and so would I. Come at first light. → `accepted`
**Player [B]:** Why not just close the road?
**Dorota:** Then people go round by the marsh, and the marsh has drowned more carters than pigs have. Bogna won't close it without a reason she can point at.

**S2 — Jarosław (H), jeśli Q01 ukończony lub opinia ≥ 10**

**Jarosław:** You're going down to Dorota's bend? I heard about the carter.
**Player:** A sow with a farrow.
**Jarosław:** Then don't go down wanting a fight. A sow with young doesn't care how brave you are. She cares where you're standing.
**Player:** Do you know Dorota?
**Jarosław:** I know she doesn't guess out loud. If she says a sow, it's a sow.
**Player:** Anything else?
**Jarosław:** Upwind of her, never between her and the young. And bring the thing you'd climb.

**S3 — Dorota o świcie**

**Dorota:** Two trails. This one's fresh — wet edges. That one's old.
**Player:** Which is safer?
**Dorota:** Neither. The fresh one's just easier to read. → `tracksRead`
**Player [A]:** We follow the fresh one.
**Dorota:** As far as the ground lets us. When I put my hand up, you stop. Not after one more step.
**Player [B]:** Let's come back with more people.
**Dorota:** More people, more noise. I'd rather two who can stand still.

## 2. The hollow

**S4 — Przy zwalonej sośnie** (po `hollowFound`)

**Dorota:** *(szeptem)* Under the roots. See the bedding? She's dragged half the bracken in the wood in there.
**Player:** I count five small ones.
**Dorota:** Five. Spring farrow. In six weeks they'll follow her anywhere, and she'll stop guarding one hole. → `farrowCounted`
**Player:** Six weeks of nobody using this bend.
**Dorota:** Or six weeks of someone deciding they won't wait.

**S5 — Jeśli gracz spłoszy lochę**

**Dorota:** Back! Behind the trunk — now! *(po chwili)* …She's stopped. She's only telling us. Walk away slowly and don't turn your back on her till the bend.

Spłoszenie nie kończy questa; locha jest przez dobę agresywniejsza (N).

**S6 — Powrót do drogi**

**Dorota:** Well. You've seen it. Now you tell Bogna — you saw it closer than I did.
**Player:** And if I just kill her?
**Dorota:** Then the road's safe tomorrow and there are five piglets that won't see autumn. I'm not saying don't. I'm saying count it.

## 3. A road has a price

**S7 — Bogna przy bramie {V}**

**Bogna:** Dorota says you've been to the hollow. Tell me what you saw, not what you think I want to hear.
**Player:** One sow, five young, under the fallen pine by the bend. Fresh bedding. She came at us only when we got too close.
**Bogna:** Good. Now I can do something. → `reported`
**Player [A]:** Clear her out before the next market day.
**Bogna:** Kill her or drive her off — and with what, and who's standing where when she turns? Give me that and I'll pay for it.
**Player [B]:** Move the road uphill for the season.
**Bogna:** That's posts, a cleared track, and our woodcutter's week. And everyone grumbling about the extra climb.
**Player [C]:** Mark the bend and walk people through at set hours until the young can travel.
**Bogna:** That's my evenings for six weeks. I can do it. I'd like to hear it's worth it.

**S8 — Dorota przed decyzją**

**Dorota:** I'll walk with any of the three. They don't cost the same, that's all.
**Player:** Tell me plainly.
**Dorota:** Clearing it: danger now, quiet after. The uphill track: timber and sweat. The watch: Bogna's evenings and everyone's patience.
**Player:** And the piglets?
**Dorota:** Live in two of them. Maybe in the first, if you drive her off rather than kill her. Driving off a sow is harder than people think.
**Player [clear / reroute / watch]:** *(wybór)* → `choice`

## 4. Zakończenia

### E1 — Clear the hollow
Warunek: `choice=clear`, `hollowFound`, legowisko faktycznie unieczynnione (I: spalenie legowiska — 5× gałąź + krzesiwo; walka). Wariant przepędzenia ogniem i hałasem bez zabicia: P/N (I obecnie obsługuje tylko zabicie). Zapłata: **35–45 c** z `treasury_V` przez Bognę po jej własnych oględzinach.

**Dorota:** It's cold. Nothing in there but bracken.
**Player [jeśli przepędzone]:** She went east with the young. Didn't look back.
**Dorota:** She'll find another root to lie under. Further from the road, I hope.
**Player [jeśli zabite]:** It's done.
**Dorota:** Then we'll dress her properly — no point wasting her as well. *(pauza)* The little ones I'll take to the farm, if Małgorzata will have them. Somebody'll raise them.
**Bogna:** I'll walk the bend myself tonight. If it's quiet, you're paid in the morning.

Skutek: brak legowiska przy drodze; reputacja w V: odwaga +, uczynność +. Przy zabiciu: mięso i skóra (zwykły łup; warchlaki → household farmera V jako zwierzęta, N).

### E2 — Move the road, not the pigs
Warunek: `choice=reroute`, objazd zbudowany: gracz przynosi co najmniej połowę z 8 słupków/belek (I: transport, taczka/wózek `TRANS-01`), drwal V wykonuje resztę. Zapłata: **20–25 c** z `treasury_V` + darmowy posiłek w V; drewno dostarczone przez gracza to jego wkład, nie towar na sprzedaż.

**Dorota:** Longer by — what — a hundred paces?
**Player:** And a hill.
**Bogna:** People have already complained about the hill. Good. They're complaining about the hill and not about their legs.
**Dorota:** When the young can run, we pull the posts and let the old bend grow back. Or don't — the new one drains better.

Skutek: trwały objazd (N: odcinek drogi roboczej), locha zostaje; mniejsze ryzyko dla podróżnych.

### E3 — The watched bend
Warunek: `choice=watch`, `reported`, sześć tygodni czasu kalendarza z przeprowadzaniem ludzi o ustalonych porach (N: harmonogram straży). Gracz może wziąć co najmniej 3 wieczorne zmiany zamiast Bogny (każda: **6 c** z `treasury_V`). Quest zamyka się, gdy locha z młodymi opuści wykrot (symulacja) albo po sześciu tygodniach.

**Bogna:** Sixth week. She's gone — went down to the stream with the lot of them, Dorota says.
**Player:** All five?
**Dorota:** Four. One didn't make it. That happens without anyone's help.
**Bogna:** I'm writing "bend clear," not "safe forever." If she comes back next spring, we know what to do.

Skutek: brak budowy i brak zabicia; koszt: czas strażników; trwała notatka „zagrożenie sezonowe” (N) i możliwość ponownego wystąpienia problemu wiosną.

## Odmowa, przerwanie, pominięcia

- Odmowa S1: bez kary; Bogna zamyka bend na kilka dni (droga przez bagno dłuższa).
- Wycofanie po tropach: `tracksRead` zostaje; Dorota nie twierdzi, że gracz znalazł wykrot.
- Bez `hollowFound` E1 niedostępne — nie da się spalić miejsca, którego nikt nie widział.
- Jeśli NPC (Dorota, strażnicy) rozwiążą problem sami, quest kończy się wpisem „settled by {V}”; gracz dostaje wyłącznie uznanie za realny wkład (raport → mała opinia, bez zapłaty).
- KO gracza przy wykrocie: Dorota odciąga go (jeśli obecna); quest trwa.
- Śmierć Doroty: Bogna przyjmuje raport gracza, ale nie zna niczego, czego jej nie powiedziano.

## Mechaniki

I: dzik, walka, legowisko (spawn), spalenie legowiska, reputacja, transport (`TRANS-01`). P: zachowanie przy młodych (`FAUNA-07/08`), przepędzenie ogniem. N: objazd drogi, harmonogram warty, notatka zagrożenia sezonowego, warchlaki jako zwierzęta gospodarskie. **Do decyzji:** czy spalenie legowiska usuwa spawn na stałe; czy reputacja za niebojowe rozwiązanie liczy się jak za walkę.
