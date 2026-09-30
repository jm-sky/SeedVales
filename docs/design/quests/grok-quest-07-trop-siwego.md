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

# 07 — Trop Siwego

## Meta fabularna

| Pole | Wartość |
|------|---------|
| Giver | **Jarosław** reserved |
| roadActive | nie |
| Assist | one-shot przy norze jeśli wybrano „razem” — nie companion system |
| Poison gate | `q04.status=done` **oraz** Dobrawa≥10 **oraz** not `q04.active`; inaczej P niedostępne |

## Etapy

### Etap 1 → 2 (tropy≥2)

Sierść u Wojciecha; wycie/marker; nora questowa.

### Etap 2 — metoda (wykluczające)

| ID | Metoda |
|----|--------|
| H | walka / łuk (±assist) |
| T | pułapka (traps) |
| N | non-lethal (hałas+ogień) — Siwy **odchodzi** na sezon |
| P | trucizna (gate 04) — Jarosław−15 jeśli wie |

> Jarosław: „Watahę odpędzicie hałasem. Siwy wraca pod drzwi. Zostawia trop jak podpis.”
>
> A: „Spotkaj mnie przy norze o świcie.” → `assist=true`; `stage=2` gotowe.  
> B: „Idę sam.” → `assist=false`.  
> C: „Jeśli odejdzie bez krwi — też domknę drzwi.” → odblokuj N.

### Etap 3 — payout (pełna tabela)

| Path | Payout | Item | Rep | Relacja |
|------|--------|------|-----|---------|
| H | `from: treasury_home` 30 (`if_empty: jaroslaw_purse` max 20) | grey_pelt | odwaga+10, renown+6 | Jarosław+30, Wojciech+15 |
| T | `from: treasury_home` 28 (`if_empty: jaroslaw_purse` max 18) | grey_pelt | odwaga+8, renown+6 | Jarosław+25 (ceni czystość) |
| N | `from: treasury_home` 15 (`if_empty: jaroslaw_purse` max 10) | — | uczynność+5 | Jarosław+10 |
| P | `from: treasury_home` 20 (`if_empty: jaroslaw_purse` max 15) | — | uczciwość−5 jeśli wieść | Jarosław−15 |

## Mechanizm

- **Required:** wolf_grey, den, assist one-shot, pełne payouty H/T/N/P, poison gate.  
- **Stub:** Wanda hint.  
- **Out of scope:** companion system.
