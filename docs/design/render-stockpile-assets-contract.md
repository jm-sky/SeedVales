# Stockpile assets contract (render--009)

`public/assets/stockpiles.glb` — own models built in Blender (`scripts/assets/blender-stockpiles.py`, then `node scripts/assets/build-stockpiles.mjs` for weld + meshopt + manifest). No external source, no credits.

- **Nodes:** `pile_<kind>_<tier>`, top-level, identity transform (geometry baked), one identity-wrapped mesh child (meshopt quantisation puts a scale on the mesh node; `mergeTemplate` drops the transform of the looked-up node).
- **Kinds / tiers** (mirrored in `render/stockpileTiers.ts` `PILE_TIERS`; a vitest checks every name exists):

  | kind | tiers (count ≥) | counts | where |
  |---|---|---|---|
  | `firewood` | 1, 5, 7, 14, 20 | `log` ×4 + `branch` of the household house | woodpile building (frame stays procedural) |
  | `stone` | 1, 6, 15, 30 | `stone` + `rock_chunk` | warehouse, beside the building (−6.8, 1) |
  | `grain` | 1, 5, 15, 30 | `grain` | warehouse yard (−1, 6.4) |
  | `food` | 1, 8, 20, 40 | items with category `food` (herbs excluded) | warehouse yard (3.8, 6.4) |

- **Frame:** 1 unit = 1 m, origin on the ground at the slot centre, +Z = front (Blender −Y), footprint ≤ 4 m wide (grain 30 is two sacks deep, food 40 two crates deep + barrels).
- **Look:** one material, vertex colours only, flat shading, no textures (class: prop, ≤ 4 k triangles per tier (raised from 2.5 k on 2026-10-02 by user request for more detail; re-check the draw budget on WSL); built max 3.5 k). No LOD1 — piles are small and only drawn within 250 m.
- **Slots:** local offsets in `render/stockpiles.ts` (`WAREHOUSE_SLOTS`, `WOODPILE_SLOT`), local +X = building right, +Z = front; yaw jitter per building id.
- **Not yet modelled:** hides/wool (hunter/shepherd house), player's own store (plan open questions 1–2).
