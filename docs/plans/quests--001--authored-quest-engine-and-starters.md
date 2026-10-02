# Authored quests: stage-machine engine + four starter quests

**Status:** in_progress  
**Model:** opus — step 1 (engine design, save format), quest-by-quest acceptance review; sonnet — implementation of steps 2–6  
**Domain:** quests  
**Sub domains:** sim, dialog, ui, save  
**Roadmap:** [wave 5b](../roadmap/v1-closure-and-appendix.md) (after `world--001` landmark/treasure hooks; the starters below do not need them)  
**Created:** 2026-10-02  
**Finished:** —

---

Source: [docs/design/quests/](../design/quests/README.md) (proposals, not canon) and [QUEST-WORLD.md](../design/quests/QUEST-WORLD.md) (cast, places, reward calibration — wins on conflict). FEATURES: `QUEST-03` (today `deferred`, scope `later`) → promoted to `v2` by this plan. Existing sim-driven board quests (`sim/quests.ts`: rats, wolves) stay as they are.

## Choice of starters (decision, 2026-10-02)

Criteria: every mechanic the quest needs already exists (no new sim system), set in the home settlement H only (no cross-settlement travel in the first slice), small scale, different mechanics so the engine is exercised from several sides, and no dependency on unfinished work (FAUNA-09, landmarks, hair library).

| Quest | Why it is a starter | Mechanics exercised | Not needed |
|---|---|---|---|
| **Q03 A Roof Before Rain** | building condition, repair, household consent, lending from the common store; rain now exists (render--001 step 2) | `Building.durability`, repair action, warehouse/common store, opinion | — |
| **Q07 Six Bowls, One Pan** | cooking capacity (`FOOD-03`), freshness, gifts/relations; no threat | cooking, spoilage, `SOC-01`, NPC schedule (guard covering a watch) | — |
| **G03 Night Torches** | torches/fire (`survival--001`), guard rota, night | planted torch, fuel, time-of-day condition, guard duty | — |
| **G01 Lost Lamb** | fauna search + return, a second outcome axis (who gets the animal) | fauna with persistent id, tracks/blood traces (`TRACE-01`), carrying | persistent-hare appearance (that is Q01, not G01) |

Deferred to later waves: Q01 (needs FAUNA-09 white hare), Q02/Q06/G02/G06 (two settlements), Q05/Q10–Q13 (treasure/landmarks, `world--001`), G04 (2-day timer + marsh), G05/G07/G08 (social/forest tracking — second batch once the engine has proven itself).

## Steps

### 1. Engine design — **Model: opus**
A data-driven stage machine, not hand-written code per quest: a quest definition in `data/quests/<id>.ts` (id, giver, start conditions as predicates over sim state, state flags, stages with transitions, endings with world effects and rewards); runtime state in `state.authoredQuests[id] = { stage, flags, choice, settled, startedAt }` (saved → `SAVE_VERSION` bump, rejection test, D-SAVE-7). Hooks: dialog node conditions/effects (flags, `choice`), field observations (a position + dwell-time trigger, not dialog), item/building predicates, a quest-system tick that only re-evaluates **active** quests (PERF-01; no world scans). Layering: definitions are `data/`, evaluation `sim/`, journal UI `ui/` through `Game` methods. Conservation: reward = a transfer from a named source (settlement treasury / household stock), never minted (D-ECON-3). Parallel quests allowed (QUEST-WORLD "Parallel quests"). Deliverable: design note in `docs/design/` + `DECISIONS` entry, reviewed before step 2.

**Done 2026-10-02 (session 13, Opus):** [quests-engine.md](../design/quests-engine.md), D-QUEST-1. Open questions answered by default: (1) giver dialog only; (2) QUEST-WORLD reward numbers accepted as defaults.

### 2. Engine + journal UI — **Model: sonnet**
Implement per the note; journal panel (active quests, current stage text, choices made); noticeboard/giver dialog entry; map marker only for explored cells (MAP-01). Tests named `QUEST-03`: state machine transitions, exclusive endings, `choice` change before settlement, save round-trip, older save rejected.

### 3–6. One quest each (Q03, Q07, G03, G01) — **Model: sonnet**, acceptance read by opus
Per quest: definition file transcribed from the design doc (English, glossary terms), unit test per ending (headless sim, `testSim`), one acceptance step in `scripts/e2e/acceptance.mjs` for the main path through the UI. Dialog text is taken from the design doc without paraphrasing logic; logic never depends on label text (ids/flags). Deviations from the design doc are written back into the quest file ("Implementation notes").

### 7. Exit
`pnpm check`, e2e acceptance + mobile green; the quest-soak (see [verify--001](verify--001--soak-and-npc-life.md)) runs with the four quests offered, and the NPC-life invariants still hold (quest NPCs keep their schedule; no stuck NPC waiting for the player).

## Open questions (❓ user)
1. Is the first slice allowed to add four authored quests to the noticeboard flow, or should they be offered only through giver dialog (design docs say dialog)? Default: giver dialog.
2. Reward calibration numbers (QUEST-WORLD) are proposals — accept as defaults?
