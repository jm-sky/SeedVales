# Q04 — The Handle Remembers

**Status: propozycja N; blacksmith/craft.**

## Założenie

W kuźni V pęka stary młot Tobina. Nessa, jego córka i kowalka, chce zrobić nowy z lepszego materiału. Tobin uważa, że problemem jest zły chwyt, nie wiek narzędzia. Gracz ma sprawdzić narzędzie w pracy, porównać koszt i zdecydować, czy stary przedmiot przekuć, zachować jako pamiątkę, czy złożyć zamówienie na nowy.

I: kowal, zamówienie z zaliczką, durability, materiały i pieniądze. N: dialog o pamięci przedmiotu, próba narzędzia, rozdzielenie „działa” od „jest bezpieczne”.

## Etapy i stan

`accepted`, `testObserved`, `quoteSeen`, `choice=reforge|new|keepsake`, `depositPaid`, `settled`. Test zużywa czas i trwałość, ale nie niszczy młota automatycznie.

### 1. A cracked handle

**S1 — Nessa**

**Nessa:** It cracked along the grain. That is not a good place for a crack.
**Player:** Can you repair it?
**Nessa:** I can put new wood around old weakness. I can also make a new head. Those are two prices.
**Player [A]:** Let Tobin show how he uses it.
**Nessa:** Good. He will hate the suggestion and prove it useful.
**Player [B]:** Just make a new hammer.
**Nessa:** “Just” is free. Iron is not.

**S2 — Tobin**

**Tobin:** I used this before Nessa could lift the bellows.
**Player:** Then you know its balance.
**Tobin:** I know my balance. The hammer has changed less than my knees.
**Player:** What work did it do best?
**Tobin:** Thin edge work. Not the heavy striking. Nessa remembers the numbers; I remember the feel.

**S3 — próba**

**Nessa:** One test on cold iron. No showpiece.
**Player:** Why cold?
**Nessa:** Heat hides a bad edge. Cold work shows where the force travels.
**Tobin:** It travels through my wrist.
**Nessa:** Exactly.

### 2. Two kinds of good

**S4 — po teście**

**Player:** The old hammer still lands true.
**Nessa:** It also shudders on the return.
**Tobin:** It did not do that last month.
**Nessa:** Last month is not a material specification.
**Player:** Could a new handle solve it?
**Nessa:** Perhaps. I will not promise “perhaps” for a paid repair.

**S5 — wycena**

**Nessa:** New handle: two days and local wood. Reforged head: iron, coal, and my time. New hammer: most expensive, least sentimental.
**Player:** Which is best?
**Nessa:** For a tool, “best” means the work it must survive. Tell me the work.
**Tobin:** It must survive me changing my mind.

**S6 — decyzja Tobina**

**Tobin:** If we melt it, there is no old hammer left.
**Player:** Is that what worries you?
**Tobin:** It is what I am saying. Worry is a different word.
**Nessa:** The old handle can stay in the wall rack. A thing may stop working and still have a place.

### 3. A named order

**S7 — wybór**

**Player [reforge]:** Reforge the head and keep the old handle for the rack.
**Tobin:** That sounds like both keeping and losing it.
**Nessa:** It is exactly that.

**Player [new]:** Order a new hammer and leave this one intact.
**Nessa:** I need the deposit before I reserve iron.
**Tobin:** And the old one?
**Player:** You decide where it rests.

**Player [keepsake]:** Repair only enough to hang it safely; do not use it for work.
**Nessa:** That is not a repair order. It is preservation.
**Tobin:** Then write that word. I do not want a future apprentice striking with it.

**S8 — zaliczka i własność**

**Nessa:** The deposit belongs to the order. If you cancel before I heat the forge, most returns. After that, materials are consumed.
**Player:** Show me the amount first.
**Nessa:** I am showing it. Read it before agreeing.
**Tobin:** Good. The hammer has had enough surprises.

**S9 — oczekiwanie**

**Nessa:** Come back after the stated work time. Do not call every hour “late.”
**Player:** What if the materials run out?
**Nessa:** The order waits. It does not invent iron.

### 4. Trzy zakończenia

**E1 — The tool changes hands.** Warunek: `reforge`, materiały i zamówienie gotowe. Tobin testuje nowy przedmiot, ale Nessa zatwierdza bezpieczeństwo.

**Tobin:** It feels wrong.
**Nessa:** New things often do.
**Tobin:** It feels honest after the second strike.
**Player:** The old handle?
**Tobin:** On the wall. Let it remember without breaking again.

Skutek: nowy/odnowiony młot z innymi parametrami; stary uchwyt jako prywatny rekwizyt; koszt materiałów i pracy.

**E2 — A clean order.** Warunek: `new`, `depositPaid`, odbiór gotowego zamówienia. Tobin zachowuje stary młot.

**Nessa:** New handle, new head, same purpose.
**Tobin:** Same purpose is enough.
**Player:** Will you use the old one?
**Tobin:** To teach where not to put your thumb.

Skutek: osobny item z pełną durability; zachowana pamiątka; możliwy wzrost opinii Nessa za jasne zamówienie, bez bonusu bojowego.

**E3 — The quiet rack.** Warunek: `keepsake`, bez użycia narzędzia po ostrzeżeniu. Tobin rezygnuje z pracy tym młotem; Nessa nie pobiera fikcyjnej opłaty za pełną naprawę.

**Tobin:** It has done enough.
**Nessa:** I will make a small hook for it.
**Player:** No replacement?
**Tobin:** Later. Today I know what I am keeping.

Skutek: stary przedmiot nie jest funkcjonalną bronią/narzędziem; rodzina dostaje prawdziwy wybór, a nie dodatkową nagrodę.

## Przerwanie i otwarte kwestie

Odmowa S1 pozostawia młot w kuźni. Zerwanie zamówienia respektuje reguły CRAFT-02 i zwrot zużytych materiałów. Gdy Nessa jest niedostępna, UI pokazuje „order waiting”, nie kończy go zaocznie. I: craft/order. N: próba bezpieczeństwa, item pamiątkowy, dialog relacji ojciec–córka. Autor ma ustalić, czy narzędzia mają osobny stan „unsafe” i czy stary uchwyt może być dekoracją w późniejszym systemie budowy.
