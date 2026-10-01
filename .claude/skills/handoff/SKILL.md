---
name: handoff
description: Close out a plan item or session in SeedVales — update FEATURES.json, plan result, PROGRESS.md, DECISIONS.md, check format version bumps, then commit and push. Use after each finished plan item and at session end.
---

# handoff

Rules (save/generator versioning, evidence discipline): `CLAUDE.md` → "Standing rules". Run skill `verify` first; hand off only green work.

## 1. State files

1. `docs/state/FEATURES.json` — set `status` for each touched requirement (`planned|in_progress|implemented_unverified|verified|blocked|deferred`) and fill `evidence` with real proof only (test names, e2e suite, bench file). No proof → `implemented_unverified`. Never weaken criteria without a `DECISIONS.md` entry (see its `$comment`).
2. The plan in `docs/plans/<domain>--ID--slug.md` — write the "Wynik" section (what was done, what was found already present, simplifications), set `Status:` and, when finished, `Finished: YYYY-MM-DD`.
3. `docs/state/PROGRESS.md` — update "Teraz" (verification counts, wave status, next step, ❓ items) and add a short entry below. Older history belongs in `docs/state/progress-log.md`.
4. `docs/design/DECISIONS.md` — add an entry for every significant decision (new `D-…` id, context, choice, consequence).
5. Roadmap `docs/roadmap/v1-closure-and-appendix.md` — only when a wave's status changed.

## 2. Format versions

- New or changed mutable state, or changed save shape → bump `SAVE_VERSION`, add migration in `src/game/save/migrate.ts` + test.
- Any generator change → bump `GEN_VERSION`.
- Record the current values in PROGRESS "Teraz". Quick check: `git diff <base> --stat -- src/game/save src/game/world`.

## 3. Commit and push (kick-off §3.7)

```bash
git add <specific files>        # never `git add -A`; skip test-results/
git commit -m "<type>(<scope>): <what>"
git fetch origin main && git merge origin/main
git push origin HEAD:main       # and the session branch, if any
```

Small commits, push after each finished item (the container is ephemeral). If the user said not to push, stop after the commit and say so.
