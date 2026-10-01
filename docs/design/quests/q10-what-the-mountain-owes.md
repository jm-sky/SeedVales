# Q10 — What the Mountain Owes

**Status: proposal (N/D); pack A (Codex round 1), gold mine (VISION §26.2).** Cast: [QUEST-WORLD](QUEST-WORLD.md). The pack's largest quest. Needs `QUEST-03` (D), a cave/adit `WORLD-05` (D), an outpost `SET-04` (D), a miner `NPC-06` (D). A target scenario, not a v1 promise. Four stages, three endings.

## Premise

Agnes Collier, a miner who came down to {T} after a collapse at the mine where she worked, has found an old adit above a stream — overgrown, with the remains of wooden rails and a quartz vein shot with yellow threads. She won't go further alone: the gallery is flooded past the first bend, and the air in the dead-end side passages can kill. Silas Moneypenny, a {T} merchant, wants to buy the rights at once — paying for the risk that there's nothing there. {T}'s alderman, Baldwin Alderman, would like the town to get something out of it, but won't send people in blind. The player goes into the adit with Agnes, brings out a sample, finds out what's really there, and decides with them how to work it.

Feel: going down into the dark, real gold in your hand, then the weight of deciding who carries the cost.

**World truth.** The adit was cut over a hundred years ago and abandoned when the lower level flooded. The vein is real but narrow; the richer part lies beyond the flooded gallery. In a side chamber lie the old miners' tools and a leather pouch of gold nuggets — someone left them before fleeing the water.

**NPC knowledge.** Agnes knows mining, not this adit. Silas knows prices and people in {T}, not mountains. Baldwin knows the treasury and the families who could work. Nobody knows about the pouch.

## State

`accepted`, `aditEntered`, `badAirMet`, `sideChamberFound`, `pouchFound`, `sampleTaken`, `floodedGalleryMeasured`, `choice = unset|sell|share|town_season`, `outpostBuilt`, `firstLoadWeighed`, `settled`.

## Stage 1 — A yellow thread in white stone

**S1 — Agnes in {T}, at the forge, sharpening her pick**

**Agnes [Q05 finished]:** You're the one who walked the old river valley? Good.
**Agnes [default]:** You've come a long way to stand in a forge.
**Agnes:** I need someone who looks where they step.
**Player:** For what?
**Agnes:** An old adit above the stream, half a day up. There's quartz at the mouth with gold in it — real, I put my knife to it. Past the first bend it's under water and I'm not going in alone.
**Player:** How much gold?
**Agnes:** Enough to go and look. Not enough to start buying a new house. Don't let anyone in this town hear you say "gold" louder than that.
**Player [A]:** I'll come.
**Agnes:** Bring a lamp you trust, rope, and a candle you don't need. → `accepted`
**Player [B]:** Why not sell it to Silas and be done?
**Agnes:** Because I know what happens to a mine when the man who owns it has never been inside one. I came here from one.

**S2 — Silas (optional)**

**Silas:** Agnes's adit. Yes, she told me. I'll buy the claim today, sight unseen, for a sum I can afford to lose.
**Player:** How much?
**Silas:** Two hundred now. Four hundred more if your sample assays. I'd rather overpay for a question than pay later for the answer.
**Player:** And if there's nothing?
**Silas:** Then I bought a hole in a hill. I've bought worse. A ship, once. It sank before I saw it.

**S3 — Baldwin (optional)**

**Baldwin:** If there's gold, the town wants a say. If there's a collapse, the town gets the widows. You see my problem.
**Player:** Would {T} send people?
**Baldwin:** If I know where they'll sleep, what they'll drink, and who tells them to stop. I won't send families after a rumour.

## Stage 2 — Into the adit (D: cave)

**S4 — The entrance** (`aditEntered`)

**Agnes:** Timbers are rotten at the mouth, sound further in — the damp's kept them. Don't touch the props. If you have to lean on something, lean on rock.
**Player:** Rails?
**Agnes:** Wooden ones. They pushed the ore out in barrows on planks. A hundred years, I'd say. More.

**S5 — The side chamber and the candle** (`badAirMet`, `sideChamberFound`)

**Agnes:** Stop. Light the candle and hold it low.
**Player:** It's — shrinking. Going blue.
**Agnes:** Out. Now. Walk, don't run, breathe slow. *(outside)* …Bad air. Sits in the low places like water. That chamber's a grave for anyone who goes in without a draught.
**Player:** We need to get in there.
**Agnes:** Then we make a draught. Cloth on a frame at the mouth, swing it for an hour, and the candle tells us when.

Ventilation: N ("air out" action — time + cloth ×2 + wood). Going in without it: the player blacks out after a few seconds (I: player KO, never death); Agnes drags them out if present.

**S6 — The pouch** (`pouchFound`)

**Player:** Tools. A pick with the head rusted to lace. And a pouch under the stone ledge.
**Agnes:** *(opens it)* …Look at that. Somebody left in a hurry and meant to come back.
**Player:** How much is it?
**Agnes:** Enough for a winter. Maybe two, if you're careful. It's yours — you went in. I'll have the knowledge.

