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

# 06 — Trader's Letter

**Premise:** Trader **Stanisław** hires the player to carry a **sealed letter** to **Janko** in Brzeżyna — a quiet grain-price cartel note. Loyalty, silent opening, warning, or public denunciation each rewrite the season.

## Meta

| Field | Value |
|-------|-------|
| Level | Stanisław relation ≥10 **or** trade skill ≥20 |
| Stages | 3 |
| Settlements | Domowice → Brzeżyna (and possible return) |
| Giver | **Stanisław** (`sett.trader`) |
| Recipient | **Janko** — **only central Janko role in this entire pack** |
| `roadActive` | **Yes** |

## Characters

- **Stanisław** — Domowice trader; pays cartel courier fee **only** from `stanislaw_purse` (never settlement treasury).
- **Janko** — Brzeżyna contact / cartel partner; central **only** in quest 06.
- Sołtys figures (home / Brzeżyna) — relevant on path **N** (denounce).

## World truth

The sealed letter proposes a quiet agreement to keep grain prices high for a season. Delivering it sealed advances the cartel. Opening it and staying silent still advances it but risks a 1-day rumor. Warning Janko or denouncing to the sołtys kills the deal with different winners.

## Stage rules / flags (this quest)

| Flag | Meaning |
|------|---------|
| `q06.stage` | 1 → 2 → 3 |
| `q06.intent` | `loyal` \| `open` — set at accept; colors later dialog (not flavor-only) |
| Item `letter_stanislaw` | Starts `sealed`; may become `opened` |
| `q06.path` | Exclusive at delivery: `S` sealed \| `O` open+silent \| `W` open+warn Janko \| `N` open+denounce to sołtys |
| `q06.rumorOpenedSilent` | After **1 calendar day** from delivery on path O (or sealed delivery that later proves opened), if player never chose W/N — rumor tick even without a talk |
| `q06.greyHook` | Future grey-market letter pricing hook |

**Money rule (hard):** Cartel courier pay on paths S/O is **`from: stanislaw_purse` 40** only. **Never** `treasury_home`.

---

## Stages

### Stage 1 → 2 (`intent`)

Opening → Intent. Intent grants `letter_stanislaw` (`sealed`) and sets `roadActive`.

**Opening (giver) — Stanisław (trader)**

> Stanisław: "I need a sealed letter carried to Janko in Brzeżyna. Quiet grain-price work — nothing for the square. Forty copper from my purse when it lands. Will you run it?"

- A: "I'll carry it. Tell me the terms." → continue to intent choices; quest starts; set `roadActive` on accept path.
- B: "What's in it?" → Stanisław: "Wax answers that for the loyal. Choose on the road."; continue to intent.
- C: "I'm not a runner for price-fixing." → refuse; quest locked until Stanisław relation rises by +10 from current.

**Intent — Stanisław (accept)**

> Stanisław: "The seal is for fools and for the loyal. You decide on the road — just don't come back wearing a face you can't afford."

- A: "It arrives closed. I won't crack the wax." → `intent=loyal`; grant `letter_stanislaw` sealed; `stage=2`; set `roadActive`.
- B: "It arrives. I reserve the right to open it if the road smells like a cheat." → `intent=open`; grant letter sealed; `stage=2`; set `roadActive`.

*(Intent matters: on `opened_silent` vs loyal sealed, Janko's and Stanisław's reactions differ — see stage 3.)*

### Stage 2 — Seal decision (exclusive)

On the road or at delivery, choose one path:

| ID | Action | Notes |
|----|--------|-------|
| **S** | Deliver sealed | — |
| **O** | Open, deliver, stay silent | If `intent=loyal` and rumor later fires → Stanisław−10 |
| **W** | Open and warn Janko | Cartel dies |
| **N** | Open and denounce to sołtys | Cartel dies publicly |

**Dialog — roadside / inspect (if player opens)**

