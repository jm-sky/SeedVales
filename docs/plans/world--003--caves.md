# World: caves

**Status:** draft  
**Model:** opus — architecture/recon and keep/drop decisions; sonnet — generator, terrain/render, sim integration, tests  
**Domain:** world  
**Sub domains:** world-gen, terrain, navigation, collision, perception, combat, save, render, loot, fauna  
**Roadmap:** later / WORLD-05; feeds cave loot in [world--001](world--001--landmarks-and-treasure.md)  
**Created:** 2026-10-02  
**Finished:** —

---

Source: [VISION.md](../VISION.md) §6.1 and user design clarification 2026-10-02.  
FEATURES: `WORLD-05` (currently `later/deferred`).

## Goal

Add deterministic, local caves that are physically connected to the existing terrain and exist in the same 3D world as the surface. A cave is not a loading-screen instance or teleport destination: the player, camera, NPCs and animals can enter and leave through a real opening in the surface terrain.

Initial cave classes remain those from the vision:

- small — short tunnel + chamber,
- medium — roughly 2 tunnels + 3 chambers,
- large — longer/more tunnels and chambers.

Caves should occur mainly in mountains / slopes, but may also occur at lower elevations.

## Geometry model

The intended implementation is based on three local terrain surfaces.

### Plane 1 — existing surface terrain

- The current surface terrain must contain a **real geometric hole** that forms the cave entrance.
- Prefer entrances in inclined terrain / hillsides rather than in flat ground.
- Rocks and boulders may surround the opening to hide seams and make the transition look natural.
- The entrance is part of normal world geometry: no portal teleport and no scene transition.
- The lowest point of the entrance opening defines the initial vertical reference for the cave floor.

### Plane 2 — cave floor and lower walls

- Plane 2 is a **local heightmap**, not a second world-sized terrain.
- Start from a copy/sample of the corresponding Plane 1 terrain patch.
- From the entrance, carve the cave by lowering the Plane 2 heightmap.
- The entrance section must descend by several metres before the main tunnel/chambers begin. This creates enough rock cover so the cave ceiling cannot accidentally break through the surface.
- Areas that are not carved remain near the original surface height. The height difference between the carved path and uncarved area naturally forms the lower half of cave walls.
- Tunnels and chambers are therefore expressed as heightmap operations, not as a manually assembled wall mesh.
- A steeper-wall variant may later use the same mechanism for dungeon-like spaces.

### Plane 3 — ceiling and upper walls

- Plane 3 is another local heightmap, rendered with its faces/normals oriented downward.
- It creates the cave ceiling and the upper half of the walls.
- Plane 3 must follow the tunnel/chamber footprint while preserving enough clearance for the player and third-person camera.
- The generator must enforce a minimum rock thickness between Plane 3 and Plane 1 so the ceiling cannot pierce the surface except at the intended entrance.

### Natural shape

Apply deterministic noise at more than one scale:

- fine noise for small irregularities,
- medium noise for broader wall/floor/ceiling variation.

Noise must not destroy navigability, camera clearance or the minimum surface-cover constraint.

## Local generation and cost

Cave geometry is generated only for the local cave footprint; never allocate a second full-world terrain.

The first implementation may support one entrance per cave. Multiple entrances/exits are explicitly deferred until the one-entrance topology is proven.

Generation must be deterministic from the world seed + stable cave id. Immutable cave geometry belongs to generated/cached world data; mutable cave state belongs to the save.

Initial numeric sizes (heightmap dimensions, cell resolution, tunnel width, chamber radius, ceiling height, descent depth and rock-cover thickness) are **calibration values**, not design constants. Derive safe minima from the actual player collision shape and third-person camera boom, then keep them in calibration/config rather than scattering magic numbers.

Acceptance requirement: tunnels and chambers must be comfortably wide and high enough for normal third-person play. The camera must not constantly collide with the ceiling or be forced into first-person distance.

## Placement

Cave entrances prefer:

1. mountain / hilly terrain,
2. an existing slope with enough material behind it,
3. terrain where a descending tunnel can obtain safe rock cover quickly.

Reject a candidate when:

- the entrance cannot be cut cleanly,
- the tunnel would intersect the surface after its initial descent,
- minimum ceiling cover cannot be maintained,
- it conflicts with water, settlement pads, roads or another protected world feature,
- its local footprint would overlap another cave in an invalid way.

Rocks/boulders around the entrance are part of the cave placement/layout and should use existing rock assets/instancing where possible.

## Spatial identity: surface vs cave

A raw `x/z` position is not sufficient once two walkable spaces can exist above/below one another.

**Architecture decision for step 1:** after code recon, choose the smallest explicit spatial-context representation that prevents cross-floor queries. Preferred direction:

```ts
spatialContext: 'surface' | { caveId: CaveId }
```

or an equivalent compact id/layer representation.

The world-space `x/y/z` remains authoritative for rendering and physical position. The context is an additional logical partition, not a replacement coordinate system.

