---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: pass-with-nits
provider_reviews:
  - note: Prior Polish pack PL rounds 1–3 (pass-with-nits). New EN review wave below.
  - round: EN-R1
    by: executor (clarity / implementability)
    result: revise-heavy — applied
  - round: EN-R2
    by: executor (cross-quest consistency)
    result: revise-light — applied
  - round: EN-R3
    by: executor (dialog aloud / ship readiness)
    result: pass-with-nits — applied
  - round: DIALOG-R1
    by: executor (opening / stage dialog coverage)
    result: revise — applied
  - round: DIALOG-R2
    by: executor (voice / implementability / cross-quest)
    result: pass-with-nits — applied
---

# 04 — Root by the Stream

**Premise:** Dobrawa the herbalist needs a short list of herbs for her sick son **Maciej**. The player has **two calendar days**. Maciej is ill but **there is no death path in v1** — late delivery means a worse recovery and a smaller pay, not a funeral.

## Meta

| Field | Value |
|-------|-------|
| Timer | **2 calendar days** from quest start |
| Stages | 3 |
| Settlements | Domowice; marsh halfway; optional Brzeżyna prices |
| Giver | **Dobrawa** (herbalist) — reserved; **Maciej** (child, sick) |
| `roadActive` | **Yes** for the duration |
| v1 ingredients | yarrow×2, mint×2, chamomile×1 (existing item ids) |
| Checklist rule | Only units gathered / bought / stolen **after quest start** count (`questTagged`). Free world loot from before start does **not** count. |

## Characters

- **Dobrawa** — Domowice herbalist; quest giver; pays from `dobrawa_purse` (treasury fallback).
- **Maciej** — Dobrawa's son; sick with a breathing fever. **He lives through all v1 outcomes.** "Maciej still lives" on a late delivery means recovery is harder, not that death was on the table.
- Optional sellers: a Domowice shepherd trading rope/milk; Brzeżyna herb prices at ×2; a stealable herbalist chest in Brzeżyna.

## World truth

Maciej needs a simple herbal set. The marsh halfway to Brzeżyna can supply it in about half a day. Buying in Brzeżyna is faster on feet but costs more. There is **no** scripted death; fail state is social/economic (Dobrawa relation hit, dirty advance), not a corpse.

## Stage rules / flags (this quest)

| Flag | Meaning |
|------|---------|
| `q04.stage` | 1 → 2 → 3 |
| `q04.deadline` | `calendar_start + 2 days` |
| `q04.advance` | Copper taken up front. Design intent: advance **15** = **half of the on-time cash reward (30)**. |
| `q04.mentorHope` | Soft hook; does not block delivery |
| `q04.source` | Exclusive gather source once complete set obtained: `M` marsh \| `P` shepherd trade \| `B` Brzeżyna buy \| `K` theft |
| `questTagged` | Item instances tagged as counting for this quest's checklist |
| `q04.active` | True while quest is in progress (set on accept, clear on done/fail) |
| `q04.status` | `done` on successful close; used by quest 07 poison gate |

**Advance vs final pay:** On-time cash is 30 copper. Advance is 15 (half). Final cash payout is **30 − advance** (on time) or **15 − advance** (late). **Worked example:** if `advance=15` and delivery is late ⇒ cash = **0** (fifteen minus fifteen). That is intentional, not a bug — the advance already paid half of the late fee. If advance was taken, the **item-alt** reward (salves/bandages) is **blocked** until the player either returns the advance (`to: dobrawa_purse`) or takes the cash payout with deduction.

---

## Stages

### Stage 1 → 2 (accept + checklist start)

Set `deadline=cal+2d`; start empty `questTagged` checklist; set `roadActive`.

**Opening (giver) — Dobrawa (herbalist)**

*(Designer note, not spoken: no death path in v1 — urgency only.)*

> Dobrawa: "My boy Maciej has a fever on the chest. I need yarrow, mint, and chamomile within two days. Will you fetch them so he sits up talking again?"

- A: "I'll get the herbs. Stay with him." → Dobrawa+8; continue to Terms (Terms sets `roadActive` / `stage=2` / deadline).
- B: "What's the pay?" → continue to Terms.
- C: "I can't leave Domowice right now." → refuse; quest stays available until timer window matters (implementer: re-offer while Maciej still needs the set).

**Terms — Dobrawa (accept / advance)**

> Dobrawa: "I don't need a hero. I need someone who comes back with wet hands and a clear head. Two days. Yarrow twice, mint twice, chamomile once."

