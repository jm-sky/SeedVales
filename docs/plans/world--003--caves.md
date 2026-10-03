# World: caves

**Status:** in_progress  
**Model:** opus — architecture/recon and keep/drop decisions; sonnet — generator, terrain/render, sim integration, tests  
**Domain:** world  
**Sub domains:** world-gen, terrain, navigation, collision, perception, combat, save, render, loot, fauna  
**Roadmap:** wave 5e (moved earlier 2026-10-03, D-PLAN-10) / WORLD-05; feeds cave loot in [world--001](world--001--landmarks-and-treasure.md); movement/grounding dependency: [combat--004](combat--004--jump-and-airborne-movement.md)  
**Created:** 2026-10-02  
**Finished:** —

---

Source: [VISION.md](../VISION.md) §6.1 and user design clarification 2026-10-02.  
FEATURES: `WORLD-05` (now `v2/planned`, wave 5e). Dependencies satisfied: `combat--004` (grounding/jump), `world--001` (landmarks + treasure, cave loot builds on it).

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
- Areas that are not carved remain near the original surface height. The height difference between the carved path and uncarved area defines the lower-wall shape.
- Tunnels and chambers are therefore primarily expressed as heightmap operations. The **final render/collision boundary is still closed with an explicit wall strip** derived from the Plane 2/3 edge, as described in the research section; do not rely on two steep heightfields meeting perfectly.
- A steeper-wall variant may later use the same mechanism for dungeon-like spaces.

### Plane 3 — ceiling and upper walls

- Plane 3 is another local heightmap, rendered with its faces/normals oriented downward.
- It defines the cave ceiling and upper-wall profile; the final side boundary is closed by the explicit Plane 2 ↔ Plane 3 wall strip.
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

**Architecture decision for step 1:** confirm the exact type/API, but the current recon strongly favours a compact scalar partition key, e.g.:

```ts
spaceId: 0 | CaveId // 0 = surface
```

The exact representation is still Opus's decision, but the implementation must provide an explicit logical partition; raw `x/y/z` alone is not sufficient.

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

Recon shows there is no general 3D/navmesh system today. The preferred direction is therefore:
- keep current 2D steering inside each spatial context,
- add an explicit entrance transition/portal,
- add a small cave-local waypoint graph only where tunnel bends/junctions require it.

Opus may choose a broader navigation change only if it finds concrete code evidence that makes it simpler than this approach.

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

## Future quest integration

Caves should later become first-class quest locations. The cave system should therefore expose stable cave ids, entrance positions and chamber/location references that authored quests can target without depending on render geometry.

Examples for later quest content:

- missing person / rescue,
- predator den,
- hidden treasure or chest,
- mine / resource expedition,
- bandit or occupied cave,
- multi-stage exploration objective.

This is **not part of the initial WORLD-05 implementation scope**; the goal now is only to avoid architecture that would make quest integration difficult later.

## Cave contents

Caves may contain, deterministically where appropriate:

- rocks/boulders,
- resource/mineral nodes,
- torches where the cave is authored/occupied,
- chests,
- treasure/valuables (connects to LOOT-01),
- animals / predators.

The first geometry slice does not need every content type. Do not block basic cave traversal on loot/fauna polish.

## Cave render/material strategy

The cave should look convincing without becoming geometry-heavy. Performance is a first-class requirement: caves are local spaces, so visual quality should come mainly from **cheap materials, textures and lighting response**, not dense meshes or many dynamic lights.

### Preferred material direction

Use a low-cost cave material with:

- one tiling rock/albedo texture or a small atlas,
- normal/detail contribution if it is cheap enough on medium/high,
- world/triplanar-style mapping only if measured cost is acceptable; otherwise use generated UVs,
- deterministic low-frequency masks from world/local coordinates to break repetition,
- colour variation between dry rock, darker soil/mineral bands and damp areas.

A useful cheap effect is a **wet-wall mask**:

- low-frequency procedural or texture mask controls wetness,
- wet areas darken slightly,
- roughness/specular response changes so torch light produces a small glint,
- optional subtle normal/detail amplification in wet patches,
- no screen-space reflection or expensive per-pixel simulation is needed.

The wet mask should be static or slowly varying from cave-local coordinates. Do not animate expensive noise every frame.

### Torch lighting

Caves are expected to use torches.

The cave material must therefore read well under warm local light:

- dry rock = mostly diffuse/rough,
- wet patches = visibly stronger highlight under torch light,
- entrance daylight fades with depth,
- deep cave readability comes from carried/planted torches rather than globally bright ambient light.

Avoid adding many shadow-casting point lights. Reuse the existing torch/fire lighting path where possible and cap the number of active local shadow/light contributors. If the existing renderer has no cheap local-light budget suitable for caves, Opus should define one before content scale-up.

### Geometry/material budget

Preferred rules:

- Plane 2/3 resolution only as fine as traversal silhouette requires;
- use shader/texture detail for sub-metre rock detail rather than tessellation;
- entrance rocks/boulders should reuse existing instanced assets;
- cave props should be instanced/merged by material where practical;
- one cave outside active range should cost ~0 recurring render CPU and no meaningful draw calls;
- build local cave mesh/BVH once on stream-in, reuse it, dispose on stream-out;
- benchmark entrance and chamber separately because entrance has surface terrain + cave geometry visible together.

If `three-mesh-bvh` is adopted for camera/collision queries, build it only for active/local cave geometry. Static cave meshes are a good fit; mutable/destructible cave topology is deferred.

### First-slice lighting/render requirements

