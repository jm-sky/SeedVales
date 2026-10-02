# Verification stage: multi-day soak run, NPC-life invariants, event log

**Status:** in_progress  
**Model:** sonnet — tooling and checks; opus — reading the results, deciding what is a defect  
**Domain:** verify  
**Sub domains:** sim, diag  
**Roadmap:** [stage V](../roadmap/v1-closure-and-appendix.md) (after each wave that changes sim, and before every release candidate)  
**Created:** 2026-10-02  
**Finished:** —

---

Goal (user, 2026-10-02): collect logs/events from several game days and see whether NPCs **live and keep working** — not only whether the tick is fast. `bench:sim` `long-run-5-days` already measures time and memory; this adds *behavioural* evidence.

## Design

1. **Event log (sim, cheap, off by default).** A ring buffer `sim.eventLog` (cap ~50k entries, enabled by a flag in tests/scripts; no save): `{ cal, kind, actorId?, settlementId?, data }` for: goal chosen/finished per NPC (`work`, `eat`, `sleep`, `trade`, `idle`, `flee`), item produced/consumed/traded (source + sink — the conservation ledger), money flows, deaths (cause), births/joins, quest transitions, "stuck" detection events. Layering: `core`/`sim` only; no three/vue.
2. **Soak script `scripts/soak/run.ts`** (Node, headless like `bench:sim`): seed(s) 1337 + two more, N game days (default 10, ×40 sleep acceleration where nothing watches), player scripted (idle in settlement / walks a loop / sleeps), writes `test-results/soak/<seed>-<date>.json` + a Markdown summary. `pnpm soak [--days=10] [--seeds=1337,7,42]`.
3. **Invariants (each a named check; the run fails on violation):**
   - *Alive:* ≥ X % of NPCs not dead at the end (X from deaths-by-cause: starvation/dehydration deaths must be 0 in a calm world).
   - *Working:* per profession, produced output per game day > 0 on ≥ 80 % of days (farmer crops, woodcutter wood, blacksmith orders, hunter game, shepherd animals…).
   - *Eating/sleeping:* every NPC eats and sleeps each day; no NPC idle > N game hours in a row while its needs are unmet.
   - *Not stuck:* no NPC with the same position (± 0.5 m) and a non-idle goal for > M min; no path-failure loop (the D-SIM-11 narrow-passage case is logged, not hidden).
   - *Conservation:* per item/money, produced − consumed − Δstock = 0 within tolerance (source/sink rule from CLAUDE.md).
   - *Economy health:* treasury and prices stay in bounds (no runaway, no zero stock forever).
   - *Fire/survival:* settlement fires are kept lit by day ≥ 90 % of the time (guard duty, `survival--001`).
   - *Perf:* `sim.tick` p95 inside the D-PERF budget over the whole run; memory growth bounded.
4. **Report.** Per-day table (population, deaths, output per profession, treasury, fires lit) + a list of invariant violations with the first event ids → `docs/reviews/YYYY-MM-DD--ID--soak-<slug>.md` (format of `docs/reviews/README.md`; legend ✅/🟡/❓). Opus reads it, classifies each violation (bug / calibration / accepted) and files fixes into the loop below.
5. **CI-sized variant:** `pnpm test` gets a 2-day soak on one seed (< 30 s) so regressions in NPC life fail early; the long run stays manual / per wave.

## Steps

| # | Step | Model |
|---|---|---|
| 1 | Event log + ledger hooks in sim (flag, ring buffer, tests) | sonnet |
| 2 | Soak script + summary + 2-day vitest variant | sonnet |
| 3 | Invariant set above with thresholds calibrated on a first clean run (never loosened to hide a violation — CLAUDE.md "Never weaken criteria") | sonnet, thresholds reviewed by opus |
| 4 | First long run (10 days × 3 seeds), report, triage | opus reads, sonnet fixes |
| 5 | Re-run after every wave (see [review--001](review--001--review-fix-loop.md)) | — |

Acceptance: one soak report on `main` with zero unexplained violations; every violation is fixed with a regression test or recorded in DECISIONS as accepted.

## Progress (2026-10-02)
- Steps 2–3 first slice done: snapshot recorder `src/game/diag/soak.ts` (no sim hooks), `pnpm soak [--days] [--seeds]`, CI variant `diag/soak.test.ts`. Invariants live: alive (hunger/thirst deaths; combat deaths are info), eating, drinking, sleeping, working per profession, not stuck, treasury ≥ 0.
- Step 4 first run: [review 012](../reviews/2026-10-02--012--soak-first-run.md) — 2 real NPC-life bugs found and fixed (hunter leash, unreachable water loop). 3 seeds × 10 days clean.
- Open: step 1 (event log + conservation ledger), economy/fire/perf invariants, output-based "working" metric.
