# Q06 — Room for One More

**Status: propozycja N/P; pakiet A (Codex 1), towarzysz.** Obsada: [QUEST-WORLD](QUEST-WORLD.md). Wymaga `COMP-01/02/03` (P: towarzysze); bez nich działa tylko zakończenie solo. Trzy etapy, trzy zakończenia. Skala: średni quest drogowy H→V→H.

## Założenie

Mirosław zamówił u kowalki Zofii w {V} nowy obuch siekiery i dwa żelazne kliny — stare pękły przy ścince. Zamówienie jest gotowe i opłacone z góry, trzeba je tylko odebrać. Mieszko, dorosły syn drwala, nigdy nie był dalej niż na skraju lasu i bardzo chce iść. Ludmiła potrzebuje go w domu przy wykopkach, Mirosław nie chce tracić kolejnego dnia ścinki na wyprawę po żelazo. Gracz i tak idzie w stronę {V}. Mieszko ma własne zdanie, obowiązki i może odmówić — nie jest nagrodą za reputację.

Emocja: pierwsza samodzielność widziana z boku; rozmowy w drodze.

**Wiedza NPC.** Mieszko zna drogę tylko z opowieści. Zofia wie, kto zapłacił za zamówienie (Mirosław), i wyda je tylko jego domownikowi albo komuś z jego znakiem. Ludmiła wie, ile pracy zostaje w domu.

**Warunki startu.** Household drwala w H z dorosłym synem bez własnej rodziny (APPENDIX: towarzysze); w {V} istnieje gotowe zamówienie (I: `CRAFT-02`). Jeśli Q03 skończył się E2 (Mieszko nadal śpi we wspólnej izbie), Mieszko ma dodatkową kwestię w S1.

## Stan

`accepted`, `familyAgreed`, `deal = unset|paid|free|solo`, `itemCollected`, `returned`, `settled`. Wynajęcie (P): czas, kwota, zadanie, ryzyko — wg APPENDIX. Przekazanie ekwipunku: prezent lub handel (P).

## Etap 1 — Who goes

**S1 — Przy stole drwala**

**Mieszko:** Zofia sent word — the axe head's ready. I could go tomorrow.
**Ludmiła:** You could go after the turnips are up.
**Mirosław:** And after somebody tells me what the road's like this week.
**Player:** I'm going that way. He could come with me.
**Mieszko:** As what — hired hand, or son-on-an-errand?
**Mieszko [jeśli Q03→E2]:** Anyway, a week sleeping somewhere that isn't next to Father's snoring. I'd call that pay.
**Player [A]:** Let's settle it properly before we go: how long, what for, and what if it goes wrong.
**Mieszko:** Good. Then I can say yes like I mean it. → `accepted`
**Player [B]:** I'll fetch it on my own.
**Ludmiła:** That's a plan too. Bring Mirosław's mark back with the iron, or Zofia won't hand it over. → `deal=solo`, gracz dostaje znak (przedmiot `miroslaw_mark`, N)

**S2 — Ludmiła na osobności**

**Ludmiła:** If he goes, I lose two mornings in the field. Maybe three.
**Player:** What would make it all right?
**Ludmiła:** A day when he's back. Someone to carry water while he's gone. And nobody coming home telling me he's a different man because he walked to {V}.
**Player [A]:** I'll bring water for the house before we leave.
**Ludmiła:** Then I've no argument left except that I'll miss him, and that's not an argument. → (po przyniesieniu wody: wiadro ×4 do beczki household — I) `familyAgreed`
**Player [B]:** He's a grown man. It's his choice.
**Ludmiła:** It is. And it's my turnips. Both things are true.

**S3 — Mirosław**

**Mirosław:** Don't call him brave because he said yes. He hasn't walked it yet.
**Player:** What worries you?
**Mirosław:** The lower bend — the business with the sow. And him trying to carry both wedges and the head at once because he thinks it's manly.
**Player:** I'll watch for both.
**Mirosław:** Hm. Take my old hatchet, then, Mieszko. Not the good one. → Mieszko otrzymuje topór (I: ekwipunek NPC)

## Etap 2 — Terms and the road

**S4 — Ustalenia** (ustawia `deal`)

**Player [paid]:** Four days, there and back, one pickup. I pay you a day's wage — five coppers a day.
**Mieszko:** Twenty coppers. *(pauza)* That's more than I've ever held at once.
**Player:** And if there's trouble on the road, we turn back. I won't promise it'll be safe.
**Mieszko:** Good. I'd not believe you if you did.

**Player [free]:** *(wymaga: opinia Mieszka ≥ 25 lub uczynność gracza w H ≥ 10 — N, do kalibracji)* Come because you want to. No pay — but no orders either.
**Mieszko:** *(myśli)* …Yes. If I'm paid, it's your trip. If I'm not, it's mine as well. I'd like it to be mine as well.

**S5 — Ekwipunek** (opcjonalnie; P: przekazanie)

**Player:** Take this padded jacket for the road.
**Mieszko:** Is it a gift, or do I give it back?
**Player [gift]:** It's yours.
**Mieszko:** Then I'll wear it. *(zakłada)* …It's better than mine. That's all I've got to say about it.
**Player [loan]:** Give it back when we're home.
**Mieszko:** Fair. I'll try not to sweat in it.

