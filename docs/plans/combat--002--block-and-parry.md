# Combat block and parry

**Status:** done  
**Model:** sonnet — implementation and tests; opus — decisions in `## Decisions for Opus` and final combat-feel review  
**Domain:** combat  
**Sub domains:** input, melee, stamina, equipment, animation, ai, ui, mobile  
**Created:** 2026-10-02

---

## User decisions (2026-10-02)

- Shields should be clearly better for blocking than weapons.
- Parry must also work with weapons, not only shields.
- Block and parry share the same control (`RMB`); parry is the short timing window when block begins.

These decisions stand unless a concrete code constraint makes them impossible. Current recon found no such conflict.

## Goal

Add directional, stamina-based blocking and timing-based parrying to melee combat without bypassing the existing body-part, armour, bleeding, KO/down/death or reaction pipeline.

The first slice should be player defence only. It must fit the current simulation architecture, avoid an unnecessary save-version change, remain calibratable from one place, and leave a clean later path for shields and simple NPC blocking.

## Current-state recon (main, 2026-10-02)

### Existing melee pipeline

The current melee path is centralised in `src/game/sim/combat.ts`:

1. `meleeAttack(sim, attacker, coneDeg, preferId?)`
   - checks `attackReadyAt` and `isDown()`;
   - obtains `weaponOf(attacker)`;
   - requires at least 50% of the weapon's stamina cost;
   - immediately spends swing stamina;
   - sets `attackReadyAt`;
   - sets `action = { kind: 'swing', at: now }`;
   - finds the best target from the spatial actor grid;
   - rolls hit chance;
   - computes raw damage from weapon damage, melee skill, needs penalty, remaining stamina, Strength and item quality;
   - wears the attacker's equipped main-hand item;
   - calls `applyDamage()`.

2. `applyDamage(sim, target, raw, damageType, attacker?)`
   - rejects dead targets and protected KO player;
   - rolls a body part;
   - applies layered armour resistance for humans;
   - wears armour on the struck body-part layers;
   - applies body-part damage and bleeding;
   - emits the hit;
   - alerts nearby actors;
   - creates blood traces;
   - applies rabies bite handling;
   - invokes animal/NPC reactions;
   - resolves player KO, NPC down/death, or animal death/corpse.

Therefore the defence hook must not duplicate `applyDamage()` or move body-part/armour logic out of it.

### Input and Game flow

- `src/game/input/controls.ts` has held `primary` state but no secondary/guard state.
- LMB attacks and also acquires pointer lock on the first click.
- RMB currently only calls `canvas.requestPointerLock?.()`; context menu is suppressed.
- Mouse blur clears keyboard state and `primary`; a future held guard input must also be cleared there.
- `Game.frame()` copies input into `playerInput`, updates camera-facing and then steps the simulation.
- `Game.attack()` turns the player to camera yaw, enters combat mode if needed, and calls `meleeAttack()`.
- Player movement currently rotates the player toward movement while moving; when stationary in combat, `Game.frame()` makes facing follow camera yaw. Holding guard while moving therefore needs an explicit facing rule, otherwise directional defence may unexpectedly follow movement rather than camera.

### Stamina and vitals

- Stamina is already gameplay-time state in `Vitals.stamina`.
- `updateVitals()` regenerates stamina during all exertion except run/swim.
- Melee swing cost comes from `WeaponStats.stamina`.
- There is no guard drain, guard-break cooldown or stagger state today.
- Blocking stamina must coexist with the existing regeneration; the implementation must prevent "regen in the same frame offsets guard cost" from making tuning ambiguous.

### Items, equipment and durability

- `WeaponStats` currently contains only offensive fields: kind, reach, damage, damage type, cooldown, sharpness, stamina, ranged fields and `twoHanded`.
- Melee weapons exist as ordinary item definitions and all current dedicated melee weapons have durability.
- `wearTool()` is already used for attacking weapons and armour wear.
- `Equipment` has `main`, `off`, and armour slots.
- `off` is generic but currently used by held torches.
- Two-handed weapons already block off-hand torch usage in `Game.toggleTorch()`.

