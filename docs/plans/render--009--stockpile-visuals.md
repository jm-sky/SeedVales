# Visible stores: stockpiles that show how much a household or settlement holds

**Status:** in_progress  
**Model:** opus — step 0 (tiers, slots, budget), look keep/drop; sonnet — render layer and tests; Blender session — models (step 2)  
**Domain:** render  
**Sub domains:** assets, structures, economy (read-only)  
**Roadmap:** wave 4c (user addition 2026-10-02, after `render--008`; must not delay the main order)  
**Created:** 2026-10-02  
**Finished:** —

---

User note (2026-10-02): a visual representation of warehouse and household stores. Models are made in Blender. A woodpile can have a different model depending on how much wood is stored (1, 5, 7, 14, 20+); the same for some other raw materials in the settlement warehouse or a house. Watch the performance.

## Today

- `woodpile` is a household structure drawn as one fixed procedural template (12 cylinders, `render/structures.ts`), independent of stock. Wood lives in the house inventory (`Building.inv`), the woodpile itself has no inventory.
- The warehouse shows one fixed `crates` prop. Stock changes do not reach the renderer.
- Structures are rebuilt as a whole on a `buildings` event (`Structures.rebuild`) — far too expensive to call on every stock change.

## Design

1. **Sim stays untouched.** The renderer reads inventories it already has access to (house store of a household, settlement warehouse). No new saved state → no `SAVE_VERSION`/`GEN_VERSION` change. Layering: `render/` reads `sim` state, never writes.
2. **Goods and tiers** (`render/stockpileTiers.ts`, pure, tested). A good maps to a pile kind and quantity thresholds; the tier is the highest threshold ≤ count (0 = nothing shown):

   | Pile | Items counted | Tiers (count ≥) | Where |
   |---|---|---|---|
   | firewood | `log` (×4 weight) + `branch` | 1, 5, 7, 14, 20 (user) | household woodpile slot; warehouse yard |
   | stone | `stone`, `rock_chunk` | 1, 6, 15, 30 | warehouse yard; player store |
   | grain sacks | `grain` | 1, 5, 15, 30 | warehouse; farmer house |
   | barrels / crates (food) | food items (`itemDef(id).food`: bread, vegetables, meat) | 1, 8, 20, 40 | warehouse; house porch |
   | hides / wool | `hide`, `wool` | 1, 4, 10 | hunter / shepherd house (drying rack exists separately) |

   Thresholds are calibration in one table; step 0 checks them against the soak stock levels (`pnpm soak`, warehouse/house stock per day) so piles actually change during play instead of sitting at 20+ forever.
3. **Slots.** Each structure kind gets 1–3 local slot offsets (warehouse yard, beside the house door, the existing woodpile position). A pile instance = slot transform × tier template; a deterministic yaw jitter per building id so neighbouring piles don't look copied.
4. **Render layer `render/stockpiles.ts`** separate from `Structures`:
   - one `InstancedMesh` (or a few, one per material) per *template* `pile:tier`; all templates merged into one atlas material where possible;
   - update cadence **2 s** (not per frame): `buildingsNear(player, 120 m)` once, recompute tiers only for buildings in range, write matrices only for slots whose tier changed (dirty list); counts stay small (H: ~10 households + warehouse);
   - beyond 120 m: last known tier kept up to 250 m, nothing beyond (piles are small; no impostors);
   - shadows: piles cast shadows only on `high`, within the actor shadow radius.
5. **Budget** (checked in step 3): settlement scenes add ≤ 10 draw calls on medium (one per visible template) and ≤ 0.1 ms `render.prep` p95 in `crowded-settlement` (SwiftShader CPU phase is comparable; GPU pair on WSL one run per command). Triangles per tier template: ≤ 600 (tier 1) … ≤ 2 500 (top tier), LOD1 at 40 m at ~40 %.

## Steps

| # | Step | Model |
|---|---|---|
| 0 | Confirm tiers against soak stock levels; fix slot offsets per structure kind; asset contract (names `pile_<kind>_<tier>`, pivot on the ground at the slot origin, +Z = front, size limits, tri budgets, one shared atlas) appended to `render-tree-assets-contract.md` style → `docs/design/render-stockpile-assets-contract.md` | opus |
| 1 | `stockpileTiers.ts` + tests; `render/stockpiles.ts` with procedural placeholder templates (stacked cylinders/boxes per tier) so the feature works before the models; flag `sv-visual {"stockpiles":false}` for A/B | sonnet |
| 2 | Blender models per contract (firewood 5 tiers first, then stone, sacks, barrels/crates, hides/wool), LOD0/LOD1, export into `public/assets/props.glb` or a new `stockpiles.glb` via the asset pipeline (`render--004`: audit table, credits if any source is CC-BY) | Blender session (Windows, Blender MCP) |
| 3 | Integrate the models; `ab.mjs` frames `stores-low` / `stores-full` (same settlement, stock forced through `__sv`); `bench:render` crowded-settlement A/B on/off; PERF.md entry | sonnet, look keep/drop by opus + ❓ user |

## Exit

Piles change visibly when wood is chopped/burnt and when the warehouse fills or empties (e2e/ab frames), budget in step 5 met, `pnpm check` + e2e green, look accepted by the user (❓ until then).

## Open questions (❓ user)

1. Are the goods in the table the right set, or only firewood first?
2. Should the player's own house/shed show piles as well (same mechanism, slots by the door)?

## Result (2026-10-02, Windows session, Blender MCP)

- **Step 0 (partly):** contract written (`docs/design/render-stockpile-assets-contract.md`). Tiers and slots chosen by hand; **not yet checked against `pnpm soak` stock levels** (open).
- **Step 1 done:** `render/stockpileTiers.ts` (+ test), `render/stockpiles.ts` (2 s refresh, 120 m recompute / 250 m last-known, signature-gated rebuild, shadows on `high` only), flag `sv-visual {"stockpiles":false}`. Woodpile keeps a procedural frame (`woodpile_base`); the warehouse's fixed `crates` are dropped when piles are on. Placeholders (stacked boxes) are used if the GLB fails to load.
- **Step 2 done for firewood, stone, grain sacks, food crates/barrels** (17 models, 20–1 200 triangles, 157 KB, one vertex-colour material): `scripts/assets/blender-stockpiles.py` + `build-stockpiles.mjs`. Own geometry (existing `_temp/` packs and poly.pizza were checked; nothing fitted tiered stacks, so no third-party source). Hides/wool not done.
- **Step 3 open:** not run on Windows (no e2e/bench here) — needs `pnpm check`/e2e, `ab.mjs` frames `stores-low`/`stores-full`, `bench:render` crowded-settlement A/B, PERF.md entry, look review ❓ user.