- exterior daylight should enter/read naturally at the mouth,
- the deeper cave should become dark,
- existing torches/lights can illuminate cave geometry,
- cave material should support cheap damp/wet-wall patches with a stronger specular response visible in torch light,
- surface detail should come mainly from tiling textures/shader masks rather than extra geometry,
- no expensive global illumination, SSR or general-purpose volumetric solution is required,
- cave geometry is local/streamed; a cave far from the player must add no meaningful draw calls or recurring render CPU,
- reuse quality profiles and existing instancing/merging rules for repeated rocks/props.

Ambient audio from the vision: water drops in caves. Treat as a later cave-content/audio step unless the audio hook is trivial.

## Web research (2026-10-02)

The research supports the current direction: a classic heightmap is fundamentally 2.5D (one height for one `x/z`), so caves/overhangs need additional local geometry rather than trying to force the main surface heightfield to represent both surface and underground space.

Relevant references:

- Three.js `BufferGeometry` exposes indexed triangles directly, so a terrain opening can be implemented by omitting selected triangles/cells from the surface mesh: <https://threejs.org/docs/pages/BufferGeometry.html>
- Three.js custom geometry documentation confirms the indexed-geometry path and the need to manage normals/UVs explicitly for procedural meshes: <https://threejs.org/manual/pages/custom-buffergeometry.html>
- Unity's terrain-hole implementation is a useful precedent: surface terrain can contain a cave opening, while aliased/visible hole edges are commonly hidden with rock geometry; holes are also treated specially by lighting/physics/navmesh: <https://docs.unity3d.com/es/2020.2/Manual/terrain-PaintHoles.html>
- `three-mesh-bvh` is a mature option for fast raycasts and spatial queries against static Three.js geometry; it is a good candidate for cave camera/wall/ceiling queries if profiling justifies it: <https://github.com/gkjohnson/three-mesh-bvh>

### Preferred geometry refinement after research

The preferred candidate is now:

```text
Surface heightfield (Plane 1)
        ↓
real terrain hole
        ↓
dedicated entrance / rim mesh
        ↓
local cave domain
        ├── floor heightfield (Plane 2)
        ├── ceiling heightfield (Plane 3)
        ├── explicit boundary wall strip
        └── rocks / props / cave material
```

The dedicated entrance/rim mesh is important because the current terrain has 2/4/8/16 m LOD. The normal terrain hole can therefore be slightly conservative, while the entrance patch owns the exact visible rim and connection to Plane 2/3. This avoids the cave-mouth shape changing badly when the surrounding terrain chunk changes LOD.

### Explicit wall strip

The original idea that Plane 2 and Plane 3 naturally create the lower/upper halves of walls remains useful for shaping, but the final render mesh should not rely on two steep heightfields meeting perfectly.

Preferred final mesh composition:

- floor triangles from Plane 2,
- ceiling triangles from Plane 3 (reversed winding / inward-facing normals),
- explicit boundary triangles joining floor edge → ceiling edge along the cave footprint.

This makes the cave watertight and removes tiny sky/void cracks. The wall strip geometry can still derive entirely from the same heightmaps/footprint, so there is no separate hand-authored wall system.

### Scope of the heightfield approach

The local floor+ceiling model is a deliberate constraint and a performance advantage.

Good fit:

- one underground layer,
- natural tunnels,
- chambers,
- sloping entrances,
- dungeon-like steep-wall variants.

Not a good fit without a future architecture change:

- one tunnel crossing above another at the same `x/z`,
- many stacked cave floors,
- complex vertical shafts with overlapping walkable levels.

These cases are explicitly outside the first cave scope. Do not switch to voxels/marching cubes unless future gameplay actually requires them.

### Noise strategy

Do not let raw noise define navigability.

Preferred order:

1. generate tunnel/chamber topology,
2. establish guaranteed floor width, ceiling clearance and rock cover,
3. construct base Plane 2/3 shapes,
4. apply bounded medium-scale noise,
5. apply bounded fine noise,
6. re-clamp/validate traversal clearance and surface cover.

Noise amplitude must reduce near the entrance seam and any narrow navigation-critical section.

## Dependency: jump / airborne movement

This plan and [`combat--004--jump-and-airborne-movement.md`](combat--004--jump-and-airborne-movement.md) touch the same movement contract and must be coordinated.

Current shared problem:

- `moveWithCollision()` owns horizontal collision **and** unconditionally snaps `y` to `groundHeight()`;
- player idle movement also snaps directly to `Terrain.heightAt()`;
- jump needs `y` to become independent while airborne;
- caves need `y` to resolve against Plane 2 instead of the surface while underground.

**Do not implement two separate refactors.** The Opus architecture decision for both plans should define one shared movement/grounding contract.

Preferred shared direction:

```ts
walkSurfaceHeight(sim, spaceId, x, z)
```

(or an equivalent API) plus separate responsibilities for:

- horizontal collision / `x,z`,
- vertical velocity / airborne state,
- grounded detection and landing,
- active walk-surface query,
- cave wall/ceiling collision.

Expected behaviour:

- grounded surface actor → surface terrain / bridge deck,
- grounded cave actor → Plane 2,
- airborne actor → preserve/integrate real `y`; do not snap until landing,
- landing → only onto a valid surface in the actor's active spatial context,
- cave ceiling/walls → collision constraints, never mistaken for ground.

### Ordering

The plans do **not** require the full jump feature to ship before caves.

They do require the shared movement/grounding architecture to be decided once. Preferred sequence:

1. Opus reviews `combat--004` + this plan together and fixes the shared contract.
2. Implement/refactor the common movement/grounding primitives once.
3. Jump can build airborne movement on top.
4. Caves can add context-aware Plane 2 grounding + Plane 3/wall collision on top.

Whichever plan implements the shared refactor first must satisfy the regression cases of the other plan and leave the API usable by it.

## Code recon (2026-10-02)

The current implementation is strongly **2.5D**: most world/sim systems index and reason in `x/z`, while `y` is usually derived from the single surface terrain. Caves therefore need an explicit vertical/spatial-context extension; treating them as render-only geometry would break movement, combat, perception and persistence.

