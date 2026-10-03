# Osada: gracz jako burmistrz

**Status:** in_progress  
**Model:** opus — vision-level design still open (draft, depends on deferred SET-04)  
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

## Result (session 14, 2026-10-03, Sonnet) — minimal slice

Decision (D-SET-1, Sonnet default, Opus/user to confirm): do not wait for SET-04; ship the office itself with the one power that exists today, the **tax rate**. `sim/mayor.ts`: `headmanId` per settlement (an elder, else a household head; set in `createNewGame`), eligibility = honesty ≥ 30 and helpfulness ≥ 30 in that settlement and residents' mean opinion ≥ 20; the headman's interaction menu offers "Ask about leading the settlement" (disabled with the missing standing as the reason); accepting makes the headman the **deputy** (`deputyId`) and the player `playerMayor`; the deputy's menu has "Tax rate" (low 0.5× / normal / high 1.6× the daily tax, high taxes cost 0.4 opinion per resident per day); office is lost when honesty or helpfulness fall below −5 or the mean opinion turns negative (deputy becomes headman again). Saved: optional `SettlementState` fields (no extra `SAVE_VERSION` bump, unreleased). Tests: `mayor.test.ts`. **Not done (needs SET-04):** project queue/building priorities, warehouse prices, a dedicated mayor panel, e2e. ❓ user: thresholds and powers.
