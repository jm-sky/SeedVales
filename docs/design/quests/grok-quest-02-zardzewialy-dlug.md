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

# 02 — Zardzewiały dług

## Meta fabularna

| Pole | Wartość |
|------|---------|
| Poziom | Bogdan≥5 lub uczciwość Dom≥5 |
| Etapy | 3 |
| Osady | Domowice → Brzeżyna → Domowice |
| Giver | **Bogdan** reserved; Anna non-lock |
| Inni | rolnik z lemieszem; **sołtys Brzeżyny / skarbiec** (dłużnik); **bez Janka** |
| roadActive | od etapu 2 |
| Inspiracja | FO2 / Skyrim delivery twist |

## Prawda

Cena rynkowa ~30. Bogdan żądał 40. Rolnik wpłacił **35 do skarbca Brzeżyny**. Wypłata do Bogdana zablokowana przez sołtysa („jakość”).

## Etapy

### Etap 1 → 2

`heardHome=true`; opc. `annaHint=true`.

> Bogdan: „Czterdzieści. Ustnie. Albo zapłata, albo lemiesz.”
>
> A: „Idę z wagą, nie z młotem.” → Bogdan+5; `stage=2`.  
> B: „Daj znak rozpoznawczy lemiesza.” → item `plowshare_mark`; `stage=2`.  
> C: „Anna mówi, że zawyżyłeś.” → `annaHint=true`; Bogdan przyznaje „może o dziesięć”; `stage=2`.

### Etap 2 — Brzeżyna (wykluczające `deal`)

Dowody: rolnik (35→skarbiec); zapis sołtysa; (brudne) nacisk −uczciwość.

| ID | Werdykt | from → to | if_empty | grain |
|----|---------|-----------|----------|-------|
| U | Ugoda 30 | `treasury_brzezyna` 30 → Bogdan | partial + `iou30` flag | — |
| B | 40 dla Bogdana | `treasury_brzezyna` 35 + `soltys_purse` 5 → Bogdan | zatrzymaj na posiadanym; Bogdan przyjmuje min 35 z grudą | — |
| R | Odzysk lemiesza | item wraca do Bogdana | — | — |
| S | Strona Brzeżyny: Bogdan bierze **25 m + grain×6** | `treasury_brzezyna` 25 → Bogdan; `from: player` grain×6 → Bogdan (player kupuje/`if_empty` nie da się domknąć S) | treasury partial; bez grain = S zablokowane | grain×6 wymagane |

`deal=U|B|R|S`; `stage=3`.

### Etap 3 — powrót

| deal | Gracz | Rep | Relacje |
|------|-------|-----|---------|
| U | `from: bogdan_purse` 10 (`if_empty: 0` + 1× craft-rabat nóż) | uczciwość+8 obu | Bogdan+15, sołtys+10 |
| B | `from: bogdan_purse` 15 (`if_empty: 0`) | odwaga Dom+5; uczciwość Brzeż−5 | Bogdan+25, sołtys−15 |
| R | `from: bogdan_purse` 20 (`if_empty: treasury_home` max 15) | renown+5 | rolnik−20 |
| S | bread×3 `from: bogdan` (item) | uczynność Brzeż+5 | Bogdan+10 jeśli annaHint else +5 |

## Mechanizm

- **Required:** treasury transfer, mark item, deal flags, grain gate na S.  
- **Stub:** zapis skarbca = dialog.  
- **Out of scope:** Janko, pełna księgowość.
