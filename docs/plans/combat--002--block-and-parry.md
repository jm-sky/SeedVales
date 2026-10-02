# Combat block and parry

**Status:** planned  
**Model:** sonnet — implementation and tests; opus — combat-balance and animation-feel review  
**Domain:** combat  
**Sub domains:** input, melee, stamina, equipment, animation, ai, ui, mobile  
**Created:** 2026-10-02

---

## Goal

Add directional blocking and timing-based parrying so melee defence becomes an active player decision. Reuse the existing stamina, weapon, armour and action-animation systems. Keep the mechanic readable and grounded rather than combo-heavy.

## Current state (recon, 2026-10-02)

- Melee damage is centralised in `sim/combat.ts`.
- `meleeAttack()` owns swing timing, stamina cost, hit chance and target selection.
- `applyDamage()` owns body-part selection, armour mitigation, KO/down/death and reactions.
- Actors already expose `rot`, `vitals.stamina`, `attackReadyAt` and transient `action`.
- `Game.attack()` turns the player toward camera yaw before a melee swing.
- Right mouse button currently only requests pointer lock; it has no gameplay action.
- Human animations currently include swing/shoot/idle/movement and generic fallbacks; there is no block/parry/stagger state.
- Shield support must be checked against current item definitions before relying on specific shield stats.

## Design

### Block

Desktop default: hold `RMB` while in combat mode.

A block succeeds only when:

- defender is conscious/alive and able to act;
- incoming melee attack is inside a forward defence arc;
- defender has sufficient stamina;
- the equipped weapon/shield allows blocking.

Effects:

- reduce incoming damage according to blocking item and attack type;
- consume defender stamina based on incoming force/damage;
- optionally apply reduced durability wear to the blocking item;
- if stamina is exhausted, guard breaks and the remaining attack passes through with limited/no mitigation.

Start simple: blocking modifies melee hits only. Projectile blocking with shields is a separate extension unless implementation proves trivial.

### Parry

Parry uses the same `RMB` input, not a second key.

- record when block starts;
- if a valid melee hit reaches the defender inside a short initial window (initial calibration ~150–250 ms), resolve as parry;
- parry strongly reduces or cancels damage;
- attacker pays additional stamina and receives a short stagger / delayed `attackReadyAt`;
- parry window depends on defence equipment and may later scale slightly with melee skill.

Avoid generous invulnerability. Direction and timing must both be correct.

### Equipment differences

Minimum distinctions:

- shield: wide block arc, strong damage reduction, forgiving stamina efficiency;
- one-handed weapon: medium arc/effectiveness;
- two-handed/heavy weapon: can block but is slower/less forgiving;
- unarmed: weak emergency block, no strong parry against heavy weapons.

Exact numbers belong in calibration/data, not hard-coded in control logic.

### AI

Do not require sophisticated NPC parry in the first slice.

- first implementation: player defence only;
- optional second step: guards/fighters sometimes block based on melee skill and state;
- NPC defence must not run every frame as a global scan.

### Input/mobile

- `RMB` = hold block / timed parry start when combat mode is active;
- outside combat it may retain pointer-lock behaviour;
- mobile requires a contextual Block button while in combat, preferably press-and-hold.

## Data/state

Prefer transient gameplay state over save-format changes:

- blocking flag;
- block start gameplay time;
- optional guard-broken/stagger-until time.

If added to `ActorBase`/`Human` and serialized automatically, decide explicitly whether it should survive save/load. Short combat-control state normally should not; avoid a `SAVE_VERSION` bump unless necessary.

## Steps

1. Inspect item/weapon definitions and define block capability/stats in the smallest appropriate data layer.
2. Extend input state with held secondary/block intent; preserve pointer-lock behaviour.
3. Add player defensive state and update it from `Game.frame()` / player system.
4. Add directional block resolution before normal damage application in the melee damage path.
5. Add stamina cost, guard break and blocking-item wear.
6. Add parry timing and attacker stagger/cooldown penalty.
7. Add render action hints (`block`, `parry`, `stagger`) and map them to available clips/fallbacks.
8. Add mobile hold control and minimal HUD feedback for guard break/parry if needed.
9. Only after player behaviour is stable, consider simple NPC blocking as a separate substep.

## Verification

- Unit tests: front attack blocked; rear attack not blocked; insufficient stamina causes guard break; parry only inside timing window; parry penalises attacker.
- Damage tests: armour still applies correctly after block resolution; body-part/bleed logic is not bypassed accidentally for partial blocks.
- Input tests: RMB state clears on mouseup/blur and does not remain stuck after UI opens.
- E2E: block a melee attacker, parry one attack, exhaust guard.
- Mobile: hold/release block reliably.
- Animation review: block pose does not get overridden incorrectly by idle/movement and stagger does not loop forever.

## Estimated cost

- MVP mechanics: ~1–2 days.
- Polished version with equipment differences, animation and mobile/e2e coverage: ~3–5 days.
- Risk: medium; core logic is centralised, but feel depends strongly on timing and animation quality.

## Acceptance

- Blocking is directional, stamina-based and equipment-aware.
- Parry is a timing bonus on the same control, not a separate arcade button.
- Rear attacks cannot be blocked by facing away.
- Guard break has a clear consequence.
- Existing armour, KO/down/death and melee skill calculations continue to work.