### Terrain mesh and the real entrance hole

Current code:

- `world/terrain.ts`: `Terrain.heightAt(x,z)` returns exactly one surface height (generated height + mutable edit delta).
- `render/terrainChunks.ts`: each chunk is a regular indexed grid; every grid cell always emits two triangles. Near LOD uses 2 m steps, then 4/8/16 m. Far rings use 2×2 superchunks. Chunk-edge skirts are generated independently.
- Terrain edits only change vertex heights; they cannot create topology holes.

**Suggested input for Opus:** the least invasive Plane-1 implementation is to keep `Terrain.heightAt()` as the surface height and make the render mesh topology cave-aware: generated cave data exposes an entrance mask/polygon and `TerrainChunks.build()` omits triangles whose cells belong to that opening. Do **not** represent the entrance by lowering Plane 1; that would destroy the separation between the surface height and the cave floor.

This needs an explicit LOD decision. A cave mouth cut at 2 m resolution can disappear or change shape at 4/8/16 m. Good options to evaluate:

1. force a cave-containing chunk to LOD0/LOD1 while its entrance is in relevant view range, then use a closed/cheap far representation; or
2. build the entrance as a small dedicated surface patch/mesh and omit a conservative larger hole from the normal terrain chunk at every LOD.

Option 2 is likely more stable at chunk LOD boundaries and lets the entrance rim align exactly with Plane 2/3. Rocks remain seam masking, not topology.

Also check chunk skirts: a normal skirt must not be generated through an entrance edge if the cave mouth touches a chunk boundary. Prefer placing entrances away from chunk borders or make the entrance patch own that seam.

### Grounding and collision

Current code:

- `sim/collision.ts::groundHeight()` starts from `sim.terrain.heightAt(x,z)` (plus bridge decks).
- `moveWithCollision()` always finishes with `a.y = groundHeight(sim,nx,nz)`, even when `full=false`.
- Player idle movement also explicitly does `p.y = sim.terrain.heightAt(p.x,p.z)`.
- slope checks compare only two surface `heightAt()` samples.

This means an actor one frame inside a cave would currently be snapped back to Plane 1.

**Suggested direction:** introduce one simulation-level ground query, e.g. `walkSurfaceHeight(sim, spatialContext, x, z)`, and make movement/grounding use it. Surface keeps today's `groundHeight()`; cave context samples Plane 2 and cave-local collision. Avoid changing generic `Terrain.heightAt()` to return cave floor based on global position: the same `x/z` legitimately has both a surface and cave height.

Cave wall/ceiling collision cannot be expressed by today's slope-only 2.5D collision. Plane 2 can provide floor grounding, but Plane 3 and steep side walls need a cave-local collision representation/query. It can still be heightmap-derived; it does not need a general-purpose physics engine.

### Third-person camera

Current code:

- `render/cameraRig.ts` receives only `Terrain`.
- Every camera ray sample compares against `terrain.heightAt(x,z)`.
- Final camera position is also clamped above `terrain.heightAt()`.

Therefore the current camera will be pushed to the surface while underground and knows nothing about Plane 3.

**Suggested direction:** decouple `CameraRig` from direct `Terrain.heightAt()`. Give it a collision/clearance callback or small read-only environment interface supplied by `Renderer/Sim`. In cave context it must test **both floor and ceiling/walls**, shortening the boom before intersection. This is preferable to teaching render code about cave state via special cases inside `Terrain`.

The existing camera defaults are useful calibration input: distance 6 m, max 16 m, target ≈ player `y + 1.6`. Cave tunnel height/width should be derived from this rather than guessed.

### Spatial hash, perception and combat

Current code:

- `world/spatial.ts::SpatialHash` keys only `x/z`; `Positioned` has no `y` or layer.
- Actor, ground-item, corpse and trace indices in `Sim` all use this 2D hash.
- `fauna/perception.ts`, `npc/queries.ts::threatNear()`, `alerts.ts`, player threat checks and many other queries use `sim.actors.query(x,z,r)` and 2D distance.
- `combat.ts::meleeAttack()` uses only `x/z` distance and cone; it would hit through a cave roof.
- projectile actor hit testing does use projectile `y` against actor height, but projectile-ground collision is `p.y < sim.terrain.heightAt(p.x,p.z)`; an arrow fired inside a cave would immediately collide with the surface above/around it or otherwise use the wrong floor.
- `interact.ts::findTargets()` queries actors/ground/corpses/nodes in `x/z` only.

**Strong suggestion for Opus:** use an explicit compact spatial context, preferably a scalar key such as `spaceId: 0 | CaveId` (0 = surface) rather than an object union inside hot indexed entities. Make `SpatialHash` partition by `spaceId` in the key/query API. This directly protects most existing call sites once the query requires/provides the caller's space.

Do not rely on `y` thresholds alone. A high chamber can put legitimate same-cave actors several metres apart vertically, while a thin roof can put surface/cave actors close in `y`. Logical space + same-space LOS is safer.

The entrance transition is the one deliberate bridge between contexts. While crossing the mouth, change `spaceId` at a deterministic threshold/portal region, not by guessing from `y` every frame.

### Mutable world objects and save/load

Current code:

- actors already store full `x/y/z`;
- `GroundItem`, `Corpse`, `Trace`, `Cart`, buildings/sites/dens store only `x/z`;
- `dropItem()` accepts only `x/z`, so cave drops would currently lose their vertical/spatial identity immediately;
- animal corpses copy only `x/z`;
- `save/validate.ts::actorOk()` validates actor `x/z` but **does not validate actor `y`**, even though `ActorBase` contains it;
- snapshot/save is otherwise simple JSON of `GameState`, so adding fields is mechanically straightforward and intentionally requires a `SAVE_VERSION` bump.

