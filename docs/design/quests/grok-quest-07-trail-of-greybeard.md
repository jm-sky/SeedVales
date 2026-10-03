---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — Greybeard gets a recognisable missing toe, Jacob Bowman's stake is his family's dog, dialogue expanded, poison gate kept
---

# 07 — Trail of Greybeard

**Premise:** Jacob, {H}'s hunter, has spent weeks of nights out after **Greybeard**, an old grey wolf with a missing toe that keeps circling the village. Greybeard killed the family dog last autumn. Jacob wants it over — but he wants it done right.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md). Soft links: [03 Night Torches](grok-quest-03-night-torches.md) (his daughter Hazel Bowman), [04 Root by the Stream](grok-quest-04-root-by-the-stream.md) (poison gate).

## Meta

| Field | Value |
|-------|-------|
| Scale | Medium; H and the forest north of it |
| Start | After the first night; Greybeard exists as a persistent wolf (N: unique animal ID, alpha variant `FAUNA-09` P) |
| Stages | 3 |
| Giver | **Jacob** (H hunter) |
| Others | **Mark Hornblower** (clue), **Dora Herbert** (poison gate), **Martha Bowman** (one line) |
| Mechanics status | I: wolves, dens, combat, bow, traps skill, fire. P: driving off with fire/noise (`FAUNA-07/08`). N: unique named animal, one-shot NPC assist at the den |

## Characters

- **Jacob** — few words, long silences, patient with animals and impatient with people. Exhausted. Blames himself for leaving the dog out.
- **Greybeard** — old, cautious wolf, too slow now for deer, living off what he can steal at the edge of villages. Missing the outer toe of his left forepaw; his print is unmistakable.
- **Martha** — wants her husband home at night.

## World truth

Greybeard is old and alone; his pack left him. He dens under a wind-thrown pine an hour north of {H} and hunts the edges of the village because it's easier than the forest. He did kill Patch. He'll keep coming until he's killed, driven far off, or starves.

## Flags

| Flag | Meaning |
|------|---------|
| `q07.stage` | 1 → 2 → 3 |
| `q07.clues` | set of `post` (Mark), `print` (trail), `den` |
| `q07.assist` | Jacob comes to the den (one-shot) |
| `q07.method` | `bow` \| `trap` \| `drive` \| `poison` |
| `q07.poisonOK` | `q04.status=done` and Dora relation ≥10 and `q04.active=false` |

## Stage 1 — Signs

**Opening — Jacob at the drying rack, before dawn, just back**

> **Jacob:** Twelve nights. He's been within a bowshot of me twice and I never saw more than his back.
> **Player:** The grey wolf?
> **Jacob:** Greybeard. Old, missing a toe on his left forefoot. He killed our dog in autumn. My girl hasn't slept right since. *(pause)* Neither have I.
> **Martha:** *(from the doorway)* Neither have I, and I'm not the one in the woods.

- A: "I'll help. Where do I start?" → quest starts; `stage=1`.
- B: "Does it have to be killed?" → Jacob: "He's old and he's learned that villages are easy. Either he dies, or he learns they aren't. I don't much mind which — but he has to stop coming." → quest starts (unlocks `drive` early).
- C: "Not now." → refuse; available later.

**Briefing**

> **Jacob:** Find me two signs I can trust. Mark found grey hair on a post. His print's in the mud somewhere along the ditch — you'll know it, four toes where there should be five. And if you're very lucky or very stupid, you'll find where he lies up.

**Mark (clue)** → `clues+=post`

> **Mark:** Here. Grey hair caught on the splinters, a hand off the ground. He rubbed past the post by the pens. Close enough to smell the sheep — not close enough to the torch.

**Ditch (environmental)** → `clues+=print`

> *(self)* In the soft mud by the ditch: a big wolf print, splayed and heavy — and on the left forefoot, only four toes. The trail leads north, toward the pines.

**Den (environmental, only after following the trail)** → `clues+=den`

> *(self)* Under the root-plate of a wind-thrown pine: a hollow lined with grey hair, old bones scattered in front. Nothing else's prints but his. He lives alone.

When `clues ≥ 2` → `stage=2`.

## Stage 2 — How it ends

**Jacob — after two signs**

> **Jacob:** You found the toe. *(he crouches, touches the print)* That's him. *(silence)* I've been looking at that print for twelve nights.
> **Player:** What now?
> **Jacob:** Now we decide. I'll come to the den with you at dawn, if you want me. Once. After that I've a household to sleep in.

