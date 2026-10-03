# Transport: animal-drawn carts

**Status:** draft  
**Model:** opus — hitching/movement/turning contract, wear model and keep/drop review; sonnet — implementation, tests, UI/render/save integration  
**Domain:** transport  
**Sub domains:** fauna, movement, inventory, economy, interaction, render, save, AI  
**Roadmap:** ../roadmap/later-vision-backlog.md stage L4, **TRANS-02**  
**Depends on:** [transport--001--riding-and-pack-animals.md](transport--001--riding-and-pack-animals.md); [economy--002--production-chain-and-calibration.md](economy--002--production-chain-and-calibration.md) step 3 for cart wear/repair  
**Created:** 2026-10-03  
**Finished:** —

---

## Goal

Add horse/donkey-drawn transport after riding/pack animals are stable:

1. hitch an owned horse or donkey to a wagon/cart;
2. drive it along roads and ordinary traversable terrain;
3. carry substantially more cargo than a handcart or pack saddle;
4. unhitch and leave the animal/cart safely parked;
5. preserve normal animal needs, damage, ownership and water safety;
6. reuse TRANS-01 cargo/inventory concepts instead of building a separate logistics model.

This plan is transport first. It does not implement caravan professions or autonomous trader wagons.

## Current codebase baseline

Verified on current main:

- TRANS-01 already has wheelbarrow/handcart entities with:
  - separate saved inventory;
  - capacity;
  - parking/pushing;
  - loading/unloading;
  - slope and deep-water blocking;
  - render pooling in src/game/render/carts.ts.
- src/game/sim/player.ts already applies cart speed and cartBlocked while pushing.
- src/game/sim/interact.ts already treats parked carts as interaction targets.
- D-TRANS-2 explicitly defers cart wear; that deferred decision is already scheduled for `economy--002` step 3. **Feature id `TRANS-02` and decision id `D-TRANS-2` are different things.**
- transport--001 owns:
  - horse/donkey ownership;
  - purchase;
  - follow/stay;
  - needs;
  - anti-drowning behavior;
  - riding;
  - transport-animal survivability.

TRANS-02 must build on these primitives rather than duplicate them.

## Scope

First useful slice:

- one animal + one wagon;
- horse or donkey;
- player-driven only;
- wagon cargo;
- hitch / unhitch;
- park / resume;
- road-friendly movement;
- durability/wear;
- animal needs while hitched;
- save/load;
- desktop + mobile controls.

## Explicit non-goals

- two-horse teams;
- autonomous NPC wagons;
- caravan trader tiers (TRADE-03);
- passenger transport;
- mounted combat from a wagon;
- wagon combat;
- wagon-mounted weapons;
- boats;
- full stable economy;
- road-generation changes.

## Step 0 — Opus contract

Before implementation, lock the following decisions in docs/design/DECISIONS.md.

### 0.1 Vehicle model

Recommended:

- add a new wagon-capable cart definition, e.g. `wagon`;
- do **not** convert wheelbarrow/handcart into animal-drawn vehicles;
- keep using the existing `Cart` saved entity where practical;
- unlike a pushed TRANS-01 cart, an animal-drawn wagon stays in `state.carts` while being driven; do **not** move it into `px.cart`;
- extend `Cart` additively with the hitch relation only; keep active player driving state in `PlayerExtra`.

Recommended state:

```ts
interface Cart {
  // existing fields
  hitchedAnimalId?: number
}

interface PlayerExtra {
  // existing fields
  drivingCartId?: number
}
```

`hitchedAnimalId` is the single saved source of truth for the hitch. Do not mirror `hitchedCartId` onto the animal unless implementation proves a measured need; derive it by lookup/index instead to avoid two-way consistency bugs.

`Cart` is currently item-id driven through `ItemDef.cart`, which only has `{ capacity, speed }`. Extend that definition rather than scattering wagon constants.

Recommended additive shape:

```ts
cart?: {
  capacity: number
  speed: number
  mode?: 'push' | 'drawn' // missing = legacy push
  emptyWeightKg?: number
  widthM?: number
  lengthM?: number
  maxRise?: number
  maxDrop?: number
  maxWaterM?: number
  stowable?: boolean
}
```

