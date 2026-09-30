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

# 08 — Studnia i plotka

## Meta fabularna

| Pole | Wartość |
|------|---------|
| Giver | **Radosław** sołtys-na-rolniku |
| Tomasz | rolnik, household przy placu |
| Setup authored | `spoiledBarrel=true`; `sickCount≥2` |
| roadActive | tylko przy oskarżeniu Brzeżyny |
| Flaga tarcia | `tradeFriction` (= cold war v1) |

## Etapy

### Etap 1 → 2 — zeznania (`clues`)

Chorzy + wspólna beczka; Dobrawa (zepsucie); Tomasz bez dowodu.

### Etap 2 → 3 — badanie (`proof`)

| Wynik | proof |
|-------|-------|
| studnia OK, beczka zła | `barrel` |
| pominięte badanie | `none` |
| podrzucony dowód | `false` (uczciwość−−) |

### Etap 3 — Brzeżyna opcjonalnie

Tylko `accuse=true` (gracz idzie oskarżać). Inaczej skip.

### Etap 4 — domknięcie (gated)

| Wejście | Dozwolone path | Payout |
|---------|----------------|--------|
| `proof=barrel` + gracz mówi prawdę | **truth** (default) lub **mediation** (Tomasz wycofuje się bez publicznego wstydu) | truth: `from: treasury_home` 35 (`if_empty: partial`) + opc. bandage×2 Dobrawa; uczciwość+15; Radosław+30; Tomasz−20. mediation: `from: treasury_home` 20 (`if_empty: partial`); uczynność+12; wszyscy ~+10 |
| `proof=none` + accuse | **cold** (`tradeFriction`) lub powrót zbadać | cold: `from: tomasz_purse` 10 (`if_empty: 0`); uczciwość−20 |
| `proof=false` | **frame** only | `from: treasury_home` 25 (`if_empty: partial`); uczciwość−40; badge neg. stub; `tradeFriction` |
| `proof=barrel` + accuse mimo dowodu | cold z karą uczciwość−10 extra | jak cold |

> Radosław: „Studnia to nie tylko woda. To spokój. Jak spokój się przewróci, nawet czysta woda będzie gorzka.”
>
> A: „Dostaniesz fakty z magazynu, nie krzyk z placu.” → `stance=facts`; Radosław+5; pcha do badania beczki.  
> B: „Tomasz przeprosi — albo tydzień z wiadrem.” → `stance=mediate`; odblokowuje mediation gdy `proof=barrel`.  
> C: „Możemy przestraszyć Brzeżynę bez dowodu.” → `stance=fear`; Radosław−5; odblokowuje accuse/cold; test moralny.

## Mechanizm

- **Required:** authored barrel/sick; proof gate; named treasury; `tradeFriction`.  
- **Stub:** badge.  
- **Out of scope:** UI placu, macierz dyplomacji.
