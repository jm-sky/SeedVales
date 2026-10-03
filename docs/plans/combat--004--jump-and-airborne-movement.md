# Jump and airborne player movement

**Status:** done  
**Model:** opus — step 1 architecture/keep-scope decision; sonnet — implementation after the movement contract is fixed; opus — final review  
**Domain:** combat  
**Sub domains:** player-movement, collision, terrain, input, camera, animation, water, traversal  
**Created:** 2026-10-02  
**Reviewed against:** `main` at `b066e41f18a862763857a63db15b187dbb0ea1d6`

---

## User decisions (2026-10-02)

- Use the minimal grounded traversal jump scope: small realistic jump, no mantle/climb and no general platforming controller.
- Terrain traversability must explicitly distinguish slopes that are too steep to walk uphill.
- Jump may sometimes overcome a short steep lip/step where ordinary uphill movement is blocked, but it must not turn a globally too-steep slope into a climbable surface.
- Keep sufficiently steep mountain/terrain faces intentionally inaccessible.
- This movement foundation must be compatible with `world--003--caves.md`: caves come later, but jump must not hard-code a second incompatible grounding model.

## Goal

Add a small, deterministic traversal jump while fixing the minimum movement/grounding architecture needed for future caves.

The implementation must separate:

1. horizontal intent and collision;
2. walk-surface lookup;
3. grounded state;
4. airborne vertical integration;
5. landing / water transition;
6. exceptional position repair after spawn/load/teleport.

This is not a general 3D character controller. Do not add arbitrary climbing, mantling, capsule sweeps, a physics engine, or render-mesh raycasting.

## Recon summary

### Current movement contract

Desktop/mobile input reaches movement as:

```text
keyboard / joystick
  -> input/controls.ts::moveAxes()
  -> Game.frame()
     - convert camera-space axes to world-space playerInput.mx/mz
     - run flag from Shift/mobile
  -> Sim.step()
  -> playerSystem()
     - choose walk/run/sneak/swim
     - speed × vitals × armour × load × analog magnitude × dt
     - cart pre-check
  -> moveWithCollision(sim, player, dx, dz, 0.35, true)
     - clamp world bounds
     - uphill slope rejection
     - optional deep-water avoidance
     - resource-node push-out
     - building push-out
     - landmark push-out
     - construction-site push-out
     - write x/z
     - unconditionally write y = groundHeight(...)
  -> actor spatial index update
  -> Renderer / CameraRig read player x/y/z
```

Important details:

- player base speeds are 1.5 m/s walk, 4.0 m/s run, 0.9 m/s sneak and 0.8 m/s swim;
- player movement runs every simulation substep;
- `moveWithCollision(..., full=false)` still writes `y`, even though it skips the expensive horizontal collision branch;
- idle player code also explicitly snaps `p.y = sim.terrain.heightAt(p.x, p.z)`, bypassing bridge-aware `groundHeight()`;
- AI shares `moveWithCollision()`, so refactoring its `y` ownership must preserve NPC/animal grounding.

### Ground and bridge contract

`groundHeight(sim,x,z)` currently returns:

1. terrain `heightAt(x,z)`;
2. or the maximum matching bridge deck height when inside a bridge footprint.

Bridge decks are generated at new-game state creation from the two terrain end heights and local water level, then stored as `Building.deck`.

This is already the right simulation-owned source for surface/bridge support, but the query is too tightly coupled to horizontal movement.

### Current slope rule

The exact check in `moveWithCollision()` is:

```ts
const h0 = terrain.heightAt(oldX, oldZ)
const h1 = terrain.heightAt(newX, newZ)
const len = hypot(newX - oldX, newZ - oldZ)
if (len > 1e-4 && (h1 - h0) / len > 1.2) return false
```

Properties:

- threshold = rise/run `1.2`, about **50.2°**;
- it blocks **uphill only**; downhill has no corresponding limit;
- it samples only the two movement endpoints;
- the effective result depends on step length and movement direction;
- a narrow lip may be averaged out by a longer step;
- a short step may see a much steeper local rise;
- diagonal/zig-zag movement can reduce directional rise/run even when the underlying terrain gradient is globally too steep.

Therefore this check is not stable enough to become the long-term definition of traversability unchanged.

`Terrain.slopeAt()` already provides a direction-independent gradient magnitude using ±1 m finite differences. Opus should reuse or refine that concept rather than inventing a second unrelated slope metric.

### Water contract

Swimming is currently selected from `terrain.waterDepthAt(x,z) > 1.2 m`.

