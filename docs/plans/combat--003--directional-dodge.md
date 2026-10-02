# Directional combat dodge

**Status:** planned  
**Priority:** low  
**Model:** sonnet — implementation and tests; opus — decisions in `Decisions for Opus` and final combat/movement feel review  
**Domain:** combat  
**Sub domains:** input, player-movement, collision, stamina, animation, armour, target-lock, mobile, diagnostics  
**Created:** 2026-10-02  
**Reviewed against main:** 2026-10-02, `b066e41f18a862763857a63db15b187dbb0ea1d6`

---

## User decisions (2026-10-02)

- Dodge is primarily real physical displacement, not a Souls-like invulnerability mechanic.
- Default is **no i-frames**.
- Only add an extremely short ~50–100 ms protection/grace window if the actual combat timing proves it technically necessary.

These decisions remain valid after the current-code recon. The important caveat is that current melee damage resolves synchronously at attack invocation, so a reactive dodge cannot evade a hit that has already entered `meleeAttack()`; see `Melee timing and grace-window implications` and `Decisions for Opus`.

## Goal

Add a short directional combat dodge that rewards positioning, timing and stamina management while remaining physically grounded:

- real collision-aware displacement;
- no teleport;
- no long invulnerability window;
- no parallel encumbrance/injury model;
- compatible with the target-lock, block/parry and jump plans;
- cheap enough in runtime and implementation complexity to justify a low-priority polish feature.

## Non-goals

- Souls-like roll chains or long i-frames;
- a generic root-motion system;
- reworking all player locomotion;
- adding sophisticated NPC dodge AI;
- projectile auto-evasion;
- a new saved combat-state subsystem.

## Current-state recon

### Input -> movement -> final position

The current normal player path is:

1. `src/game/input/controls.ts::moveAxes()`
   - keyboard WASD/arrows or mobile joystick;
   - mobile stick overrides keyboard when outside the dead zone;
   - diagonals are already normalized to magnitude <= 1.
2. `src/game/Game.ts::frame()`
   - reads `moveAxes()`;
   - converts camera-space right/forward input into world-space `playerInput.mx/mz` using `CameraRig.forward()`;
   - writes run, camera yaw/pitch and bow-draw intent;
   - while in combat and stationary, directly aligns `player.rot` to camera yaw.
3. `src/game/sim/player.ts::playerSystem()`
   - KO returns early;
   - movement input may interrupt an activity;
   - autopilot can replace `mx/mz` when there is no manual movement and is cancelled by manual movement/threat;
   - derives water mode, stamina state, sneaking/running, armour/health penalties and overload;
   - computes movement distance;
   - calls `moveWithCollision(sim, player, dx, dz, 0.35, true)`;
   - rotates the player toward movement and updates `player.moving`;
   - updates the actor spatial index.
4. `src/game/sim/collision.ts::moveWithCollision()`
   - bounds the world;
   - blocks steep uphill movement (> ~1.2 rise/run);
   - resolves tree/rock circles;
   - pushes out of building and landmark box/circle solids;
   - resolves construction-site circles;
   - updates final `x/z` and `y = groundHeight(...)`;
   - returns only whether some movement happened.

This path should stay the base primitive for dodge; dodge must not create a second collision implementation.

### Existing movement modifiers to reuse

`src/game/sim/player.ts` already combines:

- `penalty(p.vitals)`;
- `1 - armorSpeedPenalty(p)`;
- carried-weight overload;
- water slowdown;
- cart speed;
- run/sneak/swim movement modes.

`src/game/sim/vitals.ts::penalty()` already includes:

- low vigor / exhaustion;
- hunger;
- thirst;
- convalescence;
- illness;
- **leg damage** from `lleg + rleg`, up to a 40% multiplier penalty.

Therefore dodge does **not** need a new leg-injury formula.

`src/game/sim/inventory.ts` already provides `carriedWeight()` and `carryCapacity()`. Normal movement currently halves speed when overloaded, but the existing dodge decision is stricter: overload should reject dodge entirely.

### Water state

