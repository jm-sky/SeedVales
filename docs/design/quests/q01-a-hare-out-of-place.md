# Q01 — A Hare Out of Place

**Status: proposal (N); pack A (Codex round 1), hunting 1/2.** Cast and places: [QUEST-WORLD](QUEST-WORLD.md). Four stages, three endings. Scale: small starter quest in H.

## Premise

Luke Lambert, the shepherd Molly's grown son and apprentice to the hunter Jacob Bowman, has seen a white hare beyond the hazels. Ever since, he has been counting money for a hide he doesn't have — he wants a proper hunting bag from Stephen Chapman instead of patching his old one. Jacob wants the boy to learn to look before he shoots. Stephen really would buy a white hide, but he never ordered one. The player goes out with Luke and together they decide what this chance becomes: a rare hide, plain game for the pot, or the first real knowledge anyone here has of an animal nobody has seen before.

Feel: the pleasure of a first shared outing; small pride without a ceremony.

**NPC knowledge.** Jacob knows about the hare only from Luke. Stephen knows Luke has been talking about it. Nobody knows where it feeds until the player and Luke see it.

**Start conditions.** H has hunter and shepherd households, with a grown son in the shepherd's; one white hare with a persistent ID lives at the forest edge (N; appearance: `FAUNA-09` P), never respawned. Jacob won't send his apprentice out while an active threat is near (a wolf or boar nearby postpones the start). No level gate.

## State

`accepted`, `feedingSeen`, `coverSeen`, `lukeWitnessed`, `whiteDead`, `choice = unset|pelt|ordinary|watch`, `settled`. Observations are field actions (watching from cover for a set time without spooking), not dialog. `watchComplete = feedingSeen && coverSeen && lukeWitnessed`.

| Stage | Transition |
|---|---|
| 1 The chance | A1 accept → 2. A2 (Stephen) and A3 (Luke) optional |
| 2 The field | B1 on site; observations or game → may return. B3 lets the player stop and come back next day |
| 3 Decision | C1 report to Jacob (required), C2 agree with Luke sets `choice` |
| 4 Endings | E1/E2/E3, exclusive; `settled` |

`choice` can be changed before settlement by talking to Luke again. Killing the white hare closes `watch` (unless `watchComplete` was already true — then the observation keeps its value and no epilogue claims the hare is alive). One animal gives one hide.

## Stage 1 — A white hare, apparently

### A1 — Jacob at the drying rack
Condition: quest not accepted. Luke's bag with a split strap lies nearby.

**Jacob:** Luke saw a white hare beyond the hazels. Since then he's sold the hide, bought a new bag, and spent the change.
**Player:** Has he caught it?
**Jacob:** He's told three people about it. That's a different skill.
**Luke:** Two people. Stephen was already listening when I told the first.
**Jacob:** Go with him, if you've the day. Bring back what you saw. If you bring back the hare, I want to hear why that one.
**Player [A]:** I'll go. Where do we start?
**Jacob:** Where he saw it. Then you sit still longer than he wants to. → `accepted`
**Player [B]:** Not today.
**Jacob:** Then he mends the strap and waits. Waiting won't kill him. → refusal, no effects; offered again on a later visit

### A2 — Stephen at his stall (optional)

**Stephen:** The white hare? Yes, I said I'd buy a hide like that. I say a lot of things across a counter.
**Player:** Luke took it as an order.
**Stephen:** I gathered. He's already asked me the price of the good bag twice.
**Player:** Would you buy it?
**Stephen:** A clean white hide, no arrow through the middle — yes, and well. Folk in {T} line their collars with that. A plain hare I'll take any week for the pot.
**Player [A]:** And if we come back with neither?
**Stephen:** Then nobody owes me anything, and I sell Luke a strap instead.

### A3 — Luke at the gate (optional)

**Luke:** I've mended the strap. It looks worse, but it holds.
**Player:** Bring water.
**Luke:** Already have. I was going to say that before you did.
**Player [A]:** Tell me exactly what you saw.
**Luke:** By the split hazel. It went under the branches, not over. I cut a mark in the trunk. That's — that's all, really. I saw it once.
**Player [B]:** You don't have to prove anything to me.
**Luke:** I know. I'd still like to come home with something I did myself.

