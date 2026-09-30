# Pozyskiwanie, gotowanie przy ognisku, transport ciężkich surowców

**Status:** planned  
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
