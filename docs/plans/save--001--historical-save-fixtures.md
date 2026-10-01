# Save: historical save fixtures for every format version

**Status:** planned  
**Domain:** save  
**Roadmap:** side track — before the next `SAVE_VERSION` bump, latest at the start of wave 5 (D-SAVE-7); quality debt from [review 008](../reviews/2026-10-01--008--save-load-review.md) SAVE-07-3  
**Created:** 2026-10-01  
**Finished:** —

FEATURES: `SAVE-01`. Decisions: D-SAVE-2, D-SAVE-4, D-SAVE-6, D-SAVE-7.

## Why

Migration tests take a current snapshot, change `saveVersion` and delete a few fields. A real old save never contained the newer fields, so a migration can look green while relying on data an old save does not have. D-SAVE-4 already turns such a crash into a clean "corrupted" rejection, but the goal is that old saves actually load.

## Scope and priority (roadmap update 2026-10-01)

Critical note: rebuilding six historical formats by running old commits is the expensive part, and the value is uneven. The most likely real saves are the recent formats; v1–v3 existed for about a day of development. So:

- **Required:** v6 (the previous format — every pre-session-3 save) and v5. Deliver before the next `SAVE_VERSION` bump.
- **Best-effort, timeboxed (~30 min each):** v4, then v3…v1. A version that cannot be reproduced cleanly from its commit is **not hand-crafted** from the current shape (that would repeat SAVE-07-3); its targeted test stays and D-SAVE-4 rejects broken data. Record which versions have fixtures in "Wynik".
- ❓ User: oldest supported save version (default: all).
- Step 4 is already in force (skill `handoff`, D-SAVE-7): it does not wait for steps 1–3.

## Steps

1. For each format version v1…v6, rebuild a small representative save from the commit that introduced the next version (`git log -S 'SAVE_VERSION ='`): run the game headless at that commit (worktree), make a save with at least one order, one rat near a nest, one terrain edit, one running activity, a cart where it exists, and the NPC population; export the JSON.
2. Commit the fixtures under `src/game/save/fixtures/vN.json` (trimmed: keep the structures, shorten repeated arrays where the migration does not care).
3. One test per fixture: load through fake IndexedDB `readSave`, assert `SAVE_VERSION`, build `Sim`, install systems, advance 60 s, check money conservation and index usability (`sim.actors.query`, `sim.building`).
4. Every future `SAVE_VERSION` bump adds the previous version's fixture (rule added to skill `handoff` on 2026-10-01).

## Exit

Fixtures for v6 and v5 committed and loading; v1–v4 committed or recorded as not reproducible; handoff skill has the fixture rule.

## Wynik

*(not started)*
