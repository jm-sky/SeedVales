# Q04 — The Handle Remembers

**Status: proposal (N); pack A (Codex round 1), smithing.** Cast: [QUEST-WORLD](QUEST-WORLD.md). Three stages, three endings. Scale: small, intimate quest in V.

## Premise

In the {V} smithy the handle of old Bernard Smith's hammer cracks. His daughter Sophie has run the forge for two years, but Bernard still comes in for the fine work — blade edges, rivets, thin plate — and always with that one hammer. Sophie wants to make him a new, lighter one, because she can see it jars his wrist. Bernard says the hammer's fine, only the handle got old. Both are partly right: the head has a hairline crack by the poll that makes it shiver on the rebound — same work, same wrist, worse forgings. The player helps run a test, and the family decides: reforge the head, make a new hammer, or hang the old one on the wall.

**NPC knowledge.** Sophie knows her father's wrist hurts. Bernard knows his last plowshares came out worse and has told nobody (link to G02). Neither knows about the crack before the test.

**Start conditions.** V has a blacksmith household with at least two people. I: smith, orders with deposit (`CRAFT-02`), durability, materials. N: tool test, keepsake item.

## State

`accepted`, `bernardTold`, `testDone`, `crackFound`, `choice = unset|reforge|new|keepsake`, `orderPlaced`, `settled`.

## Stage 1 — A cracked handle

**S1 — Sophie at the anvil**

**Sophie:** Cracked along the grain. Right where his hand goes. That's not the place you want a crack.
**Player:** Can it be fixed?
**Sophie:** I can put a new handle on it in an afternoon. Or I can make him a new hammer, which he'll hate. Those aren't the same job.
**Player [A]:** Let your father show me how he uses it.
**Sophie:** Yes. Please. He'll be insulted, and then he'll show you everything. → `accepted`
**Player [B]:** Just make a new one.
**Sophie:** You tell him. I've tried three times.

**S2 — Bernard on the bench outside the smithy**

**Bernard:** I had this hammer before she could lift the bellows.
**Player:** Then you know its balance better than anyone.
**Bernard:** I know *my* balance. The hammer's changed less than my knees have.
**Player:** What work does it do best?
**Bernard:** Edges. Thin work. Not the heavy drawing-out, I leave that to her now. — Ask her the numbers. I just know when it feels wrong.
**Player [A]:** And lately? Does it feel wrong?
**Bernard:** *(long pause)* The last few shares I did came out — not bad. Not like they used to. I put it down to the iron. → `bernardTold`

**S3 — Test on cold iron** (action: the player holds a bar while Bernard strikes, or strikes themselves — no smithing skill required)

**Sophie:** One test. Cold iron. No showing off.
**Player:** Why cold?
**Sophie:** Heat hides a bad hammer. Cold shows you where the blow goes.
**Bernard:** It goes into my wrist.
**Sophie:** Exactly.

## Stage 2 — Two kinds of good

**S4 — After the test** (`testDone`; looking at the head closely → `crackFound`)

**Player:** It lands true. But it shivers on the way back up.
**Bernard:** It didn't do that last winter.
**Player [crackFound]:** There's a hairline crack by the poll. It's in the head, not the handle.
**Sophie:** *(takes the hammer, turns it to the light)* …There. There it is. Father, that's been in there months.
**Bernard:** *(quietly)* The shares.
**Sophie:** What about the shares?
**Bernard:** Nothing. Later.

Without `crackFound` Sophie suspects a crack but can't be sure; `reforge` is unavailable (you don't reforge what you haven't examined).

**S5 — What next**

**Sophie:** Three ways. New handle on the old head — no, not now, not with that crack. Reforge the head: I draw it out again, it comes out shorter, maybe a little lighter. Or a new hammer from new iron.
**Player:** Which would you choose?
**Sophie:** For a tool? Whatever survives the work. Tell me what work he's going to do.
**Bernard:** Whatever I like. And changing my mind.

**S6 — Bernard alone**

**Bernard:** If she reforges it, there's no old hammer left. It's just a smaller one with the same name.
**Player:** Is that what bothers you?
**Bernard:** That's what I said. What bothers me is a different word.
**Player [A]:** You could keep the old head and have a new one made.
**Bernard:** Two hammers. Like a rich man.
**Player [B]:** It might be time to let it rest.
**Bernard:** Hm. Maybe it's earned that. Maybe I have.
**Bernard [G02 `bernardAdmits`]:** You were right about that share, you know. I'd rather have heard it from the hammer.

