# Q07 — Six Bowls, One Pan

**Status: proposal (N/P); pack A (Codex round 1), food/social.** Cast: [QUEST-WORLD](QUEST-WORLD.md). A light quest with no threat; three endings. Scale: small quest in H.

## Premise

After a week of felling, Lucy Hewer wants one proper meal with the whole house and with the neighbours they owe. She has six bowls, one pan, meat of varying freshness and too few hands. Mark Hornblower the guard has his rounds, Miles has to mind the pitch fire for the roof, Joan doesn't like crowds, and Matthew has invited someone without asking. The player helps put things in order — nobody "wins" a supper. Choices change who eats together and what is left for later.

**NPC knowledge.** Lucy knows her stores. Mark knows his rota. Nobody knows whom Matthew has invited (Luke — Molly's son; if Luke doesn't exist in the seed, any young man of H).

**Start conditions.** The woodcutter household exists; the player has opinion ≥ 10 with it (e.g. after Q03) or once brought them food. I: freshness, campfire, food. P: pan/grill capacity (`FOOD-03`), gifts/relations. N: meal plan, standing in on the watch.

## State

`accepted`, `freshnessChecked`, `guests = unset|together|shifts|doorstep`, `markCovered`, `cooked`, `settled`. Portions: 6 (or 7 with Matthew's guest). Capacity: pan = 2 pieces at a time (APPENDIX), bare fire = 1, grill (P) = 4+.

## Scenes

**S1 — Lucy at the food chest**

**Lucy:** Six bowls and one pan. That's enough if nobody expects the pan to do miracles.
**Player:** Who's coming?
**Lucy:** Miles, his mother, Matthew, you, me — and Mark, if his rounds let him. He split our kindling all last week when Miles was laid up. I owe him a hot meal.
**Matthew:** I asked Luke, too.
**Lucy:** *(turns slowly)* You asked.
**Matthew:** He's bringing a hare.
**Lucy:** …Then he's welcome. And you're washing seven bowls. → `accepted`

**S2 — The stores** (action: examine the meat → `freshnessChecked`)

**Player:** This piece won't last till tomorrow. That one's fine for days.
**Lucy:** Then the old one goes in first, and nobody hides it under the onions.
**Joan:** In my mother's house we'd have salted it and pretended.
**Lucy:** Your mother's house had stronger stomachs.
**Player:** One pan, two pieces at a time.
**Lucy:** Then we count pieces, then people, then how long the fire lasts. In that order.

**S3 — Mark at the gate**

**Mark:** A meal? Lucy's? *(sighs)* I've the dusk round and the night round, and nobody to take either.
**Player:** How long could you sit down?
**Mark:** Long enough to burn my tongue.
**Player [A]:** I'll walk the dusk round for you. You eat with everyone.
**Mark:** You'd do the gate and the posts? All six of them, and light the two by the pens? *(the player confirms)* …Then I'll come. Bring the torch back lit. → after the round is done (N: short round lighting torches, I: torches) `markCovered`
**Player [B]:** Eat first, go after. We'll keep a bowl hot for later.
**Mark:** That I can manage.
**Player [C]:** We'll eat by the door, so you can come and go.
**Mark:** On the step? I've eaten in worse places. The gatehouse, for one.

**S4 — Miles at the pitch kettle**

**Miles:** I can't leave the pitch. If it boils over, the roof's done for another month.
**Lucy:** Then you'll eat standing up, like a horse.
**Player:** I can watch the pan while you two sort the pitch.
**Lucy:** You can. If you burn it, it's your bowl that gets the burnt bit.

**S5 — Joan in the corner**

**Joan:** Seven people round one fire. I'll be the one with smoke in her eyes.
**Player:** Where would you like to sit?
**Joan:** Somewhere I can hear the talk without having to join it. I'm old, not unfriendly.

**S6 — Cooking** (action: frying in batches — I: cooking at a fire; P: pan of 2)

**Lucy:** Cooked on the board, raw in the bowl — don't let them touch.
**Joan:** I'm amazed anyone needs telling that.
**Lucy:** You'd be amazed what Miles needs telling.
**Luke (if he came):** I skinned the hare myself. Jacob only fixed one edge.
**Lucy:** Then you'll eat a piece of it yourself first, in case.

**S7 — Choice** (sets `guests`; needs `freshnessChecked`)

**Player [together]:** *(needs `markCovered`)* Everyone at one table. I've walked Mark's round.
**Mark:** I'll take the end seat. I can see the path from there. Habit.
**Player [shifts]:** Two sittings. The first lot eats, the second takes over the fire and the gate.
**Miles:** I could eat sitting down for once. I'd like that.
**Player [doorstep]:** We eat on the doorstep, so Mark and Miles can come and go.
**Joan:** Less cosy. More honest. I'll have the bench by the wall.

**S8 — The meal**

**Lucy:** No speeches.
**Matthew:** I'd got one ready.
**Lucy:** Eat it instead.
**Mark:** The sauce is better than the gatehouse.
**Miles:** The gatehouse isn't edible.
**Mark:** You've never been that hungry.

## Endings

**E1 — One table.** Condition: `guests=together`, `markCovered`, all portions cooked within freshness. Effect: NPC social need met (I: needs); Lucy's, Miles's and Mark's opinion of the player +10 (N); Mark from now on lets the player take torches from the rack by the gate (N). Household stores used. No coin — the player eats with them.

**Joan (epilogue):** Seven at one table. The last time was Miles's wedding, and half of them were drunk.

**E2 — Two sittings.** Condition: `guests=shifts`, two batches, a safe portion kept back for the second shift. Effect: everyone fed, less time together (opinion +5), fuel and food use visible in the stores.

**Miles (epilogue):** I ate it sitting down. Warm. Don't tell anyone, they'll expect it.

**E3 — On the doorstep.** Condition: `guests=doorstep`, meal finished at the door. Effect: Mark doesn't miss his round; passing neighbours each get a bite (N: the village's opinion of the household rises a little); relations with the household grow less.

