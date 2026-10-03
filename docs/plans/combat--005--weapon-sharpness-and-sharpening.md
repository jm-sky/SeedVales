# Weapon sharpness, edge quality and sharpening

**Status:** done  
**Model:** opus — combat/item formulas and material-quality interaction; sonnet — implementation and tests  
**Domain:** combat  
**Sub domains:** items, weapons, crafting, blacksmith, durability, UI  
**Roadmap:** depends on `items--001`; compatible with combat plans 001–004  
**Created:** 2026-10-03  
**Finished:** —

---

## Goal

Turn sharpness from a static weapon-definition number into condition of the individual weapon.

A blade should become dull through use and be sharpenable again, but only up to the maximum edge that this concrete weapon's material/quality/workmanship can support.

A worn, dull sword and a new, sharp sword of the same item id must remain distinct objects with their own state.

Recon is against `main` commit **53ffebe06da719df4bfdbcb14dd4901fd78a9a69**.

## Current main

- Dedicated melee weapons are non-stackable and normally carry their own `ItemStack.dur`.
- `wearTool()` reduces durability and is already called from combat/tool use.
- `WeaponStats.sharpness` is static in `ItemDef`.
- `ItemStack` has no current sharpness field.
- `weaponOf()` returns the static weapon definition.
- Current combat does not meaningfully model a blade becoming dull over time.
- `weaponScore()` considers damage, quality and durability, but not per-instance sharpness.
- VISION §20.1 already calls for sharpness, maximum sharpness and edge durability.

## Model

### 1. Separate current sharpness from maximum sharpness

Use two concepts:

- **current sharpness** — mutable per-instance state on `ItemStack`;
- **maximum sharpness / edge potential** — derived immutable limit for the concrete weapon.

Do not store the current value only in `WeaponStats`.

The item definition may keep a base edge potential, but the final maximum should be derived through the existing quality/material model (and future workmanship if/when represented separately).

### 2. Material/quality controls the ceiling

A poor blade made from weak material cannot be sharpened to the same edge as a high-quality steel blade.

The exact formula is calibration, but it must satisfy:

- low material/quality -> lower maximum;
- high material/quality -> higher maximum;
- sharpening never exceeds that weapon's maximum;
- two swords with the same `id` can therefore have different maximum sharpness when their `q`/`m` differ.

Avoid duplicating quality twice in damage. If quality already multiplies damage, Opus must decide whether sharpness replaces part of that multiplier or affects only cut/pierce effectiveness so the bonuses do not compound unintentionally.

### 3. Sharpness affects appropriate damage

Sharpness should matter for edged/pointed attacks, not blunt weapons.

Initial direction:

- cut damage receives the strongest sharpness effect;
- pierce may receive a smaller effect where appropriate;
- blunt ignores sharpness;
- a dull weapon remains usable but performs worse;
- zero durability still means unusable/broken under existing rules.

Keep the calculation centralized in combat rather than embedding it separately in player/NPC paths.

### 4. Use dulls the edge

Successful attacks/use with an edged weapon reduce current sharpness.

Prefer wear tied to meaningful contact rather than every input attempt.

Edge loss should be distinct from structural durability loss:

- `sharpness`: recoverable by sharpening;
- `dur`: structural wear, not restored by sharpening.

Hard targets/armour may later affect edge wear more strongly, but v1 may use a calibrated simple decrement if that keeps the model understandable.

### 5. Sharpening

Add an explicit sharpening action.

First viable sources:

- player sharpening with an appropriate sharpening tool/stone;
- blacksmith sharpening service.

Do not make sharpening instantaneous if the surrounding interaction system has an activity pattern available. A short activity is preferred.

The action raises current sharpness toward the concrete weapon's max. It must not repair durability.

If a sharpening stone becomes a consumable/durable tool, give it a normal acquisition path and item-source coverage.

### 6. Initial condition

Newly produced weapons should start near or at their computed max sharpness unless a crafting outcome explicitly says otherwise.

Existing saves with weapons lacking a current sharpness field need one documented compatibility default. Prefer deriving a sensible current value from the previous static `WeaponStats.sharpness` and the instance maximum rather than declaring every old weapon perfectly sharpened without review.

This likely requires a `SAVE_VERSION` decision because weapon condition is persistent.

### 7. Selection and NPC behavior

Update `weaponScore()` so NPC/player automatic weapon selection can distinguish:

- intact sharp sword;
- intact but dull sword;
- badly damaged sword.

Do not make NPCs constantly stop to sharpen in this slice unless there is already a natural blacksmith/maintenance loop. Player sharpening and correct scoring are sufficient first behavior; NPC maintenance can be a follow-up.

## UI

Weapon details should expose at least:

- durability;
- current sharpness;
- maximum sharpness.

Use values or readable percentages consistently. Do not show only the static type-level sharpness once per-instance state exists.

A newly picked up better/sharper sword must appear as a separate item, not refresh the equipped one.

## Interactions with block/parry

`combat--002` may add defensive weapon use. This plan should provide one reusable edge/condition API and avoid making parry logic directly mutate arbitrary stack fields.

If parries are later decided to damage edges, they should call the same wear helper.

## Tests

Cover at least:

1. two same-id swords retain independent durability and sharpness;
2. picking up a new sword does not alter an old sword;
3. attacks reduce current sharpness without increasing it elsewhere;
4. sharpening raises current sharpness but never above per-instance max;
5. sharpening does not restore durability;
6. better material/quality can produce a higher max edge than poor material/quality;
7. blunt weapons ignore sharpness;
8. damage/weapon scoring reacts monotonically to sharpness as designed;
9. equip/drop/storage/trade/save round-trips preserve sharpness;
10. old-save compatibility initializes sharpness deterministically.

## Out of scope

- full blacksmith profession maintenance AI;
- weapon repair and reforging;
- chipped/bent blade states;
- separate edge geometry;
- armour damage from blade sharpness;
- complex target-material-dependent dulling unless calibration proves it necessary.

## Exit criteria

- sharpness is per weapon instance;
- each weapon has a material/quality-bounded maximum;
- use dulls edged weapons;
- player can restore sharpness through an explicit sharpening path;
- sharpening cannot repair structural durability;
- combat and automatic weapon choice use the current condition;
- item UI displays current/max sharpness and durability;
- no pickup, merge or transfer path can refresh another weapon's condition.

## Result (2026-10-03, session 14)

Implemented as D-COMBAT-4: `sim/edge.ts` (`maxEdge`, `edgeOf`, `edgeFactor`, `dullEdge`, `sharpenEdge`), `EDGE` calibration, `ItemStack.edge`, whetstone item + recipe + `sharpen` activity (`Game.sharpen`, item-details button, sound `gridstone_sharpen`), combat damage factor + dulling in `meleeAttack`, `weaponScore`, UI sharpness line. Tests: `edge.test.ts` (6), `pnpm check` 471/471, soak 0 violations, e2e green. **Not done:** blacksmith sharpening service, NPC maintenance, hard-target dulling, e2e for the Sharpen button, damage-to-armour interplay.