### Shield support: not implemented yet

Do not treat shields as an existing mechanic.

Current code has:

- no shield item definitions in `src/game/data/items.ts`;
- no shield-specific stats;
- no `ArmorSlot` for shields;
- no shield branch in equipment logic;
- no shield rendering path identified in the actor renderer;
- no shield-specific inventory/UI handling.

The plan may introduce the minimum shield representation required for block/parry, but that is new implementation work, not merely wiring existing support.

### Persistent versus transient state

`src/game/sim/types.ts` explicitly states that its mutable state is saved. `ActorBase`, `Human`, `Vitals`, equipment and player-extra fields are therefore persistent save data.

Adding `blocking`, `blockStartedAt`, `staggerUntil` or `guardBrokenUntil` directly to these saved structures would create a save-format concern under D-SAVE-7.

Recommendation: keep momentary player guard input/state in transient runtime controller state, and derive render hints from transient combat events/action hints where possible. If a generic stagger timestamp must live on actors for NPC compatibility, Opus must explicitly decide whether a save-version bump is justified.

### Animation state

`src/game/render/actors.ts` currently gives precedence roughly as:

1. dead/KO;
2. recent `swing`;
3. recent `shoot`;
4. player activity / bow draw;
5. movement;
6. longer-lived generic action hints;
7. NPC talking;
8. torch idle;
9. idle.

Verified clips actively referenced by the current human renderer include:

- `Sword_Attack`;
- `Spell_Simple_Shoot`;
- `Pistol_Aim_Neutral`;
- `Sprint_Loop`;
- `Crouch_Fwd_Loop`;
- `Swim_Fwd_Loop` / `Swim_Idle_Loop`;
- `Walk_Loop`;
- `Interact`;
- `Fixing_Kneeling`;
- `Idle_Talking_Loop`;
- `Idle_Torch_Loop`;
- `Idle_Loop`;
- `Death01`.

The shared `anims.glb` is the only character animation source, but the current code does not prove that dedicated Block, Parry or Stagger clips exist. Do not assume such clip names.

First implementation may reuse a stable aim/idle-like pose as a temporary guard visual and `Sword_Attack` only if visual review confirms it is not misleading. A dedicated guard pose and a readable hit/stagger reaction remain explicit visual gaps until the actual clip list is inspected at implementation time.

### NPC and animal attacks

- NPC melee combat calls the same `meleeAttack()` as the player.
- Animal attacks also call the same `meleeAttack()` after steering into range.
- This is useful: player defence can be resolved in one shared melee contact path without separate NPC/animal damage functions.
- NPC AI has no block/parry decision state.
- Existing attacker delay is `attackReadyAt`; extending it is the lowest-cost initial representation of parry stagger.
- NPC movement AI does not currently know about stagger, so a true movement-lock stagger would require additional AI/executor checks.

### Mobile

`src/ui/mobile/MobileControls.vue`:

- has press-and-hold semantics already for the Attack/Draw button using pointer down/up/cancel;
- writes directly to `input.primary`;
- has no Block control;
- has limited right-side button space already.

A Block button can use the same pointer-event pattern, but stuck-state cleanup must include `pointercancel`, panel transitions and global blur.

## Recommended combat-resolution architecture

Keep target selection and hit chance in `meleeAttack()`, then resolve active defence **after a successful hit roll but before raw damage enters `applyDamage()`**.

Recommended shape:

```text
attack intent
  -> cooldown/down/stamina eligibility
  -> spend attacker swing stamina
  -> target selection / range / attack cone
  -> hit chance
  -> compute raw attack damage
  -> resolve melee defence(target, attacker, attack context)
       -> no defence
       -> block: reduced raw damage + defender stamina/item wear
       -> parry: near-zero/zero raw damage + defender cost + attacker penalty
       -> guard break: reduced or no mitigation + defender recovery penalty
  -> if residual damage > 0: applyDamage()
       -> body part
       -> armour
       -> part damage
       -> bleeding / hit event / alert / traces
       -> reactions
       -> KO / down / death
```

