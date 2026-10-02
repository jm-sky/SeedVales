# Panels that scale with content, and sensory actor visibility on the map

**Status:** draft  
**Model:** opus — UX decisions per panel (what goes in, what stays out), MAP-02 sensing model; sonnet — implementation, e2e/mobile  
**Domain:** ui  
**Sub domains:** map, quests, crafting, trade, inventory, hud  
**Roadmap:** [later-vision-backlog](../roadmap/later-vision-backlog.md) stage **L1** (D-PLAN-9); may be pulled earlier if the app review (`review--001`) rates a panel as a major UX problem  
**Created:** 2026-10-02  
**Finished:** —

---

Sources: [recon 013](../reviews/2026-10-02--013--full-repository-recon.md) UI-01…UI-07 (M-01/M-03/M-04/C-07 already fixed in session 13), MAP-02 from [IMPORTANT-PRODUCT-NOTES](../IMPORTANT-PRODUCT-NOTES.md), app-review findings of `review--001` round 1 (mobile touch targets < 32 px: 371 hits in `ui-checks.json`).

Rule for every step: UI reads state and acts only through `Game` (C-07 test), logic never depends on label text, mobile parity (touch targets ≥ 32 px), English glossary terms, one e2e/mobile check per step.

## Steps

| # | Step | Source | Model |
|---|---|---|---|
| 0 | UX note: per panel what is added now vs. later; touch-target baseline for all panels (fix the 32 px floor globally first) | app review, UI-* | opus |
| 1 | Quest panel/journal: tabs Active / Available / Done, expired hidden, track one quest (minimap arrow), objective checklist with "why blocked" (e.g. repair needs hammer + 2 branches) | UI-01 | sonnet |
| 2 | Crafting: search, category tabs, "craftable now", sort, batch quantity, missing totals, where a station/tool is | UI-02 | sonnet |
| 3 | Trade: quantity stepper (1 / X / max), filters, sort, carried-weight impact, highlight the NPC's wish, quality/durability comparison | UI-03 | sonnet |
| 4 | Inventory: search, compare with equipped (damage/resistance deltas), durability/freshness bars, lock/favourite against accidental sale/drop | UI-04 | sonnet |
| 5 | Map: known-by-rumour vs visited (after `quests--002` rumours), filters (settlements, quests, landmarks), legend, centre on player/target | UI-05 | sonnet |
| 6 | Quick actions: contextual section, disabled reasons, keybind badges, last used | UI-06 | sonnet |
| 7 | Message log: categories, duplicate coalescing (×N), game-time stamps | UI-07 | sonnet |
| 8 | **MAP-02** sensory visibility: NPCs/animals on map/minimap only while perceived (perception attribute, distance, light, fatigue); fog of war (MAP-01) stays separate | MAP-02 | opus model → sonnet |

## Exit
`pnpm check`, e2e + mobile green, `pnpm review:app` ui scenario: 0 small-button hits on mobile, no overflow hits; Opus keep/drop per panel; ❓ user look.
