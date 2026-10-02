# Jump and airborne player movement

**Status:** planned  
**Model:** opus — step 1 architecture/keep-scope decision; sonnet — implementation after the movement contract is fixed; opus — final review  
**Domain:** combat  
**Sub domains:** player-movement, collision, terrain, input, camera, animation, water, traversal  
**Created:** 2026-10-02

---

## User decisions (2026-10-02)

- Use the minimal grounded traversal jump scope: small realistic jump, no mantle/climb and no general platforming controller.
- Terrain traversability must explicitly distinguish slopes that are too steep to walk uphill.
- Jump may sometimes overcome a short steep lip/step where ordinary uphill movement is blocked, but it must not turn a globally too-steep slope into a climbable surface.
- Keep the existing concept that sufficiently steep mountain/terrain faces are intentionally inaccessible.

## Goal

Add a small, grounded jump for traversal over low obstacles, logs, rocks and narrow gaps. This is intentionally not an arcade platforming system. Because the current player controller is ground-snapped and collision is mostly horizontal, treat jump as a movement-architecture change rather than a simple key binding.

## Current state (recon, 2026-10-02)

- Player movement has no airborne state or vertical velocity.
- `moveWithCollision()` always finishes with `a.y = groundHeight(sim, nx, nz)`, so actors are snapped to terrain/bridge height after horizontal movement.
- Slope, node, building, landmark and site collision is primarily 2D.
- `groundHeight()` understands terrain and bridge decks.
- Player swimming is based on terrain water depth at the horizontal position.
- `ActorBase` has `vx/vz` but no dedicated vertical velocity.
- Camera follows player `y` and should naturally follow a real airborne position once one exists.
- Renderer has no jump/fall/land animation selection.
- `Space` is available and can be contextual: dodge in combat (`combat--003`), jump outside combat.

## Scope decision (Opus first)

Before implementation, choose and document one of these scopes:

### A. Minimal grounded traversal jump — preferred

- small vertical arc;
- horizontal motion continues from input/current speed;
- grounded detection against terrain/bridge deck;
- low obstacles marked as jumpable by explicit height metadata or a narrow, conservative rule;
- buildings/walls/large rocks remain blocking;
- no mantle/climb system.

### B. Cosmetic jump — reject unless explicitly temporary

Animating the model upward while collision remains fully 2D creates misleading traversal and should not become the permanent implementation.

### C. General 3D character controller — out of scope

Capsule sweeps, arbitrary ledges, climbing and full vertical collision would be a much larger project and are not justified for the current game.

## Design

### Input

- `Space` outside combat = jump.
- `Space` in combat = dodge when `combat--003` is implemented.
- no jump while swimming, KO, pushing a cart, in blocking activities, or without sufficient stamina.
- running may preserve more horizontal momentum but should not create exaggerated jump distance.

### Vertical motion

Introduce explicit transient airborne state:

- vertical velocity;
- grounded flag or ground-contact test;
- gravity in gameplay seconds;
- landing when the descending character crosses valid ground height.

Do not multiply jump physics by calendar acceleration semantics; this is gameplay-time movement like attacks.

### Collision contract

Refactor the current ground snap so horizontal collision and vertical grounding are separable.

Likely direction:

1. horizontal collision computes/updates `x/z` without forcibly overwriting airborne `y`;
2. ground query remains `groundHeight(sim, x, z)`;
3. grounded actors snap to ground;
4. airborne actors integrate vertical velocity and land when appropriate.

### Obstacles

The difficult part is obstacle height.

Current resource/building collision mostly provides 2D radius/box occupancy, not a complete traversable-height model. For the first version:

- only explicitly jumpable low obstacle classes should permit crossing;
- large trees, boulders, houses, walls and landmark solids remain non-jumpable;
- add minimal obstacle-height metadata where needed rather than guessing from render meshes;
- do not make rendering geometry authoritative for simulation collision.

### Water/bridges/terrain edges

Required cases:

- jump from terrain onto terrain;
- jump on/off bridge deck without snapping mid-air;
- landing in shallow/deep water transitions correctly to wade/swim;
- steep terrain remains governed by explicit traversability rules after landing; ordinary movement must know when an uphill slope is too steep to walk;
- jumping may clear a short steep terrain lip if the airborne arc passes above it and lands on valid ground, but sustained slopes above the walkable threshold remain non-traversable;
- falling from ordinary small terrain differences is handled gracefully, but this plan does not add lethal fall damage unless separately specified.

### Animation

Add `jump`, `fall`, `land` action/movement hints mapped to available clips/fallbacks. If the current animation pack lacks good clips, gameplay correctness comes first and animation polish may be a follow-up.

## Steps

1. **Opus architecture review:** define the airborne/grounding contract and exact first-version jumpable obstacle scope. Record the decision before coding.
2. Refactor `moveWithCollision()` or split helpers so horizontal collision no longer unconditionally owns `y`.
3. Add transient vertical velocity / grounded state to the player controller without unnecessary save persistence.
4. Add gravity, jump impulse, stamina cost and landing.
5. Integrate bridge deck and water transitions.
6. Add conservative jumpable-obstacle metadata/rules for a small useful set of obstacles and make the walkable-slope threshold an explicit shared traversal rule instead of an incidental collision detail.
7. Add `Space` input context with `combat--003` compatibility.
8. Add camera/animation polish.
9. Add mobile Jump button outside combat if screen space allows; otherwise expose it contextually.
10. Add diagnostics/tests before expanding obstacle coverage.

## Verification

- Unit tests: jump arc uses gameplay seconds; cannot double-jump; stamina cost; disallowed states.
- Collision tests: no jumping through house walls, large rocks or landmark solids.
- Traversal tests: cross one explicitly jumpable low obstacle; land correctly on terrain and bridge; walking fails on a too-steep uphill segment; a jump can clear a short steep lip but cannot climb a sustained non-walkable slope.
- Water tests: landing in deep water enters swim state without ground snapping.
- E2E desktop/mobile: jump from standstill and while moving; combat `Space` still dodges when applicable.
- Long-run regression: no persistent floating/sinking player after save/load, teleport/debug movement, KO wash-ashore or new-game spawn.
- Performance: no per-frame render-mesh raycasts or expensive world scans for grounding.

## Estimated cost

- Architecture + MVP: ~2–3 days.
- Useful polished traversal with obstacle metadata, bridge/water cases, animations and e2e: ~4–7 days.
- Risk: high relative to the other combat-control plans because it changes the movement/collision contract.

## Acceptance

- Jump has real vertical simulation; it is not only a visual animation.
- Ground snapping no longer destroys airborne motion.
- Collision remains simulation-owned and deterministic.
- The player cannot use jump to pass through major obstacles or bypass sustained non-walkable terrain slopes.
- Bridges, water and terrain transitions remain stable.
- Scope stays small: traversal jump, not a general platforming/climbing controller.