Normal movement distinguishes:

- ordinary ground;
- shallow water slowdown at depth > 0.3 m;
- swimming above `SWIM_DEPTH_M` (1.2 m).

There is no explicit `wading` actor state. For the first dodge slice, treat depth > 0.3 m as incompatible with dodge rather than inventing a new water-dodge animation/physics path. This covers both meaningful wading and swimming deterministically and can be relaxed later if the animation review justifies it.

### Current combat timing: critical finding

`src/game/sim/combat.ts::meleeAttack()` currently performs the entire melee resolution synchronously:

1. checks `attackReadyAt`, down state, weapon and stamina;
2. spends stamina;
3. sets `attackReadyAt`;
4. writes `action = { kind: 'swing', at: now }`;
5. queries targets and checks reach/cone;
6. rolls hit chance;
7. calculates damage;
8. calls `applyDamage()` immediately.

The renderer subsequently shows `Sword_Attack` for ~0.7 s, but that animation is only a visual hint. It does **not** schedule the strike.

Consequences:

- moving before an enemy calls `meleeAttack()` can avoid the attack by leaving reach/cone;
- once `meleeAttack()` has started, displacement cannot retroactively avoid that hit;
- the visible enemy swing is not currently a reaction window;
- physical displacement alone therefore makes dodge useful mainly as **pre-emptive spacing**, not as a classic reaction to an already-started swing.

This is the largest hidden dependency in the original plan.

### Existing attack recovery

`attackReadyAt` only prevents another attack. It does **not** currently prevent walking/running immediately after a swing.

`src/game/render/actors.ts::humanAnim()` shows `Sword_Attack` for ~0.7 s, but player translation is not locked by that animation.

Dodge therefore needs an explicit policy for attack commitment/recovery instead of assuming one already exists.

### Collision suitability for dodge

`moveWithCollision()` is the correct collision primitive, but a dodge should **not** feed a large single burst step into it.

Why:

- normal movement at the current max simulation substep is relatively small;
- a 1–2 m dodge over ~0.2 s can produce much larger per-substep deltas;
- collision is endpoint/push-out based, not continuous swept collision;
- a large step could tunnel across a thin solid or produce an unnatural push around it.

Recommended use:

- keep `moveWithCollision()` unchanged as the primitive;
- subdivide dodge translation into small collision steps (target <= ~0.25–0.35 m per call), either in the dodge code or via a tiny reusable wrapper;
- measure actual travelled distance from before/after positions for collision-shortened diagnostics.

No large collision-system refactor is justified for this feature.

### Transient-state precedent

`GameState` / `PlayerExtra` is saved state. Sub-second dodge state should not go there.

`Sim` already owns transient non-save runtime state such as:

- `projectiles`;
- system accumulators;
- `timeScale`;
- `interruptReason`.

Recommended representation is therefore a small transient player-dodge runtime owned by the running `Sim`, not `GameState`.

### Animation availability and precedence

`public/assets/characters/anims.glb` currently keeps 22 humanoid clips. Important verified clips include:

- `Roll`;
- `Sprint_Loop`;
- `Walk_Loop`;
- `Crouch_Fwd_Loop`;
- `Sword_Attack`;
- `Hit_Chest`;
- bow/aim and swim clips.

There is **no verified dedicated side-step/back-step/strafe-dodge clip** in the retained set.

`src/game/render/actors.ts::humanAnim()` currently prioritizes:

1. death/KO;
2. recent melee swing;
3. recent shot;
4. player activity;
5. bow draw;
6. locomotion;
7. older generic action hints;
8. idle.

A dodge action therefore needs deliberate precedence; otherwise `Sword_Attack` or bow aim can visually mask it.

`Roll` is a real available candidate, but it must be visually reviewed because a full roll may be more acrobatic than the intended grounded dodge. The safe fallback is a short directional locomotion burst using an existing movement clip, not pretending an unrelated attack clip is a dodge.

### Mobile state

`src/ui/mobile/MobileControls.vue` currently has:

