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

# Design: Questy (faza startowa) — po Round 2

Osiem wieloetapowych zadań (Domowice SM ↔ Brzeżyna, ~**1 dzień** drogi). Slugi ASCII: `grok-quest-NN-slug.md`.

## Budżet castingu

Quest-critical dorośli w **Domowicach** (max 5 reserved): Mira, Bogdan, Wojciech, Dobrawa, Jarosław.

| NPC / tag | Profesja | Questy |
|-----------|----------|--------|
| Mira | pasterz | 01 |
| Bogdan | kowal | 02 |
| Wojciech | strażnik | 03; świadek 01; motyw psa 07 |
| Dobrawa | zielarz | 04; opinia med. 08 |
| Jarosław | myśliwy | 07 |
| `sett.woodcutter` → Mirosław | drwal | 05 |
| `sett.trader` → Stanisław | handlarz | 06 |
| `sett.soltys` na rolniku → Radosław | sołtys | 08 |
| Anna / Halina+Marta / Maciej / Tomasz | non-lock | 02 / 03 / 04 / 08 |

**Brzeżyna:** Kazimierz (05, reserved); **Janko tylko 06** (centralny); Wanda role-tag (01 opc.); sołtys role-tag; Piotr wędrowny (01).

### Mutex drogi (`q.roadActive`)

Wspólna blokada — max 1 aktywny z: `{02 po etapie lokalnym, 04, 05, 06, 08 jeśli path oskarżenia}`.  
01 (trop lokalny/Piotr) i 03 (noc) oraz 07 (las lokalny) **nie** biorą `roadActive`, chyba że gracz sam idzie do Brzeżyny w 01 (Wanda) — wtedy flaguj.

## Mechanizmy v1

| Potrzeba | Required | Stub | Out of scope |
|----------|----------|------|--------------|
| Etapy/flagi | stage + bool/item | — | quest editor |
| Dialog | warunki + efekty `→` | — | |
| Letter | sealed\|opened | plotka delay 1d | fałszerstwo, napad |
| Assist 07 | one-shot przy norze | — | companion system |
| Ceny | `priceMod.grain`, `tradeFriction` | — | macierz dyplomacji |

## Indeks

| ID | Start | roadActive? |
|----|-------|-------------|
| 01 | d1–3 | nie (tak tylko gałąź Wanda) |
| 02 | Bogdan≥5 | tak od etapu 2 |
| 03 | noc lokalnie | nie |
| 04 | po 1. nocy; timer 2d | tak |
| 05 | po 1. wizycie Brzeżyny | tak |
| 06 | Stanisław≥10 / trade≥20 | tak |
| 07 | po 1. nocy | nie |
| 08 | uczciwość≥5 / Radosław≥10 | tylko path oskarżenia |
