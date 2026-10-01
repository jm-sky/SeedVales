# Q05 — The Map That Missed the River

**Status: proposal (N/P); pack A (Codex round 1), treasure expedition.** Cast: [QUEST-WORLD](QUEST-WORLD.md). Needs `WORLD-11` (landmarks, P) and `LOOT-01` (treasure, P); no cave needed. Four stages, three endings. Scale: treasure expedition between {V} and {T}.

## Premise

Rosalind Marchant, a trader in {T}, has a map drawn by her grandmother Dulcie — also a trader, who forty years ago lost her cart at a river crossing in the flood year. Dulcie survived, but in her hurry she buried her trading reserve by a stone circle, "on the east side, not in the first hollow". When she came back weeks later the water had changed course and she couldn't find the place. She drew the map from memory — with a river of three bends. Today the river has two. Percy Clark, the town scribe, thinks the map is simply wrong. Rosalind suspects the "missing" bend is an old channel, and therefore a way across.

The truth: the third bend dried up and is now an overgrown, stony bed — the only place where, in summer, you can reach the island with the circle without wading the fast current. The box lies under the eastern stone. The "first hollow" in the middle of the circle is an old diggers' pit — empty.

Feel: the delight of discovery, then real loot in hand and a decision about what to do with the knowledge of the crossing.

**NPC knowledge.** Rosalind knows the family story (inexactly). Percy knows the paper, the ink, a surveyor's mark — not the ground. Edith Fowler (V hunter), if the player knows her from Q02, knows that "below the long bend the water changes every spring". Nobody knows what's in the box.

**Start conditions.** The player has reached {T}; in the valley between {V} and {T} a "stone circle" landmark (P) exists on an island/bend. If the seed has none, the quest doesn't appear (treasure is never teleported).

## Treasure (proposal, see [calibration](QUEST-WORLD.md#reward-calibration-proposal))

An iron-bound box (heavy, ~15 kg): coins worth **~180 c** in total (silver and copper), a **gold ring** engraved with the family mark (80–150), **two emeralds** in a pouch (120–250 each), a rotted account book. Owner: Dulcie's heir, Rosalind (proof: the mark on the ring and the book). Source of value: external (D-ECON-1 allows treasure as an explicit source).

## State

`accepted`, `oldBedFound`, `circleFound`, `firstHollowSeen`, `chestFound`, `chestBroughtBack`, `choice = unset|family|ford|keep_gem`, `settled`. Digging: I (shovel, ITEM-04). Weight: I (carrying limit; two trips or a cart allowed).

## Stage 1 — A line that should be water

**S1 — Rosalind at her stall in {T}**

**Rosalind:** My grandmother drew this river with three bends. It has two. Percy says that makes it wrong.
**Player:** Rivers move.
**Rosalind:** That's what I keep telling him. He has a newer map. Newer isn't the same as truer.
**Player:** What's at the end of it?
**Rosalind:** Her strongbox. She lost a cart and two oxen at that river the spring of the great flood and buried what she could carry. She went back and couldn't find it. Spent the rest of her life saying "the river took the road."
**Player [A]:** I'll go and look at the ground.
**Rosalind:** Then I'll pay for your bread and a third of whatever's in the box, if there's a box. Bring back what you see — not what makes a better story. → `accepted`
**Player [B]:** Why not go yourself?
**Rosalind:** Because I've a stall, a sick husband and no idea how to cross a river that eats carts. You've walked from {V}, haven't you? That's more than I've done in ten years.

**S2 — Percy at the town hall (optional)**

**Percy:** I've had the paper in my hands. Old rag paper, oak-gall ink — it's genuinely forty years old, I'll give her that.
**Player:** And the river?
**Percy:** Wrong. Measured against the survey we did for the road, it's simply wrong. Three bends where there are two.
**Player:** Unless one dried up.
**Percy:** *(thinks)* …Unless one dried up. I hadn't — I've never walked that valley. I'd want to see it.
**Player:** And this mark by the circle?
**Percy:** A surveyor's sign. "Measured from here." Her grandmother must have learned it from someone who knew what they were doing. Which makes the river harder to explain away, I suppose.

**S3 — Rosalind before the player leaves**

**Rosalind:** One more thing. She always said, "not in the first hollow". I don't know what it means. Neither did she, by the end.
**Player:** I'll keep it in mind.
**Rosalind:** Bring the box closed, if you find it. I'd like to open it myself. I've waited thirty years to see her handwriting in that book.

## Stage 2 — The bend that isn't there