This preserves the existing meaning of hit chance: the attack must first physically connect before a block/parry can resolve. It also prevents blocked attacks from rolling a body part or wearing unrelated body armour when no damaging contact reaches the body.

See `## Decisions for Opus` for the alternative.

## Directional defence

Use defender facing (`target.rot`) versus the direction from defender to attacker, not attacker facing.

Requirements:

- compute signed/absolute angular difference with existing `angleDiff()`;
- configurable front arc by defensive equipment;
- attacks outside the arc bypass block/parry;
- rear attacks are never auto-rotated into defence by combat resolution;
- mobile auto-facing on attack must not magically rotate the defender when blocking.

The implementation must define how player facing behaves while guard is held:

- preferred: guard-facing follows camera yaw, while movement becomes strafe/backpedal relative to that facing;
- minimum slice if strafing is too large for this plan: keep existing movement but explicitly update player `rot` from camera while blocking and document the movement visual limitation.

## Defensive equipment model

Avoid a generic capability framework or a large new equipment subsystem.

Recommended smallest schema:

```ts
interface DefenceStats {
  blockArcDeg: number
  blockReduction: number
  staminaEfficiency: number
  parryWindowS: number
  canParry: boolean
  guardStrength: number
}
```

Attach optional `defence?: DefenceStats` to `ItemDef` rather than adding defensive fields to `WeaponStats`. This allows shields and weapons to share one small defensive contract without pretending that every weapon is identical defensively.

For the first balanced slice:

- **shield:** best arc, best reduction, best stamina efficiency, strongest guard; can parry if desired by final decision;
- **one-handed melee weapon:** medium arc/reduction, good parry;
- **two-handed melee weapon:** narrower or more stamina-expensive block; parry remains available;
- **unarmed:** emergency narrow/weak block; no parry against clearly heavy/large attacks unless Opus explicitly chooses otherwise;
- **ranged weapon equipped:** no melee guard in v1 unless a specific weapon is explicitly given defence stats.

Do not infer defence quality only from attack damage or weight. A small explicit defensive table is more stable and tunable.

### Shield representation

Minimum viable path:

- add shield item(s) with optional `defence` stats;
- use existing `eq.off` for shield occupancy;
- prohibit shield + two-handed main weapon with the same "both hands busy" rule already used for torches;
- ensure torch and shield are mutually exclusive in `off`;
- add only the inventory/equipment handling needed to equip/unequip the shield.

Do not add a new saved shield slot unless there is a strong UI/design reason; `off` already represents the off hand.

Held-item rendering for the shield is a separate visual task inside this plan only if an existing held-item path can support it cheaply; otherwise mechanics may land first with a clearly recorded placeholder gap.

## Block resolution

A valid block requires:

- defender is the player in the first slice;
- alive, not KO/downed;
- combat mode active;
- guard input currently held;
- not inside guard-break/stagger lockout;
- attacker is inside the configured defence arc;
- valid defensive equipment or allowed unarmed fallback;
- enough stamina to attempt defence.

Recommended block effects:

- reduce raw damage before armour;
- defender stamina cost scales from incoming pre-armour damage/force and defensive `staminaEfficiency`;
- blocking item receives wear through existing durability helpers;
- body armour only receives wear from the residual damage path;
- full block with zero residual damage should not generate body bleeding or body-part damage.

Do not spend a continuous per-second stamina drain merely for holding block in the first slice. Charge on impact. This avoids idle stamina-tax exploits and keeps tuning tied to actual incoming force.

## Guard break

Guard break should be caused by insufficient defender stamina for the incoming block cost, not merely by reaching exactly zero after a successful cheap block.

Recommended first behaviour:

- compute required guard stamina;
- if available stamina >= cost: spend cost and apply normal block/parry result;
- otherwise spend remaining stamina, mark guard broken for a short calibrated duration, and allow most/all of the hit through;
- while guard-broken, RMB may remain physically held but does not reactivate defence until lockout ends;
- guard break must be visible via diagnostics and preferably a short action/feedback cue.