- left joystick -> `input.stickX/Y`;
- right-half camera drag -> `input.lookDX/lookDY`;
- Combat, Run, Sneak, Weapon, Target, Action and Attack/Draw controls.

The joystick is already the correct source for dodge direction.

A Dodge button should be contextual and edge-triggered:

- tap/press initiates one dodge request;
- it must not be a held repeating action;
- joystick direction is sampled at dodge start;
- camera drag remains independent;
- do not overload the existing Attack/Draw pointer lifecycle.

## Recommended dodge model

### Input event / intent

Add one contextual `Space` action at the Game routing layer rather than treating Space as a continuously held movement key.

Recommended semantic action name: a generic contextual mobility action (exact name implementation choice), routed by `Game`:

- combat mode -> dodge;
- outside combat -> reserved for `combat--004--jump-and-airborne-movement.md`.

This avoids duplicate Space listeners and prevents key-repeat dodge spam.

Mobile calls the same `Game` dodge/mobility entry point.

### Exact transient representation

Recommended first-slice runtime shape, transient on `Sim` (names are illustrative):

```ts
playerDodge?: {
  dirX: number
  dirZ: number
  startedAt: number
  activeUntil: number
  recoveryUntil: number
  startX: number
  startZ: number
  collisionShortened: boolean
}
```

Important semantics:

- direction is fixed at dodge start;
- duration/recovery use **gameplay seconds** (`state.time.play`);
- no field is saved;
- no `SAVE_VERSION` bump;
- normal movement input is ignored while active;
- after active movement ends, recovery prevents immediate re-dodge but normal walking can resume unless Opus deliberately chooses a locomotion lock.

### Initial calibration range, not final balance

Centralize in `src/game/config/calibration.ts`, e.g. a `DODGE` object.

Reasonable tuning range for first implementation:

- base distance: ~1.3–1.7 m;
- active duration: ~0.18–0.28 s;
- stamina cost: ~15–20;
- minimum stamina: at least the full configured cost;
- recovery/cooldown: ~0.45–0.7 s from dodge start/end policy chosen by implementation;
- collision micro-step: <= ~0.25–0.35 m;
- optional grace: **0 by default**, hard-capped to the user-approved ~50–100 ms only if later enabled.

These values require playtesting; they are not acceptance criteria.

## State interactions

### KO / down

Reject dodge while `player.vitals.ko` is active. `playerSystem()` already gives KO absolute movement precedence.

### Activity

Reject while `px.activity` is active for the first slice.

Reason: `Game.attack()` already blocks attacks during an activity, and silently turning Space into "cancel work and combat-roll" is a larger UX change than this plan needs.

### Water

First slice: reject if water depth > 0.3 m.

This avoids adding separate wade/swim dodge physics and keeps `Roll` out of visibly inappropriate water.

### Cart pushing

Reject while `px.cart` exists. This matches the existing "both hands on the cart" combat restrictions.

### Overload

Reject when `carriedWeight(player) > carryCapacity(player)`.

Do not merely halve dodge distance: the existing plan decision is that overload disables dodge.

### Sneaking

Allow start from sneak, but active dodge temporarily overrides locomotion/animation. Preserve the sneak toggle afterwards.

### Running

Allow start while running. Running input does not increase dodge distance and does not bypass recovery.

### Bow draw

Recommended: dodge **cancels bow draw without firing**.

Important current-code edge case: simply forcing `input.primary = false` would make `playerSystem()` release the current bow shot because `!drawing && bowDraw > 0` calls `fireRanged()`.

Implementation therefore needs an explicit cancel path that clears `px.bowDraw` before release logic for a dodge transition.

### Attack / attack recovery

Do not let dodge freely cancel the entire melee recovery from frame zero.

Recommended first model:

- no dodge during the short committed strike portion;
- after that commitment window, dodge may start even if `attackReadyAt` is still in the weapon cooldown;
- this commitment window should line up with the melee timing choice in `Decisions for Opus`, not be another unrelated magic duration.

Blocking dodge until full `attackReadyAt` would make slow weapons excessively sticky; allowing it immediately would remove attack commitment entirely.

