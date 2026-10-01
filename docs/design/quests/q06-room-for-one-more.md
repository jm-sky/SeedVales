# Q06 — Room for One More

**Status: proposal (N/P); pack A (Codex round 1), companion.** Cast: [QUEST-WORLD](QUEST-WORLD.md). Needs `COMP-01/02/03` (P: companions); without them only the solo ending works. Three stages, three endings. Scale: medium road quest H→V→H.

## Premise

Miles Hewer ordered a new axe head and two iron wedges from Sophie Smith in {V} — the old ones split during felling. The order is ready and paid in advance; it only has to be collected. Matthew, the woodcutter's grown son, has never been further than the forest edge and badly wants to go. Lucy needs him at home for the lifting of the turnips; Miles doesn't want to lose another felling day to an iron errand. The player is heading toward {V} anyway. Matthew has his own mind, his own duties, and can say no — he is not a reward for reputation.

Feel: a first taste of independence, seen from the side; conversations on the road.

**NPC knowledge.** Matthew knows the road only from stories. Sophie knows who paid for the order (Miles) and will hand it only to someone from his household or someone carrying his mark. Lucy knows how much work is left at home.

**Start conditions.** A woodcutter household in H with a grown son without his own family (APPENDIX: companions); a finished order waiting in {V} (I: `CRAFT-02`). If Q03 ended in E2 (Matthew still sleeps in the common room), Matthew has an extra line in S1.

## State

`accepted`, `familyAgreed`, `deal = unset|paid|free|solo`, `itemCollected`, `returned`, `settled`. Hiring (P): time, pay, task, risk — per the APPENDIX. Handing over equipment: gift or trade (P).

## Stage 1 — Who goes

**S1 — At the woodcutter's table**

**Matthew:** Sophie sent word — the axe head's ready. I could go tomorrow.
**Lucy:** You could go after the turnips are up.
**Miles:** And after somebody tells me what the road's like this week.
**Player:** I'm going that way. He could come with me.
**Matthew:** As what — hired hand, or son-on-an-errand?
**Matthew [if Q03→E2]:** Anyway, a week sleeping somewhere that isn't next to Father's snoring. I'd call that pay.
**Player [A]:** Let's settle it properly before we go: how long, what for, and what if it goes wrong.
**Matthew:** Good. Then I can say yes like I mean it. → `accepted`
**Player [B]:** I'll fetch it on my own.
**Lucy:** That's a plan too. Bring Miles's mark with you, or Sophie won't hand it over. → `deal=solo`, the player gets the mark (item `miles_mark`, N)

**S2 — Lucy, aside**

**Lucy:** If he goes, I lose two mornings in the field. Maybe three.
**Player:** What would make it all right?
**Lucy:** A day when he's back. Someone to carry water while he's gone. And nobody coming home telling me he's a different man because he walked to {V}.
**Player [A]:** I'll bring water for the house before we leave.
**Lucy:** Then I've no argument left except that I'll miss him, and that's not an argument. → (after delivering water: bucket ×4 into the household barrel — I) `familyAgreed`
**Player [B]:** He's a grown man. It's his choice.
**Lucy:** It is. And it's my turnips. Both things are true.

**S3 — Miles**

**Miles:** Don't call him brave because he said yes. He hasn't walked it yet.
**Player:** What worries you?
**Miles:** The lower bend — the business with the sow. And him trying to carry both wedges and the head at once because he thinks it's manly.
**Player:** I'll watch for both.
**Miles:** Hm. Take my old hatchet, then, Matthew. Not the good one. → Matthew receives a hatchet (I: NPC equipment)

## Stage 2 — Terms and the road

**S4 — Terms** (sets `deal`)

**Player [paid]:** Four days, there and back, one pickup. I pay you a day's wage — five coppers a day.
**Matthew:** Twenty coppers. *(pause)* That's more than I've ever held at once.
**Player:** And if there's trouble on the road, we turn back. I won't promise it'll be safe.
**Matthew:** Good. I'd not believe you if you did.

**Player [free]:** *(requires: Matthew's opinion ≥ 25 or the player's helpfulness in H ≥ 10 — N, to calibrate)* Come because you want to. No pay — but no orders either.
**Matthew:** *(thinks)* …Yes. If I'm paid, it's your trip. If I'm not, it's mine as well. I'd like it to be mine as well.

**S5 — Equipment** (optional; P: handing over)