Avoid introducing a separate "guard meter" in v1.

## Parry resolution

Parry is not another input. It is the initial block-start window.

Runtime needs:

- held guard boolean;
- guard transition false -> true;
- gameplay time of guard start;
- optional guard-broken/stagger timestamps.

A parry candidate requires all normal directional block conditions plus:

`now - blockStartedAt <= parryWindowS`.

Repeated RMB events while already held must **not** refresh the parry window. Only a real released -> pressed transition starts a new window.

Recommended first semantics:

- parry consumes some defender stamina;
- parry does not roll body armour when it cancels all body damage;
- attacker receives an `attackReadyAt` extension;
- use movement-lock stagger only if explicitly chosen by Opus.

## Animal attacks

Because animals use `meleeAttack()`, mechanics can technically share the same defence resolver. Design should not treat all animal attacks equally.

Recommended classification for the first slice:

- allow **block** against contact attacks from animals when the attacker is in the front arc;
- allow **weapon/shield parry** against smaller, readable lunges/bites only where it is believable;
- do not allow a knife/unarmed "perfect parry" to nullify a bear/boar/moose heavy charge/headbutt by default;
- shields may still strongly mitigate heavy animal contact without granting full parry.

The current species model exposes species, attack damage/range/type and model/animation identity; if a heavy/non-parryable distinction is needed, use a tiny explicit species attack flag or derived whitelist rather than damage-threshold magic.

## Projectiles

Projectile/shield blocking remains out of scope.

`projectileSystem()` currently calls `applyDamage()` directly after collision. Do not alter that pipeline in this plan. A future shield-projectile plan can add its own collision/defence rule with coverage for projectile direction and shield arc.

## Transient state placement

Preferred first-slice design:

- extend runtime input with `secondary` / `guard` held state;
- extend transient `playerInput` with guard intent;
- keep guard-start and player guard-break timestamps in a transient runtime combat-controller structure owned by the running `Sim`/player controller rather than saved `GameState`;
- use `action` only as a render hint if needed, not as the source of combat truth.

Do not put "RMB is currently held" into save data.

For later NPC blocking/stagger, reevaluate whether a small transient per-actor combat runtime map is cleaner than saved actor fields.

## Input design

### Desktop

- RMB down while no blocking UI is open: set guard held and, only on false -> true, record guard start.
- RMB up: clear guard held.
- blur: clear guard held.
- opening a panel / losing gameplay focus: clear or suppress guard so it cannot stick.
- preserve context-menu suppression.
- pointer-lock behaviour:
  - requesting pointer lock on RMB may stay as a fallback when unlocked;
  - once RMB has gameplay meaning, do not let the pointer-lock request swallow the guard press;
  - first RMB press should both request lock when needed and enter guard if gameplay input is otherwise valid.

Block is only active in combat mode. Outside combat, RMB may continue serving pointer-lock acquisition without entering combat automatically.

### Mobile

Add one press-and-hold Block control with:

- `pointerdown` => guard true / start parry transition;
- `pointerup`, `pointercancel` => guard false;
- cleanup when controls unmount/panel opens if necessary;
- no click-toggle semantics.

Do not make parry a separate mobile button.

## Animation and visual feedback

### Required precedence

Add defensive states deliberately to `humanAnim()` precedence.

Recommended order:

1. death/KO;
2. stagger / guard-break reaction;
3. attack/shoot one-shots already in progress as appropriate;
4. active parry reaction if a usable one-shot exists;
5. held block pose;
6. activities/bow aim;
7. movement;
8. generic actions/idle.

Exact ordering between attack one-shot and stagger must be validated so a successful parry can visibly interrupt the attacker if that is the chosen stagger design.

### Reuse candidates

Potential temporary reuse, subject to visual review:

