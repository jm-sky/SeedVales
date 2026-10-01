---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — Bogdan moved to V (SM home has no blacksmith), debt direction reversed, plowshare has a real flaw, roadActive removed
---

# 02 — Rusty Debt

**Premise:** Old Bogdan, the blacksmith in {V}, forged a plowshare for {H}'s common field. {H}'s village head is holding back the pay because the share "ploughs like a drunk." Bogdan wants his forty coppers. Both men are partly right.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md). Soft link: [Q04](q04-the-handle-remembers.md) (the cracked hammer).

## Meta

| Field | Value |
|-------|-------|
| Scale | Medium, V ↔ H |
| Start | After the player's first visit to {V}; Bogdan alive |
| Stages | 3 |
| Giver | **Bogdan** (V blacksmith, elderly) |
| Others | **Zofia** (Bogdan's daughter, runs the forge), **Radosław** (H farmer and sołtys — village head) |
| Mechanics status | I: treasury payouts, trade, item transport. N: stages, item inspection, `plowshare_common` item state `flawed`/`mended` |

## Characters

- **Bogdan** — proud, stubborn, honest in his own accounting. Named the price "forty, over the anvil" and won't take less without a reason he can respect.
- **Zofia** — practical; loves her father and is tired of arguing with him. Knows the market price and suspects his recent work.
- **Radosław** — careful with common money; ordered the share for the field all {H} households plough in turn. Holds 35 coppers set aside in `treasury_home`.

## World truth

Market price for a plowshare like this is about **30** coppers. Bogdan said **40** — he counted a better steel edge. The share does have a fault: a cold shut near the heel where two layers didn't weld properly, so it twists in heavy soil. It happened because Bogdan's old hammer has a cracked head (Q04) and he didn't notice. Radosław set aside **35** — what he thinks it's worth — and won't pay until something changes.

## Flags

| Flag | Meaning |
|------|---------|
| `q02.stage` | 1 → 2 → 3 |
| `q02.priceKnown` | Zofia told the player the market price |
| `q02.flawFound` | Player inspected the share in H (or Q04 `crackFound` and the player tells Bogdan) |
| `q02.bogdanAdmits` | Bogdan accepts the flaw is his work |
| `q02.outcome` | `settled30` \| `mended` \| `returned` \| `pressured` |

Item: `plowshare_common` (heavy: ~8 kg), states `flawed` → `mended`.

## Stage 1 — The forge in {V}

**Opening — Bogdan at the forge door**

> **Bogdan:** You're from {H}? Good. Then you can carry a message to your village head. I made him a plowshare in spring. Good steel edge, the best I had. Forty coppers, I said, over the anvil, and he nodded. Now he sends word it "ploughs like a drunk" and he'll pay thirty-five when he's minded to.
> **Player:** What do you want me to do?
> **Bogdan:** Get me my forty. Or get me my share back. I'd rather have the iron than the insult.

- A: "I'll talk to Radosław." → quest starts; Bogdan+5; `stage=2`.
- B: "Is the share any good?" → Bogdan: "It's mine. Of course it's good." *(Zofia, behind him, says nothing — and looks at the floor.)* → quest starts; `stage=2`.
- C: "Not my business." → refuse; Bogdan: "Nobody's, apparently." Quest stays available.

**Zofia (optional, out of Bogdan's earshot)** → `priceKnown=true`

> **Zofia:** Thirty. That's what a share like that fetches in {T}. Forty's Father's price — he counts the edge as if it were a sword. *(pause)* And… his last few pieces haven't been right. I don't know why. If the share's bad, I'd rather you told me than him.

- A: "I'll look at it properly before I take sides." → Zofia+5.
- B: "Shouldn't you tell him?" → Zofia: "I've told him his hammer's tired, his knees are tired and his prices are high. He hears one of the three, depending on the day."

## Stage 2 — The field in {H}

**Radosław by the common barn**

> **Radosław:** Bogdan sent you? He'd send a mule if it could talk. — Look, I've no quarrel with the man. I've thirty-five set aside for him, from the village chest, and it's his the day that share ploughs straight.
> **Player:** What's wrong with it?
> **Radosław:** Hook it to the ox and see. In the heavy ground by the stream it twists, like it's trying to go home.

**Inspect the share (environmental)** → `flawFound=true`

> *(self)* Near the heel there's a fine dark seam where two layers of iron never truly joined. In soft soil it holds. In clay it flexes — you can see the polish where it's been rubbing.

Choices at Radosław (any order; one outcome is final):

- A: *(priceKnown)* "Bogdan asked forty; the market price is thirty. Pay him thirty for it as it is, and keep the share." → Radosław: "Thirty for a share that twists? …It still turns earth. All right, thirty, and I'll hear no more about it." → `outcome=settled30`; `stage=3`.
- B: *(flawFound)* "Let me take it back to {V}. If it comes back mended, you pay the thirty-five." → Radosław: "If it comes back straight, I'll pay the thirty-five and I'll say thank you. Take the ox-path, it's drier." → player carries `plowshare_common` to {V}; go to **Mend** below.
- C: "Give the share back to Bogdan. No pay, no quarrel." → Radosław: "And plough with what, the old wooden one? …Fine. I'll buy one in {T} next market. Take it." → player carries share to {V}; `outcome=returned`; `stage=3`.
- D: *(pressure)* "Pay him forty or I tell the whole square you sit on a craftsman's money." → Radosław: "Do that, then. And tell them the share's cracked while you're at it." — If the player insists: Radosław pays 40 (`from: treasury_home` 35 + `from: radoslaw_purse` 5) with cold anger. → `outcome=pressured`; honesty−8 (H); Radosław−20; `stage=3`.

**Mend (only after B) — back at the forge**

> **Bogdan:** *(turns the share in his hands)* …That's a cold shut.
> **Zofia:** It is.
> **Bogdan:** I don't make cold shuts.

- A: *(flawFound)* "You made this one. It's not the iron." → Bogdan, after a long silence: "No. It's not the iron." → `bogdanAdmits=true`.
- B: *(Q04 crackFound known to player)* "It's the hammer. The crack in the head — it's been throwing your welds." → Bogdan: "The hammer." *(he sits down)* "Months, she said. Months of shares." → `bogdanAdmits=true`.
- C: "Just mend it, please." → Zofia mends it; Bogdan says nothing.

Zofia re-welds the heel (half a day; I: craft time). `plowshare_common` becomes `mended`. Player carries it back to {H}: Radosław pays 35 (`from: treasury_home`). If `bogdanAdmits`: Bogdan says he'll take thirty-five and call it even. Otherwise Bogdan grumbles but accepts 35 "for the trouble." → `outcome=mended`; `stage=3`.

## Stage 3 — Close at the forge

> **Bogdan:** Well? Is the man paying, or do I stop shoeing {H}'s horses?

- *(settled30)* "Thirty, and he keeps the share as it is." → Bogdan: "Thirty. For my best edge." *(Zofia: "It's the market price, Father.")* "…The market can choke on it. Fine."
- *(mended)* "Thirty-five, and he says thank you." → Bogdan: "He said thank you?" → "He did." → "Hm. Then it was worth the walk."
- *(returned)* "Here's your share. No pay." → Bogdan: "Iron's iron. I'll draw it into something." *(If `flawFound`, Zofia quietly: "You know why it came back.")*
- *(pressured)* "He paid forty. He's not pleased." → Bogdan: "Pleased isn't in the price." *(Zofia frowns.)*

## Rewards

| outcome | Player | Bogdan receives | Reputation | Relations |
|---------|--------|-----------------|------------|-----------|
| settled30 | `from: bogdan_purse` 8 | 30 from `treasury_home` | honesty+5 (H, V) | Bogdan+5; Radosław+10; Zofia+5 |
| mended | `from: bogdan_purse` 12 + Zofia sharpens one player weapon/tool (service) | 35 from `treasury_home` | helpfulness+8 (H, V), honesty+5 | Bogdan+15; Radosław+15; Zofia+15 |
| returned | `from: bogdan_purse` 5 | share back, no coin | — | Bogdan+5; Radosław−5 |
| pressured | `from: bogdan_purse` 12 | 40 (35 treasury + 5 Radosław) | honesty−8 (H), courage+3 (V) | Bogdan+15; Radosław−20; Zofia−5 |

If `bogdanAdmits`, Bogdan from now on accepts Zofia's offer of a new hammer more readily (Q04 S7 has an extra line). No other cross-quest effects.

## Refusal, interruption, missing NPCs

- If the player abandons the share on the road, it stays there as a world item (heavy, not stolen by NPCs in v1). Radosław−10 if he learns.
- If Radosław dies, the money stays in `treasury_home`; the next sołtys (if any) inherits the dispute with the same lines minus personal remarks.
- If Bogdan dies, Zofia closes the quest with whatever the outcome is; payments go to the household purse.

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Named treasury/purse transfers; carried item with two states; inspection flag |
| Stub | Mending = timed craft by Zofia without player input |
| Out of scope | Full contract/ledger system |
