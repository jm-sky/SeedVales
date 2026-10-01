---
name: wave-review
description: Run an independent review of a finished wave/plan via a worktree-isolated subagent, then triage findings with regression tests and fixes. Use after every wave (kick-off §2) or when asked for a review of a commit range.
---

# wave-review

Subagent rules (always worktree, forbidden git commands): `CLAUDE.md` → "Standing rules". Verification commands: skill `verify`.

## 1. Prepare

1. Scope = commit range + file list, e.g. `git log --oneline <base>..HEAD` and `git diff --stat <base>..HEAD`. Name the plans/FEATURES IDs under review.
2. Next free review ID: `ls docs/reviews` → highest `ID` + 1 (IDs are global; check kick-off/PROGRESS for reserved numbers, e.g. 006).
3. Report path: `docs/reviews/YYYY-MM-DD--ID--slug.md` (format: `docs/reviews/README.md`). Legend ✅ confirmed · 🟡 assumption · ❓ open.
4. **Commit everything the reviewer needs first** — a worktree is created from a commit, not the working tree.

## 2. Spawn the reviewer

`Agent` with `isolation: "worktree"`. The prompt must include:
- scope (range + files), the plans and FEATURES IDs, relevant `docs/design/DECISIONS.md` entries;
- the ban: **no `git checkout`, `git switch`, `git reset`, `git stash`**;
- ask for findings only (severity, file:line, failure scenario, how to reproduce) written into the report file in its worktree; no fixes to `src/`;
- focus: correctness, conservation (every flow has source and sink), save/migration, layering, per-tick spatial queries, fog of war, missing tests.

## 3. Triage loop (you, in the main tree)

For each finding:
1. Confirm it in the code (reproduce). Not real → mark "rejected" with the reason.
2. Write a regression test that fails (name includes the FEATURES ID).
3. Fix minimally; run skill `verify`.
4. Mark it "fixed" in the report with the test name.

Copy the report into `docs/reviews/`, add a summary (confirmed / rejected / fixed counts), commit.

## 4. Clean up

```bash
git worktree list
git worktree remove <path> --force
git branch -D <worktree-branch>
```

Then update plans/roadmap for the wave (`Status: done`, `Finished:`) — see skill `handoff`.
