# Soak, first run (verify--001)

**Date:** 2026-10-02 · `pnpm soak --days=10 --seeds=1337,7,42` · snapshot recorder `src/game/diag/soak.ts` · legend ✅ confirmed · 🟡 assumption · ❓ open

## Findings

| # | Finding | Status |
|---|---|---|
| 1 | ✅ **NPCs died of thirst/hunger far from home** (seeds 1337 and 7, day 4–5: hunter, herbalist). Two causes: (a) the hunter chased game up to 1500 m from the settlement and was out of reach of food/water when needs ran out; (b) the `drink` goal kept choosing the nearest natural water point although the NPC could not reach it (slope limit/obstacles → `goto` fails → same point again), so a thirsty NPC looped between `drink`/`eat`. | fixed: `HUNT_LEASH_M` = 450 m beyond the settlement radius for game; an unreachable water point is skipped for a game hour (`badWaterKey` in `ai.cooldowns` — no save format change); tests `npc/waterFail.test.ts` |
| 2 | 🟡 Combat death: hunter killed by a predator on day 2 (seed 42, torso 86). Counted as info, not a violation (wolves exist; hunters do predator control). Whether the odds are fair is a calibration question. | open (info) |
| 3 | ✅ Recorder artefact: the last sample opened an empty extra "day" (false violations) — fixed (`playS - ε`). | fixed |

## Result after the fixes
3 seeds × 10 game days: 0 violations (alive, eating, drinking, sleeping, working per profession, not stuck, treasury ≥ 0). ~35 s per seed. CI-sized variant: `src/game/diag/soak.test.ts` (2 days, seed 1337).

## Not covered yet (verify--001 steps 1, 3)
Event log / conservation ledger (produced − consumed − Δstock), economy price bounds, fires-lit share, perf p95 over the run, thresholds calibration (currently fixed at 80 % share). Work is measured by goal share only, not by output.