> *(letter contents, plain)* "Hold grain asking-price for one season. Split the cream. Burn this after reading."

- A: "Seal it again as best I can and say nothing." → letter state `opened`; intend path `O` at delivery.
- B: "Janko should hear what this really is." → letter `opened`; go to Janko with path `W`.
- C: "The sołtys should hear it." → letter `opened`; go to sołtys denounce (path `N`).

**Dialog — Janko (on delivery)**

> Janko: "Stanisław's hand. Speak — sealed trust, or did curiosity itch?"

- A: *(sealed)* "Wax intact. I'm only the feet." → `path=S`; `stage=3`.
- B: *(opened, silent)* "Wax had a hard road. Here's the letter." → `path=O`; `stage=3`.
- C: *(warn)* "He wants a grain squeeze. I'm telling you so you can refuse clean." → `path=W`; `stage=3`.

Rumor: if path `O` (or sealed delivery later exposed as opened), after **1 day** set rumor tick even if the player never chats about it.

### Stage 3 — Outcomes + optional return

| Path | World | Payout | Relations / rep |
|------|-------|--------|-----------------|
| **S** | `priceMod.grain` up for 1 season | `from: stanislaw_purse` **40** copper (`if_empty: 0` / partial from that purse only — **never** `treasury_home`) | Stanisław+25; honesty−10 after rumor ≥1d if opening is later proven |
| **O** | Same price mod | Same **stanislaw_purse** 40 rule | Janko−10 (distrust — player arrived with a broken seal); if `intent=loyal` and rumor: Stanisław−10 extra |
| **W** | No cartel | `from: janko_purse` 15 (`if_empty: 0`) + optional `from: treasury_brzezyna` 20 for keeping the peace | Janko+20; Stanisław−30 |
| **N** | Cartel killed publicly | `from: treasury_home` 10 + `from: treasury_brzezyna` 10 (`if_empty: partial`) | honesty+15 both; renown+8; traders cool toward player |

**Dialog — Sołtys (path N denounce)**

Either Domowice's sołtys (**Radosław**) or Brzeżyna's sołtys — whichever the player reaches with the opened letter. Not Janko.

> Sołtys: "A trader's seal and a grain squeeze? Speak plain — do you hand me the letter, or only a rumor?"

- A: "Here's the opened letter. Kill the deal in public." → `path=N`; `stage=3`; sołtys takes letter.
- B: "I spoke too soon. I need another day." → leave; path unset; letter stays with player; stay stage 2.

**Return dialog — Stanisław (paths S / O — pay the courier)**

> Stanisław: "Janko has the letter. Forty copper from my purse — as promised. Don't brag on the square."

- A: "Pay me. I'm done talking." → apply S or O payout (`from: stanislaw_purse` 40); clear `roadActive`; `done`.
- B: "Keep your coin. I already know what it bought." → refuse pay; still clear `roadActive`; `done` (no purse debit).

**Return dialog — Stanisław (paths W / N only)** — each line has an effect:

> Stanisław: "I thought you understood business. Business isn't theft — it's breathing in the same rhythm."

- A: "Breathing on the backs of plowmen is a tax with no law." → Stanisław−5; Domowice honesty+5 (public stance); apply W/N world effects already set; clear `roadActive`; `done`.
- B: "Don't hand out seals you don't respect yourself." → Stanisław−10; unlock future refusal of his letters; clear `roadActive`; `done`.
- C: "Next time silence costs more." → `greyHook=true`; Stanisław+5 (grey respect); honesty−5; clear `roadActive`; `done`.

Clear `roadActive` when the quest closes successfully, fails, or is abandoned.

---

## Mechanisms

| Tier | Content |
|------|---------|
| **Required** | `sealed`/`opened`; four paths; `intent` flag; `priceMod.grain`; rumor 1-day tick; stanislaw_purse-only cartel fee |
| **Stub** | Rumor auto-tick without a scene |
| **Out of scope** | Forgery; highway ambush |
