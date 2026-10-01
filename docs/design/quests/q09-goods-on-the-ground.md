# Q09 — Goods on the Ground

**Status: propozycja N; pakiet A (Codex 1), handel.** Obsada: [QUEST-WORLD](QUEST-WORLD.md). Dwa etapy, trzy zakończenia. Skala: mały quest w H.

## Założenie

Handlarz Stanisław wrócił z {T} z narzędziami, których w {H} brakuje: piłą, nożycami do strzyży, sierpem i liną. Pieniądze ma, ale nie zamierza ich wydawać na towar, którego nie sprzeda: w {T} drewno i zboże są tanie, a wozu nie ma — każdy worek nosi na plecach osła. Domy w {H} mają za to mało monet, a dużo ciężkich dóbr: Mirosław drewno, Radosław zboże, Mira wełnę. Wszyscy czegoś potrzebują i nikt nie chce być stratny. Nikt nie oszukuje; trudność to ciężar, cena i zaufanie.

**Tło (miękkie powiązanie z G06):** Stanisław boi się złego roku — mówi, że po słabym lecie zboże w {T} podrożeje i woli trzymać monety. Gracz może to usłyszeć tutaj, zanim Stanisław poprosi o list do Janka.

**Wiedza NPC.** Stanisław zna ceny w {T} i swój zapas. Każdy dom zna własne nadwyżki. Nikt nie zna cudzych.

**Warunki startu.** I: handel z NPC, magazyny household, udźwig, ceny. P: handel z każdym NPC (`TRADE-02`), przekazywanie przedmiotów. N: komis, lista zamówień.

## Stan

`accepted`, `needsHeard` (licznik: 0–3 domy), `stockSeen`, `deal = unset|barter|consign|order`, `delivered`, `settled`.

## Etap 1 — Who needs what

**S1 — Stanisław przy straganie**

**Stanisław:** Half the village has been past to look at the saw. Nobody's bought it. They stroke it like a cat and walk off.
**Player:** They've no coin.
**Stanisław:** They've grain, timber and wool, and I've a donkey, not a wagon. I can't eat timber and I can't sell it in {T} — they've a forest of their own.
**Player:** So nobody trades.
**Stanisław:** So everybody waits and grumbles. *(pauza)* If you can find me a deal I can carry, I'll make it. I'd rather sell the saw for wool than take it back up that hill. → `accepted`, `stockSeen`
**Player [A]:** Why not just lend it?
**Stanisław:** Because the last thing I lent in this village came back as a story about why it broke. — No, that's unfair. Half a story.

**S2 — Mirosław**

**Mirosław:** The saw? I'd give a cartload of split wood for it. He doesn't want a cartload of split wood.
**Player:** What else have you got?
**Mirosław:** Two good oak planks from last winter. Seasoned. Somebody in {T} might want those — a cooper, a joiner.
**Player:** Heavy?
**Mirosław:** Heavier than they look. Everything worth having is. → `needsHeard+1`

**S3 — Radosław**

**Radosław:** I need the sickle before harvest. I've grain — last year's, dry, in sacks.
**Player:** Stanisław says grain's cheap in {T}.
**Radosław:** This year it is. Ask him what he thinks it'll be after this summer.
**Player:** Has he said?
**Radosław:** He hasn't said. He's been buying sacks for himself, quietly. That's saying. → `needsHeard+1`

**S4 — Mira**

**Mira:** Shears. Mine are notched; I'm cutting the wool more than shearing it.
**Player:** Wool's light, at least.
**Mira:** Light and worth something in {T}, if it's clean. Mine's clean. → `needsHeard+1`

## Etap 2 — Make it carry

**S5 — Wybór** (wymaga `needsHeard ≥ 2`; ustawia `deal`)

**Player [barter]:** Straight swap, today. Wool for the shears, grain for the sickle, the planks for the saw. I'll carry the heavy stuff to your store.
**Stanisław:** The wool I'll take gladly. Grain — two sacks, not four, I can only store so much. The planks… *(waży w głowie)* …if they're as good as he says, yes. And you carry them, because my back's already promised to the donkey.

**Player [consign]:** Take the wool and planks to {T} on commission. They get the tools now, you pay them what the goods fetch when you're back.
**Stanisław:** That's trust on both sides. I keep a tally, they keep a tally, and if the planks don't sell, they come home on the donkey. I can live with that. Can they?

**Player [order]:** No deal today. Write down what everyone needs, and bring the right things next time.
**Stanisław:** A list. *(pauza)* That's not nothing. Half my trips I guess what people want and guess wrong.

**S6 — Dźwiganie** (tylko barter/consign; I: udźwig, D-ECON-2)

**Stanisław:** You can't carry all that at once.
**Player:** Then two trips.
**Stanisław:** Or the wheelbarrow behind Mirosław's woodpile, if he'll lend it.
**Mirosław:** He'll lend it. He'd like it back with the wheel on.

### E1 — Straight swap
Warunek: `deal=barter`, towary fizycznie przeniesione (I: udźwig/taczka), wymiana przez zwykłe okno handlu (ceny I). Gracz otrzymuje od Stanisława **10 c** „za noszenie” i rabat jednorazowy (N).

**Stanisław:** Shears to Mira, sickle to Radosław, saw to Mirosław. And I've a store full of things I'll have to find buyers for. Lovely.
**Mira:** *(próbuje nożyc)* Oh — that's the sound it should make.

Skutek: narzędzia w household (praca NPC idzie sprawniej — N), towary w magazynie Stanisława, monety nie zmieniają właściciela.

### E2 — On commission
Warunek: `deal=consign`, wełna i deski w magazynie Stanisława, zapis „kto czego oczekuje” (N: komis). Po jego kolejnej podróży (realny wyjazd NPC lub symulowany czas, N) Stanisław wypłaca domom uzyskaną kwotę z własnej sakiewki; gracz dostaje **10 c** od Stanisława i **5 c** od każdego z domów (z ich sakiewek).

**Stanisław (po powrocie):** The planks went to a cooper for more than I'd have asked. The wool — less. Here's the tally. Count it with me.

Skutek: wyższe ceny dla domów niż w E1, ale z opóźnieniem i ryzykiem (deski mogą nie znaleźć kupca — wtedy wracają).

### E3 — The list
Warunek: `deal=order`. Brak transakcji dziś; po kolejnym wyjeździe Stanisław przywozi narzędzia i trochę więcej soli/żelaza niż zwykle (N: asortyment handlarza zależy od listy potrzeb). Gracz nie dostaje gotówki, dostaje opinię Stanisława i domów (+5).

**Stanisław:** Next time I'll bring two pairs of shears. One for Mira, one for whoever breaks theirs next.

## Odmowa, przerwanie, pominięcia

Odmowa jednej oferty nie kończy questa. Kradzież/utrata towaru: zwykły system reputacji. Śmierć Stanisława zamraża komis; jego magazyn przechodzi na household, bez automatycznej sukcesji długów.

## Mechaniki

I: handel, magazyny, udźwig, taczka (`TRANS-01`), ceny. P: handel z każdym NPC, przekazywanie. N: komis, lista potrzeb wpływająca na asortyment, wydajność pracy zależna od narzędzi. **Do decyzji:** czy asortyment handlarza ma reagować na potrzeby osady.
