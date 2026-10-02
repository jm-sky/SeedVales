# Final stage: proposals from Claude — new and interesting additions across areas

**Status:** planned  
**Model:** opus — research, proposals, scoping; sonnet — implementation of the chosen items  
**Domain:** proposals  
**Sub domains:** gameplay, world, npc, economy, ui, audio, render, tools  
**Roadmap:** last stage (after wave 5, wave 6 and the first full review loop)  
**Created:** 2026-10-02  
**Finished:** —

---

Goal (user, 2026-10-02): at the very end Claude proposes new, interesting things from different areas; the user picks a few and they get implemented. **Claude works autonomously** — the user does not want to manage this; proposals are prepared without interruptions and the user only chooses.

## Process
1. **Gather evidence first (autonomous):** soak reports ([verify--001](verify--001--soak-and-npc-life.md)), review-loop findings ([review--001](review--001--review-fix-loop.md)), `docs/VISION.md` / `VISION-APPENDIX.md` items not built, deferred FEATURES, quest packs not yet implemented, `docs/state/PERF.md` headroom, ❓ lists in PROGRESS, [recon 013](../reviews/2026-10-02--013--full-repository-recon.md) sections 4–5 (UI-01…07, G-01…07 — those already scheduled in `ui--002`, `economy--002`, `quests--002` are not proposed again), [later-vision-backlog](../roadmap/later-vision-backlog.md).
2. **Write the proposal document** `docs/proposals/YYYY-MM-DD--proposals.md`: 15–25 items grouped by area (gameplay loops, world/exploration, NPC life and social, economy/trade, survival, combat, UI/UX, audio, graphics, tools/modding, accessibility, mobile). Each item: one-line pitch, why it fits the vision (source), cost (S/M/L), dependencies, risk, what it would be measured by, 🟡 for assumptions. No vague items — each must be implementable with the existing systems or name the missing system.
3. **Rank and shortlist:** Claude marks a recommended shortlist (≈ 5) with reasons, balancing value, cost and risk; the user picks (any number, any order, may reject all).
4. **Plan and build the chosen items** as normal plans (`domain--ID--slug.md`), then each goes through verify (`pnpm check`, e2e, soak) and a review round.
5. If the user does not answer, Claude does not block: it continues with the recommended shortlist only for items marked S/M and low risk, and reports.

Seed ideas (not commitments, to be re-evaluated at that time): seasonal festivals and calendar events; companion/NPC memory of the player's deeds in dialogue; weather-driven NPC schedules (market days, harvest rush); fishing and boats; animal husbandry breeding; map annotation by the player; a journal with sketches of discovered landmarks; simple music/ambience layers by region and time; photo mode; calibration lab (`tools--001`).
