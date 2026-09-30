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

# 02 — Rusty Debt

**Premise:** Bogdan the blacksmith wants the remaining pay for a plowshare; the farmer already paid into Brzeżyna's treasury, and the sołtys there is blocking the payout over "quality."

## Meta

| Field | Value |
|-------|-------|
| Level | Bogdan relation ≥5 **or** Domowice honesty ≥5 |
| Stages | 3 |
| Settlements | Domowice → Brzeżyna → Domowice |
| Giver | **Bogdan** (blacksmith) — reserved; **Anna** (non-lock hint NPC) |
| Others | Farmer who ordered the plowshare; **sołtys of Brzeżyna** (village head) / Brzeżyna treasury (debtor side). **No Janko** in this quest. |
| `roadActive` | **Yes, from stage 2** |
| Inspiration | Fallout 2 / Skyrim delivery-with-a-twist |

## Characters

- **Bogdan** — Domowice blacksmith; insists the oral price was **40 copper** for the plowshare.
- **Anna** — Local non-lock NPC who can hint that Bogdan may have padded the price (~10 copper over market).
- **Farmer (Brzeżyna)** — Ordered the plowshare; already deposited **35 copper** into `treasury_brzezyna`.
- **Sołtys of Brzeżyna** — Village head blocking payout to Bogdan, citing workmanship/"quality." Uses `soltys_purse` when a deal needs the last 5 copper.

## World truth

Market value of the plowshare is about **30 copper**. Bogdan demanded **40**. The farmer paid **35 into Brzeżyna's treasury**. Payout to Bogdan is frozen by the sołtys until someone mediates. There is no Janko / cartel angle here.

## Stage rules / flags (this quest)

| Flag | Meaning |
|------|---------|
| `q02.stage` | 1 → 2 → 3 |
| `q02.heardHome` | True after stage-1 briefing with Bogdan |
| `q02.annaHint` | True if player heard Anna's "you overcharged" line; softens Bogdan on deal S later |
| `q02.plowshare_mark` | Optional recognition token item from Bogdan |
| `q02.deal` | Exclusive enum: `U` (settlement 30) \| `B` (full 40 for Bogdan) \| `R` (recover the plowshare) \| `S` (Brzeżyna-sided: 25 copper + grain×6) |
| `q02.iou30` | Set if treasury cannot pay full 30 on deal U (partial + IOU stub) |

Grain gate: deal **S** requires the player to supply **grain×6** (`from: player`). If the player cannot, **S is locked**.

---

## Stages

### Stage 1 → 2 (home briefing)

Set `heardHome=true`. Optionally `annaHint=true`.

**Opening (giver) — Bogdan (blacksmith)**

> Bogdan: "I forged a plowshare for a Brzeżyna farmer. He paid their chest — their sołtys won't release my pay over 'quality.' I want what's owed, or the share back."

- A: "I'll go to Brzeżyna and sort the debt." → Bogdan+5; continue to briefing; quest starts; set `roadActive` when stage 2 begins.
- B: "Tell me the numbers first." → continue to briefing.
- C: "I'm busy." → refuse; quest stays available if gates still hold.

**Briefing — Bogdan (stage-1 home)**

> Bogdan: "Forty copper. Said out loud over the anvil. Either I get paid, or that plowshare comes back to my rack."

- A: "I'll go with a scale, not a hammer." → Bogdan+5; `heardHome=true`; `stage=2`; set `roadActive`.
- B: "Give me a mark so I know the plowshare is yours." → grant item `plowshare_mark`; `heardHome=true`; `stage=2`; set `roadActive`.
- C: "Anna says you padded the price." → `annaHint=true`; Bogdan: "Maybe by ten. Still forty was the word."; `heardHome=true`; `stage=2`; set `roadActive`.

**Dialog — Anna (optional, before or after Bogdan)**

> Anna: "Market for a share like that is closer to thirty. Bogdan's pride costs about ten copper extra."

- A: "I'll remember that when I talk in Brzeżyna." → `annaHint=true` (if not already).

### Stage 2 — Brzeżyna (exclusive `deal`)

Evidence the player can gather (any order): farmer confirms 35 went to the treasury; sołtys shows a ledger line (dialog stub); dirty pressure on the sołtys costs honesty.

**Dialog — Sołtys of Brzeżyna (ledger / evidence stub)**

> Sołtys: "Here's the ledger line — thirty-five copper from the farmer, held for Bogdan of Domowice. Ink doesn't lie. Whether the iron earns that ink is another talk."

