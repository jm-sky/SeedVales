# Quest 11 — The Bell in Blackwater

**Status:** proposal (N); pack C (Codex round 2, treasure). Reworked 2026-10-01 — see [REVIEW-2026-10-01](REVIEW-2026-10-01.md). Cast and places: [QUEST-WORLD](QUEST-WORLD.md).

**Premise:** A dry summer has dropped the marsh between {H} and {V}, and Ewa, who builds and patches boats in {V}, has seen the roof of the old Blackwater Chapel above the reeds for the first time in thirty years. Its bell was silver-clad. Its toll chest was never found. And beside it lies the drowned causeway that once let carts cross the marsh in half the time.

## Intended feel

Mud, reeds, rope and a slow approach to a half-sunk building; a big, bad-tempered animal in the way; a heavy, valuable find hauled out by hand. Then a choice about what the find is *for*.

## Meta

| Field | Proposal |
|---|---|
| Scale | Treasure expedition, marsh between H and V |
| Start | Player has visited {V}; late summer/autumn (low water; N: seasonal water level) |
| Giver | **Ewa** (V, woodcutter household; boat-builder, runs a punt in wet seasons) |
| Others | **Świętosława** (V herbalist household, elder; keeps a copy of the chapel book), **Małgorzata** (V sołtys), **Zbigniew** (T merchant, buyer) |
| Animal | an old **bull moose** that holds the reed beds in the rut (I: moose; N: persistent unique animal) |
| Stages | 5 |
| Locations | Blackwater Chapel (landmark, P `WORLD-11`), the drowned causeway, the bull's wallow |
| Main finds | silver-clad bell; iron-bound toll chest (copper ~150 c, two silver trade bars, ferry seal); causeway route |

## Characters

- **Ewa** — forties, sunburnt, laughs at her own bad luck. Wants the crossing back because a ferry is a living and a bridge-less marsh is a waste. Won't go into unsafe water for anybody's bell.
- **Świętosława** — old, slow on her feet, quick everywhere else. Her grandmother rang that bell. She has a copy of the chapel book because the original rotted.
- **Małgorzata** — {V}'s sołtys; practical; the bell and chest were bought with {V}'s common money, and she knows it.
- **Zbigniew** — {T} merchant who buys metal and old things; precise, polite, dry.

## World truth

Thirty-two years ago a spring flood broke the causeway and drowned the chapel to its eaves. The bell (bronze, clad in thin silver — valuable, not solid silver) still hangs on a beam inside, half under water. The toll chest kept by the last ferryman sits on the altar step: copper coins (~150 c), two silver trade bars (60–90 c each), toll tags and the ferryman's iron seal. Both bell and chest were paid for and kept by {V}'s common purse. The causeway is broken in two places but most of it is still under a hand's depth of water in a dry year — a route that could be rebuilt with timber.

## State

`q11.accepted`, `q11.bookRead`, `q11.causewayMarked`, `q11.chapelReached`, `q11.bellOut`, `q11.chestOut`, `q11.moose = unset|waited|lured|driven|killed`, `q11.choice = unset|crossing|sale|investor`, `q11.settled`.

## Stage 1 — A roof in the reeds

**Ewa at her boat shed in {V}**

> **Ewa:** Come and look at this. No — up here, on the bank. See that? Past the dead willows. That grey hump.
> **Player:** A roof?
> **Ewa:** Blackwater Chapel. My mother used to say you could hear its bell from the {H} road on a still morning. It's been under the marsh since before I could walk. This summer the water's dropped so far I can see the ridge-tiles.
> **Player:** And you want to go out there.
> **Ewa:** I want somebody to go out there *with* me. There's a bell in it — silver on the outside — and the old causeway runs right past. If the causeway can be rebuilt, I've a ferry business for life. If it can't, there's still the bell.

- A: "I'll come." → `accepted`.
- B: "What's in it for me?" → Ewa: "A share of whatever comes out, fair and agreed with Małgorzata before we sell anything. And mud. Lots of mud." → `accepted`.
- C: "Not now." → Ewa: "The water won't stay low past the autumn rains. Don't take too long."

**Świętosława (optional, but unlocks the causeway route)** → `bookRead`

