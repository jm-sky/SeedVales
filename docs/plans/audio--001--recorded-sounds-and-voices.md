# Recorded sounds and NPC voice lines (from the previous app)

**Status:** in_progress  
**Model:** opus — step 0 (event → sound map, mixing rules, licence gate); sonnet — implementation and tests  
**Domain:** audio  
**Sub domains:** ambience, actions, fauna, weather, voices, ui, settings  
**Roadmap:** wave 5a (independent of render/sim waves; can run alongside wave 5); voices are the first slice of VOICE-01 ([later-vision-backlog](../roadmap/later-vision-backlog.md) L7 pulled forward because clips already exist)  
**Created:** 2026-10-03  
**Started:** 2026-10-03 (session 14, Sonnet)  
**Finished:** —

---

Source (user, 2026-10-02): sounds and voices from the previous SeedVale app were added to `public/sounds/` (136 files, ~13 MB, commit `6a5083e` "Sounds temp without credits"): 76 effects/ambience (`action-*`, `ambient-*` loops, `animal-*`, `fauna-*`, `bow-*`, `door-*`, `footstep-<surface>-*`, `inventory-*`, `thunder-*`, `ui-click-*`, `water-lap`, `pine-tree-falling`, `meadowsinging-birds`) and 60 voice lines in `public/sounds/voices/` named `<role>_<sex>_<situation>_NN.mp3` (roles: general, guard, shepherd, …; situations: greeting, farewell, call_for_help, danger_alert, combat_start, exhausted, hungry, weather_shelter, work_finished, attention, livestock_danger, …). Today the game's audio is procedural only (`src/game/audio/ambience.ts`) with a tested limiter (`voices.ts`, WORLD-10 `implemented_unverified`). New voices beyond these are produced by the user (Fish Audio free tier, D-PLAN-9).

## Licence gate (blocking for release, not for development)

**User, 2026-10-03 (D-USER-1 c):** use the sounds now; they were free, but no official release without a complete credits/licence list.


The commit says "temp without credits". Every file needs a source + licence line in `docs/assets/README.md` / `public/assets/CREDITS-CC-BY.txt` before a release build; files without a known licence are replaced or removed then. ❓ user: sources/licences of the old app's sounds (the `alt-mayra` footsteps and Fish Audio voices especially). Until then the plan proceeds; the release checklist gets an item.

## Design

1. **Sound catalogue as data** (`src/game/audio/catalogue.ts`, no sim imports): id → files (variants), category (`ambient-loop`, `one-shot`, `voice`, `ui`), base gain, max distance, cooldown/limiter rule. Built from the file names by a small script (`scripts/assets/sound-catalogue.mjs`) that also checks every referenced file exists (test).
2. **Event → sound map.** Sim already emits `SimEvent`s (`hit`, `death`, `sound`, `swing`, `shot`, …) and the player activities have kinds (chop, dig, drink, cook, build, …). Audio listens to events/activities only (layering: audio never imports sim mutators; reads state through `Game`). Footsteps by surface (grass/forest/gravel/sand/stone from biome/road/building floor), walk vs run.
3. **Ambience layers** replace or sit on top of the procedural beds by biome/time/weather: meadow/forest/coast/lake loops, night crickets/owl, wind, rain/storm, thunder distance from lightning (if any) or random in storms, fire loop near lit fires (`collectFires` result), cave (later, `world--003`). Cross-fades; at most N loops at once; distance attenuation via a single listener (the player).
4. **NPC voice lines:** selection by role (profession → `guard`/`shepherd`/…, else `general`) × sex × situation; triggers: greeting/farewell on dialog open/close, call_for_help on `callForHelpAt`, danger_alert / combat_start when an NPC starts `fight`/`flee`, exhausted/hungry from needs, weather_shelter on the `shelter` goal, work_finished on duty completion, livestock_danger for shepherds. Limiter per NPC and global (existing `VoiceLimiter`), spatial (≤ 25 m), never more than one voice at a time near the player. Missing role/situation → fall back to `general`, then silence (no error).
5. **Settings:** existing volume settings split into master / effects / ambience / voices (UI-05 settings panel).
6. **Loading/perf:** lazy fetch + decode on first use, small LRU of decoded buffers, total decoded memory budget (~32 MB), no audio work in the sim tick; mobile: unlock on first touch (existing pattern).