- A: "Show me the line again. I need it straight." → evidence: ledger confirmed; unlock deal dialog.
- B: *(dirty pressure)* "Open the chest or the square hears you sit on a man's pay." → Domowice honesty−10; Brzeżyna honesty−5; sołtys−10; unlock deal dialog.
- C: "I'll bring the farmer's word too." → go to farmer dialog (no deal yet).

**Dialog — Farmer (Brzeżyna), evidence beat**

> Farmer: "I paid thirty-five copper into the village chest. The sołtys — our village head — holds it. I won't pay twice. Bogdan can argue quality with the chest, not my purse."

- A: "Show me who took the coin into the treasury." → evidence: farmer deposit confirmed; unlock deal dialog with sołtys.
- B: "I'll talk to your sołtys." → go to sołtys ledger or deal dialog.

**Dialog — Sołtys of Brzeżyna (deal)**

> Sołtys: "Thirty-five copper sits in our chest. Speak a deal I can write — settlement, full forty, return the iron, or your grain bargain."

- A: "Split the difference — thirty to Bogdan, and we call the quality settled." → `deal=U`; pay Bogdan per U table now; `stage=3`.
- B: "Pay the forty he was promised. Find the last five if you must." → `deal=B`; pay Bogdan per B table now; `stage=3`.
- C: "Then give the plowshare back. Bogdan will take his iron home." → `deal=R`; item to Bogdan; `stage=3`.
- D: "Twenty-five from your chest, and I'll cover six measures of grain myself." → if player has grain×6: `deal=S`; pay/grain per S table now; `stage=3`; else sołtys: "Without the grain, that bargain is empty." (stay stage 2).

Player tip from `bogdan_purse` is paid on **return** (stage 3), not here.

| ID | Verdict | Money / items | Fallbacks |
|----|---------|---------------|-----------|
| **U** | Settlement at 30 | `from: treasury_brzezyna` 30 copper → Bogdan | If short: pay partial + set `iou30` |
| **B** | 40 for Bogdan | `from: treasury_brzezyna` 35 + `from: soltys_purse` 5 → Bogdan | If sołtys purse empty: stop at what exists; Bogdan accepts **minimum 35** and grumbles |
| **R** | Recover plowshare | Item returns to Bogdan (no coin transfer from Brzeżyna) | — |
| **S** | Brzeżyna-sided | `from: treasury_brzezyna` 25 → Bogdan; `from: player` grain×6 → Bogdan | Treasury may partial; **without grain×6, S is blocked** |

Set `deal=U|B|R|S`; `stage=3`. Keep `roadActive` until return completes.

### Stage 3 — Return to Bogdan

**Dialog — Bogdan (on return)**

> Bogdan: "Well? Did Brzeżyna remember how to count, or do I heat the forge for a different kind of talk?"

- A: *(deal=U)* "Thirty copper from their chest. Quality settled." → apply U rewards; clear `roadActive`; `done`.
- B: *(deal=B)* "Forty — chest and sołtys purse covered it." → apply B rewards; clear `roadActive`; `done`.
- C: *(deal=R)* "Here's your plowshare back. No coin from them." → apply R rewards; clear `roadActive`; `done`.
- D: *(deal=S)* "Twenty-five from the chest, and six measures of grain from me." → apply S rewards; clear `roadActive`; `done`.
- E: "Not finished yet." → leave; stay stage 3.
- *(On fail/abandon at any stage ≥2)* clear `roadActive`.

| deal | Player reward | Reputation | Relations |
|------|---------------|------------|-----------|
| U | `from: bogdan_purse` 10 copper (`if_empty: 0` + one craft discount on a knife) | honesty+8 (both settlements) | Bogdan+15; Brzeżyna sołtys+10 |
| B | `from: bogdan_purse` 15 copper (`if_empty: 0`) | Domowice courage+5; Brzeżyna honesty−5 | Bogdan+25; sołtys−15 |
| R | `from: bogdan_purse` 20 copper (`if_empty: treasury_home` max 15) | renown+5 | Farmer−20 |
| S | Grant bread×3 from Bogdan's stock (inventory items — **not** a `bogdan_purse` debit) | Brzeżyna helpfulness+5 | Bogdan+10 if `annaHint` else +5 |

---

## Mechanisms

| Tier | Content |
|------|---------|
| **Required** | Named treasury transfers; `plowshare_mark` item; exclusive `deal` flags; grain×6 gate on S; `roadActive` from stage 2 |
| **Stub** | Treasury ledger = dialog line |
| **Out of scope** | Janko; full double-entry bookkeeping |
