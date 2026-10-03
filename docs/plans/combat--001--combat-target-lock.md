# Combat target lock and soft targeting

**Status:** done  
**Model:** sonnet — implementation and tests; opus — decisions in `Decisions for Opus` and final keep/drop review of camera/movement feel  
**Domain:** combat  
**Sub domains:** input, player-movement, camera, targeting, ui, mobile, render, diagnostics  
**Created:** 2026-10-02  
**Reviewed against main:** 2026-10-02, `4d305f3e5099432018f7269a764c884737c99ab3`

---

## User decisions (2026-10-02)

- `Tab` in combat mode controls combat target lock; outside combat it keeps the existing interaction-target cycle.
- Keep free camera control as the default; target lock only assists facing/camera and must not hard-snap.

These remain valid after code recon.

## Goal

Add a combat-specific target-selection layer that makes melee combat more intentional without turning SeedVales into a hard lock-on action game. Keep free camera movement as the default, retain the existing mobile combat aid, add bounded soft assist for unlocked melee, and provide an explicit combat lock for encounters where the player wants deliberate target selection.

Combat targeting must remain semantically and state-wise separate from interaction targeting (UI-06). It may reuse small generic mechanisms, but must not turn `Game.pinnedTarget` / `findTargets()` into a shared "everything target" abstraction.

## Current-state recon

### Input and Game orchestration

- `src/game/input/controls.ts`
  - `Tab` maps to the existing `cycleTarget` action.
  - Browser focus is prevented only while the game UI is closed, and target cycling is ignored while a panel is open.
  - `moveAxes()` produces camera-space `[right, forward]`; `wantsRun()` combines Shift and mobile run state.
  - No new physical key binding is required for target lock. Contextual routing belongs above the raw key map.

- `src/game/Game.ts`
  - `Game.pinnedTarget` is already transient, non-save interaction-selection state. This is the closest existing ownership precedent for `combatTargetId`.
  - `Game.frame()` applies mouse/touch look to `CameraRig`, then converts `moveAxes()` to world-space `playerInput.mx/mz` using `rig.forward()`.
  - While in combat and stationary, `Game.frame()` currently forces `sim.player.rot = rig.yaw`.
  - `Game.attack()` currently:
    1. enters combat automatically if necessary;
    2. **overwrites player facing with `renderer.rig.yaw`;**
    3. calls `meleeAttack(sim, player, 80)` on desktop or `meleeAttack(..., 220)` on touch;
    4. on touch, rotates to the actor returned by `meleeAttack()`.
  - Therefore locked/soft melee facing cannot be implemented only inside target ranking: the camera-yaw assignment in `Game.attack()` must be deliberately reordered/replaced.
  - `refreshTarget()` and the interaction marker are refreshed at 5 Hz. Combat lock following/camera assistance must not depend on that cadence.
  - `toggleCombat()` currently only toggles `player.combat`; it is the natural place to clear transient combat-lock state when combat mode is left.
  - The existing `cycleTarget()` is interaction-specific despite its generic name. Contextual `Tab`/mobile behavior must avoid accidentally changing UI-06 semantics.

### Player movement and ranged combat

- `src/game/sim/player.ts`
  - `PlayerInput` is transient process state and already carries world-space movement plus camera yaw/pitch/drawing intent.
  - `playerSystem()` always executes `p.rot = Math.atan2(mx, mz)` while moving.
  - This is the major hidden coupling for lock-on movement: changing only the movement basis in `Game.frame()` would make A/D orbit correctly in space but would rotate the character sideways along the strafe direction instead of keeping them faced toward the target.
  - A lock implementation therefore needs an explicit transient facing intent separate from movement direction, e.g. an optional `PlayerInput.facingYaw` (name to be chosen during implementation). The target **id** itself should not be passed into or owned by `playerSystem()`.
  - Movement should still end in the existing `moveWithCollision()` path.
  - Sprint is currently just another `PlayerInput.run` mode; no lock interaction exists.
  - Road autopilot can replace `mx/mz` when there is no manual movement. Entering/using combat lock therefore needs an explicit policy for autopilot rather than silently allowing orbit/facing logic to coexist with automated travel.
  - Bow draw/release is handled in `playerSystem()`; `fireRanged()` receives camera yaw/pitch, not player rotation. A combat lock must not accidentally convert the projectile path into homing/target-id aiming.

