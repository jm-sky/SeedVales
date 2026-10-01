---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — extortion path removed, Halina placed in the hunter's household, outcomes differ in world effect not payout
---

# 03 — Night Torches

**Premise:** Somebody keeps putting out {H}'s night torches. Wojciech the guard needs the lights back. The culprit is **Halina**, the hunter's young daughter, who believes darkness hides the village from the wolves that killed the family dog.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md). Soft link: [07 Trail of Siwy](grok-quest-07-trail-of-siwy.md) (same dog, same family).

## Meta

| Field | Value |
|-------|-------|
| Scale | Small, H only, night |
| Start | Any of the first ten nights; torch posts exist (I: guard torch posts) |
| Stages | 3 |
| Giver | **Wojciech** (H guard) |
| Others | **Halina** (child), **Marta** (Halina's mother); **Jarosław** is away on night hunts and does not appear |
| Ban | No attack, threat or payment involving the child or her mother |
| Mechanics status | I: torch posts, night, guard NPC. N: stages, child NPC climbing posts (scripted), "board duty" scene |

## Characters

- **Wojciech** — tired, decent, dry. Has no time for mysteries and no wish to frighten anyone.
- **Halina** — about eight. Serious, logical in her own way, braver than she thinks.
- **Marta** — the hunter's wife; holding the house together while Jarosław hunts at night after the grey wolf. Worried, a little ashamed.
- **Szarik** — the family dog, killed by wolves at the edge of the village last autumn. Remembered only.

## World truth

Since Szarik died, Halina has slipped out after her mother sleeps and smothered the torches nearest her house with an upturned clay cup. She reasons that if the wolves can't see the village, they won't come. Her father is out at night hunting the wolf he thinks killed Szarik (quest 07), so nobody at home has noticed.

## Flags

| Flag | Meaning |
|------|---------|
| `q03.stage` | 1 → 2 → 3 |
| `q03.found` | `watch` \| `alone` \| `morning` |
| `q03.path` | `together` \| `show` \| `tell` |

## Stage 1 — Dark posts

**Opening — Wojciech at the gate, dusk**

> **Wojciech:** Third night this week. The posts by the hunter's house go dark before midnight. Not blown out — snuffed. Somebody climbs up there and puts a lid on them.
> **Player:** Who'd do that?
> **Wojciech:** Somebody who wants the dark. That's the bit I don't like. Help me find out — quietly. I don't want the whole square talking about thieves.

- A: "I'll keep watch with you tonight." → `found=watch` path; `stage=2` after the night scene.
- B: "I'll hide near the posts on my own." → Sneak check at night; success → `found=alone`; `stage=2`. Failure → nobody comes that night; try again.
- C: "Let me look at the posts in the morning." → `found=morning`; go to Marta.
- D: "Not tonight." → refuse; available while the torches keep going dark (until Wojciech solves it himself after ~10 nights — he catches Halina and Marta keeps her in; quest closes without the player).

**Night scene (watch or alone)**

> *(self)* A small shape climbs the post like a cat, a clay cup in one hand. The flame dies under it. She climbs down, looks toward the forest for a long moment — and only then sees you.

→ Halina dialog.

**Morning — Marta at her door (`found=morning`)**

> **Marta:** Soot on our stool. And a cup from my shelf with black on the rim. *(she sits down heavily)* Halina. It's Halina, isn't it. She hasn't slept right since Szarik.
> **Player:** I'd like to talk to her. Gently.
> **Marta:** Please. And — not in front of the square. *(if 07 is not finished)* Jarosław's out every night after that wolf. I can't do this one alone too.

→ Halina dialog (by the woodpile behind the house).

## Stage 2 — Halina

> **Halina:** You're not going to tell Father?
> **Player:** Tell me why first.
> **Halina:** Because the wolves come where the light is. That's how they found Szarik — he was by the lamp in the yard. If it's dark, they can't see us. So they'll go somewhere else.
> **Player:** Did someone tell you that?
> **Halina:** No. I worked it out.

- A: "Let's go and tell Wojciech together. I'll stand next to you." → Halina: "…Will he shout?" → Player: "Not if I'm there." → `path=together`; Halina+20; Marta+10; `stage=3`.
- B: "Wolves see better in the dark than we do. Come with me and Wojciech tomorrow at dusk — he'll show you." → Halina: "Show me how?" → `path=show`; Halina+10; `stage=3` after the dusk scene.
- C: "I have to tell your mother and Wojciech. The guard needs the lights." → Halina: *(quietly)* "I knew you would." → `path=tell`; Halina−20; Wojciech+5; `stage=3`.

**Dusk scene (`path=show`)** — Wojciech, Halina and the player at the edge of the woods

> **Wojciech:** See the prints along the ditch? A fox, and that bigger one there — wolf. Now see where they go. All the way round the lit posts, not between them. They don't like the light. They don't like us, either.
> **Halina:** So the light keeps them out.
> **Wojciech:** The light and me. I need both.
> **Halina:** *(after a while)* Szarik was in the dark bit. By the woodpile. The lamp was on the other side.
> **Wojciech:** *(gently)* Then the lamp wasn't what found him, was it.

## Stage 3 — Lights back

**Wojciech — close**

- *(together)* > **Wojciech:** So it's you, little owl. Come here. No — I'm not angry. Can you climb that post and take the lid off? Good. From now on, the post by your house is yours. You light it at dusk with your mother. Every night. Can you do that?
  > **Halina:** Every night.
- *(show)* > **Wojciech:** You know what the light's for now. Leave the lids on your mother's shelf.
  > **Halina:** Can I come again? To see the prints?
  > **Wojciech:** Ask your father when he's home. He knows more than I do.
- *(tell)* > **Marta:** She'll stay in at night until she understands. *(to the player, stiffly)* Thank you for telling me first, at least.

## Rewards and world effects

| path | World | Player | Reputation (H) | Relations |
|------|-------|--------|----------------|-----------|
| together | Torches stay lit; Halina lights the post by her house each dusk (N: child NPC routine) | `from: treasury_home` 15 (paid by Wojciech; partial if empty) | helpfulness+10, honesty+5 | Wojciech+20; Halina+20; Marta+15 |
| show | Torches stay lit; Halina later asks Jarosław about tracks (unlocks one extra line in 07) | `from: treasury_home` 15 | helpfulness+8 | Wojciech+15; Halina+10; Marta+10 |
| tell | Torches stay lit; Halina kept indoors at night for a week | `from: treasury_home` 15 | honesty+5 | Wojciech+10; Halina−20; Marta+0 |

Payment is the same — the guard pays for the lights, not for how the girl felt. What differs is the family's trust and Halina's later behaviour.

## Refusal, interruption, missing NPCs

- If Jarosław is home on the chosen night (e.g., quest 07 is finished), he catches Halina himself after the second night and the quest closes without the player.
- If Marta is unavailable, Wojciech goes to Jarosław; the `together` ending still works.
- The player cannot attack, threaten or take money from Halina or Marta in this quest (no dialog option exists; ordinary crimes follow normal rules).

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Night scheduling; torch post lit/unlit state; three paths |
| Stub | Halina's climbing as a short scripted animation or offscreen |
| Out of scope | Patrol AI changes beyond lit torches |
