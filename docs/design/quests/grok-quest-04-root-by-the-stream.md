---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — why Dora Herbert can't go herself, any-source checklist (questTagged removed), hemlock look-alike instead of "fraud", roadActive removed
---

# 04 — Root by the Stream

**Premise:** Dora the herbalist can't leave her feverish son **Toby Herbert**, and her shelves are empty after a cough went round {H}. She needs yarrow, mint and chamomile within two days.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md). Unlocks the poison option in [07](grok-quest-07-trail-of-greybeard.md) (see flags).

## Meta

| Field | Value |
|-------|-------|
| Scale | Medium; H, the marsh halfway to {V}, optionally {V} |
| Timer | **2 calendar days** from acceptance (shown in the journal; warn on accept if another timed quest is active) |
| Stages | 3 |
| Giver | **Dora** (H herbalist) |
| Others | **Toby** (her son, ~10), **Molly Lambert** (grows mint by her pen), the {V} herbalist (sells herbs) |
| Items | yarrow×2, mint×2, chamomile×1 (existing ids in `items.ts`); hemlock (look-alike trap) |
| Mechanics status | I: herbs, gathering, trade, healing. N: quest timer, look-alike identification, `q04.status` |

## Characters

- **Dora** — calm, quick, plain-spoken; hides fear under instructions. Has been awake two nights.
- **Toby** — feverish, wheezing, bored. Wants a story more than tea.
- **Molly** — will give mint for nothing to a sick child, but only if asked.

## World truth

Toby has a chest fever. Without the brew he'll still recover, but slowly and with a cough that lasts weeks. Dora used her whole stock on neighbours. Yarrow grows on the marsh banks half a day from {H}; so does hemlock, which looks similar from a distance (white umbrella flowers) and is poisonous. Mint grows by Molly's pen. Chamomile grows in the dry meadow by the road; the {V} herbalist sells all three at a high price.

**No death path.** Toby lives in every outcome; lateness changes his recovery and Dora's trust.

## Flags

| Flag | Meaning |
|------|---------|
| `q04.stage` | 1 → 2 → 3 |
| `q04.deadline` | acceptance + 2 calendar days |
| `q04.advance` | 0 or 10 coppers taken up front |
| `q04.hemlockCaught` | Player handed hemlock as yarrow; Dora caught it |
| `q04.status` | `done` on successful delivery (on time or late); used by 07 |
| `q04.active` | true between acceptance and close |