### Combat targeting primitives

- `src/game/sim/combat.ts`
  - `meleeAttack(sim, actor, coneDeg, preferId?)` already queries `sim.actors.query()`; it does not scan all actors.
  - `preferId` is only a ranking bonus. It does **not** bypass melee range or facing-cone checks, so a locked target still has to be brought inside the attack cone before the preferred id matters.
  - Existing priority is: preferred actor > actor actively attacking this actor > wild animal > domestic animal > NPC, with distance and angle also contributing.
  - Existing player melee excludes dead actors but does **not** exclude all downed/protected actors from target selection. Combat-lock candidates must use `isDown()` / `isProtected()` deliberately rather than copying this behavior blindly.
  - Existing counters `combat.swings`, `combat.noTarget`, `combat.hits`, `combat.misses` are reusable diagnostics.
  - `fireRanged()` launches a real projectile from supplied yaw/pitch with skill spread. There is no target-id path and none is required for this feature.

- `src/game/sim/npc/queries.ts::threatNear()`
  - The code already contains useful threat semantics for animals: active aggro, rabid state, hunting/close predator behavior, and aggressive-species behavior.
  - "Wild" is not equivalent to "hostile": many wild actors flee or remain neutral until context makes them a threat.
  - NPCs do not currently expose an equivalent generic "hostile to player" flag. Neutral NPC inclusion is therefore a gameplay-policy decision, not something code can infer as a symmetric hostility state.

- `src/game/sim/types.ts`
  - The file explicitly defines mutable per-playthrough state: everything in `GameState` is saved.
  - `Human.combat` is persistent today, but an individual combat lock has no gameplay-world meaning across load/restart.
  - Putting `combatTargetId` in `PlayerExtra` or another `GameState` field would require a save-format change for state that should normally be transient.

- `src/game/sim/sim.ts`
  - `Sim.actor(id)` is an O(1) lookup through the existing `byId` map.
  - Once a target is locked, per-frame validation/facing/camera work can resolve that single id with `sim.actor(id)`; there is no reason to rerun a spatial candidate query every frame.

### Interaction targeting coupling

- `src/game/sim/interact.ts`
  - `findTargets()` is designed for nearby **interactive** objects, not combat actors. It includes NPCs and domestic animals plus buildings/nodes/items/sites/etc.
  - Actor lookup inside it is spatial, but several non-actor categories still use existing state-array scans at the UI refresh cadence. Combat targeting must not reuse this function.
  - `nextTarget()` is a small pure cycling helper and the only part potentially worth conceptually reusing; combat candidates should still have their own type/ranking helper.
  - Interaction ranking receives `player.rot`, not camera yaw directly.

- `src/ui/hud/TargetPrompt.vue`
  - The interaction prompt shows a `Tab` hint whenever several interaction targets exist.
  - Once `Tab` changes meaning in combat mode, this hint becomes incorrect unless it is made combat-aware.
  - The interaction target itself can continue to exist internally so E/Action remains usable; visual priority between interaction and combat targets must be explicit.

### Camera and marker plumbing

- `src/game/render/cameraRig.ts`
  - `CameraRig` owns orbit `yaw/pitch/distance`; `rotate()` applies manual look immediately.
  - There is no target-follow/assist API.
  - A small yaw-assist API is sufficient; no camera architecture rewrite is needed. Keeping interpolation/rate limiting in `CameraRig` avoids putting camera math directly into `Game`.
  - Pitch should remain manual.