- `Pistol_Aim_Neutral` as a static upper-body-ish defensive placeholder;
- ordinary idle/walk while mechanics are tested;
- existing one-shot infrastructure in `Actors.play(..., once=true)`.

Do not silently label `Sword_Attack` as a parry/block if it visually reads as an attack.

### Known gaps

- no verified dedicated guard clip;
- no verified parry clip;
- no verified stagger/hit-react clip in current renderer mapping;
- shield mesh/held-item presentation is not established by this recon.

Implementation must inspect the actual `anims.glb` clip names before choosing fallbacks and record any remaining art gap.

## NPC implications

First slice is player defence only.

Later simple NPC block may reuse the same `resolveMeleeDefence()` contract, but should be added only after player tuning is stable.

A later NPC version should:

- make the block decision at existing AI decision cadence, not through a new global per-frame scan;
- keep guard for a short decision interval rather than frame-perfect reacting to every hit;
- reserve parry for skilled fighters/guards if added at all;
- respect stamina and equipment.

### Attacker stagger and existing AI

Extending `attackReadyAt` already works for both player and NPC/animal attack cadence because all melee attacks check it.

However, `attackReadyAt` does **not** stop NPC/animal movement. Therefore:

- cooldown-only stagger = low cost and already compatible;
- true rooted/slow movement stagger = additional work in `npc/ai.ts`, `fauna/ai.ts` and/or shared movement.

This is an Opus decision below.

## Calibration and diagnostics

Add all block/parry tuning constants to `src/game/config/calibration.ts`, preferably under one `DEFENCE` object.

At minimum calibrate:

- base parry window;
- shield / 1H / 2H / unarmed defence arcs;
- block damage-reduction values;
- stamina cost scale per incoming raw damage;
- stamina-efficiency multipliers;
- guard-break lockout duration;
- parry attacker delay;
- block/parry durability wear;
- optional heavy-animal parry policy constants only if not represented in data.

No scattered timing literals in input, combat and renderer files.

Add diagnostics through existing `perf` counters/gauges:

- `combat.blocks`;
- `combat.parries`;
- `combat.guardBreaks`;
- `combat.blockRearBypass` or equivalent directional failure count;
- `combat.blockedDamage` aggregate/record if supported;
- last defence angle;
- last defender stamina cost;
- last parry timing delta.

These are calibration diagnostics, not permanent noisy UI.

For developer inspection, expose enough state through the existing debug/test surface to deterministically set or read guard state/timing if e2e otherwise becomes timing-flaky.

## Concrete files/functions expected to change

### Required

- `src/game/config/calibration.ts`
  - `DEFENCE` constants.
- `src/game/data/items.ts`
  - minimal defensive stats schema;
  - weapon defence assignments;
  - shield item definition(s) if shield support lands in the same slice.
- `src/game/input/controls.ts`
  - held secondary/guard input;
  - RMB down/up;
  - blur cleanup.
- `src/game/sim/player.ts`
  - guard intent/state integration if owned by player controller;
  - facing/movement interaction while guarding.
- `src/game/sim/combat.ts`
  - shared defence resolver;
  - directional test;
  - block/parry/guard-break resolution inserted between successful hit roll and `applyDamage()`.
- `src/game/Game.ts`
  - forward guard input into sim/player runtime state;
  - panel/combat-mode/facing handling.
- `src/game/render/actors.ts`
  - defensive animation selection / precedence.
- `src/ui/mobile/MobileControls.vue`
  - held Block control.
- `src/game/sim/combat.test.ts`
  - deterministic defence tests.

### Likely if shields are in this plan

- inventory/equipment UI code that equips `eq.off`;
- character/equipment panel display;
- held-item renderer / asset mapping if a visible shield is required for acceptance;
- relevant mobile/e2e selectors.

### Later NPC slice only

- `src/game/sim/npc/ai.ts`;
- possibly `src/game/sim/fauna/ai.ts` only if true movement stagger is chosen;
- NPC AI tests.

## Dependencies