Important architectural limitation: player `y` is still snapped to terrain/bridge ground while swimming. Swimming is currently a locomotion/render state, not buoyant vertical simulation.

Jump must define the deep-water transition explicitly. Do not accidentally create a half-buoyancy system in one branch while normal swimming keeps the old contract.

### Direct player-position writes found

Normal movement is not the only writer:

- `moveWithCollision()`: writes `x/z/y`;
- idle `playerSystem()`: writes `y = terrain.heightAt(...)`;
- KO wash-ashore: writes `x/z/y` directly, then reindexes;
- `Game.debugTeleport()`: writes `x/z/y` directly, using terrain height only;
- new game: player `x/z/y` comes from generated spawn + generated height;
- load: saved `x/y/z` are accepted as-is; there is no dedicated placement-repair phase;
- tests frequently mutate player `x/z` directly, sometimes repairing `y`, sometimes not;
- `testWorld.playerFarAway()` explicitly sets `x/z/y`;
- e2e uses debug teleport/approach, which routes through `Game.debugTeleport()`;
- road autopilot does **not** teleport: it feeds normal player movement.

Save validation currently validates actor `x/z` but not actor `y`.

These call sites need one explicit repair/reposition contract; otherwise airborne state will become stale after teleport/load/KO helpers.

### Camera and animation

- `CameraRig` follows player `y`, target offset +1.6 m, default distance 6 m.
- Camera terrain collision directly queries `Terrain.heightAt()`; this is acceptable for surface jump, but `world--003--caves.md` will later replace it with a context-aware environment query.
- Human animation supports idle/walk/run/sneak/swim plus transient actions, but no jump/fall/land states.
- Mobile currently has no Jump control.
- `Space` is not mapped in desktop controls, so it can be reserved contextually for jump/dodge.

## Architecture recommendation

### 1. Separate horizontal collision from vertical support

Refactor toward a contract equivalent to:

```ts
moveHorizontal(...)
supportHeight(...)
updatePlayerVertical(...)
repairPlayerPlacement(...)
```

Exact names are Opus's decision, but ownership should be:

- horizontal collision may modify `x/z`;
- support lookup returns the valid walk surface for the current spatial context;
- only the vertical controller writes airborne `y`;
- grounded actors may snap to support height;
- exceptional reposition paths explicitly reset/repair vertical state.

Do not let `moveHorizontal()` silently mutate `y`.

AI can continue to use a wrapper that performs horizontal movement + grounded support snap until/if AI airborne movement exists.

### 2. Shared walk-surface query

For the current surface world, use a named simulation-level support query based on terrain + bridge decks.

This API should be deliberately compatible with `world--003--caves.md`, where the same world `x/z` may have both a surface and cave floor. Therefore:

- do not change `Terrain.heightAt()` into a context-sensitive cave query;
- do not make rendering geometry authoritative;
- let future cave context choose a different walk surface behind the shared movement API.

### 3. Airborne state location

Prefer **transient player-controller state**, not `PlayerExtra` and not `ActorBase`.

Recommended shape: a small runtime structure owned by the current `Sim` instance, for example:

```ts
playerMotion: {
  grounded: boolean
  vy: number
  // optional short timers only if needed by feel/tests
}
```

Reasons:

- jump state is sub-second controller state, not durable game state;
- `PlayerExtra` is saved;
- `ActorBase` would imply all NPCs/animals need vertical integration now;
- Sim ownership resets naturally on new game/load and is testable;
- avoid module-global jump state leaking between game instances.

If saving while airborne remains allowed, loading should run deterministic placement repair rather than persisting mid-arc velocity.

### 4. Position repair contract

Introduce one helper for exceptional player relocation.

It must be used or explicitly considered by:

- new-game spawn;
- loaded save initialization;
- debug teleport / debug approach;
- KO wash-ashore;
- test helpers that reposition actors;
- any future scripted quest relocation.

Repair means:

1. set target `x/z`;
2. choose valid support/context;
3. set appropriate `y`;
4. reset `vy` and grounded state;
5. update spatial index.

Do not hide teleport semantics inside ordinary movement.

## Terrain traversability

### Named calibration

Extract the walkability threshold from the inline magic number into traversal calibration, with an explicit meaning.

Do not call the raw `1.2` test "the terrain rule" without deciding which metric it applies to.

Recommended model:

- **walkable slope**: local surface gradient within configured limit;
- **short jumpable lip**: locally steep rise with small horizontal thickness and valid walkable landing beyond it;
- **sustained non-walkable slope**: local gradient remains above the walk limit across a minimum probe distance;
- **low discrete obstacle**: explicit simulation collider that may later opt into jump-over behaviour;
- **major obstacle/wall**: always blocks horizontal traversal.