Checklist counts the herbs **handed over** at delivery, from any source (gathered, bought, given, or already in the player's bag).

## Stage 1 — An empty shelf

**Opening — Dora at her door, a steaming pot behind her**

> **Dora:** You'll have to talk from there, he's coughing. — I need yarrow, two good handfuls. Mint, two. Chamomile, one. Everything I had went on the Tom Lambert household's cough and the hunter's girl. I can't leave him to go to the marsh.
> **Player:** How long have I got?
> **Dora:** Two days and he's over the worst whatever I give him. Before that, the brew makes the difference between a week in bed and a month of coughing.
> **Toby:** *(from inside)* Is that someone? Can they tell me a story?
> **Dora:** They're going to the marsh, love. They'll tell you one after.

- A: "I'll go now." → `q04.active=true`; deadline set; Dora+5; `stage=2`.
- B: "Can you spare something up front? I'll need food for the road." → `from: dora_purse` 10 → player; `advance=10`; `stage=2`.
- C: "What does yarrow look like?" → Dora: "Feathery leaves, like a fern's little sister. Flat white flowers. And it smells — crush a leaf, it smells green and bitter. If it smells of mice, drop it and wash your hands. That's hemlock." → (knowledge only); then A/B.
- D: "I can't right now." → refuse; Dora: "Then I'll ask Molly to sit with him while I go." Quest closes; Dora goes herself (offscreen); no penalty.

## Stage 2 — Gathering

Sources (mix freely):

| Herb | Where | Cost |
|------|-------|------|
| yarrow | marsh banks halfway to {V} (half a day) | time; hemlock grows beside it |
| mint | Molly's pen garden (ask) or {V} herbalist | free if asked / ~4 c each in {V} |
| chamomile | dry meadow by the road, or {V} herbalist, or Stephen Chapman has a dried bundle | free / ~6 c / ~5 c |

**Molly (mint)**

> **Molly:** For Dora's boy? Take what you need — not the roots, mind, or I'll have none next year. *(she picks it herself, faster)* *(if Pip is home — G01 done)* Tell him Pip says get well. She doesn't, she's a sheep. Tell him anyway.

→ gain mint×2.

**Marsh (environmental)**

> *(self)* Two kinds of white flower nod over the water. One has feathery leaves and smells sharp when crushed. The other has spotted stems and smells faintly of mice.

- Gather the feathery, sharp-smelling one → yarrow.
- Gather without checking → 50% yarrow, 50% hemlock (Survival raises the odds; N).

**{V} herbalist (buy)** — standard trade window, prices ~×1.5 (N: urgency doesn't raise prices; the herbalist just charges town prices).

**Theft** — the {V} herbalist's drying rack is unguarded at night. Taking herbs is ordinary theft under normal reputation rules (V honesty if seen). No special quest dialog.

## Stage 3 — Delivery

> **Dora:** Show me. *(she checks each bundle, smelling the yarrow)*

- *(complete, on time)* → Dora: "Good. Good. That's all of it." *(she's already crushing it)* "Sit with him while it steeps. You promised him a story." → apply **on time**; `status=done`.
- *(complete, late)* → Dora: "He's through the worst on his own. This'll still shorten the cough." → apply **late**; `status=done`.
- *(hemlock among the yarrow)* → Dora: *(drops it, wipes her hands)* "That's hemlock. Smell it — mice. You couldn't have known, unless you'd been told." *(if the player asked in Stage 1: "I told you, didn't I.")* "Is there real yarrow?" → if yes, continue as complete; `hemlockCaught=true` (no penalty — she teaches the difference; the hemlock is now known to the player as poison, which matters in 07).
- *(incomplete, deadline passed)* → Dora: "Keep it. He's mending without it. I'll stock up when I can walk to the marsh myself." → fail; `active=false`; no `status=done`.

**Toby (after a successful delivery)**

> **Toby:** *(hoarse)* Was there a monster at the marsh?
> - "Only a heron. It looked at me like I owed it money." → Toby laughs and coughs; Dora+5.
> - "A big one. With teeth." → Toby: "You're lying. — Tell me anyway." → Toby+10.

## Rewards

| Result | Money | Alternative | Reputation (H) | Relations |
|--------|-------|-------------|----------------|-----------|
| On time | `from: dora_purse` 30 − advance (`if_empty:` partial) | salve×2 instead of coin (advance still deducted from what's owed — Dora keeps 1 salve if advance was taken) | helpfulness+10 | Dora+30; Toby+10 |
| Late | `from: dora_purse` 15 − advance (min 0) | bandage×2 | helpfulness+5 | Dora+10 |
| Failed | Advance stays with the player; Dora doesn't ask | — | — | Dora−10 |

On `done`: `q04.status=done`, `q04.active=false`. On fail: `q04.active=false`.

## Refusal, interruption, missing NPCs

- If Dora dies, Toby is cared for by Molly; quest closes.
- KO during the trip doesn't stop the clock; it just costs time.

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Calendar timer; checklist of handed-over items; hemlock look-alike in gathering |
| Stub | Toby's sickness as a presentation state |
| Out of scope | Full disease simulation for this child |

## Implementation notes

Implemented by `quests--003` W1 as `src/game/data/quests/g04.ts` (test `questG04.test.ts`). New engine pieces: `QuestDef.deadlineHours` (journal "Time left: …", E7) and the `timedWarn` effect (lists other running timed quests).

- **Herbs:** hand-over needs yarrow ×2, mint ×2 and chamomile ×1 in the pack (consumed at delivery; logged sink `quest:g04`). Sources are the existing world herb nodes and trade — **no quest-minted herbs**.
- **Look-alike (stub):** herb nodes are already labelled in the world ("Herb: Hemlock"), so no hemlock is rolled at gather time and the "hemlock caught" branch is not implemented; Dora's briefing only warns. With P-02 a poisonous herb becomes "known toxic" after one mistake.
- **Timer:** 48 h from acceptance. On time pays 30 c (20 after the 10 c advance) from Dora's purse (partial if short); late 15 c (5 after the advance). After the deadline "I couldn't get it all" ends `failed` (opinion −10); five days after acceptance it ends `failed` by itself. An unaccepted offer lapses after 72 h. The salve/bandage alternative rewards are not implemented.
- **Molly's mint / Stephen's chamomile:** not implemented (their stores do not hold those herbs); the herbs come from nodes or the herbalist trade.
- **Toby:** optional cast (only when Dora's household has a child); his story topic appears after a successful delivery.