- A: "I'll go to the marsh. You stay with him." → Dobrawa+8; `stage=2`; set `roadActive`; set `deadline` / `q04.active`.
- B: "Half the pay now." → advance `from: dobrawa_purse` **15** copper (`if_empty: treasury_home` max 15); set `q04.advance=15`; `stage=2`; set `roadActive`. *(Half of the 30 copper on-time reward.)*
- C: "Teach me the brew when he's sitting up again." → `mentorHope=true` (non-blocking); `stage=2`; set `roadActive`.

### Stage 2 — Obtain the set (exclusive source)

| ID | Source | Cost / time |
|----|--------|-------------|
| M | Marsh halfway to Brzeżyna | ~0.5 day gather |
| P | Domowice shepherd trade | rope×1 **or** milk×1 |
| B | Buy in Brzeżyna at ×2 prices | ~1 day road |
| K | Steal Brzeżyna herbalist chest | Brzeżyna honesty−15 |

**Dialog — Shepherd (optional trade)**

> Shepherd: "For Dobrawa's boy I'll make the whole set — yarrow, mint, chamomile — for a length of rope or a skin of milk. No coin for sick-child herbs."

- A: *(have rope×1)* "Rope for the set." → spend rope×1; gain questTagged yarrow×2, mint×2, chamomile×1; `source=P`.
- B: *(have milk×1)* "Milk for the set." → spend milk×1; same herbs; `source=P`.
- C: "I don't have either yet." → leave; trade stays open.

**Discovery — Marsh gather** (environmental)

> *(self)* Wet banks, familiar leaves. Yarrow, mint, chamomile — enough for Dobrawa's brew if you take the half-day and keep the bundle dry.

- A: "Gather what Maciej needs." → ~0.5 day; gain questTagged set; `source=M`.

**Dialog — Brzeżyna herb seller** *(buy path)*

> Seller: "Sick-child prices are still prices. Double what Domowice asks — yarrow, mint, chamomile, coin on the table."

- A: "I'll pay the double." → pay ×2 listed herb costs (`from: player`); gain questTagged set; `source=B`.
- B: "Too rich. I'll find another way." → leave.

**Discovery — Steal Brzeżyna herbalist chest** (environmental / crime)

> *(self)* A chest of dried bundles behind a loose latch. Taking it helps Maciej — and brands you a thief in Brzeżyna.

- A: "Take the set and go." → gain questTagged set; `source=K`; Brzeżyna honesty−15.
- B: "Leave it." → no theft.

Once the checklist is complete, the player may proceed to stage 3 even after the deadline (see late row). Holding the complete set in inventory without delivering does **not** auto-resolve; "late" is judged **at delivery**.

### Stage 3 — Delivery to Dobrawa

**Dialog — Dobrawa (on delivery)**

> Dobrawa: "Show me what you brought for Maciej. If the bundle is short, say so — don't dress grass as medicine."

- A: *(complete, on time)* "Full set — yarrow, mint, chamomile. He's next." → apply on-time reward; set `q04.status=done`; clear `q04.active` / `roadActive`; `done`.
- B: *(complete, late)* "I was late. The set is here — Maciej still needs it." → apply late reward; set `q04.status=done`; clear flags; `done`.
- C: *(incomplete / past deadline)* "I don't have enough." → fail; Dobrawa−20; clear `q04.active` / `roadActive`.
- D: *(fraud)* "This is what I found." *(wrong plants)* → honesty−25; Dobrawa−40; advance must be returned; fail dirty.

| State at delivery | Result |
|-------------------|--------|
| Complete set **before** deadline | Cash: `from: dobrawa_purse` **30 − advance** (`if_empty: treasury_home` max **20 − advance**); **or** item-alt salve×2 + bandage×2 — but if advance > 0, item-alt is **unavailable** until advance is returned (`to: dobrawa_purse`) or player takes deducted cash; helpfulness+10; Dobrawa+35 |
| Complete set **after** deadline (illness continues; **Maciej lives** — late, not death) | `from: dobrawa_purse` **15 − advance** (`if_empty: treasury_home` max **15 − advance**) **or** bandage×2 with the same advance clawback rule; Dobrawa+15 |
| Incomplete after deadline | Fail; Dobrawa−20; advance stays with player as Dobrawa's loss (honesty−5 if not returned on fail) |
| Hold: complete in inventory, not handed in | Still stage 2/3 pending; late only when handed in |
| Fraud (grass / wrong plants) | honesty−25; Dobrawa−40; advance must be returned |

On `done`: set `q04.status=done`, clear `q04.active`, clear `roadActive`. On fail: clear `q04.active`, clear `roadActive` (do not set `status=done`).

---

## Mechanisms

| Tier | Content |
|------|---------|
| **Required** | 2-day timer; `questTagged` picks; late/hold delivery rules; advance clawback |
| **Stub** | `sick` flag on Maciej (presentation only) |
| **Out of scope** | Calamus; herb quality minigame; death path |
