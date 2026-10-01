# Q05 — The Map That Missed the River

**Status: propozycja N/P; pakiet A (Codex 1), wyprawa ze skarbem.** Obsada: [QUEST-WORLD](QUEST-WORLD.md). Wymaga `WORLD-11` (landmarki, P) i `LOOT-01` (skarby, P); jaskinia niepotrzebna. Cztery etapy, trzy zakończenia. Skala: wyprawa ze skarbem między {V} a {T}.

## Założenie

Radomira, handlarka w {T}, ma mapę narysowaną przez babkę Dobrosławę — też handlarkę, która czterdzieści lat temu straciła wóz przy przeprawie przez rzekę w roku powodzi. Babka ocalała, ale skrzynkę z rezerwą handlową zakopała w pośpiechu przy kamiennym kręgu, „po wschodniej stronie, nie w pierwszym dole”. Kiedy wróciła po kilku tygodniach, woda zmieniła koryto i nie potrafiła znaleźć miejsca. Narysowała mapę z pamięci — z rzeką o trzech zakolach. Dziś rzeka ma dwa. Archiwista Przemysł uważa, że mapa jest po prostu błędna. Radomira podejrzewa, że „brakujące” zakole to stare koryto, a więc droga.

Prawdziwa odpowiedź: trzecie zakole wyschło i jest dziś suchym, zarośniętym łożem — jedynym miejscem, gdzie latem da się przejść na wyspę z kręgiem bez brodzenia w bystrym nurcie. Skrzynka leży pod wschodnim kamieniem. „Pierwszy dół” w środku kręgu to stary wykop szabrowników sprzed lat — pusty.

Emocja: zachwyt odkrycia, potem prawdziwy łup w ręku i decyzja, co zrobić z wiedzą o przejściu.

**Wiedza NPC.** Radomira zna rodzinną opowieść (niedokładną). Przemysł zna papier, atrament, znak mierniczego — nie zna terenu. Dorota (myśliwa V), jeśli gracz z nią rozmawiał w Q02, wie, że „nad dolnym zakolem woda zmienia się co wiosnę”. Nikt nie wie, co jest w skrzynce.

**Warunki startu.** Gracz dotarł do {T}; w dolinie między {V} i {T} istnieje landmark „kamienny krąg” (P) na wyspie/zakolu. Jeśli seed go nie ma — quest się nie pojawia (brak teleportu skarbu).

## Skarb (propozycja do kalibracji, patrz [QUEST-WORLD](QUEST-WORLD.md#kalibracja-nagród-propozycja-do-decyzji))

Okuta skrzynka (ciężka: ~15 kg): monety o łącznej wartości **~180 c** (srebro i miedź), **złoty pierścień** z rytym znakiem rodziny (80–150), **dwa szmaragdy** w woreczku (120–250 każdy), zbutwiała księga rachunkowa. Własność: spadkobierczyni Dobrosławy, czyli Radomira (dowód: znak na pierścieniu i księga). Źródło wartości: zewnętrzne (D-ECON-1 dopuszcza skarb jako jawne źródło).

## Stan

`accepted`, `oldBedFound`, `circleFound`, `firstHollowSeen`, `chestFound`, `chestBroughtBack`, `choice = unset|family|ford|keep_gems`, `settled`. Kopanie: I (łopata, ITEM-04). Ciężar: I (udźwig; dopuszczalne dwa kursy lub wózek).

## Etap 1 — A line that should be water

**S1 — Radomira przy straganie w {T}**

**Radomira:** My grandmother drew this river with three bends. It has two. Przemysł says that makes it wrong.
**Player:** Rivers move.
**Radomira:** That's what I keep telling him. He has a newer map. Newer isn't the same as truer.
**Player:** What's at the end of it?
**Radomira:** Her strongbox. She lost a cart and two oxen at that river the spring of the great flood and buried what she could carry. She went back and couldn't find it. Spent the rest of her life saying "the river took the road."
**Player [A]:** I'll go and look at the ground.
**Radomira:** Then I'll pay for your bread and a third of whatever's in the box, if there's a box. Bring back what you see — not what makes a better story. → `accepted`
**Player [B]:** Why not go yourself?
**Radomira:** Because I've a stall, a sick husband and no idea how to cross a river that eats carts. You've walked from {V}, haven't you? That's more than I've done in ten years.