**Suggested slice:** add `spaceId` to every mutable entity that can exist in a cave. Add `y` where the entity is not always safely derivable from its active walk surface (at minimum ground items/corpses; likely traces and carts if they are permitted underground). Tighten save validation to require actor `y` and the new context fields.

Buildings/settlement structures probably remain surface-only in the first cave slice. Cave chests/torches/resources should preferably use cave-specific generated/content records rather than extending every settlement-building index unless gameplay requires normal `Building` semantics.

### NPC / animal movement and navigation

Current code:

- `AiStep.goto` contains only `x/z`.
- `steerTo()` is straight-line steering + local detours; long-distance road routing is still a list of 2D points.
- `steerTo()` calls `moveWithCollision()`, which currently snaps `y` to Plane 1.
- far-LOD actors still use the same movement function, only with reduced collision work.
- goals routinely generate arbitrary `x/z` targets around homes/resources/water.
- no general navmesh or arbitrary-3D pathfinder exists.

So a "unified 3D navigation system" would be a much larger architectural change than caves need.

**Suggested direction:** keep current 2D steering *inside each walkable context* and add an explicit entrance transition/portal:

- surface goal → cave entrance surface anchor,
- cross a short entrance corridor/portal,
- switch `spaceId`,
- cave-local `goto x/z` over Plane 2,
- reverse for exit.

This reuses `steerTo()` after making grounding/collision context-aware. Cave topology can expose a small local waypoint graph (entrance + tunnel junctions + chamber centres) only where straight-line steering would cut through walls. No global navmesh is required for the first slice.

AI targets must carry/derive their target space. An NPC on the surface must not straight-line toward the `x/z` of an underground target; it first needs a route via that cave's entrance.

### Generated-world representation and cache

Current code:

- `WorldData` stores large world grids as typed arrays and object collections (settlements, landmarks, etc.).
- `world/serialize.ts` serializes only the fixed top-level grid arrays as binary typed-array blocks; other fields are JSON metadata.
- world cache is keyed by seed + `GEN_VERSION`.

**Suggested direction:** store a compact deterministic `GenCave` descriptor in `WorldData.caves`: id, entrance/rim data, local origin/bounds, seed, size/type and topology/control points. Reconstruct Plane 2/3 local heightmaps/meshes deterministically from that descriptor when the cave is within build range. This avoids embedding many local Float32 arrays in the JSON metadata or expanding the binary serializer for nested arrays.

If profiling later shows reconstruction is expensive, cache the derived local cave mesh/heightmaps separately; do not start by allocating all cave heightmaps for the full world.

### Concrete recon conclusion

The lowest-risk architecture to hand to Opus is:

1. **Plane 1 stays the canonical surface heightfield.** A cave entrance is a topology hole/entrance patch in rendering, not a lowered surface height.
2. **Each cave gets a compact generated descriptor + local Plane 2/3 derived data.**
3. **Add `spaceId`** and partition spatial queries by it.
4. **Replace hard-wired surface grounding with context-aware walk-surface queries.**
5. **Camera receives a context-aware collision query**, not `Terrain.heightAt()` directly.
6. **Navigation remains mostly 2D per space**, connected by an explicit entrance portal/transition and optional small cave waypoint graph.
7. **Save mutable underground entities with context and needed `y`**, while generated cave geometry remains seed-derived world data.

This preserves the current architecture instead of replacing it with a general 3D engine.

## Implementation contract at a glance

Unless Opus finds a concrete reason to change it, implementation should proceed with this mental model:

```text
Plane 1 surface terrain
  └─ real hole in terrain topology
      └─ dedicated entrance/rim mesh
          └─ local cave (same world coordinates, no teleport)
              ├─ Plane 2 floor heightfield
              ├─ Plane 3 ceiling heightfield
              └─ explicit wall strip joining their boundary
```

Simulation contract:

- `x/y/z` remain real world coordinates;
- `spaceId` separates surface and cave queries;
- grounding is context-aware and shared with `combat--004`;
- actors/NPCs/animals cross the entrance through a deterministic portal/threshold, not a position teleport;
- navigation remains 2D per context unless Opus proves a broader change is cheaper;
- cave geometry is local, deterministic and streamable;
- mutable cave contents are saved; generated geometry is seed-derived;
- visual detail comes primarily from cheap texture/shader work, with strict performance measurement.

The main unresolved items are calibration/representation details, not the intended gameplay or overall architecture.

## Steps

### 1. Architecture decision from recon — **Model: opus**

The code recon above is the input. Opus should validate/adjust it and record the final architecture in a short design note + `docs/design/DECISIONS.md` before full implementation.

Decide explicitly:

1. **Plane 1 opening:** dedicated entrance patch + conservative hole in `TerrainChunks` (preferred) vs LOD-aware triangle omission directly in every chunk mesh.
2. **Cave data:** compact `GenCave` descriptor with derived local Plane 2/3 (preferred) vs persisted/generated local height arrays.
3. **Shared movement/ground API (coordinate with `combat--004`):** exact context-aware replacement for direct surface `heightAt()` grounding; horizontal collision must no longer unconditionally own `y`, and the contract must support both airborne movement and cave Plane 2 grounding.
4. **Cave collision:** representation/query for floor + walls + ceiling; it must stay cheaper/smaller than a general physics-engine rewrite.
5. **Spatial context:** exact scalar `spaceId`/cave-id representation and which entity types receive it.
6. **Entrance transition:** deterministic portal/threshold region for changing context without teleporting position.
7. **Navigation:** 2D steering per context + entrance portal + optional local cave waypoint graph (preferred) vs a more general solution only if code evidence justifies it.
8. **Camera environment query:** how the rig tests cave floor/walls/ceiling without depending directly on surface `Terrain`.
9. **Mutable cave contents:** which records gain `y + spaceId` and which cave contents use a new cave-specific state type.
10. **LOD/streaming:** how entrance topology remains visually stable across terrain LODs and when local Plane 2/3 geometry is built/disposed.

