# Narzędzia deweloperskie: Calibration Lab (pierwszy wycinek)

**Status:** draft  
**Model:** opus decides D-TOOLS-1 and the scope (draft); sonnet implements  
**Domain:** tools  
**Sub domains:** render, assets, debug  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (opcjonalnie przed/razem z falą 4)  
**Created:** 2026-09-30  
**Finished:** —

---

Źródło: [DEVELOPER-CALIBRATION-TOOLS.md](../DEVELOPER-CALIBRATION-TOOLS.md) (propozycja do rozważenia, nie wymóg).

## Ocena (sesja przygotowawcza 2026-09-30)

Warto zrobić **mały** pierwszy wycinek, bo fala 4 (warianty postaci, skala/tint zwierząt, broń w dłoni — znane ograniczenie „broń w dłoni niewidoczna”) wymaga powtarzalnej kalibracji wizualnej, a obecnie trzeba to robić w pełnej grze. Większe laby (Combat, AI/Simulation) — nie teraz; ich rolę pełnią testy vitest i `bench:sim`.

## Zakres pierwszego wycinka

- Trasa deweloperska `/?lab=assets` (albo osobny entry Vite), niedostępna w normalnym menu; w buildzie produkcyjnym może zostać, ale bez linku.
- **Asset/Character Lab**: te same loadery (`render/assets.ts`), te same materiały i `actors.ts`. Widok: model na siatce 1 m z referencyjną postacią 1.8 m, przełączanie modelu/animacji, podgląd wariantów CHAR-01 z danego seeda/id, oś pivota, bounding box, collider.
- **Equipment**: punkt zaczepienia broni w dłoni (kość, offset, rotacja) — wartości zapisywane w pliku danych w `src/game/data/`, a nie w labie.
- Zrzut ekranu przez skrypt `scripts/e2e/lab.mjs` (plansza wariantów) do przeglądu.

## Zasada

Żadnej równoległej implementacji renderu — lab to cienka scena wokół kodu produkcyjnego. Jeśli coś wymaga kopiowania logiki gry, to sygnał, żeby tę logikę wydzielić w grze.

## Decyzja

Do podjęcia przez sesję wykonującą falę 4: zrobić, jeśli kalibracja wariantów postaci/broni w pełnej grze okaże się wolna. Zapisać decyzję w DECISIONS (D-TOOLS-1).