> **Świętosława:** Blackwater? *(she laughs)* My grandmother rang that bell for every wedding in {V}. Fetch me the book — no, the other book, the green one. *(reading)* "The causeway runs from the boat-stone to the black pool, then *round* it, never across, to the chapel steps." Round it. People forgot that. They drew it straight on every map since.
> **Player:** What's the black pool?
> **Świętosława:** Deep. Deeper than the rest. Oxen went into it, the year of the flood, and didn't come out.

**Małgorzata (optional)**

> **Małgorzata:** The bell's {V}'s. Our grandparents paid for it out of the common chest, and the tolls went back into that chest. If it comes out of the marsh, it comes to {V} first. I'll see you're paid fairly for fetching it — I'm not a thief. But I'm not giving the village's bell away to the first person with a rope, either.
> **Player:** Fair.
> **Małgorzata:** Good. Then mind the moose.

## Stage 2 — The drowned road

**At the boat-stone** (a carved stone shaped like a punt at the marsh edge)

> **Ewa:** There. The stone points the way. *(she wades in to the knee)* Hard underfoot. That's the causeway.
> **Player:** And then?
> **Ewa:** *(bookRead)* Round the black pool, Świętosława said. *(otherwise)* Straight on, I think.

- Following the bend (with `bookRead`, or Survival check spotting the old stakes) → the causeway holds; mark it with stakes → `causewayMarked`.
- Going straight → soft ground at the black pool: the player sinks to the waist (I: water/stamina; N: bog). Ewa pulls them out with a pole if present. Backpack items heavier than X can be lost in the pool (N; retrievable later with a hook from a boat).

**The bull** — fresh, huge prints; a wallow of churned mud by the chapel approach; a deep, coughing grunt in the reeds.

> **Ewa:** That's him. He's been on this marsh longer than I've had my boat. In autumn he'll go through a fence to get at you. Any other time he's a big cow with ideas.
> **Player:** Options?

- **Wait** — come back at midday when he lies up in the far reeds (time cost: half a day) → `moose=waited`.
- **Lure** — cut willow and leave it upwind on the far side (he browses it; I: animals attracted by dropped food — VISION §15.3) → `moose=lured`.
- **Drive** — torches and noise (P: fear of fire) → `moose=driven`; he may come back angrier next visit.
- **Fight** — a bull moose is extremely dangerous (I: combat) → `moose=killed`; meat ~ several hundred kg, far more than can be carried.

## Stage 3 — Under the chapel roof

> **Ewa:** *(at the door)* Floor's under water — but there's a floor. Rope round the pillar, rope round me, then you go in.
> **Player:** Why me?
> **Ewa:** Because you're lighter. And because if the floor goes, I'm the one who knows how to row.

Inside: water to the waist, cold; light through the broken roof; the bell hanging askew from a black beam; an iron-bound chest on the altar step.

**The bell** — chain fused to the beam with rust. Free it by cutting the chain (I: tool with cutting capability) → the bell drops into the water: retrieve it with rope and lever (two people, or player + rope + Strength check). Striking it carelessly with a tool dents the cladding (−20% value). → `bellOut` once it is on the causeway.

> **Ewa:** *(as it surfaces, dripping)* Look at that. Thirty years and it still shines where the silver's thick.
> **Player:** It's heavy.
> **Ewa:** It's a *bell*. They don't make them light so they'll float.

**The chest** — locked; the key is long gone. It's ~25 kg. → `chestOut` once it's ashore.

> **Ewa:** Leave it shut. If we open it out here, half the coins end up in the mud and the other half in somebody's memory of how many there were.

Transport: bell ~60 kg, chest ~25 kg. Needs Ewa's punt (N: boat as transport, or two trips with a handcart along the marked causeway, `TRANS-01`). Without `causewayMarked`, carrying the bell back is impossible on foot.

## Stage 4 — The count in {V}

At Małgorzata's barn, with Ewa and Świętosława present.

> **Małgorzata:** *(the lid comes up)* Coppers — a lot of them, green as grass. Two silver bars. And this. *(the seal)* "Blackwater Crossing." *(she turns it over for a while)* My father paid tolls with this stamp on the tag.
> **Świętosława:** And the bell?
> **Ewa:** One dent, my fault. Otherwise sound. You could hang it tomorrow.
> **Małgorzata:** Then the question is where.

**Zbigniew (arrives, or the player brings word to {T})**

