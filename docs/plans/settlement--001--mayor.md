# Osada: gracz jako burmistrz

**Status:** draft  
**Domain:** settlement  
**Sub domains:** reputation, npc, build  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 5)  
**Created:** 2026-09-30  
**Finished:** —

---

Źródło: [VISION-APPENDIX.md](../VISION-APPENDIX.md) — „Burmistrz i zarządzanie osadą”.
FEATURES: `SET-05`.

## Zależności

- SET-04 (rozwój/upadek osad) jest `deferred` — bez mechaniki rozbudowy osady burmistrz nie ma o czym decydować. Najpierw minimalna rozbudowa: kolejka projektów osady (np. nowy dom, naprawa, studnia, zagroda) realizowana przez NPC z zasobów magazynu.
- Reputacja (REP-01..04) i `npc.opinion` (relacje) już istnieją.

## Szkic

1. Rola `headman` (sołtys/burmistrz) w osadzie — jeśli nie istnieje, dodać w newGame.
2. Warunek: reputacja w osadzie ≥ próg we wszystkich/wybranych wymiarach + średnia `opinion` mieszkańców ≥ próg → propozycja objęcia urzędu (dialog). Dotychczasowy burmistrz → zastępca.
3. Uprawnienia: wybór priorytetów kolejki projektów, przydział budowy, (później) podatki/ceny magazynu.
4. Utrata urzędu przy spadku reputacji.

Doprecyzować przed realizacją (status `draft`): zakres uprawnień w v2, czy wymaga SET-04 w pełnym zakresie.
