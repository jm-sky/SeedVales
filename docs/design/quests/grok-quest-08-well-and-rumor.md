---
created: 2026-09-30
created_by: Grok / Scribe (Grok Bot)
lang: en
status: revised
provider_reviews:
  - note: Earlier Grok rounds (PL R1–R3, EN-R1–R3, DIALOG-R1–R2) are historical; see git history.
  - round: CROSS-PACK-2026-10-01
    by: Claude Code (three-round rework, see REVIEW-2026-10-01.md)
    result: rewritten — planted-evidence path removed, Tomasz moved to the shepherd household (single farmer in SM), truth no longer punishes him arbitrarily, roadActive removed
---

# 08 — Well and Rumor

**Premise:** Radosław's wife and Stanisław fall sick on the same night, and {H} starts saying the well is poisoned — by someone from {V}, naturally. The truth is a barrel of Tomasz's small beer that went bad. The player can find it before the rumor finds a culprit.

Cast and places: [QUEST-WORLD.md](QUEST-WORLD.md).

## Meta

| Field | Value |
|-------|-------|
| Scale | Medium; H, optionally V |
| Start | After the player has spent 3+ days in H; Tomasz's household alive |
| Stages | 3 (+ optional trip to V) |
| Giver | **Radosław** (H farmer, sołtys — village head) |
| Others | **Tomasz** (Mira's husband, brews small beer), **Dobrawa** (herbalist), **Stanisław** (sick), Radosław's wife (sick), **Małgorzata** (V sołtys, accusation path only) |
| Mechanics status | I: well, illness from food, reputation. N: authored spoiled barrel, rumor state, `tradeFriction` between settlements |

## Characters

- **Radosław** — worried for his wife, more worried about the square. Wants calm and facts, in that order.
- **Tomasz** — kind, a bit vague; brews small beer for half the village and doesn't always scald the barrels. Mortified when he understands.
- **Dobrawa** — practical; she's seen this before.

## World truth

Tomasz's last barrel was filled into a cask that hadn't been scalded. It went sour and slimy at the bottom. He sold jugs from it to three households on market day: Radosław's (his wife drank it), Stanisław's, and his own (Mira won't drink beer, Tomasz drank only the top). The well is clean. A {V} carter did water his oxen at the well the day before — that's where the rumor came from.

## Flags

| Flag | Meaning |
|------|---------|
| `q08.stage` | 1 → 2 → 3 |
| `q08.facts` | set of `who_drank` (testimony), `well_clean` (inspect), `barrel_bad` (inspect), `dobrawa` (opinion) |
| `q08.accused` | player went to {V} to accuse without `barrel_bad` |
| `q08.result` | `truth` \| `quiet` \| `accusation` |

## Stage 1 — Sick houses

**Opening — Radosław by the well, a small crowd at a distance**

> **Radosław:** My wife's been sick since midnight. So's Stanisław. And half the square's decided the well's been poisoned — there was a carter from {V} watering his oxen here yesterday. *(low)* I need to know what it really is before somebody says it out loud to the wrong person.
> **Player:** Where do I start?
> **Radosław:** Anywhere but the square.

- A: "I'll find out." → quest starts; `stage=2`.
- B: "Maybe it *was* the carter." → Radosław: "Maybe. Find out. Don't guess." → quest starts; `stage=2`.
- C: "Not my business." → refuse; see Refusal.

## Stage 2 — Facts

**Stanisław, in bed** → `facts+=who_drank`

> **Stanisław:** Water? I drink from the well every day of my life and I've never — no. Beer. Tomasz's small beer, a jug on market day. It tasted… thick. I thought it was the new barley.

**Radosław's wife (through Radosław, or directly)** → (confirms `who_drank`)

> **Radosław:** She had a cup of Tomasz's beer with her bread. Same as me — no, I had water. I'm not sick.

**Dobrawa** → `facts+=dobrawa`

> **Dobrawa:** Cramps, fever, and they both drank the same thing. A poisoned well makes the whole village sick, not two houses. Look at what they shared.

**The well (environmental)** → `facts+=well_clean`

> *(self)* Cold, clear, smells of stone. A ladle of it tastes like it always has.

**Tomasz's cellar (environmental, with Tomasz's leave or by looking)** → `facts+=barrel_bad`

> *(self)* The end barrel smells sharp and wrong. At the bottom there's a grey slime. The cask was never scalded.

**Tomasz — when shown the barrel**

> **Tomasz:** Oh. Oh, no. I was in a hurry — Mira was at the lambing and I just… I didn't scald it. *(sits down)* Radosław's wife. Is she bad?
> **Player:** Dobrawa says she'll mend.
> **Tomasz:** I'll pour the lot out. I'll go and tell them. I'll — what do I do?

- A: "Tell Radosław yourself. I'll come with you." → unlocks `quiet`.
- B: "Radosław needs to hear this from me, and the square needs to hear it from him." → leads to `truth`.

**Accusation (alternative)** — the player goes to {V} with fewer than two facts, or ignores them:

> **Małgorzata:** You've come to tell me someone from {V} poisoned your well. On what? A carter watering his oxen? *(cold)* Bring me something better than a rumor, or don't bring me anything.
> - "We'll see what {H} says about it." → `accused=true`; `result=accusation`; return to H.
> - "You're right. I'm sorry — I'll find out properly." → no penalty; return to Stage 2.

## Stage 3 — What the square hears

**Radosław** (needs `barrel_bad` and at least one more fact for `truth`/`quiet`)

> **Radosław:** Well? What do I tell them?

- **truth** — "The well's clean. A barrel of Tomasz's beer went bad because the cask wasn't scalded. Everyone who's sick drank from it." → Radosław says it on the square; Tomasz pours out the barrel publicly.
  > **Radosław:** *(after)* Some of them were disappointed. A carter from {V} is a better story than a dirty cask.
- **quiet** — *(Tomasz came along)* Tomasz tells Radosław himself; Radosław tells the square only that the well is clean and the cause is found.
  > **Tomasz:** I'll bring your wife broth every day till she's up. And I'll scald every cask twice.
  > **Radosław:** Once properly will do. *(to the player)* The square'll get "the well is clean and it's dealt with." That's all they need.
- **accusation** — *(accused)* → Radosław: "You went to {V} and said what?" *(the truth comes out later anyway when Dobrawa talks; the trade cold spell stays)*

## Rewards and world effects

| result | World | Player | Reputation | Relations |
|--------|-------|--------|------------|-----------|
| truth | Rumor ends; Tomasz scalds his casks (no more beer sickness) | `from: treasury_home` 25 | honesty+10 (H) | Radosław+20; Tomasz−5 (embarrassed); Dobrawa+5 |
| quiet | Rumor ends; Tomasz's name not said in public | `from: treasury_home` 20 + Tomasz gives a small cask of good beer | helpfulness+10 (H) | Radosław+15; Tomasz+20; Mira+10 |
| accusation | `tradeFriction` H↔V for one season (N: V trader prices ×1.2 for H residents) | none | honesty−15 (H, V) | Małgorzata−25; Radosław−10 |

## Refusal, interruption, missing NPCs

- If the player refuses, Dobrawa traces it to the barrel within two days (world event) and the rumor dies; no reward.
- If the player starts the accusation path and then brings `barrel_bad` to Małgorzata within a day, she accepts an apology: no `tradeFriction`, honesty−5 instead.
- If Tomasz is unavailable, `quiet` is not possible.

## Mechanisms

| Tier | Content |
|------|---------|
| Required | Authored barrel state; sick NPCs tied to it; fact set; `tradeFriction` scalar |
| Stub | Square announcement as a journal entry + reputation change |
| Out of scope | Crowd simulation |