- `src/game/render/Renderer.ts` and `src/game/render/targetMarker.ts`
  - Renderer owns one interaction `TargetMarker` plus `markerAt`.
  - The existing marker is a pulsing yellow ground ring and can be reused as a rendering mechanism, not as shared target state.
  - A combat marker needs a second render channel (for example `combatMarker` + `combatMarkerAt`) or a parameterized marker instance with a distinct style.
  - The current renderer update cost is trivial; adding one small marker should not materially affect draw-call budgets.

### Mobile and current coverage

- `src/ui/mobile/MobileControls.vue`
  - The existing permanent `Target` button (`touch-next-target`) calls `game.cycleTarget()`.
  - It should be reused contextually in combat rather than adding another permanent button.
  - Mobile camera drag writes to the same `input.lookDX/lookDY` path as desktop mouse look.
  - Melee mobile aid is already a decided behavior (D-UI-3): 220° cone plus rotation toward the selected melee target.
  - Ranged mobile uses hold/release of the same Attack/Draw button.

- Existing tests:
  - `src/game/sim/combat.test.ts`: basic melee/KO/predator combat, but no explicit `preferId` selection regression.
  - `src/game/sim/targetCycle.test.ts`: UI-06 interaction list/cycling.
  - `scripts/e2e/acceptance.mjs`: step 6 melee fight; step 11 verifies interaction `Tab`.
  - `scripts/e2e/mobile.mjs`: M5 verifies wide mobile auto-target; M8 verifies the mobile Target button cycles interaction targets.

## Recommended architecture

### Ownership of combat lock state

Recommended split:

- `Game`: own transient `combatTargetId: number | null` and any transient grace/manual-camera timers needed by lock lifecycle.
- New focused helper, preferably `src/game/sim/combatTarget.ts`: candidate query, eligibility/classification, ranking and deterministic cycle order. It may receive camera/player yaw as numeric inputs, but must not import render/UI.
- `PlayerInput`: add only the minimum transient **facing intent** needed to separate locked facing from movement direction. Do not put the target id here.
- `GameState` / `PlayerExtra`: no combat lock field and no save-version bump.

Why: this mirrors existing `Game.pinnedTarget` ownership, respects the saved-state contract in `types.ts`, keeps sim/render layering intact, and avoids coupling the player simulation controller to UI selection state.

A save loaded while `player.combat === true` should start with `combatTargetId === null`. That is intentional: combat mode persists today; a UI/control lock does not.

### Candidate acquisition and validation

Candidate acquisition happens only when needed:

- when the player presses contextual `Tab` / mobile Target;
- optionally once when an explicit auto-acquire policy is chosen by Opus;
- soft melee assist immediately before an unlocked swing.

Use `sim.actors.query(player.x, player.z, configuredRadius)`. Never scan `state.npcs` / `state.animals`.

Once locked:

- resolve the actor with `sim.actor(combatTargetId)` each frame;
- validate dead/down/protected/disappeared and distance directly;
- do not rebuild/rerank the whole candidate list each frame;
- only rerank when the player explicitly cycles or a deliberate reacquire rule fires.

Put target-lock tuning constants (range, acquisition cone, grace, camera rate, soft-assist cap) in `src/game/config/calibration.ts`, not as scattered literals.

### Ranking model

Keep ranking deterministic with stable id as the final tie-break. Treat eligibility separately from score.

Recommended evidence inputs, in descending importance:

1. **Immediate threat to the player**
   - animal `aggroId === player.id` with active `aggroUntil`;
   - rabid / clearly attacking actor;
   - reuse the semantics behind `threatNear()` where practical rather than inventing a second incompatible threat definition.
2. **Combat relevance**
   - dangerous/aggressive/hunting wild actor;
   - current AI target/attack relation where it unambiguously points at the player.
3. **Camera angle**
   - explicit cycling should prefer actors reasonably in front of the camera;
   - never let a target directly behind the player beat an equivalent visible threat merely because it is slightly closer.
4. **Distance**
   - within each relevance class, nearer is generally preferred.
