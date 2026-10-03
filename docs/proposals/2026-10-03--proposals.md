# Claude's proposals — new additions that fit what exists now

*Written 2026-10-03 (session 14, Sonnet default; Opus to re-rank). Process: `docs/plans/proposals--001--claude-proposals.md`. Evidence: soak 015, reviews 013–019, `later-vision-backlog.md`, deferred FEATURES (WORLD-05/06/09, SET-04, NPC-06/08, RES-06, QUAL-02, VOICE-01, TRADE-03, DEV-01), PROGRESS ❓, the systems added this session (target lock, block/parry, jump, dodge, sharpness, inn meals, treasure, mayor, carrion). Cost S ≈ ≤ 1 day, M ≈ 2–4 days, L ≈ a week+. 🟡 = assumption. Items already planned elsewhere (`ui--002`, `economy--002`, `quests--002/003`, `render--003`, `world--003` caves) are not repeated.*

## Recommended shortlist (≈ 5)

1. **P-01 Seasonal market days** (M) — gives the new inn/meal/trade systems a rhythm and a reason to travel.
2. **P-05 Hunger-driven travel provisions UI** (S) — shows the player what a journey costs (uses inn meals, preserved food, freshness batches).
3. **P-09 NPC memory of deeds in dialogue** (M) — uses `npc.opinion`, quests and treasure/gift history; cheapest big "alive world" gain.
4. **P-12 Whetstone/blacksmith maintenance loop** (S–M) — closes the combat--005 gap (NPC blades dull without upkeep).
5. **P-16 Photo mode** (S) — cheap, shows off the render work, pauses the world, hides the HUD.

## Gameplay loops and survival

- **P-01 Seasonal market days** (M) — ✅ *first slice 2026-10-03 (`sim/market.ts`): weekly market day 8–18 h, buy −8 %, sell +10 %, inn meals −20 %, HUD cue; NPC square/stalls/traders still open.* — once a week the settlement's market square fills (traders, stalls, cheaper meals, a sell/buy bonus). *Fits:* VISION economy, TRADE-03 groundwork (caravans exist). *Needs:* a calendar event hook, NPC schedule override, market stall structure (exists as `market`). *Risk:* NPC pathing in the square (D-SIM-11). *Measure:* trade volume per market day in soak; no stuck NPCs.
- **P-02 Foraging knowledge** (S) — ✅ *poisonous herbs: learned by being poisoned or at medicine ≥ 30, "known toxic" tag, refused when eaten by mistake (2026-10-03; mushrooms not covered).* — herbs/mushrooms are identified by use; wrongly eating a mushroom becomes a learned "known toxic" mark. *Fits:* SKILL/medicine. *Needs:* a per-player knowledge set (saved, optional field). *Risk:* low.
- **P-03 Campfire cooking quality** (S) — roasting near a lit hearth/with a pan yields better freshness share; ties to D-FOOD-3/4. 🟡 balance.
- **P-04 Weather-driven needs** (M) — rain/cold increase vigor drain unless sheltered/clothed; uses existing weather + armour layers. *Risk:* retuning the survival loop; needs soak.
- **P-05 Journey provisions UI** (S) — ✅ *implemented 2026-10-03 (S/low-risk shortlist rule): the map's Target box shows distance, hours on foot, hunger/thirst cost and what the pack covers (`journeyEstimate`, `review019.test.ts`).* — map/journal line: "~3 h to Hollowgate; you carry 2 meals, 1 waterskin" computed from walking speed and needs rates. No new sim.

## World and exploration

- **P-06 Treasure clues** (M) — ✅ *first slice 2026-10-03: "Ask about old tales" in the dialog names the nearest landmark with undug loot (direction + distance in words, no map marker); clue items/journal entries still open.* — LOOT-01 spots get hints (a faded map piece from an NPC/quest, a landmark inscription) so digging is not blind. *Needs:* clue items + journal entries. 🟡 quest text per landmark.
- **P-07 Treasure chests** (M) — render + interaction for chests at landmarks (planned remainder of world--001). *Needs:* a chest model (Blender, D-REN-8).
- **P-08 Player map annotations** (S) — ✅ *implemented 2026-10-03: "Mark here" notes on the map (max 20, `px.pins`).* — pins/notes on the fog-of-war map (MAP-01 safe: only in explored cells).

