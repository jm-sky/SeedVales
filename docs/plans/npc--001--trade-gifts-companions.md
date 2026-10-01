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

All steps done; TRADE-02, SOC-01, COMP-01/02/03 verified (`src/game/sim/appendix-npc.test.ts`, e2e acceptance step 17). `SAVE_VERSION` 7.

1. **TRADE-02** — "Trade" was already offered for every NPC, but the stock was the whole household store (work tools and the last food included). Now `tradeStock` (`sim/trade.ts`): NPC pack + household store minus a reserve (profession kit, 3 food portions per member, one waterskin/bucket); children trade from their own pack only. The panel shows the quantity the NPC is willing to sell. "Hand over" = **Give** button in the player's column (same function as a gift, D-NPC-1).
2. **SOC-01** — `sim/gifts.ts`: opinion gain = min(25, 1 + 4·log2(1 + value/5)) × preference (wish ×2, same category ×1.4) × (0.7 + 0.6·agreeableness) / (1 + gifts today). Wishes are deterministic from profession/role and id (no saved state); a fulfilled wish moves on. Revealed in conversation and in the gift panel (`GiftPanel.vue`).
3. **COMP-01** — `sim/npc/companions.ts` + `HirePanel.vue`: 1/3/7 days, task Escort/Protection, risk low/medium/high (wage ×1/×1.6/×2.6; consent: neuroticism vs opinion; combat stance). Paid up front 1:1 into the NPC's purse. The companion follows (direct `follow` goal, formation behind the player, runs to catch up), fights threats to the player, eats/drinks/sleeps (camps away from home). The contract expires (`companionSystem`, every 2 s) and the NPC returns to normal life. Travelling together +0.5 opinion/h (up to 60), a dangerous animal killed together +2.
4. **COMP-02** — `joinChance` from opinion, reputation (honesty + renown + courage), Big Five and situation (son +0.3; head/spouse −0.15; guard −0.3; illness/bleeding −0.3). One answer per day. `Human.kin` (head/spouse/child/elder/son); `createNewGame` adds a grown son without a family to every settlement on a separate RNG stream (the population is saved, not part of the world cache → no `GEN_VERSION` bump, D-NPC-4).
5. **COMP-03** — shared `weaponScore` (damage × quality × wear) for NPCs (`wieldBest`) and the player's fallback (`switchWeapon`); `wieldBest` now also swaps a usable but worse weapon. Received armour is worn when better for its slot (`wearBetterArmor`).

Simplifications / deferred: the companion "work" task (needs a design for working on the player's behalf) — D-NPC-3; no refund when a contract is ended early; max 3 companions; old saves get no son (only `kin` is derived).