**Player:** Take this padded jacket for the road.
**Matthew:** Is it a gift, or do I give it back?
**Player [gift]:** It's yours.
**Matthew:** Then I'll wear it. *(puts it on)* …It's better than mine. That's all I've got to say about it.
**Player [loan]:** Give it back when we're home.
**Matthew:** Fair. I'll try not to sweat in it.

The NPC uses an item only if it's better than his own (APPENDIX).

**S6 — On the road, by the fire** (first night; conditional scene: companion present, camp made)

**Matthew:** Everything's further than it looks from home.
**Player:** Disappointed?
**Matthew:** No. I thought I would be. — Can I ask you something? What's {T} like?
**Player [been there]:** Bigger. Louder. The bread's worse and the beer's better.
**Player [not yet]:** I haven't been. Someday.
**Matthew:** Someday. That's what Father says about the roof. *(laughs)* No, I mean — I'd like to see it. Not now. A someday that I mean.
**Player:** You could ask Sophie about work, while we're there.
**Matthew:** I was going to. I didn't want to say it in front of Mother.

**S7 — The lower bend** (if Q02 is unresolved or `choice=watch` is running)

**Matthew:** Is that — the turned ground? Where the carter got hurt?
**Player:** It is. Keep to the uphill side and don't run.
**Matthew:** I wasn't going to run. *(pause)* I was going to walk very fast.

## Stage 3 — The pickup and the return

**S8 — The {V} smithy**

**Sophie:** Miles's order. Head and two wedges. Who's taking it?
**Matthew:** Me. Matthew, his son.
**Sophie:** You've his shoulders. Here. *(hands it over)* The wedges are heavier than they look.
**Matthew [deal≠solo]:** Do you ever need hands here? At the bellows, or carrying?
**Sophie:** Sometimes. Not this month. Ask me in spring, and bring your own boots. → `itemCollected` (without Miles's mark Sophie releases the order only to a household member)

**S9 — The way back**

**Matthew:** Back while the waterskin's still full. Mother'll be suspicious.
**Player:** Of what?
**Matthew:** That nothing went wrong.

### E1 — A paid road
Condition: `deal=paid`, `itemCollected`, back within the agreed time. The player pays **20 c** (5 c/day, proposal) from their own purse to Matthew — a real transfer.

**Matthew:** Twenty coppers. I earned them. I also earned the right to say that hill's in a stupid place.
**Lucy:** You can say it after the turnips.
**Player:** The jacket?
**Matthew [gift]:** I'm keeping it. It's better. That's my whole speech.

Effect: Matthew's relationship with the player grows (shared travel, APPENDIX); from now on he can be hired (P) for short routes.

### E2 — A someday that I mean
Condition: `deal=free`, `itemCollected`, returned. No pay.

**Matthew:** I asked Sophie about spring.
**Miles:** You what?
**Matthew:** Asked. She said bring my own boots.
**Lucy:** *(to the player)* Did you put that in his head?
**Player:** He had it in his head before we left.
**Lucy:** *(sighs)* Yes. I know. I just wanted somebody to blame.

Effect: higher relationship than E1; Matthew is more willing to join for free later (P: chance of free joining). In spring Matthew may move to work in {V} (N: NPC migration; if unsupported — dialog only).

### E3 — Alone on the road
Condition: `deal=solo`, or Matthew refused/backed out; the player brought the order back with Miles's mark. Miles gives the player **5 c** "for the road" or a load of firewood.

**Lucy:** You came back alone.
**Player:** That was the plan.
**Matthew:** I got the turnips up. All of them. *(pause)* Next time I'm going.
**Miles:** Next time you are.

## Refusal, interruption, omissions

- Matthew refuses in S1/S4 (e.g. low opinion, illness at home): no relationship loss; the quest becomes `solo`.
- Player KO on the road: Matthew waits by them or fetches help (P: a companion calls for help — VISION §28); the deal extends by a day at no extra cost if the player asks.
- Delayed smith: the order waits; talk about extending (paid extra day).
- The player doesn't return in time: Matthew walks home alone after the last day (if the road is safe) — the deal ends with pay for days worked.
- Matthew dies: a separate world mechanic (§28); the quest closes, no automatic replacement.

## Mechanics

I: travel, needs, camp/sleep, trade, smith orders. P: companion (hire, free joining, handing over and using equipment). N: household mark for collecting an order, conditional camp scene, NPC migration between settlements. **Author decision:** a companion's daily rate (proposed 5 c).