**Joan (epilogue):** We fed half the street and nobody had to pretend the house was bigger than it is. That'll do.

## Refusal, interruption, omissions

- Refusal: Lucy cooks for the house herself; no effects.
- Interrupted cooking: food spoils only at the normal rate (I).
- Spoiled meat served: normal illness risk (I: `illnessChance`); Lucy knows who was minding the pan (opinion −).
- Mark called away to a real threat: E1 unavailable that day; the meal becomes E2 or E3.

## Mechanics

I: freshness, campfire, food, needs, torches. P: pan/grill capacity (`FOOD-03`), relations and gifts. N: standing in on a watch round, meal plan, torch permissions. **Author decision:** does a shared meal have its own "social" need effect.

## Implementation notes

Implemented by `quests--001` step 4 as `src/game/data/quests/q07.ts`. Deviations and stubs:

- **Casting by role.** `lucy` = woodcutter spouse (giver), `miles` = woodcutter head, `mark` = guard head (required), `joan` = elder, `matthew` = son/child, `luke` = shepherd son/child (optional). Names are the generated ones.
- **Start:** Q03 is done **or** the woodcutter's wife has opinion >= 10 of the player.
- **Portions.** The meal needs **4 pieces of roast meat** from the player (consumed at the meal), not 6-7 portions; Lucy's household bread is not counted. The pan roasts 2 pieces at a time as in `FOOD-03`. E2 needs two roast batches (counter of `roast` events), E1 needs Mark's round, E3 needs neither.
- **S2 stores:** the freshness of the meat is not shown; "Look at the meat" sets `freshnessChecked` and moves up to 2 raw meat from Lucy's store to the player (partial when she has none; the player can hunt or buy meat instead). Spoiled meat / illness at the table is not modelled.
- **S3 Mark's round (review 014 #1, #6).** Option A sets `roundAccepted` and `roundDay`. Mark is held at the settlement campfire **only from 16:00 to midnight of that day** (rule `roundHold`; never by day, never on later days), and meanwhile leaves to eat/drink/sleep if a need turns critical. If the player misses the dusk, Mark's "The dusk round" topic offers "I'll walk your round tonight" (`round_again`), which re-arms the hold for the current day. The round is a counter: every torch post of the home settlement counts once between 16:00 and 24:00, either lit by the player or **already burning when the player stands within 4 m of it** (Mark may have lit it); the journal and Mark's wait text say so. When all are counted, Mark is held at Lucy's house until midnight at the latest, then returns to duty (the meal may still be served later). Options B and C are only conversation (no hold). A 4-day timeout (`since` 96 h from acceptance) lapses the quest and releases Mark; the design has no timeout, this keeps a guard from being held forever. "Mark called away to a real threat" is not modelled (a held NPC keeps the fight/flee options, but E1 stays available).
- **Luke / Matthew's guest:** lines only; no hare, no extra portion.
- **Endings.** All three consume the meat and raise the social need of every guest slot (+40 / +25 / +20 on `vitals.social`). Opinions: E1 Lucy/Miles/Mark +10, Joan/Matthew +5; E2 Lucy/Miles/Mark +5; E3 Lucy/Miles +3. E3's "village opinion rises a little" = reputation helpfulness +2 (E1 +3).
- **Mark's torch rack (E1):** afterwards Mark's dialog has a topic ("Torches", offered after the quest is done) that moves one torch from Mark's household store to the player, once per game day (partial when he has none); the limit is also a `when` on the option, so a scripted second call the same day gives nothing (review 014 #3).
- **Start (review 014 #10):** "Q03 done" counts only when the player had accepted Q03 (`quest ... started: true`); a Q03 the family finished on their own does not unlock Q07 (opinion >= 10 still does).
- **Grill (P)** is not needed; capacity uses the existing pan.
- Dialogs S4 (Miles at the pitch kettle) and S5 (Joan) are ambient topics; the pitch fire has no mechanics.
