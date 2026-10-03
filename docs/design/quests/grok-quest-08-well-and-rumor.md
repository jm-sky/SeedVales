---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — planted-evidence path removed, Tom Lambert moved to the shepherd household (single farmer in SM), truth no longer punishes him arbitrarily, roadActive removed
---

# 08 — Well and Rumor

**Premise:** Ralph's wife and Stephen Chapman fall sick on the same night, and {H} starts saying the well is poisoned — by someone from {V}, naturally. The truth is a barrel of Tom's small beer that went bad. The player can find it before the rumor finds a culprit.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md).

## Meta

| Field | Value |
|-------|-------|
| Scale | Medium; H, optionally V |
| Start | After the player has spent 3+ days in H; Tom's household alive |
| Stages | 3 (+ optional trip to V) |
| Giver | **Ralph Fieldman** (H farmer, reeve — village head) |
| Others | **Tom** (Molly Lambert's husband, brews small beer), **Dora Herbert** (herbalist), **Stephen** (sick), Ralph's wife (sick), **Margaret Reeve** (V reeve, accusation path only) |
| Mechanics status | I: well, illness from food, reputation. N: authored spoiled barrel, rumor state, `tradeFriction` between settlements |

## Characters

- **Ralph** — worried for his wife, more worried about the square. Wants calm and facts, in that order.
- **Tom** — kind, a bit vague; brews small beer for half the village and doesn't always scald the barrels. Mortified when he understands.
- **Dora** — practical; she's seen this before.

## World truth

Tom's last barrel was filled into a cask that hadn't been scalded. It went sour and slimy at the bottom. He sold jugs from it to three households on market day: Ralph's (his wife drank it), Stephen's, and his own (Molly won't drink beer, Tom drank only the top). The well is clean. A {V} carter did water his oxen at the well the day before — that's where the rumor came from.

## Flags

| Flag | Meaning |
|------|---------|
| `q08.stage` | 1 → 2 → 3 |
| `q08.facts` | set of `who_drank` (testimony), `well_clean` (inspect), `barrel_bad` (inspect), `dora` (opinion) |
| `q08.accused` | player went to {V} to accuse without `barrel_bad` |
| `q08.result` | `truth` \| `quiet` \| `accusation` |

## Stage 1 — Sick houses

**Opening — Ralph by the well, a small crowd at a distance**

> **Ralph:** My wife's been sick since midnight. So's Stephen. And half the square's decided the well's been poisoned — there was a carter from {V} watering his oxen here yesterday. *(low)* I need to know what it really is before somebody says it out loud to the wrong person.
> **Player:** Where do I start?
> **Ralph:** Anywhere but the square.

- A: "I'll find out." → quest starts; `stage=2`.
- B: "Maybe it *was* the carter." → Ralph: "Maybe. Find out. Don't guess." → quest starts; `stage=2`.
- C: "Not my business." → refuse; see Refusal.

## Stage 2 — Facts

**Stephen, in bed** → `facts+=who_drank`

> **Stephen:** Water? I drink from the well every day of my life and I've never — no. Beer. Tom's small beer, a jug on market day. It tasted… thick. I thought it was the new barley.

**Ralph's wife (through Ralph, or directly)** → (confirms `who_drank`)

> **Ralph:** She had a cup of Tom's beer with her bread. Same as me — no, I had water. I'm not sick.

**Dora** → `facts+=dora`

> **Dora:** Cramps, fever, and they both drank the same thing. A poisoned well makes the whole village sick, not two houses. Look at what they shared.

**The well (environmental)** → `facts+=well_clean`

> *(self)* Cold, clear, smells of stone. A ladle of it tastes like it always has.

**Tom's cellar (environmental, with Tom's leave or by looking)** → `facts+=barrel_bad`

> *(self)* The end barrel smells sharp and wrong. At the bottom there's a grey slime. The cask was never scalded.

**Tom — when shown the barrel**

> **Tom:** Oh. Oh, no. I was in a hurry — Molly was at the lambing and I just… I didn't scald it. *(sits down)* Ralph's wife. Is she bad?
> **Player:** Dora says she'll mend.
> **Tom:** I'll pour the lot out. I'll go and tell them. I'll — what do I do?

- A: "Tell Ralph yourself. I'll come with you." → unlocks `quiet`.
- B: "Ralph needs to hear this from me, and the square needs to hear it from him." → leads to `truth`.

**Accusation (alternative)** — the player goes to {V} with fewer than two facts, or ignores them:

> **Margaret:** You've come to tell me someone from {V} poisoned your well. On what? A carter watering his oxen? *(cold)* Bring me something better than a rumor, or don't bring me anything.
> - "We'll see what {H} says about it." → `accused=true`; `result=accusation`; return to H.
> - "You're right. I'm sorry — I'll find out properly." → no penalty; return to Stage 2.

## Stage 3 — What the square hears

**Ralph** (needs `barrel_bad` and at least one more fact for `truth`/`quiet`)

> **Ralph:** Well? What do I tell them?

- **truth** — "The well's clean. A barrel of Tom's beer went bad because the cask wasn't scalded. Everyone who's sick drank from it." → Ralph says it on the square; Tom pours out the barrel publicly.
  > **Ralph:** *(after)* Some of them were disappointed. A carter from {V} is a better story than a dirty cask.
- **quiet** — *(Tom came along)* Tom tells Ralph himself; Ralph tells the square only that the well is clean and the cause is found.
  > **Tom:** I'll bring your wife broth every day till she's up. And I'll scald every cask twice.
  > **Ralph:** Once properly will do. *(to the player)* The square'll get "the well is clean and it's dealt with." That's all they need.
- **accusation** — *(accused)* → Ralph: "You went to {V} and said what?" *(the truth comes out later anyway when Dora talks; the trade cold spell stays)*

## Rewards and world effects

| result | World | Player | Reputation | Relations |
|--------|-------|--------|------------|-----------|
| truth | Rumor ends; Tom scalds his casks (no more beer sickness) | `from: treasury_home` 25 | honesty+10 (H) | Ralph+20; Tom−5 (embarrassed); Dora+5 |
| quiet | Rumor ends; Tom's name not said in public | `from: treasury_home` 20 + Tom gives a small cask of good beer | helpfulness+10 (H) | Ralph+15; Tom+20; Molly+10 |
| accusation | `tradeFriction` H↔V for one season (N: V trader prices ×1.2 for H residents) | none | honesty−15 (H, V) | Margaret−25; Ralph−10 |

## Refusal, interruption, missing NPCs

- If the player refuses, Dora traces it to the barrel within two days (world event) and the rumor dies; no reward.
- If the player starts the accusation path and then brings `barrel_bad` to Margaret within a day, she accepts an apology: no `tradeFriction`, honesty−5 instead.
- If Tom is unavailable, `quiet` is not possible.

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Authored barrel state; sick NPCs tied to it; fact set; `tradeFriction` scalar |
| Stub | Square announcement as a journal entry + reputation change |
| Out of scope | Crowd simulation |

## Implementation notes

Implemented by `quests--003` W1 as `src/game/data/quests/g08.ts` (test `questG08.test.ts`). New engine primitives: `CastSpec.place` (`'V'` = nearest other settlement), condition `visited`, effects `ill` / `heal` / `priceMod` (E6, `sim/priceMods.ts`), `rep.places`, item `small_beer` (quest-only).

- **Start:** game day ≥ 4 and Tom's household alive; on offer `{wife}` and `{stephen}` fall ill (stomach, 30 severity, 72 h).
- **Facts:** `whoDrank` (Stephen's dialog), `doraSaid` (Dora's dialog), `wellClean` (4 s at the well), `barrelBad` (5 s at Tom's house). `truth` and `quiet` need `barrelBad` plus one more fact; `quiet` also needs Tom to come along (`tomTold`, set from Tom's barrel dialog — no distance check, a stub).
- **Accusation:** a topic on the {V} farmer head (Margaret is a plain farmer, no `reeve` flag) after visiting {V}, only with fewer than two facts; `accusation` ending costs honesty −15 in {H} and {V}, Margaret −25, Ralph −10 and a 30-day ×1.2 price modifier on every item in {V}. The apology topic works while the accusation is under 24 h old and `barrelBad` is known: honesty −5 in both places, no friction. An accusation never confirmed with Ralph ends by itself after 72 h.
- **Refusal / neglect:** Dora traces it after 48 h unanswered (or 96 h after accepting without progress) → silent `traced`, no reward; everyone is healed at every ending.
- **Not implemented (stubs):** the public pouring-out/crowd scene, Tom's "scalds his casks" effect, the friction applying only to {H} residents (it applies to the player — always true here).
