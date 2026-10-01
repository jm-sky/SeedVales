# Save: historical save fixtures for every format version

**Status:** draft  
**Domain:** save  
**Roadmap:** outside the waves (quality debt from [review 008](../reviews/2026-10-01--008--save-load-review.md) SAVE-07-3)  
**Created:** 2026-10-01  
**Finished:** —

FEATURES: `SAVE-01`. Decisions: D-SAVE-2, D-SAVE-4, D-SAVE-6.

## Why

Migration tests take a current snapshot, change `saveVersion` and delete a few fields. A real old save never contained the newer fields, so a migration can look green while relying on data an old save does not have. D-SAVE-4 already turns such a crash into a clean "corrupted" rejection, but the goal is that old saves actually load.

## Steps

1. For each format version v1…v6, rebuild a small representative save from the commit that introduced the next version (`git log -S 'SAVE_VERSION ='`): run the game headless at that commit (worktree), make a save with at least one order, one rat near a nest, one terrain edit, one running activity, a cart where it exists, and the NPC population; export the JSON.
2. Commit the fixtures under `src/game/save/fixtures/vN.json` (trimmed: keep the structures, shorten repeated arrays where the migration does not care).
3. One test per fixture: load through fake IndexedDB `readSave`, assert `SAVE_VERSION`, build `Sim`, install systems, advance 60 s, check money conservation and index usability (`sim.actors.query`, `sim.building`).
4. Every future `SAVE_VERSION` bump adds the previous version's fixture (rule for skill `handoff`).

## Exit

Fixtures for v1…v6 committed and loading; handoff skill updated with the fixture rule.

## Wynik

*(not started)*
