# Transport: riding and pack animals

**Status:** draft  
**Model:** opus — movement/ownership/AI contract and keep/drop decisions; sonnet — implementation, tests, UI and save integration  
**Domain:** transport  
**Sub domains:** fauna, movement, inventory, interaction, render, save, AI  
**Roadmap:** ../roadmap/later-vision-backlog.md stage L4 (WORLD-09); animal-drawn carts remain TRANS-02  
**Created:** 2026-10-03  
**Finished:** —

---

## Goal

Add the first useful animal-transport slice without coupling it to wagons:

1. the player can mount and ride a horse;
2. a donkey or horse can carry cargo in a pack saddle;
3. owned transport animals persist in saves and can follow/stay;
4. reuse existing fauna, movement, inventory and follow systems instead of creating a second transport simulation.

Animal-drawn carts are explicitly out of scope and remain a later TRANS-02 plan.

## Current codebase baseline

Verified on current main before writing this plan:

- src/game/data/species.ts already defines horse and donkey as ordinary domestic species.
- There is no mount/rider/saddle state or riding-control path.
- Current transport is TRANS-01: player-pushed wheelbarrow/handcart with separate cargo inventory.
- Animals already have quest-follow behavior and use the normal actor movement/LOD pipeline.
- Player movement already has grounded, slope, collision and water rules from combat--004.

## Core constraints

- While mounted, the horse is the physical mover. Do not simulate independent player and horse locomotion.
- Mounting requires a nearby, calm, owned animal. No teleport mounting.
- Pack cargo is real saved inventory. No virtual capacity counters.
- Pack inventory is accessible only near the animal.
- Riding v1 is travel only: no mounted melee, archery, block/parry, dodge or jump.
- Riding uses existing collision/slope/water rules; it must not bypass world physics.
- No wagon dependency and no cart refactor in this plan.

## Step 0 — Opus contract

Record the final decisions in docs/design/DECISIONS.md before implementation.

### Ownership

Recommended first slice:

- only adult horse/donkey can become player-owned transport animals;
- ownership is explicit saved state, not inferred from proximity;
- only owned animals can receive transport equipment;
- breeding, animal markets and stable economy stay outside this plan.

Suggested Animal additions:

- owner?: 'player'
- transport?: AnimalTransportState

### Riding eligibility

Recommended:

- horse is rideable;
- donkey is pack-only in this first slice;
- animal must be alive, calm, stationary enough and outside deep water;
- player must be within about 2 m;
- dismount finds a safe side position and never places the player inside blocked geometry.

### Combat

Recommended:

- mounted state disables melee, bow, block/parry, dodge and jump;
- significant damage or horse panic/flee can force dismount;
- mounted combat is a future feature.

## Step 1 — saved transport state

**Model: sonnet**

Add explicit saved state, following current save conventions.

Suggested state:

- AnimalTransportState.saddle?: 'riding'
- AnimalTransportState.pack?: 'light' | 'heavy'
- AnimalTransportState.inv?: Inventory
- AnimalTransportState.followPlayer?: boolean
- player/px mountedAnimalId?: number

Rules:

- pack-equipped animal always has a cargo inventory;
- save validation accepts all new fields;
- an invalid mountedAnimalId on load is cleared safely;
- follow the current SAVE_VERSION rule from PROGRESS.md at implementation time.

Tests:

- save/load preserves ownership, equipment, cargo and mounted id;
- invalid mounted references cannot crash load;
- cargo quantity is conserved across save/load.

## Step 2 — saddles and cargo

**Model: sonnet**

Add item data:

- riding_saddle
- pack_saddle_light
- pack_saddle_heavy

Recommended first capacities:

- light pack: 35 kg;
- heavy pack: 65 kg.

Create a focused sim module such as sim/animalTransport.ts responsible for:

- install/remove riding saddle;
- install/remove pack saddle;
- transfer player ↔ animal pack;
- capacity checks;
- mount/dismount eligibility;
- follow/stay switching.

Do not put these rules in Vue or render code.

Acceptance:

- over-capacity transfer is rejected;
- pack weight does not count toward player carry weight;
- pack saddle cannot be removed while cargo remains;
- remote pack access is impossible.

## Step 3 — follow / stay

**Model: sonnet**

Reuse existing animal-follow steering where possible, but do not reuse questFollow as persistent ownership state.

Behavior:

- owned pack animal exposes Follow me / Stay;
- desired trailing distance about 3–5 m;
- immediate danger/flee behavior has higher priority;
- ordinary grazing/water can resume while staying;
- impossible routes must end in a bounded wait/failure state, not endless replanning.

Tests:

- follows over normal terrain;
- Stay cancels following;
- danger interrupts following;
- blocked terrain does not create an infinite movement loop.

## Step 4 — mounted locomotion

**Model: opus contract → sonnet implementation**

