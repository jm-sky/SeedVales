# Q08 — The Long Way to Water

**Status: proposal (N); pack A (Codex round 1), building/water.** Cast: [QUEST-WORLD](QUEST-WORLD.md). Three stages, three endings. Scale: medium quest in V.

## Premise

Every morning and evening Elspeth Shepherd of {V} drives her sheep to the common well in the square, because the stream by the pasture dries up in summer. The sheep block the queue, people get cross, and lately one of them went under a cart. Elspeth has had enough — she wants a trough by the pasture, but knows someone would have to fill it: three hundred steps with buckets, twice a day. Margaret Reeve, {V}'s reeve and her neighbour from the farm, would rather have a new well by the fields — because her cows drink too. Bridget Ward, the guard, only wants nothing standing in the road. The player helps choose and build a solution that has someone to keep it working.

**NPC knowledge.** Elspeth knows the number of sheep and the distances. Margaret knows the costs and who in {V} has time. Bridget knows where the carts go. Nobody has checked whether there's water under the fields.

**Start conditions.** The player has been to {V}; I: well, trough, bucket, building (VISION §24.1–24.2). N: filling rota, agreed location.

## State

`accepted`, `routeWalked`, `groundChecked`, `plan = unset|trough|well|rota`, `built`, `settled`.

## Stage 1 — The queue at the well

**S1 — Elspeth at the well, sheep all around**

**Elspeth:** The sheep get to the well before I do. Then everyone's thirsty and nobody's happy.
**Player:** How far's the pasture?
**Elspeth:** Three hundred steps. I've counted. Far enough that a full bucket feels like a punishment by the second trip.
**Margaret:** A trough by the fence would sort it.
**Elspeth:** A trough that someone fills. An empty trough's just a wooden apology.
**Player [A]:** Let me walk it and see what makes sense.
**Elspeth:** Please. Somebody who isn't me or her. → `accepted`

**S2 — The way to the pasture** (action: walk the route → `routeWalked`)

**Player:** The ground falls toward this corner. A trough here would need less carrying from the stream in spring.
**Elspeth:** And in summer the stream's dust. Then it's all from the well.
**Player:** What about the low field? Margaret's.
**Elspeth:** Ask her. Rushes grow there in June. My grandfather used to say that means water underneath.

**S3 — Looking at the field** (action: trial dig with a shovel — I → `groundChecked`)

**Player:** Damp at two spades down. There's water, not much, but there is.
**Margaret:** Then a well there would serve my cows and her sheep both. And nobody walks three hundred steps.
**Player:** It's a lot of digging and stone.
**Margaret:** It is. And it'd belong to the whole village, which means it needs a turn-list or it'll be nobody's.

**S4 — Bridget**

**Bridget:** Don't put anything on the road. I don't care what — trough, well, stone circle.
**Player:** Where, then?
**Bridget:** Off the turning place, where a cart can still swing round. I'm not choosing your water. I'm protecting my road.

## Stage 2 — Choose and build

**S5 — Choice** (sets `plan`)

**Player [trough]:** A trough by the pasture fence. Elspeth's household fills it.
**Elspeth:** Twice a day. *(pause)* Fine. It's still less than walking the flock through the square. Write my name on it, so nobody else thinks it's theirs to empty.
**Player [well]:** *(needs `groundChecked`)* A small well in the low field. Shared, with turns at keeping it.
**Margaret:** I'll put it to the village. If they agree, I'll take the first month myself.
**Player [rota]:** No building. Set times at the square well — animals at dawn and dusk, people the rest of the day.
**Elspeth:** Costs no timber. Costs everyone's patience, every single day.
**Bridget:** I can shout at people for breaking it. I enjoy that.

**S6 — Building** (I: trough — building, bucket, carrying water; well — N/I: building a well §24.1, larger cost)

**Margaret:** One bucket fills a third of the trough. Not the whole pasture.
**Player:** So three trips. That's in the plan.
**Elspeth:** Good. Plans ought to have the tiring part written in.

## Stage 3 — Endings

### E1 — The trough at the fence
Condition: `plan=trough`, trough built (I) off the road, filled the first time. Payment: Elspeth gives the player **wool ×3** or **cheese ×2** (household stores), Margaret **15 c** from `treasury_V`.

**Elspeth:** Close enough to help, far enough not to block anyone.
**Margaret:** And tomorrow you fill it.
**Elspeth:** Tomorrow I fill it. The day after, you remind me.

Effect: sheep no longer cross the square (N: livestock route change); Elspeth's daily work grows.

### E2 — A well in the low field
Condition: `plan=well`, `groundChecked`, the village agrees (Margaret asks in the square — short scene, N), materials (stone, beams, rope, bucket) and finished construction. Payment: **35–45 c** from `treasury_V` (it's the village's investment — the largest reward in this quest) + the village's opinion.

**Margaret:** It's everyone's now.
**Bridget:** Which means everyone gets a turn keeping it clean.
**Elspeth:** I'll take the first week. For the sheep. They've been the most trouble.

Effect: a new well (I: object), a duty rota (N); if nobody keeps to it, it wears faster.

### E3 — The patient queue
Condition: `plan=rota`, three calendar days of the rota being kept (N: NPCs respect the hours). Payment: **10 c** from `treasury_V`.

**Elspeth:** It works. When people keep to it.
**Margaret:** Which isn't the same as easy.
**Bridget:** I shouted at Cedric's lad twice. Best week I've had.

Effect: no building; if the rota breaks, the problem can return (the quest reopens with `trough`/`well`).

## Refusal, interruption, omissions

- Refusal: no penalty; the sheep keep coming to the square.
- No water in stream or well (drought): trough building pauses; a "dry trough" never counts as success.
- The player builds something on the road: Bridget has it taken down (N); the quest doesn't close.

## Mechanics

I: well, trough, bucket, building, digging. N: rota, village consent for shared building, livestock route. **Author decision:** are new wells outside the square v1 or `SET-04`.

## Implementation notes

Implemented by `quests--003` W2 as `src/game/data/quests/q08.ts` (test `questQ08.test.ts`) with the `fill` and `dig` quest events (hooks in `fillTrough` and `dig`, player only; `dig` counters match by the dig's coordinates).

- **Cast:** Elspeth (V shepherd), Margaret (V farmer head), Bridget (V guard head); start = {V} visited. `routeWalked` = 3 s at the pasture pen; the trial dig (counter `digs` within 14 m of Margaret's field) is recorded and shown in the journal but does not gate anything because the well option is not offered.
- **Plans:** *trough* — a `trough` built within 40 m of the pen and three `fill` events (any amount) → wool ×3 from Elspeth's store, 15 c from {V}'s treasury; *rota* — three days after the choice → 10 c. A trough built elsewhere does not count.
- **Not implemented (decision D-QUEST-3 pending):** the well in the low field (needs a `well` blueprint outside the square and the village consent scene), the road check (Bridget taking down a trough on the road), the livestock route change, drought pause, rota enforcement. Both rewards are paid without those checks.