- A: "Come with me at dawn." → `assist=true`.
- B: "I'll go alone." → `assist=false`.
- C: "What if we drive him off — far enough that he doesn't come back?" → Jacob: "Fire at the den mouth, noise, and then you keep at him for a day — follow him, shout, don't let him rest. He'll go three valleys over. Maybe. He's old; he might not have three valleys in him." → unlocks `drive`.
- D: *(poisonOK)* "Dora knows hemlock. A bait at the den." → Jacob, long pause: "…It works. It's how my grandfather did it. I don't like it. He'll die slow, in his hole, and so will anything else that eats the bait. If you do it, don't tell me." → unlocks `poison`; if used, Jacob−15 when he learns (he will, from Dora or from the smell).

**At the den** (choose one; resolves `method`)

- **bow** — fight at the den (I: combat; with `assist`, Jacob shoots once at the start).
- **trap** — set a trap on the den path and wait (I: traps skill; failure → Greybeard avoids it; try again next night).
- **drive** — fire at the den mouth (I: fire; P: fear behaviour), then pursue for half a day (N: scripted pursuit). Greybeard leaves the region; his den is abandoned.
- **poison** — hemlock bait (I: `hemlock` item; N: bait placement). Greybeard dies within a day.

## Stage 3 — Home

**Jacob**

- *(bow / trap)* > **Jacob:** *(looks at the pelt a long time)* He was thinner than I thought. — Keep the pelt. No, keep it, I don't want it in the house. *(to Martha)* I'm home tonight.
  > **Martha:** You'll be home every night, or I'll hide your boots.
- *(drive)* > **Jacob:** Gone north? Good. If he's alive in spring, he's somebody else's problem — or nobody's. *(almost a smile)* Hazel will ask if he's sad. I don't know what I'll tell her.
- *(poison)* > **Jacob:** It's done, then. *(he doesn't ask how; if he already knows:)* I can smell it on your gloves. I said not to tell me. You didn't have to.

## Rewards

| method | Player | Items | Reputation (H) | Relations |
|--------|--------|-------|----------------|-----------|
| bow | `from: treasury_home` 30 (paid by Mark; `if_empty: jacob_purse` max 20) | `grey_pelt` (~25 c) | courage+10 | Jacob+30; Mark+10; Martha+15 |
| trap | `from: treasury_home` 30 | `grey_pelt` | courage+5, renown+3 | Jacob+30 (respects a clean trap) |
| drive | `from: treasury_home` 20 | — | courage+5, helpfulness+5 | Jacob+20; Hazel+10 |
| poison | `from: treasury_home` 20 | — | honesty−3 if word spreads | Jacob−15 when he learns; Dora+0 |

If quest 03 ended `show`, Hazel asks the player about Greybeard's prints after any method (flavour only).

## Refusal, interruption, missing NPCs

- If the player never takes the quest, Jacob kills Greybeard himself after ~20 nights (world event); the dog, the daughter and the torches settle on their own.
- If the player fails at the den, Greybeard moves his den one hill further (N: den relocation) and the clue `den` must be found again.
- If Jacob dies, Mark pays and the assist is unavailable.

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Unique wolf entity with distinctive print; den; four methods; poison gate |
| Stub | Pursuit after fire as a timed scene |
| Out of scope | Full companion AI for Jacob |

## Implementation notes

Implemented by `quests--003` W1 as `src/game/data/quests/g07.ts` (test `questG07.test.ts`), with the E4 creature cast and new effects `hurt`, `slay`, `scare`. The quest is titled "Trail of the Grey Wolf". A cast creature's death never lapses a quest.

- **Greybeard** is a unique alpha wolf (`tag: greybeard`, no den, never respawned) spawned on offer ~900 m north of {H}. The print is an observation 350 m north (4 s), the den is the wolf's spawn point (needs the print first). Two of {mark}'s hair, the print and the den open stage 2.
- **Methods:** *kill* (bow or trap — the same ending, the quest only sees the wolf dead): 30 c from the treasury, courage +10; *assist* = once the player is within 40 m of the wolf, Jacob's arrow does 25 damage; *drive*: 20 s with a lit torch at the den scares the wolf for 20 min, and on a later day a lit torch within 400 m of him ends it (20 c, the wolf lives); *poison*: needs the herbalist quest done (G04) and Dora's opinion ≥ 10, two hemlock at the den, a day later the wolf dies without loot (20 c, Jacob −15).
- **Neglect:** an unaccepted offer ends on day 22 with Jacob killing the wolf himself; an accepted quest not finished within 15 days ends with Jacob −5.
- **Not implemented:** den relocation after a failed fight, the pursuit scene, Hazel's flavour line, the treasury-short fallback to Jacob's purse.
