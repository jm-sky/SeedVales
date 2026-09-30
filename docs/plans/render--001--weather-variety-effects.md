# Render: pogoda, różnorodność postaci i zwierząt, efekty (krew, ogień)

**Status:** planned  
**Domain:** render  
**Sub domains:** weather, actors, terrain, effects, assets  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 4)  
**Created:** 2026-09-30  
**Finished:** —

---

Źródło: [VISION-APPENDIX.md](../VISION-APPENDIX.md) — „Modele postaci”, „Zwierzęta”, „Ślady”, „Pogoda”, „Kierunek graficzny”.
FEATURES: `WEATHER-01`, `WEATHER-02`, `CHAR-01`, `FAUNA-09`, `TRACE-01` (render), `RENDER-03`.
Decyzja: **D-REN-5** (low-poly nie ogranicza ładnej grafiki, jeśli nie kosztuje dużo FPS; efekty za profilem jakości).

## Stan wyjściowy (2026-09-30)

- Pogoda w sim (`weather.ts`: deszcz, `wet`, `snowCover`), render: `dynamics.ts`/`terrainChunks.ts` (tint). Review: „wet ground poza rain/snowCover” — brak pełnego efektu mokrego terenu; brak chmur i widocznych opadów.
- Postacie: głowa UBC + stroje Peasant/Ranger + UAL1 (D-REN-1), 7–12 draw calli/os.; brak wariantów włosów/brody/skali/tintu.
- Brak modeli części zwierząt (D-REN-3 placeholdery). `_temp/` (paczki Quaternius) może być niedostępny w sesji chmurowej — wtedy tylko to, co już jest w `public/assets/`.

## Kroki

1. **WEATHER-01** — chmury (instanced billboardy lub warstwa kopuły z noise, ruch z wiatrem, gęstość z pogody); opady deszczu/śniegu jako cząsteczki wokół kamery (jeden `Points`/instanced, liczba z profilu jakości).
2. **WEATHER-02** — mokry teren: ciemniejszy i bardziej połyskliwy (uniform w materiale terenu sterowany `wet`); śnieg: biel zależna od `snowCover` i nachylenia (shader), opcjonalnie lekkie podniesienie (warstwa) na profilu high.
3. **CHAR-01** — różnorodność: kolor włosów (blond/brąz/czarne/rude/siwe), warianty brody/braku, fryzury (jeśli są w paczkach), skala X/Z ±5%, Y ±10% (propozycja z dodatku — przyjęta jako start, parametry w `calibration.ts`), fallback dziecka = pomniejszony dorosły, tint ubrań (paleta neutralna/zieleń/błękit), łączenie części (nogi/buty Wizard + reszta Peasant — tylko jeśli dostępne i niefantastyczne). Wszystko deterministycznie z id NPC. Jednocześnie: redukcja draw calli (scalanie per materiał / atlas) — nie zwiększać kosztu.
4. **FAUNA-09** — młode: skala w dół; prime/alfa: skala w górę + przyciemnienie ~10%. Wymaga cech w sim (`young`, `prime` — wspólne z sim--001 krok 3).
5. **TRACE-01 (render)** — dekale krwi na terenie (instanced quads, alpha z intensywności śladu).
6. **RENDER-03** — ogień: cząsteczki płomieni + iskry, światło punktowe z migotaniem (limit liczby świateł; dalej tylko emissive).
7. Po każdym kroku: `pnpm bench:render medium` (draw calls, trójkąty) — wynik w PERF.md; zrzuty z `tour.mjs` do oceny wizualnej.

## Ryzyka

- SwiftShader w headless → FPS niereprezentatywne; porównuj draw calls/trójkąty/CPU.
- Brak `_temp/` → warianty fryzur/bród mogą wymagać prostych proceduralnych siatek; zapisz to jako placeholder w `docs/assets/README.md`.