Keep wheelbarrow/handcart behavior unchanged by defaults. Wagon-specific values live in item/calibration data, not movement code.

### 0.2 Eligible animals

- adult owned horse or donkey only;
- not dead/downed/fleeing;
- not currently mounted;
- not already hitched elsewhere;
- no pack saddle while hitched if visual/weight conflicts arise — decide one rule and keep it simple.

Recommended first rule:

- riding saddle may remain installed;
- pack saddle must be empty and removed before hitching.

### 0.3 Driving position

Recommended:

- player drives from the wagon/seat;
- the **animal is the locomotion leader**;
- wagon position is derived from animal heading and draw-bar offset;
- player position is derived from the wagon seat while driving.

Do not move horse, cart and player with three independent movement controllers.

### 0.4 Needs priority

A hitched animal still has needs.

Recommended behavior:

- normal travel while needs are healthy;
- at critical thirst/hunger, animal refuses sustained driving and the player gets a message;
- it does not autonomously drag the wagon off-route to graze/drink while the player is actively driving;
- player must stop/unhitch or lead the animal to a suitable place;
- while parked and hitched, it may drink/graze only if the required position is safely reachable **without moving the wagon into invalid terrain**.

This differs intentionally from Follow mode in transport--001: a wagon cannot wander freely behind the animal.

## Step 1 — wagon data and saved state

**Model: sonnet**

Add a dedicated wagon item definition using the existing cart machinery. The wagon should be a world vehicle, not something normally picked up into the backpack like an empty wheelbarrow/handcart.

Recommended first capacity:

- handcart remains as-is;
- wagon: roughly **250–400 kg** depending on final economy calibration.

Do not hard-code final numbers outside calibration/item data.

Saved state must preserve:

- cart inventory;
- durability;
- position/rotation;
- hitched animal id;
- `px.drivingCartId` while the player is actively driving;
- ownership relationship where needed.

Load repair rules:

- missing/dead hitched animal → wagon becomes safely unhitched;
- if multiple carts reference the same animal, deterministically keep one hitch and clear the rest;
- `px.drivingCartId` must reference a real hitched wagon; otherwise clear it and place the player safely;
- a wagon must never be restored into both `px.cart` and `state.carts`.

Tests:

- save/load hitched and parked states;
- invalid references repair without crash;
- no duplicated animal-cart relationships.

## Step 2 — hitch / unhitch

**Model: sonnet**

Interactions on nearby owned horse/donkey and wagon:

- Hitch to wagon
- Unhitch
- Drive
- Stop driving

Rules:

- animal must be within a small rear/front hitch radius;
- wagon must be stationary;
- wagon cannot already be hitched;
- animal cannot be mounted;
- animal must be alive and calm;
- hitch action aligns the pair but must not teleport them through walls;
- if alignment space is blocked, reject with a clear reason.

Unhitch:

- allowed while stationary;
- animal becomes Stay at its current position by default;
- wagon remains parked;
- never leave the animal overlapping the wagon.

## Step 3 — wagon locomotion

**Model: opus contract → sonnet implementation**

Use the same player input surface as walking/riding.

Behavior:

- forward movement pulls wagon;
- turning rotates animal first and wagon follows;
- reversing is allowed but slow;
- running/sprint input asks for faster pull only if the animal/stamina/load permit it.

Recommended first-pass speeds:

- horse wagon road travel: ~3.5–5 m/s;
- donkey wagon: slower;
- off-road penalty significant;
- reverse: very slow.

Exact values belong in calibration.

### Load effect

Speed and stamina cost should depend on:

- wagon empty weight;
- cargo kg;
- animal species;
- terrain/road state;
- slope.

Keep v1 model simple and monotonic.

Example design:

```
effectiveLoad = wagonBaseKg + cargoKg
pullRatio = effectiveLoad / animalPullCapacity
speedMul = clamp(1 - k * pullRatio, min, 1)
staminaDrain = base * (1 + pullRatio * loadFactor)
```

Do not introduce complex traction physics in v1.

## Step 4 — geometry and collision

**Model: opus review required**

TRANS-01 uses player-centric cart blocking; animal-drawn wagon needs larger geometry.

Required:

