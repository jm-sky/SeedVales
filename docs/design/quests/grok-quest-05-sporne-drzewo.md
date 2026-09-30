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

# 05 — Sporne drzewo

## Meta fabularna

| Pole | Wartość |
|------|---------|
| Poziom | po 1. wizycie Brzeżyny |
| roadActive | tak |
| Giver | Mirosław (`sett.woodcutter`) |
| Antagonist | **Kazimierz** reserved |
| Świadek | Wanda lub farmer Brzeżyny |
| Bez | Janko, build mostu |

## Etapy

### Etap 1 → 2 (dowody≥2)

Znak w korze; **kamień graniczny** (find); świadek pastwiska; wiek dębu (Survival).

### Etap 2 → 3 (`deal`)

| ID | Werdykt |
|----|---------|
| peace | dąb zostaje; obie strony ścinają po 2 drzewa niegraniczne |
| home / brz | wyrok jednostronny |
| theft | nocne ścięcie |

**Peace work (Required lekkie):** 1 sesja ~10–15 min / lub 1h kalendarza skrócona; skill woodcutting pomaga; fail-forward: mniejszy payout (−5 m) ale deal stoi. *(Stub: pominąć minigame → auto-sukces z log×1.)*

> Kazimierz: „Ludzie z Domowic mają krótką pamięć i długie siekiery. Ten dąb pamięta dłużej niż wasze protokoły.”
>
> A: „Pokaż znak na kamieniu, nie na gniewie.” → `askedStone=true`; Kazimierz+5 jeśli gracz ma już find kamienia.  
> B: „W korze jest też nasz ząb. To spór, nie świętość.” → `framedAsDispute=true`; odblokowuje peace w dialogu sołtysa.  
> C: „Zostawmy dąb. Belki z drzew, które nie pilnują miedzy.” → `deal=peace` jeśli dowody≥2; inaczej Kazimierz: „Najpierw dowody.”

### Etap 3

| deal | Payout | Rep | Relacje |
|------|--------|-----|---------|
| peace | `from: treasury_home` 15 + `from: treasury_brzezyna` 15 (`if_empty: partial`) + log×1/strona | uczynność+10 obu | obu +20 |
| home | `from: treasury_home` 20 (`if_empty: partial`) | uczciwość Dom+5 / Brzeż−5 | Mirosław+25, Kazimierz−25 |
| brz | `from: treasury_brzezyna` 20 (`if_empty: partial`) | uczciwość Brzeż+5 / Dom−5 | Kazimierz+25, Mirosław−25 |
| theft | log×4 | uczciwość−20 obu | −30; `priceMod.wood`↑ |

## Mechanizm

- **Required:** markery, deal, treasury named.  
- **Stub:** work session auto.  
- **Out of scope:** build mostu, Janko.
