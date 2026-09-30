---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
provider_reviews:
  - round: 1
    by: executor (critical narrative/systems)
    result: revise-heavy — applied
  - round: 2
    by: executor (critical narrative/systems)
    result: revise-light — applied
  - round: 3
    by: executor (critical narrative/systems)
    result: revise-light — two econ fixes applied; pass-with-nits
status: pass-with-nits
lang: pl
---

# 06 — List handlarza

## Meta fabularna

| Pole | Wartość |
|------|---------|
| Giver | Stanisław (`sett.trader`) |
| Odbiorca | **Janko** — jedyna centralna rola Janka w paczce |
| roadActive | tak |

## Etapy

### Etap 1 → 2 (`intent`)

Item `letter_stanislaw` `sealed`.

> Stanisław: „Pieczęć jest dla głupców i dla lojalnych. Ty zdecyduj w drodze — tylko nie wracaj z miną, której nie umiesz nosić.”
>
> A: „Dojdzie zamknięty. Nie zdejmę wosku.” → `intent=loyal`; `stage=2`.  
> B: „Dojdzie. Zastrzegam sobie prawo otworzyć, jeśli droga zawonie oszustwem.” → `intent=open`; `stage=2`.  
> C: „Nie jestem posłańcem zmów.” → odmowa; quest locked do rel+10.

*(intent wpływa na dialog Janka przy opened_silent vs loyal sealed — nie jest pusty.)*

### Etap 2 — decyzja o pieczęci (wykluczające)

| ID | Akcja | Wymaga |
|----|-------|--------|
| S | deliver sealed | — |
| O | open + deliver silent | — ; jeśli `intent=loyal` → Stanisław−10 gdy się dowie (plotka) |
| W | open + ostrzeż Janka | — |
| N | open + donos sołtysom | — |

Plotka `opened_silent`: po **1 dniu** od dostawy, jeśli gracz nie wybrał W/N — rumor tick nawet bez rozmowy.

### Etap 3

| Path | Świat | Payout | Rel/rep |
|------|-------|--------|---------|
| S | `priceMod.grain` 1 sezon | `from: stanislaw_purse` 40 (`if_empty: 0` / partial z portfela — **nigdy** `treasury_home`) | Stanisław+25; uczciwość−10 po plotce ≥1d |
| O | j.w. | j.w. (też tylko `stanislaw_purse`) | Janko napięcie+; jeśli intent=loyal i plotka: Stanisław−10 extra |
| W | brak zmowy | `from: janko_purse` 15 (`if_empty: 0`) + opc. `treasury_brzezyna` 20 za spokój | Janko+20, Stanisław−30 |
| N | zmowa zabita | `from: treasury_home` 10 + `treasury_brzezyna` 10 (`if_empty: partial`) | uczciwość+15 obu, renown+8; handlarze− |

**Powrót (W/N) — każda linia z efektem:**

> Stanisław: „Myślałem, że rozumiesz interes. Interes to nie złodziejstwo — to oddychanie w jednym rytmie.”
>
> A: „Oddychanie kosztem oraczy to podatek bez prawa.” → Stanisław−5; uczciwość Dom+5 (public stance).  
> B: „Nie dawaj pieczęci, której sam nie szanujesz.” → Stanisław−10; odblokuj przyszły odmowa listów.  
> C: „Za milczenie następnym razem policzę drożej.” → `greyHook=true`; Stanisław+5 szary; uczciwość−5.

## Mechanizm

- **Required:** sealed/opened, 4 paths, intent flag, priceMod, rumor 1d.  
- **Stub:** rumor auto-tick.  
- **Out of scope:** fałszerstwo, napad.