- Existing combat pipeline in `sim/combat.ts`.
- Existing stamina in `sim/vitals.ts`.
- Existing item durability and `wearTool()` in inventory code.
- Existing `eq.main` / `eq.off` representation.
- Existing gameplay-time clock `state.time.play`.
- Existing actor animation/action hint system.
- Existing mobile pointer-event pattern.

No dependency on projectile defence.

If combat target lock (`combat--001`) changes facing rules before this plan is implemented, re-check guard-facing and target-lock interaction before coding.

## Recommended implementation order

1. **Opus decisions:** close the decision table below before Sonnet starts mechanics that depend on it.
2. **Defence data + calibration:** add the minimal `DefenceStats` contract and constants; establish weapon categories and shield representation.
3. **Pure combat resolver:** implement/test directional eligibility, stamina cost, block result, parry timing, guard break with deterministic unit tests before input wiring.
4. **Runtime player guard state:** add held/transition/timestamps without changing save format.
5. **Desktop input + Game wiring:** RMB hold/release/blur, pointer-lock coexistence, combat-mode gating, facing behaviour.
6. **Damage-pipeline integration:** call defence resolver after successful hit roll and before `applyDamage()`; verify armour/bleeding semantics.
7. **Durability + diagnostics:** blocking-item wear, counters/gauges/debug state.
8. **Animation:** map guard/parry/stagger to verified existing clips or explicit fallbacks.
9. **Mobile:** add hold Block button and lifecycle cleanup.
10. **E2E/mobile coverage:** deterministic scenarios, avoid sub-frame timing dependence where possible.
11. **Optional NPC block slice:** only after player tuning/review.

## Test requirements

### Unit: core mechanics

Add deterministic tests for:

- front attack inside block arc is mitigated;
- exact arc boundary and just-outside boundary;
- rear attack bypasses defence;
- block held after parry window gives normal block, not parry;
- parry at exact lower/upper timing boundary according to chosen inclusive/exclusive rule;
- repeated RMB/down events while held do not refresh the parry window;
- release then press starts a new parry window;
- sufficient stamina spends expected guard cost;
- zero/insufficient stamina triggers guard break and does not grant normal mitigation;
- guard remains disabled throughout lockout and reactivates after it;
- one-handed versus two-handed defensive stats differ as configured;
- unarmed behaviour matches the chosen policy;
- shield is materially stronger than weapons;
- broken/zero-durability defensive item does not provide normal defence;
- blocking item wear is applied once per defended impact.

### Unit: damage pipeline

Verify:

- partial block residual damage still reaches `applyDamage()`;
- armour mitigates residual damage after block;
- full/cancelled parry does not add body-part damage;
- full/cancelled parry does not create bleeding;
- full/cancelled parry does not wear body armour;
- partial block can still cause bleed for cut/pierce residual damage;
- KO/down/death remains driven by residual post-armour body damage;
- NPC/animal hurt reactions occur only when actual body damage is applied, unless Opus explicitly chooses a separate "blocked contact alert" event.

### Unit: animals

At minimum:

- block a valid front animal attack;
- rear animal attack bypasses;
- one permitted parryable animal attack;
- one explicitly non-parryable heavy animal attack if that policy is chosen;
- shield still mitigates a heavy contact attack according to policy.

### Input tests

Verify:

- RMB down sets guard even if pointer lock is requested;
- RMB up clears it;
- blur clears it;
- repeated mousedown while held does not restart parry;
- UI-open path cannot leave guard stuck;
- leaving combat mode disables active guard semantics.

### E2E

Add stable acceptance coverage for:

- player visibly/diagnostically blocks one front melee attack;
- rear attack is not blocked;
- one successful parry delays attacker;
- repeated attacks exhaust guard and cause guard break;
- armour still reduces residual damage after a partial block.

Prefer debug/test hooks to waiting on a 150–250 ms real-time race.

### Mobile

Verify:

- pointerdown holds Block;
- pointerup releases;
- pointercancel releases;
- panel transition/unmount does not leave guard active;
- Attack and Block can be pressed/released independently without stealing pointer state.

## Explicit risks

