# Kick-off: Sonnet session — finish review round 1, user decisions D-USER-1, then the roadmap

*Written 2026-10-03 by session 13 (Opus, WSL). Previous kick-off: git history.*

You continue SeedVales (Vue 3 + TS + Three.js, pnpm). You are **Sonnet**: you implement; decisions that are Opus work (architecture, keep/drop, reviews) are either already made in `docs/design/DECISIONS.md` or you record a short proposal and continue with the safe default. Work autonomously, no questions to the user; disputed points go to DECISIONS. **English everywhere (D-LANG-1).** `SAVE_VERSION` 9 (unreleased — new saved fields this cycle need no extra bump), `GEN_VERSION` 9.

## 0. Rules (from CLAUDE.md, non-negotiable)

- Read `CLAUDE.md`, `docs/state/PROGRESS.md` ("Teraz"), `git log --oneline | head -30` first.
- Never weaken tests, criteria, thresholds, budgets or baselines; "flaky" is not a diagnosis (find the cause — acceptance 8b had one unexplained failure in an agent run on 2026-10-03; if it recurs, trace it).
- After every step: skill `verify` (`pnpm check`, `pnpm e2e:run > log; echo $?` — check the exit code). Before every commit: skill `handoff` (FEATURES, plan result, PROGRESS, DECISIONS). Commits with the attribution lines from the system reminder. **No push without the user's consent.**
- Subagents only with `isolation: "worktree"`, and forbid `git checkout/switch/reset/stash`; commit what they need first. **The user sometimes runs `git pull --rebase` on main** — after that, merge agent work by cherry-picking the agent's own commits (merging an old-hash branch conflicts everywhere). Worktree vitest: the default config excludes `.claude/**` — agents must use a temp config and never commit it.
- `pnpm soak` judges timing only on a quiet machine (D-VERIFY-1): don't run soak/bench in parallel with e2e or other agents.
- GPU benchmarks (`SV_GPU=1`) only one per command, result straight to a file under `test-results/` (WSL crashes).

## 1. Finish review--001 round 1

1. **UI batch of app review 016 (interrupted by a rate limit):** branch `worktree-agent-a50398712de203e8d` (worktree `.claude/worktrees/agent-a50398712de203e8d`), WIP commit `8b4c067`, **unverified**. Findings #3, #7, #8, #10, #11, #12, #13, #14, #15, #16 — read `docs/reviews/2026-10-03--016--app-review-round-1.md` (findings + Triage table, binding). Review the WIP diff (`git show 8b4c067`), finish what is missing (failing-first tests named with FEATURES IDs; `node scripts/e2e/review-run.mjs ui` small-button hits on mobile → 0, report before/after), verify, then cherry-pick onto main (or redo cleanly on main if the WIP is poor), fill the Fix-commit column, remove the worktree + branch.
2. Small leftover: Q03 E1 journal still says Miles "owes you a load of firewood" when NPCs did the repair — make the text depend on `myRepairs`/beams (adjust the pinned test to the new rule, don't delete it).
3. On main, quiet machine: `pnpm check`, `pnpm e2e:run`, **`pnpm soak --days=10 --seeds=1337,7,42,3,11,99`** (all 0 violations), `pnpm bench:sim` (no baseline update; earlier runs were under load — record numbers in PERF.md).
4. **Round 2** (review--001 §5): app review + code review only of the fix range since round 1 (`git log` from `2b52d64`), via skills `wave-review` (code) and `app-review` (Opus reviewers in worktrees). Triage, fix, at most round 3; what remains → ❓ user in PROGRESS. Then mark `quests--001`, `verify--001` and `review--001` step 4 done (handoff).

## 2. User decisions D-USER-1 (2026-10-03) — implement

1. **Names:** NPC surnames suggest the profession (check `SURNAMES` in `data/professions.ts` covers every profession with fitting names); **the home settlement's first guard is always "Mark Hornblower"** (`createNewGame`, new games only, no GEN bump). Test.
2. **Quest icons above NPC heads:** `!` offered, `?` NPC has the next step/hand-in, ✔ stage completed with this NPC — authored and board quests, near the player only, hidden in unexplored cells (MAP-01). Read state via `Game` (e.g. `game.questMarkersFor(npcId)`), render as a sprite/HTML overlay consistent with the name labels. e2e assertion.
3. **NPC name labels:** check what our version shows now; target: name + surname only when close (fades with distance), like the previous app; keep fog (D-USER-1 d).
4. **Sounds:** start `audio--001` (`docs/plans/audio--001--recorded-sounds-and-voices.md`) — use `public/sounds/`; add the release gate item "complete credits/licence list" to the plan and PROGRESS ❓.

## 3. Then the roadmap (`docs/roadmap/v1-closure-and-appendix.md`, "Order update 2026-10-03")

`render--009` step 3 (stockpiles WSL verification — CLAUDE.md handoff note; Opus decision on the 4 k tri budget: keep if `crowded-settlement` A/B is within noise, else reduce detail in the generator) → wave 5 (`world--001` steps 2–3 LOOT-01, `settlement--001`) with wave 5a `audio--001` alongside → wave 5c combat (`combat--001` → `002` → `004` → `003`; each plan's "Decisions for Opus": take the plan's recommended option, record it in DECISIONS, continue) → wave 6 → `proposals--001` → `docs/roadmap/later-vision-backlog.md` L1–L7 (D-PLAN-9).

## 3a. Long-running autonomy (user, 2026-10-03: "work long, on your own")

- **Keep going until the session limit.** After one item is verified and committed, take the next one from §1 → §2 → §3 without asking. Never end a turn with a plan, a summary of "what I would do next", or a question — do it.
- **Blocked on a decision?** Take the plan's recommended option (or the safest reversible one), record it in DECISIONS as "Sonnet default, Opus/user to confirm", add it to PROGRESS ❓, continue. Blocked on a tool/environment problem: diagnose, work around, record; move to the next independent item meanwhile.
- **Checkpoint often:** small verified commits (one finding / one plan step each), PROGRESS "Teraz" updated at every checkpoint, so an interrupted session (rate limit) loses nothing. Before a long command, commit what you have.
- **Use worktree subagents for parallel independent items** (e.g. a fix batch while you review), at most 2–3 at a time, each with the hard rules from §0; cherry-pick their own commits. If an agent dies on a rate limit, commit its worktree changes as `wip(...)` on its branch and resume it later.
- **Quality bar stays:** every fix has a failing-first test; every step ends with `verify`; soak/bench only on a quiet machine; no weakened criteria. Reviews (wave-review, app-review) run Opus subagents (`model: "opus"`) — D-PLAN-7.
- **Do not push**; the user pushes. Do not touch `docs/assets/textures/` (user's untracked work).

## 4. End of session

Skill `verify`, skill `handoff`; PROGRESS "Teraz" with numbers and the next step; rewrite this kick-off; short report to the user (done / verified with numbers / open).

---

**Start message (paste into the Sonnet session):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it autonomously for as long as the session allows: §1 (finish review round 1: the interrupted UI batch of review 016, full soak, round 2), §2 (user decisions D-USER-1), then §3 through the roadmap, following §3a (long-running autonomy). Work on your own — no questions to me; decide with the plan's recommended option and record it in DECISIONS. Verify after every step, handoff before every commit, small checkpoint commits, no push. Don't stop at a plan, a summary or a question; when the session ends, leave PROGRESS and the next kick-off up to date.
