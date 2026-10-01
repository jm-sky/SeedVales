# Quest designs — index

**Status:** proposals (N), not canon and not implemented. Authored multi-stage quests depend on `QUEST-03` (deferred). The sim-driven board quests in `src/game/sim/quests.ts` (rats, wolves) are separate.

Start here:

- [QUEST-WORLD.md](QUEST-WORLD.md) — **shared cast, places, cross-quest links, reward calibration**. Wins over individual files on conflict.
- [REVIEW-2026-10-01.md](REVIEW-2026-10-01.md) — audit of all three packs and the problem → fix log of the 2026-10-01 rework.

## The three packs

| Pack | Files | Pack notes | Design-text language |
|---|---|---|---|
| **A — Codex, round 1** ("Roads, Work, and What We Keep") | `q01`–`q10` | [CODEX-INDEPENDENT-README.md](CODEX-INDEPENDENT-README.md) | Polish notes, English dialog |
| **B — Grok / Scribe** ("Starting Quests") | `grok-quest-01`–`08` | this file, section below | English |
| **C — Codex, round 2, treasure** | `codex-quest-11`–`13` | [codex-treasure-quest-pack.md](codex-treasure-quest-pack.md) | English |

Historical reviews (pre-rework, not evidence of quality): [REVIEW.md](REVIEW.md) (pack A self-review), `grok-quest-*-review.md` (pack B), [codex-treasure-quest-review-log.md](codex-treasure-quest-review-log.md) (pack C).

## All quests

| ID | Title | Where | Scale | Giver |
|---|---|---|---|---|
| Q01 | [A Hare Out of Place](q01-a-hare-out-of-place.md) | H | small | Jarosław / Leszek |
| Q02 | [The Hollow Below the Road](q02-the-hollow-below-the-road.md) | V lower road | medium | Dorota |
| Q03 | [A Roof Before Rain](q03-a-roof-before-rain.md) | H | small | Mirosław |
| Q04 | [The Handle Remembers](q04-the-handle-remembers.md) | V | small | Zofia |
| Q05 | [The Map That Missed the River](q05-the-map-that-missed-the-river.md) | V–T valley | treasure | Radomira |
| Q06 | [Room for One More](q06-room-for-one-more.md) | H→V→H | medium | Mieszko |
| Q07 | [Six Bowls, One Pan](q07-six-bowls-one-pan.md) | H | small | Ludmiła |
| Q08 | [The Long Way to Water](q08-the-long-way-to-water.md) | V | medium | Elżbieta |
| Q09 | [Goods on the Ground](q09-goods-on-the-ground.md) | H | small | Stanisław |
| Q10 | [What the Mountain Owes](q10-what-the-mountain-owes.md) | beyond T | large (D) | Agnieszka |
| G01 | [Lost Lamb](grok-quest-01-lost-lamb.md) | H | small | Mira |
| G02 | [Rusty Debt](grok-quest-02-rusty-debt.md) | V ↔ H | medium | Bogdan |
| G03 | [Night Torches](grok-quest-03-night-torches.md) | H | small | Wojciech |
| G04 | [Root by the Stream](grok-quest-04-root-by-the-stream.md) | H, marsh | medium, 2-day timer | Dobrawa |
| G05 | [Disputed Oak](grok-quest-05-disputed-oak.md) | H/V boundary | medium | Mirosław |
| G06 | [Trader's Letter](grok-quest-06-traders-letter.md) | H → V | medium | Stanisław |
| G07 | [Trail of Siwy](grok-quest-07-trail-of-siwy.md) | H forest | medium | Jarosław |
| G08 | [Well and Rumor](grok-quest-08-well-and-rumor.md) | H (V optional) | medium | Radosław |
| Q11 | [The Bell in Blackwater](codex-quest-11-bell-in-blackwater.md) | marsh near V | treasure | Ewa |
| Q12 | [The Iron Under the Pine](codex-quest-12-iron-under-the-pine.md) | mountains beyond T | treasure | Dobromir |
| Q13 | [The Ash House Vault](codex-quest-13-ash-house-vault.md) | ruin near T | treasure | Irena |

IDs: pack B keeps its own numbers with a `G` prefix in cross-references (G01–G08) to avoid clashing with Q01–Q13.

## Pack B — Grok / Scribe notes

Eight multi-stage quests around the home settlement H and its neighbour V. After the 2026-10-01 rework:

- **Cast** follows [QUEST-WORLD.md](QUEST-WORLD.md). Changes from the original pack: Bogdan is the elderly blacksmith of **V** (an SM home settlement has no blacksmith); Tomasz is Mira's husband (SM has one farmer, Radosław); Halina and Marta are the hunter Jarosław's family; Wanda's role is gone (her branch in 01 was cut, her witness role in 05 is Elżbieta's); Janko is V's trader.
- **`roadActive` mutex removed.** It blocked five quests against each other and the other packs didn't use it. Quests run in parallel; only timed quests (G04) warn on overlap. See [QUEST-WORLD.md](QUEST-WORLD.md#zasada-równoległości-zastępuje-roadactive).
- **Settlement names in dialog** are `{H}` / `{V}` (generated names). "Domowice"/"Brzeżyna" were design handles only.
- **Removed paths** that broke the pack's own constraints: extorting Halina's mother (03), secretly opening an entrusted letter (06), planting false evidence against V (08), handing the lamb to a stranger (01).

### Vocabulary (all packs)

| Term | Meaning |
|---|---|
| `from: <purse>` | Money moves from that purse or treasury (`treasury_home`, `treasury_V`, `treasury_T`, `mira_purse`, …). Never minted (D-ECON-1). |
| `if_empty:` | Pay what exists (partial), or from the named fallback. |
| `Name+N` | Change in that NPC's opinion of the player (−100…+100). |
| `helpfulness`, `honesty`, `courage`, `renown` | Settlement-scoped reputation axes (VISION §14). |
| `qNN.flag` | Quest-local state. |
| sołtys | Village head (Polish title kept). |
| I / P / D / N | Implemented (verified) / planned / deferred / new proposal. |
