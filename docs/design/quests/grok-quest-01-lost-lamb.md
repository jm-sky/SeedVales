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
---

# 01 — Lost Lamb

**Premise:** Mira the shepherd asks the player to find her stolen lamb **Miki** before the trail goes cold — a quiet gate theft at dawn, not a wolf raid.

## Meta

| Field | Value |
|-------|-------|
| Level | Starter (calendar day 1–3) |
| Stages | 3 |
| Settlements | Domowice; confrontation with Piotr on the local road |
| Giver | **Mira** (shepherd) — reserved home adult |
| Others | **Wojciech** (guard, witness); **Piotr** (wanderer, thief); **Wanda** (optional false-ID in Brzeżyna) |
| Requirements | None to start. If Mira relation ≥10, her tone is warmer. |
| Conflicts | Wojciech is shared with quest 03 — do **not** block this quest's start |
| Inspiration | Gothic / Fallout 2 style small investigation |
| `roadActive` | **No**, except the optional Wanda hand-off in Brzeżyna |

## Characters

- **Mira** — Domowice shepherd; quest giver. She knows her pen latch by feel and will not accept "a wolf did it" without proof.
- **Miki** — Mira's young lamb. Wears a small brass bell on a collar. **Alive** with Piotr after the theft (world truth).
- **Wojciech** — Domowice guard; can give a witness lead about a stranger on the road at dawn.
- **Piotr** — Wanderer camping on the local road; stole Miki at dawn by easing the gate open (not smashing it).
- **Wanda** — Optional Brzeżyna contact. If the player hands her a lamb without checking the bell, she may take the wrong animal (false ID) — simplified stub, no two-settlement mediation in v1.

## World truth

**Miki is alive with Piotr.** He eased Mira's pen latch open at dawn and walked off with the lamb. Scuff marks near the pen that look "wolfish" are **hare carrion** and a weak Survival misread — flag `q01.misreadWolf` — **not** a second true story. There is no wolf abduction in this quest.

## Stage rules / flags (this quest)

| Flag | Meaning |
|------|---------|
| `q01.stage` | 1 → 2 → 3. Never decreases, **except** `q01.reopenTrack=true` returns the player to stage 2 (only after path D: believing the wolf lie and leaving without Miki). |
| `q01.hasLead` | Enum lead id (need ≥1): **`latch`** = Mira's pen-latch / briefing; **`witness`** = Wojciech dawn stranger; **`track`** = Survival at pen. |
| `q01.misreadWolf` | True if Survival check at the pen is weak — player may believe a wolf story. |
| `q01.resolved` | `bought` \| `talked` \| `forced` once Miki is secured from Piotr. |
| `q01.reopenTrack` | True after path D; stay on stage 2; Mira refuses stage-3 payout. |
| `q01.givenWanda` | True if player handed a lamb to Wanda in Brzeżyna without inspecting the bell. |
| `q01.advance` | Copper coins taken up front from Mira (0 or 10). |

Item: `lamb_miki` — the living lamb once recovered.

---

## Stages

### Stage 1 → 2 (gather a lead)

Change state: set at least one of `hasLead ∈ {latch, witness, track}`.

Ways to get a lead:

