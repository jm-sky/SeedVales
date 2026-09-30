# V1 — zintegrowana gra do pierwszego przeglądu

**Status:** in_progress (sesja 1 zakończona; domknięcie: [game--002](game--002--v1-review-fixes.md) + [diag--001](diag--001--sim-hotspots-and-perf-report.md) — patrz docs/state/PROGRESS.md)  
**Domain:** game (cross-domain)  
**Sub domains:** world, sim, npc, fauna, items, combat, economy, build, quests, save, render, ui, diag  
**Roadmap:** —  
**Created:** 2026-09-30  
**Finished:** —

---

Źródła: `docs/VISION.md`, `docs/IMPLEMENTATION-PROMPT.md`. Wymagania i statusy: `docs/state/FEATURES.json`. Decyzje: `docs/design/DECISIONS.md`. Postęp: `docs/state/PROGRESS.md`.

## Architektura (skrót)

```
src/game/
  config/     stałe kalibracji (czas, skala, potrzeby) — jedno miejsce do strojenia
  core/       rng (seed), noise, math, ids
  diag/       wspólne pomiary (timery, liczniki, percentyle, ring-buffery)
  world/      generator (wersjonowany), teren (query wysokości), spatial grid, roślinność
  sim/        stan gry + systemy (czas, pogoda, potrzeby, NPC-AI, zwierzęta, walka, crafting, handel, budowa, reputacja, zadania)
  data/       katalogi danych: przedmioty, receptury, gatunki, profesje, budynki
  save/       IndexedDB: cache świata (per seed+wersja generatora) + zapisy gier (wersjonowane)
  render/     Three.js — czyta stan, nie modyfikuje symulacji
  input/      klawiatura/mysz/dotyk → intencje gracza
  debug/      window.__sv — API testowe (poza normalnym UI)
src/ui/       Vue: HUD, panele, mobile controls
scripts/      assets (konwersje), e2e (scenariusze Playwright), bench
```

Symulacja: fixed-step (gameplay 10 Hz dla bliskich encji, rzadziej dla dalekich — LOD symulacji), kalendarz = sekundy rozgrywki × 24. Przyspieszenie (sen/długa praca) mnoży cały krok symulacji i przerywa się na zagrożeniu.

## Etapy

1. Fundament: diag, rng/noise, konfiguracja czasu, generator świata (teren, biomy, rzeki, osady, drogi A*), testy determinizmu.
2. Rendering: chunki terenu z LOD, woda, niebo/dzień-noc, gracz + kamera 3rd person, kolizje, streaming.
3. Symulacja: potrzeby/atrybuty (wspólne), przedmioty/ekwipunek/magazyny, NPC (gospodarstwa, profesje, Big Five, utility AI), zwierzęta.
4. Gameplay gracza: interakcje, zbieranie z narzędziem, crafting, handel, budowa, walka, leczenie, sen z przyspieszeniem.
5. Reputacja + zadanie ze świata (szczury z zaniedbanych budynków), pogoda/sezon wpływające na AI i uprawy.
6. Zapis/odczyt pełnego stanu, UI desktop + mobile.
7. Assety Quaternius (drzewa, budynki, zwierzęta, postacie + animacje).
8. Benchmarki, scenariusz odbioru §9 (Playwright), review.
