# Review → fix → review loop (code, gameplay, graphics, UX)

**Status:** in_progress  
**Model:** opus — reviewers and triage decisions; sonnet — fixes with regression tests  
**Domain:** review  
**Sub domains:** process, code, gameplay, render, ux  
**Roadmap:** [stage V](../roadmap/v1-closure-and-appendix.md)  
**Created:** 2026-10-02  
**Finished:** —

---

Goal (user, 2026-10-02): an automatic verification pass by Sonnet/Opus that reviews the **code** and the **running application** (gameplay, graphics, UX), producing findings that are fixed and re-reviewed until a round comes back clean. Extends skill `wave-review` (code only) with an application review.

## One round

1. **Preconditions:** `pnpm check` green, e2e smoke/acceptance/mobile green, soak ([verify--001](verify--001--soak-and-npc-life.md)) report clean or triaged. Everything the reviewer needs is committed (worktree is made from a commit).
2. **Code review** (`wave-review`, Opus, worktree): correctness, conservation, save/versioning, layering, spatial queries, fog of war, missing tests, perf budgets. Report → `docs/reviews/`.
3. **Application review** (Opus, worktree, drives the real app headless via `window.__sv` + `scripts/e2e/tour.mjs` / `ab.mjs` frames, reads screenshots):
   - *Gameplay:* a scripted/free-play session of N minutes per scenario (start → first needs → trade → fight → build → quest) — is each loop completable, are numbers sane (prices, damage, hunger rate), dead ends, soft-locks, unclear goals.
   - *Graphics:* frames per time of day/weather/season/quality profile (same frame list as `ab.mjs`): artifacts, popping, wrong lighting, effects that read badly at the normal camera distance. SwiftShader limits apply (D-PERF-2): no FPS claims.
   - *UX:* every panel on desktop and mobile viewport: reachability, text overflow, English glossary terms, controls discoverable, error/empty states, keyboard/touch parity.
   Findings use severity (blocker/major/minor), reproduction steps (exact `__sv` calls or clicks), a screenshot path and ✅/🟡/❓. Reviewer must not edit `src/`.
4. **Triage (main tree, opus decides, sonnet implements):** confirm → failing regression test (name includes FEATURES ID) → minimal fix → `verify`. Rejected findings get a reason. Visual/taste findings are tagged ❓ user and are not "fixed" without a keep/drop call.
5. **Re-review:** the next round reviews **only the fix range** plus a smoke of the areas around it; the loop ends when a round yields no confirmed blocker/major. Maximum 3 rounds per wave, then the remainder goes to the user as ❓ (no endless loop, no weakening of criteria).

## Cadence
- After each wave (as now) and **before every release candidate** a full round (code + app + soak).
- Review IDs are global (`docs/reviews/`); the loop state (round number, open findings) is kept in the review file header and in PROGRESS "Teraz".
- Model split: reviewers always Opus; Sonnet may run a cheap *pre-review* (lint-like pass over the diff) before the Opus round to remove noise.

## Steps
| # | Step | Model |
|---|---|---|
| 1 | Skill `app-review` (`.claude/skills/`): prompt template, scenarios list, frame list, report format — **done 2026-10-02** (`.claude/skills/app-review/SKILL.md`) | opus |
| 2 | Scenario scripts for gameplay review (`scripts/e2e/review-*.mjs`, reuse `lib.mjs`) | sonnet |
| 3 | Pending: session 11 ultrareview (PR #1, 4 findings) — first input of the loop; triage, close PR, delete `review/base-s11` — **done 2026-10-02**: 2 fixed, 1 deferred, 1 rejected (review 011 triage table) | opus + sonnet |
| 4 | First full round after `quests--001` and the first soak | opus |