Do not implement the full system before these decisions are recorded. Read and review `combat--004--jump-and-airborne-movement.md` in the same architecture pass; any change to `moveWithCollision()`, `groundHeight()` or player vertical-state ownership must be shared between the two plans.

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
- add/tune cheap cave material (rock texture/UV strategy, dry/damp variation, wet-wall specular mask),
- tune cave darkness / torch readability and active-light budget,
- optional water-drop ambient,
- benchmark cave entrance + chamber scenes on low/medium/high.

Keep cave render/streaming local and cheap. No large hidden second world mesh.

### 9. Cave visual polish — **Model: sonnet** (implementation), **opus** (keep/drop and look review)

Source: [review 022](../reviews/2026-10-03--022--cave-visual-review.md) (Opus, 2026-10-03; findings A1–E with screenshots in `docs/reviews/assets/022/`). Scope is the look of the mouth and the interior plus the cost of rendering the surface while underground. **No change** to the layer model, spine navigation, cave fauna, generator placement or `GEN_VERSION`; the only sim-side change is 9.4c (grounding on the mouth collar), which the patch needs so that what you see is what you walk on. New mutable state: none (everything is derived per cave at build time) → no `SAVE_VERSION` bump.

**Tools for every sub-step:**

- Screenshots: `node scripts/e2e/review-caves.mjs 1337 before` once before 9.1 (or reuse `assets/022`), `… after` at the end of each sub-step that changes visuals; compare the same file names. `tour-cave.mjs` lights the cave with a debug emissive glow — do not use it for look decisions (drop that hack in 9.5).
- A/B: new `VisualFlags` `caveCull` (9.2) and `caveLook` (9.4–9.8: patch, shape, material, light, rocks; `false` = the current look) so `SV_VISUAL='{"caveCull":false,"caveLook":false}'` reproduces the before state for screenshots and benches.
- PERF: `pnpm bench:render medium` scenes `cave-mouth`, `cave-inside` plus two new scenes added in 9.2: `cave-chamber` (deepest chamber of cave 0, outside not visible) and `cave-mouth-steep` (the steepest mouth, camera 12 m in front). Run with the flags off (before) and on (after) in the same environment; summary in `PERF.md`.

Order (each sub-step is its own commit with tests; MUST before SHOULD):

#### MUST — geometry, seams, culling

**9.1 Terrain cut for every cave (A1).**
- `TerrainChunks.build` decides per chunk with `caves.nearBucket(chunk centre)`, which misses caves registered only in another 64 m bucket of the 128 m chunk (seed 1337: caves 2, 4, 5 have no hole). Replace with a rectangle test (`CaveField.overlaps(x0, z0, x1, z1)` over all buckets the chunk touches, or a per-cave AABB list) and keep the per-quad `skyAt` (later `cutAt`, 9.4) test.
- Acceptance: vitest over seeds 1337 + 2 others and every cave — every sky cell lies in a quad the chunk builder omits (test the predicate the builder uses, not a copy); review shots `c2-…-02-front/05-above` show the opening. Acceptance e2e step 20 additionally walks into a cave that straddles a bucket border (pick it by index in the script, e.g. the first cave whose grid spans two buckets).

