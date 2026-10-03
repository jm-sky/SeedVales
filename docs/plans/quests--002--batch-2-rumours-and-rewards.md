# Authored quests batch 2, rumours, item/knowledge rewards, non-lethal resolutions

**Status:** draft  
**Model:** opus — quest selection, rumour model, acceptance reads; sonnet — definitions, tests, e2e  
**Domain:** quests  
**Sub domains:** dialog, map, npc, fauna  
**Roadmap:** [later-vision-backlog](../roadmap/later-vision-backlog.md) stage **L2** (QUEST-04), after `quests--001` is done and reviewed  
**Created:** 2026-10-02  
**Finished:** —

---

Sources: [recon 013](../reviews/2026-10-02--013--full-repository-recon.md) G-03 (item/recipe/knowledge rewards), G-04 (rumours as lightweight exploration — also resolves the fog-of-war vs navigation tension behind M-01), G-07 (non-lethal/systemic quest resolutions — the wolf "drive off" deferred from M-02), C-03 (board quests pay coins only); quest designs in [design/quests/](../design/quests/README.md); engine [quests-engine.md](../design/quests-engine.md).

## Steps

| # | Step | Model |
|---|---|---|
| 1 | Rumours: NPC dialog reveals an approximate map region (settlement direction/distance, dangerous animal area, ore, landmark, merchant, shortage); stored as "known by rumour" (saved), confirmed by visiting; map shows a region, autopilot only to visited places (feeds `ui--002` step 5) | opus design → sonnet |
| 2 | Reward bundles for authored and board quests: items from a named store, recipe/knowledge unlocks, map reveal (rumour), service/discount — every item from a named source (D-ECON-1) | sonnet |
| 3 | Wolf trouble resolved without kills: the pack stays outside the threat radius for N hours after being scared/baited away (G-07); bonus for non-lethal | sonnet |
| 4 | Quest batch 2 in H/V: G05, G07, G08, Q02, Q06, then Q01 (needs FAUNA-09 white hare) — **moved to [quests--003](quests--003--remaining-authored-quests.md)** (all 17 remaining quests, waves W1–W2) | sonnet, acceptance read by opus |
| 5 | Treasure quests Q05, Q11–Q13; Q10 gold mine — **moved to [quests--003](quests--003--remaining-authored-quests.md)** (W3, W4) | later |
| 6 | Soak with all quests offered and their hold paths accepted (bounded holds, review 014 #1) — NPC-life invariants hold | — |