### Block / parry

`combat--002` is not implemented yet.

If it lands first, dodge should cancel active guard/block state when the dodge starts. Do not allow simultaneous full guard + dodge.

A successful dodge request should clear transient guard state through the defence controller API rather than editing saved actor state.

### Autopilot

Starting a valid dodge cancels `px.autopilot`, consistent with manual movement taking control from road autopilot.

A rejected dodge should not cancel autopilot.

## Movement and armour/injury scaling

Reuse the existing movement multiplier:

```
conditionAndArmour = penalty(player.vitals) * (1 - armorSpeedPenalty(player))
```

Recommended first-slice effect:

- apply this multiplier to **dodge distance/speed**;
- overload still rejects dodge;
- do not also multiply stamina cost and recovery by armour/injury in v1.

Why:

- leg injuries already live inside `penalty()`;
- needs/illness/convalescence already affect the same multiplier;
- armour already contributes `armorSpeedPenalty()`;
- applying the same penalty again to cost/recovery would create a separate compounded dodge-specific balance model.

If later playtesting shows heavy armour is still too agile, add one measured secondary effect rather than three simultaneous penalties.

## Target-lock integration

`combat--001` is planned, not implemented.

Without lock:

- dodge input uses the current camera-relative movement basis from `moveAxes()` / `CameraRig.forward()`;
- no-direction fallback uses camera-relative backward.

With a valid combat lock:

- W/S = radial toward/away from locked target;
- A/D = target-relative tangent/orbit direction;
- diagonals normalized;
- no-direction fallback = directly away from the locked target;
- dodge may rotate visually toward displacement if required by the chosen animation, but the **lock state itself remains retained**;
- after dodge, target-facing resumes according to `combat--001`;
- normal lock invalidation rules (dead/down/out of range/etc.) may still clear it.

Do not put target ids into the dodge state; compute direction once at start.

## Melee timing and grace-window implications

### What displacement alone can do today

With current synchronous `meleeAttack()`:

- a dodge that starts early enough can move the player outside the next enemy reach/cone check;
- a dodge cannot evade damage after the enemy attack function has already selected/rolled/applied the hit;
- the visible `Sword_Attack` / animal Attack animation does not create an evade window.

Therefore a combat test claiming "press dodge during the visible swing and avoid the hit" would be false under current mechanics unless melee timing is changed.

### Is the optional 50–100 ms grace technically necessary?

Not automatically.

A tiny grace window can solve only a narrow problem:

- frame/substep ordering where dodge begins just before an enemy's synchronous attack call but has not yet accumulated enough displacement.

It does **not** fix the deeper visual mismatch where the damage has already occurred at the start of a 0.7 s swing animation.

Recommendation:

- keep grace disabled initially;
- if current instantaneous melee timing is retained, tune/test physical displacement first;
- add <=100 ms grace only if deterministic tests/playtesting demonstrate a real ordering problem;
- if the design goal is a true reactive evade against telegraphed swings, prefer delayed strike timing instead of extending i-frames.

## Diagnostics and calibration

Use existing `perf` diagnostics; keep them cheap.

At minimum add counters/gauges for:

- `combat.dodgeAttempts`;
- `combat.dodgeStarts`;
- rejected dodge counts by stable reason (KO, activity, water, cart, overload, stamina, recovery, attack-commit);
- requested/base dodge distance;
- actual travelled distance;
- collision-shortened dodge count;
- last dodge stamina cost;
- optional grace-trigger count **only if grace exists**.

"Attacks avoided" is not worth adding under the current instantaneous melee model because there is no explicit pending attack to attribute cheaply and reliably.

If delayed strike timing is introduced, an avoided pending strike can then be counted deterministically.

## Concrete files/functions expected to change

### Required

- `src/game/config/calibration.ts`
  - `DODGE` tuning constants.
- `src/game/input/controls.ts`
  - contextual Space mobility action; edge-triggered, no repeat.