## NPC life and social

- **P-09 NPC memory of deeds** (M) — ✅ *first slice implemented 2026-10-03: dialogue remarks from badges (thief, beast slayer, rat catcher), finished quests the NPC took part in, the mayor's office, petted animals (`sim/memory.ts`, shown in the dialog panel; `memory.test.ts`). Price/greeting effects and reply options are open.* — dialogue greetings and prices reference what the player did here (helped with the roof, stole from the warehouse, killed the wolves); data = existing `stats`/badges/`opinion`.
- **P-10 Visitors and festivals** (M) — a seasonal festival (harvest) with an authored quest hook; reuses the visitor mechanism (SAVE 9 'visitor').
- **P-11 Companion banter** (S) — ✅ *text slice 2026-10-03 (`npc/companionBanter.ts`): weather, dark, hunger, wounds, predators, nearby treasure; voice clips still open.* — hired companions comment on weather, danger and treasure using the voice catalogue fallback to text lines. *Needs:* VOICE-01 clips later; text first.

## Economy and crafting

- **P-12 Maintenance loop** (S–M) — ✅ *blacksmith sharpening service implemented 2026-10-03 (price from the missing edge, pays the smith, durability untouched; `edge.test.ts`); NPC upkeep (`maintain` duty) still open.* — blacksmith offers a sharpening service (price from edge deficit), guards/hunters use a whetstone at home (a `maintain` duty); closes D-COMBAT-4's open point.
- **P-13 Salt trade route** (M) — salt is a finite import (D-INN-1); a caravan good with a price curve gives the first real inter-settlement scarcity (feeds `economy--002`/TRADE-03). *Risk:* conservation — covered by the soak ledger.
- **P-14 Mayor projects (SET-04-lite)** (M) — the player-mayor's tax income funds a project queue (repair the warehouse, new well); NPC builders execute from the warehouse stock. *Fits:* D-SET-1 "not done". *Risk:* build AI.

## Combat

- **P-15 Delayed strike timing** (L) — split attack start from strike resolution so dodge/parry react to telegraphed swings (D-COMBAT-3 decision 1B). *Risk:* touches every melee path and AI lethality; needs soak and a feel pass.
- **P-16b Stagger animation set** (M) — dedicated block/parry/stagger/jump/dodge clips (art gap listed in combat--002/003/004); no sim change.

## UI/UX, audio, graphics, tools

- **P-16 Photo mode** (S) — F-key: pause, free camera orbit, hide HUD, time-of-day slider, screenshot export (`canvas.toBlob`). *Risk:* none to sim.
- **P-17 Accessibility pass** (S–M) — ✅ *text size setting + Block hold/toggle option implemented 2026-10-03; colour-blind icons and reduce-motion still open.* colour-blind-safe quest icons, text scale, reduce-motion (camera assist/bob), hold-vs-toggle for block/sprint. *Fits:* mobile + keyboard parity in review 018.
- **P-18 Region music/ambience layers** (M) — a sparse music bed by region/time over the recorded ambience, strictly ducked under voices. *Gate:* licences (release gate) — only user-owned or CC0 tracks.
- **P-19 Calibration lab** (M) — `tools--001`: sliders for needs/combat/prices with live soak readouts (already drafted; now more valuable because many systems have first-pass numbers).
- **P-20 Code map from `@domain` tags** (S) — ✅ *`pnpm code-map` → `docs/state/CODE-MAP.md` (2026-10-03).* — DEV-01; a generated overview for faster onboarding of agents; low risk.

## Mobile

- **P-21 Mobile layout pass** (M) — ≥ 32 px floor is met; remaining: map label size, build panel covering status bars, Block/Jump/Dodge button ergonomics (review 018 minors).

## What I would not propose now

Horses/wagons (WORLD-09/TRANS-02) and a second continent (WORLD-06): large, and the settlement/economy layers (P-13, P-14, `economy--002`) should land first; new professions (NPC-06) before maintenance/market loops exist would add idle NPCs.
