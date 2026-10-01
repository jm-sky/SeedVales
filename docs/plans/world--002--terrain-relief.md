# World: mid-scale terrain relief (hills, hollows, ridges)

**Status:** planned  
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

*(empty)*
