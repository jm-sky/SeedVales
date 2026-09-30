# UI: ekrany postaci, mapa/minimapa, ustawienia, zapisy nazwane, cykl celów

**Status:** planned  
**Domain:** ui  
**Sub domains:** hud, panels, save, input, audio, render-quality  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) (fala 2)  
**Created:** 2026-09-30  
**Finished:** —

---

Źródło: [VISION-APPENDIX.md](../VISION-APPENDIX.md) — „Interfejs i ekrany”, „Wybór celu interakcji”.
FEATURES: `UI-03`, `UI-04`, `UI-05`, `UI-06`.

## Stan wyjściowy (2026-09-30)

Panele w `src/ui/panels/`: Inventory, Quests, Map (MapPanel), Trade, Craft, Build, Storage, Orders, Dialog, GameMenu (zapis/wyjście), Quick. Brak: ekranu postaci (atrybuty/skille/choroby/reputacja w jednym miejscu), minimapy, ustawień, nazwanych zapisów. `render/quality.ts` ma profile jakości; `audio/ambience.ts` — brak ustawień głośności w UI.

## Kroki

1. **Ekran postaci (UI-03)** — zakładki: podgląd postaci (render 3D offscreen albo portret — zacznij od statycznego, prosty podgląd 3D później), atrybuty, reputacja (`reputationView.ts`), umiejętności, stan chorób (`illness`), ekwipunek ze slotami, wybór **podstawowej broni wręcz** i **dystansowej** (sim: pola w `px`, używane przez atak/auto-wybór; mobile: przycisk przełączania).
2. **Ekwipunek** — filtrowanie po kategoriach, sortowanie (nazwa/waga/wartość/jakość/świeżość), panel parametrów przedmiotu (obrażenia, pancerz, jakość, świeżość, gatunek dla mięsa).
3. **Mapa (UI-04)** — rozbudowa `MapPanel.vue`: odkryte lokalizacje, osady, landmarki (fala 5), znacznik celu wybranego przez gracza/zadanie. **Minimapa** w HUD (desktop i mobile, nie zasłania sterowania) ze strzałką do celu. Render minimapy z danych `world` (tekstura raz na chunk) — bez drugiego renderera Three.js.
4. **Ustawienia (UI-05)** — jakość grafiki (profile `quality.ts`, zmiana bez restartu jeśli możliwe), głośność master/otoczenie/efekty; zapis w `localStorage` (preferencje, nie savegame).
5. **Zapisy** — „Nowa gra” z menu gry, **zapis pod nazwą**, lista zapisów z metadanymi (zależne od game--002 A5/C1: unikalne sloty, meta bez ładowania blobów).
6. **Cykl celów (UI-06)** — `Tab` przełącza między obiektami interaktywnymi w zasięgu (sortowanie: odległość + kąt kamery); podświetlenie celu; mobile: przycisk „następny cel”. Uwaga na konflikt `Tab` z fokusem przeglądarki (`preventDefault` tylko w grze).

## Weryfikacja

- e2e: rozszerzyć `scripts/e2e/acceptance.mjs` i `mobile.mjs` o nowe panele (otwarcie przez UI, a nie debug API); screenshoty przez `tour.mjs` i ręczna ocena czytelności na desktop + telefon.
- vitest: logika sortowania/filtrowania i wyboru broni głównej (czyste funkcje poza komponentami).
- Warstwy: UI nie mutuje `sim.state` bezpośrednio (game--002 C5).
