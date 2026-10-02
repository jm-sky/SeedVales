# Directional combat dodge

**Status:** planned  
**Model:** sonnet — implementation and tests; opus — final movement/feel review  
**Domain:** combat  
**Sub domains:** input, player-movement, collision, stamina, animation, armour, mobile  
**Created:** 2026-10-02

---

## User decisions (2026-10-02)

- Dodge is primarily physical displacement, not a Souls-like invulnerability mechanic.
- Default is no i-frames; add only a very short ~50–100 ms grace window if playtesting proves it necessary for responsiveness.

## Goal

Add a short directional combat dodge that rewards positioning and stamina management. The dodge should move the character physically out of an attack path, not rely on long Souls-like invulnerability windows.

## Current state (recon, 2026-10-02)

- Player movement is centralised in `sim/player.ts`.
- Movement already applies stamina, armour speed penalty, carried-weight overload, water modes and activities.
- Horizontal movement goes through `moveWithCollision()`, which handles terrain slope, resources, buildings, landmarks and construction sites.
- The player has no dodge state or dedicated burst movement.
- `ActorBase.moving` supports idle/walk/run/swim/sneak only.
- Renderer animation selection uses `moving` plus transient `action.kind`.
- Combat attacks are spatial: reach + facing cone. Moving out of that space is already meaningful.

## Design

### Control

Use `Space` while in combat mode.

Direction comes from current movement input:

- `W` forward dodge;
- `S` backward dodge;
- `A/D` side dodge;
- diagonals normalised;
- with no direction, default to a short backward step.

Outside combat, `Space` belongs to the jump plan (`combat--004`).

### Movement

Dodge is a short burst, approximately 1–2 m over a few hundred milliseconds.

- movement remains collision-aware through `moveWithCollision()`;
- no teleport;
- stop/shorten naturally when hitting a wall/tree/rock;
- no dodge while KO, swimming, pushing a cart, performing an incompatible activity, or without enough stamina;
- prevent dodge spam via cooldown/recovery.

### Defence model

Default: no long invulnerability.

The primary defence is physical displacement before the enemy hit resolves. If testing shows unavoidable overlap due to coarse timing, allow only a very short grace window (~50–100 ms) and document it explicitly.

### Character state modifiers

Use existing systems where possible:

- stamina cost from `STAMINA` calibration;
- heavy armour / armour speed penalty reduces dodge distance or increases recovery;
- overload disables dodge;
- severe leg injuries may reduce distance through existing vitals penalty or an explicit leg modifier if already available.

Do not create a separate complex encumbrance system in this plan.

### Combat target lock integration

If `combat--001` is present:

- dodge direction is relative to the locked target/movement basis;
- side dodge becomes a lateral step around the target;
- dodge must not silently clear lock unless distance/visibility rules naturally do so.

The plan remains implementable without target lock.

## State

Prefer transient state in the player controller:

- dodge direction;
- start/end gameplay time or remaining duration;
- cooldown/recovery until;
- optional action hint.

Avoid save-format changes for sub-second movement state.

## Steps

1. Add dodge input intent (`Space` contextually in combat) without conflicting with UI/typing.
2. Add calibration constants: stamina cost, duration, distance/speed, cooldown.
3. Add transient dodge state in the player controller.
4. During dodge, move through `moveWithCollision()` and suppress normal movement/run handling.
5. Apply armour/weight/condition modifiers conservatively.
6. Set action hint for animation and add clip/fallback selection.
7. Integrate with combat lock movement if `combat--001` is implemented.
8. Add mobile contextual Dodge button.
9. Add optional minimal invulnerability grace only if tests/game feel prove it necessary.

## Verification

- Unit tests: stamina requirement/cost, cooldown, no dodge while overloaded/cart/swimming/KO, armour modifier.
- Collision tests: dodge cannot pass through building/tree/landmark solids.
- Combat test: a correctly timed lateral/back dodge can leave the attack cone/reach before resolution.
- E2E desktop: directional dodges in all four cardinal directions.
- Mobile: contextual dodge button works while joystick direction determines dodge.
- Regression: `Space` outside combat is left available for `combat--004`; activities and autopilot do not enter invalid states.

## Estimated cost

- MVP: ~1–2 days.
- Polished version with animation, modifiers, mobile and lock integration: ~3–4 days.
- Risk: medium; movement/collision primitives already exist, so the main risk is tuning and animation feel.

## Acceptance

- Dodge is a real collision-aware displacement, not teleportation.
- Stamina/cooldown prevent spam.
- Heavy load/armour makes dodging meaningfully worse without introducing a new subsystem.
- Normal movement, swimming, carts and activities remain stable.
- The mechanic works both with and without combat target lock.
