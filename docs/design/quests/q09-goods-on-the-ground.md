# Q09 — Goods on the Ground

**Status: proposal (N); pack A (Codex round 1), trade.** Cast: [QUEST-WORLD](QUEST-WORLD.md). Two stages, three endings. Scale: small quest in H.

## Premise

Stephen Chapman, {H}'s trader, is back from {T} with tools the village lacks: a saw, shearing shears, a sickle and rope. He has money, but won't spend it on goods he can't sell: in {T} timber and grain are cheap, and he has no wagon — every sack rides on a donkey. The houses of {H}, meanwhile, have little coin and plenty of heavy goods: Miles Hewer has timber, Ralph Fieldman grain, Molly Lambert wool. Everyone needs something and nobody wants to lose out. Nobody cheats; the difficulty is weight, price and trust.

**Background (soft link to G06):** Stephen fears a bad year — he says that after a weak summer grain in {T} will get dear, and he'd rather hold his coin. The player can hear this here before Stephen asks for the letter to Jack Mercer.

**NPC knowledge.** Stephen knows {T} prices and his own stock. Each house knows its own surplus, not anyone else's.

**Start conditions.** I: trade with NPCs, household stores, carrying limits, prices. P: trade with every NPC (`TRADE-02`), handing over items. N: commission, list of needs.

## State

`accepted`, `needsHeard` (counter: 0–3 houses), `stockSeen`, `deal = unset|barter|consign|order`, `delivered`, `settled`.

## Stage 1 — Who needs what

**S1 — Stephen at his stall**

**Stephen:** Half the village has been past to look at the saw. Nobody's bought it. They stroke it like a cat and walk off.
**Player:** They've no coin.
**Stephen:** They've grain, timber and wool, and I've a donkey, not a wagon. I can't eat timber and I can't sell it in {T} — they've a forest of their own.
**Player:** So nobody trades.
**Stephen:** So everybody waits and grumbles. *(pause)* If you can find me a deal I can carry, I'll make it. I'd rather sell the saw for wool than take it back up that hill. → `accepted`, `stockSeen`
**Player [A]:** Why not just lend it?
**Stephen:** Because the last thing I lent in this village came back as a story about why it broke. — No, that's unfair. Half a story.

**S2 — Miles**

**Miles:** The saw? I'd give a cartload of split wood for it. He doesn't want a cartload of split wood.
**Player:** What else have you got?
**Miles:** Two good oak planks from last winter. Seasoned. Somebody in {T} might want those — a cooper, a joiner.
**Player:** Heavy?
**Miles:** Heavier than they look. Everything worth having is. → `needsHeard+1`

**S3 — Ralph**

**Ralph:** I need the sickle before harvest. I've grain — last year's, dry, in sacks.
**Player:** Stephen says grain's cheap in {T}.
**Ralph:** This year it is. Ask him what he thinks it'll be after this summer.
**Player:** Has he said?
**Ralph:** He hasn't said. He's been buying sacks for himself, quietly. That's saying. → `needsHeard+1`

**S4 — Molly**

**Molly:** Shears. Mine are notched; I'm cutting the wool more than shearing it.
**Player:** Wool's light, at least.
**Molly:** Light and worth something in {T}, if it's clean. Mine's clean. → `needsHeard+1`

## Stage 2 — Make it carry

**S5 — Choice** (needs `needsHeard ≥ 2`; sets `deal`)

**Player [barter]:** Straight swap, today. Wool for the shears, grain for the sickle, the planks for the saw. I'll carry the heavy stuff to your store.
**Stephen:** The wool I'll take gladly. Grain — two sacks, not four, I can only store so much. The planks… *(weighing it up)* …if they're as good as he says, yes. And you carry them, because my back's already promised to the donkey.

**Player [consign]:** Take the wool and planks to {T} on commission. They get the tools now, you pay them what the goods fetch when you're back.
**Stephen:** That's trust on both sides. I keep a tally, they keep a tally, and if the planks don't sell, they come home on the donkey. I can live with that. Can they?

**Player [order]:** No deal today. Write down what everyone needs, and bring the right things next time.
**Stephen:** A list. *(pause)* That's not nothing. Half my trips I guess what people want and guess wrong.

**S6 — Carrying** (barter/consign only; I: carrying limit, D-ECON-2)

**Stephen:** You can't carry all that at once.
**Player:** Then two trips.
**Stephen:** Or the wheelbarrow behind Miles's woodpile, if he'll lend it.
**Miles:** He'll lend it. He'd like it back with the wheel on.

### E1 — Straight swap
Condition: `deal=barter`, goods physically moved (I: carrying/wheelbarrow), exchange through the normal trade window (I prices). The player gets **10 c** from Stephen "for the carrying" and a one-off discount (N).

**Stephen:** Shears to Molly, sickle to Ralph, saw to Miles. And I've a store full of things I'll have to find buyers for. Lovely.
**Molly:** *(trying the shears)* Oh — that's the sound it should make.

Effect: tools in the households (NPC work goes faster — N), goods in Stephen's store, no coin changes hands.

### E2 — On commission
Condition: `deal=consign`, wool and planks in Stephen's store, a record of who expects what (N: commission). After his next trip (a real NPC journey or simulated time, N) Stephen pays the houses what the goods fetched from his own purse; the player gets **10 c** from Stephen and **5 c** from each house (their purses).

**Stephen (back again):** The planks went to a cooper for more than I'd have asked. The wool — less. Here's the tally. Count it with me.

Effect: better prices for the houses than E1, but later and with risk (the planks may not sell — then they come back).

### E3 — The list
Condition: `deal=order`. No trade today; after his next trip Stephen brings the tools and a little more salt/iron than usual (N: a trader's stock follows the list of needs). No coin for the player; opinion of Stephen and the houses +5.

**Stephen:** Next time I'll bring two pairs of shears. One for Molly, one for whoever breaks theirs next.

## Refusal, interruption, omissions

Refusing one offer doesn't end the quest. Theft/loss of goods: ordinary reputation system. If Stephen dies, the commission freezes; his store passes to his household, with no automatic succession of debts.

## Mechanics

I: trade, stores, carrying limits, wheelbarrow (`TRANS-01`), prices. P: trade with every NPC, handing over. N: commission, list of needs shaping stock, work speed depending on tools. **Author decision:** should a trader's stock respond to a settlement's needs.
