# Q02 — The Hollow Below the Road

**Status: proposal (N); pack A (Codex round 1), hunting 2/2.** Cast: [QUEST-WORLD](QUEST-WORLD.md). Optional follow-up to Q01. Four stages, three endings. Scale: medium quest in V.

## Premise

On the lower stretch of the road from {H} to {V}, just before the bend, a sow with a farrow has rooted out a hollow under a fallen pine. Two days ago she ran into a carter from {V} walking beside his cart — he came away with a battered thigh and left a sack of salt in the road. Edith Fowler, {V}'s hunter, doesn't want to "clear the forest": a sow with young can be waited out, but not everyone can wait — this road goes to market and to {H}. Bridget Ward, {V}'s guard, has to decide what to do about the road and needs someone to see the hollow up close. The conflict is about risk and cost, not a villain.

Feel: tension at the hollow, then relief or a conscious acceptance of a cost.

**NPC knowledge.** Edith has seen tracks and turned ground, not the hollow. Bridget knows only the carter's account and whatever the player/Edith report. Jacob (H) knows the lower road, not this hollow.

**Start conditions.** The player has been to {V} at least once; the hollow holds a boar den with young (I: dens as spawn points; P: aggression near young, `FAUNA-07/08`). Q01 finished or Jacob's opinion ≥ 10 adds scene S2.

## State

`accepted`, `tracksRead`, `hollowFound`, `farrowCounted`, `reported`, `choice = unset|clear|reroute|watch`, `settled`. `hollowFound` needs physically reaching observing distance; `farrowCounted` needs an observation without spooking her.

## 1. The lower road

**S1 — Edith by the dropped sack of salt**

**Edith:** Don't step there. That's where he dropped it, and that's where she came out. See how the ground's turned?
**Player:** A boar?
**Edith:** A sow. The prints are small and there are smaller ones round them. She's got young somewhere close, and she's decided this bend is hers.
**Player:** The carter?
**Edith:** Bruised to the bone and lucky. He'll walk in a week. He won't walk this way.
**Player [A]:** I'll help you find where she's lying up.
**Edith:** Good. Quietly, and not at noon — she'll be lying in, and so would I. Come at first light. → `accepted`
**Player [B]:** Why not just close the road?
**Edith:** Then people go round by the marsh, and the marsh has drowned more carters than pigs have. Bridget won't close it without a reason she can point at.

**S2 — Jacob (H), if Q01 finished or opinion ≥ 10**

**Jacob:** You're going down to Edith's bend? I heard about the carter.
**Player:** A sow with a farrow.
**Jacob:** Then don't go down wanting a fight. A sow with young doesn't care how brave you are. She cares where you're standing.
**Player:** Do you know Edith?
**Jacob:** I know she doesn't guess out loud. If she says a sow, it's a sow.
**Player:** Anything else?
**Jacob:** Upwind of her, never between her and the young. And pick the tree you'd climb before you need it.

**S3 — Edith at dawn**

**Edith:** Two trails. This one's fresh — wet edges. That one's old.
**Player:** Which is safer?
**Edith:** Neither. The fresh one's just easier to read. → `tracksRead`
**Player [A]:** We follow the fresh one.
**Edith:** As far as the ground lets us. When I put my hand up, you stop. Not after one more step.
**Player [B]:** Let's come back with more people.
**Edith:** More people, more noise. I'd rather two who can stand still.

## 2. The hollow

**S4 — At the fallen pine** (after `hollowFound`)

**Edith:** *(whispering)* Under the roots. See the bedding? She's dragged half the bracken in the wood in there.
**Player:** I count five small ones.
**Edith:** Five. Spring farrow. In six weeks they'll follow her anywhere, and she'll stop guarding one hole. → `farrowCounted`
**Player:** Six weeks of nobody using this bend.
**Edith:** Or six weeks of someone deciding they won't wait.

**S5 — If the player spooks the sow**

**Edith:** Back! Behind the trunk — now! *(after a moment)* …She's stopped. She's only telling us. Walk away slowly and don't turn your back on her till the bend.

Spooking doesn't end the quest; the sow is more aggressive for a day (N).

**S6 — Back on the road**

**Edith:** Well. You've seen it. Now you tell Bridget — you saw it closer than I did.
**Player:** And if I just kill her?
**Edith:** Then the road's safe tomorrow and there are five piglets that won't see autumn. I'm not saying don't. I'm saying count it.

## 3. A road has a price

**S7 — Bridget at the {V} gate**