The chosen representation must be used by every system that can otherwise confuse vertically overlapping spaces:

- actor/resource/item spatial queries,
- perception / target acquisition,
- melee and ranged combat candidate selection,
- interaction queries,
- dropped items,
- NPC/animal navigation and goals,
- spawn/despawn logic where relevant.

Line-of-sight still matters inside one context. The context prevents obviously impossible surface↔cave interaction; LOS/collision handles walls and bends inside the cave.

## Player and camera

Current code must be audited for any logic equivalent to "snap Y to terrain height".

Required behaviour:

- while on the surface, current terrain grounding continues to work;
- while inside a cave, neither the player nor the camera may be teleported/snapped to Plane 1;
- grounding/collision uses the active cave floor when in a cave;
- the camera treats cave ceiling and walls as obstructions and shortens/repositions normally rather than clipping outside;
- transition through the entrance is continuous and must not require a teleport.

The entrance transition is a critical e2e case: walk in, walk back out, run across the threshold repeatedly, save inside, load inside.

## NPC and animal navigation

NPCs and animals are allowed to enter and leave caves.

Do not solve this by making cave actors cave-only.

The navigation design must support:

- surface path → entrance,
- transition through entrance,
- local cave pathing,
- cave path → entrance → surface.

Step 1 recon decides whether the current navigation system is best extended with:
- one graph/region transition at the entrance + local cave navigation, or
- a unified representation if current pathing already supports arbitrary 3D/local surfaces cheaply.

Per-tick full-cave scans are forbidden; keep the project's spatial-query / distance-LOD rules.

## Perception and combat isolation

Actors must never see, target or attack another actor merely because its `x/z` is close while it is vertically separated by cave floor/ceiling.

Required cases:

- animal in cave cannot aggro a player/NPC directly above it on the surface,
- surface archer cannot shoot through the cave ceiling,
- cave predator cannot melee through the floor/roof,
- sound/perception, if it crosses cave boundaries in the future, must do so by an explicit rule rather than accidental distance checks.

## Items, drops and persistence

Save/load must preserve full `x/y/z` and the cave/surface spatial context for every mutable entity that can exist underground.

A dropped item in a cave must remain in that cave after:

- walking away and returning,
- save/load,
- streaming/unstreaming the cave,
- other actors moving above it on the surface.

The same applies to mutable cave contents such as opened chests, collected loot and mined/depleted resources.

Generated cave geometry is immutable world data/cache. Mutable state is savegame state. Any save schema change requires a `SAVE_VERSION` bump and old-save rejection per D-SAVE-7. Generator format/content changes require a `GEN_VERSION` bump.

## Cave contents

Caves may contain, deterministically where appropriate:

- rocks/boulders,
- resource/mineral nodes,
- torches where the cave is authored/occupied,
- chests,
- treasure/valuables (connects to LOOT-01),
- animals / predators.

The first geometry slice does not need every content type. Do not block basic cave traversal on loot/fauna polish.

## Lighting and render

First slice:

- exterior daylight should enter/read naturally at the mouth,
- the deeper cave should become dark,
- existing torches/lights can illuminate cave geometry,
- no expensive global solution is required.

Cull/stream cave geometry locally. A cave far from the player must not add meaningful draw-call or per-frame CPU cost.

Where practical, reuse the project's existing quality profiles and asset budgets. Cave rocks should be instanced/merged similarly to other repeated world props.

Ambient audio from the vision: water drops in caves. Treat as a later cave-content/audio step unless the audio hook is trivial.

## Steps

### 1. Architecture recon and design lock — **Model: opus**

Before implementation, inspect the actual current code for:

- terrain mesh generation and terrain edits,
- terrain height queries / grounding,
- player collision,
- third-person camera obstruction,
- spatial grid/query keys,
- NPC/animal navigation,
- perception + combat target queries,
- item/drop position/state,
- save serialization/validation,
- render streaming/culling.

Produce a short design note / DECISIONS entry answering:

1. how Plane 1 gets a real hole without breaking chunk terrain,
2. local cave heightmap representation and resolution,
3. how Plane 2/3 mesh generation shares borders at the entrance,
4. spatial-context representation (`caveId`/layer or equivalent),
5. surface↔cave navigation transition,
6. ownership of immutable generated cave data vs mutable save state.

Do not implement the full system before these six points are resolved against the current code.

### 2. One deterministic prototype cave — **Model: sonnet**

Implement one generated cave near a suitable slope for a fixed test seed:

- real Plane 1 opening,
- local Plane 2,
- local inverted Plane 3,
- entrance descending several metres,
- one tunnel + one chamber,
- fine + medium deterministic noise,
- minimum surface-cover and camera-clearance constraints,
- rocks around the entrance,
- collision and camera traversal.

No loot/fauna required yet.

Acceptance: player can walk from surface into the chamber and back without teleport, clipping into the surface, falling through seams or camera breakout.

