# NPC: handel z każdym, prezenty, towarzysze

**Status:** planned  
**Domain:** npc  
**Sub domains:** trade, social, combat, ai  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 3)  
**Created:** 2026-09-30  
**Finished:** —

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