**Bridget:** Edith says you've been to the hollow. Tell me what you saw, not what you think I want to hear.
**Player:** One sow, five young, under the fallen pine by the bend. Fresh bedding. She came at us only when we got too close.
**Bridget:** Good. Now I can do something. → `reported`
**Player [A]:** Clear her out before the next market day.
**Bridget:** Kill her or drive her off — and with what, and who's standing where when she turns? Give me that and I'll pay for it.
**Player [B]:** Move the road uphill for the season.
**Bridget:** That's posts, a cleared track, and our woodcutters' week. And everyone grumbling about the extra climb.
**Player [C]:** Mark the bend and walk people through at set hours until the young can travel.
**Bridget:** That's my evenings for six weeks. I can do it. I'd like to hear it's worth it.

**S8 — Edith before the decision**

**Edith:** I'll walk with any of the three. They don't cost the same, that's all.
**Player:** Tell me plainly.
**Edith:** Clearing it: danger now, quiet after. The uphill track: timber and sweat. The watch: Bridget's evenings and everyone's patience.
**Player:** And the piglets?
**Edith:** Live in two of them. Maybe in the first, if you drive her off rather than kill her. Driving off a sow is harder than people think.
**Player [clear / reroute / watch]:** *(choice)* → `choice`

## 4. Endings

### E1 — Clear the hollow
Condition: `choice=clear`, `hollowFound`, den actually made unusable (I: burning a den — 5× branch + flint; combat). Driving her off with fire and noise without a kill: P/N (I currently supports only killing). Payment: **35–45 c** from `treasury_V` via Bridget after her own inspection.

**Edith:** It's cold. Nothing in there but bracken.
**Player [if driven off]:** She went east with the young. Didn't look back.
**Edith:** She'll find another root to lie under. Further from the road, I hope.
**Player [if killed]:** It's done.
**Edith:** Then we'll dress her properly — no point wasting her as well. *(pause)* The little ones I'll take to the farm, if Margaret will have them. Somebody'll raise them.
**Bridget:** I'll walk the bend myself tonight. If it's quiet, you're paid in the morning.

Effect: no den by the road; V reputation: courage +, helpfulness +. If killed: meat and hide (normal loot; piglets → V farmer household as livestock, N).

### E2 — Move the road, not the pigs
Condition: `choice=reroute`, detour built: the player brings at least half of 8 posts/beams (I: transport, wheelbarrow/handcart `TRANS-01`), V woodcutters do the rest. Payment: **20–25 c** from `treasury_V` + a free meal in V; timber the player brought is their contribution, not goods for sale.

**Edith:** Longer by — what — a hundred paces?
**Player:** And a hill.
**Bridget:** People have already complained about the hill. Good. They're complaining about the hill and not about their legs.
**Edith:** When the young can run, we pull the posts and let the old bend grow back. Or don't — the new one drains better.

Effect: lasting detour (N: working road segment), the sow stays; less risk for travellers.

### E3 — The watched bend
Condition: `choice=watch`, `reported`, six calendar weeks of escorting people at set hours (N: guard schedule). The player can take at least 3 evening shifts instead of Bridget (each: **6 c** from `treasury_V`). The quest closes when the sow and young leave the hollow (simulation) or after six weeks.

**Bridget:** Sixth week. She's gone — went down to the stream with the lot of them, Edith says.
**Player:** All five?
**Edith:** Four. One didn't make it. That happens without anyone's help.
**Bridget:** I'm writing "bend clear," not "safe forever." If she comes back next spring, we know what to do.

Effect: no building and no kill; cost: guards' time; a lasting "seasonal danger" note (N) and the problem may return in spring.

## Refusal, interruption, omissions

- Refusing S1: no penalty; Bridget closes the bend for a few days (the marsh route is longer).
- Backing off after the tracks: `tracksRead` stays; Edith doesn't claim the player found the hollow.
- Without `hollowFound`, E1 is unavailable — you can't burn a place nobody has seen.
- If NPCs (Edith, guards) solve it themselves, the quest ends as "settled by {V}"; the player gets credit only for real contributions (a report → small opinion gain, no pay).
- Player KO at the hollow: Edith drags them away (if present); the quest continues.
- Edith dies: Bridget accepts the player's report but knows nothing she wasn't told.

## Mechanics

I: boar, combat, dens (spawn), burning dens, reputation, transport (`TRANS-01`). P: behaviour near young (`FAUNA-07/08`), driving off with fire. N: road detour, guard watch schedule, seasonal danger note, piglets as livestock. **Author decisions:** does burning a den remove the spawn permanently; does a non-combat solution earn reputation like a fight.
