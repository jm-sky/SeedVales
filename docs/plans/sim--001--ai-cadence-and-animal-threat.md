# AI: kadencja decyzji, reakcje zwierząt na zagrożenie, zwłoki i ślady krwi

**Status:** done  
**Domain:** sim  
**Sub domains:** npc-ai, fauna, combat, weather  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 1)  
**Created:** 2026-09-30  
**Finished:** 2026-09-30

---

Źródło: [VISION-APPENDIX.md](../VISION-APPENDIX.md) — „Spatial grid i częstotliwość decyzji”, „Zachowanie zwierząt przy zagrożeniu”, „Zwierzęta” (zwłoki), „Ślady”.
FEATURES: `AI-01`, `FAUNA-06`, `FAUNA-07`, `FAUNA-08`, `TRACE-01` (sim), `PERF-01` (spatial grid — realizowany w [diag--001](diag--001--sim-hotspots-and-perf-report.md)).

## Stan wyjściowy (2026-09-30)

- LOD aktualizacji istnieje (`sim.lodInterval(d)`, D-SIM-1: 0.1 / 0.5 / 3 s), ale to częstotliwość **ruchu i aktualizacji**, nie osobna kadencja **decyzji**. NPC: `REPLAN_S` + histereza (`npc/ai.ts`). Zwierzęta: plan w `fauna/ai.ts`.
- `sim.actors.query` / `sim.nodes.query` istnieją (spatial grid).
- Zwierzę `scavenge` zjada natychmiast (`a.hungerH = 0` po jednym kontakcie).
- Brak śladów krwi, brak zagród (sprawdzić `settlements.ts` — pastwiska?), brak pojęcia „pasterz”.

## Kroki

1. **Kadencja decyzji (AI-01).** Rozdziel „tick ruchu” od „decyzji”: `ai.decideAt`; bazowo ~1 s gry, mnożnik per gatunek (`species.ts`: `decisionS`) i stan (zmęczenie/głód → rzadziej). Parametry w `calibration.ts`. **Wymuszenie**: zdarzenia krytyczne (otrzymane obrażenia, zagrożenie w promieniu paniki, wołanie o pomoc) ustawiają `decideAt = 0`. Bench przed/po (spodziewany spadek kosztu AI).
2. **Zwierzęta domowe (FAUNA-06).** Przy zagrożeniu/ataku: cel `flee_home` → najbliższy pasterz (NPC z obowiązkiem wypasu, jeśli jest) albo zagroda/obora właściciela. Jeżeli zagrody nie ma w osadach — dodać prosty budynek/ogrodzenie (to zmiana generatora → `GEN_VERSION`).
3. **Zwierzęta dzikie (FAUNA-07).** Wspólna ocena „strachu” z parametrami gatunku: ludzie, ogień (ogniska/pochodnie — `campfire`, pochodnia gracza), zagrody. Wyjątki podnoszące agresję: młode w pobliżu (wymaga pojęcia młodych — minimalnie flaga `young` + powiązanie z matką), człowiek blisko legowiska (`den`). Big-Five-podobny współczynnik per osobnik opcjonalnie.
4. **Zwłoki (FAUNA-08).** Jedzenie trwa (np. 20–60 s gry per porcja, parametr), zużywa zwłoki porcjami; drapieżnika można przegonić (hałas/atak/ogień → ucieczka z zachowaniem strachu z pkt 3). Test: „gracz przerywa konsumpcję — zwłoki częściowo zostają”.
5. **Ślady krwi (TRACE-01, część sim).** Trafienie z obrażeniami > 0 → wpis w `state.traces` (pozycja, intensywność, czas). Zanikanie w czasie kalendarza, szybciej w deszczu (`weather.ts`). Limit liczby śladów (ring buffer) i indeks przestrzenny. Drapieżnik w zasięgu węchu → cel `investigate_trace`. Render dekali — w [render--001](render--001--weather-variety-effects.md). Zapis w save.

## Testy