- `src/game/Game.ts`
  - route Space/mobile Dodge;
  - compute camera-relative or target-relative direction;
  - no-direction fallback;
  - cancel autopilot on successful start;
  - integrate combat-lock state when available.
- `src/game/sim/sim.ts`
  - transient non-save dodge runtime, if the recommended ownership is chosen.
- `src/game/sim/player.ts`
  - dodge eligibility/execution;
  - stamina spend;
  - normal-movement suppression while active;
  - bow-draw cancellation;
  - armour/condition distance scaling;
  - actor spatial-index update.
- `src/game/sim/collision.ts`
  - ideally no semantic change; at most a tiny reusable stepped-movement helper if that proves cleaner than local subdivision.
- `src/game/render/actors.ts`
  - dodge action precedence;
  - verified `Roll` or locomotion fallback.
- `src/ui/mobile/MobileControls.vue`
  - contextual Dodge button.
- relevant unit and e2e/mobile tests.

### Conditional dependencies

- `combat--001--combat-target-lock.md`
  - target-relative direction and lock retention.
- `combat--002--block-and-parry.md`
  - guard cancellation and shared combat timing.
- `combat--004--jump-and-airborne-movement.md`
  - shared contextual Space routing; outside combat Space remains jump.

### If delayed melee strike timing is chosen

Expect additional work in:

- `src/game/sim/combat.ts`;
- player/NPC/fauna attack call sites and tests;
- block/parry timing assumptions;
- animation/action timing diagnostics.

That is a combat-timing change, not merely a dodge implementation detail.

## Recommended implementation order

1. **Opus decisions first**
   - especially melee timing, transient-state ownership, attack commitment and lock behaviour.
2. **Combat timing test before dodge mechanics**
   - codify current synchronous melee behavior so any timing change is intentional.
3. **Calibration + transient runtime state**
   - no save-format change.
4. **Pure dodge eligibility/start helper**
   - deterministic rejection reasons and stamina/recovery handling.
5. **Collision-aware movement**
   - stepped calls through `moveWithCollision()`;
   - unit-test walls/rocks/landmark solids before UI.
6. **Normal movement/state interaction**
   - KO/activity/water/cart/overload/sneak/run/autopilot.
7. **Bow + attack/block interactions**
   - explicit bow cancel without firing;
   - attack commitment;
   - guard cancellation if `combat--002` already exists.
8. **Diagnostics**
   - attempts, starts, rejection reason, actual distance/collision shortening.
9. **Animation**
   - try verified `Roll`, review visually;
   - fall back to short locomotion burst if the roll is inappropriate.
10. **Desktop Space routing**
    - shared contextual mobility action with jump plan.
11. **Target-lock integration**
    - if `combat--001` is implemented by then.
12. **Mobile UX**
    - contextual Dodge button using joystick direction.
13. **E2E/mobile + feel pass**
    - only after deterministic mechanics tests are green.
14. **Optional grace**
    - only if evidence demonstrates a real need; never as the default shortcut.

## Testing requirements

### Deterministic unit tests: eligibility and stamina

Test:

- exact minimum stamina boundary;
- successful dodge spends exactly one configured cost;
- insufficient stamina rejects without spending;
- recovery/cooldown blocks repeat requests;
- request succeeds immediately after recovery boundary;
- held/repeated Space keydown does not repeatedly enqueue dodge;
- failed dodge does not start recovery.

### Deterministic unit tests: incompatible/interacting states

Cover:

- KO -> rejected;
- activity -> rejected;
- water depth just below/at/above chosen 0.3 m threshold;
- swimming -> rejected;
- cart -> rejected;
- overload exact boundary and above -> rejected;
- sneak -> allowed and restored after dodge;
- run -> allowed but does not scale distance;
- autopilot -> successful dodge cancels it;
- rejected dodge does not cancel autopilot;
- bow draw -> cancelled without projectile/ammo consumption;
- attack commitment boundary;
- active block -> cancelled if `combat--002` exists.

### Direction tests

Cover:

