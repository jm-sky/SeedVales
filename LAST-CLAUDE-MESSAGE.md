# Last Claude Message

**Date:** 2026-09-30 21:45

Your usage limit was reached, so I stopped partway through wave 2 (ui--001). Everything so far is committed and pushed to main; the last commit is 0e0e9e1, and 103/103 tests pass.

Done:
- v1 is declared done. All of stage 0 is finished: the review-fix plan, the performance audit with docs/state/PERF.md, the seasonal-yields test, and the independent review. The review raised 10 issues and all are fixed; its record is in docs/reviews/2026-09-30--002--v1-closure-review.md, and the reasoning is in PROGRESS.md.
- The one v1 item still unverified is the ambient sounds: the logic is tested, but they need a human to listen to them.
- Wave 1 (sim--001) is done:
  - Animals and NPCs decide about once per second, and hits, shots and calls for help force an immediate reaction.
  - Wild animals fear people, fire and pens, except when guarding young or their den.
  - Farm animals run to their shepherd or pen when threatened.
  - Eating a corpse takes time and a person can interrupt it.
  - Hits leave blood traces that fade (faster in rain), lure predators and are saved with the game. Drawing them on screen is still to do, in render--001.
- Wave 2 (ui--001), partly done:
  - A character screen (K key): health, illnesses, attributes and skills, reputation, and choosing the primary melee and ranged weapon, with X to switch between them.
  - The inventory now has category filters, sorting and an item-details view.

Left to do:
- The independent review of wave 1 was stopped before it finished. It needs to be re-run on git diff d3a31e2..40d243b -- src.
- The rest of ui--001:
  - a mobile "Broń" button and e2e steps for the new screens;
  - a test for the weapon-slot logic;
  - the map and minimap with an arrow to the target;
  - settings for graphics quality and volume;
  - named saves and "new game" from the in-game menu;
  - Tab to cycle between nearby targets.
  - The UI-03 requirement stays planned until then.
- Waves 3–5 haven't started.
- The exact next step is written in docs/state/PROGRESS.md.

Caveats:
- The machine was under heavy outside load late in the session (load average 3–7). Benchmark timings from then are unreliable; I compared new against old code back to back under the same load, and they came out equal within noise.
- The rat-quest e2e step failed a few times until I tied rats to their nest; after that it passed three runs in a row.
