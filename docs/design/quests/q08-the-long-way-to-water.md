# Q08 — The Long Way to Water

**Status: propozycja N; pakiet A (Codex 1), budowa/woda.** Obsada: [QUEST-WORLD](QUEST-WORLD.md). Trzy etapy, trzy zakończenia. Skala: średni quest w V.

## Założenie

Pasterka Elżbieta z {V} rano i wieczorem prowadzi owce do wspólnej studni na placu, bo strumień przy pastwisku latem wysycha. Owce blokują kolejkę, ludzie się złoszczą, a ostatnio jedna z owiec wpadła pod wóz. Elżbieta ma już dość — chce koryta przy pastwisku, ale wie, że ktoś musiałby je napełniać: trzysta kroków z wiadrami, dwa razy dziennie. Małgorzata, sołtyska {V} i sąsiadka z farmy, wolałaby nową studnię przy polach — bo jej krowy też piją. Strażniczka Bogna chce tylko, żeby nic nie stało na drodze. Gracz pomaga wybrać i zbudować rozwiązanie, które ma kogoś, kto je utrzyma.

**Wiedza NPC.** Elżbieta zna liczbę owiec i odległości. Małgorzata zna koszty i to, kto w {V} ma czas. Bogna wie, którędy jeżdżą wozy. Nikt nie sprawdził, czy przy polach jest woda pod ziemią.

**Warunki startu.** Gracz był w {V}; I: studnia, koryto, wiadro, budowa (§24.1–24.2). N: grafik napełniania, wybór lokalizacji z uzgodnieniem.

## Stan

`accepted`, `routeWalked`, `groundChecked`, `plan = unset|trough|well|rota`, `built`, `settled`.

## Etap 1 — The queue at the well

**S1 — Elżbieta przy studni, owce dookoła**

**Elżbieta:** The sheep get to the well before I do. Then everyone's thirsty and nobody's happy.
**Player:** How far's the pasture?
**Elżbieta:** Three hundred steps. I've counted. Far enough that a full bucket feels like a punishment by the second trip.
**Małgorzata:** A trough by the fence would sort it.
**Elżbieta:** A trough that someone fills. An empty trough's just a wooden apology.
**Player [A]:** Let me walk it and see what makes sense.
**Elżbieta:** Please. Somebody who isn't me or her. → `accepted`

**S2 — Droga do pastwiska** (czynność: przejście trasy → `routeWalked`)

**Player:** The ground falls toward this corner. A trough here would need less carrying from the stream in spring.
**Elżbieta:** And in summer the stream's dust. Then it's all from the well.
**Player:** What about the low field? Małgorzata's.
**Elżbieta:** Ask her. Rushes grow there in June. My grandfather used to say that means water underneath.

**S3 — Oględziny pola** (czynność: kopanie próbne łopatą — I → `groundChecked`)

**Player:** Damp at two spades down. There's water, not much, but there is.
**Małgorzata:** Then a well there would serve my cows and her sheep both. And nobody walks three hundred steps.
**Player:** It's a lot of digging and stone.
**Małgorzata:** It is. And it'd belong to the whole village, which means it needs a turn-list or it'll be nobody's.

**S4 — Bogna**

**Bogna:** Don't put anything on the road. I don't care what — trough, well, stone circle.
**Player:** Where, then?
**Bogna:** Off the turning place, where a cart can still swing round. I'm not choosing your water. I'm protecting my road.

## Etap 2 — Choose and build

**S5 — Wybór** (ustawia `plan`)

**Player [trough]:** A trough by the pasture fence. Elżbieta's household fills it.
**Elżbieta:** Twice a day. *(pauza)* Fine. It's still less than walking the flock through the square. Write my name on it, so nobody else thinks it's theirs to empty.
**Player [well]:** *(wymaga `groundChecked`)* A small well in the low field. Shared, with turns at keeping it.
**Małgorzata:** I'll put it to the village. If they agree, I'll take the first month myself.
**Player [rota]:** No building. Set times at the square well — animals at dawn and dusk, people the rest of the day.
**Elżbieta:** Costs no timber. Costs everyone's patience, every single day.
**Bogna:** I can shout at people for breaking it. I enjoy that.

**S6 — Budowa** (I: koryto — budowa, wiadro, transport wody; well — N/I: budowa studni §24.1, większy koszt)

**Małgorzata:** One bucket fills a third of the trough. Not the whole pasture.
**Player:** So three trips. That's in the plan.
**Elżbieta:** Good. Plans ought to have the tiring part written in.

## Etap 3 — Zakończenia

### E1 — The trough at the fence
Warunek: `plan=trough`, koryto zbudowane (I) w miejscu poza drogą, napełnione pierwszy raz. Zapłata: Elżbieta daje graczowi **wełna ×3** albo **ser ×2** (z zapasów household), Małgorzata **15 c** z `treasury_V`.

**Elżbieta:** Close enough to help, far enough not to block anyone.
**Małgorzata:** And tomorrow you fill it.
**Elżbieta:** Tomorrow I fill it. The day after, you remind me.

Skutek: owce nie przechodzą przez plac (N: zmiana trasy zwierząt hodowlanych), codzienna praca Elżbiety rośnie.

### E2 — A well in the low field
Warunek: `plan=well`, `groundChecked`, zgoda osady (Małgorzata pyta na placu — scena krótka, N), materiały (kamień, belki, lina, wiadro) i ukończona budowa. Zapłata: **35–45 c** z `treasury_V` (to inwestycja osady, największa nagroda w tym queście) + opinia osady.

**Małgorzata:** It's everyone's now.
**Bogna:** Which means everyone gets a turn keeping it clean.
**Elżbieta:** I'll take the first week. For the sheep. They've been the most trouble.

Skutek: nowa studnia (I: obiekt), lista dyżurów (N); jeśli nikt jej nie pilnuje, zużywa się szybciej.

### E3 — The patient queue
Warunek: `plan=rota`, trzy dni kalendarza z przestrzeganym grafikiem (N: NPC respektują godziny). Zapłata: **10 c** z `treasury_V`.

**Elżbieta:** It works. When people keep to it.
**Małgorzata:** Which isn't the same as easy.
**Bogna:** I shouted at Kazimierz's lad twice. Best week I've had.

Skutek: brak budowy; po złamaniu grafiku problem może wrócić (quest otwiera się ponownie z wyborem `trough`/`well`).

## Odmowa, przerwanie, pominięcia

- Odmowa: bez kary; owce dalej chodzą na plac.
- Brak wody w strumieniu i studni (susza): budowa koryta wstrzymana, nie powstaje „suche koryto” jako sukces.
- Gracz zbuduje coś na drodze: Bogna każe to rozebrać (N), quest nie zamyka się.

## Mechaniki

I: studnia, koryto, wiadro, budowa, kopanie. N: grafik, zgoda osady na budowę wspólną, trasa zwierząt hodowlanych. **Do decyzji:** czy nowe studnie poza placem należą do v1 czy `SET-04`.
