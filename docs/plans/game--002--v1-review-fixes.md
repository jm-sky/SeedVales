# V1 — poprawki po niezależnym review (Grok / Scribe)

**Status:** in_progress  
**Domain:** game (cross-domain)  
**Sub domains:** sim, economy, fauna, npc, save, world-gen, ui, diag  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md)  
**Created:** 2026-09-30  
**Finished:** —

---

Źródło: [docs/reviews/2026-09-30--001--v1-review.md](../reviews/2026-09-30--001--v1-review.md) (numery `#N` = numeracja z review).
Poprzedni plan: [game--001--v1-integrated-game.md](game--001--v1-integrated-game.md).

## Triage (sesja przygotowawcza 2026-09-30)

Wyrywkowo potwierdzone w kodzie przed zapisaniem planu:

- **#1 potwierdzone** — `WORK_ACTS.smith` (`src/game/sim/npc/works.ts`) ustawia `order.status = 'ready'` bez zużycia materiałów; `collectOrder` (`src/game/sim/orders.ts`) robi `newStack(o.recipe)`.
- **#2 potwierdzone** — `caravan()` (`src/game/sim/npc/duties.ts`): gdy `caravan_back` wygasł, a trader jest `far`, gałąź `returning` się nie wykona i plan znów prowadzi do cudzego magazynu (bez `pack_food`).
- **#3 potwierdzone** — `updateAnimal` (`src/game/sim/fauna/ai.ts`, goal `hunt`): po `arrived` zawsze `unshift(goto prey)`, bez limitu pościgu.
- **#4 potwierdzone** — `genVersion` jest zapisywany w `newGame.ts`, ale nigdzie nie czytany.
- **#5 potwierdzone** — `Game.create`: `o.slot ?? \`slot-${seed}\``.
- **#6** — do reprodukcji w teście multi-seed (review: seedy 0, 2020, 9999, 88888 < 0.8× `DAY_MARCH_M`).

Pozostałe pozycje: zweryfikować przy implementacji (reprodukcja testem → poprawka). Jeżeli uwaga się nie potwierdzi, zapisać to w sekcji „Wynik” poniżej z uzasadnieniem — nie poprawiać „na ślepo”.

## Zasady

- Każda poprawka = test regresji, który **najpierw** pada (reprodukcja), potem przechodzi.
- Po każdej grupie: `pnpm check`, `node scripts/check-layers.mjs`; po grupach A–C także `pnpm e2e`.
- Zmiana FEATURES.json: jeżeli poprawka dotyczy pozycji oznaczonej `verified`, zaktualizuj `evidence` (np. CRAFT-02, WORLD-04, SAVE-01).
- Małe commity: jedna grupa lub jedna pozycja High na commit.

## Grupa A — High (blokuje ogłoszenie v1)

