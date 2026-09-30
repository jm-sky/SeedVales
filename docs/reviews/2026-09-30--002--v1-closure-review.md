# Review 002 — domknięcie v1 (etap 0)

**Data:** 2026-09-30
**Zakres:** `git diff 7ac3134..8e891fc -- src scripts` (plany `game--002`, `diag--001`, RES-04)
**Recenzent:** niezależny subagent (nie implementował ocenianego kodu); tryb tylko do odczytu, reprodukcje w tymczasowych testach usuniętych po uruchomieniu.
**Metoda recenzenta:** lektura diffu, `pnpm test` 87/87, `pnpm type-check`, `check-layers`, reprodukcje vitest, symulacja 10 dni (seed 1337), 40 dodatkowych seedów generatora.

## Ustalenia i rozstrzygnięcie

| # | Waga | Ustalenie (potwierdzone przez recenzenta) | Rozstrzygnięcie |
|---|---|---|---|
| 1 | Medium | `wieldBest(h, 'ranged')` po walce dawał pasterzowi procę bez strzał (zamiast kija) — pasterz „strzelał” bez efektu i nie podchodził do wilka | **Poprawione.** Po walce broń nie jest zmieniana; `wieldBest` (przeniesione do `inventory.ts`) wybiera broń dystansową tylko z pasującą amunicją. Test „NPC-04: a fight ends with a usable weapon” |
| 2 | Medium | Myśliwy mógł zostać z nożem (walka kończona przez `failGoal`/replan) → `shoot` zawsze `false` → brak polowań | **Poprawione.** Akt `shoot` sam dobiera łuk (i strzały ze skrzyni) przed strzałem. Test jw. |
| 3 | Medium | Zwłoki szczura: `addCorpse` + `state.corpses.pop()` → „duch” w indeksie przestrzennym, cel „Zwłoki: Szczur” | **Poprawione.** Szczur nie tworzy zwłok. Test „COMBAT-03: a killed rat leaves no (ghost) corpse” |
| 4 | Medium | Zamówienia bez szans realizacji (miecz wymaga skóry, której kowal nie ma; żelazo zużywane na inne narzędzia), brak anulowania → utracona zaliczka | **Poprawione.** Materiały rezerwowane przy zamówieniu (`Order.reserved`), zamówić można tylko receptury, na które kowal ma materiały (`canOrder`, UI: „brak materiałów”), `cancelOrder` zwraca zaliczkę (z sakiewki kowala) i materiały. Testy CRAFT-02 (2) + e2e 4e (zamówienie i anulowanie przez UI) |
| 5 | Medium (balans) | Opłata karawany ze skarbca odwiedzanej osady → osada domowa gracza pusta po ~14 dniach, nagrody za zadania = 0 | **Poprawione, decyzja D-ECON-3:** karawanie płaci jej własna osada; dzienny podatek 3% od sakiewek NPC ponad 20 m wraca do skarbca. Symulacja 10 dni: skarbce SM 150→246, MD 300→354, LG 600→739, suma pieniędzy stała. Test „treasuries are not drained by caravans over 6 days” |
| 6 | Medium | Pasterz nie miał wiadra — napełnianie koryta zawsze się nie udawało; test to maskował (dodawał wiadro) | **Poprawione.** Wiadro w zestawie pasterza; test bez ręcznego dodawania |
| 7 | Low | Test migracji: asercja skarbca przechodziła pusto (stan miał już `treasury`) | **Poprawione** (`delete s.treasury` przed `migrate`) |
| 8 | Low | Backfill `meta` (IDB v1→v2) bez `genVersion` → stare zapisy nieoznaczone w menu | **Poprawione.** Backfill czyta `genVersion` z JSON (0 = nieznany); menu traktuje brak/niezgodność jako niezgodne. Stare wpisy cache świata (`seed:v5`) — **odłożone** (sprzątanie cache przy `ui--001`: zapisy/ustawienia) |
| 9 | Low | Objazd wyłączał się, gdy aktor dotykał ściany (`inside` z marginesem > strefa kolizji) | **Poprawione** (budynek pomijany tylko, gdy aktor jest rzeczywiście wewnątrz: `radius − 0.05`) |
| 10 | Low | `transferToStorage`: kara reputacji/kradzież przed sprawdzeniem udźwigu; `collectOrder` bez `fitQty` | **Poprawione** (najpierw udźwig; odbiór zamówienia wymaga miejsca) |
| — | uwaga | Limit pościgu 40 s nie resetował się po dopadnięciu ofiary | **Poprawione** (reset tylko przy realnym kontakcie ≤ zasięg ataku + 0.5 m; test FAUNA-02 nadal przechodzi) |
| — | uwaga | Test ECON-01 (konserwacja) nie sprawdzał, że karawana handlowała | **Poprawione** (asercja `economy.caravanTrades > 0`, okno 3 dni — odjazdy w parzyste dni 07–10) |

## Sprawdzone bez uwag (wg recenzenta)

Konserwacja pieniędzy (jedyne źródło zewnętrzne: monety z kopania), brak ujemnych skarbców, spójność indeksów `Sim` po wczytaniu i mutacjach, zapis nowych pól, determinizm `centres.ts` (40 seedów w paśmie), `placeNear` (ta sama funkcja `free()`), domeny czasu (brak mnożenia ruchu przez kalendarz), brak trwałego zawieszenia wyprawy karawany, śmierć/ochrona powalonego NPC, ograniczony pościg.

## Werdykt recenzenta

Brak blokerów dla v1; zalecane przed ogłoszeniem: #1, #2, #3, #6 (zrobione), #4 (zrobione), decyzja w #5 (zrobione, D-ECON-3). Po poprawkach: `pnpm check` 91/91, e2e 3/3 + 16/16 + 7/7.