5. **Neutral-cost penalty**
   - neutral NPCs and domestic animals must not outrank genuine threats.
6. **Stable id**
   - deterministic final tie-break.

Do not treat every wild animal as hostile. Do not treat `ai.targetId` generically as aggro: fauna also uses it for hunting prey.

### Soft melee assist

Unlocked desktop melee:

- query only actors near actual melee reach, using the same spatial-index rule as `meleeAttack()`;
- choose the best eligible/relevant actor in a narrow camera/facing window;
- rotate player facing by at most a calibrated small cap (initial tuning range: approximately 10–20°) before calling `meleeAttack()`;
- no camera steering;
- keep the ordinary desktop melee cone rather than widening it as a substitute for correct facing.

Locked melee:

- resolve the locked target by id;
- if valid and within an attack-appropriate facing envelope, make player facing converge toward it;
- pass `combatTargetId` to `meleeAttack(..., preferId)`;
- remember that `preferId` still requires range/cone validity.

Mobile:

- preserve D-UI-3's existing wide 220° assistance unless playtesting gives evidence to change it;
- when an explicit lock exists, it should override the ambiguous wide auto-selection by supplying `preferId` and lock-facing behavior;
- do not regress M5.

### Locked movement and facing

While a valid lock is active:

- build movement axes from target-relative forward/right vectors:
  - W/S = approach/retreat;
  - A/D = strafe/orbit;
  - diagonals normalized exactly as today;
- continue feeding world-space motion through `playerInput` and `moveWithCollision()`;
- provide a separate transient facing yaw so `playerSystem()` does not replace target-facing with strafe direction;
- keep analog joystick magnitude;
- never teleport, constrain to a circle, or bypass terrain/collision.

This requires a small change in `playerSystem()`: when movement occurs, movement determines translation, while optional explicit facing determines `p.rot`; without explicit facing, preserve the current `Math.atan2(mx, mz)` behavior exactly.

### Camera assistance

Add a small explicit API to `CameraRig`, for example an assist method that:

- accepts desired yaw, dt and calibrated max rate/strength;
- uses shortest-angle interpolation;
- never changes pitch;
- never hard-snaps.

`Game.frame()` should apply manual look first, then assist only according to the chosen manual-input policy. The user must always be able to intentionally look away.

No spatial query belongs in `CameraRig`; Game supplies the desired yaw from the already resolved locked actor.

### UI and interaction coexistence

- Keep `Game.target` / `pinnedTarget` intact for interaction.
- In combat mode, `Tab` and the existing mobile Target button route to combat target cycling.
- Outside combat, both retain existing UI-06 behavior.
- `TargetPrompt.vue` must not advertise interaction `Tab` while `Tab` means combat targeting.
- Keep E/Action interaction available unless a later design decision explicitly disables it in combat.
- Add a visually distinct combat marker. Prefer a second parameterized `TargetMarker` instance over sharing one `markerAt` channel.
- If both interaction and combat targets exist, combat marker has visual priority; the interaction prompt/marker policy is an Opus decision below.

## Lock lifecycle and edge cases

Handle these explicitly rather than leaving them to tuning:

- entering combat: no implicit persisted lock;
- leaving combat: clear lock immediately;
- actor removed/dead: clear immediately;
- NPC/actor downed or protected: do not acquire; drop an existing lock unless Opus chooses a special wounded-target policy;
- target outside max distance: drop after the chosen grace policy;
- target temporarily behind the camera: do not hard-drop on one frame; apply the chosen look-away/grace policy;
- player KO: clear immediately;
- panel/menu/activity: no target cycling while panels are open (current input rule); camera/lock assistance should not keep steering through paused/menu states;
- sprint: follow the explicit Opus policy below;
- cart pushing: current combat attack and ranged draw restrictions stay authoritative; lock must not bypass them;
- swimming: preserve existing movement rules; target-relative movement must still use `playerSystem()` speed/mode logic;
- autopilot: explicit combat action/lock should not silently fight road steering; decide whether acquisition cancels autopilot or is refused;
- target crosses through/behind player during close melee: shortest-angle facing must remain stable and avoid 180° oscillation;
- multiple candidates with equal score: stable actor id tie-break;
- neutral NPC/domestic animal: never outrank an active threat; inclusion itself is an Opus decision;
- interaction target and combat target can reference the same NPC/animal without sharing state;
- save/load while in persistent `combat` mode: lock restarts empty;
- weapon switch melee ↔ ranged: lock may remain selected, but its effect on ranged aim is a separate policy;
- mobile Target outside combat remains interaction cycling exactly as M8 verifies.

