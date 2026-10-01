# Quest world — shared cast, places and links

**Status:** proposal (N), shared by all three quest packs. Not game canon and not implemented. Where a scenario file and this file disagree, this file wins — the scenarios were aligned to it in the 2026-10-01 review ([REVIEW-2026-10-01](REVIEW-2026-10-01.md)).

## Casting rules

1. **The role, not the name, is the key.** The generator (`src/game/world/gen/settlements.ts`, `centres.ts`) creates a home settlement **SM**, a neighbour **MD** (~1 day's walk) and a town **LG** (another 1–2 days). SM households: farmer, woodcutter, hunter, guard, herbalist, shepherd, trader (no blacksmith). MD adds a second farmer and a blacksmith. LG has two farmers, woodcutters, traders and guards.
2. **Names are English: first name + an occupational surname** that hints at the person's trade (author decision, 2026-10-01). Family members share the household surname. Fixed by the author: the H guard is **Mark Hornblower**. Historical figures (the dead, ancestors) may have a plain first name.
3. **One slot = one person across all packs.** Where two packs described the same role in the same settlement, the characters were merged (table below). No NPC has conflicting roles.
4. **Settlement names in dialog:** `{H}`, `{V}`, `{T}` — replaced by the generated settlement name. Old Grok handles: Domowice = H, Brzeżyna = V. Quest landmarks have English names (Blackwater Chapel, Pinewatch, Ash House, the split hazel, Dulcie's Bend).
5. **Missing NPC/slot:** if the seed has no matching household (e.g. no grown son in the woodcutter's house), the quest doesn't start; professions are not bolted on and characters are not teleported.
6. **Implementation follow-up (N, not done):** the in-game name pool (`NAMES` in `src/game/data/professions.ts`) and settlement names (`settlements.ts`) are still Polish. To match these quests they should switch to English names; with occupational surnames the quest casting can either rename the cast NPC at first exposure (before the player meets them) or pick the generated name and keep the surname rule. Author/implementer decision.

## Cast

### H — home settlement (SM)

| Household (profession) | People | Quests | Merged from (old handles) |
|---|---|---|---|
| farmer + **reeve** (village head) | **Ralph Fieldman**; his wife (unnamed) | G02 (holds the plowshare money), G05 (mediator), G06, G08 (giver), Q03 (common store), Q09 (grain) | Radosław |
| woodcutter | **Miles Hewer**; wife **Lucy Hewer**; mother **Joan Hewer**; grown son **Matthew Hewer** | G05, Q03, Q06, Q07, Q09 | Mirosław / Bram; Lina; Edda; Rowan / Mieszko |
| hunter | **Jacob Bowman**; wife **Martha Bowman**; daughter **Hazel Bowman** (child); dog Patch (killed before the game starts) | Q01, Q02 (optional), G03 (Martha, Hazel), G07 | Jarosław / Mara; Marta; Halina; Szarik |
| guard | **Mark Hornblower** | G01, G03, G07, Q07 | Wojciech / Ada (H role) |
| herbalist | **Dora Herbert**; son **Toby Herbert** (child) | G04, G07, G08 | Dobrawa; Maciej |
| shepherd | **Molly Lambert**; husband **Tom Lambert** (brews small beer); grown son **Luke Lambert** (Jacob's apprentice); lamb Pip | G01, G08 (Tom's barrel), Q01 (Luke), Q07 (Luke) | Mira; Tomasz; Kit / Leszek; Miki |
| trader | **Stephen Chapman** | Q01, Q09, G06 | Stanisław / Oren |

### V — neighbouring settlement (MD)

| Household | People | Quests | Merged from |
|---|---|---|---|
| blacksmith | **Bernard Smith** (old smith); daughter **Sophie Smith** (runs the forge) | G02, Q04, Q06 | Bogdan (moved from H — SM has no smith); Tobin; Nessa / Zofia |
| farmer + **reeve of V** | **Margaret Reeve** | Q02, Q08, Q11 (common funds), G05/G06/G08 (when the talk happens in V) | Dena; Halvar (Q11); Małgorzata |
| farmer | **Cedric Hogg** (keeps pigs) | G05, Q08 (his lad) | Kazimierz |
| hunter | **Edith Fowler** | Q02, Q05 (mention) | Sella / Dorota |
| shepherd | **Elspeth Shepherd** | Q08, G05 (pasture witness) | Wren; Wanda (witness role); Elżbieta |
| guard | **Bridget Ward** | Q02, Q08 | Ada (V role) / Bogna |
| trader | **Jack Mercer** | G06 | Janko |
| woodcutter | **Eve Boatwright** (boat-builder, seasonal ferry in the woodcutter household) | Q11 | Ewa |
| herbalist | **Winifred Sage** (elderly; keeps a copy of the chapel book) | Q11 | Anika (Q11) / Świętosława |

### T — town (LG)

| Role | Person | Quests | Merged from |
|---|---|---|---|
| trader | **Rosalind Marchant** (granddaughter of the mapmaker Dulcie) | Q05 | Iven / Radomira |
| town scribe/archivist (N role) | **Percy Clark** | Q05, Q12 (guard register), Q13 (parish book) | Pell; Olek (Q12); Anika (Q13); Przemysł |
| trader, merchant-investor | **Silas Moneypenny** | Q05 (fair buyer), Q10, Q11, Q12, Q13 (buyer in sale endings) | Corvin, Soren, Olek (Q11); Zbigniew |
| guard (commands the road patrol) | **Willa Shields** | Q12 | Nela / Wisława |
| retired road guard (elder in the guard household) | **Duncan Wakeman** | Q12 (giver) | new; Dobromir |
| hunter / mountain guide | **Mabel Ranger** | Q12 | Vika / Milena |
| woodcutter-carpenter | **Samuel Carpenter** | Q13 | Tomas / Sławomir |
| miner (D: `NPC-06`) | **Agnes Collier** | Q10 | Ysra / Agnieszka |
| alderman of T (role) | **Baldwin Alderman** | Q10 | Bram as delegate; Bolesław |
| seamstress | **Irene Taylor** | Q13 | Irena |

### Outside settlements

| Figure | Where | Quest |
|---|---|---|
| **Piers Walker**, wanderer | local road near H | G01 |
| Greybeard — old lone wolf missing the outer toe of the left forepaw | den under a wind-thrown pine north of H | G07 |
| sow with farrow | hollow by the lower V road | Q02 |
| white hare (albino, `FAUNA-09` P) | hazels at the H forest edge | Q01 |
| old bull moose | Blackwater marsh | Q11 |
| prime bear | Pinewatch cellar | Q12 |
| rutting stag | Ash House orchard | Q13 |
| Historical: Dulcie (Q05), Captain Martin (Q12), Hester Ash and the winter hands Bartholomew, John, Walter (Q13), Master Halm (Q05) | — | — |

## Map of places (proposed topology)

```
           [Pinewatch ruins]   [old adit]           (mountains beyond T)
                    \            /
 [Ash House] ---- {T} town ---- [stone circle, river valley]
                    |  1–2 days
                  {V} neighbour: smithy, well and pasture, lower road (sow's hollow)
                    |  ~1 day
   [boundary oak] --+-- [marsh: herbs; Blackwater Chapel and the old causeway]
                    |
                  {H} home: hazels, torch posts, Tom's barrel, Greybeard's den
```

## Cross-quest links

All links are **soft** (an extra line, option or piece of information) unless marked otherwise. No quest requires a specific ending of another quest.

| From → To | Kind | Description |
|---|---|---|
| Q01 → Q02 | soft | Luke/Jacob know the player; Jacob adds advice in Q02 |
| G04 → G07 | **option gate** | Poison for Greybeard only after G04 is done and Dora's opinion ≥10 |
| G03 ↔ G07 | soft | Patch was Jacob's dog; Hazel fears wolves, her father hunts Greybeard |
| G01 → G04 | soft | Molly's "Pip says get well" line only if the lamb is home |
| Q04 ↔ G02 | soft | The hammer's crack explains the plowshare flaw; after Q04 Sophie says so outright |
| Q04 → Q06 | none | Q06 collects Miles's **axe head and wedges**, not the Q04 hammer |
| G05 ↔ Q03 | soft | Beams: common store, or timber from the oak settlement |
| Q09 ↔ G06 | soft | Stephen's money is tied up in stock and he fears a bad year — background to the letter to Jack |
| Q05 ↔ Q13 | soft | Percy remembers the player; knows only what he was told |
| Q08 → Q11 | soft | "The well Elspeth keeps asking for" line only if Q08 didn't end with a well |
| Q10/Q11/Q12/Q13 | soft | Silas remembers earlier deals with the player (tone, not price) |
| G01, G08 | soft | Molly's household: the lamb (G01), Tom's barrel (G08) |

## Parallel quests (replaces `roadActive`)

The Grok pack used a global `roadActive` mutex that blocked five quests against each other, while the Codex packs didn't know the rule — accidental blocks between packs. **Decision (2026-10-01, made by the reviewer when the author left it open):** no global mutex. Quests can be active in parallel; only quests with a deadline (G04: 2 days, Q06: a hire of several days, Q11: low water season) show a warning on acceptance if another timed quest is running. Physical travel and time limit the player on their own.

## Reward calibration (proposal)

Sources: `TREASURY_START` SM 150 / MD 300 / LG 600; NPC purses from `professions.ts` (shepherd 15–40, woodcutter 20–50, hunter 25–70, guard 30–80, herbalist 30–70, blacksmith 60–150, trader 200–400); prices in `items.ts` (bread 6, bandage 6, salve 20, sword 120, longsword 200, mail shirt 240, plate cuirass 420, crossbow 180); sim quests pay 30–60 (`quests.ts`). D-ECON-1: no minting — treasure is an explicit external source (like ITEM-04).

| Scale | Examples | Cash for the player | Item value |
|---|---|---|---|
| Small local (H) | G01, G03, Q01, Q03, Q07, Q09 | 10–35 from an SM purse/treasury | small: wool, bread, torches |
| Medium / H↔V road | G02, G04, G05, G06, G07, G08, Q02, Q04, Q06, Q08 | 20–70 | up to ~60 (wolf pelt, salves) |
| Treasure expedition (V/T and beyond) | Q05, Q11, Q12, Q13 | 150–600 realistically obtainable | 200–800 (rings, gems, masterwork weapon) |
| Large project | Q10 | 300–900 once **or** a 10–20% share of real loads | — |

Proposed item values (to approve in `items.ts`/LOOT-01): gold ring 80–150, cut ruby/emerald 120–250, silver trade bar 60–90, silver-clad bell (sale for metal and craft) 300–450, **Pinewatch Longsword** (masterwork longsword) 450–600, fine reinforced leather cuirass 120–180. A settlement treasury payout can never exceed its balance (partial payment, as in `quests.ts`).
