# Review — 05 Disputed Oak

## Overall

The premise fits SeedVales very well: a mundane resource dispute becomes a social problem between two settlements. It can teach evidence gathering, negotiation, reputation, and the fact that not every conflict has a clean factual winner.

The current version needs a **major evidence/authority pass**. At present, the player can gather two pieces of evidence that do not actually support either side and then issue a one-sided verdict. That makes the investigation feel cosmetic.

## What works

- A boundary tree is a believable source of local conflict.
- Mirosław and Kazimierz have understandable interests.
- Keeping the oak standing is a useful non-zero-sum possibility.
- The quest does not require combat.
- The dispute can affect wood prices and settlement relations, which is a good simulation link.
- A fuzzy boundary is more interesting than a hidden document that simply declares one side correct.

## Major issues

### 1. Most evidence is not directional

Current evidence:

- bark has marks from both villages;
- boundary stone is explicitly ambiguous;
- witness says Brzeżyna side but also notes Domowice marks;
- oak age only shows that both men's stories are incomplete.

These are good **ambiguity clues**, but they do not justify a clean "Domowice wins" or "Brzeżyna wins" verdict.

The current rule "evidence ≥2 unlocks solid verdicts" is therefore too simple.

Recommended model:

Track evidence by what it supports:

- homeClaim
- brzezynaClaim
- sharedUse
- uncertainty

Then:
- one-sided verdict requires meaningful support for that side;
- peace/shared-use becomes available when evidence is mixed;
- insufficient evidence allows only "no verdict yet."

### 2. The boundary-stone text undermines itself

Current:

> "Carved line runs closer to Brzeżyna's claim than Kazimierz likes to admit — or the other way, if you squint."

This is humorous but unusable as evidence.

Choose a concrete observation, for example:

> The stone's old cut faces east-west. The oak stands a few paces north of it, but the ditch has shifted around the roots.

That creates uncertainty for a real reason: **the landscape changed**, not because the narrator refuses to commit.

### 3. Oak age is context, not ownership proof

Tree age can disprove "my father planted it" or "we planted it after the ditch was dug," but it cannot determine a boundary by itself.

Use it only if tied to a claim:
- Kazimierz says his father planted it;
- Survival shows the oak is much older;
- that specific claim loses credibility.

Evidence should rebut statements, not fill a generic counter.

### 4. Who has authority to settle a two-village boundary?

The current mediation can be hosted by either village's sołtys, who then "writes a verdict." Why would the other village accept it?

Better:
- both parties voluntarily accept the player as mediator; or
- both sołtys figures attend/ratify the settlement; or
- the player gathers evidence and brings it to a joint boundary meeting.

For a starter-scale implementation, this can still be one scene with two representatives. It does not need a diplomacy system.

### 5. The peace solution needs clearer resource logic

Current:

> oak stays; each side fells 2 non-boundary trees instead

This preserves one disputed oak by cutting four other trees. That may be acceptable economically, but the reason is unclear.

Better framing:

- oak remains a visible boundary marker;
- each side receives rights to a specific replacement tree on its own undisputed land;
- no one receives wood "from nowhere";
- the player may help mark/fell the replacements if desired.

Then the outcome solves both the symbolic dispute and the actual need for timber.

### 6. One-sided payouts should match the public nature of the dispute

Treasury payments can make sense if both villages formally commissioned mediation, but establish that in the opening or joint meeting.

If this is only Mirosław's private request, treasury_home paying 20 copper is not automatically justified.

### 7. Theft needs a more believable close

If the player fells the oak at night and then immediately tells Mirosław:

> "The oak's already down. Here's the wood."

Mirosław's reaction should depend on whether he wanted or authorized that act. The current universal relation penalty makes the branch feel detached from character motivation.

A cleaner dirty path:
- Mirosław explicitly refuses illegal felling;
- player can still do it independently;
- both sides become angry when evidence points to the player;
- wood price/trade friction rises.

## Dialog review

### Mirosław opening

Suggested:

> **Mirosław:** "Kazimierz says the old oak is on Brzeżyna land. I say the ditch put it on ours long before either of us held an axe. Before somebody cuts first and argues later, walk the boundary with me."

This gives history and urgency without sounding like a quest brief.

### Witness

Suggested:

> **Witness:** "Our sheep always turned at that ditch. That's how I learned the line. But those old cuts in the oak are Domowice marks. People have used that tree from both sides for years."

This supports the central ambiguity.

### Kazimierz

Current line about "short memories and long axes" is memorable but slightly theatrical.

Suggested:

> **Kazimierz:** "My family has treated that ditch as the line for as long as I remember. Mirosław knows that. If Domowice has better proof, show it."

Player:
- "The stone does not sit where either of you says."
- "Both villages marked the tree."
- "Then neither side should cut it until the boundary is agreed."

### Joint mediation

Suggested:

> **Sołtys:** "Nobody cuts the oak today. Put the marks, the stone, and the witness on the table. Then we decide what both villages can actually stand behind."

This makes the scene about evidence, not a menu.

### Mirosław close — peace

Suggested:

> **Mirosław:** "So the oak stays as the marker, and we take replacement timber from clear ground. I can live with that."

## Recommended revision direction

Do not make the quest secretly have a correct owner unless the evidence supports one. The strongest version is a dispute where the player discovers that **the historical boundary really is messy**, then chooses whether to resolve that uncertainty fairly, favor one side, or exploit it.

The investigation should change what claims are defensible, not merely increment a counter.