### Uphill vs downhill

The current asymmetry is intentional enough to preserve initially: steep downhill movement may remain possible where uphill is not.

However jumping/landing must not treat a near-vertical downhill face as a valid stable landing surface.

Opus should distinguish:

- movement permission while descending;
- valid **grounded support** after landing.

A surface may be descendable but too steep to establish a grounded landing/contact.

### Step-length stability

Do not classify a lip solely from the current frame's endpoint difference.

The first implementation should probe terrain over fixed world-space distances independent of frame rate, e.g. current point + one or more samples along intended movement.

Exact distances belong in calibration and tests.

## Jump versus steep terrain

A jump can clear a short lip only when all are true:

1. take-off starts from valid grounded support;
2. the player becomes airborne before crossing the blocked rise;
3. the airborne arc remains above the intervening terrain/support;
4. a landing candidate exists beyond the lip;
5. the landing surface itself is walkable/stable;
6. the landing point is not inside a major collider;
7. the rise is within a small calibrated jumpable vertical envelope.

A sustained steep face must remain non-traversable even if repeated Space presses are used.

## Anti-exploit rules

Tests must specifically prevent "Skyrim climbing":

- no jump reset from tiny/instant contacts on a forbidden steep surface;
- grounded becomes true only on a valid stable support;
- no new jump while descending/airborne;
- no landing on a surface whose local slope exceeds the landing threshold;
- no chain of forbidden-slope samples counted as separate legal landings;
- directional/diagonal input must not bypass the sustained-slope rule;
- pressing into a steep face while jumping must not convert horizontal collision into free upward displacement;
- a jump must not inherit support height from a higher bridge/terrain sample unless the arc actually reaches/crosses that surface from above.

If a jump attempt reaches an invalid steep landing, resolve conservatively: remain airborne/fall toward a valid lower support or reject horizontal advance; never snap upward onto the forbidden face.

## Obstacle-height metadata decision

### First architecture slice: **not required**

Do not add generalized obstacle height metadata merely to ship the first jump.

Reason from current code:

- felled trees are currently ignored by resource collision;
- small stones are already non-solid;
- boulders/trees use only radius and are intended major blockers;
- buildings and landmark solids have 2D footprints but no consistent traversal-height semantics.

Adding `height` everywhere now would create a speculative 3D collider model before there is a concrete first use.

The first slice should prove:

- terrain jump;
- short terrain lip;
- bridge transitions;
- water transition;
- anti-climb behaviour.

### Later useful obstacle slice

When one concrete low obstacle is introduced, add simulation-owned metadata only to the collider types that need it.

Possible shape:

```ts
{ collisionHeight?: number; traversal?: 'solid' | 'jumpable' }
```

Good candidates:

- a future fallen-log collider;
- selected resource-node variants;
- explicit low world props.

Do not infer height from Three.js meshes, scales, bounding boxes or raycasts at runtime.

Buildings, large rocks, trees, ruin walls and wreck hulls remain non-jumpable unless explicitly designed otherwise.

## Water behaviour

Required distinction:

- shallow water: jump/land onto the normal support and continue wading rules;
- deep water: crossing into swim depth ends airborne movement and transitions into the existing swim state;
- landing from above must not continue falling to the terrain bottom before recognising deep water.

Opus must choose one consistent player-`y` contract for deep swimming:

1. keep today's ground-anchored `y` and treat water entry as an explicit state snap; or
2. fix player swimming to a calibrated water-surface anchor as part of this architecture pass.

Option 2 is cleaner for camera/jump semantics but changes existing swimming visuals and should be tested as an intentional behaviour change, not slipped in incidentally.

## Bridge cases

Test separately:

- terrain -> terrain;
- terrain -> bridge deck;
- bridge deck -> terrain;
- bridge -> bridge;
- jump near a bridge side/edge;
- small downward drop off a bridge end;
- water directly beside/under a bridge.

Landing onto a bridge must be based on the airborne arc crossing the deck from above, not merely entering its 2D footprint.

For grounded walking, preserve today's bridge behaviour unless a regression test proves the side-snap needs correction in the same refactor.

## Input

Desktop:

- `Space` outside combat = jump;
- `Space` in combat = dodge from `combat--003`;
- keydown produces a one-shot jump request, not a held-per-frame impulse.

Disallow jump while:

- KO;
- swimming;
- pushing a cart;
- incompatible blocking activity;
- airborne;
- insufficient stamina;
- optionally overloaded, if Opus chooses consistency with dodge.

