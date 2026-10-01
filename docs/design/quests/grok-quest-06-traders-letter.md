---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — no secret opening of an entrusted letter (pack bans betrayal); the recipient reads it and asks the player's view; "warn Janko about his own deal" contradiction removed; roadActive removed
---

# 06 — Trader's Letter

**Premise:** Stanisław, {H}'s trader, asks the player to carry a sealed letter to Janko, the trader in {V}. It's a proposal: after a poor summer, the two of them should hold grain prices high together. Janko reads it in front of the player — and, since the player knows both villages, asks what they think.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md). Soft link: [Q09](q09-goods-on-the-ground.md) (Stanisław quietly buying sacks).

## Meta

| Field | Value |
|-------|-------|
| Scale | Medium; H → V → H |
| Start | Stanisław relation ≥10, or after Q09 |
| Stages | 3 |
| Giver | **Stanisław** (H trader) |
| Recipient | **Janko** (V trader) |
| Others | **Małgorzata** (V sołtys), **Radosław** (H sołtys), V farmers (one line) |
| Mechanics status | I: trade prices, purses. N: `letter_stanislaw` item (sealed), `priceMod.grain` scalar per settlement, rumor tick |

## Characters

- **Stanisław** — careful, anxious about a bad year; not greedy so much as afraid of being the one left with empty shelves. Believes high prices now prevent hunger later ("people buy less and waste less").
- **Janko** — younger, louder, more confident; cares about his reputation in {V} more than he admits.
- **Małgorzata** — {V}'s sołtys and a farmer herself; she sells grain to Janko.

## World truth

The summer was poor. Both traders have been buying grain quietly. The letter proposes a single asking price for a season, well above normal, and that neither undercuts the other. It doesn't break any law the villages have, but it would hurt the poorest households before winter. Janko hasn't decided. The letter is sealed with Stanisław's wax; the player never needs to break it — Janko opens it himself.

## Flags

| Flag | Meaning |
|------|---------|
| `q06.stage` | 1 → 2 → 3 |
| `q06.askedContents` | Player asked Stanisław what's in it and got an honest answer |
| `q06.farmersHeard` | Player heard from {V} farmers that both traders are hoarding |
| `q06.result` | `agreed` \| `capped` \| `refused` \| `public` |

Breaking the seal is a normal world action (N); it is not part of any authored outcome. If the player opens the letter, Janko notices and refuses to discuss it with them (`result=refused` without the advice scene; Stanisław−15 when he hears).

## Stage 1 — A sealed letter

**Opening — Stanisław in his storeroom, among more sacks than usual**

> **Stanisław:** You're going to {V}? Take this to Janko. Into his hand, not his boy's. I'll pay ten coppers when you're back and he's read it.
> **Player:** What's in it?
> **Stanisław:** Business between traders.

- A: "Fine. Into his hand." → receive `letter_stanislaw` (sealed); `stage=2`.
- B: "I'd like to know what I'm carrying." → Stanisław sighs: "Grain. The summer was bad and it'll be worse by spring. I'm proposing that Janko and I keep one price — a high one — so nobody sells cheap in autumn and runs out in March. It's not a crime. You can see why I didn't want it read out on the square." → `askedContents=true`; receive letter; `stage=2`.
- C: "I don't carry letters I'm not sure about." → refuse; Stanisław: "Fair. I'll send it with the carter." *(The world proceeds: Janko gets it a week later; see Refusal.)*

## Stage 2 — {V}

**V farmers by the barn (optional)** → `farmersHeard=true`

> **Farmer:** Janko's buying, but he won't say what he'll sell for. Same as your Stanisław, I hear. Everyone's buying and nobody's selling. That's how you know it's going to be a hard winter.

**Janko in his shop**

> **Janko:** From Stanisław? *(breaks the seal, reads, reads again)* Huh. *(looks up)* You know what's in here?

- *(askedContents)* "He told me. One price, high, for the season."
- *(otherwise)* "No." → Janko: "One price for grain, high, for the season, and neither of us undercuts the other. He's frightened of the winter. So am I, if I'm honest."