- W/S/A/D;
- all diagonals normalized to the same base distance;
- analog joystick magnitude does not accidentally make a diagonal longer;
- no-direction fallback;
- camera yaw rotations (same input produces correctly rotated world direction);
- no NaN/zero-vector state.

### Collision tests

Use deterministic geometry and verify:

- dodge cannot cross a building wall;
- tree/rock collision shortens/redirects without teleporting;
- landmark circle/box solids block;
- construction sites still block;
- steep uphill slope rejects/shortens movement according to `moveWithCollision()`;
- world bounds hold;
- a collision-shortened dodge reports less actual than requested distance;
- stepped movement does not tunnel through a thin solid.

### Combat timing tests

Before implementation, add a regression proving the current fact:

- `meleeAttack()` applies damage synchronously at call time.

Then, depending on Opus decision:

**If instantaneous timing stays:**

- dodge begun before the attack call can leave reach/cone and avoid target selection;
- dodge begun after the call cannot retroactively cancel damage;
- no test should claim animation-time evasion.

**If delayed strike timing is introduced:**

- attack start does not damage immediately;
- target/reach policy at strike-resolution time is explicit and tested;
- displacement before strike resolution can avoid the hit;
- block/parry timing uses the same strike event.

### Target-lock tests

When `combat--001` exists:

- W/S radial movement;
- A/D tangential/orbit direction;
- diagonals normalized;
- no-input dodge goes away from target;
- lock survives dodge;
- invalid/dead/out-of-range target still follows the lock plan's normal invalidation;
- dodge state never stores a target id.

### Animation/input tests

Verify:

- `Roll` exists in the retained clip set/build contract;
- dodge animation is not masked by stale movement state;
- death/KO still has highest precedence;
- bow aim is cleared before dodge;
- attack-vs-dodge precedence matches attack commitment policy;
- dodge completion returns to correct idle/walk/run/sneak/lock-facing behavior.

### E2E desktop

Add one stable scenario for:

- combat-mode Space starts exactly one dodge;
- real position changes by a bounded distance;
- collision prevents passing through a solid;
- stamina drops;
- immediate repeat is rejected;
- outside combat Space remains owned by jump semantics when `combat--004` is present.

Do not use a sub-100 ms real-browser race as the primary proof of grace/timing.

### Mobile

Add coverage for:

- Dodge button appears/acts in the intended combat context;
- joystick direction at press time determines direction;
- centered joystick uses no-direction fallback;
- a single press starts one dodge;
- camera drag can continue independently;
- Attack/Draw and Dodge pointer handling do not stick or steal each other's state.

## Explicit risks

- **Current melee timing mismatch:** damage is immediate while the attack animation is delayed visually. A "reaction dodge" is impossible without changing strike timing.
- **Scope expansion through delayed strikes:** fixing that mismatch touches shared player/NPC/animal combat and should be treated as a combat-system change.
- **Collision tunneling:** large burst deltas are unsafe with endpoint collision; dodge must use small steps.
- **Animation mismatch:** `Roll` exists, but there is no verified dedicated side/back step. The available roll may look too acrobatic.
- **Attack-cancel exploit:** allowing instant dodge from any point in attack recovery can erase weapon commitment.
- **Bow accidental shot:** clearing held primary without explicitly clearing bow draw can fire an arrow rather than cancel.
- **Target-lock coupling:** `combat--001` changes movement/facing semantics; implementing dodge first must leave a clean integration point.
- **Block coupling:** `combat--002` needs the same strike timing and transient-state discipline; avoid two incompatible combat-runtime models.
- **Save pollution:** storing dodge in `PlayerExtra` / actor saved fields would force needless save-version concerns.
- **Water animation:** there is no dedicated wade-dodge path; allowing roll in shallow water would look incorrect.
- **Stamina regeneration:** current `STAMINA.regenPerS = 12`; cost/recovery must be tuned together or dodge spam may recover too quickly.
- **Mobile button density:** the existing bottom-right control grid is already busy; layout must be checked at the landscape-phone viewport.
- **Test flakiness:** sub-frame browser timing is inappropriate for proving a 50–100 ms mechanic; use deterministic sim tests/debug hooks.

