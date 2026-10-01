# Q10 — What the Mountain Owes

**Status: propozycja N/D; pakiet A (Codex 1), kopalnia złota (VISION §26.2).** Obsada: [QUEST-WORLD](QUEST-WORLD.md). Największy quest pakietu. Wymaga `QUEST-03` (D), jaskini/sztolni `WORLD-05` (D), outpostu `SET-04` (D), górnika `NPC-06` (D). To scenariusz docelowy, nie obietnica v1. Cztery etapy, trzy zakończenia.

## Założenie

Agnieszka, górniczka, która przyszła do {T} z gór po zawaleniu kopalni, w której pracowała, znalazła nad potokiem starą sztolnię — zarośniętą, z resztkami szyn z drewna i żyłą kwarcu z żółtymi nitkami. Sama nie wejdzie dalej: chodnik jest zalany za pierwszym zakrętem, a powietrze w ślepych bocznicach może zabić. Zbigniew, kupiec z {T}, chce kupić prawa do znaleziska od razu — płaci za ryzyko, że nic tam nie ma. Wójt {T}, Bolesław, chciałby, żeby miasteczko coś z tego miało, ale nie wyśle ludzi na ślepo. Gracz idzie do sztolni z Agnieszką, wynosi próbkę, sprawdza, co tam naprawdę jest, i decyduje z nimi, jak to wydobywać.

Emocja: zejście w ciemność, prawdziwe złoto w dłoni, potem ciężar decyzji, kto poniesie koszt.

**Prawda świata.** Sztolnię wykuto ponad sto lat temu i porzucono, gdy zalało dolny poziom. Żyła jest prawdziwa, ale wąska; bogatsza część leży za zalanym chodnikiem. W bocznej komorze leżą narzędzia dawnych górników i skórzany woreczek z kilkoma bryłkami złota — ktoś zostawił je przed ucieczką przed wodą.

**Wiedza NPC.** Agnieszka zna górnictwo, nie zna tej sztolni. Zbigniew zna ceny i ludzi w {T}, nie zna gór. Bolesław zna skarbiec i rodziny, które mogłyby pracować. Nikt nie wie o woreczku.

## Stan

`accepted`, `adit_entered`, `badAirMet`, `sideChamberFound`, `pouchFound`, `sampleTaken`, `floodedGalleryMeasured`, `choice = unset|sell|share|town_season`, `outpostBuilt`, `firstLoadWeighed`, `settled`.

## Etap 1 — A yellow thread in white stone

**S1 — Agnieszka w {T}, przy kuźni, gdzie ostrzy kilof**

**Agnieszka [Q05 ukończony]:** You're the one who walked the old river valley? Good.
**Agnieszka [domyślnie]:** You've come a long way to stand in a forge.
**Agnieszka:** I need someone who looks where they step.
**Player:** For what?
**Agnieszka:** An old adit above the stream, half a day up. There's quartz at the mouth with gold in it — real, I put my knife to it. Past the first bend it's under water and I'm not going in alone.
**Player:** How much gold?
**Agnieszka:** Enough to go and look. Not enough to start buying a new house. Don't let anyone in this town hear you say "gold" louder than that.
**Player [A]:** I'll come.
**Agnieszka:** Bring a lamp you trust, rope, and a candle you don't need. → `accepted`
**Player [B]:** Why not sell it to Zbigniew and be done?
**Agnieszka:** Because I know what happens to a mine when the man who owns it has never been inside one. I came here from one.

**S2 — Zbigniew (opcjonalnie)**

**Zbigniew:** Agnieszka's adit. Yes, she told me. I'll buy the claim today, sight unseen, for a sum I can afford to lose.
**Player:** How much?
**Zbigniew:** Two hundred now. Four hundred more if your sample assays. I'd rather overpay for a question than pay later for the answer.
**Player:** And if there's nothing?
**Zbigniew:** Then I bought a hole in a hill. I've bought worse. A ship, once. It sank before I saw it.