Autopilot should not automatically jump. If autopilot encounters non-walkable terrain it should remain governed by normal collision/stuck behaviour.

Mobile:

- add one contextual Jump/Dodge control rather than two permanent buttons;
- label/action follows combat state;
- joystick direction continues to provide horizontal intent.

## Vertical integration

Use gameplay seconds only.

Recommended minimal controller:

1. consume one-shot jump request while grounded;
2. set calibrated upward `vy`;
3. integrate gravity each simulation substep;
4. integrate player `y`;
5. run horizontal movement independently;
6. evaluate water entry and landing candidates;
7. land only when descending and crossing a valid support from above.

No double jump, coyote-time or jump buffering is required for the first slice unless playtesting shows the keyboard feel is poor.

## Falling / downward terrain changes

Small downward terrain differences should no longer require immediate snap while airborne.

For normal grounded walking, Opus should keep a conservative ground-following rule so walking over ordinary relief does not turn every downhill step into a micro-fall.

A small calibrated "ground follow / step-down" tolerance is acceptable. Larger downward separation transitions the player to airborne/falling.

No fall damage in this plan.

## Animation

Add transient render hints for:

- jump / take-off;
- fall;
- land.

Do not enlarge `ActorBase.moving` for all actors unless it is clearly the simplest representation.

Prefer player transient/action hints compatible with the existing renderer.

If no suitable clip exists, use a safe fallback first; physics/collision correctness has priority.

## Performance constraints

- no render raycasts for authoritative collision;
- no per-frame world scans;
- fixed small terrain/support probes only;
- continue using indexed node/building/landmark collision;
- avoid allocations in the movement hot path;
- add counters/timers only if they help diagnose grounding/jump regressions.

This movement API is also a prerequisite for caves, so keep it small and general rather than cave-specific.

## Implementation steps

### 1. Architecture decision — **Model: opus**

Record the final contract in `docs/design/DECISIONS.md`.

Decide explicitly:

1. exact horizontal-movement function split;
2. exact support-height API shared with `world--003`;
3. transient `playerMotion` ownership;
4. walkable-slope metric and threshold;
5. sustained-slope probe rule;
6. landing-validity slope rule;
7. ground-follow / small-drop tolerance;
8. deep-water player-`y` semantics;
9. save/load placement repair rule;
10. whether first slice excludes all discrete jumpable obstacles (recommended: yes).

### 2. Refactor grounding without changing normal movement — **Model: sonnet**

- extract named traversability calibration/helper;
- separate horizontal collision from `y` mutation;
- add a grounded wrapper for AI so NPC/animal behaviour stays unchanged;
- make player idle support use the same bridge-aware support query;
- centralise player placement repair;
- add regression tests before jump impulse exists.

Acceptance: existing walking, slopes, bridges, swimming, NPC movement and e2e remain green.

### 3. Add transient airborne controller — **Model: sonnet**

- one-shot jump input;
- stamina cost;
- `vy`, gravity, grounded state;
- no double jump;
- normal horizontal input during the arc;
- small step-down/fall transition.

### 4. Terrain lip + anti-climb rules — **Model: sonnet**

- fixed-distance terrain probes;
- short-lip classification;
- sustained non-walkable classification;
- valid landing slope check;
- diagonal/zig-zag exploit tests;
- repeated-jump exploit tests.

### 5. Bridge + water integration — **Model: sonnet**

Cover every matrix case listed above, including deep-water entry while airborne.

### 6. Position repair / lifecycle — **Model: sonnet**

Wire new-game/load/debug teleport/KO wash-ashore/test helper paths to the new placement contract where appropriate.

Add save/load regression for a save taken immediately after/while an airborne state exists according to the chosen step-1 rule.

### 7. Input / animation / mobile — **Model: sonnet**

- contextual desktop Space;
- contextual mobile Jump/Dodge;
- jump/fall/land render hints and clip fallbacks.

### 8. Optional discrete obstacle slice — **Model: opus keep/drop, sonnet implementation**

Only after terrain jump is stable:

- choose one actual low obstacle type;
- add minimal simulation-owned height/traversal metadata;
- prove crossing it does not generalise into wall/tree/boulder bypass.

Do not block the first jump release on this slice.

### 9. Final review — **Model: opus**

Review:

- movement contract clarity;
- caves compatibility;
- exploit resistance;
- water/bridge semantics;
- performance;
- whether any new abstraction is broader than the actual need.

## Verification

### Unit / integration

