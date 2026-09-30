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

# 03 — Nocne pochodnie

## Meta fabularna

| Pole | Wartość |
|------|---------|
| Poziom | noc 1–3 lokalnie |
| Etapy | 3 |
| Giver | **Wojciech** reserved |
| Inni | Halina; Marta (matka) — non-lock |
| Soft-link | strach po psie Szariku (jedyny wilczy soft-link obok 07) |
| Ban | brak opcji ataku na Halinę |
| roadActive | nie |

## Etapy

### Etap 1 → 2 (`caughtHow` = watch|sneak|morning)

Jedna gałąź: warta z Wojciechem / Sneak / trop rano (+Marta).

### Etap 2 → 3 (`childPath`)

| ID | Wybór | Natychmiast |
|----|-------|-------------|
| E | Empatia + wspólnie do Wojciecha | Halina+25, Marta+10; `childPath=empathy` |
| T | Naucz (sam Wojciech tłumaczy drapieżniki przy pochodni — **bez Jarosława**) | Halina+15; `childPath=teach` |
| D | Donos publiczny | Halina−30, Marta−15, Wojciech+10; `report` |
| X | Szantaż Marty | `from: marta_purse` 10 (`if_empty: 0`); uczciwość−25; `extort` |

> Halina: „Jak jasno, to widać nas z lasu. Jak ciemno — może nas nie znajdą. Tak mówiłam Szarikowi… zanim go nie stało.”
>
> A: „Wilk i tak widzi. Światło bardziej jemu wadzi.” → `teach`.  
> B: „Pójdziemy do Wojciecha we dwoje. Ja mówię pierwsze słowo.” → `empathy`.  
> C: „Powiem Strażnikowi sam.” → `report`.  
> D: *(Marta)* „Dziesięć miedziaków — i milczę.” → `extort`.

### Etap 3 — domknięcie **różne** per path

| childPath | Świat | Payout |
|-----------|-------|--------|
| empathy | Wojciech skraca odstępy pochodni; gracz dokłada torch×2 (`from: player` lub `treasury_home` max 2 szt. jeśli ma stock) | `from: treasury_home` 20 (`if_empty: partial`); uczynność+12, uczciwość+5; Wojciech+20 |
| teach | jak empathy, ale **bez** dopłaty torch z treasury (gracz musi mieć własne ×1); Halina dostaje „dyżur dzienny” przy tablicy 1 dzień | `from: treasury_home` 15 (`if_empty: partial`); uczynność+8, uczciwość+8; Wojciech+15 |
| report | Halina zakaz nocy 3 dni; pochodnie bez zmian | `from: treasury_home` 25 (`if_empty: partial`); uczciwość+10, uczynność−5 |
| extort | problem wraca → Wojciech kończy sam / expire | 10 m już wzięte; Wojciech−10; `done` brudny |

## Mechanizm

- **Required:** night lub morning beat; childPath; torch.  
- **Stub:** teach = dialog Wojciecha.  
- **Out of scope:** patrol AI, Jarosław w 03.