**S3 — Bolesław (opcjonalnie)**

**Bolesław:** If there's gold, the town wants a say. If there's a collapse, the town gets the widows. You see my problem.
**Player:** Would {T} send people?
**Bolesław:** If I know where they'll sleep, what they'll drink, and who tells them to stop. I won't send families after a rumour.

## Etap 2 — Into the adit (D: jaskinia)

**S4 — Wejście** (`adit_entered`)

**Agnieszka:** Timbers are rotten at the mouth, sound further in — the damp's kept them. Don't touch the props. If you have to lean on something, lean on rock.
**Player:** Rails?
**Agnieszka:** Wooden ones. They pushed the ore out in barrows on planks. Hundred years, I'd say. More.

**S5 — Boczna komora i świeca** (`badAirMet`, `sideChamberFound`)

**Agnieszka:** Stop. Light the candle and hold it low.
**Player:** It's — shrinking. Going blue.
**Agnieszka:** Out. Now. Walk, don't run, breathe slow. *(na zewnątrz)* …Bad air. Sits in the low places like water. That chamber's a grave for anyone who goes in without a draught.
**Player:** We need to get in there.
**Agnieszka:** Then we make a draught. Cloth on a frame at the mouth, swing it for an hour, and the candle tells us when.

Wentylacja: N (czynność „przewietrz” — czas + płótno ×2 + drewno). Wejście bez niej: gracz traci przytomność po kilku sekundach (I: KO bez śmierci gracza), Agnieszka wyciąga go, jeśli jest obecna.

**S6 — Woreczek** (`pouchFound`)

**Player:** Tools. A pick with the head rusted to lace. And a pouch under the stone ledge.
**Agnieszka:** *(otwiera)* …Look at that. Somebody left in a hurry and meant to come back.
**Player:** How much is it?
**Agnieszka:** Enough for a winter. Maybe two, if you're careful. It's yours — you went in. I'll have the knowledge.

Woreczek: bryłki złota o wartości **80–120 c** (propozycja, LOOT-01). Własność: znalezisko gracza (porzucone ponad sto lat temu, brak spadkobierców — N reguła znaleźnego, do decyzji autora).

**S7 — Próbka i zalany chodnik** (`sampleTaken`, `floodedGalleryMeasured`)

**Agnieszka:** The vein runs down. Under the water. That's where the old crew gave up.
**Player:** Can it be drained?
**Agnieszka:** With a sough — a drain cut out lower down the hill. A season's work for six people. Or with buckets, forever.
**Player:** And the part we can reach?
**Agnieszka:** Narrow. Real. Enough to pay its own way if nobody gets greedy.

## Etap 3 — Who carries the cost

**S8 — Rada przy stole w ratuszu** (wymaga `sampleTaken`)

**Bolesław:** So. Real, but narrow. Rich, but under water.
**Zbigniew:** My offer stands. Six hundred, all told, now that there's a sample. Then it's my water and my risk.
**Agnieszka:** And my old crew would come up from the mountains to dig it for him, and he'd pay them by the sack, and nobody would ask about the air.
**Zbigniew:** I would ask about the air. I'm greedy, not stupid.
**Bolesław:** Or the town runs it. Small. One season at a time, closed before the snow.
**Player:** Or the three of you share it — his money for the drain, the town's people, her eyes.
**Zbigniew:** A share. *(pauza)* I can do a share, if somebody honest keeps the scales.
**Agnieszka:** I'll keep the scales. I'll also keep the right to say stop.

**S9 — Wybór** (ustawia `choice`)

**Player [sell]:** Sell to Zbigniew. Agnieszka gets her finder's part, I get mine, the town gets a fee.
**Zbigniew:** Done. Witnessed by Bolesław, paid today.
**Agnieszka:** *(cicho)* I'll go and tell my old crew there's work. They'll be glad. I won't be there to watch.