**S2 — Przemysł w ratuszu (opcjonalnie)**

**Przemysł:** I've had the paper in my hands. Old rag paper, oak-gall ink — it's genuinely forty years old, I'll give her that.
**Player:** And the river?
**Przemysł:** Wrong. Measured against the survey we did for the road, it's simply wrong. Three bends where there are two.
**Player:** Unless one dried up.
**Przemysł:** *(zastanawia się)* …Unless one dried up. I hadn't — I've never walked that valley. I'd want to see it.
**Player:** And this mark by the circle?
**Przemysł:** A surveyor's sign. "Measured from here." Her grandmother must have learned it from someone who knew what they were doing. Which makes the river harder to explain away, I suppose.

**S3 — Radomira przed wyjściem**

**Radomira:** One more thing. She always said, "not in the first hollow". I don't know what it means. Neither did she, by the end.
**Player:** I'll keep it in mind.
**Radomira:** Bring the box closed, if you find it. I'd like to open it myself. I've waited thirty years to see her handwriting in the ledger.

## Etap 2 — The bend that isn't there

**S4 — Dolina** (czynność eksploracji; mapa gracza odkrywa teren, FoW I)

Gracz porównuje mapę z terenem: rzeka ma dwa zakola, wyspa z kręgiem leży za bystrym nurtem (brodzenie: ryzyko spławienia ekwipunku i utraty staminy — I: woda/teren; N: nurt). Między zakolami wije się łuk zarośniętego, kamienistego łoża (`oldBedFound`).

**Player (myśl):** The third bend's still here. Dry. Full of willow — but you could walk it.

**S5 — Dorota, jeśli gracz przechodzi przez {V} i zna ją z Q02**

**Dorota:** The valley below the long bend? Water changes there every spring. Some years there's a dry channel you can walk; some years it's knee-deep.
**Player:** I'm following a map drawn before the flood.
**Dorota:** Then use the river as it is and the map as a question. And don't cross the main current with anything you can't afford to lose.

## Etap 3 — Stone and soil

**S6 — Kamienny krąg** (`circleFound`)

**Player (myśl):** Seven stones, one fallen. And in the middle — a hole, half filled with leaves. Someone dug here long ago and left in a hurry. (`firstHollowSeen`)
**Player (myśl):** "Not in the first hollow." East stone, then.

Kopanie przy wschodnim kamieniu (I: łopata) odsłania skrzynkę (`chestFound`). Jeśli gracz kopie w pierwszym dole — nic, tylko stara rdza po łopacie szabrowników.

**S7 — Skrzynka** (otwarcie na miejscu jest możliwe — bez kary, ale Radomira o tym wie po powrocie, bo zamek jest wyłamany)

Transport: skrzynka ~15 kg + to, co gracz już niesie. Dwa kursy przez suche łoże albo wózek ręczny (`TRANS-01`). Przejście przez nurt z ciężarem: ryzyko utraty skrzynki w wodzie (N; skrzynka nie znika — da się ją wyłowić z płycizny poniżej).

## Etap 4 — What the box was for

**S8 — Otwarcie u Radomiry** (`chestBroughtBack`)

**Radomira:** *(otwiera powoli)* Coins. Her ledger — the ink's run, but that's her hand, look at the loops. And — *(cisza)* — that's her ring. She was married in that ring. She told me she'd sold it.
**Player:** And these?
**Radomira:** Emeralds. *(przegląda księgę)* "Two green stones, for Master Halm of {T}, paid half." Halm's house died out before I was born. Nobody's coming for these.
**Player:** So what now?
**Radomira:** Now you get your third. I said a third and I meant it. But — *(waha się)* — there's the crossing, too. You found a way over that river nobody in {T} knows. That's worth something, and I don't know to whom.

**S9 — Przemysł (jeśli gracz z nim rozmawiał lub Radomira go wezwie)**

**Przemysł:** You walked the dry bed? All the way to the island?
**Player:** Twice. With a box on my back the second time.
**Przemysł:** Then the survey's wrong, not her map. *(pauza)* I'll have to redraw the whole lower valley. Do you know how long since anyone has given me a reason to redraw anything?
**Player [A]:** Should it be public?
**Przemysł:** Carters from {V} lose a day going round by the upper ford. A summer crossing would give them that day back. But it's her family's find. And yours.

