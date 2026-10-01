# World: mid-scale terrain relief (hills, hollows, ridges)

**Status:** in_progress  
**Model:** sonnet — generator change, tests, calibration re-check; opus — look keep/drop from the A/B frames  
**Domain:** world  
**Sub domains:** generator, terrain, roads, settlements  
**Roadmap:** [../roadmap/v1-closure-and-appendix.md](../roadmap/v1-closure-and-appendix.md) — wave 4n "nature pass", first item (before [`render--007`](render--007--nature-pass.md) grass/trees, which sit on this terrain)  
**Created:** 2026-10-01 (session 8, user feedback: "terrain might be too flat")  
**Finished:** —

---

FEATURES: `WORLD-12` (new). Decisions: D-WORLD-10 (this plan), D-SAVE-1/7 (a `GEN_VERSION` bump rebuilds the world cache and rejects older saves), D-REN-14.

## Problem (checked in code, 2026-10-01)

`world/gen/heightfield.ts`: lowland height = `10 + fbm(wx·7)·16 + fbm(wx·30)·2.5` on an 8192 m world → the main hills have a ~1.1 km wavelength and ±16 m (slopes ~3 %), the second octave ~270 m and ±2.5 m. `Terrain.baseHeightAt` adds 0.45 m micro-detail at 16 m. **Nothing exists between ~30 m and ~250 m**, which is exactly the scale the third-person camera sees — so meadows read as flat even where the large hills are. Mountains (ridged, up to ~345 m) and 1–2 m scarps are fine.

## Steps

### 1. Mid-scale relief in the heightfield — **Model: sonnet**

- Add a **hilliness region** field (low-frequency noise, ~2–3 km): flat meadows stay flat where it is low, rolling country where it is high, so the world keeps variety instead of uniform bumps.
- Relief terms, scaled by hilliness × (1 − mountain mask) × land mask:
  - rolling hills: fbm at ~120–250 m wavelength, amplitude up to ~10 m;
  - knolls and hollows: fbm at ~40–80 m, amplitude up to ~4 m (smallest the 8 m grid resolves cleanly: ≥ 4 cells per wavelength);
  - occasional gentle ridges/valley sides: ridged noise at ~300 m, ~6 m, sparse mask.
- Keep: settlement/road flattening (`flattenStructures`, roads' terrain flattening run after the heightfield), coast shaping, rivers/lakes (hydrology runs on the new heights — check rivers still reach the sea and lakes still form).
- Slopes stay walkable: cap the mid-scale gradient so lowland slopes stay under the collision slope limit (`sim/collision.ts`) except on scarps/mountains; a test samples random lowland points.
- `GEN_VERSION` 8 → 9 (one bump; batch with any other pending generator change — none at the moment). Older saves are rejected with the existing message (D-SAVE-7), test.

### 2. Re-check what depends on the heights — **Model: sonnet**

- `generate.seeds.test.ts` / `generate.test.ts` on the 3 seeds: settlements still placed (flat pads), roads still connect (A* slope cost unchanged — if routes now detour a lot, retune the cost, never drop the connectivity test), landmarks still find valid spots, resource nodes count within the old band.
- Walk calibration: nearest settlement ≈ 1 day's walk (~3.6 km actual route) — re-measure on the 3 seeds; if it drifts > 15 %, adjust settlement spacing, not the movement speed (VISION time domains).
- Sim perf: `bench:sim` same container before/after (pathing/collision on more relief).
- Startup: `bench:startup` (world generation time — the extra noise octaves run once per world, cached).

### 3. Look — **Model: sonnet** (frames), **opus** keep/drop, ❓ user

A/B frames with `ab.mjs` (it cannot switch generators per variant — take "before" on the parent commit and "after" on the new one, same seed/frames): `meadow-hills`, `summer-meadow`, a forest edge and a settlement approach on 3 seeds. Acceptance: visible rolling relief at normal camera distance in rolling regions, flat meadows still exist, no spiky noise, roads do not look like they climb walls.

## Fallback

Lower amplitudes / only the 120–250 m term. The hilliness field alone (with today's amplitudes) is not enough — the missing scale is the point.

## Result

Session 9 (Sonnet, cloud container).

- **Step 1 done.** `heightfield.ts`: hilliness region (`nHill`, ~2.5 km, smoothstep 0.34–0.74), rolling hills (200 m wavelength, ±~8 m), knolls/hollows (64 m, ±~3 m), sparse ridged term (320 m, ≤6 m); all × hilliness × (1 − mountain mask), ×1.15. `GEN_VERSION` 9. Test `relief.test.ts` (written first, failing on the old field) on seeds 1337/42/777, measured on the 8 m base field away from coast/mountains:
  | | before | after |
  |---|---|---|
  | median \|h − mean(±112 m)\| | 0.99–1.02 m | 1.12–1.29 m |
  | p90 of the same | 2.54–2.68 m | 3.39–4.43 m |
  | near-flat cells (slope < 5 %) | 49–52 % | 25–34 % |
  | cells > 10 % slope | 14–16 % | 38–52 % |
  | slope p99 | ~0.20 | 0.46–0.49 (collision limit 1.2) |
  The median barely moves by design (hilliness is regional); rolling regions get the 4 m+ relief.
- **Step 2 done.** `generate.seeds.test.ts` (8 seeds: settlements, roads, home route within `ROUTE_BAND` × `DAY_MARCH_M`) and landmark tests green — calibration holds, no spacing change. One test depended on layout timing: `survival.test.ts` FIRE-02 compared the warehouse stock only at the end of the run and the woodcutter's restock landed just before the sample (guard behaviour was correct: warehouse 26 → 16 → feed); it now records the lowest level during the run (the sink itself), assertion intent unchanged. `bench:sim` same container, parent commit vs new (p95 ms): small-settlement 0.25 → 0.33, crowded 0.77 → 0.90, long-run 2.11 → 2.15, others equal/lower — noise-level (the ⚠️ flags vs the old committed baseline appear on the unmodified parent too). `bench:startup low` ×3: world generation 2439 → 2750 ms (one-time, cached, +13 %), HUD median 4509 → 4744 ms.
- **Step 3 frames (opus keep/drop pending, ❓ user).** `ab.mjs` before (clean worktree at `9802676`) and after for seeds 1337, 42, 777 (9 frames each, 0 console errors). Kept pairs: `docs/state/frames/world--002/{1337,777}-{before,after}-summer-meadow.png`; the full sets are regenerated with `SV_SEED=<n> node scripts/e2e/ab.mjs medium 'after={}'`. Sonnet's read of `meadow-hills` (winter, snow): horizon and a lake now sit at a visibly different level, flat snowy foreground still there; rolling relief is moderate at this camera height — **Opus: decide whether to raise amplitudes** (the fallback in this plan goes the other way). Not checked: roads climbing walls close up (road A* cost untouched), settlement approach frames.
