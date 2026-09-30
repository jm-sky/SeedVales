# Review 003 — fala 1 dodatku (`sim--001`)

**Data:** 2026-09-30
**Zakres:** `git diff d3a31e2..40d243b -- src` (kadencja decyzji AI z wymuszonymi reakcjami, strach dzikich zwierząt, ucieczka zwierząt domowych, jedzenie padliny, ślady krwi, szczury przypisane do gniazda, `SAVE_VERSION` 5)
**Recenzent:** niezależny subagent (nie implementował ocenianego kodu), izolowany worktree, tylko odczyt; dwa ustalenia odtworzone tymczasowym testem vitest (usuniętym).
**Metoda:** lektura diffu, `pnpm test` (appendix 9/9), `check-layers` OK, reprodukcje vitest.

## Ustalenia i rozstrzygnięcie

| # | Waga | Ustalenie | Rozstrzygnięcie |
|---|---|---|---|
| 1 | Medium (potw.) | `protective()` — każdy gatunek z obrażeniami > 0 przy własnym legowisku (sarna, jeleń, lis) szarżował na ludzi zamiast uciekać | **Poprawione, D-SIM-13:** legowiska bronią tylko drapieżniki/agresywne; ofiary bronią młodych tylko z bliska (`FEAR.preyDefendM` 6 m). Testy FAUNA-07 (protective) rozszerzone |
| 2 | Medium (potw.) | Zwierzęta domowe ignorowały polującego lisa (temperament `prey`, ale `preys: chicken`) | **Poprawione:** zagrożeniem jest też gatunek, który na nie poluje. Test FAUNA-06 (kura vs lis) |
| 3 | Low-Medium (prawd.) | Drapieżnik spłoszony przez człowieka/zagrodę od razu planował ten sam `hunt`/`scavenge` i wracał | **Poprawione:** ucieczka ze strachu nakłada cooldown przerwanego celu (`FEAR.suppressS` 45 s). Test „review 003 #3” |
| 4 | Low (prawd.) | Drapieżniki wracały do tego samego śladu krwi przez cały czas jego zanikania | **Poprawione:** `ai.sniffedTrace` — ostatnio zbadany ślad jest pomijany |
| 5 | Low (potw.) | `detectRange` używał stałych godzin nocy zamiast sezonowego `isNight` | **Poprawione** (`isNight(cal)`) |
| 6 | Low (potw.) | Szczury ze starych zapisów (v4) bez `denId` — gniazdo mogło odrodzić dodatkowy komplet, zadanie liczyło tylko 20 m | **Poprawione:** migracja 4→5 przypisuje szczury w promieniu 40 m do gniazda. Test SAVE-01 (v4→v5) |
| 7 | Low (potw.) | Wściekłe zwierzę losowało atak 5% raz na decyzję (~1 s) zamiast co update (~0,1 s) → ~10× rzadziej | **Poprawione:** szansa 40% na decyzję |
| 8 | Info | Ranione zwierzę domowe zawsze ucieka do domu (wcześniej 30% kontratak) | Zgodne z FAUNA-06 — bez zmian |
| 9 | Info | `protective()` przeszukiwał listę legowisk także dla szczurów (`nest:*`) | **Poprawione** (pomijane `nest:*`) |

## Sprawdzone bez uwag

Determinizm (tylko `sim.rng`), domeny czasu (ślady zanikają w godzinach kalendarza, decyzje/ucieczki w sekundach rozgrywki, ruch bez ×24), zapytania przestrzenne w systemach per-tick, zapis `traces`/`decideAt`/`denId`, limity śladów (300, scalanie 1,5 m), brak pętli w wymuszonych reakcjach (`alertAround` tylko zeruje `decideAt`), warstwy.