- **Save-format regression:** placing transient guard/stagger state in saved actor types can force a D-SAVE-7 version bump for no gameplay value.
- **Facing mismatch:** current moving player rotation follows movement, which can make "front" defence disagree with camera direction.
- **Pointer-lock conflict:** RMB currently has a pointer-lock-only meaning; careless handling can swallow the first guard press.
- **Animation readability:** no dedicated block/parry/stagger clip is verified by current renderer mappings.
- **Shield scope creep:** shields are not currently implemented; adding models, UI and off-hand presentation can exceed the mechanics slice.
- **Double mitigation semantics:** defence before armour must be tested so block + armour is strong but not accidentally near-invulnerable.
- **Durability double wear:** attack weapon, block item and body armour wear must occur at the intended stages exactly once.
- **AI incompatibility:** a movement-lock stagger is not automatically respected by current NPC/fauna movement.
- **Animal believability:** treating every animal bite/charge as equally parryable will produce implausible outcomes.
- **Timing-flaky e2e:** real browser timing is unsuitable as the only proof of a short parry window.
- **Stamina tuning:** current stamina regenerates quickly (12/s outside run/swim), so block costs and guard-break lockout need measurement, not guesswork.

## Acceptance

- Blocking is directional, stamina-based and equipment-aware.
- Shields are clearly better blockers than weapons.
- Weapons can parry.
- Block and parry use the same RMB/mobile Block hold; parry is only the initial timing window.
- Rear attacks cannot be blocked by facing away.
- Insufficient stamina causes an explicit guard break.
- Existing hit chance, armour, body-part damage, bleeding, KO/down/death and combat reactions retain coherent ordering.
- Projectile blocking remains unchanged/out of scope.
- First slice works for player defence without requiring sophisticated NPC defence.
- No save-version bump is introduced merely to remember transient guard input.
- Timing, arcs, stamina, guard break and stagger values are centralised in calibration.
- Unit/e2e/mobile tests cover direction, timing boundaries, zero stamina, armour interaction and repeated-input edge cases.

## Decisions for Opus

### 1. Block before hit roll or after hit roll?

#### Option A — after hit roll, before damage (**recommended**)

Flow: target selection -> hit roll -> defence -> `applyDamage()`.

Consequences:

- current hit chance remains "does the attack connect?";
- misses cost attacker stamina/cooldown but never trigger block;
- block/parry only resolves actual incoming contact;
- cancelled parry can cleanly skip body-part roll, armour wear and bleeding;
- smallest change to the current pipeline.

Risks:

- visually, a defender may appear to hold guard while some attacks simply "miss" without contacting the guard;
- hit chance and active defence stack as two avoidance layers.

Evidence: today `meleeAttack()` owns hit chance and `applyDamage()` owns all body damage consequences. This option inserts one resolver at the natural boundary.

**Recommendation:** choose Option A.

#### Option B — defence before hit roll

Flow: target selection -> defence eligibility -> hit roll/damage.

Consequences:

- guard can conceptually intercept the attack before accuracy is resolved;
- would require defining whether parry can "succeed" on an attack that would otherwise miss;
- risks wasting defender stamina on misses;
- complicates diagnostics and combat readability.

Risk: muddles the existing meaning of hit chance and creates more branching.

#### Option C — replace hit roll with a combined opposed attack/defence roll

Consequences:

- potentially deeper model;
- largest rebalance;
- changes existing tested melee behaviour substantially.

Risk: unnecessary redesign for this plan.

### 2. Animal attacks: what can be blocked/parried?

#### Option A — all animal melee can block; only explicit light/readable attacks can parry (**recommended**)

Examples: shield/weapon can block frontal bites/swipes; parry whitelist for wolf/dog/fox-like lunges; heavy boar/bear/moose contact not fully parryable by ordinary weapons.

Consequences:

- shared resolver still works;
- needs a tiny species/attack classification;
- preserves believable distinction between a bite and a heavy charge.

Risk: one more small data point to maintain.

**Recommendation:** choose Option A.

