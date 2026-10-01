# Quest pack A — Roads, Work, and What We Keep

**Status: authored narrative proposal, not approved canon and not an implementation.** Reworked in the 2026-10-01 review ([REVIEW-2026-10-01](REVIEW-2026-10-01.md)) and translated to English. Cast, places, links and reward calibration are shared by all packs: [QUEST-WORLD](QUEST-WORLD.md) (wins on conflict). Index of all quests: [README](README.md).

Originally written 2026-09-30 by Codex from a brief by Jan (themes and constraints). Sources read then: [VISION](../../VISION.md) in full (esp. §4–5 travel/time, §7–14 settlements/NPCs/skills, §15–19 fauna/resources, §23–26 work/quests), [VISION-APPENDIX](../../VISION-APPENDIX.md) in full, [DECISIONS](../DECISIONS.md), [FEATURES](../../state/FEATURES.json), [PROGRESS](../../state/PROGRESS.md), the [roadmap](../../roadmap/v1-closure-and-appendix.md), and plans [sim--001](../../plans/sim--001--ai-cadence-and-animal-threat.md), [npc--001](../../plans/npc--001--trade-gifts-companions.md), [economy--001](../../plans/economy--001--gathering-cooking-transport.md), [world--001](../../plans/world--001--landmarks-and-treasure.md). Code check: `src/game/sim/quests.ts` and `interact.ts` — current quests count kills/repairs; this pack needs new narrative support.

## Status codes

| Code | Meaning |
|---|---|
| **I** | Existing feature, `verified` in FEATURES (not re-tested in this session) |
| **P** | Vision requirement with a `planned` plan, not yet working |
| **D** | Approved direction, `deferred`; no promise for v1/v2 |
| **N** | New proposal of this pack, needs a decision and its own implementation design |

I: needs, physical travel, base professions, gathering, crafting/orders, building repairs, construction, trade, skinning, freshness, combat with animals, dens, opinion/reputation. P: companions/gifts, cooking slots, handcarts, fear behaviours, landmarks and treasure. D: multi-stage quests (`QUEST-03`), caves (`WORLD-05`), outposts (`SET-04`), miner and other new professions (`NPC-06`), riding/wagons (`WORLD-09`). **Every scenario needs D:QUEST-03 plus N: conditional dialog, evidence memory and cast reservation. None is runnable content today.**

FEATURES statuses and the implementation schedule are not changed by this pack. On conflict, the current FEATURES status wins over historical PROGRESS text. New characters, places, recipes, ownership rules and numbers here are N.

## The set (after the 2026-10-01 review)

| Quest | Conflict, characters | Activities and key choice | Endings / tone |
|---|---|---|---|
| [Q01 A Hare Out of Place](q01-a-hare-out-of-place.md) | Hunter Jacob Bowman, his apprentice Luke Lambert, trader Stephen Chapman: hide, game or observation? | Tracking, watching from cover, hunting | White hide; ordinary game; the hare stays. Curiosity, small pride |
| [Q02 The Hollow Below the Road](q02-the-hollow-below-the-road.md) | Hunter Edith Fowler and guard Bridget Ward (V): a sow with farrow by the road | Scouting the hollow, weighing risk | Clear it; detour; watch until she leaves. Responsibility |
| [Q03 A Roof Before Rain](q03-a-roof-before-rain.md) | Woodcutter Miles Hewer, Lucy, Joan, Matthew: the beam over Joan's room | Inspection, loan from the store, building | New beam; lean-to; prop. Attachment and change |
| [Q04 The Handle Remembers](q04-the-handle-remembers.md) | Smith Sophie Smith and her father Bernard (V): a cracked hammer | Tool test, finding the crack | Reforge; new hammer; keepsake. Intimate |
| [Q05 The Map That Missed the River](q05-the-map-that-missed-the-river.md) | Trader Rosalind Marchant and scribe Percy Clark (T): a grandmother's map | Expedition, dry riverbed, digging, strongbox | Family; public crossing; an emerald for the player. Discovery |
| [Q06 Room for One More](q06-room-for-one-more.md) | Matthew wants to go to V; his mother needs him in the field | Travel with a companion, camp, collecting an order | Paid; "a someday that I mean"; solo. First independence |
| [Q07 Six Bowls, One Pan](q07-six-bowls-one-pan.md) | Lucy organises a meal; Mark Hornblower has his rounds | Freshness, cooking, standing in on the watch | One table; two sittings; the doorstep. Warmth and humour |
| [Q08 The Long Way to Water](q08-the-long-way-to-water.md) | Shepherd Elspeth, reeve Margaret, Bridget (V) | Route, trial dig, building | Trough; well; rota. Neighbourliness |
| [Q09 Goods on the Ground](q09-goods-on-the-ground.md) | Stephen has tools, H households have heavy goods | Needs, barter, carrying | Swap; commission; list of needs. Light negotiation |
| [Q10 What the Mountain Owes](q10-what-the-mountain-owes.md) | Miner Agnes Collier, merchant Silas Moneypenny, alderman Baldwin (T) | Adit, bad air, sample, outpost | Sale; share; one season. Ambition and cost |