**S10 — Wybór** (ustawia `choice`)

**Player [family]:** Keep it in the family. The coins and stones are yours; give me my third in coin. The crossing stays your grandmother's secret.
**Radomira:** *(kiwa głową)* Then she gets to have been right, quietly. I like that.

**Player [ford]:** Let Przemysł mark the dry crossing on the town map. Carters get their day back, and your grandmother's name goes on the bend.
**Radomira:** "Dobrosława's Bend." *(śmieje się)* She'd have hated the fuss. She'd have loved the name.
**Przemysł:** I'll walk it myself before I draw it. With you, if you'll show me.

**Player [keep_gems]:** I'll take one of the emeralds as my share instead of coin.
**Radomira:** One stone instead of a third? *(liczy)* That's — near enough the same, if you sell it well. Zbigniew will give you a fair price; he gives everyone a fair price, it's his only vice.

### E1 — Back to the family
Warunek: `family`. Gracz otrzymuje **⅓ wartości gotówkowej skrzynki: propozycja 150–200 c** (Radomira sprzedaje jeden szmaragd Zbigniewowi, by wypłacić gracza — realny transfer z sakiewki Zbigniewa do Radomiry, potem do gracza; `if_empty`: wypłata częściowa + reszta po kolejnej wizycie).

**Radomira:** She wore it at her wedding and on the day she lost the oxen. I'll wear it to the market. Let people ask.

Skutek: suche łoże pozostaje nieoznaczone na mapach NPC (gracz ma je na własnej mapie — FoW I). Radomira daje graczowi stały rabat 10% (N) na swoim straganie.

### E2 — Dobrosława's Bend
Warunek: `ford`, Przemysł przeszedł łoże z graczem (scena ruchu: Przemysł jako tymczasowy towarzysz na jedną trasę — P `COMP-01` lub prosty skrypt podążania N). Gracz otrzymuje **⅓ jak w E1** oraz renomę w {T} i {V}.

**Przemysł:** *(zapisuje)* "Summer crossing, dry bed, knee-deep after the thaw. Found from the map of Dobrosława, trader of {T}." There. Now it's true for everyone.
**Radomira:** And the island?
**Przemysł:** Belongs to whoever walks to it. That's how islands are.

Skutek: nowy odcinek trasy V–T dla NPC i karawan (N: skrót sezonowy w grafie dróg), renoma (rozpoznawalność) +; trasa może zalać się wiosną (N: sezonowa dostępność).

### E3 — A green stone of your own
Warunek: `keep_gems`. Gracz otrzymuje **szmaragd ×1** (120–250 przy sprzedaży) zamiast gotówki. Przejście pozostaje jak w E1, chyba że gracz osobno zaproponuje Przemysłowi oznaczenie (wtedy dodatkowo skutek E2 — dopuszczalne łączenie po rozliczeniu łupu).

**Radomira:** Don't sell it to the first man who smiles at it.
**Player:** Zbigniew?
**Radomira:** Zbigniew doesn't smile. That's why you can trust his price.

## Odmowa, przerwanie, pominięcia

- Odmowa: mapa zostaje u Radomiry; po kilku tygodniach może poprosić kogoś innego (quest wygasa bez kary).
- Gracz zatrzymuje skrzynkę dla siebie: to kradzież mienia Radomiry — działa zwykły system reputacji (uczciwość −, jeśli ktoś się dowie: Przemysł wie o wyprawie). Quest kończy się bez zakończenia autorskiego.
- Zgubiona mapa: jeśli gracz odkrył już łoże/krąg, wiedza zostaje na jego mapie; bez tego quest stoi do odzyskania mapy.
- Śmierć Radomiry przed rozliczeniem: skrzynka trafia do jej household; Przemysł może jedynie poświadczyć udział gracza (⅓ wypłaca household, jeśli ma środki).

## Mechaniki

I: podróż, FoW mapy, łopata/kopanie, udźwig, handel, reputacja. P: landmark kamiennego kręgu (`WORLD-11`), skrzynie i kosztowności (`LOOT-01`), towarzysz na trasę (`COMP-01`). N: nurt rzeki jako przeszkoda, sezonowy skrót w grafie dróg, rabat handlarza. **Do decyzji:** wartości kamieni i pierścienia; czy skróty sezonowe wchodzą do generatora dróg.