> **Zbigniew:** A silver-clad bell from a drowned chapel? I can sell that in the city to people who collect such things, for more than you'd think. Three hundred and fifty for the bell, if it's as you say. Bars at sixty each. I pay on inspection.
> **Małgorzata:** And the crossing?
> **Zbigniew:** Is not my business. I buy things, not marshes.

## Stage 5 — What it's for

> **Małgorzata:** Three ways I can see. Tell me which you'd back.

- **crossing** — "Rebuild the causeway with the chest money. Hang the bell at the landing for fog and floods, and let Ewa run the crossing."
  > **Ewa:** I'd need timber for the broken stretch — thirty posts — and the boat mended. I'd pay a share of every toll back to the village.
  > **Małgorzata:** The chest covers the posts. The bars cover Ewa's boat. And you get your share for fetching it.
- **sale** — "Sell the bell and bars to Zbigniew. The village gets the money now."
  > **Małgorzata:** Three hundred and fifty and the bars… that's a new granary, or the well Elżbieta keeps asking for.
  > **Ewa:** And no crossing.
  > **Małgorzata:** And no crossing. *(to Ewa)* I'm sorry.
  > **Ewa:** Don't be. It's a lot of granary.
- **investor** — *(player has ≥ 80 c)* "I'll pay for Ewa's boat myself. Hang the bell at the landing. I take a share of the tolls in return."
  > **Ewa:** You'd put your own money into my boat?
  > **Player:** Into the crossing. And yes, your boat.
  > **Małgorzata:** Then the chest pays for the causeway posts, you pay for the boat, and the tolls are split three ways. I'll write it on the board in the square so nobody can say otherwise later.

→ `choice`; `settled`.

## Endings

### E1 — The bell at the landing (`crossing`)
Condition: causeway rebuilt (N: 30 posts; player may carry some, V woodcutters do the rest over a few weeks; the player can speed it up), bell hung at the landing.

> **Ewa:** *(first crossing, cart on the causeway, bell ringing in the fog)* Hear that? That's what my mother meant.
> **Świętosława:** It sounds thinner than I remember.
> **Ewa:** You were thinner.

**Player receives:** finder's share `from: treasury_V` **60 c** + free crossings for life (N). **World:** new causeway route H–V through the marsh (N: shorter road segment, ~¼ day saved), bell as landmark. Ewa's household income rises.

### E2 — A granary and a closed marsh (`sale`)
Condition: Zbigniew pays (`from: zbigniew_purse`, ~470 c for bell + bars).

> **Ewa:** I'll take the boat to pieces for the timber. *(shrugs)* It was mostly patches anyway.

**Player receives:** finder's share **120–150 c** (a quarter of the sale, `from: treasury_V` after Zbigniew pays) — the largest cash outcome. **World:** {V} treasury grows (granary or well, N); the causeway stays drowned; Ewa returns to boat-patching.

### E3 — Shareholder (`investor`)
Condition: player pays **80 c** to Ewa (`from: player`) for the boat; causeway rebuilt as in E1.

> **Ewa:** First month's tolls. *(counts out coins into three piles)* Village. Me. You. Don't spend it all on beer.

**Player receives:** finder's share **40 c** now + **a third of tolls** (N: ~5–10 c per week when the crossing is in use, paid when the player visits {V}; nothing in floods or winter ice). Over a season this exceeds E1; it's never guaranteed. **World:** as E1.

## Refusal, interruption, missing NPCs

- If the autumn rains come before the bell is out, the chapel floods again; the quest pauses until next late summer (journal says so).
- A bell or chest left on the causeway stays there (heavy, not stolen in v1).
- If the player opens the chest alone, Małgorzata counts what's left and accepts it; if anything is missing and someone notices, ordinary theft rules apply.
- If Ewa is unavailable: no boat; transport by handcart only; E1/E3 need another boat-builder (stalls).
- If the bull is killed, its carcass draws wolves to the marsh for a few days (I: carrion attracts predators).

## Mechanisms

**Required:** landmark state (drowned/exposed), persistent unique animal, heavy items with transport limits, named payments.
**Stub acceptable:** causeway rebuilding as a timed construction flag; tolls as a weekly payout while the flag is on.
**Out of scope:** water simulation, boat physics.