**9.2 Underground culling of the surface (D1, D2, D4, D3).**
- Per cave, at grid build (pure, in `world/caveShape.ts` or `caveField.ts`): `seesOut[k]` for every spine point = a 2D ray-march (0.5 m steps) from the spine point to the mouth (centroid and the two outermost sky cells of the first sky row) that stays in open cells and below `ceil − 0.3` at eye height. Cheap: ≤ 25 spine points × 3 rays per cave, once.
- `Renderer`: `outsideVisible` = camera cell is not roofed (`flagAt` ≠ `CELL_UNDER`) **or** the nearest spine segment to the camera has `seesOut` at either end, with a 0.3 s hold before hiding (no flicker at the bend). While **not** visible: `visible = false` on terrain, vegetation, grass, structures, landmarks, stockpiles, carts, sky dome, water and surface-layer actors (actors on the player's layer stay); precipitation off whenever the camera cell is roofed; sun shadow map frozen with `renderer.shadowMap.autoUpdate = false` (`needsUpdate = true` on the way out) — do **not** toggle `castShadow`, that recompiles every program. Streaming updates (`terrain.update`, vegetation rebuilds) keep running; skip them only if the bench shows they matter.
- `drawAttribution` gets a `caves` tag (today the cave shows as "other").
- Acceptance: `cave-chamber` bench scene ≤ 40 draw calls and ≤ 0.15 M triangles (today 138–209 / 0.50–0.91 M in chambers), `render.prep` p95 not worse on any cave scene; no visible pop when walking back to the mouth (screenshot pair at the last hidden / first visible spine point); rain never inside a roofed cell (`review-caves` with rain); e2e step 20 still green.

**9.3 Grass and decals out of cuttings (A7).**
- Grass placement treats the cut region (sky cells + the 9.4 collar) as a footprint (`grassDensity(…, onFootprint)` already zeroes it); same for ground decals / ground patches if they use their own placement.
- Acceptance: no grass blades in `07-threshold-out` / `08-threshold-in-lookout` shots for all reviewed caves; grass vitest for a cave cell.

**9.4 Watertight entrance patch replaces banks, skirt and icosahedron rims (A2–A5, A8).** This is the "dedicated entrance/rim mesh + conservative hole" the research section preferred and v1 skipped.
- a) **Region.** `R` = the sky blocks plus a one-block (2 m) collar of terrain quads around them, in whole 2 m blocks aligned with LOD-0 quads (the grid origin already is). `CaveField.cutAt(x, z)` replaces `skyAt` for the terrain cut; `skyAt` keeps its sim meaning (walkable cutting).
- b) **Patch heightfield on a 1 m grid over `R`** (pure function `mouthPatchHeight(grid, surfaceAt, x, z)` in `world/caveShape.ts`, used by render and 9.4c): outer border vertices = exactly the LOD-0 terrain mesh (2 m vertices = `heightAt`, 1 m mid-edge vertices = the average of their two 2 m neighbours, so there is no T-junction crack); sky-cell vertices = the cutting floor (identical to the floor mesh at the shared edge); collar vertices = `lerp(floor of the nearest sky vertex, terrain, smoothstep(0, 2 m, distance to the sky region))` plus a bounded noise bump (≤ 0.25 m, zero on the outer border and on sky vertices), clamped to `≤ terrain` and, next to a roofed cell, `≥ ceil + 0.3`. The patch replaces the sky-cell floor quads, the leaning bank quads, the rock skirt and `addRock`.
- c) **Grounding on the collar.** `groundHeight` (surface layer) uses `mouthPatchHeight` inside collar cells, so a walker at the rim stands on the visible bank instead of the old terrain height (today the player floats above leaned banks). Slope rules stay as they are (the steep bank stays unwalkable); NPC/animal behaviour is unchanged because collar cells are surface cells with a real height. Record as **D-CAVE-3** when implemented.
- d) **Lintel / jambs**: every edge between a roofed cell and a cell in `R` gets a face from `ceil` up to `mouthPatchHeight` at its two vertices (shared corners → no slit).
- e) **LOD:** the hole is cut at LOD 0 only, so `Caves.update` shows the patch and the cave group only while the chunk(s) holding `R` are at LOD 0 (expose the chunk LOD from `TerrainChunks`); build distance stays `CAVE.showM`. Beyond LOD 0 the mouth is closed (far hint → LATER).
- Acceptance: vitest **watertightness** over all caves of 3 seeds — weld patch + floor + shell by position (1e-4 m) and require every edge to have exactly two triangles, except the patch's outer border, whose vertices must equal the LOD-0 terrain vertex heights (2 m) or their averages (1 m); no patch vertex above the terrain in the collar; no lintel with negative height. Screenshots: no sawtooth outline, no slivers/beams in `02–06` for the steepest and the flattest mouth; a magenta-background probe at the mouth shows no magenta pixels. Grounding vitest: a surface walker on a collar cell stands on `mouthPatchHeight` ± 0.05 m. Bench: `render.caveBuild` p95 ≤ 8 ms, `cave-mouth` `render.prep` p95 ≤ today + 0.3 ms.

#### SHOULD — interior shape, material, light transition, mouth framing

**9.5 Interior shape (C1, C2).** Render-only; collision keeps the 1 m grid (the visible open space is never *smaller* than the walkable one).
- Indexed, welded shell and floor (shared vertices, `computeVertexNormals` on the welded mesh) → smooth normals; keep a crease between floor and walls only. Per-cell hash shade (`shadeAt`) removed (that is the stripe pattern).
- Staircase chamfer: a boundary vertex with 3 open cells of 4 moves 0.5 m diagonally into the rock; vertices with 1 open cell stay.
- Wall profile with three rows: foot at the cell edge (no inward push), belly at 40 % height pushed 0.35 m (± noise) into the rock, top at `ceil − 0.2` pulled 0.4 m toward the tunnel axis (vault). Ceiling dome: up to +0.6 m toward the spine (cos profile), clamped to `surface − 0.6` (cover).
- Wall displacement along the outward normal: two-octave world-space noise (0.25 m + 0.08 m), zero on vertices shared with the patch/lintel.
- Drop the emissive debug lighting from `tour-cave.mjs`.
- Acceptance: tunnel shots show a rounded profile, no vertical stripes, no 1 m staircase on diagonal tunnels; camera never shows the outside of the shell in `09–13` (rotate around in the chamber); `caveBuild` p95 ≤ 8 ms; triangles per cave ≤ 2.5× today.

