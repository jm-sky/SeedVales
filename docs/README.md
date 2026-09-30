# Docs

To jest miejsce na główny indeks dokumentacji.

Plik `VISION.md` zawiera główną wizję w rodzaju product requirements.

```
docs/
├── README.md  <-- indeks dokumentacji
├── VISION.md  <-- główna wizja
├── design     <-- szczegółowy design konkretnych obszarów
│   └── README.md
├── plans      <-- plany implementacji konkretnych tematów na 1-2 sesje
│   └── README.md
├── research   <-- wyniki research
│   └── README.md
├── reviews    <-- wyniki review
│   └── README.md
├── roadmap    <-- pliki roadmap różnych obszarów/domen, wiele etapów -> wiele planów
│   └── README.md
├── state      <-- aktualny stan, zależności
│   └── README.md
└── vision     <-- szczegóły wizji w rozbiciu na konkretne domeny
    └── README.md
```

## Domains

Warto podzielić system na dedykowane domeny, np.

- npc
- combat
- fauna
- world

To trzeba ustalić i uzupełnić.

Możemy mieć konfigurację domen w pliku `.ts` w `scripts/docs/domains.ts` aby mieć jedno źródło prawdy dla walidatorów i skryptów automatycznych.
