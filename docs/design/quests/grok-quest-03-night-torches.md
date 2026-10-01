---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — extortion path removed, Hazel Bowman placed in the hunter's household, outcomes differ in world effect not payout
---

# 03 — Night Torches

**Premise:** Somebody keeps putting out {H}'s night torches. Mark Hornblower the guard needs the lights back. The culprit is **Hazel**, the hunter's young daughter, who believes darkness hides the village from the wolves that killed the family dog.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md). Soft link: [07 Trail of Greybeard](grok-quest-07-trail-of-greybeard.md) (same dog, same family).

## Meta

| Field | Value |
|-------|-------|
| Scale | Small, H only, night |
| Start | Any of the first ten nights; torch posts exist (I: guard torch posts) |
| Stages | 3 |
| Giver | **Mark** (H guard) |
| Others | **Hazel** (child), **Martha Bowman** (Hazel's mother); **Jacob Bowman** is away on night hunts and does not appear |
| Ban | No attack, threat or payment involving the child or her mother |
| Mechanics status | I: torch posts, night, guard NPC. N: stages, child NPC climbing posts (scripted), "board duty" scene |

## Characters

- **Mark** — tired, decent, dry. Has no time for mysteries and no wish to frighten anyone.
- **Hazel** — about eight. Serious, logical in her own way, braver than she thinks.
- **Martha** — the hunter's wife; holding the house together while Jacob hunts at night after the grey wolf. Worried, a little ashamed.
- **Patch** — the family dog, killed by wolves at the edge of the village last autumn. Remembered only.

## World truth

Since Patch died, Hazel has slipped out after her mother sleeps and smothered the torches nearest her house with an upturned clay cup. She reasons that if the wolves can't see the village, they won't come. Her father is out at night hunting the wolf he thinks killed Patch (quest 07), so nobody at home has noticed.

## Flags

| Flag | Meaning |
|------|---------|
| `q03.stage` | 1 → 2 → 3 |
| `q03.found` | `watch` \| `alone` \| `morning` |
| `q03.path` | `together` \| `show` \| `tell` |

## Stage 1 — Dark posts

**Opening — Mark at the gate, dusk**

> **Mark:** Third night this week. The posts by the hunter's house go dark before midnight. Not blown out — snuffed. Somebody climbs up there and puts a lid on them.
> **Player:** Who'd do that?
> **Mark:** Somebody who wants the dark. That's the bit I don't like. Help me find out — quietly. I don't want the whole square talking about thieves.

- A: "I'll keep watch with you tonight." → `found=watch` path; `stage=2` after the night scene.
- B: "I'll hide near the posts on my own." → Sneak check at night; success → `found=alone`; `stage=2`. Failure → nobody comes that night; try again.
- C: "Let me look at the posts in the morning." → `found=morning`; go to Martha.
- D: "Not tonight." → refuse; available while the torches keep going dark (until Mark solves it himself after ~10 nights — he catches Hazel and Martha keeps her in; quest closes without the player).

**Night scene (watch or alone)**

> *(self)* A small shape climbs the post like a cat, a clay cup in one hand. The flame dies under it. She climbs down, looks toward the forest for a long moment — and only then sees you.

→ Hazel dialog.

**Morning — Martha at her door (`found=morning`)**

> **Martha:** Soot on our stool. And a cup from my shelf with black on the rim. *(she sits down heavily)* Hazel. It's Hazel, isn't it. She hasn't slept right since Patch.
> **Player:** I'd like to talk to her. Gently.
> **Martha:** Please. And — not in front of the square. *(if 07 is not finished)* Jacob's out every night after that wolf. I can't do this one alone too.

→ Hazel dialog (by the woodpile behind the house).

## Stage 2 — Hazel

> **Hazel:** You're not going to tell Father?
> **Player:** Tell me why first.
> **Hazel:** Because the wolves come where the light is. That's how they found Patch — he was by the lamp in the yard. If it's dark, they can't see us. So they'll go somewhere else.
> **Player:** Did someone tell you that?
> **Hazel:** No. I worked it out.

- A: "Let's go and tell Mark together. I'll stand next to you." → Hazel: "…Will he shout?" → Player: "Not if I'm there." → `path=together`; Hazel+20; Martha+10; `stage=3`.
- B: "Wolves see better in the dark than we do. Come with me and Mark tomorrow at dusk — he'll show you." → Hazel: "Show me how?" → `path=show`; Hazel+10; `stage=3` after the dusk scene.
- C: "I have to tell your mother and Mark. The guard needs the lights." → Hazel: *(quietly)* "I knew you would." → `path=tell`; Hazel−20; Mark+5; `stage=3`.

**Dusk scene (`path=show`)** — Mark, Hazel and the player at the edge of the woods

> **Mark:** See the prints along the ditch? A fox, and that bigger one there — wolf. Now see where they go. All the way round the lit posts, not between them. They don't like the light. They don't like us, either.
> **Hazel:** So the light keeps them out.
> **Mark:** The light and me. I need both.
> **Hazel:** *(after a while)* Patch was in the dark bit. By the woodpile. The lamp was on the other side.
> **Mark:** *(gently)* Then the lamp wasn't what found him, was it.

## Stage 3 — Lights back

**Mark — close**

- *(together)* > **Mark:** So it's you, little owl. Come here. No — I'm not angry. Can you climb that post and take the lid off? Good. From now on, the post by your house is yours. You light it at dusk with your mother. Every night. Can you do that?
  > **Hazel:** Every night.
- *(show)* > **Mark:** You know what the light's for now. Leave the lids on your mother's shelf.
  > **Hazel:** Can I come again? To see the prints?
  > **Mark:** Ask your father when he's home. He knows more than I do.
- *(tell)* > **Martha:** She'll stay in at night until she understands. *(to the player, stiffly)* Thank you for telling me first, at least.

## Rewards and world effects

| path | World | Player | Reputation (H) | Relations |
|------|-------|--------|----------------|-----------|
| together | Torches stay lit; Hazel lights the post by her house each dusk (N: child NPC routine) | `from: treasury_home` 15 (paid by Mark; partial if empty) | helpfulness+10, honesty+5 | Mark+20; Hazel+20; Martha+15 |
| show | Torches stay lit; Hazel later asks Jacob about tracks (unlocks one extra line in 07) | `from: treasury_home` 15 | helpfulness+8 | Mark+15; Hazel+10; Martha+10 |
| tell | Torches stay lit; Hazel kept indoors at night for a week | `from: treasury_home` 15 | honesty+5 | Mark+10; Hazel−20; Martha+0 |

Payment is the same — the guard pays for the lights, not for how the girl felt. What differs is the family's trust and Hazel's later behaviour.

## Refusal, interruption, missing NPCs

- If Jacob is home on the chosen night (e.g., quest 07 is finished), he catches Hazel himself after the second night and the quest closes without the player.
- If Martha is unavailable, Mark goes to Jacob; the `together` ending still works.
- The player cannot attack, threaten or take money from Hazel or Martha in this quest (no dialog option exists; ordinary crimes follow normal rules).

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Night scheduling; torch post lit/unlit state; three paths |
| Stub | Hazel's climbing as a short scripted animation or offscreen |
| Out of scope | Patrol AI changes beyond lit torches |