- wagon width/length represented explicitly;
- animal + wagon cannot clip through buildings/palisades;
- turns check swept or conservative wagon space;
- too-tight turns slow/stop rather than snapping the wagon through geometry;
- bridges must be passable if wide enough;
- caves are **not supported** for wagons in first slice;
- entering a cave while driving/hitched is blocked with a message.

Recommended implementation:

- keep the animal as lead collision mover;
- after proposed animal step, validate wagon footprint;
- reject/shorten the movement step if wagon footprint collides.

Avoid per-frame full-world scans; use existing nearby-building/spatial queries.

## Step 5 — terrain and water safety

Hard rule:

- wagon + animal must never be driven into drowning-depth water.

Reuse or generalise TRANS-01 `cartBlocked`.

Checks should account for:

- animal position;
- wheel/wagon footprint;
- forward probe;
- slope/rise;
- water depth.

Behavior:

- shallow ford: allowed if both animal and wagon rules permit;
- deep water: hard stop before entry;
- steep slope: refuse movement;
- downhill safety: very steep descent should also be blocked, not only uphill rise;
- wagon must not pull the horse into deep water during reverse.

If a bad save/physics edge places a hitched pair in invalid water:

- stop driving;
- unhitch safely if necessary;
- invoke transport--001 animal recovery toward safe land;
- keep wagon parked at nearest valid reachable position rather than deleting it.

## Step 6 — animal stamina, needs and protection

Transport--001 survivability rules remain authoritative.

Additional wagon rules:

- pulling drains animal stamina based on speed + load;
- at low stamina, speed drops;
- at exhausted state, animal stops rather than dying from pulling;
- critical hunger/thirst can cause refusal to continue;
- damage/flee/downed state stops the wagon immediately;
- a downed animal is automatically detached from active driving state;
- wagon never keeps moving because stale player input remains active.

HUD status should explain:

- too tired;
- too thirsty;
- too hungry;
- frightened;
- blocked;
- too steep;
- too deep.

## Step 7 — integrate existing cart wear / repair

**Model: sonnet integration; opus only if economy--002 changed the contract**

Do **not** redesign D-TRANS-2 here. `economy--002` step 3 owns the wear/repair model for carts before L4 starts.

TRANS-02 only extends that established model to the wagon:

- wagon reports distance/load into the same wear helper;
- road/off-road/load effects use the already accepted coefficients;
- broken wagon cannot be driven;
- repair uses the existing parked-cart repair path/material sinks;
- wagon-specific durability/capacity values remain item/calibration data.

If L4 is pulled forward before `economy--002` step 3, either implement that dependency first or temporarily leave wagon wear inactive exactly like current TRANS-01; do not create a competing second wear model.

## Step 8 — cargo and economy integration

Reuse TRANS-01 inventory primitives, but not its `HEAVY_GOODS`-only loading policy blindly.

Required:

- wagon has its own inventory;
- cargo does not count against player carry capacity;
- cargo is only accessible near the wagon;
- load/unload to warehouse/player storage reuses existing transfer primitives;
- settlement goodwill behavior remains consistent with D-ECON-4;
- item conservation must hold across load/unload/hitch/death/save.

Allow more item categories than TRANS-01 heavy-goods-only if desired, but make it explicit.

Recommended:

- wagon accepts any physical inventory item up to weight capacity;
- wheelbarrow/handcart keep their existing `HEAVY_GOODS`-only identity;
- generalize transfer helpers where useful, but keep `loadHeavy()` behavior intact for TRANS-01.

## Step 9 — parking and unattended state

Parked or actively driven wagon:

- remains in `state.carts`; it is never temporarily owned by `px.cart`;
- keeps cargo and durability;
- can remain hitched or be unhitched.

Hitched + parked animal behavior:

- no long-distance wandering;
- can perform bounded local need behavior only if wagon stays valid;
- if water/food is not reachable without dragging wagon, animal waits and need becomes a visible problem for the player.

Unhitched owned animal:

- falls back to transport--001 Follow/Stay behavior.

Do not despawn owned wagons or transport animals due to distance.

## Step 10 — rendering

**Model: sonnet; visual review by opus**

