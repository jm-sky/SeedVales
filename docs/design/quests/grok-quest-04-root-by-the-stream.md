---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — why Dobrawa can't go herself, any-source checklist (questTagged removed), hemlock look-alike instead of "fraud", roadActive removed
---

# 04 — Root by the Stream

**Premise:** Dobrawa the herbalist can't leave her feverish son **Maciej**, and her shelves are empty after a cough went round {H}. She needs yarrow, mint and chamomile within two days.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md). Unlocks the poison option in [07](grok-quest-07-trail-of-siwy.md) (see flags).

## Meta

| Field | Value |
|-------|-------|
| Scale | Medium; H, the marsh halfway to {V}, optionally {V} |
| Timer | **2 calendar days** from acceptance (shown in the journal; warn on accept if another timed quest is active) |
| Stages | 3 |
| Giver | **Dobrawa** (H herbalist) |
| Others | **Maciej** (her son, ~10), **Mira** (grows mint by her pen), the {V} herbalist (sells herbs) |
| Items | yarrow×2, mint×2, chamomile×1 (existing ids in `items.ts`); hemlock (look-alike trap) |
| Mechanics status | I: herbs, gathering, trade, healing. N: quest timer, look-alike identification, `q04.status` |

## Characters

- **Dobrawa** — calm, quick, plain-spoken; hides fear under instructions. Has been awake two nights.
- **Maciej** — feverish, wheezing, bored. Wants a story more than tea.
- **Mira** — will give mint for nothing to a sick child, but only if asked.

## World truth

Maciej has a chest fever. Without the brew he'll still recover, but slowly and with a cough that lasts weeks. Dobrawa used her whole stock on neighbours. Yarrow grows on the marsh banks half a day from {H}; so does hemlock, which looks similar from a distance (white umbrella flowers) and is poisonous. Mint grows by Mira's pen. Chamomile grows in the dry meadow by the road; the {V} herbalist sells all three at a high price.

**No death path.** Maciej lives in every outcome; lateness changes his recovery and Dobrawa's trust.

## Flags

| Flag | Meaning |
|------|---------|
| `q04.stage` | 1 → 2 → 3 |
| `q04.deadline` | acceptance + 2 calendar days |
| `q04.advance` | 0 or 10 coppers taken up front |
| `q04.hemlockCaught` | Player handed hemlock as yarrow; Dobrawa caught it |
| `q04.status` | `done` on successful delivery (on time or late); used by 07 |
| `q04.active` | true between acceptance and close |

