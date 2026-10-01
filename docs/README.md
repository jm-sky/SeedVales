# Docs

Główny indeks dokumentacji.

> **Language: English everywhere (D-LANG-1, 2026-10-01).** New and edited docs are written in English; existing Polish docs are legacy and get translated when substantially edited. Details: [IMPORTANT-PRODUCT-NOTES.md](IMPORTANT-PRODUCT-NOTES.md).

## Najważniejsze pliki

| Plik | Rola |
|---|---|
| [VISION.md](VISION.md) | główna wizja (product requirements) — źródło prawdy dla designu gry |
| [VISION-APPENDIX.md](VISION-APPENDIX.md) | nowsze uzupełnienia wizji (wymagania `scope: "v2"`) |
| [IMPLEMENTATION-PROMPT.md](IMPLEMENTATION-PROMPT.md) | stały brief dla autonomicznych sesji implementacyjnych |
| [../NEXT-SESSION-KICK-OFF-PROMPT.md](../NEXT-SESSION-KICK-OFF-PROMPT.md) | brief na najbliższą sesję (długa pętla) |
| [state/PROGRESS.md](state/PROGRESS.md) | handoff między sesjami — czytaj najpierw |
| [state/progress-log.md](state/progress-log.md) | archiwum starszych sekcji PROGRESS |
| [state/FEATURES.json](state/FEATURES.json) | wymagania, kryteria odbioru, statusy |
| [design/DECISIONS.md](design/DECISIONS.md) | decyzje i uproszczenia |
| [roadmap/v1-closure-and-appendix.md](roadmap/v1-closure-and-appendix.md) | kolejność: domknięcie v1 → fale dodatku |
| [reviews/2026-09-30--001--v1-review.md](reviews/2026-09-30--001--v1-review.md) | niezależne review v1 (Grok / Scribe) |
| [research/2026-10-01--002--realistic-visuals-practical-roadmap.md](research/2026-10-01--002--realistic-visuals-practical-roadmap.md) | research grafiki (podstawa planów `render--002/001/003`; review raportu 001: [reviews/2026-10-01--005](reviews/2026-10-01--005--rendering-research-critical-review.md)) |
| [DEVELOPER-CALIBRATION-TOOLS.md](DEVELOPER-CALIBRATION-TOOLS.md) | propozycja narzędzi kalibracyjnych (plan `tools--001`, draft) |
| [assets/README.md](assets/README.md) | katalog assetów Quaternius i konwersji |

## Struktura

```
docs/
├── README.md  <-- indeks dokumentacji
├── VISION.md  <-- główna wizja
├── VISION-APPENDIX.md  <-- uzupełnienia wizji
├── assets     <-- katalog assetów
├── design     <-- szczegółowy design konkretnych obszarów + DECISIONS.md
├── plans      <-- plany implementacji (domain--ID--slug.md)
├── research   <-- wyniki research
├── reviews    <-- wyniki review
├── roadmap    <-- roadmapy obejmujące wiele planów
├── state      <-- aktualny stan (PROGRESS.md, FEATURES.json, PERF.md)
└── vision     <-- szczegóły wizji w rozbiciu na domeny
```

## Domains

Domeny używane w planach i FEATURES (robocze): `game` (przekrojowe), `world`, `sim`, `npc`, `fauna`, `economy`, `settlement`, `ui`, `render`, `diag`, `tools`.

Możemy mieć konfigurację domen w pliku `.ts` w `scripts/docs/domains.ts` aby mieć jedno źródło prawdy dla walidatorów i skryptów automatycznych.