> **Janko:** You walk between our villages. You see who's got what. What would you do?

- A: "Agree. If both of you hold your stock, nobody runs out in March." → Janko: "That's what I was hoping someone would say." → `result=agreed`; `stage=3`.
- B: "Agree on a price — but cap it, and keep back grain for the poorest households at the old price." → Janko: "A cap. And a reserve. *(slowly)* Stanisław will grumble about the reserve. But he'll sign, because he'll see I've signed. Write it under his letter — I'll add my mark." → `result=capped`; player carries the amended letter back; `stage=3`.
- C: "Don't. People will remember who made bread dear in a bad year." → Janko: "…They will. My mother will, for one. Tell Stanisław no. Politely." → `result=refused`; `stage=3`.
- D: *(farmersHeard)* "This should be decided in the open, by both sołtyses, not between two shops." → Janko: "You'd take it to Małgorzata?" → Player: "With you, if you'll come. Not behind your back." → Janko: "…Fine. If it's done, it's done properly." → go to **Public meeting**.

**Public meeting (only D)** — Małgorzata's yard, with Janko; Radosław is sent for or attends by message (N: letter between sołtyses — stub as a one-line delay of one day)

> **Małgorzata:** One price for the season. I sell to Janko; I'd get a good price. And I'd pay it back double at Easter buying flour. *(to Janko)* Hold your stock, but no higher than last winter's price, and the poor households take first.
> **Janko:** That's near enough what was suggested to me already.
> **Małgorzata:** Then write it, and I'll have it read in both villages.

→ `result=public`; `stage=3`.

## Stage 3 — Back to Stanisław

> **Stanisław:** Well? Did he read it?

- *(agreed)* "He agreed." → Stanisław: "Good. *(relief, then something less comfortable)* Good. Ten coppers, as I said."
- *(capped)* "He agreed — with a cap, and grain kept back for the poor at the old price. His mark's under yours." → Stanisław reads: "A reserve. Out of my stock." *(long pause)* "…My father ran out of flour the winter I was eight. He'd sold cheap in autumn. — All right. I'll sign. Ten coppers, and two more for walking it back."
- *(refused)* "He said no. Politely." → Stanisław: "Politely. *(dry)* That's something. Here's your ten. You carried it; that was the job."
- *(public)* "It's been read out in both villages. One price, capped, poor households first." → Stanisław: "You took my letter to the sołtys." → Player: "With Janko, in the open. Your name's on it as the one who proposed holding stock." → Stanisław: "…That's not how I'd have done it. It's not wrong, either. I'll pay what I promised. Next time I'll ask a different courier."

## Rewards and world effects

| result | World (one season) | Player | Reputation | Relations |
|--------|-------------------|--------|------------|-----------|
| agreed | `priceMod.grain` +40% in H and V | `from: stanislaw_purse` 10 | — (no one knows; if rumor ticks after 3 days: honesty−5 in V) | Stanisław+15; Janko+10 |
| capped | `priceMod.grain` +15% in H and V; poorest households buy at base price (N) | `from: stanislaw_purse` 12 | helpfulness+5 (H, V) when the reserve is used | Stanisław+10; Janko+15 |
| refused | no change | `from: stanislaw_purse` 10 | — | Stanisław+0; Janko+10 |
| public | `priceMod.grain` +15%, announced; reserve for poor households | `from: stanislaw_purse` 10 + `from: treasury_V` 10 | honesty+10, renown+5 (H, V) | Stanisław−10; Janko+10; Małgorzata+20; Radosław+10 |

## Refusal, interruption, missing NPCs

- If the player refuses, the carter delivers the letter; Janko agrees (default world outcome `agreed`) unless the player later talks to him (then Stage 2 advice is still available).
- If the player loses the letter, Stanisław writes another (one day).
- If Janko dies, his household's trader doesn't inherit the proposal; quest closes, pay 10 for the trip.

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Sealed letter item; `priceMod.grain` per settlement for a season; four results |
| Stub | Rumor as a 3-day tick; public meeting as one scene + journal note |
| Out of scope | Full market simulation |
