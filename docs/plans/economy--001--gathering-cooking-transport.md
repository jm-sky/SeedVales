# Pozyskiwanie, gotowanie przy ognisku, transport ciężkich surowców

**Status:** in_progress  
**Domain:** economy  
**Sub domains:** resources, crafting, food, items, build  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 3)  
**Created:** 2026-09-30  
**Finished:** —

---

Źródło: [VISION-APPENDIX.md](../VISION-APPENDIX.md) — „Pozyskiwanie surowców i transport”, „Gotowanie przy ognisku”.
FEATURES: `RES-07`, `FOOD-03`, `TRANS-01`.

## Stan wyjściowy (2026-09-30)

- Ścięte drzewo zostawia pień i odrasta (`actions.ts`, `vegetation.ts` — D-WORLD-5). Kilof na `rock` istnieje (`actions.ts`, RES-02). → RES-07 to głównie **weryfikacja widoczności** (pień w renderze, fragmenty skały) + ewentualnie duże głazy → mniejsze kawałki (węzły wieloetapowe).
- Pieczenie mięsa istnieje (FOOD-02: pieczone psuje się wolniej); brak pojemności ogniska, patelni, rusztu i parametrów pochodzenia produktu.
- Brak taczek/wózków.

## Kroki

1. **RES-07** — test + screenshot: pień po ścięciu jest widoczny i trwały (save/load, powrót do obszaru); duży głaz → N kawałków skały → kamienie (parametry w `data/`).
2. **FOOD-03** — slot-based gotowanie: ognisko = 1 kawałek, z patelnią/naczyniem = 2, z rusztem (nowa budowla/rekwizyt przy ognisku) = np. 4–6. Czas pieczenia liczony w **kalendarzu** (to produkcja, nie akcja gameplayowa — zgodnie z podziałem domen czasu w CLAUDE.md); zapisać w DECISIONS. Produkt dziedziczy `meta`: gatunek zwierzęcia, świeżość (z uwzględnieniem świeżości surowca). Rozszerzyć `ItemStack.meta` tak, by stackowanie nie mieszało gatunków/świeżości (lub ważona średnia świeżości — decyzja w DECISIONS).
3. **TRANS-01** — taczka i wózek ręczny: przedmiot/pojazd pchany przez gracza, zwiększa udźwig dla kategorii „ciężkie” (drewno, kamień, ruda), spowalnia ruch, nie wjeżdża na strome zbocza/wodę. Wózek pod osła/konia → zależny od zwierząt pociągowych i WORLD-09 (jazda konna, `deferred`) — tylko jako `later` w FEATURES, chyba że zostanie czas.
4. NPC: drwale/górnicy mogą korzystać z taczek (opcjonalnie, po graczu).

## Weryfikacja

vitest reguł (pojemność ogniska, dziedziczenie meta, udźwig z taczką), save/load nowych pól, e2e: pieczenie przez UI (desktop + mobile).

## Wynik

- **Krok 1 (RES-07) — done (2026-09-30):** pień istniał (stan `felled` w zapisie, render `far:stump`) — dodany test trwałości. Nowe: głazy (`scale ≥ ROCK.boulderScale`) przy każdym uderzeniu kilofem odłupują „Odłamek skały” (12 kg) obok skały; odłamek rozbija się kilofem na 4 kamienie (opcja w menu interakcji, aktywność 4 s). Mniejsze skały dają kamienie bezpośrednio. Wydobywana skała maleje w renderze. Test `appendix-economy.test.ts`, e2e acceptance krok 14.
- **Krok 2 (FOOD-03) — done (2026-09-30):** `sim/cooking.ts`, opcja „Piecz mięso (n/N)” przy ognisku; pojemność 1 / 2 (patelnia, kociołek) / 5 (ruszt — nowa budowla); czas w kalendarzu (D-FOOD-3); produkt dziedziczy gatunek i względną świeżość (`ItemStack.sp`). Receptura `cook_meat` usunięta z wytwarzania. Test + e2e acceptance krok 15.
- Pozostało: krok 3 (TRANS-01 taczka/wózek ręczny), krok 4 (opcjonalnie NPC z taczką).
