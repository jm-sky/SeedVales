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

# 04 — Korzeń nad strumieniem

## Meta fabularna

| Pole | Wartość |
|------|---------|
| Timer | **2 dni** kalendarza od startu |
| roadActive | tak |
| Giver | **Dobrawa** reserved; Maciej child |
| Surowce v1 | yarrow×2, mint×2, chamomile×1 (istniejące itemy) |
| Checklist | tylko sztuki zebrane/kupione/ukradzione **po starcie questu** (`questTagged`) — wolny world-loot sprzed startu nie liczy się |

## Etapy

### Etap 1 → 2

`deadline=cal+2d`; start checklist.

> Dobrawa: „Nie potrzebuję bohatera. Potrzebuję kogoś, kto wróci z mokrymi rękami i suchą głową — zanim synowi zabraknie oddechu na gadanie.”
>
> A: „Wracam z mokradła. Ty zostań przy nim.” → Dobrawa+8; `stage=2`.  
> B: „Połowa zapłaty teraz.” → zaliczka `from: dobrawa_purse` **15** (`if_empty: treasury_home` max 15); flaga `q04.advance=15`; `stage=2`.  
> C: „Naucz mnie naparu, jak wstanie.” → hook `mentorHope=true` (nie blokuje); `stage=2`.

### Etap 2 — źródło zestawu (wykluczające)

| ID | Źródło | Koszt |
|----|--------|-------|
| M | mokradło pół drogi | ~0.5 d |
| P | pasterz: rope×1 lub milk×1 | |
| B | Brzeżyna ceny×2 | ~1 d |
| K | kradzież skrzyni zielarza Brzeżyny | uczciwość Brzeż−15 |

Komplet → można iść do 3 nawet po deadline (patrz late).

### Etap 3 — dostawa

| Stan przy oddaniu | Wynik |
|-------------------|-------|
| komplet przed deadline | pieniądze: `from: dobrawa_purse` 30 **− zaliczka** (`if_empty: treasury_home` max 20−zaliczka); **albo** item-alt salve×2+bandage×2 — jeśli wzięto zaliczkę, item-alt **niedostępny** dopóki gracz nie zwróci zaliczki (`to: dobrawa_purse`) albo wybierze wypłatę pieniężną z potrąceniem; uczynność+10; Dobrawa+35 |
| komplet po deadline (choroba trwa — **bez** ścieżki śmierci w v1; fraza „Maciej żyje” = late, nie death) | `from: dobrawa_purse` 15 **− zaliczka** (`if_empty: treasury_home` max 15−zaliczka) lub bandage×2 z tym samym clawback zaliczki; Dobrawa+15 |
| brak kompletu po deadline | fail; Dobrawa−20; zaliczka zostaje u gracza jako brudna strata Dobrawy (uczciwość−5 jeśli nie zwróci przy fail) |
| hold: komplet w ekwipunku, nie oddany | late dopiero przy oddaniu |
| oszustwo (trawa) | uczciwość−25; Dobrawa−40; zaliczka do zwrotu |


## Mechanizm

- **Required:** timer, questTagged picks, delivery rules late/hold.  
- **Stub:** `sick` flag Maciej.  
- **Out of scope:** calamus, quality minigame.