No quest requires killing people, profanity, betrayal or fantasy. Inspirations (Fallout 2/3, Gothic, Skyrim) are a creative direction — many practical solutions, returning consequences, trust earned by work and knowledge of places — not copied characters, scenes or cynicism.

## Cast, places and links

Moved to [QUEST-WORLD](QUEST-WORLD.md). The rule stays: names are design handles; a quest casts an existing NPC of the right role; no matching household means the quest doesn't appear. Do not rename NPCs the player has already met or rewrite marriages in an existing save.

## Shared scene and state contract (N)

Each file defines its own flags in a `Qxx` namespace. Booleans start false, enums `unset`; physically performed things carry an entity/event ID. "X + Y" in a condition means AND; `A / B` in a variant description is a choice, not a random roll. Each `Player [A/B/…]` line is a separate selectable reply; the NPC line after it is the reaction. After the reaction, the conversation returns to the shared part or the named transition. The player doesn't say every variant.

1. **Knowledge:** an NPC knows an event only as a witness, a participant in handing over evidence, or the recipient of a named conversation. The player's journal and global flags are not telepathy. A spoken report lets an NPC react to the report, not pretend to have inspected anything. Relationship variants based on `npc.opinion ≥ 25` change tone or add an option, never gate a mandatory transition; values are N, to calibrate. A default version always exists.
2. **Flow:** helper conversations are optional unless a transition needs their result. Inspection and work stay player actions. A planned NPC testimony can replace a dexterity/skill bottleneck at the cost of that NPC's time and materials. No XP or character levels. Training comes from practice, not a magic bonus after dialog.
3. **Endings:** only on explicit confirmation of an available branch; re-check all conditions, apply once. World change, epilogue conversation and payout are separate effects of one recorded result. Leaving a conversation never picks an ending. Consequences are this proposal's scope, not ready engine bonuses.
4. **Time:** mention of rain or departure starts no hidden failure clock. A deadline exists only once it's in the journal and consciously agreed. Needs and work run on the calendar; combat in gameplay seconds. The world isn't paused for a quest. If an NPC resolves the situation, the real result and the player's actual contribution are acknowledged; damage/animals are not restored.
5. **Economy:** every coin and item has an owner, a payer and a source. Prices are to be calibrated; before a transaction show the concrete offer and available funds. D-ECON-1 forbids minting coins. Never pay more for a moment's work than the settlement treasury holds. Lack of money leads to an explicit offer of payment in kind or a deferred decision, never an endless hidden debt. Pay for work doesn't change the story outcome.
6. **Interruption:** refusing before acceptance has no penalty. Pausing saves progress and returns NPCs to their duties; resuming re-checks the world. Player KO doesn't erase evidence; risk is reassessed on return. Unavailable NPC: wait/heal; after death there's no automatic replacement who remembers private conversations. The journal shows the actual closure or a named succession. That is not a fourth authored epilogue.
7. **Items:** unique evidence isn't consumed by ordinary trade/crafting without a warning; it's kept by the player or a named depository. A lost map can be restored from a copy already made; an unread destroyed document doesn't magically come back. Carrying limits and freshness apply in quests; several trips are fine.
8. **Dependencies:** only Q02 follows Q01, and it has an independent entry. Map of soft links between packs: [QUEST-WORLD](QUEST-WORLD.md#cross-quest-links). Other quests don't need a particular earlier ending. Remembered results give local callbacks only to witnesses or after the information is passed on. No shared "best ending" across all quests is required.

## Shared requirements left to the implementer

N: persistent IDs for cast and props, testimony flags, branching conversations, unit endings, handling interruptions and a changed world, schedules that don't block AI, ownership and consent to use resources. Check state on events/conversations, not with a full world scan every frame. Save/load, one-time transfers and migrations must cover all of it. These are behaviour requirements; no data schema or engine architecture is imposed.

## Work status

Original set and self-review: [REVIEW](REVIEW.md) (historical, Polish). 2026-10-01 rework (three rounds per quest, merged cast, calibration, English): [REVIEW-2026-10-01](REVIEW-2026-10-01.md). The pack remains a proposal for the game author's decision; it does not mean the P/D/N mechanics are implemented.
