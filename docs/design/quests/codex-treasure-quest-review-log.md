# Codex Treasure Quest Pack — Review Log

> **Historyczne (sprzed przeróbki 2026-10-01).** Dotyczy wcześniejszej wersji scenariusza; nie jest dowodem jakości obecnej wersji. Aktualny rejestr: [REVIEW-2026-10-01](REVIEW-2026-10-01.md).

This is a compact record of real changes made during the design pass. It records issues found and the resulting edits; it is not a hidden chain-of-thought log.

## Quest 11 — The Bell in Blackwater

| Round | Problem found | Change made |
|---|---|---|
| Story / logic | A recovered bell alone did not explain why the quest mattered to the living settlement. | Made the drowned crossing a current water-and-road problem and tied each ending to a different route outcome. |
| Story / logic | A “treasure” could have become an arbitrary reward. | Added a toll chest, a surviving ledger, a physical bell, and an explicit ownership trail. |
| Dialog | The ferrymaster initially sounded like a quest kiosk. | Gave Ewa a seasonal job, a damaged boat, a debt to the settlement, and a reason to refuse unsafe work. |
| Gameplay | The boss animal risked becoming a mandatory kill. | Added luring, waiting, and a recover-without-killing branch; the final outcome records what actually happened. |
| Consistency | The chest could accidentally generate money. | Every payout names `treasury_blackwater`, `ewa_purse`, or an external buyer; the chest contents are fixed loot. |

## Quest 12 — The Iron Under the Pine

| Round | Problem found | Change made |
|---|---|---|
| Story / logic | A legendary weapon with no ownership history would make the endings arbitrary. | Added a cemetery inscription, a quartermaster’s record, and a witnessed transfer condition. |
| Dialog | The public-use ending could sound like the player simply donating an item. | Made the guard captain negotiate a real licence: the town receives the weapon, while the player receives a defined replacement or cash. |
| Gameplay | A cave encounter could collapse into combat-only content. | Added a bear-den avoidance route, a daylight extraction option, and equipment/skill gates instead of one required attack. |
| Dialog | NPC voices were too similar. | Nela speaks in clipped operational sentences, Olek in careful legal phrasing, and Vika in sensory, practical observations. |
| Reward | “Masterwork” could be read as guaranteed perfect stats. | Specified a named item with proposed quality/technology tags, while leaving final numeric calibration open. |

## Quest 13 — The Ash House Vault

| Round | Problem found | Change made |
|---|---|---|
| Story / logic | A family vault could rely on a convenient descendant appearing at the end. | Introduced a verifiable deed, cemetery records, and a living claimant who is reachable before the vault is opened. |
| Story / logic | The obvious ending was simply “give it to the family”. | Split the lawful outcomes into restoration, witnessed division, and a documented sale of the estate. |
| Dialog | The claimant risked being a flat moral authority. | Gave Irena debts, a sick household, and a genuine reason to consider selling instead of restoring. |
| Gameplay | The ruined manor had no reason to involve the player beyond opening a chest. | Added structural inspection, a trapped cellar, an overgrown road, and an optional moose displacement event. |
| Cross-pack | The quest could duplicate Q05’s map-led treasure hunt or Q10’s mine economy. | Removed any treasure map, mine, prospecting, or gold vein; the lead comes from a public road marker and cemetery archive. |

## Final package review

- No quest uses a secret villain, human betrayal, or required human killing.
- Q11 uses a marsh crossing and public infrastructure; Q12 uses a unique weapon and guard responsibility; Q13 uses property and provenance. Their central decisions are different.
- The pack uses proposed mechanics explicitly marked in each file. Existing mechanics are not silently presented as implemented.
- The remaining risk is implementation scope: all three depend on persistent landmarks, conditional dialogue, item ownership, and multi-step travel. The files therefore distinguish required, stub-acceptable, and out-of-scope systems.

