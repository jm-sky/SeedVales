
## Result

Commits: `e2ea110` (#4), the `fix(review-014)` quest-engine commit (all others), and the e2e step update. Tests live in `src/game/sim/questReview014.test.ts` unless noted.

| # | Result |
|---|--------|
| 1 | Fixed. Every hold has `until` (`hold.hours` / `untilHour`, default 3 h), a critical-need override (thirst < 30, hunger < 25, vigor < 10 lifts the leash, the NPC returns while the hold is valid), Q07 holds Mark only 16:00-24:00 of the promised day (`round_again` re-arms), Piers is provisioned (ledger-logged bread, waterskin refill). Tests: `QUEST-03 hold: every hold ...`, `... a critical thirst lifts the hold ...`, `... four game days with an accepted hold path of every quest ...` (SoakRecorder, 0 violations, guard resumes duty). No SAVE_VERSION bump (`until` optional, missing = expired). |
| 2 | Fixed. G03: 9 d stage-1 timeout, 36 h stage-2 timeout, 12 h stage-3 auto-close (max 11 days); Hazel held only until 06:00; `showScene` calls Mark and Hazel to the post at dusk. Tests: `QUEST-03 G03: abandoned at stage 1/2 ...`, `... after "talk gently" ...`, `... a chosen path the player never closes ...`, `... the dusk scene brings Mark to the post ...`. |
| 3 | Fixed. `questChoose` refuses unreachable nodes / non-talkable quests; Q03 thanks paid by the ending; Q07 torch limit in the option. Tests: `QUEST-03 Q07: the torch limit ...`, `QUEST-03 engine: a node the current topics cannot reach ...`, updated `questQ03.test.ts` E1. |
| 4 | Fixed (`e2ea110`): recovered arrows are `logProduce`d (`arrow_recovered`). Test `ECON-01: shooting and recovering arrows balances the ledger` in `eventLog.test.ts`. |
| 5 | Fixed. `unavailable()` refuses held NPCs; cast skips companions; `setHold` skips companions. Test `QUEST-03 hold: a held NPC cannot be hired ...`. |
| 6 | Fixed. Counter `on: 'visit'` counts lit posts the player stands by; journal/wait text updated. Test `QUEST-03 Q07: posts lit at dusk ...`. |
| 7 | Fixed. Piers despawns by rule once the player is > 8 m away; `DialogPanel` closes when its NPC is gone. Test: updated G01 E2 in `questG01.test.ts`. |
| 8 | Fixed. `assertSaveShape` validates every `authoredQuests` entry and `questHold`/`questFollow`. Test `QUEST-03 save: a malformed authoredQuests entry or hold is rejected cleanly`. |
| 9 | Fixed (text/journal say the store was repaid from Miles's own stock). Test `QUEST-03 Q03: the repair ending says ...`. |
| 10 | Fixed. Unaccepted endings are silent, not in the journal, and `quest ... started: true` is used by Q07. Test `QUEST-03 Q03: the family finishing the roof before the player accepted ...`. Open for the user: whether `family` may override an agreed but unfinished plan (needs a DECISIONS entry; not edited here). |
| 11 | Fixed (`readCtxOf`, transient cache, tick persists the stage anchor). Test `QUEST-03 anchors: ...`. |
| 12 | Accepted. Process-global log noted in `quests-engine.md` section 13. |
| 13 | Fixed (expired definitions skipped, cast cached). Tests `QUEST-03 offer: after the offer window ...`, `... reuses its cast ...`. |
| 14 | Fixed: `quests-engine.md` section 13 ledger bullet. |
| 15 | Fixed: `QuestTopics.vue` watches `npcId` (no UI test harness; verified by type-check/lint). |