## Stage 3 — Choice and endings

**S7 — Choice** (sets `choice`)

**Player [reforge]:** Reforge the head. Keep the old handle on the wall.
**Bernard:** That's keeping it and losing it at once.
**Sophie:** That's what it is, yes.

**Player [new]:** A new hammer. The old one stays as it is.
**Sophie:** That's iron and charcoal I'd rather not spend this month. If you can bring the iron, I'll do the work for nothing.
**Bernard:** For nothing. Listen to her.

**Player [keepsake]:** Hang it up. He uses yours until he wants his own.
**Bernard:** Hers is too heavy.
**Sophie:** Then I'll make you a light one when you ask. Not before.

Materials: `reforge` — coal ×4 (player or forge stock); `new` — iron ingot ×2 + coal ×4 (I: `iron_ingot`, `coal`; the player brings or buys them — a `CRAFT-02` order with a deposit paid by the player if forge materials are used). Work time per the existing order system.

### E1 — The same hammer, shorter
Condition: `reforge`, `crackFound`, materials, order complete.

**Bernard:** It feels wrong.
**Sophie:** New things do.
**Bernard:** *(second strike)* …It feels honest. — The old handle?
**Sophie:** On the wall, over the door.
**Bernard:** Good. It can watch.

Effect: Bernard keeps working; his fine work returns to normal quality (N: NPC smith quality modifier). Payment: Sophie repairs **one weapon or tool to full durability** for the player for free (a service, not coin).

### E2 — Two hammers
Condition: `new`, order collected.

**Sophie:** New handle, new head, same purpose.
**Bernard:** Same purpose is enough. *(weighs it in his hand)* Lighter. I'll get used to it.
**Player:** And the old one?
**Bernard:** For teaching. Where not to put your thumb.

Effect: a new item at full durability; the old hammer remains (marked "damaged — do not use", N). If the player brought the iron, Sophie charges nothing for labour and gives the player **nails ×20** or **a knife** (~8 c) "from the offcuts".

### E3 — The quiet hook
Condition: `keepsake`, hammer hung up; Bernard doesn't use it after the warning.

**Bernard:** It's done enough.
**Sophie:** I'll make it a proper hook.
**Player:** No new hammer?
**Bernard:** Later. Today I know what I'm keeping.

Effect: Bernard works less (N: lower smithy output until he asks for a new hammer — Sophie makes one herself after ~2 weeks). Payment: a meal and the family's opinion (+15), no coin — the player didn't buy or bring anything.

## Refusal, interruption, omissions

- Refusing S1: Sophie fits a new handle on the cracked head; the shivering and weaker work continue (N), keeping G02's background true.
- Cancelled order: `CRAFT-02` rules (unused materials returned).
- Sophie unavailable: the order waits; it never completes in absentia.
- Link to G02 (soft): after S4 with `crackFound`, Bernard in G02 can admit the share was his fault (extra dialog option, not a condition).

## Mechanics

I: smith, orders, durability, materials. N: tool test, marking an item as damaged/keepsake, NPC work-quality modifier. **Author decisions:** do tools have an "unsafe" state; can keepsakes be decorations in buildings.

## Implementation notes

Implemented by `quests--003` W2 as `src/game/data/quests/q04.ts` (test `questQ04.test.ts`); `settlement` anchors gained a `place` ({V}).

- **Start:** the player has visited {V}. **Test and crack** are observations at {V}'s anvil (the quest's own "strike" option marks the test, then 5 s looking at the head finds the crack; repeating the look always works — no skill roll).
- **Work is a quest timer, not a CRAFT-02 order:** reforge consumes coal ×4 from the player, new consumes iron ingot ×2 and coal ×4 (no deposit; labour free as in the design); 12 h later Sophie finishes. Reforge → `repairHeld` (equipped main-hand item to full durability); new → a `hammer` (declared grant "forged-by-sophie") and 8 c from Sophie's purse (the design's nails/knife are not in her store). Keepsake ends at once with a bread from her store and opinions +15.
- **Not implemented:** the order event/real order wrap (E5 `order`), Bernard's output modifier, the "damaged — do not use" marking, the G02 `bernardAdmits` line and the Sophie-makes-a-light-hammer epilogue.