## Dependencies

No prerequisite feature is required.

Direct implementation touch points are expected to be:

- `src/game/Game.ts`
- `src/game/input/controls.ts` only if naming/comments/tests need adjustment; the physical `Tab` mapping can stay
- new `src/game/sim/combatTarget.ts` (recommended)
- `src/game/sim/player.ts`
- `src/game/sim/combat.ts`
- `src/game/config/calibration.ts`
- `src/game/render/cameraRig.ts`
- `src/game/render/Renderer.ts`
- `src/game/render/targetMarker.ts`
- `src/ui/hud/TargetPrompt.vue`
- `src/ui/mobile/MobileControls.vue`
- related vitest/e2e files

No `SAVE_VERSION` or `GEN_VERSION` bump should be needed under the recommended transient-state architecture.

## Recommended implementation order

1. **Opus resolves the decisions below.** Record any durable gameplay/architecture choice in `docs/design/DECISIONS.md` before Sonnet implements it.
2. **Targeting core.** Add calibrated lock constants and a focused combat-target helper: candidate eligibility, threat classification, scoring, stable cycle order. Unit-test it before wiring UI.
3. **Transient ownership/lifecycle.** Add `Game.combatTargetId` (+ minimal timers), O(1) current-target resolution, acquire/switch/drop paths and event-based diagnostics. Do not add saved state.
4. **Contextual controls.** Route current `cycleTarget` action to combat cycling only while in combat; preserve interaction cycling otherwise. Reuse the existing mobile Target button.
5. **Facing separation.** Extend transient `PlayerInput` with optional facing intent; modify `playerSystem()` so target-relative strafe does not rotate the actor into the movement vector.
6. **Locked movement.** Add target-relative W/S/A/D (and joystick) basis in `Game.frame()`; retain collision, speed, stamina, water and cart rules in `playerSystem()`.
7. **Melee integration.** Reorder `Game.attack()` facing logic, pass `preferId`, then add bounded unlocked soft assist. Preserve mobile 220° behavior unless explicitly changed.
8. **Camera assist.** Add the small `CameraRig` yaw-assist API and manual-input dominance/grace behavior chosen by Opus.
9. **Render/HUD/mobile polish.** Add distinct combat marker, fix `TargetPrompt` Tab hint, expose contextual mobile Target state/label if useful.
10. **Ranged policy.** Apply only the Opus-approved lock behavior; do not modify projectile targeting unless explicitly decided.
11. **Verification and feel tuning.** Run unit tests first, then desktop/mobile e2e, then manual/visual tuning. Do not tune camera/movement constants before diagnostics can show target angle/distance/drop reason.
12. **Opus keep/drop review.** Review camera strength, orbit behavior, sprint policy, target ranking and mobile feel. Keep the architecture even if individual assists are reduced/dropped.

## Tests and diagnostics

### Unit tests

Add focused coverage for:

- candidate query excludes player, dead, down/protected actors and out-of-range actors;
- active attacker/aggro ranks above merely dangerous/wild and neutral actors;
- neutral NPC/domestic penalties do not beat a genuine threat;
- camera-angle + distance ordering and stable-id tie break;
- deterministic cycle/wrap behavior;
- lock lifecycle: disappear/death/down/out-of-range/look-away grace;
- no saved-state field / no save-version change under the transient design;
- target-relative movement basis and analog magnitude;
- facing intent keeps character facing target while A/D translates tangentially;
- no-facing path preserves current movement-facing behavior;
- soft-assist correction never exceeds its configured angle cap;
- `meleeAttack(..., preferId)` selects the preferred valid actor over another valid actor;
- `preferId` does not bypass range/cone;
- ranged projectile still follows supplied camera yaw/pitch rather than a lock id.

