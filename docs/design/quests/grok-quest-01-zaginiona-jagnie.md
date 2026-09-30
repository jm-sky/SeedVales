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

# 01 — Zaginiona jagnię

## Meta fabularna

| Pole | Wartość |
|------|---------|
| Poziom | start (dzień 1–3) |
| Etapy | 3 |
| Osady | Domowice; Piotr na drodze lokalnej |
| Giver | **Mira** (pasterz) — reserved |
| Inni | Wojciech (świadek); Piotr (wędrowny); Wanda (opc. false-ID) |
| Wymagania | brak; Mira≥10 → łagodniejszy ton |
| Konflikty | Wojciech współdzielony — bez blokady startu |
| Inspiracja | Gothic / FO2 śledztwo |
| roadActive | nie; wyjątek: oddanie Wandzie w Brzeżynie |

## Prawda świata

**Miki żyje u Piotra** (kradzież o świcie, furtka uchylona). Trop „wilczy” przy zagrodzie = **padlina zająca** / mylący odczyt — flaga `q01.misreadWolf` przy słabym Survival, **nie** druga prawda fabularna.

## Reguła stage

`q01.stage` nie maleje, wyjątek: `q01.reopenTrack=true` wraca do etapu 2 (tylko po ścieżce D bez rozwiązania Miki).

## Etapy

### Etap 1 → 2 (`hasLead`)

Zmiana stanu: `hasLead ∈ {boot,witness,track}` (min. 1).

1. Mira → `boot`. 2. Wojciech → `witness` (oskarżenie publiczne: Wojciech−5; spokój: +5). 3. Survival → `track`; niski Survival → dodatkowo `misreadWolf=true`.

**Dialog — Mira**

> Mira: „Furtkę znam na pamięć. Ktoś ją uchylił, nie rozwalił. Miki miało dzwoneczek — jeśli go usłyszysz, to nie echo w głowie.”
>
> A: „Nie krzycz na ludzi, zanim wrócę z faktami.” → Mira+5, `stage=2`.  
> B: „Dziesięć miedziaków z góry, reszta po oddaniu.” → `from: mira_purse` 10 (`if_empty: treasury_home` max 10); Mira+0; `stage=2`.  
> C: „Wilk nie uchyla furtek — kończę jednak sprawdzać trop ostrożnie.” → `misreadWolf` ignorowane jeśli już true; `stage=2`.

### Etap 2 — Piotr (Miki musi być rozwiązane)

| ID | Akcja | Warunek / koszt | Stan |
|----|-------|-----------------|------|
| A | Odkup | `from: player` 22 → Piotr | `resolved=bought`; `stage=3` |
| B | Przekonaj | Mira/osada odwaga≥15 **lub** relacja≥20 | `resolved=talked`; `stage=3` |
| C | Siła/Sneak | — | `resolved=forced`; uczciwość−15; `stage=3` |
| D | Uwierz wilkowi / odejdź bez Miki | wymaga `misreadWolf` | `reopenTrack=true`; **zostań na stage 2**; dialog Miry „nie wierzę — wróć na drogę” (nie etap 3) |

**Wanda (opc., uproszczone po R2):** oddanie w Brzeżynie bez inspect dzwoneczka → `givenWanda=true`, Mira−35, uczciwość Dom−10; **bez** mediacji dwuosadowej w v1 (stub / cut). Wymaga `roadActive`.

### Etap 3 — u Miry (done)

| Ścieżka | Pieniądze | Item | Rep | Relacja |
|---------|-----------|------|-----|---------|
| bought/talked oddane | `from: mira_purse` 25 (`if_empty: treasury_home` do 25) − zaliczka | wełna×2 | uczynność+10 | Mira+30 |
| forced oddane | j.w. | wełna×1 | uczynność+5 | Mira+10, Wojciech−10 |
| givenWanda | 0 | — | uczciwość−10 | Mira−35 |
| kłamstwo wilk przy żywym Miki u Piotra | 0 | — | uczciwość−20 gdy wyjdzie | Mira−40 |

## Mechanizm

- **Required:** stage/reopen, `lamb_miki`, dialog, Wojciech.  
- **Stub:** Survival → misreadWolf; Wanda bez mediacji.  
- **Out of scope:** blood-trail, mediacja dwuosadowa.
