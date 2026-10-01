# NPC: handel z każdym, prezenty, towarzysze

**Status:** done  
**Domain:** npc  
**Sub domains:** trade, social, combat, ai  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 3)  
**Created:** 2026-09-30  
**Finished:** 2026-10-01

---

Źródło: [VISION-APPENDIX.md](../VISION-APPENDIX.md) — „Handel, prezenty i relacje”, „Towarzysze”.
FEATURES: `TRADE-02`, `SOC-01`, `COMP-01`, `COMP-02`, `COMP-03`.

## Stan wyjściowy (2026-09-30)

- Handel: `trade.ts` — NPC sprzedaje ze skrzyni domu (D-SIM-7); ceny zależą od `npc.opinion`, reputacji, ugodowości. Menu interakcji (`interact.ts`) ma opcje zależne od profesji — sprawdzić, czy handel jest dostępny dla każdego NPC.
- Relacja per NPC: `npc.opinion` (−100..100) — **to jest** „relacja” z dodatku; nie tworzyć równoległego systemu.
- Brak prezentów, preferencji, towarzyszy.

## Kroki

1. **TRADE-02** — handel dostępny u każdego NPC (asortyment = nadwyżki domu/ekwipunku osobistego, bez sprzedawania rzeczy niezbędnych do pracy); tryb „przekaż” (wymiana z zerową ceną) w tym samym panelu.
2. **SOC-01** — prezent: osobna akcja; wzrost `opinion` zależny od wartości, preferencji i osobowości (malejący przy spamowaniu — cooldown/dzienny limit). Preferencje NPC (`wants`: kategoria/przedmiot, np. konkretna broń), generowane deterministycznie z profesji i osobowości, ujawniane w dialogu.
3. **COMP-01** — najem: czas (dni kalendarza), cena, zadanie (towarzyszenie / ochrona / praca), poziom ryzyka wpływający na cenę i zgodę. Towarzysz podąża (formacja, LOD bliski), walczy, je/śpi (potrzeby dalej działają), wraca po wygaśnięciu kontraktu. Pieniądze: transfer 1:1 (bez mintu — por. game--002 B4).
4. **COMP-02** — darmowe dołączenie: szansa z reputacji, `opinion`, Big Five, sytuacji (rodzina, obowiązki, zdrowie). Bonus dla młodych mężczyzn bez rodziny. **Generator osad**: gwarancja ≥1 „starszego syna bez własnej rodziny” na osadę (zmiana generatora/newGame → `GEN_VERSION`/`SAVE_VERSION`). Wspólna podróż i walka powoli podnoszą `opinion`.
5. **COMP-03** — przekazanie broni/pancerza (prezent albo handel); NPC zakłada pancerz i **wybiera lepszą broń** (wspólna funkcja oceny broni — ta sama co przy auto-wyborze gracza z ui--001).

## Weryfikacja

vitest: dostępność handlu u losowego NPC, wpływ prezentu i limit, szansa dołączenia monotoniczna względem reputacji/opinion, towarzysz używa lepszej broni, kontrakt wygasa i NPC wraca; bilans pieniędzy. e2e: najem przez UI. Save/load kontraktu i stanu towarzysza.

## Wynik (2026-10-01)

Wszystkie kroki zrobione; TRADE-02, SOC-01, COMP-01/02/03 verified (`src/game/sim/appendix-npc.test.ts`, e2e acceptance krok 17). `SAVE_VERSION` 7.

1. **TRADE-02** — opcja „Trade” istniała już dla każdego NPC, ale asortyment był całym magazynem domu (także narzędzia pracy i ostatnie jedzenie). Teraz `tradeStock` (`sim/trade.ts`): paczka NPC + magazyn domu minus rezerwa (zestaw pracy profesji, 3 porcje jedzenia na członka, 1 bukłak/wiadro); dzieci handlują tylko z własnej paczki. Panel pokazuje ilość „do oddania”. Tryb „przekaż” = przycisk **Give** w kolumnie gracza (ta sama funkcja co prezent — D-NPC-1).
2. **SOC-01** — `sim/gifts.ts`: przyrost `opinion` = min(25, 1 + 4·log2(1 + wartość/5)) × preferencja (życzenie ×2, ta sama kategoria ×1,4) × (0,7 + 0,6·ugodowość) / (1 + prezenty dziś). Życzenia deterministyczne z profesji/roli i id (bez stanu w zapisie); spełnione życzenie przechodzi na następne. Ujawniane w rozmowie i w panelu prezentu (`GiftPanel.vue`).
3. **COMP-01** — `sim/npc/companions.ts` + `HirePanel.vue`: 1/3/7 dni, zadanie Escort/Protection, ryzyko low/medium/high (stawka ×1/×1,6/×2,6, zgoda: neurotyczność vs opinia, zachowanie w walce). Płatność z góry 1:1 do sakiewki NPC. Towarzysz idzie za graczem (cel `follow` sterowany bezpośrednio, formacja za plecami, bieg przy doganianiu), walczy z zagrożeniami gracza, je/pije/śpi (nocą obóz na miejscu). Kontrakt wygasa (`companionSystem`, co 2 s) → NPC wraca do zwykłego życia. Wspólna podróż +0,5 opinion/h (do 60), wspólne zabicie groźnego zwierzęcia +2.
4. **COMP-02** — `joinChance` z opinion, reputacji (uczciwość+sława+odwaga), Big Five i sytuacji (syn +0,3; głowa/małżonek −0,15; strażnik −0,3; choroba/krwawienie −0,3). Jedna odpowiedź dziennie. `Human.kin` (head/spouse/child/elder/son); `createNewGame` dodaje w każdej osadzie „starszego syna bez rodziny” osobnym strumieniem RNG (populacja jest w zapisie, nie w cache świata → bez bumpu `GEN_VERSION`, D-NPC-4).
5. **COMP-03** — wspólna ocena broni `weaponScore` (obrażenia × jakość × zużycie) dla NPC (`wieldBest`) i fallbacku gracza (`switchWeapon`); `wieldBest` zmienia broń także wtedy, gdy w ręku jest użyteczna, ale gorsza. Otrzymany pancerz zakładany, gdy lepszy w danym slocie (`wearBetterArmor`).

Uproszczenia / odłożone: zadanie „praca” towarzysza (wymaga projektu pracy na rzecz gracza) — D-NPC-3; brak zwrotu przy wcześniejszym zakończeniu kontraktu; maks. 3 towarzyszy; stare zapisy nie dostają syna (tylko wyprowadzenie `kin`).
