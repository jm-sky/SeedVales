---
name: app-review
description: Review the running SeedVales application (gameplay, graphics, UX) via a worktree-isolated Opus subagent that drives the real app headless with the review scenario scripts and reads the screenshots, then triage the findings. Use in every review--001 round together with wave-review (code) and the soak, and before a release candidate.
---

# app-review

Process: plan `docs/plans/review--001--review-fix-loop.md` (one round = code review via skill `wave-review` + this application review + soak `pnpm soak`). Subagent rules (always `isolation: "worktree"`, forbidden `git checkout/switch/reset/stash`): `CLAUDE.md` → "Standing rules". Verification commands: skill `verify`.

## 1. Prepare

1. Preconditions: `pnpm check` green, `pnpm e2e:run` green, the latest soak report triaged. **Commit everything** — the reviewer's worktree is created from a commit.
2. Next free review ID: `ls docs/reviews` → highest ID + 1. Report path `docs/reviews/YYYY-MM-DD--ID--app-review-<round>.md` (format: `docs/reviews/README.md`; legend ✅ confirmed · 🟡 assumption · ❓ open).
3. Round number and scope: round 1 = whole app; rounds 2–3 = only the areas touched by the fix range (`git diff --stat <round-1-fix-base>..HEAD`) plus a smoke of their neighbours. **Max 3 rounds** per wave; what is left after round 3 goes to the user as ❓ in PROGRESS "Teraz".

## 2. Scenario scripts (the reviewer runs these; they do not assert gameplay, they produce evidence)

All in `scripts/e2e/`, built on `lib.mjs` (`launch`, `newGame`, `sv`, `shot`), started against their own server like `e2e:run` (`node scripts/e2e/review-run.mjs [scenario…]`, default all). Output: `test-results/review/<scenario>/NN-<step>.png` + `observations.json` (numbers the reviewer judges: prices, need rates, damage, times, counts) + `ui-checks.json` (automatic DOM checks below). Console errors are collected per scenario.

| Script | Scenario | Evidence captured |
|---|---|---|
| `review-start.mjs` | new game → first 2 game hours: look around, eat, drink at the well, read the notice board, sleep a night in the inn | needs over time (hunger/thirst/vigor per game hour), message log, HUD at each step |
| `review-economy.mjs` | trade with the trader and a non-trader NPC, gift, hire a companion, warehouse take/deposit, smith order | buy/sell prices of 10 common goods, opinion changes, treasury before/after, refusal texts |
| `review-combat.mjs` | fight a wolf and a boar with the club, then with a bow; get knocked down; bandage; herbalist healing | damage per hit, hits to kill, stamina use, KO duration, bleeding, heal amounts |
| `review-build.mjs` | place a campfire, a hearth, a shed; deliver materials; build; light/feed/douse the fire; plant a torch | material counts, build times, fuel hours, failure messages |
| `review-quests.mjs` | each authored quest's main path (quests--001) and one board quest (rats) | dialog lines shown, journal text per stage, rewards and their sources |
| `review-ui.mjs` | open every panel (inventory, character, craft, build, map, journal, quests, trade, storage, dialog, hire, gift, orders, settings, game menu) on desktop 1280×720 and on the mobile viewport (as `mobile.mjs`), empty and filled states | one screenshot per panel × viewport; `ui-checks.json` |
| `review-frames.mjs` | the `ab.mjs` frame list (settlement noon/dusk/night, winter-snow, overcast, meadow-hills, mountain-river, meadow-grass, forest-edge, fire-close-night, traces, rolling-hills, lake-shore, river-bank) on `low` and `medium` | screenshots only |

Automatic UI checks (`ui-checks.json`, per panel × viewport): elements with text overflow (`scrollWidth > clientWidth + 1` on text nodes' parents inside panels), elements outside the viewport, buttons smaller than 32 px on mobile, panels without a close control, visible text that is not English (non-ASCII letters outside proper names) — each check lists the selector and text.

## 3. Spawn the reviewer

`Agent` with `isolation: "worktree"`, `model: "opus"` (reviews are Opus work, D-PLAN-7). The prompt must include:
- the round number, scope, and the report path; `docs/IMPORTANT-PRODUCT-NOTES.md`, `docs/VISION.md` (relevant sections), `docs/design/ui-english-glossary.md`, the FEATURES IDs under review;
- the ban: **no `git checkout`, `git switch`, `git reset`, `git stash`; no edits to `src/`**; it may fix the review scripts themselves if they break (commit them separately and say so);
- run `pnpm install --frozen-lockfile`, then `node scripts/e2e/review-run.mjs`, then **actually look at every screenshot** (Read tool) and read `observations.json` / `ui-checks.json`;
- judge three areas:
  - *Gameplay:* is each loop completable, are numbers sane against `docs/VISION.md` and `config/calibration.ts` (prices, damage, hunger rate, build times), dead ends, soft-locks, unclear goals, missing feedback;
  - *Graphics:* artifacts, popping, wrong lighting/shadows, z-fighting, effects that read badly at the normal camera distance, fog-of-war leaks on map/minimap. SwiftShader caveat: no FPS/GPU claims (D-PERF-2);
  - *UX:* reachability of every action on desktop and touch, text overflow, glossary terms, discoverability, empty/error states, keyboard/touch parity;
- findings table: `#`, area, severity (blocker / major / minor), ✅/🟡/❓, reproduction (exact `__sv` calls or clicks), screenshot path, expected vs. actual. Taste-only visual remarks are tagged ❓ user, not major.

## 4. Triage (you, main tree)

For each finding: reproduce → (confirmed) failing regression test or e2e assertion named with the FEATURES ID → minimal fix (Sonnet for non-trivial fixes, D-PLAN-7) → skill `verify`. Rejected findings get a reason. ❓ user findings are listed in PROGRESS "Teraz", not fixed. Copy the report into `docs/reviews/`, fill the triage table and a summary (confirmed / fixed / rejected / ❓ counts), commit.

## 5. Next round / stop

Next round reviews only the fix range. Stop when a round yields no confirmed blocker/major, or after round 3. Record the loop state (round, open findings) in the review header and PROGRESS "Teraz". Clean up worktrees (`git worktree remove <path> --force`, `git branch -D <branch>`).