**S4 — The valley** (exploration; the player's map reveals terrain, fog of war I)

The player compares map and ground: the river has two bends; the island with the circle lies across a fast current (wading: risk of losing gear and stamina — I: water/terrain; N: current). Between the bends winds an arc of overgrown, stony bed (`oldBedFound`).

**Player (thought):** The third bend's still here. Dry. Full of willow — but you could walk it.

**S5 — Edith, if the player passes through {V} and knows her from Q02**

**Edith:** The valley below the long bend? Water changes there every spring. Some years there's a dry channel you can walk; some years it's knee-deep.
**Player:** I'm following a map drawn before the flood.
**Edith:** Then use the river as it is and the map as a question. And don't cross the main current with anything you can't afford to lose.

## Stage 3 — Stone and soil

**S6 — The stone circle** (`circleFound`)

**Player (thought):** Seven stones, one fallen. And in the middle — a hole, half filled with leaves. Someone dug here long ago and left in a hurry. (`firstHollowSeen`)
**Player (thought):** "Not in the first hollow." East stone, then.

Digging by the eastern stone (I: shovel) uncovers the box (`chestFound`). Digging in the first hollow finds nothing but rust from an old spade.

**S7 — The box** (opening it on the spot is allowed — no penalty, but Rosalind will know, because the lock is broken)

Transport: box ~15 kg plus whatever the player carries. Two trips along the dry bed or a handcart (`TRANS-01`). Crossing the current with a load risks dropping the box in the water (N; it doesn't vanish — it can be fished out of the shallows downstream).

## Stage 4 — What the box was for

**S8 — Opening it at Rosalind's** (`chestBroughtBack`)

**Rosalind:** *(opens it slowly)* Coins. Her book — the ink's run, but that's her hand, look at the loops. And — *(silence)* — that's her ring. She was married in that ring. She told me she'd sold it.
**Player:** And these?
**Rosalind:** Emeralds. *(leafs through the book)* "Two green stones, for Master Halm of {T}, half paid." Halm's house died out before I was born. Nobody's coming for these.
**Player:** So what now?
**Rosalind:** Now you get your third. I said a third and I meant it. But — *(hesitates)* — there's the crossing, too. You found a way over that river nobody in {T} knows. That's worth something, and I don't know to whom.

**S9 — Percy (if the player spoke to him, or Rosalind sends for him)**

**Percy:** You walked the dry bed? All the way to the island?
**Player:** Twice. With a box on my back the second time.
**Percy:** Then the survey's wrong, not her map. *(pause)* I'll have to redraw the whole lower valley. Do you know how long since anyone gave me a reason to redraw anything?
**Player [A]:** Should it be public?
**Percy:** Carters from {V} lose a day going round by the upper ford. A summer crossing would give them that day back. But it's her family's find. And yours.

**S10 — Choice** (sets `choice`)

**Player [family]:** Keep it in the family. The coins and stones are yours; give me my third in coin. The crossing stays your grandmother's secret.
**Rosalind:** *(nods)* Then she gets to have been right, quietly. I like that.

**Player [ford]:** Let Percy mark the dry crossing on the town map. Carters get their day back, and your grandmother's name goes on the bend.
**Rosalind:** "Dulcie's Bend." *(laughs)* She'd have hated the fuss. She'd have loved the name.
**Percy:** I'll walk it myself before I draw it. With you, if you'll show me.

**Player [keep_gem]:** I'll take one of the emeralds as my share instead of coin.
**Rosalind:** One stone instead of a third? *(counts)* That's — near enough the same, if you sell it well. Silas Moneypenny will give you a fair price; he gives everyone a fair price, it's his only vice.

### E1 — Back to the family
Condition: `family`. The player receives **a third of the box's cash value: proposed 150–200 c** (Rosalind sells one emerald to Silas to pay the player — a real transfer from Silas's purse to Rosalind, then to the player; `if_empty`: partial payment, the rest on a later visit).

**Rosalind:** She wore it at her wedding and on the day she lost the oxen. I'll wear it to market. Let people ask.

Effect: the dry bed stays off NPC maps (the player has it on their own map — fog of war I). Rosalind gives the player a lasting 10% discount (N) at her stall.

### E2 — Dulcie's Bend
Condition: `ford`, Percy has walked the bed with the player (movement scene: Percy as a temporary companion for one route — P `COMP-01` or a simple follow script N). The player receives **a third, as E1**, plus renown in {T} and {V}.

**Percy:** *(writing)* "Summer crossing, dry bed, knee-deep after the thaw. Found from the map of Dulcie, trader of {T}." There. Now it's true for everyone.
**Rosalind:** And the island?
**Percy:** Belongs to whoever walks to it. That's how islands are.

Effect: a new V–T route segment for NPCs and caravans (N: seasonal shortcut in the road graph), renown +; the crossing may flood in spring (N: seasonal availability).

### E3 — A green stone of your own
Condition: `keep_gem`. The player receives **an emerald ×1** (120–250 when sold) instead of coin. The crossing stays as in E1, unless the player separately proposes marking it to Percy (then E2's effect applies too — combining after the split is allowed).

**Rosalind:** Don't sell it to the first man who smiles at it.
**Player:** Silas?
**Rosalind:** Silas doesn't smile. That's why you can trust his price.

## Refusal, interruption, omissions

- Refusal: the map stays with Rosalind; after a few weeks she may ask someone else (the quest lapses without penalty).
- The player keeps the box: that's theft of Rosalind's property — ordinary reputation rules apply (honesty −, if found out: Percy knows about the trip). The quest ends without an authored ending.
- Lost map: if the player already found the bed/circle, the knowledge stays on their map; otherwise the quest waits until the map is recovered.
- Rosalind dies before the split: the box goes to her household; Percy can only vouch for the player's share (a third is paid by the household if it has the means).

## Mechanics

I: travel, map fog of war, shovel/digging, carrying limits, trade, reputation. P: stone circle landmark (`WORLD-11`), chests and valuables (`LOOT-01`), companion for a route (`COMP-01`). N: river current as an obstacle, seasonal shortcut in the road graph, trader discount. **Author decisions:** gem and ring values; whether seasonal shortcuts enter the road generator.