### Desktop e2e

Extend `scripts/e2e/acceptance.mjs` with scenarios that use real inputs for the feature:

- outside combat: existing step 11 `Tab` interaction behavior still passes;
- in combat with two actors: `Tab` acquires and cycles deterministic combat targets;
- locked A/D changes position around the target while player facing remains near target bearing;
- locked melee attacks the selected actor when two are in reach;
- leaving combat clears the marker/lock;
- deliberate camera movement remains effective while lock is active;
- target death/removal clears lock without an exception or stale marker.

### Mobile e2e

Extend `scripts/e2e/mobile.mjs`:

- existing M5 wide auto-target remains green;
- existing M8 interaction Target button remains green outside combat;
- in combat the same `touch-next-target` control acquires/switches combat targets;
- joystick strafe + lock retains target-facing;
- touch camera drag still changes camera yaw while locked;
- melee/ranged Attack/Draw behavior remains intact.

### Diagnostics before feel tuning

Reuse existing combat counters and add event-based counters, not per-frame scans:

- `combat.lock.acquire`
- `combat.lock.switch`
- `combat.lock.drop` plus reason-specific counters (dead/down/range/look-away/combat-off/KO)
- optionally `combat.softAssist.used`

For debugging/tuning, make the current transient lock readable through the existing game/debug surface (direct `game.combatTargetId` may already be sufficient in dev/e2e). Test traces should capture target id/type, distance, camera-angle error, player-facing error and drop reason at the moment of failure.

Do not add a production per-frame candidate scan merely to populate diagnostics.

## Performance requirements

- Candidate discovery/ranking: `sim.actors.query()` within a calibrated radius.
- Soft assist: query only on a melee attack attempt, not every frame.
- Current lock follow/validation: `sim.actor(id)` O(1) plus direct distance/angle math.
- Camera/movement follow: use that already resolved actor; no candidate reranking.
- Never iterate `state.npcs` or `state.animals` per frame for this feature.
- Keep marker work constant-size.
- Add a regression assertion/test or code-review checklist item that no full-world actor scan is introduced.

## Estimated cost and risk

**Revised estimate after code recon:**

- targeting core + contextual control + locked melee: about 1 day;
- correct strafe/facing separation + camera assist + mobile/render integration: about 1–2 additional days;
- e2e, diagnostics and feel tuning/review: about 1 additional day.

Expected polished total: **~3–4 days** rather than treating this as a 1-day low-risk feature.

Risk is **medium**, not low/medium, because the feature crosses `Game.frame()`, `playerSystem()`, camera control, two target semantics, desktop/mobile input, and melee/ranged behavior. The spatial-query/performance risk is low if the architecture above is followed.

Highest-risk areas:

- accidentally breaking normal movement by separating movement and facing;
- camera assist fighting manual mouse/touch input;
- confusing interaction vs combat target UI/hints;
- changing established mobile 220° auto-aim feel;
- interpreting neutral/dangerous actors as "hostile" incorrectly;
- making lock feel sticky or unstable at close range;
- unintended bow assistance.

## Decisions for Opus

### 1. Which actors are explicit-lock candidates?

**Question:** should combat `Tab` include neutral NPCs/domestic animals, or only actors that are currently/reasonably combat-relevant?

**Option A — threats only**
- Candidates are active attackers/rabid/currently dangerous combat actors.
- Safest against accidental aggression.
- But the player cannot pre-lock a neutral animal/NPC before choosing to attack.

