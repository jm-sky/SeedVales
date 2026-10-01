# Q04 — The Handle Remembers

**Status: propozycja N; pakiet A (Codex 1), kowalstwo.** Obsada: [QUEST-WORLD](QUEST-WORLD.md). Trzy etapy, trzy zakończenia. Skala: mały, intymny quest w V.

## Założenie

W kuźni {V} pęka trzonek starego młota Bogdana. Kuźnię od dwóch lat prowadzi jego córka Zofia, ale Bogdan wciąż przychodzi do drobnej roboty — kucie ostrzy, nity, cienkie blachy — i robi to tym jednym młotem. Zofia chce zrobić mu nowy, lżejszy, bo widzi, że stary „oddaje” w nadgarstek. Bogdan twierdzi, że młot jest dobry, tylko trzonek się zestarzał. Ma po trochu rację: głowa ma mikropęknięcie przy obuchu, przez które młot drży przy odbiciu — ta sama robota, ten sam nadgarstek, gorsze odkuwki. Gracz pomaga przeprowadzić próbę i rodzina decyduje: przekuć głowę, zrobić nowy młot, czy powiesić stary na ścianie.

**Wiedza NPC.** Zofia wie, że ojciec ma bóle nadgarstka. Bogdan wie, że ostatnie lemiesze wychodziły gorsze, i nikomu tego nie powiedział (powiązanie z G02). Żadne nie wie o pęknięciu głowy przed próbą.

**Warunki startu.** V ma household kowala z co najmniej dwiema osobami. I: kowal, zamówienia z zaliczką (`CRAFT-02`), durability, materiały. N: próba narzędzia, przedmiot-pamiątka.

## Stan

`accepted`, `bogdanTold`, `testDone`, `crackFound`, `choice = unset|reforge|new|keepsake`, `orderPlaced`, `settled`.

## Etap 1 — A cracked handle

**S1 — Zofia przy kowadle**

**Zofia:** Cracked along the grain. Right where his hand goes. That's not the place you want a crack.
**Player:** Can it be fixed?
**Zofia:** I can put a new handle on it in an afternoon. Or I can make him a new hammer, which he'll hate. Those aren't the same job.
**Player [A]:** Let your father show me how he uses it.
**Zofia:** Yes. Please. He'll be insulted, and then he'll show you everything. → `accepted`
**Player [B]:** Just make a new one.
**Zofia:** You tell him. I've tried three times.

**S2 — Bogdan na ławie przed kuźnią**

**Bogdan:** I had this hammer before she could lift the bellows.
**Player:** Then you know its balance better than anyone.
**Bogdan:** I know *my* balance. The hammer's changed less than my knees have.
**Player:** What work does it do best?
**Bogdan:** Edges. Thin work. Not the heavy drawing-out, I leave that to her now. — Ask her the numbers. I just know when it feels wrong.
**Player [A]:** And lately? Does it feel wrong?
**Bogdan:** *(długa pauza)* The last few shares I did came out — not bad. Not like they used to. I put it down to the iron. → `bogdanTold`

**S3 — Próba na zimnym żelazie** (czynność: gracz trzyma pręt, Bogdan uderza; albo gracz uderza sam — I: crafting/skill kowalstwa nie jest wymagany)

**Zofia:** One test. Cold iron. No showing off.
**Player:** Why cold?
**Zofia:** Heat hides a bad hammer. Cold shows you where the blow goes.
**Bogdan:** It goes into my wrist.
**Zofia:** Exactly.

## Etap 2 — Two kinds of good

**S4 — Po próbie** (`testDone`; jeśli gracz obejrzy głowę z bliska → `crackFound`)

**Player:** It lands true. But it shivers on the way back up.
**Bogdan:** It didn't do that last winter.
**Player [crackFound]:** There's a hairline crack by the poll. It's in the head, not the handle.
**Zofia:** *(bierze młot, ogląda pod światło)* …There. There it is. Father, that's been in there months.
**Bogdan:** *(cicho)* The shares.
**Zofia:** What about the shares?
**Bogdan:** Nothing. Later.

Bez `crackFound` Zofia podejrzewa pęknięcie, ale nie ma pewności; opcja `reforge` jest wtedy niedostępna (nie przekuwa się czegoś, czego nie zbadano).

**S5 — Co dalej**

**Zofia:** Three ways. New handle on the old head — no, not now, not with that crack. Reforge the head: I draw it out again, it comes out shorter, maybe a little lighter. Or a new hammer from new iron.
**Player:** Which would you choose?
**Zofia:** For a tool? Whatever survives the work. Tell me what work he's going to do.
**Bogdan:** Whatever I like. And changing my mind.