- current walking speed/modes unchanged after the grounding refactor;
- bridge-aware idle grounding;
- current uphill rejection represented by a named traversal rule;
- explicit test of the chosen threshold and fixed probe distances;
- downhill behaviour documented/tested separately;
- jump arc uses gameplay seconds;
- no double jump;
- stamina cost / disallowed states;
- small downward drop behaves predictably;
- valid short terrain lip can be cleared;
- sustained steep slope cannot be climbed;
- diagonal zig-zag cannot defeat sustained-slope classification;
- repeated jump spam cannot gain height on a forbidden face;
- invalid steep surface cannot become a landing reset;
- major resource/building/landmark colliders still block;
- terrain -> bridge -> terrain transitions;
- bridge edge cases;
- shallow-water landing;
- airborne entry into deep water;
- teleport/KO/load reset stale airborne state.

### E2E desktop

1. jump from standstill;
2. jump while walking;
3. jump while running;
4. short terrain lip;
5. repeated jumps against a steep mountain face fail to gain height;
6. bridge approach/jump/exit;
7. deep-water entry;
8. save/load placement remains valid;
9. combat Space dispatches dodge rather than jump once `combat--003` exists.

### Mobile

- contextual Jump outside combat;
- contextual Dodge inside combat;
- joystick direction remains movement basis;
- no accidental jump while using UI panels.

### Regression

Run full:

- `pnpm check`;
- smoke;
- acceptance;
- mobile.

Add focused movement/collision tests rather than relying only on e2e.

## Acceptance

- player jump has real vertical simulation;
- horizontal collision no longer unconditionally owns player `y`;
- one simulation-owned walk-surface API covers terrain + bridges and is ready for cave context;
- terrain too steep to walk uphill is an explicit named rule, not an inline incidental check;
- short terrain lips may be jumpable;
- sustained steep terrain remains non-traversable;
- repeated/diagonal jump exploits do not climb forbidden slopes;
- landing occurs only on valid support;
- bridge and water transitions are deterministic;
- direct teleports/repairs cannot leave stale airborne state;
- render geometry/raycasting is not authoritative;
- first slice does not invent generalized obstacle-height metadata without a concrete need;
- scope remains a grounded traversal jump, not platforming/climbing physics.

## Estimated cost

- architecture + movement refactor + regression coverage: ~1–2 days;
- jump + terrain anti-exploit + bridge/water: ~2–4 days;
- input/animation/mobile + e2e/final review: ~1–2 days;
- optional discrete jumpable obstacle slice: +1–2 days.

Overall: ~4–8 days depending mainly on the water/bridge edge cases and whether the optional obstacle slice is kept.

## Risks

- current slope rule is directional and frame-step-sensitive; replacing it carelessly can change ordinary walking across the whole world;
- `moveWithCollision()` is shared by AI, so a player-only vertical refactor must preserve grounded NPC/animal behaviour;
- current swimming keeps player `y` at ground height, which conflicts conceptually with airborne entry into deep water;
- bridge support is selected by 2D footprint + max height, so airborne landing needs stricter crossing logic than grounded walking;
- direct test/state mutations can hide missing placement repair unless focused regressions are added;
- future caves require contextual walk surfaces; hard-coding jump directly to `Terrain.heightAt()` would create immediate rework.

## Related plans

- `combat--003--directional-dodge.md` — shares contextual Space input and horizontal movement collision.
- `world--002--terrain-relief.md` — generated relief is the main source of slope/traversability cases.
- `world--003--caves.md` — depends on the same separation of horizontal collision, support query and vertical-state ownership; caves must extend this contract rather than replace it.

## Result (2026-10-03, session 14, Sonnet)

Steps 1–7 implemented with the recommended options (D-MOVE-1): `TRAVERSE`/`JUMP` calibration, airborne lip rule + sustained-face probe in `moveWithCollision`, `sim/motion.ts` (transient motion, `requestJump`, `supportFor`, `stableSupport`, `repairPlacement`), airborne step in `playerSystem` (gravity, landing, deep water, refused steep landing), idle support now bridge-aware, Space + mobile Jump button, `Game.debugTeleport` / KO wash-ashore use `repairPlacement`. Tests: `motion.test.ts` (7: arc, no double jump/stamina/water, running jump, repair, transient state, steep-face jump spam, bridge crossing-from-above), e2e acceptance 17 (Space). **Not done:** jump/fall/land animation (no suitable clip; safe fallback = unchanged pose), optional obstacle slice (step 8, dropped for now), camera smoothing at landing, final Opus review (step 9), mobile e2e for the Jump button.