## Stage 2 — Read the ground

### B1 — The split hazel
Condition: player and Luke on site. Talking completes nothing.

**Luke:** There. White hairs on the bark.
**Player [A]:** The run is low. We watch from the far side, downwind.
**Luke:** Right. I'll stay back. My boots are louder than yours — Jacob says so every morning.
**Player [B]:** Hair tells us it came by. Not when.
**Luke:** No. I nearly said "this morning" because that's when I found it.
**Player:** Let's find where it feeds instead.
**Luke:** The clover by the old fence, maybe. I'll keep my mouth shut, I promise.

### B2 — After watching it feed
Condition: `feedingSeen`. If Luke wasn't there, he only says: "Show me where. I want to see it myself."

**Luke:** Did you see that? Under the pale branches you can hardly make it out. Then it steps into the clover and — there it is.
**Player:** Easy to see isn't easy to catch.
**Luke:** I was counting coins again. Sorry.
**Player [A]:** We could take an ordinary hare and leave this one be.
**Luke:** For the pot? That's honest work. Less glory, mind.
**Player [B]:** We could keep watching. Where it feeds, where it hides, when.
**Luke:** Nobody here's ever seen a white one. Jacob would want to know where it goes, I think. Even if he'd never say so.
**Player [C]:** The hide's worth a lot. We could do that properly.
**Luke:** Properly, yes. One clean shot or none. I'm not chasing it through the wood with an arrow in its leg.