**S6 — Bogdan sam**

**Bogdan:** If she reforges it, there's no old hammer left. It's just a smaller one with the same name.
**Player:** Is that what bothers you?
**Bogdan:** That's what I said. What bothers me is a different word.
**Player [A]:** You could keep the old head and have a new one made.
**Bogdan:** Two hammers. Like a rich man.
**Player [B]:** It might be time to let it rest.
**Bogdan:** Hm. Maybe it's earned that. Maybe I have.

## Etap 3 — Wybór i zakończenia

**S7 — Wybór** (ustawia `choice`)

**Player [reforge]:** Reforge the head. Keep the old handle on the wall.
**Bogdan:** That's keeping it and losing it at once.
**Zofia:** That's what it is, yes.

**Player [new]:** A new hammer. The old one stays as it is.
**Zofia:** That's iron and charcoal I'd rather not spend this month. If you can bring the iron, I'll do the work for nothing.
**Bogdan:** For nothing. Listen to her.

**Player [keepsake]:** Hang it up. He uses yours until he wants his own.
**Bogdan:** Hers is too heavy.
**Zofia:** Then I'll make you a light one when you ask. Not before.

Materiały: `reforge` — węgiel ×4 (gracz lub zapasy kuźni); `new` — sztaba żelaza ×2 + węgiel ×4 (I: `iron_ingot`, `coal`; gracz przynosi albo kupuje — zamówienie `CRAFT-02` z zaliczką płaconą przez gracza, jeśli materiały są z kuźni). Czas pracy: zgodnie z istniejącym systemem zamówień.

### E1 — The same hammer, shorter
Warunek: `reforge`, `crackFound`, materiały, zamówienie ukończone.

**Bogdan:** It feels wrong.
**Zofia:** New things do.
**Bogdan:** *(drugie uderzenie)* …It feels honest. — The old handle?
**Zofia:** On the wall, over the door.
**Bogdan:** Good. It can watch.

Skutek: Bogdan pracuje dalej; jakość jego drobnych wyrobów wraca do normy (N: modyfikator jakości NPC-kowala). Zapłata: Zofia oferuje graczowi **naprawę jednej broni lub narzędzia do pełnej durability** za darmo (usługa, nie gotówka).

### E2 — Two hammers
Warunek: `new`, zamówienie odebrane.

**Zofia:** New handle, new head, same purpose.
**Bogdan:** Same purpose is enough. *(waży w dłoni)* Lighter. I'll get used to it.
**Player:** And the old one?
**Bogdan:** For teaching. Where not to put your thumb.

Skutek: nowy przedmiot o pełnej durability; stary młot zostaje (jako przedmiot, oznaczony „damaged — do not use”, N). Jeśli gracz przyniósł żelazo, Zofia nie bierze zapłaty za robociznę i daje graczowi **gwoździe/ćwieki ×20** lub **nóż** (wartość ~8 c) „z resztek”.

### E3 — The quiet hook
Warunek: `keepsake`, młot powieszony; Bogdan nie używa go po ostrzeżeniu.

**Bogdan:** It's done enough.
**Zofia:** I'll make it a proper hook.
**Player:** No new hammer?
**Bogdan:** Later. Today I know what I'm keeping.

Skutek: Bogdan pracuje mniej (N: mniejsza wydajność kuźni do czasu, aż poprosi o nowy młot — Zofia robi go sama po ok. 2 tygodniach). Zapłata: posiłek i opinia rodziny (+15), bez gotówki — gracz niczego nie kupił ani nie przyniósł.

## Odmowa, przerwanie, pominięcia

- Odmowa S1: młot leży w kuźni, Zofia osadza nowy trzonek na pękniętej głowie; drżenie i słabsze wyroby trwają (N), co podtrzymuje tło G02.
- Zerwanie zamówienia: reguły `CRAFT-02` (zwrot niezużytych materiałów).
- Niedostępna Zofia: zamówienie czeka, nie kończy się zaocznie.
- Powiązanie z G02 (miękkie): po S4 z `crackFound` Bogdan w G02 może sam przyznać, że lemiesz był gorszy (dodatkowa opcja dialogowa, nie warunek).

## Mechaniki

I: kowal, zamówienia, durability, materiały. N: próba narzędzia, oznaczenie przedmiotu jako uszkodzonego/pamiątki, modyfikator jakości wyrobów NPC. **Do decyzji:** czy narzędzia mają stan „unsafe”; czy pamiątki mogą być dekoracją w budynku.
