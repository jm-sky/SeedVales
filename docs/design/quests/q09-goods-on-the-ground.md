# Q09 — Goods on the Ground

**Status: propozycja N; merchant.**

## Założenie

Oren ma nóż, bandaże, bukłaki i sznur, ale niewiele monet. Dena i Bram mają żywność oraz drewno, lecz potrzebują narzędzi. Gracz organizuje jawny barter albo komis. Nikt nie oszukuje i nikt nie jest „sekretnym złym kupcem”; trudność wynika z własności, limitu udźwigu i prawdziwej wartości zapasów.

I: handel z NPC, magazyny, udźwig, ceny i przelewy. P/N: trade z każdym NPC, przekazanie, komis i oferta zerowa.

## Sceny i etapy

Stan: `accepted`, `stockSeen`, `offers=barter|consign|return`, `delivery`, `settled`.

**S1 — Oren:** “I have things people need and coins people want. The two lists refuse to meet.”
**Player:** What do you actually own?
**Oren:** Two waterskins, three bandages, a cord, and a knife I will not sell below working value.
**Player:** And what do the households offer?
**Oren:** Food, timber, wool. Heavy goods. Honest goods.

**S2 — Bram:** “I can spare timber after the roof. Before that, no.”
**Player:** Oren offers a waterskin.
**Bram:** Then show weight, price, and what remains in the store.

**S3 — Dena:** “I have grain, not money.”
**Player:** You can trade a measured amount.
**Dena:** Measured before or after it crosses the threshold?
**Player:** Before. Both sides see the scale.

**S4 — wybór:**
**Player [barter]:** Exchange a named quantity now.
**Oren:** Then the goods change hands now. No future promises.
**Player [consign]:** Place goods in Oren’s stock; settle when he returns from the next route.
**Oren:** That is a commission, not a sale. I keep records and a risk.
**Player [return]:** No one trades today; return when someone has copper.
**Dena:** That is disappointing and useful.

**S5 — stock and carrying:**
**Oren:** You cannot carry all of it.
**Player:** Then two trips.
**Oren:** Good. A trade that ignores weight is a story, not an economy.

**S6 — settlement:**
**Player:** Here are the quantities and owners.
**Oren:** I agree to this line, not to the line you intended.
**Player:** Confirm.
**Oren:** Confirmed.

### Zakończenia

**E1 — Measured barter:** `offers=barter`, delivered quantities fit udźwig/magazyn. Skutek: natychmiastowe narzędzia dla domu, zapasy przesunięte 1:1, brak monet.

**E2 — Local commission:** `offers=consign`, Oren ma rzeczywisty wyjazd/stock i zapis właściciela. Skutek: oczekiwany późniejszy zwrot; po opóźnieniu oferta pozostaje niesfinalizowana, nie tworzy pieniędzy.

**E3 — No deal, better stock:** `offers=return`, zapasy zostają, ale gracz przekazuje listę zapotrzebowania. Skutek: kolejny handel może użyć prawdziwej potrzeby; brak reputacji za „wykonanie” nieistniejącej transakcji.

Odmowa jednej oferty nie kończy całego questa. Kradzież/utrata to normalny system reputacji, nie specjalny wariant dialogowy. Śmierć Orena zamraża komis i wskazuje jego magazyn, bez automatycznej sukcesji. I: trade/economy. N: komis, wyświetlanie właściciela, zestawienie ofert i udźwigu.