Use normal player input to control the horse.

Recommended controls:

- WASD/stick controls heading and movement;
- walk by default;
- sprint/run requests faster gait;
- camera remains third-person;
- player position/orientation follows the horse while mounted.

Recommended initial travel speeds:

- walk: roughly 2.2–2.6 m/s;
- run/canter: roughly 6–7 m/s.

Do not expose the raw species maximum immediately as normal travel speed.

Terrain:

- use existing collision and slope checks;
- shallow water allowed with a speed penalty;
- mounted swimming is not supported in v1;
- deep water stops the horse before invalid terrain.

Stamina and needs:

- running drains horse stamina;
- player locomotion stamina does not drain while mounted;
- horse hunger/thirst continue normally;
- exhausted horse falls back to walk.

## Step 5 — interactions

**Model: sonnet**

Eligible owned transport animals expose:

- Mount
- Dismount
- Follow me
- Stay
- Open pack
- Install/remove transport equipment

Rules:

- Mount is disabled without riding saddle;
- Open pack is disabled without pack saddle;
- dead/downed/fleeing/aggressive animals cannot be mounted;
- mounting cancels autopilot;
- mounting and pushing TRANS-01 cart are mutually exclusive;
- all UI actions go through Game facade methods.

## Step 6 — rendering

**Model: sonnet; visual keep/drop by opus**

Preferred sequence:

1. attach saddle / pack geometry;
2. tune mounted camera height and offset;
3. attach player model approximately to horse back;
4. only then decide whether a dedicated rider pose/animation is needed.

A temporary seated/static rider pose is acceptable for the first technical slice if documented.

Performance requirements:

- no per-frame allocations from transport equipment;
- shared/pooled geometry and materials;
- no new lights/postprocess;
- never render a second duplicate player body.

## Step 7 — UI/mobile

Minimal UI:

- contextual interaction actions;
- mounted HUD: animal + stamina;
- nearby animal pack shown as a separate inventory container;
- no new map layer.

Mobile:

- reuse movement stick;
- contextual Mount/Dismount action;
- avoid permanent extra buttons unless device review proves they are needed.

## Step 8 — simulation integration

Invariants:

- transport animals remain normal animals for needs, weather, damage and death;
- fauna/settlement systems must not silently despawn or reassign owned animals;
- normal wandering is suppressed while mounted;
- danger/flee behavior can override follow;
- cargo/equipment must never disappear on death.

Recommended death behavior:

- cargo drops beside the corpse;
- saddle/pack equipment becomes recoverable;
- nothing is silently deleted.

## Step 9 — verification

Unit/sim tests:

1. mount eligibility;
2. mount → move → dismount;
3. mounted movement respects blocked slope/water;
4. horse stamina drains on run and forces walk when exhausted;
5. player locomotion stamina is not drained while mounted;
6. pack capacity and item conservation;
7. follow/stay/unreachable handling;
8. save/load;
9. animal death preserves cargo;
10. pushed cart and riding are mutually exclusive.

E2E:

- use a prepared owned horse;
- install saddle;
- mount;
- travel a fixed distance faster than walking;
- dismount;
- transfer an item to/from pack;
- zero console errors.

Soak:

- owned transport animal over several game days;
- no NaN positions;
- no follow loops;
- bounded needs;
- zero item-conservation drift.

Perf:

- compare actor update cost with one ridden horse and one following pack animal;
- no full-world scans;
- transport logic must remain on existing actor/spatial paths.

## Explicit non-goals

- mounted combat;
- cavalry AI;
- breeding;
- horse market/stable economy;
- horse armour;
- animal-drawn carts (TRANS-02);
- caravan-trader rewrite (TRADE-03);
- road-generation changes.

## Dependencies

Hard dependencies already present:

- combat--004 grounded/collision model;
- horse/donkey species;
- inventory and transfer primitives;
- actor movement and spatial update pipeline.

Soft dependencies:

- better horse/donkey assets can land later through the asset pipeline;
- L3 inter-settlement economy makes pack transport more valuable but is not technically required.

## Suggested implementation order

1. Opus decision record.
2. Saved state + validation.
3. Pack equipment + cargo.
4. Follow/stay.
5. Mount/dismount state.
6. Mounted locomotion.
7. Rendering.
8. UI/mobile.
9. E2E + soak + perf review.

Use targeted tests during each step; run the full verification gate at milestone boundaries and before closing the plan.

## Exit criteria

The plan is done when:

- one horse can be owned, saddled, mounted, ridden and safely dismounted;
- one horse/donkey can carry persistent pack inventory;
- transport animals can follow/stay without movement loops;
- item transfers conserve quantities;
- save/load is safe;
- no full-world scan or duplicate locomotion simulation was introduced;
- tests/e2e/soak are green;
- remaining visual limitations are documented.
