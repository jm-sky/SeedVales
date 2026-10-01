# Codex Treasure Quest Pack — Index

**Status:** independent second narrative pass; proposal for review, not established canon.

**Authoring rule:** this pack adds new content beside the existing `q01`–`q10` files and the `grok-quest-*` files. It does not rewrite them. The existing `Q05 — The Map That Missed the River` and `Q10 — What the Mountain Owes` were treated as protected scope, so this pack avoids both a map-led treasure hunt and a gold-mine claim.

## Shared assumptions

- The game remains grounded medieval simulation without fantasy or magic.
- Dialogues are in English; implementation notes use the vocabulary already established in the quest README: stages, flags, named purses, real inventory items, and `roadActive`.
- “Boss animal” means an unusually dangerous persistent animal, not a supernatural creature. It can be killed, driven away, trapped, or avoided when the mechanics support that choice.
- Monetary rewards are proposals. They must be paid from a named purse, settlement treasury, sale, or contract; no quest creates money from nowhere.
- New settlement names, NPC names, ownership claims, and reward values are proposals. They are not additions to canon until accepted by the author.

## Quest overview

| ID | Title | Main terrain | Treasure / value | Core decision | Distinctive outcome |
|---|---|---|---|---|---|
| 11 | `The Bell in Blackwater` | Marsh, cemetery, drowned chapel | Silver-clad bell, sealed toll chest, ferry rights | Restore the crossing, sell the relic, or fund a seasonal partnership | Changes whether the route returns to use and who benefits from it |
| 12 | `The Iron Under the Pine` | Forest, ruined watchtower, mountain cave | Masterwork long sword and old guard equipment | Give the sword to the guard, sell it, or claim it under a witnessed license | Changes local security, the player’s equipment, or the town’s cash |
| 13 | `The Ash House Vault` | Ruined manor, family cemetery, wooded road | Coin reserve, jewels, heirloom armour and deed | Return the estate, divide lawful claims, or sell the whole find | Changes a household’s future, a public ruin, and the player’s wealth |

## Variety check

- Quest 11 is a public-infrastructure and recovery story. Its tension is practical: mud, ownership, transport, and a route that could become useful again.
- Quest 12 is a focused expedition with a strong item reward. Its tension is between public safety, fair ownership, and the temptation to keep an exceptional weapon.
- Quest 13 is a provenance and settlement-repair story. Its tension is not “find the evil person”, but deciding what a lawful old claim means when several living needs are real.
- The endings are not good/evil copies. They alter transport access, guard capability, household security, public heritage, and the player’s finances in different ways.

## Suggested implementation order

1. Prototype the shared quest state and dialogue condition format with Quest 12.
2. Add persistent landmark and animal-den state for Quest 11.
3. Add provenance, multi-owner loot, and deed/contract state for Quest 13.

## Open author decisions

- Whether the three proposed settlements are fixed named locations or role-tagged generated settlements.
- Whether `roadActive` should block all three quests during their travel stages or whether only the active expedition stage should hold the mutex.
- Exact coin values and item stat ranges after the currency and equipment catalogues are calibrated.
- Whether a settlement may own a unique weapon permanently, or whether every such transfer must remain a normal trade/gift transaction.