**Option B — threats first, all live attackable actors as lower-priority fallback**
- Active threats rank first; dangerous wild actors next; neutral NPCs/domestic animals last.
- Preserves deliberate aggression/hunting use cases while avoiding neutral actors winning ordinary cycles.
- Needs a clear candidate distance/cone so settlement crowds do not make cycling noisy.

**Option C — separate hostile-only default plus an alternate hostile/any-target command**
- Most expressive, but adds input/UI complexity that the current user decision did not request.

**Recommendation:** **Option B.** Current `meleeAttack()` already permits deliberate attacks on NPCs/domestic animals, while the code only has strong hostility semantics for animals. Keeping neutrals as low-priority fallback preserves existing agency without pretending they are hostile. Never let a neutral actor outrank an active threat.

### 2. How should sprint interact with a lock?

**Question:** what happens when the player starts running while locked?

**Option A — sprint immediately breaks lock**
- Very clear and simple.
- Makes sprint an escape/reposition command.
- Can be frustrating if Shift is used for short repositioning.

**Option B — lock remains selected, but sprint uses normal camera-relative movement and disables orbit/facing assist until running stops**
- Preserves target memory without unnatural high-speed circles.
- Slightly more state/behavior to explain and test.

**Option C — allow full locked orbit while sprinting**
- Mechanically consistent but likely to look/feel unnatural and makes circle-strafing too strong.

**Recommendation:** **Option B.** It keeps player intent reversible, avoids fast orbit exploitation, and does not throw away the explicit selection. If playtesting feels ambiguous, fall back to A.

### 3. What does manual camera look do while locked?

**Question:** how aggressively should weak camera assistance resume after mouse/touch input?

**Option A — assist every frame after manual delta**
- Minimal state.
- Most likely to feel like the camera is fighting the player.

**Option B — manual look suppresses assist for a short calibrated grace window; after that weak assist resumes**
- Makes manual control clearly dominant.
- Needs one transient timer.

**Option C — any deliberate look-away suspends camera assist until the player recenters/relocks**
- Maximum camera freedom.
- Lock can remain useful for movement/facing while camera assistance effectively disappears for long periods.

**Recommendation:** **Option B**, with a conservative assist rate and short grace. It best matches the recorded decision: free camera first, assistance second. Keep C available if Opus feel review still finds B intrusive.

### 4. When does look-away drop the explicit lock?

**Question:** should camera direction determine lock validity?

**Option A — never drop solely for looking away; only death/down/disappearance/range/combat-off drops it**
- Strong explicit-selection semantics.
- The target can remain locked fully off-screen.

**Option B — keep lock through a broad off-screen/grace envelope, then drop after sustained deliberate look-away**
- Prevents invisible sticky locks while tolerating camera checks around the player.
- Adds a grace timer and tuning.

**Option C — drop as soon as target leaves a forward camera cone**
- Simple but contradicts the desire for a free camera and would be unstable in close combat.

**Recommendation:** **Option B**, with a broad envelope and generous grace. Never use C.

### 5. What does lock do for bows/ranged weapons?

**Question:** should an explicit combat lock affect ranged aiming?

**Option A — lock remains selected/marked, but projectile yaw/pitch stays entirely camera-driven; only target-facing/movement may use the lock**
- Preserves VISION's aiming + skill emphasis and D-SIM-6 real projectile behavior.
- Lock is mainly situational awareness for ranged combat.

**Option B — weak camera yaw assist toward the locked actor while drawing, but no projectile correction**
- Helps mobile/controller-like use.
- Risks reducing deliberate aiming and fighting vertical/lead aim.

**Option C — correct projectile direction toward the target**
- Strongest assistance.
- Effectively creates auto-aim/homing semantics not present in the vision/code.

**Recommendation:** **Option A for v1 of this feature.** Explicitly forbid C. Reconsider B only after melee lock is proven and mobile playtesting shows a real problem.

### 6. What should happen to interaction marker/prompt while combat lock is active?

**Question:** interaction targeting continues to refresh even in combat; how should two simultaneous target concepts be presented?