#### Option B — all animal melee can block and parry

Consequence: simplest code/data.

Risk: implausible knife parries against large-animal attacks; likely balance exploit.

#### Option C — animals cannot be parried at all

Consequence: simplest believable rule.

Risk: removes a potentially satisfying skill interaction against wolves/dogs and makes weapon parry less universal.

### 3. Successful parry damage result

#### Option A — parry cancels body damage completely when valid (**recommended for first slice**)

Consequences:

- clearest timing reward;
- easy to test;
- skips body armour/body-part/bleeding pipeline for that contact;
- balance comes from narrow window, direction, stamina and non-parryable heavy attacks.

Risk: overly strong if parry window or repeatability is generous.

**Recommendation:** choose Option A initially, with a tight calibrated window and guard cost.

#### Option B — parry leaves a small residual fraction, e.g. 10–25%

Consequence: softer balance and armour can still matter.

Risk: harder to communicate; a "successful parry" that still causes bleeding may feel wrong.

#### Option C — damage reduction depends on defender/attacker equipment

Consequence: richer simulation.

Risk: overengineering and more balance parameters before the base feel is known.

### 4. Stagger representation after parry / guard break

#### Option A — extend `attackReadyAt` only (**recommended first slice**)

Consequences:

- already respected by player, NPC and animal melee attacks;
- no new movement state;
- no save concern if no new actor field is added.

Risk: attacker can keep moving immediately, so visual stagger is mostly animation/attack delay.

**Recommendation:** choose Option A for mechanics v1.

#### Option B — transient `staggerUntil` also blocks/limits movement

Consequences:

- more readable and impactful;
- needs player, NPC and fauna movement checks plus a transient-state ownership design.

Risk: wider code surface and more save/runtime-state complexity.

#### Option C — encode stagger only as `action` animation

Consequence: visually cheap.

Risk: cosmetic only; AI still attacks when cooldown allows and movement is unaffected.

### 5. Defensive stats schema

#### Option A — optional `ItemDef.defence` object (**recommended**)

Consequences:

- shield and weapon use one small shared contract;
- no pollution of offensive `WeaponStats`;
- explicit and calibratable.

Risk: some numeric duplication across weapon entries.

**Recommendation:** choose Option A.

#### Option B — extend `WeaponStats` with block/parry fields, create special shield pseudo-weapon stats

Consequence: fewer top-level item interfaces.

Risk: shields are not weapons; awkward modelling and future projectile shield rules become less clear.

#### Option C — derive defence entirely from existing weight/damage/twoHanded fields

Consequence: no schema addition.

Risk: hidden coupling, poor tuning control and weak support for shields being "clearly better" independent of offence.

## Result (2026-10-03, session 14, Sonnet)

Implemented with the plan's recommended options (D-COMBAT-2). `DEFENCE` in `calibration.ts`; `ItemDef.defence` + `wooden_shield` (recipe, `Hold` in the inventory, off hand); `sim/guard.ts` (transient guard state per Sim, `setGuard`, `defenceOf`, `resolveDefence`: arc via defender facing, parry only in the first `parryWindowS` of a fresh press, plain block, guard break on missing stamina with a 2 s lockout, heavy-animal rule, wear once per defended hit); `meleeAttack` calls it after the hit roll and skips `applyDamage` on a full parry; RMB hold / mobile Block (`touch-block`, pointer down/up/cancel/leave, cleared on blur/unmount); guard facing follows the camera while moving; guard pose = `Pistol_Aim_Neutral` placeholder; debug `__sv.guard()`. Counters `combat.blocks|parries|guardBreaks|blockRearBypass|blockedDamage`. Tests: `guard.test.ts` (9), e2e acceptance 16, mobile M8c. **Open (visual/art gaps, ❓ Opus-user):** no dedicated block/parry/stagger clip or shield mesh (placeholder pose, shield invisible in hand), NPC blocking (later slice), balance numbers need a feel pass (stamina regen 12/s vs block costs), projectile blocking out of scope.