Extend `src/game/render/carts.ts` initially, but split wagon geometry/placement if the current `build(kind)` push-cart assumptions make that clearer. Current render placement assumes pushed carts live in front of the player; driven wagons must instead render from their persistent `state.carts` transform.

Render:

- wagon body;
- two/four wheels as appropriate;
- draw bar;
- hitch connection;
- cargo fill hint;
- horse/donkey in front;
- driver position.

First slice can use procedural low-poly wagon geometry.

Requirements:

- shared/pool geometry/materials;
- no per-frame geometry creation;
- wheel rotation may be cosmetic and derived from traveled distance;
- no physics joints required.

Later Blender asset replacement must not change sim state.

## Step 11 — controls and UI

Desktop/mobile:

- Drive / Stop;
- Hitch / Unhitch;
- Load / Unload;
- Repair.

Driving uses existing movement controls.

HUD while driving:

- animal stamina;
- wagon load / capacity;
- wagon durability;
- short refusal/block reason.

Do not add a permanent complex vehicle dashboard.

## Step 12 — NPC / AI boundary

No autonomous NPC wagon driving in TRANS-02.

However, design state so TRADE-03 can later use it:

- hitch relationship is not player-specific where avoidable;
- movement helper should accept an actor/controller concept if cheap;
- do not implement NPC route driving now.

No speculative abstraction beyond what reduces obvious rework.

## Step 13 — verification

### Unit / sim

1. hitch valid owned horse/donkey;
2. reject non-owned / young / mounted / downed animal;
3. only one cart per animal and one animal per cart;
4. drive forward / turn / reverse;
5. cargo load slows vehicle monotonically;
6. stamina drain increases with load;
7. exhaustion stops or slows safely;
8. critical thirst/hunger prevents abusive endless travel;
9. deep water blocked both forward and reverse;
10. steep up/down slopes blocked;
11. wagon footprint cannot pass through building/palisade;
12. cave entry blocked while driving;
13. unhitch leaves both actors in valid non-overlapping positions;
14. save/load preserves wagon, hitch, cargo and durability;
15. invalid save references repair safely;
16. wear increases with kg·km;
17. broken wagon refuses driving;
18. repair consumes resources;
19. item conservation through wagon transfers;
20. animal downed/death stops active driving immediately.

### E2E

Prepared fixture:

- owned adult horse;
- wagon;
- cargo.

Flow:

- hitch;
- load cargo;
- drive along road;
- turn;
- park;
- unload into warehouse;
- unhitch;
- zero console errors.

Separate safety flow:

- attempt deep-water route;
- wagon stops;
- animal remains safe.

### Soak

Several calendar days with:

- repeated drive/park/unhitch cycles;
- changing animal needs;
- partial wagon wear;
- cargo left parked;
- save/load during parked and hitched states.

Assert:

- no NaN transforms;
- no duplicated wagon/cart;
- no lost cargo;
- no drowned transport animal;
- no permanent stale driving state;
- no unbounded path/replan loops.

### Performance

Measure:

- one wagon + animal near player;
- several parked wagons;
- no full-world scan;
- footprint checks limited to nearby spatial queries;
- no meaningful frame regression from parked vehicles.

## Suggested implementation order

1. Confirm transport--001 is stable and economy--002 step 3 wear/repair contract is available.
2. Step 0 contract.
3. Wagon data/state.
4. Hitch/unhitch.
5. Basic driving.
6. Wagon footprint collision.
7. Terrain/water safety.
8. Stamina/needs integration.
9. Cargo/economy.
10. Parking.
11. Wear/repair integration.
12. Render/UI/mobile.
13. E2E/soak/perf.
14. Opus final keep/drop review.

Use targeted tests during implementation; full verification at milestone boundaries and before completion.

## Exit criteria

TRANS-02 is done when:

- an owned adult horse/donkey can be hitched to a wagon;
- player can drive, turn, reverse, stop, park and unhitch;
- wagon carries persistent cargo materially above pack-saddle capacity;
- load affects travel and stamina;
- horse/donkey needs remain meaningful;
- animal cannot be driven into drowning water;
- wagon respects slope and world collision;
- durability/wear and repair work;
- save/load is safe;
- cargo/money conservation remains correct;
- no new full-world scans or persistent movement loops;
- tests/e2e/soak are green.