**Option A — show only the combat marker while locked; keep interaction target internally and keep E/Action usable; hide the interaction `Tab` hint**
- Clear visual hierarchy with minimal behavior loss.
- Interaction prompt can still appear if useful, but cannot imply Tab controls it.

**Option B — show both markers**
- Complete information.
- Likely visual clutter/confusion, especially if both point at nearby actors.

**Option C — disable interaction targeting entirely while in combat mode**
- Simplest UI model.
- Unnecessarily removes E/Action behavior and changes more than requested.

**Recommendation:** **Option A.** Combat marker gets visual priority. Preserve interaction state/action rather than coupling the two systems.

### 7. What should combat lock do to road autopilot?

**Question:** autopilot can currently replace movement input when there is no manual movement.

**Option A — acquiring a combat target cancels autopilot**
- Clear transition from travel automation to combat control.
- Consistent with danger already cancelling autopilot elsewhere.

**Option B — refuse target lock while autopilot is active**
- Avoids hidden cancellation, but makes combat response cumbersome.

**Option C — keep both and let manual movement temporarily override autopilot**
- Most complex and can produce surprising steering when the stick/keys are released.

**Recommendation:** **Option A.** Existing player logic already cancels autopilot on danger/manual steering; explicit combat targeting is an equally strong intent signal.

## Acceptance

- Combat target state is transient and separate from interaction target state; no save-format bump for lock selection.
- `Tab` / mobile Target is contextual exactly as the user decided.
- Candidate acquisition uses the actor spatial index; locked follow uses O(1) actor lookup; no full-world per-frame scan.
- Active threats outrank neutral actors according to the Opus-approved ranking policy.
- Dead/down/protected/invalid actors cannot remain lock targets.
- Locked W/S approaches/retreats and A/D strafes/orbits while the player continues to face the target; ordinary unlocked movement remains unchanged.
- Locked melee passes `preferId` and attacks the selected valid actor without widening desktop targeting into a hard auto-aim.
- Unlocked melee gets only bounded soft facing assistance.
- Free manual camera input remains dominant; no hard snap and no forced pitch.
- Ranged projectiles retain the Opus-approved camera/lock semantics and never become homing by accident.
- Combat marker is visually distinct and interaction UI never lies about what `Tab` will do.
- Existing UI-06 interaction cycle, mobile M5 auto-target, mobile M8 Target cycling, cart restrictions, collision and bow draw all remain green.
- Diagnostics exist before final game-feel tuning.
- Final camera/movement feel receives an Opus keep/drop review.

## Result (2026-10-03, session 14, Sonnet)

Implemented with the plan's recommended options (D-COMBAT-1). `sim/combatTarget.ts` (eligibility, threat classes, ranking with a behind-the-camera penalty, deterministic cycling, lock validity, `lockedMove`, `turnToward`), `COMBAT_LOCK` in `calibration.ts`, `PlayerInput.facing` (movement keeps its direction, facing stays on the target), `CameraRig.assistYaw` (weak, paused `cameraGraceS` after manual look), `Game.combatTargetId` (+ `cycleCombatTarget`, `updateLock`, `dropLock`, `softAssist`), second `TargetMarker` (red ring) in `Renderer`, `TargetPrompt` hides the interaction `Tab` hint in combat. Sprint keeps the lock but uses camera-relative movement; acquiring clears autopilot; locked attacks face the target and pass `preferId`; unlocked desktop melee turns ≤ 15°; ranged unchanged (camera-driven projectile). Counters `combat.lock.acquire|switch|drop.<reason>`, `combat.softAssist.used`. Tests: `combatTarget.test.ts` (10); e2e acceptance step 15 (lock, cycle, A/D orbit with facing error 0.02 rad, leave combat clears), mobile M8b (in combat the Target button locks; M8 now sheathes first). **Not done / ❓ Opus-user feel review:** camera assist strength, orbit feel, mobile feel, hide of the interaction marker while locked (done) vs showing both.