| # | Problem | Poprawka | Test regresji |
|---|---|---|---|
| A1 (#1) | Kowal: zamówienie „z powietrza” | Smith zużywa materiały recepty (`recipes.ts`) z magazynu domu przed `ready`; brak materiałów → zamówienie czeka (albo kowal kupuje/zgłasza brak); `collectOrder` wydaje przedmiot z bufora zamówienia, nie `newStack` | „stock kowala maleje o recepturę; bez materiałów status zostaje `waiting`” |
| A2 (#2) | Karawana: pętla outbound | Jawny stan wyprawy (`outbound`/`returning`) zamiast samego CD; `far` i brak aktywnej wyprawy → zawsze do domu | „trader far + wygasły `caravan_back` → trasa do domu” |
| A3 (#3) | Pościg drapieżnika bez limitu | Limit czasu/dystansu pościgu (parametr w `calibration.ts`/`species.ts`), porzucenie gdy ofiara poza percepcją → `failGoal` + cooldown | „pościg kończy się po limicie; brak nieskończonego `goto`” |
| A4 (#4, #14) | `genVersion` nie walidowane przy load | Porównanie `state.genVersion` ↔ `world.version`/`GEN_VERSION` w `Game.create`/`loadWorld`; niezgodność → komunikat w UI (odrzut z wyjaśnieniem; migracja tylko jeśli trywialna). `migrate` w `db.ts`: realny backfill pól albo jawny odrzut starszych wersji | „save z innym genVersion → odrzut z komunikatem, bez cichego montażu” |
| A5 (#5, #15) | Nowa gra nadpisuje `slot-${seed}`; uszkodzony slot → cicha nowa gra | Unikalny slot (seed + timestamp) lub potwierdzenie nadpisania; uszkodzony slot → błąd w UI. Współgra z nazwanymi zapisami (plan `ui--001`) | „nowa gra z tym samym seedem nie usuwa istniejącego zapisu” |
| A6 (#6, #24) | WORLD-04 pada dla części seedów | `pickNext` egzekwuje pasmo długości trasy `[0.8, 1.3]×DAY_MARCH_M` (fallback: kolejne kandydaty / relaksacja z logiem); twardy błąd/ponowienie gdy < 3 osad lub < 2 drogi. Bump `GEN_VERSION` (zgodnie z A4) | `generate.test.ts`: ≥ 8 seedów (w tym 0, 2020, 9999, 88888) — trasa w paśmie, ≥3 osady, ≥2 drogi. Uwaga: generacja ~2 s/seed — test może być w osobnym pliku `*.slow.test.ts` lub z ograniczoną rozdzielczością, jeśli czas `pnpm test` rośnie za bardzo |

## Grupa B — Medium: konserwacja zasobów i pieniędzy (kryterium §8 promptu)

| # | Problem | Kierunek poprawki |
|---|---|---|
| B1 (#7) | NPC `fill_trough` nie zużywa wiadra | Jak u gracza w `interact.ts` — wspólna funkcja |
| B2 (#8) | Picie zwierząt odejmuje wodę w planie | Odejmować po `arrived` |
| B3 (#9) | Hunter `deposit_carry` przy `countItem > 2`, `dry_meat` czyta dom | Deponuj od 1 szt.; spójne źródło mięsa |
| B4 (#10) | Mint/vanish pieniędzy: `inn_sleep`, `collectOrder`, `completeQuest`, `caravan_trade` | Każdy przepływ ma płatnika i odbiorcę (NPC/skarbiec osady). Nagroda za zadanie z kasy strażnika/osady. Test bilansu: suma pieniędzy w świecie stała poza jawnymi źródłami (zapisać je w DECISIONS) |
| B5 (#11) | Pickup/storage omijają `carryCapacity` | Wspólna ścieżka z `giveOrDrop` |
| B6 (#12) | `fight` ignoruje `'stuck'` | `failGoal` + cooldown |
| B7 (#13) | Materiały w `site.delivered` giną | Anulowanie budowy zwraca materiały na ziemię / do gracza |

## Grupa C — Medium: zapis, Game, warstwy

| # | Problem | Kierunek |
|---|---|---|
| C1 (#16) | `listSaves` ładuje całe bloby | Osobny store `meta` albo klucz meta |
| C2 (#17) | Brak obsługi `QuotaExceededError` | Komunikat w UI, zapis nie „udaje” sukcesu |
| C3 (#19) | `Game.stop` nie zamyka AudioContext | `ambience.dispose()` |
| C4 (#20) | `check-layers.mjs` poza `pnpm check` | Dodać do skryptu `check` |
| C5 (#25) | UI mutuje sim (`MobileControls.vue` → `sim.state.px.sneaking`) | Intencje przez `input/controls` lub metody `Game`; rozszerzyć `check-layers` o regułę UI→sim (import typów dozwolony) |
| C6 (#18) | `Game.ts` gruby facade (~489 l.) | Wydzielić zapis/wczytanie i sterowanie panelami; tylko jeśli ułatwia C3/C5/A4 — bez refaktoru dla refaktoru |
| C7 (#21, #31) | Poza snapshotem: projectiles, `sysAcc`; `snapshot` mutuje live state | Kopia w snapshot; decyzja w DECISIONS, co celowo nie jest zapisywane (kamera, UI) |
| C8 (#22) | Resource nodes czytają edytowalny teren | Nodes z bazowej (niemodyfikowanej) wysokości; test: dig + eviction nie zmienia rozstawienia |
| C9 (#23) | Settlement cicho pomija household | Log/licznik + test, że każde gospodarstwo ma dom |

## Grupa D — Low (w miarę czasu; można łączyć z pracą w danym pliku)

#26 threat interrupt dla `build`; #27 cooldown strzyżenia per owca; #28 sprzątanie `collected` orders i rename `recipe`→`itemId`; #29 dedup questów; #32 typ `deck` mostu; #33 `genMs` poza cache; #34 współdzielone połączenie IDB; nit z `npc/goals.ts` (nawiasy).

## Kryterium ukończenia planu

- Grupa A i B zrobione, każda z testem; grupa C: C1–C5, C7–C9 zrobione lub świadomie odłożone z wpisem w DECISIONS.
- `pnpm check` + `pnpm e2e` zielone.
- Sekcja „Wynik” uzupełniona (co poprawiono, co odrzucono i dlaczego).
- Powiązane pozycje FEATURES.json zaktualizowane.

## Wynik

- **A1 ✅** — `forgeOrder` (`sim/orders.ts`): kowal przy `smith` zużywa wejścia receptury z magazynu domu, rzuca jakość i trzyma wykuty stack w `order.item`; brak materiałów → zamówienie zostaje `waiting` (kowal najpierw wytapia sztaby z rudy+węgla). `collectOrder` wydaje `order.item`, nie `newStack`. Test: `features.test.ts` „CRAFT-02: order consumes recipe materials…”. Stare zapisy z `ready` bez `item` → obsłużone w migracji A4.
- **A2 ✅** — jawna faza wyprawy `Human.trip` (`outbound`/`returning`, `since`); wyjazd przez akt `caravan_depart` (prowiant + `outbound`), `caravan_trade` → `returning`; brak wyprawy i `far` → zawsze trasa do domu; wyprawa `outbound` dłużej niż 2 dni kalendarza → powrót. Usunięto `cooldowns.caravan_back`. Test: `economy.test.ts` „ECON-01: a trader far from home…” (padał: cel 3.1 km od domu).
- **A3 ✅** — `HUNT` w `calibration.ts` (chaseMaxS 40 s, giveUpPerception 1.6, cooldownS 90 s); `chaseValid` w `fauna/ai.ts` sprawdzany w każdej aktualizacji celu `hunt` (także w trakcie `goto`, nie tylko po `arrived`) → porzucenie, `cooldowns.hunt`, licznik `fauna.huntGiveUp`. Test: `combat.test.ts` „FAUNA-02: predator chase is bounded”.
- **A4 ✅** — `checkWorldCompat` (`save/db.ts`) w `Game.create`: inny `genVersion` lub seed → `SaveError` z komunikatem (ekran ładowania pokazuje treść + „Wróć do menu”); menu oznacza zapisy z innym `genVersion` (nowe pole `SaveMeta.genVersion`) i blokuje „Wczytaj”. `migrate` = łańcuch `MIGRATIONS[n]` (n→n+1); `SAVE_VERSION` 1→2 (backfill: zamówienia `ready` bez `item` → `waiting`, usunięcie `cooldowns.caravan_back`); nowsza/nieznana wersja → odrzut. Testy: `save.test.ts` (3 nowe).
- **A5 ✅** — nowa gra dostaje `newSlotId(seed)` = `slot-<seed>-<timestamp36>` (nie nadpisuje zapisów); brak/uszkodzony slot → `SaveError` zamiast cichej nowej gry. Nazwane zapisy → `ui--001`. Test: „SAVE-01: a new game with the same seed gets a new slot…”, „missing or corrupt slot”.
