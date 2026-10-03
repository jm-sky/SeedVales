# Verification stage: multi-day soak run, NPC-life invariants, event log

**Status:** done  
**Model:** sonnet — tooling and checks; opus — reading the results, deciding what is a defect  
**Domain:** verify  
**Sub domains:** sim, diag  
**Roadmap:** [stage V](../roadmap/v1-closure-and-appendix.md) (after each wave that changes sim, and before every release candidate)  
**Created:** 2026-10-02  
**Finished:** 2026-10-03

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
- Step 1 done: event log + conservation ledger `src/game/sim/eventLog.ts` (`sim.enableEventLog()`, ring 50 000, off by default = one null check per hook, not saved), hooks at every item source/sink and money flow, tests `sim/eventLog.test.ts`. Ledger clean on 3 seeds × 10 days (every item balanced, money constant).
- Step 3 done: invariants `conservation`, `economy`, `fire`, `perf`, `working-output` in `diag/soak.ts` (`SOAK_LIMITS`, `PROFESSION_OUTPUT`, `PROFESSION_CYCLE_DAYS`); CI variant runs them over 2 days. Results and violation triage: [review 015](../reviews/2026-10-02--015--soak-economy-invariants.md).
- Result: seed 1337 red on `working-output` (traders: caravans never finish the second trip — shelter/eat preempt the goal, real NPC-life defect, not fixed, not loosened); seeds 7 and 42 clean.
- Thresholds (for Opus review; calibrated on the first clean run `--days=10 --seeds=1337,7,42`, never loosened to hide a violation):
  - conservation tolerance **0** — quantities and coins are integers, freshness is not part of the count; every residual is a missing hook or a real leak.
  - treasury ≥ 0, ≤ **10×** its start, not at 0 for **3** day-closes in a row — measured: the sum grows ~1.25× in 10 days from taxes (no outflow), so 10× is a runaway, not noise.
  - essential goods (bread/grain = food, log/branch = fuel) present in some store of every settlement, not 0 for **2** day-closes in a row — measured: never 0.
  - prices: buy within [1, base × quality × 1.15 × 1.8] and resale ≤ buy — the envelope of `trade.ts` (scarcity 1.15, mood cap 1.8).
  - hearth lit ≥ **90 %** of day-time samples per settlement — measured 100 % (worst day 97 %); 90 % is the survival--001 acceptance value.
  - `sim.tick` p95 ≤ **4 ms** — the D-PERF budget (PERF.md); measured 0.9–2.0 ms with the log ON (0.5 s step = 5 sub-steps).
  - heap growth after day 0 ≤ **40 MB** — measured 8–9 MB after a forced GC (plateau from day 4); ~4.5× margin, deliberately generous because GC timing varies across Node versions.
  - working-output: ≥ **80 %** of days with output per profession (world-wide), evaluated from 3 days. Output defined *before* looking at results (`PROFESSION_OUTPUT`): farmer harvest or field work, woodcutter felling, hunter butcher/drying/fletch, shepherd shearing/flock work/trough, herbalist garden or herb gathering, blacksmith forge/smelt, trader caravan trade/food sale, guard torch/fire/patrol. Two documented departures (Opus: judge them): **trader** — a caravan round trip is days long, so the rule is "output at least once in every 6-day window" (`PROFESSION_CYCLE_DAYS`; skipped on runs shorter than 6 days, i.e. the CI variant); **blacksmith** — exempt from the day share while every smith's store holds ≥ 6 tools (`SMITH_STOCK_CAP`: forging stops by design without demand), the exemption is printed as an info line.
- Open: fix the caravan trip (see review 015 finding 1) with a regression test; decide whether demand-capped blacksmiths are acceptable; farmer/shepherd/guard "output" includes work acts (field tending, herding, looking around), so those three are close to goal-share — a stricter item-only variant would need real crop/wool cycles longer than the 10-day run.