## Estimated cost and risk

### If current instantaneous melee timing is retained

- core mechanics + tests: ~2 days;
- animation/mobile/diagnostics/lock integration: +1–2 days;
- total: ~3–4 days;
- risk: **medium**.

### If delayed strike timing is introduced

- dodge work plus shared combat timing and regression coverage: ~4–6 days;
- block/parry assumptions must be revalidated;
- risk: **medium-high**.

The feature remains **low priority**. It should not displace higher-value world/combat work unless the broader melee timing pass is already being done.

## Acceptance

- Dodge is real collision-aware displacement, not teleportation.
- Default has no i-frames.
- Any grace window is <= ~100 ms, evidence-driven and explicitly documented.
- Stamina + recovery prevent spam.
- Overload, KO, activity, cart and water restrictions are deterministic.
- Existing health/leg-injury and armour movement penalties are reused.
- Collision cannot be bypassed by burst movement.
- Bow draw cannot accidentally release an arrow when dodging.
- Attack commitment is explicit rather than an accidental animation side effect.
- Target lock, if present, is retained through dodge unless its own invalidation rules clear it.
- Mobile uses joystick direction and one contextual Dodge action.
- No dodge state is added to save data.
- Tests state clearly whether melee remains instantaneous or gains delayed strike resolution.

## Decisions for Opus

### 1. Instantaneous hit resolution vs delayed strike timing

#### Option A — keep current synchronous `meleeAttack()`

Consequences:

- smallest code change;
- dodge works as proactive repositioning before the enemy attack call;
- visible swing animation still does not represent the hit timing;
- classic "see swing -> dodge" behavior is not actually supported.

Risks:

- players may perceive successful/failed dodges as inconsistent with animation;
- a tiny grace window can mask only frame ordering, not the whole visual mismatch.

#### Option B — split attack start from strike resolution (**recommended when this low-priority feature is finally scheduled**)

Example model:

- attack start spends stamina, sets cooldown/action and records a transient pending strike;
- strike resolves once at a calibrated point in gameplay time;
- reach/cone/defence policy at strike time is deterministic and shared with block/parry.

Consequences:

- physical dodge can genuinely move out before the hit;
- animation, dodge and parry gain one coherent timing model;
- diagnostics can attribute avoided attacks;
- broader change to player/NPC/animal combat and tests.

Risks:

- more implementation cost;
- must decide whether target is fixed at wind-up or reacquired/validated at strike;
- can change existing AI lethality/timing.

**Recommendation:** Option B when dodge is implemented as part of a combat-feel pass. Because the feature is low priority, do not force this refactor now merely to land dodge. If Opus chooses Option A, document dodge as proactive spacing rather than a fully reactive evade.

#### Option C — keep synchronous damage and add a longer invulnerability window

Consequence: cheapest way to imitate a reactive dodge.

Risk: directly conflicts with the user's no-Souls-like-i-frame decision.

**Recommendation:** reject.

### 2. Exact dodge-state representation

#### Option A — transient runtime on `Sim` (**recommended**)

Small `playerDodge` runtime with fixed direction, start/end/recovery times and diagnostic origin.

Consequences:

- gameplay-time ownership is correct;
- naturally processed inside sim substeps;
- not saved;
- easy deterministic tests.

Risk: adds one player-specific transient field to `Sim`, which is otherwise mostly generic runtime state.

**Recommendation:** Option A.

#### Option B — store dodge in `PlayerExtra`

Consequence: easy access from player code.

Risk: `PlayerExtra` is saved state; this would pollute save semantics with sub-second input state and potentially force unnecessary format work.

#### Option C — keep everything in `Game` / input layer

Consequence: no Sim field.

Risk: duration/collision would be tied to render frames rather than simulation substeps and gameplay time; poor deterministic-test boundary.

### 3. Armour and injury scaling

#### Option A — reuse `penalty(vitals) * (1 - armorSpeedPenalty)` for dodge distance only (**recommended**)

