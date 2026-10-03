# Roadmap: what the vision still holds after v2 ("later" backlog)

**Created:** 2026-10-02 (session 13, Opus, on the user's request: "check vision & appendix for anything left for later, so you could plan this")  
**Domains:** all  
**Sources:** [VISION.md](../VISION.md) (§6.1, §8, §13, §22, §26–28, "Assets"), [VISION-APPENDIX.md](../VISION-APPENDIX.md), [IMPORTANT-PRODUCT-NOTES.md](../IMPORTANT-PRODUCT-NOTES.md), `docs/state/FEATURES.json` (`scope: "later"` and open `v2`), deferred decisions in [DECISIONS.md](../design/DECISIONS.md), quest packs in [design/quests/](../design/quests/README.md)  
**Status:** accepted by the user 2026-10-02 (D-PLAN-9): order L1→L7 ok; L5 partly; L6 = caves only (continents not planned); voices via Fish Audio free tier, produced by the user (Cursor + browser). Nothing here starts before the current roadmap ([v1-closure-and-appendix](v1-closure-and-appendix.md): 4b → 4c → V → 5b → review loop → 5 → 6 → proposals--001) is through, unless the user pulls an item forward.

## 1. Inventory

Legend: ✅ tracked (FEATURES id / decision exists) · 🆕 not tracked until this file (FEATURES id added 2026-10-02 as `later`/`deferred`) · ⚠ partly covered.

### 1a. Open v2 items (already on the current roadmap — listed for completeness)

| Item | Tracking | Where it is planned |
|---|---|---|
| Treasure / loot at landmarks, chests, predator belly | ✅ LOOT-01 | `world--001` steps 2–3 (wave 5) |
| Mayor (player becomes head of a settlement) | ✅ SET-05 | `settlement--001` (wave 5) |
| Sensory actor visibility on map/minimap | ✅ MAP-02 | not yet in a plan → proposed `ui--002` in L1 below |
| Standing-torch refuel with a fuel material | ✅ FIRE-04 | design only (D-FIRE-1) → L1 |
| Wind/water "scene life" | ✅ RENDER-05 | `render--007` (done in part) |
| Stockpile visuals (user note) | plan `render--009` | wave 4c, Blender session working on it |
| Remaining authored quests (Q01, Q02, Q04–Q06, Q08–Q13, G02, G04–G08 — 22 designs in `design/quests/`) | ⚠ QUEST-03 covers the engine + 4 starters | 🆕 **QUEST-04** → L2 |

### 1b. "Later" items from the vision

| Item (vision §) | Tracking | Depends on | Size |
|---|---|---|---|
| Caves small/medium/large, loot in caves (§6.1, APPX loot) | ✅ WORLD-05 | generator (`GEN_VERSION`), interior rendering/camera, LOOT-01 | L |
| More continents, tundra/desert/jungle, sea transport (§6) | ✅ WORLD-06 | world scale/streaming, boats | XL |
| Horse riding, pack saddles, wagons (§4.3, §28 Transport) | ✅ WORLD-09 | animal following/hold (quest engine primitives exist), rider animation, roads | L |
| Donkey/horse carts (APPX transport) | 🆕 **TRANS-02** (TRANS-01 notes it) | WORLD-09; cart wear (D-TRANS-2) | M |
| Wandering trader tiers (poor: donkey + packs; middle: horse + guard; rich: horse + wagon + 2 guards + crossbow), carter NPC, how goods move between settlements (§28) | 🆕 **TRADE-03** (⚠ ECON-01 has one caravan trader per MD/LG) | WORLD-09/TRANS-02 for the richer tiers; the caravan stall fix (review 015) first | M–L |
| Other professions: physician, fisher, miner, courier, carter, breeders, weaver, carpenter, leatherworker, reeve, mayor, … (§13) | ✅ NPC-06 | per profession: RES-06 (fisher), mine/Q10 (miner), SET-05 (reeve/mayor) | L (split) |
| Multi-generation demography, family/friendship/conflict relations, funerals and grave visits (§8, §28) | ✅ NPC-08 | relation model design (❓ VISION: "to be designed"), NPC birth/ageing, save growth | XL |
| Settlement growth/decline/destruction, new buildings/roads/farms, outposts, cemeteries (§7, §28) | ✅ SET-04 | NPC-08 (population), building AI (sites exist), road generation at runtime | XL |
| Skill books (§12) | ✅ SKILL-02 | item + reading activity; small | S |
| Fishing (§16) | ✅ RES-06 | water queries exist; fish species data; rod/net items | M |
| Item technologies (damascus, obsidian) (§22.3) | ✅ QUAL-02 | crafting tiers, LOOT-01 (damascus dagger as treasure) | M |
| NPC voices (Fish Audio phrase sets per profession/age) (§Assets) | ✅ VOICE-01 | audio pipeline, asset budget | M (asset-heavy) |
| Ambient sounds listened to by a person (§Assets) | ✅ WORLD-10 `implemented_unverified` | ❓ user listen | — |
| Code map generated from `@domain`/`@subdomain` JSDoc tags (§Docs) | 🆕 **DEV-01** | none (tooling) | S |
| Cart wear + repair (D-TRANS-2) | ✅ decision only | — | S |
| Hearth as a better base for a grill; hearth shields the fire from rain (APPX survival, "loose idea") | ⚠ FIRE-02 done without these | FOOD-03 spit exists | S |

### 1c. Findings that are really backlog (from reviews/soak, not bugs)

- Blacksmiths stop forging at the stock cap because nothing creates demand in a calm world (D-VERIFY-1 exemption) → belongs with TRADE-03 (traders buying tools for other settlements).
- Q03/Q07 rarely start in 3 idle soak days (their start conditions depend on house wear / opinion) → calibration note for QUEST-04, not a bug.

### 1d. Recon 013 (GPT full-repository review) → plans

Fixed in session 13: M-01, M-02, M-03, M-04, P-03, C-07 (batch A); M-05, M-07, M-09, M-10 audit, P-02, P-04, P-01 counters, C-01, C-02, C-04 (batch B). Scheduled: M-06 → `render--008` step 4 (GEN bump); P-05 → `diag--002`; M-08, M-10 prices, C-05, C-06, G-01, G-02, G-06 → `economy--002` (L3); C-03, G-03, G-04, G-07 → `quests--002` (L2); UI-01…UI-07 → `ui--002` (L1); G-05 (skill loops) → `proposals--001` input; P-01 scheduler → L5 prerequisite. Triage table: [recon 013](../reviews/2026-10-02--013--full-repository-recon.md).

## 2. Proposed stages after the current roadmap

Each stage = one or more plans with the usual `**Model:**` split (D-PLAN-7), a wave review and a soak run (`review--001` loop). Sizes: S < 1 session, M 1–2, L 3–5, XL needs its own design round first.

| Stage | Content | Why this order |
|---|---|---|
| **L1 — small closers** | DEV-01 code map; SKILL-02 books; FIRE-04 torch fuel; hearth grill/rain shelter; MAP-02 sensory visibility + panels at scale — plan [`ui--002`](../plans/ui--002--panels-at-scale-and-sensory-map.md) (recon 013 UI-01…07) | cheap, no new systems; MAP-02 is a stated v2 product requirement and should not wait for big features |
| **L2 — content on the existing engine** | plan [`quests--002`](../plans/quests--002--batch-2-rumours-and-rewards.md): rumours (recon G-04), item/knowledge rewards (G-03), non-lethal wolf resolution (G-07); QUEST-04: second batch of authored quests in H/V (G05, G07, G08, Q01 after FAUNA-09, Q02, Q06) → then treasure quests (Q05, Q11–Q13 after LOOT-01) → Q10 gold mine (needs a miner, NPC-06 slice) | the quest engine and the review loop exist; content raises the game's value most per session; Q10 is the vision's own example (§26.2) |
| **L3 — economy between settlements** | plan [`economy--002`](../plans/economy--002--production-chain-and-calibration.md): forge chain, availability tiers, maintenance + cart wear, price/skill-gain calibration (recon M-08, M-10, C-05, C-06, G-01, G-02, G-06); TRADE-03 trader tiers + goods moving between settlements (demand for tools, ore, cloth) + NPC-06 slice (miner, carpenter, carter); RES-06 fishing + fisher | closes the blacksmith-demand gap and makes ECON-01 ("settlements trade raw materials and goods") real; uses existing caravan code |
| **L4 — animals as transport** | WORLD-09 riding/pack saddles, TRANS-02 donkey/horse carts, richer trader tiers on wagons | needs L3's trade flows to matter; reuses the quest-engine follow/hold primitives |
| **L5 — living society** (design round first, Opus; prerequisite: due-time NPC/fauna scheduler, recon 013 P-01, if the population grows) | NPC-08 relations/demography/funerals → SET-04 settlement growth/decline, outposts, cemeteries; physician/reeve/mayor professions with SET-05 | the largest change to the sim and the save; must be designed against soak invariants (population, conservation) before code |
| **L6 — caves** (D-PLAN-9) | plan [`world--003`](../plans/world--003--caves.md) (WORLD-05 + cave loot), after `combat--004` (shared grounding model); WORLD-06 and QUAL-02 not planned | generator + streaming work; caves also need an interior camera |
| **L7 — voice and sound** | first slice pulled forward as wave 5a [`audio--001`](../plans/audio--001--recorded-sounds-and-voices.md) (recorded sounds + 60 voice lines from the previous app); rest: more phrase sets by the user (Fish Audio), WORLD-10 listen pass | asset-heavy, best when the content is stable |

`proposals--001` (Claude's own proposals, last stage of the current roadmap) should take this file as one of its inputs so its proposals do not duplicate these items.

## 3. User decisions (2026-10-02, D-PLAN-9)

1. Order L1 → L7 accepted.
2. MAP-02 stays in L1.
3. **L5 — partly:** design round decides which slice (candidates: family/friend relations affecting AI and reputation, funerals and graves, settlement repair/extension by NPCs; full multi-generation demography and settlement destruction are not committed). **L6 — caves only** (WORLD-05 + cave loot); WORLD-06 continents/new biomes/sea transport and QUAL-02 stay deferred, not planned.
4. **Voices:** Fish Audio free tier; the user generates the clips (Cursor + browser). Our side: phrase-set list per profession/age/situation (`greeting`, `farewell`, `thanks`, `warning_danger`, `call_for_help`, `tired`, `hungry`, …) and the playback/selection code (VOICE-01).

## 4. Update 2026-10-03 — L2 quest content plan

The remaining 17 designed quests (Q01 Q02 Q04 Q05 Q06 Q08 Q09 Q10, G02 G04–G08, Q11–Q13) are planned in [`quests--003`](../plans/quests--003--remaining-authored-quests.md): an engine-extension wave (places V/T, grants registry, creatures/dens, price mods, new events, companions), then H-only, H↔V and treasure waves; Q10 stays blocked on L6 caves and the L3 miner slice. It replaces steps 4–5 of `quests--002`.