**Player [share]:** Build a camp, cut the drain, share the ore — Zbigniew funds it, the town sends people, Agnieszka runs the face.
**Bolesław:** A share, measured at the scales, every load. I'll put it to the town.
**Agnieszka:** Then I want a hut by the mouth and the last word on the air.

**Player [town_season]:** The town works the part we can reach — one season, no drain, closed by the first snow.
**Bolesław:** Small and slow. I can sell that to the families.
**Zbigniew:** And I'll buy the ore at a fair price, since I'm not allowed to buy the mountain.

## Etap 4 — Zakończenia

### E1 — Sold once
Warunek: `choice=sell`, `sampleTaken`. Zbigniew płaci **600 c** z własnej sakiewki/kapitału (N: kupiec LG ma pulę inwestycyjną — do kalibracji): **gracz 250–300 c**, Agnieszka 200, `treasury_T` 100–150 (podział proponowany, ustalany w S9).

**Zbigniew:** The hole is mine. I'll send men up next month.
**Agnieszka:** The mountain didn't sign anything.
**Zbigniew:** No. That's why I paid before it could change its mind.

Skutek: osada nie ma wpływu na kopalnię; Zbigniew z czasem zatrudnia górników (N/D). Brak dochodu w przyszłości dla gracza.

### E2 — A share at the scales
Warunek: `choice=share`, `outpostBuilt` (D/N: schronienie, woda, narzędzia — gracz dostarcza część materiałów), sough wykonany (N: czas kalendarza ~1 sezon), `firstLoadWeighed`. Gracz otrzymuje **10% każdej zważonej dostawy** (propozycja: ~25–40 c za dostawę, raz na tydzień kalendarza, z realnej sprzedaży rudy Zbigniewowi — D-ECON-1: źródłem jest ruda jako nowy towar w ekonomii, wymaga decyzji autora). Brak dostaw = brak wypłat.

**Agnieszka:** First load. Smaller than his six hundred.
**Player:** And the next one exists only if the mine does.
**Zbigniew:** I dislike the stop clause. I'll keep it.
**Bolesław:** Write the names of everyone who goes in. Every day. That's my clause.

Skutek: outpost przy sztolni (D), stały dochód zależny od pracy NPC i bezpieczeństwa; zawał/zalanie zatrzymuje wypłaty, nie tworzy długu gracza.

### E3 — One season
Warunek: `choice=town_season`, sezon przepracowany i sztolnia zamknięta przed śniegiem. Gracz dostaje **jednorazowo 120–180 c** z `treasury_T` po sprzedaży urobku Zbigniewowi + renomę w {T}.

**Bolesław:** The camp's closed. Everyone's home. Everyone.
**Agnieszka:** I marked the props that'll need changing in spring.
**Player:** What did the mountain owe us?
**Agnieszka:** Nothing. We owed it care, and we paid.

Skutek: mniejszy, lokalny dochód; złoże do ponownej oceny w kolejnym roku (quest może się odnowić jako wybór `share`).

## Odmowa, przerwanie, pominięcia

- Odmowa: Agnieszka szuka innej osoby; po miesiącu Zbigniew kupuje prawa sam (świat idzie dalej, E1 bez udziału gracza).
- Brak próbki blokuje S8.
- KO w złym powietrzu: gracz budzi się na zewnątrz (jeśli Agnieszka była obecna) albo w komorze po pewnym czasie, osłabiony (I: KO — kosztuje czas i zdrowie, bez utraty przedmiotów).
- Śmierć Agnieszki: jej wiedza znika, chyba że gracz był przy S7; Zbigniew nie zna parametrów, których nie słyszał.

## Mechaniki

D: jaskinie/sztolnie, outposty, górnik, ruda złota w ekonomii. I: skarbiec, handel, budowanie, KO gracza. N: złe powietrze i wentylacja, znaleźne, pula inwestycyjna kupca, udział w dostawach. **Do decyzji:** czy kopalnia jest jednym questem czy szablonem per złoże; ile złota trafia do ekonomii; reguła znaleźnego.