NPC używa przedmiotu tylko, jeśli jest lepszy od własnego (APPENDIX).

**S6 — W drodze, przy ognisku** (pierwszy nocleg; scena warunkowa: towarzysz obecny, obóz rozbity)

**Mieszko:** Everything's further than it looks from home.
**Player:** Disappointed?
**Mieszko:** No. I thought I would be. — Can I ask you something? What's {T} like?
**Player [byłem]:** Bigger. Louder. The bread's worse and the beer's better.
**Player [nie byłem]:** I haven't been. Someday.
**Mieszko:** Someday. That's what Father says about the roof. *(śmieje się)* No, I mean — I'd like to see it. Not now. Someday that I mean.
**Player:** You could ask Zofia about work, while we're there.
**Mieszko:** I was going to. I didn't want to say it in front of Mother.

**S7 — Dolny zakręt** (jeśli Q02 nierozwiązany lub `choice=watch` w toku)

**Mieszko:** Is that — the turned ground? Where the carter got hurt?
**Player:** It is. Keep to the uphill side and don't run.
**Mieszko:** I wasn't going to run. *(pauza)* I was going to walk very fast.

## Etap 3 — The pickup and the return

**S8 — Kuźnia w {V}**

**Zofia:** Mirosław's order. Head and two wedges. Who's taking it?
**Mieszko:** Me. Mieszko, his son.
**Zofia:** You've his shoulders. Here. *(podaje)* The wedges are heavier than they look.
**Mieszko [deal≠solo]:** Do you ever need hands here? At the bellows, or carrying?
**Zofia:** Sometimes. Not this month. Ask me in spring, and bring your own boots. → `itemCollected` (bez znaku Mirosława Zofia wydaje zamówienie tylko domownikowi)

**S9 — Powrót**

**Mieszko:** Back while the waterskin's still full. Mother'll be suspicious.
**Player:** Of what?
**Mieszko:** That nothing went wrong.

### E1 — A paid road
Warunek: `deal=paid`, `itemCollected`, powrót w umówionym czasie. Gracz płaci **20 c** (5 c/dzień, propozycja) z własnej sakiewki do Mieszka — realny transfer.

**Mieszko:** Twenty coppers. I earned them. I also earned the right to say that hill's in a stupid place.
**Ludmiła:** You can say it after the turnips.
**Player:** The jacket?
**Mieszko [gift]:** I'm keeping it. It's better. That's my whole speech.

Skutek: relacja z Mieszkiem rośnie (wspólna podróż, APPENDIX), Mieszko jest odtąd dostępny do wynajęcia (P) na krótkie trasy.

### E2 — Someday that I mean
Warunek: `deal=free`, `itemCollected`, powrót. Bez zapłaty.

**Mieszko:** I asked Zofia about spring.
**Mirosław:** You what?
**Mieszko:** Asked. She said bring my own boots.
**Ludmiła:** *(do gracza)* Did you put that in his head?
**Player:** He had it in his head before we left.
**Ludmiła:** *(wzdycha)* Yes. I know. I just wanted somebody to blame.

Skutek: wyższa relacja niż w E1; Mieszko chętniej dołącza za darmo przy kolejnych prośbach (P: szansa na darmowe dołączenie). Wiosną Mieszko może przenieść się do pracy w {V} (N: migracja NPC; jeśli nieobsługiwana — tylko dialog).

### E3 — Alone on the road
Warunek: `deal=solo` lub Mieszko odmówił/zrezygnował; gracz przyniósł zamówienie ze znakiem Mirosława. Mirosław daje graczowi **5 c** „na drogę” albo ładunek drewna opałowego.

**Ludmiła:** You came back alone.
**Player:** That was the plan.
**Mieszko:** I got the turnips up. All of them. *(pauza)* Next time I'm going.
**Mirosław:** Next time you are.

## Odmowa, przerwanie, pominięcia

- Odmowa S1/S4 przez Mieszka (np. niska opinia, choroba w domu): bez spadku relacji; quest przechodzi w `solo`.
- KO gracza w drodze: Mieszko czeka przy nim lub szuka pomocy (P: towarzysz woła o pomoc — §28); umowa przedłuża się o dzień bez dopłaty, jeśli gracz o to poprosi.
- Opóźniony kowal: zamówienie czeka; rozmowa o przedłużeniu (płatny dzień dodatkowy).
- Gracz nie wraca w umówionym czasie: Mieszko wraca sam po ostatnim dniu (jeśli droga bezpieczna) — umowa kończy się zapłatą za przepracowane dni.
- Śmierć Mieszka: osobna mechanika świata (§28); quest zamknięty, bez automatycznego zastępcy.

## Mechaniki

I: podróż, potrzeby, obóz/nocleg, handel, zamówienia kowala. P: towarzysz (wynajem, darmowe dołączenie, przekazanie i użycie ekwipunku). N: znak domownika do odbioru zamówienia, scena obozowa warunkowa, migracja NPC do innej osady. **Do decyzji:** stawka dzienna towarzysza (proponowane 5 c).
