---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — real competing interests (timber vs acorns), witness recast as Elspeth Shepherd, evidence made genuinely ambiguous, roadActive removed
---

# 05 — Disputed Oak

**Premise:** Miles Hewer, {H}'s woodcutter, wants to fell a huge old oak on the boundary for roof beams. Cedric Hogg, a farmer of {V}, fattens his pigs on its acorns every autumn and says the tree is {V}'s. Nobody is sure where the boundary runs.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md). Soft link: [Q03](q03-a-roof-before-rain.md) (beams).

## Meta

| Field | Value |
|-------|-------|
| Scale | Medium; the boundary between H and V lands |
| Start | After the player's first visit to {V} |
| Stages | 3 |
| Giver | **Miles** (H woodcutter) |
| Others | **Cedric** (V farmer), **Elspeth** (V shepherd, witness), mediator: **Margaret Reeve** (V reeve) or **Ralph Fieldman** (H reeve) |
| Mechanics status | I: trees and felling, treasuries, reputation. N: evidence flags, boundary verdict, pannage (pigs feeding on acorns) as a world effect |

## Characters

- **Miles** — needs straight, seasoned oak for his own roof and for trade; sees a dying giant going to waste.
- **Cedric** — sharp-tongued, attached to his pigs and his grandfather's stories; not a villain, just stubborn.
- **Elspeth** — has grazed sheep along the ditch since she was a girl; tells exactly what she's seen.

## World truth

The oak is about two hundred years old, older than both villages' boundary. Old {H} notches mark it as a boundary tree; newer {V} scratches were cut over them. A half-buried boundary stone in the ditch has a line carved toward neither village exactly — it was set crooked. The oak is healthy on the {V} side and half-dead on the {H} side. Felling it would give two excellent beams; leaving it standing feeds Cedric's pigs each autumn.

## Flags

| Flag | Meaning |
|------|---------|
| `q05.stage` | 1 → 2 → 3 |
| `q05.evidence` | set of `notches`, `stone`, `witness`, `age` (need ≥2 for any verdict) |
| `q05.deal` | `shared` \| `for_h` \| `for_v` \| `felled_at_night` |

## Stage 1 — The tree

**Opening — Miles at his woodpile**

> **Miles:** There's an oak on the boundary ditch — the big one. Half of it's dead. Two beams in it as straight as you'll ever see, and Cedric from {V} says if I touch it he'll set the dogs on me.
> **Player:** Whose tree is it?
> **Miles:** Ours. My father cut the boundary marks in it himself. — Or so he said. He said a lot of things. Will you walk the ditch and see what's actually there? I'd rather have a fair answer than a fight with a man whose pigs I can hear from my house.

- A: "I'll walk the boundary." → quest starts; Miles+5; `stage=2`.
- B: "Why not just fell another tree?" → Miles: "Because there isn't another like it this side of {V}. That's the trouble." → then A.
- C: "Not my quarrel." → refuse; available later.

## Stage 2 — Evidence and the other side

**The oak — bark (environmental)** → `evidence+=notches`

> *(self)* Deep old notches, three in a row — the {H} boundary mark. Above them, newer scratches in a different hand. Both villages have claimed this tree.

**The ditch — boundary stone (environmental)** → `evidence+=stone`

> *(self)* A half-buried stone with a carved line. It points along the ditch — but the stone itself leans. Whoever set it, set it crooked. It proves there's a boundary here. It doesn't prove which side the oak is on.

**Tree age (Survival or felling skill)** → `evidence+=age`

> *(self)* By the girth, the oak was a big tree before either village drew a line. It was a landmark first and a boundary second.

**Elspeth (V shepherd)** → `evidence+=witness`

> **Elspeth:** My sheep stop at that oak. Always have — there's shade and the ditch is shallow there. When I was little, my father said the oak was "between." Not ours, not theirs. Between.
> **Player:** Did anyone use it?
> **Elspeth:** Cedric's pigs, every autumn, for the acorns. And {H} folk took deadwood from the far side. Nobody minded till somebody wanted the whole tree.

