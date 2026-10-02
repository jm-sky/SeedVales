# Combat target lock and soft targeting

**Status:** planned  
**Model:** sonnet — implementation and tests; opus — final keep/drop review of camera and movement feel  
**Domain:** combat  
**Sub domains:** input, player-movement, camera, targeting, ui, mobile, render  
**Created:** 2026-10-02

---

## User decisions (2026-10-02)

- `Tab` in combat mode controls combat target lock; outside combat it keeps the existing interaction-target cycle.
- Keep free camera control as the default; target lock only assists facing/camera and must not hard-snap.

## Goal

Add a combat-specific target selection system that makes melee combat more intentional without turning SeedVales into a hard lock-on action game. Keep free camera movement as the default, add a soft target assist for ordinary attacks, and provide an explicit combat lock for difficult encounters.

This plan must stay separate from the existing interaction target cycle (`Game.pinnedTarget`, `findTargets`, UI-06). Interaction targeting and combat targeting have different semantics and must not share state.

## Current state (recon, 2026-10-02)

- Desktop movement is camera-relative (`Game.frame()` + `moveAxes()`); the player faces the movement direction.
- In combat while stationary, `Game.frame()` forces player rotation to camera yaw.
- `Game.attack()` calls `meleeAttack()` with a wide cone (`80°` desktop, `220°` touch).
- `meleeAttack(sim, actor, coneDeg, preferId?)` already supports an explicit preferred actor id, but the player path does not currently pass one.
- `Game.pinnedTarget` + `Tab` cycle interaction objects, not enemies.
- `TargetMarker` already renders a ground ring for interaction targets.
- `CameraRig` is an orbit camera with mutable yaw/pitch/distance and no target-follow logic.
- Mobile already has a "next target" interaction control and a wide melee auto-target cone.

## Design

### Soft target assist

Without explicit lock:

- melee keeps the current spatial cone and priority rules;
- before a swing, select the best hostile/relevant actor in a narrow assist cone;
- allow only a small facing correction, approximately 10–20°, never a snap from behind or across the player;
- domestic animals and non-hostile NPCs keep their existing priority penalties;
- no camera steering.

The purpose is to remove near-miss frustration, not to automate target selection.

### Explicit combat lock

Add combat-only transient state, e.g. `combatTargetId`, owned by `Game` or other non-persistent gameplay-control state unless later design requires persistence.

Lock candidates:

- live actors only;
- within a calibrated maximum distance;
- prefer actors inside a forward camera cone;
- hostile/aggro actors before neutral actors;
- exclude the player, dead actors and protected/down actors where appropriate.

Controls:

- in combat mode, `Tab` cycles combat targets;
- outside combat, `Tab` keeps the existing interaction-target behaviour;
- explicit lock is cleared when leaving combat mode;
- lock is lost when the actor dies/disappears, moves too far away, or remains outside the allowed visibility/facing envelope for a short grace period.

### Locked movement

While locked:

- `W/S` approach / retreat relative to the target;
- `A/D` strafe/orbit around the target;
- player facing smoothly follows the target;
- movement still goes through existing `playerInput` and `moveWithCollision()`;
- sprint should break lock or disable orbit behaviour rather than producing unnatural fast circles.

### Camera

Do not hard-snap the camera.

- apply a weak yaw correction toward the locked target;
- preserve manual mouse/touch input as dominant;
- do not force pitch;
- keep the target broadly visible, but let the user deliberately look away;
- review camera feel on desktop and mobile before increasing assistance.

### UI

- use a visually distinct combat marker from the existing interaction marker;
- do not reuse the same colour/shape without differentiation;
- HUD may show a small target indicator/name only if it remains unobtrusive;
- mobile gets a combat-target control when in combat mode; avoid adding another permanent button if the existing contextual target button can switch meaning safely.

## Steps

1. Add pure combat-target candidate/ranking helpers using `sim.actors.query`, never a full actor scan.
2. Add explicit combat target state and lifecycle to `Game`; preserve interaction targeting unchanged.
3. Route `Tab` contextually: combat lock in combat mode, interaction cycle otherwise.
4. Pass the locked target id into `meleeAttack(..., preferId)` and add bounded soft facing assist for unlocked melee.
5. Add locked movement basis (approach/retreat + strafe) before world-space `playerInput` is written.
6. Add weak camera assist in `CameraRig`/`Game.frame()` with manual input taking priority.
7. Add distinct combat marker and mobile control behaviour.
8. Add diagnostics counters for lock acquire/drop/switch if useful during tuning.

## Verification

- Unit tests: target ranking, exclusion of dead/out-of-range actors, cycle order, lock loss, soft-assist angle cap.
- Combat tests: `preferId` wins among otherwise valid melee targets.
- Input tests: `Tab` keeps interaction behaviour outside combat and cycles combat actors inside combat.
- E2E desktop: enter combat, lock one of multiple enemies, strafe, attack the selected target, unlock.
- Mobile: lock/switch target without breaking camera drag or attack.
- Regression: UI-06 interaction target cycle remains unchanged outside combat.
- Performance: candidate selection uses the actor spatial grid and must not add a per-frame full-world scan.

## Estimated cost

- MVP: ~1 day.
- Polished version with camera/movement tuning, mobile and e2e coverage: ~2–4 days.
- Risk: low/medium; most required primitives already exist.

## Acceptance

- Combat target state is separate from interaction target state.
- Locked target is visibly indicated and deterministic to cycle.
- Lock improves facing and movement without taking camera control away from the player.
- Unlocked melee still feels good through bounded soft assist.
- No regression in interaction targeting, mobile controls or spatial-query rules.