Consequences:

- leg injuries, needs, illness, convalescence and armour already work;
- one shared movement model;
- overload remains a hard reject;
- stamina/recovery remain simple.

Risk: heavy armour may need stronger differentiation after playtesting.

**Recommendation:** Option A first.

#### Option B — distance + increased stamina cost from armour

Consequence: makes heavy armour more clearly worse for repeated dodges.

Risk: begins a separate dodge-specific encumbrance model and double-counts armour.

#### Option C — distance + stamina + recovery all scale with armour/injury

Consequence: strongest simulation differentiation.

Risk: over-penalizes the same state three times and greatly increases tuning complexity.

### 4. No-direction dodge fallback

#### Option A — default backward (**recommended**)

- unlocked: backward relative to camera/player movement basis;
- locked: directly away from locked target.

Consequences:

- one-tap defensive use works on desktop and mobile;
- centered joystick still has a predictable result.

Risk: accidental Space press can move the player.

**Recommendation:** Option A.

#### Option B — reject without directional input

Consequence: fully intentional direction.

Risk: worse mobile ergonomics; user can press Dodge with centered stick and get nothing.

#### Option C — use last movement direction

Consequence: can feel fluid while moving.

Risk: stale direction is less predictable, especially after stopping or rotating camera.

### 5. Does dodge interrupt bow draw?

#### Option A — cancel draw without firing (**recommended**)

Consequences:

- evasive action has clear priority;
- avoids dodge + fully charged bow combination;
- needs explicit code because normal draw release currently fires.

Risk: player loses draw progress.

**Recommendation:** Option A.

#### Option B — reject dodge while bow is drawn

Consequence: simplest state model.

Risk: makes ranged combat much less responsive defensively.

#### Option C — keep bow draw during dodge

Consequence: most permissive.

Risk: implausible/strong and likely causes animation conflicts.

### 6. Does dodge interrupt block?

This depends on `combat--002`, which is not implemented yet.

#### Option A — dodge cancels guard/block (**recommended**)

Consequences:

- defence modes are mutually exclusive;
- prevents block protection during high-mobility evasion;
- simple mental model.

Risk: guard must expose a clean transient cancel API.

**Recommendation:** Option A.

#### Option B — reject dodge while blocking

Consequence: even stricter commitment.

Risk: forces an extra release-then-dodge input step and may feel unresponsive.

#### Option C — retain block during dodge

Consequence: easiest mechanically if guard is just a held flag.

Risk: likely too strong and visually incoherent.

### 7. Can dodge start during attack recovery?

#### Option A — allowed immediately after attack input

Consequence: maximum responsiveness.

Risk: every melee attack becomes freely dodge-cancellable; weapon cooldown loses commitment value.

#### Option B — blocked for the full `attackReadyAt` cooldown

Consequence: simplest rule.

Risk: slow weapons become disproportionately immobile; `attackReadyAt` was not designed as a movement lock.

#### Option C — short committed strike window, then dodge allowed during remaining cooldown (**recommended**)

Consequences:

- preserves attack commitment;
- avoids locking movement for an entire slow-weapon cooldown;
- can share the same strike timing if Option 1B is chosen.

Risk: needs one explicit commitment/strike timing concept instead of reusing `attackReadyAt` blindly.

**Recommendation:** Option C.

### 8. Is target lock retained during dodge?

#### Option A — retain lock unless normal lock invalidation fires (**recommended**)

Consequences:

- side dodge/orbit remains coherent;
- no need to reacquire after every dodge;
- displacement direction can still temporarily differ from facing/animation direction.

Risk: camera assist must not over-correct during a fast lateral burst.

**Recommendation:** Option A.

#### Option B — clear lock on every dodge

Consequence: simplest camera behavior.

Risk: makes target-lock combat annoying and contradicts the current target-lock plan's intended continuity.

#### Option C — retain only on side/back dodge, clear on forward dodge

Consequence: potentially avoids camera crowding when diving through a target.

Risk: arbitrary rule and more state-dependent UX without evidence.
