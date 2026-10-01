# Q03 — A Roof Before Rain

**Status: proposal (N); pack A (Codex round 1), building/repair.** Cast: [QUEST-WORLD](QUEST-WORLD.md). Four stages, three endings. Scale: small private quest in H.

## Premise

Miles Hewer, the woodcutter, has been patching the roof of the house he shares with his wife Lucy, his mother Joan and their grown son Matthew for months. The last storm showed it isn't one hole: the beam over Joan's room has rotted. Miles wants to fix it all himself "after the season", because this is felling time and every day on the roof is a day without wood to sell. Lucy wants her mother-in-law sleeping somewhere dry now. The player helps judge the damage and brings the family to a decision: replace the beam, build a small dry room on the side, or prop it up until spring.

**NPC knowledge.** Joan has noticed her cupboard door sticking — nobody asked her. Miles knows the beam is bad, not how bad. Ralph Fieldman (the reeve) manages the common timber store and knows what's in it.

**Start conditions.** The woodcutter household's house has `durability < 60` (I: building condition). I: repair, building, carrying limits, work time, NPC help. N: structural inspection, household consent, lending from the common store.

## State

`accepted`, `beamInspected`, `cupboardHeard`, `plan = unset|repair|lean_to|prop`, `storeAsked`, `storeGranted`, `workComplete`, `settled`. Talk of rain starts no hidden timer; rain in the world only speeds normal building wear (I).

## Stage 1 — The room that drips

**S1 — Miles on the ladder**

**Miles:** If you've come to tell me the roof leaks, you've got good eyes and bad timing.
**Player:** Lucy asked if I could lend a hand.
**Miles:** Lucy asked for a second pair of eyes, I'd bet. Hands come after we've measured.
**Player [A]:** Show me the damage.
**Miles:** Roof first. Then the beam over Mother's room. If I start telling you it's one job, stop me. → `accepted`
**Player [B]:** I could bring timber right away.
**Miles:** Bring a measuring cord instead. I've cut enough wood to the wrong length this year.

**S2 — Lucy at the hearth**

**Lucy:** Her bed's dry when the wind's from the east. That's not what I call dry.
**Player:** Miles says the beam needs a look.
**Lucy:** Miles says a lot of things after he's lifted a beam. I want the thing he says before.
**Player:** What do you need first?
**Lucy:** One dry room for his mother. And a plan that doesn't eat next month's flour.

**S3 — Joan in her room**

**Joan:** The drip lands in the same bowl every time. I've become very good at moving a bowl.
**Player:** Has anything else changed in here?
**Joan:** The cupboard door sticks. It didn't last spring. I thought it was the damp. → `cupboardHeard`
**Player:** I'll tell Miles.
**Joan:** Tell him before he climbs up there. He doesn't listen to me once he's on a ladder.

## Stage 2 — Measure twice

**S4 — Inspecting the beam** (action: climb into the loft with a lamp/torch → `beamInspected`)

**Miles:** Outer boards are bad. The beam's worse — look, the knife goes in like it's cheese.
**Player [cupboardHeard]:** Your mother's cupboard door has stuck since spring. The wall's moving.
**Miles:** *(silent a moment)* …Then it's sagging, not just rotting. Right. That's not a patch job.
**Player [A]:** Then we replace the beam.
**Miles:** Two straight pieces, four paces long, and three people to lift. That's a proper repair. Three days, maybe four.
**Player [B]:** Or build a small dry room on the side for her.
**Miles:** Quicker. Smaller. And we shut the old room till next year. It's not a failure — it's a different cost.

Without `cupboardHeard`, Miles thinks a prop for the season will do, and `prop` is his first suggestion; the player can still propose replacement.

**S5 — Matthew**

**Matthew:** If Grandmother moves to a lean-to, I could have the small room.
**Player:** Is that what you want?
**Matthew:** I want a door that shuts. I'd also like to know the roof won't come down while I'm asleep under it.
**Player:** You'd be lifting the beam if we replace it.
**Matthew:** I know. I'm asking which week I lose, that's all.

**S6 — Miles and Lucy together**

**Lucy:** We can buy timber or we can buy extra grain for winter. Not both, not this month.
**Miles:** I'll take a felling job after the repair. That pays it back.
**Lucy:** And who fetches the water and splits the kindling while you're up there?
**Player:** I can bring the first load. The rest is for the two of you to decide.
**Miles:** Fair. Nobody counts a promise as timber.

