---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — Bernard Smith moved to V (SM home has no blacksmith), debt direction reversed, plowshare has a real flaw, roadActive removed
---

# 02 — Rusty Debt

**Premise:** Old Bernard, the blacksmith in {V}, forged a plowshare for {H}'s common field. {H}'s village head is holding back the pay because the share "ploughs like a drunk." Bernard wants his forty coppers. Both men are partly right.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md). Soft link: [Q04](q04-the-handle-remembers.md) (the cracked hammer).

## Meta

| Field | Value |
|-------|-------|
| Scale | Medium, V ↔ H |
| Start | After the player's first visit to {V}; Bernard alive |
| Stages | 3 |
| Giver | **Bernard** (V blacksmith, elderly) |
| Others | **Sophie Smith** (Bernard's daughter, runs the forge), **Ralph Fieldman** (H farmer and reeve — village head) |
| Mechanics status | I: treasury payouts, trade, item transport. N: stages, item inspection, `plowshare_common` item state `flawed`/`mended` |

## Characters

- **Bernard** — proud, stubborn, honest in his own accounting. Named the price "forty, over the anvil" and won't take less without a reason he can respect.
- **Sophie** — practical; loves her father and is tired of arguing with him. Knows the market price and suspects his recent work.
- **Ralph** — careful with common money; ordered the share for the field all {H} households plough in turn. Holds 35 coppers set aside in `treasury_home`.

## World truth

Market price for a plowshare like this is about **30** coppers. Bernard said **40** — he counted a better steel edge. The share does have a fault: a cold shut near the heel where two layers didn't weld properly, so it twists in heavy soil. It happened because Bernard's old hammer has a cracked head (Q04) and he didn't notice. Ralph set aside **35** — what he thinks it's worth — and won't pay until something changes.

## Flags

| Flag | Meaning |
|------|---------|
| `q02.stage` | 1 → 2 → 3 |
| `q02.priceKnown` | Sophie told the player the market price |
| `q02.flawFound` | Player inspected the share in H (or Q04 `crackFound` and the player tells Bernard) |
| `q02.bernardAdmits` | Bernard accepts the flaw is his work |
| `q02.outcome` | `settled30` \| `mended` \| `returned` \| `pressured` |

Item: `plowshare_common` (heavy: ~8 kg), states `flawed` → `mended`.

## Stage 1 — The forge in {V}

**Opening — Bernard at the forge door**

> **Bernard:** You're from {H}? Good. Then you can carry a message to your village head. I made him a plowshare in spring. Good steel edge, the best I had. Forty coppers, I said, over the anvil, and he nodded. Now he sends word it "ploughs like a drunk" and he'll pay thirty-five when he's minded to.
> **Player:** What do you want me to do?
> **Bernard:** Get me my forty. Or get me my share back. I'd rather have the iron than the insult.

- A: "I'll talk to Ralph." → quest starts; Bernard+5; `stage=2`.
- B: "Is the share any good?" → Bernard: "It's mine. Of course it's good." *(Sophie, behind him, says nothing — and looks at the floor.)* → quest starts; `stage=2`.
- C: "Not my business." → refuse; Bernard: "Nobody's, apparently." Quest stays available.

**Sophie (optional, out of Bernard's earshot)** → `priceKnown=true`

> **Sophie:** Thirty. That's what a share like that fetches in {T}. Forty's Father's price — he counts the edge as if it were a sword. *(pause)* And… his last few pieces haven't been right. I don't know why. If the share's bad, I'd rather you told me than him.

- A: "I'll look at it properly before I take sides." → Sophie+5.
- B: "Shouldn't you tell him?" → Sophie: "I've told him his hammer's tired, his knees are tired and his prices are high. He hears one of the three, depending on the day."

## Stage 2 — The field in {H}

**Ralph by the common barn**

> **Ralph:** Bernard sent you? He'd send a mule if it could talk. — Look, I've no quarrel with the man. I've thirty-five set aside for him, from the village chest, and it's his the day that share ploughs straight.
> **Player:** What's wrong with it?
> **Ralph:** Hook it to the ox and see. In the heavy ground by the stream it twists, like it's trying to go home.

**Inspect the share (environmental)** → `flawFound=true`

> *(self)* Near the heel there's a fine dark seam where two layers of iron never truly joined. In soft soil it holds. In clay it flexes — you can see the polish where it's been rubbing.

Choices at Ralph (any order; one outcome is final):

- A: *(priceKnown)* "Bernard asked forty; the market price is thirty. Pay him thirty for it as it is, and keep the share." → Ralph: "Thirty for a share that twists? …It still turns earth. All right, thirty, and I'll hear no more about it." → `outcome=settled30`; `stage=3`.
- B: *(flawFound)* "Let me take it back to {V}. If it comes back mended, you pay the thirty-five." → Ralph: "If it comes back straight, I'll pay the thirty-five and I'll say thank you. Take the ox-path, it's drier." → player carries `plowshare_common` to {V}; go to **Mend** below.
- C: "Give the share back to Bernard. No pay, no quarrel." → Ralph: "And plough with what, the old wooden one? …Fine. I'll buy one in {T} next market. Take it." → player carries share to {V}; `outcome=returned`; `stage=3`.
- D: *(pressure)* "Pay him forty or I tell the whole square you sit on a craftsman's money." → Ralph: "Do that, then. And tell them the share's cracked while you're at it." — If the player insists: Ralph pays 40 (`from: treasury_home` 35 + `from: ralph_purse` 5) with cold anger. → `outcome=pressured`; honesty−8 (H); Ralph−20; `stage=3`.

**Mend (only after B) — back at the forge**

> **Bernard:** *(turns the share in his hands)* …That's a cold shut.
> **Sophie:** It is.
> **Bernard:** I don't make cold shuts.

- A: *(flawFound)* "You made this one. It's not the iron." → Bernard, after a long silence: "No. It's not the iron." → `bernardAdmits=true`.
- B: *(Q04 crackFound known to player)* "It's the hammer. The crack in the head — it's been throwing your welds." → Bernard: "The hammer." *(he sits down)* "Months, she said. Months of shares." → `bernardAdmits=true`.
- C: "Just mend it, please." → Sophie mends it; Bernard says nothing.

Sophie re-welds the heel (half a day; I: craft time). `plowshare_common` becomes `mended`. Player carries it back to {H}: Ralph pays 35 (`from: treasury_home`). If `bernardAdmits`: Bernard says he'll take thirty-five and call it even. Otherwise Bernard grumbles but accepts 35 "for the trouble." → `outcome=mended`; `stage=3`.

## Stage 3 — Close at the forge

> **Bernard:** Well? Is the man paying, or do I stop shoeing {H}'s horses?

- *(settled30)* "Thirty, and he keeps the share as it is." → Bernard: "Thirty. For my best edge." *(Sophie: "It's the market price, Father.")* "…The market can choke on it. Fine."
- *(mended)* "Thirty-five, and he says thank you." → Bernard: "He said thank you?" → "He did." → "Hm. Then it was worth the walk."
- *(returned)* "Here's your share. No pay." → Bernard: "Iron's iron. I'll draw it into something." *(If `flawFound`, Sophie quietly: "You know why it came back.")*
- *(pressured)* "He paid forty. He's not pleased." → Bernard: "Pleased isn't in the price." *(Sophie frowns.)*

## Rewards

| outcome | Player | Bernard receives | Reputation | Relations |
|---------|--------|-----------------|------------|-----------|
| settled30 | `from: bernard_purse` 8 | 30 from `treasury_home` | honesty+5 (H, V) | Bernard+5; Ralph+10; Sophie+5 |
| mended | `from: bernard_purse` 12 + Sophie sharpens one player weapon/tool (service) | 35 from `treasury_home` | helpfulness+8 (H, V), honesty+5 | Bernard+15; Ralph+15; Sophie+15 |
| returned | `from: bernard_purse` 5 | share back, no coin | — | Bernard+5; Ralph−5 |
| pressured | `from: bernard_purse` 12 | 40 (35 treasury + 5 Ralph) | honesty−8 (H), courage+3 (V) | Bernard+15; Ralph−20; Sophie−5 |

If `bernardAdmits`, Bernard from now on accepts Sophie's offer of a new hammer more readily (Q04 S7 has an extra line). No other cross-quest effects.

## Refusal, interruption, missing NPCs

- If the player abandons the share on the road, it stays there as a world item (heavy, not stolen by NPCs in v1). Ralph−10 if he learns.
- If Ralph dies, the money stays in `treasury_home`; the next reeve (if any) inherits the dispute with the same lines minus personal remarks.
- If Bernard dies, Sophie closes the quest with whatever the outcome is; payments go to the household purse.

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Named treasury/purse transfers; carried item with two states; inspection flag |
| Stub | Mending = timed craft by Sophie without player input |
| Out of scope | Full contract/ledger system |