1. Talk to **Mira** at the pen → `hasLead=latch` (she describes the latch and Miki's bell).
2. Talk to **Wojciech** → `hasLead=witness`. Public accusation of a named neighbor: Wojciech relation −5. Calm, factual talk: Wojciech +5.
3. Survival check at the pen → `hasLead=track`. Low Survival also sets `misreadWolf=true`.

**Dialog — Mira (shepherd), at the pen**

> Mira: "I know that pen latch by feel. Someone eased it open — they didn't smash it. My lamb Miki wears a little brass bell. If you hear that bell on the road, it's her — not wind in your ears."

Player options:

- A: "Don't shout at people until I'm back with facts." → Mira+5; `hasLead=latch`; `stage=2`.
- B: "Ten copper coins up front; the rest when I bring Miki home." → `from: mira_purse` 10 copper (`if_empty: treasury_home`, max 10); Mira+0; `q01.advance=10`; `hasLead=latch`; `stage=2`.
- C: "A wolf doesn't ease latches — I'll still check the trail carefully." → Set `misreadWolf=false` (clears a prior weak Survival misread); `hasLead=latch`; `stage=2`.

**Dialog — Wojciech (guard), optional witness**

> Wojciech: "Before first light I saw a stranger on the cart road — thin pack, quiet boots. He wasn't heading to our market."

- A: "Thanks. I'll ask around without naming names yet." → Wojciech+5; `hasLead=witness`; `stage=2`.
- B: *(point at a neighbor)* "It was one of ours — say so on the square." → Wojciech−5; `hasLead=witness`; `stage=2`; Domowice honesty−5.

### Stage 2 — Confront Piotr (Miki must be resolved)

Find Piotr on the local road. He has Miki (bell audible on success / inspect).

| ID | Action | Condition / cost | Result |
|----|--------|------------------|--------|
| A | Buy Miki back | `from: player` 22 copper → Piotr | `resolved=bought`; `stage=3`; gain `lamb_miki` |
| B | Talk him into giving Miki back | Domowice courage ≥15 **or** player–Piotr relation ≥20 **or** mention Mira by name with `latch` or `witness` lead | `resolved=talked`; `stage=3`; gain `lamb_miki` |
| C | Force / sneak the lamb | No coin cost | `resolved=forced`; Domowice honesty−15; `stage=3`; gain `lamb_miki` |
| D | Believe the wolf story / leave without Miki | Requires `misreadWolf=true` | `reopenTrack=true`; **remain on stage 2**; do **not** go to stage 3 |

**Dialog — Piotr (wanderer)**

> Piotr: "Pretty brass bell for a road animal — sounds like a shepherd's pet, not a wild stray. Maybe I found Mira's lamb Miki. Maybe she followed me. Either way, twenty-two copper and she's yours without a fuss."

- A: "Twenty-two copper. Hand over Mira's lamb — Miki." → pay 22; `resolved=bought`; `stage=3`.
- B: "Mira knows that latch. Wojciech saw you at dawn. Give her back and walk on." → if talk gate passes: `resolved=talked`; `stage=3`; else Piotr refuses (stay stage 2).
- C: *(force / sneak)* "I'm taking the lamb." → `resolved=forced`; honesty−15; `stage=3`.
- D: *(only if `misreadWolf`)* "Keep her. The wolf trail at the pen is enough for me." → `reopenTrack=true`; stay stage 2.

If D was chosen, next talk with Mira:

> Mira: "I don't believe a wolf eased my latch. Go back to the road. Miki's bell is still out there."

(Do not pay stage-3 rewards. Clear `reopenTrack` when the player returns to Piotr and resolves A/B/C.)

**Optional — Wanda (Brzeżyna), simplified after PL-R2**

This branch **takes the `roadActive` mutex**.

1. Player chooses to walk a lamb to Wanda in Brzeżyna.
2. If `roadActive` is already true → **block** with refusal ("The road's spoken for — finish the other errand first."). Stay on current stage.
3. Else set `roadActive=true` and travel (~1 day).
4. **Inspect the brass bell** before handing over:
   - Bell matches Miki → deliver real `lamb_miki`; do **not** set `givenWanda`; proceed toward Mira stage 3 as a normal return (still clear `roadActive` on leave Brzeżyna / on close).
   - No inspect / wrong animal → set `givenWanda=true`; Mira−35; Domowice honesty−10; **no** two-settlement mediation in v1 (stub / cut); close dirty at Mira (see rewards).
5. Always **clear `roadActive`** when leaving this branch (return home, dirty close, or abandon on the road).

### Stage 3 — Return to Mira (`done`)

Player returns with `lamb_miki` (or with the Wanda failure state).

**Dialog — Mira (successful return with `lamb_miki`)**

> Mira: "That's her bell — that's my lamb Miki. You brought her home. Come, take what I promised, and don't let me catch you telling wolf stories about an open latch."

- A: "She's safe. Glad the bell carried." → apply reward row for `resolved` (`bought` / `talked` / `forced`); `done`.
- B: *(if advance was taken)* "Count the rest after the ten I already took." → same row with advance already subtracted.

**Dialog — Mira (`givenWanda` dirty close)**

> Mira: "That was not Miki's bell. You gave someone's child away on the Brzeżyna road. Leave the coin. Leave my gate."

- A: "I'll make it right if I can." → apply `givenWanda` reward row (0 copper; Mira−35); `done` dirty.

| Path | Money | Item | Reputation | Relations |
|------|-------|------|------------|-----------|
| `bought` or `talked`, lamb returned | `from: mira_purse` 25 copper (`if_empty: treasury_home` up to 25) **minus** any `q01.advance` already paid | wool×2 | helpfulness+10 | Mira+30 |
| `forced`, lamb returned | Same money rule as above | wool×1 | helpfulness+5 | Mira+10; Wojciech−10 |
| `givenWanda` | 0 | — | honesty−10 | Mira−35 |
| Lied "wolf took her" while Miki still lives with Piotr | 0 | — | honesty−20 when the lie is exposed | Mira−40 |

---

## Mechanisms

| Tier | Content |
|------|---------|
| **Required** | Stage / `reopenTrack`; item `lamb_miki`; dialog; Wojciech witness; money from named purses |
| **Stub** | Survival → `misreadWolf`; Wanda branch without mediation |
| **Out of scope** | Blood-trail minigame; full two-settlement mediation |