## Stage 3 — A household decision

**S7 — The choice** (sets `plan`; both of them must agree)

**Player [repair]:** Replace the beam. The room goes back to your mother when it's done.
**Miles:** Then Matthew lifts with me, and you fetch only the pieces I've marked.
**Lucy:** If the flour stays above the winter line, yes.
**Joan:** And if you all stop calling that room "almost fine".

**Player [lean_to]:** Build a small dry room on the south side and close the old one.
**Lucy:** That gives us room, not the old house.
**Miles:** It gives us till spring.
**Joan:** Put my chair by the window. The old room never had a decent one.

**Player [prop]:** Prop the beam now, move her bed to the main room, fix it properly after the felling season.
**Miles:** That I can do in a day.
**Lucy:** And sleep next to your mother's snoring till spring.
**Joan:** I heard that.

**S8 — The common store** (only `repair`, if the household lacks two beams)

**Ralph:** Two straight beams? There are three in the common store. They're there for the next roof that falls in — which, by the sound of it, is yours.
**Player:** Can Miles have two?
**Ralph:** He can borrow two. He brings back two before the first snow, felled and squared. Same length.
**Player [A]:** Agreed — I'll help him fell them. → `storeGranted`
**Player [B]:** Couldn't the village just give them?
**Ralph:** And if the herbalist's roof goes in a month? I'll lend, not give. That's the best I've got. → `storeGranted`
**Player [C, if G05 ended `shared` or `for_h`]:** There's oak from the boundary coming in.
**Ralph:** Then that's his payback sorted, isn't it. Take them. → `storeGranted`, repayment counted

Without consent the player can buy timber from another woodcutter (I: trade) or change the plan.

**S9 — Before work starts**

**Lucy:** It hasn't started raining. That's not a reason to rush.
**Player:** The wood's here and we've all agreed.
**Miles:** Then let's start. If the wall so much as creaks, everyone stops.
**Matthew:** And if I say stop?
**Miles:** Say it twice and loud. I'm half deaf on a roof.

Work: building activity (I: construction site, NPC help). The player's help shortens it; interruption leaves partial progress in the world.

## Stage 4 — Endings

### E1 — The old house holds
Condition: `plan=repair`, beams in place, work done (house durability back to ≥ 90). Joan returns to her room. Payment: Lucy gives the player **bread ×2 and a cheese** or **10 c** from the household purse (player's choice); the store debt remains Miles's.

**Joan:** The bowl's empty.
**Miles:** The roof isn't. Mostly.
**Lucy:** We still owe the store two beams.
**Player:** I'll help bring them back.
**Miles:** You'll be welcome. Don't let me call it a favour — I'll owe you a load of firewood.

Effect: lasting repair; whole household's opinion +15 (N); Miles later gives the player a free load of firewood (one-off transfer from his pile).

### E2 — A smaller dry room
Condition: `plan=lean_to`, lean-to finished (I/N: small structure by the house). The old room is closed. Payment as E1.

**Lucy:** It's small.
**Joan:** So was the old room, once the cupboard moved in.
**Matthew:** I can carry your chair.
**Joan:** You can visit first. We'll talk about who sleeps where some other day.

Effect: new small structure; the old building stays damaged; Matthew still sleeps in the common room (a soft reason he wants to travel in Q06).

### E3 — Propped till spring
Condition: `plan=prop`, prop placed (N: temporary "prop up" action), Joan's bed moved. No pretend repair: durability doesn't recover; the house wears more slowly until spring.

**Miles:** It isn't fixed.
**Player:** No. It's held up until you can fix it.
**Lucy:** I like that better than "almost fine".
**Joan:** Write it on the board in the square, then. So people know where not to stand.

Effect: the quest can be reopened later as `repair` (same family; S7/S8/S9 suffice).

## Refusal, interruption, omissions

- Refusing S1: no penalty; the household repairs at its own pace.
- KO/attack/missing materials: work stops, unused materials stay on site, partial repair is a building state.
- If the family finishes the roof alone, the quest ends with "the family finished it"; the player isn't paid for others' work but is thanked if they brought anything.
- Miles dies: Lucy can lead the plan if she took part in S6/S7; otherwise the quest lapses.

## Mechanics

I: buildings and durability, construction site, NPC help, carrying limits, timber trade. N: structural inspection, common store with in-kind loans, temporary prop, lean-to. **Author decisions:** should a prop be a separate building object; rules for borrowing from a settlement store.