**9.6 Cave material (B2, C3, C4, C6).** One material for floor + shell (1 draw per cave); medium/high: `MeshStandardMaterial` (roughness 0.92, metalness 0) with `onBeforeCompile`; low: Lambert with the same albedo logic and no specular. No new runtime textures except a converted normal map.
- Baked per vertex at build (one `vec3` attribute, nothing per frame): **AO** (closed neighbours in the 3 × 3 around the vertex, floor–wall corner, wall foot → 0.45–1), **skylight** (1 on sky cells, `exp(−s / 6 m)` by spine arc length past the last sky cell), **mouth blend** (1 → 0 over the first 8 m: albedo → the terrain's rock colour so the mouth has no material jump).
- Shader: floor vs wall vs ceiling by world normal (floor texture where `n.y > 0.7`, wall texture otherwise, smooth blend; ceiling ×0.8 and slightly cooler); anti-tiling with a second sample of the same map at ×0.37 scale and rotated, blended by a macro mask; macro colour variation and faint strata bands (`sin(worldY · 1.3 + mask)`) at ±10–15 % from the existing terrain detail texture used as a noise source (no new noise texture); **static wet mask** (macro mask × "low" factor: floor depressions and wall feet strong, walls medium, ceiling weak) → albedo ×0.7, roughness 0.92 → 0.35, normal strength ×1.3; detail normal from the Poly Haven cave wall/floor normal maps (convert the EXRs to 1k PNG in the asset pipeline; CC0 already credited) on medium/high.
- Acceptance: in the torch shots wet patches show a visible warm highlight that moves with the torch, dry rock stays matte; no obvious 4 m tiling in `13-chamber-torch-high`; floor/wall junction darkened; the mouth bank colour continues from the terrain. GPU: `cave-inside` `render.draw` (SwiftShader, relative only) not more than +15 %; program count +≤ 2; low profile uses Lambert.

**9.7 Light transition (B1, C5).**
- The cave material scales directional + hemisphere light by the baked skylight (patch the light loop in `onBeforeCompile`), so the cave darkens with depth by itself and the global sun/hemi no longer have to be dimmed for it.
- The global dim (for actors and props underground) is driven by camera depth, not by the layer flag: 0 while the camera cell is open to the sky, ramping to 1 over the first 8 m of roofed spine arc length, and 1 whenever `outsideVisible` (9.2) is false. Result: near the mouth the outside stays in full daylight (bright opening seen from inside), deeper the outside is culled anyway.
- Cave ambient term in the material (`uCaveAmbient`, warm grey, × AO) so walls read as silhouettes without a torch; the fill point light is lowered or removed once this lands (frees a light).
- Acceptance: walking in (`acc` step 20 path) shows no frame-to-frame light jump at the threshold (luminance of consecutive frames changes smoothly — compare 5 shots 1 m apart); `08-threshold-in-lookout` shows the outside slope at daylight brightness; without a torch the walls are distinguishable within ~6 m, with a torch walls and ceiling within ~8 m read (Opus look review on the shot set; add a mean-luminance log of the frame centre to `review-caves` for comparison).

**9.8 Mouth framing (A5, A6).**
- Rim and frame rocks from the existing Quaternius `Rock_Medium_1/2` (same models and colour as the surface boulders), one shared `InstancedMesh` per model for all built caves (+≤ 2 draws): rim rocks along the outer border of `R` every 2.5–4 m (60 % chance), height 0.6–1.4 m scaled with the local bank depth, 35–50 % buried, tilted to the slope; two jamb rocks at the lintel ends (1.5–2.2 m); one brow rock above the lintel centre (2–3 m), pushed into the hillside. Deterministic from the cave id.
- Lintel overhang: the lintel top edge leans out over the cutting by 0.4–0.8 m (noise); its bottom stays at `ceil`.
- Constraint (tested): no rock or overhang inside the walkable volume — over any open cell the rock bottom is ≥ floor + 2.4 m, and nothing below `ceil` over sky cells (the camera treats sky cells as unroofed, B4).
- Acceptance: front/side shots show a framed opening with a brow, rocks seated in the slope (no floating plates); the surface rock colour continues around the mouth; constraint vitest over all caves of 3 seeds.

**9.9 Close-out — opus.** Look review on the full `review-caves` before/after set (all reviewed caves, steep and flat mouth, small and large), keep/drop per sub-step (flags stay for A/B until the user signs off), PERF A/B table in `PERF.md` (flags off vs on: draw calls, triangles, `render.prep` p95, `render.caveBuild` p95, programs), `pnpm check`, `pnpm e2e:run`, handoff. Device check (real GPU, low profile) is a user step (D-PERF-2).

#### LATER — costlier polish (only after 9.9, each needs its own PERF line)

- Far-LOD mouth hint: a dark vertex-colour blotch (or a small impostor quad) in LOD 1+ chunks so a mouth is visible from afar.
- Floor rubble and pebbles (instanced small `Rock_Medium`) along chamber walls; stalagmites/columns in large chambers (natural, no fantasy).
- Puddle decals in floor depressions; slow drip sparkle on the wettest patches.
- Ferns/moss on the mouth collar (existing nature assets).
- A faint additive light shaft at the mouth at low sun; exposure adaptation once tone mapping is enabled.

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
- cave Plane 2/3 + wall-strip mesh build/stream cost,
- optional BVH build cost,
- steady-state render at entrance and in chamber,
- GPU cost of cave material with dry vs wet-wall shading,
- draw calls and active dynamic lights/torch shadows,
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

1. **Spatial context representation:** recon strongly favours a scalar `spaceId` (`0 = surface`, cave id otherwise) because `SpatialHash` is currently a hot 2D index. Opus confirms exact typing/API.
2. **Entrance topology across terrain LOD:** recon + web research favour a dedicated entrance/rim patch + conservative hole in the normal terrain mesh. Opus should confirm this against the actual chunk/LOD implementation before coding.
3. **Heightmap resolution and dimensions:** choose from camera/collision requirements and measured cost, not an arbitrary world-scale constant.
4. **Minimum clearances / cover:** derive concrete numbers from the current player radius and CameraRig (default 6 m boom, target +1.6 m, max 16 m), then put them in calibration.
5. **Navigation representation:** recon favours 2D steering per space + explicit entrance portal + small local cave waypoint graph only where necessary.
6. **Mutable cave state shape:** decide whether drops/corpses/traces/carts all gain `y + spaceId`, and define a cave-specific state record for chests/depleted cave resources.
7. **Dungeon variant:** keep as a generator mode/future extension unless a first gameplay use needs it earlier.

## References

- `docs/research/refs/2026-10-02--seedvale-v1-ref-screenshot-as-baseline-3-cave-enterance.png`
- `docs/research/refs/2026-10-02--seedvale-v1-ref-screenshot-as-baseline-4-cave-inside.jpg`

## Result (caves v1, 2026-10-03, Windows session)

Done: step 1 (decision recorded as D-CAVE-1) and step 2 (one deterministic cave, generalised to small + medium in the generator, so step 6 is partly done: no large class), plus a map marker and `__sv.teleportToCave`. Implemented as a **player-only layer** (`px.cave`): the cave is a derived grid under the mountain, entered through a cutting where the terrain mesh is cut out; no new terrain allocation. Verified by vitest only (generator invariants over 8 seeds, walk-in/walk-out without jumps, NPC refused at the cutting, save/reload inside a cave, mesh builder). Not verified: anything visual or e2e. Open items: steps 3 (full spatial context for actors/items/perception), 4 (cave-specific saved state), 5 (NPC/animal navigation), 7 (contents), 8 (look/audio/perf), large caves, `combat--004` grounding reconciliation, grass/vegetation inside the cutting, minimap marker.

### Update (2026-10-03, layer isolation, step 3 partial)

Player-vs-surface isolation for the v1 layer model: `layersApart(sim, a, b)` (`sim/caveSpace.ts`) makes animal perception, melee candidate selection and combat lock skip actors on a different layer; projectiles use `pointInCave` (a shot inside a cave volume meets only the player, outside it never the player below). Test: `caveSpace.test.ts` "layer isolation". Still open: dropped items/interaction queries by layer (items underground are not possible yet — only the player enters), NPC/animal navigation (5), contents (7), look/perf (8), large caves, minimap marker. Not run here: e2e/bench/soak (Windows).

### Update (2026-10-03, session 15 end, Sonnet — caves released to this line by the user)

Done: rock skirt under the cutting lip (no void/sky strip at the mouth); `GroundItem.cave` (items lie on the cave floor, targets only from their own layer, animals ignore them, render at floor height); inside a cave only own-floor items are targets and drinking-from-water targets are off; digging underground never lowers the surface and works with a shovel; chamber loot (`treasureSpots` derives 1–2 spots per cave from the spine, `TreasureSpot.cave`, found only when digging inside that cave; no generator change); cave ambience bed (`ambient-cave`) replaces wind/rain/birds underground; cave mouths on the minimap (explored cells only); jump reconciliation (`caveVolumeAt`: landing on the cave floor, `stableSupport` true, apex clamped under the roof; test in `caveSpace.test.ts`). Tools: `scripts/e2e/tour-cave.mjs` (screenshots at mouth/inside). Still open: step 5 NPC/animal navigation and cave fauna (animals stay on the surface), large caves (step 6), the look pass (boxy cutting walls and a raised entrance platform seen in `cave-0-mouth.png`: smooth the cutting, rocks around the mouth), torch light budget, drop/chest models, quest anchors, `bench:render` at a cave, e2e step for cave entry. Authority note: the user allowed Sonnet to take the decisions the plans assign to Opus (2026-10-03); record them in DECISIONS as "Sonnet default (user-authorised)".

### Update (2026-10-03, session 16, Sonnet — look pass, steps 5/6/7, light budget, bench, e2e)

Decisions are recorded in `DECISIONS.md` as **D-CAVE-2** (Sonnet default, user-authorised).

- **Look pass (mouth):** the cutting floor now follows the ground (`buildCaveGrid(…, followGround)` — runtime only, so generator placement did not change), cutting walls are banks that lean back (per-vertex outward direction, vertices touching a roofed cell stay vertical so no slits), rock rim along the cutting, wall tops 0.4 m above the ground. Seen in `cave-0-mouth.png` plus the new overview shots (`cave-0-side/top/front-far.png`, `tour-cave.mjs`; the tour lights the cave materials for those). The mouth is still angular on very steep slopes (the cutting is cut into a 45° face) — the remaining boxy look is the 2 m block outline, a candidate for a later Opus look pass.
- **Step 5 (navigation):** every actor can carry a cave layer (`ActorBase.cave`); the spine is the waypoint chain (`caveWaypoint`), `steerTo(…, targetCave)`; walkers = player + hired companions (enter/leave through the mouth), bound = cave dwellers, everyone else treats cuttings as solid. Tests `caveNav.test.ts` (dweller walks the whole spine; companion follows in through the mouth and out again with no teleport; 5 simulated minutes keep dwellers inside).
- **Step 6 (large caves):** class `large` (5 legs), one per world, `GEN_VERSION` 11; validation now also rejects a spine that folds back into itself and a mouth whose first open point is more than 0.85 steps from the ground.
- **Step 7 (fauna):** a bear (medium), bear + wolf (large), a wolf or three rats (small) in the deepest chamber, own RNG stream spawned after the player (ids of the rest unchanged); they never leave and need no water or food.
- **Step 8 (light/perf):** fire emitters are layer-aware (a torch on a cave floor lights only the cave, at floor height; surface fires never light the cave), torches shine at full strength underground, the fill light dims while the player's torch is lit. `bench:render` scenes `cave-mouth` / `cave-inside`: `render.prep` p95 1.5 / 2.7 ms, 0 console errors (PERF.md). Open optimisation: terrain/vegetation keep rendering while underground.
- **E2E:** acceptance step 20 walks into a cave with the real W key and back out with S; `__sv.teleportToCave` now faces the mouth.
- **Still open:** drop/chest models underground, quest anchors in caves, NPCs other than companions underground (decision: not in v1), the Opus look review of the mouth and the tunnel dimming (the tunnel shots are very dark without a torch — fill light 3.2 is the knob).

### Update (2026-10-03, Opus visual review 022)

Visual/design review of the mouth and interior with real lighting on 4 caves (`scripts/e2e/review-caves.mjs`, shots in `docs/reviews/assets/022/`): [review 022](../reviews/2026-10-03--022--cave-visual-review.md). Main findings: 3 of 7 caves on seed 1337 have no terrain hole (chunk-centre bucket test), banks are sliver panels with black faces and floating icosahedron rims, no mouth framing, grass in the cutting, global daylight switch at the threshold, boxy striped interior with a flat unlit material, and 98 % of the draw calls underground are hidden surface content. Work order and acceptance: **step 9 "Cave visual polish"** above (MUST 9.1–9.4, SHOULD 9.5–9.8, close-out 9.9, LATER list).