- AI-01: liczba decyzji na aktora/min w zakresie; atak wymusza decyzję w ≤ 1 tick.
- FAUNA-06/07/08, TRACE-01: testy reguł w `features*.test.ts` (nowy plik `appendix-sim.test.ts`, by nie rozdmuchiwać istniejących).
- `pnpm bench:sim` przed/po; wynik w PERF.md.

## Ryzyka

- Zmiana kadencji może zmienić wyniki testów ekonomii (3 dni) — kalibracja zamiast osłabiania asercji.

## Wynik

- **1. AI-01 ✅** — `ai.decideAt` + `decisionInterval` (`fauna/perception.ts`): baza `DECISION.baseS` = 1 s × `SpeciesDef.decisionS` (sarna/zając 0.8, szczur/krowa/kura 1.5, owca 1.3) × zmęczenie (stamina < 25 lub wigor NPC < 15 → ×1.5). Ruch i ucieczka/atak ciągłe między decyzjami. Wymuszenie: `sim/alerts.ts` `alertAround` przy trafieniu (30 m), strzale (30 m), wołaniu o pomoc (60 m); ranne zwierzę decyduje od razu. NPC: percepcja zagrożenia w tej samej kadencji (planowanie utility nadal co 12 s / koniec planu). Liczniki `ai.decisions`, `ai.alerts`.
- **2. FAUNA-06 ✅** — zwierzę domowe (bez psa) przy drapieżniku polującym/agresywnym/bliżej niż 12 m albo po zranieniu → cel `flee_home`: bieg do pasterza gospodarstwa (dorosły, ≤ 200 m) albo do zagrody, potem 15 s „Chowa się”. Zagrody istnieją (po `game--002` każde gospodarstwo rolnika/pasterza ma zagrodę) — bez zmiany generatora.
- **3. FAUNA-07 ✅** — `decideAnimal`: ogień (ognisko/pochodnia na słupie/pochodnia na ziemi/człowiek z pochodnią, `FEAR.fireM` 14 m) płoszy każde dzikie zwierzę (poza wściekłym i szczurem); drapieżnik niegłodny trzyma dystans od człowieka (`FEAR.humanM` 16 m), głodny/alfa/silny atakuje; dziki/niedźwiedź atakuje tylko z bliska (< 6 m), dalej unika; zagrody omijane (poza wściekłymi i drapieżnikami głodnymi > 40 h); wyjątki ochronne: młode tego gatunku ≤ 25 m albo własne legowisko ≤ 30 m → atak zamiast ucieczki (D-SIM-12).
- **4. FAUNA-08 ✅** — jedzenie padliny/przynęty to kroki pracy `eat` (`CARRION.eatS` 25 s na porcję, `lureEatS` 6 s), porcja odejmuje `hungerPerMeat` 15 h głodu; kontynuacja dopóki głodny i jest mięso. Przerwanie: decyzja (strach przed człowiekiem/ogniem) albo atak czyści kroki — zwłoki zachowują resztę mięsa.
- **5. TRACE-01 (sim) ✅** — `sim/traces.ts`: trafienie z obrażeniami → ślad (intensywność `dmg/20`, scalanie w 1.5 m), zanikanie w czasie kalendarza (0.05/h, deszcz do ×4 wg intensywności), limit 300 (najstarszy usuwany), indeks przestrzenny w `Sim`, zapis `GameState.traces` (`SAVE_VERSION` 5 + migracja). Głodny drapieżnik w zasięgu węchu (70 m × intensywność) idzie „węszyć” (`investigate`, cooldown 60 s). Dekale → `render--001`.
- Przy okazji: szczury związane z gniazdem (`denId = nest:<budynek>`) — liczenie szczurów zadania i kredyt za zabicie po przynależności, nie po odległości (uciekające szczury nie „rozwiązywały” zadania; e2e 8b sporadycznie padało).
- Bench: A/B z poprzednim commitem w tych samych warunkach (load ~6) — bez różnicy w granicach szumu (np. crowded p95 0.64 → 0.57, long-run 1.33 → 1.18 ms).