Checklist counts the herbs **handed over** at delivery, from any source (gathered, bought, given, or already in the player's bag).

## Stage 1 — An empty shelf

**Opening — Dobrawa at her door, a steaming pot behind her**

> **Dobrawa:** You'll have to talk from there, he's coughing. — I need yarrow, two good handfuls. Mint, two. Chamomile, one. Everything I had went on the Tomasz household's cough and the hunter's girl. I can't leave him to go to the marsh.
> **Player:** How long have I got?
> **Dobrawa:** Two days and he's over the worst whatever I give him. Before that, the brew makes the difference between a week in bed and a month of coughing.
> **Maciej:** *(from inside)* Is that someone? Can they tell me a story?
> **Dobrawa:** They're going to the marsh, love. They'll tell you one after.

- A: "I'll go now." → `q04.active=true`; deadline set; Dobrawa+5; `stage=2`.
- B: "Can you spare something up front? I'll need food for the road." → `from: dobrawa_purse` 10 → player; `advance=10`; `stage=2`.
- C: "What does yarrow look like?" → Dobrawa: "Feathery leaves, like a fern's little sister. Flat white flowers. And it smells — crush a leaf, it smells green and bitter. If it smells of mice, drop it and wash your hands. That's hemlock." → (knowledge only); then A/B.
- D: "I can't right now." → refuse; Dobrawa: "Then I'll ask Mira to sit with him while I go." Quest closes; Dobrawa goes herself (offscreen); no penalty.

## Stage 2 — Gathering

Sources (mix freely):

| Herb | Where | Cost |
|------|-------|------|
| yarrow | marsh banks halfway to {V} (half a day) | time; hemlock grows beside it |
| mint | Mira's pen garden (ask) or {V} herbalist | free if asked / ~4 c each in {V} |
| chamomile | dry meadow by the road, or {V} herbalist, or Stanisław has a dried bundle | free / ~6 c / ~5 c |

**Mira (mint)**

> **Mira:** For Dobrawa's boy? Take what you need — not the roots, mind, or I'll have none next year. *(she picks it herself, faster)* *(if Miki is home — G01 done)* Tell him Miki says get well. She doesn't, she's a sheep. Tell him anyway.

→ gain mint×2.

**Marsh (environmental)**

> *(self)* Two kinds of white flower nod over the water. One has feathery leaves and smells sharp when crushed. The other has spotted stems and smells faintly of mice.

- Gather the feathery, sharp-smelling one → yarrow.
- Gather without checking → 50% yarrow, 50% hemlock (Survival raises the odds; N).

**{V} herbalist (buy)** — standard trade window, prices ~×1.5 (N: urgency doesn't raise prices; the herbalist just charges town prices).

**Theft** — the {V} herbalist's drying rack is unguarded at night. Taking herbs is ordinary theft under normal reputation rules (V honesty if seen). No special quest dialog.

## Stage 3 — Delivery

> **Dobrawa:** Show me. *(she checks each bundle, smelling the yarrow)*

- *(complete, on time)* → Dobrawa: "Good. Good. That's all of it." *(she's already crushing it)* "Sit with him while it steeps. You promised him a story." → apply **on time**; `status=done`.
- *(complete, late)* → Dobrawa: "He's through the worst on his own. This'll still shorten the cough." → apply **late**; `status=done`.
- *(hemlock among the yarrow)* → Dobrawa: *(drops it, wipes her hands)* "That's hemlock. Smell it — mice. You couldn't have known, unless you'd been told." *(if the player asked in Stage 1: "I told you, didn't I.")* "Is there real yarrow?" → if yes, continue as complete; `hemlockCaught=true` (no penalty — she teaches the difference; the hemlock is now known to the player as poison, which matters in 07).
- *(incomplete, deadline passed)* → Dobrawa: "Keep it. He's mending without it. I'll stock up when I can walk to the marsh myself." → fail; `active=false`; no `status=done`.

**Maciej (after a successful delivery)**

> **Maciej:** *(hoarse)* Was there a monster at the marsh?
> - "Only a heron. It looked at me like I owed it money." → Maciej laughs and coughs; Dobrawa+5.
> - "A big one. With teeth." → Maciej: "You're lying. — Tell me anyway." → Maciej+10.

## Rewards

| Result | Money | Alternative | Reputation (H) | Relations |
|--------|-------|-------------|----------------|-----------|
| On time | `from: dobrawa_purse` 30 − advance (`if_empty:` partial) | salve×2 instead of coin (advance still deducted from what's owed — Dobrawa keeps 1 salve if advance was taken) | helpfulness+10 | Dobrawa+30; Maciej+10 |
| Late | `from: dobrawa_purse` 15 − advance (min 0) | bandage×2 | helpfulness+5 | Dobrawa+10 |
| Failed | Advance stays with the player; Dobrawa doesn't ask | — | — | Dobrawa−10 |

On `done`: `q04.status=done`, `q04.active=false`. On fail: `q04.active=false`.

## Refusal, interruption, missing NPCs

- If Dobrawa dies, Maciej is cared for by Mira; quest closes.
- KO during the trip doesn't stop the clock; it just costs time.

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Calendar timer; checklist of handed-over items; hemlock look-alike in gathering |
| Stub | Maciej's sickness as a presentation state |
| Out of scope | Full disease simulation for this child |
