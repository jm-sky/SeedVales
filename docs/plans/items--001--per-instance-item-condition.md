# Per-instance and per-batch item condition

**Status:** done  
**Model:** opus — data model/stack identity decisions; sonnet — implementation and tests  
**Domain:** items  
**Sub domains:** inventory, persistence, transfer, trade, UI  
**Roadmap:** foundation for `economy--004` and `combat--005`  
**Created:** 2026-10-03  
**Finished:** —

---

## Goal

Make mutable item condition belong to the actual item instance or homogeneous batch instead of being accidentally lost, averaged or refreshed when an item moves between inventories.

This plan is the shared foundation only. Food-specific freshness behavior belongs to `economy--004`; weapon sharpness and sharpening belong to `combat--005`.

Recon is against `main` commit **53ffebe06da719df4bfdbcb14dd4901fd78a9a69**.

## Current main

`ItemStack` currently stores:

- `id`, `qty`;
- `dur`;
- quality/material: `q`, `m`;
- food freshness: `fresh`;
- container water: `water`;
- meat species: `sp`.

`newStack()` initializes durability and freshness from the static item definition.

`addItem()` merges stackable items through `canMerge()`. The merge key currently checks id, quality, material, species and most durability cases, but not freshness or other future mutable condition fields. When food merges, freshness is replaced by a weighted average.

Non-stackable weapons are already represented as separate `qty: 1` stacks, so durability generally survives pickup/equip/drop correctly.

The problem is architectural: adding another mutable property to `ItemStack` is unsafe unless stack identity, splitting and transfers consistently preserve it.

## Design rules

### 1. Static capability versus mutable condition

Keep immutable/type-level limits in `ItemDef` and mutable current state in `ItemStack`.

Examples:

- item definition: base durability, maximum sharpness potential, material/quality rules;
- item stack: current durability, current sharpness, current freshness.

A transfer must never recreate an existing item through `newStack(id)` unless it is genuinely producing a new item.

### 2. A stack represents homogeneous units

A stack may contain multiple units only when every property that changes gameplay outcomes is equivalent for all units in that stack.

Do not average incompatible mutable condition values in order to force a merge.

Condition-sensitive stack identity must be centralized rather than recreated ad hoc in food, trade, storage, crafting or pickup code.

### 3. Exact state survives movement

The following operations must preserve all stack state:

- ground -> actor;
- actor -> ground;
- actor <-> equipment;
- actor <-> building/storage;
- actor <-> cart;
- trade buy/sell;
- gifts;
- crafting inputs/outputs where inheritance is explicitly required;
- save/load.

`removeStack()`, partial transfer and stack splitting must copy the complete condition state of the source batch.

### 4. No hidden normalization

Do not silently:

- reset condition to the item definition default;
- average old and new condition;
- take min/max condition merely to make two batches merge.

If two stacks are not merge-compatible, keep both.

### 5. Numeric comparison policy

Condition values that are continuously decremented can accumulate floating-point noise. Do not use uncontrolled approximate equality everywhere.

Choose one explicit policy during implementation:

- canonical quantization for merge keys, or
- exact values where all mutation steps are deterministic/discrete.

Freshness-specific batching tolerances are decided in `economy--004`; this foundation must allow domain-specific compatibility checks without hard-coding food rules into generic inventory code.

## Implementation scope

1. Introduce one authoritative stack compatibility/merge helper.
2. Audit every direct `Inventory.items.push`, stack clone, transfer and reconstruction path.
3. Make partial-stack removal preserve the complete stack state.
4. Ensure non-stackable items remain one physical item per stack.
5. Add helpers for condition-preserving movement instead of open-coded state reconstruction where useful.
6. Make UI list keys/selection robust when the same `id` appears in several stacks with different condition.
7. Verify trade/storage/cart/gift paths can address a specific stack, not merely an item id when condition matters.
8. Keep save data plain and serializable.

## Persistence

Adding new optional condition fields in dependent plans may require a `SAVE_VERSION` bump under the current save policy. This foundation itself should avoid a bump if it only changes behavior around existing fields.

Do not migrate old saves by inventing historical condition. If a later field is absent, use the explicitly documented compatibility default for that field.

## Tests

Add focused tests covering at least:

- two merge-compatible stacks merge without losing state;
- two condition-incompatible stacks remain separate;
- partial removal preserves condition;
- pickup -> inventory -> drop round-trip preserves condition;
- inventory -> equipment -> inventory preserves condition;
- storage/cart transfers preserve condition;
- buy/sell and gifts preserve condition;
- save snapshot round-trip preserves all existing condition fields;
- adding a new item cannot improve or degrade an existing item's condition as a side effect.

## Out of scope

- exact food batch rules — `economy--004`;
- food consumption ordering — `economy--004`;
- sharpness formulas and sharpening — `combat--005`;
- generic item repair system;
- armour repair;
- cart wear (still D-TRANS-2).

## Exit criteria

- mutable item condition has one clear ownership model;
- incompatible condition is never averaged or refreshed by generic inventory code;
- every transfer path preserves exact stack state;
- dependent food and weapon plans can add their rules without bypassing inventory invariants;
- focused regression tests cover the known refresh/merge failure class.

## Result

Implemented 2026-10-03 (session 14) together with `economy--004` — D-ITEM-1: one `canMerge` rule with condition tolerances, merge keeps the older value, no averaging, `removeItem` is oldest-first for food; tests `itemCondition.test.ts` (7). Storage/trade/save round-trips verified for freshness; cart/gift/crafting paths already moved whole stacks (`removeStack` copies all fields). Not done: UI list keys by stack identity audit beyond `stackLookKey`, `combat--005` sharpness field.