Its retreat to cover (`coverSeen`) is a separate observation: the hare goes back into the thicket by a low run when something startles it (the player can wait for a natural scare, e.g. a fox, or show themselves — that counts, but the hare won't come back that day).

### B3 — Before dusk (optional)

**Luke:** Clouds are coming over. We could stay another hour.
**Player [A]:** We've seen enough for today. Home.
**Luke:** If we hurry I'll be at the racks before Jacob. That'd be a first.
**Player [B]:** We wait — if there's water and light enough to get back.
**Luke:** Let me check. Half a skin. Less than half. We'd better not.
**Player:** Tomorrow, then.
**Luke:** After the racks. I'll ask him when he can spare me.

## Stage 3 — Decide what it's for

### C1 — Report to Jacob
Condition: back from the field. Player lines appear only for flags they have.

**Jacob [default]:** Well. What did you find?
**Jacob [opinion ≥ 25, instead]:** Sit. There's room on the bench. What did you find?
**Player [feedingSeen]:** It feeds in the clover by the old fence, then crosses open ground.
**Jacob:** Then it's either brave or new here. Where does it go when it's done?
**Player [coverSeen]:** Back into the thicket, low, under the hazel.
**Jacob:** Same path both ways? *(player confirms)* Then I could set a snare there with my eyes shut. So could anyone.
**Player [game, no observation]:** We brought a hare. I didn't watch long.
**Jacob:** Then let me see how it was taken. That'll tell me the rest.
**Player:** What would you do?
**Jacob:** Me? I'd fill the rack. But it's not my bag that's split. *(looks at Luke)* And it's not my hare he found.

### C2 — Agreeing with Luke
Condition: C1. Sets `choice`.

**Luke:** So. What are we doing?
**Player [pelt]:** The white hide. One clean shot, and we split what Stephen pays.
**Luke:** All right. If the shot isn't there, we walk away. I'd rather mend this strap a third time than botch it.
**Player [ordinary]:** An ordinary hare for Stephen and the rack. You learn to skin one you're not afraid to ruin.
**Luke:** …Yes. Honestly, the white one scares me a bit. Imagine cutting the most expensive hide in the wood crooked.
**Player [watch]:** We leave it. Watch it a few more days — where it feeds, where it shelters, whether it stays.
**Luke:** No money in that.
**Player:** No. But you'd be the first one here who knows anything about it.
**Luke:** *(pause)* Put my name on it, then. Not "the boy who saw it". Luke.

## Stage 4 — Endings

### E1 — The white collar
Condition: `choice=pelt`, the white hide skinned (I: skinning) and delivered to Stephen in good condition. Price: proposed **30–40 c** from Stephen's purse (damage lowers it; Stephen shows this in the normal trade window). Player and Luke split the payment — Luke's share is a real transfer and he buys the bag if it's enough.

**Stephen:** Hm. Hold that corner. No — to the light.
**Luke:** Is something wrong with it?
**Stephen:** No. That's what I'm checking. *(pause)* It's good. It'll go to {T}, to some merchant's wife who'll never know there was a clover field.
**Luke:** It looks smaller on the table.
**Stephen:** Everything does. The price doesn't.
**Player:** Your share, Luke.
**Luke:** *(counting)* That's the bag. That's actually the bag. — I'm keeping the old one too. The strap's good now.

Effect: the white hare is gone from the world (no respawn). Luke carries a new bag (N: NPC equipment changed by purchase). Jacob, next time: "Clean shot, I heard. Good. Don't go looking for another."

### E2 — Supper, and practice
Condition: `choice=ordinary`, fresh ordinary game (I: freshness) sold to Stephen (market price for meat and skin, about **8–12 c** total, split) or given to Jacob's rack (no coin; the meat stays in the household). The white hare lives on per the simulation.

**Jacob:** You've left too much on this edge.
**Luke:** I know. I was scared of cutting through.
**Jacob:** Give me the knife. Watch the loose bit — here. Now you.
**Player:** Stephen took the meat.
**Luke:** Less than the white one would've been. Enough for a proper strap and thread.
**Jacob:** You'll want the thread again.
**Luke:** Can I do the next one without you reaching for the knife?
**Jacob:** If you stop when you're not sure, and ask. Then yes.

Effect: Luke practises skinning (practice, no magic bonus); Jacob's opinion of the player +10 (N).

### E3 — The blank line
Condition: `choice=watch`, `watchComplete`, then one more observation on another day (the hare came back or didn't — both count, because the goal is knowledge). No coin. Jacob gives the player **snares ×2** and **arrows ×10** from his own stock (real transfer from the household inventory; proposal).

**Jacob:** Where it feeds. Where it hides. That it came back — or didn't. *(reads)* Who wrote "don't know" here?
**Luke:** Me. How long it stays. We haven't watched long enough.
**Jacob:** Good. Leave it like that. Most people fill that line with a guess.
**Player:** No hide, no coin. Was it worth it?
**Jacob:** Ask me in winter, when I know which clover still has hares on it. *(to Luke)* There's a feeding ground past the old fence-line. Two mornings. Take a spare page.
**Luke:** Paid?
**Jacob:** Two mornings. Ask me about pay when you're back.
**Luke:** *(to the player, quietly)* That means yes.

Effect: the white hare stays in the world as a rare sight (it may die later of simulation causes; epilogues never lie about it). Luke gets another observing task (dialog only, no new quest).

## Refusal, interruption, omissions

- Refusing A1: no penalty, offered again.
- Leaving the field: observations made so far are kept.
- The player kills the hare before `watchComplete`: E3 closed, E1/E2 open; if Luke didn't see it, he asks what happened (the player may tell the truth or not — a lie has no mechanical effect here, nobody has proof).
- The hare dies of other causes: E1 only if the player finds a carcass fit to skin; otherwise E2/E3 (E3 if `watchComplete`).
- Skipping Luke: the player may hunt and sell the hide alone (ordinary trade), but the quest doesn't end in E1 — Luke says "You could've waited for me." The quest closes without the relationship reward.
- Stephen absent: game must be kept until he returns (meat spoils normally; the hide doesn't).
- Luke or Jacob dies: quest closes; no lines are invented for them.

## Mechanics

I: hare, bow, sneaking, skinning, freshness, trade, NPC opinion. P: coat variant (`FAUNA-09`). N: unique animal with persistent ID, "watch animal" action (time without spooking it), NPC equipment changed by purchase, conditional dialog. Watching needs no new skill. **Author decisions:** price of the white hide (proposed 30–40 c), observation difficulty.