### 3. Spatial-context integration — **Model: sonnet**

Wire the chosen context into:

- player,
- NPCs/animals,
- spatial queries,
- item drops,
- interaction,
- perception,
- combat.

Add regression tests that place actors/items at near-identical `x/z` on surface and cave levels and prove they do not interact across the ceiling.

### 4. Save/load + streaming — **Model: sonnet**

- Persist mutable underground entity `x/y/z` + context.
- Save inside a cave and reload at the same position.
- Stream/unstream cave render geometry without moving mutable entities.
- Version bumps as required by D-SAVE-7 / generator rules.
- Ensure cave geometry does not exist as a second full-world terrain allocation.

### 5. NPC/animal cave navigation — **Model: sonnet**

- enter from surface,
- navigate tunnel/chamber,
- leave to surface,
- no oscillation or threshold teleport at the entrance,
- no path selected through the cave roof.

Test both an NPC and an animal.

### 6. Generator classes — **Model: sonnet**

Generalise the prototype into deterministic small/medium/large caves.

Topology targets are descriptive, not rigid counts:

- small: short tunnel + chamber,
- medium: ~2 tunnels / ~3 chambers,
- large: more/longer tunnels and chambers.

Keep one entrance initially.

Generator validation must reject self-intersections or any chamber/tunnel that violates minimum surface cover or traversal clearance.

### 7. Contents — **Model: sonnet**

Add cave-aware placement hooks for:

- rocks,
- mineral/resource nodes,
- chests/treasure (LOOT-01),
- animals/predators,
- optional torches for occupied/dungeon-like caves.

All mutable contents use the same cave spatial context and save rules.

### 8. Look/audio/performance pass — **Model: sonnet**, **opus** keep/drop

- tune fine/medium noise,
- tune tunnel/chamber proportions,
- entrance-rock seam masking,
- cave darkness / torch readability,
- optional water-drop ambient,
- benchmark cave entrance + chamber scenes.

Keep cave render/streaming local and cheap. No large hidden second world mesh.

## Verification

### Unit / integration

- deterministic cave generation: same seed → same entrance/topology/heightmaps,
- generated tunnels respect minimum width/height and surface-cover constraints,
- Plane 2/3 do not invert/intersect unexpectedly,
- no cave position is snapped to Plane 1,
- surface/cave actors at the same `x/z` cannot perceive/target/attack each other,
- cave drop remains underground after save/load,
- opened chest/depleted resource does not respawn after save/load,
- NPC and animal can enter and exit,
- generator invariants across multiple seeds and all size classes.

### E2E / visual

At minimum:

1. approach entrance from outside,
2. cross threshold slowly,
3. cross threshold while running,
4. walk to chamber,
5. rotate third-person camera against wall/ceiling,
6. save in chamber → load → return outside,
7. NPC enters/exits,
8. animal enters/exits,
9. surface actor directly above cave cannot aggro cave actor,
10. screenshots: entrance exterior, entrance looking out, tunnel, chamber.

### Performance

Measure separately:

- world generation/startup cost,
- cave mesh build/stream cost,
- steady-state render at entrance and in chamber,
- transition while walking,
- memory retained after leaving/unloading.

No cave outside the local active range should add recurring simulation work.

## Risks

- Cutting a true hole in the existing chunk terrain may require a different mesh/index path than normal heightfield rendering.
- Plane 1/2/3 seams can expose the sky/void; entrance rocks are visual masking, not a substitute for watertight collision/geometry.
- A simple `x/z` spatial grid will produce severe cross-floor bugs unless explicitly partitioned.
- Current terrain-grounding or camera code may assume one height for every `x/z`.
- Third-person camera clearance may force wider/higher tunnels than visually expected.
- NPC navigation may be the largest integration cost if it assumes a single 2.5D surface.
- Transparent/inside-facing cave geometry can make culling/normals/shadows easy to get wrong; test from both sides of the entrance.

## Explicitly deferred

- multiple entrances/exits per cave,
- destructible/diggable cave walls that alter topology,
- fully procedural underground rivers,
- large multi-level cave networks,
- dungeon gameplay rules beyond a steeper-wall geometry variant,
- cross-cave acoustic propagation.

## Open questions / decisions

These do **not** block writing the plan; step 1 should resolve them against the real code.

1. **Spatial context representation:** explicit `caveId/layer` is the preferred direction, but exact data shape should follow the current spatial-grid/save architecture.
2. **Heightmap resolution and dimensions:** choose from camera/collision requirements and measured cost, not an arbitrary world-scale constant.
3. **Minimum clearances / cover:** derive concrete numbers from the current player capsule and camera boom, then put them in calibration.
4. **Navigation representation:** entrance transition + local cave navigation vs extending the existing surface navigation directly.
5. **Dungeon variant:** keep as a generator mode/future extension unless a first gameplay use needs it earlier.