## Steps

| # | Step | Model |
|---|---|---|
| 0 | Event/activity → sound map, mixing/priority rules, licence checklist item | opus |
| 1 | Catalogue script + data + existence test; loader with LRU and budget | sonnet |
| 2 | One-shots: actions (chop, dig, drink, cook, build, fire ignite/extinguish, pick-up/drop, door, bow, melee hit/kill, tree falling, well), animals (calls, death), UI click | sonnet |
| 3 | Footsteps by surface + walk/run | sonnet |
| 4 | Ambience layers by biome/time/weather + fire loop + thunder | sonnet |
| 5 | Voice lines with triggers and limiter; tests for selection/fallback and limiter caps | sonnet |
| 6 | Volume channels in settings; e2e: 0 console errors with audio on, no audio fetch before first input | sonnet |
| 7 | Exit: ❓ user listen (WORLD-10 + this plan), licence table complete before release | user |

## Result (session 14, 2026-10-03)

Steps 0–5 implemented; 6 partial; 7 is the user's listen + licence table (release gate, D-USER-1 c).

- Step 0 decisions (Sonnet defaults, Opus/user to confirm): sample playback sits **inside** `Ambience` (single AudioContext, three buses fx / ambient / voice under master); recorded sounds replace the synthetic ones only once decoded (synth stays as fallback, so a missing/slow file is never silent-broken); the voice bus uses the **effects** volume until a separate "voices" slider exists (step 6); `sound` sim events are attenuated by distance (floor 0.15, 80 m). Licence checklist item: see "Licence gate" above and PROGRESS ❓ — **release blocker: complete credits/licence list for all 136 files**.
- Step 1: `scripts/assets/sound-catalogue.mjs` → `src/game/audio/soundFiles.ts` (generated list); `catalogue.ts` groups files into ids with variants; `samples.ts` lazy fetch + decode, LRU under a 32 MB decoded budget, one-shots and crossfaded loops. Test: every catalogue file exists, every file on disk is catalogued (`catalogue.test.ts`).
- Step 2: one-shots for animal calls, melee hit, tree falling, thunder, owl, fire (sim `sound` events + ambience kinds → `KIND_SAMPLES`); player activities (`ACTIVITY_SOUNDS`: chop, mine/dig, build/repair, craft/roast, drink, gather) played from `Ambience.frame`.
- Step 3: footsteps by surface (`surfaceFor`: road → gravel, beach → sand, mountain → stone, forest/swamp → forest, else grass), walk / run / sneak cadence.
- Step 4: ambience beds (forest, meadow, night crickets, swamp/lake frogs, wind, coast, rain / storm) replace the synthetic wind/waves/rain while the sample plays. **Not done:** fire loop near lit fires, cave (`world--003`), door/inventory/UI click one-shots (hook points: `Game` interact/inventory actions).
- Step 5: `voiceId` (role + sex + situation, fallback role → general → silence, never the wrong sex), `VoiceDirector` (≤ 25 m, one voice at a time, 20 s per-NPC cooldown, urgent lines cut in), triggers: dialog open/close (greeting / farewell), goal changes near the player (fight → combat_start, flee → danger_alert, shelter → weather_shelter), `callForHelpAt`. Not wired: hungry/exhausted/work_finished/livestock_danger/quest lines.
- Step 6 todo: separate master/effects/ambience/**voices** sliders; e2e check that no `/sounds/` fetch happens before the first input.
- 2026-10-03 (session 15): fire loop was already in (`ambient-fire-loop` near lit fires); added inventory pick-up/drop one-shots for trade (buy/sell) and storage moves. Doors: the sim has no door mechanic, so `door-*` files stay unused until buildings get one.