**Cedric (V)**

> **Cedric:** Come to measure my oak for a coffin, have you?
> **Player:** I've come to hear your side.
> **Cedric:** My side is that my pigs have eaten under that tree since my grandfather's day. A fat pig in winter is worth more than two planks in some woodcutter's roof. And the scratches in the bark are ours.
> **Player:** The older notches are {H}'s.
> **Cedric:** Older isn't truer. — *(grudging)* …The stone's crooked, everyone knows that.

- A: *(evidence ≥2)* "It looks like the tree belonged to nobody and got used by everyone. What would you accept?" → Cedric: "Leave it standing. Let him take the dead limbs. And let him have timber from somewhere else on our side — I don't care where, as long as it's not my oak." → unlocks `shared`.
- B: "You can't own a boundary." → Cedric: "Watch me." → no change.

## Stage 3 — Verdict

**Mediator** — whichever reeve the player brings it to (Margaret in {V} or Ralph in {H}). Requires `evidence ≥ 2`.

> **Margaret / Ralph:** Two villages and one tree. Tell me what you found and what you'd have me write.

- A: *(shared unlocked)* "The oak stands. {H} takes the dead limbs from it, and {V} lets Miles fell two good trees in the {V} wood instead." → `deal=shared`.
- B: "The old notches are {H}'s. The oak is {H}'s — Miles may fell it." → `deal=for_h`.
- C: "It's been {V}'s pigs under it for three generations. The oak is {V}'s." → `deal=for_v`.
- D: "No verdict today." → stay at stage 3.

**Night felling (alternative, any time in stage 2–3):** the player (or the player helping Miles) fells the oak at night. Logs ×4, discovered next morning. → `deal=felled_at_night`.

**Close — Miles**

- *(shared)* > **Miles:** Two trees from their wood. Not as good as the oak — but I'll take good and peaceful. And the dead limbs make firewood for a winter.
- *(for_h)* > **Miles:** Then I'll fell it before Cedric changes the reeve's mind. *(pause)* I'll send him a ham, after. It's not his fault his pigs like acorns.
- *(for_v)* > **Miles:** Well. A fair answer's what I asked for. I didn't say I'd like it.
- *(felled_at_night)* > **Miles:** *(white-faced)* You did what? They'll know it was us. They'll know by the axe cuts.

## Rewards and world effects

| deal | World | Player | Reputation | Relations |
|------|-------|--------|------------|-----------|
| shared | Oak stands; Miles gets 2 felling rights in V woods; pannage continues | `from: treasury_home` 12 + `from: treasury_V` 12 | helpfulness+8 (H, V) | Miles+15; Cedric+15; Elspeth+5 |
| for_h | Oak felled by Miles; logs ×4 to his woodpile; Cedric loses pannage (N: his pigs thinner next winter) | `from: treasury_home` 15 | honesty+5 (H), honesty−5 (V) | Miles+25; Cedric−25 |
| for_v | Oak stands; Miles buys beams elsewhere | `from: treasury_V` 15 | honesty+5 (V) | Cedric+25; Miles−10 |
| felled_at_night | Oak gone; logs ×4 taken by whoever felled it | none | honesty−20 (H and V) | Cedric−40; Miles−10 (if he didn't ask for it); V reeve −20; wood trade between H and V cools (N: `priceMod.wood` +10% for a season) |

Q03 link: `shared` or `for_h` lets Ralph treat the boundary timber as Miles's repayment for borrowed beams.

## Refusal, interruption, missing NPCs

- If Cedric dies, his household keeps the pannage claim; the same lines apply with "my father's pigs."
- If neither reeve is available, the verdict waits.

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Evidence set; mediator verdict; felling state of a unique tree |
| Stub | Felling rights as a flag that unlocks two trees in V woods |
| Out of scope | Full land ownership map |
