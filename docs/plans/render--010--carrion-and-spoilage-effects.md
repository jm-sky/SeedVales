# Carrion phase and spoiled-food effects

**Status:** planned  
**Model:** opus — phase timings and what spoiled meat looks like in the UI; sonnet — implementation and tests  
**Domain:** render  
**Sub domains:** effects, fauna, food, stockpiles, ui  
**Roadmap:** wave 5d, after `economy--004` (freshness batches) so "spoiled" has one definition; reuses the particle pool of `render--001`  
**Created:** 2026-10-03 (user request)  
**Finished:** —

---

## Source

User, 2026-10-03: animal corpses that lie for a long time should go through a **carrion phase** (rotting, spoiled) before they turn into bones — show it with **green flying particles**. Meat that spoils in the player's inventory or in a warehouse should also get green particles and/or flies.

## Today (recon)

- `worldSystems.ts` (corpses): after `FOOD.corpseRotH` the corpse's `meat` shrinks; after `FOOD.corpseBonesAfterH` (48 h) the corpse is removed — there is no visible rot and no bones phase. `butcher()` already yields only hide/bones from a rotten carcass (> 6 h, `FOOD`/`SPOILED_FRAC`).
- Food freshness is per stack (`ItemStack.fresh`, `spoilInventory`); `economy--004` will make it per batch. Stockpile models (`render--009`) show stored amounts only, not their state.

## Design

1. **Corpse phases (derived, not saved):** fresh (`age < corpseRotH`), **carrion** (`corpseRotH ≤ age < corpseBonesAfterH`: darkened/greenish tint, green fly/odour particles, butchering gives no meat), **bones** (a small bone pile model for the last part of the lifetime; no particles), then removal. Phase is a pure function of `diedAt` and calendar time (`sim/corpses.ts` `corpsePhase`), so no save change; the bones pile reuses the existing removal timer (extend `corpseBonesAfterH` only if the user wants longer-lasting bones).
2. **Particles:** a small instanced point/billboard pool (green motes drifting up with noise, plus 2–4 dark "fly" dots orbiting), capped globally (e.g. ≤ 6 carcasses within 60 m, quality profile `low` = tint only, no particles), spawned only near the player, none in unexplored cells (MAP-01), none in the dark except faint.
3. **Spoiled meat in storage:** a warehouse/household store holding spoiled food (`fresh` below the spoiled threshold, `SPOILED_FRAC`) shows the same particles over its food pile slot (`render/stockpiles.ts` already knows the slot positions) — budget: one extra instanced draw, evaluated at the 2 s stockpile cadence, nearby buildings only.
4. **Spoiled meat in the player's inventory:** inventory row gets a "rotten" tag/tint (UI), and while carrying spoiled meat a faint fly/green wisp follows the player (low quality = off); eating spoiled food keeps its existing illness chance.
5. **Audio (optional, `audio--001`):** a flies loop near carrion (`ambient` bus, ≤ 1 loop).

## Steps

| # | Step | Model |
|---|---|---|
| 0 | Decisions: phase durations, bones lifetime, strength of the effect on `low`/`medium`/`high` | opus |
| 1 | `corpsePhase` helper + tests (phase boundaries, butchering rule unchanged) | sonnet |
| 2 | Carrion tint + bones pile model/tier in the corpse renderer; `ab.mjs` frames `carrion` / `bones` | sonnet |
| 3 | Particle pool (green motes + flies), quality gating, bench A/B (`render.prep`, draw calls) | sonnet |
| 4 | Spoiled food in warehouse stockpiles and in the inventory/UI | sonnet |
| 5 | Exit: bench within budget, ❓ user look | user |

## Rules

Render-only; no new saved state; layering as `render--009`; performance budget as the stockpile yards (≤ a few draw calls, `render.prep` within noise); never weaken a baseline.
