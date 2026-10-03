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

## 1. Resume (state: `docs/state/PROGRESS.md` "Teraz")

Review round 1 + 2, D-USER-1, audio steps 1–5, render--009, LOOT-01, SET-05 slice, combat--001/002 are **done**. The user's `git pull` brought new plans (wave 5d in the roadmap).

1. (done) `combat--004` jump — see PROGRESS; leftover: jump animation clip, mobile Jump e2e, Opus review.
2. `combat--003` directional dodge (low priority; depends on melee timing — read its plan first).
3. **Wave 5d** (`docs/roadmap/v1-closure-and-appendix.md`): `items--001` → `economy--004` ‖ `combat--005` → `economy--003` (each plan's "Decisions for Opus": take the recommended option, record in DECISIONS).
4. Audio leftovers (`audio--001` step 6 e2e "no `/sounds/` fetch before first input", fire loop, door/UI one-shots); `world--001` chests; wave 6; `proposals--001`; later backlog L1–L7.
5. After wave 5c/5d: run a review round (skills `wave-review` + `app-review`, Opus), then soak on a quiet machine.

## 2. Hygiene

- The user does `git pull --rebase`; after a pull re-run `pnpm check` before continuing.
- Sound licences / credits are a release gate (❓ user). Do not touch `docs/assets/textures/`.

## 4. End of session

Skill `verify`, skill `handoff`; PROGRESS "Teraz" with numbers and the next step; rewrite this kick-off; short report to the user (done / verified with numbers / open).

---

**Start message (paste into the Sonnet session):**

> Read `NEXT-SESSION-KICK-OFF-PROMPT.md` in the repo root and execute it autonomously for as long as the session allows: §1 (finish review round 1: the interrupted UI batch of review 016, full soak, round 2), §2 (user decisions D-USER-1), then §3 through the roadmap, following §3a (long-running autonomy). Work on your own — no questions to me; decide with the plan's recommended option and record it in DECISIONS. Verify after every step, handoff before every commit, small checkpoint commits, no push. Don't stop at a plan, a summary or a question; when the session ends, leave PROGRESS and the next kick-off up to date.