Pouch: gold nuggets worth **80–120 c** (proposal, LOOT-01). Ownership: the player's find (abandoned over a century ago, no heirs — N finder's rule, author decision).

**S7 — Sample and flooded gallery** (`sampleTaken`, `floodedGalleryMeasured`)

**Agnes:** The vein runs down. Under the water. That's where the old crew gave up.
**Player:** Can it be drained?
**Agnes:** With a sough — a drain cut out lower down the hill. A season's work for six people. Or with buckets, forever.
**Player:** And the part we can reach?
**Agnes:** Narrow. Real. Enough to pay its own way if nobody gets greedy.

## Stage 3 — Who carries the cost

**S8 — Council at the town hall table** (needs `sampleTaken`)

**Baldwin:** So. Real, but narrow. Rich, but under water.
**Silas:** My offer stands. Six hundred, all told, now that there's a sample. Then it's my water and my risk.
**Agnes:** And my old crew would come up from the mountains to dig it for him, and he'd pay them by the sack, and nobody would ask about the air.
**Silas:** I would ask about the air. I'm greedy, not stupid.
**Baldwin:** Or the town runs it. Small. One season at a time, closed before the snow.
**Player:** Or the three of you share it — his money for the drain, the town's people, her eyes.
**Silas:** A share. *(pause)* I can do a share, if somebody honest keeps the scales.
**Agnes:** I'll keep the scales. I'll also keep the right to say stop.

**S9 — Choice** (sets `choice`)

**Player [sell]:** Sell to Silas. Agnes gets her finder's part, I get mine, the town gets a fee.
**Silas:** Done. Witnessed by Baldwin, paid today.
**Agnes:** *(quietly)* I'll go and tell my old crew there's work. They'll be glad. I won't be there to watch.

**Player [share]:** Build a camp, cut the drain, share the ore — Silas funds it, the town sends people, Agnes runs the face.
**Baldwin:** A share, measured at the scales, every load. I'll put it to the town.
**Agnes:** Then I want a hut by the mouth and the last word on the air.

**Player [town_season]:** The town works the part we can reach — one season, no drain, closed by the first snow.
**Baldwin:** Small and slow. I can sell that to the families.
**Silas:** And I'll buy the ore at a fair price, since I'm not allowed to buy the mountain.

## Stage 4 — Endings

### E1 — Sold once
Condition: `choice=sell`, `sampleTaken`. Silas pays **600 c** from his purse/capital (N: an LG merchant has an investment pool — to calibrate): **player 250–300 c**, Agnes 200, `treasury_T` 100–150 (split proposed, agreed in S9).

**Silas:** The hole is mine. I'll send men up next month.
**Agnes:** The mountain didn't sign anything.
**Silas:** No. That's why I paid before it could change its mind.

Effect: the town has no say over the mine; Silas eventually hires miners (N/D). No future income for the player.

### E2 — A share at the scales
Condition: `choice=share`, `outpostBuilt` (D/N: shelter, water, tools — the player supplies some materials), sough cut (N: about one season of calendar time), `firstLoadWeighed`. The player receives **10% of every weighed load** (proposal: ~25–40 c per load, once per calendar week, from real ore sales to Silas — D-ECON-1: ore is a new good entering the economy, author decision). No loads = no payouts.

**Agnes:** First load. Smaller than his six hundred.
**Player:** And the next one exists only if the mine does.
**Silas:** I dislike the stop clause. I'll keep it.
**Baldwin:** Write down the name of everyone who goes in. Every day. That's my clause.

Effect: an outpost by the adit (D), steady income depending on NPC work and safety; a collapse or flood stops payouts and creates no player debt.

### E3 — One season
Condition: `choice=town_season`, a season worked and the adit closed before snow. The player gets **a one-off 120–180 c** from `treasury_T` after the ore is sold to Silas + renown in {T}.

**Baldwin:** The camp's closed. Everyone's home. Everyone.
**Agnes:** I marked the props that'll need changing in spring.
**Player:** What did the mountain owe us?
**Agnes:** Nothing. We owed it care, and we paid.

Effect: smaller, local income; the deposit can be reassessed next year (the quest can reopen as `share`).

## Refusal, interruption, omissions

- Refusal: Agnes finds someone else; after a month Silas buys the rights himself (the world moves on: E1 without the player).
- No sample blocks S8.
- KO in bad air: the player wakes outside (if Agnes was there) or in the chamber after a while, weakened (I: KO — costs time and health, no item loss).
- Agnes dies: her knowledge goes with her unless the player was there for S7; Silas doesn't know parameters he never heard.

## Mechanics

D: caves/adits, outposts, miner, gold ore in the economy. I: treasury, trade, building, player KO. N: bad air and ventilation, finder's rule, a merchant's investment pool, share of loads. **Author decisions:** is the mine one quest or a template per deposit; how much gold enters the economy; the finder's rule.
